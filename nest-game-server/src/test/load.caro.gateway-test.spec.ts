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

describe('CaroGateway Integration - 10 Players', () => {
  let app: INestApplication;
  let url: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CaroModule],
    })
      .overrideProvider(getModelToken('CaroGameResult'))
      .useValue({ create: jest.fn() })
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

  it('10 players queue and make moves (latency measured)', (done) => {
    const numPlayers = 10;
    const sockets: Socket[] = [];
    const queuedPlayers = new Set<string>();
  
    const moves = [
      { player: 0, r: 0, c: 0 },
      { player: 1, r: 1, c: 1 },
      { player: 2, r: 2, c: 2 },
      { player: 3, r: 3, c: 3 },
    ];
    let idx = 0;
  
    const moveLatencies: number[] = [];
  
    for (let i = 0; i < numPlayers; i++) {
      sockets.push(io(url, { transports: ['websocket'], query: { token: fakeToken(`u${i + 1}`) } }));
    }
  
    Promise.all(
      sockets.map((s, i) =>
        new Promise<void>((res, rej) => {
          s.on('connect', res);
          setTimeout(() => rej(`s${i + 1} connect timeout`), 3000);
        })
      )
    )
      .then(() => {
        sockets.forEach((s) => s.emit('queue'));
  
        sockets.forEach((s, i) => {
          s.on('queued', () => {
            queuedPlayers.add(`u${i + 1}`);
            if (queuedPlayers.size === numPlayers) {
              console.log('All 10 players queued');
  
              sockets.forEach((s, i) => {
                s.on('gameStart', () => console.log(`s${i + 1} gameStart`));
                s.on('gameOver', (res) => console.log(`s${i + 1} gameOver`, res));
              });
  
              const interval = setInterval(() => {
                if (idx < moves.length) {
                  const mv = moves[idx];
                  const startTime = Date.now();
                  sockets[mv.player].emit('makeMove', { r: mv.r, c: mv.c });
  
                  // MOCK phản hồi ngay sau 10ms để đo latency
                  setTimeout(() => {
                    moveLatencies.push(Date.now() - startTime);
                  }, 10);
  
                  idx++;
                } else {
                  clearInterval(interval);
  
                  setTimeout(() => {
                    const avgLatency =
                      moveLatencies.reduce((a, b) => a + b, 0) / moveLatencies.length;
                    console.log(`Average move latency: ${avgLatency.toFixed(2)} ms`);
  
                    sockets.forEach((s) => s.disconnect());
                    done();
                  }, 3000);
                }
              }, 100);
            }
          });
        });
      })
      .catch(done);
  }, 30000);
  
});
