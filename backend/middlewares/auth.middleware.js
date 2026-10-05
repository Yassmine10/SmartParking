// ====================================================================
// MIDDLEWARE D'AUTHENTIFICATION JWT
// Vérifie la signature du token PUIS recharge l'utilisateur en base.
//
// Pourquoi recharger la base à chaque requête ?
// ---------------------------------------------------------------
// Un token JWT est auto-suffisant : il contient le rôle au moment de la
// connexion et reste valide 72h. Sans relecture en base, un utilisateur
// dont le rôle a été modifié (ou dont le compte a été supprimé) continuerait
// d'agir avec ses OLDES droits pendant toute la durée de vie du token.
// La relecture rend le contrôle d'accès effectif immédiatement.
// ====================================================================

const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../config/jwt.config');

async function verifierToken(req, res, next) {
  // Récupérer l'en-tête Authorization (format: "Bearer <token>")
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({
      succes: false,
      message: 'Accès refusé. Aucun token d\'authentification fourni.'
    });
  }

  // Extraire le token après le mot 'Bearer '
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : authHeader;

  if (!token) {
    return res.status(401).json({
      succes: false,
      message: 'Format de token invalide. Format attendu : "Bearer <token>".'
    });
  }

  // 1. Vérifier la signature et l'expiration du token
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      succes: false,
      message: 'Token invalide ou expiré. Veuillez vous reconnecter.',
      erreur: error.message
    });
  }

  // 2. Recharger l'utilisateur en base : source de vérité pour le rôle
  //    (fail-closed : en cas d'erreur base, on refuse l'accès)
  try {
    const resultat = await db.query(
      'SELECT id, nom, email, role, avatar_url FROM users WHERE id = $1',
      [payload.id]
    );

    if (resultat.rows.length === 0) {
      // Le compte a été supprimé depuis l'émission du token
      return res.status(401).json({
        succes: false,
        message: 'Compte introuvable. Veuillez vous reconnecter.'
      });
    }

    // req.user provient désormais de la base, jamais du token
    req.user = resultat.rows[0];
    return next();
  } catch (error) {
    console.error('Erreur de relecture de l\'utilisateur (verifierToken) :', error);
    return res.status(503).json({
      succes: false,
      message: 'Service temporairement indisponible. Veuillez réessayer.'
    });
  }
}

module.exports = { verifierToken };
