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
    console.log('[OrderController] [createOrder] Début de création de commande', {
        userId: req.user.id,
        body: req.body,
        validated: req.validated
    });

    try {
        const userId = req.user.id;
        const orderData = req.validated || { ...req.body, user_id: userId };

        // S'assurer que user_id est défini
        if (!orderData.user_id) {
            orderData.user_id = userId;
        }

        console.log('[OrderController] [createOrder] Données préparées', { orderData });

        logger.info('[OrderController] [createOrder] Création de commande', {
            userId,
            planId: orderData.plan_id,
            amount: orderData.amount
        });

        console.log('[OrderController] [createOrder] Appel du service createOrder');
        const order = await orderService.createOrder(orderData);

        console.log('[OrderController] [createOrder] Commande créée avec succès', { orderId: order.id });

        res.status(201).json({
            success: true,
            message: 'Commande créée avec succès',
            data: order
        });
    } catch (error) {
        console.log('[OrderController] [createOrder] Erreur attrapée', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id
        });
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
    console.log('[OrderController] [getAllOrders] Début de récupération liste', {
        query: req.query,
        user: req.user
    });

    try {
        const { page = 1, limit = 10, status, user_id, date } = req.query;
        const filters = {};

        console.log('[OrderController] [getAllOrders] Paramètres reçus', {
            page,
            limit,
            status,
            userId: user_id,
            date,
            requestingUser: req.user.id
        });

        logger.debug('[OrderController] [getAllOrders] Récupération', {
            page,
            limit,
            status,
            userId: user_id,
            date,
            requestingUser: req.user.id
        });

        // Si l'utilisateur est un client, il ne peut voir que ses propres commandes
        if (req.user.role === 'client') {
            filters.userId = req.user.id;
            console.log('[OrderController] [getAllOrders] Filtre appliqué pour client', { userId: req.user.id });
        } else if (user_id) {
            filters.userId = user_id;
            console.log('[OrderController] [getAllOrders] Filtre utilisateur spécifique appliqué', { userId: user_id });
        }

        if (status) {
            filters.status = status;
            console.log('[OrderController] [getAllOrders] Filtre statut appliqué', { status });
        }

        // AJOUT: Filtre par date de création
        if (date) {
            filters.date = date;
            console.log('[OrderController] [getAllOrders] Filtre date appliqué', { date });
        }

        console.log('[OrderController] [getAllOrders] Appel du service findAll', { filters });
        const orders = await orderService.findAll(filters);

        // Pagination simple côté application
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedOrders = orders.slice(startIndex, endIndex);

        console.log('[OrderController] [getAllOrders] Pagination appliquée', {
            totalOrders: orders.length,
            startIndex,
            endIndex,
            paginatedCount: paginatedOrders.length
        });

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
        console.log('[OrderController] [getAllOrders] Erreur attrapée', {
            error: error.message,
            stack: error.stack
        });
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
    console.log('[OrderController] [getOrderById] Début de récupération', {
        orderId: req.params.id,
        user: req.user
    });

    try {
        const orderId = parseInt(req.params.id);

        console.log('[OrderController] [getOrderById] ID parsé', { orderId });

        logger.debug('[OrderController] [getOrderById] Récupération', {
            orderId,
            requestingUser: req.user.id
        });

        console.log('[OrderController] [getOrderById] Appel du service findById');
        const order = await orderService.findById(orderId);

        if (!order) {
            console.log('[OrderController] [getOrderById] Commande non trouvée', { orderId });
            return res.status(404).json({
                success: false,
                error: 'Commande non trouvée'
            });
        }

        console.log('[OrderController] [getOrderById] Commande trouvée', { orderId, status: order.status });

        // Vérification des autorisations
        if (req.user.role === 'client' && order.user_id !== req.user.id) {
            console.log('[OrderController] [getOrderById] Accès refusé - client non propriétaire', {
                orderId,
                orderOwner: order.user_id,
                requestingUser: req.user.id
            });
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

        console.log('[OrderController] [getOrderById] Accès autorisé, retour de la commande');
        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        console.log('[OrderController] [getOrderById] Erreur attrapée', {
            error: error.message,
            stack: error.stack,
            orderId: req.params.id
        });
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
    console.log('[OrderController] [updateOrder] Début de mise à jour', {
        orderId: req.params.id,
        body: req.body,
        user: req.user
    });

    try {
        const orderId = parseInt(req.params.id);
        let updateData = req.validated || req.body;

        console.log('[OrderController] [updateOrder] Données reçues', { orderId, updateData });

        logger.info('[OrderController] [updateOrder] Mise à jour', {
            orderId,
            fields: Object.keys(updateData),
            requestingUser: req.user.id
        });

        // Vérifier que la commande existe
        console.log('[OrderController] [updateOrder] Vérification existence commande');
        const order = await orderService.findById(orderId);
        if (!order) {
            console.log('[OrderController] [updateOrder] Commande non trouvée', { orderId });
            return res.status(404).json({
                success: false,
                error: 'Commande non trouvée'
            });
        }

        console.log('[OrderController] [updateOrder] Commande trouvée', { orderId, currentStatus: order.status });

        // Vérification des autorisations
        if (req.user.role === 'client') {
            console.log('[OrderController] [updateOrder] Vérification autorisations client');
            if (order.user_id !== req.user.id) {
                console.log('[OrderController] [updateOrder] Accès refusé - client non propriétaire');
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
            console.log('[OrderController] [updateOrder] Données filtrées pour client', { updateData });
        }

        if (Object.keys(updateData).length === 0) {
            console.log('[OrderController] [updateOrder] Aucun champ valide à mettre à jour');
            return res.status(400).json({
                success: false,
                error: 'Aucun champ valide à mettre à jour'
            });
        }

        console.log('[OrderController] [updateOrder] Appel du service updateOrder');
        const updatedOrder = await orderService.updateOrder(orderId, updateData);

        console.log('[OrderController] [updateOrder] Commande mise à jour avec succès', { orderId });

        res.json({
            success: true,
            message: 'Commande mise à jour avec succès',
            data: updatedOrder
        });
    } catch (error) {
        console.log('[OrderController] [updateOrder] Erreur attrapée', {
            error: error.message,
            stack: error.stack,
            orderId: req.params.id
        });
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
    console.log('[OrderController] [deleteOrder] Début de suppression', {
        orderId: req.params.id,
        user: req.user
    });

    try {
        const orderId = parseInt(req.params.id);

        console.log('[OrderController] [deleteOrder] ID parsé', { orderId });

        logger.info('[OrderController] [deleteOrder] Suppression', {
            orderId,
            requestingUser: req.user.id
        });

        // Vérifier que la commande existe
        console.log('[OrderController] [deleteOrder] Vérification existence commande');
        const order = await orderService.findById(orderId);
        if (!order) {
            console.log('[OrderController] [deleteOrder] Commande non trouvée', { orderId });
            return res.status(404).json({
                success: false,
                error: 'Commande non trouvée'
            });
        }

        console.log('[OrderController] [deleteOrder] Commande trouvée, appel du service deleteOrder');
        await orderService.deleteOrder(orderId);

        console.log('[OrderController] [deleteOrder] Suppression réussie', { orderId });

        // 204 No Content ne doit pas avoir de body
        res.status(204).send();
    } catch (error) {
        console.log('[OrderController] [deleteOrder] Erreur attrapée', {
            error: error.message,
            stack: error.stack,
            orderId: req.params.id
        });
        logger.error('[OrderController] [deleteOrder] Erreur', {
            error: error.message,
            orderId: req.params.id
        });

        // Gestion des erreurs de contrainte de clé étrangère
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.message.includes('liée à des paiements')) {
            console.log('[OrderController] [deleteOrder] Erreur de contrainte de clé étrangère');
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
    console.log('[OrderController] [updateOrderStatus] Début de mise à jour statut', {
        orderId: req.params.id,
        body: req.body,
        user: req.user
    });

    try {
        const orderId = parseInt(req.params.id);
        const { status } = req.body;

        console.log('[OrderController] [updateOrderStatus] Paramètres reçus', { orderId, status });

        logger.info('[OrderController] [updateOrderStatus] Mise à jour du statut', {
            orderId,
            newStatus: status,
            requestingUser: req.user.id
        });

        if (!status) {
            console.log('[OrderController] [updateOrderStatus] Statut manquant');
            return res.status(400).json({
                success: false,
                error: 'Le statut est requis'
            });
        }

        // Vérifier que la commande existe
        console.log('[OrderController] [updateOrderStatus] Vérification existence commande');
        const order = await orderService.findById(orderId);
        if (!order) {
            console.log('[OrderController] [updateOrderStatus] Commande non trouvée', { orderId });
            return res.status(404).json({
                success: false,
                error: 'Commande non trouvée'
            });
        }

        console.log('[OrderController] [updateOrderStatus] Commande trouvée, appel du service updateOrder');
        // Mettre à jour le statut
        const updatedOrder = await orderService.updateOrder(orderId, { status });

        console.log('[OrderController] [updateOrderStatus] Statut mis à jour avec succès', { orderId, newStatus: status });

        res.json({
            success: true,
            message: 'Statut de la commande mis à jour avec succès',
            data: updatedOrder
        });
    } catch (error) {
        console.log('[OrderController] [updateOrderStatus] Erreur attrapée', {
            error: error.message,
            stack: error.stack,
            orderId: req.params.id
        });
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
    console.log('[OrderController] [assignOrder] Début d assignation', {
        orderId: req.params.id,
        body: req.body,
        user: req.user
    });

    try {
        const orderId = parseInt(req.params.id);
        const { staff_id } = req.body;

        console.log('[OrderController] [assignOrder] Paramètres reçus', { orderId, staff_id });

        logger.info('[OrderController] [assignOrder] Assignation', {
            orderId,
            assignedTo: staff_id,
            requestingUser: req.user.id
        });

        if (!staff_id) {
            console.log('[OrderController] [assignOrder] assigned_to manquant');
            return res.status(400).json({
                success: false,
                error: "L'ID de l'assigné est requis"
            });
        }

        // Vérifier que la commande existe
        console.log('[OrderController] [assignOrder] Vérification existence commande');
        const order = await orderService.findById(orderId);
        if (!order) {
            console.log('[OrderController] [assignOrder] Commande non trouvée', { orderId });
            return res.status(404).json({
                success: false,
                error: 'Commande non trouvée'
            });
        }

        console.log('[OrderController] [assignOrder] Commande trouvée, appel du service updateOrder');
        // Mettre à jour l'assignation
        console.log('[OrderController] [assignOrder] Mise à jour de la commande', { orderId, staff_id });

        const assigned_to = staff_id
        const updatedOrder = await orderService.updateOrder(orderId, {
            assigned_to,
            status: 'assigned'
        });

        console.log('[OrderController] [assignOrder] Commande assignée avec succès', { orderId, staff_id });

        res.json({
            success: true,
            message: 'Commande assignée avec succès',
            data: updatedOrder
        });
    } catch (error) {
        console.log('[OrderController] [assignOrder] Erreur attrapée', {
            error: error.message,
            stack: error.stack,
            orderId: req.params.id
        });
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
