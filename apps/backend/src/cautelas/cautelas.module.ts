import { Module } from '@nestjs/common';
import { CautelasService } from './cautelas.service';
import { CautelasController } from './cautelas.controller';

@Module({
  providers: [CautelasService],
  controllers: [CautelasController],
})
export class CautelasModule {}
