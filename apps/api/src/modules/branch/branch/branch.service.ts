import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateBranchDto, UpdateBranchDto } from '../dto/create-branch.dto';

@Injectable()
export class BranchService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBranchDto) {
    return this.prisma.branch.create({
      data: {
        name: dto.name,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        operatingHours: dto.operatingHours,
      },
    });
  }

  async update(id: string, dto: UpdateBranchDto) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      throw new NotFoundException({
        code: 'BRANCH_NOT_FOUND',
        message: 'Branch not found',
      });
    }

    return this.prisma.branch.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.operatingHours !== undefined && {
          operatingHours: dto.operatingHours,
        }),
      },
    });
  }

  async findAvailable(figureId: string) {
    return this.prisma.branch.findMany({
      where: {
        status: 'ACTIVE',
        stockRecords: {
          some: {
            figureId,
            available: { gt: 0 },
          },
        },
      },
      include: {
        stockRecords: {
          where: { figureId },
          select: { available: true },
        },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.branch.findUnique({ where: { id } });
  }
}
