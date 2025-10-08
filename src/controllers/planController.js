const planService = require('../services/planService');
const logger = require('../utils/logger');

/**
 * Crée un nouveau plan
 */
const createPlan = async (req, res, next) => {
    try {
        // Utiliser les données validées par le middleware
        const planData = req.validated || req.body;
        
        logger.info('[PlanController] [createPlan] Création de plan', {
            name: planData.name,
            type: planData.type
        });
        
        const plan = await planService.create(planData);
        
        res.status(201).json({
            success: true,
            data: plan
        });
    } catch (error) {
        logger.error('[PlanController] [createPlan] Erreur', {
            error: error.message
        });
        next(error);
    }
};

/**
 * Récupère tous les plans
 */
const getPlans = async (req, res, next) => {
    try {
        const { includeInactive } = req.query;
        
        logger.debug('[PlanController] [getPlans] Récupération des plans', {
            includeInactive
        });
        
        const plans = await planService.findAll(includeInactive === 'true');
        
        res.json({
            success: true,
            count: plans.length,
            data: plans
        });
    } catch (error) {
        logger.error('[PlanController] [getPlans] Erreur', {
            error: error.message
        });
        next(error);
    }
};

/**
 * Récupère un plan par son ID
 */
const getPlanById = async (req, res, next) => {
    try {
        const planId = parseInt(req.params.id);
        
        logger.debug('[PlanController] [getPlanById] Récupération du plan', {
            planId
        });
        
        const plan = await planService.findById(planId);
        
        if (!plan) {
            return res.status(404).json({
                success: false,
                error: 'Plan non trouvé'
            });
        }
        
        res.json({
            success: true,
            data: plan
        });
    } catch (error) {
        logger.error('[PlanController] [getPlanById] Erreur', {
            error: error.message,
            planId: req.params.id
        });
        next(error);
    }
};

/**
 * Met à jour un plan
 */
const updatePlan = async (req, res, next) => {
    try {
        const planId = parseInt(req.params.id);
        // Utiliser les données validées par le middleware
        const updateData = req.validated || req.body;
        
        logger.info('[PlanController] [updatePlan] Mise à jour du plan', {
            planId,
            fields: Object.keys(updateData)
        });
        
        const plan = await planService.update(planId, updateData);
        
        if (!plan) {
            return res.status(404).json({
                success: false,
                error: 'Plan non trouvé'
            });
        }
        
        res.json({
            success: true,
            data: plan
        });
    } catch (error) {
        logger.error('[PlanController] [updatePlan] Erreur', {
            error: error.message,
            planId: req.params.id
        });
        next(error);
    }
};

/**
 * Supprime un plan
 */
const deletePlan = async (req, res, next) => {
    try {
        const planId = parseInt(req.params.id);
        
        logger.info('[PlanController] [deletePlan] Suppression du plan', {
            planId
        });
        
        const success = await planService.deleteById(planId);
        
        if (!success) {
            return res.status(404).json({
                success: false,
                error: 'Plan non trouvé'
            });
        }
        
        // 204 No Content ne doit pas avoir de body
        res.status(204).send();
    } catch (error) {
        logger.error('[PlanController] [deletePlan] Erreur', {
            error: error.message,
            planId: req.params.id
        });
        next(error);
    }
};

/**
 * Récupère les plans par opérateur
 */
const getPlansByOperator = async (req, res, next) => {
    try {
        const operatorId = parseInt(req.params.operatorId);
        
        logger.debug('[PlanController] [getPlansByOperator] Récupération', {
            operatorId
        });
        
        const plans = await planService.findByOperatorId(operatorId);
        
        res.json({
            success: true,
            count: plans.length,
            data: plans
        });
    } catch (error) {
        logger.error('[PlanController] [getPlansByOperator] Erreur', {
            error: error.message,
            operatorId: req.params.operatorId
        });
        next(error);
    }
};

/**
 * Recherche des plans par numéro de téléphone
 * CORRECTION: Récupérer phoneNumber depuis req.params au lieu de req.body
 */
const findPlansByPhoneNumber = async (req, res, next) => {
    try {
        const { phoneNumber } = req.params;
        
        logger.debug('[PlanController] [findPlansByPhoneNumber] Recherche', {
            phoneNumber: '***'
        });
        
        const plans = await planService.findByPhoneNumber(phoneNumber);
        
        res.json({
            success: true,
            count: plans.length,
            data: plans
        });
    } catch (error) {
        logger.error('[PlanController] [findPlansByPhoneNumber] Erreur', {
            error: error.message
        });
        next(error);
    }
};

module.exports = {
    createPlan,
    getPlans,
    getPlanById,
    updatePlan,
    deletePlan,
    getPlansByOperator,
    findPlansByPhoneNumber
};