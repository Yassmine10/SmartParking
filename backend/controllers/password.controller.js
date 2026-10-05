// ====================================================================
// CONTRÔLEUR DE RÉINITIALISATION DE MOT DE PASSE
// Remplace l'ancienne version simulée (code en dur "123456"), qui
// n'apportait aucune sécurité réelle.
// ====================================================================

const bcrypt = require('bcrypt');
const db = require('../config/db');
const tokenService = require('../services/token.service');
const emailService = require('../services/email.service');
const { createNotification } = require('./notifications.controller');

/**
 * Demande de réinitialisation
 * POST /api/auth/forgot-password   Body : { email }
 *
 * Répond TOUJOURS 200 avec le même message : répondre "compte inconnu"
 * permettrait d'énumérer les adresses enregistrées.
 */
async function motDePasseOublie(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        succes: false,
        message: 'L\'adresse email est requise.'
      });
    }

    const message = 'Si un compte est associé à cette adresse, un email de réinitialisation vient d\'être envoyé.';

    const userRes = await db.query(
      'SELECT id, nom, email FROM users WHERE email = $1',
      [String(email).toLowerCase().trim()]
    );

    if (userRes.rows.length === 0) {
      return res.json({ succes: true, message });
    }

    const user = userRes.rows[0];
    const { token, hash, expire } = tokenService.genererToken(1);

    await db.query(
      `UPDATE users
       SET token_reset = $1, token_reset_expire = $2
       WHERE id = $3`,
      [hash, expire, user.id]
    );

    const lien = `${emailService.URL_FRONTEND}/reset-password?token=${token}`;
    const contenu = emailService.emailReinitialisation({ nom: user.nom, lien });

    const envoi = await emailService.envoyerEmail({ to: user.email, ...contenu });

    // Le lien n'est renvoyé qu'en développement : sans SMTP il n'existe
    // aucun autre moyen de récupérer le jeton pour tester le parcours.
    return res.json({
      succes: true,
      message,
      ...(process.env.NODE_ENV !== 'production' ? { lien_reinitialisation: lien } : {})
    });
  } catch (error) {
    console.error('Erreur mot de passe oublié :', error);
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la traitement de votre demande.'
    });
  }
}

/**
 * Vérifie qu'un jeton de réinitialisation est encore valable
 * GET /api/auth/reset-password/:token
 */
async function verifierJetonReset(req, res) {
  try {
    const { token } = req.params;

    if (!token || String(token).length < 32) {
      return res.status(400).json({ succes: false, valide: false, message: 'Lien invalide.' });
    }

    const hash = tokenService.hacherToken(token);
    const userRes = await db.query(
      `SELECT id, token_reset_expire FROM users WHERE token_reset = $1`,
      [hash]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({
        succes: false,
        valide: false,
        message: 'Ce lien n\'est plus valide. Demandez-en un nouveau.'
      });
    }

    if (tokenService.estExpire(userRes.rows[0].token_reset_expire)) {
      return res.status(400).json({
        succes: false,
        valide: false,
        message: 'Ce lien a expiré. Demandez-en un nouveau.'
      });
    }

    return res.json({ succes: true, valide: true });
  } catch (error) {
    return res.status(500).json({ succes: false, valide: false, message: 'Erreur de vérification du lien.' });
  }
}

/**
 * Applique un nouveau mot de passe
 * POST /api/auth/reset-password   Body : { token, nouveau_mot_de_passe }
 */
async function reinitialiserMotDePasse(req, res) {
  try {
    const { token, nouveau_mot_de_passe } = req.body;

    if (!token || !nouveau_mot_de_passe) {
      return res.status(400).json({
        succes: false,
        message: 'Le jeton et le nouveau mot de passe sont requis.'
      });
    }

    if (String(nouveau_mot_de_passe).length < 8) {
      return res.status(400).json({
        succes: false,
        message: 'Le mot de passe doit comporter au moins 8 caractères.'
      });
    }

    const hash = tokenService.hacherToken(String(token).trim());

    const userRes = await db.query(
      `SELECT id, nom, email, token_reset_expire
       FROM users WHERE token_reset = $1`,
      [hash]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({
        succes: false,
        message: 'Ce lien n\'est plus valide. Demandez-en un nouveau.'
      });
    }

    const user = userRes.rows[0];

    if (tokenService.estExpire(user.token_reset_expire)) {
      await db.query(
        'UPDATE users SET token_reset = NULL, token_reset_expire = NULL WHERE id = $1',
        [user.id]
      );

      return res.status(400).json({
        succes: false,
        message: 'Ce lien a expiré. Demandez-en un nouveau.'
      });
    }

    const nouveauHash = await bcrypt.hash(nouveau_mot_de_passe, 10);

    // Un seul usage : le jeton est détruit après usage.
    //
    // L'email est aussi marqué vérifié. Cliquer sur ce lien prouve la
    // possession de la boîte, qui est exactement ce que la vérification
    // cherche à établir. Sans cela, un utilisateur qui inscrit puis
    // réinitialise son mot de passe resterait bloqué à la connexion
    // sans jamais avoir su qu'il devait d'abord valider son adresse.
    await db.query(
      `UPDATE users
       SET mot_de_passe_hash = $1,
           token_reset = NULL,
           token_reset_expire = NULL,
           email_verifie = TRUE,
           token_verification = NULL,
           token_verification_expire = NULL
       WHERE id = $2`,
      [nouveauHash, user.id]
    );

    await createNotification(
      user.id,
      'Mot de passe modifié',
      'Votre mot de passe vient d\'être modifié. Si vous n\'êtes pas à l\'origine de ce changement, contactez-nous immédiatement.',
      'warning'
    );

    return res.json({
      succes: true,
      message: 'Mot de passe réinitialisé. Vous pouvez vous connecter.'
    });
  } catch (error) {
    console.error('Erreur réinitialisation mot de passe :', error);
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la réinitialisation du mot de passe.'
    });
  }
}

module.exports = {
  motDePasseOublie,
  verifierJetonReset,
  reinitialiserMotDePasse
};
