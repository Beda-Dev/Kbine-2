/**
 * Service utilisateur - STUB pour developpeur junior
 * 
 * Ce fichier contient des implementations minimales pour les operations utilisateur.
 * Le developpeur junior devra implementer la vraie logique avec la base de donnees.
 * 
 * TODO pour le developpeur junior:
 * - Connecter a la vraie base de donnees MySQL
 * - Implementer les requetes SQL
 * - Gerer les erreurs de base de donnees
 * - Ajouter la logique de creation automatique des comptes
 * - Implementer la gestion des roles (client, staff, admin)
 */
// Format attendu : 
// - 07 12 34 56 78 (10 chiffres commençant par 0)
// - +225 07 12 34 56 78 (12 chiffres avec l'indicatif)
const PHONE_NUMBER_REGEX = /^(\+225[0-9]{8}|0[0-9]{9})$/;

/**
 * Rechercher un utilisateur par ID
 */
const findById = async (userId) => {
  console.log(`[userService] Recherche de l'utilisateur avec l'ID: ${userId}`);
  
  if (!userId || isNaN(parseInt(userId, 10))) {
    console.error('[userService] ID utilisateur invalide:', userId);
    throw new Error('ID utilisateur invalide');
  }

  try {
    const db = require('../config/database');
    console.log(`[userService] Exécution de la requête pour l'ID: ${userId}`);
    
    const [rows] = await db.execute(
      'SELECT id, phone_number as phone_number, role, created_at as createdAt FROM users WHERE id = ?',
      [userId]
    );
    
    console.log(`[userService] Résultat de la recherche pour l'ID ${userId}:`, rows.length > 0 ? 'trouvé' : 'non trouvé');
    return rows[0] || null;
  } catch (error) {
    console.error('[userService] Erreur lors de la recherche par ID:', {
      error: error.message,
      stack: error.stack,
      userId: userId
    });
    throw new Error('Erreur lors de la recherche de l\'utilisateur');
  }
};

/**
 * Rechercher un utilisateur par numéro de téléphone
 */
const findByPhoneNumber = async (phoneNumber) => {
  console.log(`[userService] Recherche par numéro: ${phoneNumber}`);
  
  if (!phoneNumber || !PHONE_NUMBER_REGEX.test(phoneNumber)) {
    console.error('[userService] Numéro de téléphone invalide:', phoneNumber);
    throw new Error('Numéro de téléphone invalide');
  }

  try {
    const db = require('../config/database');
    console.log(`[userService] Exécution de la requête pour le numéro: ${phoneNumber}`);
    
    const [rows] = await db.execute(
      'SELECT id, phone_number as phone_number, role, created_at as createdAt FROM users WHERE phone_number = ?',
      [phoneNumber]
    );
    
    console.log(`[userService] Résultat de la recherche pour ${phoneNumber}:`, rows.length > 0 ? 'trouvé' : 'non trouvé');
    return rows[0] || null;
  } catch (error) {
    console.error('[userService] Erreur lors de la recherche par numéro:', {
      error: error.message,
      stack: error.stack,
      phoneNumber: phoneNumber
    });
    throw new Error('Erreur lors de la recherche par numéro de téléphone');
  }
};

/**
 * Créer un nouvel utilisateur
 */
const create = async (userData) => {
  console.log('[userService] Tentative de création d\'utilisateur avec les données:', userData);
  
  const { phoneNumber, role = 'client' } = userData || {};

  if (!phoneNumber || !PHONE_NUMBER_REGEX.test(phoneNumber)) {
    console.error('[userService] Numéro de téléphone invalide pour la création:', phoneNumber);
    throw new Error('Numéro de téléphone invalide');
  }

  if (!['client', 'staff', 'admin'].includes(role)) {
    console.error('[userService] Rôle utilisateur invalide:', role);
    throw new Error('Rôle utilisateur invalide');
  }

  const db = require('../config/database');
  const connection = await db.getConnection();

  try {
    console.log('[userService] Début de la transaction pour la création');
    await connection.beginTransaction();

    // Vérifier l'existence de l'utilisateur dans la même transaction
    console.log(`[userService] Vérification de l'existence du numéro: ${phoneNumber}`);
    const [existingUser] = await connection.execute(
      'SELECT id FROM users WHERE phone_number = ? FOR UPDATE',
      [phoneNumber]
    );

    if (existingUser.length > 0) {
      console.log(`[userService] Utilisateur existant trouvé avec l'ID: ${existingUser[0].id}`);
      return findById(existingUser[0].id);
    }

    // Création de l'utilisateur
    console.log('[userService] Création du nouvel utilisateur avec le rôle:', role);
    const [result] = await connection.execute(
      'INSERT INTO users (phone_number, role) VALUES (?, ?)',
      [phoneNumber, role]
    );

    if (!result || !result.insertId) {
      console.error('[userService] Échec de la création - Aucun ID inséré');
      throw new Error('Échec de la création de l\'utilisateur');
    }

    console.log(`[userService] Utilisateur créé avec succès, ID: ${result.insertId}`);
    await connection.commit();
    console.log('[userService] Transaction validée avec succès');
    
    const newUser = await findById(result.insertId);
    console.log('[userService] Détails du nouvel utilisateur:', newUser);
    return newUser;

  } catch (error) {
    console.error('[userService] Erreur lors de la création de l\'utilisateur:', {
      error: error.message,
      code: error.code,
      stack: error.stack,
      phoneNumber: phoneNumber,
      role: role
    });
    
    if (connection) {
      console.log('[userService] Tentative de rollback de la transaction');
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('[userService] Erreur lors du rollback:', rollbackError);
      }
    }
    
    if (error.code === 'ER_DUP_ENTRY') {
      console.log('[userService] Conflit d\'unicité détecté, recherche de l\'utilisateur existant');
      // Si une autre requête a créé l'utilisateur entre-temps
      return findByPhoneNumber(phoneNumber);
    }
    
    throw new Error(`Erreur lors de la création de l'utilisateur: ${error.message}`);
  } finally {
    if (connection) {
      console.log('[userService] Libération de la connexion');
      connection.release();
    }
  }
};

module.exports = {
  findById,
  findByPhoneNumber,
  create
};