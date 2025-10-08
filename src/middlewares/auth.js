/**
 * Middlewares d'authentification et d'autorisation
 * 
 * Ce fichier contient les middlewares qui protegent les routes de l'API.
 * Il implemente deux niveaux de protection:
 * 1. Authentification: Verifier que l'utilisateur est connecte (token valide)
 * 2. Autorisation: Verifier que l'utilisateur a les permissions necessaires (role)
 * 
 * Workflow de securite Kbine:
 * - Le client envoie le token JWT dans le header Authorization
 * - authenticateToken verifie le token et charge les infos utilisateur
 * - requireRole verifie que l'utilisateur a le role requis pour acceder a la ressource
 * 
 * Usage dans les routes:
 * router.get('/admin-only', authenticateToken, requireRole(['admin']), controller.method);
 */

// Import des modules necessaires
const jwt = require('jsonwebtoken'); // Gestion des tokens JWT
const userService = require('../services/userService'); // Service pour charger les utilisateurs
const logger = require('../utils/logger'); // Systeme de logs

// ===============================
// MIDDLEWARE D'AUTHENTIFICATION
// ===============================

/**
 * Middleware d'authentification par token JWT
 * 
 * Ce middleware:
 * 1. Extrait le token du header Authorization
 * 2. Verifie la validite du token JWT
 * 3. Charge les informations de l'utilisateur depuis la DB
 * 4. Ajoute l'utilisateur a l'objet req pour les middlewares suivants
 * 
 * Format attendu du header:
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 * 
 * @param {Request} req - Objet requete Express
 * @param {Response} res - Objet reponse Express
 * @param {Function} next - Fonction pour passer au middleware suivant
 */
const authenticateToken = async (req, res, next) => {
  console.log('=== MIDDLEWARE AUTHENTIFICATION ===');
  console.log(`[auth] Méthode: ${req.method}, URL: ${req.originalUrl}`);
  
  // ===== EXTRACTION DU TOKEN =====
  
  // Recuperation du header Authorization
  const authHeader = req.headers['authorization'];
  console.log('[auth] En-tête Authorization:', authHeader ? 'présent' : 'absent');
  
  // Extraction du token (format: "Bearer TOKEN")
  const token = authHeader && authHeader.split(' ')[1];
  console.log('[auth] Token extrait:', token ? 'oui' : 'non');

  // Verification de la presence du token
  if (!token) {
    console.error('[auth] Erreur: Aucun token fourni');
    return res.status(401).json({ 
      error: 'Token d\'accès requis',
      details: 'Le header Authorization est manquant ou mal formaté (attendu: Bearer <token>)'
    });
  }

  try {
    console.log('[auth] Tentative de vérification du token JWT');
    
    // ===== VERIFICATION DU TOKEN JWT =====
    
    /**
     * Verification et decodage du token JWT
     * jwt.verify() 
     * verifie:
     * - La signature du token
     * - La date d'expiration
     * - L'integrite du payload
     */
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kbine_secret_key');
    console.log('[auth] Token JWT valide, ID utilisateur:', decoded.userId);
    
    // ===== CHARGEMENT DE L'UTILISATEUR =====
    console.log(`[auth] Chargement des informations de l'utilisateur ID: ${decoded.userId}`);
    
    try {
      const user = await userService.findById(decoded.userId);
      
      // Verification que l'utilisateur existe encore
      if (!user) {
        console.error(`[auth] Utilisateur non trouvé en base pour l'ID: ${decoded.userId}`);
        return res.status(401).json({ 
          error: 'Utilisateur non trouvé',
          userId: decoded.userId
        });
      }
      
      console.log(`[auth] Utilisateur chargé:`, {
        id: user.id,
        phoneNumber: user.phone_number,
        role: user.role
      });
      
      // Ajout de l'utilisateur à la requête
      req.user = user;
      
      // Log des en-têtes de la requête pour le débogage
      console.log('[auth] En-têtes de la requête:', {
        'user-agent': req.headers['user-agent'],
        'x-forwarded-for': req.headers['x-forwarded-for'] || req.connection.remoteAddress
      });
      
      // Passage au middleware suivant
      console.log('[auth] Authentification réussie, passage au middleware suivant');
      return next();
      
    } catch (userError) {
      console.error('[auth] Erreur lors du chargement de l\'utilisateur:', {
        error: userError.message,
        stack: userError.stack,
        userId: decoded.userId
      });
      return res.status(500).json({ 
        error: 'Erreur lors du chargement du profil utilisateur',
        details: process.env.NODE_ENV === 'development' ? userError.message : undefined
      });
    }

  } catch (error) {
    // ===== GESTION DES ERREURS =====
    console.error('[auth] Erreur lors de l\'authentification:', {
      name: error.name,
      message: error.message,
      expiredAt: error.expiredAt,
      stack: error.stack
    });
    
    // Gestion specifique des erreurs JWT
    if (error.name === 'JsonWebTokenError') {
      console.error('[auth] Erreur de validation du token JWT:', error.message);
      return res.status(403).json({ 
        error: 'Token invalide',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      console.error('[auth] Token JWT expiré, date d\'expiration:', error.expiredAt);
      return res.status(401).json({ 
        error: 'Session expirée, veuillez vous reconnecter',
        expiredAt: error.expiredAt
      });
    }
    
    // Pour les autres erreurs, renvoyer une erreur generique
    console.error('[auth] Erreur inattendue lors de l\'authentification:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de l\'authentification',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ===============================
// MIDDLEWARE D'AUTORISATION
// ===============================

/**
 * Fonction factory pour creer un middleware de verification de role
 * 
 * Cette fonction retourne un middleware qui verifie que l'utilisateur
 * a l'un des roles autorises pour acceder a la ressource.
 * 
 * Roles dans Kbine:
 * - 'client': Utilisateur standard (passer des commandes)
 * - 'staff': Personnel autorise a traiter les commandes
 * - 'admin': Acces complet au systeme
 * 
 * @param {string[]} roles - Liste des roles autorises
 * @returns {Function} Middleware Express
 * 
 * Exemples d'usage:
 * requireRole(['admin']) - Seuls les admins
 * requireRole(['admin', 'staff']) - Admins et staff
 * requireRole(['client', 'staff', 'admin']) - Tous les roles
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    console.log(`[auth] Vérification des rôles requis: ${roles.join(', ')}`);
    
    // ===== VERIFICATION DE L'AUTHENTIFICATION =====
    if (!req.user) {
      console.error('[auth] Erreur: Utilisateur non authentifié pour la vérification de rôle');
      return res.status(401).json({ 
        error: 'Authentification requise',
        details: 'Le token est manquant ou invalide'
      });
    }

    // ===== VERIFICATION DU ROLE =====
    console.log(`[auth] Rôle de l'utilisateur: ${req.user.role}`);
    
    if (!roles.includes(req.user.role)) {
      console.error(`[auth] Accès refusé: le rôle ${req.user.role} n'est pas autorisé`);
      return res.status(403).json({ 
        error: 'Accès refusé',
        requiredRoles: roles,
        userRole: req.user.role,
        details: `Rôle requis: ${roles.join(' ou ')}`
      });
    }
    
    console.log('[auth] Rôle vérifié avec succès');
    next();
  };
};

// ===============================
// EXPORT DES MIDDLEWARES
// ===============================

/**
 * Export des deux middlewares
 * 
 * Usage dans les routes:
 * const { authenticateToken, requireRole } = require('../middlewares/auth');
 * 
 * // Route protegee par authentification seulement
 * router.get('/profile', authenticateToken, controller.getProfile);
 * 
 * // Route protegee par authentification + role admin
 * router.delete('/users/:id', authenticateToken, requireRole(['admin']), controller.deleteUser);
 */
module.exports = {
  authenticateToken,
  requireRole
};