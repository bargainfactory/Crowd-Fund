const express = require('express');
const router = express.Router();
const blockchainController = require('../controllers/blockchainController');
const { authenticate } = require('../middleware/auth');

router.get('/campaign/:id', blockchainController.getCampaignBlockchainData);
router.get('/verify/:txHash/:network', blockchainController.verifyTransaction);
router.get('/my-transactions', authenticate, blockchainController.getUserBlockchainTransactions);

module.exports = router;
