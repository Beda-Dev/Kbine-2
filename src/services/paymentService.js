const db = require('../config/database');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

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
        
        // Création du paiement
        const payment = {
            ...paymentData,
            status: 'pending',
            external_reference: paymentData.external_reference || uuidv4(),
            created_at: new Date(),
            updated_at: new Date()
        };
        
        const [result] = await connection.query('INSERT INTO payments SET ?', [payment]);
        
        await connection.commit();
        
        logger.info(`Paiement créé avec succès - ID: ${result.insertId}`, { paymentId: result.insertId });
        
        return {
            id: result.insertId,
            ...payment
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
        const [payment] = await connection.query('SELECT * FROM payments WHERE id = ?', [id]);
        
        if (!payment || payment.length === 0) {
            throw new Error('Paiement non trouvé');
        }
        
        // Mise à jour du paiement
        const updatedPayment = {
            ...payment[0],
            ...updateData,
            updated_at: new Date()
        };
        
        await connection.query('UPDATE payments SET ? WHERE id = ?', [updatedPayment, id]);
        
        // Si le statut est mis à jour, enregistrer l'historique
        if (updateData.status && updateData.status !== payment[0].status) {
            await connection.query(
                'INSERT INTO payment_status_history (payment_id, status, notes) VALUES (?, ?, ?)',
                [id, updateData.status, updateData.status_notes || 'Mise à jour du statut']
            );
        }
        
        await connection.commit();
        
        logger.info(`Paiement mis à jour - ID: ${id}`, { paymentId: id, updates: updateData });
        
        return {
            id,
            ...updatedPayment
        };
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
        const [payment] = await connection.query('SELECT * FROM payments WHERE id = ?', [id]);
        
        if (!payment || payment.length === 0) {
            throw new Error('Paiement non trouvé');
        }
        
        // Soft delete au lieu d'une suppression physique
        await connection.query(
            'UPDATE payments SET status = ?, deleted_at = NOW() WHERE id = ?',
            ['cancelled', id]
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
        const [payment] = await db.query(
            'SELECT p.*, o.phone_number, o.amount as order_amount ' +
            'FROM payments p ' +
            'JOIN orders o ON p.order_id = o.id ' +
            'WHERE p.id = ? AND p.deleted_at IS NULL',
            [id]
        );
        
        if (!payment || payment.length === 0) {
            throw new Error('Paiement non trouvé');
        }
        
        return payment[0];
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
 * @param {number} options.page - Numéro de page (défaut: 1)
 * @param {number} options.limit - Nombre d'éléments par page (défaut: 10)
 * @param {string} options.status - Filtre par statut
 * @param {string} options.payment_method - Filtre par méthode de paiement
 * @param {string} options.start_date - Date de début pour le filtre
 * @param {string} options.end_date - Date de fin pour le filtre
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
        const whereClauses = ['p.deleted_at IS NULL'];
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
            ? `WHERE ${whereChunks.join(' AND ')}` 
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
    
    return updatePayment(id, { 
        status, 
        status_notes: notes,
        updated_at: new Date()
    });
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
        const [payment] = await connection.query(
            'SELECT * FROM payments WHERE id = ? AND status = ?',
            [id, 'success']
        );
        
        if (!payment || payment.length === 0) {
            throw new Error('Paiement non trouvé ou ne pouvant pas être remboursé');
        }
        
        // Marquer le paiement comme remboursé
        await updatePaymentStatus(id, 'refunded', `Remboursement effectué. Raison: ${reason}`);
        
        // Ici, vous pourriez appeler une API de remboursement externe
        // Par exemple: await paymentGateway.refund(payment[0].external_reference);
        
        await connection.commit();
        
        logger.info(`Paiement remboursé - ID: ${id}`, { reason });
        
        return getPaymentById(id);
    } catch (error) {
        await connection.rollback();
        logger.error('Erreur lors du remboursement du paiement', { 
            error: error.message, 
            paymentId: id,
            reason
        });
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Vérifie si un paiement est valide et complet
 * @param {number} orderId - ID de la commande
 * @returns {Promise<boolean>} True si le paiement est valide et complet
 */
const isPaymentComplete = async (orderId) => {
    try {
        const [payment] = await db.query(
            'SELECT status FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
            [orderId]
        );
        
        return payment.length > 0 && payment[0].status === 'success';
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
