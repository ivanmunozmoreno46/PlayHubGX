import { useCallback, useEffect, useRef, useState } from 'react'
import GuestControlsPanel from './GuestControlsPanel'
import { loadBindings, saveBindings } from '../lib/guestControls'

/**
 * UI panel for the Host-Client streaming Game Room (see useGameRoom).
 *
 * The host sees a big copyable room code, a status/latency badge and a
 * stop button. The guest sees a code input on entry, then a <video> element
 * that plays the host's stream (muted by default, with a button to unmute).
 *
 * Guests can drive Player 2 with either the keyboard or a Web Gamepad API
 * device (USB/Bluetooth pad). The guest polls the pad on every animation
 * frame and only forwards *changes* through the PeerJS DataChannel so the
 * host receives the same kind of discrete events as keyboard input.
 */

// Deadzone applied to analog stick inputs on the guest side. Raw values
// below this threshold are snapped to zero so small stick jitter doesn't
// saturate the DataChannel.
const GAMEPAD_AXIS_DEADZONE = 0.15
// Minimum absolute delta (after deadzone) required before we forward an
// axis update to the host. Keeps the channel quiet when the stick is
// fully deflected and only noisy on the analog-to-digital boundary.
const GAMEPAD_AXIS_EPSILON = 0.03
// Analog trigger buttons (LT/RT = indices 6/7) already come through as
// digital in the Standard Gamepad mapping — their `.pressed` flag is true
// past ~0.5. We rely on `.pressed` rather than `.value` to keep the host
// path simple.

function applyDeadzone(value) {
  if (Math.abs(value) < GAMEPAD_AXIS_DEADZONE) return 0
  // Rescale so the usable range starts at the deadzone edge (feels more
  // responsive than a hard cutoff).
  const sign = value < 0 ? -1 : 1
  const scaled = (Math.abs(value) - GAMEPAD_AXIS_DEADZONE) / (1 - GAMEPAD_AXIS_DEADZONE)
  return sign * Math.max(0, Math.min(1, scaled))
}

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
    if (status === 'connected' || (isHost && guestCount > 0)) return 'bg-ps1-led-green'
    if (status === 'waiting' || status === 'connecting') return 'bg-ps1-yellow'
    if (status === 'error') return 'bg-red-500'
    return 'bg-gray-500'
  })()

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded bg-ps1-dark border border-ps1-gray">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className="font-retro text-[7px] text-ps1-ivory tracking-wider">{label}</span>
    </div>
  )
}

function LatencyBadge({ latency }) {
  if (latency == null) return null
  const color =
    latency < 80 ? 'text-ps1-led-green'
    : latency < 180 ? 'text-ps1-yellow'
    : 'text-ps1-led-red'
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded bg-ps1-dark border border-ps1-gray">
      <span className="font-retro text-[7px] text-ps1-cyan-soft/70">PING</span>
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
        <div className="mb-4 p-3 bg-ps1-led-red/15 border border-ps1-led-red rounded text-ps1-led-red text-[8px] font-retro">
          {error}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div className="font-retro text-[7px] text-ps1-cyan-soft/70">YOU ARE THE HOST</div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} isHost guestCount={guestCount} />
          {onHidePanel && (
            <button
              onClick={onHidePanel}
              className="px-3 py-1 bg-ps1-bios-panel hover:bg-ps1-bios-panel/70 text-white font-retro text-[8px] rounded"
              title="Hide this panel without closing the room"
            >
              HIDE PANEL
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 text-center">
        <div className="font-retro text-[7px] text-ps1-cyan-soft/70 mb-2">ROOM CODE</div>
        <div className="inline-flex items-center gap-2">
          <div className="px-6 py-3 bg-ps1-dark border-2 border-ps1-led-green rounded">
            <span className="font-lcd text-[36px] leading-none text-ps1-led-green tracking-[0.25em] select-all glow-cyan">
              {roomCode}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="px-3 py-3 bg-ps1-bios-panel hover:bg-ps1-bios-panel/70 text-white font-retro text-[8px] rounded"
            title="Copy room code"
          >
            {copied ? 'COPIED' : 'COPY'}
          </button>
        </div>
        <div className="mt-2 font-retro text-[7px] text-ps1-cyan-soft/60">
          Share this code with a friend so they can join as Player 2.
        </div>
      </div>

      <div className="mb-6 p-3 bg-ps1-dark rounded border border-ps1-gray">
        <div className="flex items-center justify-between">
          <div className="font-retro text-[8px] text-ps1-ivory">GUESTS</div>
          <div className="font-retro text-[10px] text-ps1-led-green">{guestCount}</div>
        </div>
        <div className="mt-2 font-retro text-[7px] text-ps1-cyan-soft/70 leading-relaxed">
          Guests see your game and control Player 2. Your game keeps running locally
          even if no one is connected. You can hide this panel to play normally —
          the room stays open in the background.
        </div>
      </div>

      <div className="flex gap-2">
        {onHidePanel && (
          <button
            onClick={onHidePanel}
            className="flex-1 py-3 px-4 bg-ps1-bios-panel hover:bg-ps1-bios-panel/70 text-white font-retro text-[9px] rounded"
          >
            HIDE PANEL
          </button>
        )}
        <button
          onClick={leaveRoom}
          className={`${onHidePanel ? 'flex-1' : 'w-full'} py-3 px-4 bg-ps1-led-red/80 hover:bg-ps1-led-red text-white border border-ps1-led-red font-retro text-[9px] rounded`}
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
  const [gamepadName, setGamepadName] = useState(null)
  const [showControls, setShowControls] = useState(false)
  const [bindings, setBindings] = useState(() => loadBindings())
  const videoRef = useRef(null)
  const inputFocusRef = useRef(null)
  const stageRef = useRef(null)
  // Keep a ref of the latest bindings so the input loops (which run inside
  // stable effects) can read them without re-subscribing on every edit.
  const bindingsRef = useRef(bindings)
  useEffect(() => {
    bindingsRef.current = bindings
    saveBindings(bindings)
  }, [bindings])
  // When the controls modal is open we mute local input forwarding so the
  // keys being captured in the remap dialog don't also reach the host.
  const showControlsRef = useRef(showControls)
  useEffect(() => { showControlsRef.current = showControls }, [showControls])

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

  // Forward key events to the host while the guest area is focused. We
  // translate keyboard codes to libretro RetroPad ids *on the guest* using
  // the user's custom bindings, then send a generic `pad_button` message.
  useEffect(() => {
    if (!remoteStream) return
    const el = inputFocusRef.current
    if (!el) return

    const onKey = (e) => {
      // Prevent the page from scrolling when the guest uses arrow keys / space.
      if (e.code && e.code.startsWith('Arrow')) e.preventDefault()
      if (e.code === 'Space') e.preventDefault()
      if (e.repeat) return
      // Let the controls modal capture input while it's open.
      if (showControlsRef.current) return
      const libretroId = bindingsRef.current.keys[e.code]
      if (libretroId === undefined) return
      sendInput({ type: 'pad_button', id: libretroId, value: e.type === 'keydown' ? 1 : 0 })
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

  // Poll the Gamepad API while the stream is active and forward button /
  // axis changes to the host. We only send *deltas* so pads that are idle
  // don't spam the DataChannel.
  useEffect(() => {
    if (!remoteStream) {
      setGamepadName(null)
      return
    }
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
      return
    }

    let rafId = null
    // Previous digital state per Standard Gamepad button index.
    const prevButtons = new Map()
    // Previous (post-deadzone) analog value per axis key.
    const prevAxes = { lx: 0, ly: 0, rx: 0, ry: 0 }
    let activeIndex = null

    const releaseAll = () => {
      prevButtons.forEach((wasDown, idx) => {
        if (!wasDown) return
        const libretroId = GAME_ROOM_GAMEPAD_MAP[idx]
        if (libretroId !== undefined) {
          sendInput({ type: 'pad_button', id: libretroId, value: 0 })
        }
      })
      prevButtons.clear()
      Object.keys(prevAxes).forEach((axisKey) => {
        if (prevAxes[axisKey] !== 0) {
          sendInput({ type: 'pad_axis', axis: axisKey, value: 0 })
          prevAxes[axisKey] = 0
        }
      })
    }

    const onConnected = (e) => {
      if (activeIndex == null && e.gamepad) {
        activeIndex = e.gamepad.index
        setGamepadName(e.gamepad.id || 'GAMEPAD')
      }
    }
    const onDisconnected = (e) => {
      if (e.gamepad && e.gamepad.index === activeIndex) {
        releaseAll()
        activeIndex = null
        setGamepadName(null)
      }
    }
    window.addEventListener('gamepadconnected', onConnected)
    window.addEventListener('gamepaddisconnected', onDisconnected)

    const tick = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : []
      let pad = null
      if (activeIndex != null) pad = pads[activeIndex] || null
      if (!pad) {
        // Pick the first connected pad as the active one.
        for (let i = 0; i < pads.length; i++) {
          if (pads[i] && pads[i].connected) {
            pad = pads[i]
            activeIndex = pads[i].index
            if (!gamepadName) setGamepadName(pads[i].id || 'GAMEPAD')
            break
          }
        }
      }

      if (pad) {
        // Suppress pad forwarding while the controls modal is open so button
        // presses are captured as rebinds instead of driving the host.
        const padActive = !showControlsRef.current
        // Buttons — only forward on transitions.
        for (let i = 0; i < pad.buttons.length; i++) {
          const libretroId = bindingsRef.current.pad[i]
          const isDown = Boolean(pad.buttons[i] && pad.buttons[i].pressed)
          const was = prevButtons.get(i) || false
          if (isDown !== was) {
            prevButtons.set(i, isDown)
            if (padActive && libretroId !== undefined) {
              sendInput({ type: 'pad_button', id: libretroId, value: isDown ? 1 : 0 })
            }
          }
        }

        // Axes — send every change above the epsilon threshold.
        const axisMap = [
          ['lx', pad.axes[0] || 0],
          ['ly', pad.axes[1] || 0],
          ['rx', pad.axes[2] || 0],
          ['ry', pad.axes[3] || 0],
        ]
        for (const [axisKey, raw] of axisMap) {
          const v = applyDeadzone(raw)
          if (Math.abs(v - prevAxes[axisKey]) >= GAMEPAD_AXIS_EPSILON ||
              (v === 0 && prevAxes[axisKey] !== 0)) {
            prevAxes[axisKey] = v
            if (padActive) sendInput({ type: 'pad_axis', axis: axisKey, value: v })
          }
        }
      }

      rafId = window.requestAnimationFrame(tick)
    }
    rafId = window.requestAnimationFrame(tick)

    return () => {
      if (rafId != null) window.cancelAnimationFrame(rafId)
      window.removeEventListener('gamepadconnected', onConnected)
      window.removeEventListener('gamepaddisconnected', onDisconnected)
      releaseAll()
      setGamepadName(null)
    }
  // gamepadName is only used for the initial indicator; adding it to deps
  // would restart the polling loop whenever the name changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <div className="mb-4 p-3 bg-ps1-led-red/15 border border-ps1-led-red rounded text-ps1-led-red text-[8px] font-retro">
            {error}
          </div>
        )}

        <div className="mb-6 text-center">
          <h2 className="font-ps font-semibold text-[14px] text-ps1-yellow tracking-[0.3em] mb-2 glow-yellow">JOIN GAME ROOM</h2>
          <p className="font-retro text-[7px] text-ps1-cyan-soft/70">
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
            className="w-full px-4 py-3 bg-ps1-dark border border-ps1-gray text-ps1-text font-retro text-xs tracking-widest text-center rounded focus:outline-none focus:border-ps1-cyan"
          />
          <button
            onClick={() => {
              if (inputCode.length === 6) joinRoom(inputCode)
            }}
            disabled={inputCode.length !== 6}
            className="w-full py-3 px-4 bg-ps1-cyan-deep hover:bg-ps1-cyan disabled:bg-ps1-bios-panel disabled:text-ps1-cyan-soft/40 disabled:cursor-not-allowed text-white border border-ps1-cyan font-retro text-[9px] rounded"
          >
            JOIN ROOM
          </button>
        </div>

        <div className="p-3 bg-ps1-dark rounded border border-ps1-gray">
          <p className="font-retro text-[7px] text-ps1-cyan-soft/70 leading-relaxed">
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
          <div className="font-retro text-[7px] text-ps1-cyan-soft/70">ROOM</div>
          <div className="font-retro text-[9px] text-ps1-led-green tracking-widest">{roomCode}</div>
        </div>
        <div className="flex items-center gap-2">
          {gamepadName && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded bg-ps1-dark border border-ps1-gray"
              title={gamepadName}
            >
              <span className="w-2 h-2 rounded-full bg-ps1-led-green" />
              <span className="font-retro text-[7px] text-ps1-ivory tracking-wider">
                GAMEPAD
              </span>
            </div>
          )}
          <LatencyBadge latency={latency} />
          <StatusBadge status={status} isHost={false} guestCount={0} />
        </div>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-ps1-led-red/15 border border-ps1-led-red rounded text-ps1-led-red text-[7px] font-retro">
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
          className="absolute inset-0 outline-none focus:ring-2 focus:ring-ps1-cyan focus:ring-inset"
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isMuted}
            className="w-full h-full object-contain bg-black"
            // PSX native resolution is tiny (~320x240); pixelated keeps the
            // upscale crisp instead of applying a blurry bilinear filter.
            // The filter compensates for the RGB full-range -> YUV limited-
            // range conversion that WebRTC encoders apply, which tends to
            // wash out contrast and saturation on the receiver.
            style={{
              imageRendering: 'pixelated',
              filter: 'contrast(1.08) saturate(1.18)',
            }}
          />
        </div>

        {!remoteStream && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 pointer-events-none">
            <div className="text-center">
              <div className="font-retro text-[10px] text-ps1-yellow mb-2">
                {status === 'connected' ? 'WAITING FOR HOST STREAM' : 'CONNECTING TO HOST'}
              </div>
              <div className="font-retro text-[7px] text-ps1-cyan-soft/70">
                The host must have a game running.
              </div>
            </div>
          </div>
        )}

        {remoteStream && (
          <div className="absolute bottom-2 right-2 flex items-center gap-2 z-10">
            <button
              onClick={() => setShowControls(true)}
              className="px-3 py-1 bg-ps1-bios-bg-deep/80 hover:bg-ps1-bios-panel text-white font-retro text-[8px] rounded border border-ps1-bios-border"
              title="Configure controls"
            >
              CONTROLS
            </button>
            <button
              onClick={toggleMute}
              className="px-3 py-1 bg-ps1-bios-bg-deep/80 hover:bg-ps1-bios-panel text-white font-retro text-[8px] rounded border border-ps1-bios-border"
            >
              {isMuted ? 'UNMUTE' : 'MUTE'}
            </button>
            <button
              onClick={toggleFullscreen}
              className="px-3 py-1 bg-ps1-bios-bg-deep/80 hover:bg-ps1-bios-panel text-white font-retro text-[8px] rounded border border-ps1-bios-border"
              title="Toggle fullscreen"
            >
              {isFullscreen ? 'EXIT FULL' : 'FULLSCREEN'}
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="font-retro text-[7px] text-ps1-cyan-soft/70 leading-relaxed max-w-[70%]">
          Plug in a USB/Bluetooth gamepad and press any button to activate it, or click
          the video area to use the keyboard. Press <span className="text-ps1-ivory">CONTROLS</span>
          {' '}below the video to remap any button.
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowControls(true)}
            className="px-3 py-2 bg-ps1-bios-panel hover:bg-ps1-bios-panel/70 text-white font-retro text-[8px] rounded"
          >
            CONTROLS
          </button>
          <button
            onClick={leaveRoom}
            className="px-4 py-2 bg-ps1-led-red/80 hover:bg-ps1-led-red text-white border border-ps1-led-red font-retro text-[8px] rounded"
          >
            LEAVE
          </button>
        </div>
      </div>

      {showControls && (
        <GuestControlsPanel
          bindings={bindings}
          onChange={setBindings}
          onClose={() => setShowControls(false)}
        />
      )}
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
            <h2 className="font-ps font-semibold text-[14px] text-ps1-yellow tracking-[0.3em] mb-1 glow-yellow">GAME ROOM</h2>
            <p className="font-retro text-[7px] text-ps1-cyan-soft/70">
              Stream your game to a friend or join theirs.
            </p>
          </div>
          {onHidePanel && (
            <button
              onClick={onHidePanel}
              className="px-3 py-1 bg-ps1-bios-panel hover:bg-ps1-bios-panel/70 text-white font-retro text-[8px] rounded"
            >
              CLOSE
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-ps1-led-red/15 border border-ps1-led-red rounded text-ps1-led-red text-[8px] font-retro">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={createRoom}
            disabled={!canHost || status === 'connecting'}
            className="w-full py-3 px-4 bg-ps1-led-green/80 hover:bg-ps1-led-green disabled:bg-ps1-bios-panel disabled:text-ps1-cyan-soft/40 disabled:cursor-not-allowed text-black border border-ps1-led-green font-retro text-[9px] rounded"
          >
            HOST A GAME
          </button>
          {!canHost && (
            <div className="font-retro text-[7px] text-ps1-yellow -mt-2 text-center">
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
