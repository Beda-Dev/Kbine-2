const db = require('../config/database');

/**
 * Service de gestion des opérateurs
 * VERSION CORRIGÉE POUR POSTGRESQL
 */

/**
 * Crée un nouvel opérateur
 */
const create = async (operatorData) => {
    try {
        // S'assurer que les préfixes sont stockés sous forme de tableau JSON
        const prefixes = Array.isArray(operatorData.prefixes) 
            ? JSON.stringify(operatorData.prefixes)
            : operatorData.prefixes;

        const [result] = await db.execute(
            'INSERT INTO operators (name, code, prefixes) VALUES ($1, $2, $3) RETURNING id',
            [operatorData.name, operatorData.code, prefixes]
        );
        
        const insertId = result[0].id;
        return await findById(insertId);
    } catch (error) {
        console.error('Erreur lors de la création de l\'opérateur:', error);
        
        if (error.code === '23505') { // PostgreSQL unique violation
            throw new Error('Un opérateur avec ce code existe déjà');
        }
        
        throw new Error(`Échec de la création de l'opérateur: ${error.message}`);
    }
};

/**
 * Trouve un opérateur par son ID
 */
const findById = async (operatorId) => {
    try {
        const [rows] = await db.execute(
            'SELECT id, name, code, prefixes, created_at FROM operators WHERE id = $1',
            [operatorId]
        );

        if (rows.length === 0) {
            return null;
        }

        const operator = rows[0];
        
        // PostgreSQL JSONB retourne déjà un objet/tableau
        // Pas besoin de parser si c'est déjà un objet
        if (operator.prefixes && typeof operator.prefixes === 'string') {
            try {
                operator.prefixes = JSON.parse(operator.prefixes);
            } catch (e) {
                console.error('Erreur lors du parsing des préfixes:', e);
                operator.prefixes = [];
            }
        }

        return operator;
    } catch (error) {
        console.error(`Erreur lors de la recherche de l'opérateur ${operatorId}:`, error);
        throw new Error('Erreur lors de la récupération de l\'opérateur');
    }
};

/**
 * Trouve un opérateur par son code
 */
const findByCode = async (code) => {
    try {
        const [rows] = await db.execute(
            'SELECT id, name, code, prefixes, created_at FROM operators WHERE code = $1', 
            [code]
        );
        
        if (rows.length === 0) {
            return null;
        }
        
        const operator = rows[0];
        if (operator.prefixes && typeof operator.prefixes === 'string') {
            try {
                operator.prefixes = JSON.parse(operator.prefixes);
            } catch (e) {
                console.error('Erreur lors du parsing des préfixes:', e);
                operator.prefixes = [];
            }
        }
        
        return operator;
    } catch (error) {
        console.error(`Erreur lors de la recherche de l'opérateur par code ${code}:`, error);
        throw new Error('Erreur lors de la recherche de l\'opérateur par code');
    }
};

/**
 * Récupère tous les opérateurs
 */
const findAll = async () => {
    try {
        const [rows] = await db.execute(
            'SELECT id, name, code, prefixes, created_at FROM operators ORDER BY name'
        );
        
        return rows.map(operator => {
            if (operator.prefixes && typeof operator.prefixes === 'string') {
                try {
                    operator.prefixes = JSON.parse(operator.prefixes);
                } catch (e) {
                    console.error('Erreur lors du parsing des préfixes:', e);
                    operator.prefixes = [];
                }
            }
            return operator;
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des opérateurs:', error);
        throw new Error('Erreur lors de la récupération de la liste des opérateurs');
    }
};

/**
 * Met à jour un opérateur existant
 */
const update = async (operatorId, operatorData) => {
    try {
        const prefixes = operatorData.prefixes 
            ? (Array.isArray(operatorData.prefixes) 
                ? JSON.stringify(operatorData.prefixes)
                : operatorData.prefixes)
            : null;
        
        const updates = [];
        const params = [];
        let paramIndex = 1;
        
        if (operatorData.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            params.push(operatorData.name);
        }
        
        if (operatorData.code !== undefined) {
            updates.push(`code = $${paramIndex++}`);
            params.push(operatorData.code);
        }
        
        if (prefixes !== null) {
            updates.push(`prefixes = $${paramIndex++}`);
            params.push(prefixes);
        }
        
        if (updates.length === 0) {
            return await findById(operatorId);
        }
        
        params.push(operatorId);
        const query = `UPDATE operators SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
        
        const [result] = await db.execute(query, params);
        
        // CORRECTION : Vérifier rowCount au lieu de result.length
        if (result.rowCount === 0) {
            throw new Error('Opérateur non trouvé');
        }
        
        return await findById(operatorId);
    } catch (error) {
        console.error(`Erreur lors de la mise à jour de l'opérateur ${operatorId}:`, error);
        
        if (error.code === '23505') {
            throw new Error('Un opérateur avec ce code existe déjà');
        }
        
        throw new Error(`Échec de la mise à jour de l'opérateur: ${error.message}`);
    }
};

/**
 * Supprime un opérateur par son ID
 */
const deleteById = async (operatorId) => {
    try {
        const [result] = await db.execute('DELETE FROM operators WHERE id = $1', [operatorId]);
        
        // CORRECTION : Vérifier rowCount au lieu de result.length
        if (result.rowCount === 0) {
            throw new Error('Opérateur non trouvé');
        }
        
        return true;
    } catch (error) {
        console.error(`Erreur lors de la suppression de l'opérateur ${operatorId}:`, error);
        
        if (error.code === '23503') { // PostgreSQL foreign key violation
            throw new Error('Impossible de supprimer cet opérateur car il est utilisé dans des plans ou des commandes');
        }
        
        throw new Error(`Échec de la suppression de l'opérateur: ${error.message}`);
    }
};

module.exports = {
    create,
    findById,
    findByCode,
    findAll,
    update,
    deleteById
};