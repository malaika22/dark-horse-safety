import {
  AccountStatus,
  CrmRecordStatus,
  EnforcementLevel,
  PrismaClient,
  SalesActivityType,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';

const prisma = new PrismaClient();

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@darkhorseops.com' },
    update: {
      passwordHash,
      status: AccountStatus.ACTIVE,
      role: UserRole.ADMIN,
      firstName: 'R.',
      lastName: 'Crawford',
    },
    create: {
      email: 'admin@darkhorseops.com',
      passwordHash,
      firstName: 'R.',
      lastName: 'Crawford',
      role: UserRole.ADMIN,
      status: AccountStatus.ACTIVE,
    },
  });

  const torres = await prisma.user.upsert({
    where: { email: 'mtorres@darkhorseops.com' },
    update: {
      passwordHash,
      status: AccountStatus.ACTIVE,
      role: UserRole.SUPERVISOR,
      firstName: 'M.',
      lastName: 'Torres',
    },
    create: {
      email: 'mtorres@darkhorseops.com',
      passwordHash,
      firstName: 'M.',
      lastName: 'Torres',
      role: UserRole.SUPERVISOR,
      status: AccountStatus.ACTIVE,
    },
  });

  const nguyen = await prisma.user.upsert({
    where: { email: 'lnguyen@darkhorseops.com' },
    update: {
      passwordHash,
      status: AccountStatus.ACTIVE,
      role: UserRole.SUPERVISOR,
      firstName: 'L.',
      lastName: 'Nguyen',
    },
    create: {
      email: 'lnguyen@darkhorseops.com',
      passwordHash,
      firstName: 'L.',
      lastName: 'Nguyen',
      role: UserRole.SUPERVISOR,
      status: AccountStatus.ACTIVE,
    },
  });

  const inviteEmail = 'jwhitfield@dhs.com';
  const rawInvite = randomBytes(32).toString('hex');

  await prisma.user.upsert({
    where: { email: inviteEmail },
    update: { status: AccountStatus.INVITED, role: UserRole.SUPERVISOR },
    create: {
      email: inviteEmail,
      role: UserRole.SUPERVISOR,
      status: AccountStatus.INVITED,
      firstName: 'J',
      lastName: 'Whitfield',
    },
  });

  await prisma.invite.deleteMany({ where: { email: inviteEmail } });
  await prisma.invite.create({
    data: {
      email: inviteEmail,
      tokenHash: hashToken(rawInvite),
      role: UserRole.SUPERVISOR,
      inviterId: admin.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('Seed complete');
  console.log('Admin login: admin@darkhorseops.com / Password123!');
  console.log(`Sample invite token: ${rawInvite}`);
  console.log(
    `Accept URL: http://localhost:3000/invite/accept?token=${rawInvite}&email=${encodeURIComponent(inviteEmail)}`,
  );

  // ─── Customers ────────────────────────────────────────────────────────────
  const customersData = [
    {
      code: 'CUST-000001',
      name: 'Permian Basin Energy',
      legalEntityName: 'Permian Basin Energy Holdings LLC',
      status: CrmRecordStatus.ACTIVE,
      industry: 'Oil & Gas',
      phone: '(432) 555-0184',
      website: 'www.permianbasinenergy.com',
      billingAddress: '1200 W Wall St, Midland, TX 79701',
      paymentTerms: 'Net 60',
      pricingTier: 'Enterprise',
      assignedRepId: admin.id,
      openJobs: 3,
      msaOnFile: true,
      msaExpiry: new Date('2027-03-15'),
    },
    {
      code: 'CUST-000002',
      name: 'Lonestar Oilfield',
      legalEntityName: 'Lonestar Oilfield Services Inc',
      status: CrmRecordStatus.ACTIVE,
      industry: 'Oil & Gas',
      phone: '(432) 555-0201',
      website: 'www.lonestarofs.com',
      billingAddress: '500 N Big Spring St, Midland, TX 79701',
      paymentTerms: 'Net 30',
      pricingTier: 'Standard',
      assignedRepId: torres.id,
      openJobs: 1,
      msaOnFile: true,
      msaExpiry: new Date('2026-11-01'),
    },
    {
      code: 'CUST-000003',
      name: 'Cactus Well Services',
      legalEntityName: 'Cactus Well Services LLC',
      status: CrmRecordStatus.NEEDS_REVIEW,
      industry: 'Oil & Gas',
      phone: '(432) 555-0312',
      billingAddress: '88 Industrial Blvd, Odessa, TX 79761',
      paymentTerms: 'Net 15',
      pricingTier: 'Custom',
      assignedRepId: admin.id,
      openJobs: 0,
      msaOnFile: false,
    },
    {
      code: 'CUST-000004',
      name: 'Rio Grande Resources',
      legalEntityName: 'Rio Grande Resources LP',
      status: CrmRecordStatus.ACTIVE,
      industry: 'Utilities',
      phone: '(915) 555-0440',
      billingAddress: '2100 Montana Ave, El Paso, TX 79903',
      paymentTerms: 'Net 30',
      pricingTier: 'Enterprise',
      assignedRepId: torres.id,
      openJobs: 2,
      msaOnFile: true,
      msaExpiry: new Date('2026-10-20'),
    },
    {
      code: 'CUST-000005',
      name: 'Delaware Basin Co.',
      legalEntityName: 'Delaware Basin Company LLC',
      status: CrmRecordStatus.ACTIVE,
      industry: 'Oil & Gas',
      phone: '(432) 555-0505',
      website: 'www.delawarebasin.co',
      billingAddress: '44 Oil Center Rd, Pecos, TX 79772',
      paymentTerms: 'Net 45',
      pricingTier: 'Enterprise',
      assignedRepId: nguyen.id,
      openJobs: 5,
      msaOnFile: true,
      msaExpiry: new Date('2027-01-10'),
    },
    {
      code: 'CUST-000006',
      name: 'Frontier Energy LLC',
      legalEntityName: 'Frontier Energy Limited Liability Co',
      status: CrmRecordStatus.INACTIVE,
      industry: 'Oil & Gas',
      phone: '(432) 555-0611',
      billingAddress: '901 Rankin Hwy, Midland, TX 79701',
      paymentTerms: 'Net 30',
      pricingTier: 'Standard',
      assignedRepId: admin.id,
      openJobs: 0,
      msaOnFile: true,
      msaExpiry: new Date('2025-12-01'),
    },
    {
      code: 'CUST-000007',
      name: 'Summit Production',
      legalEntityName: 'Summit Production Partners',
      status: CrmRecordStatus.ACTIVE,
      industry: 'Construction',
      phone: '(505) 555-0722',
      billingAddress: '1200 San Pedro Dr, Hobbs, NM 88240',
      paymentTerms: 'Net 60',
      pricingTier: 'Custom',
      assignedRepId: nguyen.id,
      openJobs: 4,
      msaOnFile: true,
      msaExpiry: new Date('2026-12-15'),
    },
    {
      code: 'CUST-000008',
      name: 'Vaquero Oil & Gas',
      legalEntityName: 'Vaquero Oil and Gas Inc',
      status: CrmRecordStatus.NEEDS_REVIEW,
      industry: 'Oil & Gas',
      phone: '(432) 555-0833',
      billingAddress: '33 Loop 250, Midland, TX 79705',
      paymentTerms: 'Net 15',
      pricingTier: 'Standard',
      assignedRepId: torres.id,
      openJobs: 1,
      msaOnFile: false,
    },
  ] as const;

  const customers: Awaited<ReturnType<typeof prisma.customer.upsert>>[] = [];
  for (const data of customersData) {
    const row = await prisma.customer.upsert({
      where: { code: data.code },
      update: {
        name: data.name,
        status: data.status,
        assignedRepId: data.assignedRepId,
        industry: data.industry,
        paymentTerms: data.paymentTerms,
        pricingTier: data.pricingTier,
        openJobs: data.openJobs,
      },
      create: { ...data },
    });
    customers.push(row);
  }
  const [c1, c2, c3, c4, c5, c6, c7, c8] = customers;

  // ─── Contacts ─────────────────────────────────────────────────────────────
  const contactDefs = [
    {
      code: 'CON-000001',
      fullName: 'James Whitfield',
      roleTitle: 'Operations Manager',
      email: 'jwhitfield@example.com',
      mobile: '(432) 555-0178',
      isPrimary: true,
      customer: c1,
      repId: admin.id,
      locationLabel: 'Midland HQ',
    },
    {
      code: 'CON-000002',
      fullName: 'Maria Santos',
      roleTitle: 'Safety Lead',
      email: 'msantos@lonestarofs.com',
      mobile: '(432) 555-0210',
      isPrimary: true,
      customer: c2,
      repId: torres.id,
      locationLabel: 'Midland Yard',
    },
    {
      code: 'CON-000003',
      fullName: 'Derek Hale',
      roleTitle: 'Field Supervisor',
      email: 'dhale@cactuswells.com',
      mobile: '(432) 555-0320',
      isPrimary: true,
      customer: c3,
      repId: admin.id,
      locationLabel: 'Odessa',
    },
    {
      code: 'CON-000004',
      fullName: 'Ana Ruiz',
      roleTitle: 'Procurement',
      email: 'aruiz@riogrande.com',
      mobile: '(915) 555-0455',
      isPrimary: true,
      customer: c4,
      repId: torres.id,
      locationLabel: 'El Paso',
    },
    {
      code: 'CON-000005',
      fullName: 'Chris Alvarez',
      roleTitle: 'HSE Manager',
      email: 'calvarez@permian.com',
      mobile: '(432) 555-0190',
      isPrimary: false,
      customer: c1,
      repId: admin.id,
      locationLabel: 'Field',
    },
    {
      code: 'CON-000006',
      fullName: 'Tina Brooks',
      roleTitle: 'Company Man',
      email: 'tbrooks@delawarebasin.co',
      mobile: '(432) 555-0515',
      isPrimary: true,
      customer: c5,
      repId: nguyen.id,
      locationLabel: 'Pecos',
    },
    {
      code: 'CON-000007',
      fullName: 'Omar Patel',
      roleTitle: 'Dispatcher',
      email: 'opatel@frontierenergy.com',
      mobile: '(432) 555-0620',
      isPrimary: true,
      customer: c6,
      repId: admin.id,
      locationLabel: 'Midland',
    },
    {
      code: 'CON-000008',
      fullName: 'Kelly Vargas',
      roleTitle: 'AP Contact',
      email: 'kvargas@summitprod.com',
      mobile: '(505) 555-0730',
      isPrimary: true,
      customer: c7,
      repId: nguyen.id,
      locationLabel: 'Hobbs',
    },
    {
      code: 'CON-000009',
      fullName: 'Ryan Cole',
      roleTitle: 'Field Supervisor',
      email: 'rcole@vaquero.com',
      mobile: '(432) 555-0840',
      isPrimary: true,
      customer: c8,
      repId: torres.id,
      locationLabel: 'Midland',
    },
    {
      code: 'CON-000010',
      fullName: 'Sofia Mendoza',
      roleTitle: 'Operations Manager',
      email: 'smendoza@lonestarofs.com',
      mobile: '(432) 555-0225',
      isPrimary: false,
      customer: c2,
      repId: torres.id,
      locationLabel: 'Midland',
    },
  ];

  const contacts: Awaited<ReturnType<typeof prisma.contact.upsert>>[] = [];
  for (const def of contactDefs) {
    const existing = await prisma.contact.findUnique({
      where: { code: def.code },
    });
    if (existing) {
      await prisma.contactCustomer.deleteMany({
        where: { contactId: existing.id },
      });
    }
    const contact = await prisma.contact.upsert({
      where: { code: def.code },
      update: {
        fullName: def.fullName,
        roleTitle: def.roleTitle,
        primaryCustomerId: def.customer.id,
        assignedRepId: def.repId,
        isPrimary: def.isPrimary,
        locationLabel: def.locationLabel,
        email: def.email,
        mobile: def.mobile,
        status: CrmRecordStatus.ACTIVE,
        lastActivityAt: new Date('2026-09-04T12:00:00Z'),
      },
      create: {
        code: def.code,
        fullName: def.fullName,
        roleTitle: def.roleTitle,
        email: def.email,
        mobile: def.mobile,
        isPrimary: def.isPrimary,
        primaryCustomerId: def.customer.id,
        assignedRepId: def.repId,
        locationLabel: def.locationLabel,
        status: CrmRecordStatus.ACTIVE,
        lastActivityAt: new Date('2026-09-04T12:00:00Z'),
        customers: {
          create: {
            customerId: def.customer.id,
            roleAtCustomer: def.roleTitle,
            isPrimary: def.isPrimary,
          },
        },
      },
    });
    if (existing) {
      await prisma.contactCustomer.create({
        data: {
          contactId: contact.id,
          customerId: def.customer.id,
          roleAtCustomer: def.roleTitle,
          isPrimary: def.isPrimary,
        },
      });
    }
    contacts.push(contact);
  }

  // ─── Locations ────────────────────────────────────────────────────────────
  const locationDefs = [
    {
      code: 'LOC-000001',
      name: 'Wolfcamp 12-4H',
      wellPadNumber: 'WPC-1204',
      apiNumber: '42-329-35421',
      county: 'Midland',
      state: 'TX',
      city: 'Midland',
      latitude: 31.8973,
      longitude: -102.0779,
      siteType: 'Well',
      status: CrmRecordStatus.ACTIVE,
      customerId: c1.id,
      gpsRequired: false,
      geofenceRadius: '500 FT',
      openJobs: 2,
      gpsStatus: 'OK',
    },
    {
      code: 'LOC-000002',
      name: 'Spraberry Pad 7',
      wellPadNumber: 'SPB-007',
      county: 'Midland',
      state: 'TX',
      city: 'Midland',
      latitude: 31.95,
      longitude: -102.05,
      siteType: 'Pad',
      status: CrmRecordStatus.ACTIVE,
      customerId: c1.id,
      gpsRequired: true,
      geofenceRadius: '750 FT',
      openJobs: 1,
      gpsStatus: 'OK',
    },
    {
      code: 'LOC-000003',
      name: 'Bone Spring 3H',
      wellPadNumber: 'BNS-003',
      county: 'Reeves',
      state: 'TX',
      city: 'Pecos',
      latitude: 31.45,
      longitude: -103.45,
      siteType: 'Well',
      status: CrmRecordStatus.ACTIVE,
      customerId: c2.id,
      gpsRequired: true,
      geofenceRadius: '500 FT',
      openJobs: 1,
      gpsStatus: 'OK',
    },
    {
      code: 'LOC-000004',
      name: 'Odessa Yard',
      wellPadNumber: 'ODY-001',
      county: 'Ector',
      state: 'TX',
      city: 'Odessa',
      latitude: 31.8457,
      longitude: -102.3676,
      siteType: 'Facility',
      status: CrmRecordStatus.INACTIVE,
      customerId: c3.id,
      gpsRequired: false,
      geofenceRadius: '1000 FT',
      openJobs: 0,
      gpsStatus: 'Offline',
    },
    {
      code: 'LOC-000005',
      name: 'Avalon 9H',
      wellPadNumber: 'AVL-009',
      county: 'Loving',
      state: 'TX',
      city: 'Mentone',
      latitude: 31.7,
      longitude: -103.6,
      siteType: 'Well',
      status: CrmRecordStatus.ACTIVE,
      customerId: c5.id,
      gpsRequired: true,
      geofenceRadius: '600 FT',
      openJobs: 3,
      gpsStatus: 'OK',
    },
    {
      code: 'LOC-000006',
      name: 'Phantom Pad A',
      wellPadNumber: 'PHN-A',
      county: 'Winkler',
      state: 'TX',
      city: 'Kermit',
      latitude: 31.85,
      longitude: -103.1,
      siteType: 'Pad',
      status: CrmRecordStatus.ACTIVE,
      customerId: c5.id,
      gpsRequired: true,
      geofenceRadius: '800 FT',
      openJobs: 2,
      gpsStatus: 'OK',
    },
    {
      code: 'LOC-000007',
      name: 'Hobbs Facility North',
      wellPadNumber: 'HBN-01',
      county: 'Andrews',
      state: 'NM',
      city: 'Hobbs',
      latitude: 32.7,
      longitude: -103.14,
      siteType: 'Facility',
      status: CrmRecordStatus.ACTIVE,
      customerId: c7.id,
      gpsRequired: false,
      geofenceRadius: '1200 FT',
      openJobs: 4,
      gpsStatus: 'OK',
    },
    {
      code: 'LOC-000008',
      name: 'Vaquero Central Pad',
      wellPadNumber: 'VAQ-01',
      county: 'Midland',
      state: 'TX',
      city: 'Midland',
      latitude: 31.92,
      longitude: -102.12,
      siteType: 'Pad',
      status: CrmRecordStatus.ACTIVE,
      customerId: c8.id,
      gpsRequired: true,
      geofenceRadius: '500 FT',
      openJobs: 1,
      gpsStatus: 'Degraded',
    },
  ];

  const locations: Awaited<ReturnType<typeof prisma.location.upsert>>[] = [];
  for (const data of locationDefs) {
    const loc = await prisma.location.upsert({
      where: { code: data.code },
      update: {
        name: data.name,
        status: data.status,
        customerId: data.customerId,
        county: data.county,
        gpsRequired: data.gpsRequired,
        openJobs: data.openJobs,
        gpsStatus: data.gpsStatus,
      },
      create: data,
    });
    locations.push(loc);
  }
  const [loc1, loc2, loc3, loc4, loc5, loc6, loc7, loc8] = locations;

  // ─── Pricing rules ────────────────────────────────────────────────────────
  const pricingDefs = [
    {
      code: 'PR-000001',
      customerId: c1.id,
      serviceItem: 'Wireline Logging',
      rateType: 'Per Job',
      rate: 1250,
      unit: 'Job',
      status: CrmRecordStatus.ACTIVE,
      ownerId: admin.id,
      effectiveFrom: new Date('2026-09-01'),
      effectiveTo: new Date('2026-12-31'),
    },
    {
      code: 'PR-000002',
      customerId: c1.id,
      serviceItem: 'Pump Down',
      rateType: 'Per HR',
      rate: 185,
      unit: 'Hour',
      status: CrmRecordStatus.ACTIVE,
      ownerId: admin.id,
      effectiveFrom: new Date('2026-08-01'),
      effectiveTo: new Date('2027-01-31'),
    },
    {
      code: 'PR-000003',
      customerId: c2.id,
      serviceItem: 'Perforating',
      rateType: 'Per Run',
      rate: 980,
      unit: 'Run',
      status: CrmRecordStatus.PENDING,
      ownerId: torres.id,
      effectiveFrom: new Date('2026-10-01'),
    },
    {
      code: 'PR-000004',
      customerId: c4.id,
      serviceItem: 'Slickline',
      rateType: 'Per Job',
      rate: 750,
      unit: 'Job',
      status: CrmRecordStatus.EXPIRED,
      ownerId: torres.id,
      effectiveFrom: new Date('2025-01-01'),
      effectiveTo: new Date('2026-01-01'),
    },
    {
      code: 'PR-000005',
      customerId: c5.id,
      serviceItem: 'Wireline Logging',
      rateType: 'Per Job',
      rate: 1400,
      unit: 'Job',
      status: CrmRecordStatus.ACTIVE,
      ownerId: nguyen.id,
      effectiveFrom: new Date('2026-07-01'),
      effectiveTo: new Date('2027-06-30'),
    },
    {
      code: 'PR-000006',
      customerId: c5.id,
      serviceItem: 'Pump Down',
      rateType: 'Per HR',
      rate: 210,
      unit: 'Hour',
      status: CrmRecordStatus.ACTIVE,
      ownerId: nguyen.id,
      effectiveFrom: new Date('2026-07-01'),
      effectiveTo: new Date('2027-06-30'),
    },
    {
      code: 'PR-000007',
      customerId: c7.id,
      serviceItem: 'Perforating',
      rateType: 'Per Run',
      rate: 1100,
      unit: 'Run',
      status: CrmRecordStatus.ACTIVE,
      ownerId: nguyen.id,
      effectiveFrom: new Date('2026-06-01'),
      effectiveTo: new Date('2026-12-31'),
    },
    {
      code: 'PR-000008',
      customerId: c8.id,
      serviceItem: 'Slickline',
      rateType: 'Per Job',
      rate: 820,
      unit: 'Job',
      status: CrmRecordStatus.PENDING,
      ownerId: torres.id,
      effectiveFrom: new Date('2026-09-15'),
    },
  ];

  for (const data of pricingDefs) {
    await prisma.pricingRule.upsert({
      where: { code: data.code },
      update: {
        serviceItem: data.serviceItem,
        rateType: data.rateType,
        rate: data.rate,
        status: data.status,
        customerId: data.customerId,
      },
      create: data,
    });
  }

  // ─── Requirements ─────────────────────────────────────────────────────────
  const reqDefs = [
    {
      code: 'REQ-000001',
      customerId: c1.id,
      name: 'H2S Safety Certification',
      requirementType: 'Certification',
      appliesTo: 'All',
      enforcementLevel: EnforcementLevel.HARD_GATE,
      renewalPeriod: 'Annually',
      status: CrmRecordStatus.ACTIVE,
      ownerId: admin.id,
      evidenceRequired: true,
      docsRequired: true,
    },
    {
      code: 'REQ-000002',
      customerId: c2.id,
      name: 'COI / Insurance Certificate',
      requirementType: 'Insurance',
      appliesTo: 'Contractors',
      enforcementLevel: EnforcementLevel.SOFT_GATE,
      renewalPeriod: 'Annually',
      status: CrmRecordStatus.NEEDS_REVIEW,
      ownerId: torres.id,
      evidenceRequired: true,
      docsRequired: true,
    },
    {
      code: 'REQ-000003',
      customerId: c3.id,
      name: 'MSA Contract Review',
      requirementType: 'Contract',
      appliesTo: 'All',
      enforcementLevel: EnforcementLevel.ADVISORY,
      renewalPeriod: 'Quarterly',
      status: CrmRecordStatus.PENDING,
      ownerId: admin.id,
    },
    {
      code: 'REQ-000004',
      customerId: c5.id,
      name: 'Well Control Certification',
      requirementType: 'Certification',
      appliesTo: 'Field',
      enforcementLevel: EnforcementLevel.HARD_GATE,
      renewalPeriod: 'Annually',
      status: CrmRecordStatus.ACTIVE,
      ownerId: nguyen.id,
      evidenceRequired: true,
    },
    {
      code: 'REQ-000005',
      customerId: c7.id,
      name: 'W-9 / Tax Documentation',
      requirementType: 'Tax',
      appliesTo: 'All',
      enforcementLevel: EnforcementLevel.SOFT_GATE,
      renewalPeriod: 'Annually',
      status: CrmRecordStatus.ACTIVE,
      ownerId: nguyen.id,
      docsRequired: true,
    },
    {
      code: 'REQ-000006',
      customerId: c8.id,
      name: 'Site Safety Orientation',
      requirementType: 'Safety',
      appliesTo: 'Field',
      enforcementLevel: EnforcementLevel.HARD_GATE,
      renewalPeriod: 'Monthly',
      status: CrmRecordStatus.EXPIRED,
      ownerId: torres.id,
    },
    {
      code: 'REQ-000007',
      customerId: c4.id,
      name: 'Insurance Rider – Utilities',
      requirementType: 'Insurance',
      appliesTo: 'All',
      enforcementLevel: EnforcementLevel.SOFT_GATE,
      renewalPeriod: 'Annually',
      status: CrmRecordStatus.ACTIVE,
      ownerId: torres.id,
    },
  ];

  for (const data of reqDefs) {
    await prisma.customerRequirement.upsert({
      where: { code: data.code },
      update: {
        name: data.name,
        requirementType: data.requirementType,
        enforcementLevel: data.enforcementLevel,
        status: data.status,
        customerId: data.customerId,
      },
      create: data,
    });
  }

  // ─── Form rules ───────────────────────────────────────────────────────────
  const formDefs = [
    {
      code: 'FR-000001',
      customerId: c1.id,
      jobType: 'JSA',
      formTemplate: 'Wireline Operations V2',
      required: true,
      hardGate: false,
      status: CrmRecordStatus.ACTIVE,
      ownerId: admin.id,
    },
    {
      code: 'FR-000002',
      customerId: c2.id,
      jobType: 'Permit to Work',
      formTemplate: 'Permit to Work',
      required: true,
      hardGate: true,
      status: CrmRecordStatus.ACTIVE,
      ownerId: torres.id,
    },
    {
      code: 'FR-000003',
      customerId: c1.id,
      jobType: 'H2S',
      formTemplate: 'Tailgate',
      required: true,
      hardGate: true,
      status: CrmRecordStatus.DRAFT,
      ownerId: admin.id,
    },
    {
      code: 'FR-000004',
      customerId: c5.id,
      jobType: 'Wireline',
      formTemplate: 'Wireline Operations V2',
      required: true,
      hardGate: true,
      status: CrmRecordStatus.ACTIVE,
      ownerId: nguyen.id,
    },
    {
      code: 'FR-000005',
      customerId: c7.id,
      jobType: 'JSA',
      formTemplate: 'JSA',
      required: true,
      hardGate: false,
      status: CrmRecordStatus.ACTIVE,
      ownerId: nguyen.id,
    },
    {
      code: 'FR-000006',
      customerId: c8.id,
      jobType: 'H2S',
      formTemplate: 'EOD Report',
      required: true,
      hardGate: false,
      status: CrmRecordStatus.INACTIVE,
      ownerId: torres.id,
    },
  ];

  for (const data of formDefs) {
    await prisma.formRule.upsert({
      where: { code: data.code },
      update: {
        jobType: data.jobType,
        formTemplate: data.formTemplate,
        hardGate: data.hardGate,
        status: data.status,
        customerId: data.customerId,
      },
      create: data,
    });
  }

  // ─── Route rules ──────────────────────────────────────────────────────────
  const routeDefs = [
    {
      code: 'RR-000001',
      customerId: c1.id,
      locationId: loc1.id,
      geofenceRadius: '500 FT',
      gpsRequired: true,
      routeFrom: 'Midland Yard – Highway 349',
      routeLabel: 'Wolfcamp inbound',
      status: CrmRecordStatus.ACTIVE,
      ownerId: admin.id,
    },
    {
      code: 'RR-000002',
      customerId: c1.id,
      locationId: loc2.id,
      geofenceRadius: '750 FT',
      gpsRequired: true,
      routeFrom: 'Midland Yard – I-20',
      routeLabel: 'Spraberry pad route',
      status: CrmRecordStatus.ACTIVE,
      ownerId: admin.id,
    },
    {
      code: 'RR-000003',
      customerId: c2.id,
      locationId: loc3.id,
      geofenceRadius: '500 FT',
      gpsRequired: false,
      routeFrom: 'Pecos Staging',
      routeLabel: 'Bone Spring route',
      status: CrmRecordStatus.INACTIVE,
      ownerId: torres.id,
    },
    {
      code: 'RR-000004',
      customerId: c5.id,
      locationId: loc5.id,
      geofenceRadius: '600 FT',
      gpsRequired: true,
      routeFrom: 'Pecos Yard',
      routeLabel: 'Avalon 9H',
      status: CrmRecordStatus.ACTIVE,
      ownerId: nguyen.id,
    },
    {
      code: 'RR-000005',
      customerId: c5.id,
      locationId: loc6.id,
      geofenceRadius: '800 FT',
      gpsRequired: true,
      routeFrom: 'Kermit Staging',
      routeLabel: 'Phantom Pad A',
      status: CrmRecordStatus.ACTIVE,
      ownerId: nguyen.id,
    },
    {
      code: 'RR-000006',
      customerId: c7.id,
      locationId: loc7.id,
      geofenceRadius: '1200 FT',
      gpsRequired: false,
      routeFrom: 'Hobbs Depot',
      routeLabel: 'Facility North',
      status: CrmRecordStatus.ACTIVE,
      ownerId: nguyen.id,
    },
    {
      code: 'RR-000007',
      customerId: c8.id,
      locationId: loc8.id,
      geofenceRadius: '500 FT',
      gpsRequired: true,
      routeFrom: 'Midland Yard',
      routeLabel: 'Vaquero Central',
      status: CrmRecordStatus.ACTIVE,
      ownerId: torres.id,
    },
  ];

  for (const data of routeDefs) {
    await prisma.routeRule.upsert({
      where: { code: data.code },
      update: {
        customerId: data.customerId,
        locationId: data.locationId,
        gpsRequired: data.gpsRequired,
        status: data.status,
        routeLabel: data.routeLabel,
      },
      create: data,
    });
  }

  // ─── Quotes ───────────────────────────────────────────────────────────────
  const quoteDefs = [
    {
      quoteNumber: 'Q-2026-0001',
      customerId: c1.id,
      contactId: contacts[0].id,
      ownerId: admin.id,
      amount: 12500,
      status: CrmRecordStatus.SENT,
      expiresAt: new Date('2026-10-15'),
      sentAt: new Date('2026-09-01'),
      terms: 'Net 30',
      lines: [
        { item: 'Wireline Logging', quantity: 4, rate: 1250, amount: 5000 },
        { item: 'Pump Down', quantity: 40, rate: 185, amount: 7400 },
      ],
    },
    {
      quoteNumber: 'Q-2026-0002',
      customerId: c2.id,
      contactId: contacts[1].id,
      ownerId: torres.id,
      amount: 9800,
      status: CrmRecordStatus.DRAFT,
      expiresAt: new Date('2026-11-01'),
      terms: 'Net 30',
      lines: [
        { item: 'Perforating', quantity: 10, rate: 980, amount: 9800 },
      ],
    },
    {
      quoteNumber: 'Q-2026-0003',
      customerId: c4.id,
      contactId: contacts[3].id,
      ownerId: torres.id,
      amount: 7500,
      status: CrmRecordStatus.WON,
      expiresAt: new Date('2026-08-01'),
      sentAt: new Date('2026-07-10'),
      terms: 'Net 15',
      lines: [{ item: 'Slickline', quantity: 10, rate: 750, amount: 7500 }],
    },
    {
      quoteNumber: 'Q-2026-0004',
      customerId: c5.id,
      contactId: contacts[5].id,
      ownerId: nguyen.id,
      amount: 28400,
      status: CrmRecordStatus.SENT,
      expiresAt: new Date('2026-10-30'),
      sentAt: new Date('2026-09-03'),
      terms: 'Net 30',
      lines: [
        { item: 'Wireline Logging', quantity: 8, rate: 1400, amount: 11200 },
        { item: 'Pump Down', quantity: 80, rate: 210, amount: 16800 },
      ],
    },
    {
      quoteNumber: 'Q-2026-0005',
      customerId: c7.id,
      contactId: contacts[7].id,
      ownerId: nguyen.id,
      amount: 11000,
      status: CrmRecordStatus.OPEN,
      expiresAt: new Date('2026-11-15'),
      sentAt: new Date('2026-09-04'),
      terms: 'Net 60',
      lines: [{ item: 'Perforating', quantity: 10, rate: 1100, amount: 11000 }],
    },
    {
      quoteNumber: 'Q-2026-0006',
      customerId: c8.id,
      contactId: contacts[8].id,
      ownerId: torres.id,
      amount: 4100,
      status: CrmRecordStatus.LOST,
      expiresAt: new Date('2026-08-20'),
      sentAt: new Date('2026-07-20'),
      terms: 'Net 15',
      lines: [{ item: 'Slickline', quantity: 5, rate: 820, amount: 4100 }],
    },
    {
      quoteNumber: 'Q-2026-0007',
      customerId: c1.id,
      contactId: contacts[4].id,
      ownerId: admin.id,
      amount: 5550,
      status: CrmRecordStatus.PENDING,
      expiresAt: new Date('2026-10-01'),
      terms: 'Net 30',
      lines: [{ item: 'Pump Down', quantity: 30, rate: 185, amount: 5550 }],
    },
    {
      quoteNumber: 'Q-2026-0008',
      customerId: c3.id,
      contactId: contacts[2].id,
      ownerId: admin.id,
      amount: 2500,
      status: CrmRecordStatus.EXPIRED,
      expiresAt: new Date('2026-06-01'),
      sentAt: new Date('2026-05-01'),
      terms: 'Net 15',
      lines: [{ item: 'Wireline Logging', quantity: 2, rate: 1250, amount: 2500 }],
    },
  ];

  for (const def of quoteDefs) {
    const quote = await prisma.quote.upsert({
      where: { quoteNumber: def.quoteNumber },
      update: {
        amount: def.amount,
        status: def.status,
        customerId: def.customerId,
        contactId: def.contactId,
        ownerId: def.ownerId,
      },
      create: {
        quoteNumber: def.quoteNumber,
        customerId: def.customerId,
        contactId: def.contactId,
        ownerId: def.ownerId,
        amount: def.amount,
        status: def.status,
        expiresAt: def.expiresAt,
        sentAt: def.sentAt,
        terms: def.terms,
      },
    });
    await prisma.quoteLineItem.deleteMany({ where: { quoteId: quote.id } });
    await prisma.quoteLineItem.createMany({
      data: def.lines.map((line, i) => ({
        quoteId: quote.id,
        item: line.item,
        quantity: line.quantity,
        rate: line.rate,
        amount: line.amount,
        sortOrder: i,
      })),
    });
  }

  // ─── Sales activities ─────────────────────────────────────────────────────
  const activityDefs = [
    {
      activityCode: 'ACT-000001',
      type: SalesActivityType.CALL,
      subject: 'Follow-up on wireline quote',
      outcome: 'Connected',
      duration: '30 min',
      status: CrmRecordStatus.COMPLETE,
      customerId: c1.id,
      contactId: contacts[0].id,
      repId: admin.id,
      activityAt: new Date('2026-09-02T15:00:00Z'),
    },
    {
      activityCode: 'ACT-000002',
      type: SalesActivityType.VISIT,
      subject: 'Site walkthrough – Spraberry Pad 7',
      outcome: 'Won Interest',
      duration: '1 hr',
      status: CrmRecordStatus.COMPLETE,
      customerId: c1.id,
      contactId: contacts[0].id,
      repId: admin.id,
      activityAt: new Date('2026-09-03T18:00:00Z'),
    },
    {
      activityCode: 'ACT-000003',
      type: SalesActivityType.MEETING,
      subject: 'Pricing review – Lonestar',
      outcome: 'Follow-up Set',
      duration: '45 min',
      status: CrmRecordStatus.COMPLETE,
      customerId: c2.id,
      contactId: contacts[1].id,
      repId: torres.id,
      activityAt: new Date('2026-09-04T16:30:00Z'),
    },
    {
      activityCode: 'ACT-000004',
      type: SalesActivityType.EMAIL,
      subject: 'MSA docs request',
      outcome: 'Left Voicemail',
      duration: '15 min',
      status: CrmRecordStatus.IN_PROGRESS,
      customerId: c3.id,
      contactId: contacts[2].id,
      repId: admin.id,
      activityAt: new Date('2026-09-05T14:00:00Z'),
    },
    {
      activityCode: 'ACT-000005',
      type: SalesActivityType.CALL,
      subject: 'Delaware Basin Q-2026-0004 follow-up',
      outcome: 'Connected',
      duration: '20 min',
      status: CrmRecordStatus.COMPLETE,
      customerId: c5.id,
      contactId: contacts[5].id,
      repId: nguyen.id,
      activityAt: new Date('2026-09-03T20:00:00Z'),
    },
    {
      activityCode: 'ACT-000006',
      type: SalesActivityType.VISIT,
      subject: 'Avalon 9H site check',
      outcome: 'Won Interest',
      duration: '1 hr',
      status: CrmRecordStatus.COMPLETE,
      customerId: c5.id,
      contactId: contacts[5].id,
      repId: nguyen.id,
      activityAt: new Date('2026-09-04T19:00:00Z'),
    },
    {
      activityCode: 'ACT-000007',
      type: SalesActivityType.MEETING,
      subject: 'Summit Production kickoff',
      outcome: 'Follow-up Set',
      duration: '1 hr',
      status: CrmRecordStatus.COMPLETE,
      customerId: c7.id,
      contactId: contacts[7].id,
      repId: nguyen.id,
      activityAt: new Date('2026-09-02T17:00:00Z'),
    },
    {
      activityCode: 'ACT-000008',
      type: SalesActivityType.EMAIL,
      subject: 'Vaquero quote lost – reason capture',
      outcome: 'No Answer',
      duration: '15 min',
      status: CrmRecordStatus.COMPLETE,
      customerId: c8.id,
      contactId: contacts[8].id,
      repId: torres.id,
      activityAt: new Date('2026-08-25T15:00:00Z'),
    },
    {
      activityCode: 'ACT-000009',
      type: SalesActivityType.CALL,
      subject: 'Rio Grande renewals check-in',
      outcome: 'Connected',
      duration: '25 min',
      status: CrmRecordStatus.COMPLETE,
      customerId: c4.id,
      contactId: contacts[3].id,
      repId: torres.id,
      activityAt: new Date('2026-09-01T16:00:00Z'),
    },
    {
      activityCode: 'ACT-000010',
      type: SalesActivityType.OTHER,
      subject: 'Frontier reactivation outreach',
      outcome: 'Left Voicemail',
      duration: '10 min',
      status: CrmRecordStatus.IN_PROGRESS,
      customerId: c6.id,
      contactId: contacts[6].id,
      repId: admin.id,
      activityAt: new Date('2026-09-05T13:00:00Z'),
    },
  ];

  for (const data of activityDefs) {
    await prisma.salesActivity.upsert({
      where: { activityCode: data.activityCode },
      update: {
        subject: data.subject,
        outcome: data.outcome,
        status: data.status,
        customerId: data.customerId,
        repId: data.repId,
      },
      create: data,
    });
  }

  // ─── EOD reports ──────────────────────────────────────────────────────────
  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);
  const day = (offset: number) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + offset);
    return d;
  };

  const eodDefs = [
    {
      reportCode: 'EOD-SEED-001',
      reportDate: day(-3),
      submittedAt: day(-3),
      activitiesCount: 5,
      callsCount: 3,
      visitsCount: 1,
      meetingsCount: 1,
      status: CrmRecordStatus.SUBMITTED,
      pipelineValue: 52000,
      quotesSent: 2,
      closedToday: 7500,
      repId: admin.id,
      lines: [
        'Called James Whitfield re: Q-2026-0001',
        'Visited Spraberry Pad 7',
        'Closed slickline work for Rio Grande',
      ],
    },
    {
      reportCode: 'EOD-SEED-002',
      reportDate: day(-2),
      submittedAt: day(-2),
      activitiesCount: 4,
      callsCount: 2,
      visitsCount: 1,
      meetingsCount: 1,
      status: CrmRecordStatus.SUBMITTED,
      pipelineValue: 61000,
      quotesSent: 1,
      closedToday: 0,
      repId: torres.id,
      lines: [
        'Lonestar pricing review meeting',
        'Rio Grande renewals call',
      ],
    },
    {
      reportCode: 'EOD-SEED-003',
      reportDate: day(-1),
      submittedAt: day(-1),
      activitiesCount: 6,
      callsCount: 2,
      visitsCount: 2,
      meetingsCount: 2,
      status: CrmRecordStatus.SUBMITTED,
      pipelineValue: 74000,
      quotesSent: 2,
      closedToday: 11000,
      repId: nguyen.id,
      lines: [
        'Delaware Basin quote follow-up',
        'Avalon 9H site check',
        'Summit Production kickoff',
      ],
    },
    {
      reportCode: 'EOD-SEED-004',
      reportDate: today,
      submittedAt: null,
      activitiesCount: 2,
      callsCount: 1,
      visitsCount: 0,
      meetingsCount: 1,
      status: CrmRecordStatus.DRAFT,
      pipelineValue: 68000,
      quotesSent: 0,
      closedToday: 0,
      repId: admin.id,
      lines: ['Frontier reactivation outreach', 'Cactus MSA docs chase'],
    },
    {
      reportCode: 'EOD-SEED-005',
      reportDate: today,
      submittedAt: null,
      activitiesCount: 1,
      callsCount: 1,
      visitsCount: 0,
      meetingsCount: 0,
      status: CrmRecordStatus.PENDING,
      pipelineValue: 41000,
      quotesSent: 0,
      closedToday: 0,
      repId: torres.id,
      lines: ['Vaquero lost-quote follow-up'],
    },
  ];

  for (const def of eodDefs) {
    const eod = await prisma.eodReport.upsert({
      where: { reportCode: def.reportCode },
      update: {
        status: def.status,
        activitiesCount: def.activitiesCount,
        pipelineValue: def.pipelineValue,
        quotesSent: def.quotesSent,
        closedToday: def.closedToday,
        repId: def.repId,
        reportDate: def.reportDate,
        submittedAt: def.submittedAt,
      },
      create: {
        reportCode: def.reportCode,
        reportDate: def.reportDate,
        submittedAt: def.submittedAt,
        activitiesCount: def.activitiesCount,
        callsCount: def.callsCount,
        visitsCount: def.visitsCount,
        meetingsCount: def.meetingsCount,
        status: def.status,
        pipelineValue: def.pipelineValue,
        quotesSent: def.quotesSent,
        closedToday: def.closedToday,
        repId: def.repId,
      },
    });
    await prisma.eodActivityLine.deleteMany({ where: { eodReportId: eod.id } });
    await prisma.eodActivityLine.createMany({
      data: def.lines.map((summary, i) => ({
        eodReportId: eod.id,
        summary,
        sortOrder: i,
      })),
    });
  }

  // ─── Customer documents ───────────────────────────────────────────────────
  const docDefs = [
    {
      name: 'MSA – Permian Basin Energy',
      kind: 'MSA',
      customerId: c1.id,
      expiresAt: new Date('2027-03-15'),
    },
    {
      name: 'COI – Lonestar Oilfield',
      kind: 'COI',
      customerId: c2.id,
      expiresAt: new Date('2026-11-01'),
    },
    {
      name: 'W-9 – Summit Production',
      kind: 'W9',
      customerId: c7.id,
      expiresAt: null,
    },
    {
      name: 'MSA – Delaware Basin Co.',
      kind: 'MSA',
      customerId: c5.id,
      expiresAt: new Date('2027-01-10'),
    },
  ];

  for (const doc of docDefs) {
    const existing = await prisma.crmDocument.findFirst({
      where: { customerId: doc.customerId, name: doc.name },
    });
    if (existing) {
      await prisma.crmDocument.update({
        where: { id: existing.id },
        data: { kind: doc.kind, expiresAt: doc.expiresAt },
      });
    } else {
      await prisma.crmDocument.create({ data: doc });
    }
  }

  // ─── Work orders ──────────────────────────────────────────────────────────
  const workOrderDefs = [
    {
      code: 'WO-000001',
      title: 'Wireline logging – Wolfcamp 12-4H',
      category: 'Wireline',
      status: CrmRecordStatus.IN_PROGRESS,
      serviceDate: new Date('2026-09-08'),
      scheduledStart: '07:00' as string | null,
      scheduledEnd: '17:00' as string | null,
      notes: 'Open job for Permian Basin Energy',
      customerId: c1.id,
      locationId: loc1.id,
      assignedRepId: admin.id,
    },
    {
      code: 'WO-000002',
      title: 'Pump down – Spraberry Pad 7',
      category: 'Pump Down',
      status: CrmRecordStatus.OPEN,
      serviceDate: new Date('2026-09-10'),
      scheduledStart: '06:30' as string | null,
      scheduledEnd: '16:30' as string | null,
      notes: 'Follow-up WO linked to open jobs',
      customerId: c1.id,
      locationId: loc2.id,
      assignedRepId: admin.id,
    },
    {
      code: 'WO-000003',
      title: 'Perforating – Avalon 9H',
      category: 'Perforating',
      status: CrmRecordStatus.DRAFT,
      serviceDate: new Date('2026-09-12'),
      scheduledStart: null as string | null,
      scheduledEnd: null as string | null,
      notes: 'Draft WO for Delaware Basin Co.',
      customerId: c5.id,
      locationId: loc5.id,
      assignedRepId: nguyen.id,
    },
  ];

  for (const data of workOrderDefs) {
    await prisma.workOrder.upsert({
      where: { code: data.code },
      update: {
        title: data.title,
        category: data.category,
        status: data.status,
        serviceDate: data.serviceDate,
        scheduledStart: data.scheduledStart,
        scheduledEnd: data.scheduledEnd,
        notes: data.notes,
        customerId: data.customerId,
        locationId: data.locationId,
        assignedRepId: data.assignedRepId,
      },
      create: data,
    });
  }

  // Clean legacy short EOD codes if present from older seed
  await prisma.eodReport.deleteMany({
    where: { reportCode: { in: ['EOD-2026-0904', 'EOD-2026-0905'] } },
  });

  console.log(
    `CRM seed: ${customers.length} customers, ${contacts.length} contacts, ${locations.length} locations`,
  );
  console.log(
    `Pricing ${pricingDefs.length}, requirements ${reqDefs.length}, form ${formDefs.length}, route ${routeDefs.length}`,
  );
  console.log(
    `Quotes ${quoteDefs.length}, sales ${activityDefs.length}, EOD ${eodDefs.length}, docs ${docDefs.length}, workOrders ${workOrderDefs.length}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
