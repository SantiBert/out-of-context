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
npm run lint
npm run typecheck
npm run format:check
npm run format
npm start
npm run android
```

- `npm test` ejecuta Jest.
- `npm run lint` ejecuta ESLint con la configuración de Expo y TypeScript.
- `npm run typecheck` comprueba los tipos con TypeScript.
- `npm run format:check` comprueba el formato con Prettier sin modificar archivos.
- `npm run format` aplica el formato de Prettier.
- `npm start` inicia Metro.
- `npm run android` ejecuta `expo run:android`, genera el proyecto nativo y compila el development build. Requiere JDK y Android SDK.

`mobile/android/` y `mobile/ios/` se generan con prebuild y no se versionan.

## Configuración

La URL del backend se lee con `getApiBaseUrl()` en `src/config/env.ts`, desde `EXPO_PUBLIC_API_URL`. Expo solo incorpora al bundle las variables que empiezan por `EXPO_PUBLIC_`. No pongas ahí la clave de Django ni la contraseña de PostgreSQL: esas variables viven en el `.env` de la raíz y no entran en la aplicación.

Desde `mobile/`:

```powershell
Copy-Item .env.example .env
```

Si la variable falta o no es una URL `http` o `https`, el error pide copiar el ejemplo y reiniciar Metro. El valor de ejemplo, `http://10.0.2.2:8000`, sirve para el emulador Android.

- Misma máquina: `http://127.0.0.1:8000`.
- Emulador Android: `http://10.0.2.2:8000`. Apunta al `127.0.0.1` del equipo de desarrollo.
- Dispositivo físico: `http://<IP-LAN-del-equipo>:8000`, en la misma red. Django debe ejecutarse con `runserver 0.0.0.0:8000` y esa IP debe estar en `DJANGO_ALLOWED_HOSTS`. `localhost` en el teléfono no es el equipo de desarrollo.

## Convenciones

### Nombres

- Los componentes y sus archivos usan PascalCase: `HomeScreen` en `src/screens/HomeScreen.tsx`.
- Las funciones, las variables y los hooks usan camelCase. Los hooks empiezan por `use`.
- Los tipos y las interfaces usan PascalCase.
- Las constantes exportadas de un módulo usan camelCase, como `appTitle`.

### Organización

Las carpetas siguen la estructura de `docs/ARCHITECTURE.md` y se crean solo cuando hay código que las ocupe:

- `src/app/`: entrada de la aplicación y proveedores.
- `src/navigation/`: navegación.
- `src/screens/`: pantallas.
- `src/components/`: componentes reutilizables.
- `src/features/`: interfaz, estado y lógica de una funcionalidad.
- `src/services/api/` y `src/services/realtime/`: clientes HTTP y WebSocket.
- `src/config/`: configuración pública del cliente, como la URL del backend.
- `src/types/`: tipos compartidos del cliente.
- `src/utils/`: utilidades pequeñas.
- `src/theme/`: tokens de diseño.

Las pruebas viven en `mobile/__tests__/` o junto al módulo que cubren.

### Imports

- Primero los paquetes externos. Después, separadas por una línea en blanco, las importaciones del proyecto.
- Las pantallas y los componentes se exportan con nombre.
- `export default` queda reservado a `App.tsx`, porque Expo registra ese módulo como raíz.
- Las importaciones del proyecto son relativas. No hay alias de rutas.
