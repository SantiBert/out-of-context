# Instalación y actualización Android

Informe del 17 de octubre de 2026. No marca una épica hecha. No cambia reglas ni el almacenamiento.

## Artefacto

OOC-018.5 no generó un APK de release. No están `mobile/keystore.properties` ni `release.keystore`. No existe `mobile/android/app/build/outputs/apk/release/`. No hay SHA-256 de esa corrida. El APK debug del 15 de octubre no se usó.

Identidad prevista, leída de `mobile/app.json` y no instalada: Out Of Context, `com.outofcontext.app`, versión `1.0.0`, `versionCode` 1.

## Entorno consultado

`adb devices -l` mostró un emulador ya encendido: `emulator-5554`, producto `sdk_gphone16k_x86_64`, modelo `sdk_gphone16k_x86_64`, dispositivo `emu64xa16k`. No se leyó la versión de Android. No se inició otro emulador. No se instaló, no se desinstaló y no se borraron datos.

| Dato | Valor |
|---|---|
| Dispositivo o emulador | `emulator-5554` (`sdk_gphone16k_x86_64`) |
| Versión Android | No leída |
| Versión anterior | Ninguna instalada en esta corrida |
| Versión nueva | Ninguna. El APK `1.0.0` (`versionCode` 1) no existe |

## Persistencia que corre hoy

[PERSISTENCIA_PRESENCIAL.md](PERSISTENCIA_PRESENCIAL.md) dice que cerrar y volver a abrir reanuda la única partida activa. El código arranca con `createMemoryStorage()` en `mobile/src/features/local/match/autosave.ts`: un `Map` de este proceso. No hay `expo-file-system`. Cerrar la aplicación, actualizar o reiniciar el teléfono pierde la partida. Las pruebas de unidad cubren el documento en memoria. No es un fallo visto en un teléfono, así que no se cambia el almacenamiento.

El núcleo presencial no llama a la red. Si ya hay una sesión de invitado, el cascarón online abre un socket aunque la pantalla sea local. No se apagó la red del emulador.

## Escenarios

| # | Escenario | Resultado |
|---|---|---|
| 1 | Instalación limpia del APK | No ejecutado. No hay APK de release. |
| 2 | Primera apertura | No ejecutado. No se instaló la aplicación. |
| 3 | Creación de una partida presencial | No ejecutado. No se abrió la aplicación en el emulador. |
| 4 | Cierre y reapertura | No ejecutado. El código guarda la partida solo en la memoria del proceso. |
| 5 | Actualización desde una versión anterior compatible | No ejecutado. No hay una versión anterior instalada por esta corrida ni un APK nuevo. |
| 6 | Recuperación de una partida activa tras actualizar | No ejecutado. No hubo actualización. |
| 7 | Reinicio del dispositivo y recuperación | No ejecutado. No se reinició el emulador. |
| 8 | Finalización y abandono de partidas | No ejecutado. No se jugó una partida en el emulador. |
| 9 | Comportamiento sin conexión | No ejecutado en el teléfono. Las pruebas de unidad ya muestran que el núcleo local no llama a `fetch` ni abre un socket. Con una sesión de invitado guardada, el cascarón sí abre un socket. La red del emulador siguió como estaba. |

## Incidencias

No hay un defecto confirmado en un dispositivo. No se reprodujo un fallo de instalación porque no hubo instalación.

Queda abierto, sin corrección en esta historia: la especificación reanuda la partida al cerrar la aplicación y el puerto activo no sobrevive al proceso. También queda abierto el APK firmado de release.
