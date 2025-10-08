const db = require('../config/database');
const logger = require('../utils/logger');
const { userValidator, userUpdateValidator } = require('../validators/userValidator');
const { authenticateToken, requireRole } = require('../middlewares/auth');

/**
 * Récupère tous les utilisateurs
 * Accessible uniquement aux administrateurs
 */
const getAllUsers = async (req, res) => {
    try {
        // Vérification de l'authentification et des permissions
        authenticateToken(req, res, async () => {
            requireRole(['admin'])(req, res, async () => {
                const [rows] = await db.execute('SELECT id, phone_number, role, created_at, updated_at FROM users ORDER BY created_at DESC');

                return res.json({
                    success: true,
                    message: 'Liste des utilisateurs récupérée avec succès',
                    data: rows,
                    count: rows.length
                });
            });
        });
    } catch (error) {
        logger.error('Erreur lors de la récupération des utilisateurs:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la récupération des utilisateurs'
        });
    }
};

/**
 * Récupère un utilisateur par son ID
 * Accessible aux administrateurs et à l'utilisateur lui-même
 */
const getUserById = async (req, res) => {
    try {
        authenticateToken(req, res, async () => {
            const userId = parseInt(req.params.id);

            // Vérification que l'utilisateur demande ses propres infos ou est admin
            if (req.user.id !== userId && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    error: 'Accès non autorisé'
                });
            }

            const [rows] = await db.execute(
                'SELECT id, phone_number, role, created_at, updated_at FROM users WHERE id = ?',
                [userId]
            );

            if (rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Utilisateur non trouvé'
                });
            }

            return res.json({
                success: true,
                message: 'Utilisateur récupéré avec succès',
                data: rows[0]
            });
        });
    } catch (error) {
        logger.error('Erreur lors de la récupération de l\'utilisateur:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la récupération de l\'utilisateur'
        });
    }
};

/**
 * Crée un nouvel utilisateur
 * Accessible uniquement aux administrateurs
 */
const createUser = async (req, res) => {
    try {
        authenticateToken(req, res, async () => {
            requireRole(['admin'])(req, res, async () => {
                // Validation des données d'entrée
                const { error, value } = await userValidator.validateAsync(req.body);
                if (error) {
                    return res.status(400).json({
                        success: false,
                        error: 'Données invalides',
                        details: error.details[0].message
                    });
                }

                const { phone_number, role } = value;

                // Vérification que le numéro de téléphone n'existe pas déjà
                const [existingUsers] = await db.execute(
                    'SELECT id FROM users WHERE phone_number = ?',
                    [phone_number]
                );

                if (existingUsers.length > 0) {
                    return res.status(409).json({
                        success: false,
                        error: 'Ce numéro de téléphone est déjà utilisé'
                    });
                }

                // Création de l'utilisateur
                const [result] = await db.execute(
                    'INSERT INTO users (phone_number, role) VALUES (?, ?)',
                    [phone_number, role]
                );

                return res.status(201).json({
                    success: true,
                    message: 'Utilisateur créé avec succès',
                    data: {
                        id: result.insertId,
                        phone_number,
                        role
                    }
                });
            });
        });
    } catch (error) {
        logger.error('Erreur lors de la création de l\'utilisateur:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la création de l\'utilisateur'
        });
    }
};

/**
 * Met à jour un utilisateur
 * Accessible aux administrateurs et à l'utilisateur lui-même (pour certaines informations)
 */
const updateUser = async (req, res) => {
    try {
        authenticateToken(req, res, async () => {
            const userId = parseInt(req.params.id);

            // Vérification des permissions
            if (req.user.id !== userId && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    error: 'Accès non autorisé',
                    details: 'Vous ne pouvez pas modifier les informations de cet utilisateur'
                });
            }

            // Validation des données d'entrée
            let validatedData;
            try {
                validatedData = await userUpdateValidator.validateAsync(req.body, { 
                    abortEarly: false,
                    stripUnknown: true
                });
            } catch (validationError) {
                const errors = validationError.details.map(detail => ({
                    field: detail.path[0],
                    message: detail.message
                }));
                
                return res.status(400).json({
                    success: false,
                    error: 'Données invalides',
                    details: errors
                });
            }

            const { phone_number, role } = validatedData;

            // Si l'utilisateur n'est pas admin, il ne peut pas changer son rôle
            if (req.user.role !== 'admin' && role && role !== req.user.role) {
                return res.status(403).json({
                    success: false,
                    error: 'Accès refusé',
                    details: 'Vous ne pouvez pas modifier votre rôle'
                });
            }

            // Vérification que le nouveau numéro de téléphone n'existe pas déjà (si modifié)
            if (phone_number) {
                const [existingUsers] = await db.execute(
                    'SELECT id FROM users WHERE phone_number = ? AND id != ?',
                    [phone_number, userId]
                );

                if (existingUsers.length > 0) {
                    return res.status(409).json({
                        success: false,
                        error: 'Ce numéro de téléphone est déjà utilisé'
                    });
                }
            }

            // Construction de la requête de mise à jour
            let updateFields = [];
            let updateValues = [];

            if (phone_number) {
                updateFields.push('phone_number = ?');
                updateValues.push(phone_number);
            }

            if (role && req.user.role === 'admin') {
                updateFields.push('role = ?');
                updateValues.push(role);
            }

            if (updateFields.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Aucune donnée à mettre à jour'
                });
            }

            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            updateValues.push(userId);

            const [result] = await db.execute(
                `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
                updateValues
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Utilisateur non trouvé'
                });
            }

            return res.json({
                success: true,
                message: 'Utilisateur mis à jour avec succès',
                data: {
                    id: userId,
                    phone_number,
                    role
                }
            });
        });
    } catch (error) {
        logger.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la mise à jour de l\'utilisateur'
        });
    }
};

/**
 * Supprime un utilisateur
 * Accessible uniquement aux administrateurs
 */
const deleteUser = async (req, res) => {
    try {
        authenticateToken(req, res, async () => {
            requireRole(['admin'])(req, res, async () => {
                const userId = parseInt(req.params.id);

                // Empêcher la suppression de son propre compte
                if (req.user.id === userId) {
                    return res.status(400).json({
                        success: false,
                        error: 'Vous ne pouvez pas supprimer votre propre compte'
                    });
                }

                // Vérification que l'utilisateur existe
                const [existingUsers] = await db.execute(
                    'SELECT id, role FROM users WHERE id = ?',
                    [userId]
                );

                if (existingUsers.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'Utilisateur non trouvé'
                    });
                }

                // CORRECTION: Supprimer d'abord les sessions liées
                await db.execute(
                    'DELETE FROM sessions WHERE user_id = ?',
                    [userId]
                );

                // Ensuite supprimer l'utilisateur
                const [result] = await db.execute(
                    'DELETE FROM users WHERE id = ?',
                    [userId]
                );

                return res.json({
                    success: true,
                    message: 'Utilisateur supprimé avec succès',
                    data: {
                        id: userId,
                        deletedUser: existingUsers[0]
                    }
                });
            });
        });
    } catch (error) {
        logger.error('Erreur lors de la suppression de l\'utilisateur:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la suppression de l\'utilisateur'
        });
    }
};

/**
 * Récupère le profil de l'utilisateur connecté
 * Accessible à tous les utilisateurs authentifiés
 */
const getProfile = async (req, res) => {
    try {
        authenticateToken(req, res, async () => {
            return res.json({
                success: true,
                message: 'Profil récupéré avec succès',
                data: {
                    id: req.user.id,
                    phone_number: req.user.phone_number,
                    role: req.user.role,
                    created_at: req.user.created_at,
                    updated_at: req.user.updated_at
                }
            });
        });
    } catch (error) {
        logger.error('Erreur lors de la récupération du profil:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la récupération du profil'
        });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getProfile
};