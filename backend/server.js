// ====================================================================
// SERVEUR PRINCIPAL EXPRESS - SMARTPARKING API
// ====================================================================

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initialiserBaseDeDonnees } = require('./config/db');
const { gestionnaireErreurs } = require('./middlewares/validation.middleware');

// Importation des fichiers de routes
const authRoutes = require('./routes/auth.routes');
const parkingsRoutes = require('./routes/parkings.routes');
const placesRoutes = require('./routes/places.routes');
const reservationsRoutes = require('./routes/reservations.routes');
const statsRoutes = require('./routes/stats.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Middlewares globaux
app.use(cors({
  origin: '*', // Autoriser toutes les origines (Ionic, Web, émulateur Android)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Journalisation simple des requêtes entrantes
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// 2. Route de bienvenue et santé de l'API
app.get('/', (req, res) => {
  res.json({
    succes: true,
    message: 'Bienvenue sur l\'API REST SmartParking (Node.js / Express / PostgreSQL)',
    version: '1.0.0',
    documentation: {
      auth: '/api/auth (register, login, profile)',
      parkings: '/api/parkings',
      places: '/api/places',
      reservations: '/api/reservations',
      stats: '/api/stats'
    }
  });
});

// 3. Enregistrement des routes avec le préfixe /api
app.use('/api/auth', authRoutes);
app.use('/api/parkings', parkingsRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/statistics', statsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api', adminRoutes);

// 4. Gestionnaire des routes non trouvées (404)
app.use((req, res) => {
  res.status(404).json({
    succes: false,
    message: `La route "${req.originalUrl}" n'existe pas sur ce serveur.`
  });
});

// 5. Gestionnaire global des erreurs (500).
//    Placé après le 404 : en Express, un middleware d'erreur ne reçoit les
//    requêtes qu'après tous les handlers normaux.
app.use(gestionnaireErreurs);

// 6. Démarrage du serveur et initialisation de la base
app.listen(PORT, async () => {
  console.log('====================================================');
  console.log(`🚀 Serveur SmartParking API démarré sur le port ${PORT}`);
  console.log(`👉 URL : http://localhost:${PORT}`);
  console.log(process.env.SMTP_HOST
    ? '📧 Envoi d\'emails : SMTP activé'
    : '📧 Envoi d\'emails : MODE DÉVELOPPEMENT (voir le dossier backend/emails/)');
  console.log('====================================================');
  
  // Tente d'initialiser PostgreSQL automatiquement si le serveur est actif
  await initialiserBaseDeDonnees();
});
