export type Color = "red" | "blue" | "green" | "yellow" | "purple";
export type Ball = { x: number; y: number; color: Color };
export type Board = (Color | null)[][];

export function createEmptyBoard(): Board {
  return Array.from({ length: 9 }, () => Array(9).fill(null));
}

export function spawnBalls(board: Board, count: number = 3): Board {
  const emptyCells: [number, number][] = [];
  board.forEach((row, y) =>
    row.forEach((cell, x) => {
      if (!cell) emptyCells.push([x, y]);
    })
  );
  const newBoard = board.map(r => [...r]);
  for (let i = 0; i < count && emptyCells.length > 0; i++) {
    const idx = Math.floor(Math.random() * emptyCells.length);
    const [x, y] = emptyCells.splice(idx, 1)[0];
    const colors: Color[] = ["red", "blue", "green", "yellow", "purple"];
    newBoard[y][x] = colors[Math.floor(Math.random() * colors.length)];
  }
  return newBoard;
}

// Kiểm tra hàng 5 để xoá
export function checkLines(board: Board): { toRemove: [number, number][] } {
  const toRemove: [number, number][] = [];
  const dirs = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const color = board[y][x];
      if (!color) continue;
      for (const [dx, dy] of dirs) {
        let count = 1;
        const cells: [number, number][] = [[x, y]];
        for (let step = 1; step < 5; step++) {
          const nx = x + dx * step;
          const ny = y + dy * step;
          if (nx < 0 || ny < 0 || nx >= 9 || ny >= 9) break;
          if (board[ny][nx] === color) {
            count++;
            cells.push([nx, ny]);
          } else break;
        }
        if (count >= 5) toRemove.push(...cells);
      }
    }
  }
  return { toRemove };
}
