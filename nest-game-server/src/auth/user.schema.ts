import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop({ unique: true, required: true })
  username: string; // nickname

  @Prop({ required: true })
  password: string;

  @Prop({ unique: true, sparse: true })
  email?: string;
}


export const UserSchema = SchemaFactory.createForClass(User);
