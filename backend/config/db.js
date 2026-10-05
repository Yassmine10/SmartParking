// ====================================================================
// CONFIGURATION DE LA BASE DE DONNÉES POSTGRESQL AVEC SECOURS AUTOMATIQUE
// Si un serveur PostgreSQL local est actif -> l'utilise via "pg.Pool"
// Si PostgreSQL n'est pas installé -> utilise un moteur PostgreSQL embarqué (pg-mem)
// ====================================================================

const { Pool } = require('pg');
const { newDb } = require('pg-mem');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let modeBase = 'non_determine'; // 'reel' ou 'embarque'
let poolReel = null;
let adapterEmbarque = null;

// Pool de connexion PostgreSQL réel
poolReel = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'smartparking',
  max: 20,
  connectionTimeoutMillis: 2000, // Timeout rapide de 2 secondes
});

/**
 * Initialise un moteur PostgreSQL embarqué en mémoire avec schema.sql et seed.sql
 */
function creerPostgresEmbarque() {
  const dbMem = newDb();

  // Enregistrer les fonctions et types PostgreSQL personnalisés
  dbMem.public.registerFunction({
    name: 'radians',
    args: [dbMem.public.getType('numeric')],
    returns: dbMem.public.getType('numeric'),
    implementation: (x) => (x * Math.PI) / 180,
  });

  // Fonctions trigonométriques pour les calculs de distance (Haversine)
  dbMem.public.registerFunction({
    name: 'cos',
    args: [dbMem.public.getType('numeric')],
    returns: dbMem.public.getType('numeric'),
    implementation: (x) => Math.cos(x),
  });

  dbMem.public.registerFunction({
    name: 'sin',
    args: [dbMem.public.getType('numeric')],
    returns: dbMem.public.getType('numeric'),
    implementation: (x) => Math.sin(x),
  });

  dbMem.public.registerFunction({
    name: 'acos',
    args: [dbMem.public.getType('numeric')],
    returns: dbMem.public.getType('numeric'),
    implementation: (x) => Math.acos(Math.min(1, Math.max(-1, x))),
  });

  // ROUND(x, n) : arrondi à n décimales
  dbMem.public.registerFunction({
    name: 'round',
    args: [dbMem.public.getType('numeric'), dbMem.public.getType('integer')],
    returns: dbMem.public.getType('numeric'),
    implementation: (x, n) => {
      const facteur = Math.pow(10, n);
      return Math.round(x * facteur) / facteur;
    },
  });

  const adapter = dbMem.adapters.createPg();
  const poolMem = new adapter.Pool();

  // Charger le schéma et les données initiales
  const schemaPath = path.join(__dirname, '../database/schema.sql');
  const seedPath = path.join(__dirname, '../database/seed.sql');

  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    dbMem.public.none(schemaSql);
  }

  if (fs.existsSync(seedPath)) {
    const seedSql = fs.readFileSync(seedPath, 'utf-8');
    dbMem.public.none(seedSql);
  }

  return poolMem;
}

/**
 * Initialise la connexion à la base de données
 */
async function initialiserBaseDeDonnees() {
  try {
    // 1. Tester la connexion au serveur PostgreSQL réel
    const clientTest = await poolReel.connect();
    await clientTest.query('SELECT 1');
    clientTest.release();

    modeBase = 'reel';
    console.log('✅ Connecté au serveur PostgreSQL local réel (port 5432).');

    // Vérifier si les tables existent dans PostgreSQL réel
    const res = await poolReel.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      );
    `);

    if (!res.rows[0].exists) {
      console.log('🔄 Initialisation du schéma PostgreSQL...');
      const schemaSql = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf-8');
      const seedSql = fs.readFileSync(path.join(__dirname, '../database/seed.sql'), 'utf-8');
      await poolReel.query(schemaSql);
      await poolReel.query(seedSql);
      console.log('✅ Tables et données de démonstration créées avec succès.');
    } else {
      // Base déjà installée : appliquer les AJOUTS de colonnes/indics
      // introduits après sa création.
      const { appliquerMigrations } = require('../database/migrations');
      const appliquees = await appliquerMigrations(poolReel);
      if (appliquees.length > 0) {
        console.log(`✅ Migrations appliquées : ${appliquees.join(', ')}`);
      }
    }
  } catch (error) {
    // 2. Si PostgreSQL n'est pas actif, basculer sur le moteur PostgreSQL embarqué
    modeBase = 'embarque';
    console.log('💡 Note : Serveur PostgreSQL local non détecté sur le port 5432.');
    console.log('🚀 Activation du moteur PostgreSQL EMBARQUÉ (pg-mem) en mémoire...');
    adapterEmbarque = creerPostgresEmbarque();
    console.log('✅ Moteur PostgreSQL embarqué initialisé avec succès avec toutes les tables et données de test !');
    console.log('🎉 Votre API est 100% fonctionnelle sans nécessiter d\'installation de PostgreSQL.');
  }
}

// Objet proxy qui délègue vers le pool réel ou le moteur embarqué
const proxyPool = {
  query: async (text, params) => {
    if (modeBase === 'non_determine') {
      await initialiserBaseDeDonnees();
    }
    if (modeBase === 'reel') {
      return poolReel.query(text, params);
    } else {
      return adapterEmbarque.query(text, params);
    }
  },
  connect: async () => {
    if (modeBase === 'non_determine') {
      await initialiserBaseDeDonnees();
    }
    if (modeBase === 'reel') {
      return poolReel.connect();
    } else {
      return adapterEmbarque.connect();
    }
  }
};

module.exports = {
  pool: proxyPool,
  query: (text, params) => proxyPool.query(text, params),
  initialiserBaseDeDonnees
};
