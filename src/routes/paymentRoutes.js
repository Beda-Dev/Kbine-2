const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { 
    createPaymentValidation,
    updatePaymentValidation,
    updatePaymentStatusValidation,
    refundPaymentValidation,
    paymentIdValidation,
    PAYMENT_METHODS,
    PAYMENT_STATUS
} = require('../validators/paymentValidator');
const { authenticateToken, requireRole } = require('../middlewares/auth');

// Middleware pour vérifier les rôles
const requireAdmin = requireRole(['admin']);
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
        data: PAYMENT_STATUS
    });
});

/**
 * @route   POST /api/payments
 * @desc    Créer un nouveau paiement
 * @access  Private
 */
router.post('/', 
    authenticateToken, 
    (req, res, next) => {
        const { error } = createPaymentValidation(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Données de paiement invalides',
                details: error.details.map(d => d.message)
            });
        }
        next();
    },
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
router.get('/:id', 
    authenticateToken, 
    (req, res, next) => {
        const { error } = paymentIdValidation(parseInt(req.params.id));
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'ID de paiement invalide',
                details: error.details.map(d => d.message)
            });
        }
        next();
    },
    paymentController.getPaymentById
);

/**
 * @route   PUT /api/payments/:id
 * @desc    Mettre à jour un paiement
 * @access  Private (Admin)
 * 🔧 CORRECTION: Simplification de la validation
 */
router.put('/:id', 
    authenticateToken, 
    requireAdmin,
    (req, res, next) => {
        console.log('[PaymentRoutes] PUT /api/payments/:id - Début validation', {
            paymentId: req.params.id,
            body: req.body
        });
        
        // Validation de l'ID
        const paymentId = parseInt(req.params.id);
        if (isNaN(paymentId)) {
            console.log('[PaymentRoutes] ID invalide');
            return res.status(400).json({
                success: false,
                error: 'ID de paiement invalide'
            });
        }
        
        // Validation des données de mise à jour
        const { error } = updatePaymentValidation(req.body);
        if (error) {
            console.log('[PaymentRoutes] Erreur validation données:', error.details);
            return res.status(400).json({
                success: false,
                error: 'Données de mise à jour invalides',
                details: error.details.map(d => d.message)
            });
        }
        
        console.log('[PaymentRoutes] Validation OK, passage au contrôleur');
        next();
    },
    paymentController.updatePayment
);

/**
 * @route   DELETE /api/payments/:id
 * @desc    Supprimer un paiement (soft delete)
 * @access  Private (Admin)
 * 🔧 CORRECTION: Simplification de la validation
 */
router.delete('/:id', 
    authenticateToken, 
    requireAdmin,
    (req, res, next) => {
        console.log('[PaymentRoutes] DELETE /api/payments/:id - Début validation', {
            paymentId: req.params.id
        });
        
        // Validation de l'ID
        const paymentId = parseInt(req.params.id);
        if (isNaN(paymentId)) {
            console.log('[PaymentRoutes] ID invalide');
            return res.status(400).json({
                success: false,
                error: 'ID de paiement invalide'
            });
        }
        
        console.log('[PaymentRoutes] Validation OK, passage au contrôleur');
        next();
    },
    paymentController.deletePayment
);

/**
 * @route   PATCH /api/payments/:id/status
 * @desc    Mettre à jour le statut d'un paiement
 * @access  Private (Admin/Staff)
 */
router.patch('/:id/status', 
    authenticateToken, 
    requireStaffOrAdmin,
    (req, res, next) => {
        // Validation de l'ID
        const idResult = paymentIdValidation(parseInt(req.params.id));
        if (idResult.error) {
            return res.status(400).json({
                success: false,
                error: 'ID de paiement invalide',
                details: idResult.error.details.map(d => d.message)
            });
        }
        
        // Validation des données de statut
        const { error } = updatePaymentStatusValidation(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Données de statut invalides',
                details: error.details.map(d => d.message)
            });
        }
        next();
    },
    paymentController.updatePaymentStatus
);

/**
 * @route   POST /api/payments/:id/refund
 * @desc    Rembourser un paiement
 * @access  Private (Admin)
 */
router.post('/:id/refund', 
    authenticateToken, 
    requireAdmin,
    (req, res, next) => {
        // Validation de l'ID
        const idResult = paymentIdValidation(parseInt(req.params.id));
        if (idResult.error) {
            return res.status(400).json({
                success: false,
                error: 'ID de paiement invalide',
                details: idResult.error.details.map(d => d.message)
            });
        }
        
        // Validation des données de remboursement
        const { error } = refundPaymentValidation(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Données de remboursement invalides',
                details: error.details.map(d => d.message)
            });
        }
        next();
    },
    paymentController.refundPayment
);

module.exports = router;