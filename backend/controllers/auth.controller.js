// ====================================================================
// CONTRÔLEUR D'AUTHENTIFICATION (Auth Controller)
// Inscription, Connexion et Génération de Tokens JWT
// ====================================================================

const bcrypt = require('bcrypt');
const db = require('../config/db');
const { signerToken } = require('../config/jwt.config');
const { createNotification } = require('./notifications.controller');
const { envoyerEmailVerification } = require('./verification.controller');

/**
 * Inscription d'un nouvel utilisateur
 * POST /api/auth/register
 *
 * SÉCURITÉ : le rôle est imposed par le serveur et vaut TOUJOURS 'user'.
 * Un champ `role` présent dans le corps de la requête est volontairement
 * ignoré : sans cela, n'importe qui s'auto-attribue les privilèges
 * d'administrateur en appelant directement l'API.
 * La promotion en 'manager' passe uniquement par un administrateur
 * (PUT /api/users/:id/role).
 */
async function register(req, res) {
  try {
    const { nom, email, mot_de_passe } = req.body;

    // 1. Validation simple des champs obligatoires
    if (!nom || !email || !mot_de_passe) {
      return res.status(400).json({
        succes: false,
        message: 'Le nom, l\'email et le mot de passe sont obligatoires.'
      });
    }

    const ROLE_PAR_DEFAUT = 'user';

    // 2. Vérifier si l'email existe déjà dans la base
    const utilisateurExistant = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (utilisateurExistant.rows.length > 0) {
      return res.status(409).json({
        succes: false,
        message: 'Un compte avec cette adresse email existe déjà.'
      });
    }

    // 3. Hachage sécurisé du mot de passe avec bcrypt (salt rounds = 10)
    const saltRounds = 10;
    const motDePasseHash = await bcrypt.hash(mot_de_passe, saltRounds);

    // 4. Insertion du nouvel utilisateur dans PostgreSQL
    //    email_verifie reste FALSE : le compte n'existe pas encore
    //    tant que l'adresse n'a pas été confirmée.
    const resultat = await db.query(
      `INSERT INTO users (nom, email, mot_de_passe_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nom, email, role, avatar_url, email_verifie, date_creation`,
      [nom.trim(), email.toLowerCase().trim(), motDePasseHash, ROLE_PAR_DEFAUT]
    );

    const nouvelUtilisateur = resultat.rows[0];

    // 5. Envoi du lien de vérification.
    //    Un échec d'envoi ne doit pas faire perdre le compte : le
    //   'utilisateur pourra demander un renvoi depuis l'écran de connexion.
    let emailEnvoye = true;
    try {
      const envoi = await envoyerEmailVerification(nouvelUtilisateur.id);
      emailEnvoye = !!envoi.envoye;
    } catch (erreurEnvoi) {
      emailEnvoye = false;
      console.error('Envoi du lien de vérification impossible :', erreurEnvoi.message);
    }

    // 6. PAS de jeton de session ici : la connexion est bloquée tant que
    //    l'email n'est pas vérifié (voir login()).
    return res.status(201).json({
      succes: true,
      message: emailEnvoye
        ? 'Compte créé ! Consultez votre boîte mail pour confirmer votre adresse email.'
        : 'Compte créé, mais l\'email de confirmation n\'a pas pu être envoyé. Utilisez « Renvoyer l\'email » pour réessayer.',
      email_verifie: false,
      email: nouvelUtilisateur.email,
      // En développement : le lien est renvoyé pour ne pas dépendre
      // d'une boîte mail réelle.
      ...(process.env.NODE_ENV !== 'production' ? { user: nouvelUtilisateur } : {})
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription :', error);
    return res.status(500).json({
      succes: false,
      message: 'Erreur interne du serveur lors de l\'inscription.',
      erreur: error.message
    });
  }
}

/**
 * Connexion d'un utilisateur existant
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, mot_de_passe } = req.body;

    // 1. Validation des champs
    if (!email || !mot_de_passe) {
      return res.status(400).json({
        succes: false,
        message: 'L\'email et le mot de passe sont requis.'
      });
    }

    // 2. Recherche de l'utilisateur par email
    // email_verifie est indispensable : il conditionne l'accès à la session.
    const resultat = await db.query(
      'SELECT id, nom, email, mot_de_passe_hash, role, avatar_url, email_verifie FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (resultat.rows.length === 0) {
      return res.status(401).json({
        succes: false,
        message: 'Identifiants incorrects (email ou mot de passe invalide).'
      });
    }

    const utilisateur = resultat.rows[0];

    // 3. Comparaison du mot de passe en clair avec le hash stocké
    const motDePasseValide = await bcrypt.compare(mot_de_passe, utilisateur.mot_de_passe_hash);

    if (!motDePasseValide) {
      return res.status(401).json({
        succes: false,
        message: 'Identifiants incorrects (email ou mot de passe invalide).'
      });
    }

    // 4. Blocage tant que l'adresse email n'est pas confirmée.
    //    Le mot de passe est validé avant ce contrôle pour ne pas
    //    révéler à un tiers qu'un compte existe mais n'est pas activé.
    if (!utilisateur.email_verifie) {
      return res.status(403).json({
        succes: false,
        code: 'EMAIL_NON_VERIFIE',
        email: utilisateur.email,
        message: 'Votre adresse email n\'est pas encore confirmée. Consultez votre boîte mail pour activer votre compte.'
      });
    }

    // 5. Génération du token JWT
    const token = signerToken(utilisateur);

    return res.json({
      succes: true,
      message: 'Connexion réussie !',
      token,
      user: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        email: utilisateur.email,
        role: utilisateur.role,
        avatar_url: utilisateur.avatar_url,
        email_verifie: utilisateur.email_verifie
      }
    });
  } catch (error) {
    console.error('Erreur lors de la connexion :', error);
    return res.status(500).json({
      succes: false,
      message: 'Erreur interne du serveur lors de la connexion.',
      erreur: error.message
    });
  }
}

/**
 * Récupération du profil de l'utilisateur connecté
 * GET /api/auth/profile
 */
async function getProfile(req, res) {
  try {
    const resultat = await db.query(
      'SELECT id, nom, email, role, avatar_url, date_creation FROM users WHERE id = $1',
      [req.user.id]
    );

    if (resultat.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Utilisateur introuvable.'
      });
    }

    return res.json({
      succes: true,
      user: resultat.rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la récupération du profil.',
      erreur: error.message
    });
  }
}

/**
 * Mise à jour du profil de l'utilisateur connecté
 * PUT /api/auth/profile
 */
async function updateProfile(req, res) {
  try {
    const { nom, email, phone, avatar_url, avatarUrl } = req.body;
    const userId = req.user.id;
    const avatar = avatar_url || avatarUrl;

    if (!nom && !avatar) {
      return res.status(400).json({
        succes: false,
        message: 'Le nom ou l\'avatar est obligatoire.'
      });
    }

    let resultat;
    if (avatar && nom) {
      resultat = await db.query(
        `UPDATE users
         SET nom = $1, avatar_url = $2
         WHERE id = $3
         RETURNING id, nom, email, role, avatar_url, date_creation`,
        [nom.trim(), avatar, userId]
      );
    } else if (avatar) {
      resultat = await db.query(
        `UPDATE users
         SET avatar_url = $1
         WHERE id = $2
         RETURNING id, nom, email, role, avatar_url, date_creation`,
        [avatar, userId]
      );
    } else {
      resultat = await db.query(
        `UPDATE users
         SET nom = $1
         WHERE id = $2
         RETURNING id, nom, email, role, avatar_url, date_creation`,
        [nom.trim(), userId]
      );
    }

    if (resultat.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Utilisateur introuvable.'
      });
    }

    return res.json({
      succes: true,
      message: 'Profil mis à jour avec succès.',
      user: resultat.rows[0]
    });
  } catch (error) {
    console.error('Erreur mise à jour profil :', error);
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la mise à jour du profil.',
      erreur: error.message
    });
  }
}

/**
 * Changement de mot de passe
 * PUT /api/auth/change-password
 */
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        succes: false,
        message: 'Le mot de passe actuel et le nouveau mot de passe sont requis.'
      });
    }

    // 8 caractères minimum, comme à l'inscription et à la réinitialisation.
    // Accepter 6 ici permettrait de dégrader un mot de passe qui avait été choisi
    // avec une règle stricte, en partant d'un compte pourtant valide.
    if (newPassword.length < 8) {
      return res.status(400).json({
        succes: false,
        message: 'Le nouveau mot de passe doit comporter au moins 8 caractères.'
      });
    }

    // Récupérer le hash actuel
    const userRes = await db.query('SELECT mot_de_passe_hash FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Utilisateur introuvable.'
      });
    }

    const mdpValide = await bcrypt.compare(currentPassword, userRes.rows[0].mot_de_passe_hash);
    if (!mdpValide) {
      return res.status(400).json({
        succes: false,
        message: 'Le mot de passe actuel est incorrect.'
      });
    }

    const nouveauHash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET mot_de_passe_hash = $1 WHERE id = $2', [nouveauHash, userId]);

    return res.json({
      succes: true,
      message: 'Mot de passe modifié avec succès.'
    });
  } catch (error) {
    console.error('Erreur changement mot de passe :', error);
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors du changement de mot de passe.',
      erreur: error.message
    });
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
};
