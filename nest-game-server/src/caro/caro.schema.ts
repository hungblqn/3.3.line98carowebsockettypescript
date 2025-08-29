import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CaroGameResultDocument = CaroGameResult & Document;

@Schema({ timestamps: true })
export class CaroGameResult {
  @Prop({ required: true })
  winner: string;

  @Prop({ required: true })
  loser: string;
}

export const CaroGameResultSchema = SchemaFactory.createForClass(CaroGameResult);
