const Joi = require('joi');

const operatorValidator = Joi.object({
    name: Joi.string()
        .min(2)
        .max(50)
        .required()
        .messages({
            'string.min': 'Le nom de l\'opérateur doit contenir au moins 2 caractères',
            'string.max': 'Le nom de l\'opérateur ne peut pas dépasser 50 caractères',
            'any.required': 'Le nom de l\'opérateur est obligatoire'
        }),
    code: Joi.string()
        .min(2)
        .max(10)
        .uppercase()
        .required()
        .messages({
            'string.min': 'Le code de l\'opérateur doit contenir au moins 2 caractères',
            'string.max': 'Le code de l\'opérateur ne peut pas dépasser 10 caractères',
            'string.uppercase': 'Le code de l\'opérateur doit être en majuscules',
            'any.required': 'Le code de l\'opérateur est obligatoire'
        }),
    prefixes: Joi.array()
        .items(
            Joi.string()
                .pattern(/^[0-9]{2}$/)
                .messages({
                    'string.pattern.base': 'Chaque préfixe doit être composé de 2 chiffres'
                })
        )
        .min(1)
        .max(10)
        .required()
        .unique()
        .messages({
            'array.min': 'Au moins un préfixe est requis',
            'array.max': 'Maximum 10 préfixes autorisés',
            'array.unique': 'Les préfixes doivent être uniques',
            'any.required': 'Les préfixes sont obligatoires'
        })
});

module.exports = {
    operatorValidator
};
