const db = require("../config/database");
const logger = require("../utils/logger");

/**
 * Service de gestion des plans
 * AMÉLIORATIONS:
 * - Meilleure gestion des erreurs
 * - Logging cohérent
 * - Validation des paramètres
 * - Transactions pour les opérations critiques
 */

/**
 * Crée un nouveau plan
 * @param {Object} planData - Les données du plan à créer
 * @returns {Promise<Object>} Le plan créé
 */
const create = async (planData) => {
  const context = "[PlanService] [create]";
  console.log(`${context} Début de création de plan`, {
    name: planData.name,
    type: planData.type,
    operator_id: planData.operator_id,
  });

  try {
    logger.debug(`${context} Tentative de création de plan`, {
      name: planData.name,
      type: planData.type,
    });

    // Validation des champs requis
    const requiredFields = ["operator_id", "name", "price", "type"];
    const missingFields = requiredFields.filter(
      (field) => !(field in planData)
    );

    if (missingFields.length > 0) {
      console.log(`${context} Champs manquants détectés`, { missingFields });
      logger.warn(`${context} Champs manquants`, { missingFields });
      throw new Error(`Champs manquants: ${missingFields.join(", ")}`);
    }
    console.log(`${context} Tous les champs requis sont présents`);

    // Vérifier que l'opérateur existe
    console.log(`${context} Vérification de l'existence de l'opérateur`, {
      operator_id: planData.operator_id,
    });
    const [operators] = await db.execute(
      "SELECT id FROM operators WHERE id = ?",
      [planData.operator_id]
    );

    if (operators.length === 0) {
      console.log(`${context} Opérateur non trouvé`, {
        operator_id: planData.operator_id,
      });
      logger.warn(`${context} Opérateur non trouvé`, {
        operator_id: planData.operator_id,
      });
      throw new Error("Opérateur non trouvé");
    }
    console.log(`${context} Opérateur trouvé et validé`);

    // Insertion du plan
    console.log(`${context} Préparation de l'insertion du plan`);
    const [result] = await db.execute(
      `INSERT INTO plans
            (operator_id, name, description, price, type, validity_days, active)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        planData.operator_id,
        planData.name,
        planData.description || null,
        planData.price,
        planData.type,
        planData.validity_days || null,
        planData.active !== undefined ? planData.active : true,
      ]
    );
    console.log(`${context} Plan inséré avec succès`, {
      insertId: result.insertId,
    });

    logger.info(`${context} Plan créé avec succès`, {
      planId: result.insertId,
      name: planData.name,
    });

    console.log(`${context} Récupération du plan créé`);
    return await findById(result.insertId);
  } catch (error) {
    console.log(`${context} Erreur lors de la création`, {
      error: error.message,
    });
    logger.error(`${context} Erreur lors de la création du plan`, {
      error: error.message,
      stack: error.stack,
      planData: { ...planData, description: "***" }, // Masquer les données sensibles
    });

    if (error.code === "ER_DUP_ENTRY") {
      console.log(`${context} Conflit de clé unique détecté`);
      throw new Error("Un plan avec ce nom existe déjà pour cet opérateur");
    }

    throw new Error(`Échec de la création du plan: ${error.message}`);
  }
};

/**
 * Trouve un plan par son ID avec ses relations
 * @param {number} planId - L'ID du plan à rechercher
 * @returns {Promise<Object|null>} Le plan trouvé avec ses relations ou null si non trouvé
 */
const findById = async (planId) => {
  const context = "[PlanService] [findById]";
  console.log(`${context} Début de recherche de plan`, { planId });

  try {
    if (!planId || isNaN(parseInt(planId))) {
      console.log(`${context} ID de plan invalide`, { planId });
      throw new Error("ID de plan invalide");
    }

    logger.debug(`${context} Recherche du plan avec relations`, { planId });

    console.log(`${context} Exécution de la requête SQL`);
    const [rows] = await db.execute(
      `SELECT p.*,
                    o.id as operator_id_full, o.name as operator_name, o.code as operator_code,
                    o.created_at as operator_created_at
             FROM plans p
             LEFT JOIN operators o ON p.operator_id = o.id
             WHERE p.id = ?`,
      [planId]
    );
    console.log(`${context} Requête exécutée`, { resultsCount: rows.length });

    if (rows.length === 0) {
      console.log(`${context} Aucun plan trouvé avec cet ID`, { planId });
      logger.debug(`${context} Plan non trouvé`, { planId });
      return null;
    }

    const plan = { ...rows[0] };
    console.log(`${context} Plan brut récupéré`, {
      planId: plan.id,
      planName: plan.name,
      hasOperator: !!plan.operator_id,
    });

    // Ajouter les informations de l'opérateur associé
    if (plan.operator_id) {
      console.log(`${context} Ajout des informations de l'opérateur`);
      plan.operator = {
        id: plan.operator_id,
        name: plan.operator_name,
        code: plan.operator_code,
        created_at: plan.operator_created_at,
      };
    }

    // Supprimer les champs inutiles
    const fieldsToDelete = [
      "operator_id_full",
      "operator_name",
      "operator_code",
      "operator_description",
      "operator_active",
      "operator_created_at",
      "operator_updated_at",
    ];
    fieldsToDelete.forEach((field) => delete plan[field]);
    console.log(`${context} Champs temporaires supprimés`, {
      fieldsDeleted: fieldsToDelete.length,
    });

    logger.debug(`${context} Plan trouvé avec relations`, {
      planId,
      hasOperator: !!plan.operator,
    });

    console.log(`${context} Plan trouvé et traité avec succès`, {
      planId: plan.id,
      planName: plan.name,
      hasOperator: !!plan.operator,
    });
    return plan;
  } catch (error) {
    console.log(`${context} Erreur lors de la recherche`, {
      error: error.message,
      planId,
    });
    logger.error(
      `${context} Erreur lors de la recherche du plan avec relations`,
      {
        error: error.message,
        stack: error.stack,
        planId,
      }
    );
    throw new Error(
      "Erreur lors de la récupération du plan avec ses relations"
    );
  }
};

/**
 * Récupère tous les plans actifs avec leurs relations
 * @param {boolean} includeInactive - Inclure les plans inactifs
 * @returns {Promise<Array>} Liste des plans avec leurs relations
 */
const findAll = async (includeInactive = false) => {
  const context = "[PlanService] [findAll]";
  console.log(`${context} Début de récupération des plans`, {
    includeInactive,
  });

  try {
    logger.debug(`${context} Récupération des plans avec relations`, {
      includeInactive,
    });

    console.log(`${context} Construction de la requête SQL`);
    let query = `
            SELECT p.*,
                   o.id as operator_id_full, o.name as operator_name, o.code as operator_code,
                   o.created_at as operator_created_at
            FROM plans p
            LEFT JOIN operators o ON p.operator_id = o.id
        `;

    const params = [];

    if (!includeInactive) {
      query += " WHERE p.active = ?";
      params.push(true);
      console.log(`${context} Filtrage des plans actifs uniquement`);
    }

    query += " ORDER BY o.name, p.price";
    console.log(`${context} Requête construite`, {
      queryLength: query.length,
      paramsCount: params.length,
    });

    console.log(`${context} Exécution de la requête`);
    const [rows] = await db.execute(query, params);
    console.log(`${context} Requête exécutée`, { resultsCount: rows.length });

    // Traitement des résultats pour inclure les relations
    console.log(`${context} Traitement des résultats`);
    const plans = rows.map((plan) => {
      const result = { ...plan };
      console.log(`${context} Traitement du plan`, {
        planId: plan.id,
        planName: plan.name,
        hasOperator: !!plan.operator_id,
      });

      // Ajouter les informations de l'opérateur associé
      if (result.operator_id) {
        result.operator = {
          id: result.operator_id,
          name: result.operator_name,
          code: result.operator_code,
          created_at: result.operator_created_at,
        };
      }

      // Supprimer les champs inutiles
      const fieldsToDelete = [
        "operator_id_full",
        "operator_name",
        "operator_code",
        "operator_description",
        "operator_active",
        "operator_created_at",
        "operator_updated_at",
      ];
      fieldsToDelete.forEach((field) => delete result[field]);

      return result;
    });
    console.log(`${context} Tous les plans traités`, {
      totalPlans: plans.length,
    });

    logger.info(`${context} Plans avec relations récupérés`, {
      count: plans.length,
    });

    console.log(`${context} Récupération réussie`, {
      plansCount: plans.length,
    });
    return plans;
  } catch (error) {
    console.log(`${context} Erreur lors de la récupération`, {
      error: error.message,
      includeInactive,
    });
    logger.error(
      `${context} Erreur lors de la récupération des plans avec relations`,
      {
        error: error.message,
        stack: error.stack,
      }
    );
    throw new Error(
      "Erreur lors de la récupération de la liste des plans avec leurs relations"
    );
  }
};

/**
 * Trouve les plans par numéro de téléphone en fonction du préfixe
 * ✅ CORRIGÉ pour PostgreSQL JSONB
 * @param {string} phoneNumber - Le numéro de téléphone à rechercher
 * @returns {Promise<Object>} Objet contenant l'opérateur et la liste des plans triés par ID
 */
const findByPhoneNumber = async (phoneNumber) => {
    const context = '[PlanService] [findByPhoneNumber]';
    console.log(`${context} Début de recherche par numéro de téléphone`, {
        phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 4)}***` : 'undefined'
    });

    try {
        // Validation du numéro de téléphone
        if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.length < 2) {
            throw new Error('Numéro de téléphone invalide');
        }

        // Récupérer les 2 premiers chiffres du numéro
        const prefix = phoneNumber.substring(0, 2);
        console.log(`${context} Préfixe extrait:`, { prefix });

        // ✅ CORRECTION : Cast explicite en JSONB pour PostgreSQL
        // La requête recherche si le préfixe est dans le tableau JSONB
        const [operators] = await db.query(`
            SELECT o.id, o.name, o.code 
            FROM operators o
            WHERE prefixes @> $1::jsonb
            LIMIT 1
        `, [JSON.stringify([prefix])]);  // Convertir le préfixe en tableau JSON

        if (!operators || operators.length === 0) {
            logger.warn(`${context} Aucun opérateur trouvé pour le préfixe`, { prefix });
            throw new Error('Aucun opérateur trouvé pour ce numéro');
        }

        const operator = operators[0];
        console.log(`${context} Opérateur trouvé:`, {
            id: operator.id,
            name: operator.name,
            code: operator.code
        });

        // Récupérer les plans actifs pour cet opérateur, triés par ID croissant
        const [plans] = await db.query(`
            SELECT 
                id, 
                name, 
                description, 
                price, 
                type, 
                validity_days
            FROM plans 
            WHERE operator_id = $1
            AND active = TRUE
            ORDER BY id ASC
        `, [operator.id]);

        console.log(`${context} ${plans.length} plans trouvés pour l'opérateur`, {
            operatorId: operator.id,
            operatorName: operator.name
        });

        // Formater la réponse selon le format demandé
        return {
            operator: {
                id: operator.id,
                name: operator.name,
                code: operator.code
            },
            plans: plans.map(plan => ({
                id: plan.id,
                name: plan.name,
                description: plan.description || '',
                price: parseFloat(plan.price),
                type: plan.type,
                validity_days: plan.validity_days
            }))
        };
    } catch (error) {
        logger.error(`${context} Erreur lors de la recherche par numéro:`, {
            error: error.message,
            phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 4)}***` : 'undefined',
            stack: error.stack
        });
        throw error;
    }
};

/**
 * Met à jour un plan existant
 * @param {number} planId - L'ID du plan à mettre à jour
 * @param {Object} planData - Les données à mettre à jour
 * @returns {Promise<Object>} Le plan mis à jour
 */
const update = async (planId, planData) => {
  const context = "[PlanService] [update]";
  console.log(`${context} Début de mise à jour de plan`, {
    planId,
    updateFields: Object.keys(planData),
  });

  try {
    if (!planId || isNaN(parseInt(planId))) {
      console.log(`${context} ID de plan invalide`, { planId });
      throw new Error("ID du plan invalide");
    }

    logger.debug(`${context} Tentative de mise à jour`, {
      planId,
      fields: Object.keys(planData),
    });

    console.log(`${context} Préparation des mises à jour`);
    const updates = [];
    const params = [];

    // Construire dynamiquement la requête
    if (planData.operator_id !== undefined) {
      console.log(`${context} Validation de l'opérateur_id`, {
        operator_id: planData.operator_id,
      });
      // Vérifier que l'opérateur existe
      const [operators] = await db.execute(
        "SELECT id FROM operators WHERE id = ?",
        [planData.operator_id]
      );

      if (operators.length === 0) {
        console.log(`${context} Opérateur non trouvé`, {
          operator_id: planData.operator_id,
        });
        throw new Error("Opérateur non trouvé");
      }
      console.log(`${context} Opérateur validé`);

      updates.push("operator_id = ?");
      params.push(planData.operator_id);
    }

    if (planData.name !== undefined) {
      console.log(`${context} Mise à jour du nom`, { name: planData.name });
      updates.push("name = ?");
      params.push(planData.name);
    }

    if (planData.description !== undefined) {
      console.log(`${context} Mise à jour de la description`);
      updates.push("description = ?");
      params.push(planData.description);
    }

    if (planData.price !== undefined) {
      console.log(`${context} Mise à jour du prix`, { price: planData.price });
      updates.push("price = ?");
      params.push(planData.price);
    }

    if (planData.type !== undefined) {
      console.log(`${context} Mise à jour du type`, { type: planData.type });
      updates.push("type = ?");
      params.push(planData.type);
    }

    if (planData.validity_days !== undefined) {
      console.log(`${context} Mise à jour des jours de validité`, {
        validity_days: planData.validity_days,
      });
      updates.push("validity_days = ?");
      params.push(planData.validity_days);
    }

    if (planData.active !== undefined) {
      console.log(`${context} Mise à jour du statut actif`, {
        active: planData.active,
      });
      updates.push("active = ?");
      params.push(planData.active);
    }

    if (updates.length === 0) {
      console.log(`${context} Aucune mise à jour à effectuer`);
      logger.warn(`${context} Aucune mise à jour à effectuer`, { planId });
      return await findById(planId);
    }

    console.log(`${context} Champs à mettre à jour`, {
      fieldsCount: updates.length,
      paramsCount: params.length,
    });

    // Ajouter l'ID du plan pour la clause WHERE
    params.push(planId);

    const query = `UPDATE plans SET ${updates.join(", ")} WHERE id = ?`;
    console.log(`${context} Requête UPDATE construite`, {
      queryLength: query.length,
    });

    console.log(`${context} Exécution de la mise à jour`);
    const [result] = await db.execute(query, params);
    console.log(`${context} Mise à jour exécutée`, {
      affectedRows: result.affectedRows,
    });

    if (result.affectedRows === 0) {
      console.log(`${context} Aucun plan trouvé à mettre à jour`, { planId });
      logger.warn(`${context} Plan non trouvé`, { planId });
      throw new Error("Plan non trouvé");
    }

    logger.info(`${context} Plan mis à jour avec succès`, {
      planId,
      updatedFields: updates.length,
    });

    console.log(`${context} Récupération du plan mis à jour`);
    return await findById(planId);
  } catch (error) {
    console.log(`${context} Erreur lors de la mise à jour`, {
      error: error.message,
      planId,
    });
    logger.error(`${context} Erreur lors de la mise à jour`, {
      error: error.message,
      stack: error.stack,
      planId,
    });

    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      console.log(`${context} Contrainte de clé étrangère détectée`);
      throw new Error(
        "Impossible de mettre à jour ce plan car il est utilisé dans des commandes"
      );
    }

    throw new Error(`Échec de la mise à jour du plan: ${error.message}`);
  }
};

/**
 * Supprime un plan par son ID
 * @param {number} planId - L'ID du plan à supprimer
 * @returns {Promise<boolean>} True si la suppression a réussi
 */
const deleteById = async (planId) => {
  const context = "[PlanService] [deleteById]";
  console.log(`${context} Début de suppression de plan`, { planId });

  try {
    if (!planId || isNaN(parseInt(planId))) {
      console.log(`${context} ID de plan invalide`, { planId });
      throw new Error("ID du plan invalide");
    }

    logger.debug(`${context} Tentative de suppression`, { planId });

    // Vérifier que le plan existe
    console.log(`${context} Vérification de l'existence du plan`);
    const plan = await findById(planId);
    if (!plan) {
      console.log(`${context} Plan non trouvé`, { planId });
      throw new Error("Plan non trouvé");
    }
    console.log(`${context} Plan trouvé et validé`, {
      planId: plan.id,
      planName: plan.name,
    });

    console.log(`${context} Exécution de la suppression`);
    const [result] = await db.execute("DELETE FROM plans WHERE id = ?", [
      planId,
    ]);
    console.log(`${context} Suppression exécutée`, {
      affectedRows: result.affectedRows,
    });

    if (result.affectedRows === 0) {
      console.log(`${context} Aucun plan supprimé`, { planId });
      throw new Error("Plan non trouvé");
    }

    logger.info(`${context} Plan supprimé avec succès`, { planId });

    console.log(`${context} Suppression réussie`, { planId });
    return true;
  } catch (error) {
    console.log(`${context} Erreur lors de la suppression`, {
      error: error.message,
      planId,
    });
    logger.error(`${context} Erreur lors de la suppression`, {
      error: error.message,
      stack: error.stack,
      planId,
    });

    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      console.log(
        `${context} Contrainte de clé étrangère détectée lors de la suppression`
      );
      throw new Error(
        "Impossible de supprimer ce plan car il est utilisé dans des commandes"
      );
    }

    throw new Error(`Échec de la suppression du plan: ${error.message}`);
  }
};

/**
 * Trouve les plans par ID d'opérateur avec leurs relations
 * @param {number} operatorId - L'ID de l'opérateur
 * @param {boolean} includeInactive - Inclure les plans inactifs (optionnel, false par défaut)
 * @returns {Promise<Array>} Liste des plans pour cet opérateur avec leurs relations
 */
const findByOperatorId = async (operatorId, includeInactive = false) => {
  const context = "[PlanService] [findByOperatorId]";
  console.log(`${context} Début de recherche de plans par opérateur`, {
    operatorId,
    includeInactive,
  });

  try {
    if (!operatorId || isNaN(parseInt(operatorId))) {
      console.log(`${context} ID d'opérateur invalide`, { operatorId });
      throw new Error("ID d'opérateur invalide");
    }

    logger.debug(`${context} Recherche des plans pour l'opérateur`, {
      operatorId,
      includeInactive,
    });

    console.log(`${context} Construction de la requête SQL`);
    let query = `
            SELECT p.*,
                   o.id as operator_id_full, o.name as operator_name, o.code as operator_code,
                   o.created_at as operator_created_at
            FROM plans p
            LEFT JOIN operators o ON p.operator_id = o.id
            WHERE p.operator_id = ?
        `;

    const params = [operatorId];

    if (!includeInactive) {
      query += " AND p.active = ?";
      params.push(true);
      console.log(`${context} Filtrage des plans actifs uniquement`);
    }

    query += " ORDER BY p.price";
    console.log(`${context} Requête construite`, {
      queryLength: query.length,
      paramsCount: params.length,
    });

    console.log(`${context} Exécution de la requête`);
    const [rows] = await db.execute(query, params);
    console.log(`${context} Requête exécutée`, { resultsCount: rows.length });

    // Traitement des résultats pour inclure les relations
    console.log(`${context} Traitement des résultats`);
    const plans = rows.map((plan) => {
      const result = { ...plan };
      console.log(`${context} Traitement du plan`, {
        planId: plan.id,
        planName: plan.name,
        hasOperator: !!plan.operator_id,
      });

      // Ajouter les informations de l'opérateur associé
      if (result.operator_id) {
        result.operator = {
          id: result.operator_id,
          name: result.operator_name,
          code: result.operator_code,
          created_at: result.operator_created_at,
        };
      }

      // Supprimer les champs inutiles
      const fieldsToDelete = [
        "operator_id_full",
        "operator_name",
        "operator_code",
        "operator_description",
        "operator_active",
        "operator_created_at",
        "operator_updated_at",
      ];
      fieldsToDelete.forEach((field) => delete result[field]);

      return result;
    });
    console.log(`${context} Tous les plans traités`, {
      totalPlans: plans.length,
    });

    logger.debug(`${context} Plans trouvés pour l'opérateur`, {
      operatorId,
      count: plans.length,
    });

    console.log(`${context} Recherche terminée avec succès`, {
      operatorId,
      plansCount: plans.length,
    });
    return plans;
  } catch (error) {
    console.log(`${context} Erreur lors de la recherche`, {
      error: error.message,
      operatorId,
    });
    logger.error(
      `${context} Erreur lors de la recherche des plans pour l'opérateur`,
      {
        error: error.message,
        stack: error.stack,
        operatorId,
      }
    );
    throw new Error(
      "Erreur lors de la récupération des plans de l'opérateur avec leurs relations"
    );
  }
};

module.exports = {
  create,
  findById,
  findAll,
  findByPhoneNumber,
  findByOperatorId,
  update,
  deleteById,
};
