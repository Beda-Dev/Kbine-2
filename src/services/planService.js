const db = require('../config/database');

/**
 * Crée un nouveau plan
 * @param {Object} planData - Les données du plan à créer
 * @returns {Promise<Object>} Le plan créé
 */
const create = async (planData) => {
    try {
        const requiredFields = ['operator_id', 'name', 'price', 'type', 'ussd_code'];
        const missingFields = requiredFields.filter(field => !(field in planData));
        
        if (missingFields.length > 0) {
            throw new Error(`Champs manquants: ${missingFields.join(', ')}`);
        }

        const [result] = await db.execute(
            'INSERT INTO plans (operator_id, name, description, price, type, validity_days, ussd_code, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
                planData.operator_id, 
                planData.name, 
                planData.description || null, 
                planData.price, 
                planData.type, 
                planData.validity_days || null, 
                planData.ussd_code, 
                planData.active !== undefined ? planData.active : true
            ]
        );
        
        return await findById(result.insertId);
    } catch (error) {
        console.error('Erreur lors de la création du plan:', error);
        throw new Error(`Échec de la création du plan: ${error.message}`);
    }
}

/**
 * Trouve un plan par son ID
 * @param {number} planId - L'ID du plan à rechercher
 * @returns {Promise<Object|null>} Le plan trouvé ou null si non trouvé
 */
const findById = async (planId) => {
    try {
        const [rows] = await db.execute(
            `SELECT p.*, o.name as operator_name, o.code as operator_code 
             FROM plans p 
             JOIN operators o ON p.operator_id = o.id 
             WHERE p.id = ?`, 
            [planId]
        );
        return rows[0] || null;
    } catch (error) {
        console.error(`Erreur lors de la recherche du plan ${planId}:`, error);
        throw new Error('Erreur lors de la récupération du plan');
    }
}

/**
 * Récupère tous les plans actifs
 * @param {boolean} includeInactive - Inclure les plans inactifs
 * @returns {Promise<Array>} Liste des plans
 */
const findAll = async (includeInactive = false) => {
    try {
        let query = `
            SELECT p.*, o.name as operator_name, o.code as operator_code 
            FROM plans p 
            JOIN operators o ON p.operator_id = o.id
        `;
        
        const params = [];
        
        if (!includeInactive) {
            query += ' WHERE p.active = ?';
            params.push(true);
        }
        
        query += ' ORDER BY p.name';
        
        const [rows] = await db.execute(query, params);
        return rows;
    } catch (error) {
        console.error('Erreur lors de la récupération des plans:', error);
        throw new Error('Erreur lors de la récupération de la liste des plans');
    }
}

/**
 * Trouve les plans par numéro de téléphone en fonction du préfixe
 * @param {string} phoneNumber - Le numéro de téléphone à rechercher
 * @returns {Promise<Array>} Liste des plans disponibles pour l'opérateur du numéro
 */
const findByPhoneNumber = async (phoneNumber) => {
    if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.length < 2) {
        throw new Error('Numéro de téléphone invalide');
    }
    
    const prefix = phoneNumber.substring(0, 2);
    
    try {
        // D'abord, trouver l'opérateur correspondant au préfixe
        const [operators] = await db.execute(
            'SELECT id FROM operators WHERE JSON_CONTAINS(prefixes, ?)', 
            [`"${prefix}"`]
        );
        
        if (operators.length === 0) {
            return []; // Aucun opérateur trouvé pour ce préfixe
        }
        
        const operatorId = operators[0].id;
        
        // Ensuite, récupérer tous les plans actifs pour cet opérateur
        const [plans] = await db.execute(
            `SELECT p.*, o.name as operator_name, o.code as operator_code 
             FROM plans p 
             JOIN operators o ON p.operator_id = o.id 
             WHERE p.operator_id = ? AND p.active = ? 
             ORDER BY p.price`,
            [operatorId, true]
        );
        
        return plans;
    } catch (error) {
        console.error(`Erreur lors de la recherche par numéro ${phoneNumber}:`, error);
        throw new Error('Erreur lors de la recherche des plans pour ce numéro');
    }
}

/**
 * Met à jour un plan existant
 * @param {number} planId - L'ID du plan à mettre à jour
 * @param {Object} planData - Les données à mettre à jour
 * @returns {Promise<Object>} Le plan mis à jour
 */
const update = async (planId, planData) => {
    try {
        if (!planId) {
            throw new Error('ID du plan manquant');
        }
        
        const updates = [];
        const params = [];
        
        // Construire dynamiquement la requête en fonction des champs fournis
        if (planData.operator_id !== undefined) {
            updates.push('operator_id = ?');
            params.push(planData.operator_id);
        }
        if (planData.name !== undefined) {
            updates.push('name = ?');
            params.push(planData.name);
        }
        if (planData.description !== undefined) {
            updates.push('description = ?');
            params.push(planData.description);
        }
        if (planData.price !== undefined) {
            updates.push('price = ?');
            params.push(planData.price);
        }
        if (planData.type !== undefined) {
            updates.push('type = ?');
            params.push(planData.type);
        }
        if (planData.validity_days !== undefined) {
            updates.push('validity_days = ?');
            params.push(planData.validity_days);
        }
        if (planData.ussd_code !== undefined) {
            updates.push('ussd_code = ?');
            params.push(planData.ussd_code);
        }
        if (planData.active !== undefined) {
            updates.push('active = ?');
            params.push(planData.active);
        }
        
        if (updates.length === 0) {
            return await findById(planId); // Aucune mise à jour nécessaire
        }
        
        // Ajouter l'ID du plan aux paramètres pour la clause WHERE
        params.push(planId);
        
        const query = `UPDATE plans SET ${updates.join(', ')} WHERE id = ?`;
        
        const [result] = await db.execute(query, params);
        
        if (result.affectedRows === 0) {
            throw new Error('Plan non trouvé');
        }
        
        return await findById(planId);
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            throw new Error('Impossible de mettre à jour ce plan car il est utilisé dans des commandes');
        }
        console.error(`Erreur lors de la mise à jour du plan ${planId}:`, error);
        throw new Error(`Échec de la mise à jour du plan: ${error.message}`);
    }
}

/**
 * Supprime un plan par son ID
 * @param {number} planId - L'ID du plan à supprimer
 * @returns {Promise<boolean>} True si la suppression a réussi
 */
const deleteById = async (planId) => {
    try {
        const [result] = await db.execute('DELETE FROM plans WHERE id = ?', [planId]);
        
        if (result.affectedRows === 0) {
            throw new Error('Plan non trouvé');
        }
        
        return true;
    } catch (error) {
        console.error(`Erreur lors de la suppression du plan ${planId}:`, error);
        
        // Si la suppression échoue à cause d'une contrainte de clé étrangère
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            throw new Error('Impossible de supprimer ce plan car il est utilisé dans des commandes');
        }
        
        throw new Error(`Échec de la suppression du plan: ${error.message}`);
    }
}

/**
 * Trouve les plans par ID d'opérateur
 * @param {number} operatorId - L'ID de l'opérateur
 * @returns {Promise<Array>} Liste des plans pour cet opérateur
 */
const findByOperatorId = async (operatorId) => {
    try {
        const [rows] = await db.execute(
            `SELECT p.*, o.name as operator_name, o.code as operator_code 
             FROM plans p 
             JOIN operators o ON p.operator_id = o.id 
             WHERE p.operator_id = ? AND p.active = ? 
             ORDER BY p.price`,
            [operatorId, true]
        );
        
        return rows;
    } catch (error) {
        console.error(`Erreur lors de la recherche des plans pour l'opérateur ${operatorId}:`, error);
        throw new Error('Erreur lors de la récupération des plans de l\'opérateur');
    }
}

module.exports = {
    create,
    findById,
    findAll,
    findByPhoneNumber,
    findByOperatorId,
    update,
    deleteById
};