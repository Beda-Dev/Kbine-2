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

// Middleware pour gérer les erreurs de validation
const validateRequest = (validationFn, property = 'body') => {
    return async (req, res, next) => {
        const { error, value } = validationFn(req[property]);
        if (error) {
            return res.status(400).json({
                error: 'Erreur de validation',
                details: error.details.map(d => d.message)
            });
        }
        // Ajoute les données validées à l'objet de requête
        req.validated = value;
        next();
    };
};

// Routes publiques
router.post('/phone/:phoneNumber', 
    async (req, res, next) => {
        const { error } = phoneNumberValidation(req.params.phoneNumber);
        if (error) {
            return res.status(400).json({
                error: 'Numéro de téléphone invalide',
                details: error.details.map(d => d.message)
            });
        }
        next();
    },
    planController.findPlansByPhoneNumber
);

router.get('/operator/:operatorId', 
    async (req, res, next) => {
        const { error } = operatorIdValidation(parseInt(req.params.operatorId));
        if (error) {
            return res.status(400).json({
                error: 'ID opérateur invalide',
                details: error.details.map(d => d.message)
            });
        }
        next();
    },
    planController.getPlansByOperator
);

// Routes protégées - nécessitent une authentification
router.use(authenticateToken);

// Récupérer tous les plans
router.get(
    '/',
    requireRole('admin'),
    (req, res, next) => {
        const { error } = getPlansValidation(req.query);
        if (error) {
            return res.status(400).json({
                error: 'Paramètres de requête invalides',
                details: error.details.map(d => d.message)
            });
        }
        next();
    },
    planController.getPlans
);

// Récupérer un plan par ID
router.get(
    '/:id',
    requireRole('admin'),
    (req, res, next) => {
        const { error } = planIdValidation(parseInt(req.params.id));
        if (error) {
            return res.status(400).json({
                error: 'ID de plan invalide',
                details: error.details.map(d => d.message)
            });
        }
        next();
    },
    planController.getPlanById
);

// Créer un nouveau plan
router.post(
    '/',
    requireRole('admin'),
    (req, res, next) => {
        const { error, value } = createPlanValidation(req.body);
        if (error) {
            return res.status(400).json({
                error: 'Données de plan invalides',
                details: error.details.map(d => d.message)
            });
        }
        req.validated = value;
        next();
    },
    planController.createPlan
);

// Mettre à jour un plan existant
router.put(
    '/:id',
    requireRole('admin'),
    (req, res, next) => {
        // Valider d'abord l'ID
        let idError = planIdValidation(parseInt(req.params.id)).error;
        if (idError) {
            return res.status(400).json({
                error: 'ID de plan invalide',
                details: idError.details.map(d => d.message)
            });
        }
        
        // Ensuite valider les données de mise à jour
        const { error, value } = updatePlanValidation(req.body);
        if (error) {
            return res.status(400).json({
                error: 'Données de mise à jour invalides',
                details: error.details.map(d => d.message)
            });
        }
        
        req.validated = value;
        next();
    },
    planController.updatePlan
);

// Supprimer un plan
router.delete(
    '/:id',
    requireRole('admin'),
    (req, res, next) => {
        const { error } = planIdValidation(parseInt(req.params.id));
        if (error) {
            return res.status(400).json({
                error: 'ID de plan invalide',
                details: error.details.map(d => d.message)
            });
        }
        next();
    },
    planController.deletePlan
);

module.exports = router;
