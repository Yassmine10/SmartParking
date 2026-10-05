# Génération de l'APK Android — SmartParking

## Prérequis
- Android Studio installé avec SDK 33+
- Java JDK 17+
- `ANDROID_HOME` défini dans les variables d'environnement

## Étapes

1. **Build de l'app Angular/Ionic**
   ```bash
   cd frontend
   ionic build --prod
   ```

2. **Synchroniser avec Capacitor**
   ```bash
   npx cap copy android
   npx cap sync android
   ```

3. **Ouvrir dans Android Studio**
   ```bash
   npx cap open android
   ```
   Puis : Build → Generate Signed Bundle/APK → APK → choisir keystore → Release.

4. **Build rapide en debug (sans signature)**
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
   L'APK se trouve dans : `android/app/build/outputs/apk/debug/app-debug.apk`

## Déploiement direct sur device (debug)
```bash
npx cap run android
```
