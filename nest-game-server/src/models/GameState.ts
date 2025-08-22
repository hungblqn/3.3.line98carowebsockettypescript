import { Schema, model, Document } from "mongoose";

interface IGameState extends Document {
  userId: string;
  board: (string | null)[][];
  nextBalls: { r: number; c: number; color: string }[];
}

const GameStateSchema = new Schema<IGameState>({
  userId: { type: String, required: true, unique: true },
  board: { type: [[String]], required: true }, // 2D array of colors or null
  nextBalls: [
    {
      r: { type: Number, required: true },
      c: { type: Number, required: true },
      color: { type: String, required: true },
    },
  ],
});

export const GameState = model<IGameState>("GameState", GameStateSchema);
