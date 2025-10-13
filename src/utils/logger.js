/**
 * Configuration du systeme de logs avec Winston
 * ✅ Compatible Vercel Serverless Functions
 * 
 * Ce fichier configure Winston, une librairie de logging robuste pour Node.js.
 * Il gere les logs a differents niveaux et les envoie vers plusieurs destinations.
 * 
 * ⚠️ IMPORTANT VERCEL:
 * - Vercel utilise un système de fichiers en lecture seule
 * - Les logs fichiers ne fonctionnent QUE en local
 * - Sur Vercel, seule la console est utilisée (capturée automatiquement)
 * 
 * Niveaux de logs (du plus critique au moins critique):
 * - error: Erreurs critiques (pannes, exceptions)
 * - warn: Avertissements (problemes non bloquants)
 * - info: Informations generales (demarrage, connexions)
 * - debug: Informations de debug (developpement)
 * 
 * Destinations des logs:
 * - Fichier error.log: Erreurs uniquement (LOCAL UNIQUEMENT)
 * - Fichier combined.log: Tous les logs (LOCAL UNIQUEMENT)
 * - Console: Toujours actif (capturé par Vercel en production)
 * 
 * Usage dans le code:
 * const logger = require('../utils/logger');
 * logger.info('Serveur demarre');
 * logger.error('Erreur de connexion DB', error);
 */

// Import de la librairie Winston pour le logging
const winston = require('winston');
const path = require('path');

// ===============================
// DETECTION DE L'ENVIRONNEMENT
// ===============================

/**
 * Détection si on est sur Vercel
 * Vercel définit automatiquement ces variables d'environnement
 */
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
const isProduction = process.env.NODE_ENV === 'production';

// Log de l'environnement détecté
if (isVercel) {
  console.log('🌐 Environnement détecté: Vercel Serverless');
} else {
  console.log('💻 Environnement détecté: Local/Serveur traditionnel');
}

// ===============================
// CONFIGURATION DES TRANSPORTS
// ===============================

/**
 * Liste des destinations pour les logs
 * Varie selon l'environnement (local vs Vercel)
 */
const transports = [];

// ===== TRANSPORT CONSOLE (TOUJOURS ACTIF) =====

/**
 * Transport Console - OBLIGATOIRE pour Vercel
 * 
 * Sur Vercel: Les logs console sont automatiquement capturés
 * En local: Affichage dans le terminal pour le debugging
 */
transports.push(
  new winston.transports.Console({
    /**
     * Format différent selon l'environnement:
     * - Vercel: JSON structuré pour parsing facile
     * - Local: Format coloré lisible pour humains
     */
    format: isVercel 
      ? winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        )
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            let log = `${timestamp} [${level}]: ${message}`;
            if (Object.keys(meta).length > 0) {
              log += ` ${JSON.stringify(meta)}`;
            }
            return log;
          })
        )
  })
);

// ===== TRANSPORTS FICHIERS (LOCAL UNIQUEMENT) =====

/**
 * Les transports fichiers ne fonctionnent QUE en local
 * Sur Vercel, le système de fichiers est en lecture seule
 */
if (!isVercel) {
  const fs = require('fs');
  const logsDir = path.join(process.cwd(), 'logs');
  
  // Créer le dossier logs s'il n'existe pas (seulement en local)
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
      console.log(`📁 Dossier logs créé: ${logsDir}`);
    }
    
    /**
     * Transport 1: Fichier pour les erreurs uniquement
     * 
     * Fichier: logs/error.log
     * Contenu: Uniquement les logs de niveau 'error'
     * Usage: Monitoring et alertes en production
     */
    transports.push(
      new winston.transports.File({ 
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    );
    
    /**
     * Transport 2: Fichier pour tous les logs
     * 
     * Fichier: logs/combined.log
     * Contenu: Tous les logs (selon le niveau global)
     * Usage: Historique complet pour debugging
     */
    transports.push(
      new winston.transports.File({ 
        filename: path.join(logsDir, 'combined.log'),
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    );
    
    console.log('📝 Transports fichiers activés (logs/error.log, logs/combined.log)');
    
  } catch (error) {
    console.warn('⚠️  Impossible de créer le dossier logs:', error.message);
    console.warn('⚠️  Les logs fichiers sont désactivés, seule la console sera utilisée');
  }
} else {
  console.log('☁️  Mode Vercel: Logs fichiers désactivés (système de fichiers en lecture seule)');
  console.log('📊 Les logs sont capturés automatiquement par Vercel');
}

// ===============================
// CREATION DU LOGGER PRINCIPAL
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
   * Par defaut: 
   * - Production: info (capture info, warn, error)
   * - Développement: debug (capture tout)
   */
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  
  // ===== FORMAT DES LOGS =====
  
  /**
   * Formatage par défaut des logs
   * Utilisé comme base pour tous les transports
   */
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  
  // ===== METADATA GLOBALE =====
  
  /**
   * Metadata ajoutee automatiquement a tous les logs
   * Utile pour identifier le service et l'environnement
   */
  defaultMeta: { 
    service: 'kbine-backend',
    environment: isVercel ? 'vercel' : 'local',
    vercel_region: process.env.VERCEL_REGION || 'N/A'
  },
  
  // ===== TRANSPORTS (DESTINATIONS) =====
  
  /**
   * Liste des destinations configurées ci-dessus
   * Adaptée automatiquement selon l'environnement
   */
  transports: transports,
  
  /**
   * Ne pas quitter le processus en cas d'erreur de logging
   * Important pour la stabilité de l'application
   */
  exitOnError: false
});

// ===============================
// MESSAGE DE CONFIRMATION
// ===============================

/**
 * Log de confirmation de la configuration
 * Aide au debugging et à la compréhension de l'environnement
 */
logger.info('🚀 Logger Winston initialisé avec succès', {
  environment: isVercel ? 'Vercel Serverless' : 'Local/Traditional Server',
  logLevel: logger.level,
  transportsCount: transports.length,
  fileLogging: !isVercel,
  consoleLogging: true
});

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
 * Format de sortie (JSON en production):
 * {
 *   "timestamp": "2024-01-01T10:30:00.000Z",
 *   "level": "info",
 *   "message": "Utilisateur connecte",
 *   "userId": 123,
 *   "service": "kbine-backend",
 *   "environment": "vercel"
 * }
 */
module.exports = logger;