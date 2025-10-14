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
const jwt = require('jsonwebtoken');


/**
 * POST /api/auth/login
 * Authentification par numéro de téléphone avec création automatique
 */
const login = async (req, res) => {
  console.log('=== Début de la fonction login ===');
  console.log('Corps de la requête reçu:', req.body);
  
  try {
    const { phoneNumber } = req.body;
    console.log('Tentative de connexion avec le numéro:', phoneNumber);

    // Validation des données d'entrée
    if (!phoneNumber) {
      console.error('Erreur: Aucun numéro de téléphone fourni');
      return res.status(400).json({ error: 'Numéro de téléphone requis' });
    }

    // Recherche de l'utilisateur existant
    console.log('Recherche de l\'utilisateur par numéro de téléphone');
    let user = await userService.findByPhoneNumber(phoneNumber);
    let isNewUser = false;
    console.log('Utilisateur trouvé:', user ? 'Oui' : 'Non');

    if (!user) {
      try {
        // Création d'un nouvel utilisateur
        user = await userService.create({
          phone_number: phoneNumber,
          role: 'client'
        });
        isNewUser = true;

        logger.info('Nouvel utilisateur créé lors du login', {
          user_id: user.id,
          phone_number: user.phone_number
        });

      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          // Gérer le cas de course (race condition)
          user = await userService.findByPhoneNumber(phoneNumber);
        } else {
          throw error;
        }

      }

    } else {
      logger.info('Utilisateur existant connecté', {
        user_id: user.id,
        phone_number: user.phone_number
      });
    }

    // Génération des tokens
    console.log('Génération des tokens pour l\'utilisateur ID:', user.id);
    const token = generateToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);
    console.log('Tokens générés avec succès');

    // Calcul de la date d'expiration (24h)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Sauvegarde de la session en base de données
    console.log('Sauvegarde de la session en base de données');
    try {
      await db.execute(
        'INSERT INTO sessions (user_id, token, refresh_token, expires_at) VALUES (?, ?, ?, ?)',
        [user.id, token, refreshToken, expiresAt]
      );
      console.log('Session sauvegardée avec succès');
    } catch (dbError) {
      console.error('Erreur lors de la sauvegarde de la session:', dbError);
      throw dbError;
    }

    // Réponse avec les informations utilisateur et tokens
    const responseData = {
      token: token,
      // refreshToken: refreshToken,
      user: {
        user_id: user.id,
        phone_number: user.phone_number,
        role: user.role,
        created_at: user.createdAt || user.created_at, // ← AJOUT
        updated_at: user.updatedAt || user.updated_at  // ← AJOUT
      },
      // isNewUser: isNewUser
    };
    
    console.log('Réponse de connexion préparée:', {
      user_id: user.id,
      phone_number: user.phone_number,
      role: user.role,
      isNewUser: isNewUser,
              created_at: user.createdAt || user.created_at, // ← AJOUT
        updated_at: user.updatedAt || user.updated_at  // ← AJOUT
    });
    
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('=== ERREUR LORS DU LOGIN ===');
    console.error('Erreur détaillée:', error);
    console.error('Stack trace:', error.stack);
    logger.error('Erreur lors du login:', error);
    
    // Log plus détaillé pour les erreurs de base de données
    if (error.sql) {
      console.error('Erreur SQL:', error.sql);
      console.error('Paramètres SQL:', error.parameters);
    }
    
    return res.status(500).json({ 
      error: 'Erreur serveur lors de la connexion',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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

    return res.status(200).json({
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
    return res.status(500).json({ error: 'Erreur serveur lors du rafraîchissement' });
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

    return res.status(200).json({
      message: 'Déconnexion réussie'
    });

  } catch (error) {
    logger.error('Erreur lors du logout:', error);
    return res.status(500).json({ error: 'Erreur serveur lors de la déconnexion' });
  }
};

module.exports = {
  login,
  refreshToken,
  logout
};