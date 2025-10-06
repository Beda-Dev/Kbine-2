const planService = require('../services/planService');


/**
 * Crée un nouveau plan
 */
const createPlan = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                error: 'Données invalides',
                details: errors.array()
            });
            return;
        }

        const plan = await planService.create(req.body);
        res.status(201).json({
            success: true,
            data: plan
        });
    } catch (error) {
        next(error);
    }
};


const getPlans = async (req, res, next) => {
    try {
        const { includeInactive } = req.query;
        const plans = await planService.findAll(includeInactive === 'true');
        res.json({
            success: true,
            count: plans.length,
            data: plans
        });
    } catch (error) {
        next(error);
    }
};


const getPlanById = async (req, res, next) => {
    try {
        const plan = await planService.findById(req.params.id);
        if (!plan) {
            res.status(404).json({
                success: false,
                error: 'Plan non trouvé'
            });
            return;
        }
        res.json({
            success: true,
            data: plan
        });
    } catch (error) {
        next(error);
    }
};


const updatePlan = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const errors = {};

        // Validation manuelle
        if (!id || isNaN(parseInt(id)) || parseInt(id) <= 0) {
            errors.id = 'ID de plan invalide';
        }

        if (updateData.operator_id && (isNaN(parseInt(updateData.operator_id)) || parseInt(updateData.operator_id) <= 0)) {
            errors.operator_id = 'ID d\'opérateur invalide';
        }

        if (updateData.name && updateData.name.length > 100) {
            errors.name = 'Le nom ne doit pas dépasser 100 caractères';
        }

        if (updateData.description && updateData.description.length > 500) {
            errors.description = 'La description ne doit pas dépasser 500 caractères';
        }

        if (updateData.price && (isNaN(parseFloat(updateData.price)) || parseFloat(updateData.price) < 0)) {
            errors.price = 'Le prix doit être un nombre positif';
        }

        if (updateData.type && !['credit', 'minutes', 'internet'].includes(updateData.type)) {
            errors.type = 'Type de plan invalide. Doit être "credit", "minutes" ou "internet"';
        }

        if (updateData.validity_days && (isNaN(parseInt(updateData.validity_days)) || parseInt(updateData.validity_days) <= 0)) {
            errors.validity_days = 'La validité doit être un nombre de jours positif';
        }

        if (updateData.active !== undefined && typeof updateData.active !== 'boolean') {
            errors.active = 'Le statut actif doit être un booléen';
        }

        // Vérifier s'il y a des erreurs
        if (Object.keys(errors).length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Données invalides',
                details: Object.entries(errors).map(([field, message]) => ({
                    param: field,
                    msg: message,
                    location: 'body'
                }))
            });
        }

        // Si la validation réussit, procéder à la mise à jour
        const plan = await planService.update(id, updateData);
        
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
        next(error);
    }
};

/**
 * Supprime un plan
 */
const deletePlan = async (req, res, next) => {
    try {
        const success = await planService.deleteById(req.params.id);
        if (!success) {
            res.status(404).json({
                success: false,
                error: 'Plan non trouvé'
            });
            return;
        }
        res.status(204).json({
            success: true,
            data: {}
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Récupère les plans par opérateur
 */
const getPlansByOperator = async (req, res, next) => {
    try {
        const plans = await planService.findByOperatorId(req.params.operatorId);
        res.json({
            success: true,
            count: plans.length,
            data: plans
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Recherche des plans par numéro de téléphone
 */
const findPlansByPhoneNumber = async (req, res, next) => {
    try {
        const { phoneNumber } = req.body;
        const plans = await planService.findByPhoneNumber(phoneNumber);
        res.json({
            success: true,
            count: plans.length,
            data: plans
        });
    } catch (error) {
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
