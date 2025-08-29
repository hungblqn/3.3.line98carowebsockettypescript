// src/test/caro.gateway.spec.ts
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CaroModule } from '../caro/caro.module';
import { AddressInfo } from 'net';
import { io, Socket } from 'socket.io-client';
import * as jwt from 'jsonwebtoken';
import { getModelToken } from '@nestjs/mongoose';

function fakeToken(sub: string) {
  return jwt.sign({ sub }, 'secret', { algorithm: 'HS256' });
}

describe('CaroGateway Integration (mocked DB)', () => {
  let app: INestApplication;
  let url: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CaroModule],
    })
      .overrideProvider(getModelToken('CaroGameResult')) // mock Mongoose model
      .useValue({
        create: jest.fn(), // mock function
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    const server = app.getHttpServer();
    const address = server.listen(0).address() as AddressInfo;
    url = `http://localhost:${address.port}`;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('2 players queue and X wins with 5 in a row', (done) => {
    const s1: Socket = io(url, { transports: ['websocket'], query: { token: fakeToken('u1') } });
    const s2: Socket = io(url, { transports: ['websocket'], query: { token: fakeToken('u2') } });

    Promise.all([
      new Promise<void>((res, rej) => {
        s1.on('connect', res);
        setTimeout(() => rej('s1 connect timeout'), 3000);
      }),
      new Promise<void>((res, rej) => {
        s2.on('connect', res);
        setTimeout(() => rej('s2 connect timeout'), 3000);
      }),
    ])
      .then(() => {
        s1.emit('queue');
        s2.emit('queue');

        let queued = 0;
        function checkQueued() {
          queued++;
          if (queued === 2) console.log('Both players queued');
        }
        s1.on('queued', checkQueued);
        s2.on('queued', checkQueued);

        const moves: { player: 's1' | 's2'; r: number; c: number }[] = [
          { player: 's1', r: 7, c: 7 },
          { player: 's2', r: 0, c: 0 },
          { player: 's1', r: 7, c: 8 },
          { player: 's2', r: 0, c: 1 },
          { player: 's1', r: 7, c: 9 },
          { player: 's2', r: 0, c: 2 },
          { player: 's1', r: 7, c: 10 },
          { player: 's2', r: 0, c: 3 },
          { player: 's1', r: 7, c: 11 }, // X wins
        ];
        let idx = 0;

        s1.on('gameStart', () => console.log('s1 gameStart'));
        s2.on('gameStart', () => {
          console.log('s2 gameStart');
          const interval = setInterval(() => {
            if (idx < moves.length) {
              const mv = moves[idx];
              if (mv.player === 's1') s1.emit('makeMove', { r: mv.r, c: mv.c });
              else s2.emit('makeMove', { r: mv.r, c: mv.c });
              idx++;
            } else clearInterval(interval);
          }, 100);
        });

        s1.on('gameOver', (res) => {
          try {
            expect(res.winner).toBe('u1');
            s1.disconnect();
            s2.disconnect();
            done();
          } catch (e) {
            s1.disconnect();
            s2.disconnect();
            done(e);
          }
        });

        setTimeout(() => {
          s1.disconnect();
          s2.disconnect();
          done('timeout');
        }, 10000);
      })
      .catch(done);
  }, 15000);
});
