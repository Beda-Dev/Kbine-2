/**
 * Logger compatible Vercel Serverless
 * 
 * ⚠️ IMPORTANT: Vercel utilise un système de fichiers en lecture seule
 * On ne peut PAS écrire dans des fichiers, donc on désactive les transports File
 * et on utilise uniquement Console qui est capturé par les logs Vercel
 */

const winston = require('winston');
const path = require('path');

// Détection de l'environnement Vercel
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
const isProduction = process.env.NODE_ENV === 'production';

// Configuration des niveaux de log
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Couleurs pour chaque niveau
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Format personnalisé pour les logs
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Format pour la console (plus lisible)
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    let logMessage = `${timestamp} [${level}]: ${message}`;
    
    // Ajouter les métadonnées si présentes
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return logMessage;
  })
);

// Configuration des transports
const transports = [];

// ✅ Console transport (toujours actif - capturé par Vercel)
transports.push(
  new winston.transports.Console({
    format: isVercel ? customFormat : consoleFormat,
    level: isProduction ? 'info' : 'debug'
  })
);

// ⚠️ File transports UNIQUEMENT en local (pas sur Vercel)
if (!isVercel) {
  const fs = require('fs');
  const logsDir = path.join(process.cwd(), 'logs');
  
  // Créer le dossier logs s'il n'existe pas
  if (!fs.existsSync(logsDir)) {
    try {
      fs.mkdirSync(logsDir, { recursive: true });
    } catch (error) {
      console.error('Impossible de créer le dossier logs:', error.message);
    }
  }

  // Log de toutes les erreurs dans error.log
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: customFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Log de tout dans combined.log
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: customFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Création du logger
const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  levels,
  format: customFormat,
  transports,
  exitOnError: false,
});

// Message d'information au démarrage
if (isVercel) {
  logger.info('🚀 Logger configuré pour Vercel (Console uniquement)', {
    environment: process.env.VERCEL_ENV || 'production',
    region: process.env.VERCEL_REGION || 'unknown'
  });
} else {
  logger.info('🚀 Logger configuré en mode local (Console + Files)', {
    logsDirectory: path.join(process.cwd(), 'logs')
  });
}

// Stream pour Morgan (logging HTTP)
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

module.exports = logger;