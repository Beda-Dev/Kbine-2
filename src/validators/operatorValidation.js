const Joi = require('joi');

// Schéma de base pour un opérateur
const operatorSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(50)
        .required()
        .messages({
            'string.base': 'Le nom doit être une chaîne de caractères',
            'string.empty': 'Le nom de l\'opérateur est requis',
            'string.min': 'Le nom doit contenir au moins 2 caractères',
            'string.max': 'Le nom ne peut pas dépasser 50 caractères',
            'any.required': 'Le nom de l\'opérateur est obligatoire'
        }),

    code: Joi.string()
        .min(2)
        .max(10)
        .uppercase()
        .required()
        .messages({
            'string.base': 'Le code doit être une chaîne de caractères',
            'string.empty': 'Le code de l\'opérateur est requis',
            'string.min': 'Le code de l\'opérateur doit contenir au moins 2 caractères',
            'string.max': 'Le code de l\'opérateur ne peut pas dépasser 10 caractères',
            'string.uppercase': 'Le code de l\'opérateur doit être en majuscules',
            'any.required': 'Le code de l\'opérateur est obligatoire'
        }),

    prefixes: Joi.array()
        .items(
            Joi.string()
                .pattern(/^[0-9]{2,3}$/)
                .messages({
                    'string.pattern.base': 'Chaque préfixe doit être composé de 2 ou 3 chiffres',
                    'string.empty': 'Les préfixes ne peuvent pas être vides'
                })
        )
        .min(1)
        .max(20)
        .required()
        .unique()
        .messages({
            'array.base': 'Les préfixes doivent être fournis sous forme de tableau',
            'array.min': 'Au moins un préfixe est requis',
            'array.max': 'Maximum 20 préfixes autorisés',
            'array.unique': 'Les préfixes doivent être uniques',
            'any.required': 'Les préfixes sont obligatoires'
        })
});

// Validation pour la création d'un opérateur
const createOperatorValidation = (data) => {
    return operatorSchema.validate(data, { abortEarly: false });
};

// Validation pour la mise à jour d'un opérateur
const updateOperatorValidation = (data) => {
    return operatorSchema.validate(data, { 
        abortEarly: false,
        allowUnknown: true // Permet des champs supplémentaires non définis dans le schéma
    });
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

module.exports = {
    createOperatorValidation,
    updateOperatorValidation,
    operatorIdValidation
};
