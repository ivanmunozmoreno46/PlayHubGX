import { useState, useEffect, useRef, useCallback } from 'react'
import Peer from 'peerjs'

export function useMultiplayer() {
  const [state, setState] = useState({
    isConnected: false,
    isHost: false,
    roomCode: null,
    players: [],
    error: null,
    chatMessages: [],
    isPlaying: false,
  })

  const peerRef = useRef(null)
  const connectionsRef = useRef([])
  const hostConnectionRef = useRef(null)
  const playerName = useRef('')
  const playerIdRef = useRef('')
  const stateRef = useRef(state)
  
  // Keep ref in sync with state
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Generate random player name
  useEffect(() => {
    const stored = localStorage.getItem('playhub_name')
    if (stored) {
      playerName.current = stored
    } else {
      playerName.current = `Player${Math.floor(Math.random() * 9999)}`
      localStorage.setItem('playhub_name', playerName.current)
    }
  }, [])

  // Generate room code
  const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
    return code
  }

  // Send message to all connected peers
  const broadcastToAll = useCallback((data, excludePeerId) => {
    const msgStr = JSON.stringify(data)
    connectionsRef.current.forEach((conn) => {
      if (conn.open && conn.peer !== excludePeerId) {
        conn.send(msgStr)
      }
    })
  }, [])

  // Handle data from a connection
  const handleConnectionData = useCallback((conn, data) => {
    switch (data.type) {
      case 'join_request': {
        console.log('[Multiplayer] Client wants to join:', conn.peer, data.name)
        const newPlayer = {
          id: conn.peer,
          name: data.name || 'Player',
          playerId: null,
          isConnected: true,
        }
        
        // Add player to state
        setState(prev => {
          const newPlayers = [...prev.players, newPlayer]
          return { ...prev, players: newPlayers }
        })

        // Send join_accepted back to client
        conn.send(JSON.stringify({
          type: 'join_accepted',
          roomCode: stateRef.current.roomCode,
          players: [...stateRef.current.players, newPlayer],
          isHost: false,
        }))

        // Broadcast players update to all
        broadcastToAll({
          type: 'players_update',
          players: [...stateRef.current.players, newPlayer],
        })
        break
      }

      case 'join_accepted': {
        console.log('[Multiplayer] Join accepted!')
        setState(prev => ({
          ...prev,
          roomCode: data.roomCode,
          players: data.players || [],
          isHost: false,
          error: null,
        }))
        break
      }

      case 'players_update': {
        setState(prev => ({
          ...prev,
          players: data.players || [],
        }))
        break
      }

      case 'chat_message': {
        setState(prev => ({
          ...prev,
          chatMessages: [...prev.chatMessages, data],
        }))
        if (stateRef.current.isHost) {
          broadcastToAll(data, conn.peer)
        }
        break
      }

      case 'game_started': {
        setState(prev => ({ ...prev, isPlaying: true }))
        break
      }

      case 'game_stopped': {
        setState(prev => ({ ...prev, isPlaying: false }))
        break
      }

      case 'leave_room': {
        setState(prev => {
          const newPlayers = prev.players.filter(p => p.id !== conn.peer)
          return { ...prev, players: newPlayers }
        })
        break
      }

      default:
        break
    }
  }, [broadcastToAll])

  // Create room (host)
  const createRoom = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.destroy()
    }

    const code = generateRoomCode()
    const peerId = `playhub-${code}`
    
    console.log('[Multiplayer] Creating room:', code)

    const peer = new Peer(peerId, {
      debug: 2,
    })

    peer.on('open', (id) => {
      console.log('[Multiplayer] Room created:', id)
      playerIdRef.current = id
      setState(prev => ({
        ...prev,
        isConnected: true,
        isHost: true,
        roomCode: code,
        players: [{
          id: id,
          name: playerName.current,
          playerId: 1,
          isConnected: true,
        }],
        error: null,
        chatMessages: [],
        isPlaying: false,
      }))
    })

    peer.on('connection', (conn) => {
      console.log('[Multiplayer] Client connected:', conn.peer)
      connectionsRef.current.push(conn)

      conn.on('open', () => {
        console.log('[Multiplayer] Connection open:', conn.peer)
      })

      conn.on('data', (data) => {
        try {
          handleConnectionData(conn, typeof data === 'string' ? JSON.parse(data) : data)
        } catch (error) {
          console.error('[Multiplayer] Error parsing message:', error, data)
        }
      })

      conn.on('close', () => {
        console.log('[Multiplayer] Client disconnected:', conn.peer)
        connectionsRef.current = connectionsRef.current.filter(c => c.peer !== conn.peer)
        setState(prev => ({
          ...prev,
          players: prev.players.filter(p => p.id !== conn.peer),
        }))
      })

      conn.on('error', (err) => {
        console.error('[Multiplayer] Connection error:', err)
      })
    })

    peer.on('error', (error) => {
      console.error('[Multiplayer] Peer error:', error)
      setState(prev => ({
        ...prev,
        error: 'Failed to create room. Please try again.',
      }))
    })

    peerRef.current = peer
  }, [handleConnectionData])

  // Join room (client)
  const joinRoom = useCallback((code) => {
    if (peerRef.current) {
      peerRef.current.destroy()
    }

    const peerId = `playhub-client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const hostPeerId = `playhub-${code}`
    
    console.log('[Multiplayer] Joining room:', code, 'as', peerId)

    setState(prev => ({ ...prev, error: null }))

    const peer = new Peer(peerId, {
      debug: 2,
    })

    peer.on('open', () => {
      console.log('[Multiplayer] Connected to signaling server')
      playerIdRef.current = peerId

      // Connect to host
      const conn = peer.connect(hostPeerId, {
        reliable: true,
      })

      conn.on('open', () => {
        console.log('[Multiplayer] Connected to host!')
        hostConnectionRef.current = conn

        // Send join request
        conn.send(JSON.stringify({
          type: 'join_request',
          name: playerName.current,
        }))
      })

      conn.on('data', (data) => {
        try {
          handleConnectionData(conn, typeof data === 'string' ? JSON.parse(data) : data)
        } catch (error) {
          console.error('[Multiplayer] Error parsing message:', error, data)
        }
      })

      conn.on('close', () => {
        console.log('[Multiplayer] Disconnected from host')
        hostConnectionRef.current = null
        setState(prev => ({
          ...prev,
          isConnected: false,
          roomCode: null,
          error: 'Disconnected from room',
        }))
      })

      conn.on('error', (err) => {
        console.error('[Multiplayer] Connection error:', err)
      })
    })

    peer.on('error', (error) => {
      console.error('[Multiplayer] Peer error:', error)
      if (error.type === 'peer-unavailable') {
        setState(prev => ({
          ...prev,
          error: 'Room not found. Check the code and try again.',
        }))
      } else if (error.type !== 'destroyed') {
        setState(prev => ({
          ...prev,
          error: 'Failed to join room. Please try again.',
        }))
      }
    })

    peerRef.current = peer
  }, [handleConnectionData])

  // Leave room
  const leaveRoom = useCallback(() => {
    // Notify others
    if (stateRef.current.isHost) {
      broadcastToAll({ type: 'leave_room' })
      connectionsRef.current.forEach(conn => {
        if (conn.open) conn.close()
      })
    } else if (hostConnectionRef.current && hostConnectionRef.current.open) {
      hostConnectionRef.current.send(JSON.stringify({ type: 'leave_room' }))
      hostConnectionRef.current.close()
    }

    // Cleanup
    if (peerRef.current) {
      peerRef.current.destroy()
      peerRef.current = null
    }

    connectionsRef.current = []
    hostConnectionRef.current = null
    playerIdRef.current = ''

    setState({
      isConnected: false,
      isHost: false,
      roomCode: null,
      players: [],
      error: null,
      chatMessages: [],
      isPlaying: false,
    })
  }, [broadcastToAll])

  // Send chat message
  const sendChat = useCallback((message) => {
    const chatMessage = {
      type: 'chat_message',
      from: playerName.current,
      message,
      timestamp: Date.now(),
    }

    // Add to local state immediately
    setState(prev => ({
      ...prev,
      chatMessages: [...prev.chatMessages, chatMessage],
    }))

    // Send to others
    if (stateRef.current.isHost) {
      broadcastToAll(chatMessage)
    } else if (hostConnectionRef.current && hostConnectionRef.current.open) {
      hostConnectionRef.current.send(JSON.stringify(chatMessage))
    }
  }, [broadcastToAll])

  // Update player name
  const updateName = useCallback((name) => {
    playerName.current = name
    localStorage.setItem('playhub_name', name)
  }, [])

  // Start game (host only)
  const startGame = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: true }))
    broadcastToAll({ type: 'game_started' })
  }, [broadcastToAll])

  // Stop game (host only)
  const stopGame = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: false }))
    broadcastToAll({ type: 'game_stopped' })
  }, [broadcastToAll])

  // Assign player slot (host only)
  const assignPlayer = useCallback((targetId) => {
    setState(prev => {
      const assignedSlots = prev.players
        .map(p => p.playerId)
        .filter(id => id !== null)
      const nextSlot = [1, 2, 3, 4, 5, 6, 7, 8]
        .find(slot => !assignedSlots.includes(slot))
      
      const newPlayers = prev.players.map(p => {
        if (p.id === targetId && p.playerId === null) {
          return { ...p, playerId: nextSlot || null }
        }
        return p
      })
      
      return { ...prev, players: newPlayers }
    })
  }, [])

  // Remove player (host only)
  const removePlayer = useCallback((targetId) => {
    const conn = connectionsRef.current.find(c => c.peer === targetId)
    if (conn && conn.open) {
      conn.close()
    }
    setState(prev => ({
      ...prev,
      players: prev.players.filter(p => p.id !== targetId),
    }))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (peerRef.current) {
        peerRef.current.destroy()
      }
      connectionsRef.current = []
      hostConnectionRef.current = null
    }
  }, [])

  return {
    ...state,
    playerName: playerName.current,
    createRoom,
    joinRoom,
    leaveRoom,
    sendChat,
    updateName,
    startGame,
    stopGame,
    assignPlayer,
    removePlayer,
  }
}
