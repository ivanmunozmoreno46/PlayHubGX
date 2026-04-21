import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * UI panel for the Host-Client streaming Game Room (see useGameRoom).
 *
 * The host sees a big copyable room code, a status/latency badge and a
 * stop button. The guest sees a code input on entry, then a <video> element
 * that plays the host's stream (muted by default, with a button to unmute).
 */

function StatusBadge({ status, isHost, guestCount }) {
  const label = (() => {
    switch (status) {
      case 'connecting': return 'CONNECTING'
      case 'waiting': return isHost ? 'WAITING FOR GUESTS' : 'WAITING'
      case 'connected': return 'CONNECTED'
      case 'error': return 'ERROR'
      default: return 'DISCONNECTED'
    }
  })()

  const color = (() => {
    if (status === 'connected' || (isHost && guestCount > 0)) return 'bg-green-500'
    if (status === 'waiting' || status === 'connecting') return 'bg-yellow-500'
    if (status === 'error') return 'bg-red-500'
    return 'bg-gray-500'
  })()

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded bg-ps1-dark border border-ps1-gray">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className="font-retro text-[7px] text-gray-200 tracking-wider">{label}</span>
    </div>
  )
}

function LatencyBadge({ latency }) {
  if (latency == null) return null
  const color =
    latency < 80 ? 'text-green-400'
    : latency < 180 ? 'text-yellow-400'
    : 'text-red-400'
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded bg-ps1-dark border border-ps1-gray">
      <span className="font-retro text-[7px] text-gray-400">PING</span>
      <span className={`font-retro text-[8px] ${color}`}>{latency}ms</span>
    </div>
  )
}

function HostView({ room, onHidePanel }) {
  const {
    status,
    roomCode,
    guestCount,
    error,
    leaveRoom,
  } = room

  const [copied, setCopied] = useState(false)
  const copyTimeoutRef = useRef(null)

  const handleCopy = useCallback(async () => {
    if (!roomCode) return
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(roomCode)
      } else {
        const el = document.createElement('textarea')
        el.value = roomCode
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }
      setCopied(true)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 1500)
    } catch (_) {
      // Ignore clipboard failures (e.g. insecure context).
    }
  }, [roomCode])

  useEffect(() => () => {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
  }, [])

  return (
    <div className="w-full p-4">
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-300 text-[8px] font-retro">
          {error}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div className="font-retro text-[7px] text-gray-400">YOU ARE THE HOST</div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} isHost guestCount={guestCount} />
          {onHidePanel && (
            <button
              onClick={onHidePanel}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white font-retro text-[8px] rounded"
              title="Hide this panel without closing the room"
            >
              HIDE PANEL
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 text-center">
        <div className="font-retro text-[7px] text-gray-400 mb-2">ROOM CODE</div>
        <div className="inline-flex items-center gap-2">
          <div className="px-6 py-3 bg-ps1-dark border-2 border-green-500 rounded">
            <span className="font-retro text-lg text-green-400 tracking-[0.3em] select-all">
              {roomCode}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="px-3 py-3 bg-gray-700 hover:bg-gray-600 text-white font-retro text-[8px] rounded"
            title="Copy room code"
          >
            {copied ? 'COPIED' : 'COPY'}
          </button>
        </div>
        <div className="mt-2 font-retro text-[7px] text-gray-500">
          Share this code with a friend so they can join as Player 2.
        </div>
      </div>

      <div className="mb-6 p-3 bg-ps1-dark rounded border border-ps1-gray">
        <div className="flex items-center justify-between">
          <div className="font-retro text-[8px] text-gray-200">GUESTS</div>
          <div className="font-retro text-[10px] text-green-400">{guestCount}</div>
        </div>
        <div className="mt-2 font-retro text-[7px] text-gray-400 leading-relaxed">
          Guests see your game and control Player 2. Your game keeps running locally
          even if no one is connected. You can hide this panel to play normally —
          the room stays open in the background.
        </div>
      </div>

      <div className="flex gap-2">
        {onHidePanel && (
          <button
            onClick={onHidePanel}
            className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-retro text-[9px] rounded"
          >
            HIDE PANEL
          </button>
        )}
        <button
          onClick={leaveRoom}
          className={`${onHidePanel ? 'flex-1' : 'w-full'} py-3 px-4 bg-red-700 hover:bg-red-600 text-white font-retro text-[9px] rounded`}
        >
          CLOSE ROOM
        </button>
      </div>
    </div>
  )
}

function GuestView({ room }) {
  const {
    status,
    roomCode,
    latency,
    remoteStream,
    error,
    joinRoom,
    leaveRoom,
    sendInput,
  } = room

  const [inputCode, setInputCode] = useState('')
  const [isMuted, setIsMuted] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const videoRef = useRef(null)
  const inputFocusRef = useRef(null)
  const stageRef = useRef(null)

  // Attach / detach the incoming MediaStream to the <video> element.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (remoteStream && video.srcObject !== remoteStream) {
      video.srcObject = remoteStream
      // autoplay muted should succeed even without user interaction.
      const p = video.play()
      if (p && typeof p.catch === 'function') p.catch(() => { /* ignore */ })
    }
    if (!remoteStream && video.srcObject) {
      video.srcObject = null
    }
  }, [remoteStream])

  // Forward key events to the host while the guest area is focused.
  useEffect(() => {
    if (!remoteStream) return
    const el = inputFocusRef.current
    if (!el) return

    const onKey = (e) => {
      // Prevent the page from scrolling when the guest uses arrow keys / space.
      if (e.code && e.code.startsWith('Arrow')) e.preventDefault()
      if (e.code === 'Space') e.preventDefault()
      if (e.repeat) return
      sendInput({ type: e.type, code: e.code, key: e.key })
    }

    el.addEventListener('keydown', onKey)
    el.addEventListener('keyup', onKey)
    // Auto-focus so keys are captured immediately.
    el.focus()
    return () => {
      el.removeEventListener('keydown', onKey)
      el.removeEventListener('keyup', onKey)
    }
  }, [remoteStream, sendInput])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev
      if (videoRef.current) videoRef.current.muted = next
      return next
    })
  }, [])

  // Track browser/OS fullscreen state so the button label stays in sync.
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    const el = stageRef.current
    if (!el) return
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else if (el.requestFullscreen) {
        await el.requestFullscreen()
        // Keep keyboard focus on the capture area once fullscreen is active.
        setTimeout(() => inputFocusRef.current?.focus(), 50)
      }
    } catch (_) {
      /* ignore fullscreen failures */
    }
  }, [])

  // Not connected yet: show the join form.
  if (!roomCode) {
    return (
      <div className="w-full p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-300 text-[8px] font-retro">
            {error}
          </div>
        )}

        <div className="mb-6 text-center">
          <h2 className="font-retro text-xs text-ps1-text mb-2">JOIN GAME ROOM</h2>
          <p className="font-retro text-[7px] text-gray-400">
            Enter the 6-character code shared by the host.
          </p>
        </div>

        <div className="space-y-3 mb-4">
          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder="ROOM CODE"
            maxLength={6}
            className="w-full px-4 py-3 bg-ps1-dark border border-ps1-gray text-ps1-text font-retro text-xs tracking-widest text-center rounded focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => {
              if (inputCode.length === 6) joinRoom(inputCode)
            }}
            disabled={inputCode.length !== 6}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-retro text-[9px] rounded"
          >
            JOIN ROOM
          </button>
        </div>

        <div className="p-3 bg-ps1-dark rounded border border-ps1-gray">
          <p className="font-retro text-[7px] text-gray-400 leading-relaxed">
            You will see the host's game streamed to your browser. Your keyboard inputs
            will control Player 2 on the host's console.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="font-retro text-[7px] text-gray-400">ROOM</div>
          <div className="font-retro text-[9px] text-green-400 tracking-widest">{roomCode}</div>
        </div>
        <div className="flex items-center gap-2">
          <LatencyBadge latency={latency} />
          <StatusBadge status={status} isHost={false} guestCount={0} />
        </div>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-900/50 border border-red-500 rounded text-red-300 text-[7px] font-retro">
          {error}
        </div>
      )}

      <div
        ref={stageRef}
        className={`relative bg-black border-2 border-ps1-gray mx-auto ${
          isFullscreen ? 'w-screen h-screen' : 'w-full'
        }`}
        style={
          isFullscreen
            ? {}
            : {
                aspectRatio: '4/3',
                // Scale the stage so it fills the available viewport while
                // preserving 4:3. The 160px budget leaves room for the panel
                // header, hint row and the browser chrome.
                maxWidth: 'min(100%, calc((100vh - 160px) * 4 / 3))',
              }
        }
      >
        <div
          ref={inputFocusRef}
          tabIndex={0}
          className="absolute inset-0 outline-none focus:ring-2 focus:ring-green-500 focus:ring-inset"
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isMuted}
            className="w-full h-full object-contain bg-black"
          />
        </div>

        {!remoteStream && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 pointer-events-none">
            <div className="text-center">
              <div className="font-retro text-[10px] text-yellow-400 mb-2">
                {status === 'connected' ? 'WAITING FOR HOST STREAM' : 'CONNECTING TO HOST'}
              </div>
              <div className="font-retro text-[7px] text-gray-400">
                The host must have a game running.
              </div>
            </div>
          </div>
        )}

        {remoteStream && (
          <div className="absolute bottom-2 right-2 flex items-center gap-2 z-10">
            <button
              onClick={toggleMute}
              className="px-3 py-1 bg-gray-900/80 hover:bg-gray-800 text-white font-retro text-[8px] rounded border border-gray-600"
            >
              {isMuted ? 'UNMUTE' : 'MUTE'}
            </button>
            <button
              onClick={toggleFullscreen}
              className="px-3 py-1 bg-gray-900/80 hover:bg-gray-800 text-white font-retro text-[8px] rounded border border-gray-600"
              title="Toggle fullscreen"
            >
              {isFullscreen ? 'EXIT FULL' : 'FULLSCREEN'}
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="font-retro text-[7px] text-gray-400 leading-relaxed max-w-[70%]">
          Click the video area to capture keyboard input. Arrows = D-Pad, Z = Cross,
          X = Circle, C = Square, V = Triangle, Q/E = L1/R1, Enter = Start, Shift = Select.
        </div>
        <button
          onClick={leaveRoom}
          className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white font-retro text-[8px] rounded"
        >
          LEAVE
        </button>
      </div>
    </div>
  )
}

export default function GameRoomPanel({ room, canHost, onHidePanel }) {
  const { role, createRoom, status, error } = room

  // Entry screen: pick Host or Guest.
  if (role === 'idle') {
    return (
      <div className="w-full p-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-retro text-xs text-ps1-text mb-1">GAME ROOM</h2>
            <p className="font-retro text-[7px] text-gray-400">
              Stream your game to a friend or join theirs.
            </p>
          </div>
          {onHidePanel && (
            <button
              onClick={onHidePanel}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white font-retro text-[8px] rounded"
            >
              CLOSE
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-300 text-[8px] font-retro">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={createRoom}
            disabled={!canHost || status === 'connecting'}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-retro text-[9px] rounded"
          >
            HOST A GAME
          </button>
          {!canHost && (
            <div className="font-retro text-[7px] text-yellow-400 -mt-2 text-center">
              Start a game first to host a room.
            </div>
          )}

          <div className="pt-2 border-t border-ps1-gray" />

          <GuestView room={room} />
        </div>
      </div>
    )
  }

  if (role === 'hosting') {
    return <HostView room={room} onHidePanel={onHidePanel} />
  }

  return <GuestView room={room} />
}
