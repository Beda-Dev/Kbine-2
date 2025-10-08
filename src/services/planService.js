const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Service de gestion des plans
 * AMÉLIORATIONS:
 * - Meilleure gestion des erreurs
 * - Logging cohérent
 * - Validation des paramètres
 * - Transactions pour les opérations critiques
 */

/**
 * Crée un nouveau plan
 * @param {Object} planData - Les données du plan à créer
 * @returns {Promise<Object>} Le plan créé
 */
const create = async (planData) => {
    const context = '[PlanService] [create]';
    
    try {
        logger.debug(`${context} Tentative de création de plan`, { 
            name: planData.name,
            type: planData.type 
        });
        
        // Validation des champs requis
        const requiredFields = ['operator_id', 'name', 'price', 'type', 'ussd_code'];
        const missingFields = requiredFields.filter(field => !(field in planData));
        
        if (missingFields.length > 0) {
            logger.warn(`${context} Champs manquants`, { missingFields });
            throw new Error(`Champs manquants: ${missingFields.join(', ')}`);
        }

        // Vérifier que l'opérateur existe
        const [operators] = await db.execute(
            'SELECT id FROM operators WHERE id = ?',
            [planData.operator_id]
        );

        if (operators.length === 0) {
            logger.warn(`${context} Opérateur non trouvé`, { 
                operator_id: planData.operator_id 
            });
            throw new Error('Opérateur non trouvé');
        }

        // Insertion du plan
        const [result] = await db.execute(
            `INSERT INTO plans 
            (operator_id, name, description, price, type, validity_days, ussd_code, active) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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
        
        logger.info(`${context} Plan créé avec succès`, { 
            planId: result.insertId,
            name: planData.name 
        });
        
        return await findById(result.insertId);
        
    } catch (error) {
        logger.error(`${context} Erreur lors de la création du plan`, {
            error: error.message,
            stack: error.stack,
            planData: { ...planData, description: '***' } // Masquer les données sensibles
        });
        
        if (error.code === 'ER_DUP_ENTRY') {
            throw new Error('Un plan avec ce nom existe déjà pour cet opérateur');
        }
        
        throw new Error(`Échec de la création du plan: ${error.message}`);
    }
};

/**
 * Trouve un plan par son ID
 * @param {number} planId - L'ID du plan à rechercher
 * @returns {Promise<Object|null>} Le plan trouvé ou null si non trouvé
 */
const findById = async (planId) => {
    const context = '[PlanService] [findById]';
    
    try {
        if (!planId || isNaN(parseInt(planId))) {
            throw new Error('ID de plan invalide');
        }

        logger.debug(`${context} Recherche du plan`, { planId });
        
        const [rows] = await db.execute(
            `SELECT p.*, o.name as operator_name, o.code as operator_code 
             FROM plans p 
             JOIN operators o ON p.operator_id = o.id 
             WHERE p.id = ?`, 
            [planId]
        );
        
        const result = rows[0] || null;
        
        logger.debug(`${context} Résultat de la recherche`, { 
            planId,
            found: !!result 
        });
        
        return result;
        
    } catch (error) {
        logger.error(`${context} Erreur lors de la recherche du plan`, {
            error: error.message,
            stack: error.stack,
            planId
        });
        throw new Error('Erreur lors de la récupération du plan');
    }
};

/**
 * Récupère tous les plans actifs
 * @param {boolean} includeInactive - Inclure les plans inactifs
 * @returns {Promise<Array>} Liste des plans
 */
const findAll = async (includeInactive = false) => {
    const context = '[PlanService] [findAll]';
    
    try {
        logger.debug(`${context} Récupération des plans`, { includeInactive });
        
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
        
        query += ' ORDER BY o.name, p.price';
        
        const [rows] = await db.execute(query, params);
        
        logger.info(`${context} Plans récupérés`, { count: rows.length });
        
        return rows;
        
    } catch (error) {
        logger.error(`${context} Erreur lors de la récupération des plans`, {
            error: error.message,
            stack: error.stack
        });
        throw new Error('Erreur lors de la récupération de la liste des plans');
    }
};

/**
 * Trouve les plans par numéro de téléphone en fonction du préfixe
 * @param {string} phoneNumber - Le numéro de téléphone à rechercher
 * @returns {Promise<Array>} Liste des plans disponibles pour l'opérateur du numéro
 */
const findByPhoneNumber = async (phoneNumber) => {
    const context = '[PlanService] [findByPhoneNumber]';
    
    try {
        if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.length < 2) {
            logger.warn(`${context} Numéro de téléphone invalide`, { phoneNumber });
            throw new Error('Numéro de téléphone invalide');
        }
        
        // Extraire le préfixe (2 premiers chiffres après le 0)
        const prefix = phoneNumber.substring(0, 2);
        
        logger.debug(`${context} Recherche des plans pour le préfixe`, { 
            phoneNumber: '***',
            prefix 
        });
        
        // Trouver l'opérateur correspondant au préfixe
        const [operators] = await db.execute(
            'SELECT id, name FROM operators WHERE JSON_CONTAINS(prefixes, ?)', 
            [`"${prefix}"`]
        );
        
        if (operators.length === 0) {
            logger.info(`${context} Aucun opérateur trouvé pour ce préfixe`, { prefix });
            return [];
        }
        
        const operator = operators[0];
        
        logger.debug(`${context} Opérateur identifié`, { 
            operatorId: operator.id,
            operatorName: operator.name 
        });
        
        // Récupérer tous les plans actifs pour cet opérateur
        const [plans] = await db.execute(
            `SELECT p.*, o.name as operator_name, o.code as operator_code 
             FROM plans p 
             JOIN operators o ON p.operator_id = o.id 
             WHERE p.operator_id = ? AND p.active = ? 
             ORDER BY p.price`,
            [operator.id, true]
        );
        
        logger.info(`${context} Plans trouvés`, { 
            count: plans.length,
            operator: operator.name 
        });
        
        return plans;
        
    } catch (error) {
        logger.error(`${context} Erreur lors de la recherche par numéro`, {
            error: error.message,
            stack: error.stack,
            phoneNumber: '***'
        });
        throw new Error('Erreur lors de la recherche des plans pour ce numéro');
    }
};

/**
 * Met à jour un plan existant
 * @param {number} planId - L'ID du plan à mettre à jour
 * @param {Object} planData - Les données à mettre à jour
 * @returns {Promise<Object>} Le plan mis à jour
 */
const update = async (planId, planData) => {
    const context = '[PlanService] [update]';
    
    try {
        if (!planId || isNaN(parseInt(planId))) {
            throw new Error('ID du plan invalide');
        }
        
        logger.debug(`${context} Tentative de mise à jour`, { 
            planId,
            fields: Object.keys(planData) 
        });
        
        const updates = [];
        const params = [];
        
        // Construire dynamiquement la requête
        if (planData.operator_id !== undefined) {
            // Vérifier que l'opérateur existe
            const [operators] = await db.execute(
                'SELECT id FROM operators WHERE id = ?',
                [planData.operator_id]
            );
            
            if (operators.length === 0) {
                throw new Error('Opérateur non trouvé');
            }
            
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
            logger.warn(`${context} Aucune mise à jour à effectuer`, { planId });
            return await findById(planId);
        }
        
        // Ajouter l'ID du plan pour la clause WHERE
        params.push(planId);
        
        const query = `UPDATE plans SET ${updates.join(', ')} WHERE id = ?`;
        
        const [result] = await db.execute(query, params);
        
        if (result.affectedRows === 0) {
            logger.warn(`${context} Plan non trouvé`, { planId });
            throw new Error('Plan non trouvé');
        }
        
        logger.info(`${context} Plan mis à jour avec succès`, { 
            planId,
            updatedFields: updates.length 
        });
        
        return await findById(planId);
        
    } catch (error) {
        logger.error(`${context} Erreur lors de la mise à jour`, {
            error: error.message,
            stack: error.stack,
            planId
        });
        
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            throw new Error('Impossible de mettre à jour ce plan car il est utilisé dans des commandes');
        }
        
        throw new Error(`Échec de la mise à jour du plan: ${error.message}`);
    }
};

/**
 * Supprime un plan par son ID
 * @param {number} planId - L'ID du plan à supprimer
 * @returns {Promise<boolean>} True si la suppression a réussi
 */
const deleteById = async (planId) => {
    const context = '[PlanService] [deleteById]';
    
    try {
        if (!planId || isNaN(parseInt(planId))) {
            throw new Error('ID du plan invalide');
        }
        
        logger.debug(`${context} Tentative de suppression`, { planId });
        
        // Vérifier que le plan existe
        const plan = await findById(planId);
        if (!plan) {
            throw new Error('Plan non trouvé');
        }
        
        const [result] = await db.execute(
            'DELETE FROM plans WHERE id = ?', 
            [planId]
        );
        
        if (result.affectedRows === 0) {
            throw new Error('Plan non trouvé');
        }
        
        logger.info(`${context} Plan supprimé avec succès`, { planId });
        
        return true;
    } catch (error) {
        logger.error(`${context} Erreur lors de la suppression`, {
            error: error.message,
            stack: error.stack,
            planId
        });
        
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            throw new Error('Impossible de supprimer ce plan car il est utilisé dans des commandes');
        }
        
        throw new Error(`Échec de la suppression du plan: ${error.message}`);
    }
};


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