# Documentation Complète de l'API Kbine Backend

## Table des Matières

1. [Informations Générales](#informations-générales)
2. [Authentification](#authentification)
3. [Utilisateurs](#utilisateurs)
4. [Opérateurs](#opérateurs)
5. [Plans / Forfaits](#plans--forfaits)
6. [Commandes](#commandes)
7. [Paiements](#paiements)
8. [Codes d'Erreur](#codes-derreur)
9. [Formats de Données](#formats-de-données)

---

## Informations Générales

### URL de Base

**Développement:** `http://localhost:3000/api`

**Production:** `https://votre-domaine.com/api`

### Format des Réponses

Toutes les réponses sont au format JSON avec encodage UTF-8.

### Headers Standards

```
Content-Type: application/json
Authorization: Bearer <token_jwt> (pour les routes protégées)
```

### Niveaux d'Accès

- **Public** : Accessible sans authentification
- **Client** : Authentification requise
- **Staff** : Rôle staff ou admin requis
- **Admin** : Rôle admin uniquement

---

## Authentification

### 1. Connexion / Inscription

**Endpoint:** `POST /api/auth/login`

**Description:** Authentifie un utilisateur par son numéro de téléphone. Crée automatiquement un compte client si l'utilisateur n'existe pas.

**Niveau d'accès:** Public

#### Données à Envoyer (JSON)

```json
{
  "phoneNumber": "0701020304"
}
```

#### Règles de Validation

- **phoneNumber** (string, requis):
  - Format: 10 chiffres commençant par un préfixe valide
  - Préfixes valides: Récupérés dynamiquement depuis la base de données
  - Exemples: `0701020304`, `0501020304`, `0101020304`

#### Réponse en Cas de Succès (200)

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "phoneNumber": "0701020304",
    "role": "client"
  }
}
```

#### Réponses d'Erreur

**400 - Données Invalides**
```json
{
  "error": "Donnees invalides",
  "details": "Le numéro doit commencer par l'un des préfixes valides (07, 05, 01) et contenir 10 chiffres au total"
}
```

**500 - Erreur Serveur**
```json
{
  "error": "Erreur serveur lors de la connexion",
  "details": "Description détaillée (en mode développement uniquement)"
}
```

---

### 2. Rafraîchir le Token

**Endpoint:** `POST /api/auth/refresh`

**Description:** Génère un nouveau token d'accès à partir d'un refresh token.

**Niveau d'accès:** Public (avec refresh token)

#### Données à Envoyer (JSON)

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Règles de Validation

- **refreshToken** (string, requis): Token de rafraîchissement valide

#### Réponse en Cas de Succès (200)

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "phoneNumber": "0701020304",
    "role": "client"
  }
}
```

#### Réponses d'Erreur

**400 - Token Manquant**
```json
{
  "error": "Refresh token requis"
}
```

**401 - Session Expirée**
```json
{
  "error": "Session expirée ou invalide"
}
```

---

### 3. Déconnexion

**Endpoint:** `POST /api/auth/logout`

**Description:** Déconnecte l'utilisateur et invalide ses sessions.

**Niveau d'accès:** Public

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Données à Envoyer (JSON) - Optionnel

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Réponse en Cas de Succès (200)

```json
{
  "message": "Déconnexion réussie"
}
```

---

## Utilisateurs

### 1. Obtenir le Profil de l'Utilisateur Connecté

**Endpoint:** `GET /api/users/profile`

**Description:** Récupère les informations du profil de l'utilisateur authentifié.

**Niveau d'accès:** Client

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Profil récupéré avec succès",
  "data": {
    "id": 1,
    "phone_number": "0701020304",
    "role": "client",
    "created_at": "2025-01-15T10:30:00.000Z",
    "updated_at": "2025-01-15T10:30:00.000Z"
  }
}
```

---

### 2. Liste de Tous les Utilisateurs

**Endpoint:** `GET /api/users`

**Description:** Récupère la liste de tous les utilisateurs (réservé aux administrateurs).

**Niveau d'accès:** Admin

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Liste des utilisateurs récupérée avec succès",
  "data": [
    {
      "id": 1,
      "phone_number": "0701020304",
      "role": "client",
      "created_at": "2025-01-15T10:30:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    },
    {
      "id": 2,
      "phone_number": "0501020304",
      "role": "staff",
      "created_at": "2025-01-14T09:20:00.000Z",
      "updated_at": "2025-01-14T09:20:00.000Z"
    }
  ],
  "count": 2
}
```

---

### 3. Obtenir un Utilisateur par ID

**Endpoint:** `GET /api/users/:id`

**Description:** Récupère les détails d'un utilisateur spécifique. Accessible aux administrateurs et à l'utilisateur lui-même.

**Niveau d'accès:** Client (pour son propre profil) / Admin (pour tous)

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Paramètres d'URL

- **id** (integer, requis): ID de l'utilisateur

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Utilisateur récupéré avec succès",
  "data": {
    "id": 1,
    "phone_number": "0701020304",
    "role": "client",
    "created_at": "2025-01-15T10:30:00.000Z",
    "updated_at": "2025-01-15T10:30:00.000Z"
  }
}
```

#### Réponses d'Erreur

**403 - Accès Non Autorisé**
```json
{
  "success": false,
  "error": "Accès non autorisé"
}
```

**404 - Utilisateur Non Trouvé**
```json
{
  "success": false,
  "error": "Utilisateur non trouvé"
}
```

---

### 4. Créer un Nouvel Utilisateur

**Endpoint:** `POST /api/users`

**Description:** Crée un nouvel utilisateur (réservé aux administrateurs).

**Niveau d'accès:** Admin

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Données à Envoyer (JSON)

```json
{
  "phone_number": "0701020304",
  "role": "client"
}
```

#### Règles de Validation

- **phone_number** (string, requis):
  - Pattern: `/^(\+?225)?0[0-9]{9}$/`
  - Format: 10 chiffres commençant par 0
  - Doit être unique

- **role** (string, requis):
  - Valeurs acceptées: `client`, `staff`, `admin`

#### Réponse en Cas de Succès (201)

```json
{
  "success": true,
  "message": "Utilisateur créé avec succès",
  "data": {
    "id": 5,
    "phone_number": "0701020304",
    "role": "client",
    "created_at": "2025-01-15T16:00:00.000Z",
    "updated_at": "2025-01-15T16:00:00.000Z"
  }
}
```

#### Réponses d'Erreur

**400 - Données Invalides**
```json
{
  "success": false,
  "error": "Données invalides",
  "details": [
    {
      "field": "phone_number",
      "message": "Le numéro de téléphone doit être un numéro ivoirien valide",
      "type": "string.pattern.base"
    }
  ]
}
```

**409 - Numéro Déjà Utilisé**
```json
{
  "success": false,
  "error": "Ce numéro de téléphone est déjà utilisé",
  "details": {
    "code": "PHONE_NUMBER_EXISTS",
    "message": "Un utilisateur avec ce numéro de téléphone existe déjà"
  }
}
```

---

### 5. Mettre à Jour un Utilisateur

**Endpoint:** `PUT /api/users/:id`

**Description:** Met à jour les informations d'un utilisateur. Accessible aux administrateurs et à l'utilisateur lui-même (avec restrictions).

**Niveau d'accès:** Client (pour son propre profil, sans changement de rôle) / Admin (pour tous)

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Paramètres d'URL

- **id** (integer, requis): ID de l'utilisateur

#### Données à Envoyer (JSON)

Au moins un champ doit être fourni:

```json
{
  "phone_number": "0701020305",
  "role": "staff"
}
```

#### Règles de Validation

- **phone_number** (string, optionnel):
  - Pattern: `/^(\+?225)?0[0-9]{9}$/`
  - Doit être unique si fourni

- **role** (string, optionnel):
  - Valeurs acceptées: `client`, `staff`, `admin`
  - Seuls les admins peuvent modifier les rôles

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Utilisateur mis à jour avec succès",
  "data": {
    "id": 5,
    "phone_number": "0701020305",
    "role": "staff",
    "created_at": "2025-01-15T16:00:00.000Z",
    "updated_at": "2025-01-15T16:30:00.000Z"
  }
}
```

#### Réponses d'Erreur

**403 - Modification de Rôle Non Autorisée**
```json
{
  "success": false,
  "error": "Accès refusé",
  "details": "Vous ne pouvez pas modifier votre rôle"
}
```

---

### 6. Supprimer un Utilisateur

**Endpoint:** `DELETE /api/users/:id`

**Description:** Supprime un utilisateur et ses sessions associées.

**Niveau d'accès:** Admin

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Paramètres d'URL

- **id** (integer, requis): ID de l'utilisateur

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Utilisateur supprimé avec succès",
  "data": {
    "id": 5,
    "deletedUser": {
      "id": 5,
      "role": "client"
    }
  }
}
```

#### Réponses d'Erreur

**400 - Auto-Suppression**
```json
{
  "success": false,
  "error": "Vous ne pouvez pas supprimer votre propre compte"
}
```

---

## Opérateurs

### 1. Liste de Tous les Opérateurs

**Endpoint:** `GET /api/operators`

**Description:** Récupère la liste de tous les opérateurs téléphoniques disponibles.

**Niveau d'accès:** Public

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Orange CI",
      "code": "ORANGE",
      "prefixes": ["07"],
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "name": "MTN",
      "code": "MTN",
      "prefixes": ["05"],
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 2. Détails d'un Opérateur

**Endpoint:** `GET /api/operators/:id`

**Description:** Récupère les détails d'un opérateur spécifique.

**Niveau d'accès:** Public

#### Paramètres d'URL

- **id** (integer, requis): ID de l'opérateur

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Orange CI",
    "code": "ORANGE",
    "prefixes": ["07"],
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z"
  }
}
```

#### Réponses d'Erreur

**400 - ID Invalide**
```json
{
  "success": false,
  "error": "ID opérateur invalide",
  "details": ["L'ID de l'opérateur doit être un nombre positif"]
}
```

**404 - Opérateur Non Trouvé**
```json
{
  "success": false,
  "error": "Opérateur non trouvé"
}
```

---

### 3. Créer un Opérateur

**Endpoint:** `POST /api/operators`

**Description:** Crée un nouvel opérateur téléphonique.

**Niveau d'accès:** Admin / Staff

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Données à Envoyer (JSON)

```json
{
  "name": "Telecel",
  "code": "TELECEL",
  "prefixes": ["09", "19"]
}
```

#### Règles de Validation

- **name** (string, requis):
  - Longueur: 2-50 caractères

- **code** (string, requis):
  - Longueur: 2-10 caractères
  - Doit être en MAJUSCULES

- **prefixes** (array, requis):
  - Au moins 1 préfixe
  - Maximum 20 préfixes
  - Chaque préfixe: 2-3 chiffres
  - Les préfixes doivent être uniques dans le tableau

#### Réponse en Cas de Succès (201)

```json
{
  "success": true,
  "message": "Opérateur créé avec succès",
  "data": {
    "id": 4,
    "name": "Telecel",
    "code": "TELECEL",
    "prefixes": ["09", "19"],
    "created_at": "2025-01-15T15:30:00.000Z",
    "updated_at": "2025-01-15T15:30:00.000Z"
  }
}
```

---

### 4. Mettre à Jour un Opérateur

**Endpoint:** `PUT /api/operators/:id`

**Description:** Modifie les informations d'un opérateur existant.

**Niveau d'accès:** Admin / Staff

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Paramètres d'URL

- **id** (integer, requis): ID de l'opérateur

#### Données à Envoyer (JSON)

Au moins un champ doit être fourni:

```json
{
  "name": "Orange Côte d'Ivoire",
  "code": "ORANGE",
  "prefixes": ["07", "17", "27"]
}
```

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Opérateur mis à jour avec succès",
  "data": {
    "id": 1,
    "name": "Orange Côte d'Ivoire",
    "code": "ORANGE",
    "prefixes": ["07", "17", "27"],
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-15T16:00:00.000Z"
  }
}
```

---

### 5. Supprimer un Opérateur

**Endpoint:** `DELETE /api/operators/:id`

**Description:** Supprime un opérateur.

**Niveau d'accès:** Admin / Staff

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Paramètres d'URL

- **id** (integer, requis): ID de l'opérateur

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Opérateur supprimé avec succès"
}
```

---

## Plans / Forfaits

### 1. Liste de Tous les Plans

**Endpoint:** `GET /api/plans`

**Description:** Récupère la liste de tous les forfaits. Les plans inactifs ne sont retournés que pour les admins.

**Niveau d'accès:** Admin

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Paramètres de Requête (Query Params)

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `includeInactive` | boolean | false | Inclure les plans inactifs |

**Exemple:** `GET /api/plans?includeInactive=true`

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "operator_id": 1,
      "operator_name": "Orange CI",
      "name": "Recharge 1000 FCFA",
      "description": "Crédit de communication de 1000 FCFA",
      "price": 1000.00,
      "type": "credit",
      "validity_days": null,
      "active": true,
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 2. Plans par Opérateur

**Endpoint:** `GET /api/plans/operator/:operatorId`

**Description:** Récupère les plans d'un opérateur spécifique (uniquement les plans actifs).

**Niveau d'accès:** Public

#### Paramètres d'URL

- **operatorId** (integer, requis): ID de l'opérateur

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "operator_id": 1,
      "name": "Recharge 1000 FCFA",
      "description": "Crédit de communication de 1000 FCFA",
      "price": 1000.00,
      "type": "credit",
      "validity_days": null,
      "active": true
    }
  ]
}
```

---

### 3. Plans par Numéro de Téléphone

**Endpoint:** `GET /api/plans/phone/:phoneNumber`

**Description:** Détecte automatiquement l'opérateur via le préfixe du numéro et retourne les plans correspondants.

**Niveau d'accès:** Public

#### Paramètres d'URL

- **phoneNumber** (string, requis): Numéro de téléphone (10 chiffres commençant par 0)

**Exemple:** `GET /api/plans/phone/0701020304`

#### Règles de Validation

- **phoneNumber**: Pattern `/^0[0-9]{9}$/`

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "operator": {
    "id": 1,
    "name": "Orange CI",
    "code": "ORANGE"
  },
  "plans": [
    {
      "id": 1,
      "name": "Recharge 1000 FCFA",
      "description": "Crédit de communication de 1000 FCFA",
      "price": 1000.00,
      "type": "credit",
      "validity_days": null
    }
  ]
}
```

#### Réponses d'Erreur

**400 - Numéro Invalide**
```json
{
  "success": false,
  "error": "Numéro de téléphone invalide",
  "details": ["Le numéro de téléphone doit être un numéro ivoirien valide (10 chiffres commençant par 0)"]
}
```

**404 - Opérateur Non Trouvé**
```json
{
  "success": false,
  "error": "Aucun opérateur trouvé pour ce préfixe"
}
```

---

### 4. Détails d'un Plan

**Endpoint:** `GET /api/plans/:id`

**Description:** Récupère les détails d'un forfait spécifique.

**Niveau d'accès:** Admin

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Paramètres d'URL

- **id** (integer, requis): ID du plan

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "data": {
    "id": 1,
    "operator_id": 1,
    "operator_name": "Orange CI",
    "name": "Recharge 1000 FCFA",
    "description": "Crédit de communication de 1000 FCFA",
    "price": 1000.00,
    "type": "credit",
    "validity_days": null,
    "active": true,
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### 5. Créer un Plan

**Endpoint:** `POST /api/plans`

**Description:** Crée un nouveau forfait.

**Niveau d'accès:** Admin

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Données à Envoyer (JSON)

```json
{
  "operator_id": 1,
  "name": "Recharge 5000 FCFA",
  "description": "Crédit de communication de 5000 FCFA",
  "price": 5000.00,
  "type": "credit",
  "validity_days": null,
  "active": true
}
```

#### Règles de Validation

- **operator_id** (integer, requis):
  - Doit être un ID d'opérateur valide

- **name** (string, requis):
  - Maximum 100 caractères

- **description** (string, optionnel):
  - Maximum 500 caractères

- **price** (decimal, requis):
  - Doit être positif
  - Maximum 2 décimales

- **type** (string, requis):
  - Valeurs acceptées: `credit`, `minutes`, `internet`

- **validity_days** (integer, optionnel):
  - Doit être positif si fourni
  - null pour crédit sans validité

- **active** (boolean, optionnel):
  - Par défaut: true

#### Réponse en Cas de Succès (201)

```json
{
  "success": true,
  "message": "Plan créé avec succès",
  "data": {
    "id": 15,
    "operator_id": 1,
    "name": "Recharge 5000 FCFA",
    "description": "Crédit de communication de 5000 FCFA",
    "price": 5000.00,
    "type": "credit",
    "validity_days": null,
    "active": true,
    "created_at": "2025-01-15T16:00:00.000Z",
    "updated_at": "2025-01-15T16:00:00.000Z"
  }
}
```

---

### 6. Mettre à Jour un Plan

**Endpoint:** `PUT /api/plans/:id`

**Description:** Modifie les informations d'un forfait existant.

**Niveau d'accès:** Admin

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Paramètres d'URL

- **id** (integer, requis): ID du plan

#### Données à Envoyer (JSON)

Au moins un champ doit être fourni:

```json
{
  "name": "Recharge 5000 FCFA Premium",
  "price": 5200.00,
  "active": false
}
```

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Plan mis à jour avec succès",
  "data": {
    "id": 15,
    "operator_id": 1,
    "name": "Recharge 5000 FCFA Premium",
    "description": "Crédit de communication de 5000 FCFA",
    "price": 5200.00,
    "type": "credit",
    "validity_days": null,
    "active": false,
    "created_at": "2025-01-15T16:00:00.000Z",
    "updated_at": "2025-01-15T16:30:00.000Z"
  }
}
```

---

### 7. Supprimer un Plan

**Endpoint:** `DELETE /api/plans/:id`

**Description:** Supprime un forfait.

**Niveau d'accès:** Admin

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Paramètres d'URL

- **id** (integer, requis): ID du plan

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Plan supprimé avec succès"
}
```

---

## Commandes

### 1. Créer une Commande

**Endpoint:** `POST /api/orders`

**Description:** Crée une nouvelle commande de crédit ou forfait.

**Niveau d'accès:** Client

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Données à Envoyer (JSON)

```json
{
  "plan_id": 1,
  "phone_number": "0701020304",
  "amount": 1000.00,
  "payment_method": "wave",
  "payment_reference": "PAY-123456"
}
```

#### Règles de Validation

- **plan_id** (integer, requis):
  - Doit être un ID de plan valide

- **phone_number** (string, requis):
  - Pattern: `/^0[0-9]{9}$/`
  - 10 chiffres commençant par 0

- **amount** (decimal, requis):
  - Doit être positif
  - Maximum 2 décimales

- **payment_method** (string, requis):
  - Valeurs acceptées: `wave`, `orange_money`, `mtn_money`, `moov_money`

- **payment_reference** (string, optionnel):
  - Référence de paiement

#### Réponse en Cas de Succès (201)

```json
{
  "success": true,
  "message": "Commande créée avec succès",
  "data": {
    "id": 125,
    "user_id": 1,
    "plan_id": 1,
    "phone_number": "0701020304",
    "amount": 1000.00,
    "status": "pending",
    "payment_method": "wave",
    "payment_reference": "PAY-123456",
    "created_at": "2025-01-15T16:30:00.000Z",
    "updated_at": "2025-01-15T16:30:00.000Z"
  }
}
```

---

### 2. Liste des Commandes

**Endpoint:** `GET /api/orders`

**Description:** Récupère la liste des commandes. Pour les clients: leurs propres commandes uniquement. Pour admin/staff: toutes les commandes.

**Niveau d'accès:** Client

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Paramètres de Requête (Query Params)

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `page` | integer | 1 | Numéro de page |
| `limit` | integer | 10 | Éléments par page (max: 100) |
| `status` | string | - | Filtrer par statut |
| `user_id` | integer | - | Filtrer par utilisateur (admin/staff uniquement) |

**Statuts possibles:**
- `pending` - En attente de paiement
- `assigned` - Assignée à un staff
- `processing` - En cours de traitement
- `completed` - Terminée
- `cancelled` - Annulée

**Exemple:** `GET /api/orders?page=1&limit=20&status=pending`

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "data": [
    {
      "id": 125,
      "user_id": 1,
      "plan_id": 1,
      "plan_name": "Recharge 1000 FCFA",
      "operator_name": "Orange CI",
      "phone_number": "0701020304",
      "amount": 1000.00,
      "status": "completed",
      "assigned_to": 5,
      "payment_method": "wave",
      "payment_reference": "PAY-123456",
      "created_at": "2025-01-15T16:30:00.000Z",
      "updated_at": "2025-01-15T16:35:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### 3. Détails d'une Commande

**Endpoint:** `GET /api/orders/:id`

**Description:** Récupère les détails d'une commande spécifique.

**Niveau d'accès:** Client (propriétaire uniquement) / Admin / Staff

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Paramètres d'URL

- **id** (integer, requis): ID de la commande

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "data": {
    "id": 125,
    "user_id": 1,
    "plan_id": 1,
    "plan_name": "Recharge 1000 FCFA",
    "operator_name": "Orange CI",
    "phone_number": "0701020304",
    "amount": 1000.00,
    "status": "completed",
    "assigned_to": 5,
    "assigned_to_name": "0566955943",
    "payment_method": "wave",
    "payment_reference": "PAY-123456",
    "created_at": "2025-01-15T16:30:00.000Z",
    "updated_at": "2025-01-15T16:35:00.000Z"
  }
}
```

---

### 4. Mettre à Jour une Commande

**Endpoint:** `PUT /api/orders/:id`

**Description:** Met à jour les informations d'une commande.

**Niveau d'accès:** Client (propriétaire) / Admin / Staff

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Paramètres d'URL

- **id** (integer, requis): ID de la commande

#### Données à Envoyer (JSON)

Au moins un champ doit être fourni:

```json
{
  "phone_number": "0701020305",
  "amount": 1100.00,
  "status": "processing"
}
```

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Commande mise à jour avec succès",
  "data": {
    "id": 125,
    "phone_number": "0701020305",
    "amount": 1100.00,
    "status": "processing",
    "updated_at": "2025-01-15T16:45:00.000Z"
  }
}
```

---

### 5. Mettre à Jour le Statut d'une Commande

**Endpoint:** `PATCH /api/orders/:id/status`

**Description:** Met à jour uniquement le statut d'une commande.

**Niveau d'accès:** Staff / Admin

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Paramètres d'URL

- **id** (integer, requis): ID de la commande

#### Données à Envoyer (JSON)

```json
{
  "status": "processing"
}
```

#### Règles de Validation

- **status** (string, requis):
  - Valeurs acceptées: `pending`, `assigned`, `processing`, `completed`, `cancelled`

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Statut de commande mis à jour avec succès",
  "data": {
    "id": 125,
    "status": "processing",
    "updated_at": "2025-01-15T16:33:00.000Z"
  }
}
```

---

### 6. Assigner une Commande

**Endpoint:** `POST /api/orders/:id/assign`

**Description:** Assigne une commande à un membre du staff.

**Niveau d'accès:** Staff / Admin

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Paramètres d'URL

- **id** (integer, requis): ID de la commande

#### Données à Envoyer (JSON)

```json
{
  "staff_id": 5
}
```

Ou pour s'assigner soi-même (en omettant staff_id):

```json
{}
```

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Commande assignée avec succès",
  "data": {
    "id": 125,
    "assigned_to": 5,
    "status": "assigned",
    "updated_at": "2025-01-15T16:31:00.000Z"
  }
}
```

---

### 7. Supprimer une Commande

**Endpoint:** `DELETE /api/orders/:id`

**Description:** Supprime une commande (réservé aux administrateurs).

**Niveau d'accès:** Admin

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Paramètres d'URL

- **id** (integer, requis): ID de la commande

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Commande supprimée avec succès"
}
```

---

## Paiements

### 1. Méthodes de Paiement Disponibles

**Endpoint:** `GET /api/payments/methods`

**Description:** Récupère la liste des méthodes de paiement disponibles.

**Niveau d'accès:** Public

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "data": [
    "wave",
    "orange_money",
    "mtn_money",
    "moov_money"
  ]
}
```

---

### 2. Statuts de Paiement Disponibles

**Endpoint:** `GET /api/payments/status`

**Description:** Récupère la liste des statuts de paiement possibles.

**Niveau d'accès:** Public

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "data": [
    "pending",
    "success",
    "failed",
    "refunded"
  ]
}
```

---

### 3. Créer un Paiement

**Endpoint:** `POST /api/payments`

**Description:** Crée un nouveau paiement pour une commande.

**Niveau d'accès:** Client

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Données à Envoyer (JSON)

```json
{
  "order_id": 123,
  "amount": 5000.00,
  "payment_method": "wave",
  "payment_reference": "PAY-20251008-ABC123",
  "external_reference": "WAVE-TXN-456789",
  "status": "pending",
  "callback_data": {
    "transaction_id": "12345",
    "customer_phone": "0789062079"
  }
}
```

#### Règles de Validation

- **order_id** (integer, requis):
  - Doit être un ID de commande valide

- **amount** (decimal, requis):
  - Doit être positif
  - Maximum 2 décimales

- **payment_method** (string, requis):
  - Valeurs acceptées: `wave`, `orange_money`, `mtn_money`, `moov_money`

- **payment_reference** (string, requis):
  - Référence unique du paiement

- **external_reference** (string, optionnel):
  - Référence externe du système de paiement

- **status** (string, optionnel):
  - Valeurs acceptées: `pending`, `success`, `failed`, `refunded`
  - Par défaut: `pending`

- **callback_data** (object, optionnel):
  - Données additionnelles du callback

#### Réponse en Cas de Succès (201)

```json
{
  "success": true,
  "message": "Paiement créé avec succès",
  "data": {
    "id": 45,
    "order_id": 123,
    "amount": 5000.00,
    "payment_method": "wave",
    "payment_reference": "PAY-20251008-ABC123",
    "external_reference": "WAVE-TXN-456789",
    "status": "pending",
    "callback_data": {
      "transaction_id": "12345",
      "customer_phone": "0789062079"
    },
    "created_at": "2025-10-08T10:30:00.000Z",
    "updated_at": "2025-10-08T10:30:00.000Z"
  }
}
```

---

### 4. Liste des Paiements avec Filtres

**Endpoint:** `GET /api/payments`

**Description:** Récupère la liste de tous les paiements avec pagination et filtres.

**Niveau d'accès:** Staff / Admin

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Paramètres de Requête (Query Params)

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `page` | integer | 1 | Numéro de page |
| `limit` | integer | 10 | Éléments par page |
| `status` | string | - | Filtrer par statut |
| `payment_method` | string | - | Filtrer par méthode de paiement |
| `start_date` | date | - | Date de début (ISO 8601) |
| `end_date` | date | - | Date de fin (ISO 8601) |

**Exemple:** `GET /api/payments?page=1&limit=20&status=success&payment_method=wave`

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "data": [
    {
      "id": 45,
      "order_id": 123,
      "amount": 5000.00,
      "payment_method": "wave",
      "payment_reference": "PAY-20251008-ABC123",
      "external_reference": "WAVE-TXN-456789",
      "status": "success",
      "callback_data": {
        "transaction_id": "12345",
        "notes": "Paiement validé"
      },
      "phone_number": "0789062079",
      "order_amount": 5000.00,
      "created_at": "2025-10-08T10:30:00.000Z",
      "updated_at": "2025-10-08T10:35:00.000Z"
    }
  ],
  "pagination": {
    "total": 156,
    "total_pages": 16,
    "current_page": 1,
    "per_page": 10,
    "has_next_page": true,
    "has_previous_page": false
  }
}
```

---

### 5. Détails d'un Paiement

**Endpoint:** `GET /api/payments/:id`

**Description:** Récupère les détails d'un paiement spécifique.

**Niveau d'accès:** Client (propriétaire) / Staff / Admin

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Paramètres d'URL

- **id** (integer, requis): ID du paiement

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "data": {
    "id": 45,
    "order_id": 123,
    "amount": 5000.00,
    "payment_method": "wave",
    "payment_reference": "PAY-20251008-ABC123",
    "external_reference": "WAVE-TXN-456789",
    "status": "success",
    "callback_data": {
      "transaction_id": "12345",
      "notes": "Paiement validé"
    },
    "phone_number": "0789062079",
    "order_amount": 5000.00,
    "created_at": "2025-10-08T10:30:00.000Z",
    "updated_at": "2025-10-08T10:35:00.000Z"
  }
}
```

---

### 6. Mettre à Jour un Paiement

**Endpoint:** `PUT /api/payments/:id`

**Description:** Met à jour les informations d'un paiement.

**Niveau d'accès:** Admin

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Paramètres d'URL

- **id** (integer, requis): ID du paiement

#### Données à Envoyer (JSON)

Au moins un champ doit être fourni:

```json
{
  "amount": 5500.00,
  "status": "success",
  "callback_data": {
    "transaction_id": "12345",
    "validation_code": "OK-123"
  }
}
```

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Paiement mis à jour avec succès",
  "data": {
    "id": 45,
    "order_id": 123,
    "amount": 5500.00,
    "payment_method": "wave",
    "payment_reference": "PAY-20251008-ABC123",
    "status": "success",
    "callback_data": {
      "transaction_id": "12345",
      "validation_code": "OK-123"
    },
    "created_at": "2025-10-08T10:30:00.000Z",
    "updated_at": "2025-10-08T11:00:00.000Z"
  }
}
```

---

### 7. Mettre à Jour le Statut d'un Paiement

**Endpoint:** `PATCH /api/payments/:id/status`

**Description:** Met à jour uniquement le statut d'un paiement.

**Niveau d'accès:** Staff / Admin

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Paramètres d'URL

- **id** (integer, requis): ID du paiement

#### Données à Envoyer (JSON)

```json
{
  "status": "success",
  "notes": "Paiement vérifié et validé manuellement"
}
```

#### Règles de Validation

- **status** (string, requis):
  - Valeurs acceptées: `pending`, `success`, `failed`, `refunded`

- **notes** (string, optionnel):
  - Notes explicatives

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Statut du paiement mis à jour avec succès",
  "data": {
    "id": 45,
    "order_id": 123,
    "amount": 5000.00,
    "payment_method": "wave",
    "status": "success",
    "callback_data": {
      "notes": "Paiement vérifié et validé manuellement",
      "last_update": "2025-10-08T11:15:00.000Z"
    },
    "created_at": "2025-10-08T10:30:00.000Z",
    "updated_at": "2025-10-08T11:15:00.000Z"
  }
}
```

---

### 8. Supprimer un Paiement

**Endpoint:** `DELETE /api/payments/:id`

**Description:** Supprime un paiement (soft delete).

**Niveau d'accès:** Admin

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Paramètres d'URL

- **id** (integer, requis): ID du paiement

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Paiement supprimé avec succès"
}
```

---

### 9. Rembourser un Paiement

**Endpoint:** `POST /api/payments/:id/refund`

**Description:** Initie un remboursement pour un paiement.

**Niveau d'accès:** Admin

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Paramètres d'URL

- **id** (integer, requis): ID du paiement

#### Données à Envoyer (JSON)

```json
{
  "reason": "Erreur de transaction - Crédit non reçu"
}
```

#### Règles de Validation

- **reason** (string, requis):
  - Raison du remboursement

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Remboursement initié avec succès",
  "data": {
    "id": 45,
    "status": "refunded",
    "callback_data": {
      "refund_reason": "Erreur de transaction - Crédit non reçu",
      "refund_date": "2025-10-08T12:00:00.000Z"
    },
    "updated_at": "2025-10-08T12:00:00.000Z"
  }
}
```

---

## Codes d'Erreur

### Codes HTTP Standards

| Code | Signification | Description |
|------|---------------|-------------|
| 200 | OK | Requête réussie |
| 201 | Created | Ressource créée avec succès |
| 400 | Bad Request | Données invalides ou manquantes |
| 401 | Unauthorized | Token manquant, invalide ou expiré |
| 403 | Forbidden | Permissions insuffisantes pour cette action |
| 404 | Not Found | Ressource non trouvée |
| 409 | Conflict | Conflit (ex: doublon, contrainte unique) |
| 429 | Too Many Requests | Limite de requêtes dépassée (rate limiting) |
| 500 | Internal Server Error | Erreur serveur interne |

### Format des Erreurs de Validation

```json
{
  "success": false,
  "error": "Données invalides",
  "details": [
    {
      "field": "phone_number",
      "message": "Le numéro de téléphone doit être un numéro ivoirien valide",
      "type": "string.pattern.base"
    },
    {
      "field": "amount",
      "message": "Le montant doit être un nombre positif",
      "type": "number.positive"
    }
  ]
}
```

### Codes d'Erreur Métier

| Code | Description |
|------|-------------|
| `PHONE_NUMBER_EXISTS` | Le numéro de téléphone est déjà utilisé |
| `DUPLICATE_ENTRY` | Entrée en double dans la base de données |
| `INSUFFICIENT_PERMISSIONS` | Permissions insuffisantes |
| `INVALID_TOKEN` | Token invalide ou expiré |
| `RESOURCE_NOT_FOUND` | Ressource demandée non trouvée |

---

## Formats de Données

### Date et Heure

Toutes les dates sont au format ISO 8601 avec timezone UTC:

```
2025-01-15T16:30:00.000Z
```

### Montants

Les montants sont en FCFA avec maximum 2 décimales:

```json
{
  "amount": 1000.00,
  "price": 5000.50
}
```

### Numéros de Téléphone

Format stocké (normalisé):
```
0701020304
```

Formats acceptés en entrée:
- `0701020304` (recommandé)
- `07 01 02 03 04`
- `+225 0701020304`
- `00225 0701020304`

### Booléens

```json
{
  "active": true,
  "includeInactive": false
}
```

### Tableaux

```json
{
  "prefixes": ["07", "17", "27"],
  "roles": ["client", "staff", "admin"]
}
```

### Objets Imbriqués

```json
{
  "callback_data": {
    "transaction_id": "12345",
    "customer_phone": "0789062079",
    "notes": "Paiement validé"
  }
}
```

---

## Sécurité

### Authentification JWT

Tous les endpoints protégés nécessitent un token JWT valide:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Durée de validité:**
- Access Token: 24 heures
- Refresh Token: 7 jours

### Rate Limiting

| Endpoint | Limite |
|----------|--------|
| Global | 100 requêtes / 15 minutes par IP |
| `/auth/login` | 5 tentatives / 15 minutes par IP |

En cas de dépassement:

```json
{
  "error": "Too Many Requests",
  "message": "Trop de requêtes, veuillez réessayer plus tard",
  "retryAfter": 900
}
```

### Headers de Sécurité

Tous les endpoints incluent:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

### CORS

Les requêtes cross-origin sont autorisées avec les headers appropriés.

---

## Exemples Complets

### Exemple 1: Créer un Utilisateur et Passer une Commande

```bash
# 1. Connexion
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"0701020304"}'

# Réponse:
# {
#   "token": "eyJhbGc...",
#   "user": {"id": 1, "phoneNumber": "0701020304", "role": "client"}
# }

# 2. Récupérer les plans pour le numéro
curl -X GET http://localhost:3000/api/plans/phone/0701020304

# 3. Créer une commande
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{
    "plan_id": 1,
    "phone_number": "0701020304",
    "amount": 1000.00,
    "payment_method": "wave"
  }'

# 4. Créer le paiement
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{
    "order_id": 125,
    "amount": 1000.00,
    "payment_method": "wave",
    "payment_reference": "PAY-123456"
  }'
```

### Exemple 2: Gestion des Commandes par un Staff

```bash
# 1. Connexion en tant que staff
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"0566955943"}'

# 2. Récupérer toutes les commandes en attente
curl -X GET "http://localhost:3000/api/orders?status=pending" \
  -H "Authorization: Bearer eyJhbGc..."

# 3. S'assigner une commande
curl -X POST http://localhost:3000/api/orders/125/assign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{}'

# 4. Mettre à jour le statut
curl -X PATCH http://localhost:3000/api/orders/125/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{"status": "processing"}'

# 5. Finaliser la commande
curl -X PATCH http://localhost:3000/api/orders/125/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{"status": "completed"}'
```

### Exemple 3: JavaScript (Fetch API)

```javascript
// Classe API Helper
class KbineAPI {
  constructor(baseURL = 'http://localhost:3000/api') {
    this.baseURL = baseURL;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur API');
    }

    return data;
  }

  // Authentification
  async login(phoneNumber) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
    this.setToken(data.token);
    return data;
  }

  // Plans
  async getPlansByPhone(phoneNumber) {
    return this.request(`/plans/phone/${phoneNumber}`);
  }

  // Commandes
  async createOrder(orderData) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async getOrders(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/orders?${params}`);
  }

  // Paiements
  async createPayment(paymentData) {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }
}

// Utilisation
const api = new KbineAPI();

async function passerCommande() {
  try {
    // 1. Connexion
    const authData = await api.login('0701020304');
    console.log('Connecté:', authData.user);

    // 2. Récupérer les plans
    const plansData = await api.getPlansByPhone('0701020304');
    console.log('Plans disponibles:', plansData.plans);

    // 3. Créer une commande
    const order = await api.createOrder({
      plan_id: plansData.plans[0].id,
      phone_number: '0701020304',
      amount: plansData.plans[0].price,
      payment_method: 'wave'
    });
    console.log('Commande créée:', order.data);

    // 4. Créer le paiement
    const payment = await api.createPayment({
      order_id: order.data.id,
      amount: order.data.amount,
      payment_method: 'wave',
      payment_reference: `PAY-${Date.now()}`
    });
    console.log('Paiement créé:', payment.data);

  } catch (error) {
    console.error('Erreur:', error.message);
  }
}

passerCommande();
```

---

## Support et Contact

**Version de l'API:** 1.0.0

**Dernière mise à jour:** 9 Octobre 2025

Pour toute question technique ou assistance:
- Documentation: Voir ce fichier
- Support: Contactez l'équipe technique Kbine

---

**Note:** Cette documentation est exhaustive et couvre tous les endpoints, filtres, validations et formats de données de l'API Kbine Backend.
