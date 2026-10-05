// ====================================================================
// MIDDLEWARE DE VALIDATION ET DE LIMITATION DE DÉBIT
// ====================================================================

const { validationResult } = require('express-validator');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// ====================================================================
// LIMITATION DE DÉBIT
// ====================================================================

/**
 * Limite les tentatives répétées sur un même point d'entrée.
 * Objectif : rendre la force brute coûteuse sans gêner un usage normal.
 *
 * `cle` permet de choisir ce qui identifie une tentative. Par défaut on
 * compte par IP seule, ce qui punit collectivement tous les utilisateurs
 * d'une même adresse (campus, NAT d'entreprise, partage d'une connexion
 * mobile) : dix erreurs de saisie d'un inconnu suffisent à bloquer tout le
 * monde pendant quinze minutes.
 *
 * @param {{minutes?: number, max?: number, message?: string, cle?: Function}} options
 */
function limiteRequetes({ minutes = 15, max = 10, message, cle } = {}) {
  return rateLimit({
    windowMs: minutes * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // On ne compte que les échecs : un utilisateur qui se trompe deux fois
    // puis réussit ne doit pas être bloqué, mais un robot qui échoue
    // 10 fois de suite si.
    skipSuccessfulRequests: true,
    ...(cle ? { keyGenerator: cle } : {}),
    handler: (req, res) => {
      res.status(429).json({
        succes: false,
        code: 'TROP_DE_TENTATIVES',
        message: message || `Trop de tentatives. Réessayez dans ${minutes} minute(s).`
      });
    }
  });
}

/**
 * Identifie une tentative par IP ET par email visé.
 *
 * Deux conséquences :
 *  - un attaquant ne peut pas verrouiller le compte d'une victime en
 *   Provoyant volontairement des mots de passe erronés depuis sa machine ;
 *  - derrière une IP partagée, un utilisateur bloqué sur SON adresse ne
 *    bloque pas ses voisins.
 */
function cleParEmail(req) {
  const ip = ipKeyGenerator(req.ip);
  const email = String(req.body?.email || '').toLowerCase().trim();
  return email ? `${ip}|${email}` : ip;
}

// Connexion : deux limites complémentaires.
//   - par IP seule, plafond large : protège le serveur d'une attaque qui
//     fait tourner les adresses pour contourner la limite par compte ;
//   - par IP + email, plus stricte : protège un compte précis.
const limiteConnexionParIp = limiteRequetes({
  minutes: 15,
  max: 30,
  message: 'Trop de tentatives de connexion depuis cet appareil. Réessayez dans 15 minutes.'
});

const limiteConnexionParCompte = limiteRequetes({
  minutes: 15,
  max: 10,
  cle: cleParEmail,
  message: 'Trop de tentatives de connexion pour ce compte. Réessayez dans 15 minutes.'
});

const limiteConnexion = [limiteConnexionParIp, limiteConnexionParCompte];

// Inscription : limitée par IP, c'est elle qui borne le volume de comptes
// créés depuis une même machine.
const limiteInscription = limiteRequetes({
  minutes: 60,
  max: 5,
  message: 'Trop de créations de compte depuis cet appareil. Réessayez plus tard.'
});

// Envoi d'emails : limité par IP + adresse visée. Deux personnes derrière la
// même IP ne doivent pas se priver mutuellement du bouton « renvoyer ».
const limiteEmail = limiteRequetes({
  minutes: 30,
  max: 5,
  cle: cleParEmail,
  message: 'Trop d\'emails de vérification demandés. Réessayez dans 30 minutes.'
});

const limiteReset = limiteRequetes({
  minutes: 30,
  max: 5,
  cle: cleParEmail,
  message: 'Trop de demandes de réinitialisation. Réessayez dans 30 minutes.'
});

// ====================================================================
// VALIDATION DES ENTRÉES
// ====================================================================
// Les règles elles-mêmes sont déclarées au plus près de chaque route
// (voir routes/*.routes.js) : elles sont ainsi lisibles avec le point
// d'entrée qu'elles protègent, et il n'existe pas de catalogue central
// à désynchroniser.

/**
 * Transforme les erreurs express-validator en réponse JSON 422 uniforme.
 *
 * Note : depuis express-validator v6, les erreurs ne sont plus déposées dans
 * req.validationErrors ; elles se récupèrent via validationResult(req).
 * (Une version antérieure de ce middleware lisait req.validationErrors et
 * laissait donc TOUT passer en silence.)
 */
function gererErreursValidation(req, res, next) {
  const resultat = validationResult(req);

  if (resultat.isEmpty()) {
    return next();
  }

  const erreurs = resultat.array();

  return res.status(422).json({
    succes: false,
    code: 'VALIDATION',
    message: erreurs[0].msg || 'Données invalides.',
    erreurs: erreurs.map(e => ({ champ: e.path, message: e.msg }))
  });
}

/**
 * Middleware d-erreur global : garantit qu'aucune erreur ne fuite
 * au client sous forme de trace d'exécution.
 */
function gestionnaireErreurs(err, req, res, next) {
  // Si des headers ont déjà été envoyés, on délègue à Express.
  if (res.headersSent) {
    return next(err);
  }

  console.error('Erreur serveur non interceptée :', err);

  return res.status(err.status || 500).json({
    succes: false,
    message: err.expose
      ? err.message
      : 'Erreur interne du serveur.',
    ...(process.env.NODE_ENV !== 'production' && !err.expose
      ? { erreur: err.message }
      : {})
  });
}

module.exports = {
  limiteConnexion,
  limiteInscription,
  limiteEmail,
  limiteReset,
  limiteRequetes,
  gererErreursValidation,
  gestionnaireErreurs
};
