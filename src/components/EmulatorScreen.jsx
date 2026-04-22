import { useRef, useState, useCallback, useEffect } from 'react'
import { useEmulator } from '../hooks/useEmulator'
import { useGamepad } from '../hooks/useGamepad'
import { useGameRoom } from '../hooks/useGameRoom'
import GamepadIndicator from './GamepadIndicator'
import GameRoomPanel from './GameRoomPanel'
import BiosDesktop from './BiosDesktop'

/**
 * PS1 Memory Card Manager Style - Light Gray Grid Theme
 */

// Grid cell - dark navy BIOS style
function GridCell({ children, className }) {
  return (
    <div
      className={`
        aspect-square border border-ps1-bios-border
        flex items-center justify-center
        ${className || ''}
      `}
      style={{
        backgroundColor: '#10133a',
        boxShadow: 'inset 1px 1px 0 rgba(0,204,255,0.08), inset -1px -1px 0 rgba(0,0,0,0.35)',
      }}
    >
      {children}
    </div>
  )
}

// PS1-style primary button (cyan-bordered BIOS look)
function StartButton({ children, onClick, className }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-6 py-2 font-ps font-semibold text-[11px] tracking-[0.25em]
        bg-ps1-cyan-deep/70 hover:bg-ps1-cyan-deep text-white
        border border-ps1-cyan
        shadow-ps1-cyan-glow
        active:translate-y-0.5 transition-all
        ${className || ''}
      `}
    >
      {children}
    </button>
  )
}

// Secondary action button (subdued, outlined)
function ActionButton({ children, onClick, className }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-1.5 font-ps font-medium text-[10px] tracking-[0.22em]
        bg-ps1-bios-panel hover:bg-ps1-bios-panel/80
        border border-ps1-bios-border hover:border-ps1-cyan-soft
        text-ps1-cyan-soft
        active:translate-y-0.5 transition-all
        ${className || ''}
      `}
    >
      {children}
    </button>
  )
}

// Slot header with colored number (BIOS card look)
function SlotHeader({ slot, color, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <div className="font-retro text-[7px] text-ps1-cyan-soft/70 tracking-widest">MEMORY CARD</div>
        <div className="font-ps text-[11px] text-ps1-cyan-soft tracking-[0.3em]">{label || 'SLOT'}</div>
      </div>
      <div
        className="w-6 h-6 flex items-center justify-center font-retro text-[12px] text-black font-bold rounded-sm"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 8px ${color}66, inset 0 1px 0 rgba(255,255,255,0.3)`,
        }}
      >
        {slot}
      </div>
    </div>
  )
}

function EmulatorScreen() {
  const containerRef = useRef(null)
  const biosInputRef = useRef(null)
  const romInputRef = useRef(null)

  const [biosFile, setBiosFile] = useState(null)
  const [romFiles, setRomFiles] = useState([])
  const [showGameRoom, setShowGameRoom] = useState(false)

  const {
    emulatorState,
    initializeEmulator,
    stopEmulator,
  } = useEmulator(containerRef)

  const { gamepadState } = useGamepad()

  const gameRoom = useGameRoom()

  // Guests never load a local emulator: their panel must stay on screen.
  // The host can toggle the panel on/off without closing the room.
  const isGuestStreaming = gameRoom.isGuest && gameRoom.roomCode
  const gameRoomVisible = showGameRoom || isGuestStreaming
  const gameRoomActive = gameRoom.role !== 'idle'

  // Keep the guest panel visible automatically while the guest has a room.
  useEffect(() => {
    if (isGuestStreaming && !showGameRoom) setShowGameRoom(true)
  }, [isGuestStreaming, showGameRoom])

  const hideGameRoomPanel = useCallback(() => setShowGameRoom(false), [])

  const handleBiosChange = useCallback((e) => {
    const file = e.target.files[0]
    if (file) {
      const fileName = file.name.toLowerCase()
      const isValid = fileName.endsWith('.bin') || fileName.endsWith('.rom')
      if (isValid) {
        setBiosFile(file)
      }
    }
  }, [])

  const handleRomChange = useCallback((e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      const validExtensions = ['.bin', '.cue', '.iso', '.img', '.chd', '.pbp']
      for (const file of files) {
        const isValid = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
        if (!isValid) {
          alert(`Invalid file: ${file.name}`)
          return
        }
      }
      setRomFiles(files)
    }
  }, [])

  const startEmulator = useCallback(() => {
    if (biosFile && romFiles.length > 0) {
      initializeEmulator(biosFile, romFiles)
    }
  }, [biosFile, romFiles, initializeEmulator])

  const resetEmulator = useCallback(() => {
    stopEmulator()
    setBiosFile(null)
    setRomFiles([])
  }, [stopEmulator])

  const triggerBiosInput = useCallback(() => {
    biosInputRef.current?.click()
  }, [])

  const triggerRomInput = useCallback(() => {
    romInputRef.current?.click()
  }, [])

  return (
    <>
    {/* Guest streaming: escape the 4:3 console frame and take over the whole viewport */}
    {isGuestStreaming && (
      <div className="fixed inset-0 z-50 bg-black overflow-auto">
        <GameRoomPanel
          room={gameRoom}
          canHost={emulatorState.isRunning}
          onHidePanel={null}
        />
      </div>
    )}
    <div className="w-full h-full flex flex-col">
      {/* Slim floating status overlay (pad + room + exit) only while the game is running. */}
      {emulatorState.isRunning && (
        <div className="absolute top-2 right-2 z-40 flex items-center gap-2">
          {gamepadState.isConnected && (
            <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-sm">
              <GamepadIndicator
                isConnected
                gamepadId={gamepadState.gamepadId}
                inputSource="gamepad"
              />
              <span className="font-retro text-[7px] tracking-widest text-ps1-led-green">PAD</span>
            </div>
          )}
          <button
            onClick={() => {
              if (isGuestStreaming) return
              setShowGameRoom((v) => !v)
            }}
            disabled={isGuestStreaming}
            className={`
              px-3 py-1 font-retro text-[8px] tracking-widest rounded-sm transition-all border
              ${gameRoomActive
                ? 'bg-ps1-led-green text-black border-ps1-led-green shadow-[0_0_10px_rgba(68,204,102,0.45)]'
                : gameRoomVisible
                  ? 'bg-[#1a4ed7] text-white border-[#3373ff]'
                  : 'bg-black/50 text-white border-white/30 hover:border-white'
              }
            `}
          >
            {gameRoomActive
              ? (gameRoom.isHost ? 'HOSTING' : 'IN ROOM')
              : gameRoomVisible ? 'ROOM ON' : 'ROOM'}
            {gameRoom.isHost && gameRoom.guestCount > 0 && (
              <span className="ml-1 text-[7px]">·{gameRoom.guestCount}</span>
            )}
            {gameRoom.isGuest && gameRoom.latency != null && (
              <span className="ml-1 text-[7px]">{gameRoom.latency}ms</span>
            )}
          </button>
          <button
            onClick={resetEmulator}
            className="px-3 py-1 font-retro text-[8px] tracking-widest rounded-sm border bg-[#d71a1a] hover:bg-[#ff3535] text-white border-white/50"
            title="Stop the game and return to the BIOS desktop"
          >
            EXIT
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="relative w-full flex-1 min-h-0 overflow-hidden">

        {/* Game Room (Host-Client streaming) - host panel stays inside the console screen */}
        {gameRoomVisible && !isGuestStreaming && (
          <div className="absolute inset-0 z-30 overflow-y-auto animate-fade-in" style={{ backgroundColor: 'rgba(126,128,136,0.95)' }}>
            <div className="min-h-full flex items-center justify-center p-4">
              <div
                className="w-full max-w-xl animate-slide-in-up"
                style={{
                  background: '#c4c6cc',
                  borderTop: '2px solid #e4e6ea',
                  borderLeft: '2px solid #e4e6ea',
                  borderRight: '2px solid #5a5c62',
                  borderBottom: '2px solid #5a5c62',
                  imageRendering: 'pixelated',
                }}
              >
                <GameRoomPanel
                  room={gameRoom}
                  canHost={emulatorState.isRunning}
                  onHidePanel={hideGameRoomPanel}
                />
              </div>
            </div>
          </div>
        )}

        {/* EmulatorJS canvas host — kept empty in React; EmulatorJS owns innerHTML */}
        <div
          ref={containerRef}
          className="absolute inset-0 overflow-hidden"
          style={{ backgroundColor: '#05061a' }}
        />

        {/* UI overlays rendered as siblings so React never reconciles into
            the div EmulatorJS mutates imperatively. */}
        {!emulatorState.isRunning && (
          <div
            className="absolute inset-0 overflow-hidden flex flex-col"
            style={{ backgroundColor: '#05061a' }}
          >
            {emulatorState.isLoading ? (
              /* Loading Screen - BIOS navy with spinning diamond */
              <div className="w-full h-full flex flex-col items-center justify-center bg-ps1-bios-bg-deep relative animate-fade-in">
                <div
                  className="absolute inset-0 opacity-25"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(0,204,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(0,204,255,0.12) 1px, transparent 1px)',
                    backgroundSize: '48px 48px',
                  }}
                />
                <div className="relative z-10 flex flex-col items-center gap-4">
                  <div className="ps1-loader" />
                  <div className="font-ps font-semibold text-[13px] text-ps1-yellow tracking-[0.25em] glow-yellow">
                    {emulatorState.loadingMessage || 'LOADING'}
                  </div>
                  <div className="w-56 h-2 bg-ps1-bios-panel border border-ps1-bios-border rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-ps1-cyan transition-all duration-300 shadow-ps1-cyan-glow"
                      style={{ width: `${emulatorState.progress}%` }}
                    />
                  </div>
                  <div className="font-lcd text-[18px] leading-none text-ps1-cyan-soft">
                    {emulatorState.progress}%
                  </div>
                  <div className="font-retro text-[6px] text-ps1-cyan-soft/70 mt-2 px-8 text-center max-w-xs tracking-widest">
                    BIOS: {biosFile?.name}<br/>
                    ROM: {romFiles.map(f => f.name).join(', ')}
                  </div>
                </div>
              </div>
            ) : emulatorState.error ? (
              /* Error Screen */
              <div className="w-full h-full flex flex-col items-center justify-center bg-ps1-bios-bg-deep animate-fade-in">
                <div className="font-ps font-semibold text-ps1-led-red text-[14px] tracking-[0.3em] mb-4">ERROR</div>
                <div className="font-retro text-[7px] text-ps1-cyan-soft px-4 text-center max-w-xs mb-4 leading-relaxed">
                  {emulatorState.error}
                </div>
                <ActionButton onClick={resetEmulator}>RESET</ActionButton>
              </div>
            ) : (
              /* PSX BIOS Memory Card Manager desktop */
              <BiosDesktop
                biosFile={biosFile}
                romFiles={romFiles}
                onLoadBios={triggerBiosInput}
                onLoadGame={triggerRomInput}
                onStart={startEmulator}
                onReset={resetEmulator}
                onToggleRoom={() => {
                  if (isGuestStreaming) return
                  setShowGameRoom((v) => !v)
                }}
                gameRoomVisible={gameRoomVisible}
                gameRoomActive={gameRoomActive}
                roomLabel={
                  gameRoomActive
                    ? (gameRoom.isHost ? 'HOSTING' : 'IN ROOM')
                    : gameRoomVisible ? 'ROOM ON' : 'ROOM'
                }
              />
            )}
          </div>
        )}

        {emulatorState.isRunning && emulatorState.needsMenuInteraction && (
          <div className="absolute inset-0 flex items-center justify-center bg-ps1-bios-bg-deep/80 z-10 animate-fade-in">
            <div className="text-center">
              <div className="font-ps font-semibold text-ps1-yellow text-[14px] tracking-[0.3em] mb-4 glow-yellow">
                SELECT GAME
              </div>
              <div className="font-retro text-[8px] text-ps1-cyan-soft tracking-widest">
                Use ↑↓←→ to navigate
              </div>
              <div className="font-retro text-[8px] text-ps1-cyan-soft tracking-widest mt-1">
                Enter/Z to select
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={biosInputRef}
        type="file"
        accept=".bin,.rom"
        onChange={handleBiosChange}
        className="hidden"
      />
      <input
        ref={romInputRef}
        type="file"
        accept=".bin,.cue,.iso,.img,.chd,.pbp"
        multiple
        onChange={handleRomChange}
        className="hidden"
      />
    </div>
    </>
  )
}

export default EmulatorScreen
