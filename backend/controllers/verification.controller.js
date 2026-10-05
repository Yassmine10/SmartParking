// ====================================================================
// CONTRÔLEUR DE VÉRIFICATION D'EMAIL
// Vérifie la possession de l'adresse email lors de l'inscription.
// ====================================================================

const db = require('../config/db');
const { signerToken } = require('../config/jwt.config');
const tokenService = require('../services/token.service');
const emailService = require('../services/email.service');

/**
 * Envoie (ou renvoie) l'email de vérification pour un utilisateur.
 * Fonction interne : appelée à l'inscription et lors d'un renvoi.
 *
 * @param {number} userId
 * @returns {Promise<{envoye: boolean, lien?: string}>}
 */
async function envoyerEmailVerification(userId) {
  const userRes = await db.query(
    'SELECT id, nom, email, email_verifie FROM users WHERE id = $1',
    [userId]
  );

  if (userRes.rows.length === 0) {
    return { envoye: false };
  }

  const user = userRes.rows[0];

  // Déjà vérifié : inutile de renvoyer
  if (user.email_verifie) {
    return { envoye: true, dejaVerifie: true };
  }

  const { token, hash, expire } = tokenService.genererToken();

  await db.query(
    `UPDATE users
     SET token_verification = $1, token_verification_expire = $2
     WHERE id = $3`,
    [hash, expire, userId]
  );

  const lien = `${emailService.URL_FRONTEND}/verify-email?token=${token}`;
  const email = emailService.emailVerification({ nom: user.nom, lien });

  await emailService.envoyerEmail({ to: user.email, ...email });

  return { envoye: true, lien };
}

/**
 * Vérifie un compte à partir du jeton reçu dans le lien
 * POST /api/auth/verify-email   Body : { token }
 */
async function verifierEmail(req, res) {
  try {
    const { token } = req.body;

    if (!token || String(token).length < 32) {
      return res.status(400).json({
        succes: false,
        code: 'JETON_INVALIDE',
        message: 'Lien de vérification invalide. Demandez-en un nouveau.'
      });
    }

    const hash = tokenService.hacherToken(token.trim());

    const userRes = await db.query(
      `SELECT id, nom, email, email_verifie, token_verification_expire
       FROM users
       WHERE token_verification = $1`,
      [hash]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({
        succes: false,
        code: 'JETON_INVALIDE',
        message: 'Ce lien de vérification n\'est plus valide. Demandez-en un nouveau.'
      });
    }

    const user = userRes.rows[0];

    if (tokenService.estExpire(user.token_verification_expire)) {
      // On purge le jeton périmé
      await db.query(
        'UPDATE users SET token_verification = NULL, token_verification_expire = NULL WHERE id = $1',
        [user.id]
      );

      return res.status(400).json({
        succes: false,
        code: 'JETON_EXPIRE',
        message: 'Ce lien a expiré. Demandez-en un nouveau depuis l\'écran de connexion.'
      });
    }

    // Activation : on marque vérifié ET on invalide le jeton
    await db.query(
      `UPDATE users
       SET email_verifie = TRUE,
           token_verification = NULL,
           token_verification_expire = NULL
       WHERE id = $1
       RETURNING id, nom, email, role, email_verifie`,
      [user.id]
    );

    // Email de confirmation d'activation
    const bienvenue = emailService.emailBienvenue({ nom: user.nom });
    emailService.envoyerEmail({ to: user.email, ...bienvenue }).catch(() => {});

    // On délivre immédiatement une session : l'utilisateur n'a pas
    // à ressaisir ses identifiants après avoir cliqué sur le lien.
    const jwt = signerToken({ id: user.id, nom: user.nom, email: user.email, role: 'user' });

    return res.json({
      succes: true,
      message: 'Votre adresse email est confirmée. Votre compte est actif !',
      token: jwt,
      user: { id: user.id, nom: user.nom, email: user.email, role: 'user', email_verifie: true }
    });
  } catch (error) {
    console.error('Erreur vérification email :', error);
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la vérification de votre adresse email.'
    });
  }
}

/**
 * Renvoie l'email de vérification
 * POST /api/auth/resend-verification   Body : { email }
 *
 * Répond toujours 200 : révéler si une adresse est enregistrée
 * permettrait d'énumérer les comptes existants.
 */
async function renvoyerVerification(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        succes: false,
        message: 'L\'adresse email est requise.'
      });
    }

    const userRes = await db.query(
      'SELECT id, email_verifie FROM users WHERE email = $1',
      [String(email).toLowerCase().trim()]
    );

    const message = 'Si un compte non vérifié existe pour cette adresse, un nouvel email vient d\'être envoyé.';

    if (userRes.rows.length === 0 || userRes.rows[0].email_verifie) {
      // Cas "silencieux" : ne rien révéler
      return res.json({ succes: true, message });
    }

    const resultat = await envoyerEmailVerification(userRes.rows[0].id);

    return res.json({
      succes: true,
      message,
      // Utile en développement : permet de récupérer le lien sans ouvrir l'email.
      ...(process.env.NODE_ENV !== 'production' && resultat.lien ? { lien_de_verification: resultat.lien } : {})
    });
  } catch (error) {
    console.error('Erreur renvoi vérification :', error);
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de l\'envoi du nouvel email de vérification.'
    });
  }
}

/**
 * Indique si le compte connecté a vérifié son email
 * GET /api/auth/verification-status
 */
async function statutVerification(req, res) {
  try {
    const resultat = await db.query(
      'SELECT email_verifie FROM users WHERE id = $1',
      [req.user.id]
    );

    if (resultat.rows.length === 0) {
      return res.status(404).json({ succes: false, message: 'Utilisateur introuvable.' });
    }

    return res.json({
      succes: true,
      email_verifie: resultat.rows[0].email_verifie
    });
  } catch (error) {
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la consultation du statut de vérification.'
    });
  }
}

module.exports = {
  envoyerEmailVerification,
  verifierEmail,
  renvoyerVerification,
  statutVerification
};
