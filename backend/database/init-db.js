// ====================================================================
// SCRIPT D'INITIALISATION ET DE SEED DE LA BASE POSTGRESQL
// Exécution : npm run init-db
// ====================================================================

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function initialiser() {
  console.log('🔄 Connexion au serveur PostgreSQL...');

  const configServeur = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  };

  // 1. Connexion initiale à la base par défaut 'postgres' pour créer 'smartparking' si nécessaire
  const clientPostgres = new Client({
    ...configServeur,
    database: 'postgres'
  });

  try {
    await clientPostgres.connect();
    console.log('✅ Connecté au serveur PostgreSQL.');

    const verifDb = await clientPostgres.query(
      "SELECT 1 FROM pg_database WHERE datname = $1", 
      [process.env.DB_NAME || 'smartparking']
    );

    if (verifDb.rows.length === 0) {
      console.log(`📦 Création de la base "${process.env.DB_NAME || 'smartparking'}"...`);
      await clientPostgres.query(`CREATE DATABASE "${process.env.DB_NAME || 'smartparking'}"`);
      console.log('✅ Base de données créée.');
    } else {
      console.log(`ℹ️ La base de données "${process.env.DB_NAME || 'smartparking'}" existe déjà.`);
    }

    await clientPostgres.end();

    // 2. Connexion directe à la base 'smartparking' pour exécuter schema.sql et seed.sql
    const clientSmartParking = new Client({
      ...configServeur,
      database: process.env.DB_NAME || 'smartparking'
    });

    await clientSmartParking.connect();
    console.log(`📡 Connecté à la base "${process.env.DB_NAME || 'smartparking'}".`);

    // Exécution du schéma (tables)
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      await clientSmartParking.query(schemaSql);
      console.log('✅ Tables créées avec succès (schema.sql).');
    }

    // Exécution du seed (données de test)
    const seedPath = path.join(__dirname, 'seed.sql');
    if (fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, 'utf-8');
      await clientSmartParking.query(seedSql);
      console.log('✅ Données de démonstration insérées (seed.sql).');
    }

    await clientSmartParking.end();
    console.log('🎉 Initialisation terminée avec succès ! La base est prête.');
  } catch (error) {
    console.error('❌ Impossible de se connecter à PostgreSQL :', error.message);
    console.log('💡 Conseil : Démarrez votre service PostgreSQL ou pgAdmin, vérifiez les identifiants dans .env, puis relancez : npm run init-db');
  }
}

initialiser();
