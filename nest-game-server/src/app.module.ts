import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { Line98Module } from './line98/line98.module';
import { CaroModule } from './caro/caro.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/nest-game'),
    AuthModule,
    CaroModule,
    Line98Module
  ],
})
export class AppModule {}
