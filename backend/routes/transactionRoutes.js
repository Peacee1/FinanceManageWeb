const express = require('express');
const router = express.Router();
const { getSummary, getTransactions, addTransaction, deleteTransaction, updateTransaction } = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');
const { evidenceUpload } = require('../middleware/evidenceUpload');

router.get('/summary', protect, getSummary);

router.route('/')
  .get(protect, getTransactions)
  .post(protect, evidenceUpload, addTransaction);

router.route('/:id')
  .put(protect, updateTransaction)
  .delete(protect, deleteTransaction);

module.exports = router;

