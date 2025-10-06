/**
 * Configuration du systeme de logs avec Winston
 * 
 * Ce fichier configure Winston, une librairie de logging robuste pour Node.js.
 * Il gere les logs a differents niveaux et les envoie vers plusieurs destinations.
 * 
 * Niveaux de logs (du plus critique au moins critique):
 * - error: Erreurs critiques (pannes, exceptions)
 * - warn: Avertissements (problemes non bloquants)
 * - info: Informations generales (demarrage, connexions)
 * - debug: Informations de debug (developpement)
 * 
 * Destinations des logs:
 * - Fichier error.log: Erreurs uniquement
 * - Fichier combined.log: Tous les logs
 * - Console: En developpement uniquement (avec couleurs)
 * 
 * Usage dans le code:
 * const logger = require('../utils/logger');
 * logger.info('Serveur demarre');
 * logger.error('Erreur de connexion DB', error);
 */

// Import de la librairie Winston pour le logging
const winston = require('winston');

// ===============================
// CONFIGURATION DU LOGGER PRINCIPAL
// ===============================

/**
 * Creation du logger principal avec Winston
 * 
 * Winston permet de gerer plusieurs "transports" (destinations)
 * et formatages pour les logs selon l'environnement
 */
const logger = winston.createLogger({
  // ===== NIVEAU DE LOG =====
  
  /**
   * Niveau minimum des logs a capturer
   * 
   * Configurable via la variable d'environnement LOG_LEVEL
   * Valeurs possibles: error, warn, info, debug
   * Par defaut: info (capture info, warn, error)
   */
  level: process.env.LOG_LEVEL || 'info',
  
  // ===== FORMAT DES LOGS =====
  
  /**
   * Formatage des logs pour les fichiers
   * 
   * winston.format.combine() permet de combiner plusieurs formatages:
   * - timestamp(): Ajoute la date/heure du log
   * - errors({ stack: true }): Inclut la stack trace pour les erreurs
   * - json(): Format JSON pour faciliter le parsing par des outils
   */
  format: winston.format.combine(
    winston.format.timestamp(), // ISO timestamp (2024-01-01T10:30:00.000Z)
    winston.format.errors({ stack: true }), // Stack trace complete des erreurs
    winston.format.json() // Format JSON structure
  ),
  
  // ===== METADATA GLOBALE =====
  
  /**
   * Metadata ajoutee automatiquement a tous les logs
   * Utile pour identifier le service dans un environnement multi-services
   */
  defaultMeta: { service: 'kbine-backend' },
  
  // ===== TRANSPORTS (DESTINATIONS) =====
  
  /**
   * Liste des destinations pour les logs
   * Chaque transport peut avoir son propre niveau et format
   */
  transports: [
    /**
     * Transport 1: Fichier pour les erreurs uniquement
     * 
     * Fichier: logs/error.log
     * Contenu: Uniquement les logs de niveau 'error'
     * Usage: Monitoring et alertes en production
     */
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    
    /**
     * Transport 2: Fichier pour tous les logs
     * 
     * Fichier: logs/combined.log
     * Contenu: Tous les logs (selon le niveau global)
     * Usage: Historique complet pour debugging
     */
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

// ===============================
// TRANSPORT CONSOLE (DEVELOPPEMENT)
// ===============================

/**
 * Ajout conditionnel du transport console
 * 
 * En developpement (NODE_ENV != 'production'):
 * - Affiche les logs dans la console
 * - Format colore et simplifie pour la lisibilite
 * - Facilite le debugging en temps reel
 * 
 * En production:
 * - Pas d'affichage console (performance)
 * - Seuls les fichiers de logs sont utilises
 */
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    /**
     * Format specifique pour la console
     * 
     * winston.format.combine() avec:
     * - colorize(): Colore les logs selon le niveau (rouge=error, jaune=warn, etc.)
     * - simple(): Format lisible "timestamp level: message"
     */
    format: winston.format.combine(
      winston.format.colorize(), // Couleurs selon le niveau
      winston.format.simple() // Format simple et lisible
    )
  }));
}

// ===============================
// EXPORT DU LOGGER
// ===============================

/**
 * Export du logger configure
 * 
 * Usage dans les autres fichiers:
 * const logger = require('../utils/logger');
 * 
 * Exemples d'utilisation:
 * logger.info('Utilisateur connecte', { userId: 123 });
 * logger.warn('Rate limit atteint', { ip: '192.168.1.1' });
 * logger.error('Erreur DB', error);
 * logger.debug('Debug info', { data: {...} });
 * 
 * Format de sortie (JSON):
 * {
 *   "timestamp": "2024-01-01T10:30:00.000Z",
 *   "level": "info",
 *   "message": "Utilisateur connecte",
 *   "userId": 123,
 *   "service": "kbine-backend"
 * }
 */
module.exports = logger;