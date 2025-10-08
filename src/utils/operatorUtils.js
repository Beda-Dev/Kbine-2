const db = require('../config/database');

/**
 * Récupère tous les préfixes des opérateurs
 * @returns {Promise<Array>} Tableau de tous les préfixes uniques
 */
const getAllPrefixes = async () => {
    try {
        const [operators] = await db.execute('SELECT prefixes FROM operators');
        
        // Extraire tous les préfixes de tous les opérateurs
        const allPrefixes = operators.reduce((acc, operator) => {
            try {
                const prefixes = JSON.parse(operator.prefixes);
                return [...acc, ...prefixes];
            } catch (e) {
                console.error('Erreur lors du parsing des préfixes:', e);
                return acc;
            }
        }, []);
        
        // Supprimer les doublons et retourner
        return [...new Set(allPrefixes)];
    } catch (error) {
        console.error('Erreur lors de la récupération des préfixes:', error);
        throw new Error('Impossible de récupérer les préfixes des opérateurs');
    }
};

/**
 * Vérifie si un numéro commence par un préfixe valide
 * @param {string} phoneNumber - Numéro de téléphone à vérifier
 * @returns {Promise<boolean>} True si le numéro est valide
 */
const isValidPhoneNumber = async (phoneNumber) => {
    // Nettoyer le numéro (supprimer les espaces, tirets, etc.)
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    
    // Si le numéro commence par 225 (indicatif Côte d'Ivoire), on le supprime
    const localNumber = cleanedNumber.startsWith('225') 
        ? cleanedNumber.substring(3) 
        : cleanedNumber;
    
    // Récupérer tous les préfixes
    const prefixes = await getAllPrefixes();
    
    // Vérifier si le numéro commence par l'un des préfixes
    return prefixes.some(prefix => localNumber.startsWith(prefix));
};

/**
 * Récupère l'opérateur d'un numéro de téléphone
 * @param {string} phoneNumber - Numéro de téléphone
 * @returns {Promise<Object|null>} L'opérateur ou null si non trouvé
 */
const getOperatorByPhoneNumber = async (phoneNumber) => {
    try {
        // Nettoyer le numéro (supprimer les espaces, tirets, etc.)
        const cleanedNumber = phoneNumber.replace(/\D/g, '');
        
        // Si le numéro commence par 225 (indicatif Côte d'Ivoire), on le supprime
        const localNumber = cleanedNumber.startsWith('225') 
            ? cleanedNumber.substring(3) 
            : cleanedNumber;
        
        // Récupérer tous les opérateurs avec leurs préfixes
        const [operators] = await db.execute('SELECT id, name, code, prefixes FROM operators');
        
        // Trouver l'opérateur dont un des préfixes correspond au numéro
        for (const operator of operators) {
            try {
                let prefixes = [];
                
                // Gestion des différents formats de préfixes
                if (typeof operator.prefixes === 'string') {
                    try {
                        // Essayer de parser comme JSON
                        if (operator.prefixes.trim().startsWith('[')) {
                            prefixes = JSON.parse(operator.prefixes);
                        } 
                        // Si c'est une chaîne simple avec des virgules
                        else if (operator.prefixes.includes(',')) {
                            prefixes = operator.prefixes.split(',').map(p => p.trim());
                        }
                        // Si c'est un seul préfixe
                        else {
                            prefixes = [operator.prefixes.trim()];
                        }
                    } catch (e) {
                        console.warn(`Format de préfixe inattendu pour l'opérateur ${operator.name}:`, operator.prefixes);
                        // Essayer de récupérer le préfixe directement
                        prefixes = [String(operator.prefixes).trim()];
                    }
                } 
                // Si c'est déjà un tableau
                else if (Array.isArray(operator.prefixes)) {
                    prefixes = operator.prefixes;
                }
                // Si c'est un nombre
                else if (typeof operator.prefixes === 'number') {
                    prefixes = [String(operator.prefixes)];
                }

                // Vérifier si le numéro commence par un des préfixes
                if (prefixes.some(prefix => localNumber.startsWith(String(prefix)))) {
                    return {
                        id: operator.id,
                        name: operator.name,
                        code: operator.code
                    };
                }
            } catch (e) {
                console.error('Erreur lors du traitement des préfixes:', e, 'Préfixes:', operator.prefixes);
                continue;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Erreur lors de la recherche de l\'opérateur:', error);
        throw new Error('Erreur lors de la recherche de l\'opérateur');
    }
};

module.exports = {
    getAllPrefixes,
    isValidPhoneNumber,
    getOperatorByPhoneNumber
};
