/**
 * Validateurs pour l'authentification - STUB pour developpeur junior
 * 
 * Ce fichier contient des validations minimales avec Joi.
 * Le developpeur junior devra enrichir les validations selon les besoins.
 * 
 * TODO pour le developpeur junior:
 * - Ajouter validation format numero telephone ivoirien
 * - Valider les prefixes operateurs (07, 05, 01, etc.)
 * - Ajouter validation OTP si necessaire
 * - Implementer validation refresh token
 */

const Joi = require('joi');

/**
 * Middleware de validation pour la route login
 */
const login = (req, res, next) => {
  const schema = Joi.object({
    phoneNumber: Joi.string()
      .required()
      .min(8)
      .max(15)
      .pattern(/^[0-9+]+$/)
      .messages({
        'string.empty': 'Le numero de telephone est requis',
        'string.min': 'Le numero doit contenir au moins 8 chiffres',
        'string.max': 'Le numero ne peut pas depasser 15 chiffres',
        'string.pattern.base': 'Le numero ne peut contenir que des chiffres et +'
        
      })
  });

  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: 'Donnees invalides',
      details: error.details[0].message
    });
  }
  
  next();
};

/**
 * Middleware de validation pour refresh token
 */
const verifyOtp = (req, res, next) => {
  // TODO: Implementer si necessaire pour l'OTP
  // Pour l'instant on passe directement
  next();
};

module.exports = {
  validateAuth: {
    login,
    verifyOtp
  }
};