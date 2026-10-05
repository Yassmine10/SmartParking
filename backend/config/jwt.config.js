// ====================================================================
// CONFIGURATION DES TOKENS JWT
// Source unique de vérité pour le secret et la durée de validité.
// Évite de dupliquer la clé secrète dans plusieurs fichiers
// (une divergence rendrait les tokens invalides selon le module utilisé).
// ====================================================================

require('dotenv').config();

const crypto = require('crypto');

// Les deux rôles reconnus par l'application.
// 'manager' = administrateur de la plateforme (gestion des parkings,
// des places, des réservations, des utilisateurs et des rôles).
const ROLES = ['user', 'manager'];

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '72h';

// -------------------------------------------------------------------
// CLÉ DE SIGNATURE DES TOKENS
// -------------------------------------------------------------------
// C'est le secret le plus sensible du projet : quiconque possède cette
// clé peut fabriquer un jeton d'administrateur et prendre le contrôle de
// l'API. Elle ne doit donc JAMAIS être écrite en dur ici : un dépôt Git
// est lisible par tout le monde, y compris par un correcteur.
//
// On la lit donc uniquement dans le fichier .env, qui n'est jamais
// versionné (voir .gitignore).
let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    // En production, démarrer sans clé imposée serait une faille
    // critique : on refuse donc de démarrer.
    throw new Error(
      'JWT_SECRET est absent du fichier .env.\n' +
      'Générez une clé avec la commande :\n' +
      '  node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"\n' +
      'puis ajoutez-la dans backend/.env'
    );
  }

  // En développement on ne bloque pas le travail de l'étudiant, mais on
  // le prévient clairement et on génère une clé aléatoire. Elle change à
  // chaque redémarrage : les sessions ouvertes seront alors invalidées.
  JWT_SECRET = crypto.randomBytes(64).toString('hex');
  console.warn(
    '\n' +
    '='.repeat(70) + '\n' +
    '  AVERTISSEMENT : JWT_SECRET n\'est pas défini dans backend/.env\n' +
    '='.repeat(70) + '\n' +
    '  Une clé temporaire a été générée pour cette session seulement.\n' +
    '  Conséquence : toutes les sessions seront invalidées au prochain\n' +
    '  redémarrage du serveur.\n' +
    '\n' +
    '  Pour éviter cela, ajoutez JWT_SECRET dans backend/.env :\n' +
    '    node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"\n' +
    '='.repeat(70) + '\n'
  );
}

/**
 * Génère un token JWT pour un utilisateur.
 * @param {{id:*, nom:*, email:*, role:*}} utilisateur
 * @returns {string}
 */
function signerToken(utilisateur) {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    {
      id: utilisateur.id,
      nom: utilisateur.nom,
      email: utilisateur.email,
      role: utilisateur.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

module.exports = { JWT_SECRET, JWT_EXPIRES_IN, ROLES, signerToken };