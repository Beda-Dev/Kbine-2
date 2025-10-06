const logger = require('../utils/logger');
const paymentService = require('../services/paymentService');
const { createPaymentValidation, updatePaymentValidation } = require('../validators/paymentValidator');
const { PAYMENT_METHODS, PAYMENT_STATUS } = paymentService;

/**
 * @route   POST /api/payments
 * @desc    Créer un nouveau paiement
 * @access  Private
 */
const createPayment = async (req, res, next) => {
    try {
        // Validation des données
        const validatedData = createPaymentValidation(req.body);
        
        // Vérifier si l'utilisateur est autorisé à effectuer cette action
        // (à implémenter selon votre logique d'authentification)
        
        const payment = await paymentService.createPayment(validatedData);
        
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
            body: req.body 
        });
        next(error);
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
            end_date 
        } = req.query;
        
        const result = await paymentService.getPayments({
            page: parseInt(page),
            limit: parseInt(limit),
            status,
            payment_method,
            start_date,
            end_date
        });
        
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
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
        
        // Vérifier si l'utilisateur a le droit de voir ce paiement
        // (à implémenter selon votre logique d'autorisation)
        
        res.json({
            success: true,
            data: payment
        });
    } catch (error) {
        logger.error('Erreur lors de la récupération du paiement', { 
            error: error.message,
            paymentId: req.params.id 
        });
        next(error);
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
        
        // Validation des données
        const updateData = updatePaymentValidation(req.body);
        
        const payment = await paymentService.updatePayment(id, updateData);
        
        logger.info(`Paiement mis à jour - ID: ${id}`, { 
            paymentId: id,
            updates: updateData
        });
        
        res.json({
            success: true,
            message: 'Paiement mis à jour avec succès',
            data: payment
        });
    } catch (error) {
        logger.error('Erreur lors de la mise à jour du paiement', { 
            error: error.message,
            paymentId: req.params.id,
            updates: req.body
        });
        next(error);
    }
};

/**
 * @route   DELETE /api/payments/:id
 * @desc    Supprimer un paiement (soft delete)
 * @access  Private/Admin
 */
const deletePayment = async (req, res, next) => {
    try {
        await paymentService.deletePayment(req.params.id);
        
        logger.info(`Paiement supprimé - ID: ${req.params.id}`);
        
        res.status(204).json({
            success: true,
            message: 'Paiement supprimé avec succès',
            data: null
        });
    } catch (error) {
        logger.error('Erreur lors de la suppression du paiement', { 
            error: error.message,
            paymentId: req.params.id 
        });
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
            paymentId: req.params.id,
            status: req.body.status
        });
        next(error);
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
        
        if (!reason) {
            return res.status(400).json({
                success: false,
                error: 'La raison du remboursement est requise'
            });
        }
        
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
            paymentId: req.params.id,
            reason: req.body.reason
        });
        next(error);
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





