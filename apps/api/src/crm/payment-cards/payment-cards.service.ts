import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePaymentCardDto,
  UpdatePaymentCardDto,
  formatCardLabel,
} from './dto/payment-card.dto';

@Injectable()
export class PaymentCardsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(activeOnly = true) {
    const items = await this.prisma.paymentCard.findMany({
      where: {
        archivedAt: null,
        ...(activeOnly ? { active: true } : {}),
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: [{ brand: 'asc' }, { last4: 'asc' }],
    });
    return { data: { items, total: items.length } };
  }

  async create(dto: CreatePaymentCardDto) {
    const brand = dto.brand.trim();
    const last4 = dto.last4.replace(/\D/g, '').slice(-4);
    const card = await this.prisma.paymentCard.create({
      data: {
        brand,
        last4,
        label: formatCardLabel(brand, last4),
        isCompanyCard: dto.isCompanyCard !== false,
        ownerId: dto.ownerId || null,
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    return { data: card };
  }

  async update(id: string, dto: UpdatePaymentCardDto) {
    const existing = await this.prisma.paymentCard.findFirst({
      where: { id, archivedAt: null },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Payment card not found',
      });
    }
    const brand = dto.brand?.trim() ?? existing.brand;
    const last4 = dto.last4
      ? dto.last4.replace(/\D/g, '').slice(-4)
      : existing.last4;
    const card = await this.prisma.paymentCard.update({
      where: { id },
      data: {
        brand,
        last4,
        label: formatCardLabel(brand, last4),
        isCompanyCard:
          dto.isCompanyCard === undefined
            ? undefined
            : Boolean(dto.isCompanyCard),
        active: dto.active === undefined ? undefined : Boolean(dto.active),
        ownerId:
          dto.ownerId === undefined ? undefined : dto.ownerId || null,
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    return { data: card };
  }

  async archive(id: string) {
    const existing = await this.prisma.paymentCard.findFirst({
      where: { id, archivedAt: null },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Payment card not found',
      });
    }
    const card = await this.prisma.paymentCard.update({
      where: { id },
      data: { archivedAt: new Date(), active: false },
    });
    return { data: card };
  }
}
