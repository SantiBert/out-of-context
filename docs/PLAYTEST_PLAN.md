# Plan de playtest presencial

Plan para sesiones con grupos de 4 a 8 personas y un solo teléfono Android. No registra una sesión realizada. No cambia reglas ni el comportamiento de la aplicación.

El reglamento de la mesa está en [GAME_DESIGN_DOCUMENT.md](GAME_DESIGN_DOCUMENT.md), secciones 4 a 12. El modo de un solo dispositivo está en la sección 16 de ese documento. Este plan solo dice cómo observar el build actual.

## Qué hace el build hoy

1. En Inicio, «Partida presencial» abre Nombres.
2. Se anotan de 4 a 8 nombres, en el orden en que mirarían la carta. El teléfono se pasa de mano en mano.
3. «Revisar» y «Confirmar» sortean 15 pilas si hay 4 a 6 nombres y 16 si hay 7 u 8, desde las 36 de `backend/cards.json`. Reparten la primera ronda y abren Carta. La carta empieza cubierta.
4. «Ver carta» muestra el número y el texto de esa persona. «Ocultar» la tapa antes de pasar el teléfono.

Mesa, Carga y Resultados se alcanzan después de ocultar todas las cartas. Si quedan pilas, Resultados ofrece «Siguiente ronda» y vuelve a Carta. Si no alcanzan, el título pasa a Marcador. El facilitador no completa en el teléfono un paso que la pantalla no ofrece. No se anotan votos ni puntos a mano dentro de la aplicación.

«Inicio» no borra la partida. Si todavía está en Nombres, volver a «Partida presencial» abre esa lista. Si ya se repartió, abre la fase guardada. Cerrar el proceso pierde la partida: el puerto activo es memoria del proceso, no un archivo.

La conversación y el gesto, cuando haya cartas, ocurren en la mesa. El teléfono no pide manos levantadas ni «¡Basta!». La condición `L × 2 > N` sigue abierta para este modo y no se usa como fallo de la pantalla.

## Objetivos

Cada sesión busca tres observaciones:

- Si el grupo entiende, sin tutorial aparte, que el teléfono se pasa y que solo mira su carta quien corresponde.
- En qué paso se detiene el recorrido.
- Qué pregunta o error aparece, con las palabras del grupo.

La sesión no declara el MVP aceptado. Confirmar una lista válida reparte. El texto «La lista está guardada. Todavía no hay una carta para mirar.» ya no es el corte esperado de este recorrido.

## Material

- Un teléfono Android con el build anotado en la plantilla.
- De 4 a 8 personas además del facilitador, o el facilitador sentado fuera de la cuenta.
- Reloj. Papel o el archivo de la plantilla.
- No hace falta mazo físico para el recorrido que el build permite. No se sustituye el reparto del teléfono por cartas de papel y se lo anota como si la aplicación hubiera repartido.

## Instalación del build

La aplicación es Expo. El nombre visible es Out Of Context. El identificador Android es `com.outofcontext.app`. No se cambia: no hubo un APK verificado y un dominio definitivo queda para el propietario. En `mobile/app.json`, `version` es `1.0.0` y `android.versionCode` es `1`. Esos dos campos son la fuente. `prebuild` vuelve a generar `android/`; no se edita el Gradle a mano. En cada APK instalable se sube `version` y se suma 1 a `versionCode`. El comando de desarrollo sigue siendo `npm run android` (`expo run:android`). No hay un servicio externo de compilación ni EAS. La variante debug sigue con la firma de depuración. La variante release no la hereda: en cada `prebuild`, el plugin `mobile/plugins/withReleaseSigning.js` lee `mobile/keystore.properties` si el archivo existe. Sin ese archivo, la compilación de release falla. El keystore y `keystore.properties` no se versionan. El ejemplo `mobile/keystore.properties.example` deja las contraseñas vacías.

Para crear la clave más adelante, desde `mobile/`, `keytool` pide las contraseñas y no se escriben en el comando:

```text
keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore -alias outofcontext -keyalg RSA -keysize 2048 -validity 10000
```

Se copian el archivo `release.keystore` y las contraseñas a un lugar fuera del repositorio. `storeFile` en `keystore.properties` apunta a `../../release.keystore`. Perder el keystore o las contraseñas impide actualizar `com.outofcontext.app`.

El manifiesto generado pide Internet, almacenamiento hasta el API 32, vibración y ventana de alerta. Este corte no los quita.

Los íconos de `mobile/assets/` son la plantilla de Expo, no arte del juego. `splash-icon.png` existe y `app.json` no declara la pantalla de inicio. Falta que el propietario entregue el ícono, el ícono adaptable y la pantalla de inicio. No se dibujan recursos nuevos.

El modo presencial no necesita el servidor para abrir Nombres. `EXPO_PUBLIC_API_URL` solo se lee al crear una sala, unirse o abrir el socket. `mobile/.env` no se copia al repositorio.

Para generar el APK de prueba, desde `mobile/`:

```text
npx expo prebuild --platform android
android\gradlew.bat assembleDebug
```

Si la compilación termina, el archivo queda en `android/app/build/outputs/apk/debug/app-debug.apk`. Lo firma el almacén de depuración de esa máquina. Se instala abriéndolo en el teléfono o con `adb install -r` sobre esa ruta. Android puede pedir permiso para instalar desde ese origen.

Actualizar en la misma máquina reemplaza la aplicación, porque la firma de depuración coincide. En otra máquina hay que desinstalarla antes: la firma de depuración no es la misma.

Compilación del 16 de octubre de 2026: `android\gradlew.bat assembleDebug` falló a los 4 min 59 s. El JDK era OpenJDK 25.0.4.1 (Temurin) y el SDK estaba en `ANDROID_HOME`. CMake rechazó una llamada restringida de `java.lang.System` en `:react-native-screens:configureCMakeDebug[arm64-v8a]` y en `:expo-modules-core:configureCMakeDebug[arm64-v8a]`. `android/` ya existía, así que no se volvió a correr `prebuild`. Esta corrida no produjo ni verificó un APK. Hay un archivo anterior en esa ruta, del 15 de octubre de 2026; no es el resultado de esta compilación. El campo Build de la plantilla se deja vacío hasta que una compilación termine. Cuando termine, se anota `1.0.0` y la fecha.

APK release del 17 de octubre de 2026. El entorno tenía OpenJDK 25.0.4.1 (Temurin), `JAVA_HOME` en ese JDK, `ANDROID_HOME` en el SDK y `mobile/android/gradlew.bat`. La identidad leída de `app.json` y del Gradle generado es Out Of Context, `com.outofcontext.app`, versión `1.0.0`, `versionCode` 1. No están `mobile/keystore.properties` ni `release.keystore`. La clave no se creó. En `android/app/build.gradle` el tipo release sigue con `signingConfig signingConfigs.debug`, porque el plugin de firma entra recién en el próximo `prebuild`. Correr `assembleRelease` sobre ese archivo firmaría con la clave de depuración. Esa firma no sustituye a la de release. `assembleRelease` no se ejecutó. No hay carpeta `android/app/build/outputs/apk/release/`. No hay SHA-256 ni verificación de firma de esta corrida.

En ese mismo Gradle, `bundleCommand` es `export:embed` y las variantes que omiten el empaquetado quedan en el valor por defecto, solo debug. Un APK release que llegue a generarse incluye el JavaScript y no usa el servidor Metro. Esa lectura es del archivo de compilación. `apksigner.bat` está en `build-tools\37.0.0` del SDK y no se ejecutó: no hay artefacto.

Cuando la clave esté en la máquina, fuera del repositorio, la regeneración es:

```text
cd mobile
npx expo prebuild --platform android
cd android
.\gradlew.bat assembleRelease
```

El APK queda en `mobile/android/app/build/outputs/apk/release/`. Si el archivo existe, la firma y el hash se comprueban así:

```text
& "$env:ANDROID_HOME\build-tools\37.0.0\apksigner.bat" verify --print-certs ruta\app-release.apk
Get-FileHash -Algorithm SHA256 ruta\app-release.apk
```

## Métricas

Se anotan solo fases que el grupo alcanzó.

| Métrica | Cómo se registra |
|---|---|
| Finalización | Sí o no, y el último paso de la lista. |
| Duración | Hora de inicio y de cierre. Minutos de cada fase alcanzada. |
| Dudas | La pregunta, literal, y el paso en que surgió. |
| Errores | Acción distinta de lo que la pantalla pide, carta de otra persona a la vista, o un dato que la pantalla no dejó guardar. |
| Interrupciones | Llamada, bloqueo de pantalla, cierre de la aplicación, teléfono pasado de mano, u otra persona que toma el aparato. |
| Satisfacción | Al cerrar, cada persona que usó el teléfono completa el cuestionario de [PLAYTEST_EVALUATION.md](PLAYTEST_EVALUATION.md). La escala va de 1 a 5. No se pide si la persona no llegó a usar el teléfono. |

## Severidad

| Severidad | Cuándo usarla |
|---|---|
| Bloqueante | No se puede seguir, o alguien ve el número o el texto de la carta de otra persona. |
| Alto | El grupo solo sigue si el facilitador indica el botón, o la partida desaparece al salir de la aplicación. |
| Medio | La misma duda aparece en más de una persona o en más de un paso. |
| Bajo | Preferencia de una palabra, de un tamaño o de un orden, y el grupo igual completa el paso. |

La carta vacía con el texto «La lista está guardada. Todavía no hay una carta para mirar.», después de confirmar una lista válida, se anota como defecto. Antes de confirmar, esa pantalla no es el recorrido.

## Escenarios

Los cinco usan la misma lista de pasos. Cambia la cantidad de jugadores. Al confirmar, el teléfono sortea 15 pilas en A, B y C, y 16 en D y E, desde las 36 de `backend/cards.json`.

| Escenario | Jugadores | Pilas iniciales | Pilas por ronda | Manos para «¡Basta!» |
|---|---:|---:|---:|---:|
| A | 4 | 15 | 3 | 3 |
| B | 5 | 15 | 3 | 3 |
| C | 6 | 15 | 3 | 4 |
| D | 7 | 16 | 4 | 4 |
| E | 8 | 16 | 4 | 5 |

Las pilas y las manos salen de las secciones 4 y 8 del reglamento. «¡Basta!» es conducta de mesa. El teléfono no la comprueba.

### Pasos

| Paso | Qué hace el grupo | En este build |
|---|---|---|
| 1 | Abre la aplicación y toca «Partida presencial». | Se puede. |
| 2 | Anota la cantidad de nombres del escenario, en el orden en que se sentaron. Usa el teclado. | Se puede. Menos de 4 no confirma. Más de 8 no agrega. |
| 3 | Toca «Revisar» y después «Confirmar». | Se puede. |
| 4 | Mira la pantalla Carta. | Se puede. La carta está cubierta y nombra a la primera persona. El número y el texto aparecen solo con Ver carta. |
| 5 | Cada persona ve solo su carta y la oculta antes de pasar el teléfono. | Se puede. Ocultar tapa la carta y pasa a la persona siguiente. |
| 6 | Conversan en la mesa, sin mirar cartas en el teléfono. | Se puede después de que todos ocultaron. La mesa no muestra cartas. |
| 7 | Cierran la conversación en la mesa y votan a la vez, contando de 3 a 0. Nadie se abstiene. | El gesto es en la mesa: señalar, puño o V, según la sección 9. El teléfono no pide manos ni «¡Basta!». |
| 8 | Registran en el teléfono el gesto que vieron y lo revisan antes de calcular. | Se puede. La carga pide revisar los gestos porque al cerrar se calculan los puntos. |
| 9 | Leen los puntos de la ronda y el total de la partida. | Se puede. |
| 10 | Si quedan pilas, pasan a otra carta secreta. Si no, leen el marcador y quiénes empatan en el máximo. | Se puede. «Siguiente ronda» abre otra carta cubierta. Si no quedan pilas, el marcador dice que la partida terminó. |

Si el grupo, antes del paso 4, toca «Inicio» y otra vez «Partida presencial», se anota si reaparecen los nombres. Si cierran la aplicación desde el paso 4 y la vuelven a abrir, se anota si la lista sigue. Lo esperado con este puerto es que la lista no siga.

## Protocolo

1. El facilitador anota fecha, escenario, build y hora de inicio. No explica reglas que la pantalla no muestra. Puede leer en voz alta solo lo que el teléfono ya dice.
2. Entrega el teléfono a quien el grupo elija para el primer nombre. A partir de ahí observa y no toca el aparato, salvo un bloqueo técnico que impida seguir (pantalla congelada, cierre involuntario).
3. Anota dudas y errores en el momento, con el número de paso. No anota el texto ni el número de la carta de otra persona. Si una carta llegara a verse, anota solo quién la tenía a la vista y quién más la vio.
4. No se corta en la carta cubierta. No se lee en voz alta el número ni el texto de la carta de otra persona. Se sigue el recorrido mientras la pantalla ofrezca el paso.
5. No se cambia el código durante la sesión. El mismo día se copian el registro de la sesión y la consolidación del cuestionario.
6. Una sesión usa un solo escenario. Repetir con otra cantidad es otra sesión y otra plantilla.

## Plantilla de sesión

El registro de cada sesión se copia desde [PLAYTEST_SESSIONS.md](PLAYTEST_SESSIONS.md). Ese archivo todavía no tiene sesiones cargadas. No se anotan nombres ni el texto de una carta.

## Qué no cubre esta sesión

No cubre el online ni la paridad con el servidor. `start_game` no usa este mazo. El presencial reparte desde `backend/cards.json`. El recorrido de los pasos 5 a 10 se observa si la pantalla lo ofrece, sin dar por hecho el resultado de antemano.
