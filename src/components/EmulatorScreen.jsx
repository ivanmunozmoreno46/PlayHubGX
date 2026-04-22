import { useRef, useState, useCallback, useEffect } from 'react'
import { useEmulator } from '../hooks/useEmulator'
import { useGamepad } from '../hooks/useGamepad'
import { useGameRoom } from '../hooks/useGameRoom'
import GamepadIndicator from './GamepadIndicator'
import GameRoomPanel from './GameRoomPanel'

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

  // Detect multiple connected gamepads
  const [connectedPads, setConnectedPads] = useState([])

  useEffect(() => {
    const updateGamepads = () => {
      const pads = navigator.getGamepads()
      const connected = []
      for (let i = 0; i < 4; i++) {
        if (pads[i]) {
          connected.push({ index: i, id: pads[i].id })
        }
      }
      setConnectedPads(connected)
    }

    updateGamepads()
    const interval = setInterval(updateGamepads, 1000)

    window.addEventListener('gamepadconnected', updateGamepads)
    window.addEventListener('gamepaddisconnected', updateGamepads)

    return () => {
      clearInterval(interval)
      window.removeEventListener('gamepadconnected', updateGamepads)
      window.removeEventListener('gamepaddisconnected', updateGamepads)
    }
  }, [])

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
    <div className="w-full h-full flex flex-col bg-ps1-bios-bg-deep">
      {/* Input Status Bar */}
      <div className="flex items-center justify-between px-2 py-1 bg-ps1-bios-panel/80 border-b border-ps1-bios-border">
        <div className="flex items-center gap-2">
          <GamepadIndicator
            isConnected={gamepadState.isConnected}
            gamepadId={gamepadState.gamepadId}
            inputSource={gamepadState.isConnected ? 'gamepad' : 'keyboard'}
          />
          <span className={`font-retro text-[7px] tracking-widest ${gamepadState.isConnected ? 'text-ps1-led-green' : 'text-ps1-cyan-soft/60'}`}>
            {gamepadState.isConnected ? 'PAD' : 'NO PAD'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              // Guests cannot hide their own panel (the video is the whole UI).
              if (isGuestStreaming) return
              setShowGameRoom((v) => !v)
            }}
            disabled={isGuestStreaming}
            className={`
              px-3 py-1 font-retro text-[8px] tracking-widest rounded-sm transition-all border
              ${gameRoomActive
                ? 'bg-ps1-led-green text-black border-ps1-led-green shadow-[0_0_10px_rgba(68,204,102,0.45)]'
                : gameRoomVisible
                  ? 'bg-ps1-cyan-deep text-white border-ps1-cyan shadow-ps1-cyan-glow'
                  : 'bg-ps1-bios-panel text-ps1-cyan-soft border-ps1-bios-border hover:border-ps1-cyan-soft'
              }
            `}
            title={
              gameRoomActive && !gameRoomVisible
                ? 'Room is still running. Click to show panel.'
                : 'Stream this game to a friend (or join theirs)'
            }
          >
            {gameRoomActive
              ? (gameRoom.isHost ? 'HOSTING' : 'IN ROOM')
              : gameRoomVisible ? 'ROOM: ON' : 'ROOM: OFF'}
            {gameRoom.isHost && gameRoom.guestCount > 0 && (
              <span className="ml-1 text-[7px]">·{gameRoom.guestCount}</span>
            )}
            {gameRoom.isGuest && gameRoom.latency != null && (
              <span className="ml-1 text-[7px]">{gameRoom.latency}ms</span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area - PS1 Memory Card Manager Style
       * Aspect ratio is enforced by the parent `ps1-well` container (App.jsx)
       * so we just fill the available area and let children use min-h-0 to
       * avoid forcing scroll on tiny viewports. */}
      <div className="relative w-full flex-1 min-h-0 overflow-hidden">

        {/* Game Room (Host-Client streaming) - host panel stays inside the console screen */}
        {gameRoomVisible && !isGuestStreaming && (
          <div className="absolute inset-0 z-30 bg-ps1-bios-bg-deep/95 backdrop-blur-sm overflow-y-auto animate-fade-in">
            <div className="min-h-full flex items-center justify-center p-4">
              <div className="w-full max-w-xl bg-ps1-bios-panel rounded-lg border border-ps1-cyan-deep/70 shadow-ps1-cyan-glow animate-slide-in-up">
                <GameRoomPanel
                  room={gameRoom}
                  canHost={emulatorState.isRunning}
                  onHidePanel={hideGameRoomPanel}
                />
              </div>
            </div>
          </div>
        )}

        <div
          ref={containerRef}
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
          ) : emulatorState.isRunning ? (
            /* Emulator Running */
            <div className="w-full h-full relative bg-black">
              {emulatorState.needsMenuInteraction && (
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
            /* Unified BIOS-style loader screen. */
            <div className="w-full h-full flex flex-col p-3 bg-ps1-bios-bg-deep animate-fade-in relative">
              {/* Faint BIOS grid background */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(0,204,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(0,204,255,0.12) 1px, transparent 1px)',
                  backgroundSize: '42px 42px',
                }}
              />

              {/* Title bar */}
              <div className="relative text-center mb-3">
                <div className="font-ps font-semibold text-ps1-yellow text-[14px] tracking-[0.3em] glow-yellow">
                  PlayHubGX
                </div>
                <div className="font-retro text-[7px] text-ps1-cyan-soft/70 tracking-[0.25em] mt-0.5">
                  MEMORY CARD MANAGER
                </div>
              </div>

              {/* Grid area */}
              <div className="relative flex-1 grid grid-cols-12 grid-rows-8 gap-0 mb-3">
                {/* Left column - Wrench (BIOS slot) */}
                <div className="col-span-4 row-span-8 flex flex-col animate-slide-in-up">
                  <div className="bg-ps1-bios-panel px-2 py-1 border border-ps1-bios-border mb-1">
                    <SlotHeader slot="1" color="#44cc66" label="BIOS" />
                  </div>
                  <div
                    className="flex-1 flex items-center justify-center border border-ps1-bios-border rounded-sm"
                    style={{
                      background: 'linear-gradient(135deg, #10133a 0%, #1a1e48 100%)',
                      boxShadow: biosFile
                        ? 'inset 0 0 30px rgba(68,204,102,0.25), inset 0 0 0 1px rgba(68,204,102,0.35)'
                        : 'inset 0 0 30px rgba(0,0,0,0.6)',
                    }}
                  >
                    <span className="text-4xl drop-shadow-[0_0_8px_rgba(0,204,255,0.4)]">🔧</span>
                  </div>
                  <div className="mt-2 flex flex-col items-center gap-1">
                    <StartButton onClick={triggerBiosInput}>
                      {biosFile ? 'CHANGE BIOS' : 'LOAD BIOS'}
                    </StartButton>
                    <div
                      className="font-lcd text-[14px] leading-none text-ps1-cyan-soft text-center truncate w-full px-1"
                      title={biosFile?.name || ''}
                    >
                      {biosFile?.name || '—'}
                    </div>
                  </div>
                </div>

                {/* Center column - START / RESET */}
                <div className="col-span-4 row-span-8 flex flex-col items-center justify-center gap-3 animate-zoom-in">
                  <StartButton
                    onClick={startEmulator}
                    className={biosFile && romFiles.length > 0
                      ? '!bg-ps1-yellow/80 hover:!bg-ps1-yellow !text-black !border-ps1-yellow !shadow-ps1-yellow-glow'
                      : 'opacity-40 pointer-events-none'}
                  >
                    START GAME
                  </StartButton>
                  {(biosFile || romFiles.length > 0) && (
                    <ActionButton onClick={resetEmulator}>
                      RESET
                    </ActionButton>
                  )}
                </div>

                {/* Right column - Disc (game slot) */}
                <div className="col-span-4 row-span-8 flex flex-col animate-slide-in-up">
                  <div className="bg-ps1-bios-panel px-2 py-1 border border-ps1-bios-border mb-1">
                    <SlotHeader slot="2" color="#ffcc33" label="GAME" />
                  </div>
                  <div
                    className="flex-1 flex items-center justify-center border border-ps1-bios-border rounded-sm"
                    style={{
                      background: 'linear-gradient(135deg, #10133a 0%, #1a1e48 100%)',
                      boxShadow: romFiles.length > 0
                        ? 'inset 0 0 30px rgba(255,204,51,0.25), inset 0 0 0 1px rgba(255,204,51,0.35)'
                        : 'inset 0 0 30px rgba(0,0,0,0.6)',
                    }}
                  >
                    <span className="text-4xl drop-shadow-[0_0_8px_rgba(0,204,255,0.4)]">💿</span>
                  </div>
                  <div className="mt-2 flex flex-col items-center gap-1">
                    <StartButton
                      onClick={triggerRomInput}
                      className={biosFile ? '' : 'opacity-40 pointer-events-none'}
                    >
                      {romFiles.length > 0 ? 'CHANGE GAME' : 'LOAD GAME'}
                    </StartButton>
                    <div
                      className="font-lcd text-[14px] leading-none text-ps1-cyan-soft text-center truncate w-full px-1"
                      title={romFiles[0]?.name || ''}
                    >
                      {romFiles[0]?.name || '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Hints */}
              <div className="relative text-center mt-2">
                <div className="font-retro text-[7px] text-ps1-cyan-soft/60 tracking-widest">
                  BIOS: scph5501.bin / scph7001.bin / scph1001.bin · GAME: .bin, .cue, .iso, .img, .chd, .pbp
                </div>
              </div>
            </div>
          )}
        </div>
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

      {/* Controller Ports - Below the screen */}
      <div className="bg-ps1-bios-panel/80 px-3 py-2 border-t border-ps1-bios-border">
        <div className="flex items-center justify-center gap-6">
          {/* Port 1 */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <div className={`w-16 h-8 rounded-sm border-2 flex items-center justify-center transition-colors ${
                connectedPads.length > 0
                  ? 'bg-ps1-led-green/15 border-ps1-led-green shadow-[0_0_8px_rgba(68,204,102,0.35)]'
                  : 'bg-ps1-bios-bg-deep border-ps1-bios-border'
              }`}>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={`w-1 h-1 rounded-full ${
                      connectedPads.length > 0 ? 'bg-ps1-led-green' : 'bg-ps1-bios-border'
                    }`}></div>
                  ))}
                </div>
              </div>
              <div className={`w-2 h-2 rounded-full ${
                connectedPads.length > 0 ? 'bg-ps1-led-green led-blink' : 'bg-ps1-bios-border'
              }`}></div>
            </div>
            <span className="font-retro text-[7px] text-ps1-cyan-soft/80 tracking-widest">PORT 1</span>
            {connectedPads.length > 0 && (
              <span className="font-retro text-[6px] text-ps1-led-green truncate max-w-[100px]">
                {connectedPads[0].id?.substring(0, 15)}
              </span>
            )}
          </div>

          <div className="h-8 w-px bg-ps1-bios-border"></div>

          {/* Port 2 */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <div className={`w-16 h-8 rounded-sm border-2 flex items-center justify-center transition-colors ${
                connectedPads.length > 1
                  ? 'bg-ps1-led-green/15 border-ps1-led-green shadow-[0_0_8px_rgba(68,204,102,0.35)]'
                  : 'bg-ps1-bios-bg-deep border-ps1-bios-border'
              }`}>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={`w-1 h-1 rounded-full ${
                      connectedPads.length > 1 ? 'bg-ps1-led-green' : 'bg-ps1-bios-border'
                    }`}></div>
                  ))}
                </div>
              </div>
              <div className={`w-2 h-2 rounded-full ${
                connectedPads.length > 1 ? 'bg-ps1-led-green led-blink' : 'bg-ps1-bios-border'
              }`}></div>
            </div>
            <span className="font-retro text-[7px] text-ps1-cyan-soft/80 tracking-widest">PORT 2</span>
            {connectedPads.length > 1 && (
              <span className="font-retro text-[6px] text-ps1-led-green truncate max-w-[100px]">
                {connectedPads[1].id?.substring(0, 15)}
              </span>
            )}
          </div>

          <div className="h-8 w-px bg-ps1-bios-border"></div>

          {/* Memory Card Slot 1 */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <div className="w-12 h-8 rounded-sm border-2 bg-ps1-bios-bg-deep border-ps1-bios-border flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-ps1-cyan-soft/50">
                  <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <rect x="7" y="7" width="4" height="4" rx="1" fill="currentColor" opacity="0.5"/>
                  <rect x="13" y="7" width="4" height="4" rx="1" fill="currentColor" opacity="0.5"/>
                  <rect x="7" y="13" width="4" height="4" rx="1" fill="currentColor" opacity="0.5"/>
                  <rect x="13" y="13" width="4" height="4" rx="1" fill="currentColor" opacity="0.5"/>
                </svg>
              </div>
            </div>
            <span className="font-retro text-[7px] text-ps1-cyan-soft/80 tracking-widest">MEM 1</span>
          </div>

          {/* Memory Card Slot 2 */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <div className="w-12 h-8 rounded-sm border-2 bg-ps1-bios-bg-deep border-ps1-bios-border flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-ps1-cyan-soft/50">
                  <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <rect x="7" y="7" width="4" height="4" rx="1" fill="currentColor" opacity="0.5"/>
                  <rect x="13" y="7" width="4" height="4" rx="1" fill="currentColor" opacity="0.5"/>
                  <rect x="7" y="13" width="4" height="4" rx="1" fill="currentColor" opacity="0.5"/>
                  <rect x="13" y="13" width="4" height="4" rx="1" fill="currentColor" opacity="0.5"/>
                </svg>
              </div>
            </div>
            <span className="font-retro text-[7px] text-ps1-cyan-soft/80 tracking-widest">MEM 2</span>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

export default EmulatorScreen
