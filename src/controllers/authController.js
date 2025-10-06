/**
 * Controller d'authentification amélioré
 * 
 * Ce contrôleur gère l'authentification des utilisateurs via:
 * - Login avec création automatique de compte
 * - Refresh des tokens JWT
 * - Déconnexion avec invalidation des sessions
 * 
 * Utilise les services:
 * - userService pour les opérations utilisateurs
 * - logger pour les traces
 * - jwt utils pour la gestion des tokens
 */

const userService = require('../services/userService');
const logger = require('../utils/logger');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const db = require('../config/database');

/**
 * POST /api/auth/login
 * Authentification par numéro de téléphone avec création automatique
 */
const login = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    // Validation des données d'entrée
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Numéro de téléphone requis' });
    }

    // Recherche de l'utilisateur existant
    let user = await userService.findByPhoneNumber(phoneNumber);
    let isNewUser = false;

    if (!user) {
      // Création d'un nouvel utilisateur
      user = await userService.create({
        phoneNumber: phoneNumber,
        role: 'client'
      });
      isNewUser = true;
      
      logger.info('Nouvel utilisateur créé lors du login', {
        userId: user.id,
        phoneNumber: user.phone_number
      });
    } else {
      logger.info('Utilisateur existant connecté', {
        userId: user.id,
        phoneNumber: user.phone_number
      });
    }

    // Génération des tokens
    const token = generateToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Calcul de la date d'expiration (24h)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Sauvegarde de la session en base de données
    await db.execute(
      'INSERT INTO sessions (user_id, token, refresh_token, expires_at) VALUES (?, ?, ?, ?)',
      [user.id, token, refreshToken, expiresAt]
    );

    // Réponse avec les informations utilisateur et tokens
    res.status(200).json({
      token: token,
      // refreshToken: refreshToken,
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        role: user.role
      },
      // isNewUser: isNewUser
    });

  } catch (error) {
    logger.error('Erreur lors du login:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la connexion' });
  }
};

/**
 * POST /api/auth/refresh
 * Rafraîchissement du token JWT
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: tokenToRefresh } = req.body;

    // Validation des données d'entrée
    if (!tokenToRefresh) {
      return res.status(400).json({ error: 'Refresh token requis' });
    }

    // Vérification du refresh token
    const decoded = verifyRefreshToken(tokenToRefresh);

    // Recherche de la session active
    const [sessions] = await db.execute(
      'SELECT * FROM sessions WHERE refresh_token = ? AND expires_at > NOW()',
      [tokenToRefresh]
    );

    if (sessions.length === 0) {
      return res.status(401).json({ error: 'Session expirée ou invalide' });
    }

    const session = sessions[0];
    const user = await userService.findById(session.user_id);

    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    // Génération de nouveaux tokens
    const newToken = generateToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id);

    // Calcul de la nouvelle date d'expiration (24h)
    const newExpiresAt = new Date();
    newExpiresAt.setHours(newExpiresAt.getHours() + 24);

    // Mise à jour de la session
    await db.execute(
      'UPDATE sessions SET token = ?, refresh_token = ?, expires_at = ? WHERE id = ?',
      [newToken, newRefreshToken, newExpiresAt, session.id]
    );

    logger.info('Token rafraîchi', { userId: user.id });

    res.status(200).json({
      token: newToken,
      // refreshToken: newRefreshToken,
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        role: user.role
      }
    });

  } catch (error) {
    logger.error('Erreur lors du refresh token:', error);
    res.status(500).json({ error: 'Erreur serveur lors du rafraîchissement' });
  }
};

/**
 * POST /api/auth/logout
 * Déconnexion utilisateur avec invalidation des sessions
 */
const logout = async (req, res) => {
  try {
    const { refreshToken: tokenToInvalidate } = req.body;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (tokenToInvalidate) {
      // Invalidation de la session spécifique
      await db.execute(
        'DELETE FROM sessions WHERE refresh_token = ?',
        [tokenToInvalidate]
      );
    } else if (token) {
      // Invalidation de toutes les sessions de l'utilisateur
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kbine_secret_key');
      await db.execute(
        'DELETE FROM sessions WHERE user_id = ?',
        [decoded.userId]
      );
    }

    logger.info('Utilisateur déconnecté');

    res.status(200).json({
      message: 'Déconnexion réussie'
    });

  } catch (error) {
    logger.error('Erreur lors du logout:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la déconnexion' });
  }
};

module.exports = {
  login,
  refreshToken,
  logout
};