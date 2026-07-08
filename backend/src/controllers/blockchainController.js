const Campaign = require('../models/Campaign');
const BlockchainLog = require('../models/BlockchainLog');
const { getCampaignContractStats, verifyTransaction, getExplorerUrl } = require('../services/blockchainService');

// Get campaign blockchain stats
exports.getCampaignBlockchainData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findById(id).select('blockchainEnabled contractAddress blockchainNetwork blockchainTxHash');

    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    if (!campaign.blockchainEnabled || !campaign.contractAddress) {
      return res.status(400).json({ success: false, message: 'Campaign not blockchain-enabled' });
    }

    const [onChainStats, logs] = await Promise.all([
      getCampaignContractStats(campaign.contractAddress, campaign.blockchainNetwork),
      BlockchainLog.find({ campaign: id }).sort('-createdAt').limit(20).lean()
    ]);

    const logsWithExplorer = logs.map(log => ({
      ...log,
      explorerUrl: log.txHash ? getExplorerUrl(log.txHash, log.network) : null
    }));

    res.status(200).json({
      success: true,
      data: {
        contractAddress: campaign.contractAddress,
        network: campaign.blockchainNetwork,
        deploymentTx: campaign.blockchainTxHash,
        deploymentExplorerUrl: campaign.blockchainTxHash
          ? getExplorerUrl(campaign.blockchainTxHash, campaign.blockchainNetwork)
          : null,
        onChainStats,
        transactions: logsWithExplorer
      }
    });
  } catch (error) {
    next(error);
  }
};

// Verify a specific transaction
exports.verifyTransaction = async (req, res, next) => {
  try {
    const { txHash, network } = req.params;
    const verification = await verifyTransaction(txHash, network || 'polygon-mumbai');

    res.status(200).json({
      success: true,
      data: {
        ...verification,
        explorerUrl: getExplorerUrl(txHash, network || 'polygon-mumbai')
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all blockchain transactions for a user's donations
exports.getUserBlockchainTransactions = async (req, res, next) => {
  try {
    const logs = await BlockchainLog.find({ user: req.user._id })
      .sort('-createdAt')
      .limit(50)
      .lean();

    const logsWithExplorer = logs.map(log => ({
      ...log,
      explorerUrl: log.txHash ? getExplorerUrl(log.txHash, log.network) : null
    }));

    res.status(200).json({ success: true, data: logsWithExplorer });
  } catch (error) {
    next(error);
  }
};
