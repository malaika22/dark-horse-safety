import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SavedViewScope } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSavedViewDto,
  SavedViewListQueryDto,
  UpdateSavedViewDto,
} from './dto/saved-view.dto';

@Injectable()
export class SavedViewsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: SavedViewListQueryDto) {
    const where: Prisma.SavedViewWhereInput = {
      userId,
      ...(query.scope ? { scope: query.scope } : {}),
    };
    const items = await this.prisma.savedView.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    return { data: items };
  }

  async create(userId: string, dto: CreateSavedViewDto) {
    if (dto.isDefault) {
      await this.prisma.savedView.updateMany({
        where: { userId, scope: dto.scope },
        data: { isDefault: false },
      });
    }
    const view = await this.prisma.savedView.create({
      data: {
        name: dto.name,
        scope: dto.scope,
        payload: dto.payload as Prisma.InputJsonValue,
        isDefault: dto.isDefault ?? false,
        userId,
      },
    });
    return { data: view };
  }

  async update(userId: string, id: string, dto: UpdateSavedViewDto) {
    const existing = await this.prisma.savedView.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Saved view not found',
      });
    }
    const scope = (dto.scope ?? existing.scope) as SavedViewScope;
    if (dto.isDefault) {
      await this.prisma.savedView.updateMany({
        where: { userId, scope },
        data: { isDefault: false },
      });
    }
    const view = await this.prisma.savedView.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.scope !== undefined ? { scope: dto.scope } : {}),
        ...(dto.payload !== undefined
          ? { payload: dto.payload as Prisma.InputJsonValue }
          : {}),
        ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
      },
    });
    return { data: view };
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.savedView.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Saved view not found',
      });
    }
    await this.prisma.savedView.delete({ where: { id } });
    return { data: { deleted: true } };
  }
}
