const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');
const { 
    createPlanValidation, 
    updatePlanValidation, 
    getPlansValidation, 
    planIdValidation, 
    operatorIdValidation, 
    phoneNumberValidation 
} = require('../validators/planValidator');
const { authenticateToken, requireRole } = require('../middlewares/auth');

/**
 * Routes pour la gestion des plans
 * 
 * ORDRE IMPORTANT:
 * 1. Routes publiques spécifiques d'abord
 * 2. Middleware d'authentification
 * 3. Routes protégées (générales puis spécifiques)
 */

// ==========================================
// ROUTES PUBLIQUES (sans authentification)
// ==========================================

/**
 * Récupérer les plans disponibles pour un numéro de téléphone
 * Route publique - détecte automatiquement l'opérateur via le préfixe
 * GET /api/plans/phone/:phoneNumber
 */
router.get('/phone/:phoneNumber', 
    (req, res, next) => {
        const { error } = phoneNumberValidation(req.params.phoneNumber);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Numéro de téléphone invalide',
                details: error.details.map(d => d.message)
            });
        }
        next();
    },
    planController.findPlansByPhoneNumber
);

/**
 * Récupérer les plans d'un opérateur spécifique
 * Route publique
 * GET /api/plans/operator/:operatorId
 */
router.get('/operator/:operatorId', 
    (req, res, next) => {
        const { error } = operatorIdValidation(parseInt(req.params.operatorId));
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'ID opérateur invalide',
                details: error.details.map(d => d.message)
            });
        }
        next();
    },
    planController.getPlansByOperator
);

// ==========================================
// MIDDLEWARE D'AUTHENTIFICATION
// Toutes les routes ci-dessous nécessitent une authentification
// ==========================================
router.use(authenticateToken);

// ==========================================
// ROUTES PROTÉGÉES - ADMIN UNIQUEMENT
// ==========================================

/**
 * Récupérer tous les plans (avec option pour inclure les inactifs)
 * GET /api/plans?includeInactive=true
 */
router.get('/',
    requireRole(['admin']), // CORRECTION: Passer un tableau
    (req, res, next) => {
        const { error } = getPlansValidation(req.query);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Paramètres de requête invalides',
                details: error.details.map(d => d.message)
            });
        }
        next();
    },
    planController.getPlans
);

/**
 * Créer un nouveau plan
 * POST /api/plans
 */
router.post('/',
    requireRole(['admin']),
    (req, res, next) => {
        const { error, value } = createPlanValidation(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Données de plan invalides',
                details: error.details.map(d => d.message)
            });
        }
        req.validated = value;
        next();
    },
    planController.createPlan
);

/**
 * Récupérer un plan par son ID
 * GET /api/plans/:id
 */
router.get('/:id',
    requireRole(['admin']),
    (req, res, next) => {
        const { error } = planIdValidation(parseInt(req.params.id));
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'ID de plan invalide',
                details: error.details.map(d => d.message)
            });
        }
        next();
    },
    planController.getPlanById
);

/**
 * Mettre à jour un plan existant
 * PUT /api/plans/:id
 */
router.put('/:id',
    requireRole(['admin']),
    (req, res, next) => {
        // Valider l'ID
        const idValidation = planIdValidation(parseInt(req.params.id));
        if (idValidation.error) {
            return res.status(400).json({
                success: false,
                error: 'ID de plan invalide',
                details: idValidation.error.details.map(d => d.message)
            });
        }
        
        // Valider les données de mise à jour
        const { error, value } = updatePlanValidation(req.body);
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
    planController.updatePlan
);

/**
 * Supprimer un plan
 * DELETE /api/plans/:id
 */
router.delete('/:id',
    requireRole(['admin']),
    (req, res, next) => {
        const { error } = planIdValidation(parseInt(req.params.id));
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'ID de plan invalide',
                details: error.details.map(d => d.message)
            });
        }
        next();
    },
    planController.deletePlan
);

module.exports = router;