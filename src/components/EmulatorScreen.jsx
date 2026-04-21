import { useRef, useState, useCallback, useEffect } from 'react'
import { useEmulator } from '../hooks/useEmulator'
import { useGamepad } from '../hooks/useGamepad'
import { useMultiplayer } from '../hooks/useMultiplayer'
import { useGameRoom } from '../hooks/useGameRoom'
import GamepadIndicator from './GamepadIndicator'
import MultiplayerLobby from './MultiplayerLobby'
import GameRoomPanel from './GameRoomPanel'

/**
 * PS1 Memory Card Manager Style - Light Gray Grid Theme
 */

// Grid cell component - Medium gray PS1 style
function GridCell({ children, className }) {
  return (
    <div
      className={`
        aspect-square border border-gray-500 
        flex items-center justify-center
        ${className || ''}
      `}
      style={{
        backgroundColor: '#505050',
        boxShadow: 'inset 1px 1px 0 #606060, inset -1px -1px 0 #404040',
      }}
    >
      {children}
    </div>
  )
}

// PS1-style START button
function StartButton({ children, onClick, className }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-6 py-2 font-retro text-[10px] tracking-wider
        bg-green-600 hover:bg-green-500 text-white
        active:translate-y-0.5 transition-all
        ${className || ''}
      `}
      style={{
        boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.3), inset -1px -1px 0 rgba(0,0,0,0.3)',
      }}
    >
      {children}
    </button>
  )
}

// Secondary action button
function ActionButton({ children, onClick, className }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-1.5 font-retro text-[8px] tracking-wider
        bg-gray-500 hover:bg-gray-400 text-gray-100
        active:translate-y-0.5 transition-all
        ${className || ''}
      `}
      style={{
        boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.3), inset -1px -1px 0 rgba(0,0,0,0.2)',
      }}
    >
      {children}
    </button>
  )
}

// Slot header with colored number
function SlotHeader({ slot, color }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex-1">
        <div className="font-retro text-[7px] text-gray-600">MEMORY CARD</div>
        <div className="font-retro text-[8px] text-gray-500">SLOT</div>
      </div>
      <div
        className="w-6 h-6 flex items-center justify-center font-retro text-[14px] text-black font-bold"
        style={{ backgroundColor: color }}
      >
        {slot}
      </div>
    </div>
  )
}

// Game icon placeholder for memory card slots
function GameIcon({ icon }) {
  const icons = ['💾', '🎮', '', '', '🎯', '', '🏆', '⭐', '']
  return (
    <span className="text-lg">{icons[icon % icons.length]}</span>
  )
}

function EmulatorScreen() {
  const containerRef = useRef(null)
  const biosInputRef = useRef(null)
  const romInputRef = useRef(null)

  const [biosFile, setBiosFile] = useState(null)
  const [romFiles, setRomFiles] = useState([])
  const [step, setStep] = useState('bios')
  const [showMultiplayer, setShowMultiplayer] = useState(false)
  const [showGameRoom, setShowGameRoom] = useState(false)

  const {
    emulatorState,
    initializeEmulator,
    stopEmulator,
  } = useEmulator(containerRef)

  const { gamepadState } = useGamepad()

  const multiplayer = useMultiplayer()
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
        setStep('rom')
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
      setStep('ready')
    }
  }, [])

  const removeRomFile = useCallback((index) => {
    setRomFiles(prev => {
      const newFiles = [...prev]
      newFiles.splice(index, 1)
      if (newFiles.length === 0) setStep('rom')
      return newFiles
    })
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
    setStep('bios')
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
    <div className="w-full h-full flex flex-col bg-gray-600">
      {/* Input Status Bar */}
      <div className="flex items-center justify-between px-2 py-1 bg-gray-700 border-b border-gray-600">
        <div className="flex items-center gap-2">
          <GamepadIndicator
            isConnected={gamepadState.isConnected}
            gamepadId={gamepadState.gamepadId}
            inputSource={gamepadState.isConnected ? 'gamepad' : 'keyboard'}
          />
          <span className={`font-retro text-[7px] ${gamepadState.isConnected ? 'text-green-700' : 'text-gray-500'}`}>
            {gamepadState.isConnected ? 'PAD' : 'NO PAD'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMultiplayer(!showMultiplayer)}
            className={`
              px-3 py-1 font-retro text-[8px] rounded transition-all
              ${showMultiplayer
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
              }
            `}
          >
            {showMultiplayer ? 'MP: ON' : 'MP: OFF'}
          </button>
          <button
            onClick={() => {
              // Guests cannot hide their own panel (the video is the whole UI).
              if (isGuestStreaming) return
              setShowGameRoom((v) => !v)
            }}
            disabled={isGuestStreaming}
            className={`
              px-3 py-1 font-retro text-[8px] rounded transition-all
              ${gameRoomActive
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : gameRoomVisible
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
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

      {/* Main Content Area - PS1 Memory Card Manager Style */}
      <div className="relative w-full flex-1" style={{ aspectRatio: '4/3' }}>
        {/* Multiplayer Panel */}
        {showMultiplayer && !isGuestStreaming && (
          <div className="absolute inset-0 z-20 bg-gray-700/95 backdrop-blur-sm overflow-y-auto">
            <div className="min-h-full flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-gray-800 rounded-lg border-2 border-ps1-gray shadow-2xl">
                <MultiplayerLobby multiplayer={multiplayer} />
              </div>
            </div>
          </div>
        )}

        {/* Game Room (Host-Client streaming) - host panel stays inside the console screen */}
        {gameRoomVisible && !isGuestStreaming && (
          <div className="absolute inset-0 z-30 bg-gray-900/95 backdrop-blur-sm overflow-y-auto">
            <div className="min-h-full flex items-center justify-center p-4">
              <div className="w-full max-w-xl bg-gray-800 rounded-lg border-2 border-ps1-gray shadow-2xl">
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
          style={{ backgroundColor: '#585858' }}
        >
          {emulatorState.isLoading ? (
            /* Loading Screen - Medium Gray Grid */
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-600">
              <div className="grid grid-cols-12 grid-rows-8 w-full h-full gap-0 p-2">
                {Array.from({ length: 96 }).map((_, i) => (
                  <GridCell key={i} className="border-gray-500" />
                ))}
              </div>
              {/* Overlay loading info */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800/60">
                <div className="font-retro text-[10px] text-yellow-400 mb-4">
                  {emulatorState.loadingMessage || 'LOADING'}
                </div>
                <div className="w-48 h-3 bg-gray-600 border border-gray-500">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${emulatorState.progress}%` }}
                  />
                </div>
                <div className="font-retro text-[8px] text-gray-300 mt-2">
                  {emulatorState.progress}%
                </div>
                {/* Debug info */}
                <div className="font-retro text-[6px] text-gray-500 mt-4 px-8 text-center max-w-xs">
                  BIOS: {biosFile?.name}<br/>
                  ROM: {romFiles.map(f => f.name).join(', ')}
                </div>
              </div>
            </div>
          ) : emulatorState.isRunning ? (
            /* Emulator Running */
            <div className="w-full h-full relative bg-black">
              {emulatorState.needsMenuInteraction && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                  <div className="text-center">
                    <div className="font-retro text-yellow-400 text-[10px] mb-4">
                      SELECT GAME
                    </div>
                    <div className="font-retro text-[8px] text-gray-400">
                      Use ↑↓←→ to navigate
                    </div>
                    <div className="font-retro text-[8px] text-gray-400 mt-1">
                      Enter/Z to select
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : emulatorState.error ? (
            /* Error Screen */
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-400">
              <div className="font-retro text-red-600 text-[10px] mb-4">ERROR</div>
              <div className="font-retro text-[7px] text-gray-700 px-4 text-center max-w-xs mb-4">
                {emulatorState.error}
              </div>
              <ActionButton onClick={resetEmulator}>RESET</ActionButton>
            </div>
          ) : step === 'bios' ? (
            /* BIOS Selection - Medium Gray Memory Card Style */
            <div className="w-full h-full flex flex-col p-3" style={{ backgroundColor: '#606060' }}>
              {/* Title bar */}
              <div className="text-center mb-3">
                <div className="font-retro text-[10px] text-gray-300">
                  MEMORY CARD MANAGER
                </div>
              </div>

              {/* Grid area */}
              <div className="flex-1 grid grid-cols-12 grid-rows-8 gap-0 mb-3">
                {/* Left side - Memory Card 1 (BIOS slot) */}
                <div className="col-span-4 row-span-8 flex flex-col">
                  <div className="bg-gray-700 px-2 py-1 border border-gray-600 mb-1">
                    <SlotHeader slot="1" color="#22c55e" />
                  </div>
                  <div className="flex-1 grid grid-cols-3 grid-rows-3 gap-0">
                    {/* BIOS indicator */}
                    <div className="col-span-3 row-span-1 flex items-center justify-center bg-gray-600 border border-gray-500">
                      <span className="text-2xl">💿</span>
                    </div>
                    <div className="col-span-3 row-span-2 flex items-center justify-center bg-gray-600 border border-gray-500">
                      <span className="text-lg">🔧</span>
                    </div>
                  </div>
                </div>

                {/* Center - Menu options */}
                <div className="col-span-4 row-span-8 flex flex-col items-center justify-center gap-3">
                  <StartButton onClick={triggerBiosInput}>
                    LOAD BIOS
                  </StartButton>
                </div>

                {/* Right side - Empty slot 2 */}
                <div className="col-span-4 row-span-8 flex flex-col">
                  <div className="bg-gray-700 px-2 py-1 border border-gray-600 mb-1">
                    <SlotHeader slot="2" color="#eab308" />
                  </div>
                  <div className="flex-1 grid grid-cols-3 grid-rows-3 gap-0">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <GridCell key={i} className="bg-gray-600 border-gray-500" />
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom - Single START button */}
              <div className="flex items-center justify-center gap-3">
                <StartButton onClick={triggerBiosInput}>
                  START
                </StartButton>
              </div>

              {/* BIOS hint */}
              <div className="text-center mt-2">
                <div className="font-retro text-[7px] text-gray-500">
                  Accepts: scph5501.bin, scph7001.bin, scph1001.bin
                </div>
              </div>
            </div>
          ) : step === 'rom' ? (
            /* ROM Selection */
            <div className="w-full h-full flex flex-col p-3" style={{ backgroundColor: '#606060' }}>
              {/* Title */}
              <div className="text-center mb-3">
                <div className="font-retro text-[10px] text-gray-300">
                  MEMORY CARD MANAGER
                </div>
              </div>

              {/* Grid */}
              <div className="flex-1 grid grid-cols-12 grid-rows-8 gap-0 mb-3">
                {/* Slot 1 - BIOS loaded */}
                <div className="col-span-4 row-span-8 flex flex-col">
                  <div className="bg-gray-700 px-2 py-1 border border-gray-600 mb-1">
                    <SlotHeader slot="1" color="#22c55e" />
                  </div>
                  <div className="flex-1 flex items-center justify-center bg-gray-600 border border-gray-500">
                    <span className="text-3xl">💿</span>
                  </div>
                </div>

                {/* Center - ROM options */}
                <div className="col-span-4 row-span-8 flex flex-col items-center justify-center gap-3">
                  <StartButton onClick={triggerRomInput}>
                    LOAD GAME
                  </StartButton>
                </div>

                {/* Slot 2 - Empty */}
                <div className="col-span-4 row-span-8 flex flex-col">
                  <div className="bg-gray-700 px-2 py-1 border border-gray-600 mb-1">
                    <SlotHeader slot="2" color="#eab308" />
                  </div>
                  <div className="flex-1 grid grid-cols-3 grid-rows-3 gap-0">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <GridCell key={i} className="bg-gray-600 border-gray-500" />
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom */}
              <div className="flex items-center justify-center gap-3">
                <StartButton onClick={triggerRomInput}>
                  START
                </StartButton>
              </div>

              <div className="text-center mt-2">
                <div className="font-retro text-[7px] text-gray-400">
                  {biosFile?.name}
                </div>
                <div className="font-retro text-[7px] text-gray-500 mt-1">
                  Accepts: .bin, .cue, .iso, .img, .chd, .pbp
                </div>
              </div>
            </div>
          ) : (
            /* Ready to Start - Show loaded files */
            <div className="w-full h-full flex flex-col p-3" style={{ backgroundColor: '#606060' }}>
              {/* Title */}
              <div className="text-center mb-3">
                <div className="font-retro text-[10px] text-gray-300">
                  MEMORY CARD MANAGER
                </div>
              </div>

              {/* Grid */}
              <div className="flex-1 grid grid-cols-12 grid-rows-8 gap-0 mb-3">
                {/* Slot 1 - Game files */}
                <div className="col-span-4 row-span-8 flex flex-col">
                  <div className="bg-gray-700 px-2 py-1 border border-gray-600 mb-1">
                    <SlotHeader slot="1" color="#22c55e" />
                  </div>
                  <div className="flex-1 grid grid-cols-3 gap-0 overflow-y-auto">
                    {romFiles.map((file, i) => (
                      <div
                        key={i}
                        className="flex flex-col items-center justify-center bg-gray-600 border border-gray-500 aspect-square relative group cursor-pointer"
                        onClick={() => removeRomFile(i)}
                        title={`Click to remove: ${file.name}`}
                      >
                        <GameIcon icon={i} />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-1 py-0.5">
                          <div className="text-[5px] text-gray-300 truncate">
                            {file.name.substring(0, 6)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* Fill empty slots */}
                    {Array.from({ length: Math.max(0, 9 - romFiles.length) }).map((_, i) => (
                      <GridCell key={`empty-${i}`} className="bg-gray-600 border-gray-500" />
                    ))}
                  </div>
                </div>

                {/* Center - Start option */}
                <div className="col-span-4 row-span-8 flex flex-col items-center justify-center gap-3">
                  <StartButton onClick={startEmulator}>
                    START GAME
                  </StartButton>
                  <ActionButton onClick={triggerRomInput}>
                    ADD FILES
                  </ActionButton>
                </div>

                {/* Slot 2 - Empty */}
                <div className="col-span-4 row-span-8 flex flex-col">
                  <div className="bg-gray-700 px-2 py-1 border border-gray-600 mb-1">
                    <SlotHeader slot="2" color="#eab308" />
                  </div>
                  <div className="flex-1 grid grid-cols-3 grid-rows-3 gap-0">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <GridCell key={i} className="bg-gray-600 border-gray-500" />
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom action buttons */}
              <div className="flex items-center justify-center gap-3">
                <StartButton onClick={startEmulator}>
                  START
                </StartButton>
                <ActionButton onClick={resetEmulator}>
                  RESET
                </ActionButton>
              </div>

              {/* Game name display */}
              <div className="bg-gray-700 px-3 py-2 mt-2 border border-gray-600">
                <div className="font-retro text-[9px] text-gray-200 text-center truncate">
                  {romFiles.length > 0 ? romFiles[0].name.replace(/\.(cue|bin|iso|img|chd|pbp)$/i, '') : 'No game loaded'}
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
      <div className="bg-gray-700 px-3 py-2 border-t border-gray-600">
        <div className="flex items-center justify-center gap-6">
          {/* Port 1 */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              {/* Port socket */}
              <div className={`w-16 h-8 rounded-sm border-2 flex items-center justify-center transition-colors ${
                connectedPads.length > 0 
                  ? 'bg-green-900/30 border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]' 
                  : 'bg-gray-800 border-gray-600'
              }`}>
                {/* Port pins */}
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={`w-1 h-1 rounded-full ${
                      connectedPads.length > 0 ? 'bg-green-500' : 'bg-gray-600'
                    }`}></div>
                  ))}
                </div>
              </div>
              {/* Connection indicator */}
              <div className={`w-2 h-2 rounded-full ${
                connectedPads.length > 0 ? 'bg-green-500 led-blink' : 'bg-gray-600'
              }`}></div>
            </div>
            <span className="font-retro text-[7px] text-gray-400">PORT 1</span>
            {connectedPads.length > 0 && (
              <span className="font-retro text-[6px] text-green-400 truncate max-w-[100px]">
                {connectedPads[0].id?.substring(0, 15)}
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-gray-600"></div>

          {/* Port 2 */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              {/* Port socket */}
              <div className={`w-16 h-8 rounded-sm border-2 flex items-center justify-center transition-colors ${
                connectedPads.length > 1 
                  ? 'bg-green-900/30 border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]' 
                  : 'bg-gray-800 border-gray-600'
              }`}>
                {/* Port pins */}
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={`w-1 h-1 rounded-full ${
                      connectedPads.length > 1 ? 'bg-green-500' : 'bg-gray-600'
                    }`}></div>
                  ))}
                </div>
              </div>
              {/* Connection indicator */}
              <div className={`w-2 h-2 rounded-full ${
                connectedPads.length > 1 ? 'bg-green-500 led-blink' : 'bg-gray-600'
              }`}></div>
            </div>
            <span className="font-retro text-[7px] text-gray-400">PORT 2</span>
            {connectedPads.length > 1 && (
              <span className="font-retro text-[6px] text-green-400 truncate max-w-[100px]">
                {connectedPads[1].id?.substring(0, 15)}
              </span>
            )}
          </div>

          {/* Memory Card Divider */}
          <div className="h-8 w-px bg-gray-600"></div>

          {/* Memory Card Slot 1 */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              {/* Memory card slot */}
              <div className="w-12 h-8 rounded-sm border-2 bg-gray-800 border-gray-600 flex items-center justify-center">
                {/* Memory card icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600">
                  <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <rect x="7" y="7" width="4" height="4" rx="1" fill="currentColor" opacity="0.5"/>
                  <rect x="13" y="7" width="4" height="4" rx="1" fill="currentColor" opacity="0.5"/>
                  <rect x="7" y="13" width="4" height="4" rx="1" fill="currentColor" opacity="0.5"/>
                  <rect x="13" y="13" width="4" height="4" rx="1" fill="currentColor" opacity="0.5"/>
                </svg>
              </div>
            </div>
            <span className="font-retro text-[7px] text-gray-400">MEM 1</span>
          </div>

          {/* Memory Card Slot 2 */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              {/* Memory card slot */}
              <div className="w-12 h-8 rounded-sm border-2 bg-gray-800 border-gray-600 flex items-center justify-center">
                {/* Memory card icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600">
                  <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <rect x="7" y="7" width="4" height="4" rx="1" fill="currentColor" opacity="0.5"/>
                  <rect x="13" y="7" width="4" height="4" rx="1" fill="currentColor" opacity="0.5"/>
                  <rect x="7" y="13" width="4" height="4" rx="1" fill="currentColor" opacity="0.5"/>
                  <rect x="13" y="13" width="4" height="4" rx="1" fill="currentColor" opacity="0.5"/>
                </svg>
              </div>
            </div>
            <span className="font-retro text-[7px] text-gray-400">MEM 2</span>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

export default EmulatorScreen
