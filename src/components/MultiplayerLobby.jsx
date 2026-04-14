import { useState } from 'react'

function MultiplayerLobby({ multiplayer }) {
  const [roomCode, setRoomCode] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)

  const { isHost, room, error } = multiplayer

  if (room) {
    return <MultiplayerRoom multiplayer={multiplayer} />
  }

  return (
    <div className="w-full p-4">
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-300 text-xs">
          {error}
        </div>
      )}

      {/* Multiplayer Header */}
      <div className="mb-6 text-center">
        <h2 className="font-retro text-xs text-ps1-text mb-2">
          MULTIPLAYER
        </h2>
        <p className="font-retro text-[7px] text-gray-400">
          PLAY WITH FRIENDS
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 mb-6">
        <button
          onClick={() => {
            setShowCreate(true)
            setShowJoin(false)
            multiplayer.createRoom()
          }}
          className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 text-white font-retro text-[9px] rounded transition-all"
          style={{
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          }}
        >
          CREATE ROOM
        </button>

        <button
          onClick={() => {
            setShowJoin(true)
            setShowCreate(false)
          }}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-retro text-[9px] rounded transition-all"
          style={{
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          }}
        >
          JOIN ROOM
        </button>
      </div>

      {/* Join Room Form */}
      {showJoin && (
        <div className="space-y-3">
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="ENTER ROOM CODE"
            maxLength={6}
            className="w-full px-4 py-3 bg-ps1-dark border border-ps1-gray text-ps1-text font-retro text-xs rounded focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => {
              if (roomCode.length === 6) {
                multiplayer.joinRoom(roomCode)
              }
            }}
            disabled={roomCode.length !== 6}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-retro text-[9px] rounded transition-all"
          >
            JOIN
          </button>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-6 p-3 bg-ps1-dark rounded border border-ps1-gray">
        <p className="font-retro text-[7px] text-gray-400 leading-relaxed">
          CREATE a room and share the code with friends, or JOIN an existing room with a code.
        </p>
      </div>
    </div>
  )
}

function MultiplayerRoom({ multiplayer }) {
  const { isHost, room, chatMessages, sendChat } = multiplayer
  const [chatInput, setChatInput] = useState('')

  const handleSendChat = (e) => {
    e.preventDefault()
    if (chatInput.trim()) {
      sendChat(chatInput.trim())
      setChatInput('')
    }
  }

  if (!room) return null

  return (
    <div className="w-full p-4">
      {/* Room Header */}
      <div className="mb-4 text-center">
        <div className="font-retro text-[7px] text-gray-400 mb-2">
          ROOM CODE
        </div>
        <div className="inline-block px-6 py-3 bg-ps1-dark border-2 border-green-500 rounded">
          <span className="font-retro text-lg text-green-400 tracking-widest">
            {room.gameCode}
          </span>
        </div>
        {isHost && (
          <div className="mt-2 font-retro text-[7px] text-yellow-400">
            YOU ARE THE HOST
          </div>
        )}
      </div>

      {/* Players List */}
      <div className="mb-4">
        <div className="font-retro text-[8px] text-ps1-text mb-2">
          PLAYERS ({room.players.length}/8)
        </div>
        <div className="space-y-1">
          {room.players.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between px-3 py-2 bg-ps1-dark rounded border border-ps1-gray"
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  player.isConnected ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="font-retro text-[8px] text-ps1-text">
                  {player.name}
                </span>
                {player.id === room.host && (
                  <span className="font-retro text-[6px] text-yellow-400">
                    HOST
                  </span>
                )}
              </div>
              {player.playerId !== null ? (
                <span className="font-retro text-[7px] text-green-400">
                  P{player.playerId}
                </span>
              ) : (
                <span className="font-retro text-[7px] text-gray-500">
                  SPECTATOR
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="mb-4">
        <div className="font-retro text-[8px] text-ps1-text mb-2">
          CHAT
        </div>
        <div className="bg-ps1-dark rounded border border-ps1-gray p-2 max-h-32 overflow-y-auto">
          {chatMessages.map((msg, idx) => (
            <div key={idx} className="mb-1">
              <span className="font-retro text-[7px] text-yellow-400">
                {msg.from}:
              </span>
              <span className="font-retro text-[7px] text-ps1-text ml-1">
                {msg.message}
              </span>
            </div>
          ))}
        </div>
        <form onSubmit={handleSendChat} className="mt-2 flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type message..."
            maxLength={100}
            className="flex-1 px-3 py-2 bg-ps1-dark border border-ps1-gray text-ps1-text font-retro text-[8px] rounded focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-retro text-[8px] rounded transition-all"
          >
            SEND
          </button>
        </form>
      </div>

      {/* Host Controls */}
      {isHost && (
        <div className="mb-4">
          <div className="font-retro text-[8px] text-yellow-400 mb-2">
            HOST CONTROLS
          </div>
          <div className="space-y-2">
            <button
              onClick={() => multiplayer.startGame()}
              disabled={room.isPlaying}
              className="w-full py-2 px-4 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-retro text-[8px] rounded transition-all"
            >
              {room.isPlaying ? 'GAME RUNNING' : 'START GAME'}
            </button>
            {!room.isPlaying && (
              <button
                onClick={() => multiplayer.leaveRoom()}
                className="w-full py-2 px-4 bg-red-600 hover:bg-red-500 text-white font-retro text-[8px] rounded transition-all"
              >
                LEAVE ROOM
              </button>
            )}
          </div>
        </div>
      )}

      {/* Leave Button (for non-host) */}
      {!isHost && (
        <button
          onClick={() => multiplayer.leaveRoom()}
          className="w-full py-2 px-4 bg-red-600 hover:bg-red-500 text-white font-retro text-[8px] rounded transition-all"
        >
          LEAVE ROOM
        </button>
      )}
    </div>
  )
}

export default MultiplayerLobby
