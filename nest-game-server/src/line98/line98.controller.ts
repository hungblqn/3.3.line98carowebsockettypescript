import { Controller, Get, Param } from '@nestjs/common';
import { Line98Service } from './line98.service';

@Controller('line98')
export class Line98Controller {
  constructor(private readonly line98Service: Line98Service) {}

  @Get(':userId')
  async getGame(@Param('userId') userId: string) {
    return await this.line98Service.initGame(userId);
  }
}
