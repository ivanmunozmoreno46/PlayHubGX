import type { Party, Connection, Server } from "partykit/server";

// Room state interface
interface RoomState {
  host: string; // connection ID of the host
  players: Map<string, PlayerInfo>;
  gameCode: string; // unique room code
  isPlaying: boolean;
}

interface PlayerInfo {
  id: string;
  name: string;
  playerId: number | null; // controller slot (1-8)
  isConnected: boolean;
}

// In-memory room storage
const rooms = new Map<string, RoomState>();

export default class GameServer implements Server {
  // Room code generation
  private generateRoomCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  // Get or create room
  private getOrCreateRoom(code: string, hostId: string): RoomState {
    if (!rooms.has(code)) {
      rooms.set(code, {
        host: hostId,
        players: new Map(),
        gameCode: code,
        isPlaying: false,
      });
    }
    return rooms.get(code)!;
  }

  // Broadcast message to all players in room
  private broadcastToRoom(room: RoomState, message: any, excludeId?: string) {
    const msgStr = JSON.stringify(message);
    room.players.forEach((player) => {
      if (player.id !== excludeId && player.isConnected) {
        const conn = this.party.getConnection(player.id);
        if (conn) {
          conn.send(msgStr);
        }
      }
    });
  }

  // Handle new connection
  onConnect(conn: Connection) {
    // Send welcome message
    conn.send(
      JSON.stringify({
        type: "welcome",
        connectionId: conn.id,
      })
    );
  }

  // Handle incoming messages
  onMessage(message: string, conn: Connection) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        // Create a new room
        case "create_room": {
          const code = this.generateRoomCode();
          const room = this.getOrCreateRoom(code, conn.id);
          
          // Add host as player 1
          room.players.set(conn.id, {
            id: conn.id,
            name: data.name || "Host",
            playerId: 1,
            isConnected: true,
          });

          conn.send(
            JSON.stringify({
              type: "room_created",
              code: code,
              room: {
                gameCode: code,
                host: conn.id,
                players: Array.from(room.players.values()),
                isPlaying: false,
              },
            })
          );
          break;
        }

        // Join existing room
        case "join_room": {
          const code = data.code.toUpperCase();
          const room = rooms.get(code);

          if (!room) {
            conn.send(
              JSON.stringify({
                type: "error",
                message: "Room not found",
              })
            );
            return;
          }

          // Add player as spectator
          room.players.set(conn.id, {
            id: conn.id,
            name: data.name || "Player",
            playerId: null, // Spectator until assigned by host
            isConnected: true,
          });

          // Notify all players
          this.broadcastToRoom(room, {
            type: "player_joined",
            player: {
              id: conn.id,
              name: data.name || "Player",
              playerId: null,
            },
            players: Array.from(room.players.values()),
          });

          // Send room state to new player
          conn.send(
            JSON.stringify({
              type: "room_joined",
              code: code,
              room: {
                gameCode: code,
                host: room.host,
                players: Array.from(room.players.values()),
                isPlaying: room.isPlaying,
              },
              isHost: false,
            })
          );
          break;
        }

        // Assign player ID (host only)
        case "assign_player": {
          const code = data.code.toUpperCase();
          const room = rooms.get(code);

          if (!room || room.host !== conn.id) {
            return; // Only host can assign
          }

          const targetPlayer = room.players.get(data.targetId);
          if (targetPlayer) {
            // Find next available slot
            const assignedSlots = Array.from(room.players.values())
              .map((p) => p.playerId)
              .filter((id): id is number => id !== null);
            
            const nextSlot = Math.min(
              ...[1, 2, 3, 4, 5, 6, 7, 8].filter(
                (slot) => !assignedSlots.includes(slot)
              )
            );

            targetPlayer.playerId = nextSlot;

            this.broadcastToRoom(room, {
              type: "player_assigned",
              playerId: targetPlayer.id,
              slot: nextSlot,
              players: Array.from(room.players.values()),
            });
          }
          break;
        }

        // Remove player (host only)
        case "remove_player": {
          const code = data.code.toUpperCase();
          const room = rooms.get(code);

          if (!room || room.host !== conn.id) {
            return;
          }

          const targetPlayer = room.players.get(data.targetId);
          if (targetPlayer && targetPlayer.id !== room.host) {
            room.players.delete(targetPlayer.id);
            const targetConn = this.party.getConnection(targetPlayer.id);
            if (targetConn) {
              targetConn.close();
            }

            this.broadcastToRoom(room, {
              type: "player_removed",
              playerId: targetPlayer.id,
              players: Array.from(room.players.values()),
            });
          }
          break;
        }

        // Start game (host only)
        case "start_game": {
          const code = data.code.toUpperCase();
          const room = rooms.get(code);

          if (!room || room.host !== conn.id) {
            return;
          }

          room.isPlaying = true;
          this.broadcastToRoom(room, {
            type: "game_started",
            players: Array.from(room.players.values()),
          });
          break;
        }

        // Stop game (host only)
        case "stop_game": {
          const code = data.code.toUpperCase();
          const room = rooms.get(code);

          if (!room || room.host !== conn.id) {
            return;
          }

          room.isPlaying = false;
          this.broadcastToRoom(room, {
            type: "game_stopped",
          });
          break;
        }

        // Input from player
        case "player_input": {
          const code = data.code.toUpperCase();
          const room = rooms.get(code);

          if (!room) {
            return;
          }

          // Only send to host
          const hostConn = this.party.getConnection(room.host);
          if (hostConn) {
            hostConn.send(
              JSON.stringify({
                type: "remote_input",
                playerId: data.playerId,
                input: data.input,
                from: conn.id,
              })
            );
          }
          break;
        }

        // Game state sync (host to clients)
        case "game_state": {
          const code = data.code.toUpperCase();
          const room = rooms.get(code);

          if (!room || room.host !== conn.id) {
            return;
          }

          // Broadcast game state to all clients except host
          this.broadcastToRoom(
            room,
            {
              type: "sync_state",
              state: data.state,
            },
            room.host
          );
          break;
        }

        // Chat message
        case "chat": {
          const code = data.code.toUpperCase();
          const room = rooms.get(code);

          if (!room) {
            return;
          }

          const player = room.players.get(conn.id);
          this.broadcastToRoom(room, {
            type: "chat_message",
            from: player?.name || "Unknown",
            message: data.message,
            timestamp: Date.now(),
          });
          break;
        }

        // Leave room
        case "leave_room": {
          const code = data.code.toUpperCase();
          const room = rooms.get(code);

          if (room) {
            room.players.delete(conn.id);
            
            // If host left, dissolve room
            if (room.host === conn.id) {
              this.broadcastToRoom(room, {
                type: "room_dissolved",
              });
              rooms.delete(code);
            } else {
              this.broadcastToRoom(room, {
                type: "player_left",
                playerId: conn.id,
                players: Array.from(room.players.values()),
              });
            }
          }
          break;
        }

        // Update player name
        case "update_name": {
          const code = data.code.toUpperCase();
          const room = rooms.get(code);

          if (room) {
            const player = room.players.get(conn.id);
            if (player) {
              player.name = data.name;
              this.broadcastToRoom(room, {
                type: "name_updated",
                playerId: conn.id,
                name: data.name,
                players: Array.from(room.players.values()),
              });
            }
          }
          break;
        }
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  }

  // Handle disconnection
  onClose(conn: Connection) {
    // Find and remove player from all rooms
    rooms.forEach((room, code) => {
      if (room.players.has(conn.id)) {
        room.players.delete(conn.id);

        // If host left, dissolve room
        if (room.host === conn.id) {
          this.broadcastToRoom(room, {
            type: "room_dissolved",
          });
          rooms.delete(code);
        } else {
          this.broadcastToRoom(room, {
            type: "player_left",
            playerId: conn.id,
            players: Array.from(room.players.values()),
          });
        }
      }
    });
  }
}
