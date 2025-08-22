// src/test/caro.gateway.spec.ts
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CaroGateway } from '../game/caro.gateway';
import { AddressInfo } from 'net';
import { io, Socket } from 'socket.io-client';
import * as jwt from 'jsonwebtoken';

function fakeToken(sub: string) {
  return jwt.sign({ sub }, 'secret', { algorithm: 'HS256' });
}

describe('CaroGateway (integration)', () => {
  let app: INestApplication;
  let url: string;

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
    await app.close();
  });

  it('2 người chơi ghép cặp và người X (u1) thắng sau khi đánh 5 quân liên tiếp', (done) => {
    const s1: Socket = io(url, { transports: ['websocket'], query: { token: fakeToken('u1') } });
    const s2: Socket = io(url, { transports: ['websocket'], query: { token: fakeToken('u2') } });

    // B1. Đợi cả 2 socket connect
    Promise.all([
      new Promise<void>((res, rej) => {
        s1.on('connect', () => { console.log('s1 connected'); res(); });
        setTimeout(() => rej('s1 connect timeout'), 3000);
      }),
      new Promise<void>((res, rej) => {
        s2.on('connect', () => { console.log('s2 connected'); res(); });
        setTimeout(() => rej('s2 connect timeout'), 3000);
      })
    ]).then(() => {
      // Sau khi connect, phát sự kiện queue
      s1.emit('queue');
      s2.emit('queue');

      // B2. Đợi cả 2 nhận queued
      let queued = 0;
      function checkQueued() {
        if (++queued === 2) console.log('Both players queued');
      }
      s1.on('queued', checkQueued);
      s2.on('queued', checkQueued);

      // B3. Đợi gameStart rồi gửi nước đi xen kẽ
      // X (u1) đánh thẳng 5 ô liên tiếp hàng 7
      // O (u2) đánh ở chỗ xa (0,0), (0,1), ... để không chặn X
      const moves: {player: 's1' | 's2', r: number, c: number}[] = [
        { player: 's1', r: 7, c: 7 },   // X1
        { player: 's2', r: 0, c: 0 },   // O1
        { player: 's1', r: 7, c: 8 },   // X2
        { player: 's2', r: 0, c: 1 },   // O2
        { player: 's1', r: 7, c: 9 },   // X3
        { player: 's2', r: 0, c: 2 },   // O3
        { player: 's1', r: 7, c: 10 },  // X4
        { player: 's2', r: 0, c: 3 },   // O4
        { player: 's1', r: 7, c: 11 },  // X5 → thắng
      ];
      let idx = 0;

      s1.on('gameStart', () => console.log('s1 start'));
      s2.on('gameStart', () => {
        console.log('s2 start');
        const interval = setInterval(() => {
          if (idx < moves.length) {
            const mv = moves[idx];
            if (mv.player === 's1') {
              console.log(`X move ${mv.r},${mv.c}`);
              s1.emit('makeMove', { r: mv.r, c: mv.c });
            } else {
              console.log(`O move ${mv.r},${mv.c}`);
              s2.emit('makeMove', { r: mv.r, c: mv.c });
            }
            idx++;
          } else {
            clearInterval(interval);
          }
        }, 200); // gửi chậm 200ms để gateway xử lý kịp
      });

      // B4. Đợi gameOver
      s1.on('gameOver', (res) => {
        try {
          expect(res.winner).toBe('u1'); // u1 là X, phải thắng
          s1.disconnect();
          s2.disconnect();
          done();
        } catch (e) {
          s1.disconnect();
          s2.disconnect();
          done(e);
        }
      });

      // Nếu sau 15s chưa xong -> fail
      setTimeout(() => {
        s1.disconnect();
        s2.disconnect();
        done('timeout');
      }, 15000);
    }).catch(done);
  }, 20000);
});
