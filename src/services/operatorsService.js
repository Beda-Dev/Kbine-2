const db = require('../config/database');

/**
 * Crée un nouvel opérateur
 * @param {Object} operatorData - Données de l'opérateur à créer
 * @returns {Promise<Object>} L'opérateur créé
 */
const create = async (operatorData) => {
    try {
        // S'assurer que les préfixes sont stockés sous forme de tableau JSON
        const prefixes = Array.isArray(operatorData.prefixes) 
            ? JSON.stringify(operatorData.prefixes)
            : operatorData.prefixes;

        const [result] = await db.execute(
            'INSERT INTO operators (name, code, prefixes) VALUES (?, ?, ?)',
            [operatorData.name, operatorData.code, prefixes]
        );
        
        return await findById(result.insertId);
    } catch (error) {
        console.error('Erreur lors de la création de l\'opérateur:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            throw new Error('Un opérateur avec ce code existe déjà');
        }
        
        throw new Error(`Échec de la création de l'opérateur: ${error.message}`);
    }
};

/**
 * Trouve un opérateur par son ID
 * @param {number} operatorId - ID de l'opérateur
 * @returns {Promise<Object|null>} L'opérateur trouvé ou null si non trouvé
 */
const findById = async (operatorId) => {
    try {
        const [rows] = await db.execute(
            'SELECT id, name, code, JSON_ARRAY(prefixes) as prefixes, created_at FROM operators WHERE id = ?', 
            [operatorId]
        );
        
        if (rows.length === 0) {
            return null;
        }
        
        // Convertir les préfixes en tableau si nécessaire
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
        console.error(`Erreur lors de la recherche de l'opérateur ${operatorId}:`, error);
        throw new Error('Erreur lors de la récupération de l\'opérateur');
    }
};

/**
 * Trouve un opérateur par son code
 * @param {string} code - Code de l'opérateur
 * @returns {Promise<Object|null>} L'opérateur trouvé ou null si non trouvé
 */
const findByCode = async (code) => {
    try {
        const [rows] = await db.execute(
            'SELECT id, name, code, JSON_ARRAY(prefixes) as prefixes, created_at FROM operators WHERE code = ?', 
            [code]
        );
        
        if (rows.length === 0) {
            return null;
        }
        
        // Convertir les préfixes en tableau si nécessaire
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
 * @returns {Promise<Array>} Liste des opérateurs
 */
const findAll = async () => {
    try {
        const [rows] = await db.execute(
            'SELECT id, name, code, JSON_ARRAY(prefixes) as prefixes, created_at FROM operators ORDER BY name'
        );
        
        // Convertir les préfixes en tableau pour chaque opérateur
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
 * @param {number} operatorId - ID de l'opérateur à mettre à jour
 * @param {Object} operatorData - Nouvelles données de l'opérateur
 * @returns {Promise<Object>} L'opérateur mis à jour
 */
const update = async (operatorId, operatorData) => {
    try {
        // S'assurer que les préfixes sont stockés sous forme de tableau JSON
        const prefixes = operatorData.prefixes 
            ? (Array.isArray(operatorData.prefixes) 
                ? JSON.stringify(operatorData.prefixes)
                : operatorData.prefixes)
            : null;
        
        // Construire dynamiquement la requête en fonction des champs fournis
        const updates = [];
        const params = [];
        
        if (operatorData.name !== undefined) {
            updates.push('name = ?');
            params.push(operatorData.name);
        }
        
        if (operatorData.code !== undefined) {
            updates.push('code = ?');
            params.push(operatorData.code);
        }
        
        if (prefixes !== undefined) {
            updates.push('prefixes = ?');
            params.push(prefixes);
        }
        
        if (updates.length === 0) {
            return await findById(operatorId); // Aucune mise à jour nécessaire
        }
        
        // Ajouter l'ID de l'opérateur aux paramètres pour la clause WHERE
        params.push(operatorId);
        
        const query = `UPDATE operators SET ${updates.join(', ')} WHERE id = ?`;
        
        const [result] = await db.execute(query, params);
        
        if (result.affectedRows === 0) {
            throw new Error('Opérateur non trouvé');
        }
        
        return await findById(operatorId);
    } catch (error) {
        console.error(`Erreur lors de la mise à jour de l'opérateur ${operatorId}:`, error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            throw new Error('Un opérateur avec ce code existe déjà');
        }
        
        throw new Error(`Échec de la mise à jour de l'opérateur: ${error.message}`);
    }
};

/**
 * Supprime un opérateur par son ID
 * @param {number} operatorId - ID de l'opérateur à supprimer
 * @returns {Promise<boolean>} True si la suppression a réussi
 */
const deleteById = async (operatorId) => {
    try {
        const [result] = await db.execute('DELETE FROM operators WHERE id = ?', [operatorId]);
        
        if (result.affectedRows === 0) {
            throw new Error('Opérateur non trouvé');
        }
        
        return true;
    } catch (error) {
        console.error(`Erreur lors de la suppression de l'opérateur ${operatorId}:`, error);
        
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
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

