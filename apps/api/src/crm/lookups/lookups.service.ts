import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { containsCi } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';

const opt = (value: string, label: string) => ({ value, label });
/** Free-text fields: value matches what we store / filter by. */
const labelOpt = (label: string) => opt(label, label);

@Injectable()
export class LookupsService {
  constructor(private readonly prisma: PrismaService) {}

  all() {
    return {
      data: {
        statuses: [
          opt('ACTIVE', 'Active'),
          opt('INACTIVE', 'Inactive'),
          opt('DRAFT', 'Draft'),
          opt('ARCHIVED', 'Archived'),
          opt('NEEDS_REVIEW', 'Needs review'),
          opt('EXPIRED', 'Expired'),
          opt('PENDING', 'Pending'),
          opt('COMPLETE', 'Complete'),
          opt('IN_PROGRESS', 'In progress'),
          opt('ON_HOLD', 'On hold'),
          opt('SUBMITTED', 'Submitted'),
          opt('WON', 'Won'),
          opt('LOST', 'Lost'),
          opt('SENT', 'Sent'),
          opt('OPEN', 'Open'),
        ],
        customerStatuses: [
          opt('ACTIVE', 'Active'),
          opt('INACTIVE', 'Inactive'),
          opt('NEEDS_REVIEW', 'Needs review'),
        ],
        locationStatuses: [
          opt('ACTIVE', 'Active'),
          opt('INACTIVE', 'Inactive'),
        ],
        pricingStatuses: [
          opt('ACTIVE', 'Active'),
          opt('EXPIRED', 'Expired'),
          opt('PENDING', 'Pending'),
        ],
        requirementStatuses: [
          opt('ACTIVE', 'Active'),
          opt('NEEDS_REVIEW', 'Needs review'),
          opt('EXPIRED', 'Expired'),
          opt('PENDING', 'Pending'),
        ],
        formRuleStatuses: [
          opt('ACTIVE', 'Active'),
          opt('INACTIVE', 'Inactive'),
          opt('DRAFT', 'Draft'),
        ],
        routeRuleStatuses: [
          opt('ACTIVE', 'Active'),
          opt('INACTIVE', 'Inactive'),
        ],
        eodStatuses: [
          opt('SUBMITTED', 'Submitted'),
          opt('DRAFT', 'Draft'),
          opt('PENDING', 'Pending'),
        ],
        msaStatuses: [
          opt('current', 'Current'),
          opt('expiring', 'Expiring'),
          opt('expired', 'Expired'),
        ],
        industries: [
          labelOpt('Oil & Gas'),
          labelOpt('Construction'),
          labelOpt('Utilities'),
        ],
        paymentTerms: [
          labelOpt('Net 15'),
          labelOpt('Net 30'),
          labelOpt('Net 60'),
        ],
        pricingTiers: [
          labelOpt('Standard'),
          labelOpt('Enterprise'),
          labelOpt('Custom'),
        ],
        counties: [
          labelOpt('Midland'),
          labelOpt('Ector'),
          labelOpt('Reeves'),
          labelOpt('Winkler'),
          labelOpt('Andrews'),
          labelOpt('Loving'),
        ],
        states: [
          opt('TX', 'TX'),
          opt('NM', 'NM'),
          opt('OK', 'OK'),
        ],
        siteTypes: [
          labelOpt('Well'),
          labelOpt('Pad'),
          labelOpt('Facility'),
        ],
        serviceItems: [
          labelOpt('Wireline Logging'),
          labelOpt('Pump Down'),
          labelOpt('Perforating'),
          labelOpt('Slickline'),
        ],
        rateTypes: [
          labelOpt('Per Job'),
          labelOpt('Per HR'),
          labelOpt('Per Run'),
        ],
        units: [
          labelOpt('Job'),
          labelOpt('Hour'),
          labelOpt('Run'),
          labelOpt('Day'),
        ],
        requirementTypes: [
          labelOpt('Certification'),
          labelOpt('Safety'),
          labelOpt('Contract'),
          labelOpt('Insurance'),
          labelOpt('Tax'),
        ],
        enforcementLevels: [
          opt('HARD_GATE', 'Hard Gate'),
          opt('SOFT_GATE', 'Soft Gate'),
          opt('ADVISORY', 'Advisory'),
        ],
        appliesTo: [
          labelOpt('All'),
          labelOpt('Field'),
          labelOpt('Office'),
          labelOpt('Contractors'),
        ],
        reviewCycles: [
          labelOpt('Monthly'),
          labelOpt('Quarterly'),
          labelOpt('Annually'),
        ],
        formTemplates: [
          labelOpt('Wireline Operations V2'),
          labelOpt('JSA'),
          labelOpt('Permit to Work'),
          labelOpt('Tailgate'),
          labelOpt('EOD Report'),
        ],
        jobTypes: [
          labelOpt('JSA'),
          labelOpt('Permit to Work'),
          labelOpt('Wireline'),
          labelOpt('H2S'),
        ],
        contactRoles: [
          labelOpt('Operations Manager'),
          labelOpt('Safety Lead'),
          labelOpt('Field Supervisor'),
          labelOpt('AP Contact'),
          labelOpt('Company Man'),
          labelOpt('Procurement'),
          labelOpt('HSE Manager'),
          labelOpt('Dispatcher'),
        ],
        preferredContactMethods: [
          labelOpt('Email'),
          labelOpt('Phone'),
          labelOpt('SMS'),
          labelOpt('In Person'),
        ],
        salesActivityTypes: [
          opt('CALL', 'Call'),
          opt('VISIT', 'Visit'),
          opt('MEETING', 'Meeting'),
          opt('EMAIL', 'Email'),
          opt('OTHER', 'Other'),
        ],
        activityOutcomes: [
          labelOpt('Connected'),
          labelOpt('Left Voicemail'),
          labelOpt('Follow-up Set'),
          labelOpt('No Answer'),
          labelOpt('Won Interest'),
        ],
        activityDurations: [
          labelOpt('15 min'),
          labelOpt('30 min'),
          labelOpt('45 min'),
          labelOpt('1 hr'),
        ],
        quoteStatuses: [
          opt('DRAFT', 'Draft'),
          opt('SENT', 'Sent'),
          opt('WON', 'Won'),
          opt('LOST', 'Lost'),
          opt('EXPIRED', 'Expired'),
          opt('PENDING', 'Pending'),
          opt('OPEN', 'Open'),
        ],
      },
    };
  }

  async customers(q?: string) {
    const where = q?.trim()
      ? {
          archivedAt: null,
          OR: [
            { name: containsCi(q.trim()) },
            { code: containsCi(q.trim()) },
          ],
        }
      : { archivedAt: null };
    const items = await this.prisma.customer.findMany({
      where,
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
      take: 50,
    });
    return { data: items };
  }

  async locations(q?: string, customerId?: string) {
    const and: Record<string, unknown>[] = [{ archivedAt: null }];
    if (customerId) and.push({ customerId });
    if (q?.trim()) {
      and.push({
        OR: [
          { name: containsCi(q.trim()) },
          { code: containsCi(q.trim()) },
          { wellPadNumber: containsCi(q.trim()) },
        ],
      });
    }
    const items = await this.prisma.location.findMany({
      where: { AND: and },
      select: {
        id: true,
        name: true,
        code: true,
        customerId: true,
        county: true,
      },
      orderBy: { name: 'asc' },
      take: 50,
    });
    return { data: items };
  }

  async reps() {
    const items = await this.prisma.user.findMany({
      where: {
        role: { in: [UserRole.ADMIN, UserRole.SUPERVISOR] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    return { data: items };
  }
}
