/**
 * Middleware de limitation du taux de requetes (Rate Limiting)
 * 
 * Ce middleware protege l'API contre:
 * - Les attaques par deni de service (DoS)
 * - Le spam et l'abus de l'API
 * - La surcharge du serveur
 * - Les tentatives de brute force
 * 
 * Il limite le nombre de requetes qu'une adresse IP peut faire
 * dans une periode donnee (fenetre glissante).
 * 
 * Configuration actuelle: 100 requetes par minute par IP
 * 
 * IMPORTANT: Ce middleware est applique GLOBALEMENT a toutes les routes
 * dans app.js avant la definition des routes
 */

// Import des modules necessaires
const { RateLimiterMemory } = require('rate-limiter-flexible'); // Librairie de rate limiting
const logger = require('../utils/logger'); // Systeme de logs

// ===============================
// CONFIGURATION DU RATE LIMITER
// ===============================

/**
 * Configuration du limiteur de taux de requetes
 * 
 * RateLimiterMemory stocke les compteurs en memoire (RAM)
 * Avantages: Rapide, pas de dependance externe
 * Inconvenients: Perdu au redemarrage, pas partage entre instances
 * 
 * Pour la production avec plusieurs serveurs, considerez:
 * - RateLimiterRedis (avec Redis)
 * - RateLimiterMongo (avec MongoDB)
 */
const rateLimiter = new RateLimiterMemory({
  /**
   * keyGenerator: Fonction qui determine la cle unique par utilisateur
   * Ici on utilise l'adresse IP comme identifiant
   * Alternatives possibles:
   * - (req) => req.user?.id (par utilisateur connecte)
   * - (req) => req.headers['x-forwarded-for'] || req.ip (pour les proxies)
   */
  keyGenerator: (req) => req.ip,
  
  /**
   * points: Nombre de requetes autorisees par periode
   * Chaque requete "consomme" 1 point
   * Quand tous les points sont consommes, les requetes sont rejetees
   */
  points: 100, // 100 requetes autorisees
  
  /**
   * duration: Duree de la fenetre en secondes
   * Les points se "rechargent" progressivement (fenetre glissante)
   * Pas de reset brutal toutes les 60 secondes
   */
  duration: 60, // Sur une periode de 60 secondes (1 minute)
  
  /**
   * Configuration implicite:
   * - blockDuration: duration (60s) - duree du blocage apres depassement
   * - execEvenly: false - pas de lissage des requetes
   */
});

// ===============================
// MIDDLEWARE RATE LIMITER
// ===============================

/**
 * Middleware principal de limitation des requetes
 * 
 * Ce middleware est execute sur CHAQUE requete vers l'API
 * Il verifie si l'IP a depasse sa limite de requetes
 * 
 * Workflow:
 * 1. Identifier l'IP de la requete
 * 2. Verifier les points disponibles pour cette IP
 * 3. Consommer 1 point si disponible
 * 4. Rejeter la requete si plus de points disponibles
 * 
 * @param {Request} req - Objet requete Express
 * @param {Response} res - Objet reponse Express
 * @param {Function} next - Fonction pour passer au middleware suivant
 */
const rateLimiterMiddleware = async (req, res, next) => {
  try {
    // ===== CONSOMMATION D'UN POINT =====
    
    /**
     * Tentative de consommer 1 point pour cette IP
     * 
     * await rateLimiter.consume(req.ip) fait:
     * 1. Verifie les points disponibles pour req.ip
     * 2. Si disponible: consomme 1 point et continue
     * 3. Si plus disponible: lance une exception avec les details
     * 
     * La promesse se resout si les points sont disponibles
     * La promesse est rejetee si la limite est atteinte
     */
    await rateLimiter.consume(req.ip);
    
    // ===== REQUETE AUTORISEE =====
    
    // Points disponibles, on passe au middleware/route suivante
    next();
    
  } catch (rejRes) {
    // ===== LIMITE DEPASSEE =====
    
    /**
     * L'exception rejRes contient les informations sur le blocage:
     * - totalHits: nombre total de requetes faites
     * - remainingPoints: points restants (0 ici)
     * - msBeforeNext: millisecondes avant le prochain point disponible
     * - remainingHits: requetes restantes (0 ici)
     */
    
    // Log de l'evenement pour monitoring
    logger.warn(`Rate limit depasse pour IP: ${req.ip}`);
    
    // ===== REPONSE DE LIMITATION =====
    
    /**
     * Retour d'une erreur HTTP 429 "Too Many Requests"
     * 
     * Status 429: Code standard pour rate limiting
     * retryAfter: Indique au client quand reessayer (en secondes)
     */
    res.status(429).json({
      error: 'Trop de requetes', // Message explicite
      retryAfter: Math.round(rejRes.msBeforeNext / 1000) // Conversion ms -> secondes
    });
  }
};

// ===============================
// EXPORT DU MIDDLEWARE
// ===============================

/**
 * Export du middleware pour utilisation dans app.js
 * 
 * Usage dans app.js:
 * const rateLimiter = require('./middlewares/rateLimiter');
 * app.use(rateLimiter); // Applique a toutes les routes
 * 
 * Le middleware doit etre place AVANT les routes pour les proteger
 */
module.exports = rateLimiterMiddleware;