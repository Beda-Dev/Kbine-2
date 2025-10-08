// ==========================================
// FILE: operatorController.js
// ==========================================
const operatorsService = require('../services/operatorsService');
const logger = require('../utils/logger');

/**
 * Récupère tous les opérateurs
 * @route GET /api/operators
 */
const getAllOperators = async (req, res, next) => {
    try {
        logger.debug('[OperatorController] [getAllOperators] Récupération des opérateurs');
        
        const operators = await operatorsService.findAll();
        
        res.json({
            success: true,
            count: operators.length,
            data: operators
        });
    } catch (error) {
        logger.error('[OperatorController] [getAllOperators] Erreur', {
            error: error.message
        });
        next(error);
    }
};

/**
 * Récupère un opérateur par son ID
 * @route GET /api/operators/:id
 */
const getOperatorById = async (req, res, next) => {
    try {
        const operatorId = parseInt(req.params.id);
        
        logger.debug('[OperatorController] [getOperatorById] Récupération', {
            operatorId
        });
        
        const operator = await operatorsService.findById(operatorId);
        
        if (!operator) {
            return res.status(404).json({
                success: false,
                error: 'Opérateur non trouvé'
            });
        }
        
        res.json({
            success: true,
            data: operator
        });
    } catch (error) {
        logger.error('[OperatorController] [getOperatorById] Erreur', {
            error: error.message,
            operatorId: req.params.id
        });
        next(error);
    }
};

/**
 * Crée un nouvel opérateur
 * @route POST /api/operators
 * @requires admin ou staff
 */
const createOperator = async (req, res, next) => {
    try {
        // Utiliser les données validées par le middleware
        const operatorData = req.validated || req.body;
        
        logger.info('[OperatorController] [createOperator] Création', {
            name: operatorData.name,
            code: operatorData.code
        });
        
        // Vérification de l'unicité du code
        const existingOperator = await operatorsService.findByCode(operatorData.code);
        if (existingOperator) {
            return res.status(409).json({
                success: false,
                error: 'Un opérateur avec ce code existe déjà'
            });
        }

        // Création de l'opérateur
        const operator = await operatorsService.create(operatorData);

        res.status(201).json({
            success: true,
            message: 'Opérateur créé avec succès',
            data: operator
        });
    } catch (error) {
        logger.error('[OperatorController] [createOperator] Erreur', {
            error: error.message
        });
        next(error);
    }
};

/**
 * Met à jour un opérateur existant
 * @route PUT /api/operators/:id
 * @requires admin ou staff
 */
const updateOperator = async (req, res, next) => {
    try {
        const operatorId = parseInt(req.params.id);
        // Utiliser les données validées par le middleware
        const updateData = req.validated || req.body;
        
        logger.info('[OperatorController] [updateOperator] Mise à jour', {
            operatorId,
            fields: Object.keys(updateData)
        });

        // Vérification de l'existence de l'opérateur
        const existingOperator = await operatorsService.findById(operatorId);
        if (!existingOperator) {
            return res.status(404).json({
                success: false,
                error: 'Opérateur non trouvé'
            });
        }

        // Vérification de l'unicité du code si modifié
        if (updateData.code && updateData.code !== existingOperator.code) {
            const operatorWithSameCode = await operatorsService.findByCode(updateData.code);
            if (operatorWithSameCode) {
                return res.status(409).json({
                    success: false,
                    error: 'Un autre opérateur avec ce code existe déjà'
                });
            }
        }

        // Mise à jour de l'opérateur
        const updatedOperator = await operatorsService.update(operatorId, updateData);

        res.json({
            success: true,
            message: 'Opérateur mis à jour avec succès',
            data: updatedOperator
        });
    } catch (error) {
        logger.error('[OperatorController] [updateOperator] Erreur', {
            error: error.message,
            operatorId: req.params.id
        });
        next(error);
    }
};

/**
 * Supprime un opérateur
 * @route DELETE /api/operators/:id
 * @requires admin ou staff
 */
const deleteOperator = async (req, res, next) => {
    try {
        const operatorId = parseInt(req.params.id);
        
        logger.info('[OperatorController] [deleteOperator] Suppression', {
            operatorId
        });

        // Vérification de l'existence de l'opérateur
        const operator = await operatorsService.findById(operatorId);
        if (!operator) {
            return res.status(404).json({
                success: false,
                error: 'Opérateur non trouvé'
            });
        }

        // Suppression de l'opérateur
        await operatorsService.deleteById(operatorId);

        // 204 No Content ne doit pas avoir de body
        res.status(204).send();
    } catch (error) {
        logger.error('[OperatorController] [deleteOperator] Erreur', {
            error: error.message,
            operatorId: req.params.id
        });
        
        if (error.message.includes('impossible de supprimer')) {
            return res.status(400).json({
                success: false,
                error: 'Impossible de supprimer cet opérateur',
                details: error.message
            });
        }
        
        next(error);
    }
};

module.exports = {
    getAllOperators,
    getOperatorById,
    createOperator,
    updateOperator,
    deleteOperator
};
