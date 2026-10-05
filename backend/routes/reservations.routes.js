// ====================================================================
// ROUTES DES RÉSERVATIONS (/api/reservations)
// ====================================================================

const express = require('express');
const router = express.Router();
const reservationsController = require('../controllers/reservations.controller');
const adminController = require('../controllers/admin.controller');
const { verifierToken } = require('../middlewares/auth.middleware');
const { verifierRoleManager } = require('../middlewares/role.middleware');

// ⚠️ L'ordre des routes est important : les routes littérales (/manager, /me, /qr/:qrData)
// doivent être déclarées AVANT le paramètre générique '/:id', sinon Express les intercepte.

// Toutes les réservations (vue gestionnaire)
router.get('/manager', verifierToken, verifierRoleManager, adminController.getManagerReservations);

// Routes pour les utilisateurs connectés
router.post('/', verifierToken, reservationsController.createReservation);
router.get('/me', verifierToken, reservationsController.getMesReservations);
router.get('/:id', verifierToken, reservationsController.getReservationById);
router.put('/:id/annuler', verifierToken, reservationsController.annulerReservation);

// Routes QR Code (gestionnaire)
router.get('/qr/:qrData', verifierToken, verifierRoleManager, reservationsController.getReservationByQr);
router.post('/:id/checkin', verifierToken, verifierRoleManager, reservationsController.checkIn);
router.post('/:id/checkout', verifierToken, verifierRoleManager, reservationsController.checkOut);

// Route pour les gestionnaires (voir les réservations reçues par parking)
router.get('/parking/:id', verifierToken, verifierRoleManager, reservationsController.getReservationsByParking);

module.exports = router;
