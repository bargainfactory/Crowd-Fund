import { useState, useEffect } from 'react';
import { connectWallet, isMetaMaskInstalled, shortenAddress, switchNetwork, NETWORKS } from '../../lib/blockchain';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { Shield, Wallet, ExternalLink, ChevronDown, Check } from 'lucide-react';
import clsx from 'clsx';

export default function WalletConnect({ onConnect, compact = false }) {
  const { user, updateUser } = useAuth();
  const [address, setAddress] = useState(user?.walletAddress || '');
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [networkDropdown, setNetworkDropdown] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState('polygon-mumbai');

  useEffect(() => {
    if (user?.walletAddress) setAddress(user.walletAddress);

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        setAddress(accounts[0] || '');
      });
      window.ethereum.on('chainChanged', (newChainId) => {
        setChainId(parseInt(newChainId, 16));
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, [user]);

  const handleConnect = async () => {
    if (!isMetaMaskInstalled()) {
      toast.error(
        'MetaMask not found. Please install MetaMask or another Web3 wallet.',
        { duration: 5000 }
      );
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    setConnecting(true);
    try {
      await switchNetwork(selectedNetwork);
      const { address: walletAddress, chainId: connectedChainId } = await connectWallet();

      setAddress(walletAddress);
      setChainId(connectedChainId);

      // Save wallet address to user profile
      if (user) {
        await updateUser({ walletAddress });
        toast.success('Wallet connected and saved to profile!');
      }

      if (onConnect) onConnect({ address: walletAddress, chainId: connectedChainId });
    } catch (err) {
      toast.error(err.message || 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setAddress('');
    setChainId(null);
    if (user) {
      await updateUser({ walletAddress: '' });
    }
    toast.success('Wallet disconnected');
  };

  const network = Object.entries(NETWORKS).find(([, n]) => n.chainId === chainId)?.[0];
  const networkInfo = NETWORKS[network || selectedNetwork];

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {address ? (
          <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <span className="text-xs font-medium text-purple-700">{shortenAddress(address)}</span>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors"
          >
            <Wallet className="w-4 h-4" />
            {connecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Blockchain Transparency</h3>
          <p className="text-sm text-gray-500">Connect your wallet for on-chain donation tracking</p>
        </div>
      </div>

      {!address ? (
        <div className="space-y-3">
          {/* Network selection */}
          <div className="relative">
            <label className="form-label text-xs">Network</label>
            <button
              onClick={() => setNetworkDropdown(!networkDropdown)}
              className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm"
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: NETWORKS[selectedNetwork]?.color }} />
                <span>{NETWORKS[selectedNetwork]?.name}</span>
                {selectedNetwork.includes('mumbai') || selectedNetwork.includes('sepolia') ? (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Testnet</span>
                ) : null}
              </div>
              <ChevronDown className={clsx('w-4 h-4 text-gray-400 transition-transform', networkDropdown && 'rotate-180')} />
            </button>

            {networkDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 py-1">
                {Object.entries(NETWORKS).map(([key, net]) => (
                  <button
                    key={key}
                    onClick={() => { setSelectedNetwork(key); setNetworkDropdown(false); }}
                    className={clsx(
                      'w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50',
                      selectedNetwork === key && 'text-primary-600'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: net.color }} />
                      <span>{net.name}</span>
                    </div>
                    {selectedNetwork === key && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            <Wallet className="w-5 h-5" />
            {connecting ? 'Connecting...' : 'Connect MetaMask'}
          </button>

          <p className="text-xs text-center text-gray-400">
            Your donations will be publicly verifiable on the blockchain
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-white rounded-xl p-4 border border-purple-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-sm font-medium text-gray-900">Connected</span>
              </div>
              {networkInfo && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <div className="w-2 h-2 rounded-full" style={{ background: networkInfo.color }} />
                  {networkInfo.name}
                </div>
              )}
            </div>
            <p className="text-xs font-mono text-gray-600 break-all">{address}</p>
            <div className="flex gap-2 mt-3">
              <a
                href={`${networkInfo?.explorer || 'https://polygonscan.com'}/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-purple-600 hover:underline"
              >
                View on Explorer <ExternalLink className="w-3 h-3" />
              </a>
              <button onClick={handleDisconnect} className="text-xs text-red-500 hover:underline ml-auto">
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
