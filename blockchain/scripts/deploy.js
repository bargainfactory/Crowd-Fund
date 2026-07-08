const { ethers, network } = require('hardhat');
const fs = require('fs');

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('Deploying contracts with account:', deployer.address);
  console.log('Account balance:', ethers.formatEther(await deployer.provider.getBalance(deployer.address)), 'ETH/MATIC');
  console.log('Network:', network.name);

  const PLATFORM_FEE_PERCENT = 300; // 3% in basis points
  const FEE_RECIPIENT = deployer.address; // Change to treasury wallet in production

  // Deploy CrowdfundFactory
  console.log('\nDeploying CrowdfundFactory...');
  const CrowdfundFactory = await ethers.getContractFactory('CrowdfundFactory');
  const factory = await CrowdfundFactory.deploy(FEE_RECIPIENT, PLATFORM_FEE_PERCENT);
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log('CrowdfundFactory deployed to:', factoryAddress);

  // Verify deployment
  const owner = await factory.owner();
  const feePercent = await factory.platformFeePercent();
  console.log('Factory owner:', owner);
  console.log('Platform fee:', Number(feePercent) / 100, '%');

  // Create a test campaign (only on testnets)
  if (network.name !== 'polygon' && network.name !== 'mainnet') {
    console.log('\nCreating test campaign...');

    const goal = ethers.parseEther('0.1'); // 0.1 MATIC
    const deadline = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days
    const testCampaignId = 'test-campaign-001';

    const tx = await factory.createCampaign(
      goal,
      deadline,
      deployer.address,
      testCampaignId,
      [], // No multi-sig approvers
      0
    );

    const receipt = await tx.wait();
    const event = receipt.logs.find(log => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed?.name === 'CampaignCreated';
      } catch { return false; }
    });

    if (event) {
      const parsed = factory.interface.parseLog(event);
      console.log('Test campaign deployed at:', parsed.args.campaign);
    }
  }

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    factory: factoryAddress,
    deployer: deployer.address,
    platformFeePercent: PLATFORM_FEE_PERCENT,
    feeRecipient: FEE_RECIPIENT,
    deployedAt: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber()
  };

  const deploymentPath = `deployments/${network.name}.json`;
  if (!fs.existsSync('deployments')) {
    fs.mkdirSync('deployments', { recursive: true });
  }

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment info saved to ${deploymentPath}`);

  // Print env variable to set
  console.log('\n=== SET THESE ENV VARIABLES ===');
  console.log(`CROWDFUND_FACTORY_ADDRESS=${factoryAddress}`);
  console.log(`ALCHEMY_NETWORK=${network.name}`);
  console.log('================================\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
