const express = require('express');
const router = express.Router();
const { validateOperator } = require('../validators/operatorValidation');
const { authenticateToken, requireRole } = require('../middlewares/auth');

const operatorController = require('../controllers/operatorController');

router.get('/', operatorController.getAllOperators);
router.post('/', validateOperator, authenticateToken, requireRole(['admin', 'staff']), operatorController.createOperator);
router.put('/:id', validateOperator, authenticateToken, requireRole(['admin', 'staff']), operatorController.updateOperator);
router.delete('/:id', authenticateToken, requireRole(['admin', 'staff']), operatorController.deleteOperator);

module.exports = router;



