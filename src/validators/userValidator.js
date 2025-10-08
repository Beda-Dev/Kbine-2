const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * CORRECTION: Simplification du validateur pour éviter les problèmes avec la validation asynchrone
 * La validation du préfixe opérateur sera effectuée côté contrôleur si nécessaire
 */

// Schéma de validation pour le numéro de téléphone (format de base)
const phoneNumberSchema = Joi.string()
    .pattern(/^(\+?225)?0[0-9]{9}$/)
    .required()
    .messages({
        'string.empty': 'Le numéro de téléphone ne peut pas être vide',
        'string.pattern.base': 'Le numéro de téléphone doit être un numéro ivoirien valide (10 chiffres commençant par 0, avec ou sans +225)',
        'any.required': 'Le numéro de téléphone est obligatoire'
    });

// Schéma de validation pour les rôles
const roleSchema = Joi.string()
    .valid('client', 'staff', 'admin')
    .required()
    .messages({
        'any.only': 'Le rôle doit être l\'un des suivants : client, staff, admin',
        'any.required': 'Le rôle est obligatoire',
        'string.empty': 'Le rôle ne peut pas être vide'
    });

// Validateur principal pour la création d'utilisateur
const userValidator = Joi.object({
    phone_number: phoneNumberSchema,
    role: roleSchema
}).messages({
    'object.unknown': 'Champ non autorisé détecté'
});

// Validateur pour la mise à jour d'utilisateur
const userUpdateValidator = Joi.object({
    phone_number: Joi.string()
        .pattern(/^(\+?225)?0[0-9]{9}$/)
        .messages({
            'string.empty': 'Le numéro de téléphone ne peut pas être vide',
            'string.pattern.base': 'Le numéro de téléphone doit être un numéro ivoirien valide'
        }),
    role: Joi.string()
        .valid('client', 'staff', 'admin')
        .messages({
            'any.only': 'Le rôle doit être l\'un des suivants : client, staff, admin',
            'string.empty': 'Le rôle ne peut pas être vide'
        })
}).min(1).messages({
    'object.min': 'Au moins un champ doit être fourni pour la mise à jour',
    'object.unknown': 'Champ non autorisé détecté'
});

// Fonction de validation avec logging
const createValidationFunction = (schema, context = '') => {
    return async (data) => {
        logger.debug(`[UserValidator] Début validation ${context}`, { data });
        
        try {
            const result = await schema.validateAsync(data, { 
                abortEarly: false,
                stripUnknown: true 
            });
            
            logger.debug(`[UserValidator] Validation ${context} réussie`, { 
                validatedData: result
            });
            
            return result;
            
        } catch (validationError) {
            const errors = validationError.details.map(detail => ({
                field: detail.path[0],
                message: detail.message,
                type: detail.type
            }));
            
            logger.warn(`[UserValidator] Échec validation ${context}`, {
                errors,
                originalData: data
            });
            
            throw validationError;
        }
    };
};

// Création des validateurs avec logging
const validateUser = createValidationFunction(userValidator, 'création utilisateur');
const validateUserUpdate = createValidationFunction(userUpdateValidator, 'mise à jour utilisateur');

module.exports = {
    userValidator: validateUser,
    userUpdateValidator: validateUserUpdate,
    // Export des schémas bruts pour les tests
    schemas: {
        user: userValidator,
        userUpdate: userUpdateValidator
    }
};