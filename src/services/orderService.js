const db = require('../config/database');


const createOrder = async (orderData) => {
    try {
        const [result] = await db.execute(
            'INSERT INTO orders (user_id, plan_id, amount, status) VALUES (?, ?, ?, ?)',
            [orderData.user_id, orderData.plan_id, orderData.amount, orderData.status]
        );
        return await findById(result.insertId);
    } catch (error) {
        console.error('Erreur lors de la création de la commande:', error);
        throw new Error(`Échec de la création de la commande: ${error.message}`);
    }
}

const findById = async (orderId) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM orders WHERE id = ?',
            [orderId]
        );
        return rows[0] || null;
    } catch (error) {
        console.error(`Erreur lors de la recherche de la commande ${orderId}:`, error);
        throw new Error('Erreur lors de la récupération de la commande');
    }
}

const findAll = async (includeInactive = false) => {
    try {
        let query = 'SELECT * FROM orders';
        
        const params = [];
        
        if (!includeInactive) {
            query += ' WHERE active = ?';
            params.push(true);
        }
        
        query += ' ORDER BY name';
        
        const [rows] = await db.execute(query, params);
        return rows;
    } catch (error) {
        console.error('Erreur lors de la récupération des commandes:', error);
        throw new Error('Erreur lors de la récupération de la liste des commandes');
    }
}

const updateOrder = async (orderId, orderData) => {
    try {
        const [result] = await db.execute(
            'UPDATE orders SET user_id = ?, plan_id = ?, amount = ?, status = ? WHERE id = ?',
            [orderData.user_id, orderData.plan_id, orderData.amount, orderData.status, orderId]
        );
        
        if (result.affectedRows === 0) {
            throw new Error('Commande non trouvée');
        }
        
        return await findById(orderId);
    } catch (error) {
        console.error(`Erreur lors de la mise à jour de la commande ${orderId}:`, error);
        throw new Error(`Échec de la mise à jour de la commande: ${error.message}`);
    }
}

const deleteOrder = async (orderId) => {
    try {
        const [result] = await db.execute('DELETE FROM orders WHERE id = ?', [orderId]);
        
        if (result.affectedRows === 0) {
            throw new Error('Commande non trouvée');
        }
        
        return true;
    } catch (error) {
        console.error(`Erreur lors de la suppression de la commande ${orderId}:`, error);
        
        // Si la suppression échoue à cause d'une contrainte de clé étrangère
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            throw new Error('Impossible de supprimer cette commande car elle est utilisée dans des paiements');
        }
        
        throw new Error(`Échec de la suppression de la commande: ${error.message}`);
    }
}

module.exports = {
    createOrder,
    findById,
    findAll,
    updateOrder,
    deleteOrder
};



