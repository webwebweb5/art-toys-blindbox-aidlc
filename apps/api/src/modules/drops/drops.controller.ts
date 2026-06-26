import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../account/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../account/auth/guards/roles.guard';
import { Roles } from '../account/auth/decorators/roles.decorator';
import { CurrentUser } from '../account/auth/decorators/current-user.decorator';
import { DropsService } from './drops.service';
import { QueueService } from './queue/queue.service';
import { CreateDropDto } from './dto/create-drop.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DropsController {
  constructor(
    private readonly dropsService: DropsService,
    private readonly queueService: QueueService,
  ) {}

  @Post('admin/drops')
  @Roles('ADMIN')
  async createDrop(@Body() dto: CreateDropDto) {
    return this.dropsService.create(dto);
  }

  @Get('drops/active')
  async getActive() {
    return this.dropsService.getActive();
  }

  @Post('drops/:id/enter')
  async enterQueue(
    @CurrentUser('id') userId: string,
    @Param('id') dropId: string,
  ) {
    const position = await this.queueService.enter(userId, dropId);
    return {
      position,
      estimatedWaitMinutes: Math.ceil(position / 30), // ~30 people processed per minute
    };
  }

  @Get('drops/:id/position')
  async getPosition(
    @CurrentUser('id') userId: string,
    @Param('id') dropId: string,
  ) {
    const position = await this.queueService.getPosition(userId, dropId);
    return {
      position,
      estimatedWaitMinutes: Math.ceil(position / 30),
      status: position === 0 ? 'WINDOW_GRANTED' : 'WAITING',
    };
  }
}
