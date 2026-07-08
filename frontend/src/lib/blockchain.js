import { ethers } from 'ethers';

export const NETWORKS = {
  'polygon': {
    chainId: 137,
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    symbol: 'MATIC',
    explorer: 'https://polygonscan.com',
    color: '#8247e5'
  },
  'polygon-mumbai': {
    chainId: 80001,
    name: 'Polygon Mumbai (Testnet)',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    symbol: 'MATIC',
    explorer: 'https://mumbai.polygonscan.com',
    color: '#8247e5'
  },
  'ethereum': {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://cloudflare-eth.com',
    symbol: 'ETH',
    explorer: 'https://etherscan.io',
    color: '#627eea'
  },
  'sepolia': {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://rpc.sepolia.org',
    symbol: 'ETH',
    explorer: 'https://sepolia.etherscan.io',
    color: '#627eea'
  }
};

// Get browser wallet provider (MetaMask, etc.)
export const getWeb3Provider = () => {
  if (typeof window === 'undefined') return null;
  if (!window.ethereum) return null;
  return new ethers.BrowserProvider(window.ethereum);
};

// Connect wallet
export const connectWallet = async () => {
  const provider = getWeb3Provider();
  if (!provider) throw new Error('No Web3 wallet detected. Please install MetaMask.');

  await provider.send('eth_requestAccounts', []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();

  return { provider, signer, address, chainId: Number(network.chainId) };
};

// Switch to a specific network
export const switchNetwork = async (networkKey) => {
  const network = NETWORKS[networkKey];
  if (!network || !window.ethereum) return;

  const chainIdHex = `0x${network.chainId.toString(16)}`;

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }]
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: chainIdHex,
          chainName: network.name,
          rpcUrls: [network.rpcUrl],
          nativeCurrency: { name: network.symbol, symbol: network.symbol, decimals: 18 }
        }]
      });
    }
  }
};

// Format ETH/MATIC amount
export const formatTokenAmount = (wei, decimals = 4) => {
  try {
    return parseFloat(ethers.formatEther(wei)).toFixed(decimals);
  } catch {
    return '0';
  }
};

// Get explorer URL for transaction
export const getExplorerUrl = (txHash, network = 'polygon') => {
  const net = NETWORKS[network];
  if (!net) return `https://polygonscan.com/tx/${txHash}`;
  return `${net.explorer}/tx/${txHash}`;
};

// Get explorer URL for address
export const getAddressExplorerUrl = (address, network = 'polygon') => {
  const net = NETWORKS[network];
  return `${net?.explorer || 'https://polygonscan.com'}/address/${address}`;
};

// Shorten address for display
export const shortenAddress = (address, chars = 4) => {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};

// Check if MetaMask is installed
export const isMetaMaskInstalled = () => {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
};
