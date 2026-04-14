import { useState, useEffect, useRef, useCallback } from 'react'
import PartySocket from 'partysocket'

export interface Player {
  id: string
  name: string
  playerId: number | null
  isConnected: boolean
}

export interface RoomState {
  gameCode: string
  host: string
  players: Player[]
  isPlaying: boolean
}

export interface MultiplayerState {
  isConnected: boolean
  isHost: boolean
  room: RoomState | null
  error: string | null
  chatMessages: ChatMessage[]
}

export interface ChatMessage {
  from: string
  message: string
  timestamp: number
}

export function useMultiplayer() {
  const [state, setState] = useState<MultiplayerState>({
    isConnected: false,
    isHost: false,
    room: null,
    error: null,
    chatMessages: [],
  })

  const socketRef = useRef<PartySocket | null>(null)
  const playerName = useRef<string>('')

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

  // Initialize connection
  const connect = useCallback(() => {
    if (socketRef.current) return

    const socket = new PartySocket({
      host: import.meta.env.VITE_PARTYKIT_HOST || 'localhost:1999',
      room: 'playhub-global',
      party: 'game',
    })

    socket.addEventListener('open', () => {
      console.log('[Multiplayer] Connected to server')
      setState(prev => ({ ...prev, isConnected: true, error: null }))
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
      console.log('[Multiplayer] Disconnected')
      setState(prev => ({
        ...prev,
        isConnected: false,
        error: 'Disconnected from server',
      }))
      socketRef.current = null
    })

    socket.addEventListener('error', (error) => {
      console.error('[Multiplayer] Connection error:', error)
      setState(prev => ({
        ...prev,
        error: 'Failed to connect to server',
      }))
    })

    socketRef.current = socket
  }, [])

  // Handle incoming messages
  const handleMessage = useCallback((data: any) => {
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

  // Create a new room
  const createRoom = useCallback((name?: string) => {
    if (!socketRef.current) {
      connect()
      setTimeout(() => {
        socketRef.current?.send(JSON.stringify({
          type: 'create_room',
          name: name || playerName.current,
        }))
      }, 500)
      return
    }

    socketRef.current.send(JSON.stringify({
      type: 'create_room',
      name: name || playerName.current,
    }))
  }, [connect])

  // Join existing room
  const joinRoom = useCallback((code: string, name?: string) => {
    if (!socketRef.current) {
      connect()
      setTimeout(() => {
        socketRef.current?.send(JSON.stringify({
          type: 'join_room',
          code: code.toUpperCase(),
          name: name || playerName.current,
        }))
      }, 500)
      return
    }

    socketRef.current.send(JSON.stringify({
      type: 'join_room',
      code: code.toUpperCase(),
      name: name || playerName.current,
    }))
  }, [connect])

  // Leave room
  const leaveRoom = useCallback(() => {
    if (socketRef.current && state.room) {
      socketRef.current.send(JSON.stringify({
        type: 'leave_room',
        code: state.room.gameCode,
      }))
      setState(prev => ({
        ...prev,
        isHost: false,
        room: null,
        chatMessages: [],
      }))
    }
  }, [state.room])

  // Assign player ID (host only)
  const assignPlayer = useCallback((targetId: string) => {
    if (socketRef.current && state.room && state.isHost) {
      socketRef.current.send(JSON.stringify({
        type: 'assign_player',
        code: state.room.gameCode,
        targetId,
      }))
    }
  }, [state.room, state.isHost])

  // Remove player (host only)
  const removePlayer = useCallback((targetId: string) => {
    if (socketRef.current && state.room && state.isHost) {
      socketRef.current.send(JSON.stringify({
        type: 'remove_player',
        code: state.room.gameCode,
        targetId,
      }))
    }
  }, [state.room, state.isHost])

  // Start game (host only)
  const startGame = useCallback(() => {
    if (socketRef.current && state.room && state.isHost) {
      socketRef.current.send(JSON.stringify({
        type: 'start_game',
        code: state.room.gameCode,
      }))
    }
  }, [state.room, state.isHost])

  // Stop game (host only)
  const stopGame = useCallback(() => {
    if (socketRef.current && state.room && state.isHost) {
      socketRef.current.send(JSON.stringify({
        type: 'stop_game',
        code: state.room.gameCode,
      }))
    }
  }, [state.room, state.isHost])

  // Send chat message
  const sendChat = useCallback((message: string) => {
    if (socketRef.current && state.room) {
      socketRef.current.send(JSON.stringify({
        type: 'chat',
        code: state.room.gameCode,
        message,
      }))
    }
  }, [state.room])

  // Send player input (for netplay)
  const sendInput = useCallback((playerId: number, input: any) => {
    if (socketRef.current && state.room) {
      socketRef.current.send(JSON.stringify({
        type: 'player_input',
        code: state.room.gameCode,
        playerId,
        input,
      }))
    }
  }, [state.room])

  // Update player name
  const updateName = useCallback((name: string) => {
    playerName.current = name
    localStorage.setItem('playhub_name', name)
    
    if (socketRef.current && state.room) {
      socketRef.current.send(JSON.stringify({
        type: 'update_name',
        code: state.room.gameCode,
        name,
      }))
    }
  }, [state.room])

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
