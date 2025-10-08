/**
 * Validateurs pour l'authentification
 */

const Joi = require('joi');
const db = require('../config/database');

// Fonction pour récupérer les préfixes depuis la base de données
async function getOperatorPrefixes() {
  try {
    const operators = await db.query('SELECT prefixes FROM operators');
    const prefixes = [];
    
    // Vérifier si operators est un tableau
    if (!Array.isArray(operators)) {
      console.error('Erreur: les opérateurs ne sont pas un tableau:', operators);
      return [];
    }
    
    // Extraire tous les préfixes uniques
    operators.forEach(operator => {
      try {
        let opPrefixes;
        
        // CORRECTION: Gestion robuste du parsing JSON
        if (typeof operator.prefixes === 'string') {
          // Si c'est une chaîne, tenter de la parser
          if (operator.prefixes.startsWith('[')) {
            // C'est un tableau JSON
            opPrefixes = JSON.parse(operator.prefixes);
          } else if (operator.prefixes.includes(',')) {
            // C'est une liste séparée par virgules
            opPrefixes = operator.prefixes.split(',').map(p => p.trim());
          } else {
            // C'est un seul préfixe
            opPrefixes = [operator.prefixes.trim()];
          }
        } else if (Array.isArray(operator.prefixes)) {
          // C'est déjà un tableau
          opPrefixes = operator.prefixes;
        } else if (typeof operator.prefixes === 'number') {
          // C'est un nombre
          opPrefixes = [String(operator.prefixes).padStart(2, '0')];
        } else {
          // Type inattendu, on ignore
          console.warn('Type de préfixe inattendu:', typeof operator.prefixes);
          return;
        }
        
        // Ajouter les préfixes uniques
        opPrefixes.forEach(prefix => {
          const cleanPrefix = String(prefix).trim();
          if (cleanPrefix && !prefixes.includes(cleanPrefix)) {
            prefixes.push(cleanPrefix);
          }
        });
      } catch (e) {
        console.error('Erreur lors du parsing des préfixes:', e);
        console.error('Valeur problématique:', operator.prefixes);
        // En cas d'erreur sur un opérateur, on continue avec les autres
      }
    });

    if (prefixes.length === 0) {
      // Retourner des valeurs par défaut si aucun préfixe n'est trouvé
      console.warn('Aucun préfixe trouvé en base, utilisation des valeurs par défaut');
      return ['07', '05', '01'];
    }

    console.log('Préfixes chargés:', prefixes);
    return prefixes;
  } catch (error) {
    console.error('Erreur lors de la récupération des préfixes:', error);
    // En cas d'erreur critique, retourner des valeurs par défaut
    return ['07', '05', '01'];
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