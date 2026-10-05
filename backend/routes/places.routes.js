// ====================================================================
// ROUTES DES PLACES (/api/places)
// ====================================================================

const express = require('express');
const router = express.Router();
const placesController = require('../controllers/places.controller');
const { verifierToken } = require('../middlewares/auth.middleware');
const { verifierRoleManager } = require('../middlewares/role.middleware');

// Récupérer les places d'un parking (public ou authentifié)
router.get('/parking/:id_parking', placesController.getPlacesByParking);

// Modifier le statut d'une place (Manager uniquement)
router.patch('/:id', verifierToken, verifierRoleManager, placesController.updatePlaceStatus);

module.exports = router;
