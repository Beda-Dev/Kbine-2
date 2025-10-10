const db = require('../config/database');
const logger = require('../utils/logger');

// Types de paiement valides
const PAYMENT_METHODS = ['wave', 'orange_money', 'mtn_money', 'moov_money'];

// Statuts de paiement valides
const PAYMENT_STATUS = ['pending', 'success', 'failed', 'refunded'];

/**
 * Valide les données de paiement
 */
const validatePaymentData = (paymentData) => {
    console.log('[PaymentService] validatePaymentData - Début de validation', {
        order_id: paymentData.order_id,
        amount: paymentData.amount,
        payment_method: paymentData.payment_method,
        payment_reference: paymentData.payment_reference
    });

    if (!paymentData.order_id || !Number.isInteger(paymentData.order_id)) {
        throw new Error('ID de commande invalide');
    }

    if (!paymentData.amount || isNaN(parseFloat(paymentData.amount)) || paymentData.amount <= 0) {
        throw new Error('Montant invalide');
    }

    if (!paymentData.payment_method || !PAYMENT_METHODS.includes(paymentData.payment_method)) {
        throw new Error(`Méthode de paiement invalide. Doit être l'un des suivants: ${PAYMENT_METHODS.join(', ')}`);
    }

    if (!paymentData.payment_reference) {
        throw new Error('Référence de paiement requise');
    }

    console.log('[PaymentService] validatePaymentData - Validation réussie');
};

/**
 * Crée un nouveau paiement
 */
const createPayment = async (paymentData) => {
    console.log('[PaymentService] createPayment - Début de création de paiement');

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Validation des données
        validatePaymentData(paymentData);

        // Vérifier si un paiement avec cette référence existe déjà
        const [existingPayment] = await connection.query(
            'SELECT id FROM payments WHERE payment_reference = ?',
            [paymentData.payment_reference]
        );

        if (existingPayment.length > 0) {
            throw new Error('Une transaction avec cette référence existe déjà');
        }

        // Vérifier si la commande existe
        const [orderResults] = await connection.query(
            'SELECT id, status FROM orders WHERE id = ?',
            [paymentData.order_id]
        );

        if (!orderResults || orderResults.length === 0) {
            throw new Error('Commande non trouvée');
        }

        // Création du paiement
        const payment = {
            order_id: paymentData.order_id,
            amount: paymentData.amount,
            payment_method: paymentData.payment_method,
            payment_reference: paymentData.payment_reference,
            external_reference: paymentData.external_reference || Date.now().toString(),
            status: 'pending',
            callback_data: paymentData.callback_data ? JSON.stringify(paymentData.callback_data) : null,
            created_at: new Date(),
            updated_at: new Date()
        };

        const [result] = await connection.query('INSERT INTO payments SET ?', [payment]);
        await connection.commit();

        logger.info(`Paiement créé avec succès - ID: ${result.insertId}`);

        return {
            id: result.insertId,
            ...payment,
            callback_data: payment.callback_data ? JSON.parse(payment.callback_data) : null
        };
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        logger.error('Erreur lors de la création du paiement', { error: error.message });
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Met à jour un paiement existant
 * 🔧 CORRECTION: Meilleure gestion de la connexion
 */
const updatePayment = async (id, updateData) => {
    console.log('[PaymentService] updatePayment - Début de mise à jour', { paymentId: id });

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Vérifier que le paiement existe
        const [payments] = await connection.query('SELECT * FROM payments WHERE id = ?', [id]);

        if (!payments || payments.length === 0) {
            throw new Error('Paiement non trouvé');
        }

        const payment = payments[0];

        // Valider le statut si fourni
        if (updateData.status && !PAYMENT_STATUS.includes(updateData.status)) {
            throw new Error(`Statut invalide: ${updateData.status}`);
        }

        // Préparer les données de mise à jour
        const fieldsToUpdate = {
            ...updateData,
            updated_at: new Date()
        };

        // Gérer callback_data
        if (fieldsToUpdate.callback_data && typeof fieldsToUpdate.callback_data === 'object') {
            fieldsToUpdate.callback_data = JSON.stringify(fieldsToUpdate.callback_data);
        }

        // Gérer status_notes (stocker dans callback_data)
        if (fieldsToUpdate.status_notes) {
            const notes = fieldsToUpdate.status_notes;
            delete fieldsToUpdate.status_notes;

            let callbackData = {};
            if (payment.callback_data) {
                try {
                    callbackData = JSON.parse(payment.callback_data);
                } catch (e) {
                    callbackData = {};
                }
            }
            callbackData.notes = notes;
            callbackData.last_update = new Date().toISOString();
            fieldsToUpdate.callback_data = JSON.stringify(callbackData);
        }

        // Construire la requête UPDATE
        const updateFields = Object.keys(fieldsToUpdate)
            .map(key => `${key} = ?`)
            .join(', ');
        const updateValues = Object.values(fieldsToUpdate);

        await connection.query(
            `UPDATE payments SET ${updateFields} WHERE id = ?`,
            [...updateValues, id]
        );

        // Récupérer le paiement mis à jour AVANT de libérer la connexion
        const [updatedPayments] = await connection.query('SELECT * FROM payments WHERE id = ?', [id]);

        await connection.commit();

        const updatedPayment = updatedPayments[0];

        // Parser callback_data
        if (updatedPayment.callback_data) {
            try {
                updatedPayment.callback_data = JSON.parse(updatedPayment.callback_data);
            } catch (e) {
                // Garder comme string si le parsing échoue
            }
        }

        logger.info(`Paiement mis à jour - ID: ${id}`);
        return updatedPayment;
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        logger.error('Erreur lors de la mise à jour du paiement', { error: error.message, paymentId: id });
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Supprime un paiement (soft delete)
 * 🔧 CORRECTION: Meilleure gestion des erreurs et de la connexion
 */
const deletePayment = async (id) => {
    // Validation de l'ID
    const paymentId = parseInt(id);
    if (!paymentId || isNaN(paymentId)) {
        throw new Error('ID de paiement invalide');
    }

    console.log('[PaymentService] deletePayment - Début de suppression', { paymentId });

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Vérifier que le paiement existe
        const [payments] = await connection.query('SELECT * FROM payments WHERE id = ?', [paymentId]);

        if (!payments || payments.length === 0) {
            throw new Error('Paiement non trouvé');
        }

        const payment = payments[0];

        // Vérifier si le paiement peut être supprimé
        if (payment.status === 'success') {
            throw new Error('Impossible de supprimer un paiement réussi. Veuillez effectuer un remboursement.');
        }

        // Préparer les données de callback
        let callbackData = {};
        if (payment.callback_data) {
            try {
                callbackData = typeof payment.callback_data === 'string'
                    ? JSON.parse(payment.callback_data)
                    : { ...payment.callback_data };
            } catch (e) {
                callbackData = {};
            }
        }

        // Mettre à jour les métadonnées de suppression
        const now = new Date();
        callbackData = {
            ...callbackData,
            deleted: true,
            deleted_at: now.toISOString(),
            notes: (callbackData.notes || '') + '\nPaiement annulé/supprimé le ' + now.toISOString()
        };

        // Soft delete: mettre à jour le statut
        const [result] = await connection.query(
            'UPDATE payments SET status = ?, callback_data = ?, updated_at = ? WHERE id = ?',
            ['failed', JSON.stringify(callbackData), now, paymentId]
        );

        if (result.affectedRows === 0) {
            throw new Error('Échec de la suppression du paiement');
        }

        await connection.commit();

        logger.info(`Paiement supprimé (soft delete) - ID: ${paymentId}`);
        return true;
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        logger.error('Erreur lors de la suppression du paiement', { error: error.message, paymentId });
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Récupère un paiement par son ID avec les relations
 */
const getPaymentById = async (id) => {
    console.log('[PaymentService] getPaymentById - Début de récupération', { paymentId: id });

    try {
        const [payments] = await db.query(
            `SELECT p.*,
                    o.id as order_id_full, o.user_id, o.plan_id, o.phone_number as order_phone_number,
                    o.amount as order_amount, o.status as order_status,
                    pl.name as plan_name, pl.price as plan_price,
                    op.name as operator_name,
                    u.phone_number as user_phone, u.role as user_role
             FROM payments p
             LEFT JOIN orders o ON p.order_id = o.id
             LEFT JOIN plans pl ON o.plan_id = pl.id
             LEFT JOIN operators op ON pl.operator_id = op.id
             LEFT JOIN users u ON o.user_id = u.id
             WHERE p.id = ?`,
            [id]
        );

        if (!payments || payments.length === 0) {
            throw new Error('Paiement non trouvé');
        }

        const payment = { ...payments[0] };

        // Parser callback_data
        if (payment.callback_data) {
            try {
                payment.callback_data = JSON.parse(payment.callback_data);
            } catch (e) {
                // Garder comme string
            }
        }

        // Ajouter les informations de la commande
        if (payment.order_id) {
            payment.order = {
                id: payment.order_id,
                user_id: payment.user_id,
                plan_id: payment.plan_id,
                phone_number: payment.order_phone_number,
                amount: payment.order_amount,
                status: payment.order_status
            };
        }

        // Supprimer les champs redondants
        ['order_id_full', 'user_id', 'plan_id', 'order_phone_number',
            'order_amount', 'order_status', 'plan_name', 'plan_price',
            'operator_name', 'user_phone', 'user_role'].forEach(field => delete payment[field]);

        return payment;
    } catch (error) {
        logger.error('Erreur lors de la récupération du paiement', { error: error.message, paymentId: id });
        throw error;
    }
};

/**
 * Récupère la liste des paiements avec pagination
 */
const getPayments = async ({
    page = 1,
    limit = 10,
    status,
    payment_method,
    start_date,
    end_date,
    order_id,
    user_id,
    plan_id
} = {}) => {
    try {
        const offset = (page - 1) * limit;
        const whereClauses = [];
        const params = [];

        if (status) {
            whereClauses.push('p.status = ?');
            params.push(status);
        }
        if (payment_method) {
            whereClauses.push('p.payment_method = ?');
            params.push(payment_method);
        }
        if (start_date) {
            whereClauses.push('p.created_at >= ?');
            params.push(new Date(start_date));
        }
        if (end_date) {
            whereClauses.push('p.created_at <= ?');
            params.push(new Date(end_date));
        }
        if (order_id) {
            whereClauses.push('p.order_id = ?');
            params.push(order_id);
        }
        if (user_id) {
            whereClauses.push('o.user_id = ?');
            params.push(user_id);
        }
        if (plan_id) {
            whereClauses.push('o.plan_id = ?');
            params.push(plan_id);
        }

        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const [payments] = await db.query(
            `SELECT p.*, o.status as order_status
             FROM payments p
             LEFT JOIN orders o ON p.order_id = o.id
             ${whereClause}
             ORDER BY p.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const [countResult] = await db.query(
            `SELECT COUNT(p.id) as total 
             FROM payments p
             LEFT JOIN orders o ON p.order_id = o.id
             ${whereClause}`,
            params
        );

        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);

        return {
            data: payments.map(p => {
                if (p.callback_data) {
                    try {
                        p.callback_data = JSON.parse(p.callback_data);
                    } catch (e) { }
                }
                return p;
            }),
            pagination: {
                total,
                total_pages: totalPages,
                current_page: page,
                per_page: limit,
                has_next_page: page < totalPages,
                has_previous_page: page > 1
            }
        };
    } catch (error) {
        logger.error('Erreur lors de la récupération des paiements', { error: error.message });
        throw error;
    }
};

/**
 * Met à jour le statut d'un paiement
 */
const updatePaymentStatus = async (id, status, notes = '') => {
    if (!PAYMENT_STATUS.includes(status)) {
        throw new Error(`Statut invalide. Doit être l'un des suivants: ${PAYMENT_STATUS.join(', ')}`);
    }

    const updateData = { status };
    if (notes) {
        updateData.status_notes = notes;
    }

    return updatePayment(id, updateData);
};

/**
 * Rembourse un paiement
 */
const refundPayment = async (id, reason) => {
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [payments] = await connection.query('SELECT * FROM payments WHERE id = ?', [id]);

        if (!payments || payments.length === 0) {
            throw new Error('Paiement non trouvé');
        }

        const payment = payments[0];

        if (payment.status !== 'success') {
            throw new Error('Seuls les paiements réussis peuvent être remboursés');
        }

        if (payment.status === 'refunded') {
            throw new Error('Ce paiement a déjà été remboursé');
        }

        let callbackData = {};
        if (payment.callback_data) {
            try {
                callbackData = JSON.parse(payment.callback_data);
            } catch (e) {
                callbackData = {};
            }
        }

        callbackData.refund_reason = reason;
        callbackData.refunded_at = new Date().toISOString();
        callbackData.notes = `Remboursement effectué. Raison: ${reason}`;

        await connection.query(
            'UPDATE payments SET status = ?, callback_data = ?, updated_at = ? WHERE id = ?',
            ['refunded', JSON.stringify(callbackData), new Date(), id]
        );

        await connection.commit();

        logger.info(`Paiement remboursé - ID: ${id}`, { reason });

        return await getPaymentById(id);
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        logger.error('Erreur lors du remboursement', { error: error.message, paymentId: id });
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Vérifie si un paiement est valide et complet
 */
const isPaymentComplete = async (orderId) => {
    try {
        const [payments] = await db.query(
            'SELECT status FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
            [orderId]
        );
        return payments.length > 0 && payments[0].status === 'success';
    } catch (error) {
        logger.error('Erreur lors de la vérification du statut de paiement', { error: error.message, orderId });
        throw error;
    }
};

module.exports = {
    createPayment,
    updatePayment,
    deletePayment,
    getPaymentById,
    getPayments,
    updatePaymentStatus,
    refundPayment,
    isPaymentComplete,
    PAYMENT_METHODS,
    PAYMENT_STATUS
};