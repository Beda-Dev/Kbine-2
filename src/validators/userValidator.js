const Joi = require('joi');


const phoneNumberSchema = Joi.string()
    .pattern(/^(\+225)?[6-9][0-9]{7}$/)
    .messages({
        'string.pattern.base': 'Le numéro de téléphone doit être un numéro ivoirien valide'
    });

// Schéma de validation pour les rôles
const roleSchema = Joi.string()
    .valid('client', 'staff', 'admin')
    .messages({
        'any.only': 'Le rôle doit être l\'un des suivants : client, staff, admin'
    });

// Validateur principal pour la création d'utilisateur
const userValidator = Joi.object({
    phone_number: phoneNumberSchema
        .required()
        .messages({
            'any.required': 'Le numéro de téléphone est obligatoire',
            'string.empty': 'Le numéro de téléphone ne peut pas être vide'
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
