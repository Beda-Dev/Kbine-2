const db = require('../config/database');
const logger = require('../utils/logger');


const createOrder = async (orderData) => {
    logger.info('[OrderService] Création d\'une nouvelle commande', {
        userId: orderData.user_id,
        planId: orderData.plan_id,
        amount: orderData.amount,
        status: orderData.status
    });

    try {
        const [result] = await db.execute(
            'INSERT INTO orders (user_id, plan_id, amount, status) VALUES (?, ?, ?, ?)',
            [orderData.user_id, orderData.plan_id, orderData.amount, orderData.status]
        );
        
        logger.debug('[OrderService] Commande créée avec succès', {
            orderId: result.insertId,
            affectedRows: result.affectedRows
        });
        
        const createdOrder = await findById(result.insertId);
        logger.info('[OrderService] Détails de la commande créée', { order: createdOrder });
        
        return createdOrder;
    } catch (error) {
        logger.error('[OrderService] Échec de la création de la commande', {
            error: error.message,
            stack: error.stack,
            orderData
        });
        throw new Error(`Échec de la création de la commande: ${error.message}`);
    }
}

const findById = async (orderId) => {
    logger.debug(`[OrderService] Recherche de la commande par ID: ${orderId}`);
    
    try {
        const [rows] = await db.execute(
            'SELECT * FROM orders WHERE id = ?',
            [orderId]
        );
        
        if (rows.length === 0) {
            logger.warn(`[OrderService] Commande non trouvée: ${orderId}`);
            return null;
        }
        
        logger.debug(`[OrderService] Commande trouvée: ${orderId}`, { order: rows[0] });
        return rows[0];
    } catch (error) {
        logger.error(`[OrderService] Erreur lors de la recherche de la commande ${orderId}`, {
            error: error.message,
            stack: error.stack
        });
        throw new Error(`Erreur lors de la récupération de la commande: ${error.message}`);
    }
}

const findAll = async (filters = {}) => {
    logger.debug('[OrderService] Récupération de toutes les commandes', { filters });
    
    try {
        let query = 'SELECT * FROM orders';
        const params = [];
        
        // Ajout des filtres optionnels
        const conditions = [];
        if (filters.userId) {
            conditions.push('user_id = ?');
            params.push(filters.userId);
        }
        if (filters.status) {
            conditions.push('status = ?');
            params.push(filters.status);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' ORDER BY created_at DESC';
        
        const [rows] = await db.execute(query, params);
        
        logger.debug(`[OrderService] ${rows.length} commandes récupérées`);
        return rows;
    } catch (error) {
        logger.error('[OrderService] Erreur lors de la récupération des commandes', {
            error: error.message,
            stack: error.stack,
            filters
        });
        throw new Error(`Erreur lors de la récupération de la liste des commandes: ${error.message}`);
    }
}

const updateOrder = async (orderId, orderData) => {
    logger.info(`[OrderService] Mise à jour de la commande ${orderId}`, {
        orderId,
        updateData: orderData
    });
    
    try {
        const [result] = await db.execute(
            'UPDATE orders SET user_id = COALESCE(?, user_id), plan_id = COALESCE(?, plan_id), ' +
            'amount = COALESCE(?, amount), status = COALESCE(?, status), updated_at = NOW() WHERE id = ?',
            [
                orderData.user_id,
                orderData.plan_id,
                orderData.amount,
                orderData.status,
                orderId
            ]
        );
        
        logger.debug('[OrderService] Résultat de la mise à jour', {
            orderId,
            affectedRows: result.affectedRows,
            changedRows: result.changedRows
        });
        
        if (result.affectedRows === 0) {
            const error = new Error(`Commande non trouvée: ${orderId}`);
            logger.warn(`[OrderService] ${error.message}`);
            throw error;
        }
        
        const updatedOrder = await findById(orderId);
        logger.info('[OrderService] Commande mise à jour avec succès', { order: updatedOrder });
        
        return updatedOrder;
    } catch (error) {
        logger.error(`[OrderService] Échec de la mise à jour de la commande ${orderId}`, {
            error: error.message,
            stack: error.stack,
            orderData
        });
        throw new Error(`Échec de la mise à jour de la commande: ${error.message}`);
    }
}

const deleteOrder = async (orderId) => {
    logger.info(`[OrderService] Suppression de la commande ${orderId}`);
    
    try {
        // Vérifier d'abord si la commande existe
        const order = await findById(orderId);
        if (!order) {
            const error = new Error(`Commande non trouvée: ${orderId}`);
            logger.warn(`[OrderService] ${error.message}`);
            throw error;
        }
        
        logger.debug('[OrderService] Tentative de suppression de la commande', {
            orderId,
            status: order.status,
            createdAt: order.created_at
        });
        
        const [result] = await db.execute('DELETE FROM orders WHERE id = ?', [orderId]);
        
        if (result.affectedRows === 0) {
            const error = new Error(`Aucune commande supprimée (ID: ${orderId})`);
            logger.warn(`[OrderService] ${error.message}`);
            throw error;
        }
        
        logger.info('[OrderService] Commande supprimée avec succès', {
            orderId,
            affectedRows: result.affectedRows
        });
        
        return true;
    } catch (error) {
        logger.error(`[OrderService] Échec de la suppression de la commande ${orderId}`, {
            error: error.message,
            code: error.code,
            stack: error.stack
        });
        
        // Gestion des erreurs spécifiques
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            const message = `Impossible de supprimer la commande ${orderId} car elle est liée à des paiements`;
            logger.warn(`[OrderService] ${message}`);
            throw new Error(message);
        }
        
        // Gestion des erreurs générales
        throw new Error(`Échec de la suppression de la commande: ${error.message}`);
    }
}

module.exports = {
    createOrder,
    findById,
    findAll,
    updateOrder,
    deleteOrder
};



