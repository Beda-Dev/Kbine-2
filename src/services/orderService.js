const db = require('../config/database');
const logger = require('../utils/logger');

const createOrder = async (orderData) => {
    logger.info('[OrderService] Création d\'une nouvelle commande', {
        userId: orderData.user_id,
        planId: orderData.plan_id,
        phoneNumber: orderData.phone_number,
        amount: orderData.amount,
        paymentMethod: orderData.payment_method
    });

    try {
        // Définir le statut par défaut si non fourni
        const status = orderData.status || 'pending';

        // Définir payment_reference comme NULL si non fourni
        const paymentReference = orderData.payment_reference || null;

        const [result] = await db.execute(
            `INSERT INTO orders 
            (user_id, plan_id, phone_number, amount, status, payment_method, payment_reference) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                orderData.user_id,
                orderData.plan_id,
                orderData.phone_number,
                orderData.amount,
                status,
                orderData.payment_method,
                paymentReference
            ]
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
            code: error.code,
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
            `SELECT o.*, 
                    u.phone_number as user_phone, u.role as user_role, u.created_at as user_created_at, u.updated_at as user_updated_at,
                    p.name as plan_name, p.description as plan_description, p.price as plan_price, p.type as plan_type, 
                    p.validity_days as plan_validity_days, p.active as plan_active, p.created_at as plan_created_at,
                    op.name as operator_name, op.code as operator_code,
                    au.phone_number as assigned_phone, au.role as assigned_role, 
                    au.created_at as assigned_created, au.updated_at as assigned_updated
             FROM orders o
             LEFT JOIN users u ON o.user_id = u.id
             LEFT JOIN plans p ON o.plan_id = p.id
             LEFT JOIN operators op ON p.operator_id = op.id
             LEFT JOIN users au ON o.assigned_to = au.id
             WHERE o.id = ?`,
            [orderId]
        );

        if (rows.length === 0) {
            logger.warn(`[OrderService] Commande non trouvée: ${orderId}`);
            return null;
        }

        const order = rows[0];
        const result = { ...order };

        // Ajouter l'utilisateur associé
        if (order.user_id) {
            result.user = {
                id: order.user_id,
                phone_number: order.user_phone,
                role: order.user_role,
                created_at: order.user_created_at,
                updated_at: order.user_updated_at
            };
        }

        // Ajouter le plan associé
        if (order.plan_id) {
            result.plan = {
                id: order.plan_id,
                operator_id: order.operator_id,
                name: order.plan_name,
                description: order.plan_description,
                price: order.plan_price,
                type: order.plan_type,
                validity_days: order.plan_validity_days,
                active: order.plan_active,
                created_at: order.plan_created_at,
                operator_name: order.operator_name,
                operator_code: order.operator_code
            };
        }

        // Ajouter l'utilisateur assigné
        if (order.assigned_to) {
            result.assigned = {
                id: order.assigned_to,
                phone_number: order.assigned_phone,
                role: order.assigned_role,
                created_at: order.assigned_created,
                updated_at: order.assigned_updated
            };
        }

        // Supprimer les champs inutiles
        [
            'user_phone', 'user_role', 'user_created_at', 'user_updated_at',
            'plan_name', 'plan_description', 'plan_price', 'plan_type', 
            'plan_validity_days', 'plan_active', 'plan_created_at',
            'operator_name', 'operator_code',
            'assigned_phone', 'assigned_role', 'assigned_created', 'assigned_updated'
        ].forEach(field => delete result[field]);

        logger.debug(`[OrderService] Commande trouvée avec les relations: ${orderId}`, { order: result });
        return result;
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
        let query = `SELECT o.*, 
                    u.phone_number as user_phone, u.role as user_role, u.created_at as user_created_at, u.updated_at as user_updated_at,
                    p.name as plan_name, p.description as plan_description, p.price as plan_price, p.type as plan_type, 
                    p.validity_days as plan_validity_days, p.active as plan_active, p.created_at as plan_created_at,
                    op.name as operator_name, op.code as operator_code,
                    au.phone_number as assigned_phone, au.role as assigned_role, 
                    au.created_at as assigned_created, au.updated_at as assigned_updated
             FROM orders o
             LEFT JOIN users u ON o.user_id = u.id
             LEFT JOIN plans p ON o.plan_id = p.id
             LEFT JOIN operators op ON p.operator_id = op.id
             LEFT JOIN users au ON o.assigned_to = au.id`;
        
        const params = [];
        const conditions = [];

        // Ajout des filtres optionnels
        if (filters.userId) {
            conditions.push('o.user_id = ?');
            params.push(filters.userId);
        }
        if (filters.status) {
            conditions.push('o.status = ?');
            params.push(filters.status);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY o.created_at DESC';

        const [rows] = await db.execute(query, params);

        // Transformer les résultats pour inclure les objets imbriqués
        const orders = rows.map(order => {
            const result = { ...order };

            // Ajouter l'utilisateur associé
            if (order.user_id) {
                result.user = {
                    id: order.user_id,
                    phone_number: order.user_phone,
                    role: order.user_role,
                    created_at: order.user_created_at,
                    updated_at: order.user_updated_at
                };
            }

            // Ajouter le plan associé
            if (order.plan_id) {
                result.plan = {
                    id: order.plan_id,
                    operator_id: order.operator_id,
                    name: order.plan_name,
                    description: order.plan_description,
                    price: order.plan_price,
                    type: order.plan_type,
                    validity_days: order.plan_validity_days,
                    active: order.plan_active,
                    created_at: order.plan_created_at,
                    operator_name: order.operator_name,
                    operator_code: order.operator_code
                };
            }

            // Ajouter l'utilisateur assigné
            if (order.assigned_to) {
                result.assigned = {
                    id: order.assigned_to,
                    phone_number: order.assigned_phone,
                    role: order.assigned_role,
                    created_at: order.assigned_created,
                    updated_at: order.assigned_updated
                };
            }

            // Supprimer les champs inutiles
            [
                'user_phone', 'user_role', 'user_created_at', 'user_updated_at',
                'plan_name', 'plan_description', 'plan_price', 'plan_type', 
                'plan_validity_days', 'plan_active', 'plan_created_at',
                'operator_name', 'operator_code',
                'assigned_phone', 'assigned_role', 'assigned_created', 'assigned_updated'
            ].forEach(field => delete result[field]);

            return result;
        });

        logger.debug(`[OrderService] ${orders.length} commandes récupérées avec leurs relations`);
        return orders;
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
        // Construire dynamiquement la requête UPDATE
        const fields = [];
        const params = [];

        if (orderData.user_id !== undefined) {
            fields.push('user_id = ?');
            params.push(orderData.user_id);
        }
        if (orderData.plan_id !== undefined) {
            fields.push('plan_id = ?');
            params.push(orderData.plan_id);
        }
        if (orderData.phone_number !== undefined) {
            fields.push('phone_number = ?');
            params.push(orderData.phone_number);
        }
        if (orderData.amount !== undefined) {
            fields.push('amount = ?');
            params.push(orderData.amount);
        }
        if (orderData.status !== undefined) {
            fields.push('status = ?');
            params.push(orderData.status);
        }
        if (orderData.payment_method !== undefined) {
            fields.push('payment_method = ?');
            params.push(orderData.payment_method);
        }
        if (orderData.payment_reference !== undefined) {
            fields.push('payment_reference = ?');
            params.push(orderData.payment_reference);
        }
        if (orderData.assigned_to !== undefined) {
            fields.push('assigned_to = ?');
            params.push(orderData.assigned_to);
        }

        if (fields.length === 0) {
            throw new Error('Aucun champ à mettre à jour');
        }

        fields.push('updated_at = NOW()');
        params.push(orderId);

        const query = `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`;

        const [result] = await db.execute(query, params);

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
