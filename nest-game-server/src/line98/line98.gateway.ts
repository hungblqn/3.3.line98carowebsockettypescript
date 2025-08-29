import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    MessageBody,
    ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { Line98Service } from './line98.service';

@WebSocketGateway({ cors: true })
export class Line98Gateway implements OnGatewayConnection {
    @WebSocketServer()
    server: Server;

    constructor(private readonly line98Service: Line98Service) { }

    async handleConnection(client: Socket) {
        try {
            const token = client.handshake.query.token as string;
            const payload = jwt.verify(token, "SECRET_KEY") as { sub: string };
            console.log(payload);
            const userId = payload.sub;
            client.data.userId = userId;

            const state = await this.line98Service.initGame(userId);
            client.emit('boardUpdate', state);
        } catch (e) {
            client.emit('error', 'Invalid token');
            client.disconnect();
        }
    }

    @SubscribeMessage('moveBall')
    async handleMove(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { from: [number, number]; to: [number, number] },
    ) {
        const userId = client.data.userId;
        const state = await this.line98Service.moveBall(userId, data.from, data.to);

        if (!state) {
            client.emit('error', 'Invalid move');
            return;
        }

        const { path, color, board, nextBalls } = state;
        const tempBoard = board.map(row => [...row]);

        for (let i = 1; i < path.length; i++) {
            const [prevR, prevC] = path[i - 1];
            const [r, c] = path[i];
        
            tempBoard[prevR][prevC] = null;
            tempBoard[r][c] = color;
        
            this.line98Service.updateBoardStep(userId, tempBoard); // cập nhật board thực
            client.emit('boardUpdate', { board: tempBoard.map(row => [...row]), nextBalls });
            await new Promise(res => setTimeout(res, 70));
        }
        

        const finalState = await this.line98Service.finalizeMove(userId, path, color as string);
        client.emit('boardUpdate', finalState);
    }

    @SubscribeMessage('resetGame')
    async handleReset(@ConnectedSocket() client: Socket,) {
        const userId = client.data.userId;
        const state = await this.line98Service.resetGame(userId);
        client.emit('boardUpdate', state);
    }

    @SubscribeMessage('help')
    async handleHelp(@ConnectedSocket() client: Socket) {
        const userId = client.data.userId;
        const board = this.line98Service['boards'][userId];

        // Lấy tất cả các ô có bóng
        const balls: [number, number][] = [];
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[r].length; c++) {
                if (board[r][c]) balls.push([r, c]);
            }
        }

        // Trộn mảng để chọn ngẫu nhiên
        for (let i = balls.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [balls[i], balls[j]] = [balls[j], balls[i]];
        }

        // Tìm bóng có thể đi tới ít nhất 1 ô
        for (const ball of balls) {
            const emptyCells: [number, number][] = [];
            for (let r = 0; r < board.length; r++) {
                for (let c = 0; c < board[r].length; c++) {
                    if (!board[r][c]) emptyCells.push([r, c]);
                }
            }

            // Trộn ô trống để random
            for (let i = emptyCells.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [emptyCells[i], emptyCells[j]] = [emptyCells[j], emptyCells[i]];
            }

            for (const target of emptyCells) {
                const path = this.line98Service['findPath'](ball, target, board);
                if (path) {
                    client.emit('help', { from: ball, to: target });
                    return;
                }
            }
        }

        // Nếu không tìm thấy đường đi
        client.emit('help', null);
    }

}
