const db = require('../config/database');

const create = async (operatorData) => {
    try {
        const [result] = await db.execute(
            'INSERT INTO operators (name, code, prefixes) VALUES (?, ?, ?)',
            [operatorData.name, operatorData.code, operatorData.prefixes]
        );
        return findById(result.insertId);
    } catch (error) {
        console.error('Erreur de creation:', error);
        throw error;
    }
};

const findById = async (operatorId) => {
    try {
        const [rows] = await db.execute('SELECT * FROM operators WHERE id = ?', [operatorId]);
        return rows[0] || null;
    } catch (error) {
        console.error('Erreur findById:', error);
        throw error;
    }
};

const findAll = async () => {
    try {
        const [rows] = await db.execute('SELECT * FROM operators');
        return rows;
    } catch (error) {
        console.error('Erreur findAll:', error);
        throw error;
    }
};

const update = async (operatorId, operatorData) => {
    try {
        const [result] = await db.execute(
            'UPDATE operators SET name = ?, code = ?, prefixes = ? WHERE id = ?',
            [operatorData.name, operatorData.code, operatorData.prefixes, operatorId]
        );
        return findById(operatorId);
    } catch (error) {
        console.error('Erreur de mise à jour:', error);
        throw error;
    }
};

const deleteById = async (operatorId) => {
    try {
        const [result] = await db.execute('DELETE FROM operators WHERE id = ?', [operatorId]);
        return result.affectedRows > 0;
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            throw new Error('Impossible de supprimer ce opérateur car il est utilisé dans des commandes');
        }
        
        console.error('Erreur de suppression:', error);
        throw error;
    }
};

module.exports = {
    create,
    findById,
    findAll,
    update,
    deleteById
};

