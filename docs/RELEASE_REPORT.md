# Informe de release candidate Android

Informe del 17 de octubre de 2026. Reúne OOC-017 y OOC-018.1 a OOC-018.7. No publica en Google Play y no distribuye un APK.

## 1. Estado de las tareas

OOC-017 no tiene sesiones reales. [PLAYTEST_REPORT.md](PLAYTEST_REPORT.md) ya recomienda NO-GO para una distribución más amplia.

OOC-018.1 a OOC-018.4 dejaron la identidad `com.outofcontext.app`, versión `1.0.0`, `versionCode` 1, un plugin de firma que no hereda la clave de depuración, y pruebas de unidad de que el núcleo presencial no llama a la red. OOC-018.5 no compiló release: faltan `keystore.properties` y `release.keystore`. OOC-018.6 no instaló nada; el emulador `emulator-5554` estaba encendido y no se usó. OOC-018.7 escribió [ANDROID_DISTRIBUTION.md](ANDROID_DISTRIBUTION.md).

OOC-015 sigue `BLOCKED`. OOC-017 y OOC-018 no se marcan hechas.

## 2. Verificaciones automáticas

El 17 de octubre de 2026, en `mobile/`:

- `npm test`: 28 suites, 176 tests, pasó.
- `npx tsc --noEmit`: pasó.
- `npx expo lint`: pasó.

No se volvió a correr el backend: esta serie no lo cambia. `npm run android` no se ejecutó.

## 3. APK firmado de release

No existe. No están `mobile/keystore.properties` ni `release.keystore`. No existe `mobile/android/app/build/outputs/apk/release/`. No hay firma verificada ni SHA-256. El APK debug del 15 de octubre no es este artefacto.

## 4. Instalación y apertura

No ejecutadas. [ANDROID_INSTALL.md](ANDROID_INSTALL.md) deja los nueve escenarios sin correr. No se instaló ni se abrió la aplicación en el emulador.

## 5. Flujo presencial

Las pruebas de unidad cubren el sorteo de 15 pilas con 4 jugadores y 16 con 8, el texto de `backend/cards.json`, la carta cubierta y la ronda siguiente en el documento. No hay una sesión con jugadores reales.

## 6. Privacidad y persistencia

La carta de otra persona no se dibuja en la pasada: las pruebas de unidad lo comprueban en memoria. [PERSISTENCIA_PRESENCIAL.md](PERSISTENCIA_PRESENCIAL.md) dice que cerrar y volver a abrir reanuda la partida. El código usa un `Map` del proceso en `mobile/src/features/local/match/autosave.ts`. Cerrar la aplicación la pierde. No hay `expo-file-system`. Eso no se vio en un teléfono.

## 7. Secretos y permisos

La clave de release no se creó y no está en el repositorio. El manifiesto generado pide Internet, almacenamiento hasta el API 32, ventana de alerta y vibración. No se auditaron en un dispositivo. Con una sesión de invitado ya guardada, el cascarón abre un socket aunque la pantalla sea local. No se apagó la red de un teléfono.

## 8. Defectos pendientes

- No hay un APK de release firmado.
- No hay instalación ni apertura comprobadas.
- La partida no sobrevive al cierre del proceso, y la especificación dice que sí.
- `start_game` no llama a `create_piles`.
- No hubo playtest real.
- El 16 de octubre de 2026, `assembleDebug` falló con JDK 25 en la compilación nativa.

## 9. Notas de versión

El fuente declara Out Of Context, `com.outofcontext.app`, versión `1.0.0`, `versionCode` 1. Ese número no corresponde a un artefacto generado. No hay un release candidate para instalar.

## 10. Recomendación

**NO-GO** para distribución privada. Falta un APK firmado verificable, faltan la instalación y la apertura, y la persistencia al cerrar la aplicación no cumple la especificación.
