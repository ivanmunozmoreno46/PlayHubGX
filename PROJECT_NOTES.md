# PROJECT_NOTES.md — PlayHubGX

Documento de referencia mantenido por Devin. Se consulta al inicio de cada tarea y se actualiza con cada PR.

---

## 1. Resumen del proyecto

Aplicación web con estética PlayStation 1 que **emula juegos de PS1 en el navegador** y añade **multijugador online P2P**. El `package.json` lo llama `ps1-emulator`, pero en GitHub / PartyKit aparece como `PlayHubGX` / `playhub-gx`.

- Repo: `ivanmunozmoreno46/PlayHubGX`
- Rama principal: `main`
- Rama de trabajo actual: `Online`
- Despliegue: Vercel (auto-detección de Vite). Preview en `*.vercel.app`.

## 2. Stack

- **Frontend:** React 18 + Vite 5 + Tailwind CSS 3 (tema retro personalizado).
- **Emulación:** EmulatorJS (copia local en `public/emulator/` y `public/emulator/EmulatorJS-4.2.3/`) sobre el core `psx` (PCSX-ReARMed) vía WebAssembly.
- **Multijugador:** **PeerJS (P2P sin servidor)** usando signaling servers gratuitos de PeerJS. No hace falta backend propio.
- **Gamepad:** Web Gamepad API con fallback a teclado.
- **Dependencias runtime:** `react`, `react-dom`, `peerjs`, `jszip`.
- **Node:** ≥18, **npm:** ≥9.

## 3. Scripts

```bash
npm install
npm run dev       # Vite dev server en http://localhost:5173
npm run build     # node node_modules/vite/bin/vite.js build -> dist/
npm run preview
```

No hay linter, tests automatizados ni CI configurados.

## 4. Estructura relevante

```
.
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example                 # VITE_PARTYKIT_HOST (legado, ya no se usa)
├── partykit.json                # legado (PartyKit ya no se usa)
├── party/
│   └── game-server.ts           # legado (PartyKit)
├── public/
│   └── emulator/                # EmulatorJS local + EmulatorJS-4.2.3/
└── src/
    ├── main.jsx                 # entry point
    ├── App.jsx                  # carcasa PS1: POWER, LEDs, gamepad indicator, monta EmulatorScreen
    ├── index.css                # estilos globales + efectos CRT
    ├── components/
    │   ├── EmulatorScreen.jsx   # flujo BIOS → ROM → READY → START, contenedor 4:3, integra lobby
    │   ├── MultiplayerLobby.jsx # crear/unirse a sala, lista de jugadores, chat, asignación P1..P8
    │   ├── GamepadIndicator.jsx # estado del mando / teclado
    │   └── KeyboardMapping.jsx  # ayuda visual de mapeo
    └── hooks/
        ├── useEmulator.js       # ciclo de vida EmulatorJS (BIOS/ROM → blobs → globals EJS_* → start)
        ├── useMultiplayer.js    # PeerJS: host = peer id `playhub-<CODE>`, clientes conectan por código
        └── useGamepad.js        # mapeo PS1 ↔ Gamepad API, polling con requestAnimationFrame
```

## 5. Flujos principales

### 5.1 Emulación

1. Usuario pulsa **POWER** en `App.jsx` → se monta `<EmulatorScreen />`.
2. Paso `bios`: el usuario carga un BIOS local (`.bin`/`.rom`, ~512KB). Recomendado `scph5501.bin`.
3. Paso `rom`: el usuario carga la ROM (`.bin`/`.cue`/`.iso`/`.img`/`.chd`/`.pbp`). Si hay `.cue`, se usa como primario.
4. Paso `ready`: START EMULATOR.
5. `useEmulator.initializeEmulator` convierte el BIOS a **data URL base64** (los Web Workers de EmulatorJS no pueden leer blob URLs), crea blob URLs para las ROMs, fija todos los globals `EJS_*` (player, core=`psx`, biosUrl, gameUrl, pathtodata, callbacks, etc.) **antes** de cargar el script, e inyecta el canvas.
6. En `stopEmulator` se revocan blobs, se limpia el DOM y los globals `EJS_*`.

### 5.2 Multijugador (PeerJS)

- **Host:** `createRoom()` genera un código de 6 caracteres (`A-Z2-9` sin letras ambiguas) y abre un `Peer` con id `playhub-<CODE>`.
- **Cliente:** `joinRoom(code)` crea un `Peer` anónimo y se conecta a `playhub-<CODE>`.
- Mensajes intercambiados: `join_request`, `join_accepted`, `players_update`, `chat_message`, `game_started`, `game_stopped`, `leave_room`.
- Hasta **8 jugadores** por sala; el host asigna slots `P1..P8` y puede expulsar.
- El nombre del jugador se persiste en `localStorage` (`playhub_name`).

### 5.3 Gamepad

- Mapeo PS1 → Gamepad API estándar: `CROSS=0, CIRCLE=1, SQUARE=2, TRIANGLE=3`, bumpers `L1/R1=4/5`, triggers `L2/R2=6/7`, `SELECT=8`, `START=9`, `L3/R3=10/11`.
- Fallback teclado (ver `KEYBOARD_MAP` en `src/hooks/useGamepad.js`).
- Polling con `requestAnimationFrame`; detección automática de mandos conectados; deadzone de `0.1` en sticks analógicos.

## 6. Convenciones del repo

- **Commits** con mensajes descriptivos en imperativo (ej. `Fix PeerJS multiplayer join flow and message handling`).
- **Branches:** no se trabaja sobre `main`. Las tareas se desarrollan en ramas creadas por Devin (actualmente `Online`); se reutiliza la misma rama mientras se itera sobre la misma tarea/PR y se abre una rama nueva cuando se empieza una tarea distinta.
- **PRs:** siempre hacia `main`.

## 7. Deuda técnica detectada

1. `node_modules/` está **commiteado** en el repo (se ve en `ls -la` y en diffs del histórico). Debería estar en `.gitignore` y sacarse del tracking.
2. Coexisten `public/emulator/` y `public/emulator/EmulatorJS-4.2.3/` con todo su `.github/`, workflows y docs — infla mucho el repo.
3. `party/game-server.ts` y `partykit.json` son código muerto tras el cambio a PeerJS.
4. El README describe una subcarpeta `ps1-emulator/` que en realidad no existe (todo está en la raíz).
5. No hay linter ni tests automatizados; sin CI.
6. `.env.example` sigue apuntando a PartyKit (`VITE_PARTYKIT_HOST`), aunque la variable ya no se lee.
7. El nombre del paquete (`ps1-emulator`) no coincide con el nombre del proyecto (`PlayHubGX`).

## 8. Documentación auxiliar ya existente

- `README.md` — visión general + setup.
- `QUICKSTART.md` — pasos de uso.
- `ARCHITECTURE.md` — diagramas y API de `useEmulator`.
- `GAMEPAD_SUPPORT.md` — detalles de gamepad.
- `TROUBLESHOOTING.md` — problemas comunes.
- `DEPLOY.md` — despliegue en Vercel.

## 9. Histórico de cambios (Devin)

| Fecha (UTC) | Rama | PR | Descripción |
|---|---|---|---|
| 2026-04-21 | `Online` | — | Creación de la rama `Online` a partir de `main` (commit `c1ffd26`). Sin cambios de código. |
| 2026-04-21 | `Online` | #1 | Análisis inicial del proyecto y creación de `PROJECT_NOTES.md` como documento vivo para las siguientes tareas. |
| 2026-04-21 | `Online` | #1 | **Game Room (streaming Host↔Guest)**: nuevo hook `src/hooks/useGameRoom.js` y componente `src/components/GameRoomPanel.jsx`. El Host captura el canvas de EmulatorJS con `captureStream(30)` + audio mezclado vía `Module.AL.currentCtx.audioCtx.createMediaStreamDestination()` (reutiliza `EJS_emulator.collectScreenRecordingMediaTracks`) y lo envía por PeerJS a cada invitado. Los invitados abren un DataChannel fiable, envían `keydown`/`keyup` y el Host los inyecta como Player 2 con `gameManager.simulateInput(1, buttonId, value)`. Ping/pong periódico para medir latencia. Integración mínima en `EmulatorScreen.jsx` (toggle `ROOM: ON/OFF`, overlay del panel con indicadores de estado, código copiable, latencia y `<video autoplay playsinline muted>` con botón unmute). Se fuerza `maxBitrate=2 Mbps`, `maxFramerate=30` y `degradationPreference=maintain-framerate` en el sender de vídeo para priorizar latencia. |
| 2026-04-21 | `Online` | #1 | **Fix Game Room**: el Host puede ocultar el panel de sala sin cerrarla para seguir jugando (`gameRoomVisible` ya no se fuerza a `true` cuando `role === 'hosting'`, solo para invitados). Se añade botón **HIDE PANEL** dentro de `HostView` y se cambia la etiqueta del botón de la barra superior (`HOSTING` / `IN ROOM` cuando la sala está activa pero oculta) para hacer obvio que la sala sigue viva. El botón está deshabilitado para invitados porque el `<video>` ES su UI. |
| 2026-04-21 | `Online` | #1 | **Guest UX**: el panel del invitado ahora escapa del marco 4:3 de la consola y ocupa todo el viewport (`fixed inset-0` en `EmulatorScreen`). El `<video>` se escala al tamaño máximo que cabe en pantalla manteniendo 4:3 (`max-width: min(100%, (100vh - 160px) * 4/3)`). Se añade botón **FULLSCREEN** que usa la Fullscreen API sobre el contenedor del vídeo (también soporta `EXIT FULL` y mantiene el foco de teclado para que los inputs sigan llegando al host en fullscreen). |
