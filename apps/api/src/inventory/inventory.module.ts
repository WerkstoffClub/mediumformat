import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AiAssistService } from './ai-assist.service';
import { InventoryController } from './inventory.controller';

@Module({
  providers: [InventoryService, AiAssistService],
  controllers: [InventoryController],
  exports: [InventoryService],
})
export class InventoryModule {}
