const operatorsService = require('../services/operatorsService');
const { authenticateToken, requireRole } = require('../middlewares/auth');

const getAllOperators = async (req, res) => {
    try {
        const operators = await operatorsService.findAll();
        res.json(operators);
    } catch (error) {
        console.error('Erreur getAllOperators:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des operateurs' });
    }
};

const createOperator = async (req, res) => {
    try {
        const { name, code, prefixes } = req.body;

        // Validation des données d'entrée
        if (!name || !code || !prefixes) {
            return res.status(400).json({ error: 'Nom, code et prefixes sont requis' });
        }

        // Création de l'operateur
        const operator = await operatorsService.create({ name, code, prefixes });

        res.status(201).json({
            success: true,
            message: 'Operateur créé avec succès',
            data: operator
        });
    } catch (error) {
        console.error('Erreur createOperator:', error);
        res.status(500).json({ error: 'Erreur lors de la création de l\'operateur' });
    }
};

const updateOperator = async (req, res) => {
    authenticateToken(req, res, () => {
        requireRole(['admin', 'staff'])(req, res, async () => {
            try {
                const { id } = req.params;
                const { name, code, prefixes } = req.body;
        
                // Validation des données d'entrée
                if (!id) {
                    return res.status(400).json({ error: 'ID est requis' });
                }
                if(!name){
                    return res.status(400).json({ error: 'Nom est requis' });
                }
                if(!code){
                    return res.status(400).json({ error: 'Code est requis' });
                }
                if(!prefixes){
                    return res.status(400).json({ error: 'Prefixes sont requis' });
                }
        
                // Vérification de l'existence de l'operateur
                const operator = await operatorsService.findById(id);
                if (!operator) {
                    return res.status(404).json({ error: 'Operateur non trouvé' });
                }
        
                // Mise à jour de l'operateur
                const updatedOperator = await operatorsService.update(id, { name, code, prefixes });
        
                res.status(200).json({
                    success: true,
                    message: 'Operateur mis à jour avec succès',
                    data: updatedOperator
                });
            } catch (error) {
                console.error('Erreur updateOperator:', error);
                res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'operateur' });
            }
            
        });
    });

};

const deleteOperator = async (req, res) => {
    authenticateToken(req, res, () => {
        requireRole(['admin', 'staff'])(req, res, async () => {
            try {
                const { id } = req.params;
        
                // Vérification de l'existence de l'operateur
                const operator = await operatorsService.findById(id);
                if (!operator) {
                    return res.status(404).json({ error: 'Operateur non trouvé' });
                }
        
                // Suppression de l'operateur
                const deletedOperator = await operatorsService.deleteById(id);
        
                res.status(200).json({
                    success: true,
                    message: 'Operateur supprimé avec succès',
                    data: deletedOperator
                });
            } catch (error) {
                console.error('Erreur deleteOperator:', error);
                res.status(500).json({ error: 'Erreur lors de la suppression de l\'operateur' });
            }
            
        });
    });

};

module.exports = {
    getAllOperators,
    createOperator,
    updateOperator,
    deleteOperator
};
