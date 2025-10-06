/**
 * Configuration de la connexion a la base de donnees MySQL
 * 
 * Ce fichier configure la connexion a MySQL en utilisant un pool de connexions.
 * Un pool permet de reutiliser les connexions et d'optimiser les performances.
 * 
 * Fonctionnalites:
 * - Pool de connexions reutilisables
 * - Configuration via variables d'environnement
 * - Test automatique de connexion au demarrage
 * - Gestion des timeouts et limites
 * 
 * IMPORTANT: Ce fichier est importe dans app.js pour initialiser la DB
 */

// Import des modules necessaires
const mysql = require('mysql2/promise'); // Driver MySQL avec support des Promises
const logger = require('../utils/logger'); // Systeme de logs pour tracer les operations

// ===============================
// CONFIGURATION DE LA BASE DE DONNEES
// ===============================

/**
 * Configuration du pool de connexions MySQL
 * 
 * Les valeurs par defaut correspondent a la configuration Docker
 * mais peuvent etre surchargees via les variables d'environnement
 */
const config = {
  // ===== PARAMETRES DE CONNEXION =====
  host: process.env.DB_HOST || 'kbine-mysql', // Nom du container MySQL
  port: process.env.DB_PORT || 3306, // Port standard MySQL
  user: process.env.DB_USER || 'kbine_user', // Utilisateur MySQL
  password: process.env.DB_PASSWORD || 'kbine_password', // Mot de passe
  database: process.env.DB_NAME || 'kbine_db', // Nom de la base de donnees
  
  // ===== PARAMETRES DU POOL =====
  waitForConnections: true, // Attendre si toutes les connexions sont occupees
  connectionLimit: 10, // Nombre maximum de connexions simultanees
  queueLimit: 0, // Pas de limite sur la file d'attente (0 = illimite)
  
  // ===== PARAMETRES DE TIMEOUT =====
  acquireTimeout: 60000, // Timeout pour obtenir une connexion (60 sec)
  timeout: 60000 // Timeout pour les requetes SQL (60 sec)
};

// ===============================
// CREATION DU POOL DE CONNEXIONS
// ===============================

/**
 * Creation du pool de connexions MySQL
 * 
 * Le pool gere automatiquement:
 * - L'ouverture/fermeture des connexions
 * - La reutilisation des connexions existantes
 * - La limitation du nombre de connexions simultanees
 * - Les timeouts et la gestion des erreurs
 */
const pool = mysql.createPool(config);

// ===============================
// TEST DE CONNEXION AU DEMARRAGE
// ===============================

/**
 * Fonction de test de la connexion a la base de donnees
 * 
 * Cette fonction est executee au demarrage de l'application pour:
 * - Verifier que MySQL est accessible
 * - S'assurer que les credentials sont corrects
 * - Arreter l'application si la DB n'est pas disponible
 * 
 * IMPORTANT: L'application s'arrete si la connexion echoue
 * pour eviter de demarrer sans base de donnees
 */
const testConnection = async () => {
  try {
    // Tentative d'obtention d'une connexion du pool
    const connection = await pool.getConnection();
    
    // Log de succes
    logger.info('Connexion a la base de donnees MySQL etablie');
    
    // Liberation immediate de la connexion
    // Important: toujours liberer les connexions pour eviter les fuites
    connection.release();
    
  } catch (error) {
    // Log de l'erreur avec details
    logger.error('Erreur de connexion a la base de donnees:', error);
    
    // Arret force de l'application
    // process.exit(1) indique un arret anormal
    process.exit(1);
  }
};

// Execution du test de connexion au chargement du module
// Cela garantit que la DB est accessible avant de demarrer l'API
testConnection();

// ===============================
// EXPORT DU POOL
// ===============================

/**
 * Export du pool de connexions
 * 
 * Ce pool sera utilise dans les repositories pour executer les requetes SQL
 * 
 * Exemple d'utilisation dans un repository:
 * const db = require('../config/database');
 * const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
 */
module.exports = pool;