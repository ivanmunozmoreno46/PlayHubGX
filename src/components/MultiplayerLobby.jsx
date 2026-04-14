import { useState } from 'react'

function MultiplayerLobby({ multiplayer }) {
  const [roomCodeInput, setRoomCodeInput] = useState('')
  const {
    isHost,
    roomCode,
    players,
    error,
    chatMessages,
    isConnected,
    isPlaying,
    playerName,
    createRoom,
    joinRoom,
    leaveRoom,
    sendChat,
    startGame,
    stopGame,
    assignPlayer,
    removePlayer,
  } = multiplayer

  const [chatInput, setChatInput] = useState('')

  const handleSendChat = (e) => {
    e.preventDefault()
    if (chatInput.trim()) {
      sendChat(chatInput.trim())
      setChatInput('')
    }
  }

  // Not in a room yet
  if (!roomCode) {
    return (
      <div className="w-full p-4">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-300 text-[8px] font-retro">
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
            onClick={createRoom}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 text-white font-retro text-[9px] rounded transition-all"
            style={{
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            }}
          >
            CREATE ROOM
          </button>

          <div className="space-y-2">
            <input
              type="text"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="ENTER ROOM CODE"
              maxLength={6}
              className="w-full px-4 py-3 bg-ps1-dark border border-ps1-gray text-ps1-text font-retro text-xs rounded focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => {
                if (roomCodeInput.length === 6) {
                  joinRoom(roomCodeInput)
                }
              }}
              disabled={roomCodeInput.length !== 6}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-retro text-[9px] rounded transition-all"
              style={{
                boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
              }}
            >
              JOIN ROOM
            </button>
          </div>
        </div>

        {/* Help Text */}
        <div className="p-3 bg-ps1-dark rounded border border-ps1-gray">
          <p className="font-retro text-[7px] text-gray-400 leading-relaxed">
            CREATE a room and share the code with friends, or JOIN an existing room with a code.
          </p>
        </div>
      </div>
    )
  }

  // In a room - show room details
  return (
    <div className="w-full p-4">
      {/* Room Code */}
      <div className="mb-4 text-center">
        <div className="font-retro text-[7px] text-gray-400 mb-2">
          ROOM CODE
        </div>
        <div className="inline-block px-6 py-3 bg-ps1-dark border-2 border-green-500 rounded">
          <span className="font-retro text-lg text-green-400 tracking-widest">
            {roomCode}
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
          PLAYERS ({players.length}/8)
        </div>
        <div className="space-y-1">
          {players.map((player) => (
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
              </div>
              {player.playerId !== null ? (
                <div className="flex items-center gap-1">
                  <span className="font-retro text-[7px] text-green-400">
                    P{player.playerId}
                  </span>
                  {isHost && player.id !== players[0]?.id && (
                    <button
                      onClick={() => removePlayer(player.id)}
                      className="text-red-400 hover:text-red-300 text-[8px]"
                      title="Remove player"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="font-retro text-[7px] text-gray-500">
                    SPECTATOR
                  </span>
                  {isHost && (
                    <button
                      onClick={() => assignPlayer(player.id)}
                      className="text-green-400 hover:text-green-300 text-[7px] font-retro"
                    >
                      ASSIGN
                    </button>
                  )}
                </div>
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
          {chatMessages.length === 0 && (
            <div className="font-retro text-[7px] text-gray-500 text-center py-2">
              No messages yet
            </div>
          )}
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
            {!isPlaying ? (
              <button
                onClick={startGame}
                className="w-full py-2 px-4 bg-green-600 hover:bg-green-500 text-white font-retro text-[8px] rounded transition-all"
              >
                START GAME
              </button>
            ) : (
              <button
                onClick={stopGame}
                className="w-full py-2 px-4 bg-yellow-600 hover:bg-yellow-500 text-white font-retro text-[8px] rounded transition-all"
              >
                STOP GAME
              </button>
            )}
            <button
              onClick={leaveRoom}
              className="w-full py-2 px-4 bg-red-600 hover:bg-red-500 text-white font-retro text-[8px] rounded transition-all"
            >
              LEAVE ROOM
            </button>
          </div>
        </div>
      )}

      {/* Leave Button (for non-host) */}
      {!isHost && (
        <button
          onClick={leaveRoom}
          className="w-full py-2 px-4 bg-red-600 hover:bg-red-500 text-white font-retro text-[8px] rounded transition-all"
        >
          LEAVE ROOM
        </button>
      )}
    </div>
  )
}

export default MultiplayerLobby
