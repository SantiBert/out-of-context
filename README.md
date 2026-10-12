# Out Of Context

Out Of Context es un juego social multijugador para Android. Cada jugador recibe una carta secreta, conversa para reconocer a su equipo y vota de forma simultánea. Quienes comparten la misma carta forman un equipo. Quienes reciben una carta única son impostores.

El cliente móvil está inicializado con Expo, React Native y TypeScript. El backend todavía no está inicializado; esa tarea corresponde a OOC-002.3.

## Stack

| Componente | Tecnología |
|---|---|
| Aplicación móvil | React Native + TypeScript, con Expo y npm |
| Backend | Python + Django REST Framework |
| Base de datos | PostgreSQL |
| Tiempo real | Django Channels y WebSockets |
| Entorno local | Docker Compose |

## Estructura del repositorio

```
.
├── mobile/          Cliente Expo, React Native y TypeScript.
├── backend/         API Django. Se inicializa en OOC-002.3.
├── docs/            Arquitectura, reglas del juego y backlog.
├── .cursor/skills/  Instrucciones de trabajo del repositorio.
├── .gitignore
└── README.md
```

Los contratos de comunicación, Docker Compose y la plantilla de variables de entorno se agregarán en historias posteriores. No forman parte de esta estructura inicial.

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md)
- [Reglas del juego](docs/GAME_DESIGN_DOCUMENT.md)
- [Backlog](docs/BACKLOG.md)

## Desarrollo local

El backend Django todavía no tiene comandos de arranque.

Desde `mobile/`:

```powershell
npm install
npm test
npm run typecheck
npm start
npm run android
```

`npm start` inicia Metro. `npm run android` compila el development build con `expo run:android` y requiere JDK y Android SDK. Esa compilación no se ejecutó en la inicialización porque este entorno no tiene esas herramientas. Más detalle en [mobile/README.md](mobile/README.md).
