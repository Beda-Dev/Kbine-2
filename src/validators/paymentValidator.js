const Joi = require('joi');

// Schéma de base pour un paiement
const paymentSchema = Joi.object({
    order_id: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'L\'ID de la commande doit être un nombre',
            'number.integer': 'L\'ID de la commande doit être un entier',
            'number.positive': 'L\'ID de la commande doit être un nombre positif',
            'any.required': 'L\'ID de la commande est obligatoire'
        }),
    
    amount: Joi.number().positive().precision(2).required()
        .messages({
            'number.base': 'Le montant doit être un nombre',
            'number.positive': 'Le montant doit être un nombre positif',
            'number.precision': 'Le montant doit avoir au maximum 2 décimales',
            'any.required': 'Le montant est obligatoire'
        }),
    
    payment_method: Joi.string().valid('wave', 'orange_money', 'mtn_money', 'moov_money').required()
        .messages({
            'string.base': 'La méthode de paiement doit être une chaîne de caractères',
            'any.only': 'Méthode de paiement non valide',
            'any.required': 'La méthode de paiement est obligatoire'
        }),
    
    payment_reference: Joi.string().required()
        .messages({
            'string.base': 'La référence de paiement doit être une chaîne de caractères',
            'string.empty': 'La référence de paiement ne peut pas être vide',
            'any.required': 'La référence de paiement est obligatoire'
        }),
    
    external_reference: Joi.string().optional()
        .messages({
            'string.base': 'La référence externe doit être une chaîne de caractères'
        }),
    
    status: Joi.string().valid('pending', 'success', 'failed', 'refunded').default('pending')
        .messages({
            'string.base': 'Le statut doit être une chaîne de caractères',
            'any.only': 'Statut de paiement non valide'
        }),
    
    status_notes: Joi.string().optional()
        .messages({
            'string.base': 'Les notes de statut doivent être une chaîne de caractères'
        }),
    
    callback_data: Joi.object().optional()
        .messages({
            'object.base': 'Les données de callback doivent être un objet'
        })
}).options({ abortEarly: false });

// Schéma pour la création d'un paiement
const createPaymentSchema = paymentSchema.keys({
    // Ajouter des validations spécifiques à la création si nécessaire
});

// Schéma pour la mise à jour d'un paiement
const updatePaymentSchema = Joi.object({
    amount: Joi.number().positive().precision(2)
        .messages({
            'number.base': 'Le montant doit être un nombre',
            'number.positive': 'Le montant doit être un nombre positif',
            'number.precision': 'Le montant doit avoir au maximum 2 décimales'
        }),
    
    status: Joi.string().valid('pending', 'success', 'failed', 'refunded')
        .messages({
            'string.base': 'Le statut doit être une chaîne de caractères',
            'any.only': 'Statut de paiement non valide'
        }),
    
    status_notes: Joi.string().optional()
        .messages({
            'string.base': 'Les notes de statut doivent être une chaîne de caractères'
        }),
    
    callback_data: Joi.object().optional()
        .messages({
            'object.base': 'Les données de callback doivent être un objet'
        })
}).min(1).messages({
    'object.min': 'Au moins un champ doit être fourni pour la mise à jour'
});

// Schéma pour la mise à jour du statut d'un paiement
const updatePaymentStatusSchema = Joi.object({
    status: Joi.string().valid('pending', 'success', 'failed', 'refunded').required()
        .messages({
            'string.base': 'Le statut doit être une chaîne de caractères',
            'any.only': 'Statut de paiement non valide',
            'any.required': 'Le statut est obligatoire'
        }),
    
    notes: Joi.string().optional()
        .messages({
            'string.base': 'Les notes doivent être une chaîne de caractères'
        })
});

// Schéma pour le remboursement
const refundPaymentSchema = Joi.object({
    reason: Joi.string().required()
        .messages({
            'string.base': 'La raison doit être une chaîne de caractères',
            'string.empty': 'La raison ne peut pas être vide',
            'any.required': 'La raison du remboursement est obligatoire'
        })
});

// Fonctions de validation
const validate = (schema) => (data) => {
    const { error, value } = schema.validate(data, { 
        abortEarly: false,
        allowUnknown: true,
        stripUnknown: true
    });
    
    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
        }));
        
        const validationError = new Error('Validation error');
        validationError.name = 'ValidationError';
        validationError.details = errors;
        throw validationError;
    }
    
    return value;
};

// Export des validateurs
module.exports = {
    // Schémas
    paymentSchema,
    createPaymentSchema,
    updatePaymentSchema,
    updatePaymentStatusSchema,
    refundPaymentSchema,
    
    // Fonctions de validation
    validatePayment: validate(paymentSchema),
    validateCreatePayment: validate(createPaymentSchema),
    validateUpdatePayment: validate(updatePaymentSchema),
    validateUpdatePaymentStatus: validate(updatePaymentStatusSchema),
    validateRefundPayment: validate(refundPaymentSchema),
    
    // Alias pour la rétrocompatibilité
    createPaymentValidation: validate(createPaymentSchema),
    updatePaymentValidation: validate(updatePaymentSchema)
};