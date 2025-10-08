/**
 * Application principale du backend Kbine
 * 
 * Ce fichier configure et demarre le serveur Express avec toutes ses dependances.
 * Il met en place:
 * - Les middlewares de securite et performance
 * - Les routes API
 * - Socket.IO pour la communication temps reel
 * - La gestion globale des erreurs
 * 
 * Architecture utilisee: Clean Architecture avec separation des couches
 * Framework: Express.js avec Socket.IO pour le temps reel
 */

// ===============================
// IMPORTS DES MODULES
// ===============================

// Modules Express et serveur
const express = require('express'); // Framework web principal
const cors = require('cors'); // Gestion des requetes cross-origin
const helmet = require('helmet'); // Securite HTTP (headers)
const compression = require('compression'); // Compression des reponses
const { createServer } = require('http'); // Serveur HTTP natif Node.js
const { Server } = require('socket.io'); // WebSocket pour temps reel

// Configuration et utilitaires
const config = require('./config/database'); // Configuration base de donnees
const logger = require('./utils/logger'); // Systeme de logs
const errorHandler = require('./middlewares/errorHandler'); // Gestion centralisee des erreurs
const rateLimiter = require('./middlewares/rateLimiter'); // Limitation des requetes par IP

// Import des routes de l'API
const authRoutes = require('./routes/authRoutes'); // Authentification
const userRoutes = require('./routes/usersRoutes');
const operatorRoutes = require('./routes/operatorRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const planRoutes = require('./routes/planRoutes');


// TODO pour le developpeur junior: Creer les autres fichiers de routes
// - userRoutes.js - Gestion des utilisateurs (profil, administration)
// - operatorRoutes.js - Operateurs telephoniques (Orange CI, MTN, Moov)
// - planRoutes.js - Forfaits et plans par operateur
// - orderRoutes.js - Commandes clients (creation, traitement, historique)
// - paymentRoutes.js - Paiements (initiation, callbacks, statuts)

// ===============================
// CONFIGURATION DU SERVEUR
// ===============================

// Creation de l'application Express
const app = express();

// Creation du serveur HTTP pour supporter Socket.IO
const server = createServer(app);

// Configuration Socket.IO pour la communication temps reel
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*", // Autorise le client mobile
    methods: ["GET", "POST"] // Methodes autorisees pour Socket.IO
  }
});

// ===============================
// MIDDLEWARES GLOBAUX
// ===============================

// Middlewares de securite et performance (ordre important!)
app.use(helmet()); // Securise les headers HTTP
app.use(compression()); // Compresse les reponses pour reduire la bande passante
app.use(cors()); // Autorise les requetes cross-origin

// Middleware de logging des requêtes entrantes
app.use((req, res, next) => {
  const start = Date.now();
  const { method, originalUrl, ip, headers } = req;
  
  logger.info(`[HTTP] ${method} ${originalUrl}`, {
    ip,
    userAgent: headers['user-agent'],
    contentType: headers['content-type'],
    contentLength: headers['content-length'] || '0',
    authorization: headers['authorization'] ? '***' : 'none'
  });

  // Capture la méthode d'envoi de la réponse pour logger la durée
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - start;
    logger.info(`[HTTP] ${method} ${originalUrl} - ${res.statusCode} (${duration}ms)`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || '0',
      contentType: res.get('Content-Type')
    });
    return originalSend.call(this, body);
  };

  next();
});

app.use(express.json({ limit: '10mb' })); // Parse les body JSON (limite 10MB)
app.use(express.urlencoded({ extended: true })); // Parse les formulaires
app.use(rateLimiter); // Limite le nombre de requetes par IP

// ===============================
// CONFIGURATION SOCKET.IO
// ===============================

/**
 * Gestion des connexions WebSocket temps reel
 * Utilise pour notifier les admins des nouvelles commandes
 * et informer les clients du statut de leurs commandes
 */
io.on('connection', (socket) => {
  logger.info(`Nouvelle connexion Socket.IO: ${socket.id}`);
  
  /**
   * Evenement: join-admin-room
   * Permet aux admins de rejoindre une room speciale
   * pour recevoir les notifications de nouvelles commandes
   */
  socket.on('join-admin-room', () => {
    socket.join('admins');
    logger.info(`Admin ${socket.id} rejoint la room admins`);
  });

  /**
   * Evenement: disconnect
   * Log la deconnexion d'un client
   */
  socket.on('disconnect', () => {
    logger.info(`Deconnexion Socket.IO: ${socket.id}`);
  });
});

// Rendre l'instance Socket.IO disponible dans toutes les routes
// Accessible via req.app.get('io') dans les controllers
app.set('io', io);

// ===============================
// CONFIGURATION DES ROUTES API
// ===============================

/**
 * Organisation des routes par domaine metier
 * Toutes les routes sont prefixees par /api/
 * 
 * Seule la route d'authentification est implementee pour commencer
 * Le developpeur junior devra implementer les autres routes selon ses besoins
 */

// ===============================
// MONTAGE DES ROUTES
// ===============================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/operators', operatorRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

// ===============================
// ROUTES PUBLIQUES
// ===============================

/**
 * GET /health
 * Endpoint de verification de l'etat du serveur
 * Utilise par Docker et les outils de monitoring
 */
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
  });
});

// ===============================
// GESTION DES ERREURS
// ===============================

// Middleware de gestion centralisee des erreurs
// Doit etre place APRES toutes les routes
app.use(errorHandler);

// Route catch-all pour les endpoints non trouves
// Doit etre la DERNIERE route definie
app.use('*', (req, res) => {
  logger.warn(`[404] Route non trouvée: ${req.originalUrl}`, {
    method: req.method,
    ip: req.ip,
    headers: req.headers
  });
  
  res.status(404).json({ 
    error: 'Route non trouvée',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// ===============================
// DEMARRAGE DU SERVEUR
// ===============================

// Port d'ecoute (variable d'environnement ou 3000 par defaut)
const PORT = process.env.PORT || 3000;

// Demarrage du serveur
server.listen(PORT, () => {
  const env = process.env.NODE_ENV || 'development';
  const memoryUsage = process.memoryUsage();
  
  logger.info('======================================');
  logger.info(`🚀 Serveur Kbine démarré avec succès`);
  logger.info(`   - Port: ${PORT}`);
  logger.info(`   - Environnement: ${env}`);
  logger.info(`   - PID: ${process.pid}`);
  logger.info(`   - Mémoire: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`);
  logger.info('======================================');
  
  // Log des routes disponibles
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // Routes directes
      routes.push(`${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      // Routes montées avec app.use()
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push(`${Object.keys(handler.route.methods).join(', ').toUpperCase()} ${handler.route.path}`);
        }
      });
    }
  });
  
  logger.debug('Routes disponibles:', { routes });
});

// Export de l'app pour les tests
module.exports = app;