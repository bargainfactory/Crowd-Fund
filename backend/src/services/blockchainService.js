const { ethers } = require('ethers');
const BlockchainLog = require('../models/BlockchainLog');

// ABI for CrowdfundFactory contract
const FACTORY_ABI = [
  'function createCampaign(uint256 goal, uint256 deadline, address creator) returns (address)',
  'function getCampaigns() view returns (address[])',
  'event CampaignCreated(address indexed campaign, address indexed creator, uint256 goal)',
];

// ABI for CrowdfundCampaign contract
const CAMPAIGN_ABI = [
  'function donate() payable',
  'function withdraw()',
  'function refund()',
  'function getBalance() view returns (uint256)',
  'function goal() view returns (uint256)',
  'function deadline() view returns (uint256)',
  'function creator() view returns (address)',
  'function totalRaised() view returns (uint256)',
  'function donorCount() view returns (uint256)',
  'function state() view returns (uint8)',
  'function donations(address) view returns (uint256)',
  'event DonationReceived(address indexed donor, uint256 amount)',
  'event GoalReached(uint256 totalAmount)',
  'event FundsWithdrawn(address indexed creator, uint256 amount)',
  'event RefundIssued(address indexed donor, uint256 amount)',
];

// Get provider based on network
const getProvider = (network = 'polygon-mumbai') => {
  if (!process.env.ALCHEMY_API_KEY) {
    // Use public RPC as fallback for testnets
    const publicRPCs = {
      'polygon-mumbai': 'https://rpc-mumbai.maticvigil.com',
      'polygon': 'https://polygon-rpc.com',
      'sepolia': 'https://rpc.sepolia.org',
      'ethereum': 'https://cloudflare-eth.com'
    };
    return new ethers.JsonRpcProvider(publicRPCs[network] || publicRPCs['polygon-mumbai']);
  }

  const alchemyUrl = `https://${network}.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  return new ethers.JsonRpcProvider(alchemyUrl);
};

const getSigner = (network) => {
  const provider = getProvider(network);
  if (!process.env.PRIVATE_KEY) throw new Error('Wallet private key not configured');
  return new ethers.Wallet(process.env.PRIVATE_KEY, provider);
};

// Deploy a new campaign contract via factory
const deployBlockchainCampaign = async ({ campaignId, goalAmount, deadline, creatorAddress, network }) => {
  try {
    const signer = getSigner(network || 'polygon-mumbai');

    if (!process.env.CROWDFUND_FACTORY_ADDRESS) {
      throw new Error('Factory contract address not configured');
    }

    const factory = new ethers.Contract(
      process.env.CROWDFUND_FACTORY_ADDRESS,
      FACTORY_ABI,
      signer
    );

    // Convert goal to Wei (assuming ETH/MATIC)
    const goalInWei = ethers.parseEther(goalAmount.toString());
    const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000);

    const tx = await factory.createCampaign(
      goalInWei,
      deadlineTimestamp,
      creatorAddress || signer.address
    );

    const receipt = await tx.wait();
    const event = receipt.logs.find(log => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed?.name === 'CampaignCreated';
      } catch { return false; }
    });

    const contractAddress = event
      ? factory.interface.parseLog(event).args.campaign
      : null;

    // Log to DB
    await BlockchainLog.create({
      campaign: campaignId,
      eventType: 'contract_deployed',
      network: network || 'mumbai',
      contractAddress,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      status: 'confirmed'
    });

    return { contractAddress, txHash: receipt.hash };
  } catch (error) {
    console.error('Blockchain deployment error:', error);
    throw error;
  }
};

// Record a donation on-chain
const recordDonationOnChain = async ({ campaignContractAddress, donorAddress, amountMatic, donationId, network }) => {
  try {
    const signer = getSigner(network || 'polygon-mumbai');
    const campaign = new ethers.Contract(campaignContractAddress, CAMPAIGN_ABI, signer);

    const valueInWei = ethers.parseEther(amountMatic.toString());
    const tx = await campaign.donate({ value: valueInWei });
    const receipt = await tx.wait();

    await BlockchainLog.create({
      donation: donationId,
      eventType: 'donation_made',
      network: network || 'mumbai',
      contractAddress: campaignContractAddress,
      txHash: receipt.hash,
      from: donorAddress,
      to: campaignContractAddress,
      value: valueInWei.toString(),
      blockNumber: receipt.blockNumber,
      status: 'confirmed'
    });

    return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
  } catch (error) {
    console.error('On-chain donation error:', error);
    throw error;
  }
};

// Get campaign stats from contract
const getCampaignContractStats = async (contractAddress, network) => {
  try {
    const provider = getProvider(network || 'polygon-mumbai');
    const campaign = new ethers.Contract(contractAddress, CAMPAIGN_ABI, provider);

    const [balance, goal, totalRaised, donorCount, state, deadline] = await Promise.all([
      campaign.getBalance(),
      campaign.goal(),
      campaign.totalRaised(),
      campaign.donorCount(),
      campaign.state(),
      campaign.deadline()
    ]);

    const states = ['Active', 'Successful', 'Failed', 'Cancelled'];

    return {
      balance: ethers.formatEther(balance),
      goal: ethers.formatEther(goal),
      totalRaised: ethers.formatEther(totalRaised),
      donorCount: Number(donorCount),
      state: states[Number(state)] || 'Unknown',
      deadline: new Date(Number(deadline) * 1000)
    };
  } catch (error) {
    console.error('Contract stats error:', error);
    return null;
  }
};

// Verify transaction on blockchain
const verifyTransaction = async (txHash, network) => {
  try {
    const provider = getProvider(network || 'polygon-mumbai');
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) return { status: 'pending', confirmations: 0 };

    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber;

    return {
      status: receipt.status === 1 ? 'confirmed' : 'failed',
      confirmations,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  } catch (error) {
    console.error('Transaction verification error:', error);
    return { status: 'error', message: error.message };
  }
};

// Listen to contract events (for webhook-like behavior)
const setupEventListeners = (contractAddress, network, callbacks) => {
  const provider = getProvider(network);
  const campaign = new ethers.Contract(contractAddress, CAMPAIGN_ABI, provider);

  campaign.on('DonationReceived', async (donor, amount, event) => {
    await BlockchainLog.create({
      eventType: 'donation_made',
      network,
      contractAddress,
      txHash: event.log.transactionHash,
      from: donor,
      value: amount.toString(),
      blockNumber: event.log.blockNumber,
      status: 'confirmed'
    });
    if (callbacks?.onDonation) callbacks.onDonation({ donor, amount, txHash: event.log.transactionHash });
  });

  campaign.on('GoalReached', async (totalAmount, event) => {
    if (callbacks?.onGoalReached) callbacks.onGoalReached({ totalAmount, txHash: event.log.transactionHash });
  });

  return campaign;
};

// Get explorer URL for transaction
const getExplorerUrl = (txHash, network) => {
  const explorers = {
    'polygon': `https://polygonscan.com/tx/${txHash}`,
    'polygon-mumbai': `https://mumbai.polygonscan.com/tx/${txHash}`,
    'ethereum': `https://etherscan.io/tx/${txHash}`,
    'sepolia': `https://sepolia.etherscan.io/tx/${txHash}`,
    'bsc': `https://bscscan.com/tx/${txHash}`
  };
  return explorers[network] || `https://polygonscan.com/tx/${txHash}`;
};

module.exports = {
  getProvider,
  getSigner,
  deployBlockchainCampaign,
  recordDonationOnChain,
  getCampaignContractStats,
  verifyTransaction,
  setupEventListeners,
  getExplorerUrl
};
