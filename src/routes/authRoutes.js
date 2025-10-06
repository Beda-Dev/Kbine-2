/**
 * Routes d'authentification pour l'API Kbine
 * 
 * Ce fichier definit toutes les routes liees a l'authentification des utilisateurs.
 * Il utilise Express Router pour organiser les endpoints de maniere modulaire.
 * 
 * Workflow d'authentification Kbine:
 * 1. L'utilisateur envoie son numero de telephone via /login
 * 2. Si le numero n'existe pas, un compte client est cree automatiquement
 * 3. Si l'utilisateur est admin/staff, la verification OTP se fait cote mobile
 * 4. Le backend retourne un token JWT pour les sessions suivantes
 */

// Import des modules necessaires
const express = require('express'); // Framework web pour Node.js
const authController = require('../controllers/authController'); // Logique metier pour l'auth
const { validateAuth } = require('../validators/authValidator'); // Validation des donnees d'entree

// Creation d'un routeur Express pour organiser les routes
const router = express.Router();

/**
 * POST /api/auth/login
 * 
 * Authentification par numero de telephone
 * 
 * Body attendu:
 * {
 *   "phoneNumber": "0701234567" // Numero de telephone de l'utilisateur
 * }
 * 
 * Reponse en cas de succes:
 * {
 *   "token": "jwt_token_here",
 *   "user": {
 *     "id": 1,
 *     "phoneNumber": "0701234567",
 *     "role": "client|staff|admin"
 *   }
 * }
 * 
 * Note importante: La verification OTP pour admin/staff sera geree cote mobile
 * Le backend se contente de verifier l'existence du numero et retourner les infos utilisateur
 */
router.post('/login', validateAuth.login, authController.login);

/**
 * POST /api/auth/refresh
 * 
 * Rafraichissement du token JWT
 * 
 * Permet de renouveler un token expire sans redemander les identifiants
 * Utilise le refresh token stocke cote client
 * 
 * Body attendu:
 * {
 *   "refreshToken": "refresh_token_here"
 * }
 * 
 * Reponse:
 * {
 *   "token": "nouveau_jwt_token",
 *   "refreshToken": "nouveau_refresh_token"
 * }
 */
router.post('/refresh', authController.refreshToken);

/**
 * POST /api/auth/logout
 * 
 * Deconnexion de l'utilisateur
 * 
 * Invalide le token JWT cote serveur et supprime la session
 * L'utilisateur devra se reconnecter pour acceder aux routes protegees
 * 
 * Headers requis:
 * Authorization: Bearer jwt_token_here
 * 
 * Reponse:
 * {
 *   "message": "Deconnexion reussie"
 * }
 */
router.post('/logout', authController.logout);

// Export du routeur pour l'utiliser dans app.js
module.exports = router;