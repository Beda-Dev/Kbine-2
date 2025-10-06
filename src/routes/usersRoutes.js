const express = require('express');
const router = express.Router();

const usersController = require('../controllers/usersController');
const { authenticateToken, requireRole } = require('../middlewares/auth');

/**
 * Routes pour la gestion des utilisateurs
 * Toutes les routes nécessitent une authentification JWT
 */

// Récupérer tous les utilisateurs (admin uniquement)
router.get('/', authenticateToken, requireRole(['admin']), usersController.getAllUsers);

// Récupérer un utilisateur par son ID (admin ou propriétaire)
router.get('/:id', authenticateToken, usersController.getUserById);

// Créer un nouvel utilisateur (admin uniquement)
router.post('/', authenticateToken, requireRole(['admin']), usersController.createUser);

// Mettre à jour un utilisateur (admin ou propriétaire)
router.put('/:id', authenticateToken, usersController.updateUser);

// Supprimer un utilisateur (admin uniquement)
router.delete('/:id', authenticateToken, requireRole(['admin']), usersController.deleteUser);

// Récupérer le profil de l'utilisateur connecté
router.get('/profile', authenticateToken, usersController.getProfile);

module.exports = router;