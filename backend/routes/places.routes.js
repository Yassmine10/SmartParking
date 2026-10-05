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

// Ajouter une place (Manager uniquement, sur un parking qui lui appartient)
router.post('/', verifierToken, verifierRoleManager, placesController.createPlace);

// Modifier le statut d'une place (Manager uniquement)
router.patch('/:id', verifierToken, verifierRoleManager, placesController.updatePlaceStatus);

// Supprimer une place sans historique de réservation (Manager uniquement)
router.delete('/:id', verifierToken, verifierRoleManager, placesController.deletePlace);

module.exports = router;
