// src/models/CaroGameResult.ts
import { Schema, model, Document } from 'mongoose';

export interface ICaroGameResult extends Document {
  winner: string;       // id người thắng
  loser: string;        // id người thua
  createdAt: Date;      // thời gian kết thúc trận
}

const caroGameResultSchema = new Schema<ICaroGameResult>({
  winner: { type: String, required: true },
  loser: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const CaroGameResult = model<ICaroGameResult>('CaroGameResult', caroGameResultSchema);
