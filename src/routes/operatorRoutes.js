const express = require('express');
const router = express.Router();
const { 
    createOperatorValidation, 
    updateOperatorValidation, 
    operatorIdValidation 
} = require('../validators/operatorValidation');
const { authenticateToken, requireRole } = require('../middlewares/auth');
const operatorController = require('../controllers/operatorController');

// Middleware pour valider l'ID d'opérateur
const validateOperatorId = (req, res, next) => {
    const { error } = operatorIdValidation(parseInt(req.params.id));
    if (error) {
        return res.status(400).json({
            success: false,
            error: 'ID invalide',
            details: error.details.map(d => d.message)
        });
    }
    next();
};

/**
 * @route GET /api/operators
 * @description Récupère tous les opérateurs
 * @access Public
 */
router.get('/', operatorController.getAllOperators);

/**
 * @route POST /api/operators
 * @description Crée un nouvel opérateur
 * @access Admin/Staff
 */
router.post(
    '/', 
    authenticateToken, 
    requireRole(['admin', 'staff']), 
    async (req, res, next) => {
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
 * @route PUT /api/operators/:id
 * @description Met à jour un opérateur existant
 * @access Admin/Staff
 */
router.put(
    '/:id',
    authenticateToken,
    requireRole(['admin', 'staff']),
    validateOperatorId,
    async (req, res, next) => {
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
 * @route DELETE /api/operators/:id
 * @description Supprime un opérateur
 * @access Admin/Staff
 */
router.delete(
    '/:id',
    authenticateToken,
    requireRole(['admin', 'staff']),
    validateOperatorId,
    operatorController.deleteOperator
);

module.exports = router;
