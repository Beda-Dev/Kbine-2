const db = require('../config/database');
const logger = require('../utils/logger');

const createOrder = async (orderData) => {
    console.log('[OrderService] [createOrder] Début de création de commande', { orderData });
    logger.info('[OrderService] Création d\'une nouvelle commande', {
        userId: orderData.user_id,
        planId: orderData.plan_id,
        amount: orderData.amount
    });

    try {
        // Définir le statut par défaut si non fourni
        const status = orderData.status || 'pending';
        console.log('[OrderService] [createOrder] Statut défini', { status });

        console.log('[OrderService] [createOrder] Exécution requête INSERT');
        
        // CORRECTION : Utiliser la syntaxe PostgreSQL correcte
        const query = `
            INSERT INTO orders 
            (user_id, plan_id, amount, status, assigned_to, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            RETURNING id
        `;
        
        const params = [
            orderData.user_id,
            orderData.plan_id,
            orderData.amount,
            status,
            orderData.assigned_to || null
        ];

        console.log('[OrderService] [createOrder] Exécution requête INSERT avec params', { query, params });
        const result = await db.execute(query, params);

        console.log('[OrderService] [createOrder] Résultat de la requête INSERT', {
            result: result,
            hasRows: result[0] && result[0].length > 0,
            rowCount: result[0] ? result[0].length : 'no rows',
            firstRow: result[0] && result[0][0] ? result[0][0] : 'no first row'
        });

        // CORRECTION : Récupérer l'ID correctement depuis le résultat PostgreSQL
        const insertId = result[0] && result[0][0] ? result[0][0].id : null;
        console.log('[OrderService] [createOrder] ID généré récupéré', { insertId });
        
        if (!insertId) {
            throw new Error('Échec de la récupération de l\'ID de la commande créée');
        }

        logger.debug('[OrderService] Commande créée avec succès', {
            orderId: insertId
        });

        console.log('[OrderService] [createOrder] Récupération des détails de la commande créée');
        const createdOrder = await findById(insertId);
        
        if (!createdOrder) {
            throw new Error('La commande a été créée mais n\'a pas pu être récupérée');
        }
        
        logger.info('[OrderService] Détails de la commande créée', { order: createdOrder });

        console.log('[OrderService] [createOrder] Retour de la commande créée');
        return createdOrder;
    } catch (error) {
        console.log('[OrderService] [createOrder] Erreur attrapée', {
            error: error.message,
            code: error.code,
            stack: error.stack,
            orderData
        });
        logger.error('[OrderService] Échec de la création de la commande', {
            error: error.message,
            code: error.code,
            orderData: {
                user_id: orderData.user_id,
                plan_id: orderData.plan_id,
                amount: orderData.amount
            }
        });
        throw new Error(`Échec de la création de la commande: ${error.message}`);
    }
};

const findById = async (orderId) => {
    console.log('[OrderService] [findById] Début de recherche', { orderId });
    logger.debug(`[OrderService] Recherche de la commande par ID: ${orderId}`);

    try {
        console.log('[OrderService] [findById] Exécution requête SELECT');
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

        console.log('[OrderService] [findById] Résultats obtenus', { rowCount: rows.length });

        if (rows.length === 0) {
            console.log('[OrderService] [findById] Commande non trouvée', { orderId });
            logger.warn(`[OrderService] Commande non trouvée: ${orderId}`);
            return null;
        }

        const order = rows[0];
        console.log('[OrderService] [findById] Commande trouvée', { orderId, status: order.status });
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
            console.log('[OrderService] [findById] Utilisateur associé ajouté');
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
                created_at: order.plan_created_at
                // operator_name: order.operator_name,
                // operator_code: order.operator_code
            };
            console.log('[OrderService] [findById] Plan associé ajouté');
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
            console.log('[OrderService] [findById] Utilisateur assigné ajouté');
        }

        // Supprimer les champs inutiles
        [
            'user_phone', 'user_role', 'user_created_at', 'user_updated_at',
            'plan_name', 'plan_description', 'plan_price', 'plan_type',
            'plan_validity_days', 'plan_active', 'plan_created_at',
            'operator_name', 'operator_code',
            'assigned_phone', 'assigned_role', 'assigned_created', 'assigned_updated'
        ].forEach(field => delete result[field]);
        console.log('[OrderService] [findById] Champs redondants supprimés');

        logger.debug(`[OrderService] Commande trouvée avec les relations: ${orderId}`, { order: result });
        console.log('[OrderService] [findById] Retour de la commande');
        return result;
    } catch (error) {
        console.log('[OrderService] [findById] Erreur attrapée', {
            error: error.message,
            stack: error.stack,
            orderId
        });
        logger.error(`[OrderService] Erreur lors de la recherche de la commande ${orderId}`, {
            error: error.message,
            stack: error.stack
        });
        throw new Error(`Erreur lors de la récupération de la commande: ${error.message}`);
    }
};

const findAll = async (filters = {}) => {
    console.log('[OrderService] [findAll] Début de récupération liste', { filters });
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

        console.log('[OrderService] [findAll] Requête construite', { query, params });
        const [rows] = await db.execute(query, params);
        console.log('[OrderService] [findAll] Résultats obtenus', { rowCount: rows.length });

        // Transformer les résultats pour inclure les objets imbriqués
        const orders = rows.map(order => {
            console.log('[OrderService] [findAll] Traitement commande', { orderId: order.id });
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

        console.log('[OrderService] [findAll] Transformation terminée', { orderCount: orders.length });
        logger.debug(`[OrderService] ${orders.length} commandes récupérées avec leurs relations`);
        console.log('[OrderService] [findAll] Retour des commandes');
        return orders;
    } catch (error) {
        console.log('[OrderService] [findAll] Erreur attrapée', {
            error: error.message,
            stack: error.stack,
            filters
        });
        logger.error('[OrderService] Erreur lors de la récupération des commandes', {
            error: error.message,
            stack: error.stack,
            filters
        });
        throw new Error(`Erreur lors de la récupération de la liste des commandes: ${error.message}`);
    }
};

const updateOrder = async (orderId, orderData) => {
    console.log('[OrderService] [updateOrder] Début de mise à jour', { orderId, orderData });
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
            console.log('[OrderService] [updateOrder] Ajout user_id à la mise à jour');
        }
        if (orderData.plan_id !== undefined) {
            fields.push('plan_id = ?');
            params.push(orderData.plan_id);
            console.log('[OrderService] [updateOrder] Ajout plan_id à la mise à jour');
        }
        if (orderData.phone_number !== undefined) {
            fields.push('phone_number = ?');
            params.push(orderData.phone_number);
            console.log('[OrderService] [updateOrder] Ajout phone_number à la mise à jour');
        }
        if (orderData.amount !== undefined) {
            fields.push('amount = ?');
            params.push(orderData.amount);
            console.log('[OrderService] [updateOrder] Ajout amount à la mise à jour');
        }
        if (orderData.status !== undefined) {
            fields.push('status = ?');
            params.push(orderData.status);
            console.log('[OrderService] [updateOrder] Ajout status à la mise à jour');
        }
        if (orderData.payment_method !== undefined) {
            fields.push('payment_method = ?');
            params.push(orderData.payment_method);
            console.log('[OrderService] [updateOrder] Ajout payment_method à la mise à jour');
        }
        if (orderData.payment_reference !== undefined) {
            fields.push('payment_reference = ?');
            params.push(orderData.payment_reference);
            console.log('[OrderService] [updateOrder] Ajout payment_reference à la mise à jour');
        }
        if (orderData.assigned_to !== undefined) {
            fields.push('assigned_to = ?');
            params.push(orderData.assigned_to);
            console.log('[OrderService] [updateOrder] Ajout assigned_to à la mise à jour');
        }

        if (fields.length === 0) {
            console.log('[OrderService] [updateOrder] Aucun champ à mettre à jour');
            throw new Error('Aucun champ à mettre à jour');
        }

        fields.push('updated_at = NOW()');
        params.push(orderId);

        const query = `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`;
        console.log('[OrderService] [updateOrder] Requête UPDATE construite', { query, params });

        console.log('[OrderService] [updateOrder] Exécution requête UPDATE');
        const [result] = await db.execute(query, params);

        console.log('[OrderService] [updateOrder] Résultat de la mise à jour', {
            orderId,
            affectedRows: result.affectedRows,
            changedRows: result.changedRows
        });
        logger.debug('[OrderService] Résultat de la mise à jour', {
            orderId,
            affectedRows: result.affectedRows,
            changedRows: result.changedRows
        });

        if (result.affectedRows === 0) {
            const error = new Error(`Commande non trouvée: ${orderId}`);
            console.log('[OrderService] [updateOrder] Commande non trouvée', { orderId });
            logger.warn(`[OrderService] ${error.message}`);
            throw error;
        }

        console.log('[OrderService] [updateOrder] Récupération commande mise à jour');
        const updatedOrder = await findById(orderId);
        logger.info('[OrderService] Commande mise à jour avec succès', { order: updatedOrder });

        console.log('[OrderService] [updateOrder] Retour de la commande mise à jour');
        return updatedOrder;
    } catch (error) {
        console.log('[OrderService] [updateOrder] Erreur attrapée', {
            error: error.message,
            stack: error.stack,
            orderId,
            orderData
        });
        logger.error(`[OrderService] Échec de la mise à jour de la commande ${orderId}`, {
            error: error.message,
            stack: error.stack,
            orderData
        });
        throw new Error(`Échec de la mise à jour de la commande: ${error.message}`);
    }
};

const deleteOrder = async (orderId) => {
    console.log('[OrderService] [deleteOrder] Début de suppression', { orderId });
    logger.info(`[OrderService] Suppression de la commande ${orderId}`);

    try {
        // Vérifier d'abord si la commande existe
        console.log('[OrderService] [deleteOrder] Vérification existence commande');
        const order = await findById(orderId);
        if (!order) {
            const error = new Error(`Commande non trouvée: ${orderId}`);
            console.log('[OrderService] [deleteOrder] Commande non trouvée', { orderId });
            logger.warn(`[OrderService] ${error.message}`);
            throw error;
        }

        console.log('[OrderService] [deleteOrder] Commande trouvée, détails avant suppression', {
            orderId,
            status: order.status,
            createdAt: order.created_at
        });
        logger.debug('[OrderService] Tentative de suppression de la commande', {
            orderId,
            status: order.status,
            createdAt: order.created_at
        });

        console.log('[OrderService] [deleteOrder] Exécution requête DELETE');
        const [result] = await db.execute('DELETE FROM orders WHERE id = ?', [orderId]);

        if (result.affectedRows === 0) {
            const error = new Error(`Aucune commande supprimée (ID: ${orderId})`);
            console.log('[OrderService] [deleteOrder] Aucune ligne supprimée', { orderId });
            logger.warn(`[OrderService] ${error.message}`);
            throw error;
        }

        console.log('[OrderService] [deleteOrder] Suppression réussie', {
            orderId,
            affectedRows: result.affectedRows
        });
        logger.info('[OrderService] Commande supprimée avec succès', {
            orderId,
            affectedRows: result.affectedRows
        });

        console.log('[OrderService] [deleteOrder] Retour du résultat');
        return true;
    } catch (error) {
        console.log('[OrderService] [deleteOrder] Erreur attrapée', {
            error: error.message,
            code: error.code,
            stack: error.stack,
            orderId
        });
        logger.error(`[OrderService] Échec de la suppression de la commande ${orderId}`, {
            error: error.message,
            code: error.code,
            stack: error.stack
        });

        // Gestion des erreurs spécifiques
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            const message = `Impossible de supprimer la commande ${orderId} car elle est liée à des paiements`;
            console.log('[OrderService] [deleteOrder] Erreur de contrainte de clé étrangère', { orderId });
            logger.warn(`[OrderService] ${message}`);
            throw new Error(message);
        }

        // Gestion des erreurs générales
        throw new Error(`Échec de la suppression de la commande: ${error.message}`);
    }
};

module.exports = {
    createOrder,
    findById,
    findAll,
    updateOrder,
    deleteOrder
};
