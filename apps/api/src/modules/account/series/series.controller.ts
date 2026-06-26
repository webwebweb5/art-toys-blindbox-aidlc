import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UsePipes,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SeriesService } from './series.service';
import { CreateSeriesDto, createSeriesSchema } from './dto/create-series.dto';
import { UpdateSeriesDto, updateSeriesSchema } from './dto/update-series.dto';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  @Public()
  @Get('series')
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.seriesService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
    );
  }

  @Roles('ADMIN')
  @Get('admin/series')
  async findAllAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.seriesService.findAllAdmin(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
      status,
    );
  }

  @Public()
  @Get('series/:id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.seriesService.findById(id);
  }

  @Roles('ADMIN')
  @Post('admin/series')
  @UsePipes(new ZodValidationPipe(createSeriesSchema))
  async create(@Body() dto: CreateSeriesDto) {
    return this.seriesService.create(dto);
  }

  @Roles('ADMIN')
  @Patch('admin/series/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateSeriesSchema)) dto: UpdateSeriesDto,
  ) {
    return this.seriesService.update(id, dto);
  }

  @Roles('ADMIN')
  @Patch('admin/series/:id/publish')
  async publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.seriesService.publish(id);
  }

  @Roles('ADMIN')
  @Patch('admin/series/:id/archive')
  async archive(@Param('id', ParseUUIDPipe) id: string) {
    return this.seriesService.archive(id);
  }

  @Roles('ADMIN')
  @Delete('admin/series/:id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.seriesService.remove(id);
  }
}
