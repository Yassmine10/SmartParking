// ====================================================================
// ROUTES DES NOTIFICATIONS (/api/notifications)
// ====================================================================

const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notifications.controller');
const { verifierToken } = require('../middlewares/auth.middleware');

// Toutes les routes nécessitent une authentification
router.use(verifierToken);

// GET /api/notifications - Liste des notifications de l'utilisateur
router.get('/', notificationsController.getNotifications);

// PUT /api/notifications/:id/read - Marquer comme lue
router.put('/:id/read', notificationsController.markAsRead);

// PUT /api/notifications/read-all - Marquer toutes comme lues
router.put('/read-all', notificationsController.markAllAsRead);

module.exports = router;
