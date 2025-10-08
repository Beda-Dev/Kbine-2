/**
 * Validateurs pour l'authentification
 */

const Joi = require('joi');
const db = require('../config/database');

// Fonction pour récupérer les préfixes depuis la base de données
async function getOperatorPrefixes() {
  try {
    // Utilisation de execute au lieu de query pour une meilleure gestion des résultats
    const [rows] = await db.execute('SELECT prefixes FROM operators');
    const prefixes = [];
    
    // Vérifier si rows est un tableau
    if (!Array.isArray(rows)) {
      console.error('Erreur: les opérateurs ne sont pas un tableau:', rows);
      return [];
    }
    
    // Extraire tous les préfixes uniques
    rows.forEach(operator => {
      try {
        let opPrefixes;
        
        // CORRECTION: Gestion robuste du parsing JSON
        let prefixesValue = operator.prefixes;
        
        // Si c'est un Buffer (cas où le champ JSON est stocké comme BLOB)
        if (Buffer.isBuffer(prefixesValue)) {
          prefixesValue = prefixesValue.toString('utf8');
        }
        
        if (typeof prefixesValue === 'string') {
          // Si c'est une chaîne, tenter de la parser
          try {
            if (prefixesValue.trim().startsWith('[') || prefixesValue.trim().startsWith('"')) {
              // C'est un tableau JSON ou une chaîne JSON
              opPrefixes = JSON.parse(prefixesValue);
              // Si c'était une chaîne entre guillemets, on la met dans un tableau
              if (typeof opPrefixes === 'string') {
                opPrefixes = [opPrefixes];
              }
            } else if (prefixesValue.includes(',')) {
              // C'est une liste séparée par des virgules
              opPrefixes = prefixesValue.split(',').map(p => p.trim().replace(/["\[\]]/g, ''));
            } else {
              // C'est un seul préfixe
              opPrefixes = [prefixesValue.trim().replace(/["\[\]]/g, '')];
            }
          } catch (e) {
            console.error('Erreur lors du parsing JSON:', e);
            opPrefixes = [];
          }
        } else if (Array.isArray(prefixesValue)) {
          // C'est déjà un tableau
          opPrefixes = prefixesValue;
        } else if (typeof prefixesValue === 'number') {
          // C'est un nombre
          opPrefixes = [String(prefixesValue).padStart(2, '0')];
        } else {
          // Type inattendu, on ignore
          console.warn('Type de préfixe inattendu:', typeof prefixesValue, prefixesValue);
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
    console.log('Début de la validation de connexion');
    const prefixes = await getOperatorPrefixes();
    console.log('Préfixes après appel à getOperatorPrefixes:', prefixes);
    if (!prefixes || prefixes.length === 0) {
      console.error('Aucun préfixe valide trouvé, utilisation des valeurs par défaut');
      return res.status(500).json({
        error: 'Erreur serveur',
        details: 'Impossible de récupérer les préfixes des opérateurs'
      });
    }

    console.log('Préfixes récupérés:', prefixes);
    const phonePattern = createPhonePattern(prefixes);
    console.log('Pattern de téléphone généré:', phonePattern);
    
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

    console.log('Corps de la requête reçu:', req.body);
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    console.log('Résultat de la validation:', { error, value });
    
    if (error) {
      console.error('Erreur de validation:', error.details);
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