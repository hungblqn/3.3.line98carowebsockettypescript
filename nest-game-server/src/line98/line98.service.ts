import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Line98, Line98Document } from './line98.schema';

const SIZE = 9;
const COLORS = ['red', 'blue', 'green', 'yellow', 'purple'];
type Ball = string | null;
type NextBall = { r: number; c: number; color: string };

@Injectable()
export class Line98Service {
    private boards: Record<string, Ball[][]> = {};
    private nextBallsMap: Record<string, NextBall[]> = {};

    constructor(
        @InjectModel(Line98.name) private line98Model: Model<Line98Document>,
    ) { }

    async initGame(userId: string) {
        let gameState = await this.line98Model.findOne({ userId });

        if (gameState) {
            this.boards[userId] = gameState.board;
            this.nextBallsMap[userId] = gameState.nextBalls;
        } else {
            const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
            this.boards[userId] = board;
            this.generateInitialBalls(userId);
            this.generateNextBalls(userId);

            await this.line98Model.create({
                userId,
                board: this.boards[userId],
                nextBalls: this.nextBallsMap[userId],
            });
        }

        return {
            board: this.boards[userId],
            nextBalls: this.nextBallsMap[userId],
        };
    }

    updateBoardStep(userId: string, board: Ball[][]) {
        this.boards[userId] = board.map(row => [...row]);
    }


    async resetGame(userId: string) {
        const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
        this.boards[userId] = board;
        this.generateInitialBalls(userId);
        this.generateNextBalls(userId);

        await this.line98Model.updateOne(
            { userId },
            { board: this.boards[userId], nextBalls: this.nextBallsMap[userId] },
            { upsert: true },
        );

        return {
            board: this.boards[userId],
            nextBalls: this.nextBallsMap[userId],
        };
    }

    private generateInitialBalls(userId: string) {
        const board = this.boards[userId];
        const empty: [number, number][] = [];
        board.forEach((row, r) =>
            row.forEach((cell, c) => {
                if (!cell) empty.push([r, c]);
            }),
        );

        for (let i = 0; i < 5 && empty.length > 0; i++) {
            const idx = Math.floor(Math.random() * empty.length);
            const [r, c] = empty.splice(idx, 1)[0];
            board[r][c] = COLORS[Math.floor(Math.random() * COLORS.length)];
        }
    }

    private generateNextBalls(userId: string) {
        const board = this.boards[userId];
        const empty: [number, number][] = [];
        board.forEach((row, r) =>
            row.forEach((cell, c) => {
                if (!cell) empty.push([r, c]);
            }),
        );

        const balls: NextBall[] = [];
        const newEmpty = [...empty];
        for (let i = 0; i < 3 && newEmpty.length > 0; i++) {
            const idx = Math.floor(Math.random() * newEmpty.length);
            const [r, c] = newEmpty.splice(idx, 1)[0];
            balls.push({ r, c, color: COLORS[Math.floor(Math.random() * COLORS.length)] });
        }

        this.nextBallsMap[userId] = balls;
    }

    private clearLines(board: Ball[][]): { newBoard: Ball[][]; cleared: boolean } {
        const newBoard = board.map(row => [...row]);
        let cleared = false;

        const checkDir = (r: number, c: number, dr: number, dc: number) => {
            const color = newBoard[r][c];
            if (!color) return [];
            const path: [number, number][] = [[r, c]];
            for (let i = 1; i < SIZE; i++) {
                const nr = r + dr * i;
                const nc = c + dc * i;
                if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) break;
                if (newBoard[nr][nc] === color) path.push([nr, nc]);
                else break;
            }
            return path.length >= 5 ? path : [];
        };

        const toClear: Set<string> = new Set();
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (!newBoard[r][c]) continue;
                const dirs = [
                    [0, 1],
                    [1, 0],
                    [1, 1],
                    [1, -1],
                ];
                dirs.forEach(([dr, dc]) => {
                    checkDir(r, c, dr, dc).forEach(([rr, cc]) => toClear.add(`${rr},${cc}`));
                });
            }
        }

        if (toClear.size > 0) {
            cleared = true;
            toClear.forEach(s => {
                const [r, c] = s.split(',').map(Number);
                newBoard[r][c] = null;
            });
        }

        return { newBoard, cleared };
    }

    async moveBall(userId: string, from: [number, number], to: [number, number]) {
        const board = this.boards[userId];
        const path = this.findPath(from, to, board);
        if (!path) return null;

        const [fr, fc] = from;
        const color = board[fr][fc]; // color of the ball being moved

        return {
            path,
            color,
            board: board.map(row => [...row]),
            nextBalls: this.nextBallsMap[userId],
        };
    }

    async finalizeMove(userId: string, path: [number, number][], color: string) {
        const board = this.boards[userId];
        const [tr, tc] = path[path.length - 1];
        board[tr][tc] = color;

        const { newBoard, cleared } = this.clearLines(board);
        this.boards[userId] = newBoard;

        if (!cleared) {
            this.nextBallsMap[userId].forEach(b => {
                if (!this.boards[userId][b.r][b.c]) this.boards[userId][b.r][b.c] = b.color;
            });
            this.generateNextBalls(userId);

            const result = this.clearLines(this.boards[userId]);
            this.boards[userId] = result.newBoard;
        }

        await this.line98Model.updateOne(
            { userId },
            { board: this.boards[userId], nextBalls: this.nextBallsMap[userId] },
        );

        return { board: this.boards[userId], nextBalls: this.nextBallsMap[userId] };
    }

    private findPath(from: [number, number], to: [number, number], board: Ball[][]): [number, number][] | null {
        const [r0, c0] = from;
        const [r1, c1] = to;
        const visited = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
        const prev: ([number, number] | null)[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
        const queue: [number, number][] = [[r0, c0]];
        visited[r0][c0] = true;

        const directions = [
            [0, 1],
            [1, 0],
            [0, -1],
            [-1, 0],
        ];

        while (queue.length > 0) {
            const [r, c] = queue.shift()!;
            if (r === r1 && c === c1) break;

            for (const [dr, dc] of directions) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !board[nr][nc] && !visited[nr][nc]) {
                    visited[nr][nc] = true;
                    prev[nr][nc] = [r, c];
                    queue.push([nr, nc]);
                }
            }
        }

        if (!visited[r1][c1]) return null;

        const path: [number, number][] = [];
        let cur: [number, number] | null = [r1, c1];
        while (cur) {
            path.push(cur);
            const [cr, cc] = cur;
            cur = prev[cr][cc];
        }
        return path.reverse();
    }
}
