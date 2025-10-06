const operatorsService = require('../services/operatorsService');
const { authenticateToken, requireRole } = require('../middlewares/auth');
const logger = require('../utils/logger');
const { 
    createOperatorValidation, 
    updateOperatorValidation, 
    operatorIdValidation 
} = require('../validators/operatorValidation');

/**
 * Récupère tous les opérateurs
 * @route GET /api/operators
 */
const getAllOperators = async (req, res) => {
    try {
        const operators = await operatorsService.findAll();
        res.json({
            success: true,
            data: operators
        });
    } catch (error) {
        console.error('Erreur getAllOperators:', error);
        logger.error('Erreur getAllOperators:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erreur lors de la récupération des opérateurs',
            details: error.message 
        });
    }
};

/**
 * Crée un nouvel opérateur
 * @route POST /api/operators
 * @requires admin ou staff
 */
const createOperator = async (req, res) => {
    try {
        // Validation des données d'entrée
        const { error, value: validatedData } = createOperatorValidation(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Données invalides',
                details: error.details.map(d => d.message)
            });
        }

        // Vérification de l'unicité du code
        const existingOperator = await operatorsService.findByCode(validatedData.code);
        if (existingOperator) {
            return res.status(409).json({
                success: false,
                error: 'Un opérateur avec ce code existe déjà'
            });
        }

        // Création de l'opérateur
        const operator = await operatorsService.create(validatedData);

        res.status(201).json({
            success: true,
            message: 'Opérateur créé avec succès',
            data: operator
        });
    } catch (error) {
        console.error('Erreur createOperator:', error);
        logger.error('Erreur createOperator:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la création de l\'opérateur',
            details: error.message
        });
    }
};

/**
 * Met à jour un opérateur existant
 * @route PUT /api/operators/:id
 * @requires admin ou staff
 */
const updateOperator = async (req, res) => {
    try {
        const { id } = req.params;

        // Validation de l'ID
        const idValidation = operatorIdValidation(parseInt(id));
        if (idValidation.error) {
            return res.status(400).json({
                success: false,
                error: 'ID invalide',
                details: idValidation.error.details.map(d => d.message)
            });
        }

        // Validation des données de mise à jour
        const { error, value: validatedData } = updateOperatorValidation(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Données de mise à jour invalides',
                details: error.details.map(d => d.message)
            });
        }

        // Vérification de l'existence de l'opérateur
        const existingOperator = await operatorsService.findById(id);
        if (!existingOperator) {
            return res.status(404).json({
                success: false,
                error: 'Opérateur non trouvé'
            });
        }

        // Vérification de l'unicité du code si modifié
        if (validatedData.code && validatedData.code !== existingOperator.code) {
            const operatorWithSameCode = await operatorsService.findByCode(validatedData.code);
            if (operatorWithSameCode) {
                return res.status(409).json({
                    success: false,
                    error: 'Un autre opérateur avec ce code existe déjà'
                });
            }
        }

        // Mise à jour de l'opérateur
        const updatedOperator = await operatorsService.update(id, validatedData);

        res.status(200).json({
            success: true,
            message: 'Opérateur mis à jour avec succès',
            data: updatedOperator
        });
    } catch (error) {
        console.error('Erreur updateOperator:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la mise à jour de l\'opérateur',
            details: error.message
        });
    }
};

/**
 * Supprime un opérateur
 * @route DELETE /api/operators/:id
 * @requires admin ou staff
 */
const deleteOperator = async (req, res) => {
    try {
        const { id } = req.params;

        // Validation de l'ID
        const idValidation = operatorIdValidation(parseInt(id));
        if (idValidation.error) {
            return res.status(400).json({
                success: false,
                error: 'ID invalide',
                details: idValidation.error.details.map(d => d.message)
            });
        }

        // Vérification de l'existence de l'opérateur
        const operator = await operatorsService.findById(id);
        if (!operator) {
            return res.status(404).json({
                success: false,
                error: 'Opérateur non trouvé'
            });
        }

        // Suppression de l'opérateur
        await operatorsService.deleteById(id);

        res.status(200).json({
            success: true,
            message: 'Opérateur supprimé avec succès',
            data: { id }
        });
    } catch (error) {
        console.error('Erreur deleteOperator:', error);
        
        if (error.message.includes('impossible de supprimer')) {
            return res.status(400).json({
                success: false,
                error: 'Impossible de supprimer cet opérateur',
                details: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression de l\'opérateur',
            details: error.message
        });
    }
};

module.exports = {
    getAllOperators,
    createOperator,
    updateOperator,
    deleteOperator
};
