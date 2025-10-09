const Joi = require('joi');

/**
 * Schémas de validation pour les plans
 * CORRECTION: Pattern de numéro de téléphone cohérent avec le reste de l'application
 */

// Schéma de base pour un plan
const planSchema = Joi.object({
    operator_id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'L\'ID de l\'opérateur doit être un nombre',
            'number.integer': 'L\'ID de l\'opérateur doit être un entier',
            'number.positive': 'L\'ID de l\'opérateur doit être un nombre positif',
            'any.required': 'L\'ID de l\'opérateur est obligatoire'
        }),

    name: Joi.string()
        .trim()
        .max(100)
        .required()
        .messages({
            'string.base': 'Le nom doit être une chaîne de caractères',
            'string.empty': 'Le nom du plan est requis',
            'string.max': 'Le nom ne doit pas dépasser 100 caractères',
            'any.required': 'Le nom du plan est obligatoire'
        }),

    description: Joi.string()
        .trim()
        .max(500)
        .allow('', null)
        .optional()
        .messages({
            'string.base': 'La description doit être une chaîne de caractères',
            'string.max': 'La description ne doit pas dépasser 500 caractères'
        }),

    price: Joi.number()
        .positive()
        .precision(2)
        .required()
        .messages({
            'number.base': 'Le prix doit être un nombre',
            'number.positive': 'Le prix doit être un nombre positif',
            'any.required': 'Le prix est obligatoire'
        }),

    type: Joi.string()
        .valid('credit', 'minutes', 'internet')
        .required()
        .messages({
            'string.base': 'Le type doit être une chaîne de caractères',
            'any.only': 'Type de plan invalide. Doit être \'credit\', \'minutes\' ou \'internet\'',
            'any.required': 'Le type de plan est obligatoire'
        }),

    validity_days: Joi.number()
        .integer()
        .positive()
        .allow(null)
        .optional()
        .messages({
            'number.base': 'La validité doit être un nombre',
            'number.integer': 'La validité doit être un nombre entier',
            'number.positive': 'La validité doit être un nombre de jours positif'
        }),

    active: Joi.boolean()
        .default(true)
        .messages({
            'boolean.base': 'Le statut actif doit être un booléen'
        })
});

/**
 * Validation pour la création d'un plan
 * Tous les champs requis doivent être présents
 */
const createPlanValidation = (data) => {
    return planSchema.validate(data, {
        abortEarly: false,
        stripUnknown: true
    });
};

/**
 * Validation pour la mise à jour d'un plan
 * Au moins un champ doit être fourni
 * Tous les champs sont optionnels individuellement
 */
const updatePlanValidation = (data) => {
    const schema = Joi.object({
        operator_id: Joi.number()
            .integer()
            .positive()
            .messages({
                'number.base': 'L\'ID de l\'opérateur doit être un nombre',
                'number.integer': 'L\'ID de l\'opérateur doit être un entier',
                'number.positive': 'L\'ID de l\'opérateur doit être un nombre positif'
            }),

        name: Joi.string()
            .trim()
            .max(100)
            .messages({
                'string.base': 'Le nom doit être une chaîne de caractères',
                'string.empty': 'Le nom du plan ne peut pas être vide',
                'string.max': 'Le nom ne doit pas dépasser 100 caractères'
            }),

        description: Joi.string()
            .trim()
            .max(500)
            .allow('', null)
            .messages({
                'string.base': 'La description doit être une chaîne de caractères',
                'string.max': 'La description ne doit pas dépasser 500 caractères'
            }),

        price: Joi.number()
            .positive()
            .precision(2)
            .messages({
                'number.base': 'Le prix doit être un nombre',
                'number.positive': 'Le prix doit être un nombre positif'
            }),

        type: Joi.string()
            .valid('credit', 'minutes', 'internet')
            .messages({
                'string.base': 'Le type doit être une chaîne de caractères',
                'any.only': 'Type de plan invalide. Doit être \'credit\', \'minutes\' ou \'internet\''
            }),

        validity_days: Joi.number()
            .integer()
            .positive()
            .allow(null)
            .messages({
                'number.base': 'La validité doit être un nombre',
                'number.integer': 'La validité doit être un nombre entier',
                'number.positive': 'La validité doit être un nombre de jours positif'
            }),



        active: Joi.boolean()
            .messages({
                'boolean.base': 'Le statut actif doit être un booléen'
            })
    })
        .min(1) // Au moins un champ doit être fourni
        .messages({
            'object.min': 'Au moins un champ doit être fourni pour la mise à jour'
        });

    return schema.validate(data, {
        abortEarly: false,
        stripUnknown: true
    });
};

/**
 * Validation pour les paramètres de requête (query params)
 */
const getPlansValidation = (query) => {
    const schema = Joi.object({
        includeInactive: Joi.boolean()
            .default(false)
            .messages({
                'boolean.base': 'Le paramètre includeInactive doit être un booléen'
            })
    });

    return schema.validate(query, { stripUnknown: true });
};

/**
 * Validation pour l'ID de plan
 */
const planIdValidation = (id) => {
    const schema = Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'L\'ID du plan doit être un nombre',
            'number.integer': 'L\'ID du plan doit être un entier',
            'number.positive': 'L\'ID du plan doit être un nombre positif',
            'any.required': 'L\'ID du plan est obligatoire'
        });

    return schema.validate(id);
};

/**
 * Validation pour l'ID d'opérateur
 */
const operatorIdValidation = (id) => {
    const schema = Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'L\'ID de l\'opérateur doit être un nombre',
            'number.integer': 'L\'ID de l\'opérateur doit être un entier',
            'number.positive': 'L\'ID de l\'opérateur doit être un nombre positif',
            'any.required': 'L\'ID de l\'opérateur est obligatoire'
        });

    return schema.validate(id);
};

/**
 * Validation pour le numéro de téléphone
 * CORRECTION: Pattern cohérent avec le reste de l'application
 * Format accepté: 0XXXXXXXXX (10 chiffres commençant par 0)
 */
const phoneNumberValidation = (phoneNumber) => {
    const schema = Joi.string()
        .pattern(/^0[0-9]{9}$/)
        .required()
        .messages({
            'string.base': 'Le numéro de téléphone doit être une chaîne de caractères',
            'string.pattern.base': 'Le numéro de téléphone doit être un numéro ivoirien valide (10 chiffres commençant par 0)',
            'string.empty': 'Le numéro de téléphone ne peut pas être vide',
            'any.required': 'Le numéro de téléphone est obligatoire'
        });

    return schema.validate(phoneNumber);
};

module.exports = {
    createPlanValidation,
    updatePlanValidation,
    getPlansValidation,
    planIdValidation,
    operatorIdValidation,
    phoneNumberValidation
};