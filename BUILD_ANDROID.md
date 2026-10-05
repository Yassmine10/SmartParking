# Génération et test de l'APK Android — SmartParking

## Prérequis
- Node.js 22 ou supérieur.
- Android Studio 2025.2.1 ou supérieur avec le SDK Android installé.
- Un émulateur ou un téléphone Android pour les tests caméra, GPS et notifications.
- Le plugin natif de scan utilise `@capacitor/barcode-scanner` 3.1.2, compatible
  avec Capacitor 8 et nécessitant `minSdkVersion = 26`.

Android Studio installe le JDK compatible avec Capacitor. Vérifier dans Android
Studio que le SDK et au moins un émulateur sont installés.

## Étapes

1. **Installer les dépendances et créer la plateforme (une seule fois)**
   ```bash
   cd frontend
   npm ci
   npx cap add android
   ```

   `minSdkVersion = 26` est requis par le scanner. Le plugin de notifications
   déclare la permission d'alarmes exactes ; Android peut toutefois la désactiver
   dans les paramètres de l'application et les rappels peuvent alors être retardés.

   Le manifeste de debug autorise HTTP pour le backend local. Cette exception
   n'est pas activée dans les builds release : utiliser HTTPS pour publier.

2. **Construire la version Android et synchroniser Capacitor**
   ```bash
   npm run build:android
   npx cap sync android
   ```

   La configuration Android de développement utilise `10.0.2.2` pour joindre
   le backend lancé sur le PC depuis l'émulateur Android. Pour un téléphone réel,
   remplacer cette adresse dans `src/environments/environment.android.ts` par
   l'adresse IP locale accessible du PC, ou utiliser une URL HTTPS de déploiement.

3. **Ouvrir le projet natif**
   ```bash
   npx cap open android
   ```
   Puis attendre la synchronisation Gradle dans Android Studio.

4. **Générer un APK debug sous Windows**
   ```bash
   cd android
   .\gradlew.bat assembleDebug
   ```
   L'APK se trouve dans `android/app/build/outputs/apk/debug/app-debug.apk`.

5. **Installer sur l'émulateur ou le téléphone**
```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Tester ensuite le scan d'un QR de réservation, l'accès caméra, la géolocalisation,
la permission et le rappel de notification, puis l'accès au backend depuis l'appareil.

## Publication

La configuration `environment.android.ts` est réservée aux tests locaux. Avant
de publier, configurer une URL HTTPS réelle pour l'API et générer un APK signé
depuis Android Studio. Ne pas publier une APK qui pointe vers `10.0.2.2` ou
vers un backend HTTP local.
