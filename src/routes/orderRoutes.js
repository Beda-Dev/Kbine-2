const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken, requireRole } = require('../middlewares/auth');
const { 
    createOrderValidation, 
    updateOrderValidation, 
    orderIdValidation, 
    orderStatusValidation, 
    listOrdersValidation 
} = require('../validators/orderValidator');

// Middleware pour valider l'ID de commande
const validateOrderId = (req, res, next) => {
    const { error } = orderIdValidation(req.params.id);
    if (error) {
        return res.status(400).json({
            success: false,
            error: 'ID de commande invalide',
            details: error.details
        });
    }
    next();
};

// Middleware pour valider les paramètres de requête
const validateListQuery = (req, res, next) => {
    const { error } = listOrdersValidation(req.query);
    if (error) {
        return res.status(400).json({
            success: false,
            error: 'Paramètres de requête invalides',
            details: error.details
        });
    }
    next();
};

// Routes publiques
router.post(
    '/', 
    authenticateToken,
    (req, res, next) => {
        const { error } = createOrderValidation(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Données de commande invalides',
                details: error.details
            });
        }
        next();
    },
    orderController.createOrder
);

// Routes protégées (authentification requise)
router.get(
    '/', 
    authenticateToken, 
    validateListQuery,
    orderController.getAllOrders
);

router.get(
    '/:id', 
    authenticateToken, 
    validateOrderId,
    orderController.getOrderById
);

router.put(
    '/:id', 
    authenticateToken, 
    validateOrderId,
    (req, res, next) => {
        const { error } = updateOrderValidation(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Données de mise à jour invalides',
                details: error.details
            });
        }
        next();
    },
    orderController.updateOrder
);

router.delete(
    '/:id', 
    authenticateToken, 
    requireRole(['admin']), 
    validateOrderId,
    orderController.deleteOrder
);

// Routes pour la gestion des statuts (staff/admin)
router.patch(
    '/:id/status', 
    authenticateToken, 
    requireRole(['staff', 'admin']), 
    validateOrderId,
    (req, res, next) => {
        const { error } = orderStatusValidation(req.body.status);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Statut de commande invalide',
                details: error.details
            });
        }
        next();
    },
    orderController.updateOrderStatus
);

// Routes pour l'assignation des commandes (staff/admin)
router.post(
    '/:id/assign', 
    authenticateToken, 
    requireRole(['staff', 'admin']), 
    validateOrderId,
    orderController.assignOrder
);

module.exports = router;
