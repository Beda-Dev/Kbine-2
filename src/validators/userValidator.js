const Joi = require('joi');
const { getOperatorByPhoneNumber } = require('../utils/operatorUtils');

// Schéma de base pour le numéro de téléphone
const basePhoneNumberSchema = Joi.string()
    .pattern(/^(\+?225)?[0-9]{8,10}$/)
    .messages({
        'string.pattern.base': 'Le numéro de téléphone doit être un numéro ivoirien valide (8 à 10 chiffres, avec ou sans l\'indicatif 225)'
    });

// Schéma de validation pour les rôles
const roleSchema = Joi.string()
    .valid('client', 'staff', 'admin')
    .messages({
        'any.only': 'Le rôle doit être l\'un des suivants : client, staff, admin'
    });

// Fonction de validation personnalisée pour vérifier le préfixe
const validatePhoneNumberWithPrefix = async (value, helpers) => {
    try {
        const operator = await getOperatorByPhoneNumber(value);
        if (!operator) {
            return helpers.error('any.invalid');
        }
        return value;
    } catch (error) {
        console.error('Erreur lors de la validation du numéro de téléphone:', error);
        return helpers.error('any.invalid');
    }
};

// Schéma de validation pour le numéro de téléphone avec vérification du préfixe
const phoneNumberSchema = basePhoneNumberSchema.custom(validatePhoneNumberWithPrefix, 'Validation du préfixe opérateur')
    .messages({
        'any.invalid': 'Le numéro de téléphone doit commencer par un préfixe d\'opérateur valide en Côte d\'Ivoire'
    });

// Validateur principal pour la création d'utilisateur
const userValidator = Joi.object({
    phone_number: phoneNumberSchema
        .required()
        .messages({
            'any.required': 'Le numéro de téléphone est obligatoire',
            'string.empty': 'Le numéro de téléphone ne peut pas être vide',
            'string.pattern.base': 'Le numéro de téléphone doit être un numéro ivoirien valide (8 à 10 chiffres, avec ou sans l\'indicatif 225)'
        }),
    role: roleSchema
        .required()
        .messages({
            'any.required': 'Le rôle est obligatoire',
            'string.empty': 'Le rôle ne peut pas être vide'
        })
}).messages({
    'object.unknown': 'Champ non autorisé détecté'
});

// Validateur pour la mise à jour d'utilisateur
const userUpdateValidator = Joi.object({
    phone_number: phoneNumberSchema
        .messages({
            'string.empty': 'Le numéro de téléphone ne peut pas être vide'
        }),
    role: roleSchema
        .messages({
            'string.empty': 'Le rôle ne peut pas être vide'
        })
}).min(1).messages({
    'object.min': 'Au moins un champ doit être fourni pour la mise à jour',
    'object.unknown': 'Champ non autorisé détecté'
});

module.exports = {
    userValidator,
    userUpdateValidator
};
