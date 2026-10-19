# Distribución privada Android

Guía para quienes reciben un APK de prueba de Out Of Context. No publica el archivo. No cambia el juego. El informe de lo que no se instaló está en [ANDROID_INSTALL.md](ANDROID_INSTALL.md). El protocolo de una sesión está en [PLAYTEST_PLAN.md](PLAYTEST_PLAN.md).

Hoy no hay un APK de release para compartir.

## 1. Versión

| Dato | Valor |
|---|---|
| Nombre visible | Out Of Context |
| Identificador | `com.outofcontext.app` |
| Versión | `1.0.0` |
| `versionCode` | `1` |

Esos campos viven en `mobile/app.json`. Son la fuente. Cada APK instalable sube `version` y suma 1 a `versionCode`. El Gradle se regenera con `prebuild`; no se edita a mano.

El identificador no se cambia en esta guía: no hubo un APK verificado y un dominio definitivo queda para el propietario.

## 2. Android

No hay una versión mínima comprobada. `app.json` no la declara. El Gradle generado toma `minSdkVersion` de la extensión de Expo, y ese número no está en `app.json`. Ningún teléfono confirmó un piso. No se afirma compatibilidad con una versión concreta de Android.

La aplicación es vertical.

El 17 de octubre de 2026 había un emulador encendido, `emulator-5554` (`sdk_gphone16k_x86_64`). No se instaló la aplicación y no se leyó la versión de Android de ese emulador.

## 3. Instalación

Cuando exista el APK de release, se abre el archivo en el teléfono o se usa `adb install -r` sobre su ruta. Android puede pedir permiso para instalar desde ese origen.

Esa instalación no se ejecutó. No hay archivo en `mobile/android/app/build/outputs/apk/release/`.

## 4. Permisos

El manifiesto generado pide:

- Internet.
- Lectura de almacenamiento, hasta el API 32.
- Escritura de almacenamiento, hasta el API 32.
- Ventana de alerta.
- Vibración.

Este corte no los quita. No se probó cuáles pide el teléfono ni cuáles usa la partida presencial. No se afirma que hagan falta para jugar.

## 5. Actualización

Una versión nueva reemplaza a la anterior si coinciden las tres cosas: el identificador `com.outofcontext.app`, la misma firma de release y un `versionCode` mayor.

Si la firma no coincide, Android no reemplaza la aplicación. No se probó una actualización. No hay una versión anterior instalada por el informe de [ANDROID_INSTALL.md](ANDROID_INSTALL.md).

## 6. Desinstalación y datos locales

Desinstalar borra los datos que Android guarda para esa aplicación.

La partida presencial que corre hoy vive en la memoria del proceso. Cerrar la aplicación ya la pierde. No hay un archivo de partida en el teléfono: el proyecto no usa `expo-file-system`. [PERSISTENCIA_PRESENCIAL.md](PERSISTENCIA_PRESENCIAL.md) dice que al reabrir se reanuda la partida. El código no cumple eso fuera del proceso.

## 7. Limitaciones conocidas

- No hay APK firmado de release ni SHA-256 de esa corrida.
- Un APK debug del 15 de octubre de 2026 no es el artefacto de distribución. La variante debug no empaqueta el JavaScript y necesita el servidor Metro de desarrollo.
- El 16 de octubre de 2026, `assembleDebug` falló con JDK 25 en la compilación nativa. No se instaló otro JDK.
- Los íconos son la plantilla de Expo, no arte del juego. `app.json` no declara la pantalla de inicio.
- Al confirmar los nombres, el teléfono sortea 15 pilas si hay 4 a 6 personas y 16 si hay 7 u 8, desde las 36 de `backend/cards.json`. No comprueba `L × 2 > N`.
- El núcleo de la partida presencial no llama a la red. Si en el teléfono ya hay una sesión de invitado de una sala online, el cascarón de la aplicación abre un socket aunque la pantalla sea la presencial.
- No se apagó la red de un teléfono para comprobar ese recorrido.

## 8. Cómo reportar un error

Se anota en una ficha copiada de [PLAYTEST_SESSIONS.md](PLAYTEST_SESSIONS.md): qué se tocó, en qué paso, y qué mostró la pantalla. No se anotan nombres de jugadores ni el texto de la carta de otra persona.

## 9. Compilación para quien desarrolla

Desde `mobile/`, cuando la clave de release ya está en la máquina y fuera del repositorio:

```text
npx expo prebuild --platform android
cd android
.\gradlew.bat assembleRelease
```

El APK queda en `mobile/android/app/build/outputs/apk/release/`. Sin `mobile/keystore.properties`, esa compilación no firma el archivo. La firma de depuración no se usa como sustituto. `npm run android` es el comando de desarrollo (`expo run:android`) y no produce el APK de esta guía.

Después, si el archivo existe, se puede comprobar la firma con `apksigner verify` del SDK y el hash con `Get-FileHash -Algorithm SHA256`. Esas dos comprobaciones no se ejecutaron: no hay artefacto.

## 10. Firma y respaldo

La clave no está creada. Desde `mobile/`, `keytool` pide las contraseñas. No se escriben en el comando ni en este documento:

```text
keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore -alias outofcontext -keyalg RSA -keysize 2048 -validity 10000
```

Se copian `release.keystore` y las contraseñas a un lugar fuera del repositorio. `mobile/keystore.properties` apunta `storeFile` a `../../release.keystore`. El ejemplo `mobile/keystore.properties.example` deja las contraseñas vacías. Esos dos archivos no se versionan.

En cada `prebuild`, `mobile/plugins/withReleaseSigning.js` lee `keystore.properties` si existe. Si no existe, la variante release no hereda la firma de depuración.

Perder el keystore o las contraseñas impide actualizar `com.outofcontext.app`.
