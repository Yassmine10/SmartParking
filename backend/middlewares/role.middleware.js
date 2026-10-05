// ====================================================================
// MIDDLEWARE DE VÉRIFICATION DES RÔLES
//
// Modèle retenu : 2 rôles
//   - 'user'    : réserve des places, consulte ses propres données
//   - 'manager' : administrateur de la plateforme (parkings, places,
//                 réservations, utilisateurs, rôles)
//
// Le rôle utilisé ici provient toujours de la base (voir auth.middleware.js),
// jamais du contenu du token : il ne peut donc pas être falsifié.
// ====================================================================

/**
 * Exige que l'utilisateur authentifié possède l'un des rôles autorisés.
 * @param {...string} rolesAutorises
 * @returns {import('express').RequestHandler}
 */
function exigerRole(...rolesAutorises) {
  return function (req, res, next) {
    // L'utilisateur doit avoir été authentifié par verifierToken au préalable
    if (!req.user) {
      return res.status(401).json({
        succes: false,
        message: 'Utilisateur non authentifié.'
      });
    }

    if (!rolesAutorises.includes(req.user.role)) {
      return res.status(403).json({
        succes: false,
        message: 'Accès interdit. Cette action est réservée aux administrateurs.'
      });
    }

    return next();
  };
}

/** Raccourci : réservé au rôle 'manager' (administrateur). */
const verifierRoleManager = exigerRole('manager');

module.exports = { exigerRole, verifierRoleManager };
