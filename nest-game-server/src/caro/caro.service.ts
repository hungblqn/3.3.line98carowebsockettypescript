import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CaroGameResult, CaroGameResultDocument } from './caro.schema';

const SIZE = 15;

export type Cell = 'X' | 'O' | null;

@Injectable()
export class CaroService {
  constructor(
    @InjectModel(CaroGameResult.name)
    private readonly resultModel: Model<CaroGameResultDocument>,
  ) {}

  async saveResult(winner: string, loser: string) {
    try {
      await this.resultModel.create({ winner, loser });
      console.log(`Saved result: winner=${winner}, loser=${loser}`);
    } catch (err) {
      console.error('Failed to save game result:', err);
    }
  }

  checkWin(board: Cell[][], r: number, c: number, mark: 'X' | 'O'): boolean {
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
