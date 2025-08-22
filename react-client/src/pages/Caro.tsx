import React, { useEffect, useState, useRef } from "react";
import io, { Socket } from "socket.io-client";

type Cell = "X" | "O" | null;

interface GameStartPayload {
  roomId: string;
  mark: "X" | "O";
  turn: string;
}

interface BoardUpdatePayload {
  board: Cell[][];
  turn: string;
}

interface GameOverPayload {
  winner: string;
  board: Cell[][];
}

const SIZE = 15;

export default function Caro() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [board, setBoard] = useState<Cell[][]>(
    Array.from({ length: SIZE }, () => Array<Cell>(SIZE).fill(null))
  );
  const [userId, setUserId] = useState(""); 
  const userIdRef = useRef(""); // giữ userId luôn mới nhất

  const [roomId, setRoomId] = useState("");
  const [mark, setMark] = useState<"X" | "O" | null>(null);
  const [turn, setTurn] = useState("");
  const [status, setStatus] = useState("Chưa vào hàng đợi");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setStatus("Chưa đăng nhập hoặc chưa có token");
      return;
    }

    const s = io("http://localhost:3000", {
      query: { token },
      transports: ["websocket"],
    });
    setSocket(s);

    s.on("connected", (data: { userId: string }) => {
      setUserId(data.userId);
      userIdRef.current = data.userId; 
      setStatus(`Đã kết nối socket với userId ${data.userId}`);
    });

    s.on("queued", () => setStatus("Đang chờ người chơi khác..."));

    s.on("gameStart", (data: GameStartPayload) => {
      setRoomId(data.roomId);
      setMark(data.mark);
      setTurn(data.turn);
      setBoard(Array.from({ length: SIZE }, () => Array<Cell>(SIZE).fill(null)));
      setStatus(`Trò chơi bắt đầu! Bạn là ${data.mark}`);
    });

    s.on("boardUpdate", (data: BoardUpdatePayload) => {
      setBoard(data.board);
      setTurn(data.turn);
    });

    s.on("gameOver", (data: GameOverPayload) => {
      console.log("Game over:", data, "my userId:", userIdRef.current);
      setBoard(data.board);
      if (data.winner === userIdRef.current) {
        setStatus("Bạn thắng!");
      } else {
        setStatus("Bạn thua!");
      }
      setTurn("");
    });

    s.on("opponentLeft", () => {
      setStatus("Đối thủ đã thoát, bạn thắng!");
      setTurn("");
    });

    s.on("error", (msg: string) => alert(msg));

    return () => s.disconnect();
  }, []);

  const handleQueue = () => {
    if (socket) socket.emit("queue");
  };

  const handleMove = (r: number, c: number) => {
    if (!socket || !mark || turn !== userIdRef.current) return;
    if (board[r][c]) return;
    socket.emit("makeMove", { r, c });
  };

  return (
    <div className="p-4 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-2">Game Caro Online</h1>
      <p className="mb-4">{status}</p>
      {!mark && (
        <button
          onClick={handleQueue}
          className="mb-4 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Queue
        </button>
      )}
      {mark && (
        <>
          <div
            className="grid select-none"
            style={{ gridTemplateColumns: `repeat(${SIZE}, 32px)`, lineHeight: "1" }}
          >
            {board.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  onClick={() => handleMove(r, c)}
                  className="w-8 h-8 border border-gray-400 flex items-center justify-center cursor-pointer text-lg font-bold leading-none"
                >
                  {cell}
                </div>
              ))
            )}
          </div>
          <p className="mt-4">
            Bạn là: <span className="font-bold">{mark}</span>{" "}
            {turn === userIdRef.current ? "(Lượt của bạn)" : ""}
          </p>
        </>
      )}
    </div>
  );
}
