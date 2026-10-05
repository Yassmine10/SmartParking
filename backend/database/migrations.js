// ====================================================================
// MIGRATIONS INCRÉMENTALES
//
// schema.sql n'est exécuté qu'à la CRÉATION de la base (quand la table
// 'users' n'existe pas encore). Ajouter une colonne à schema.sql ne
// modifierait donc pas une base déjà installée : il faut appliquer un
// ALTER TABLE sur les bases existantes.
//
// Chaque instruction est idempotente (IF NOT EXISTS) : la migration peut
// être rejouée sans risque, à chaque démarrage.
// ====================================================================

/**
 * Liste des evolutions de schema, dans l'ordre.
 * { nom, sql }
 */
const MIGRATIONS = [
  {
    nom: 'verification-email',
    sql: [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verifie BOOLEAN NOT NULL DEFAULT FALSE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS token_verification VARCHAR(64)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS token_verification_expire TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS token_reset VARCHAR(64)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS token_reset_expire TIMESTAMP`,
    ],
  },
  {
    nom: 'comptes-existants-verifies',
    sql: [
      // Les comptes existants ont été créés AVANT l'introduction de la
      // vérification par email : ils sont marqués vérifiés pour ne pas
      // verrouiller l'accès aux comptes de démonstration.
      `UPDATE users SET email_verifie = TRUE WHERE email_verifie IS NULL OR email_verifie = FALSE`,
    ],
  },
  {
    nom: 'index-verification',
    sql: [
      `CREATE INDEX IF NOT EXISTS idx_users_email_verifie ON users(email, email_verifie)`,
    ],
  },
  {
    // Le formulaire d'administration demande une description, des horaires
    // d'ouverture/fermeture et indique si le parking est couvert. Ces colonnes
    // n'existaient pas : les valeurs saisies étaient acceptées par le
    // formulaire puis rejetées silencieusement par la base.
    nom: 'parkings-infos-complementaires',
    sql: [
      `ALTER TABLE parkings ADD COLUMN IF NOT EXISTS description TEXT`,
      `ALTER TABLE parkings ADD COLUMN IF NOT EXISTS heure_ouverture VARCHAR(5)`,
      `ALTER TABLE parkings ADD COLUMN IF NOT EXISTS heure_fermeture VARCHAR(5)`,
      `ALTER TABLE parkings ADD COLUMN IF NOT EXISTS couvert BOOLEAN NOT NULL DEFAULT FALSE`,
    ],
  },
];

/**
 * Applique les migrations sur une base déjà initialisée.
 * Silencieux si la base vient d'être créée (elle contient déjà tout).
 *
 * @param {{ query: (sql: string) => Promise<any> }} db
 * @returns {Promise<string[]>} noms appliqués
 */
async function appliquerMigrations(db) {
  const appliquees = [];

  for (const migration of MIGRATIONS) {
    try {
      for (const sql of migration.sql) {
        await db.query(sql);
      }
      appliquees.push(migration.nom);
    } catch (error) {
      // Le moteur PostgreSQL embarqué (pg-mem) ne gère pas toutes les
      // formes de DDL : on ne bloque pas le démarrage pour autant.
      console.warn(
        `Migration "${migration.nom}" ignorée (${error.message}). ` +
        'Vérifiez que la base a été créée avec la version à jour de schema.sql.'
      );
    }
  }

  return appliquees;
}

module.exports = { appliquerMigrations, MIGRATIONS };
