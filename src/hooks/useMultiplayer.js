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
  const playerId = useRef('')

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

  // Send message to all peers (host only)
  const broadcastToAll = useCallback((data, excludeId) => {
    const msgStr = JSON.stringify(data)
    connectionsRef.current.forEach((conn) => {
      if (conn.peer !== excludeId && conn.open) {
        conn.send(msgStr)
      }
    })
  }, [])

  // Update players list
  const updatePlayersList = useCallback((players) => {
    setState(prev => ({ ...prev, players }))
    // Broadcast to all clients
    broadcastToAll({
      type: 'players_update',
      players,
    })
  }, [broadcastToAll])

  // Add player to list
  const addPlayer = useCallback((player) => {
    setState(prev => {
      const newPlayers = [...prev.players, player]
      updatePlayersList(newPlayers)
      return { ...prev, players: newPlayers }
    })
  }, [updatePlayersList])

  // Remove player from list
  const removePlayer = useCallback((peerId) => {
    setState(prev => {
      const newPlayers = prev.players.filter(p => p.id !== peerId)
      updatePlayersList(newPlayers)
      return { ...prev, players: newPlayers }
    })
  }, [updatePlayersList])

  // Handle incoming message
  const handleMessage = useCallback((data, fromPeerId) => {
    switch (data.type) {
      case 'join_request':
        // Client wants to join (host only)
        if (state.isHost) {
          const newPlayer = {
            id: fromPeerId,
            name: data.name || 'Player',
            playerId: null,
            isConnected: true,
          }
          addPlayer(newPlayer)
          
          // Send room state to client
          if (hostConnectionRef.current) {
            hostConnectionRef.current.send(JSON.stringify({
              type: 'join_accepted',
              roomCode: state.roomCode,
              players: [...state.players, newPlayer],
              isHost: false,
            }))
          }
        }
        break

      case 'chat_message':
        setState(prev => ({
          ...prev,
          chatMessages: [...prev.chatMessages, data],
        }))
        if (state.isHost) {
          broadcastToAll(data, fromPeerId)
        }
        break

      case 'player_input':
        // Forward to host
        if (state.isHost) {
          // Handle player input from clients
        }
        break

      case 'leave_room':
        removePlayer(fromPeerId)
        break

      default:
        break
    }
  }, [state.isHost, state.roomCode, state.players, addPlayer, removePlayer, broadcastToAll])

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
      playerId.current = id
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
      }))
    })

    peer.on('connection', (conn) => {
      console.log('[Multiplayer] Client connected:', conn.peer)
      connectionsRef.current.push(conn)

      conn.on('data', (data) => {
        try {
          handleMessage(JSON.parse(data), conn.peer)
        } catch (error) {
          console.error('[Multiplayer] Error parsing message:', error)
        }
      })

      conn.on('close', () => {
        console.log('[Multiplayer] Client disconnected:', conn.peer)
        removePlayer(conn.peer)
        connectionsRef.current = connectionsRef.current.filter(c => c.peer !== conn.peer)
      })

      conn.on('error', (error) => {
        console.error('[Multiplayer] Connection error:', error)
      })
    })

    peer.on('error', (error) => {
      console.error('[Multiplayer] Peer error:', error)
      if (error.type === 'unavailable-id') {
        setState(prev => ({
          ...prev,
          error: 'Room code already exists. Try again.',
        }))
      } else {
        setState(prev => ({
          ...prev,
          error: 'Failed to create room. Please try again.',
        }))
      }
    })

    peerRef.current = peer
  }, [handleMessage, removePlayer])

  // Join room (client)
  const joinRoom = useCallback((code, name) => {
    if (peerRef.current) {
      peerRef.current.destroy()
    }

    const peerId = `playhub-client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const hostPeerId = `playhub-${code}`
    
    console.log('[Multiplayer] Joining room:', code)

    const peer = new Peer(peerId, {
      debug: 2,
    })

    peer.on('open', () => {
      console.log('[Multiplayer] Connected to signaling server, joining room...')
      playerId.current = peerId

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
          name: name || playerName.current,
        }))
      })

      conn.on('data', (data) => {
        try {
          const message = JSON.parse(data)
          handleMessage(message, 'host')
        } catch (error) {
          console.error('[Multiplayer] Error parsing message:', error)
        }
      })

      conn.on('close', () => {
        console.log('[Multiplayer] Disconnected from host')
        setState(prev => ({
          ...prev,
          isConnected: false,
          error: 'Disconnected from room',
        }))
      })

      conn.on('error', (error) => {
        console.error('[Multiplayer] Connection error:', error)
        setState(prev => ({
          ...prev,
          error: 'Failed to connect to room',
        }))
      })
    })

    peer.on('error', (error) => {
      console.error('[Multiplayer] Peer error:', error)
      if (error.type === 'peer-unavailable') {
        setState(prev => ({
          ...prev,
          error: 'Room not found. Check the code and try again.',
        }))
      } else {
        setState(prev => ({
          ...prev,
          error: 'Failed to join room. Please try again.',
        }))
      }
    })

    peerRef.current = peer
  }, [handleMessage])

  // Leave room
  const leaveRoom = useCallback(() => {
    if (hostConnectionRef.current) {
      hostConnectionRef.current.send(JSON.stringify({
        type: 'leave_room',
      }))
      hostConnectionRef.current.close()
    }

    if (peerRef.current) {
      peerRef.current.destroy()
      peerRef.current = null
    }

    connectionsRef.current = []
    hostConnectionRef.current = null
    playerId.current = ''

    setState({
      isConnected: false,
      isHost: false,
      roomCode: null,
      players: [],
      error: null,
      chatMessages: [],
      isPlaying: false,
    })
  }, [])

  // Send chat message
  const sendChat = useCallback((message) => {
    const chatMessage = {
      type: 'chat_message',
      from: playerName.current,
      message,
      timestamp: Date.now(),
    }

    if (state.isHost) {
      setState(prev => ({
        ...prev,
        chatMessages: [...prev.chatMessages, chatMessage],
      }))
      broadcastToAll(chatMessage)
    } else if (hostConnectionRef.current && hostConnectionRef.current.open) {
      hostConnectionRef.current.send(JSON.stringify(chatMessage))
      setState(prev => ({
        ...prev,
        chatMessages: [...prev.chatMessages, chatMessage],
      }))
    }
  }, [state.isHost, broadcastToAll])

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

  // Assign player ID (host only)
  const assignPlayer = useCallback((targetId) => {
    setState(prev => {
      const players = prev.players.map(p => {
        if (p.id === targetId && p.playerId === null) {
          const assignedSlots = prev.players
            .map(pl => pl.playerId)
            .filter(id => id !== null)
          const nextSlot = [1, 2, 3, 4, 5, 6, 7, 8]
            .find(slot => !assignedSlots.includes(slot))
          return { ...p, playerId: nextSlot || null }
        }
        return p
      })
      updatePlayersList(players)
      return { ...prev, players }
    })
  }, [updatePlayersList])

  // Remove player (host only)
  const removePlayerByHost = useCallback((targetId) => {
    const conn = connectionsRef.current.find(c => c.peer === targetId)
    if (conn) {
      conn.close()
    }
    removePlayer(targetId)
  }, [removePlayer])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (peerRef.current) {
        peerRef.current.destroy()
        peerRef.current = null
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
    removePlayer: removePlayerByHost,
  }
}
