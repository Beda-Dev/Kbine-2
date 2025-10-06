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
            'number.base': 'L\'ID du forfait doit être un nombre',
            'number.integer': 'L\'ID du forfait doit être un entier',
            'number.positive': 'L\'ID du forfait doit être un nombre positif',
            'any.required': 'L\'ID du forfait est obligatoire'
        }),
        
    phone_number: Joi.string()
        .pattern(/^(01|05|07)[0-9]{8}$/)
        .required()
        .messages({
            'string.pattern.base': 'Le numéro de téléphone doit être un numéro ivoirien valide (commençant par 01, 05 ou 07 suivi de 8 chiffres)',
            'any.required': 'Le numéro de téléphone est obligatoire',
            'string.empty': 'Le numéro de téléphone ne peut pas être vide'
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
        }),
        
    status: Joi.string()
        .valid(...ORDER_STATUS)
        .default('pending')
        .messages({
            'string.base': 'Le statut doit être une chaîne de caractères',
            'any.only': `Le statut doit être l'un des suivants: ${ORDER_STATUS.join(', ')}`,
            'any.default': 'Statut de commande invalide'
        }),
        
    payment_method: Joi.string()
        .valid(...PAYMENT_METHODS)
        .required()
        .messages({
            'string.base': 'La méthode de paiement doit être une chaîne de caractères',
            'any.only': `La méthode de paiement doit être l'une des suivantes: ${PAYMENT_METHODS.join(', ')}`,
            'any.required': 'La méthode de paiement est obligatoire'
        }),
    
    payment_reference: Joi.string()
        .allow('', null)
        .messages({
            'string.base': 'La référence de paiement doit être une chaîne de caractères'
        }),
    
    assigned_to: Joi.number()
        .integer()
        .positive()
        .allow(null)
        .messages({
            'number.base': 'L\'ID de l\'utilisateur assigné doit être un nombre',
            'number.integer': 'L\'ID de l\'utilisateur assigné doit être un entier',
            'number.positive': 'L\'ID de l\'utilisateur assigné doit être un nombre positif'
        })
});

/**
 * Validation pour la création d'une commande
 * @param {Object} data - Données de la commande à valider
 * @returns {Joi.ValidationResult} Résultat de la validation
 */
const createOrderValidation = (data) => {
    // On enlève le champ status pour la création (valeur par défaut: 'pending')
    const { status, ...createSchema } = orderSchema.describe().keys;
    return Joi.object(createSchema).validate(data, { 
        abortEarly: false,
        stripUnknown: true
    });
};

/**
 * Validation pour la mise à jour d'une commande
 * @param {Object} data - Données à mettre à jour
 * @returns {Joi.ValidationResult} Résultat de la validation
 */
const updateOrderValidation = (data) => {
    return Joi.object({
        plan_id: orderSchema.extract('plan_id').optional(),
        phone_number: orderSchema.extract('phone_number').optional(),
        amount: orderSchema.extract('amount').optional(),
        status: orderSchema.extract('status').optional(),
        payment_method: orderSchema.extract('payment_method').optional(),
        payment_reference: orderSchema.extract('payment_reference').optional(),
        assigned_to: orderSchema.extract('assigned_to').optional()
    }).min(1).validate(data, { 
        abortEarly: false,
        stripUnknown: true 
    });
};

/**
 * Validation d'ID de commande
 * @param {string|number} id - ID à valider
 * @returns {Joi.ValidationResult} Résultat de la validation
 */
const orderIdValidation = (id) => {
    return Joi.number()
        .integer()
        .positive()
        .required()
        .validate(id, { 
            abortEarly: false,
            convert: true
        });
};

/**
 * Validation du statut de commande
 * @param {string} status - Statut à valider
 * @returns {Joi.ValidationResult} Résultat de la validation
 */
const orderStatusValidation = (status) => {
    return Joi.string()
        .valid(...ORDER_STATUS)
        .required()
        .validate(status, { 
            abortEarly: false,
            convert: true
        });
};

/**
 * Validation des paramètres de requête pour la pagination
 * @param {Object} query - Paramètres de requête
 * @returns {Joi.ValidationResult} Résultat de la validation
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
                'number.base': 'L\'ID utilisateur doit être un nombre',
                'number.integer': 'L\'ID utilisateur doit être un entier',
                'number.positive': 'L\'ID utilisateur doit être un nombre positif'
            })
    });

    return schema.validate(query, {
        abortEarly: false,
        stripUnknown: true
    });
};

// Export des fonctions de validation et constantes
module.exports = {
    createOrderValidation,
    updateOrderValidation,
    orderIdValidation,
    orderStatusValidation,
    listOrdersValidation,
    ORDER_STATUS,
    PAYMENT_METHODS
};

// Export des types pour la documentation JSDoc
/**
 * @typedef {Object} Order
 * @property {number} id - Identifiant unique de la commande
 * @property {number} user_id - ID de l'utilisateur qui a passé la commande
 * @property {number} plan_id - ID du forfait commandé
 * @property {string} phone_number - Numéro de téléphone pour la commande
 * @property {number} amount - Montant de la commande
 * @property {string} status - Statut de la commande (pending|assigned|processing|completed|cancelled)
 * @property {string} payment_method - Méthode de paiement utilisée
 * @property {Date} created_at - Date de création de la commande
 * @property {Date} updated_at - Date de dernière mise à jour
 */
