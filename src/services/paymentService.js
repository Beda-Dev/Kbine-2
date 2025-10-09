const db = require('../config/database');
const logger = require('../utils/logger');

// Types de paiement valides
const PAYMENT_METHODS = ['wave', 'orange_money', 'mtn_money', 'moov_money'];

// Statuts de paiement valides
const PAYMENT_STATUS = ['pending', 'success', 'failed', 'refunded'];

/**
 * Valide les données de paiement
 * @param {Object} paymentData - Données du paiement à valider
 * @throws {Error} Si la validation échoue
 */
const validatePaymentData = (paymentData) => {
    console.log('[PaymentService] validatePaymentData - Début de validation', {
        order_id: paymentData.order_id,
        amount: paymentData.amount,
        payment_method: paymentData.payment_method,
        payment_reference: paymentData.payment_reference
    });

    if (!paymentData.order_id || !Number.isInteger(paymentData.order_id)) {
        console.log('[PaymentService] validatePaymentData - ID de commande invalide', { order_id: paymentData.order_id });
        throw new Error('ID de commande invalide');
    }

    if (!paymentData.amount || isNaN(parseFloat(paymentData.amount)) || paymentData.amount <= 0) {
        console.log('[PaymentService] validatePaymentData - Montant invalide', { amount: paymentData.amount });
        throw new Error('Montant invalide');
    }

    if (!paymentData.payment_method || !PAYMENT_METHODS.includes(paymentData.payment_method)) {
        console.log('[PaymentService] validatePaymentData - Méthode de paiement invalide', { payment_method: paymentData.payment_method });
        throw new Error(`Méthode de paiement invalide. Doit être l'un des suivants: ${PAYMENT_METHODS.join(', ')}`);
    }

    if (!paymentData.payment_reference) {
        console.log('[PaymentService] validatePaymentData - Référence de paiement manquante');
        throw new Error('Référence de paiement requise');
    }

    console.log('[PaymentService] validatePaymentData - Validation réussie');
};

/**
 * Crée un nouveau paiement
 * @param {Object} paymentData - Données du paiement
 * @returns {Promise<Object>} Le paiement créé
 */
const createPayment = async (paymentData) => {
    console.log('[PaymentService] createPayment - Début de création de paiement', {
        order_id: paymentData.order_id,
        amount: paymentData.amount,
        payment_method: paymentData.payment_method,
        payment_reference: paymentData.payment_reference
    });

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        console.log('[PaymentService] createPayment - Transaction démarrée');

        // Validation des données
        validatePaymentData(paymentData);
        console.log('[PaymentService] createPayment - Données validées');

        // Vérifier si un paiement avec cette référence existe déjà
        const [existingPayment] = await connection.query(
            'SELECT id FROM payments WHERE payment_reference = ?',
            [paymentData.payment_reference]
        );
        console.log('[PaymentService] createPayment - Vérification référence existante', { count: existingPayment.length });

        if (existingPayment.length > 0) {
            console.log('[PaymentService] createPayment - Paiement avec référence existante trouvé');
            throw new Error('Une transaction avec cette référence existe déjà');
        }

        // Vérifier si la commande existe - CORRECTION ICI
        const [order] = await connection.query(
            'SELECT id, status FROM orders WHERE id = ?',
            [paymentData.order_id]
        );

        console.log('[PaymentService] createPayment - Vérification commande', { orderFound: order.length > 0 });

        if (!order || order.length === 0) {
            console.log('[PaymentService] createPayment - Commande non trouvée');
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
        console.log('[PaymentService] createPayment - Objet paiement créé', {
            order_id: payment.order_id,
            amount: payment.amount,
            payment_method: payment.payment_method
        });

        const [result] = await connection.query('INSERT INTO payments SET ?', [payment]);
        console.log('[PaymentService] createPayment - Paiement inséré en DB', { insertId: result.insertId });

        await connection.commit();
        console.log('[PaymentService] createPayment - Transaction validée');

        logger.info(`Paiement créé avec succès - ID: ${result.insertId}`, { paymentId: result.insertId });

        return {
            id: result.insertId,
            ...payment,
            callback_data: payment.callback_data ? JSON.parse(payment.callback_data) : null
        };
    } catch (error) {
        console.log('[PaymentService] createPayment - Erreur lors de la création', { error: error.message });
        await connection.rollback();
        logger.error('Erreur lors de la création du paiement', { error: error.message, paymentData });
        throw error;
    } finally {
        connection.release();
        console.log('[PaymentService] createPayment - Connexion libérée');
    }
};

/**
 * Met à jour un paiement existant
 * @param {number} id - ID du paiement à mettre à jour
 * @param {Object} updateData - Données à mettre à jour
 * @returns {Promise<Object>} Le paiement mis à jour
 */
const updatePayment = async (id, updateData) => {
    console.log('[PaymentService] updatePayment - Début de mise à jour', { paymentId: id, updateData });

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        console.log('[PaymentService] updatePayment - Transaction démarrée');

        // Vérifier que le paiement existe
        const [payments] = await connection.query('SELECT * FROM payments WHERE id = ?', [id]);
        console.log('[PaymentService] updatePayment - Recherche paiement', { found: payments.length > 0 });

        if (!payments || payments.length === 0) {
            console.log('[PaymentService] updatePayment - Paiement non trouvé');
            throw new Error('Paiement non trouvé');
        }

        const payment = payments[0];
        console.log('[PaymentService] updatePayment - Paiement trouvé', { status: payment.status });

        // Valider le statut si fourni
        if (updateData.status) {
            console.log('[PaymentService] updatePayment - Validation du statut', { status: updateData.status });
            if (!PAYMENT_STATUS.includes(updateData.status)) {
                console.log('[PaymentService] updatePayment - Statut invalide', { status: updateData.status });
                throw new Error(`Statut invalide: ${updateData.status}`);
            }
        }

        // Préparer les données de mise à jour
        const fieldsToUpdate = {
            ...updateData,
            updated_at: new Date()
        };
        console.log('[PaymentService] updatePayment - Champs à mettre à jour', { fields: Object.keys(fieldsToUpdate) });

        // Gérer callback_data si présent
        if (fieldsToUpdate.callback_data && typeof fieldsToUpdate.callback_data === 'object') {
            console.log('[PaymentService] updatePayment - Sérialisation callback_data');
            fieldsToUpdate.callback_data = JSON.stringify(fieldsToUpdate.callback_data);
        }

        // Retirer status_notes si présent (colonne n'existe pas dans la DB)
        // On va stocker les notes dans callback_data à la place
        if (fieldsToUpdate.status_notes) {
            console.log('[PaymentService] updatePayment - Traitement status_notes');
            const notes = fieldsToUpdate.status_notes;
            delete fieldsToUpdate.status_notes;

            // Ajouter les notes dans callback_data
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

        // Construire la requête UPDATE dynamiquement
        const updateFields = Object.keys(fieldsToUpdate)
            .map(key => `${key} = ?`)
            .join(', ');
        const updateValues = Object.values(fieldsToUpdate);
        console.log('[PaymentService] updatePayment - Requête UPDATE construite', { updateFields, updateValues: updateValues.length });

        await connection.query(
            `UPDATE payments SET ${updateFields} WHERE id = ?`,
            [...updateValues, id]
        );
        console.log('[PaymentService] updatePayment - Mise à jour exécutée');

        // Récupérer AVANT de libérer
        const [updatedPayments] = await connection.query('SELECT * FROM payments WHERE id = ?', [id]);
        console.log('[PaymentService] updatePayment - Paiement récupéré après mise à jour');
        await connection.commit();
        console.log('[PaymentService] updatePayment - Transaction validée');

        const updatedPayment = updatedPayments[0];

        // Parser callback_data si présent
        if (updatedPayment.callback_data) {
            try {
                updatedPayment.callback_data = JSON.parse(updatedPayment.callback_data);
            } catch (e) {
                // Garder comme string si le parsing échoue
            }
        }

        return updatedPayment;
    } catch (error) {
        console.log('[PaymentService] updatePayment - Erreur lors de la mise à jour', { error: error.message });
        await connection.rollback();
        logger.error('Erreur lors de la mise à jour du paiement', {
            error: error.message,
            paymentId: id,
            updates: updateData
        });
        throw error;
    } finally {
        connection.release();
        console.log('[PaymentService] updatePayment - Connexion libérée');
    }
};

/**
 * Supprime un paiement (soft delete)
 * @param {number} id - ID du paiement à supprimer
 * @returns {Promise<boolean>} True si la suppression a réussi
 */
const deletePayment = async (id) => {
    console.log('[PaymentService] deletePayment - Début de suppression', { paymentId: id });

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        console.log('[PaymentService] deletePayment - Transaction démarrée');

        // Vérifier que le paiement existe
        const [payments] = await connection.query('SELECT * FROM payments WHERE id = ?', [id]);
        console.log('[PaymentService] deletePayment - Recherche paiement', { found: payments.length > 0 });

        if (!payments || payments.length === 0) {
            console.log('[PaymentService] deletePayment - Paiement non trouvé');
            throw new Error('Paiement non trouvé');
        }

        const payment = payments[0];
        console.log('[PaymentService] deletePayment - Paiement trouvé', { status: payment.status });

        // Vérifier si le paiement peut être supprimé
        if (payment.status === 'success') {
            console.log('[PaymentService] deletePayment - Impossible de supprimer un paiement réussi');
            throw new Error('Impossible de supprimer un paiement réussi. Veuillez effectuer un remboursement.');
        }

        // Soft delete en changeant le statut à 'failed'
        // Stocker l'info de suppression dans callback_data
        let callbackData = {};
        if (payment.callback_data) {
            try {
                callbackData = JSON.parse(payment.callback_data);
            } catch (e) {
                callbackData = {};
            }
        }
        callbackData.deleted = true;
        callbackData.deleted_at = new Date().toISOString();
        callbackData.notes = 'Paiement annulé/supprimé';
        console.log('[PaymentService] deletePayment - Préparation du soft delete');

        await connection.query(
            'UPDATE payments SET status = ?, callback_data = ?, updated_at = ? WHERE id = ?',
            ['failed', JSON.stringify(callbackData), new Date(), id]
        );
        console.log('[PaymentService] deletePayment - Soft delete exécuté');

        await connection.commit();
        console.log('[PaymentService] deletePayment - Transaction validée');

        logger.info(`Paiement supprimé (soft delete) - ID: ${id}`);

        return true;
    } catch (error) {
        console.log('[PaymentService] deletePayment - Erreur lors de la suppression', { error: error.message });
        await connection.rollback();
        logger.error('Erreur lors de la suppression du paiement', {
            error: error.message,
            paymentId: id
        });
        throw error;
    } finally {
        connection.release();
        console.log('[PaymentService] deletePayment - Connexion libérée');
    }
};

/**
* Récupère un paiement par son ID avec les relations
* @param {number} id - ID du paiement
* @returns {Promise<Object>} Le paiement trouvé avec les relations
*/
const getPaymentById = async (id) => {
    console.log('[PaymentService] getPaymentById - Début de récupération', { paymentId: id });

    try {
        const [payments] = await db.query(
            `SELECT p.*,
                    o.id as order_id_full, o.user_id, o.plan_id, o.phone_number as order_phone_number,
                    o.amount as order_amount, o.status as order_status, o.payment_method as order_payment_method,
                    o.payment_reference as order_payment_reference, o.created_at as order_created_at,
                    o.updated_at as order_updated_at,
                    pl.name as plan_name, pl.description as plan_description, pl.price as plan_price,
                    pl.type as plan_type, pl.validity_days as plan_validity_days, pl.active as plan_active,
                    pl.operator_id as plan_operator_id,
                    op.name as operator_name, op.code as operator_code,
                    u.phone_number as user_phone, u.role as user_role, u.created_at as user_created_at
             FROM payments p
             LEFT JOIN orders o ON p.order_id = o.id
             LEFT JOIN plans pl ON o.plan_id = pl.id
             LEFT JOIN operators op ON pl.operator_id = op.id
             LEFT JOIN users u ON o.user_id = u.id
             WHERE p.id = ?`,
            [id]
        );
        console.log('[PaymentService] getPaymentById - Requête exécutée', { resultsCount: payments.length });

        if (!payments || payments.length === 0) {
            console.log('[PaymentService] getPaymentById - Paiement non trouvé');
            throw new Error('Paiement non trouvé');
        }

        const payment = { ...payments[0] };
        console.log('[PaymentService] getPaymentById - Paiement trouvé', { status: payment.status });

        // Parser callback_data si présent
        if (payment.callback_data) {
            try {
                payment.callback_data = JSON.parse(payment.callback_data);
                console.log('[PaymentService] getPaymentById - Callback data parsé');
            } catch (e) {
                console.log('[PaymentService] getPaymentById - Erreur parsing callback_data');
                // Garder comme string si le parsing échoue
            }
        }

        // Ajouter les informations de la commande associée
        if (payment.order_id) {
            console.log('[PaymentService] getPaymentById - Ajout des informations de commande');
            payment.order = {
                id: payment.order_id,
                user_id: payment.user_id,
                plan_id: payment.plan_id,
                phone_number: payment.order_phone_number,
                amount: payment.order_amount,
                status: payment.order_status,
                payment_method: payment.order_payment_method,
                payment_reference: payment.order_payment_reference,
                created_at: payment.order_created_at,
                updated_at: payment.order_updated_at,
                plan: payment.plan_id ? {
                    id: payment.plan_id,
                    operator_id: payment.plan_operator_id,
                    name: payment.plan_name,
                    description: payment.plan_description,
                    price: payment.plan_price,
                    type: payment.plan_type,
                    validity_days: payment.plan_validity_days,
                    active: payment.plan_active
                } : null,
                user: payment.user_id ? {
                    id: payment.user_id,
                    phone_number: payment.user_phone,
                    role: payment.user_role,
                    created_at: payment.user_created_at
                } : null
            };
        }

        // Supprimer les champs inutiles
        [
            'order_id_full', 'user_id', 'plan_id', 'order_phone_number', 'order_amount',
            'order_status', 'order_payment_method', 'order_payment_reference',
            'order_created_at', 'order_updated_at', 'plan_name', 'plan_description',
            'plan_price', 'plan_type', 'plan_validity_days', 'plan_active',
            'operator_name', 'operator_code', 'user_phone', 'user_role', 'user_created_at'
        ].forEach(field => delete payment[field]);
        console.log('[PaymentService] getPaymentById - Champs inutiles supprimés');

        return payment;
    } catch (error) {
        console.log('[PaymentService] getPaymentById - Erreur lors de la récupération', { error: error.message });
        logger.error('Erreur lors de la récupération du paiement', {
            error: error.message,
            paymentId: id,
            stack: error.stack
        });
        throw error;
    }
};

/**
 * Récupère la liste des paiements avec pagination et filtres
 * @param {Object} options - Options de pagination et de filtrage
 * @returns {Promise<Object>} Liste paginée des paiements
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
    console.log('[PaymentService] getPayments - Début de récupération liste', {
        page, limit, status, payment_method, start_date, end_date, order_id, user_id, plan_id
    });

    try {
        const offset = (page - 1) * limit;
        const whereClauses = [];
        const params = [];
        console.log('[PaymentService] getPayments - Calcul offset', { offset });

        if (status) {
            whereClauses.push('p.status = ?');
            params.push(status);
            console.log('[PaymentService] getPayments - Filtre statut ajouté', { status });
        }

        if (payment_method) {
            whereClauses.push('p.payment_method = ?');
            params.push(payment_method);
            console.log('[PaymentService] getPayments - Filtre méthode ajouté', { payment_method });
        }

        if (start_date) {
            whereClauses.push('p.created_at >= ?');
            params.push(new Date(start_date));
            console.log('[PaymentService] getPayments - Filtre date début ajouté', { start_date });
        }

        if (end_date) {
            whereClauses.push('p.created_at <= ?');
            params.push(new Date(end_date));
            console.log('[PaymentService] getPayments - Filtre date fin ajouté', { end_date });
        }

        if (order_id) {
            whereClauses.push('p.order_id = ?');
            params.push(order_id);
            console.log('[PaymentService] getPayments - Filtre commande ajouté', { order_id });
        }

        if (user_id) {
            whereClauses.push('o.user_id = ?');
            params.push(user_id);
            console.log('[PaymentService] getPayments - Filtre utilisateur ajouté', { user_id });
        }

        if (plan_id) {
            whereClauses.push('o.plan_id = ?');
            params.push(plan_id);
            console.log('[PaymentService] getPayments - Filtre plan ajouté', { plan_id });
        }

        const whereClause = whereClauses.length > 0
            ? `WHERE ${whereClauses.join(' AND ')}`
            : '';
        console.log('[PaymentService] getPayments - Clause WHERE construite', { whereClause, paramsCount: params.length });

        // Récupération des paiements avec les relations
        const [payments] = await db.query(
            `SELECT p.*,
                    o.id as order_id_full, o.user_id, o.plan_id, o.phone_number as order_phone_number,
                    o.amount as order_amount, o.status as order_status, o.payment_method as order_payment_method,
                    o.payment_reference as order_payment_reference, o.created_at as order_created_at,
                    o.updated_at as order_updated_at,
                    pl.name as plan_name, pl.description as plan_description, pl.price as plan_price,
                    pl.type as plan_type, pl.validity_days as plan_validity_days, pl.active as plan_active,
                    pl.operator_id as plan_operator_id,
                    op.name as operator_name, op.code as operator_code,
                    u.phone_number as user_phone, u.role as user_role, u.created_at as user_created_at
             FROM payments p
             LEFT JOIN orders o ON p.order_id = o.id
             LEFT JOIN plans pl ON o.plan_id = pl.id
             LEFT JOIN operators op ON pl.operator_id = op.id
             LEFT JOIN users u ON o.user_id = u.id
             ${whereClause}
             ORDER BY p.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        console.log('[PaymentService] getPayments - Requête principale exécutée', { resultsCount: payments.length });

        // Traitement des résultats pour inclure les relations
        const processedPayments = payments.map(payment => {
            const result = { ...payment };

            // Parser callback_data si présent
            if (result.callback_data) {
                try {
                    result.callback_data = JSON.parse(result.callback_data);
                } catch (e) {
                    // Garder comme string si le parsing échoue
                }
            }

            // Ajouter les informations de la commande associée
            if (result.order_id) {
                result.order = {
                    id: result.order_id,
                    user_id: result.user_id,
                    plan_id: result.plan_id,
                    phone_number: result.order_phone_number,
                    amount: result.order_amount,
                    status: result.order_status,
                    payment_method: result.order_payment_method,
                    payment_reference: result.order_payment_reference,
                    created_at: result.order_created_at,
                    updated_at: result.order_updated_at,
                    plan: result.plan_id ? {
                        id: result.plan_id,
                        operator_id: result.plan_operator_id,
                        name: result.plan_name,
                        description: result.plan_description,
                        price: result.plan_price,
                        type: result.plan_type,
                        validity_days: result.plan_validity_days,
                        active: result.plan_active,
                        operator_name: result.operator_name,
                        operator_code: result.operator_code
                    } : null,
                    user: result.user_id ? {
                        id: result.user_id,
                        phone_number: result.user_phone,
                        role: result.user_role,
                        created_at: result.user_created_at
                    } : null
                };
            }

            // Supprimer les champs inutiles
            [
                'order_id_full', 'user_id', 'plan_id', 'order_phone_number', 'order_amount',
                'order_status', 'order_payment_method', 'order_payment_reference',
                'order_created_at', 'order_updated_at', 'plan_name', 'plan_description',
                'plan_price', 'plan_type', 'plan_validity_days', 'plan_active',
                'operator_name', 'operator_code', 'user_phone', 'user_role', 'user_created_at'
            ].forEach(field => delete result[field]);

            return result;
        });
        console.log('[PaymentService] getPayments - Résultats traités', { processedCount: processedPayments.length });

        // Comptage du nombre total de paiements pour la pagination
        const [countResult] = await db.query(
            `SELECT COUNT(p.id) as total 
             FROM payments p
             LEFT JOIN orders o ON p.order_id = o.id
             ${whereClause}`,
            params
        );
        console.log('[PaymentService] getPayments - Comptage exécuté', { total: countResult[0].total });

        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);
        console.log('[PaymentService] getPayments - Pagination calculée', { total, totalPages, currentPage: page });

        return {
            data: processedPayments,
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
        console.log('[PaymentService] getPayments - Erreur lors de la récupération', { error: error.message });
        logger.error('Erreur lors de la récupération des paiements', {
            error: error.message,
            filters: { page, limit, status, payment_method, start_date, end_date }
        });
        throw error;
    }
};

/**
 * Met à jour le statut d'un paiement
 * @param {number} id - ID du paiement
 * @param {string} status - Nouveau statut
 * @param {string} notes - Notes supplémentaires (optionnel)
 * @returns {Promise<Object>} Le paiement mis à jour
 */
const updatePaymentStatus = async (id, status, notes = '') => {
    console.log('[PaymentService] updatePaymentStatus - Début de mise à jour statut', { paymentId: id, status, notes });

    if (!PAYMENT_STATUS.includes(status)) {
        console.log('[PaymentService] updatePaymentStatus - Statut invalide', { status, validStatuses: PAYMENT_STATUS });
        throw new Error(`Statut invalide. Doit être l'un des suivants: ${PAYMENT_STATUS.join(', ')}`);
    }

    const updateData = {
        status,
        updated_at: new Date()
    };

    if (notes) {
        updateData.status_notes = notes;
        console.log('[PaymentService] updatePaymentStatus - Notes ajoutées', { notes });
    }

    console.log('[PaymentService] updatePaymentStatus - Appel updatePayment');
    return updatePayment(id, updateData);
};

/**
 * Rembourse un paiement
 * @param {number} id - ID du paiement à rembourser
 * @param {string} reason - Raison du remboursement
 * @returns {Promise<Object>} Le paiement remboursé
 */
const refundPayment = async (id, reason) => {
    console.log('[PaymentService] refundPayment - Début de remboursement', { paymentId: id, reason });

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        console.log('[PaymentService] refundPayment - Transaction démarrée');

        // Vérifier que le paiement existe et peut être remboursé
        const [payments] = await connection.query(
            'SELECT * FROM payments WHERE id = ?',
            [id]
        );
        console.log('[PaymentService] refundPayment - Recherche paiement', { found: payments.length > 0 });

        if (!payments || payments.length === 0) {
            console.log('[PaymentService] refundPayment - Paiement non trouvé');
            throw new Error('Paiement non trouvé');
        }

        const payment = payments[0];
        console.log('[PaymentService] refundPayment - Paiement trouvé', { status: payment.status });

        if (payment.status !== 'success') {
            console.log('[PaymentService] refundPayment - Paiement non réussi, remboursement impossible');
            throw new Error('Seuls les paiements réussis peuvent être remboursés');
        }

        if (payment.status === 'refunded') {
            console.log('[PaymentService] refundPayment - Paiement déjà remboursé');
            throw new Error('Ce paiement a déjà été remboursé');
        }

        // Préparer les données de callback avec la raison du remboursement
        let callbackData = {};
        if (payment.callback_data) {
            try {
                callbackData = JSON.parse(payment.callback_data);
                console.log('[PaymentService] refundPayment - Callback data existant parsé');
            } catch (e) {
                callbackData = {};
                console.log('[PaymentService] refundPayment - Erreur parsing callback_data existant');
            }
        }
        callbackData.refund_reason = reason;
        callbackData.refunded_at = new Date().toISOString();
        callbackData.notes = `Remboursement effectué. Raison: ${reason}`;
        console.log('[PaymentService] refundPayment - Données de remboursement préparées');

        // Mettre à jour le statut du paiement
        await connection.query(
            'UPDATE payments SET status = ?, callback_data = ?, updated_at = ? WHERE id = ?',
            ['refunded', JSON.stringify(callbackData), new Date(), id]
        );
        console.log('[PaymentService] refundPayment - Statut mis à jour en DB');

        // Ici, vous pourriez appeler une API de remboursement externe
        // Par exemple: await paymentGateway.refund(payment.external_reference);
        console.log('[PaymentService] refundPayment - Appel API externe de remboursement (simulé)');

        await connection.commit();
        console.log('[PaymentService] refundPayment - Transaction validée');

        logger.info(`Paiement remboursé - ID: ${id}`, { reason });

        // Libérer la connexion avant d'appeler getPaymentById
        connection.release();
        console.log('[PaymentService] refundPayment - Connexion libérée avant appel getPaymentById');

        // Récupérer et retourner le paiement mis à jour
        return await getPaymentById(id);

    } catch (error) {
        console.log('[PaymentService] refundPayment - Erreur lors du remboursement', { error: error.message });
        await connection.rollback();
        connection.release();
        logger.error('Erreur lors du remboursement du paiement', {
            error: error.message,
            paymentId: id,
            reason
        });
        throw error;
    }
};

/**
 * Vérifie si un paiement est valide et complet
 * @param {number} orderId - ID de la commande
 * @returns {Promise<boolean>} True si le paiement est valide et complet
 */
const isPaymentComplete = async (orderId) => {
    console.log('[PaymentService] isPaymentComplete - Vérification statut paiement', { orderId });

    try {
        const [payments] = await db.query(
            'SELECT status FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
            [orderId]
        );
        console.log('[PaymentService] isPaymentComplete - Recherche paiements', { found: payments.length });

        const isComplete = payments.length > 0 && payments[0].status === 'success';
        console.log('[PaymentService] isPaymentComplete - Résultat vérification', { isComplete, paymentStatus: payments[0]?.status });

        return isComplete;
    } catch (error) {
        console.log('[PaymentService] isPaymentComplete - Erreur lors de la vérification', { error: error.message });
        logger.error('Erreur lors de la vérification du statut de paiement', {
            error: error.message,
            orderId
        });
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