// ==========================================
// FILE: operatorRoutes.js
// ==========================================
const express = require('express');
const router = express.Router();
const { 
    createOperatorValidation, 
    updateOperatorValidation, 
    operatorIdValidation 
} = require('../validators/operatorValidation');
const { authenticateToken, requireRole } = require('../middlewares/auth');
const operatorController = require('../controllers/operatorController');

/**
 * Routes pour la gestion des opérateurs
 * 
 * ORDRE IMPORTANT:
 * 1. Routes publiques
 * 2. Middleware d'authentification
 * 3. Routes protégées
 */

// ==========================================
// ROUTES PUBLIQUES (sans authentification)
// ==========================================

/**
 * Récupère tous les opérateurs
 * Route publique - pour afficher les opérateurs disponibles
 * GET /api/operators
 */
router.get('/', operatorController.getAllOperators);

/**
 * Récupère un opérateur par son ID
 * Route publique
 * GET /api/operators/:id
 */
router.get('/:id', 
    (req, res, next) => {
        const { error } = operatorIdValidation(parseInt(req.params.id));
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'ID opérateur invalide',
                details: error.details.map(d => d.message)
            });
        }
        next();
    },
    operatorController.getOperatorById
);

// ==========================================
// MIDDLEWARE D'AUTHENTIFICATION
// Toutes les routes ci-dessous nécessitent une authentification
// ==========================================
router.use(authenticateToken);

// ==========================================
// ROUTES PROTÉGÉES - ADMIN/STAFF UNIQUEMENT
// ==========================================

/**
 * Crée un nouvel opérateur
 * POST /api/operators
 */
router.post('/', 
    requireRole(['admin', 'staff']), 
    (req, res, next) => {
        const { error, value } = createOperatorValidation(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Données invalides',
                details: error.details.map(d => d.message)
            });
        }
        req.validated = value;
        next();
    },
    operatorController.createOperator
);

/**
 * Met à jour un opérateur existant
 * PUT /api/operators/:id
 */
router.put('/:id',
    requireRole(['admin', 'staff']),
    (req, res, next) => {
        // Valider l'ID
        const idValidation = operatorIdValidation(parseInt(req.params.id));
        if (idValidation.error) {
            return res.status(400).json({
                success: false,
                error: 'ID opérateur invalide',
                details: idValidation.error.details.map(d => d.message)
            });
        }
        
        // Valider les données de mise à jour
        const { error, value } = updateOperatorValidation(req.body);
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
    operatorController.updateOperator
);

/**
 * Supprime un opérateur
 * DELETE /api/operators/:id
 */
router.delete('/:id',
    requireRole(['admin', 'staff']),
    (req, res, next) => {
        const { error } = operatorIdValidation(parseInt(req.params.id));
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'ID opérateur invalide',
                details: error.details.map(d => d.message)
            });
        }
        next();
    },
    operatorController.deleteOperator
);

module.exports = router;
