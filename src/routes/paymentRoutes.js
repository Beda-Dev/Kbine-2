const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { 
    validateCreatePayment, 
    validateUpdatePayment,
    validateUpdatePaymentStatus,
    validateRefundPayment
} = require('../validators/paymentValidator');
const { authenticateToken, requireRole } = require('../middlewares/auth');

// Middleware pour vérifier les rôles
const requireAdmin = requireRole('admin');
const requireStaffOrAdmin = requireRole(['staff', 'admin']);

/**
 * @route   GET /api/payments/methods
 * @desc    Récupérer les méthodes de paiement disponibles
 * @access  Public
 */
router.get('/methods', (req, res) => {
    res.json({
        success: true,
        data: paymentController.PAYMENT_METHODS
    });
});

/**
 * @route   GET /api/payments/status
 * @desc    Récupérer les statuts de paiement disponibles
 * @access  Public
 */
router.get('/status', (req, res) => {
    res.json({
        success: true,
        data: paymentController.PAYMENT_STATUS
    });
});

/**
 * @route   POST /api/payments
 * @desc    Créer un nouveau paiement
 * @access  Private
 */
router.post(
    '/', 
    authenticateToken, 
    validateCreatePayment, 
    paymentController.createPayment
);

/**
 * @route   GET /api/payments
 * @desc    Récupérer tous les paiements (avec pagination et filtres)
 * @access  Private (Admin/Staff)
 */
router.get(
    '/', 
    authenticateToken, 
    requireStaffOrAdmin,
    paymentController.getPayments
);

/**
 * @route   GET /api/payments/:id
 * @desc    Récupérer un paiement par son ID
 * @access  Private
 */
router.get(
    '/:id', 
    authenticateToken, 
    paymentController.getPaymentById
);

/**
 * @route   PUT /api/payments/:id
 * @desc    Mettre à jour un paiement
 * @access  Private (Admin)
 */
router.put(
    '/:id', 
    authenticateToken, 
    requireAdmin, 
    validateUpdatePayment,
    paymentController.updatePayment
);

/**
 * @route   DELETE /api/payments/:id
 * @desc    Supprimer un paiement (soft delete)
 * @access  Private (Admin)
 */
router.delete(
    '/:id', 
    authenticateToken, 
    requireAdmin, 
    paymentController.deletePayment
);

/**
 * @route   PATCH /api/payments/:id/status
 * @desc    Mettre à jour le statut d'un paiement
 * @access  Private (Admin/Staff)
 */
router.patch(
    '/:id/status', 
    authenticateToken, 
    requireStaffOrAdmin, 
    validateUpdatePaymentStatus,
    paymentController.updatePaymentStatus
);

/**
 * @route   POST /api/payments/:id/refund
 * @desc    Rembourser un paiement
 * @access  Private (Admin)
 */
router.post(
    '/:id/refund', 
    authenticateToken, 
    requireAdmin, 
    validateRefundPayment,
    paymentController.refundPayment
);

module.exports = router;