const logger = require('../utils/logger');
const paymentService = require('../services/paymentService');
const { PAYMENT_METHODS, PAYMENT_STATUS } = paymentService;

/**
 * @route   POST /api/payments
 * @desc    Créer un nouveau paiement
 * @access  Private
 */
const createPayment = async (req, res, next) => {
    try {
        // Les données sont déjà validées par le middleware
        const payment = await paymentService.createPayment(req.body);
        
        logger.info(`Paiement créé avec succès - ID: ${payment.id}`, { 
            paymentId: payment.id,
            orderId: payment.order_id
        });
        
        res.status(201).json({
            success: true,
            message: 'Paiement créé avec succès',
            data: payment
        });
    } catch (error) {
        logger.error('Erreur lors de la création du paiement', { 
            error: error.message,
            stack: error.stack,
            body: req.body 
        });
        
        // Gestion des erreurs spécifiques
        if (error.message.includes('existe déjà')) {
            return res.status(409).json({
                success: false,
                error: error.message
            });
        }
        
        if (error.message.includes('non trouvée')) {
            return res.status(404).json({
                success: false,
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la création du paiement',
            details: error.message
        });
    }
};

/**
 * @route   GET /api/payments
 * @desc    Récupérer tous les paiements avec pagination et filtres
 * @access  Private/Admin
 */
const getPayments = async (req, res, next) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            status, 
            payment_method, 
            start_date, 
            end_date,
            order_id,
            user_id,
            plan_id
        } = req.query;
        
        const result = await paymentService.getPayments({
            page: parseInt(page),
            limit: parseInt(limit),
            status,
            payment_method,
            start_date,
            end_date,
            order_id: order_id ? parseInt(order_id) : undefined,
            user_id: user_id ? parseInt(user_id) : undefined,
            plan_id: plan_id ? parseInt(plan_id) : undefined
        });
        
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        logger.error('Erreur lors de la récupération des paiements', { 
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des paiements',
            details: error.message
        });
    }
};

/**
 * @route   GET /api/payments/:id
 * @desc    Récupérer un paiement par son ID
 * @access  Private
 */
const getPaymentById = async (req, res, next) => {
    try {
        const payment = await paymentService.getPaymentById(req.params.id);
        
        res.json({
            success: true,
            data: payment
        });
    } catch (error) {
        logger.error('Erreur lors de la récupération du paiement', { 
            error: error.message,
            stack: error.stack,
            paymentId: req.params.id 
        });
        
        if (error.message.includes('non trouvé')) {
            return res.status(404).json({
                success: false,
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération du paiement',
            details: error.message
        });
    }
};

/**
 * @route   PUT /api/payments/:id
 * @desc    Mettre à jour un paiement
 * @access  Private/Admin
 */
const updatePayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Les données sont déjà validées par le middleware
        const payment = await paymentService.updatePayment(id, req.body);
        
        logger.info(`Paiement mis à jour - ID: ${id}`, { 
            paymentId: id,
            updates: req.body
        });
        
        res.json({
            success: true,
            message: 'Paiement mis à jour avec succès',
            data: payment
        });
    } catch (error) {
        logger.error('Erreur lors de la mise à jour du paiement', { 
            error: error.message,
            stack: error.stack,
            paymentId: req.params.id,
            updates: req.body
        });
        
        if (error.message.includes('non trouvé')) {
            return res.status(404).json({
                success: false,
                error: error.message
            });
        }
        
        if (error.message.includes('Statut invalide')) {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la mise à jour du paiement',
            details: error.message
        });
    }
};

/**
 * @route   DELETE /api/payments/:id
 * @desc    Supprimer un paiement (soft delete)
 * @access  Private/Admin
 */
const deletePayment = async (req, res, next) => {
    try {
        const paymentId = parseInt(req.params.id);
        
        logger.info('[PaymentController] [deletePayment] Suppression', {
            paymentId,
            requestingUser: req.user?.id
        });
        
        // Vérifier que le paiement existe
        const payment = await paymentService.getPaymentById(paymentId);
        if (!payment) {
            return res.status(404).json({
                success: false,
                error: 'Paiement non trouvé'
            });
        }
        
        await paymentService.deletePayment(paymentId);
        
        // 204 No Content ne doit pas avoir de body
        res.status(204).send();
    } catch (error) {
        logger.error('[PaymentController] [deletePayment] Erreur', {
            error: error.message,
            paymentId: req.params.id,
            stack: error.stack
        });
        
        if (error.message.includes('non trouvé') || error.message.includes('inexistant')) {
            return res.status(404).json({
                success: false,
                error: 'Paiement non trouvé'
            });
        }
        
        if (error.message.includes('Impossible de supprimer')) {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }
        
        next(error);
    }
};

/**
 * @route   PATCH /api/payments/:id/status
 * @desc    Mettre à jour le statut d'un paiement
 * @access  Private/Admin
 */
const updatePaymentStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        
        const payment = await paymentService.updatePaymentStatus(id, status, notes);
        
        logger.info(`Statut du paiement mis à jour - ID: ${id}`, { 
            paymentId: id,
            status,
            notes
        });
        
        res.json({
            success: true,
            message: 'Statut du paiement mis à jour avec succès',
            data: payment
        });
    } catch (error) {
        logger.error('Erreur lors de la mise à jour du statut du paiement', { 
            error: error.message,
            stack: error.stack,
            paymentId: req.params.id,
            status: req.body.status
        });
        
        if (error.message.includes('non trouvé')) {
            return res.status(404).json({
                success: false,
                error: error.message
            });
        }
        
        if (error.message.includes('Statut invalide')) {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la mise à jour du statut',
            details: error.message
        });
    }
};

/**
 * @route   POST /api/payments/:id/refund
 * @desc    Rembourser un paiement
 * @access  Private/Admin
 */
const refundPayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        const payment = await paymentService.refundPayment(id, reason);
        
        logger.info(`Paiement remboursé - ID: ${id}`, { 
            paymentId: id,
            reason
        });
        
        res.json({
            success: true,
            message: 'Paiement remboursé avec succès',
            data: payment
        });
    } catch (error) {
        logger.error('Erreur lors du remboursement du paiement', { 
            error: error.message,
            stack: error.stack,
            paymentId: req.params.id,
            reason: req.body.reason
        });
        
        if (error.message.includes('non trouvé')) {
            return res.status(404).json({
                success: false,
                error: error.message
            });
        }
        
        if (error.message.includes('Seuls les paiements réussis') || 
            error.message.includes('déjà été remboursé')) {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Erreur lors du remboursement',
            details: error.message
        });
    }
};

// Export des constantes pour utilisation dans les routes
module.exports = {
    // Constantes
    PAYMENT_METHODS,
    PAYMENT_STATUS,
    
    // Contrôleurs
    createPayment,
    getPayments,
    getPaymentById,
    updatePayment,
    deletePayment,
    updatePaymentStatus,
    refundPayment
};