# 📘 Documentation API Kbine Backend

## 🔗 URL de Base

**Développement:** `http://localhost:3000/api`

**Production:** `https://votre-domaine.com/api`

---

## 📑 Table des Matières

1. [Authentification](#authentification)
2. [Utilisateurs](#utilisateurs)
3. [Opérateurs](#opérateurs)
4. [Plans / Forfaits](#plans--forfaits)
5. [Commandes](#commandes)
6. [Paiements](#paiements)
7. [Codes d'Erreur](#codes-derreur)
8. [Formats de Données](#formats-de-données)

---

## 🔐 Authentification

### Format du Token

Tous les endpoints protégés nécessitent un token JWT dans le header :

```
Authorization: Bearer <votre_token_jwt>
```

### 1. Connexion / Inscription

**Endpoint:** `POST /auth/login`

**Description:** Authentifie un utilisateur par son numéro de téléphone. Crée automatiquement un compte si l'utilisateur n'existe pas.

**Body:**
```json
{
  "phoneNumber": "0701020304"
}
```

**Formats acceptés pour le numéro:**
- `0701020304` (format standard)
- `07 01 02 03 04` (avec espaces)
- `+225 07 01 02 03 04` (avec code pays)
- `00225 07 01 02 03 04` (avec préfixe international)

**Préfixes valides:**
- `01` - Moov
- `05` - MTN
- `07` - Orange

**Réponse Success (200):**
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

**Réponses d'Erreur:**

```json
// 400 - Numéro invalide
{
  "error": "Numéro de téléphone invalide",
  "details": "Le numéro doit contenir exactement 10 chiffres"
}

// 400 - Préfixe invalide
{
  "error": "Numéro de téléphone invalide",
  "details": "Préfixe invalide. Les préfixes valides sont: 01, 05, 07"
}

// 500 - Erreur serveur
{
  "error": "Erreur serveur lors de la connexion"
}
```

---

### 2. Rafraîchir le Token

**Endpoint:** `POST /auth/refresh`

**Description:** Génère un nouveau token d'accès à partir d'un refresh token.

**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Réponse Success (200):**
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

**Réponses d'Erreur:**
```json
// 400 - Refresh token manquant
{
  "error": "Refresh token requis"
}

// 401 - Session expirée
{
  "error": "Session expirée ou invalide"
}

// 401 - Utilisateur non trouvé
{
  "error": "Utilisateur non trouvé"
}
```

---

### 3. Déconnexion

**Endpoint:** `POST /auth/logout`

**Description:** Déconnecte l'utilisateur et invalide ses sessions.

**Headers:**
```
Authorization: Bearer <token>
```

**Body (optionnel):**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Réponse Success (200):**
```json
{
  "message": "Déconnexion réussie"
}
```

---

## 👤 Utilisateurs

### 1. Obtenir le Profil

**Endpoint:** `GET /users/profile`

**Description:** Récupère les informations du profil de l'utilisateur connecté.

**Headers:**
```
Authorization: Bearer <token>
```

**Réponse Success (200):**
```json
{
  "id": 1,
  "phone_number": "0701020304",
  "role": "client",
  "created_at": "2025-01-15T10:30:00.000Z",
  "updated_at": "2025-01-15T10:30:00.000Z"
}
```

---

### 2. Liste des Utilisateurs (Admin)

**Endpoint:** `GET /users`

**Description:** Liste tous les utilisateurs (réservé aux administrateurs).

**Permissions:** Admin uniquement

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `role` (optionnel): Filtrer par rôle (`client`, `staff`, `admin`)
- `page` (optionnel): Numéro de page (défaut: 1)
- `limit` (optionnel): Éléments par page (défaut: 20)

**Réponse Success (200):**
```json
{
  "users": [
    {
      "id": 1,
      "phone_number": "0701020304",
      "role": "client",
      "created_at": "2025-01-15T10:30:00.000Z"
    },
    {
      "id": 2,
      "phone_number": "0501020304",
      "role": "staff",
      "created_at": "2025-01-14T09:20:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## 📡 Opérateurs

### 1. Liste des Opérateurs

**Endpoint:** `GET /operators`

**Description:** Récupère la liste de tous les opérateurs téléphoniques disponibles.

**Réponse Success (200):**
```json
[
  {
    "id": 1,
    "name": "Orange CI",
    "code": "ORANGE",
    "prefixes": ["07"],
    "created_at": "2025-01-01T00:00:00.000Z"
  },
  {
    "id": 2,
    "name": "MTN",
    "code": "MTN",
    "prefixes": ["05"],
    "created_at": "2025-01-01T00:00:00.000Z"
  },
  {
    "id": 3,
    "name": "Moov",
    "code": "MOOV",
    "prefixes": ["01"],
    "created_at": "2025-01-01T00:00:00.000Z"
  }
]
```

---

### 2. Détails d'un Opérateur

**Endpoint:** `GET /operators/:id`

**Description:** Récupère les détails d'un opérateur spécifique.

**Paramètres URL:**
- `id`: ID de l'opérateur

**Réponse Success (200):**
```json
{
  "id": 1,
  "name": "Orange CI",
  "code": "ORANGE",
  "prefixes": ["07"],
  "created_at": "2025-01-01T00:00:00.000Z"
}
```

**Réponses d'Erreur:**
```json
// 404 - Opérateur non trouvé
{
  "error": "Opérateur non trouvé"
}
```

---

### 3. Créer un Opérateur (Admin)

**Endpoint:** `POST /operators`

**Description:** Crée un nouvel opérateur téléphonique.

**Permissions:** Admin uniquement

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "name": "Telecel",
  "code": "TELECEL",
  "prefixes": ["09"]
}
```

**Réponse Success (201):**
```json
{
  "id": 4,
  "name": "Telecel",
  "code": "TELECEL",
  "prefixes": ["09"],
  "created_at": "2025-01-15T15:30:00.000Z"
}
```

---

### 4. Modifier un Opérateur (Admin)

**Endpoint:** `PUT /operators/:id`

**Description:** Modifie les informations d'un opérateur existant.

**Permissions:** Admin uniquement

**Headers:**
```
Authorization: Bearer <token>
```

**Paramètres URL:**
- `id`: ID de l'opérateur

**Body:**
```json
{
  "name": "Orange Côte d'Ivoire",
  "prefixes": ["07", "17"]
}
```

**Réponse Success (200):**
```json
{
  "id": 1,
  "name": "Orange Côte d'Ivoire",
  "code": "ORANGE",
  "prefixes": ["07", "17"],
  "created_at": "2025-01-01T00:00:00.000Z"
}
```

---

### 5. Supprimer un Opérateur (Admin)

**Endpoint:** `DELETE /operators/:id`

**Description:** Supprime un opérateur.

**Permissions:** Admin uniquement

**Headers:**
```
Authorization: Bearer <token>
```

**Réponse Success (200):**
```json
{
  "message": "Opérateur supprimé avec succès"
}
```

**Réponses d'Erreur:**
```json
// 400 - Opérateur utilisé
{
  "error": "Impossible de supprimer cet opérateur car il est utilisé dans des plans ou des commandes"
}
```

---

## 📦 Plans / Forfaits

### 1. Liste des Plans

**Endpoint:** `GET /plans`

**Description:** Récupère la liste de tous les forfaits disponibles.

**Query Parameters:**
- `operator_id` (optionnel): Filtrer par opérateur
- `type` (optionnel): Filtrer par type (`credit`, `minutes`, `internet`)
- `active` (optionnel): Filtrer par statut (`true`, `false`)

**Exemple:** `GET /plans?operator_id=1&type=credit&active=true`

**Réponse Success (200):**
```json
[
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
    "created_at": "2025-01-01T00:00:00.000Z"
  },
  {
    "id": 2,
    "operator_id": 1,
    "operator_name": "Orange CI",
    "name": "Forfait Yango 1Go",
    "description": "1Go d'internet valable 7 jours",
    "price": 500.00,
    "type": "internet",
    "validity_days": 7,
    "active": true,
    "created_at": "2025-01-01T00:00:00.000Z"
  }
]
```

---

### 2. Détails d'un Plan

**Endpoint:** `GET /plans/:id`

**Description:** Récupère les détails d'un forfait spécifique.

**Réponse Success (200):**
```json
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
  "created_at": "2025-01-01T00:00:00.000Z"
}
```

---

### 3. Créer un Plan (Admin)

**Endpoint:** `POST /plans`

**Description:** Crée un nouveau forfait.

**Permissions:** Admin uniquement

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
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

**Réponse Success (201):**
```json
{
  "id": 15,
  "operator_id": 1,
  "name": "Recharge 5000 FCFA",
  "description": "Crédit de communication de 5000 FCFA",
  "price": 5000.00,
  "type": "credit",
  "validity_days": null,
  "active": true,
  "created_at": "2025-01-15T16:00:00.000Z"
}
```

---

## 🛒 Commandes

### 1. Créer une Commande

**Endpoint:** `POST /orders`

**Description:** Crée une nouvelle commande de crédit ou forfait.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "plan_id": 1,
  "phone_number": "0701020304",
  "payment_method": "wave"
}
```

**payment_method valeurs possibles:**
- `wave`
- `orange_money`
- `mtn_money`
- `moov_money`

**Réponse Success (201):**
```json
{
  "id": 125,
  "user_id": 1,
  "plan_id": 1,
  "phone_number": "0701020304",
  "amount": 1000.00,
  "status": "pending",
  "payment_method": "wave",
  "payment_reference": "ORD-125-1736951234",
  "created_at": "2025-01-15T16:30:00.000Z"
}
```

---

### 2. Liste des Commandes

**Endpoint:** `GET /orders`

**Description:** Récupère la liste des commandes de l'utilisateur connecté.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optionnel): Filtrer par statut
- `page` (optionnel): Numéro de page
- `limit` (optionnel): Éléments par page

**Statuts possibles:**
- `pending` - En attente de paiement
- `assigned` - Assignée à un staff
- `processing` - En cours de traitement
- `completed` - Terminée
- `cancelled` - Annulée

**Réponse Success (200):**
```json
{
  "orders": [
    {
      "id": 125,
      "plan_name": "Recharge 1000 FCFA",
      "operator_name": "Orange CI",
      "phone_number": "0701020304",
      "amount": 1000.00,
      "status": "completed",
      "payment_method": "wave",
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

**Endpoint:** `GET /orders/:id`

**Description:** Récupère les détails d'une commande spécifique.

**Headers:**
```
Authorization: Bearer <token>
```

**Réponse Success (200):**
```json
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
  "assigned_to_name": "0566955943",
  "payment_method": "wave",
  "payment_reference": "ORD-125-1736951234",
  "created_at": "2025-01-15T16:30:00.000Z",
  "updated_at": "2025-01-15T16:35:00.000Z"
}
```

---

### 4. Mettre à Jour le Statut (Staff/Admin)

**Endpoint:** `PUT /orders/:id/status`

**Description:** Met à jour le statut d'une commande.

**Permissions:** Staff ou Admin

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "status": "processing"
}
```

**Réponse Success (200):**
```json
{
  "id": 125,
  "status": "processing",
  "updated_at": "2025-01-15T16:33:00.000Z"
}
```

---

### 5. Assigner une Commande (Staff/Admin)

**Endpoint:** `PUT /orders/:id/assign`

**Description:** Assigne une commande à un membre du staff.

**Permissions:** Staff ou Admin

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "staff_id": 5
}
```

**Réponse Success (200):**
```json
{
  "id": 125,
  "assigned_to": 5,
  "status": "assigned",
  "updated_at": "2025-01-15T16:31:00.000Z"
}
```

---

# 📘 Documentation API - Gestion des Paiements

## 📋 Table des matières
1. [Informations générales](#informations-générales)
2. [Authentification](#authentification)
3. [Routes publiques](#routes-publiques)
4. [Routes de gestion des paiements](#routes-de-gestion-des-paiements)
5. [Codes d'erreur](#codes-derreur)
6. [Exemples complets](#exemples-complets)

---

## 🌐 Informations générales

**Base URL**: `http://votre-domaine.com/api/payments`

**Format de données**: JSON

**Encodage**: UTF-8

### Méthodes de paiement disponibles
- `wave` - Wave CI
- `orange_money` - Orange Money
- `mtn_money` - MTN Mobile Money
- `moov_money` - Moov Money

### Statuts de paiement
- `pending` - En attente
- `success` - Réussi
- `failed` - Échoué
- `refunded` - Remboursé

---

## 🔐 Authentification

La plupart des routes nécessitent une authentification via un token JWT.

**Header requis**:
```
Authorization: Bearer <votre_token_jwt>
```

### Niveaux d'accès
- 🟢 **Public** : Accessible sans authentification
- 🔵 **Client** : Authentification requise
- 🟡 **Staff/Admin** : Rôle staff ou admin requis
- 🔴 **Admin** : Rôle admin uniquement

---

## 📂 Routes publiques

### 1. Récupérer les méthodes de paiement disponibles

**GET** `/api/payments/methods`

🟢 **Accès**: Public

#### Réponse réussie (200)
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

#### Exemple cURL
```bash
curl -X GET http://localhost:3000/api/payments/methods
```

---

### 2. Récupérer les statuts de paiement disponibles

**GET** `/api/payments/statuses`

🟢 **Accès**: Public

#### Réponse réussie (200)
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

#### Exemple cURL
```bash
curl -X GET http://localhost:3000/api/payments/statuses
```

---

## 💳 Routes de gestion des paiements

### 3. Créer un nouveau paiement

**POST** `/api/payments`

🔵 **Accès**: Client authentifié

#### Corps de la requête
```json
{
  "order_id": 123,
  "amount": 5000.00,
  "payment_method": "wave",
  "payment_reference": "PAY-20251008-ABC123",
  "external_reference": "WAVE-TXN-456789",
  "callback_data": {
    "transaction_id": "12345",
    "customer_phone": "0789062079"
  }
}
```

#### Champs requis
| Champ | Type | Description |
|-------|------|-------------|
| `order_id` | Integer | ID de la commande (doit exister) |
| `amount` | Decimal | Montant du paiement (positif, max 2 décimales) |
| `payment_method` | String | Méthode de paiement (voir liste ci-dessus) |
| `payment_reference` | String | Référence unique du paiement |

#### Champs optionnels
| Champ | Type | Description |
|-------|------|-------------|
| `external_reference` | String | Référence externe (auto-généré si absent) |
| `callback_data` | Object | Données additionnelles du callback |

#### Réponse réussie (201)
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

#### Erreurs possibles
- **400** : Données invalides
- **401** : Non authentifié
- **404** : Commande non trouvée
- **409** : Référence de paiement déjà existante

#### Exemple cURL
```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "order_id": 123,
    "amount": 5000.00,
    "payment_method": "wave",
    "payment_reference": "PAY-20251008-ABC123"
  }'
```

---

### 4. Récupérer tous les paiements (avec filtres)

**GET** `/api/payments`

🟡 **Accès**: Staff/Admin

#### Paramètres de requête (Query params)
| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `page` | Integer | 1 | Numéro de page |
| `limit` | Integer | 10 | Nombre d'éléments par page |
| `status` | String | - | Filtrer par statut |
| `payment_method` | String | - | Filtrer par méthode de paiement |
| `start_date` | Date | - | Date de début (ISO 8601) |
| `end_date` | Date | - | Date de fin (ISO 8601) |

#### Réponse réussie (200)
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

#### Exemples cURL

**Sans filtre**:
```bash
curl -X GET http://localhost:3000/api/payments \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Avec filtres**:
```bash
curl -X GET "http://localhost:3000/api/payments?page=2&limit=20&status=success&payment_method=wave" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Avec plage de dates**:
```bash
curl -X GET "http://localhost:3000/api/payments?start_date=2025-10-01&end_date=2025-10-08" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 5. Récupérer un paiement par son ID

**GET** `/api/payments/:id`

🔵 **Accès**: Client authentifié (propriétaire ou admin)

#### Paramètres d'URL
- `id` : ID du paiement

#### Réponse réussie (200)
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

#### Erreurs possibles
- **401** : Non authentifié
- **403** : Non autorisé à voir ce paiement
- **404** : Paiement non trouvé

#### Exemple cURL
```bash
curl -X GET http://localhost:3000/api/payments/45 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 6. Mettre à jour un paiement

**PUT** `/api/payments/:id`

🔴 **Accès**: Admin uniquement

#### Paramètres d'URL
- `id` : ID du paiement

#### Corps de la requête
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

#### Champs modifiables
| Champ | Type | Description |
|-------|------|-------------|
| `amount` | Decimal | Nouveau montant |
| `status` | String | Nouveau statut |
| `callback_data` | Object | Nouvelles données callback |

⚠️ **Note**: Au moins un champ doit être fourni

#### Réponse réussie (200)
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

#### Erreurs possibles
- **400** : Données invalides
- **401** : Non authentifié
- **403** : Accès non autorisé (non admin)
- **404** : Paiement non trouvé

#### Exemple cURL
```bash
curl -X PUT http://localhost:3000/api/payments/45 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": "success",
    "callback_data": {
      "validation_code": "OK-123"
    }
  }'
```

---

### 7. Mettre à jour le statut d'un paiement

**PATCH** `/api/payments/:id/status`

🟡 **Accès**: Staff/Admin

#### Paramètres d'URL
- `id` : ID du paiement

#### Corps de la requête
```json
{
  "status": "success",
  "notes": "Paiement vérifié et validé manuellement"
}
```

#### Champs requis
| Champ | Type | Description |
|-------|------|-------------|
| `status` | String | Nouveau statut (pending, success, failed, refunded) |

#### Champs optionnels
| Champ | Type | Description |
|-------|------|-------------|
| `notes` | String | Notes explicatives sur le changement de statut |

#### Réponse réussie (200)
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

#### Erreurs possibles
- **400** : Statut invalide
- **401** : Non authentifié
- **403** : Accès non autorisé
- **404** : Paiement non trouvé

#### Exemple cURL
```bash
curl -X PATCH http://localhost:3000/api/payments/45/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": "success",
    "notes": "Paiement vérifié manuellement"
  }'
```

---

### 8. Supprimer un paiement (Soft delete)

**DELETE
## ⚠️ Codes d'Erreur

| Code | Signification | Description |
|------|---------------|-------------|
| 200 | OK | Requête réussie |
| 201 | Created | Ressource créée avec succès |
| 400 | Bad Request | Données invalides |
| 401 | Unauthorized | Token manquant ou invalide |
| 403 | Forbidden | Permissions insuffisantes |
| 404 | Not Found | Ressource non trouvée |
| 409 | Conflict | Conflit (ex: doublon) |
| 429 | Too Many Requests | Limite de requêtes dépassée |
| 500 | Internal Server Error | Erreur serveur |

---

## 📊 Formats de Données

### Format de Date/Heure

Toutes les dates sont au format ISO 8601 avec timezone UTC :
```
2025-01-15T16:30:00.000Z
```

### Format Numérique

Les montants sont en FCFA avec 2 décimales :
```json
{
  "amount": 1000.00
}
```

### Format de Numéro de Téléphone

Les numéros sont stockés normalisés (10 chiffres) :
```
0701020304
```

Mais acceptés dans différents formats :
- `0701020304`
- `07 01 02 03 04`
- `+225 0701020304`
- `00225 0701020304`

---

## 🔒 Sécurité

### Rate Limiting

- **Limite globale:** 100 requêtes par 15 minutes par IP
- **Endpoint /auth/login:** 5 tentatives par 15 minutes

### Headers de Sécurité

Tous les endpoints incluent des headers de sécurité :
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

---

## 📡 WebSocket / Socket.IO

### Connexion

```javascript
const socket = io('http://localhost:3000');
```

### Événements

#### Rejoindre la room admin (Admin uniquement)
```javascript
socket.emit('join-admin-room');
```

#### Écouter les nouvelles commandes (Admin)
```javascript
socket.on('new-order', (order) => {
  console.log('Nouvelle commande:', order);
});
```

#### Écouter les mises à jour de commande (Client)
```javascript
socket.on('order-status-update', (data) => {
  console.log('Statut mis à jour:', data);
});
```

---

## 🧪 Exemples de Requêtes

### cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"0701020304"}'

# Créer une commande
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsInJvbGUiOiJhZG1pbiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NTk4NTA3OTEsImV4cCI6MTc1OTkzNzE5MSwiYXVkIjoia2JpbmUtY2xpZW50IiwiaXNzIjoia2JpbmUtYmFja2VuZCJ9.rwvOyGkoPsC4stO7ex6sHS_AQJ4xQCotB1YD_nTTzhw" \
  -d '{
    "plan_id": 1,
    "phone_number": "0701020304",
    "payment_method": "wave"
  }'
```

### JavaScript (Fetch)

```javascript
// Login
const login = async () => {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      phoneNumber: '0701020304'
    })
  });

  const data = await response.json();
  return data.token;
};

// Obtenir les plans
const getPlans = async (token) => {
  const response = await fetch('http://localhost:3000/api/plans', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return await response.json();
};
```

---

## 📞 Support

Pour toute question ou problème, contactez l'équipe technique Kbine.

**Version de l'API:** 1.0.0
**Dernière mise à jour:** 15 Janvier 2025
