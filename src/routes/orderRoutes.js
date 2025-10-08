// ==========================================
// FILE: orderRoutes.js (CORRIGÉ)
// ==========================================
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

/**
 * Routes pour la gestion des commandes
 * 
 * ORDRE IMPORTANT:
 * 1. Routes spécifiques avec authentification
 * 2. Routes générales avec authentification
 */

// ==========================================
// MIDDLEWARE D'AUTHENTIFICATION
// Toutes les routes nécessitent une authentification
// ==========================================
router.use(authenticateToken);

// ==========================================
// ROUTES POUR LES COMMANDES
// ==========================================

/**
 * Crée une nouvelle commande
 * POST /api/orders
 */
router.post('/',
    (req, res, next) => {
        const { error, value } = createOrderValidation(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Données de commande invalides',
                details: error.details.map(d => d.message)
            });
        }
        req.validated = value;
        next();
    },
    orderController.createOrder
);

/**
 * Récupère toutes les commandes avec pagination et filtres
 * GET /api/orders
 */
router.get('/',
    (req, res, next) => {
        const { error, value } = listOrdersValidation(req.query);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Paramètres de requête invalides',
                details: error.details.map(d => d.message)
            });
        }
        req.query = value;
        next();
    },
    orderController.getAllOrders
);

/**
 * Récupère une commande par son ID
 * GET /api/orders/:id
 */
router.get('/:id',
    (req, res, next) => {
        const { error } = orderIdValidation(parseInt(req.params.id));
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'ID de commande invalide',
                details: error.details.map(d => d.message)
            });
        }
        next();
    },
    orderController.getOrderById
);

/**
 * Met à jour une commande existante
 * PUT /api/orders/:id
 */
router.put('/:id',
    (req, res, next) => {
        // Valider l'ID
        const idValidation = orderIdValidation(parseInt(req.params.id));
        if (idValidation.error) {
            return res.status(400).json({
                success: false,
                error: 'ID de commande invalide',
                details: idValidation.error.details.map(d => d.message)
            });
        }
        
        // Valider les données de mise à jour
        const { error, value } = updateOrderValidation(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Données de mise à jour invalides',
                details: error.details.map(d => d.message)
            });
        }
        
        req.validated = value;
        next();
    },
    orderController.updateOrder
);

/**
 * Supprime une commande (admin uniquement)
 * DELETE /api/orders/:id
 */
router.delete('/:id',
    requireRole(['admin']),
    (req, res, next) => {
        const { error } = orderIdValidation(parseInt(req.params.id));
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'ID de commande invalide',
                details: error.details.map(d => d.message)
            });
        }
        next();
    },
    orderController.deleteOrder
);

/**
 * Met à jour le statut d'une commande (staff/admin)
 * PATCH /api/orders/:id/status
 */
router.patch('/:id/status',
    requireRole(['staff', 'admin']),
    (req, res, next) => {
        // Valider l'ID
        const idValidation = orderIdValidation(parseInt(req.params.id));
        if (idValidation.error) {
            return res.status(400).json({
                success: false,
                error: 'ID de commande invalide',
                details: idValidation.error.details.map(d => d.message)
            });
        }
        
        // Valider le statut
        const { error } = orderStatusValidation(req.body.status);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Statut de commande invalide',
                details: error.details.map(d => d.message)
            });
        }
        
        next();
    },
    orderController.updateOrderStatus
);

/**
 * Assigne une commande à un membre du staff (staff/admin)
 * POST /api/orders/:id/assign
 */
router.post('/:id/assign',
    requireRole(['staff', 'admin']),
    (req, res, next) => {
        const { error } = orderIdValidation(parseInt(req.params.id));
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'ID de commande invalide',
                details: error.details.map(d => d.message)
            });
        }
        next();
    },
    orderController.assignOrder
);

module.exports = router;

