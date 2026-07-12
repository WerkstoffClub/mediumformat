import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@mf/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('integrations/upload')
export class UploadController {
  constructor(private uploads: UploadService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('audio')
  @UseInterceptors(FileInterceptor('file'))
  audio(@UploadedFile() file: Express.Multer.File): { url: string } {
    if (!file) throw new BadRequestException('No file provided');
    return this.uploads.saveAudio(file);
  }
}
