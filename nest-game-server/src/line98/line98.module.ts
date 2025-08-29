import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Line98, Line98Schema } from './line98.schema';
import { Line98Service } from './line98.service';
import { Line98Gateway } from './line98.gateway';
import { Line98Controller } from './line98.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Line98.name, schema: Line98Schema }]),
  ],
  providers: [Line98Service, Line98Gateway],
  controllers: [Line98Controller],
})
export class Line98Module {}
