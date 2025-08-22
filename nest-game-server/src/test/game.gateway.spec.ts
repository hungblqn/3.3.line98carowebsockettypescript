// src/test/game.gateway.spec.ts
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GameGateway } from '../game/game.gateway';
import { AddressInfo } from 'net';
import { io, Socket } from 'socket.io-client';
import * as jwt from 'jsonwebtoken';

// === Fake GameState model để chặn MongoDB ===
jest.mock('../models/GameState', () => ({
  GameState: {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ save: jest.fn() }),
  },
}));

function fakeToken(sub: string) {
  return jwt.sign({ sub }, 'secret', { algorithm: 'HS256' });
}

describe('GameGateway (integration no-DB)', () => {
  let app: INestApplication;
  let url: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [GameGateway],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    const server = app.getHttpServer();
    const address = server.listen(0).address() as AddressInfo;
    url = `http://localhost:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('client connect => nhận boardUpdate', async () => {
    const token = fakeToken('u1');
    const s1: Socket = io(url, {
      transports: ['websocket'],
      query: { token },
    });

    await new Promise<void>((resolve, reject) => {
      s1.on('boardUpdate', (data) => {
        try {
          expect(data.board).toBeDefined();
          expect(Array.isArray(data.board)).toBe(true);
          expect(data.nextBalls).toBeDefined();
          s1.disconnect();
          resolve();
        } catch (e) {
          reject(e);
        }
      });

      setTimeout(() => reject('timeout'), 5000);
    });
  });

  it('resetGame => nhận boardUpdate mới', async () => {
    const token = fakeToken('u2');
    const s1: Socket = io(url, {
      transports: ['websocket'],
      query: { token },
    });

    await new Promise<void>((resolve, reject) => {
      s1.on('boardUpdate', (data) => {
        // Lần đầu: khi connect
        if (!s1.hasListeners('boardUpdate')) return;
      });

      s1.emit('resetGame', { token });

      s1.on('boardUpdate', (data) => {
        try {
          expect(data.board).toBeDefined();
          s1.disconnect();
          resolve();
        } catch (e) {
          reject(e);
        }
      });

      setTimeout(() => reject('timeout'), 5000);
    });
  });

  it('help => trả về from/to', async () => {
    const token = fakeToken('u3');
    const s1: Socket = io(url, {
      transports: ['websocket'],
      query: { token },
    });

    await new Promise<void>((resolve, reject) => {
      s1.on('boardUpdate', () => {
        s1.emit('help');
      });

      s1.on('help', (data) => {
        try {
          expect(data.from).toBeDefined();
          expect(data.to).toBeDefined();
          s1.disconnect();
          resolve();
        } catch (e) {
          reject(e);
        }
      });

      setTimeout(() => reject('timeout'), 5000);
    });
  });

  it('moveBall => nhận boardUpdate sau khi di chuyển', async () => {
    const token = fakeToken('u4');
    const s1: Socket = io(url, {
      transports: ['websocket'],
      query: { token },
    });

    await new Promise<void>((resolve, reject) => {
      let receivedFirstBoard = false;
      let anyCell: [number, number] | null = null;

      s1.on('boardUpdate', (data) => {
        if (!receivedFirstBoard) {
          // tìm 1 ô có bóng bất kỳ
          for (let r = 0; r < data.board.length; r++) {
            for (let c = 0; c < data.board[r].length; c++) {
              if (data.board[r][c]) {
                anyCell = [r, c];
                break;
              }
            }
            if (anyCell) break;
          }
          // tìm 1 ô trống bất kỳ
          let empty: [number, number] | null = null;
          for (let r = 0; r < data.board.length; r++) {
            for (let c = 0; c < data.board[r].length; c++) {
              if (!data.board[r][c]) {
                empty = [r, c];
                break;
              }
            }
            if (empty) break;
          }

          if (anyCell && empty) {
            receivedFirstBoard = true;
            s1.emit('moveBall', { from: anyCell, to: empty, token });
          }
        } else {
          try {
            // nhận boardUpdate sau khi moveBall
            expect(data.board).toBeDefined();
            s1.disconnect();
            resolve();
          } catch (e) {
            reject(e);
          }
        }
      });

      setTimeout(() => reject('timeout'), 7000);
    });
  });
});
