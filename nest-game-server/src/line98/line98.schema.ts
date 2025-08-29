import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type Line98Document = Line98 & Document;

@Schema()
export class Line98 {
  @Prop({ required: true })
  userId: string;

  @Prop({ type: [[String]], required: true })
  board: (string | null)[][];

  @Prop({
    type: [
      {
        r: Number,
        c: Number,
        color: String,
      },
    ],
    required: true,
  })
  nextBalls: { r: number; c: number; color: string }[];
}

export const Line98Schema = SchemaFactory.createForClass(Line98);
