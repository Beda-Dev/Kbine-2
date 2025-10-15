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
    console.log('[PaymentService] [validatePaymentData] Début de validation', {
        order_id: paymentData.order_id,
        amount: paymentData.amount,
        payment_method: paymentData.payment_method,
        payment_reference: paymentData.payment_reference
    });

    if (!paymentData.order_id || !Number.isInteger(paymentData.order_id)) {
        console.log('[PaymentService] [validatePaymentData] Erreur: ID de commande invalide');
        throw new Error('ID de commande invalide');
    }

    if (!paymentData.amount || isNaN(parseFloat(paymentData.amount)) || paymentData.amount <= 0) {
        console.log('[PaymentService] [validatePaymentData] Erreur: Montant invalide');
        throw new Error('Montant invalide');
    }

    if (!paymentData.payment_method || !PAYMENT_METHODS.includes(paymentData.payment_method)) {
        console.log('[PaymentService] [validatePaymentData] Erreur: Méthode de paiement invalide');
        throw new Error(`Méthode de paiement invalide. Doit être l'un des suivants: ${PAYMENT_METHODS.join(', ')}`);
    }

    if (!paymentData.payment_reference) {
        console.log('[PaymentService] [validatePaymentData] Erreur: Référence de paiement requise');
        throw new Error('Référence de paiement requise');
    }

    console.log('[PaymentService] [validatePaymentData] Validation réussie');
};

/**
 * Crée un nouveau paiement
 * ✅ CORRIGÉ POUR POSTGRESQL
 */
const createPayment = async (paymentData) => {
    console.log('[PaymentService] [createPayment] Début de création de paiement', { paymentData });

    let connection;
    try {
        console.log('[PaymentService] [createPayment] Obtention de connexion');
        connection = await db.getConnection();
        console.log('[PaymentService] [createPayment] Début de transaction');
        await connection.beginTransaction();

        // Validation des données
        console.log('[PaymentService] [createPayment] Validation des données');
        validatePaymentData(paymentData);

        // Vérifier si un paiement avec cette référence existe déjà
        console.log('[PaymentService] [createPayment] Vérification existence paiement');
        const [existingPayment] = await connection.query(
            'SELECT id FROM payments WHERE payment_reference = $1',
            [paymentData.payment_reference]
        );

        if (existingPayment.length > 0) {
            console.log('[PaymentService] [createPayment] Paiement existant trouvé', existingPayment);
            throw new Error('Une transaction avec cette référence existe déjà');
        }

        // Vérifier si la commande existe
        console.log('[PaymentService] [createPayment] Vérification existence commande');
        const [orderResults] = await connection.query(
            'SELECT id, status FROM orders WHERE id = $1',
            [paymentData.order_id]
        );

        if (!orderResults || orderResults.length === 0) {
            console.log('[PaymentService] [createPayment] Commande non trouvée', orderResults);
            throw new Error('Commande non trouvée');
        }

        // Préparation des données
        const now = new Date();
        const callbackData = paymentData.callback_data ? JSON.stringify(paymentData.callback_data) : null;
        console.log('[PaymentService] [createPayment] Préparation des données d insertion');

        // ✅ INSERTION POSTGRESQL CORRECTE
        console.log('[PaymentService] [createPayment] Exécution requête INSERT');
        const [result] = await connection.query(
            `INSERT INTO payments 
            (order_id, amount, payment_method, payment_phone, payment_reference, 
             external_reference, status, callback_data, created_at, updated_at) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *`,
            [
                paymentData.order_id,
                paymentData.amount,
                paymentData.payment_method,
                paymentData.payment_phone || null,
                paymentData.payment_reference,
                paymentData.external_reference || Date.now().toString(),
                'pending',
                callbackData,
                now,
                now
            ]
        );

        console.log('[PaymentService] [createPayment] Commit de la transaction');
        await connection.commit();

        // ✅ PostgreSQL retourne les données directement avec RETURNING
        const insertedPayment = result[0];
        console.log('[PaymentService] [createPayment] Paiement inséré avec succès', { paymentId: insertedPayment.id });

        logger.info(`Paiement créé avec succès - ID: ${insertedPayment.id}`);

        // Parser callback_data pour le retour
        if (insertedPayment.callback_data) {
            try {
                insertedPayment.callback_data = JSON.parse(insertedPayment.callback_data);
            } catch (e) {
                console.log('[PaymentService] [createPayment] Erreur parsing callback_data', e.message);
                // Garder comme string si parsing échoue
            }
        }

        console.log('[PaymentService] [createPayment] Retour du paiement créé');
        return insertedPayment;
    } catch (error) {
        console.log('[PaymentService] [createPayment] Erreur attrapée', { error: error.message, stack: error.stack });
        if (connection) {
            console.log('[PaymentService] [createPayment] Rollback de la transaction');
            await connection.rollback();
        }
        logger.error('Erreur lors de la création du paiement', { error: error.message });
        throw error;
    } finally {
        if (connection) {
            console.log('[PaymentService] [createPayment] Libération de la connexion');
            connection.release();
        }
    }
};

/**
 * Met à jour un paiement existant
 * ✅ CORRIGÉ POUR POSTGRESQL
 */
const updatePayment = async (id, updateData) => {
    console.log('[PaymentService] [updatePayment] Début de mise à jour', { paymentId: id, updateData });

    let connection;
    try {
        console.log('[PaymentService] [updatePayment] Obtention de connexion');
        connection = await db.getConnection();
        console.log('[PaymentService] [updatePayment] Début de transaction');
        await connection.beginTransaction();

        // Vérifier que le paiement existe
        console.log('[PaymentService] [updatePayment] Vérification existence paiement');
        const [payments] = await connection.query('SELECT * FROM payments WHERE id = $1', [id]);

        if (!payments || payments.length === 0) {
            console.log('[PaymentService] [updatePayment] Paiement non trouvé', { paymentId: id });
            throw new Error('Paiement non trouvé');
        }

        const payment = payments[0];
        console.log('[PaymentService] [updatePayment] Paiement trouvé', { paymentId: id, currentStatus: payment.status });

        // Valider le statut si fourni
        if (updateData.status && !PAYMENT_STATUS.includes(updateData.status)) {
            console.log('[PaymentService] [updatePayment] Statut invalide fourni', { status: updateData.status });
            throw new Error(`Statut invalide: ${updateData.status}`);
        }

        // Préparer les données de mise à jour
        const fieldsToUpdate = { ...updateData };
        console.log('[PaymentService] [updatePayment] Champs à mettre à jour', { fieldsToUpdate });

        // Gérer callback_data
        if (fieldsToUpdate.callback_data && typeof fieldsToUpdate.callback_data === 'object') {
            fieldsToUpdate.callback_data = JSON.stringify(fieldsToUpdate.callback_data);
        }

        // Gérer status_notes (stocker dans callback_data)
        if (fieldsToUpdate.status_notes) {
            const notes = fieldsToUpdate.status_notes;
            console.log('[PaymentService] [updatePayment] Gestion des notes de statut', { notes });
            delete fieldsToUpdate.status_notes;

            let callbackData = {};
            if (payment.callback_data) {
                try {
                    callbackData = JSON.parse(payment.callback_data);
                } catch (e) {
                    console.log('[PaymentService] [updatePayment] Erreur parsing callback_data existant', e.message);
                    callbackData = {};
                }
            }
            callbackData.notes = notes;
            callbackData.last_update = new Date().toISOString();
            fieldsToUpdate.callback_data = JSON.stringify(callbackData);
        }

        // ✅ CONSTRUCTION DYNAMIQUE DE LA REQUÊTE UPDATE POSTGRESQL
        const updateKeys = Object.keys(fieldsToUpdate);
        const updateValues = Object.values(fieldsToUpdate);
        console.log('[PaymentService] [updatePayment] Construction requête UPDATE', { updateKeys, updateValues });
        
        const setClause = updateKeys
            .map((key, index) => `${key} = $${index + 1}`)
            .join(', ');
        
        updateValues.push(new Date()); // updated_at
        updateValues.push(id); // WHERE id
        
        const paramCount = updateValues.length;
        console.log('[PaymentService] [updatePayment] Clause SET construite', { setClause, paramCount });

        console.log('[PaymentService] [updatePayment] Exécution requête UPDATE');
        await connection.query(
            `UPDATE payments 
             SET ${setClause}, updated_at = $${paramCount - 1}
             WHERE id = $${paramCount}`,
            updateValues
        );

        // Récupérer le paiement mis à jour
        console.log('[PaymentService] [updatePayment] Récupération paiement mis à jour');
        const [updatedPayments] = await connection.query('SELECT * FROM payments WHERE id = $1', [id]);

        console.log('[PaymentService] [updatePayment] Commit de la transaction');
        await connection.commit();

        const updatedPayment = updatedPayments[0];
        console.log('[PaymentService] [updatePayment] Paiement mis à jour avec succès', { paymentId: id });

        // Parser callback_data
        if (updatedPayment.callback_data) {
            try {
                updatedPayment.callback_data = JSON.parse(updatedPayment.callback_data);
            } catch (e) {
                console.log('[PaymentService] [updatePayment] Erreur parsing callback_data mis à jour', e.message);
                // Garder comme string si le parsing échoue
            }
        }

        logger.info(`Paiement mis à jour - ID: ${id}`);
        console.log('[PaymentService] [updatePayment] Retour du paiement mis à jour');
        return updatedPayment;
    } catch (error) {
        console.log('[PaymentService] [updatePayment] Erreur attrapée', { error: error.message, stack: error.stack, paymentId: id });
        if (connection) {
            console.log('[PaymentService] [updatePayment] Rollback de la transaction');
            await connection.rollback();
        }
        logger.error('Erreur lors de la mise à jour du paiement', { error: error.message, paymentId: id });
        throw error;
    } finally {
        if (connection) {
            console.log('[PaymentService] [updatePayment] Libération de la connexion');
            connection.release();
        }
    }
};

/**
 * Supprime un paiement (soft delete)
 * ✅ CORRIGÉ POUR POSTGRESQL
 */
const deletePayment = async (id) => {
    const paymentId = parseInt(id);
    console.log('[PaymentService] [deletePayment] Début de suppression', { paymentId, originalId: id });

    if (!paymentId || isNaN(paymentId)) {
        console.log('[PaymentService] [deletePayment] ID invalide', { paymentId });
        throw new Error('ID de paiement invalide');
    }

    console.log('[PaymentService] [deletePayment] ID validé');

    let connection;
    try {
        console.log('[PaymentService] [deletePayment] Obtention de connexion');
        connection = await db.getConnection();
        console.log('[PaymentService] [deletePayment] Début de transaction');
        await connection.beginTransaction();

        // Vérifier que le paiement existe
        console.log('[PaymentService] [deletePayment] Vérification existence paiement');
        const [payments] = await connection.query('SELECT * FROM payments WHERE id = $1', [paymentId]);

        if (!payments || payments.length === 0) {
            console.log('[PaymentService] [deletePayment] Paiement non trouvé', { paymentId });
            throw new Error('Paiement non trouvé');
        }

        const payment = payments[0];
        console.log('[PaymentService] [deletePayment] Paiement trouvé', { paymentId, status: payment.status });

        // Vérifier si le paiement peut être supprimé
        if (payment.status === 'success') {
            console.log('[PaymentService] [deletePayment] Impossible de supprimer paiement réussi');
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
                console.log('[PaymentService] [deletePayment] Erreur parsing callback_data', e.message);
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
        console.log('[PaymentService] [deletePayment] Métadonnées de suppression préparées');

        // ✅ Soft delete avec syntaxe PostgreSQL
        console.log('[PaymentService] [deletePayment] Exécution requête UPDATE pour soft delete');
        const [result] = await connection.query(
            'UPDATE payments SET status = $1, callback_data = $2, updated_at = $3 WHERE id = $4',
            ['failed', JSON.stringify(callbackData), now, paymentId]
        );

        if (result.rowCount === 0) {
            console.log('[PaymentService] [deletePayment] Échec de la suppression - aucune ligne affectée');
            throw new Error('Échec de la suppression du paiement');
        }

        console.log('[PaymentService] [deletePayment] Commit de la transaction');
        await connection.commit();

        logger.info(`Paiement supprimé (soft delete) - ID: ${paymentId}`);
        console.log('[PaymentService] [deletePayment] Suppression réussie');
        return true;
    } catch (error) {
        console.log('[PaymentService] [deletePayment] Erreur attrapée', { error: error.message, stack: error.stack, paymentId });
        if (connection) {
            console.log('[PaymentService] [deletePayment] Rollback de la transaction');
            await connection.rollback();
        }
        logger.error('Erreur lors de la suppression du paiement', { error: error.message, paymentId });
        throw error;
    } finally {
        if (connection) {
            console.log('[PaymentService] [deletePayment] Libération de la connexion');
            connection.release();
        }
    }
};

/**
 * Récupère un paiement par son ID avec les relations
 * ✅ CORRIGÉ POUR POSTGRESQL
 */
const getPaymentById = async (id) => {
    console.log('[PaymentService] [getPaymentById] Début de récupération', { paymentId: id });

    try {
        console.log('[PaymentService] [getPaymentById] Exécution requête SELECT');
        const [payments] = await db.query(
            `SELECT p.*,
                    o.id as order_id_full, o.user_id, o.plan_id,
                    o.amount as order_amount, o.status as order_status,
                    pl.name as plan_name, pl.price as plan_price,
                    op.name as operator_name,
                    u.phone_number as user_phone, u.role as user_role
             FROM payments p
             LEFT JOIN orders o ON p.order_id = o.id
             LEFT JOIN plans pl ON o.plan_id = pl.id
             LEFT JOIN operators op ON pl.operator_id = op.id
             LEFT JOIN users u ON o.user_id = u.id
             WHERE p.id = $1`,
            [id]
        );

        if (!payments || payments.length === 0) {
            console.log('[PaymentService] [getPaymentById] Paiement non trouvé', { paymentId: id });
            throw new Error('Paiement non trouvé');
        }

        const payment = { ...payments[0] };
        console.log('[PaymentService] [getPaymentById] Paiement récupéré', { paymentId: id, status: payment.status });

        // Parser callback_data
        if (payment.callback_data) {
            try {
                payment.callback_data = JSON.parse(payment.callback_data);
                console.log('[PaymentService] [getPaymentById] callback_data parsé avec succès');
            } catch (e) {
                console.log('[PaymentService] [getPaymentById] Erreur parsing callback_data', e.message);
                // Garder comme string
            }
        }

        // Ajouter les informations de la commande
        if (payment.order_id) {
            payment.order = {
                id: payment.order_id,
                user_id: payment.user_id,
                plan_id: payment.plan_id,
                amount: payment.order_amount,
                status: payment.order_status
            };
            console.log('[PaymentService] [getPaymentById] Informations commande ajoutées');
        }

        // Supprimer les champs redondants
        ['order_id_full', 'user_id', 'plan_id',
            'order_amount', 'order_status', 'plan_name', 'plan_price',
            'operator_name', 'user_phone', 'user_role'].forEach(field => delete payment[field]);
        console.log('[PaymentService] [getPaymentById] Champs redondants supprimés');

        console.log('[PaymentService] [getPaymentById] Retour du paiement');
        return payment;
    } catch (error) {
        console.log('[PaymentService] [getPaymentById] Erreur attrapée', { error: error.message, stack: error.stack, paymentId: id });
        logger.error('Erreur lors de la récupération du paiement', { error: error.message, paymentId: id });
        throw error;
    }
};

/**
 * Récupère la liste des paiements avec pagination
 * ✅ CORRIGÉ POUR POSTGRESQL
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
    console.log('[PaymentService] [getPayments] Début de récupération liste', {
        page, limit, status, payment_method, start_date, end_date, order_id, user_id, plan_id
    });

    try {
        const offset = (page - 1) * limit;
        const whereClauses = [];
        const params = [];
        let paramIndex = 1;

        if (status) {
            whereClauses.push(`p.status = $${paramIndex++}`);
            params.push(status);
        }
        if (payment_method) {
            whereClauses.push(`p.payment_method = $${paramIndex++}`);
            params.push(payment_method);
        }
        if (start_date) {
            whereClauses.push(`p.created_at >= $${paramIndex++}`);
            params.push(new Date(start_date));
        }
        if (end_date) {
            whereClauses.push(`p.created_at <= $${paramIndex++}`);
            params.push(new Date(end_date));
        }
        if (order_id) {
            whereClauses.push(`p.order_id = $${paramIndex++}`);
            params.push(order_id);
        }
        if (user_id) {
            whereClauses.push(`o.user_id = $${paramIndex++}`);
            params.push(user_id);
        }
        if (plan_id) {
            whereClauses.push(`o.plan_id = $${paramIndex++}`);
            params.push(plan_id);
        }

        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        console.log('[PaymentService] [getPayments] Clause WHERE construite', { whereClause, params });

        console.log('[PaymentService] [getPayments] Exécution requête SELECT paiements');
        const [payments] = await db.query(
            `SELECT p.*, o.status as order_status
             FROM payments p
             LEFT JOIN orders o ON p.order_id = o.id
             ${whereClause}
             ORDER BY p.created_at DESC
             LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
            [...params, limit, offset]
        );

        console.log('[PaymentService] [getPayments] Exécution requête COUNT');
        const [countResult] = await db.query(
            `SELECT COUNT(p.id) as total 
             FROM payments p
             LEFT JOIN orders o ON p.order_id = o.id
             ${whereClause}`,
            params
        );

        const total = parseInt(countResult[0].total);
        const totalPages = Math.ceil(total / limit);
        console.log('[PaymentService] [getPayments] Résultats calculés', { total, totalPages, currentPage: page });

        const result = {
            data: payments.map(p => {
                if (p.callback_data) {
                    try {
                        p.callback_data = JSON.parse(p.callback_data);
                    } catch (e) {
                        console.log('[PaymentService] [getPayments] Erreur parsing callback_data élément', e.message);
                    }
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

        console.log('[PaymentService] [getPayments] Retour des résultats');
        return result;
    } catch (error) {
        console.log('[PaymentService] [getPayments] Erreur attrapée', { error: error.message, stack: error.stack });
        logger.error('Erreur lors de la récupération des paiements', { error: error.message });
        throw error;
    }
};

/**
 * Met à jour le statut d'un paiement
 */
const updatePaymentStatus = async (id, status, notes = '') => {
    console.log('[PaymentService] [updatePaymentStatus] Début de mise à jour statut', { paymentId: id, status, notes });

    if (!PAYMENT_STATUS.includes(status)) {
        console.log('[PaymentService] [updatePaymentStatus] Statut invalide fourni', { status, validStatuses: PAYMENT_STATUS });
        throw new Error(`Statut invalide. Doit être l'un des suivants: ${PAYMENT_STATUS.join(', ')}`);
    }

    const updateData = { status };
    if (notes) {
        updateData.status_notes = notes;
        console.log('[PaymentService] [updatePaymentStatus] Notes ajoutées aux données de mise à jour');
    }

    console.log('[PaymentService] [updatePaymentStatus] Appel de updatePayment');
    return updatePayment(id, updateData);
};

/**
 * Rembourse un paiement
 * ✅ CORRIGÉ POUR POSTGRESQL
 */
const refundPayment = async (id, reason) => {
    console.log('[PaymentService] [refundPayment] Début de remboursement', { paymentId: id, reason });

    let connection;
    try {
        console.log('[PaymentService] [refundPayment] Obtention de connexion');
        connection = await db.getConnection();
        console.log('[PaymentService] [refundPayment] Début de transaction');
        await connection.beginTransaction();

        console.log('[PaymentService] [refundPayment] Vérification existence paiement');
        const [payments] = await connection.query('SELECT * FROM payments WHERE id = $1', [id]);

        if (!payments || payments.length === 0) {
            console.log('[PaymentService] [refundPayment] Paiement non trouvé', { paymentId: id });
            throw new Error('Paiement non trouvé');
        }

        const payment = payments[0];
        console.log('[PaymentService] [refundPayment] Paiement trouvé', { paymentId: id, status: payment.status });

        if (payment.status !== 'success') {
            console.log('[PaymentService] [refundPayment] Impossible de rembourser - statut incorrect', { status: payment.status });
            throw new Error('Seuls les paiements réussis peuvent être remboursés');
        }

        if (payment.status === 'refunded') {
            console.log('[PaymentService] [refundPayment] Paiement déjà remboursé', { paymentId: id });
            throw new Error('Ce paiement a déjà été remboursé');
        }

        let callbackData = {};
        if (payment.callback_data) {
            try {
                callbackData = JSON.parse(payment.callback_data);
                console.log('[PaymentService] [refundPayment] callback_data parsé avec succès');
            } catch (e) {
                console.log('[PaymentService] [refundPayment] Erreur parsing callback_data', e.message);
                callbackData = {};
            }
        }

        callbackData.refund_reason = reason;
        callbackData.refunded_at = new Date().toISOString();
        callbackData.notes = `Remboursement effectué. Raison: ${reason}`;
        console.log('[PaymentService] [refundPayment] Métadonnées de remboursement préparées');

        console.log('[PaymentService] [refundPayment] Exécution requête UPDATE pour remboursement');
        await connection.query(
            'UPDATE payments SET status = $1, callback_data = $2, updated_at = $3 WHERE id = $4',
            ['refunded', JSON.stringify(callbackData), new Date(), id]
        );

        console.log('[PaymentService] [refundPayment] Commit de la transaction');
        await connection.commit();

        logger.info(`Paiement remboursé - ID: ${id}`, { reason });
        console.log('[PaymentService] [refundPayment] Remboursement réussi, appel de getPaymentById');

        return await getPaymentById(id);
    } catch (error) {
        console.log('[PaymentService] [refundPayment] Erreur attrapée', { error: error.message, stack: error.stack, paymentId: id });
        if (connection) {
            console.log('[PaymentService] [refundPayment] Rollback de la transaction');
            await connection.rollback();
        }
        logger.error('Erreur lors du remboursement', { error: error.message, paymentId: id });
        throw error;
    } finally {
        if (connection) {
            console.log('[PaymentService] [refundPayment] Libération de la connexion');
            connection.release();
        }
    }
};

/**
 * Vérifie si un paiement est valide et complet
 */
const isPaymentComplete = async (orderId) => {
    console.log('[PaymentService] [isPaymentComplete] Début de vérification', { orderId });

    try {
        console.log('[PaymentService] [isPaymentComplete] Exécution requête SELECT');
        const [payments] = await db.query(
            'SELECT status FROM payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1',
            [orderId]
        );

        const isComplete = payments.length > 0 && payments[0].status === 'success';
        console.log('[PaymentService] [isPaymentComplete] Résultat vérification', {
            orderId,
            paymentCount: payments.length,
            paymentStatus: payments.length > 0 ? payments[0].status : 'none',
            isComplete
        });

        return isComplete;
    } catch (error) {
        console.log('[PaymentService] [isPaymentComplete] Erreur attrapée', { error: error.message, stack: error.stack, orderId });
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