import { Module } from '@nestjs/common';
import { DealposClient } from './dealpos.client';
import { DealposSyncService } from './dealpos-sync.service';
import { DealposController } from './dealpos.controller';

@Module({
  providers: [DealposClient, DealposSyncService],
  controllers: [DealposController],
  exports: [DealposSyncService],
})
export class DealposModule {}
