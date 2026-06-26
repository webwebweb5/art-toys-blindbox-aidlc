import {
  Controller,
  Post,
  Patch,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../account/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../account/auth/guards/roles.guard';
import { Roles } from '../../account/auth/decorators/roles.decorator';
import { BranchService } from './branch.service';
import { CreateBranchDto, UpdateBranchDto } from '../dto/create-branch.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Post('admin/branches')
  @Roles('ADMIN')
  async createBranch(@Body() dto: CreateBranchDto) {
    return this.branchService.create(dto);
  }

  @Patch('admin/branches/:id')
  @Roles('ADMIN')
  async updateBranch(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branchService.update(id, dto);
  }

  @Get('branches')
  async findAvailable(@Query('figureId') figureId: string) {
    const branches = await this.branchService.findAvailable(figureId);
    return branches.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      operatingHours: b.operatingHours,
      stockAvailable: b.stockRecords[0]?.available ?? 0,
    }));
  }
}
