// ====================================================================
// ROUTES DES PARKINGS (/api/parkings)
// ====================================================================

const express = require('express');
const router = express.Router();
const parkingsController = require('../controllers/parkings.controller');
const { verifierToken } = require('../middlewares/auth.middleware');
const { verifierRoleManager } = require('../middlewares/role.middleware');

// Routes publiques / utilisateurs connectés
router.get('/', parkingsController.getParkings);
router.get('/mes-parkings', verifierToken, verifierRoleManager, parkingsController.getMesParkings);
router.get('/:id', parkingsController.getParkingById);

// Routes d'administration (Réservées aux gestionnaires)
router.post('/', verifierToken, verifierRoleManager, parkingsController.createParking);
router.put('/:id', verifierToken, verifierRoleManager, parkingsController.updateParking);
router.delete('/:id', verifierToken, verifierRoleManager, parkingsController.deleteParking);

module.exports = router;
