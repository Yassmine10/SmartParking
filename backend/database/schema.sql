-- ====================================================================
-- PROJET SMARTPARKING - SCRIPT DE CRÉATION DE LA BASE DE DONNÉES
-- Base de données : PostgreSQL
-- ====================================================================

-- Nettoyage des anciennes tables si elles existent (dans l'ordre inverse des clés étrangères)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS places CASCADE;
DROP TABLE IF EXISTS parkings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Table des Utilisateurs (Rôles : 'user' ou 'manager')
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'manager')),
    avatar_url TEXT,
    -- Vérification de l'adresse email : un compte ne peut se connecter
    -- qu'après avoir cliqué sur le lien reçu par email.
    email_verifie BOOLEAN NOT NULL DEFAULT FALSE,
    -- Jetons stockés HACHÉS (sha256) : une fuite de la base ne permet pas
    -- de fabriquer un lien de vérification ou de réinitialisation valide.
    token_verification VARCHAR(64),
    token_verification_expire TIMESTAMP,
    token_reset VARCHAR(64),
    token_reset_expire TIMESTAMP,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table des Parkings (associés à un gestionnaire)
CREATE TABLE parkings (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(150) NOT NULL,
    adresse VARCHAR(255) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    prix_heure NUMERIC(8, 2) NOT NULL CHECK (prix_heure >= 0),
    image_url VARCHAR(500),
    -- Ces quatre champs sont saisis par le formulaire d'administration.
    -- Sans eux, ce que l'utilisateur tape était silencieusement ignoré.
    description TEXT,
    heure_ouverture VARCHAR(5),
    heure_fermeture VARCHAR(5),
    couvert BOOLEAN NOT NULL DEFAULT FALSE,
    id_gestionnaire INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Table des Places de parking (statuts : 'libre', 'occupee', 'hors_service')
CREATE TABLE places (
    id SERIAL PRIMARY KEY,
    id_parking INTEGER NOT NULL REFERENCES parkings(id) ON DELETE CASCADE,
    numero VARCHAR(20) NOT NULL,
    statut VARCHAR(30) NOT NULL DEFAULT 'libre' CHECK (statut IN ('libre', 'occupee', 'hors_service')),
    type_place VARCHAR(30) NOT NULL DEFAULT 'STANDARD' CHECK (type_place IN ('STANDARD', 'HANDICAPE', 'ELECTRIQUE', 'VIP')),
    CONSTRAINT unique_place_par_parking UNIQUE (id_parking, numero)
);

-- 4. Table des Réservations (avec code QR et statuts)
CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    id_user INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    id_place INTEGER NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    debut TIMESTAMP NOT NULL,
    fin TIMESTAMP NOT NULL,
    montant_total NUMERIC(8, 2) NOT NULL DEFAULT 0,
    statut VARCHAR(30) NOT NULL DEFAULT 'CONFIRMEE' CHECK (statut IN ('CONFIRMEE', 'ACTIVE', 'TERMINEE', 'ANNULEE')),
    code_qr VARCHAR(255) NOT NULL UNIQUE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_dates_coherentes CHECK (fin > debut)
);

-- 5. Table des Notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    id_user INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    titre VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'danger')),
    lue BOOLEAN NOT NULL DEFAULT FALSE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(id_user, lue);

-- Index pour accélérer les recherches géographiques et la vérification des disponibilités
CREATE INDEX idx_parkings_geo ON parkings(latitude, longitude);
CREATE INDEX idx_reservations_dates ON reservations(id_place, debut, fin, statut);
CREATE INDEX idx_users_email ON users(email);
