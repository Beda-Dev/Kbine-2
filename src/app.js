/**
 * Application principale du backend Kbine
 * Compatible avec Vercel (environnement serverless)
 */

// ===============================
// IMPORTS DES MODULES
// ===============================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

// Configuration et utilitaires
const logger = require('./utils/logger');
const errorHandler = require('./middlewares/errorHandler');
const rateLimiter = require('./middlewares/rateLimiter');

// Import des routes de l'API
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/usersRoutes');
const operatorRoutes = require('./routes/operatorRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const planRoutes = require('./routes/planRoutes');

// ===============================
// CONFIGURATION DU SERVEUR
// ===============================

const app = express();

// Détection de l'environnement
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

// ===============================
// CONFIGURATION SOCKET.IO (UNIQUEMENT EN LOCAL)
// ===============================

let io = null;
let server = null;

if (!isVercel) {
  // Socket.IO uniquement en environnement traditionnel
  const { createServer } = require('http');
  const { Server } = require('socket.io');
  
  server = createServer(app);
  
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Nouvelle connexion Socket.IO: ${socket.id}`);
    
    socket.on('join-admin-room', () => {
      socket.join('admins');
      logger.info(`Admin ${socket.id} rejoint la room admins`);
    });

    socket.on('disconnect', () => {
      logger.info(`Déconnexion Socket.IO: ${socket.id}`);
    });
  });
  
  app.set('io', io);
  logger.info('✅ Socket.IO activé (mode serveur traditionnel)');
} else {
  // Mock Socket.IO pour Vercel
  app.set('io', {
    to: () => ({
      emit: () => logger.warn('Socket.IO désactivé sur Vercel - notification ignorée')
    })
  });
  logger.info('⚠️ Socket.IO désactivé (mode serverless Vercel)');
}

// ===============================
// MIDDLEWARES GLOBAUX
// ===============================

app.use(helmet());
app.use(compression());
app.use(cors());

// Middleware de logging des requêtes
app.use((req, res, next) => {
  const start = Date.now();
  const { method, originalUrl, ip, headers } = req;
  
  logger.info(`[HTTP] ${method} ${originalUrl}`, {
    ip,
    userAgent: headers['user-agent'],
    contentType: headers['content-type'],
    authorization: headers['authorization'] ? '***' : 'none'
  });

  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - start;
    logger.info(`[HTTP] ${method} ${originalUrl} - ${res.statusCode} (${duration}ms)`, {
      status: res.statusCode,
      duration: `${duration}ms`
    });
    return originalSend.call(this, body);
  };

  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

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

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: isVercel ? 'vercel' : 'traditional',
    socketio: !isVercel
  });
});

// ===============================
// GESTION DES ERREURS
// ===============================

app.use(errorHandler);

app.use('*', (req, res) => {
  logger.warn(`[404] Route non trouvée: ${req.originalUrl}`, {
    method: req.method,
    ip: req.ip
  });
  
  res.status(404).json({ 
    error: 'Route non trouvée',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// ===============================
// DEMARRAGE DU SERVEUR (UNIQUEMENT EN LOCAL)
// ===============================

if (!isVercel) {
  const PORT = process.env.PORT || 3000;
  
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

    console.log('======================================');
    console.log(`🚀 Serveur Kbine démarré avec succès`);
    console.log(`   - Port: ${PORT}`);
    console.log(`   - Environnement: ${env}`);
    console.log(`   - PID: ${process.pid}`);
    console.log(`   - Mémoire: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`);
    console.log('======================================');
  });
}

// Export pour Vercel et tests
module.exports = app;