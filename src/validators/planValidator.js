const Joi = require('joi');

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
        .max(100)
        .required()
        .messages({
            'string.base': 'Le nom doit être une chaîne de caractères',
            'string.empty': 'Le nom du plan est requis',
            'string.max': 'Le nom ne doit pas dépasser 100 caractères',
            'any.required': 'Le nom du plan est obligatoire'
        }),

    description: Joi.string()
        .max(500)
        .allow('', null)
        .optional()
        .messages({
            'string.base': 'La description doit être une chaîne de caractères',
            'string.max': 'La description ne doit pas dépasser 500 caractères'
        }),

    price: Joi.number()
        .positive()
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
        .optional()
        .messages({
            'number.base': 'La validité doit être un nombre',
            'number.integer': 'La validité doit être un nombre entier',
            'number.positive': 'La validité doit être un nombre de jours positif'
        }),

    ussd_code: Joi.string()
        .required()
        .messages({
            'string.base': 'Le code USSD doit être une chaîne de caractères',
            'string.empty': 'Le code USSD est requis',
            'any.required': 'Le code USSD est obligatoire'
        }),

    active: Joi.boolean()
        .default(true)
        .messages({
            'boolean.base': 'Le statut actif doit être un booléen'
        })
});

// Validation pour la création d'un plan
const createPlanValidation = (data) => {
    const schema = planSchema.keys({
        // Vérification d'unicité du nom pourrait être ajoutée ici
        name: planSchema.extract('name')
    });
    
    return schema.validate(data, { abortEarly: false });
};

// Validation pour la mise à jour d'un plan
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
            .max(100)
            .messages({
                'string.base': 'Le nom doit être une chaîne de caractères',
                'string.empty': 'Le nom du plan est requis',
                'string.max': 'Le nom ne doit pas dépasser 100 caractères'
            }),
        description: Joi.string()
            .max(500)
            .allow('', null)
            .messages({
                'string.base': 'La description doit être une chaîne de caractères',
                'string.max': 'La description ne doit pas dépasser 500 caractères'
            }),
        price: Joi.number()
            .positive()
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
            .messages({
                'number.base': 'La validité doit être un nombre',
                'number.integer': 'La validité doit être un nombre entier',
                'number.positive': 'La validité doit être un nombre de jours positif'
            }),
        ussd_code: Joi.string()
            .messages({
                'string.base': 'Le code USSD doit être une chaîne de caractères',
                'string.empty': 'Le code USSD est requis'
            }),
        active: Joi.boolean()
            .messages({
                'boolean.base': 'Le statut actif doit être un booléen'
            })
    }).min(1); // Au moins un champ doit être fourni pour la mise à jour
    
    return schema.validate(data, { abortEarly: false });
};

// Validation pour la récupération des plans
const getPlansValidation = (query) => {
    const schema = Joi.object({
        includeInactive: Joi.boolean()
            .default(false)
            .messages({
                'boolean.base': 'Le paramètre includeInactive doit être un booléen'
            })
    });
    
    return schema.validate(query);
};

// Validation pour l'ID de plan
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

// Validation pour l'ID d'opérateur
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

// Validation pour le numéro de téléphone
const phoneNumberValidation = (phoneNumber) => {
    const schema = Joi.string()
        .pattern(/^(01|05|07)[0-9]{8}$/)
        .required()
        .messages({
            'string.base': 'Le numéro de téléphone doit être une chaîne de caractères',
            'string.pattern.base': 'Le numéro de téléphone doit être un numéro ivoirien valide (commençant par 01, 05 ou 07 suivi de 8 chiffres)',
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