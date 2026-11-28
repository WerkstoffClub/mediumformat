import { Module } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { LocationStockService } from './location-stock.service';
import { LocationsController, StockTransfersController } from './locations.controller';

@Module({
  providers: [LocationsService, LocationStockService],
  controllers: [LocationsController, StockTransfersController],
  exports: [LocationsService, LocationStockService],
})
export class LocationsModule {}
