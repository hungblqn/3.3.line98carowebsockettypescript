import * as jwt from "jsonwebtoken";
import { GameState } from "../models/GameState";
import { connectDB } from "./database";
import {
    WebSocketGateway,
    SubscribeMessage,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

connectDB();

const SIZE = 9;
const COLORS = ["red", "blue", "green", "yellow", "purple"];

type Ball = string | null;
type NextBall = { r: number; c: number; color: string };

@WebSocketGateway({ cors: true })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private boards: Record<string, Ball[][]> = {};
    private nextBallsMap: Record<string, NextBall[]> = {};

    async handleConnection(client: Socket) {
        const token = client.handshake.query.token as string;
        if (!token) return client.disconnect();

        let userId: string;
        try {
            const decoded = jwt.decode(token) as { sub: string };
            userId = decoded.sub;
        } catch {
            return client.disconnect();
        }

        client.join(userId);

        // Kiểm tra DB trước
        let gameState = await GameState.findOne({ userId });
        if (gameState) {
            // Nếu đã có gameState thì dùng dữ liệu đó
            this.boards[userId] = gameState.board;
            this.nextBallsMap[userId] = gameState.nextBalls;
        } else {
            // Nếu chưa có dữ liệu, tạo mới
            const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
            this.boards[userId] = board;
            this.generateInitialBalls(userId);
            this.generateNextBalls(userId);

            // Lưu vào DB
            gameState = await GameState.create({
                userId,
                board: this.boards[userId],
                nextBalls: this.nextBallsMap[userId],
            });
        }

        client.emit("boardUpdate", { board: this.boards[userId], nextBalls: this.nextBallsMap[userId] });
    }
    @SubscribeMessage("resetGame")
    async handleReset(client: Socket, data: { token: string }) {
        const { token } = data;

        let userId: string;
        try {
            const decoded = jwt.decode(token) as { sub: string };
            userId = decoded.sub;
        } catch {
            return client.emit("error", "Token không hợp lệ");
        }

        // Tạo board mới
        const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
        this.boards[userId] = board;
        this.generateInitialBalls(userId);
        this.generateNextBalls(userId);

        // Cập nhật lại MongoDB
        let gameState = await GameState.findOne({ userId });
        if (!gameState) {
            gameState = await GameState.create({
                userId,
                board: this.boards[userId],
                nextBalls: this.nextBallsMap[userId],
            });
        } else {
            gameState.board = this.boards[userId];
            gameState.nextBalls = this.nextBallsMap[userId];
            await gameState.save();
        }

        // Gửi board mới về client
        this.server.to(userId).emit("boardUpdate", { board: this.boards[userId], nextBalls: this.nextBallsMap[userId] });
    }


    handleDisconnect(client: Socket) { }

    private generateInitialBalls(userId: string) {
        const board = this.boards[userId];
        const empty: [number, number][] = [];
        board.forEach((row, r) =>
            row.forEach((cell, c) => {
                if (!cell) empty.push([r, c]);
            })
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
            })
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

    private clearLines(board: Ball[][]): { newBoard: Ball[][]; cleared: boolean } {
        const newBoard = board.map((row) => [...row]);
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
            toClear.forEach((s) => {
                const [r, c] = s.split(",").map(Number);
                newBoard[r][c] = null;
            });
        }

        return { newBoard, cleared };
    }

    @SubscribeMessage("help")
    handleHelp(client: Socket) {
        const token = client.handshake.query.token as string;
        if (!token) return;

        let userId: string;
        try {
            const decoded = jwt.decode(token) as { sub: string };
            userId = decoded.sub;
        } catch {
            return;
        }

        const board = this.boards[userId];
        if (!board) return;

        const balls: [number, number][] = [];
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (board[r][c]) balls.push([r, c]);
            }
        }
        if (balls.length === 0) return;

        const shuffledBalls = balls.sort(() => Math.random() - 0.5);

        for (const from of shuffledBalls) {
            const empties: [number, number][] = [];
            for (let r = 0; r < SIZE; r++) {
                for (let c = 0; c < SIZE; c++) {
                    if (!board[r][c]) empties.push([r, c]);
                }
            }
            const shuffledEmpties = empties.sort(() => Math.random() - 0.5);

            for (const to of shuffledEmpties) {
                if (this.findPath(from, to, board)) {
                    client.emit("help", { from, to });
                    return;
                }
            }
        }
    }

    @SubscribeMessage("moveBall")
    async handleMove(client: Socket, data: { from: [number, number]; to: [number, number]; token: string }) {
        const { from, to, token } = data;

        let userId: string;
        try {
            const decoded = jwt.decode(token) as { sub: string };
            userId = decoded.sub;
        } catch {
            return client.emit("error", "Token không hợp lệ");
        }

        if (from[0] === to[0] && from[1] === to[1]) {
            return client.emit("error", "Không thể di chuyển vào ô đang chọn!");
        }

        const board = this.boards[userId];
        const path = this.findPath(from, to, board);
        if (!path) {
            return client.emit("error", "Không thể di chuyển tới ô này!");
        }

        let tempBoard = board.map(row => [...row]);

        for (let i = 1; i < path.length; i++) {
            const [pr, pc] = path[i - 1];
            const [r, c] = path[i];

            tempBoard[r][c] = tempBoard[pr][pc];
            tempBoard[pr][pc] = null;

            client.emit("pathStep", { board: tempBoard.map(row => [...row]) });
            await new Promise(res => setTimeout(res, 70));
        }

        this.boards[userId] = tempBoard;

        const { newBoard, cleared } = this.clearLines(tempBoard);
        this.boards[userId] = newBoard;

        if (!cleared) {
            this.nextBallsMap[userId].forEach(b => {
                if (!this.boards[userId][b.r][b.c]) this.boards[userId][b.r][b.c] = b.color;
            });
            this.nextBallsMap[userId] = [];
            this.generateNextBalls(userId);

            const { newBoard: finalBoard } = this.clearLines(this.boards[userId]);
            this.boards[userId] = finalBoard;
        }

        // Lưu vào MongoDB
        let gameState = await GameState.findOne({ userId });
        if (!gameState) {
            gameState = await GameState.create({ userId, board: this.boards[userId], nextBalls: this.nextBallsMap[userId] });
        } else {
            gameState.board = this.boards[userId];
            gameState.nextBalls = this.nextBallsMap[userId];
            await gameState.save();
        }

        this.server.to(userId).emit("boardUpdate", { board: this.boards[userId], nextBalls: this.nextBallsMap[userId] });
    }
}
