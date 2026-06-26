import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateProfileDto, updateProfileSchema } from './dto/update-profile.dto';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('profile')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getProfile(@CurrentUser('sub') userId: string) {
    return this.profileService.getProfile(userId);
  }

  @Patch()
  @UsePipes(new ZodValidationPipe(updateProfileSchema))
  async updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(userId, dto);
  }
}
