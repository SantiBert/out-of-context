# Cliente móvil

Aplicación Android de Out Of Context. El proyecto usa Expo, React Native y TypeScript. El gestor de paquetes es npm. La pantalla inicial está en `src/screens/HomeScreen.tsx`.

Las dependencias y sus versiones están en `package.json` y `package-lock.json`.

## Requisitos

- Node.js y npm.
- Para la compilación de desarrollo Android: JDK y Android SDK. Ese entorno no está disponible en la máquina donde se inicializó el proyecto, así que `npm run android` no se ejecutó.

## Comandos

Desde `mobile/`:

```powershell
npm install
npm test
npm run typecheck
npm start
npm run android
```

- `npm test` ejecuta Jest.
- `npm run typecheck` comprueba los tipos con TypeScript.
- `npm start` inicia Metro.
- `npm run android` ejecuta `expo run:android`, genera el proyecto nativo y compila el development build. Requiere JDK y Android SDK.

`mobile/android/` y `mobile/ios/` se generan con prebuild y no se versionan.
