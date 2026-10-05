// ====================================================================
// ROUTES DES STATISTIQUES (/api/stats)
// ====================================================================

const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');
const { verifierToken } = require('../middlewares/auth.middleware');
const { verifierRoleManager } = require('../middlewares/role.middleware');

// Statistiques globales du tableau de bord (Manager ou Admin)
router.get('/', verifierToken, statsController.getDashboardStats);
router.get('/dashboard', verifierToken, statsController.getDashboardStats);

// Statistiques d'un parking spécifique (Réservé au Manager)
router.get('/parking/:id', verifierToken, verifierRoleManager, statsController.getStatsParking);

module.exports = router;
