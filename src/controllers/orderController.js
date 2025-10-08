// ==========================================
// FILE: orderController.js (CORRIGÉ)
// ==========================================
const orderService = require('../services/orderService');
const logger = require('../utils/logger');

/**
 * Crée une nouvelle commande
 * POST /api/orders
 */
const createOrder = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const orderData = req.validated || { ...req.body, user_id: userId };
        
        // S'assurer que user_id est défini
        if (!orderData.user_id) {
            orderData.user_id = userId;
        }
        
        logger.info('[OrderController] [createOrder] Création de commande', {
            userId,
            planId: orderData.plan_id,
            amount: orderData.amount
        });
        
        const order = await orderService.createOrder(orderData);
        
        res.status(201).json({
            success: true,
            message: 'Commande créée avec succès',
            data: order
        });
    } catch (error) {
        logger.error('[OrderController] [createOrder] Erreur', {
            error: error.message,
            userId: req.user?.id
        });
        next(error);
    }
};

/**
 * Récupère toutes les commandes avec pagination et filtres
 * GET /api/orders
 */
const getAllOrders = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, status, user_id } = req.query;
        const filters = {};
        
        logger.debug('[OrderController] [getAllOrders] Récupération', {
            page,
            limit,
            status,
            userId: user_id,
            requestingUser: req.user.id
        });
        
        // Si l'utilisateur est un client, il ne peut voir que ses propres commandes
        if (req.user.role === 'client') {
            filters.userId = req.user.id;
        } else if (user_id) {
            filters.userId = user_id;
        }
        
        if (status) {
            filters.status = status;
        }
        
        const orders = await orderService.findAll(filters);
        
        // Pagination simple côté application
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedOrders = orders.slice(startIndex, endIndex);
        
        res.json({
            success: true,
            data: paginatedOrders,
            pagination: {
                total: orders.length,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(orders.length / limit)
            }
        });
    } catch (error) {
        logger.error('[OrderController] [getAllOrders] Erreur', {
            error: error.message
        });
        next(error);
    }
};

/**
 * Récupère une commande par son ID
 * GET /api/orders/:id
 */
const getOrderById = async (req, res, next) => {
    try {
        const orderId = parseInt(req.params.id);
        
        logger.debug('[OrderController] [getOrderById] Récupération', {
            orderId,
            requestingUser: req.user.id
        });
        
        const order = await orderService.findById(orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Commande non trouvée'
            });
        }
        
        // Vérification des autorisations
        if (req.user.role === 'client' && order.user_id !== req.user.id) {
            logger.warn('[OrderController] [getOrderById] Accès refusé', {
                orderId,
                orderOwner: order.user_id,
                requestingUser: req.user.id
            });
            
            return res.status(403).json({
                success: false,
                error: 'Accès non autorisé à cette commande'
            });
        }
        
        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        logger.error('[OrderController] [getOrderById] Erreur', {
            error: error.message,
            orderId: req.params.id
        });
        next(error);
    }
};

/**
 * Met à jour une commande existante
 * PUT /api/orders/:id
 */
const updateOrder = async (req, res, next) => {
    try {
        const orderId = parseInt(req.params.id);
        let updateData = req.validated || req.body;
        
        logger.info('[OrderController] [updateOrder] Mise à jour', {
            orderId,
            fields: Object.keys(updateData),
            requestingUser: req.user.id
        });
        
        // Vérifier que la commande existe
        const order = await orderService.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Commande non trouvée'
            });
        }
        
        // Vérification des autorisations
        if (req.user.role === 'client') {
            if (order.user_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    error: 'Accès non autorisé à cette commande'
                });
            }
            
            // Les clients ne peuvent mettre à jour que certains champs
            const allowedFields = ['phone_number'];
            const filteredData = {};
            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    filteredData[field] = updateData[field];
                }
            });
            updateData = filteredData;
        }
        
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Aucun champ valide à mettre à jour'
            });
        }
        
        const updatedOrder = await orderService.updateOrder(orderId, updateData);
        
        res.json({
            success: true,
            message: 'Commande mise à jour avec succès',
            data: updatedOrder
        });
    } catch (error) {
        logger.error('[OrderController] [updateOrder] Erreur', {
            error: error.message,
            orderId: req.params.id
        });
        next(error);
    }
};

/**
 * Supprime une commande (admin uniquement)
 * DELETE /api/orders/:id
 */
const deleteOrder = async (req, res, next) => {
    try {
        const orderId = parseInt(req.params.id);
        
        logger.info('[OrderController] [deleteOrder] Suppression', {
            orderId,
            requestingUser: req.user.id
        });
        
        // Vérifier que la commande existe
        const order = await orderService.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Commande non trouvée'
            });
        }
        
        await orderService.deleteOrder(orderId);
        
        // 204 No Content ne doit pas avoir de body
        res.status(204).send();
    } catch (error) {
        logger.error('[OrderController] [deleteOrder] Erreur', {
            error: error.message,
            orderId: req.params.id
        });
        
        // Gestion des erreurs de contrainte de clé étrangère
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.message.includes('liée à des paiements')) {
            return res.status(409).json({
                success: false,
                error: 'Impossible de supprimer cette commande car elle est liée à des paiements'
            });
        }
        
        next(error);
    }
};

/**
 * Met à jour le statut d'une commande (staff/admin)
 * PATCH /api/orders/:id/status
 */
const updateOrderStatus = async (req, res, next) => {
    try {
        const orderId = parseInt(req.params.id);
        const { status } = req.body;
        
        logger.info('[OrderController] [updateOrderStatus] Mise à jour du statut', {
            orderId,
            newStatus: status,
            requestingUser: req.user.id
        });
        
        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Le statut est requis'
            });
        }
        
        // Vérifier que la commande existe
        const order = await orderService.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Commande non trouvée'
            });
        }
        
        // Mettre à jour le statut
        const updatedOrder = await orderService.updateOrder(orderId, { status });
        
        res.json({
            success: true,
            message: 'Statut de la commande mis à jour avec succès',
            data: updatedOrder
        });
    } catch (error) {
        logger.error('[OrderController] [updateOrderStatus] Erreur', {
            error: error.message,
            orderId: req.params.id
        });
        next(error);
    }
};

/**
 * Assigne une commande à un membre du staff (admin/staff)
 * POST /api/orders/:id/assign
 */
const assignOrder = async (req, res, next) => {
    try {
        const orderId = parseInt(req.params.id);
        const { assigned_to } = req.body;
        
        logger.info('[OrderController] [assignOrder] Assignation', {
            orderId,
            assignedTo: assigned_to,
            requestingUser: req.user.id
        });
        
        if (!assigned_to) {
            return res.status(400).json({
                success: false,
                error: "L'ID de l'assigné est requis"
            });
        }
        
        // Vérifier que la commande existe
        const order = await orderService.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Commande non trouvée'
            });
        }
        
        // Mettre à jour l'assignation
        const updatedOrder = await orderService.updateOrder(orderId, { 
            assigned_to,
            status: 'assigned' 
        });
        
        res.json({
            success: true,
            message: 'Commande assignée avec succès',
            data: updatedOrder
        });
    } catch (error) {
        logger.error('[OrderController] [assignOrder] Erreur', {
            error: error.message,
            orderId: req.params.id
        });
        next(error);
    }
};

module.exports = {
    createOrder,
    getAllOrders,
    getOrderById,
    updateOrder,
    deleteOrder,
    updateOrderStatus,
    assignOrder
};
