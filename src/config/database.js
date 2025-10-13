/**
 * Configuration de la connexion à la base de données PostgreSQL (Neon)
 * 
 * Ce fichier configure la connexion à PostgreSQL en utilisant un pool de connexions.
 * Compatible avec Vercel et Neon Database.
 * 
 * Fonctionnalités:
 * - Pool de connexions réutilisables
 * - Configuration via variables d'environnement
 * - Test automatique de connexion au démarrage
 * - Gestion des timeouts et limites
 * - Compatible avec l'API MySQL2 pour minimiser les changements dans les services
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

// ===============================
// CONFIGURATION DE LA BASE DE DONNÉES
// ===============================

/**
 * Configuration du pool de connexions PostgreSQL
 * 
 * Utilise les variables d'environnement de Neon/Vercel
 * Compatible avec Vercel Serverless
 */
const config = {
  // Utiliser DATABASE_URL pour la connexion poolée (recommandé)
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  
  // Configuration du pool
  max: 10, // Nombre maximum de connexions
  idleTimeoutMillis: 30000, // Fermer les connexions inactives après 30s
  connectionTimeoutMillis: 60000, // Timeout de connexion de 60s
  
  // SSL obligatoire pour Neon
  ssl: {
    rejectUnauthorized: false
  }
};

// ===============================
// CRÉATION DU POOL DE CONNEXIONS
// ===============================

const pool = new Pool(config);

// Gestion des erreurs du pool
pool.on('error', (err) => {
  logger.error('Erreur inattendue sur le client PostgreSQL inactif', err);
});

// ===============================
// WRAPPER POUR COMPATIBILITÉ MYSQL2
// ===============================

/**
 * Convertit les requêtes MySQL (?) en requêtes PostgreSQL ($1, $2, etc.)
 * @param {string} sql - Requête SQL avec placeholders MySQL
 * @param {Array} params - Paramètres de la requête
 * @returns {Object} - {sql, params} formatés pour PostgreSQL
 */
const convertMySQLToPostgreSQL = (sql, params = []) => {
  let paramIndex = 1;
  const convertedSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
  return { sql: convertedSql, params };
};

/**
 * Convertit les résultats PostgreSQL pour ressembler à MySQL2
 * @param {Object} result - Résultat PostgreSQL
 * @returns {Array} - Format [rows, fields] comme MySQL2
 */
const formatResultForMySQL = (result) => {
  return [result.rows, result.fields || []];
};

// ===============================
// TEST DE CONNEXION AU DÉMARRAGE
// ===============================

/**
 * Fonction de test de la connexion à la base de données
 */
const testConnection = async () => {
  try {
    const client = await pool.connect();
    logger.info('✅ Connexion à la base de données PostgreSQL (Neon) établie');
    
    // Test simple
    const result = await client.query('SELECT NOW()');
    logger.debug('Test de connexion réussi', { time: result.rows[0].now });
    
    client.release();
  } catch (error) {
    logger.error('❌ Erreur de connexion à la base de données PostgreSQL:', error);
    process.exit(1);
  }
};

// Exécution du test de connexion
testConnection();

// ===============================
// EXPORT DU MODULE
// ===============================

/**
 * Export compatible avec l'interface MySQL2
 * Permet de minimiser les changements dans les services existants
 */
module.exports = {
  /**
   * Exécute une requête préparée (compatible MySQL2)
   * @param {string} sql - Requête SQL
   * @param {Array} params - Paramètres de la requête
   * @returns {Promise<Array>} - [rows, fields]
   */
  execute: async (sql, params = []) => {
    const client = await pool.connect();
    try {
      const { sql: pgSql, params: pgParams } = convertMySQLToPostgreSQL(sql, params);
      const result = await client.query(pgSql, pgParams);
      return formatResultForMySQL(result);
    } catch (error) {
      logger.error('Erreur lors de l\'exécution de la requête:', {
        error: error.message,
        sql: sql.substring(0, 100)
      });
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Exécute une requête simple (compatible MySQL2)
   * @param {string} sql - Requête SQL
   * @param {Array} params - Paramètres de la requête
   * @returns {Promise<Array>} - [rows, fields]
   */
  query: async (sql, params = []) => {
    const client = await pool.connect();
    try {
      const { sql: pgSql, params: pgParams } = convertMySQLToPostgreSQL(sql, params);
      const result = await client.query(pgSql, pgParams);
      return formatResultForMySQL(result);
    } catch (error) {
      logger.error('Erreur lors de l\'exécution de la requête:', {
        error: error.message,
        sql: sql.substring(0, 100)
      });
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Obtient une connexion du pool
   * @returns {Promise<Object>} - Client PostgreSQL wrappé pour compatibilité MySQL2
   */
  getConnection: async () => {
    const client = await pool.connect();
    
    // Wrapper pour rendre le client compatible avec MySQL2
    return {
      // Méthodes de transaction
      beginTransaction: async () => {
        await client.query('BEGIN');
      },
      
      commit: async () => {
        await client.query('COMMIT');
      },
      
      rollback: async () => {
        await client.query('ROLLBACK');
      },
      
      // Méthodes de requête (compatibles MySQL2)
      execute: async (sql, params = []) => {
        const { sql: pgSql, params: pgParams } = convertMySQLToPostgreSQL(sql, params);
        const result = await client.query(pgSql, pgParams);
        return formatResultForMySQL(result);
      },
      
      query: async (sql, params = []) => {
        const { sql: pgSql, params: pgParams } = convertMySQLToPostgreSQL(sql, params);
        const result = await client.query(pgSql, pgParams);
        return formatResultForMySQL(result);
      },
      
      // Libération de la connexion
      release: () => {
        client.release();
      }
    };
  },

  // Pool direct pour des cas spéciaux
  pool
};