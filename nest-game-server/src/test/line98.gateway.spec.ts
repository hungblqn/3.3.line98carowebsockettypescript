// line98.game.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Line98Service } from '../line98/line98.service';
import { Line98 } from '../line98/line98.schema';

describe('Line98 Game Logic', () => {
  let service: Line98Service;
  let model: any;

  beforeEach(async () => {
    const mockModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Line98Service,
        { provide: getModelToken(Line98.name), useValue: mockModel },
      ],
    }).compile();

    service = module.get<Line98Service>(Line98Service);
    model = module.get(getModelToken(Line98.name));
  });

  it('initGame: tạo ván mới nếu chưa có', async () => {
    model.findOne.mockResolvedValue(null);
    model.create.mockResolvedValue({});

    const state = await service.initGame('user1');

    expect(model.findOne).toHaveBeenCalledWith({ userId: 'user1' });
    expect(model.create).toHaveBeenCalled();
    expect(state.board).toHaveLength(9);
    expect(state.nextBalls.length).toBeGreaterThan(0);
  });

  it('initGame: load ván cũ nếu tồn tại', async () => {
    const existing = {
      userId: 'user1',
      board: Array.from({ length: 9 }, () => Array(9).fill(null)),
      nextBalls: [{ r: 0, c: 0, color: 'red' }],
    };
    model.findOne.mockResolvedValue(existing);

    const state = await service.initGame('user1');

    expect(state.board).toEqual(existing.board);
    expect(state.nextBalls).toEqual(existing.nextBalls);
  });

  it('resetGame: phải tạo lại bàn 9x9 và 3 bóng kế tiếp', async () => {
    model.updateOne.mockResolvedValue({});
    const state = await service.resetGame('user1');

    expect(model.updateOne).toHaveBeenCalledWith(
      { userId: 'user1' },
      expect.any(Object),
      { upsert: true },
    );
    expect(state.board).toHaveLength(9);
    expect(state.nextBalls).toHaveLength(3);
  });

  it('moveBall: trả về null nếu không có đường đi', async () => {
    const fullBoard = Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => 'red'),
    );
    (service as any).boards['user1'] = fullBoard;

    const res = await service.moveBall('user1', [0, 0], [8, 8]);
    expect(res).toBeNull();
  });

  it('moveBall + finalizeMove: di chuyển hợp lệ và cập nhật bàn cờ', async () => {
    // bảng trống ngoại trừ 1 bóng
    const board = Array.from({ length: 9 }, () => Array(9).fill(null));
    board[0][0] = 'blue';
    (service as any).boards['user1'] = board;
    (service as any).nextBallsMap['user1'] = [
      { r: 1, c: 1, color: 'red' },
      { r: 2, c: 2, color: 'green' },
      { r: 3, c: 3, color: 'yellow' },
    ];
    model.updateOne.mockResolvedValue({});

    const moveState = await service.moveBall('user1', [0, 0], [0, 1]);
    expect(moveState).not.toBeNull();
    expect(moveState!.path).toEqual([[0,0],[0,1]]);
    expect(moveState!.color).toBe('blue');

    const final = await service.finalizeMove('user1', moveState!.path, 'blue');
    expect(final.board[0][1]).toBe('blue'); // bóng đã di chuyển
    expect(model.updateOne).toHaveBeenCalled(); // state được lưu lại
  });

  it('finalizeMove: phải clear line nếu đủ 5 quả liên tiếp', async () => {
    // tạo hàng ngang đủ 5 quả đỏ
    const board = Array.from({ length: 9 }, () => Array(9).fill(null));
    for (let c = 0; c < 5; c++) board[0][c] = 'red';
    (service as any).boards['user1'] = board;
    (service as any).nextBallsMap['user1'] = [];
    model.updateOne.mockResolvedValue({});

    // Gọi clear gián tiếp qua finalizeMove
    const path: [number,number][] = [[0,4]]; // di chuyển quả cuối để tạo line
    const res = await service.finalizeMove('user1', path, 'red');

    // Sau khi clear, hàng đầu tiên phải trống
    const clearedRow = res.board[0].slice(0,5);
    expect(clearedRow.every(cell => cell === null)).toBe(true);
  });
});
