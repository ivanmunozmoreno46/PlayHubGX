/**
 * BiosDesktop — re-skin of the PS1 "Memory Card Manager" BIOS menu.
 *
 * Layout (always fills its parent, no scroll):
 *   ┌────────────────────────────────────────────────────────────────┐
 *   │  ┌────────────────┐                        ┌────────────────┐ │
 *   │  │ MEMORY CARD  1 │                        │ MEMORY CARD  2 │ │
 *   │  └────────────────┘                        └────────────────┘ │
 *   │                                                                │
 *   │                 ╔══════════════════════╗                      │
 *   │                 ║  LOAD / CHANGE BIOS  ║                      │
 *   │                 ║  LOAD / CHANGE GAME  ║                      │
 *   │                 ║      START GAME      ║                      │
 *   │                 ╚══════════════════════╝                      │
 *   │                                                                │
 *   │          [ RESET ]  [ ROOM ]                                   │
 *   │                                                                │
 *   │  (tiled gray grid background with filled BIOS "save" blocks)   │
 *   └────────────────────────────────────────────────────────────────┘
 */

import { Wrench3D, Disc3D } from './Bios3DObjects'

function SlotPanel({ slot, numberColor, loaded, fileName }) {
  return (
    <div
      className="ps1-bios-slot-panel flex items-stretch"
      style={{ minWidth: 'clamp(160px, 22vw, 260px)' }}
    >
      <div className="flex-1 flex flex-col justify-center px-3 py-1.5">
        <div className="font-ps font-black tracking-[0.18em] text-white text-[clamp(10px,1.3vw,13px)] leading-none">
          MEMORY<span className="ml-1">CARD</span>
        </div>
        <div className="font-ps font-black tracking-[0.3em] text-white text-[clamp(12px,1.6vw,16px)] leading-none mt-1 self-end">
          SLOT
        </div>
      </div>
      <div
        className="flex items-center justify-center shrink-0 ps1-bios-slot-number"
        style={{
          width: 'clamp(36px, 5vw, 52px)',
          background:
            numberColor === 'green'
              ? 'linear-gradient(180deg, #36d85c 0%, #1ba23e 100%)'
              : 'linear-gradient(180deg, #c9dd3b 0%, #9fb824 100%)',
          boxShadow:
            'inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.25)',
        }}
      >
        <span
          className="font-ps font-black text-white"
          style={{
            fontSize: 'clamp(22px, 3vw, 34px)',
            lineHeight: 1,
            textShadow: '2px 2px 0 rgba(0,0,0,0.4)',
          }}
        >
          {slot}
        </span>
      </div>
      {/* Loaded indicator strip */}
      <div
        className="absolute left-0 bottom-0 right-0 h-[3px]"
        style={{
          background: loaded
            ? numberColor === 'green'
              ? '#36d85c'
              : '#c9dd3b'
            : 'transparent',
        }}
      />
    </div>
  )
}

function BiosActionButton({ children, onClick, variant = 'idle', disabled = false }) {
  // variant: 'idle' | 'loaded' | 'primary'
  const bg =
    variant === 'primary'
      ? 'linear-gradient(180deg, #f6d65a 0%, #d4ac1c 100%)'
      : 'linear-gradient(180deg, #cbb452 0%, #9c8425 100%)'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        ps1-bios-action group relative block w-full text-left
        ${disabled ? 'opacity-40 pointer-events-none' : ''}
      `}
      style={{
        background: bg,
        borderTop: '2px solid #ffe890',
        borderBottom: '2px solid #6b4f10',
        padding: 'clamp(6px,1.2vh,12px) clamp(12px,2vw,22px)',
      }}
    >
      <span
        className="font-ps font-black tracking-[0.3em] uppercase block text-center"
        style={{
          color: '#7a1010',
          fontSize: 'clamp(10px, 1.4vw, 15px)',
          textShadow: '1px 1px 0 rgba(255,245,180,0.45)',
        }}
      >
        {children}
      </span>
    </button>
  )
}

function PillButton({ children, onClick, color = 'red', active = false }) {
  const palette = {
    red: { bg: '#d71a1a', bgActive: '#ff3535', text: '#ffffff' },
    blue: { bg: '#1a4ed7', bgActive: '#3373ff', text: '#ffffff' },
    gray: { bg: '#8a8a8a', bgActive: '#b8b8b8', text: '#0a0a0a' },
  }[color]
  return (
    <button
      type="button"
      onClick={onClick}
      className="ps1-bios-pill font-ps font-black tracking-[0.22em]"
      style={{
        background: active ? palette.bgActive : palette.bg,
        color: palette.text,
        borderTop: '2px solid rgba(255,255,255,0.45)',
        borderBottom: '2px solid rgba(0,0,0,0.45)',
        padding: 'clamp(4px,0.8vh,8px) clamp(10px,1.8vw,18px)',
        fontSize: 'clamp(10px,1.2vw,13px)',
        textShadow: color === 'gray' ? 'none' : '1px 1px 0 rgba(0,0,0,0.55)',
      }}
    >
      {children}
    </button>
  )
}

/**
 * Background grid of "save blocks".
 *
 * The original BIOS shows 15 blocks per memory card in a 15×1 strip;
 * we fake a 12-column × 8-row grid where a few blocks are highlighted
 * depending on whether the BIOS and GAME are loaded.
 */
function SaveBlocksGrid({ biosLoaded, gameLoaded }) {
  const cols = 12
  const rows = 8
  const cells = []
  // Columns 0-5 belong to slot 1 (BIOS), 6-11 to slot 2 (GAME).
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isSlot1 = c < cols / 2
      // Highlight the first block of each slot row when loaded.
      const isHeaderRow = r === 0
      const highlight =
        isHeaderRow && isSlot1
          ? biosLoaded
          : isHeaderRow && !isSlot1
            ? gameLoaded
            : false
      cells.push(
        <div
          key={`${r}-${c}`}
          className="relative"
          style={{
            background: highlight
              ? isSlot1
                ? 'linear-gradient(135deg, #1b7d33 0%, #0c4a1d 100%)'
                : 'linear-gradient(135deg, #9d8820 0%, #5f4d0f 100%)'
              : '#2a2a36',
            border: '1px solid #6d6d78',
            boxShadow:
              'inset 1px 1px 0 rgba(255,255,255,0.07), inset -1px -1px 0 rgba(0,0,0,0.35)',
          }}
        />
      )
    }
  }
  return (
    <div
      className="absolute inset-0 grid"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: '3px',
        padding: '3px',
        background: '#8c8c97',
      }}
    >
      {cells}
    </div>
  )
}

export default function BiosDesktop({
  biosFile,
  romFiles,
  onLoadBios,
  onLoadGame,
  onStart,
  onReset,
  onToggleRoom,
  gameRoomVisible,
  gameRoomActive,
  roomLabel = 'ROOM',
}) {
  const biosLoaded = !!biosFile
  const gameLoaded = romFiles.length > 0
  const canStart = biosLoaded && gameLoaded

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ background: '#b6b6c0' }}
    >
      {/* Tiled save-blocks grid background */}
      <SaveBlocksGrid biosLoaded={biosLoaded} gameLoaded={gameLoaded} />

      {/* Foreground layer */}
      <div className="absolute inset-0 flex flex-col p-[clamp(10px,2vw,28px)] gap-[clamp(8px,1.5vh,20px)]">
        {/* Top slot panels */}
        <div className="flex items-start justify-between gap-3">
          <div className="ps1-bios-slot-wrap relative">
            <SlotPanel
              slot="1"
              numberColor="green"
              loaded={biosLoaded}
              fileName={biosFile?.name}
            />
          </div>
          <div className="ps1-bios-slot-wrap relative">
            <SlotPanel
              slot="2"
              numberColor="yellow"
              loaded={gameLoaded}
              fileName={romFiles[0]?.name}
            />
          </div>
        </div>

        {/* Central action panel */}
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className="flex items-center gap-[clamp(12px,3vw,40px)]">
            {/* Left 3D icon */}
            <div
              className="hidden md:block shrink-0"
              style={{ width: 'clamp(70px,10vw,140px)', height: 'clamp(70px,10vw,140px)' }}
            >
              <Wrench3D accent={biosLoaded ? '#36d85c' : '#5eb6ff'} />
            </div>

            {/* Action button stack */}
            <div
              className="ps1-bios-action-panel relative flex flex-col"
              style={{
                width: 'clamp(220px, 30vw, 360px)',
                background: '#b6b6c0',
                padding: 'clamp(3px, 0.5vw, 6px)',
                border: '2px solid #2a2a36',
                boxShadow:
                  '3px 3px 0 rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.25)',
                gap: 'clamp(2px, 0.4vh, 5px)',
              }}
            >
              <BiosActionButton
                onClick={onLoadBios}
                variant={biosLoaded ? 'loaded' : 'idle'}
              >
                {biosLoaded ? 'CHANGE BIOS' : 'LOAD BIOS'}
              </BiosActionButton>
              <BiosActionButton
                onClick={onLoadGame}
                variant={gameLoaded ? 'loaded' : 'idle'}
                disabled={!biosLoaded}
              >
                {gameLoaded ? 'CHANGE GAME' : 'LOAD GAME'}
              </BiosActionButton>
              <BiosActionButton
                onClick={onStart}
                variant="primary"
                disabled={!canStart}
              >
                START GAME
              </BiosActionButton>
            </div>

            {/* Right 3D icon */}
            <div
              className="hidden md:block shrink-0"
              style={{ width: 'clamp(70px,10vw,140px)', height: 'clamp(70px,10vw,140px)' }}
            >
              <Disc3D accent={gameLoaded ? '#e1c94a' : '#5eb6ff'} />
            </div>
          </div>
        </div>

        {/* Loaded filenames row (BIOS / GAME), replaces the "hint strip" */}
        <div className="flex items-center justify-between gap-3 text-center">
          <div
            className="flex-1 font-lcd text-[clamp(11px,1.3vw,15px)] text-white/90 tracking-widest truncate px-2"
            title={biosFile?.name || ''}
            style={{
              background: biosLoaded ? 'rgba(27,125,51,0.55)' : 'rgba(20,20,28,0.55)',
              borderTop: '1px solid rgba(255,255,255,0.15)',
              borderBottom: '1px solid rgba(0,0,0,0.4)',
              padding: '2px 6px',
            }}
          >
            {biosFile?.name || '— NO BIOS —'}
          </div>
          <div
            className="flex-1 font-lcd text-[clamp(11px,1.3vw,15px)] text-white/90 tracking-widest truncate px-2"
            title={romFiles[0]?.name || ''}
            style={{
              background: gameLoaded ? 'rgba(157,136,32,0.55)' : 'rgba(20,20,28,0.55)',
              borderTop: '1px solid rgba(255,255,255,0.15)',
              borderBottom: '1px solid rgba(0,0,0,0.4)',
              padding: '2px 6px',
            }}
          >
            {romFiles[0]?.name || '— NO GAME —'}
          </div>
        </div>

        {/* Bottom confirm-style pill row */}
        <div className="flex items-center justify-center gap-[clamp(6px,1vw,12px)]">
          <PillButton
            color="red"
            onClick={onReset}
          >
            RESET
          </PillButton>
          <PillButton
            color="blue"
            onClick={onToggleRoom}
            active={gameRoomActive || gameRoomVisible}
          >
            {roomLabel}
          </PillButton>
        </div>
      </div>
    </div>
  )
}
