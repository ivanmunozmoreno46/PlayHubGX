import { useCallback, useEffect, useRef, useState } from 'react'
import GuestControlsPanel from './GuestControlsPanel'
import { loadBindings, saveBindings } from '../lib/guestControls'
import { GAME_ROOM_GAMEPAD_MAP } from '../hooks/useGameRoom'

/**
 * UI panel for the Host-Client streaming Game Room (see useGameRoom).
 *
 * Visual language matches the PS1 BIOS Memory Card Manager desktop used in
 * the rest of the app: flat light-beige container, tan/burgundy action
 * buttons, red/green/blue confirm pills with hard 2px bevels, and LCD-green
 * digits for the room code.
 */

// Deadzone applied to analog stick inputs on the guest side.
const GAMEPAD_AXIS_DEADZONE = 0.15
const GAMEPAD_AXIS_EPSILON = 0.03

function applyDeadzone(value) {
  if (Math.abs(value) < GAMEPAD_AXIS_DEADZONE) return 0
  const sign = value < 0 ? -1 : 1
  const scaled = (Math.abs(value) - GAMEPAD_AXIS_DEADZONE) / (1 - GAMEPAD_AXIS_DEADZONE)
  return sign * Math.max(0, Math.min(1, scaled))
}

/* -------------------- Shared flat BIOS-style helpers -------------------- */

const HEADER_TEXT = '#2a0a0a'
const BODY_TEXT = '#3a3c42'
const MUTED_TEXT = '#5a5c62'

function PanelShell({ children }) {
  return (
    <div
      className="w-full"
      style={{
        padding: 'clamp(12px, 2vw, 20px)',
        background: '#c4c6cc',
        color: BODY_TEXT,
        imageRendering: 'pixelated',
      }}
    >
      {children}
    </div>
  )
}

function InsetBlock({ children, className = '' }) {
  return (
    <div
      className={className}
      style={{
        background: '#b0b2b8',
        borderTop: '2px solid #5a5c62',
        borderLeft: '2px solid #5a5c62',
        borderRight: '2px solid #e4e6ea',
        borderBottom: '2px solid #e4e6ea',
        padding: 'clamp(8px, 1.2vw, 12px)',
      }}
    >
      {children}
    </div>
  )
}

function TanButton({ children, onClick, disabled = false, strong = false, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`font-ps font-black tracking-[0.28em] uppercase text-center ${disabled ? 'opacity-40 pointer-events-none' : ''} ${className}`}
      style={{
        background: strong ? '#d8a833' : '#b48a2a',
        borderTop: '2px solid #f2dc92',
        borderLeft: '2px solid #f2dc92',
        borderRight: '2px solid #5a3f08',
        borderBottom: '2px solid #5a3f08',
        padding: 'clamp(8px,1.4vh,12px) clamp(14px,2vw,22px)',
        color: HEADER_TEXT,
        fontSize: 'clamp(11px, 1.3vw, 14px)',
        textShadow: '1px 1px 0 rgba(255,240,190,0.35)',
        imageRendering: 'pixelated',
      }}
    >
      {children}
    </button>
  )
}

function Pill({ children, onClick, color = 'red', disabled = false, className = '', title }) {
  const bg = { red: '#d71a1a', blue: '#1a4ed7', green: '#1ba23e', gray: '#55575d' }[color] || '#55575d'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`font-ps font-black tracking-[0.22em] uppercase ${disabled ? 'opacity-40 pointer-events-none' : ''} ${className}`}
      style={{
        background: bg,
        color: '#ffffff',
        borderTop: '2px solid rgba(255,255,255,0.55)',
        borderLeft: '2px solid rgba(255,255,255,0.55)',
        borderRight: '2px solid rgba(0,0,0,0.55)',
        borderBottom: '2px solid rgba(0,0,0,0.55)',
        padding: 'clamp(6px,1vh,9px) clamp(12px,1.8vw,18px)',
        fontSize: 'clamp(10px,1.1vw,13px)',
        imageRendering: 'pixelated',
      }}
    >
      {children}
    </button>
  )
}

function SectionTitle({ children }) {
  return (
    <div
      className="font-ps font-black tracking-[0.28em] uppercase"
      style={{
        color: HEADER_TEXT,
        fontSize: 'clamp(12px, 1.4vw, 15px)',
      }}
    >
      {children}
    </div>
  )
}

function Caption({ children, color }) {
  return (
    <div
      className="font-ps tracking-[0.18em] uppercase"
      style={{
        color: color || MUTED_TEXT,
        fontSize: 'clamp(9px, 0.9vw, 11px)',
      }}
    >
      {children}
    </div>
  )
}

function StatusBadge({ status, isHost, guestCount }) {
  const label = (() => {
    switch (status) {
      case 'connecting': return 'CONNECTING'
      case 'waiting': return isHost ? 'WAITING' : 'WAITING'
      case 'connected': return 'CONNECTED'
      case 'error': return 'ERROR'
      default: return 'OFFLINE'
    }
  })()
  const dot = (() => {
    if (status === 'connected' || (isHost && guestCount > 0)) return '#1ba23e'
    if (status === 'waiting' || status === 'connecting') return '#d8a833'
    if (status === 'error') return '#d71a1a'
    return '#5a5c62'
  })()
  return (
    <div
      className="inline-flex items-center gap-1.5"
      style={{
        background: '#b0b2b8',
        borderTop: '2px solid #5a5c62',
        borderLeft: '2px solid #5a5c62',
        borderRight: '2px solid #e4e6ea',
        borderBottom: '2px solid #e4e6ea',
        padding: '4px 8px',
      }}
    >
      <span className="w-2 h-2" style={{ background: dot }} />
      <span className="font-ps font-black uppercase tracking-[0.18em]" style={{ color: HEADER_TEXT, fontSize: '9px' }}>{label}</span>
    </div>
  )
}

function LatencyBadge({ latency }) {
  if (latency == null) return null
  const color = latency < 80 ? '#1ba23e' : latency < 180 ? '#a7841d' : '#d71a1a'
  return (
    <div
      className="inline-flex items-center gap-1.5"
      style={{
        background: '#b0b2b8',
        borderTop: '2px solid #5a5c62',
        borderLeft: '2px solid #5a5c62',
        borderRight: '2px solid #e4e6ea',
        borderBottom: '2px solid #e4e6ea',
        padding: '4px 8px',
      }}
    >
      <span className="font-ps tracking-[0.18em]" style={{ color: MUTED_TEXT, fontSize: '9px' }}>PING</span>
      <span className="font-ps font-black" style={{ color, fontSize: '10px' }}>{latency}ms</span>
    </div>
  )
}

function ErrorBar({ message }) {
  if (!message) return null
  return (
    <div
      className="mb-3"
      style={{
        background: '#d71a1a',
        color: '#ffffff',
        padding: '6px 10px',
        borderTop: '2px solid rgba(255,255,255,0.55)',
        borderLeft: '2px solid rgba(255,255,255,0.55)',
        borderRight: '2px solid rgba(0,0,0,0.55)',
        borderBottom: '2px solid rgba(0,0,0,0.55)',
      }}
    >
      <span className="font-ps font-black tracking-[0.18em] uppercase" style={{ fontSize: '10px' }}>
        {message}
      </span>
    </div>
  )
}

/* ---------------------------- Host view ---------------------------- */

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
    } catch (_) { /* ignore */ }
  }, [roomCode])

  useEffect(() => () => {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
  }, [])

  return (
    <PanelShell>
      <ErrorBar message={error} />

      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <SectionTitle>GAME ROOM · HOST</SectionTitle>
          <Caption>You are streaming to guests</Caption>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} isHost guestCount={guestCount} />
          {onHidePanel && (
            <Pill color="gray" onClick={onHidePanel} title="Hide this panel without closing the room">
              HIDE
            </Pill>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-col items-center gap-2">
        <Caption>ROOM CODE</Caption>
        <div className="flex items-center gap-2">
          <div
            className="px-5 py-2"
            style={{
              background: '#0b0d12',
              borderTop: '2px solid #000',
              borderLeft: '2px solid #000',
              borderRight: '2px solid #3a3c42',
              borderBottom: '2px solid #3a3c42',
            }}
          >
            <span className="font-lcd select-all" style={{ color: '#34d15c', fontSize: 'clamp(28px, 3.4vw, 36px)', letterSpacing: '0.22em', lineHeight: 1 }}>
              {roomCode}
            </span>
          </div>
          <TanButton onClick={handleCopy}>{copied ? 'COPIED' : 'COPY'}</TanButton>
        </div>
      </div>

      <InsetBlock className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="font-ps font-black tracking-[0.22em] uppercase" style={{ color: HEADER_TEXT, fontSize: '11px' }}>GUESTS</span>
          <span className="font-ps font-black" style={{ color: guestCount > 0 ? '#1ba23e' : MUTED_TEXT, fontSize: '14px' }}>{guestCount}</span>
        </div>
        <Caption>Share the code above. Your game keeps running even with no one connected.</Caption>
      </InsetBlock>

      <div className="flex gap-2 justify-end">
        {onHidePanel && (
          <Pill color="blue" onClick={onHidePanel}>HIDE PANEL</Pill>
        )}
        <Pill color="red" onClick={leaveRoom}>CLOSE ROOM</Pill>
      </div>
    </PanelShell>
  )
}

/* ---------------------------- Guest view --------------------------- */

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
  const bindingsRef = useRef(bindings)
  useEffect(() => {
    bindingsRef.current = bindings
    saveBindings(bindings)
  }, [bindings])
  const showControlsRef = useRef(showControls)
  useEffect(() => { showControlsRef.current = showControls }, [showControls])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (remoteStream && video.srcObject !== remoteStream) {
      video.srcObject = remoteStream
      const p = video.play()
      if (p && typeof p.catch === 'function') p.catch(() => { /* ignore */ })
    }
    if (!remoteStream && video.srcObject) {
      video.srcObject = null
    }
  }, [remoteStream])

  useEffect(() => {
    if (!remoteStream) return
    const el = inputFocusRef.current
    if (!el) return

    const onKey = (e) => {
      if (e.code && e.code.startsWith('Arrow')) e.preventDefault()
      if (e.code === 'Space') e.preventDefault()
      if (e.repeat) return
      if (showControlsRef.current) return
      const libretroId = bindingsRef.current.keys[e.code]
      if (libretroId === undefined) return
      sendInput({ type: 'pad_button', id: libretroId, value: e.type === 'keydown' ? 1 : 0 })
    }

    el.addEventListener('keydown', onKey)
    el.addEventListener('keyup', onKey)
    el.focus()
    return () => {
      el.removeEventListener('keydown', onKey)
      el.removeEventListener('keyup', onKey)
    }
  }, [remoteStream, sendInput])

  useEffect(() => {
    if (!remoteStream) {
      setGamepadName(null)
      return
    }
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
      return
    }

    let rafId = null
    const prevButtons = new Map()
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
        const padActive = !showControlsRef.current
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteStream, sendInput])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev
      if (videoRef.current) videoRef.current.muted = next
      return next
    })
  }, [])

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
        setTimeout(() => inputFocusRef.current?.focus(), 50)
      }
    } catch (_) { /* ignore */ }
  }, [])

  // Not connected yet: show the join form.
  if (!roomCode) {
    return (
      <PanelShell>
        <ErrorBar message={error} />

        <div className="mb-4 text-center">
          <SectionTitle>JOIN GAME ROOM</SectionTitle>
          <Caption>Enter the 6-character code shared by the host</Caption>
        </div>

        <div className="flex flex-col items-center gap-3 mb-4">
          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder="CODE"
            maxLength={6}
            className="w-full max-w-xs text-center font-lcd focus:outline-none"
            style={{
              background: '#0b0d12',
              color: '#34d15c',
              letterSpacing: '0.25em',
              fontSize: 'clamp(22px, 2.6vw, 30px)',
              padding: '10px 12px',
              borderTop: '2px solid #000',
              borderLeft: '2px solid #000',
              borderRight: '2px solid #3a3c42',
              borderBottom: '2px solid #3a3c42',
            }}
          />
          <TanButton
            strong
            onClick={() => { if (inputCode.length === 6) joinRoom(inputCode) }}
            disabled={inputCode.length !== 6}
          >
            JOIN ROOM
          </TanButton>
        </div>

        <InsetBlock>
          <Caption>
            You will see the host's game streamed to your browser. Your keyboard
            and gamepad inputs will control Player 2.
          </Caption>
        </InsetBlock>
      </PanelShell>
    )
  }

  return (
    <PanelShell>
      <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <SectionTitle>ROOM</SectionTitle>
          <span className="font-lcd" style={{ color: '#1ba23e', letterSpacing: '0.25em', fontSize: 'clamp(14px, 1.4vw, 18px)' }}>
            {roomCode}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {gamepadName && (
            <div
              className="inline-flex items-center gap-1.5"
              title={gamepadName}
              style={{
                background: '#b0b2b8',
                borderTop: '2px solid #5a5c62',
                borderLeft: '2px solid #5a5c62',
                borderRight: '2px solid #e4e6ea',
                borderBottom: '2px solid #e4e6ea',
                padding: '4px 8px',
              }}
            >
              <span className="w-2 h-2" style={{ background: '#1ba23e' }} />
              <span className="font-ps font-black uppercase tracking-[0.18em]" style={{ color: HEADER_TEXT, fontSize: '9px' }}>
                GAMEPAD
              </span>
            </div>
          )}
          <LatencyBadge latency={latency} />
          <StatusBadge status={status} isHost={false} guestCount={0} />
        </div>
      </div>

      <ErrorBar message={error} />

      <div
        ref={stageRef}
        className={`relative mx-auto ${isFullscreen ? 'w-screen h-screen' : 'w-full'}`}
        style={
          isFullscreen
            ? { background: '#000' }
            : {
                aspectRatio: '4/3',
                maxWidth: 'min(100%, calc((100vh - 160px) * 4 / 3))',
                background: '#000',
                borderTop: '2px solid #000',
                borderLeft: '2px solid #000',
                borderRight: '2px solid #3a3c42',
                borderBottom: '2px solid #3a3c42',
              }
        }
      >
        <div
          ref={inputFocusRef}
          tabIndex={0}
          className="absolute inset-0 outline-none focus:ring-2 focus:ring-[#1ba23e] focus:ring-inset"
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isMuted}
            className="w-full h-full object-contain bg-black"
            style={{
              imageRendering: 'pixelated',
              filter: 'contrast(1.08) saturate(1.18)',
            }}
          />
        </div>

        {!remoteStream && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 pointer-events-none">
            <div className="text-center">
              <div className="font-ps font-black tracking-[0.28em] uppercase mb-2" style={{ color: '#d8a833', fontSize: '12px' }}>
                {status === 'connected' ? 'WAITING FOR HOST STREAM' : 'CONNECTING TO HOST'}
              </div>
              <div className="font-ps tracking-[0.18em] uppercase" style={{ color: '#b0b2b8', fontSize: '9px' }}>
                The host must have a game running.
              </div>
            </div>
          </div>
        )}

        {remoteStream && (
          <div className="absolute bottom-2 right-2 flex items-center gap-2 z-10">
            <Pill color="gray" onClick={() => setShowControls(true)} title="Configure controls">CONTROLS</Pill>
            <Pill color="gray" onClick={toggleMute}>{isMuted ? 'UNMUTE' : 'MUTE'}</Pill>
            <Pill color="blue" onClick={toggleFullscreen} title="Toggle fullscreen">
              {isFullscreen ? 'EXIT FULL' : 'FULLSCREEN'}
            </Pill>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
        <Caption>
          Plug in a gamepad or click the video area to capture the keyboard.
          Press CONTROLS to remap any button.
        </Caption>
        <div className="flex items-center gap-2">
          <Pill color="blue" onClick={() => setShowControls(true)}>CONTROLS</Pill>
          <Pill color="red" onClick={leaveRoom}>LEAVE</Pill>
        </div>
      </div>

      {showControls && (
        <GuestControlsPanel
          bindings={bindings}
          onChange={setBindings}
          onClose={() => setShowControls(false)}
        />
      )}
    </PanelShell>
  )
}

/* ---------------------------- Entry view --------------------------- */

export default function GameRoomPanel({ room, canHost, onHidePanel }) {
  const { role, createRoom, status, error } = room

  if (role === 'idle') {
    return (
      <PanelShell>
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <SectionTitle>GAME ROOM</SectionTitle>
            <Caption>Stream your game or join a friend's</Caption>
          </div>
          {onHidePanel && (
            <Pill color="gray" onClick={onHidePanel}>CLOSE</Pill>
          )}
        </div>

        <ErrorBar message={error} />

        <div className="flex flex-col items-center gap-3 mb-4">
          <TanButton
            strong
            onClick={createRoom}
            disabled={!canHost || status === 'connecting'}
          >
            HOST A GAME
          </TanButton>
          {!canHost && (
            <Caption color="#8b5a14">Start a game first to host a room.</Caption>
          )}
        </div>

        <div
          className="my-4"
          style={{
            height: 2,
            background: '#8b8d94',
          }}
        />

        <GuestView room={room} />
      </PanelShell>
    )
  }

  if (role === 'hosting') {
    return <HostView room={room} onHidePanel={onHidePanel} />
  }

  return <GuestView room={room} />
}
