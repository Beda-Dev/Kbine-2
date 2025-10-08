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
  // ===== EXTRACTION DU TOKEN =====
  
  // Recuperation du header Authorization
  const authHeader = req.headers['authorization'];
  
  // Extraction du token (format: "Bearer TOKEN")
  // authHeader && authHeader.split(' ')[1] evite les erreurs si le header est absent
  const token = authHeader && authHeader.split(' ')[1];

  // Verification de la presence du token
  if (!token) {
    return res.status(401).json({ error: 'Token d\'acces requis' });
  }

  try {
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
    
    // ===== CHARGEMENT DE L'UTILISATEUR =====
    
    /**
     * Chargement des informations utilisateur depuis la base de donnees
     * Important: On recharge toujours depuis la DB pour avoir les infos a jour
     * (ex: si l'utilisateur a ete desactive entre temps)
     */
    const user = await userService.findById(decoded.userId);
    
    // Verification que l'utilisateur existe encore
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non trouve' });
    }

    // ===== AJOUT DE L'UTILISATEUR A LA REQUETE =====
    
    /**
     * Ajout de l'utilisateur a l'objet req
     * Cela permet aux middlewares et controllers suivants
     * d'acceder aux infos utilisateur via req.user
     */
    req.user = user;
    
    // Passage au middleware suivant
    next();
    
  } catch (error) {
    // ===== GESTION DES ERREURS =====
    
    // Log de l'erreur pour le debugging
    logger.error('Erreur d\'authentification:', error);
    
    /**
     * Retour d'une erreur 403 (Forbidden)
     * Peut etre cause par:
     * - Token expire
     * - Token corrompu
     * - Signature invalide
     * - Erreur de connexion a la DB
     */
    return res.status(403).json({ error: 'Token invalide' });
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
  /**
   * Middleware retourne par la fonction factory
   * 
   * IMPORTANT: Ce middleware doit etre utilise APRES authenticateToken
   * car il depend de req.user qui est defini par authenticateToken
   */
  return (req, res, next) => {
    // ===== VERIFICATION DE L'AUTHENTIFICATION =====
    
    /**
     * Verification que l'utilisateur est authentifie
     * Si req.user n'existe pas, c'est que authenticateToken n'a pas ete appele
     * ou que l'authentification a echoue
     */
    if (!req.user) {
      return res.status(401).json({ error: 'Authentification requise' });
    }

    // ===== VERIFICATION DU ROLE =====
    
    /**
     * Verification que le role de l'utilisateur est dans la liste autorisee
     * roles.includes() verifie si req.user.role est present dans le tableau roles
     */
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permissions insuffisantes' });
    }

    // L'utilisateur a les permissions necessaires, on continue
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