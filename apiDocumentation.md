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
    "ussd_code": "*144*1*1#",
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
    "ussd_code": "*144*3*1#",
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
  "ussd_code": "*144*1*1#",
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
  "ussd_code": "*144*1*5#",
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
  "ussd_code": "*144*1*5#",
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

## 💳 Paiements

### 1. Initier un Paiement

**Endpoint:** `POST /payments/initiate`

**Description:** Initie un paiement pour une commande.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "order_id": 125,
  "payment_method": "wave",
  "phone_number": "0701020304"
}
```

**Réponse Success (200):**
```json
{
  "payment_id": 87,
  "order_id": 125,
  "amount": 1000.00,
  "payment_method": "wave",
  "payment_reference": "PAY-87-1736951234",
  "status": "pending",
  "payment_url": "https://wave.com/pay/xyz123",
  "created_at": "2025-01-15T16:30:00.000Z"
}
```

---

### 2. Vérifier le Statut d'un Paiement

**Endpoint:** `GET /payments/:id/status`

**Description:** Vérifie le statut d'un paiement.

**Headers:**
```
Authorization: Bearer <token>
```

**Réponse Success (200):**
```json
{
  "id": 87,
  "order_id": 125,
  "amount": 1000.00,
  "payment_method": "wave",
  "payment_reference": "PAY-87-1736951234",
  "external_reference": "WAVE-XYZ123", 
  "status": "success",
  "created_at": "2025-01-15T16:30:00.000Z",
  "updated_at": "2025-01-15T16:32:00.000Z"
}
```

**Statuts possibles:**
- `pending` - En attente
- `success` - Réussi
- `failed` - Échoué
- `refunded` - Remboursé

---

### 3. Callback Paiement (Webhook)

**Endpoint:** `POST /payments/callback/:provider`

**Description:** Endpoint de callback pour les services de paiement.

**Paramètres URL:**
- `provider`: Service de paiement (`wave`, `orange_money`, `mtn_money`, `moov_money`)

**Body:** (Format dépend du provider)

**Réponse Success (200):**
```json
{
  "success": true,
  "message": "Paiement traité avec succès"
}
```

---

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
