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

/**
 * Rechercher un utilisateur par ID
 * @param {number} userId - ID de l'utilisateur
 * @returns {object|null} Utilisateur ou null si non trouve
 */
const findById = async (userId) => {
  try {
    // TODO: Implementer la vraie requete base de donnees
    const db = require('../config/database');
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
    return rows[0] || null;
    
    // // Stub temporaire
    // if (userId === 1) {
    //   return {
    //     id: 1,
    //     phoneNumber: '0701234567',
    //     role: 'client',
    //     createdAt: new Date()
    //   };
    // }
    
    // return null;
  } catch (error) {
    console.error('Erreur findById:', error);
    throw error;
  }
};

/**
 * Rechercher un utilisateur par numero de telephone
 * @param {string} phoneNumber - Numero de telephone
 * @returns {object|null} Utilisateur ou null si non trouve
 */
const findByPhoneNumber = async (phoneNumber) => {
  try {
    // TODO: Implementer la vraie requete base de donnees
    const db = require('../config/database');
    const [rows] = await db.execute('SELECT * FROM users WHERE phone_number = ?', [phoneNumber]);
    return rows[0] || null;
    
  } catch (error) {
    console.error('Erreur findByPhoneNumber:', error);
    throw error;
  }
};

/**
 * Creer un nouvel utilisateur
 * @param {object} userData - Donnees utilisateur
 * @returns {object} Utilisateur cree
 */
const create = async (userData) => {
  try {
    // TODO: Implementer la vraie insertion base de donnees
    const db = require('../config/database');
    const [result] = await db.execute(
      'INSERT INTO users (phone_number, role) VALUES (?, ?)',
      [userData.phoneNumber, userData.role || 'client']
    );
    return findById(result.insertId);
    
    // // Stub temporaire
    // return {
    //   id: Math.floor(Math.random() * 1000),
    //   phoneNumber: userData.phoneNumber,
    //   role: userData.role || 'client',
    //   createdAt: new Date()
    // };
  } catch (error) {
    console.error('Erreur create user:', error);
    throw error;
  }
};

module.exports = {
  findById,
  findByPhoneNumber,
  create
};