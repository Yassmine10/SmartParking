# Tableau de correspondance — Notions du cours → Fichiers du projet

| Notion du cours | Fichier(s) correspondant(s) |
|---|---|
| Formulaire template-driven | `frontend/src/app/shared/components/modal-reservation/modal-reservation.component.ts` |
| Formulaire réactif | `frontend/src/app/pages/auth/login/login.page.ts` |
| ModalController | `frontend/src/app/pages/parking-details/parking-details.page.ts` |
| ion-item-sliding | `frontend/src/app/pages/reservations/reservations.page.html`, `frontend/src/app/pages/admin/parkings/parkings.page.html` |
| Routing lazy-loaded sans préchargement des routes protégées | `frontend/src/app/app-routing.module.ts` |
| Guards d'authentification et de rôle (`canMatch` + `canActivate`) | `frontend/src/app/core/guards/` |
| HttpClient + Interceptor | `frontend/src/app/core/interceptors/`, `frontend/src/app/core/services/*.service.ts` |
| Geolocation (Capacitor) | `frontend/src/app/core/services/geolocation.service.ts` |
| Notifications locales et rappels de réservation (Capacitor) | `frontend/src/app/core/services/notification.service.ts` |
| QR Code réservation (génération) | `frontend/src/app/pages/reservation-details/reservation-details.page.ts` |
| Scan QR natif (Capacitor 8) | `frontend/src/app/pages/admin/qr-scanner/qr-scanner.page.ts` |
| Mini-carte de choix de position (Leaflet / OpenStreetMap) | `frontend/src/app/pages/admin/parkings/parkings.page.ts` |
| Gestion des places par gestionnaire | `backend/controllers/places.controller.js`, `frontend/src/app/pages/admin/parkings/parkings.page.ts` |
| ng2-charts (Chart.js) | `frontend/src/app/pages/admin/dashboard/dashboard.page.ts` |
| Pipes personnalisés | `frontend/src/app/shared/pipes/` |
| Ionic Components | Tous les fichiers `*.page.html` |
| Build APK Android | `BUILD_ANDROID.md` |
