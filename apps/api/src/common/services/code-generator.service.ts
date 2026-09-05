import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CRM_CODE_PREFIX, formatEntityCode } from '../utils/code.util';

type CodeKind = keyof typeof CRM_CODE_PREFIX;

/**
 * Allocates next human-readable entity code by counting existing rows.
 * Good enough for MVP; swap for DB sequence later if needed.
 */
@Injectable()
export class CodeGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  async next(kind: CodeKind): Promise<string> {
    const prefix = CRM_CODE_PREFIX[kind];
    const count = await this.countFor(kind);
    return formatEntityCode(prefix, count + 1);
  }

  private countFor(kind: CodeKind): Promise<number> {
    switch (kind) {
      case 'customer':
        return this.prisma.customer.count();
      case 'contact':
        return this.prisma.contact.count();
      case 'location':
        return this.prisma.location.count();
      case 'pricingRule':
        return this.prisma.pricingRule.count();
      case 'requirement':
        return this.prisma.customerRequirement.count();
      case 'formRule':
        return this.prisma.formRule.count();
      case 'routeRule':
        return this.prisma.routeRule.count();
      case 'eodReport':
        return this.prisma.eodReport.count();
      case 'salesActivity':
        return this.prisma.salesActivity.count();
      case 'quote':
        return this.prisma.quote.count();
      case 'workOrder':
        return this.prisma.workOrder.count();
      default:
        return Promise.resolve(0);
    }
  }
}
