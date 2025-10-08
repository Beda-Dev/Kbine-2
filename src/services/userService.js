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
const PHONE_NUMBER_REGEX = /^(\+225|0)[0-9]{10}$/;

/**
 * Rechercher un utilisateur par ID
 */
const findById = async (userId) => {
  if (!userId || isNaN(parseInt(userId, 10))) {
    throw new Error('ID utilisateur invalide');
  }

  try {
    const db = require('../config/database');
    const [rows] = await db.execute(
      'SELECT id, phone_number as phone_number, role, created_at as createdAt FROM users WHERE id = ?',
      [userId]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Erreur findById:', error);
    throw new Error('Erreur lors de la recherche de l\'utilisateur');
  }
};

/**
 * Rechercher un utilisateur par numéro de téléphone
 */
const findByPhoneNumber = async (phoneNumber) => {
  if (!phoneNumber || !PHONE_NUMBER_REGEX.test(phoneNumber)) {
    throw new Error('Numéro de téléphone invalide');
  }

  try {
    const db = require('../config/database');
    const [rows] = await db.execute(
      'SELECT id, phone_number as phone_number, role, created_at as createdAt FROM users WHERE phone_number = ?',
      [phoneNumber]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Erreur findByPhoneNumber:', error);
    throw new Error('Erreur lors de la recherche par numéro de téléphone');
  }
};

/**
 * Créer un nouvel utilisateur
 */
const create = async (userData) => {
  const { phoneNumber, role = 'client' } = userData || {};

  if (!phoneNumber || !PHONE_NUMBER_REGEX.test(phoneNumber)) {
    throw new Error('Numéro de téléphone invalide');
  }

  if (!['client', 'staff', 'admin'].includes(role)) {
    throw new Error('Rôle utilisateur invalide');
  }

  const db = require('../config/database');
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Vérifier l'existence de l'utilisateur dans la même transaction
    const [existingUser] = await connection.execute(
      'SELECT id FROM users WHERE phone_number = ? FOR UPDATE',
      [phoneNumber]
    );

    if (existingUser.length > 0) {
      return findById(existingUser[0].id);
    }

    // Création de l'utilisateur
    const [result] = await connection.execute(
      'INSERT INTO users (phone_number, role) VALUES (?, ?)',
      [phoneNumber, role]
    );

    if (!result || !result.insertId) {
      throw new Error('Échec de la création de l\'utilisateur');
    }

    await connection.commit();
    return findById(result.insertId);

  } catch (error) {
    await connection.rollback();
    console.error('Erreur create user:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      // Si une autre requête a créé l'utilisateur entre-temps
      return findByPhoneNumber(phoneNumber);
    }
    
    throw new Error(`Erreur lors de la création de l'utilisateur: ${error.message}`);
  } finally {
    connection.release();
  }
};

module.exports = {
  findById,
  findByPhoneNumber,
  create
};