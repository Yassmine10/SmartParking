// ====================================================================
// SERVICE DE GESTION DES JETONS (vérification email, réinitialisation)
//
// Principe de sécurité : le jeton n'est JAMAIS stocké en clair.
//   1. On génère un jeton aléatoire (crypto.randomBytes) -> envoyé par email
//   2. On stocke son empreinte SHA-256 en base
//   3. À la validation, on hache le jeton reçu et on compare
//
// Conséquence : un_dump de la base ne permet pas de vérifier un compte
// ni de réinitialiser le mot de passe de quelqu'un.
// ====================================================================

const crypto = require('crypto');

/** Durée de validité du lien de vérification d'email. */
const DUREE_VERIFICATION_HEURES = 24;

/** Durée de validité du lien de réinitialisation de mot de passe. */
const DUREE_RESET_MINUTES = 60;

/**
 * Génère un jeton aléatoire sûr et son empreinte.
 * @returns {{token: string, hash: string, expire: Date}}
 */
function genererToken(dureeHeures = DUREE_VERIFICATION_HEURES) {
  const token = crypto.randomBytes(32).toString('hex');
  return {
    token,
    hash: hacherToken(token),
    expire: new Date(Date.now() + dureeHeures * 3600 * 1000),
  };
}

/** Empreinte SHA-256 d'un jeton. */
function hacherToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/** Expire le jeton dans N heures (défaut 24). */
function expirationVerification() {
  return new Date(Date.now() + DUREE_VERIFICATION_HEURES * 3600 * 1000);
}

/** Expire le jeton dans N minutes (défaut 60). */
function expirationReset() {
  return new Date(Date.now() + DUREE_RESET_MINUTES * 60 * 1000);
}

/**
 * Vérifie qu'un token de la DB n'est pas expiré.
 * @param {Date|string|null} expire
 */
function estExpire(expire) {
  if (!expire) return true;
  return new Date(expire).getTime() <= Date.now();
}

module.exports = {
  genererToken,
  hacherToken,
  expirationVerification,
  expirationReset,
  estExpire,
  DUREE_VERIFICATION_HEURES,
  DUREE_RESET_MINUTES,
};
