import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { Role, STAFF_ROLES } from '@mf/shared';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ConsolidationsService } from './consolidations.service';
import { CreateConsolidationDto } from './dto/create-consolidation.dto';
import { UpdateConsolidationDto } from './dto/update-consolidation.dto';
import { AttachOrderDto } from './dto/attach-order.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('consolidations')
export class ConsolidationsController {
  constructor(private consolidations: ConsolidationsService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post()
  create(@Body() body: CreateConsolidationDto) {
    return this.consolidations.create(body);
  }

  @Roles(...STAFF_ROLES)
  @Get()
  findAll() {
    return this.consolidations.findAll();
  }

  @Roles(...STAFF_ROLES)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.consolidations.findOne(id);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Put(':id')
  update(@Param('id') id: string, @Body() body: UpdateConsolidationDto) {
    return this.consolidations.update(id, body);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post(':id/orders')
  attachOrder(@Param('id') id: string, @Body() body: AttachOrderDto) {
    return this.consolidations.attachOrder(id, body.importOrderId);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Delete(':id/orders/:orderId')
  detachOrder(@Param('id') id: string, @Param('orderId') orderId: string) {
    return this.consolidations.detachOrder(id, orderId);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post(':id/allocate')
  allocate(@Param('id') id: string) {
    return this.consolidations.allocate(id);
  }
}
