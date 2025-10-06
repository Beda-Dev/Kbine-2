const { body, param, query } = require('express-validator');

// Options de validation communes
const commonValidations = [
    body('operator_id')
        .notEmpty().withMessage('L\'ID de l\'opérateur est requis')
        .isInt({ min: 1 }).withMessage('ID d\'opérateur invalide'),
    
    body('name')
        .notEmpty().withMessage('Le nom du plan est requis')
        .isLength({ max: 100 }).withMessage('Le nom ne doit pas dépasser 100 caractères'),
    
    body('description')
        .optional()
        .isLength({ max: 500 }).withMessage('La description ne doit pas dépasser 500 caractères'),
    
    body('price')
        .notEmpty().withMessage('Le prix est requis')
        .isFloat({ min: 0 }).withMessage('Le prix doit être un nombre positif'),
    
    body('type')
        .notEmpty().withMessage('Le type de plan est requis')
        .isIn(['credit', 'minutes', 'internet']).withMessage('Type de plan invalide'),
    
    body('validity_days')
        .optional()
        .isInt({ min: 1 }).withMessage('La validité doit être un nombre de jours positif'),
    
    body('ussd_code')
        .notEmpty().withMessage('Le code USSD est requis')
        .isString().withMessage('Le code USSD doit être une chaîne de caractères'),
    
    body('active')
        .optional()
        .isBoolean().withMessage('Le statut actif doit être un booléen')
];

// Règles de validation pour la création d'un plan
createPlanValidation = [
    ...commonValidations,
    body('name').custom(async (value) => {
        // Vérification d'unicité du nom pourrait être ajoutée ici
        return true;
    })
];

// Règles de validation pour la mise à jour d'un plan
updatePlanValidation = [
    ...commonValidations.map(validation => validation.optional()),
    param('id')
        .isInt({ min: 1 }).withMessage('ID de plan invalide')
];

// Règles de validation pour la récupération des plans
getPlansValidation = [
    query('includeInactive')
        .optional()
        .isBoolean().withMessage('Le paramètre includeInactive doit être un booléen')
        .toBoolean()
];

// Règles de validation pour la récupération par ID
getPlanByIdValidation = [
    param('id')
        .isInt({ min: 1 }).withMessage('ID de plan invalide')
];

// Règles de validation pour la suppression
deletePlanValidation = [
    param('id')
        .isInt({ min: 1 }).withMessage('ID de plan invalide')
];

// Règles de validation pour la récupération par opérateur
getPlansByOperatorValidation = [
    param('operatorId')
        .isInt({ min: 1 }).withMessage('ID d\'opérateur invalide')
];

// Règles de validation pour la recherche par numéro de téléphone
findPlansByPhoneNumberValidation = [
    param('phoneNumber')
        .notEmpty().withMessage('Le numéro de téléphone est requis')
        .isMobilePhone('any').withMessage('Numéro de téléphone invalide')
];

module.exports = {
    createPlanValidation,
    updatePlanValidation,
    getPlansValidation,
    getPlanByIdValidation,
    deletePlanValidation,
    getPlansByOperatorValidation,
    findPlansByPhoneNumberValidation
};