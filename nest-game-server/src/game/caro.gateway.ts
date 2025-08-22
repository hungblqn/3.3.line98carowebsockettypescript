import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { connectDB } from './database';
import { CaroGameResult } from '../models/CaroGameResult';

connectDB();

interface Player {
  userId: string;
  socket: Socket;
  mark?: 'X' | 'O';
}

interface Room {
  id: string;
  players: Player[];
  board: (string | null)[][];
  turn: string;
}

const SIZE = 15;

@WebSocketGateway({ cors: true })
export class CaroGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private waitingQueue: Player[] = [];
  private rooms: Map<string, Room> = new Map();

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.query.token as string;
      if (!token) {
        client.disconnect();
        return;
      }
      const decoded = jwt.decode(token) as { sub: string };
      if (!decoded || !decoded.sub) {
        client.disconnect();
        return;
      }
      const userId = decoded.sub;
      (client as any).userId = userId;
      client.emit('connected', { userId });
      console.log(`Client connected: ${userId}`);
    } catch (e) {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = (client as any).userId;
    console.log(`Client disconnected: ${userId}`);
    this.waitingQueue = this.waitingQueue.filter((p) => p.userId !== userId);

    for (const [roomId, room] of this.rooms) {
      const idx = room.players.findIndex((p) => p.userId === userId);
      if (idx !== -1) {
        room.players.forEach((p) => {
          if (p.userId !== userId) {
            p.socket.emit('opponentLeft');
          }
        });
        this.rooms.delete(roomId);
        break;
      }
    }
  }

  @SubscribeMessage('queue')
  async handleQueue(client: Socket) {
    const userId = (client as any).userId;
    if (!userId) return;

    // kiểm tra có đang trong hàng đợi chưa
    if (this.waitingQueue.find((p) => p.userId === userId)) return;

    const player: Player = { userId, socket: client };
    this.waitingQueue.push(player);
    client.emit('queued');

    // nếu có >= 2 người → ghép cặp
    if (this.waitingQueue.length >= 2) {
      const p1 = this.waitingQueue.shift()!;
      const p2 = this.waitingQueue.shift()!;

      const roomId = Math.random().toString(36).substring(2, 9);
      const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
      const turn = p1.userId;

      p1.mark = 'X';
      p2.mark = 'O';

      const room: Room = { id: roomId, players: [p1, p2], board, turn };
      this.rooms.set(roomId, room);

      p1.socket.emit('gameStart', { roomId, mark: 'X', turn });
      p2.socket.emit('gameStart', { roomId, mark: 'O', turn });
    }
  }

  @SubscribeMessage('makeMove')
  async handleMove(client: Socket, payload: { r: number; c: number }) {
    const userId = (client as any).userId;
    if (!userId) return;

    const room = this.findRoomByUser(userId);
    if (!room) return;

    if (room.turn !== userId) return; // chưa tới lượt

    const { r, c } = payload;
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return;
    if (room.board[r][c]) return;

    const player = room.players.find((p) => p.userId === userId)!;
    room.board[r][c] = player.mark!;
    room.turn = room.players.find((p) => p.userId !== userId)!.userId;

    // gửi update cho cả 2
    room.players.forEach((p) =>
      p.socket.emit('boardUpdate', { board: room.board, turn: room.turn }),
    );

    // kiểm tra thắng thua
    if (this.checkWin(room.board, r, c, player.mark!)) {
      room.players.forEach((p) =>
        p.socket.emit('gameOver', { winner: userId, board: room.board }),
      );
      const loser = room.players.find(p => p.userId !== userId)!.userId;
      try {
        await CaroGameResult.create({ winner: userId, loser });
        console.log(`Saved result: winner=${userId}, loser=${loser}`);
      } catch (err) {
        console.error('Failed to save game result:', err);
      }
      this.rooms.delete(room.id);
    }
  }

  private findRoomByUser(userId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.some((p) => p.userId === userId)) return room;
    }
    return undefined;
  }

  private checkWin(board: (string | null)[][], r: number, c: number, mark: string): boolean {
    const dirs = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];
    for (const [dx, dy] of dirs) {
      let count = 1;
      for (const dir of [1, -1]) {
        let x = r + dx * dir;
        let y = c + dy * dir;
        while (x >= 0 && x < SIZE && y >= 0 && y < SIZE && board[x][y] === mark) {
          count++;
          x += dx * dir;
          y += dy * dir;
        }
      }
      if (count >= 5) return true;
    }
    return false;
  }
}
