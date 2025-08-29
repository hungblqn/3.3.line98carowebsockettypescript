import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CaroGateway } from './caro.gateway';
import { CaroService } from './caro.service';
import { CaroGameResult, CaroGameResultSchema } from './caro.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CaroGameResult.name, schema: CaroGameResultSchema },
    ]),
  ],
  providers: [CaroGateway, CaroService],
})
export class CaroModule {}
