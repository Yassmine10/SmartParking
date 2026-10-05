# SmartParking

Application mobile de recherche et réservation de places de parking, développée avec Ionic + Angular côté front, puis Node.js + Express + PostgreSQL côté back.

## Stack réelle du projet

- Frontend : Ionic + Angular + TypeScript + Capacitor
- Backend : Node.js + Express + PostgreSQL
- Authentification : JWT + bcrypt
- Base de données : PostgreSQL via `pg`, avec fallback automatique par `pg-mem` en local
- Cartographie : Leaflet + OpenStreetMap
- QR Code : `angularx-qrcode`
- Graphiques : `ng2-charts`
- E-mails : `nodemailer`

## Structure du dépôt

```text
smartparking/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── database/
│   ├── middlewares/
│   ├── routes/
│   ├── services/
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   ├── package.json
│   └── capacitor.config.ts
├── .gitignore
├── README.md
├── BUILD_ANDROID.md
├── COURSE_MAPPING.md
├── TEST_CHECKLIST.md
├── docker-compose.yml
└── LICENSE (si présent)
```

## Prérequis

- Node.js 18+
- npm 9+
- PostgreSQL 14+ (ou le mode fallback embarqué du projet)
- Ionic CLI : `npm install -g @ionic/cli`

## Démarrage rapide

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

L’API écoute sur : http://localhost:3000

### Frontend

```bash
cd frontend
npm install
npm start
```

L’app Ionic démarre sur : http://localhost:8100

## Comptes de démonstration

Les comptes seedés du projet sont prêts à l’emploi :

- manager@smartparking.com / Password123!
- user@smartparking.com / Password123!

## Vérification rapide

J’ai validé sur le code réel que :
- le backend démarre ;
- l’authentification fonctionne sur un compte seedé ;
- les règles métier corrigées sont prises en compte côté serveur ;
- le build frontend compile sans erreur critique.

## Points importants pour le cours

Le projet suit bien la logique du cours :
- Ionic + Angular + lazy loading
- JWT côté API
- formulaires réactifs / template
- services Angular
- gardes de route
- protection par token
- PostgreSQL avec transaction pour la réservation

## Note de cohérence

Le README précédent décrivait une stack ASP.NET Core alors que le dépôt réel est Node.js / Express / PostgreSQL. Ce fichier a été aligné sur le code réellement présent dans le dépôt.
