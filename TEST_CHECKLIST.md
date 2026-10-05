# Liste des fonctionnalités à tester avant la soutenance — SmartParking

## Authentification
- [ ] Inscription avec email/mot de passe (rôle user)
- [ ] Inscription avec rôle gestionnaire
- [ ] Connexion et redirection selon le rôle
- [ ] Déconnexion
- [ ] Guard d'authentification (accès non authentifié bloqué)
- [ ] Guard de rôle (accès gestionnaire bloqué pour user)

## Carte & Parkings
- [ ] Affichage de la carte avec la position GPS
- [ ] Marqueurs des parkings sur la carte
- [ ] Navigation vers les détails d'un parking
- [ ] Affichage des informations du parking (nom, adresse, tarif, places disponibles)

## Réservation
- [ ] Ouverture de la modale de réservation depuis parking-details
- [ ] Formulaire de réservation (date début, date fin, sélection de place)
- [ ] Création d'une réservation et redirection vers l'historique
- [ ] Affichage de l'historique des réservations
- [ ] Annulation d'une réservation par swipe (ion-item-sliding)
- [ ] Toast de confirmation après annulation

## QR Code
- [ ] Affichage de la page reservation-details
- [ ] QR code généré et visible
- [ ] Informations de la réservation affichées correctement

## Notifications
- [ ] Demande de permission au démarrage de l'app
- [ ] Notification planifiée 30 minutes avant la fin d'une réservation
- [ ] Annulation de notification lors de l'annulation d'une réservation

## Espace Gestionnaire — Parkings
- [ ] Liste des parkings du gestionnaire
- [ ] Ajout d'un nouveau parking (formulaire avec nom, adresse, nb places, tarif)
- [ ] Modification d'un parking existant
- [ ] Suppression avec confirmation
- [ ] Affichage des places par statut (libre/occupée/hors service)
- [ ] Changement de statut d'une place par swipe

## Espace Gestionnaire — Réservations
- [ ] Liste des réservations reçues avec infos usager
- [ ] Badge de statut coloré (pending/confirmed/cancelled)
- [ ] Confirmation d'une réservation en attente
- [ ] Annulation d'une réservation par swipe

## Statistiques
- [ ] Graphique barres : taux d'occupation par parking (7 derniers jours)
- [ ] Graphique ligne : revenus sur les 30 derniers jours
- [ ] Données chargées depuis l'API

## Build Android
- [ ] ionic build --prod sans erreurs
- [ ] npx cap copy android sans erreurs
- [ ] APK debug généré via ./gradlew assembleDebug
- [ ] App installable sur device/émulateur Android
