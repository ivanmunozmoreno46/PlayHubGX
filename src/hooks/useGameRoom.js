import { useState, useEffect, useRef, useCallback } from 'react'
import Peer from 'peerjs'

/**
 * Host-Client streaming Game Room using PeerJS (WebRTC).
 *
 * - The Host captures the EmulatorJS <canvas> (via captureStream) + mixed
 *   emulator audio (via Module.AL.currentCtx.audioCtx.createMediaStreamDestination)
 *   and broadcasts the MediaStream to every Guest through a PeerJS media call.
 * - Guests open a reliable DataChannel to the Host and forward keydown/keyup
 *   events. The Host maps the key codes to libretro button IDs and injects them
 *   into the emulator as Player 2 via gameManager.simulateInput.
 * - Latency is estimated with periodic ping/pong messages over the DataChannel.
 *
 * Peer IDs use the `playhubgx-room-<CODE>` prefix for the host and
 * `playhubgx-room-guest-<...>` for each guest.
 */

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const PEER_ID_PREFIX = 'playhubgx-room-'
const TARGET_FPS = 60
const PING_INTERVAL_MS = 2000
// The PSX canvas is small (~320x240 to 640x480) so bitrate needs to be high
// enough that the encoder doesn't blur fast-moving pixels after upscaling on
// the guest. 10 Mbps is a good trade-off: still well below a LAN's capacity
// but high enough that the encoder keeps the native pixels sharp.
const MAX_VIDEO_BITRATE = 10_000_000 // 10 Mbps
const PLAYER_SLOT = 1 // 0 = P1 (local), 1 = P2 (remote guest)

// Keyboard code -> libretro RetroPad button id.
// Matches the default EmulatorJS mapping (see defaultControllers in emulator.js).
const KEY_TO_BUTTON = {
  ArrowUp: 4,    KeyW: 4,
  ArrowDown: 5,  KeyS: 5,
  ArrowLeft: 6,  KeyA: 6,
  ArrowRight: 7, KeyD: 7,
  Enter: 3,      Space: 3,
  ShiftLeft: 2,  ShiftRight: 2,
  KeyZ: 0,       // Cross
  KeyX: 8,       // Circle
  KeyC: 1,       // Square
  KeyV: 9,       // Triangle
  KeyQ: 10,      // L1
  KeyE: 11,      // R1
  KeyR: 12,      // L2
  KeyT: 13,      // R2
}

// Standard Gamepad API button index -> libretro RetroPad button id.
// See https://w3c.github.io/gamepad/#remapping for the canonical layout.
const GAMEPAD_BUTTON_TO_LIBRETRO = {
  0: 0,   // A / South / Cross
  1: 8,   // B / East  / Circle
  2: 1,   // X / West  / Square
  3: 9,   // Y / North / Triangle
  4: 10,  // LB -> L1
  5: 11,  // RB -> R1
  6: 12,  // LT -> L2
  7: 13,  // RT -> R2
  8: 2,   // Select / Back
  9: 3,   // Start
  10: 14, // L-stick press -> L3
  11: 15, // R-stick press -> R3
  12: 4,  // D-Up
  13: 5,  // D-Down
  14: 6,  // D-Left
  15: 7,  // D-Right
}

// Libretro axis button ids use 0x7fff as the active value.
const SPECIAL_BUTTON_IDS = new Set([16, 17, 18, 19, 20, 21, 22, 23])

// Libretro axis-pair ids per analog stick axis. [negativeId, positiveId].
// Matches the default EmulatorJS mapping (see simulateInput calls in
// emulator.js around the gamepad axes handler).
const AXIS_PAIRS = {
  lx: [17, 16], // left stick X: negative = 17, positive = 16
  ly: [19, 18], // left stick Y: negative = 19, positive = 18
  rx: [21, 20], // right stick X
  ry: [23, 22], // right stick Y
}

function generateRoomCode() {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
  }
  return code
}

function toHostPeerId(code) {
  return `${PEER_ID_PREFIX}${code.toUpperCase()}`
}

function randomGuestPeerId() {
  return `${PEER_ID_PREFIX}guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Prefer low latency over bandwidth on the video sender when available.
 */
async function tuneVideoSenderForLatency(call) {
  try {
    const pc = call?.peerConnection
    if (!pc) return
    const senders = pc.getSenders ? pc.getSenders() : []
    const videoSender = senders.find((s) => s.track && s.track.kind === 'video')
    if (!videoSender || !videoSender.getParameters) return
    const params = videoSender.getParameters()
    params.degradationPreference = 'maintain-framerate'
    if (!params.encodings || params.encodings.length === 0) {
      params.encodings = [{}]
    }
    params.encodings = params.encodings.map((enc) => ({
      ...enc,
      maxBitrate: MAX_VIDEO_BITRATE,
      maxFramerate: TARGET_FPS,
      networkPriority: 'high',
      priority: 'high',
      // Do not downscale the (already small) PSX canvas on the encoder side.
      scaleResolutionDownBy: 1,
    }))
    await videoSender.setParameters(params)

    // Hint the encoder that we prioritise preserving pixel detail (crisp
    // pixels from the emulator canvas) rather than smooth motion blur.
    if (videoSender.track) {
      try { videoSender.track.contentHint = 'detail' } catch (_) { /* noop */ }
    }
  } catch (err) {
    // Non-fatal: some browsers don't support setParameters fully.
    console.warn('[GameRoom] Could not tune video sender:', err)
  }
}

/**
 * Minimise the receiver jitter buffer on the guest side so incoming frames
 * are rendered as soon as they arrive. Trade smoothness for real-time input
 * responsiveness — this is essentially what Stadia/GeForce Now do.
 */
function tuneReceiverForLatency(call) {
  try {
    const pc = call?.peerConnection
    if (!pc || !pc.getReceivers) return
    pc.getReceivers().forEach((receiver) => {
      if (!receiver || receiver.track?.kind !== 'video') return
      try { receiver.playoutDelayHint = 0 } catch (_) { /* noop */ }
      try { receiver.jitterBufferTarget = 0 } catch (_) { /* noop */ }
    })
  } catch (err) {
    console.warn('[GameRoom] Could not tune video receiver:', err)
  }
}

export function useGameRoom() {
  // 'idle' | 'hosting' | 'guest'
  const [role, setRole] = useState('idle')
  // 'disconnected' | 'connecting' | 'waiting' | 'connected' | 'error'
  const [status, setStatus] = useState('disconnected')
  const [roomCode, setRoomCode] = useState(null)
  const [error, setError] = useState(null)
  const [latency, setLatency] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [guestCount, setGuestCount] = useState(0)

  const peerRef = useRef(null)
  const roleRef = useRef('idle')

  // Host-side
  const localStreamRef = useRef(null)
  const guestsRef = useRef(new Map()) // peerId -> { call, dataConn, pressed: Set<buttonId> }
  const audioCleanupRef = useRef(null)

  // Guest-side
  const hostDataConnRef = useRef(null)
  const hostMediaConnRef = useRef(null)
  const pingIntervalRef = useRef(null)
  const pendingPingsRef = useRef(new Map()) // pingId -> sentAt

  useEffect(() => {
    roleRef.current = role
  }, [role])

  // Host: obtain (and cache) a MediaStream from the running emulator.
  const getOrCreateLocalStream = useCallback(() => {
    if (localStreamRef.current) return localStreamRef.current

    const ejs = typeof window !== 'undefined' ? window.EJS_emulator : null
    if (!ejs || !ejs.canvas) {
      throw new Error('Emulator is not running. Start a game before opening the Game Room.')
    }

    let stream = null
    if (typeof ejs.collectScreenRecordingMediaTracks === 'function') {
      try {
        stream = ejs.collectScreenRecordingMediaTracks(ejs.canvas, TARGET_FPS)
      } catch (err) {
        console.warn('[GameRoom] collectScreenRecordingMediaTracks failed, falling back:', err)
      }
    }
    if (!stream) {
      // Fallback: video-only capture.
      stream = ejs.canvas.captureStream(TARGET_FPS)
    }

    // Mark every video track as 'detail' content so every RTCPeerConnection we
    // attach this stream to biases towards preserving pixel detail.
    try {
      stream.getVideoTracks().forEach((t) => { t.contentHint = 'detail' })
    } catch (_) { /* noop */ }

    localStreamRef.current = stream
    return stream
  }, [])

  // Helper: write a single libretro button into the emulator as Player 2 and
  // remember it in the guest's pressed set so we can release it on disconnect.
  const writeButton = useCallback((guestEntry, buttonId, value) => {
    const ejs = typeof window !== 'undefined' ? window.EJS_emulator : null
    if (!ejs || !ejs.gameManager || typeof ejs.gameManager.simulateInput !== 'function') return
    if (typeof buttonId !== 'number' || Number.isNaN(buttonId)) return
    if (guestEntry) {
      if (value) guestEntry.pressed.add(buttonId)
      else guestEntry.pressed.delete(buttonId)
    }
    try {
      ejs.gameManager.simulateInput(PLAYER_SLOT, buttonId, value)
    } catch (err) {
      console.warn('[GameRoom] simulateInput failed:', err)
    }
  }, [])

  // Host: inject a remote input event into the emulator on Player 2.
  // Supports keyboard (keydown/keyup), gamepad buttons (pad_button) and
  // analog sticks (pad_axis).
  const injectRemoteInput = useCallback((guestEntry, evt) => {
    if (!evt || typeof evt !== 'object') return

    if (evt.type === 'keydown' || evt.type === 'keyup') {
      const buttonId = KEY_TO_BUTTON[evt.code]
      if (buttonId === undefined) return
      const isDown = evt.type === 'keydown'
      const value = isDown
        ? (SPECIAL_BUTTON_IDS.has(buttonId) ? 0x7fff : 1)
        : 0
      writeButton(guestEntry, buttonId, value)
      return
    }

    if (evt.type === 'pad_button') {
      const buttonId = Number(evt.id)
      if (Number.isNaN(buttonId)) return
      const isDown = Boolean(evt.value)
      const value = isDown
        ? (SPECIAL_BUTTON_IDS.has(buttonId) ? 0x7fff : 1)
        : 0
      writeButton(guestEntry, buttonId, value)
      return
    }

    if (evt.type === 'pad_axis') {
      const pair = AXIS_PAIRS[evt.axis]
      if (!pair) return
      const [negId, posId] = pair
      // Clamp to [-1, 1] just in case.
      const raw = Math.max(-1, Math.min(1, Number(evt.value) || 0))
      if (raw > 0) {
        writeButton(guestEntry, posId, Math.round(0x7fff * raw))
        writeButton(guestEntry, negId, 0)
      } else if (raw < 0) {
        writeButton(guestEntry, negId, Math.round(0x7fff * -raw))
        writeButton(guestEntry, posId, 0)
      } else {
        writeButton(guestEntry, posId, 0)
        writeButton(guestEntry, negId, 0)
      }
    }
  }, [writeButton])

  // Host: release every button currently held by a guest (on disconnect).
  const releaseGuestButtons = useCallback((guestEntry) => {
    const ejs = typeof window !== 'undefined' ? window.EJS_emulator : null
    if (!ejs || !ejs.gameManager || typeof ejs.gameManager.simulateInput !== 'function') return
    if (!guestEntry || !guestEntry.pressed) return
    guestEntry.pressed.forEach((buttonId) => {
      try { ejs.gameManager.simulateInput(PLAYER_SLOT, buttonId, 0) } catch (err) { /* noop */ }
    })
    guestEntry.pressed.clear()
  }, [])

  // Full cleanup of a guest entry on host.
  const dropGuest = useCallback((peerId) => {
    const entry = guestsRef.current.get(peerId)
    if (!entry) return
    releaseGuestButtons(entry)
    try { entry.dataConn && entry.dataConn.close() } catch (_) { /* noop */ }
    try { entry.call && entry.call.close() } catch (_) { /* noop */ }
    guestsRef.current.delete(peerId)
    setGuestCount(guestsRef.current.size)
  }, [releaseGuestButtons])

  // Host: handle a DataChannel message from a guest.
  const handleGuestMessage = useCallback((peerId, data) => {
    const entry = guestsRef.current.get(peerId)
    if (!entry) return
    let msg
    try {
      msg = typeof data === 'string' ? JSON.parse(data) : data
    } catch (err) {
      return
    }
    if (!msg || typeof msg !== 'object') return

    switch (msg.type) {
      case 'keydown':
      case 'keyup':
      case 'pad_button':
      case 'pad_axis':
        injectRemoteInput(entry, msg)
        break
      case 'ping':
        // Echo back with original timestamp so the guest can measure RTT.
        if (entry.dataConn && entry.dataConn.open) {
          try {
            entry.dataConn.send(JSON.stringify({ type: 'pong', t: msg.t, id: msg.id }))
          } catch (_) { /* noop */ }
        }
        break
      default:
        break
    }
  }, [injectRemoteInput])

  // -------------------------------------------------------------
  // Host flow
  // -------------------------------------------------------------
  const createRoom = useCallback(() => {
    if (peerRef.current) {
      try { peerRef.current.destroy() } catch (_) { /* noop */ }
      peerRef.current = null
    }

    setError(null)
    setRemoteStream(null)

    let stream
    try {
      stream = getOrCreateLocalStream()
    } catch (err) {
      setError(err.message || 'Failed to capture emulator stream.')
      setStatus('error')
      return
    }

    const code = generateRoomCode()
    const peerId = toHostPeerId(code)
    const peer = new Peer(peerId, { debug: 2 })

    setRole('hosting')
    setStatus('connecting')
    setRoomCode(code)
    setGuestCount(0)

    peer.on('open', () => {
      setStatus('waiting')
    })

    peer.on('connection', (conn) => {
      const peerId = conn.peer
      const entry = { call: null, dataConn: conn, pressed: new Set() }
      guestsRef.current.set(peerId, entry)
      setGuestCount(guestsRef.current.size)

      conn.on('open', () => {
        // As soon as the guest's DataChannel is open, call them with the stream.
        try {
          const call = peer.call(peerId, stream, {
            metadata: { role: 'host', code },
          })
          entry.call = call
          call.on('close', () => {
            // Guest ended the media call.
            // We keep the DataChannel alive until close fires there too.
          })
          call.on('error', (err) => {
            console.warn('[GameRoom] Host call error:', err)
          })
          // Try to prioritise latency on the outgoing video track.
          // Deferred slightly so the answer SDP has already been applied.
          setTimeout(() => tuneVideoSenderForLatency(call), 500)
        } catch (err) {
          console.warn('[GameRoom] Failed to call guest:', err)
        }
      })

      conn.on('data', (data) => handleGuestMessage(peerId, data))

      conn.on('close', () => dropGuest(peerId))
      conn.on('error', (err) => {
        console.warn('[GameRoom] Guest data connection error:', err)
      })
    })

    peer.on('error', (err) => {
      console.error('[GameRoom] Host peer error:', err)
      if (err && err.type === 'unavailable-id') {
        setError('Room code collision. Try creating the room again.')
      } else if (err && err.type !== 'destroyed') {
        setError('Failed to create room. Check your connection and try again.')
      }
      setStatus('error')
    })

    peerRef.current = peer
  }, [dropGuest, getOrCreateLocalStream, handleGuestMessage])

  // -------------------------------------------------------------
  // Guest flow
  // -------------------------------------------------------------
  const sendInput = useCallback((evt) => {
    const conn = hostDataConnRef.current
    if (!conn || !conn.open) return
    if (!evt || typeof evt !== 'object') return

    let payload = null
    if (evt.type === 'keydown' || evt.type === 'keyup') {
      // Only forward keys we actually map, to avoid spamming the channel.
      if (KEY_TO_BUTTON[evt.code] === undefined) return
      payload = { type: evt.type, code: evt.code, key: evt.key }
    } else if (evt.type === 'pad_button') {
      if (typeof evt.id !== 'number') return
      payload = { type: 'pad_button', id: evt.id, value: evt.value ? 1 : 0 }
    } else if (evt.type === 'pad_axis') {
      if (!AXIS_PAIRS[evt.axis]) return
      payload = { type: 'pad_axis', axis: evt.axis, value: Number(evt.value) || 0 }
    } else {
      return
    }

    try {
      conn.send(JSON.stringify(payload))
    } catch (err) {
      console.warn('[GameRoom] Failed to send input:', err)
    }
  }, [])

  const startPing = useCallback(() => {
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
    pendingPingsRef.current.clear()
    pingIntervalRef.current = setInterval(() => {
      const conn = hostDataConnRef.current
      if (!conn || !conn.open) return
      const id = Math.random().toString(36).slice(2, 10)
      const t = performance.now()
      pendingPingsRef.current.set(id, t)
      // Drop stale entries to avoid leaks.
      if (pendingPingsRef.current.size > 16) {
        const oldest = pendingPingsRef.current.keys().next().value
        if (oldest) pendingPingsRef.current.delete(oldest)
      }
      try {
        conn.send(JSON.stringify({ type: 'ping', id, t }))
      } catch (_) { /* noop */ }
    }, PING_INTERVAL_MS)
  }, [])

  const stopPing = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
    pendingPingsRef.current.clear()
  }, [])

  const joinRoom = useCallback((rawCode) => {
    const code = String(rawCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (code.length !== 6) {
      setError('Room codes must be 6 characters long.')
      setStatus('error')
      return
    }

    if (peerRef.current) {
      try { peerRef.current.destroy() } catch (_) { /* noop */ }
      peerRef.current = null
    }

    setError(null)
    setRemoteStream(null)

    const peerId = randomGuestPeerId()
    const hostPeerId = toHostPeerId(code)
    const peer = new Peer(peerId, { debug: 2 })

    setRole('guest')
    setStatus('connecting')
    setRoomCode(code)
    setLatency(null)

    peer.on('open', () => {
      const conn = peer.connect(hostPeerId, { reliable: true })
      hostDataConnRef.current = conn

      conn.on('open', () => {
        setStatus('connected')
        startPing()
      })

      conn.on('data', (data) => {
        let msg
        try { msg = typeof data === 'string' ? JSON.parse(data) : data } catch (_) { return }
        if (!msg || typeof msg !== 'object') return
        if (msg.type === 'pong') {
          const sentAt = pendingPingsRef.current.get(msg.id)
          if (sentAt !== undefined) {
            pendingPingsRef.current.delete(msg.id)
            const rtt = performance.now() - sentAt
            setLatency(Math.round(rtt))
          }
        }
      })

      conn.on('close', () => {
        hostDataConnRef.current = null
        stopPing()
        setStatus('disconnected')
        setError('The host closed the room.')
      })

      conn.on('error', (err) => {
        console.warn('[GameRoom] Guest data connection error:', err)
      })
    })

    peer.on('call', (call) => {
      hostMediaConnRef.current = call
      try { call.answer() } catch (err) { console.warn('[GameRoom] answer failed:', err) }
      call.on('stream', (stream) => {
        setRemoteStream(stream)
        // Apply after the PC is fully negotiated; some browsers only accept
        // these hints once receivers actually exist.
        setTimeout(() => tuneReceiverForLatency(call), 300)
        setTimeout(() => tuneReceiverForLatency(call), 1500)
      })
      call.on('close', () => {
        hostMediaConnRef.current = null
        setRemoteStream(null)
      })
      call.on('error', (err) => {
        console.warn('[GameRoom] Guest call error:', err)
      })
    })

    peer.on('error', (err) => {
      console.error('[GameRoom] Guest peer error:', err)
      if (err && err.type === 'peer-unavailable') {
        setError('Room not found. Check the code and try again.')
      } else if (err && err.type !== 'destroyed') {
        setError('Connection error. Check your network and try again.')
      }
      setStatus('error')
    })

    peerRef.current = peer
  }, [startPing, stopPing])

  const leaveRoom = useCallback(() => {
    stopPing()

    // Host: drop every guest cleanly.
    if (roleRef.current === 'hosting') {
      Array.from(guestsRef.current.keys()).forEach((peerId) => dropGuest(peerId))
      guestsRef.current.clear()
      if (localStreamRef.current) {
        try {
          localStreamRef.current.getTracks().forEach((t) => t.stop())
        } catch (_) { /* noop */ }
        localStreamRef.current = null
      }
      if (audioCleanupRef.current) {
        try { audioCleanupRef.current() } catch (_) { /* noop */ }
        audioCleanupRef.current = null
      }
    }

    // Guest: close our connections to the host.
    if (hostDataConnRef.current) {
      try { hostDataConnRef.current.close() } catch (_) { /* noop */ }
      hostDataConnRef.current = null
    }
    if (hostMediaConnRef.current) {
      try { hostMediaConnRef.current.close() } catch (_) { /* noop */ }
      hostMediaConnRef.current = null
    }

    if (peerRef.current) {
      try { peerRef.current.destroy() } catch (_) { /* noop */ }
      peerRef.current = null
    }

    setRole('idle')
    setStatus('disconnected')
    setRoomCode(null)
    setRemoteStream(null)
    setLatency(null)
    setGuestCount(0)
    setError(null)
  }, [dropGuest, stopPing])

  // Clean up everything on unmount.
  useEffect(() => () => { leaveRoom() }, [leaveRoom])

  return {
    // state
    role,
    status,
    roomCode,
    error,
    latency,
    remoteStream,
    guestCount,
    // actions
    createRoom,
    joinRoom,
    leaveRoom,
    sendInput,
    // helpers
    isHost: role === 'hosting',
    isGuest: role === 'guest',
  }
}

export const GAME_ROOM_KEY_MAP = KEY_TO_BUTTON
export const GAME_ROOM_GAMEPAD_MAP = GAMEPAD_BUTTON_TO_LIBRETRO
