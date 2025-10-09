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
};

/**
 * Crée un nouveau paiement
 * @param {Object} paymentData - Données du paiement
 * @returns {Promise<Object>} Le paiement créé
 */
const createPayment = async (paymentData) => {
    const connection = await db.getConnection();
    
    try {
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
        const [order] = await connection.query(
            'SELECT id FROM orders WHERE id = ?',
            [paymentData.order_id]
        );
        
        if (!order || order.length === 0) {
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
        
        logger.info(`Paiement créé avec succès - ID: ${result.insertId}`, { paymentId: result.insertId });
        
        return {
            id: result.insertId,
            ...payment,
            callback_data: payment.callback_data ? JSON.parse(payment.callback_data) : null
        };
    } catch (error) {
        await connection.rollback();
        logger.error('Erreur lors de la création du paiement', { error: error.message, paymentData });
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Met à jour un paiement existant
 * @param {number} id - ID du paiement à mettre à jour
 * @param {Object} updateData - Données à mettre à jour
 * @returns {Promise<Object>} Le paiement mis à jour
 */
const updatePayment = async (id, updateData) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Vérifier que le paiement existe
        const [payments] = await connection.query('SELECT * FROM payments WHERE id = ?', [id]);
        
        if (!payments || payments.length === 0) {
            throw new Error('Paiement non trouvé');
        }
        
        const payment = payments[0];
        
        // Préparer les données de mise à jour
        const fieldsToUpdate = {
            ...updateData,
            updated_at: new Date()
        };
        
        // Gérer callback_data si présent
        if (fieldsToUpdate.callback_data && typeof fieldsToUpdate.callback_data === 'object') {
            fieldsToUpdate.callback_data = JSON.stringify(fieldsToUpdate.callback_data);
        }
        
        // Retirer status_notes si présent (colonne n'existe pas dans la DB)
        // On va stocker les notes dans callback_data à la place
        if (fieldsToUpdate.status_notes) {
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
        
        await connection.query(
            `UPDATE payments SET ${updateFields} WHERE id = ?`,
            [...updateValues, id]
        );
        
        await connection.commit();
        
        logger.info(`Paiement mis à jour - ID: ${id}`, { paymentId: id, updates: updateData });
        
        // Récupérer le paiement mis à jour
        const [updatedPayments] = await connection.query('SELECT * FROM payments WHERE id = ?', [id]);
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
        await connection.rollback();
        logger.error('Erreur lors de la mise à jour du paiement', { 
            error: error.message, 
            paymentId: id, 
            updates: updateData 
        });
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Supprime un paiement (soft delete)
 * @param {number} id - ID du paiement à supprimer
 * @returns {Promise<boolean>} True si la suppression a réussi
 */
const deletePayment = async (id) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Vérifier que le paiement existe
        const [payments] = await connection.query('SELECT * FROM payments WHERE id = ?', [id]);
        
        if (!payments || payments.length === 0) {
            throw new Error('Paiement non trouvé');
        }
        
        const payment = payments[0];
        
        // Vérifier si le paiement peut être supprimé
        if (payment.status === 'success') {
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
        
        await connection.query(
            'UPDATE payments SET status = ?, callback_data = ?, updated_at = ? WHERE id = ?',
            ['failed', JSON.stringify(callbackData), new Date(), id]
        );
        
        await connection.commit();
        
        logger.info(`Paiement supprimé (soft delete) - ID: ${id}`);
        
        return true;
    } catch (error) {
        await connection.rollback();
        logger.error('Erreur lors de la suppression du paiement', { 
            error: error.message, 
            paymentId: id 
        });
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Récupère un paiement par son ID
 * @param {number} id - ID du paiement
 * @returns {Promise<Object>} Le paiement trouvé
 */
const getPaymentById = async (id) => {
    try {
        const [payments] = await db.query(
            'SELECT p.*, o.phone_number, o.amount as order_amount ' +
            'FROM payments p ' +
            'JOIN orders o ON p.order_id = o.id ' +
            'WHERE p.id = ?',
            [id]
        );
        
        if (!payments || payments.length === 0) {
            throw new Error('Paiement non trouvé');
        }
        
        const payment = payments[0];
        
        // Parser callback_data si présent
        if (payment.callback_data) {
            try {
                payment.callback_data = JSON.parse(payment.callback_data);
            } catch (e) {
                // Garder comme string si le parsing échoue
            }
        }
        
        return payment;
    } catch (error) {
        logger.error('Erreur lors de la récupération du paiement', { 
            error: error.message, 
            paymentId: id 
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
    end_date
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
        
        const whereClause = whereClauses.length > 0 
            ? `WHERE ${whereClauses.join(' AND ')}`  
            : '';
        
        // Récupération des paiements
        const [payments] = await db.query(
            `SELECT p.*, o.phone_number, o.amount as order_amount
             FROM payments p
             JOIN orders o ON p.order_id = o.id
             ${whereClause}
             ORDER BY p.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        
        // Parser callback_data pour chaque paiement
        payments.forEach(payment => {
            if (payment.callback_data) {
                try {
                    payment.callback_data = JSON.parse(payment.callback_data);
                } catch (e) {
                    // Garder comme string si le parsing échoue
                }
            }
        });
        
        // Comptage total pour la pagination
        const [countResult] = await db.query(
            `SELECT COUNT(*) as total
             FROM payments p
             ${whereClause}`,
            params
        );
        
        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);
        
        return {
            data: payments,
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
    if (!PAYMENT_STATUS.includes(status)) {
        throw new Error(`Statut invalide. Doit être l'un des suivants: ${PAYMENT_STATUS.join(', ')}`);
    }
    
    const updateData = { 
        status,
        updated_at: new Date()
    };
    
    if (notes) {
        updateData.status_notes = notes;
    }
    
    return updatePayment(id, updateData);
};

/**
 * Rembourse un paiement
 * @param {number} id - ID du paiement à rembourser
 * @param {string} reason - Raison du remboursement
 * @returns {Promise<Object>} Le paiement remboursé
 */
const refundPayment = async (id, reason) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // Vérifier que le paiement existe et peut être remboursé
        const [payments] = await connection.query(
            'SELECT * FROM payments WHERE id = ?',
            [id]
        );
        
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
        
        // Préparer les données de callback avec la raison du remboursement
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
        
        // Mettre à jour le statut du paiement
        await connection.query(
            'UPDATE payments SET status = ?, callback_data = ?, updated_at = ? WHERE id = ?',
            ['refunded', JSON.stringify(callbackData), new Date(), id]
        );
        
        // Ici, vous pourriez appeler une API de remboursement externe
        // Par exemple: await paymentGateway.refund(payment.external_reference);
        
        await connection.commit();
        
        logger.info(`Paiement remboursé - ID: ${id}`, { reason });
        
        // Libérer la connexion avant d'appeler getPaymentById
        connection.release();
        
        // Récupérer et retourner le paiement mis à jour
        return await getPaymentById(id);
        
    } catch (error) {
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
    try {
        const [payments] = await db.query(
            'SELECT status FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
            [orderId]
        );
        
        return payments.length > 0 && payments[0].status === 'success';
    } catch (error) {
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