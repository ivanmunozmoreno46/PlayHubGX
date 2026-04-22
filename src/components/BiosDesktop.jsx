import Model3D from './Model3D'

/**
 * BiosDesktop — full-screen re-skin of the PS1 "Memory Card Manager" BIOS.
 *
 * Palette pulled from a reference screenshot of the original SCPH BIOS:
 *   · page background / desk gap: mid gray (#8a8a91)
 *   · save-block cells:           light gray beige (#b6b5a8) on darker seam
 *   · slot header panel:          deep maroon (#3a1e20 → #1e0f10)
 *   · central action buttons:     tostado / tan (#c8a95a) with burgundy text
 *   · confirm pills:              red (#d71a1a) and blue (#1a4ed7)
 *
 * BIOS icons (wrench / disc) are rendered as GLB models via <Model3D>,
 * auto-spinning inside each slot.
 */

function SlotPanel({ slot, numberColor, loaded, icon }) {
  return (
    <div className="ps1-bios-slot-panel flex items-stretch flex-1">
      <div className="flex-1 flex flex-col justify-center px-3 py-2">
        <div className="font-ps font-black tracking-[0.18em] text-white text-[clamp(12px,1.4vw,16px)] leading-none">
          MEMORY<span className="ml-1">CARD</span>
        </div>
        <div className="font-ps font-black tracking-[0.3em] text-white text-[clamp(14px,1.8vw,19px)] leading-none mt-1 self-end">
          SLOT
        </div>
      </div>
      <div
        className="flex items-center justify-center shrink-0 ps1-bios-slot-number"
        style={{
          width: 'clamp(44px, 5.5vw, 64px)',
          background:
            numberColor === 'green'
              ? 'linear-gradient(180deg, #36d85c 0%, #1ba23e 100%)'
              : 'linear-gradient(180deg, #d8c93b 0%, #a29020 100%)',
          boxShadow:
            'inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.25)',
        }}
      >
        <span
          className="font-ps font-black text-white"
          style={{
            fontSize: 'clamp(26px, 3.4vw, 40px)',
            lineHeight: 1,
            textShadow: '2px 2px 0 rgba(0,0,0,0.4)',
          }}
        >
          {slot}
        </span>
      </div>
      {/* Loaded indicator strip + emoji badge */}
      {loaded && (
        <div
          className="absolute right-2 top-1 text-[clamp(18px,2vw,26px)] select-none pointer-events-none"
          style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.6))' }}
        >
          {icon}
        </div>
      )}
    </div>
  )
}

function BiosActionButton({ children, onClick, disabled = false, strong = false }) {
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
        background: strong ? '#d8a833' : '#b48a2a',
        borderTop: '2px solid #f2dc92',
        borderLeft: '2px solid #f2dc92',
        borderRight: '2px solid #5a3f08',
        borderBottom: '2px solid #5a3f08',
        padding: 'clamp(8px,1.4vh,14px) clamp(14px,2vw,24px)',
        imageRendering: 'pixelated',
      }}
    >
      <span
        className="font-ps font-black tracking-[0.3em] uppercase block text-center"
        style={{
          color: '#4a0d0d',
          fontSize: 'clamp(12px, 1.5vw, 17px)',
          textShadow: '1px 1px 0 rgba(255,240,190,0.35)',
        }}
      >
        {children}
      </span>
    </button>
  )
}

function PillButton({ children, onClick, color = 'red', active = false, disabled = false }) {
  const palette = {
    red: { bg: '#d71a1a', bgActive: '#ff3535', text: '#ffffff' },
    blue: { bg: '#1a4ed7', bgActive: '#3373ff', text: '#ffffff' },
    green: { bg: '#1ba23e', bgActive: '#34d15c', text: '#ffffff' },
  }[color]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`ps1-bios-pill font-ps font-black tracking-[0.22em] ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
      style={{
        background: active ? palette.bgActive : palette.bg,
        color: palette.text,
        borderTop: '2px solid rgba(255,255,255,0.55)',
        borderLeft: '2px solid rgba(255,255,255,0.55)',
        borderRight: '2px solid rgba(0,0,0,0.55)',
        borderBottom: '2px solid rgba(0,0,0,0.55)',
        padding: 'clamp(6px,1vh,10px) clamp(14px,2.2vw,22px)',
        fontSize: 'clamp(11px,1.3vw,15px)',
        minWidth: 'clamp(70px, 9vw, 110px)',
        imageRendering: 'pixelated',
      }}
    >
      {children}
    </button>
  )
}

/**
 * Viewport-wide grid of "save blocks".
 *
 * Renders 16 columns × 10 rows of light-beige tiles on a slightly darker
 * seam, matching the reference screenshot. When files are loaded, the
 * first few cells in the top-left / top-right quadrants are tinted to
 * indicate the first "used" block of each slot.
 */
function SaveBlocksGrid({ biosLoaded, gameLoaded }) {
  const cols = 16
  const rows = 10
  const cells = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isSlot1Area = c < cols / 2
      const isHeaderRow = r === 0 && c < 3
      const isHeaderRowSlot2 = r === 0 && c >= cols - 3
      const highlight = isHeaderRow
        ? biosLoaded
        : isHeaderRowSlot2
          ? gameLoaded
          : false
      let bg = '#c4c6cc'
      if (highlight) {
        bg = isSlot1Area ? '#2d9a4a' : '#b8a528'
      }
      cells.push(
        <div
          key={`${r}-${c}`}
          style={{
            background: bg,
            boxShadow:
              'inset 2px 2px 0 rgba(255,255,255,0.35), inset -2px -2px 0 rgba(0,0,0,0.30)',
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
        background: '#7f8189',
        imageRendering: 'pixelated',
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
    <div className="relative w-full h-full overflow-hidden">
      <SaveBlocksGrid biosLoaded={biosLoaded} gameLoaded={gameLoaded} />

      {/* Foreground layer */}
      <div
        className="absolute inset-0 flex flex-col"
        style={{
          padding: 'clamp(12px, 2.5vw, 40px)',
          gap: 'clamp(10px, 2vh, 24px)',
        }}
      >
        <TitleBar />

        {/* Two side blocks: wrench+LOAD BIOS | disc+LOAD GAME */}
        <div className="flex-1 min-h-0 flex items-center justify-center gap-[clamp(14px,3vw,48px)]">
          <IconBlock
            icon={<Model3D url="/models/wrench.glb" speed={0.5} tilt={[-0.45, 0, 0.6]} />}
            accent="green"
            loaded={biosLoaded}
            fileName={biosFile?.name}
            emptyLabel="— NO BIOS —"
            formatTag="BIOS · NTSC"
          >
            <BiosActionButton onClick={onLoadBios}>
              {biosLoaded ? 'CHANGE BIOS' : 'LOAD BIOS'}
            </BiosActionButton>
          </IconBlock>

          <IconBlock
            icon={<Model3D url="/models/cd-rom.glb" speed={0.6} />}
            accent="yellow"
            loaded={gameLoaded}
            fileName={romFiles[0]?.name}
            emptyLabel="— NO GAME —"
            formatTag="ROM · CHD"
          >
            <BiosActionButton onClick={onLoadGame} disabled={!biosLoaded}>
              {gameLoaded ? 'CHANGE GAME' : 'LOAD GAME'}
            </BiosActionButton>
          </IconBlock>
        </div>

        {/* Bottom confirm-style pill row: RESET · START · ROOM */}
        <div className="flex items-center justify-center gap-[clamp(8px,1.5vw,18px)]">
          <PillButton
            color="red"
            onClick={onReset}
            disabled={!biosLoaded && !gameLoaded}
          >
            RESET
          </PillButton>
          <PillButton
            color="green"
            onClick={onStart}
            disabled={!canStart}
          >
            START
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

/**
 * Vertical block = big icon on top, action button below, file name beneath.
 * Sits on a deep maroon panel with 3D border to match the BIOS reference.
 */
function TitleBar() {
  return (
    <div
      className="flex flex-col items-center select-none"
      style={{
        padding: 'clamp(6px,1vh,12px) clamp(12px,2vw,28px)',
        background: '#1a1c20',
        borderTop: '2px solid #8a8c92',
        borderLeft: '2px solid #8a8c92',
        borderRight: '2px solid #0b0c0e',
        borderBottom: '2px solid #0b0c0e',
        imageRendering: 'pixelated',
      }}
    >
      <span
        className="font-ps font-black tracking-[0.3em] text-white"
        style={{
          fontSize: 'clamp(16px,2.4vw,28px)',
          lineHeight: 1,
          textShadow: '2px 2px 0 rgba(0,0,0,0.7)',
        }}
      >
        PLAYHUBGX
      </span>
      <span
        className="font-lcd text-white/70 tracking-[0.24em] mt-1"
        style={{ fontSize: 'clamp(10px,1.2vw,13px)' }}
      >
        PSX BIOS LOADER · NTSC · CHD
      </span>
    </div>
  )
}

function IconBlock({ icon, loaded, fileName, emptyLabel, formatTag, children }) {
  return (
    <div
      className="relative flex flex-col items-center"
      style={{
        width: 'clamp(220px, 30vw, 360px)',
        background: '#55575d',
        borderTop: '2px solid #8a8c92',
        borderLeft: '2px solid #8a8c92',
        borderRight: '2px solid #1a1c20',
        borderBottom: '2px solid #1a1c20',
        boxShadow: '3px 3px 0 rgba(0,0,0,0.45)',
        padding: 'clamp(14px, 2vw, 26px) clamp(12px, 1.6vw, 22px)',
        gap: 'clamp(10px, 1.6vh, 18px)',
      }}
    >
      <div
        className="select-none w-full"
        style={{
          height: 'clamp(110px, 16vw, 200px)',
          filter: loaded ? 'none' : 'grayscale(0.4) opacity(0.85)',
        }}
      >
        {icon}
      </div>
      {formatTag && (
        <div
          className="font-ps font-black tracking-[0.18em] text-white/85 text-center"
          style={{
            fontSize: 'clamp(9px,1.05vw,12px)',
            padding: '2px 8px',
            background: 'rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          {formatTag}
        </div>
      )}
      <div className="w-full">{children}</div>
      <div
        className="w-full font-lcd text-[clamp(11px,1.3vw,15px)] text-white tracking-widest truncate text-center"
        title={fileName || ''}
        style={{
          background: loaded ? 'rgba(40,42,48,0.85)' : 'rgba(24,26,30,0.75)',
          borderTop: '1px solid rgba(255,255,255,0.18)',
          borderBottom: '1px solid rgba(0,0,0,0.45)',
          padding: '3px 10px',
        }}
      >
        {fileName || emptyLabel}
      </div>
    </div>
  )
}
