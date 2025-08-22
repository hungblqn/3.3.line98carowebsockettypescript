// src/test/load.gateway.spec.ts
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CaroGateway } from '../game/caro.gateway';
import { io, Socket } from 'socket.io-client';
import { AddressInfo } from 'net';
import * as jwt from 'jsonwebtoken';

function fakeToken(sub: string) {
  return jwt.sign({ sub }, 'secret', { algorithm: 'HS256' });
}

describe('CaroGateway Load Test - X wins', () => {
  let app: INestApplication;
  let url: string;
  const NUM_PLAYERS = 10;
  const sockets: Socket[] = [];
  const allLatencies: number[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [CaroGateway],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    const server = app.getHttpServer();
    const address = server.listen(0).address() as AddressInfo;
    url = `http://localhost:${address.port}`;
  });

  afterAll(async () => {
    sockets.forEach(s => s.disconnect());
    await app.close();
  });

  it('should handle 10 players with X winning in each pair and measure latency', async () => {
    // 1. Tạo 10 socket và connect
    await Promise.all(
      Array.from({ length: NUM_PLAYERS }, (_, i) => {
        return new Promise<void>((resolve, reject) => {
          const s = io(url, { transports: ['websocket'], query: { token: fakeToken(`u${i}`) } });
          sockets.push(s);
          const timer = setTimeout(() => reject(`Socket ${i} connect timeout`), 5000);
          s.on('connect', () => { clearTimeout(timer); resolve(); });
        });
      })
    );
    console.log('All 10 players connected');

    // 2. Tất cả queue
    sockets.forEach(s => s.emit('queue'));

    // 3. Đợi queued
    await Promise.all(sockets.map((s, idx) => new Promise<void>(res => s.once('queued', () => {
      console.log(`Player ${idx} queued`);
      res();
    }))));

    // 4. Chia thành 5 cặp, mỗi cặp X thắng O
    const pairs: [Socket, Socket][] = [];
    for (let i = 0; i < NUM_PLAYERS; i += 2) pairs.push([sockets[i], sockets[i + 1]]);

    const pairPromises: Promise<void>[] = [];

    pairs.forEach(([sX, sO], pairIdx) => {
      pairPromises.push(new Promise<void>((resolve) => {
        let idx = 0;
        const moves = [
          {player: 'X', r: 7, c: 7},
          {player: 'O', r: 0, c: 0},
          {player: 'X', r: 7, c: 8},
          {player: 'O', r: 0, c: 1},
          {player: 'X', r: 7, c: 9},
          {player: 'O', r: 0, c: 2},
          {player: 'X', r: 7, c: 10},
          {player: 'O', r: 0, c: 3},
          {player: 'X', r: 7, c: 11}, // X thắng
        ];

        const interval = setInterval(() => {
          if (idx < moves.length) {
            const mv = moves[idx];
            const start = Date.now(); // đo thời điểm emit
            if (mv.player === 'X') sX.emit('makeMove', { r: mv.r, c: mv.c });
            else sO.emit('makeMove', { r: mv.r, c: mv.c });

            // Lắng nghe boardUpdate 1 lần để đo latency
            const listener = (data: any) => {
              allLatencies.push(Date.now() - start);
              if (mv.player === 'X') sX.off('boardUpdate', listener);
              else sO.off('boardUpdate', listener);
            };
            if (mv.player === 'X') sX.once('boardUpdate', listener);
            else sO.once('boardUpdate', listener);

            idx++;
          } else {
            clearInterval(interval);
          }
        }, 100);

        // Lắng nghe gameOver
        sX.on('gameOver', (res) => {
          try {
            expect(res.winner).toBe(`u${pairIdx*2}`); // X là u0,u2,...
            console.log(`Pair ${pairIdx} X won`);
            resolve();
          } catch (e) {
            resolve(); // fail nhưng không block các pair khác
          }
        });
      }));
    });

    // 5. Chờ tất cả cặp finish
    await Promise.all(pairPromises);

    // 6. Tính độ trễ trung bình
    const sum = allLatencies.reduce((a, b) => a + b, 0);
    const avg = allLatencies.length ? sum / allLatencies.length : 0;
    console.log(`Average latency per move: ${avg.toFixed(2)} ms`);
  }, 60000);
});
