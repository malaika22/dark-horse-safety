import { PrismaClient } from '@prisma/client';

/**
 * Extra records for mobile development, on top of seedMobileFixture:
 * real form definitions, a required form rule, a completed job, a locked time entry,
 * and the pending requests the Figma Profile screens show.
 * Safe to run again; every record is keyed.
 */

type Field = { id: string; type: string; label: string; placeholder?: string; required?: boolean; options?: string[] };
const section = (id: string, title: string, fields: Field[], required = true) => ({ id, title, required, fields });

export const JSA_DEFINITION = [
  section('job', 'Job details', [
    { id: 'site', type: 'TEXT', label: 'Site', placeholder: 'Well or pad name', required: true },
    { id: 'job_date', type: 'DATE', label: 'Date', required: true },
    { id: 'start_time', type: 'TIME', label: 'Start time', required: true },
    { id: 'location', type: 'GPS', label: 'Location', required: true },
    { id: 'h2s', type: 'CHECKBOX', label: 'H2S present' },
    { id: 'crew_size', type: 'NUMBER', label: 'Crew on site', required: true },
  ]),
  section('hazards', 'Hazards', [
    { id: 'task_note', type: 'STATIC_TEXT', label: 'Review each hazard with the crew before work starts.' },
    { id: 'hazard_types', type: 'MULTIPLE_CHOICES', label: 'Hazards identified', required: true, options: ['H2S', 'Pinch points', 'Overhead loads', 'Slips and trips', 'Weather', 'Pressure'] },
    { id: 'risk_level', type: 'SINGLE_CHOICE', label: 'Overall risk', required: true, options: ['Low', 'Medium', 'High'] },
    { id: 'ppe_level', type: 'DROPDOWN', label: 'PPE level', required: true, options: ['Standard', 'FR plus H2S monitor', 'SCBA'] },
    { id: 'confidence', type: 'RATING', label: 'Crew readiness (1 to 5)' },
    { id: 'controls', type: 'TEXT', label: 'Controls and notes', placeholder: 'Describe the controls in place' },
  ]),
  section('signoff', 'Sign off', [
    { id: 'site_photo', type: 'PHOTO', label: 'Site photo' },
    { id: 'technician_signature', type: 'SIGNATURE', label: 'Technician signature', required: true },
  ]),
];

export const PERMIT_DEFINITION = [
  section('permit', 'Permit', [
    { id: 'site', type: 'TEXT', label: 'Site', required: true },
    { id: 'work_type', type: 'DROPDOWN', label: 'Work type', required: true, options: ['Hot work', 'Confined space', 'Line break', 'Excavation'] },
    { id: 'h2s', type: 'CHECKBOX', label: 'H2S present' },
    { id: 'valid_until', type: 'TIME', label: 'Valid until', required: true },
    { id: 'issuer_signature', type: 'SIGNATURE', label: 'Issuer signature', required: true },
  ]),
];

export const BBS_DEFINITION = [
  section('observation', 'Observation', [
    { id: 'site', type: 'TEXT', label: 'Site', required: true },
    { id: 'observed_behaviour', type: 'SINGLE_CHOICE', label: 'Behaviour observed', required: true, options: ['Safe', 'At risk'] },
    { id: 'notes', type: 'TEXT', label: 'Notes' },
  ]),
];

function utcDay(offset: number) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

export async function seedMobileDevFixture(prisma: PrismaClient) {
  const tech = await prisma.user.findUnique({ where: { email: 'tech@darkhorseops.com' } });
  const emp = await prisma.employee.findUnique({ where: { code: 'EMP-1042' } });
  if (!tech || !emp) return;

  // Real definitions (the fixture's placeholder definition had two fields).
  const defs: Record<string, unknown> = {
    'SF-MOBILE-JSA': JSA_DEFINITION,
    'SF-MOBILE-PERMIT': PERMIT_DEFINITION,
    'SF-MOBILE-BBS': BBS_DEFINITION,
  };
  const forms: Record<string, { id: string; version: string }> = {};
  for (const [code, definition] of Object.entries(defs)) {
    const row = await prisma.safetyForm.findUnique({ where: { code } });
    if (!row) continue;
    const updated = await prisma.safetyForm.update({ where: { code }, data: { definition: definition as object, status: 'ACTIVE' } });
    forms[code] = { id: updated.id, version: updated.version };
  }

  // The submitted JSA and the permit draft use the new field keys.
  await prisma.safetyFormSubmission.updateMany({
    where: { code: 'SFS-M-1042' },
    data: {
      values: {
        site: 'Wolfcamp 12-4H', job_date: utcDay(0).toISOString().slice(0, 10), start_time: '06:45',
        location: { lat: 31.9973, lng: -102.0779 }, h2s: true, crew_size: 3,
        hazard_types: ['H2S', 'Pinch points'], risk_level: 'Medium', ppe_level: 'FR plus H2S monitor',
        confidence: 4, controls: 'Monitors on. Wind sock checked.',
        technician_signature: '/uploads/mobile/seed/signature.png',
      },
    },
  });
  await prisma.safetyFormSubmission.updateMany({
    where: { code: 'SFS-M-1042-DRAFT' },
    data: { values: { site: 'Wolfcamp 12-4H', work_type: 'Hot work', h2s: false } },
  });

  // One required rule: the permit is required for today's job but only a draft exists,
  // so closeout reports a missing form. No sales ticket exists for that job either (canSubmit: false).
  const today = await prisma.workOrder.findUnique({ where: { code: 'WO-46005950' } });
  if (today) {
    await prisma.formRule.upsert({
      where: { code: 'FR-M-1042' },
      update: { formTemplate: 'Permit to Work', required: true, status: 'ACTIVE', customerId: today.customerId },
      create: { code: 'FR-M-1042', formTemplate: 'Permit to Work', required: true, status: 'ACTIVE', customerId: today.customerId, due: 'Before Closeout', version: 'V1' },
    });
  }

  // One COMPLETED job: yesterday's job has an accepted closeout.
  const done = await prisma.workOrder.findUnique({ where: { code: 'WO-46005952' } });
  if (done) {
    await prisma.closeoutReview.upsert({
      where: { workOrderId: done.id },
      update: { status: 'ACCEPTED', submittedById: emp.id, customerId: done.customerId, decisionNote: 'Closeout accepted.' },
      create: { workOrderId: done.id, customerId: done.customerId, submittedById: emp.id, status: 'ACCEPTED', serviceDate: utcDay(-1), decisionNote: 'Closeout accepted.' },
    });
  }

  // One LOCKED time entry in a closed period.
  const locked = await prisma.timeEntry.findFirst({ where: { employeeId: emp.id, jobSiteLabel: 'MOBILE-SEED-LOCKED' } });
  if (!locked) {
    const closed = await prisma.payCycle.findFirst({ where: { status: 'CLOSED' }, orderBy: { endDate: 'desc' } });
    await prisma.timeEntry.create({
      data: {
        employeeId: emp.id,
        workDate: closed ? closed.endDate : utcDay(-21),
        cycleLabel: closed?.code ?? 'MOBILE',
        workOrderCode: 'WO-46005952',
        category: 'REGULAR', clockIn: '07:00', clockOut: '15:00', source: 'MOBILE',
        hours: 8, workHours: 8, billable: true, status: 'LOCKED', locked: true,
        customerName: done ? 'Permian Basin Energy' : undefined, jobSiteLabel: 'MOBILE-SEED-LOCKED',
      },
    });
  }

  // Pending Profile requests (Figma P-01 and P-03).
  if (!(await prisma.homeLocationChangeRequest.findFirst({ where: { userId: tech.id, status: 'PENDING_REVIEW' } }))) {
    await prisma.homeLocationChangeRequest.create({
      data: { userId: tech.id, employeeId: emp.id, address: '2200 N Big Spring St, Midland, TX 79705', lat: 32.0125, lng: -102.0779, reason: 'Moved across town' },
    });
  }
  if (!(await prisma.locationAccessRequest.findFirst({ where: { userId: tech.id, status: 'SENT' } }))) {
    await prisma.locationAccessRequest.create({ data: { userId: tech.id, employeeId: emp.id, note: 'Location is turned off on my phone' } });
  }

  console.log('Mobile dev seed: real JSA/permit/BBS definitions, required permit rule, completed job, locked entry, pending requests');
  void forms;
}
