import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SIZE = 9;
const socket = io("http://localhost:3000", {
  query: { token: localStorage.getItem("token") || "" },
});

type Ball = string | null;
type NextBall = { r: number; c: number; color: string };
type BoardUpdate = { board: Ball[][]; nextBalls: NextBall[] };

export default function Line98() {
  const [board, setBoard] = useState<Ball[][]>(
    Array(SIZE)
      .fill(null)
      .map(() => Array(SIZE).fill(null))
  );
  const [nextBalls, setNextBalls] = useState<NextBall[]>([]);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [hint, setHint] = useState<{ from: [number, number]; to: [number, number] } | null>(null);

  useEffect(() => {
    socket.on("boardUpdate", ({ board, nextBalls }: BoardUpdate) => {
      setBoard(board);
      setNextBalls(nextBalls);
    });

    socket.on("pathStep", (data: { board: Ball[][] }) => {
      setBoard(data.board);
    });

    socket.on("help", (data: { from: [number, number]; to: [number, number] }) => {
      setHint(data);
    });

    socket.on("error", (msg: string) => alert(msg));

    return () => {
      socket.off("boardUpdate");
      socket.off("pathStep");
      socket.off("help");
      socket.off("error");
    };
  }, []);

  const handleClick = (r: number, c: number) => {
    if (selected) {
      if (selected[0] === r && selected[1] === c) {
        alert("Không thể di chuyển vào ô đang chọn!");
        return;
      }
      const token = localStorage.getItem("token");
      socket.emit("moveBall", { from: selected, to: [r, c], token });
      setSelected(null);
      setHint(null);
    } else if (board[r][c]) {
      setSelected([r, c]);
    }
  };

  const resetGame = () => {
    const token = localStorage.getItem("token");
    if (!token) return alert("Bạn chưa đăng nhập!");
  
    socket.emit("resetGame", { token });
  };

  const requestHelp = () => {
    socket.emit("help");
  };

  return (
    <div className="w-screen h-screen flex flex-col items-center bg-blue-100">
      <h1 className="text-2xl font-bold mb-4">Line98 Game</h1>
      <button className="mb-4 px-4 py-2 bg-green-300 rounded" onClick={requestHelp}>
        Help
      </button>
      <button className="mb-4 px-4 py-2 bg-green-300 rounded" onClick={resetGame}>
        Reset Game
      </button>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${SIZE}, 40px)`,
          gap: 2,
        }}
      >
        {board.map((row, r) =>
          row.map((cell, c) => {
            const isSelected = selected && selected[0] === r && selected[1] === c;
            const isHintFrom = hint && hint.from[0] === r && hint.from[1] === c;
            const isHintTo = hint && hint.to[0] === r && hint.to[1] === c;
            const nextBall = nextBalls.find((b) => b.r === r && b.c === c);

            return (
              <div
                key={`${r}-${c}`}
                onClick={() => handleClick(r, c)}
                className={`relative w-10 h-10 border flex items-center justify-center
                  ${isSelected ? "border-black" : "border-gray-300"}
                  ${isHintFrom || isHintTo ? "bg-red-200" : "bg-white"}`}
              >
                {cell && (
                  <div
                    className={`rounded-full ${isSelected || isHintFrom ? "w-8 h-8" : "w-7 h-7"}`}
                    style={{ backgroundColor: cell }}
                  ></div>
                )}
                {nextBall && (
                  <div
                    className="absolute w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: nextBall.color }}
                  ></div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
