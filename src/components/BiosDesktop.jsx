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
 * The BIOS icons (wrench / disc) are rendered as plain emoji per request;
 * the previous CSS 3D versions have been retired.
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
        background: strong
          ? 'linear-gradient(180deg, #e6c25a 0%, #a98420 100%)'
          : 'linear-gradient(180deg, #c8a95a 0%, #8c7120 100%)',
        borderTop: '2px solid #f2dc92',
        borderBottom: '2px solid #5a3f08',
        padding: 'clamp(8px,1.4vh,14px) clamp(14px,2vw,24px)',
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
        borderTop: '2px solid rgba(255,255,255,0.45)',
        borderBottom: '2px solid rgba(0,0,0,0.45)',
        padding: 'clamp(6px,1vh,10px) clamp(14px,2.2vw,22px)',
        fontSize: 'clamp(11px,1.3vw,15px)',
        textShadow: '1px 1px 0 rgba(0,0,0,0.55)',
        minWidth: 'clamp(70px, 9vw, 110px)',
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
      let bg = '#b6b5a8'
      if (highlight) {
        bg = isSlot1Area
          ? 'linear-gradient(135deg, #3fa55a 0%, #1b6b2f 100%)'
          : 'linear-gradient(135deg, #c9b632 0%, #7c6a10 100%)'
      }
      cells.push(
        <div
          key={`${r}-${c}`}
          style={{
            background: bg,
            boxShadow:
              'inset 1px 1px 0 rgba(255,255,255,0.25), inset -1px -1px 0 rgba(0,0,0,0.35)',
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
        gap: '2px',
        padding: '2px',
        background: '#6e6e76',
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
        {/* Top slot headers */}
        <div className="flex items-start justify-between gap-[clamp(10px,3vw,48px)]">
          <div className="relative flex-1 max-w-[42%]">
            <SlotPanel
              slot="1"
              numberColor="green"
              loaded={biosLoaded}
              icon="🔧"
            />
          </div>
          <div className="relative flex-1 max-w-[42%]">
            <SlotPanel
              slot="2"
              numberColor="yellow"
              loaded={gameLoaded}
              icon="💿"
            />
          </div>
        </div>

        {/* Central action panel */}
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className="flex items-center gap-[clamp(14px,3vw,44px)]">
            {/* Left emoji (BIOS / wrench) */}
            <div
              className="hidden sm:flex items-center justify-center shrink-0 select-none"
              style={{
                width: 'clamp(60px, 8vw, 120px)',
                height: 'clamp(60px, 8vw, 120px)',
                fontSize: 'clamp(44px, 6vw, 90px)',
                filter: biosLoaded
                  ? 'drop-shadow(0 4px 4px rgba(0,0,0,0.5))'
                  : 'drop-shadow(0 4px 4px rgba(0,0,0,0.5)) grayscale(0.4) opacity(0.85)',
              }}
            >
              🔧
            </div>

            {/* Tostado button stack */}
            <div
              className="ps1-bios-action-panel relative flex flex-col"
              style={{
                width: 'clamp(240px, 32vw, 400px)',
                background: '#3a1e20',
                padding: 'clamp(4px, 0.6vw, 8px)',
                border: '2px solid #16080a',
                boxShadow:
                  '3px 3px 0 rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,200,160,0.2)',
                gap: 'clamp(3px, 0.5vh, 6px)',
              }}
            >
              <BiosActionButton onClick={onLoadBios}>
                {biosLoaded ? 'CHANGE BIOS' : 'LOAD BIOS'}
              </BiosActionButton>
              <BiosActionButton
                onClick={onLoadGame}
                disabled={!biosLoaded}
              >
                {gameLoaded ? 'CHANGE GAME' : 'LOAD GAME'}
              </BiosActionButton>
              <BiosActionButton
                onClick={onStart}
                disabled={!canStart}
                strong
              >
                START GAME
              </BiosActionButton>
            </div>

            {/* Right emoji (GAME / disc) */}
            <div
              className="hidden sm:flex items-center justify-center shrink-0 select-none"
              style={{
                width: 'clamp(60px, 8vw, 120px)',
                height: 'clamp(60px, 8vw, 120px)',
                fontSize: 'clamp(44px, 6vw, 90px)',
                filter: gameLoaded
                  ? 'drop-shadow(0 4px 4px rgba(0,0,0,0.5))'
                  : 'drop-shadow(0 4px 4px rgba(0,0,0,0.5)) grayscale(0.4) opacity(0.85)',
              }}
            >
              💿
            </div>
          </div>
        </div>

        {/* Filename readout row */}
        <div className="flex items-center justify-between gap-[clamp(8px,2vw,24px)] text-center">
          <div
            className="flex-1 font-lcd text-[clamp(12px,1.4vw,17px)] text-white tracking-widest truncate"
            title={biosFile?.name || ''}
            style={{
              background: biosLoaded ? 'rgba(27,107,47,0.8)' : 'rgba(20,20,25,0.65)',
              borderTop: '1px solid rgba(255,255,255,0.18)',
              borderBottom: '1px solid rgba(0,0,0,0.45)',
              padding: '3px 10px',
            }}
          >
            {biosFile?.name || '— NO BIOS —'}
          </div>
          <div
            className="flex-1 font-lcd text-[clamp(12px,1.4vw,17px)] text-white tracking-widest truncate"
            title={romFiles[0]?.name || ''}
            style={{
              background: gameLoaded ? 'rgba(124,106,16,0.85)' : 'rgba(20,20,25,0.65)',
              borderTop: '1px solid rgba(255,255,255,0.18)',
              borderBottom: '1px solid rgba(0,0,0,0.45)',
              padding: '3px 10px',
            }}
          >
            {romFiles[0]?.name || '— NO GAME —'}
          </div>
        </div>

        {/* Bottom confirm-style pill row */}
        <div className="flex items-center justify-center gap-[clamp(8px,1.5vw,18px)]">
          <PillButton
            color="red"
            onClick={onReset}
            disabled={!biosLoaded && !gameLoaded}
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
