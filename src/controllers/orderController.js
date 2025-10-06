const orderService = require('../services/orderService');
const logger = require('../utils/logger');
const { ORDER_STATUS } = require('../validators/orderValidator');

/**
 * Gestion des erreurs
 */
const handleError = (res, error, context) => {
    logger.error(`Erreur lors de ${context}:`, error);
    
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Erreur de validation',
            details: error.message
        });
    }
    
    if (error.name === 'NotFoundError') {
        return res.status(404).json({
            success: false,
            error: error.message || 'Ressource non trouvée'
        });
    }
    
    if (error.name === 'ForbiddenError') {
        return res.status(403).json({
            success: false,
            error: error.message || 'Accès refusé'
        });
    }
    
    res.status(500).json({
        success: false,
        error: `Erreur serveur lors de ${context}`,
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
};

/**
 * Création d'une nouvelle commande
 */
const createOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const orderData = { ...req.body, user_id: userId };
        
        const order = await orderService.createOrder(orderData);
        
        res.status(201).json({
            success: true,
            message: 'Commande créée avec succès',
            data: order
        });
    } catch (error) {
        handleError(res, error, 'la création de la commande');
    }
};

/**
 * Récupération de toutes les commandes avec pagination et filtres
 */
const getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, user_id } = req.query;
        const filters = { status, user_id };
        
        // Si l'utilisateur n'est pas admin, il ne peut voir que ses propres commandes
        if (req.user.role === 'client') {
            filters.user_id = req.user.id;
        }
        
        const result = await orderService.getAllOrders({
            page: parseInt(page, 10),
            limit: Math.min(parseInt(limit, 10), 100),
            filters
        });
        
        res.json({
            success: true,
            message: 'Liste des commandes récupérée avec succès',
            data: {
                items: result.orders,
                pagination: {
                    total: result.total,
                    page: parseInt(page, 10),
                    limit: Math.min(parseInt(limit, 10), 100),
                    totalPages: Math.ceil(result.total / Math.min(parseInt(limit, 10), 100))
                }
            }
        });
    } catch (error) {
        handleError(res, error, 'la récupération des commandes');
    }
};

/**
 * Récupération d'une commande par son ID
 */
const getOrderById = async (req, res) => {
    try {
        const orderId = parseInt(req.params.id, 10);
        const order = await orderService.getOrderById(orderId);
        
        // Vérification des autorisations
        if (req.user.role === 'client' && order.user_id !== req.user.id) {
            const error = new Error('Accès non autorisé à cette commande');
            error.name = 'ForbiddenError';
            throw error;
        }
        
        res.json({
            success: true,
            message: 'Commande récupérée avec succès',
            data: order
        });
    } catch (error) {
        handleError(res, error, 'la récupération de la commande');
    }
};

/**
 * Mise à jour d'une commande
 */
const updateOrder = async (req, res) => {
    try {
        const orderId = parseInt(req.params.id, 10);
        const updateData = req.body;
        
        // Vérification des autorisations
        if (req.user.role === 'client') {
            const order = await orderService.getOrderById(orderId);
            if (order.user_id !== req.user.id) {
                const error = new Error('Accès non autorisé à cette commande');
                error.name = 'ForbiddenError';
                throw error;
            }
            
            // Les clients ne peuvent mettre à jour que certains champs
            const allowedFields = ['phone_number'];
            Object.keys(updateData).forEach(key => {
                if (!allowedFields.includes(key)) {
                    delete updateData[key];
                }
            });
        }
        
        const updatedOrder = await orderService.updateOrder(orderId, updateData);
        
        res.json({
            success: true,
            message: 'Commande mise à jour avec succès',
            data: updatedOrder
        });
    } catch (error) {
        handleError(res, error, 'la mise à jour de la commande');
    }
};

/**
 * Suppression d'une commande (admin uniquement)
 */
const deleteOrder = async (req, res) => {
    try {
        const orderId = parseInt(req.params.id, 10);
        await orderService.deleteOrder(orderId);
        
        res.json({
            success: true,
            message: 'Commande supprimée avec succès',
            data: { id: orderId }
        });
    } catch (error) {
        handleError(res, error, 'la suppression de la commande');
    }
};

/**
 * Mise à jour du statut d'une commande (staff/admin)
 */
const updateOrderStatus = async (req, res) => {
    try {
        const orderId = parseInt(req.params.id, 10);
        const { status } = req.body;
        
        const updatedOrder = await orderService.updateOrderStatus(orderId, status, req.user);
        
        res.json({
            success: true,
            message: 'Statut de la commande mis à jour avec succès',
            data: updatedOrder
        });
    } catch (error) {
        handleError(res, error, 'la mise à jour du statut de la commande');
    }
};

/**
 * Assignation d'une commande à un membre du staff
 */
const assignOrder = async (req, res) => {
    try {
        const orderId = parseInt(req.params.id, 10);
        const { assigned_to } = req.body;
        
        const updatedOrder = await orderService.assignOrder(orderId, assigned_to, req.user);
        
        res.json({
            success: true,
            message: 'Commande assignée avec succès',
            data: updatedOrder
        });
    } catch (error) {
        handleError(res, error, "l'assignation de la commande");
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
