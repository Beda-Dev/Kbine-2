const db = require("../config/database");
const logger = require("../utils/logger");

/**
 * Service de gestion des plans
 * VERSION CORRIGÉE POUR POSTGRESQL
 */

/**
 * Crée un nouveau plan
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

    // Vérifier que l'opérateur existe
    console.log(`${context} Vérification de l'existence de l'opérateur`, {
      operator_id: planData.operator_id,
    });
    const [operators] = await db.execute(
      "SELECT id FROM operators WHERE id = $1",
      [planData.operator_id]
    );

    if (operators.length === 0) {
      console.log(`${context} Opérateur non trouvé`, {
        operator_id: planData.operator_id,
      });
      throw new Error("Opérateur non trouvé");
    }

    // Insertion du plan
    console.log(`${context} Préparation de l'insertion du plan`);
    const [result] = await db.execute(
      `INSERT INTO plans
            (operator_id, name, description, price, type, validity_days, active)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id`,
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
    
    const insertId = result[0].id;
    console.log(`${context} Plan inséré avec succès`, { insertId });

    logger.info(`${context} Plan créé avec succès`, {
      planId: insertId,
      name: planData.name,
    });

    console.log(`${context} Récupération du plan créé`);
    return await findById(insertId);
  } catch (error) {
    console.log(`${context} Erreur lors de la création`, {
      error: error.message,
    });
    logger.error(`${context} Erreur lors de la création du plan`, {
      error: error.message,
      stack: error.stack,
    });

    if (error.code === '23505') { // PostgreSQL unique violation
      throw new Error("Un plan avec ce nom existe déjà pour cet opérateur");
    }

    throw new Error(`Échec de la création du plan: ${error.message}`);
  }
};

/**
 * Trouve un plan par son ID avec ses relations
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
             WHERE p.id = $1`,
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
      "operator_created_at",
    ];
    fieldsToDelete.forEach((field) => delete plan[field]);

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
      query += " WHERE p.active = $1";
      params.push(true);
    }

    query += " ORDER BY o.name, p.price";

    console.log(`${context} Exécution de la requête`);
    const [rows] = await db.execute(query, params);
    console.log(`${context} Requête exécutée`, { resultsCount: rows.length });

    // Traitement des résultats
    const plans = rows.map((plan) => {
      const result = { ...plan };

      if (result.operator_id) {
        result.operator = {
          id: result.operator_id,
          name: result.operator_name,
          code: result.operator_code,
          created_at: result.operator_created_at,
        };
      }

      const fieldsToDelete = [
        "operator_id_full",
        "operator_name",
        "operator_code",
        "operator_created_at",
      ];
      fieldsToDelete.forEach((field) => delete result[field]);

      return result;
    });

    logger.info(`${context} Plans avec relations récupérés`, {
      count: plans.length,
    });

    return plans;
  } catch (error) {
    console.log(`${context} Erreur lors de la récupération`, {
      error: error.message,
    });
    logger.error(
      `${context} Erreur lors de la récupération des plans avec relations`,
      {
        error: error.message,
        stack: error.stack,
      }
    );
    throw new Error(
      "Erreur lors de la récupération de la liste des plans"
    );
  }
};

/**
 * Trouve les plans par numéro de téléphone
 */
const findByPhoneNumber = async (phoneNumber) => {
    const context = '[PlanService] [findByPhoneNumber]';
    console.log(`${context} Début de recherche par numéro de téléphone`, {
        phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 4)}***` : 'undefined'
    });

    try {
        if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.length < 2) {
            throw new Error('Numéro de téléphone invalide');
        }

        const prefix = phoneNumber.substring(0, 2);
        console.log(`${context} Préfixe extrait:`, { prefix });

        const [operators] = await db.query(`
            SELECT o.id, o.name, o.code 
            FROM operators o
            WHERE prefixes @> $1::jsonb
            LIMIT 1
        `, [JSON.stringify([prefix])]);

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

        console.log(`${context} ${plans.length} plans trouvés`);

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
        logger.error(`${context} Erreur:`, {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
};

/**
 * Met à jour un plan existant
 */
/**
 * Met à jour un plan existant
 */
const update = async (planId, planData) => {
  const context = "[PlanService] [update]";
  console.log(`${context} Début de mise à jour de plan`, {
    planId,
    updateFields: Object.keys(planData),
  });

  try {
    if (!planId || isNaN(parseInt(planId))) {
      throw new Error("ID du plan invalide");
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    // Vérifier l'existence de l'opérateur si operator_id est fourni
    if (planData.operator_id !== undefined) {
      const [operators] = await db.execute(
        "SELECT id FROM operators WHERE id = $1",
        [planData.operator_id]
      );

      if (operators.length === 0) {
        throw new Error("Opérateur non trouvé");
      }

      updates.push(`operator_id = $${paramIndex++}`);
      params.push(planData.operator_id);
    }

    if (planData.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(planData.name);
    }

    if (planData.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(planData.description);
    }

    if (planData.price !== undefined) {
      updates.push(`price = $${paramIndex++}`);
      params.push(planData.price);
    }

    if (planData.type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      params.push(planData.type);
    }

    if (planData.validity_days !== undefined) {
      updates.push(`validity_days = $${paramIndex++}`);
      params.push(planData.validity_days);
    }

    if (planData.active !== undefined) {
      updates.push(`active = $${paramIndex++}`);
      params.push(planData.active);
    }

    if (updates.length === 0) {
      return await findById(planId);
    }

    params.push(planId);
    const query = `UPDATE plans SET ${updates.join(", ")} WHERE id = $${paramIndex}`;

    console.log(`${context} Exécution de la requête UPDATE`, { query, params });
    const [result] = await db.execute(query, params);

    // CORRECTION : Dans PostgreSQL, on vérifie rowCount au lieu de result.length
    console.log(`${context} Résultat de l'UPDATE`, { 
      rowCount: result.rowCount,
      hasRows: result.rows && result.rows.length > 0 
    });

    // Vérifier si des lignes ont été affectées
    if (result.rowCount === 0) {
      throw new Error("Plan non trouvé");
    }

    logger.info(`${context} Plan mis à jour avec succès`, { planId });

    return await findById(planId);
  } catch (error) {
    logger.error(`${context} Erreur lors de la mise à jour`, {
      error: error.message,
      planId,
    });

    if (error.code === '23503') {
      throw new Error("Impossible de mettre à jour ce plan");
    }

    throw new Error(`Échec de la mise à jour du plan: ${error.message}`);
  }
};

/**
 * Supprime un plan par son ID
 */
/**
 * Supprime un plan par son ID
 */
const deleteById = async (planId) => {
  const context = "[PlanService] [deleteById]";
  console.log(`${context} Début de suppression de plan`, { planId });

  try {
    if (!planId || isNaN(parseInt(planId))) {
      throw new Error("ID du plan invalide");
    }

    // Vérifier que le plan existe
    const plan = await findById(planId);
    if (!plan) {
      throw new Error("Plan non trouvé");
    }

    console.log(`${context} Exécution de la requête DELETE`);
    const [result] = await db.execute("DELETE FROM plans WHERE id = $1", [
      planId,
    ]);

    console.log(`${context} Résultat de la suppression`, { 
      rowCount: result.rowCount,
      hasRows: result.rows && result.rows.length > 0 
    });

    // CORRECTION : Vérifier rowCount au lieu de result.length
    if (result.rowCount === 0) {
      throw new Error("Aucune ligne supprimée - Plan non trouvé");
    }

    logger.info(`${context} Plan supprimé avec succès`, { planId });

    return true;
  } catch (error) {
    logger.error(`${context} Erreur lors de la suppression`, {
      error: error.message,
      planId,
    });

    if (error.code === '23503') {
      throw new Error(
        "Impossible de supprimer ce plan car il est utilisé dans des commandes"
      );
    }

    throw new Error(`Échec de la suppression du plan: ${error.message}`);
  }
};

/**
 * Trouve les plans par ID d'opérateur
 */
const findByOperatorId = async (operatorId, includeInactive = false) => {
  const context = "[PlanService] [findByOperatorId]";
  console.log(`${context} Début de recherche de plans par opérateur`, {
    operatorId,
    includeInactive,
  });

  try {
    if (!operatorId || isNaN(parseInt(operatorId))) {
      throw new Error("ID d'opérateur invalide");
    }

    let query = `
            SELECT p.*,
                   o.id as operator_id_full, o.name as operator_name, o.code as operator_code,
                   o.created_at as operator_created_at
            FROM plans p
            LEFT JOIN operators o ON p.operator_id = o.id
            WHERE p.operator_id = $1
        `;

    const params = [operatorId];

    if (!includeInactive) {
      query += " AND p.active = $2";
      params.push(true);
    }

    query += " ORDER BY p.price";

    const [rows] = await db.execute(query, params);

    const plans = rows.map((plan) => {
      const result = { ...plan };

      if (result.operator_id) {
        result.operator = {
          id: result.operator_id,
          name: result.operator_name,
          code: result.operator_code,
          created_at: result.operator_created_at,
        };
      }

      const fieldsToDelete = [
        "operator_id_full",
        "operator_name",
        "operator_code",
        "operator_created_at",
      ];
      fieldsToDelete.forEach((field) => delete result[field]);

      return result;
    });

    logger.debug(`${context} Plans trouvés pour l'opérateur`, {
      operatorId,
      count: plans.length,
    });

    return plans;
  } catch (error) {
    logger.error(
      `${context} Erreur lors de la recherche des plans pour l'opérateur`,
      {
        error: error.message,
        operatorId,
      }
    );
    throw new Error(
      "Erreur lors de la récupération des plans de l'opérateur"
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