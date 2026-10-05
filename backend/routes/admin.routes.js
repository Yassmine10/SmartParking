// ====================================================================
// ROUTES ADMINISTRATION (/api/users, /api/reservations/manager)
// ====================================================================

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifierToken } = require('../middlewares/auth.middleware');
const { verifierRoleManager } = require('../middlewares/role.middleware');

// Chaque route reçoit explicitement ses middlewares.
//
// Ce routeur est monté sur '/api' : un `router.use(verifierToken, ...)` en
// tête s'appliquerait à TOUT ce qui arrive sous /api, y compris les URL
// inconnues. Une faute de frappe dans une URL d'API répondait alors
// « Accès refusé » au lieu de « route inexistante », ce qui masque la vraie
// cause d'une panne pendant le développement.

// GET /api/users - Liste des utilisateurs
router.get('/users', verifierToken, verifierRoleManager, adminController.getUsers);

// DELETE /api/users/:id - Supprimer un utilisateur
router.delete('/users/:id', verifierToken, verifierRoleManager, adminController.deleteUser);

// PUT /api/users/:id/role - Changer le rôle
router.put('/users/:id/role', verifierToken, verifierRoleManager, adminController.updateUserRole);

// Note : la route GET /api/reservations/manager est déclarée dans reservations.routes.js
// (avant le paramètre générique '/:id') afin d'éviter qu'elle soit interceptée.

module.exports = router;
