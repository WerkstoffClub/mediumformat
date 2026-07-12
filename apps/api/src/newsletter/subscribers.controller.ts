import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SubscribersService } from './subscribers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, STAFF_ROLES } from '@mf/shared';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';
import { SubscriberFilterDto } from './dto/filter.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('newsletter/subscribers')
export class SubscribersController {
  constructor(private svc: SubscribersService) {}

  @Roles(...STAFF_ROLES)
  @Get()
  list(@Query() f: SubscriberFilterDto) {
    return this.svc.findAll(f);
  }

  @Roles(...STAFF_ROLES)
  @Get('export.csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="subscribers.csv"')
  export() {
    return this.svc.exportCsv();
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post()
  create(@Body() body: CreateSubscriberDto) {
    return this.svc.create(body);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async import(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    return this.svc.importCsv(file.buffer.toString('utf8'));
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateSubscriberDto) {
    return this.svc.update(id, body);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post(':id/unsubscribe')
  unsubscribe(@Param('id') id: string) {
    return this.svc.unsubscribe(id);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
