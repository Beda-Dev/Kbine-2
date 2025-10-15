// ==========================================
// FILE: orderValidator.js (CORRIGÉ)
// ==========================================
const Joi = require('joi');

// Constantes de validation
const ORDER_STATUS = ['pending', 'assigned', 'processing', 'completed', 'cancelled'];
const PAYMENT_METHODS = ['wave', 'orange_money', 'mtn_money', 'moov_money'];

// Schéma de base pour une commande

const orderSchema = Joi.object({
    plan_id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': "L'ID du forfait doit être un nombre",
            'number.integer': "L'ID du forfait doit être un entier",
            'number.positive': "L'ID du forfait doit être un nombre positif",
            'any.required': "L'ID du forfait est obligatoire"
        }),
        
    amount: Joi.number()
        .positive()
        .precision(2)
        .required()
        .messages({
            'number.base': 'Le montant doit être un nombre',
            'number.positive': 'Le montant doit être un nombre positif',
            'number.precision': 'Le montant doit avoir au maximum 2 décimales',
            'any.required': 'Le montant est obligatoire'
        })
});

/**
 * Validation pour la création d'une commande
 */
const createOrderValidation = (data) => {
    return orderSchema.validate(data, { 
        abortEarly: false,
        stripUnknown: true
    });
};

/**
 * Validation pour la mise à jour d'une commande
 */
const updateOrderValidation = (data) => {
    const schema = Joi.object({
        plan_id: Joi.number()
            .integer()
            .positive()
            .messages({
                'number.base': "L'ID du forfait doit être un nombre",
                'number.integer': "L'ID du forfait doit être un entier",
                'number.positive': "L'ID du forfait doit être un nombre positif"
            }),
        
        amount: Joi.number()
            .positive()
            .precision(2)
            .messages({
                'number.base': 'Le montant doit être un nombre',
                'number.positive': 'Le montant doit être un nombre positif',
                'number.precision': 'Le montant doit avoir au maximum 2 décimales'
            }),
        
        
        status: Joi.string()
            .valid(...ORDER_STATUS)
            .messages({
                'string.base': 'Le statut doit être une chaîne de caractères',
                'any.only': `Le statut doit être l'un des suivants: ${ORDER_STATUS.join(', ')}`
            }),
        
        assigned_to: Joi.number()
            .integer()
            .positive()
            .allow(null)
            .messages({
                'number.base': "L'ID de l'utilisateur assigné doit être un nombre",
                'number.integer': "L'ID de l'utilisateur assigné doit être un entier",
                'number.positive': "L'ID de l'utilisateur assigné doit être un nombre positif"
            })
        
    })
    .min(1)
    .messages({
        'object.min': 'Au moins un champ doit être fourni pour la mise à jour'
    });
    
    return schema.validate(data, { 
        abortEarly: false,
        stripUnknown: true 
    });
};

/**
 * Validation d'ID de commande
 */
const orderIdValidation = (id) => {
    const schema = Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'L\'ID de la commande doit être un nombre',
            'number.integer': 'L\'ID de la commande doit être un entier',
            'number.positive': 'L\'ID de la commande doit être un nombre positif',
            'any.required': 'L\'ID de la commande est obligatoire'
        });
    
    return schema.validate(id);
};

/**
 * Validation du statut de commande
 */
const orderStatusValidation = (status) => {
    const schema = Joi.string()
        .valid(...ORDER_STATUS)
        .required()
        .messages({
            'string.base': 'Le statut doit être une chaîne de caractères',
            'any.only': `Le statut doit être l'un des suivants: ${ORDER_STATUS.join(', ')}`,
            'any.required': 'Le statut est obligatoire'
        });
    
    return schema.validate(status);
};

/**
 * Validation des paramètres de requête pour la pagination
 */
const listOrdersValidation = (query) => {
    const schema = Joi.object({
        page: Joi.number()
            .integer()
            .min(1)
            .default(1)
            .messages({
                'number.base': 'Le numéro de page doit être un nombre',
                'number.integer': 'Le numéro de page doit être un entier',
                'number.min': 'Le numéro de page doit être supérieur à 0'
            }),
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .default(10)
            .messages({
                'number.base': 'La limite doit être un nombre',
                'number.integer': 'La limite doit être un entier',
                'number.min': 'La limite doit être supérieure à 0',
                'number.max': 'La limite ne peut pas dépasser 100'
            }),
        status: Joi.string()
            .valid(...ORDER_STATUS, '')
            .messages({
                'string.base': 'Le statut doit être une chaîne de caractères',
                'any.only': `Le statut doit être l'un des suivants: ${ORDER_STATUS.join(', ')}`
            }),
        user_id: Joi.number()
            .integer()
            .positive()
            .messages({
                'number.base': "L'ID utilisateur doit être un nombre",
                'number.integer': "L'ID utilisateur doit être un entier",
                'number.positive': "L'ID utilisateur doit être un nombre positif"
            })
    });

    return schema.validate(query, {
        abortEarly: false,
        stripUnknown: true
    });
};

module.exports = {
    createOrderValidation,
    updateOrderValidation,
    orderIdValidation,
    orderStatusValidation,
    listOrdersValidation,
    ORDER_STATUS,
    PAYMENT_METHODS
};