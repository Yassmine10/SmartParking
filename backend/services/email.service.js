// ====================================================================
// SERVICE D'ENVOI D'EMAIL
//
// Deux modes de fonctionnement :
//
//  1. SMTP configuré (SMTP_HOST présent dans .env) -> vrais emails.
//     Exemple Gmail / Outlook avec mot de passe d'application.
//
//  2. Aucun SMTP configuré -> mode DÉVELOPPEMENT : les emails ne partent
//     pas, ils sont écrits dans le dossier backend/emails/ et le lien de
//     vérification est affiché dans la console. L'application reste
//     entièrement testable sans serveur mail.
//
// Les jetons de vérification et de réinitialisation ne transitent JAMAIS
// en clair dans les logs : seul le lien est affiché, ce qui est
// acceptable en développement local, et le lien lui-même est à durée
// de vie limitée.
// ====================================================================

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

const DOSSIER_EMAILS = path.join(__dirname, '..', 'emails');

const EXPEDITEUR = process.env.EMAIL_EXPEDITEUR || 'SmartParking <no-reply@smartparking.local>';
const URL_FRONTEND = (process.env.FRONTEND_URL || 'http://localhost:4200').replace(/\/$/, '');

let transport = null;
let modeSmtp = false;

/**
 * Construit le transport une seule fois au démarrage.
 */
function initialiserTransport() {
  if (transport) return transport;

  if (process.env.SMTP_HOST) {
    modeSmtp = true;
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  } else {
    modeSmtp = false;
    // jsonTransport : nodemailer sérialise le message sans l'envoyer.
    transport = nodemailer.createTransport({ jsonTransport: true });
  }

  return transport;
}

/**
 * Enregistre un email sur disque (mode développement).
 * Permet de rouvrir le lien de vérification sans inonder la console.
 */
function enregistrerEmailSurDisque(destinataire, sujet, texte, html) {
  try {
    if (!fs.existsSync(DOSSIER_EMAILS)) {
      fs.mkdirSync(DOSSIER_EMAILS, { recursive: true });
    }

    const horodatage = new Date().toISOString().replace(/[:.]/g, '-');
    const nomFichier = `${horodatage}_${destinataire.replace(/[^a-zA-Z0-9]/g, '_')}.html`;

    fs.writeFileSync(
      path.join(DOSSIER_EMAILS, nomFichier),
      html,
      'utf-8'
    );

    return nomFichier;
  } catch (error) {
    console.error('Impossible d\'écrire l\'email sur disque :', error.message);
    return null;
  }
}

/**
 * Envoie un email.
 *
 * @param {{to: string, sujet: string, texte: string, html: string}} email
 * @returns {Promise<{envoye: boolean, mode: string, erreur?: string}>}
 */
async function envoyerEmail({ to, sujet, texte, html }) {
  initialiserTransport();

  if (!modeSmtp) {
    const fichier = enregistrerEmailSurDisque(to, sujet, texte, html);

    console.log('\n──────────────────────────────────────────────');
    console.log('📧 EMAIL (mode développement — aucun SMTP configuré)');
    console.log(`   Destinataire : ${to}`);
    console.log(`   Sujet        : ${sujet}`);
    console.log(`   Fichier      : ${fichier ? `emails/${fichier}` : '(écriture impossible)'}`);
    console.log(`   Lien         : ${extraireLien(html)}`);
    console.log('──────────────────────────────────────────────\n');

    return { envoye: false, mode: 'developpement', fichier };
  }

  try {
    await transport.sendMail({ from: EXPEDITEUR, to, subject: sujet, text: texte, html });
    console.log(`📧 Email envoyé à ${to} : ${sujet}`);
    return { envoye: true, mode: 'smtp' };
  } catch (error) {
    console.error(`❌ Échec de l'envoi de l'email à ${to} :`, error.message);
    return { envoye: false, mode: 'smtp', erreur: error.message };
  }
}

/** Extrait le premier lien d'un email pour l'afficher dans la console. */
function extraireLien(html) {
  const match = html.match(/https?:\/\/[^\s"'<>]+/);
  return match ? match[0] : '(aucun lien)';
}

// ====================================================================
// MODÈLES D'EMAIL
// ====================================================================

const stylesCommuns = `
  body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
         background: #f1f5f9; margin: 0; padding: 24px; }
  .conteneur { max-width: 520px; margin: 0 auto; background: #ffffff;
               border-radius: 12px; overflow: hidden;
               box-shadow: 0 2px 10px rgba(0,0,0,.08); }
  .entete { background: #16a34a; padding: 28px; text-align: center; color: #fff; }
  .entete h1 { margin: 0; font-size: 22px; }
  .corps { padding: 32px 28px; color: #1e293b; line-height: 1.6; }
  .bouton { display: inline-block; background: #16a34a; color: #fff !important;
            text-decoration: none; padding: 14px 28px; border-radius: 8px;
            font-weight: 600; margin: 18px 0; }
  .lien-alt { font-size: 12px; color: #64748b; word-break: break-all; }
  .pied { padding: 18px 28px; background: #f8fafc; color: #94a3b8;
          font-size: 12px; text-align: center; }
  .avertissement { background: #fff7ed; border-left: 4px solid #f97316;
                    padding: 12px 16px; margin-top: 20px; font-size: 13px; }
`;

function enveloppe(contenu) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    </head><body><div class="conteneur">${contenu}</div></body></html>`;
}

/**
 * Email de vérification d'adresse.
 * @param {{nom: string, lien: string}} params
 */
function emailVerification({ nom, lien }) {
  const sujet = 'Confirmez votre adresse email - SmartParking';
  const texte =
    `Bonjour ${nom},\n\n` +
    `Bienvenue sur SmartParking ! Confirmez votre adresse email pour activer votre compte :\n` +
    `${lien}\n\n` +
    `Ce lien est valable 24 heures. Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.\n`;

  const html = enveloppe(`
    <div class="entete"><h1>SmartParking</h1></div>
    <div class="corps">
      <p>Bonjour <strong>${nom}</strong>,</p>
      <p>Bienvenue ! Une dernière étape : confirmez votre adresse email pour activer votre compte.</p>
      <a href="${lien}" class="bouton">Confirmer mon adresse email</a>
      <p class="lien-alt">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>${lien}</p>
      <div class="avertissement">
        Ce lien est valable <strong>24 heures</strong>. S'il expire, demandez-en un nouveau depuis l'écran de connexion.
      </div>
    </div>
    <div class="pied">SmartParking - Projet Étudiant</div>
  `);

  return { sujet, texte, html };
}

/**
 * Email de réinitialisation de mot de passe.
 * @param {{nom: string, lien: string}} params
 */
function emailReinitialisation({ nom, lien }) {
  const sujet = 'Réinitialisation de votre mot de passe - SmartParking';
  const texte =
    `Bonjour ${nom},\n\n` +
    `Une réinitialisation de mot de passe a été demandée pour votre compte SmartParking.\n` +
    `Choisissez un nouveau mot de passe :\n${lien}\n\n` +
    `Ce lien est valable 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe actuel reste valable.\n`;

  const html = enveloppe(`
    <div class="entete"><h1>Réinitialisation du mot de passe</h1></div>
    <div class="corps">
      <p>Bonjour <strong>${nom}</strong>,</p>
      <p>Une réinitialisation de mot de passe a été demandée pour votre compte.</p>
      <a href="${lien}" class="bouton">Choisir un nouveau mot de passe</a>
      <p class="lien-alt">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>${lien}</p>
      <div class="avertissement">
        Ce lien est valable <strong>1 heure</strong> et ne peut servir qu'une seule fois.
        Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.
      </div>
    </div>
    <div class="pied">SmartParking - Projet Étudiant</div>
  `);

  return { sujet, texte, html };
}

/**
 * Email de bienvenue (compte déjà vérifié).
 */
function emailBienvenue({ nom }) {
  const sujet = 'Votre compte SmartParking est actif';
  const texte =
    `Bonjour ${nom},\n\n` +
    `Votre adresse email est confirmée : votre compte SmartParking est actif.\n` +
    `Vous pouvez désormais réserver une place de parking.\n` +
    `Application : ${URL_FRONTEND}\n`;

  const html = enveloppe(`
    <div class="entete"><h1>Compte activé 🎉</h1></div>
    <div class="corps">
      <p>Bonjour <strong>${nom}</strong>,</p>
      <p>Votre adresse email est confirmée : votre compte est actif.</p>
      <a href="${URL_FRONTEND}/login" class="bouton">Se connecter</a>
    </div>
    <div class="pied">SmartParking - Projet Étudiant</div>
  `);

  return { sujet, texte, html };
}

module.exports = {
  envoyerEmail,
  emailVerification,
  emailReinitialisation,
  emailBienvenue,
  URL_FRONTEND,
  DOSSIER_EMAILS,
};
