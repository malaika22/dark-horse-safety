import {
  AccountStatus,
  CrmRecordStatus,
  CrmTaskPriority,
  EmployeeStatus,
  EnforcementLevel,
  ExpenseStatus,
  PrismaClient,
  SalesActivityType,
  TimeEntryCategory,
  TimeEntrySource,
  TimeEntryStatus,
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
      netsuiteId: 'NS-0004471',
      netsuiteLastSyncAt: new Date(Date.now() - 2 * 60 * 1000),
      netsuiteLastResult: 'SUCCESS',
      netsuiteSyncError: null as string | null,
      netsuiteAutoExport: true,
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
      netsuiteId: 'NS-0004472',
      netsuiteLastSyncAt: new Date(Date.now() - 60 * 60 * 1000),
      netsuiteLastResult: 'SUCCESS',
      netsuiteSyncError: null as string | null,
      netsuiteAutoExport: false,
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
      netsuiteId: 'NS-0004473',
      netsuiteLastSyncAt: null as Date | null,
      netsuiteLastResult: null as string | null,
      netsuiteSyncError: null as string | null,
      netsuiteAutoExport: true,
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
      netsuiteId: 'NS-0004474',
      netsuiteLastSyncAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      netsuiteLastResult: 'FAILED',
      netsuiteSyncError: 'ST-00004 - Export rejected by NetSuite',
      netsuiteAutoExport: true,
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
      netsuiteId: null as string | null,
      netsuiteLastSyncAt: null as Date | null,
      netsuiteLastResult: null as string | null,
      netsuiteSyncError: null as string | null,
      netsuiteAutoExport: true,
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
      netsuiteId: null as string | null,
      netsuiteLastSyncAt: null as Date | null,
      netsuiteLastResult: null as string | null,
      netsuiteSyncError: null as string | null,
      netsuiteAutoExport: true,
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
      netsuiteId: null as string | null,
      netsuiteLastSyncAt: null as Date | null,
      netsuiteLastResult: null as string | null,
      netsuiteSyncError: null as string | null,
      netsuiteAutoExport: false,
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
      netsuiteId: null as string | null,
      netsuiteLastSyncAt: null as Date | null,
      netsuiteLastResult: null as string | null,
      netsuiteSyncError: null as string | null,
      netsuiteAutoExport: true,
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
        netsuiteId: data.netsuiteId,
        netsuiteLastSyncAt: data.netsuiteLastSyncAt,
        netsuiteLastResult: data.netsuiteLastResult,
        netsuiteSyncError: data.netsuiteSyncError,
        netsuiteAutoExport: data.netsuiteAutoExport,
      },
      create: { ...data },
    });
    customers.push(row);
  }
  const [c1, c2, c3, c4, c5, c6, c7, c8] = customers;

  // ─── NetSuite customer directory (for auto-match by name) ────────────────
  const nsDirectory = [
    {
      netsuiteId: 'NS-0004471',
      name: 'Permian Basin Energy',
      legalName: 'Permian Basin Energy Holdings LLC',
    },
    {
      netsuiteId: 'NS-0004472',
      name: 'Lonestar Oilfield',
      legalName: 'Lonestar Oilfield Services Inc',
    },
    {
      netsuiteId: 'NS-0004473',
      name: 'Cactus Well Services',
      legalName: 'Cactus Well Services LLC',
    },
    {
      netsuiteId: 'NS-0004474',
      name: 'Rio Grande Resources',
      legalName: 'Rio Grande Resources LP',
    },
    {
      netsuiteId: 'NS-0004475',
      name: 'Delaware Basin Co.',
      legalName: 'Delaware Basin Company LLC',
    },
    {
      netsuiteId: 'NS-0004476',
      name: 'Frontier Energy LLC',
      legalName: 'Frontier Energy Limited Liability Co',
    },
    {
      netsuiteId: 'NS-0004480',
      name: 'Eagle Ford Partners',
      legalName: 'Eagle Ford Partners LP',
    },
    {
      netsuiteId: 'NS-0004481',
      name: 'Midland Frac Services',
      legalName: 'Midland Frac Services Inc',
    },
  ] as const;

  for (const entry of nsDirectory) {
    const id = `nsdir_${entry.netsuiteId.toLowerCase()}`;
    await prisma.$executeRaw`
      INSERT INTO "NetSuiteCustomerDirectory" ("id", "netsuiteId", "name", "legalName", "customerType", "createdAt", "updatedAt")
      VALUES (${id}, ${entry.netsuiteId}, ${entry.name}, ${entry.legalName}, ${'CUSTOMER'}, NOW(), NOW())
      ON CONFLICT ("netsuiteId") DO UPDATE SET
        "name" = EXCLUDED."name",
        "legalName" = EXCLUDED."legalName",
        "customerType" = EXCLUDED."customerType",
        "updatedAt" = NOW()
    `;
  }

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
      siteType: 'Plugged',
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
      name: 'Spraberry 5-1H',
      wellPadNumber: 'SPB-501',
      county: 'Midland',
      state: 'TX',
      city: 'Midland',
      latitude: 31.92,
      longitude: -102.12,
      siteType: 'Well',
      status: CrmRecordStatus.ACTIVE,
      customerId: c8.id,
      gpsRequired: false,
      geofenceRadius: '500 FT',
      openJobs: 4,
      gpsStatus: 'Weak',
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
        city: data.city,
        siteType: data.siteType,
        latitude: data.latitude,
        longitude: data.longitude,
        gpsRequired: data.gpsRequired,
        geofenceRadius: data.geofenceRadius,
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
      netsuiteItem: 'NS-ITM-07',
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
      netsuiteItem: 'NS-ITM-08',
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
      netsuiteItem: 'NS-ITM-07',
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
        ...(data.netsuiteItem
          ? { netsuiteItem: data.netsuiteItem }
          : {}),
      },
      create: data,
    });
  }

  // ─── NetSuite item mapping + directory ────────────────────────────────────
  const now = Date.now();
  const nsItemDirectory = [
    { netsuiteItemId: 'NS-ITM-01', name: 'Site Safety Tech', category: 'SERVICE', rate: 160 },
    { netsuiteItemId: 'NS-ITM-02', name: 'Frac Water Haul', category: 'EQUIPMENT', rate: 85 },
    { netsuiteItemId: 'NS-ITM-03', name: 'H2S Monitoring', category: 'SERVICE', rate: 200 },
    { netsuiteItemId: 'NS-ITM-04', name: 'PPE Restock', category: 'EXPENSE', rate: 45 },
    { netsuiteItemId: 'NS-ITM-05', name: 'Site Walkdown', category: 'SERVICE', rate: 180 },
    { netsuiteItemId: 'NS-ITM-06', name: 'Light Tower Rental', category: 'EQUIPMENT', rate: 95 },
    { netsuiteItemId: 'NS-ITM-07', name: 'Wireline Logging', category: 'SERVICE', rate: 1250 },
    { netsuiteItemId: 'NS-ITM-08', name: 'Pump Down', category: 'SERVICE', rate: 185 },
    { netsuiteItemId: 'NS-ITM-09', name: 'Perforating', category: 'SERVICE', rate: 980 },
    { netsuiteItemId: 'NS-ITM-10', name: 'Slickline', category: 'SERVICE', rate: 750 },
  ] as const;

  for (const entry of nsItemDirectory) {
    const id = `nsitem_${entry.netsuiteItemId.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    await prisma.$executeRaw`
      INSERT INTO "NetSuiteItemDirectory" ("id", "netsuiteItemId", "name", "category", "rate", "createdAt", "updatedAt")
      VALUES (${id}, ${entry.netsuiteItemId}, ${entry.name}, ${entry.category}, ${entry.rate}, NOW(), NOW())
      ON CONFLICT ("netsuiteItemId") DO UPDATE SET
        "name" = EXCLUDED."name",
        "category" = EXCLUDED."category",
        "rate" = EXCLUDED."rate",
        "updatedAt" = NOW()
    `;
  }

  const itemMappingDefs = [
    {
      code: 'ITM-01',
      name: 'Site Safety Tech',
      category: 'SERVICE',
      netsuiteItemId: 'NS-ITM-01',
      direction: 'TWO-WAY',
      directionDetail: 'TRAVELING',
      health: 'HEALTHY',
      autoSync: true,
      lastSyncAt: new Date(now - 2 * 60 * 1000),
      lastResult: 'SUCCESS',
      syncError: null as string | null,
      ownerId: admin.id,
    },
    {
      code: 'ITM-02',
      name: 'Frac Water Haul',
      category: 'EQUIPMENT',
      netsuiteItemId: 'NS-ITM-02',
      direction: 'OUTBOUND',
      directionDetail: 'COMPLETED',
      health: 'HEALTHY',
      autoSync: true,
      lastSyncAt: new Date(now - 60 * 60 * 1000),
      lastResult: 'SUCCESS',
      syncError: null as string | null,
      ownerId: admin.id,
    },
    {
      code: 'ITM-03',
      name: 'H2S Monitoring',
      category: 'SERVICE',
      netsuiteItemId: 'NS-ITM-03',
      direction: 'TWO-WAY',
      directionDetail: 'ON SITE',
      health: 'HEALTHY',
      autoSync: true,
      lastSyncAt: new Date(now - 45 * 60 * 1000),
      lastResult: 'SUCCESS',
      syncError: null as string | null,
      ownerId: admin.id,
    },
    {
      code: 'ITM-04',
      name: 'PPE Restock',
      category: 'EXPENSE',
      netsuiteItemId: 'NS-ITM-04',
      direction: 'OUTBOUND',
      directionDetail: 'COMPLETED',
      health: 'DEGRADED',
      autoSync: false,
      lastSyncAt: new Date(now - 3 * 60 * 60 * 1000),
      lastResult: 'SUCCESS',
      syncError: null as string | null,
      ownerId: admin.id,
    },
    {
      code: 'ITM-05',
      name: 'Site Walkdown',
      category: 'SERVICE',
      netsuiteItemId: null as string | null,
      direction: 'OUTBOUND',
      directionDetail: null as string | null,
      health: null as string | null,
      autoSync: false,
      lastSyncAt: null as Date | null,
      lastResult: null as string | null,
      syncError: null as string | null,
      ownerId: admin.id,
    },
    {
      code: 'ITM-06',
      name: 'Light Tower Rental',
      category: 'EQUIPMENT',
      netsuiteItemId: 'NS-ITM-06',
      direction: 'OUTBOUND',
      directionDetail: null as string | null,
      health: 'HEALTHY',
      autoSync: true,
      lastSyncAt: null as Date | null,
      lastResult: null as string | null,
      syncError: null as string | null,
      ownerId: admin.id,
    },
    {
      code: 'ITM-07',
      name: 'Wireline Logging',
      category: 'SERVICE',
      netsuiteItemId: 'NS-ITM-07',
      direction: 'TWO-WAY',
      directionDetail: 'ON SITE',
      health: 'HEALTHY',
      autoSync: true,
      lastSyncAt: new Date(now - 10 * 60 * 1000),
      lastResult: 'SUCCESS',
      syncError: null as string | null,
      ownerId: admin.id,
    },
    {
      code: 'ITM-08',
      name: 'Pump Down',
      category: 'SERVICE',
      netsuiteItemId: 'NS-ITM-08',
      direction: 'OUTBOUND',
      directionDetail: 'COMPLETED',
      health: 'HEALTHY',
      autoSync: true,
      lastSyncAt: new Date(now - 90 * 60 * 1000),
      lastResult: 'SUCCESS',
      syncError: null as string | null,
      ownerId: torres.id,
    },
  ] as const;

  for (const data of itemMappingDefs) {
    await prisma.netSuiteItemMapping.upsert({
      where: { code: data.code },
      update: {
        name: data.name,
        category: data.category,
        netsuiteItemId: data.netsuiteItemId,
        direction: data.direction,
        directionDetail: data.directionDetail,
        health: data.health,
        autoSync: data.autoSync,
        lastSyncAt: data.lastSyncAt,
        lastResult: data.lastResult,
        syncError: data.syncError,
        ownerId: data.ownerId,
        archivedAt: null,
      },
      create: { ...data },
    });
  }

  // ─── Item rate mapping ────────────────────────────────────────────────────
  const itemRateDefs = [
    {
      code: 'ITM-01',
      name: 'Site Safety Tech',
      dhsRate: 160,
      netsuiteItemId: 'NS-ITM-01',
      netsuiteRate: 160,
      unit: 'PER HR',
      duration: '2 DAYS',
      effectiveFrom: new Date('2025-01-01'),
      effectiveDetail: 'TRAVELING',
      autoSync: true,
      ownerId: admin.id,
    },
    {
      code: 'ITM-02',
      name: 'Frac Water Haul',
      dhsRate: 85,
      netsuiteItemId: 'NS-ITM-02',
      netsuiteRate: 85,
      unit: 'PER LOAD',
      duration: '1 DAY',
      effectiveFrom: new Date('2025-02-01'),
      effectiveDetail: 'COMPLETED',
      autoSync: true,
      ownerId: admin.id,
    },
    {
      code: 'ITM-03',
      name: 'H2S Monitoring',
      dhsRate: 220,
      netsuiteItemId: 'NS-ITM-03',
      netsuiteRate: 200,
      unit: 'PER DAY',
      duration: '3 DAYS',
      effectiveFrom: new Date('2025-01-15'),
      effectiveDetail: 'ON SITE',
      autoSync: true,
      ownerId: admin.id,
    },
    {
      code: 'ITM-04',
      name: 'PPE Restock',
      dhsRate: 45,
      netsuiteItemId: null as string | null,
      netsuiteRate: null as number | null,
      unit: 'PER BOX',
      duration: null as string | null,
      effectiveFrom: new Date('2025-03-01'),
      effectiveDetail: null as string | null,
      autoSync: false,
      ownerId: admin.id,
    },
    {
      code: 'ITM-05',
      name: 'Site Walkdown',
      dhsRate: 175,
      netsuiteItemId: 'NS-ITM-05',
      netsuiteRate: 180,
      unit: 'PER VISIT',
      duration: '1 DAY',
      effectiveFrom: new Date('2025-01-20'),
      effectiveDetail: 'TRAVELING',
      autoSync: true,
      ownerId: admin.id,
    },
    {
      code: 'ITM-06',
      name: 'Light Tower Rental',
      dhsRate: 95,
      netsuiteItemId: 'NS-ITM-06',
      netsuiteRate: 95,
      unit: 'PER DAY',
      duration: '7 DAYS',
      effectiveFrom: new Date('2025-02-10'),
      effectiveDetail: 'COMPLETED',
      autoSync: false,
      ownerId: admin.id,
    },
    {
      code: 'ITM-07',
      name: 'Wireline Logging',
      dhsRate: 1250,
      netsuiteItemId: 'NS-ITM-07',
      netsuiteRate: 1250,
      unit: 'PER JOB',
      duration: '1 DAY',
      effectiveFrom: new Date('2025-01-01'),
      effectiveDetail: 'COMPLETED',
      autoSync: true,
      ownerId: admin.id,
    },
    {
      code: 'ITM-08',
      name: 'Pump Down',
      dhsRate: 185,
      netsuiteItemId: 'NS-ITM-08',
      netsuiteRate: 185,
      unit: 'PER HR',
      duration: '4 DAYS',
      effectiveFrom: new Date('2025-02-15'),
      effectiveDetail: 'ON SITE',
      autoSync: true,
      ownerId: torres.id,
    },
  ] as const;

  for (const data of itemRateDefs) {
    await prisma.itemRateMapping.upsert({
      where: { code: data.code },
      update: {
        name: data.name,
        dhsRate: data.dhsRate,
        netsuiteItemId: data.netsuiteItemId,
        netsuiteRate: data.netsuiteRate,
        unit: data.unit,
        duration: data.duration,
        effectiveFrom: data.effectiveFrom,
        effectiveDetail: data.effectiveDetail,
        autoSync: data.autoSync,
        ownerId: data.ownerId,
        archivedAt: null,
      },
      create: { ...data },
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
      code: 'FR-5501',
      customerId: c1.id,
      jobType: 'All Jobs',
      formTemplate: 'JSA',
      required: true,
      hardGate: true,
      blocksToggle: true,
      trigger: 'On Dispatch',
      appliesTo: 'All Jobs',
      due: 'Before Dispatch',
      version: 'V3',
      status: CrmRecordStatus.ACTIVE,
      ownerId: admin.id,
    },
    {
      code: 'FR-5502',
      customerId: c1.id,
      jobType: 'Well Sites',
      formTemplate: 'Permit to Work',
      required: true,
      hardGate: false,
      blocksToggle: true,
      trigger: 'On Start',
      appliesTo: 'Well Sites',
      due: 'Before Dispatch',
      version: 'V2',
      status: CrmRecordStatus.ACTIVE,
      ownerId: admin.id,
    },
    {
      code: 'FR-5503',
      customerId: c3.id,
      jobType: 'Fleet Jobs',
      formTemplate: 'BBS Stop Card',
      required: true,
      hardGate: false,
      blocksToggle: false,
      trigger: 'Per Shift',
      appliesTo: 'Fleet Jobs',
      due: 'Before Closeout',
      version: 'V1',
      status: CrmRecordStatus.INACTIVE,
      ownerId: torres.id,
    },
    {
      code: 'FR-5504',
      customerId: c5.id,
      jobType: 'H2S Sites',
      formTemplate: 'Equipment Inspection',
      required: true,
      hardGate: false,
      blocksToggle: true,
      trigger: 'On Dispatch',
      appliesTo: 'H2S Sites',
      due: 'Before Dispatch',
      version: 'V2',
      status: CrmRecordStatus.ACTIVE,
      ownerId: nguyen.id,
    },
    {
      code: 'FR-5505',
      customerId: c5.id,
      jobType: 'All Jobs',
      formTemplate: 'Air Quality Test',
      required: true,
      hardGate: false,
      blocksToggle: false,
      trigger: 'On Start',
      appliesTo: 'All Jobs',
      due: 'Before Closeout',
      version: 'V1',
      status: CrmRecordStatus.DRAFT,
      ownerId: nguyen.id,
    },
    {
      code: 'FR-5506',
      customerId: c1.id,
      jobType: 'H2S Sites',
      formTemplate: 'H2S Certification',
      required: true,
      hardGate: true,
      blocksToggle: true,
      trigger: 'On Dispatch',
      appliesTo: 'H2S Sites',
      due: 'Before Dispatch',
      version: 'V3',
      status: CrmRecordStatus.ACTIVE,
      ownerId: admin.id,
    },
    {
      code: 'FR-5507',
      customerId: c3.id,
      jobType: 'All Jobs',
      formTemplate: 'COI On File',
      required: true,
      hardGate: false,
      blocksToggle: true,
      trigger: 'On Dispatch',
      appliesTo: 'All Jobs',
      due: 'Before Dispatch',
      version: 'V2',
      status: CrmRecordStatus.ACTIVE,
      ownerId: torres.id,
    },
    {
      code: 'FR-5508',
      customerId: c7.id,
      jobType: 'Well Sites',
      formTemplate: 'Safety Orientation',
      required: true,
      hardGate: false,
      blocksToggle: false,
      trigger: 'On Start',
      appliesTo: 'Well Sites',
      due: 'Before Closeout',
      version: 'V1',
      status: CrmRecordStatus.ACTIVE,
      ownerId: nguyen.id,
    },
  ];

  for (const data of formDefs) {
    await prisma.formRule.upsert({
      where: { code: data.code },
      update: {
        jobType: data.jobType,
        formTemplate: data.formTemplate,
        hardGate: data.hardGate,
        blocksToggle: data.blocksToggle,
        trigger: data.trigger,
        appliesTo: data.appliesTo,
        due: data.due,
        version: data.version,
        status: data.status,
        customerId: data.customerId,
        ownerId: data.ownerId,
      },
      create: data,
    });
  }

  // Remove legacy FR-00000x codes so the list matches Figma-style FR-55xx rows
  await prisma.formRule.deleteMany({
    where: { code: { startsWith: 'FR-000' } },
  });

  // ─── Route rules ──────────────────────────────────────────────────────────
  const routeDefs = [
    // Customer defaults (no location = customer-level)
    {
      code: 'RR-CD-0001',
      customerId: c1.id,
      locationId: null as string | null,
      geofenceRadius: '750 FT',
      gpsRequired: true,
      routeFrom: 'Customer default',
      routeLabel: 'Permian Basin default',
      status: CrmRecordStatus.ACTIVE,
      ownerId: admin.id,
      clockInWindow: null as string | null,
    },
    {
      code: 'RR-CD-0002',
      customerId: c2.id,
      locationId: null,
      geofenceRadius: '1000 FT',
      gpsRequired: false,
      routeFrom: 'Customer default',
      routeLabel: 'Cactus default',
      status: CrmRecordStatus.ACTIVE,
      ownerId: torres.id,
      clockInWindow: null,
    },
    {
      code: 'RR-CD-0003',
      customerId: c5.id,
      locationId: null,
      geofenceRadius: '500 FT',
      gpsRequired: true,
      routeFrom: 'Customer default',
      routeLabel: 'Frontier default',
      clockInWindow: 'STRICT',
      status: CrmRecordStatus.ACTIVE,
      ownerId: nguyen.id,
    },
    // Site overrides
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
      clockInWindow: null,
    },
    {
      code: 'RR-000002',
      customerId: c1.id,
      locationId: loc2.id,
      geofenceRadius: '600 FT',
      gpsRequired: true,
      routeFrom: 'Midland Yard – I-20',
      routeLabel: 'Spraberry pad route',
      status: CrmRecordStatus.ACTIVE,
      ownerId: admin.id,
      clockInWindow: null,
    },
    {
      code: 'RR-000003',
      customerId: c2.id,
      locationId: loc3.id,
      geofenceRadius: '400 FT',
      gpsRequired: true,
      routeFrom: 'Pecos Staging',
      routeLabel: 'Bone Spring route',
      status: CrmRecordStatus.ACTIVE,
      ownerId: torres.id,
      clockInWindow: null,
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
      clockInWindow: null,
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
      clockInWindow: null,
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
      clockInWindow: null,
    },
    {
      code: 'RR-000007',
      customerId: c8.id,
      locationId: loc8.id,
      geofenceRadius: '500 FT',
      gpsRequired: false,
      routeFrom: 'Midland Yard',
      routeLabel: 'Spraberry 5-1H',
      clockInWindow: 'NO SIGNAL AT SITE',
      status: CrmRecordStatus.ACTIVE,
      ownerId: torres.id,
    },
  ];

  const seededRouteRules: { code: string; id: string }[] = [];
  for (const data of routeDefs) {
    const rule = await prisma.routeRule.upsert({
      where: { code: data.code },
      update: {
        customerId: data.customerId,
        locationId: data.locationId,
        gpsRequired: data.gpsRequired,
        status: data.status,
        routeLabel: data.routeLabel,
        geofenceRadius: data.geofenceRadius,
        clockInWindow: data.clockInWindow,
      },
      create: data,
    });
    seededRouteRules.push({ code: rule.code, id: rule.id });
  }

  const rrByCode = Object.fromEntries(
    seededRouteRules.map((r) => [r.code, r.id]),
  );

  // ─── GPS flags (last 30 days) ─────────────────────────────────────────────
  await prisma.gpsFlag.deleteMany({});
  const flagDefs = [
    {
      flaggedAt: new Date('2026-09-06T06:48:00'),
      flagType: 'Clock-in from home',
      distanceOutside: '47.3 mi outside',
      radiusApplied: '500 FT',
      ruleSource: 'SITE_OVERRIDE',
      outcome: 'ACCEPTED',
      locationId: loc8.id,
      customerId: c8.id,
      technicianId: torres.id,
      routeRuleId: rrByCode['RR-000007'],
    },
    {
      flaggedAt: new Date('2026-09-05T14:22:00'),
      flagType: 'Clock-in outside geofence',
      distanceOutside: '1.2 mi outside',
      radiusApplied: '500 FT',
      ruleSource: 'SITE_OVERRIDE',
      outcome: 'AWAITING',
      locationId: loc8.id,
      customerId: c8.id,
      technicianId: nguyen.id,
      routeRuleId: rrByCode['RR-000007'],
    },
    {
      flaggedAt: new Date('2026-09-04T09:10:00'),
      flagType: 'GPS unavailable',
      distanceOutside: null as string | null,
      radiusApplied: '500 FT',
      ruleSource: 'SITE_OVERRIDE',
      outcome: 'ACCEPTED',
      locationId: loc8.id,
      customerId: c8.id,
      technicianId: admin.id,
      routeRuleId: rrByCode['RR-000007'],
    },
    {
      flaggedAt: new Date('2026-09-03T16:05:00'),
      flagType: 'Accuracy too low',
      distanceOutside: '0.4 mi outside',
      radiusApplied: '500 FT',
      ruleSource: 'SITE_OVERRIDE',
      outcome: 'ACCEPTED',
      locationId: loc8.id,
      customerId: c8.id,
      technicianId: torres.id,
      routeRuleId: rrByCode['RR-000007'],
    },
    {
      flaggedAt: new Date('2026-09-02T11:30:00'),
      flagType: 'Clock-in outside geofence',
      distanceOutside: '0.8 mi outside',
      radiusApplied: '500 FT',
      ruleSource: 'SITE_OVERRIDE',
      outcome: 'REJECTED',
      locationId: loc1.id,
      customerId: c1.id,
      technicianId: nguyen.id,
      routeRuleId: rrByCode['RR-000001'],
    },
    {
      flaggedAt: new Date('2026-09-01T08:15:00'),
      flagType: 'Clock-in outside geofence',
      distanceOutside: '0.3 mi outside',
      radiusApplied: '750 FT',
      ruleSource: 'CUSTOMER_DEFAULT',
      outcome: 'AWAITING',
      locationId: loc2.id,
      customerId: c1.id,
      technicianId: torres.id,
      routeRuleId: rrByCode['RR-CD-0001'],
    },
    {
      flaggedAt: new Date('2026-08-30T17:40:00'),
      flagType: 'GPS unavailable',
      distanceOutside: null,
      radiusApplied: '1000 FT',
      ruleSource: 'SYSTEM_DEFAULT',
      outcome: 'ACCEPTED',
      locationId: loc4.id,
      customerId: c3.id,
      technicianId: admin.id,
      routeRuleId: null as string | null,
    },
  ];

  for (const data of flagDefs) {
    await prisma.gpsFlag.create({ data });
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

  // ─── Sales activities (relative to today so dashboards stay live) ─────────
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const day = (offset: number, hour = 12) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

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
      activityAt: day(-1, 10),
      followUpAt: day(0, 15),
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
      activityAt: day(0, 9),
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
      activityAt: day(-2, 14),
      followUpAt: day(1, 11),
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
      activityAt: day(-1, 16),
      followUpAt: day(-2, 10),
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
      activityAt: day(-3, 11),
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
      activityAt: day(-2, 13),
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
      activityAt: day(-4, 15),
      followUpAt: day(0, 16),
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
      activityAt: day(-6, 12),
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
      activityAt: day(-1, 11),
      followUpAt: day(0, 14),
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
      activityAt: day(0, 11),
      followUpAt: day(0, 17),
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
        contactId: data.contactId,
        repId: data.repId,
        activityAt: data.activityAt,
        followUpAt: data.followUpAt ?? null,
        type: data.type,
        duration: data.duration,
      },
      create: data,
    });
  }

  // ─── EOD reports ──────────────────────────────────────────────────────────
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
      code: 'WO-46005950',
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
      code: 'WO-46005951',
      title: 'Pump down – Spraberry Pad 7',
      category: 'Pump Down',
      status: CrmRecordStatus.OPEN,
      serviceDate: new Date('2026-09-10'),
      scheduledStart: '06:30' as string | null,
      scheduledEnd: '16:30' as string | null,
      notes: 'Blocked pending form completion',
      customerId: c3.id,
      locationId: loc4.id,
      assignedRepId: admin.id,
    },
    {
      code: 'WO-46005952',
      title: 'Perforating – Avalon 9H',
      category: 'Perforating',
      status: CrmRecordStatus.OPEN,
      serviceDate: new Date('2026-09-12'),
      scheduledStart: null as string | null,
      scheduledEnd: null as string | null,
      notes: 'Hard-gate blocked WO',
      customerId: c1.id,
      locationId: loc1.id,
      assignedRepId: nguyen.id,
    },
    {
      code: 'WO-46005953',
      title: 'H2S site prep – Delaware',
      category: 'H2S',
      status: CrmRecordStatus.IN_PROGRESS,
      serviceDate: new Date('2026-09-09'),
      scheduledStart: '08:00' as string | null,
      scheduledEnd: '18:00' as string | null,
      notes: 'Hard-gate forms required',
      customerId: c5.id,
      locationId: loc5.id,
      assignedRepId: nguyen.id,
    },
  ];

  // Drop legacy short WO codes so blocked widget matches Figma-style IDs
  await prisma.workOrder.deleteMany({
    where: { code: { in: ['WO-000001', 'WO-000002', 'WO-000003'] } },
  });

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

  // ─── Pay cycles (pricing effective-from) ──────────────────────────────────
  const payCycleStart = new Date(Date.UTC(2026, 8, 7));
  for (let i = 0; i < 24; i++) {
    const from = new Date(payCycleStart);
    from.setUTCDate(payCycleStart.getUTCDate() + i * 14);
    const to = new Date(from);
    to.setUTCDate(from.getUTCDate() + 13);
    const cycle = 18 + i;
    const code = `CYCLE-${cycle}`;
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });
    await prisma.payCycle.upsert({
      where: { code },
      update: {
        label: `Cycle ${cycle} · ${fmt(from)} – ${fmt(to)}`,
        cycleNumber: cycle,
        startDate: from,
        endDate: to,
      },
      create: {
        code,
        label: `Cycle ${cycle} · ${fmt(from)} – ${fmt(to)}`,
        cycleNumber: cycle,
        startDate: from,
        endDate: to,
      },
    });
  }

  // ─── Payment cards / expenses / CRM tasks / sync targets ───────────────────
  const companyCard = await prisma.paymentCard.upsert({
    where: { id: 'seed-company-card-001' },
    update: {
      brand: 'VISA',
      last4: '4242',
      label: 'Company Visa · 4242',
      isCompanyCard: true,
      active: true,
      ownerId: admin.id,
      archivedAt: null,
    },
    create: {
      id: 'seed-company-card-001',
      brand: 'VISA',
      last4: '4242',
      label: 'Company Visa · 4242',
      isCompanyCard: true,
      active: true,
      ownerId: admin.id,
    },
  });

  const expenseDefs = [
    {
      code: 'EXP-000001',
      expenseDate: new Date('2026-09-10'),
      merchant: 'Midland Fuel Depot',
      category: 'Fuel',
      paymentMethod: companyCard.label,
      amount: 128.45,
      status: ExpenseStatus.APPROVED,
      customerId: c1.id,
      locationId: loc1.id,
      repId: admin.id,
    },
    {
      code: 'EXP-000002',
      expenseDate: new Date('2026-09-12'),
      merchant: 'Odessa Office Supply',
      category: 'Office',
      paymentMethod: companyCard.label,
      amount: 64.2,
      status: ExpenseStatus.PENDING,
      customerId: c2.id,
      locationId: loc2.id,
      repId: torres.id,
    },
    {
      code: 'EXP-000003',
      expenseDate: new Date('2026-09-14'),
      merchant: 'Permian Lodging',
      category: 'Travel',
      paymentMethod: companyCard.label,
      amount: 189.0,
      status: ExpenseStatus.UNMATCHED,
      customerId: c5.id,
      locationId: loc5.id,
      repId: nguyen.id,
    },
  ] as const;

  for (const data of expenseDefs) {
    await prisma.expense.upsert({
      where: { code: data.code },
      update: {
        expenseDate: data.expenseDate,
        merchant: data.merchant,
        category: data.category,
        paymentMethod: data.paymentMethod,
        amount: data.amount,
        status: data.status,
        customerId: data.customerId,
        locationId: data.locationId,
        repId: data.repId,
      },
      create: { ...data },
    });
  }

  const taskDefs = [
    {
      code: 'TASK-000001',
      title: 'Follow up Permian Basin quote',
      taskType: 'FOLLOW_UP',
      priority: CrmTaskPriority.HIGH,
      status: CrmRecordStatus.OPEN,
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      customerId: c1.id,
      assigneeId: admin.id,
      createdById: admin.id,
    },
    {
      code: 'TASK-000002',
      title: 'Schedule Lonestar site visit',
      taskType: 'VISIT',
      priority: CrmTaskPriority.MEDIUM,
      status: CrmRecordStatus.OPEN,
      dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      customerId: c2.id,
      assigneeId: torres.id,
      createdById: admin.id,
    },
  ] as const;

  for (const data of taskDefs) {
    await prisma.crmTask.upsert({
      where: { code: data.code },
      update: {
        title: data.title,
        taskType: data.taskType,
        priority: data.priority,
        status: data.status,
        dueAt: data.dueAt,
        customerId: data.customerId,
        assigneeId: data.assigneeId,
      },
      create: { ...data },
    });
  }

  // ─── HR Employees ─────────────────────────────────────────────────────────
  const martinezDetail = {
    displayName: 'J. Martinez',
    email: 'j.martinez@dhs.com',
    phone: '(701) 555-0142',
    homeAddress: '221 4th Ave N, Watford City, ND',
    hireDate: new Date('2019-04-12T12:00:00.000Z'),
    employmentType: 'FULL-TIME',
    payType: 'HOURLY',
    directReportsCount: 3,
    maxClockInRadiusEnabled: true,
    maxClockInRadius: '5 MI',
    minBillableBlock: '15 MIN',
    autoFlagNoShow: 'AFTER 30 MINS',
    ptoBalance: 40.0,
    ptoAnnual: 160.0,
    ptoUsed: 120.0,
    ptoScheduled: 0.0,
    sickBalance: 24.0,
    sickAnnual: 80.0,
    sickUsed: 56.0,
    holidayBalance: 8.0,
    holidayObserved: 80.0,
    holidayTaken: 72.0,
    cycleRt: 42.5,
    cycleOt: 6.0,
    cyclePto: 8.0,
    timeEntries: [
      {
        id: 'te1',
        date: '2026-06-12',
        client: 'Devon Energy',
        hours: 8.5,
        status: 'APPROVED',
      },
      {
        id: 'te2',
        date: '2026-06-11',
        client: 'Pioneer Natural',
        hours: 10.0,
        status: 'APPROVED',
      },
      {
        id: 'te3',
        date: '2026-06-10',
        client: 'Occidental',
        hours: 8.0,
        status: 'MISSING OUT',
      },
      {
        id: 'te4',
        date: '2026-06-09',
        client: 'Devon Energy',
        hours: 9.5,
        status: 'APPROVED',
      },
      {
        id: 'te5',
        date: '2026-06-08',
        client: 'EOG Resources',
        hours: 8.0,
        status: 'APPROVED',
      },
      {
        id: 'te6',
        date: '2026-06-07',
        client: 'Chevron',
        hours: 8.5,
        status: 'APPROVED',
      },
    ],
    trainingCerts: [
      {
        id: 'tr1',
        name: 'H2S Awareness',
        expiresAt: '2027-01-15',
        status: 'APPROVED',
      },
      {
        id: 'tr2',
        name: 'First Aid / CPR',
        expiresAt: '2026-11-02',
        status: 'APPROVED',
      },
      {
        id: 'tr3',
        name: 'BBS Weekly',
        expiresAt: '2026-06-15',
        status: 'DUE',
      },
      {
        id: 'tr4',
        name: 'Fit Test',
        expiresAt: '2026-12-01',
        status: 'APPROVED',
      },
    ],
    equipment: [
      {
        id: 'eq1',
        label: 'Assigned Truck',
        value: 'TRK-14',
        action: 'VIEW TRUCK',
        href: '/fleet/assets',
      },
      {
        id: 'eq2',
        label: 'Truck Manifest',
        value: 'Current',
        action: 'VIEW MANIFEST',
        href: '/fleet/assets',
      },
      {
        id: 'eq3',
        label: 'Assigned small equipment',
        value: 'H2S Monitor, Gas Detector, Radio',
        badge: '3 ITEMS',
        badgeTone: 'muted',
      },
      {
        id: 'eq4',
        label: 'Checked out tools',
        value: 'Torque wrench set',
        badge: 'CHECKED OUT',
        badgeTone: 'warning',
      },
      {
        id: 'eq5',
        label: 'Open issues',
        value: 'Radio battery degraded',
        badge: 'OPEN',
        badgeTone: 'error',
      },
    ],
    auditHistory: [
      { id: 'a1', when: '2D AGO', label: 'Time edit submitted' },
      {
        id: 'a2',
        when: '1W AGO',
        label: 'Profile updated — phone number changed',
      },
      { id: 'a3', when: '2W AGO', label: 'Time off approved' },
      { id: 'a4', when: '1MO AGO', label: 'H2S training renewed' },
    ],
    notes: [] as { id: string; text: string; createdAt: string }[],
    jobTitle: 'Field Technician',
    payRate: 28.5,
    overtimeEligible: true,
    adpEmployeeId: 'ADP-44218',
    defaultTimeCategory: 'REGULAR',
    roleTemplate: 'FIELD TECHNICIAN',
    moduleOverrides: null as string | null,
    mobileAppAccess: true,
    sendInvite: true,
    sseEnabled: true,
    ssePeriodDays: 90,
    sseEvaluationSchedule: 'WEEKLY',
    companyCreditCard: false,
    cardLast4: null as string | null,
    assignedEquipment: ['H2S MONITOR', 'FALL HARNESS'],
    ppeIssued: ['HARD HAT', 'FR COVERALLS', 'STEEL TOES'],
    certIssuingBody: 'National Safety Council',
    certIssueDate: new Date('2024-03-01T12:00:00.000Z'),
    certExpiryDate: new Date('2025-03-01T12:00:00.000Z'),
    certReminderLeadDays: 30,
    emergencyContactName: null as string | null,
    emergencyContactPhone: null as string | null,
    dateOfBirth: null as Date | null,
    payHistory: [
      {
        id: 'pay-1',
        date: '2023-01-30',
        from: 25.5,
        to: 28.5,
        by: 'C. Hollis',
        label: '$25.50 -> $28.50 / hr',
      },
      {
        id: 'pay-2',
        date: '2021-04-12',
        from: 20.0,
        to: 25.5,
        by: 'C. Hollis',
        label: '$20.00 -> $25.50 / hr',
      },
      {
        id: 'pay-3',
        date: '2019-04-12',
        from: null,
        to: 20.0,
        by: 'System',
        label: 'Hired at $20.00 / hr',
      },
    ],
  };

  const empSupervisor = {
    code: 'EMP-1001',
    firstName: 'Jose',
    lastName: 'Martinez',
    roleTitle: 'Tech II · Lead',
    status: EmployeeStatus.ACTIVE,
    assignedTruck: 'TRK-14',
    hoursThisCycle: 56.5,
    certExpiringLabel: 'NONE',
    certExpiringTone: 'none',
    bbsThisWeek: 'SUBMITTED',
    crew: 'Permian North Crew',
    certificationHeld: 'H2S',
    hasOpenTimeEdit: false,
    missingBbs: false,
    onLeave: false,
    ...martinezDetail,
  };

  await prisma.employee.upsert({
    where: { code: empSupervisor.code },
    update: { ...empSupervisor, supervisorId: null, archivedAt: null },
    create: { ...empSupervisor },
  });
  const supervisorEmp = await prisma.employee.findUniqueOrThrow({
    where: { code: 'EMP-1001' },
  });

  function basicDetail(partial: {
    firstName: string;
    lastName: string;
    emailLocal: string;
    truck?: string | null;
    crew?: string | null;
    hours: number;
    cert?: string | null;
  }) {
    const name = `${partial.firstName.charAt(0)}. ${partial.lastName}`;
    return {
      displayName: name,
      email: `${partial.emailLocal}@dhs.com`,
      phone: '(701) 555-0100',
      homeAddress: 'Midland, TX',
      hireDate: new Date('2024-01-15T12:00:00.000Z'),
      employmentType: 'FULL-TIME',
      payType: 'HOURLY',
      directReportsCount: 0,
      maxClockInRadiusEnabled: false,
      maxClockInRadius: '5 MI',
      minBillableBlock: '15 MIN',
      autoFlagNoShow: 'AFTER 30 MINS',
      ptoBalance: 32.0,
      ptoAnnual: 160.0,
      ptoUsed: 40.0,
      ptoScheduled: 0.0,
      sickBalance: 40.0,
      sickAnnual: 80.0,
      sickUsed: 16.0,
      holidayBalance: 16.0,
      holidayObserved: 80.0,
      holidayTaken: 40.0,
      cycleRt: Math.max(0, partial.hours - 4),
      cycleOt: Math.min(4, partial.hours * 0.1),
      cyclePto: 0,
      timeEntries: [
        {
          id: 'te-a',
          date: '2026-06-12',
          client: 'Devon Energy',
          hours: 8.0,
          status: 'APPROVED',
        },
      ],
      trainingCerts: partial.cert
        ? [
            {
              id: 'tr-a',
              name: partial.cert,
              expiresAt: '2027-01-01',
              status: 'APPROVED',
            },
          ]
        : [],
      equipment: partial.truck
        ? [
            {
              id: 'eq-a',
              label: 'Assigned Truck',
              value: partial.truck,
              action: 'VIEW TRUCK',
              href: '/fleet/assets',
            },
          ]
        : [],
      auditHistory: [
        { id: 'a-a', when: '1W AGO', label: 'Profile updated' },
      ],
      notes: [],
    };
  }

  const employeeDefs = [
    {
      code: 'EMP-1002',
      firstName: 'A.',
      lastName: 'Nguyen',
      roleTitle: 'Tech II · Lead',
      status: EmployeeStatus.ACTIVE,
      assignedTruck: 'TRK-22',
      hoursThisCycle: 36.0,
      certExpiringLabel: 'H2S - 12 Days',
      certExpiringTone: 'warning',
      bbsThisWeek: 'PENDING',
      crew: 'Alpha',
      certificationHeld: 'H2S',
      hasOpenTimeEdit: true,
      missingBbs: false,
      onLeave: false,
      supervisorId: supervisorEmp.id,
      ...basicDetail({
        firstName: 'A.',
        lastName: 'Nguyen',
        emailLocal: 'a.nguyen',
        truck: 'TRK-22',
        crew: 'Alpha',
        hours: 36,
        cert: 'H2S',
      }),
    },
    {
      code: 'EMP-1003',
      firstName: 'M.',
      lastName: 'Torres',
      roleTitle: 'Technician',
      status: EmployeeStatus.NEED_REVIEW,
      assignedTruck: null as string | null,
      hoursThisCycle: 22.5,
      certExpiringLabel: 'CPR - Expired',
      certExpiringTone: 'error',
      bbsThisWeek: 'MISSING',
      crew: 'Bravo',
      certificationHeld: 'CPR',
      hasOpenTimeEdit: false,
      missingBbs: true,
      onLeave: false,
      supervisorId: supervisorEmp.id,
      ...basicDetail({
        firstName: 'M.',
        lastName: 'Torres',
        emailLocal: 'm.torres',
        crew: 'Bravo',
        hours: 22.5,
        cert: 'CPR',
      }),
    },
    {
      code: 'EMP-1004',
      firstName: 'R.',
      lastName: 'Hall',
      roleTitle: 'Technician',
      status: EmployeeStatus.ACTIVE,
      assignedTruck: 'TRK-07',
      hoursThisCycle: 40.0,
      certExpiringLabel: 'NONE',
      certExpiringTone: 'none',
      bbsThisWeek: 'SUBMITTED',
      crew: 'Alpha',
      certificationHeld: 'H2S',
      hasOpenTimeEdit: false,
      missingBbs: false,
      onLeave: false,
      supervisorId: supervisorEmp.id,
      ...basicDetail({
        firstName: 'R.',
        lastName: 'Hall',
        emailLocal: 'r.hall',
        truck: 'TRK-07',
        crew: 'Alpha',
        hours: 40,
        cert: 'H2S',
      }),
    },
    {
      code: 'EMP-1005',
      firstName: 'C.',
      lastName: 'Diaz',
      roleTitle: 'Technician',
      status: EmployeeStatus.OFFLINE,
      assignedTruck: 'TRK-09',
      hoursThisCycle: 12.0,
      certExpiringLabel: 'N/A',
      certExpiringTone: 'na',
      bbsThisWeek: 'N/A',
      crew: 'Bravo',
      certificationHeld: null as string | null,
      hasOpenTimeEdit: false,
      missingBbs: false,
      onLeave: true,
      supervisorId: supervisorEmp.id,
      ...basicDetail({
        firstName: 'C.',
        lastName: 'Diaz',
        emailLocal: 'c.diaz',
        truck: 'TRK-09',
        crew: 'Bravo',
        hours: 12,
      }),
    },
    {
      code: 'EMP-1006',
      firstName: 'L.',
      lastName: 'Garcia',
      roleTitle: 'Tech II · Lead',
      status: EmployeeStatus.ACTIVE,
      assignedTruck: null as string | null,
      hoursThisCycle: 31.5,
      certExpiringLabel: 'NONE',
      certExpiringTone: 'none',
      bbsThisWeek: 'MISSING',
      crew: 'Charlie',
      certificationHeld: 'First Aid',
      hasOpenTimeEdit: true,
      missingBbs: true,
      onLeave: false,
      supervisorId: supervisorEmp.id,
      ...basicDetail({
        firstName: 'L.',
        lastName: 'Garcia',
        emailLocal: 'l.garcia',
        crew: 'Charlie',
        hours: 31.5,
        cert: 'First Aid',
      }),
    },
    {
      code: 'EMP-1007',
      firstName: 'D.',
      lastName: 'Ford',
      roleTitle: 'Technician',
      status: EmployeeStatus.ACTIVE,
      assignedTruck: 'TRK-03',
      hoursThisCycle: 28.0,
      certExpiringLabel: 'H2S - 45 Days',
      certExpiringTone: 'warning',
      bbsThisWeek: 'PENDING',
      crew: 'Charlie',
      certificationHeld: 'H2S',
      hasOpenTimeEdit: false,
      missingBbs: false,
      onLeave: false,
      supervisorId: supervisorEmp.id,
      ...basicDetail({
        firstName: 'D.',
        lastName: 'Ford',
        emailLocal: 'd.ford',
        truck: 'TRK-03',
        crew: 'Charlie',
        hours: 28,
        cert: 'H2S',
      }),
    },
    {
      code: 'EMP-1008',
      firstName: 'S.',
      lastName: 'Kim',
      roleTitle: 'Technician',
      status: EmployeeStatus.NEED_REVIEW,
      assignedTruck: 'TRK-11',
      hoursThisCycle: 19.5,
      certExpiringLabel: 'NONE',
      certExpiringTone: 'none',
      bbsThisWeek: 'SUBMITTED',
      crew: 'Bravo',
      certificationHeld: 'CPR',
      hasOpenTimeEdit: true,
      missingBbs: false,
      onLeave: false,
      supervisorId: supervisorEmp.id,
      ...basicDetail({
        firstName: 'S.',
        lastName: 'Kim',
        emailLocal: 's.kim',
        truck: 'TRK-11',
        crew: 'Bravo',
        hours: 19.5,
        cert: 'CPR',
      }),
    },
    {
      code: 'EMP-1009',
      firstName: 'P.',
      lastName: 'Brooks',
      roleTitle: 'Technician',
      status: EmployeeStatus.ACTIVE,
      assignedTruck: 'TRK-18',
      hoursThisCycle: 35.0,
      certExpiringLabel: 'NONE',
      certExpiringTone: 'none',
      bbsThisWeek: 'SUBMITTED',
      crew: 'Alpha',
      certificationHeld: 'H2S',
      hasOpenTimeEdit: false,
      missingBbs: false,
      onLeave: false,
      supervisorId: supervisorEmp.id,
      ...basicDetail({
        firstName: 'P.',
        lastName: 'Brooks',
        emailLocal: 'p.brooks',
        truck: 'TRK-18',
        crew: 'Alpha',
        hours: 35,
        cert: 'H2S',
      }),
    },
    {
      code: 'EMP-1010',
      firstName: 'T.',
      lastName: 'Reed',
      roleTitle: 'Technician',
      status: EmployeeStatus.ACTIVE,
      assignedTruck: null as string | null,
      hoursThisCycle: 27.0,
      certExpiringLabel: 'N/A',
      certExpiringTone: 'na',
      bbsThisWeek: 'N/A',
      crew: null as string | null,
      certificationHeld: null as string | null,
      hasOpenTimeEdit: false,
      missingBbs: false,
      onLeave: false,
      supervisorId: supervisorEmp.id,
      ...basicDetail({
        firstName: 'T.',
        lastName: 'Reed',
        emailLocal: 't.reed',
        hours: 27,
      }),
    },
    {
      code: 'EMP-1011',
      firstName: 'K.',
      lastName: 'Patel',
      roleTitle: 'Technician',
      status: EmployeeStatus.ACTIVE,
      assignedTruck: 'TRK-05',
      hoursThisCycle: 33.5,
      certExpiringLabel: 'NONE',
      certExpiringTone: 'none',
      bbsThisWeek: 'SUBMITTED',
      crew: 'Charlie',
      certificationHeld: 'Confined Space',
      hasOpenTimeEdit: false,
      missingBbs: false,
      onLeave: false,
      supervisorId: supervisorEmp.id,
      ...basicDetail({
        firstName: 'K.',
        lastName: 'Patel',
        emailLocal: 'k.patel',
        truck: 'TRK-05',
        crew: 'Charlie',
        hours: 33.5,
        cert: 'Confined Space',
      }),
    },
  ];

  for (const data of employeeDefs) {
    await prisma.employee.upsert({
      where: { code: data.code },
      update: { ...data, archivedAt: null },
      create: { ...data },
    });
  }

  // ─── HR Time Entries ──────────────────────────────────────────────────────
  const allEmps = await prisma.employee.findMany({
    where: { archivedAt: null },
    select: { id: true, code: true },
    orderBy: { code: 'asc' },
  });
  const empByCode = Object.fromEntries(allEmps.map((e) => [e.code, e.id]));

  const cycle = 'CYCLE JUN 1–14';
  type SeedTe = {
    code: string;
    date: string;
    woShort: string | null;
    woCode: string | null;
    category: TimeEntryCategory;
    clockIn: string | null;
    clockOut: string | null;
    source: TimeEntrySource;
    hours: number;
    work: number | null;
    travel: number | null;
    billable: boolean;
    gpsFlagged: boolean;
    gpsLabel: string;
    status: TimeEntryStatus;
    locked?: boolean;
    correction?: boolean;
  };

  const teDefs: SeedTe[] = [
    {
      code: 'EMP-1001',
      date: '2026-06-12',
      woShort: 'ST-54321',
      woCode: '46005950-WO',
      category: TimeEntryCategory.REGULAR,
      clockIn: '07:00',
      clockOut: '15:30',
      source: TimeEntrySource.MOBILE,
      hours: 8.5,
      work: 7.3,
      travel: 1.2,
      billable: true,
      gpsFlagged: false,
      gpsLabel: 'CLEAR',
      status: TimeEntryStatus.APPROVED,
    },
    {
      code: 'EMP-1002',
      date: '2026-06-12',
      woShort: 'ST-54322',
      woCode: '46005951-WO',
      category: TimeEntryCategory.REGULAR,
      clockIn: '06:45',
      clockOut: '15:15',
      source: TimeEntrySource.MOBILE,
      hours: 8.5,
      work: 7.5,
      travel: 1.0,
      billable: true,
      gpsFlagged: false,
      gpsLabel: 'CLEAR',
      status: TimeEntryStatus.APPROVED,
    },
    {
      code: 'EMP-1003',
      date: '2026-06-12',
      woShort: null,
      woCode: null,
      category: TimeEntryCategory.NON_BILLABLE,
      clockIn: '08:00',
      clockOut: null,
      source: TimeEntrySource.MOBILE,
      hours: 0,
      work: null,
      travel: null,
      billable: false,
      gpsFlagged: false,
      gpsLabel: 'CLEAR',
      status: TimeEntryStatus.MISSING_CO,
    },
    {
      code: 'EMP-1004',
      date: '2026-06-11',
      woShort: 'ST-54110',
      woCode: '46005800-WO',
      category: TimeEntryCategory.OVERTIME,
      clockIn: '06:00',
      clockOut: '18:00',
      source: TimeEntrySource.CORRECTED,
      hours: 12.0,
      work: 10.5,
      travel: 1.5,
      billable: true,
      gpsFlagged: true,
      gpsLabel: '2MIN',
      status: TimeEntryStatus.PENDING,
    },
    {
      code: 'EMP-1005',
      date: '2026-06-11',
      woShort: 'ST-54111',
      woCode: '46005801-WO',
      category: TimeEntryCategory.ON_JOB_TRAINING,
      clockIn: '07:30',
      clockOut: '16:00',
      source: TimeEntrySource.IMPORTED,
      hours: 8.5,
      work: 8.5,
      travel: 0,
      billable: false,
      gpsFlagged: false,
      gpsLabel: 'CLEAR',
      status: TimeEntryStatus.APPROVED,
    },
    {
      code: 'EMP-1006',
      date: '2026-06-11',
      woShort: 'ST-54112',
      woCode: '46005802-WO',
      category: TimeEntryCategory.REGULAR,
      clockIn: '07:00',
      clockOut: '15:30',
      source: TimeEntrySource.MOBILE,
      hours: 8.5,
      work: 7.0,
      travel: 1.5,
      billable: true,
      gpsFlagged: false,
      gpsLabel: 'CLEAR',
      status: TimeEntryStatus.REJECTED,
    },
    {
      code: 'EMP-1007',
      date: '2026-06-10',
      woShort: 'ST-54001',
      woCode: '46005700-WO',
      category: TimeEntryCategory.REGULAR,
      clockIn: '07:15',
      clockOut: '15:45',
      source: TimeEntrySource.MOBILE,
      hours: 8.5,
      work: 7.8,
      travel: 0.7,
      billable: true,
      gpsFlagged: false,
      gpsLabel: 'CLEAR',
      status: TimeEntryStatus.APPROVED,
    },
    {
      code: 'EMP-1008',
      date: '2026-06-10',
      woShort: 'ST-54002',
      woCode: '46005701-WO',
      category: TimeEntryCategory.REGULAR,
      clockIn: '06:30',
      clockOut: '15:00',
      source: TimeEntrySource.IMPORTED,
      hours: 8.5,
      work: 8.0,
      travel: 0.5,
      billable: true,
      gpsFlagged: true,
      gpsLabel: '5MIN',
      status: TimeEntryStatus.PENDING,
      correction: true,
    },
    {
      code: 'EMP-1009',
      date: '2026-06-10',
      woShort: 'ST-54003',
      woCode: '46005702-WO',
      category: TimeEntryCategory.NON_BILLABLE,
      clockIn: '09:00',
      clockOut: '12:00',
      source: TimeEntrySource.MOBILE,
      hours: 3.0,
      work: 3.0,
      travel: 0,
      billable: false,
      gpsFlagged: false,
      gpsLabel: 'CLEAR',
      status: TimeEntryStatus.LOCKED,
      locked: true,
    },
    {
      code: 'EMP-1010',
      date: '2026-06-09',
      woShort: 'ST-53990',
      woCode: '46005690-WO',
      category: TimeEntryCategory.REGULAR,
      clockIn: '07:00',
      clockOut: '16:00',
      source: TimeEntrySource.MOBILE,
      hours: 9.0,
      work: 8.0,
      travel: 1.0,
      billable: true,
      gpsFlagged: false,
      gpsLabel: 'CLEAR',
      status: TimeEntryStatus.APPROVED,
    },
    {
      code: 'EMP-1011',
      date: '2026-06-09',
      woShort: null,
      woCode: null,
      category: TimeEntryCategory.REGULAR,
      clockIn: '07:00',
      clockOut: null,
      source: TimeEntrySource.MOBILE,
      hours: 0,
      work: null,
      travel: null,
      billable: true,
      gpsFlagged: false,
      gpsLabel: 'CLEAR',
      status: TimeEntryStatus.MISSING_CO,
    },
    {
      code: 'EMP-1001',
      date: '2026-06-09',
      woShort: 'ST-53980',
      woCode: '46005680-WO',
      category: TimeEntryCategory.OVERTIME,
      clockIn: '05:30',
      clockOut: '17:30',
      source: TimeEntrySource.CORRECTED,
      hours: 12.0,
      work: 11.0,
      travel: 1.0,
      billable: true,
      gpsFlagged: true,
      gpsLabel: '2MIN',
      status: TimeEntryStatus.PENDING,
      correction: true,
    },
    {
      code: 'EMP-1002',
      date: '2026-06-08',
      woShort: 'ST-53970',
      woCode: '46005670-WO',
      category: TimeEntryCategory.REGULAR,
      clockIn: '07:00',
      clockOut: '15:30',
      source: TimeEntrySource.MOBILE,
      hours: 8.5,
      work: 7.5,
      travel: 1.0,
      billable: true,
      gpsFlagged: false,
      gpsLabel: 'CLEAR',
      status: TimeEntryStatus.APPROVED,
    },
    {
      code: 'EMP-1003',
      date: '2026-06-08',
      woShort: 'ST-53971',
      woCode: '46005671-WO',
      category: TimeEntryCategory.ON_JOB_TRAINING,
      clockIn: '08:00',
      clockOut: '16:30',
      source: TimeEntrySource.IMPORTED,
      hours: 8.5,
      work: 8.5,
      travel: 0,
      billable: false,
      gpsFlagged: false,
      gpsLabel: 'CLEAR',
      status: TimeEntryStatus.APPROVED,
    },
    {
      code: 'EMP-1004',
      date: '2026-06-07',
      woShort: 'ST-53950',
      woCode: '46005650-WO',
      category: TimeEntryCategory.REGULAR,
      clockIn: '07:00',
      clockOut: '15:30',
      source: TimeEntrySource.MOBILE,
      hours: 8.5,
      work: 7.2,
      travel: 1.3,
      billable: true,
      gpsFlagged: false,
      gpsLabel: 'CLEAR',
      status: TimeEntryStatus.LOCKED,
      locked: true,
    },
  ];

  // Extra approved rows so KPIs look populated
  for (let i = 0; i < 20; i++) {
    const codes = Object.keys(empByCode);
    const code = codes[i % codes.length]!;
    const day = 6 - (i % 5);
    teDefs.push({
      code,
      date: `2026-06-0${Math.max(1, day)}`,
      woShort: `ST-53${800 + i}`,
      woCode: `46005${700 + i}-WO`,
      category:
        i % 7 === 0
          ? TimeEntryCategory.OVERTIME
          : i % 5 === 0
            ? TimeEntryCategory.NON_BILLABLE
            : TimeEntryCategory.REGULAR,
      clockIn: '07:00',
      clockOut: '15:30',
      source:
        i % 4 === 0 ? TimeEntrySource.IMPORTED : TimeEntrySource.MOBILE,
      hours: 8.5,
      work: 7.5,
      travel: 1.0,
      billable: i % 5 !== 0,
      gpsFlagged: false,
      gpsLabel: 'CLEAR',
      status: TimeEntryStatus.APPROVED,
    });
  }

  await prisma.timeEntry.deleteMany({});
  let teIndex = 0;
  for (const te of teDefs) {
    const employeeId = empByCode[te.code];
    if (!employeeId) continue;
    teIndex += 1;
    const isFeatured =
      te.status === TimeEntryStatus.PENDING && te.gpsFlagged && teIndex <= 5;
    const missingDocs = isFeatured || te.status === TimeEntryStatus.MISSING_CO;
    const docs = [
      {
        id: 'doc-jsa',
        name: 'JSA - Job Safety Analysis',
        impact: 'PAYROLL-BLOCKING',
        status: 'SUBMITTED',
      },
      {
        id: 'doc-air',
        name: 'Air Quality Testing Report',
        impact: 'BILLING-IMPACTING',
        status: missingDocs ? 'MISSING' : 'SUBMITTED',
      },
      {
        id: 'doc-permit',
        name: 'Permit to Work',
        impact: 'PAYROLL-BLOCKING',
        status: missingDocs ? 'MISSING' : 'SUBMITTED',
      },
      {
        id: 'doc-bbs',
        name: 'BBS Observation',
        impact: 'SAFETY-ONLY',
        status: missingDocs ? 'DUE' : 'SUBMITTED',
      },
      {
        id: 'doc-truck',
        name: 'Truck/Rig Inspection',
        impact: 'BILLING-IMPACTING',
        status: missingDocs ? 'MISSING' : 'SUBMITTED',
      },
    ];
    const submitted = docs.filter((d) => d.status === 'SUBMITTED').length;
    const payrollBlocks = docs.filter(
      (d) => d.impact === 'PAYROLL-BLOCKING' && d.status !== 'SUBMITTED',
    ).length;
    const suggested = Math.max(0, te.hours - (isFeatured ? 0.2 : 0));
    const history = [
      {
        id: 'h1',
        at: `${te.date}T${te.clockOut ?? '15:30'}:00.000Z`,
        label: 'Clocked out',
        detail: `${te.hours}H logged via ${te.source.toLowerCase()} app`,
      },
      {
        id: 'h2',
        at: `${te.date}T${te.clockIn ?? '07:00'}:00.000Z`,
        label: 'Clocked in',
        detail: 'GPS verified via mobile app',
      },
    ];
    if (missingDocs) {
      history.unshift({
        id: 'h3',
        at: `${te.date}T17:02:00.000Z`,
        label: 'Missing doc auto-flagged',
        detail: 'System flagged incomplete required forms',
      });
    }

    await prisma.timeEntry.create({
      data: {
        employeeId,
        workDate: new Date(`${te.date}T12:00:00.000Z`),
        cycleLabel: cycle,
        workOrderShort: te.woShort,
        workOrderCode: te.woCode ?? (isFeatured ? '2026 46006045-WO' : null),
        category: te.category,
        clockIn: te.clockIn,
        clockOut: te.clockOut,
        source: te.source,
        hours: isFeatured ? 7.7 : te.hours,
        workHours: isFeatured ? 7.5 : te.work,
        travelHours: te.travel,
        billable: te.billable,
        gpsFlagged: te.gpsFlagged,
        gpsLabel: te.gpsLabel,
        status: te.status,
        locked: Boolean(te.locked) || te.status === TimeEntryStatus.LOCKED,
        correctionRequested: Boolean(te.correction),
        systemSuggestedHours: suggested,
        correctionApplied: isFeatured,
        correctionReason: isFeatured
          ? 'On-route traffic, confirmed by tech'
          : null,
        jobLocation: isFeatured
          ? 'Marathon Oil - Watford City, ND'
          : 'Permian Basin Site',
        jobType: isFeatured ? 'Wellhead Audit' : 'Field Service',
        salesTicketId: te.woShort?.replace('ST-', 'ST ') ?? 'ST 4600604',
        customerName: isFeatured ? 'Marathon Oil' : 'Devon Energy',
        missingDocs,
        docsSubmitted: submitted,
        docsRequired: docs.length,
        payrollBlockCount: payrollBlocks,
        gpsStatusLabel: te.gpsFlagged
          ? `FLAGGED ${te.gpsLabel}`
          : 'Within 0.2 mi of job',
        clockInLat: 47.8023,
        clockInLng: -103.6252,
        clockInDistanceMi: 0.1,
        clockOutLat: 47.8018,
        clockOutLng: -103.6257,
        clockOutDistanceMi: 0.2,
        jobLat: 47.802,
        jobLng: -103.6255,
        jobSiteLabel: isFeatured ? 'Well #22-31H' : 'Pad A',
        payrollHours: isFeatured ? 7.7 : te.hours,
        billableHours: isFeatured ? 7.5 : te.work ?? te.hours,
        nonBillableReason: null,
        nonBillableHours: null,
        nonBillableContext: null,
        adminNote: isFeatured
          ? 'Reach out re: missing docs before payroll cut-off Friday.'
          : null,
        requiredDocuments: docs,
        editHistory: history,
        notes: [],
        gpsTrail: [
          {
            at: `${te.date}T${te.clockIn ?? '07:00'}:00.000Z`,
            lat: 47.8023,
            lng: -103.6252,
          },
          {
            at: `${te.date}T${te.clockOut ?? '15:30'}:00.000Z`,
            lat: 47.8018,
            lng: -103.6257,
          },
        ],
      },
    });
  }

  await prisma.$executeRaw`
    INSERT INTO "CrmSyncState" (
      "id", "syncedAt", "updatedAt",
      "targetActivities", "targetCalls", "targetVisits",
      "targetQuotes", "targetPipeline", "targetEodPct"
    )
    VALUES (
      'crm', NOW(), NOW(),
      10, 15, 8,
      6, 150000, 100
    )
    ON CONFLICT ("id") DO UPDATE SET
      "targetActivities" = EXCLUDED."targetActivities",
      "targetCalls" = EXCLUDED."targetCalls",
      "targetVisits" = EXCLUDED."targetVisits",
      "targetQuotes" = EXCLUDED."targetQuotes",
      "targetPipeline" = EXCLUDED."targetPipeline",
      "targetEodPct" = EXCLUDED."targetEodPct",
      "updatedAt" = NOW()
  `;

  console.log(
    `CRM seed: ${customers.length} customers, ${contacts.length} contacts, ${locations.length} locations`,
  );
  console.log(
    `Pricing ${pricingDefs.length}, requirements ${reqDefs.length}, form ${formDefs.length}, route ${routeDefs.length}`,
  );
  console.log(
    `Quotes ${quoteDefs.length}, sales ${activityDefs.length}, EOD ${eodDefs.length}, docs ${docDefs.length}, workOrders ${workOrderDefs.length}`,
  );
  console.log(
    `Expenses ${expenseDefs.length}, tasks ${taskDefs.length}, card ${companyCard.label}`,
  );
  console.log(
    `HR employees ${1 + employeeDefs.length}, time entries ${teDefs.length}`,
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
