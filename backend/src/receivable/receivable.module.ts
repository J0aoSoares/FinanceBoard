import { Module } from '@nestjs/common';
import { ReceivableController } from './receivable.controller';
import { ReceivableService } from './receivable.service';

@Module({
  controllers: [ReceivableController],
  providers: [ReceivableService],
})
export class ReceivableModule {}
