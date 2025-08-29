import { Controller, Get } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CaroGameResult, CaroGameResultDocument } from './caro.schema';

@Controller('caro')
export class CaroController {
  constructor(
    @InjectModel(CaroGameResult.name)
    private readonly resultModel: Model<CaroGameResultDocument>,
  ) {}

  @Get('results')
  async getResults() {
    return this.resultModel.find().sort({ createdAt: -1 }).limit(50);
  }
}
