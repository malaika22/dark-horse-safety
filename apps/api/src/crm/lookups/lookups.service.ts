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
          opt('NEEDS_REVIEW', 'Needs review'),
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
        customerTypes: [
          labelOpt('Operator'),
          labelOpt('Contractor'),
          labelOpt('Vendor'),
          labelOpt('Partner'),
        ],
        leadSources: [
          labelOpt('Referral'),
          labelOpt('Inbound'),
          labelOpt('Field'),
          labelOpt('Trade Show'),
          labelOpt('Other'),
        ],
        requiredForms: [
          labelOpt('JSA'),
          labelOpt('Permit To Work'),
          labelOpt('Equipment Inspection'),
          labelOpt('Job Safety Analysis'),
        ],
        paymentTerms: [
          labelOpt('Net 15'),
          labelOpt('Net 30'),
          labelOpt('Net 60'),
        ],
        pricingTiers: [
          labelOpt('Standard'),
          labelOpt('Preferred'),
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
          labelOpt('H2S Monitoring'),
          labelOpt('Site Safety Technician'),
          labelOpt('Wireline Logging'),
          labelOpt('Pump Down'),
          labelOpt('Perforating'),
          labelOpt('Slickline'),
          labelOpt('Standby'),
          labelOpt('Equipment Day Rate'),
        ],
        rateTypes: [
          labelOpt('Per Hour'),
          labelOpt('Per Day'),
          labelOpt('Per Job'),
          labelOpt('Per Unit'),
        ],
        units: [
          labelOpt('Hour'),
          labelOpt('Day'),
          labelOpt('Job'),
          labelOpt('Unit'),
          labelOpt('Run'),
        ],
        netsuiteItems: [] as { value: string; label: string }[],
        pricingAppliesTo: [
          opt('ALL_SITES', 'All Sites'),
          opt('SPECIFIC_WELLS', 'Specific Wells'),
        ],
        payCycles: [] as { value: string; label: string }[],
        timezones: [
          opt('CT', 'Central (CT)'),
          opt('ET', 'Eastern (ET)'),
          opt('MT', 'Mountain (MT)'),
          opt('PT', 'Pacific (PT)'),
        ],
        requirementTypes: [
          labelOpt('Certification'),
          labelOpt('Training'),
          labelOpt('Document'),
          labelOpt('Equipment'),
        ],
        requirementSources: [
          opt('CUSTOMER_IMPOSED', 'Customer-Imposed'),
          opt('REGULATORY', 'Regulatory (OSHA)'),
          opt('INTERNAL_POLICY', 'Internal Policy'),
        ],
        requirementCatalog: [
          opt(
            'H2S AWARENESS & SAFETY (ANNUAL)',
            'H2S Awareness & Safety (Annual) — Training Course Library',
          ),
          opt('H2S CERTIFICATION', 'H2S Certification'),
          opt('CONFINED SPACE ENTRY', 'Confined Space Entry'),
          opt('FIRST AID / CPR', 'First Aid / CPR'),
          opt('MSA', 'MSA'),
          opt('COI', 'COI'),
          opt('W-9', 'W-9'),
          opt('SITE ORIENTATION', 'Site Orientation'),
        ],
        evidenceTypes: [
          opt('CERTIFICATE_UPLOAD', 'Certificate Upload'),
          opt('CARD_PHOTO', 'Card Photo'),
          opt('THIRD_PARTY_VERIFICATION', 'Third-Party Verification'),
          opt('ATTESTATION', 'Attestation'),
        ],
        verificationMethods: [
          opt('SELF_CERTIFIED', 'Self-certified'),
          opt('SUPERVISOR_VERIFIED', 'Supervisor verified'),
          opt('SAFETY_COORDINATOR_VERIFIED', 'Safety Coordinator verified'),
          opt('THIRD_PARTY_VERIFIED', 'Third-party verified'),
        ],
        technicianScope: [
          opt('ALL_TECHNICIANS', 'All Technicians'),
          opt('SPECIFIC_ROLES', 'Specific Roles'),
          opt('NAMED_INDIVIDUALS', 'Named Individuals'),
          opt('SPECIFIC_JOB_TYPES', 'Technicians on Specific Job Types'),
        ],
        technicianRoles: [
          labelOpt('Site Safety Technician'),
          labelOpt('Confined Space Attendant'),
          labelOpt('H2S Monitor'),
          labelOpt('Operations'),
          labelOpt('Safety'),
          labelOpt('Admin'),
          labelOpt('Customer'),
        ],
        overrideRoles: [
          labelOpt('Operations'),
          labelOpt('Safety'),
          labelOpt('Admin'),
          labelOpt('Customer'),
        ],
        validityPeriods: [
          opt('ONE_TIME', 'One-time'),
          opt('ANNUALLY', 'Annually'),
          opt('EVERY_2_YEARS', 'Every 2 Years'),
          opt('EVERY_3_YEARS', 'Every 3 Years'),
          opt('EVERY_5_YEARS', 'Every 5 Years'),
          opt('ON_CERTIFICATE_EXPIRY', 'On Certificate Expiry'),
          opt('NEVER', 'Never'),
        ],
        rolloutModes: [
          opt('NEW_ONLY', 'Apply to new assignments only (grandfather existing)'),
          opt('IMMEDIATE', 'Apply immediately to everyone'),
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
        formTriggers: [
          opt('ON_DISPATCH', 'On Dispatch'),
          opt('ON_START', 'On Start'),
          opt('PER_SHIFT', 'Per Shift'),
        ],
        formDueOptions: [
          opt('BEFORE_CLOCK_IN', 'Before Clock-In'),
          opt('BEFORE_DISPATCH', 'Before Dispatch'),
          opt('BEFORE_CLOSEOUT', 'Before Closeout'),
          opt('BEFORE_JOB_START', 'Before Job Start'),
        ],
        formVersions: [
          labelOpt('V1'),
          labelOpt('V2'),
          labelOpt('V3'),
        ],
        formScopes: [
          opt('ALL_JOBS', 'All Jobs'),
          opt('WELL_SITES', 'Well Sites'),
          opt('FLEET_JOBS', 'Fleet Jobs'),
          opt('H2S_SITES', 'H2S Sites'),
        ],
        formVersionModes: [
          opt('ALWAYS_LATEST', 'Always use the latest'),
          opt('PINNED', 'Pin to version'),
        ],
        formOverrideRoles: [
          labelOpt('Operations'),
          labelOpt('Safety'),
          labelOpt('Admin'),
          labelOpt('Supervisor'),
        ],
        activitySubjects: [
          opt('quote', 'Quote'),
          opt('call', 'Call'),
          opt('follow-up', 'Follow-up'),
        ],
        eodMissingFields: [
          opt('ACTIVITY_OUTCOMES', 'Activity Outcomes'),
          opt('NEXT_STEPS', 'Next Steps'),
          opt('PIPELINE_FIGURES', 'Pipeline Figures'),
          opt('OTHER', 'Other → Free Text'),
        ],
        eodDuePresets: [
          opt('tomorrow-9', 'Tomorrow · 9:00 AM'),
          opt('tomorrow-17', 'Tomorrow · 5:00 PM'),
          opt('in-2-days', 'In 2 Days · 9:00 AM'),
          opt('end-of-week', 'End Of Week · 5:00 PM'),
        ],
        autoFlagNoShow: [
          opt('AFTER 15MINS', 'After 15 mins'),
          opt('AFTER 30MINS', 'After 30 mins'),
          opt('AFTER 60MINS', 'After 60 mins'),
        ],
        routeOriginTypes: [
          opt('YARD', 'Yard'),
          opt('HOME', 'Home'),
          opt('PREVIOUS_JOB', 'Previous Job'),
        ],
        gpsUnavailableBehaviors: [
          opt('BLOCK_CLOCK_IN', 'Block Clock-In'),
          opt('PROCEED_WITH_FLAG', 'Proceed With Flag'),
        ],
        formTemplates: [
          labelOpt('JSA'),
          labelOpt('Permit to Work'),
          labelOpt('BBS Stop Card'),
          labelOpt('Equipment Inspection'),
          labelOpt('Air Quality Test'),
          labelOpt('H2S Certification'),
          labelOpt('COI On File'),
          labelOpt('Safety Orientation'),
          labelOpt('Wireline Operations V2'),
          labelOpt('Tailgate'),
          labelOpt('EOD Report'),
        ],
        jobTypes: [
          labelOpt('Confined Space Standby'),
          labelOpt('Wireline'),
          labelOpt('H2S Monitoring'),
          labelOpt('Site Safety'),
          labelOpt('All Jobs'),
          labelOpt('Well Sites'),
          labelOpt('Fleet Jobs'),
          labelOpt('H2S Sites'),
          labelOpt('JSA'),
          labelOpt('Permit to Work'),
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
          labelOpt('Positive'),
          labelOpt('Neutral'),
          labelOpt('Negative'),
          labelOpt('Connected'),
          labelOpt('Left Voicemail'),
          labelOpt('Follow-up Set'),
          labelOpt('No Answer'),
        ],
        followUpStatuses: [
          opt('NONE', 'None'),
          opt('OPEN', 'Open'),
          opt('OVERDUE', 'Overdue'),
          opt('DONE', 'Done'),
        ],
        activityDurations: [
          labelOpt('15 min'),
          labelOpt('30 min'),
          labelOpt('45 min'),
          labelOpt('1 hr'),
          labelOpt('1.5 hr'),
          labelOpt('2 hr+'),
        ],
        quoteStatuses: [
          opt('DRAFT', 'Draft'),
          opt('SENT', 'Sent'),
          opt('WON', 'Won'),
          opt('LOST', 'Lost'),
          opt('EXPIRED', 'Expired'),
          opt('PENDING', 'Pending'),
          opt('OPEN', 'Open'),
          opt('CONVERTED', 'Converted'),
        ],
        expenseStatuses: [
          opt('DRAFT', 'Draft'),
          opt('PENDING', 'Pending'),
          opt('APPROVED', 'Approved'),
          opt('UNMATCHED', 'Unmatched'),
          opt('MISSING_RECEIPT', 'Missing Receipt'),
          opt('NEEDS_REVIEW', 'Needs Review'),
        ],
        expenseCategories: [
          labelOpt('Fuel'),
          labelOpt('Lodging'),
          labelOpt('Supplies'),
          labelOpt('Meals'),
          labelOpt('Entertainment'),
          labelOpt('Travel'),
          labelOpt('Equipment'),
          labelOpt('Other'),
        ],
        // Static non-card methods only — live cards merged in allLive()
        expensePaymentMethods: [
          labelOpt('Cash'),
          labelOpt('Personal Card'),
        ],
      },
    };
  }

  /** Biweekly pay cycles fallback when PayCycle table is empty. */
  private buildPayCycles(count = 24) {
    const start = new Date(2026, 8, 7); // Sep 7, 2026
    const out: { value: string; label: string }[] = [];
    for (let i = 0; i < count; i++) {
      const from = new Date(start);
      from.setDate(start.getDate() + i * 14);
      const to = new Date(from);
      to.setDate(from.getDate() + 13);
      const cycle = 18 + i;
      const fmt = (d: Date) =>
        d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      const iso = from.toISOString().slice(0, 10);
      out.push({
        value: iso,
        label: `Cycle ${cycle} · ${fmt(from)} – ${fmt(to)}`,
      });
    }
    return out;
  }

  async loadPayCycles() {
    const rows = await this.prisma.payCycle.findMany({
      orderBy: { startDate: 'asc' },
      take: 48,
    });
    if (!rows.length) return this.buildPayCycles(24);
    return rows.map((r) => ({
      value: r.startDate.toISOString().slice(0, 10),
      label: r.label,
    }));
  }

  /** Merge static catalogs with distinct values already stored in DB. */
  async allLive() {
    const base = this.all().data;
    const [
      countiesDb,
      siteTypesDb,
      serviceItemsDb,
      rateTypesDb,
      unitsDb,
      netsuiteDb,
      netsuiteDirDb,
      netsuiteItemMapDb,
      itemRateMapDb,
      industriesDb,
      contactRolesDb,
      formTemplatesDb,
      jobTypesDb,
      requiredFormsDb,
      payCycles,
      paymentCardsDb,
      expenseMethodsDb,
    ] = await Promise.all([
      this.prisma.location.findMany({
        where: { archivedAt: null, county: { not: null } },
        select: { county: true },
        distinct: ['county'],
        take: 200,
      }),
      this.prisma.location.findMany({
        where: { archivedAt: null, siteType: { not: null } },
        select: { siteType: true },
        distinct: ['siteType'],
        take: 100,
      }),
      this.prisma.pricingRule.findMany({
        where: { archivedAt: null },
        select: { serviceItem: true },
        distinct: ['serviceItem'],
        take: 200,
      }),
      this.prisma.pricingRule.findMany({
        where: { archivedAt: null, rateType: { not: null } },
        select: { rateType: true },
        distinct: ['rateType'],
        take: 50,
      }),
      this.prisma.pricingRule.findMany({
        where: { archivedAt: null, unit: { not: null } },
        select: { unit: true },
        distinct: ['unit'],
        take: 50,
      }),
      this.prisma.pricingRule.findMany({
        where: { archivedAt: null, netsuiteItem: { not: null } },
        select: { netsuiteItem: true },
        distinct: ['netsuiteItem'],
        take: 100,
      }),
      this.prisma.$queryRaw<{ netsuiteItemId: string }[]>`
        SELECT "netsuiteItemId" FROM "NetSuiteItemDirectory"
        ORDER BY "netsuiteItemId" ASC
        LIMIT 200
      `.catch(() => [] as { netsuiteItemId: string }[]),
      this.prisma.netSuiteItemMapping
        .findMany({
          where: { archivedAt: null, netsuiteItemId: { not: null } },
          select: { netsuiteItemId: true, name: true },
          take: 200,
        })
        .catch(() => [] as { netsuiteItemId: string | null; name: string }[]),
      this.prisma.itemRateMapping
        .findMany({
          where: { archivedAt: null },
          select: { netsuiteItemId: true, name: true },
          take: 200,
        })
        .catch(() => [] as { netsuiteItemId: string | null; name: string }[]),
      this.prisma.customer.findMany({
        where: { archivedAt: null, industry: { not: null } },
        select: { industry: true },
        distinct: ['industry'],
        take: 100,
      }),
      this.prisma.contact.findMany({
        where: { archivedAt: null, roleTitle: { not: null } },
        select: { roleTitle: true },
        distinct: ['roleTitle'],
        take: 100,
      }),
      this.prisma.formRule.findMany({
        where: { archivedAt: null },
        select: { formTemplate: true },
        distinct: ['formTemplate'],
        take: 200,
      }),
      this.prisma.formRule.findMany({
        where: { archivedAt: null, jobType: { not: null } },
        select: { jobType: true },
        distinct: ['jobType'],
        take: 100,
      }),
      this.prisma.customer.findMany({
        where: {
          archivedAt: null,
          NOT: { defaultRequiredForms: null },
        },
        select: { defaultRequiredForms: true },
        take: 200,
      }),
      this.loadPayCycles(),
      this.prisma.paymentCard.findMany({
        where: { archivedAt: null, active: true },
        select: { label: true, isCompanyCard: true },
        orderBy: { label: 'asc' },
        take: 100,
      }),
      this.prisma.expense.findMany({
        where: { archivedAt: null, paymentMethod: { not: null } },
        select: { paymentMethod: true },
        distinct: ['paymentMethod'],
        take: 100,
      }),
    ]);

    const merge = (
      existing: { value: string; label: string }[],
      extras: (string | null | undefined)[],
    ) => {
      const map = new Map(existing.map((o) => [o.value.toLowerCase(), o]));
      for (const raw of extras) {
        const v = raw?.trim();
        if (!v) continue;
        const key = v.toLowerCase();
        if (!map.has(key)) map.set(key, labelOpt(v));
      }
      return [...map.values()];
    };

    const requiredFormExtras = requiredFormsDb.flatMap((r) =>
      String(r.defaultRequiredForms ?? '')
        .split(/[,|;]/)
        .map((s) => s.trim())
        .filter(Boolean),
    );

    return {
      data: {
        ...base,
        payCycles,
        counties: merge(
          base.counties,
          countiesDb.map((r) => r.county),
        ),
        siteTypes: merge(
          base.siteTypes,
          siteTypesDb.map((r) => r.siteType),
        ),
        serviceItems: merge(
          base.serviceItems,
          [
            ...serviceItemsDb.map((r) => r.serviceItem),
            ...netsuiteItemMapDb.map((r) => r.name),
            ...itemRateMapDb.map((r) => r.name),
          ],
        ),
        rateTypes: merge(
          base.rateTypes,
          rateTypesDb.map((r) => r.rateType),
        ),
        units: merge(
          base.units,
          unitsDb.map((r) => r.unit),
        ),
        netsuiteItems: merge(
          [],
          [
            ...netsuiteDb.map((r) => r.netsuiteItem),
            ...netsuiteDirDb.map((r) => r.netsuiteItemId),
            ...netsuiteItemMapDb.map((r) => r.netsuiteItemId),
            ...itemRateMapDb.map((r) => r.netsuiteItemId),
          ],
        ),
        industries: merge(
          base.industries,
          industriesDb.map((r) => r.industry),
        ),
        contactRoles: merge(
          base.contactRoles,
          contactRolesDb.map((r) => r.roleTitle),
        ),
        formTemplates: merge(
          base.formTemplates,
          formTemplatesDb.map((r) => r.formTemplate),
        ),
        jobTypes: merge(
          base.jobTypes,
          jobTypesDb.map((r) => r.jobType),
        ),
        requiredForms: merge(base.requiredForms, requiredFormExtras),
        expensePaymentMethods: merge(
          base.expensePaymentMethods,
          [
            ...paymentCardsDb.map((c) => c.label),
            ...expenseMethodsDb.map((r) => r.paymentMethod),
          ],
        ),
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
      take: 500,
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
        state: true,
        siteType: true,
        latitude: true,
        longitude: true,
        geofenceRadius: true,
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
