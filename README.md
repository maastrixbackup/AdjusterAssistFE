# AdjusterAssist

# To generater apk : eas build -p android --profile preview

# Local APK Build (Emulator apk):

## Step1: npx expo prebuild --platform android

## Step 2: cd android

## Step 3: .\gradlew.bat assembleRelease
## .\gradlew.bat assembleDebug

## Step 4: adb install -r app\build\outputs\apk\release\app-release.apk

## adb install app\build\outputs\apk\debug\app-debug.apk
npx expo start --dev-client
