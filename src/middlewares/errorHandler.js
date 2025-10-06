/**
 * Middleware de gestion centralisee des erreurs
 * 
 * Ce middleware capture toutes les erreurs non gerees dans l'application
 * et les formate de maniere coherente pour l'API.
 * 
 * Il gere differents types d'erreurs:
 * - Erreurs de validation (Joi)
 * - Erreurs JWT (authentification)
 * - Erreurs MySQL (base de donnees)
 * - Erreurs generiques
 * 
 * IMPORTANT: Ce middleware doit etre place EN DERNIER dans app.js
 * car Express execute les middlewares dans l'ordre de definition
 */

const logger = require('../utils/logger'); // Systeme de logs

/**
 * Middleware principal de gestion des erreurs
 * 
 * @param {Error} error - L'erreur capturee
 * @param {Request} req - Objet requete Express
 * @param {Response} res - Objet reponse Express  
 * @param {Function} next - Fonction next d'Express (non utilisee ici)
 */
const errorHandler = (error, req, res, next) => {
  // Log de l'erreur avec le contexte de la requete
  // Utile pour le debugging en production
  logger.error('Erreur capturee:', {
    error: error.message, // Message d'erreur
    stack: error.stack, // Stack trace complete
    url: req.url, // URL de la requete qui a cause l'erreur
    method: req.method, // Methode HTTP (GET, POST, etc.)
    ip: req.ip // Adresse IP du client
  });

  // ===============================
  // GESTION DES ERREURS DE VALIDATION
  // ===============================
  
  /**
   * Erreurs de validation Joi
   * Retournees quand les donnees envoyees ne respectent pas le schema
   */
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Donnees invalides',
      details: error.details // Details specifiques de la validation
    });
  }

  // ===============================
  // GESTION DES ERREURS JWT
  // ===============================
  
  /**
   * Token JWT malformed ou invalide
   * Quand le token ne peut pas etre decode
   */
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token invalide'
    });
  }

  /**
   * Token JWT expire
   * Quand la date d'expiration est depassee
   */
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expire'
    });
  }

  // ===============================
  // GESTION DES ERREURS MYSQL
  // ===============================
  
  /**
   * Violation de contrainte d'unicite
   * Quand on essaie d'inserer une donnee qui existe deja
   * (ex: numero de telephone deja utilise)
   */
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      error: 'Donnee deja existante'
    });
  }

  /**
   * Erreur de connexion a la base de donnees
   * Quand MySQL n'est pas accessible
   */
  if (error.code === 'ECONNREFUSED' || error.code === 'ER_ACCESS_DENIED') {
    return res.status(503).json({
      error: 'Service temporairement indisponible'
    });
  }

  // ===============================
  // ERREUR GENERIQUE
  // ===============================
  
  /**
   * Toutes les autres erreurs non prevues
   * En production: message generique pour la securite
   * En developpement: message detaille pour le debugging
   */
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Erreur interne du serveur' // Message generique en prod
      : error.message // Message detaille en dev
  });
};

// Export du middleware pour l'utiliser dans app.js
module.exports = errorHandler;