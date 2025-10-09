/**
 * Middleware de validation pour les routes
 * Transforme les fonctions de validation Joi en middlewares Express
 */

/**
 * Crée un middleware de validation à partir d'une fonction de validation Joi
 * @param {Function} validationFn - Fonction de validation Joi
 * @returns {Function} Middleware Express
 */
// src/middlewares/validationMiddleware.js
const createValidationMiddleware = (schema) => {
    return (req, res, next) => {
        try {
            // Valider les données
            const { error, value } = schema.validate(req.body, {
                abortEarly: false,
                convert: true  // Important pour la conversion des types
            });

            if (error) {
                const errors = error.details.map(detail => ({
                    field: detail.path[0],
                    message: detail.message
                }));
                
                return res.status(400).json({
                    success: false,
                    error: 'Erreur de validation',
                    details: errors
                });
            }

            // Remplacer req.body par les données validées et nettoyées
            req.body = value;
            next();
        } catch (error) {
            console.error('Erreur dans le middleware de validation:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la validation des données'
            });
        }
    };
};

module.exports = createValidationMiddleware;