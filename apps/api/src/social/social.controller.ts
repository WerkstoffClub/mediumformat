import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@mf/shared';
import { SocialService } from './social.service';
import { UpdateSocialSettingsDto } from './dto/update-social-settings.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
@Controller('social')
export class SocialController {
  constructor(private social: SocialService) {}

  @Get('settings')
  getSettings() {
    return this.social.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() dto: UpdateSocialSettingsDto) {
    return this.social.updateSettings(dto);
  }

  @Get('listings')
  listings() {
    return this.social.listings();
  }
}
