/**
 * Configuration de la connexion à la base de données PostgreSQL (Neon)
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

// Charger les variables d'environnement
require('dotenv').config();

// ===============================
// CONFIGURATION DE LA BASE DE DONNÉES
// ===============================

/**
 * Configuration du pool de connexions PostgreSQL
 */
console.log(process.env.DATABASE_URL);
const config = {
  // Utiliser DATABASE_URL pour la connexion poolée (recommandé pour Neon)
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  
  // Configuration du pool
  max: 10, // Nombre maximum de connexions
  idleTimeoutMillis: 30000, // Fermer les connexions inactives après 30s
  connectionTimeoutMillis: 10000, // Timeout de connexion réduit à 10s pour détecter les erreurs plus vite
  
  // SSL OBLIGATOIRE pour Neon - Configuration corrigée
  ssl: {
    rejectUnauthorized: false // Nécessaire pour Neon
  }
};

// Log de la configuration (sans exposer le mot de passe)
logger.info('Configuration PostgreSQL:', {
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  ssl: 'enabled',
  poolSize: config.max
});
console.log('Configuration PostgreSQL:', {
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  ssl: 'enabled',
  poolSize: config.max
});

console.log("Vérification que DATABASE_URL est définie....")
// Vérification que DATABASE_URL est définie
if (!config.connectionString) {
  logger.error('❌ DATABASE_URL ou POSTGRES_URL n\'est pas définie dans les variables d\'environnement');
  console.log("DATABASE_URL ou POSTGRES_URL n'est pas définie dans les variables d'environnement");
  process.exit(1);
}

// ===============================
// CRÉATION DU POOL DE CONNEXIONS
// ===============================
console.log("Création du pool de connexions....")

const pool = new Pool(config);

console.log("Pool de connexions créé avec succès....")

// Gestion des erreurs du pool
pool.on('error', (err) => {
  console.log("Erreur inattendue sur le client PostgreSQL inactif", {
    error: err.message,
    code: err.code,
    stack: err.stack
  })
  logger.error('Erreur inattendue sur le client PostgreSQL inactif', {
    error: err.message,
    code: err.code,
    stack: err.stack
  });
});

// Log des connexions réussies
pool.on('connect', () => {
  console.log("Nouvelle connexion PostgreSQL établie")
  logger.debug('Nouvelle connexion PostgreSQL établie');
});

// Log des connexions retirées du pool
pool.on('remove', () => {
  console.log("Connexion PostgreSQL retirée du pool")
  logger.debug('Connexion PostgreSQL retirée du pool');
});

// ===============================
// WRAPPER POUR COMPATIBILITÉ MYSQL2
// ===============================

/**
 * Convertit les requêtes MySQL (?) en requêtes PostgreSQL ($1, $2, etc.)
 */
const convertMySQLToPostgreSQL = (sql, params = []) => {
  let paramIndex = 1;
  const convertedSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
  return { sql: convertedSql, params };
};

/**
 * Convertit les résultats PostgreSQL pour ressembler à MySQL2
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
  let client;
  try {
    logger.info('🔄 Tentative de connexion à la base de données PostgreSQL (Neon)...');
    console.log("Tentative de connexion à la base de données PostgreSQL (Neon)...")
    
    client = await pool.connect();
    
    logger.info('✅ Connexion à la base de données PostgreSQL (Neon) établie');
    console.log("Connexion à la base de données PostgreSQL (Neon) établie")
    
    // Test simple
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    
    logger.info('✅ Test de connexion réussi', { 
      time: result.rows[0].current_time,
      version: result.rows[0].pg_version.split(' ')[0] + ' ' + result.rows[0].pg_version.split(' ')[1]
    });
    
  } catch (error) {
    logger.error('❌ Erreur de connexion à la base de données PostgreSQL:', {
      message: error.message,
      code: error.code,
      host: process.env.PGHOST,
      database: process.env.PGDATABASE,
      stack: error.stack
    });
    console.log("Erreur de connexion à la base de données PostgreSQL:", {
      message: error.message,
      code: error.code,
      host: process.env.PGHOST,
      database: process.env.PGDATABASE,
      stack: error.stack
    })
    
    // Afficher des conseils de dépannage
    logger.error('💡 Vérifiez que:');
    logger.error('   1. La variable DATABASE_URL est correctement définie dans .env');
    logger.error('   2. Votre base de données Neon est active (pas en pause)');
    logger.error('   3. Les identifiants sont corrects');
    logger.error('   4. Votre IP est autorisée dans les paramètres Neon');
    
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Exécution du test de connexion
testConnection();

// ===============================
// EXPORT DU MODULE
// ===============================

module.exports = {
  /**
   * Exécute une requête préparée (compatible MySQL2)
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
        code: error.code,
        sql: sql.substring(0, 100)
      });
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Exécute une requête simple (compatible MySQL2)
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
        code: error.code,
        sql: sql.substring(0, 100)
      });
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Obtient une connexion du pool
   */
  getConnection: async () => {
    const client = await pool.connect();
    
    return {
      beginTransaction: async () => {
        await client.query('BEGIN');
      },
      
      commit: async () => {
        await client.query('COMMIT');
      },
      
      rollback: async () => {
        await client.query('ROLLBACK');
      },
      
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
      
      release: () => {
        client.release();
      }
    };
  },

  pool
};