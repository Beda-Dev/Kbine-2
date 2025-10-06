/**
 * Utilitaires JWT pour la gestion des tokens d'authentification
 *
 * Ce fichier fournit des fonctions utilitaires pour:
 * - Générer des tokens JWT d'accès
 * - Générer des refresh tokens
 * - Vérifier les tokens
 *
 * Utilise la librairie jsonwebtoken (jwt)
 */

const jwt = require('jsonwebtoken');
const logger = require('./logger');

/**
 * Génère un token JWT d'accès
 * @param {number} userId - ID de l'utilisateur
 * @param {string} role - Rôle de l'utilisateur
 * @returns {string} Token JWT
 */
const generateToken = (userId, role = 'client') => {
  try {
    const payload = {
      userId: userId,
      role: role,
      type: 'access'
    };

    const options = {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '24h',
      issuer: 'kbine-backend',
      audience: 'kbine-client'
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'kbine_secret_key', options);

    logger.debug('Token d\'accès généré', { userId, role });
    return token;
  } catch (error) {
    logger.error('Erreur lors de la génération du token d\'accès:', error);
    throw error;
  }
};

/**
 * Génère un refresh token
 * @param {number} userId - ID de l'utilisateur
 * @returns {string} Refresh token
 */
const generateRefreshToken = (userId) => {
  try {
    const payload = {
      userId: userId,
      type: 'refresh'
    };

    const options = {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      issuer: 'kbine-backend',
      audience: 'kbine-client'
    };

    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'kbine_refresh_secret_key', options);

    logger.debug('Refresh token généré', { userId });
    return refreshToken;
  } catch (error) {
    logger.error('Erreur lors de la génération du refresh token:', error);
    throw error;
  }
};

/**
 * Vérifie et décode un token JWT
 * @param {string} token - Token à vérifier
 * @returns {object} Payload décodé du token
 */
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kbine_secret_key');
    return decoded;
  } catch (error) {
    logger.error('Erreur lors de la vérification du token:', error);
    throw error;
  }
};

/**
 * Vérifie et décode un refresh token
 * @param {string} refreshToken - Refresh token à vérifier
 * @returns {object} Payload décodé du refresh token
 */
const verifyRefreshToken = (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'kbine_refresh_secret_key');
    return decoded;
  } catch (error) {
    logger.error('Erreur lors de la vérification du refresh token:', error);
    throw error;
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken
};
