# Liste des fonctionnalités à tester avant la soutenance — SmartParking

## Vérifications automatisées (5 octobre 2026)

- `npm run build:android` : réussi; le bundle compilé utilise l'URL d'émulateur
  `10.0.2.2:3000`.
- `npx cap sync android` : réussi; les sept plugins Capacitor, dont le scanner
  natif et les notifications locales, sont synchronisés.
- API Places : test Node avec PostgreSQL embarqué réussi (création, doublon,
  propriété du parking, suppression sans historique, blocage avec historique).
- `npm test -- --watch=false` : bloqué avant l'exécution des tests par une
  résolution ESM d'Ionic (`@ionic/core/components`); le rapport indique aussi
  qu'aucun test n'est défini dans `app.component.spec.ts`.
- `npm run lint` : en échec sur les règles Angular ESLint de syntaxe de contrôle
  et d'injection, présentes dans le projet existant.
- APK, caméra, GPS et notifications sur émulateur/téléphone : non testés; Java,
  Android SDK et `adb` ne sont pas disponibles dans l'environnement courant.
- `npm audit` : 13 avis dans les dépendances (3 critiques, 2 élevés,
  8 modérés); aucune mise à niveau majeure/forcée n'a été appliquée.
- Audit des dépendances backend : 5 avis au total (4 élevés, 1 critique);
  2 concernent les dépendances d'exécution (1 élevé, 1 critique).

Les cases ci-dessous restent décochées tant que le test correspondant n'a pas
été réalisé manuellement sur l'application.

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
- [ ] Le QR code scanné par le gestionnaire correspond au `code_qr` du serveur
- [ ] Entrée et sortie validées par le gestionnaire

## Notifications
- [ ] Demande de permission au démarrage de l'app
- [ ] Notification planifiée 15 minutes avant la fin d'une réservation
- [ ] Annulation de notification lors de l'annulation d'une réservation

## Espace Gestionnaire — Parkings
- [ ] Liste des parkings du gestionnaire
- [ ] Ajout d'un nouveau parking (formulaire avec nom, adresse, nb places, tarif)
- [ ] Modification d'un parking existant
- [ ] Suppression avec confirmation
- [ ] Affichage des places par statut (libre/occupée/hors service)
- [ ] Changement de statut d'une place par swipe
- [ ] Choix de la position du parking sur la mini-carte
- [ ] Ajout d'une place et refus d'un numéro en double
- [ ] Suppression d'une place sans historique; suppression avec historique refusée

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
- [ ] `npm run build:android` sans erreurs
- [ ] `npx cap sync android` sans erreurs
- [ ] APK debug généré via `.\gradlew.bat assembleDebug`
- [ ] App installable sur device/émulateur Android
- [ ] API joignable depuis l'émulateur (`10.0.2.2`) ou le téléphone
- [ ] Scan QR natif validé sur l'appareil
- [ ] Rappel local reçu et annulation du rappel vérifiée sur l'appareil
