// ====================================================================
// ROUTES D'AUTHENTIFICATION (/api/auth)
// Chaque route publique applique : limitation de débit + validation d'entrée.
// ====================================================================

const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const verificationController = require('../controllers/verification.controller');
const passwordController = require('../controllers/password.controller');
const { verifierToken } = require('../middlewares/auth.middleware');
const {
  limiteConnexion,
  limiteInscription,
  limiteEmail,
  limiteReset,
  gererErreursValidation
} = require('../middlewares/validation.middleware');

// ====================================================================
// Routes publiques
// ====================================================================

// --- Inscription -------------------------------------------------------
router.post(
  '/register',
  limiteInscription,
  body('nom').isString().trim().isLength({ min: 2, max: 100 }).withMessage('Le nom doit comporter entre 2 et 100 caractères.').escape(),
  body('email').isEmail().withMessage('Adresse email invalide.').normalizeEmail(),
  body('mot_de_passe').isString().isLength({ min: 8, max: 72 })
    .withMessage('Le mot de passe doit comporter entre 8 et 72 caractères.'),
  gererErreursValidation,
  authController.register
);

// --- Connexion ---------------------------------------------------------
router.post(
  '/login',
  limiteConnexion,
  body('email').isEmail().withMessage('Adresse email invalide.').normalizeEmail(),
  body('mot_de_passe').isString().isLength({ min: 1, max: 72 })
    .withMessage('Le mot de passe est requis.'),
  gererErreursValidation,
  authController.login
);

// --- Vérification de l'adresse email -----------------------------------
router.post(
  '/verify-email',
  body('token').isString().trim().isLength({ min: 32, max: 128 })
    .withMessage('Jeton de vérification invalide.'),
  gererErreursValidation,
  verificationController.verifierEmail
);

router.post(
  '/resend-verification',
  limiteEmail,
  body('email').isEmail().withMessage('Adresse email invalide.').normalizeEmail(),
  gererErreursValidation,
  verificationController.renvoyerVerification
);

// --- Réinitialisation du mot de passe ----------------------------------
router.post(
  '/forgot-password',
  limiteReset,
  body('email').isEmail().withMessage('Adresse email invalide.').normalizeEmail(),
  gererErreursValidation,
  passwordController.motDePasseOublie
);

router.get(
  '/reset-password/:token',
  param('token').isString().trim().isLength({ min: 32, max: 128 })
    .withMessage('Jeton invalide.'),
  gererErreursValidation,
  passwordController.verifierJetonReset
);

router.post(
  '/reset-password',
  limiteReset,
  body('token').isString().trim().isLength({ min: 32, max: 128 })
    .withMessage('Jeton de réinitialisation invalide.'),
  body('nouveau_mot_de_passe').isString().isLength({ min: 8, max: 72 })
    .withMessage('Le mot de passe doit comporter entre 8 et 72 caractères.'),
  gererErreursValidation,
  passwordController.reinitialiserMotDePasse
);

// ====================================================================
// Routes protégées (nécessitent un token JWT valide)
// ====================================================================

router.get('/profile', verifierToken, authController.getProfile);
router.put('/profile', verifierToken, authController.updateProfile);

router.put(
  '/change-password',
  verifierToken,
  body('currentPassword').isString().isLength({ min: 1, max: 72 })
    .withMessage('Le mot de passe actuel est requis.'),
  body('newPassword').isString().isLength({ min: 8, max: 72 })
    .withMessage('Le nouveau mot de passe doit comporter entre 8 et 72 caractères.'),
  gererErreursValidation,
  authController.changePassword
);

router.get('/verification-status', verifierToken, verificationController.statutVerification);

module.exports = router;
