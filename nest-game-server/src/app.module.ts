import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { GameGateway } from './game/game.gateway';
import { CaroGateway } from './game/caro.gateway';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/nest-game'),
    AuthModule,
    GameGateway,
    CaroGateway
  ],
})
export class AppModule {}
