-- ====================================================================
-- DONNÉES DE DÉMONSTRATION (SEED)
-- Mot de passe pour tous les comptes : "Password123!"
-- Hash bcrypt généré avec un cost factor de 10
-- ====================================================================

-- 1. Insertion des Utilisateurs (1 Gestionnaire, 2 Utilisateurs)
-- email_verifie = TRUE : ces comptes de démonstration sont fournis prêts à
-- l'emploi. Les comptes créés via /api/auth/register, eux, doivent confirmer
-- leur adresse email avant de pouvoir se connecter.
INSERT INTO users (nom, email, mot_de_passe_hash, role, avatar_url, email_verifie) VALUES
('Ahmed Gestionnaire', 'manager@smartparking.com', '$2b$10$mECLJQbmBOehegFv48hewOnmb/LlZJmdDcALdjWlhPnPXr63K5hJm', 'manager', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', TRUE),
('Youssef Ben Salem', 'user@smartparking.com', '$2b$10$mECLJQbmBOehegFv48hewOnmb/LlZJmdDcALdjWlhPnPXr63K5hJm', 'user', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80', TRUE),
('Sarra Trabelsi', 'sarra@smartparking.com', '$2b$10$mECLJQbmBOehegFv48hewOnmb/LlZJmdDcALdjWlhPnPXr63K5hJm', 'user', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80', TRUE);

-- 2. Insertion des Parkings (à Tunis et alentours - id_gestionnaire = 1)
INSERT INTO parkings (nom, adresse, latitude, longitude, prix_heure, image_url, id_gestionnaire) VALUES
('Parking Central Habib Bourguiba', 'Avenue Habib Bourguiba, Centre Ville, Tunis', 36.8002000, 10.1865000, 2.50, 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80', 1),
('Parking Lac 2 Business Center', 'Rue du Lac Léman, Les Berges du Lac 2, Tunis', 36.8395000, 10.2378000, 3.50, 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=600&q=80', 1),
('Parking Carthage Amphithéâtre', 'Rue Hannibal, Carthage, Tunis', 36.8528000, 10.3235000, 2.00, 'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=600&q=80', 1);

-- 3. Insertion des Places pour chaque Parking
-- Parking 1 : 10 places
INSERT INTO places (id_parking, numero, statut, type_place) VALUES
(1, 'A01', 'libre', 'STANDARD'),
(1, 'A02', 'occupee', 'STANDARD'),
(1, 'A03', 'libre', 'STANDARD'),
(1, 'A04', 'libre', 'HANDICAPE'),
(1, 'A05', 'occupee', 'ELECTRIQUE'),
(1, 'A06', 'libre', 'STANDARD'),
(1, 'A07', 'hors_service', 'STANDARD'),
(1, 'A08', 'libre', 'VIP'),
(1, 'A09', 'libre', 'STANDARD'),
(1, 'A10', 'libre', 'STANDARD');

-- Parking 2 : 8 places
INSERT INTO places (id_parking, numero, statut, type_place) VALUES
(2, 'B01', 'libre', 'STANDARD'),
(2, 'B02', 'libre', 'STANDARD'),
(2, 'B03', 'occupee', 'ELECTRIQUE'),
(2, 'B04', 'libre', 'HANDICAPE'),
(2, 'B05', 'occupee', 'STANDARD'),
(2, 'B06', 'libre', 'VIP'),
(2, 'B07', 'libre', 'STANDARD'),
(2, 'B08', 'libre', 'STANDARD');

-- Parking 3 : 6 places
INSERT INTO places (id_parking, numero, statut, type_place) VALUES
(3, 'C01', 'libre', 'STANDARD'),
(3, 'C02', 'libre', 'STANDARD'),
(3, 'C03', 'libre', 'HANDICAPE'),
(3, 'C04', 'occupee', 'STANDARD'),
(3, 'C05', 'libre', 'ELECTRIQUE'),
(3, 'C06', 'libre', 'STANDARD');

-- 4. Insertion d'exemples de Réservations
INSERT INTO reservations (id_user, id_place, debut, fin, montant_total, statut, code_qr) VALUES
(2, 2, CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_TIMESTAMP + INTERVAL '2 hours', 7.50, 'ACTIVE', 'SP-RES-2026-A02-9981'),
(2, 6, CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP + INTERVAL '1 day 3 hours', 7.50, 'CONFIRMEE', 'SP-RES-2026-A06-4412'),
(3, 13, CURRENT_TIMESTAMP - INTERVAL '5 hours', CURRENT_TIMESTAMP - INTERVAL '3 hours', 7.00, 'TERMINEE', 'SP-RES-2026-B03-1120');

-- 5. Insertion de Notifications de démonstration
INSERT INTO notifications (id_user, titre, message, type, lue) VALUES
(1, 'Bienvenue sur SmartParking', 'Votre compte gestionnaire a été créé avec succès.', 'success', FALSE),
(1, 'Nouveau parking créé', 'Le parking "Parking Central Habib Bourguiba" a été ajouté.', 'info', FALSE),
(1, 'Réservation confirmée', 'Une nouvelle réservation a été effectuée au Parking Lac 2.', 'warning', TRUE),
(2, 'Réservation confirmée', 'Votre réservation pour la place A02 a été confirmée.', 'success', FALSE),
(2, 'Rappel de paiement', 'N''oubliez pas de régler votre réservation avant la date prévue.', 'warning', FALSE),
(3, 'Réservation terminée', 'Votre réservation pour la place B03 est terminée. Merci!', 'info', TRUE);
