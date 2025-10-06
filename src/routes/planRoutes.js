const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');
const {
    createPlanValidation,
    updatePlanValidation,
    getPlansValidation,
    getPlanByIdValidation,
    deletePlanValidation,
    getPlansByOperatorValidation,
    findPlansByPhoneNumberValidation
} = require('../validators/planValidator');
const { authenticateToken, requireRole } = require('../middlewares/auth');
const { validate } = require('../validators/planValidator');

// Routes publiques
router.post('/phone/:phoneNumber', 
    findPlansByPhoneNumberValidation, 
    validate, 
    planController.findPlansByPhoneNumber
);

router.get('/operator/:operatorId', 
    getPlansByOperatorValidation, 
    validate, 
    planController.getPlansByOperator
);

// Routes protégées - nécessitent une authentification
router.use(authenticateToken);


router.get(
    '/',
    requireRole('admin'),
    getPlansValidation,
    validate,
    planController.getPlans
);

router.get(
    '/:id',
    requireRole('admin'),
    getPlanByIdValidation,
    validate,
    planController.getPlanById
);

router.post(
    '/',
    requireRole('admin'),
    createPlanValidation,
    validate,
    planController.createPlan
);

router.put(
    '/:id',
    requireRole('admin'),
    updatePlanValidation,
    validate,
    planController.updatePlan
);

router.delete(
    '/:id',
    requireRole('admin'),
    deletePlanValidation,
    validate,
    planController.deletePlan
);

module.exports = router;
