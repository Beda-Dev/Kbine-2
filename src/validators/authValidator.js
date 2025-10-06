/**
 * Validateurs pour l'authentification
 */

const Joi = require('joi');
const db = require('../config/database');

// Fonction pour récupérer les préfixes depuis la base de données
async function getOperatorPrefixes() {
  try {
    const [operators] = await db.query('SELECT prefixes FROM operators');
    const prefixes = [];
    
    // Extraire tous les préfixes uniques
    operators.forEach(operator => {
      try {
        const opPrefixes = JSON.parse(operator.prefixes);
        opPrefixes.forEach(prefix => {
          if (!prefixes.includes(prefix)) {
            prefixes.push(prefix);
          }
        });
      } catch (e) {
        console.error('Erreur lors du parsing des préfixes:', e);
      }
    });
    
    return prefixes;
  } catch (error) {
    console.error('Erreur lors de la récupération des opérateurs:', error);
    // Retourner des valeurs par défaut en cas d'erreur
    return ['01', '05', '07'];
  }
}

// Fonction utilitaire pour créer le pattern de validation
function createPhonePattern(prefixes) {
  return new RegExp(`^(${prefixes.join('|')})[0-9]{8}$`);
}

/**
 * Middleware de validation pour la route login
 */
const login = async (req, res, next) => {
  try {
    // Récupérer les préfixes depuis la base de données
    const prefixes = await getOperatorPrefixes();
    if (!prefixes || prefixes.length === 0) {
      return res.status(500).json({
        error: 'Erreur serveur',
        details: 'Impossible de récupérer les préfixes des opérateurs'
      });
    }

    const phonePattern = createPhonePattern(prefixes);
    
    const schema = Joi.object({
      phoneNumber: Joi.string()
        .required()
        .trim()
        .pattern(phonePattern)
        .messages({
          'string.empty': 'Le numéro de téléphone est requis',
          'string.pattern.base': `Le numéro doit commencer par l'un des préfixes valides (${prefixes.join(', ')}) et contenir 10 chiffres au total`
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
  } catch (error) {
    console.error('Erreur lors de la validation du numéro:', error);
    return res.status(500).json({
      error: 'Erreur serveur',
      details: 'Une erreur est survenue lors de la validation du numéro'
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