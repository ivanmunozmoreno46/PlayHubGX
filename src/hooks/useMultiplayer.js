import { useState, useEffect, useRef, useCallback } from 'react'
import PartySocket from 'partysocket'

export function useMultiplayer() {
  const [state, setState] = useState({
    isConnected: false,
    isHost: false,
    room: null,
    error: null,
    chatMessages: [],
  })

  const socketRef = useRef(null)
  const playerName = useRef('')
  const messageQueueRef = useRef([])
  const connectionPromiseRef = useRef(null)

  // Generate random player name if not set
  useEffect(() => {
    const stored = localStorage.getItem('playhub_name')
    if (stored) {
      playerName.current = stored
    } else {
      playerName.current = `Player${Math.floor(Math.random() * 9999)}`
      localStorage.setItem('playhub_name', playerName.current)
    }
  }, [])

  // Handle incoming messages (MUST be before connect)
  const handleMessage = useCallback((data) => {
    switch (data.type) {
      case 'welcome':
        console.log('[Multiplayer] Welcome, connection ID:', data.connectionId)
        break

      case 'room_created':
        setState(prev => ({
          ...prev,
          isHost: true,
          room: data.room,
          error: null,
        }))
        break

      case 'room_joined':
        setState(prev => ({
          ...prev,
          isHost: data.isHost,
          room: data.room,
          error: null,
        }))
        break

      case 'player_joined':
      case 'player_assigned':
      case 'player_removed':
      case 'player_left':
      case 'name_updated':
        if (data.players) {
          setState(prev => ({
            ...prev,
            room: prev.room ? { ...prev.room, players: data.players } : null,
          }))
        }
        break

      case 'game_started':
        setState(prev => ({
          ...prev,
          room: prev.room ? { ...prev.room, isPlaying: true } : null,
        }))
        break

      case 'game_stopped':
        setState(prev => ({
          ...prev,
          room: prev.room ? { ...prev.room, isPlaying: false } : null,
        }))
        break

      case 'room_dissolved':
        setState({
          isConnected: true,
          isHost: false,
          room: null,
          error: 'Room has been dissolved by the host',
          chatMessages: [],
        })
        break

      case 'chat_message':
        setState(prev => ({
          ...prev,
          chatMessages: [...prev.chatMessages, data],
        }))
        break

      case 'error':
        setState(prev => ({
          ...prev,
          error: data.message,
        }))
        break

      case 'remote_input':
      case 'sync_state':
        // These are handled by the game emulator
        window.dispatchEvent(new CustomEvent('netplay-message', { detail: data }))
        break
    }
  }, [])

  // Initialize connection
  const connect = useCallback(() => {
    if (socketRef.current) {
      console.log('[Multiplayer] Already connected')
      return Promise.resolve()
    }

    // Return existing promise if connection in progress
    if (connectionPromiseRef.current) {
      return connectionPromiseRef.current
    }

    const host = import.meta.env.VITE_PARTYKIT_HOST || 'localhost:1999'
    console.log('[Multiplayer] Connecting to:', host)

    connectionPromiseRef.current = new Promise((resolve, reject) => {
      const socket = new PartySocket({
        host: host,
        room: 'playhub-global',
        party: 'game',
      })

      socket.addEventListener('open', () => {
        console.log('[Multiplayer] ✓ Connected to server')
        setState(prev => ({ ...prev, isConnected: true, error: null }))
        
        // Flush queued messages
        while (messageQueueRef.current.length > 0) {
          const msg = messageQueueRef.current.shift()
          socket.send(JSON.stringify(msg))
        }
        
        resolve()
      })

      socket.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data)
          handleMessage(data)
        } catch (error) {
          console.error('[Multiplayer] Error parsing message:', error)
        }
      })

      socket.addEventListener('close', () => {
        console.log('[Multiplayer] ✗ Disconnected')
        setState(prev => ({
          ...prev,
          isConnected: false,
          error: 'Disconnected from server',
        }))
        socketRef.current = null
        connectionPromiseRef.current = null
      })

      socket.addEventListener('error', (error) => {
        console.error('[Multiplayer] ✗ Connection error:', error)
        setState(prev => ({
          ...prev,
          error: 'Failed to connect to server. Check console for details.',
        }))
        connectionPromiseRef.current = null
        reject(error)
      })

      socketRef.current = socket
    })

    return connectionPromiseRef.current
  }, [handleMessage])

  // Send message helper - queues if not connected
  const sendMessage = useCallback((data) => {
    if (socketRef.current && state.isConnected) {
      socketRef.current.send(JSON.stringify(data))
    } else {
      messageQueueRef.current.push(data)
      // Try to connect if not already
      connect().catch(() => {
        // Remove from queue if connection fails
        const idx = messageQueueRef.current.indexOf(data)
        if (idx > -1) messageQueueRef.current.splice(idx, 1)
      })
    }
  }, [state.isConnected, connect])

  // Create a new room
  const createRoom = useCallback((name) => {
    sendMessage({
      type: 'create_room',
      name: name || playerName.current,
    })
  }, [sendMessage])

  // Join existing room
  const joinRoom = useCallback((code, name) => {
    sendMessage({
      type: 'join_room',
      code: code.toUpperCase(),
      name: name || playerName.current,
    })
  }, [sendMessage])

  // Leave room
  const leaveRoom = useCallback(() => {
    if (state.room) {
      sendMessage({
        type: 'leave_room',
        code: state.room.gameCode,
      })
      setState(prev => ({
        ...prev,
        isHost: false,
        room: null,
        chatMessages: [],
      }))
    }
  }, [state.room, sendMessage])

  // Assign player ID (host only)
  const assignPlayer = useCallback((targetId) => {
    if (state.room && state.isHost) {
      sendMessage({
        type: 'assign_player',
        code: state.room.gameCode,
        targetId,
      })
    }
  }, [state.room, state.isHost, sendMessage])

  // Remove player (host only)
  const removePlayer = useCallback((targetId) => {
    if (state.room && state.isHost) {
      sendMessage({
        type: 'remove_player',
        code: state.room.gameCode,
        targetId,
      })
    }
  }, [state.room, state.isHost, sendMessage])

  // Start game (host only)
  const startGame = useCallback(() => {
    if (state.room && state.isHost) {
      sendMessage({
        type: 'start_game',
        code: state.room.gameCode,
      })
    }
  }, [state.room, state.isHost, sendMessage])

  // Stop game (host only)
  const stopGame = useCallback(() => {
    if (state.room && state.isHost) {
      sendMessage({
        type: 'stop_game',
        code: state.room.gameCode,
      })
    }
  }, [state.room, state.isHost, sendMessage])

  // Send chat message
  const sendChat = useCallback((message) => {
    if (state.room) {
      sendMessage({
        type: 'chat',
        code: state.room.gameCode,
        message,
      })
    }
  }, [state.room, sendMessage])

  // Send player input (for netplay)
  const sendInput = useCallback((playerId, input) => {
    if (state.room) {
      sendMessage({
        type: 'player_input',
        code: state.room.gameCode,
        playerId,
        input,
      })
    }
  }, [state.room, sendMessage])

  // Update player name
  const updateName = useCallback((name) => {
    playerName.current = name
    localStorage.setItem('playhub_name', name)
    
    if (state.room) {
      sendMessage({
        type: 'update_name',
        code: state.room.gameCode,
        name,
      })
    }
  }, [state.room, sendMessage])

  // Disconnect on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
    }
  }, [])

  return {
    ...state,
    playerName: playerName.current,
    connect,
    createRoom,
    joinRoom,
    leaveRoom,
    assignPlayer,
    removePlayer,
    startGame,
    stopGame,
    sendChat,
    sendInput,
    updateName,
  }
}
