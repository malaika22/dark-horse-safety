import {
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma, SafetyFormStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SafetyFormListQueryDto,
  UpdateSafetyFormDto,
} from './dto/safety-form.dto';

export type SafetyFieldType =
  | 'TEXT'
  | 'NUMBER'
  | 'STATIC_TEXT'
  | 'CALCULATOR'
  | 'RATING'
  | 'DROPDOWN'
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICES'
  | 'PHOTO'
  | 'SIGNATURE'
  | 'DRAWING'
  | 'STATIC_IMAGE'
  | 'DATE'
  | 'TIME'
  | 'GPS'
  | 'CHECKBOX'
  | 'LINK'
  | 'MIRROR'
  | 'BARCODE';

export type SafetyFormField = {
  id: string;
  type: SafetyFieldType | string;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
};

export type SafetyFormSection = {
  id: string;
  title: string;
  required?: boolean;
  fields: SafetyFormField[];
};

export type SafetyFormDefinition = {
  sections: SafetyFormSection[];
};

export const FIELD_LIBRARY = [
  {
    category: 'TEXT & NUMBER',
    items: [
      { type: 'TEXT', label: 'TEXT' },
      { type: 'NUMBER', label: 'NUMBER' },
      { type: 'STATIC_TEXT', label: 'STATIC TEXT' },
      { type: 'CALCULATOR', label: 'CALCULATOR' },
      { type: 'RATING', label: 'RATING' },
    ],
  },
  {
    category: 'CHOICES',
    items: [
      { type: 'DROPDOWN', label: 'DROPDOWNS' },
      { type: 'SINGLE_CHOICE', label: 'SINGLE CHOICE' },
      { type: 'MULTIPLE_CHOICES', label: 'MULTIPLE CHOICES' },
    ],
  },
  {
    category: 'MULTIMEDIA',
    items: [
      { type: 'PHOTO', label: 'PHOTO' },
      { type: 'SIGNATURE', label: 'SIGNATURE' },
      { type: 'DRAWING', label: 'DRAWING' },
      { type: 'STATIC_IMAGE', label: 'STATIC IMAGE' },
    ],
  },
  {
    category: 'TIME, DATE, LOCATION',
    items: [
      { type: 'DATE', label: 'DATE' },
      { type: 'TIME', label: 'TIME' },
      { type: 'GPS', label: 'GPS' },
    ],
  },
  {
    category: 'OTHER',
    items: [
      { type: 'CHECKBOX', label: 'CHECKBOX' },
      { type: 'LINK', label: 'LINK' },
      { type: 'MIRROR', label: 'MIRROR' },
      { type: 'BARCODE', label: 'BARCODE' },
    ],
  },
] as const;

const DEMO_FORM_CODE = 'SF-000001';
const DEMO_SUBMISSION_CODE = 'SUB-20260918-001';

function demoDefinition(): SafetyFormDefinition {
  return {
    sections: [
      {
        id: 'sec-employee',
        title: 'EMPLOYEE INFORMATION',
        required: true,
        fields: [
          {
            id: 'f-emp-name',
            type: 'TEXT',
            label: 'EMPLOYEE NAME',
            placeholder: 'E.G. JOHN',
            required: true,
          },
          {
            id: 'f-emp-location',
            type: 'TEXT',
            label: 'LOCATION NAME OR EQUIPMENT INFORMATION',
            placeholder: 'WRITE INFO',
          },
        ],
      },
      {
        id: 'sec-company',
        title: 'COMPANY INFORMATION',
        required: false,
        fields: [
          {
            id: 'f-co-name',
            type: 'TEXT',
            label: 'COMPANY NAME',
            placeholder: 'E.G. ABC INC',
          },
          {
            id: 'f-co-work',
            type: 'TEXT',
            label: 'WORK NUMBER',
            placeholder: 'WRITE WORK NO',
          },
          {
            id: 'f-co-contact',
            type: 'TEXT',
            label: 'NAME & PHONE NUMBER',
            placeholder: 'WRITE NAME AND PHONE NUMBER',
          },
        ],
      },
      {
        id: 'sec-equipment',
        title: 'EQUIPMENT INFORMATION',
        required: false,
        fields: [
          {
            id: 'f-eq-name',
            type: 'TEXT',
            label: 'EQUIPMENT NAME',
            placeholder: 'E.G. ABC INC',
          },
          {
            id: 'f-eq-condition',
            type: 'DROPDOWN',
            label: 'OVERALL CONDITION',
            placeholder: 'SELECT OPTION',
            options: [
              'OPERATIONAL — NO DEFECTS',
              'MINOR DEFECTS',
              'OUT OF SERVICE',
            ],
          },
          {
            id: 'f-eq-desc',
            type: 'TEXT',
            label: 'ADDITIONAL DESCRIPTION',
            placeholder: 'WRITE DESCRIPTION',
          },
        ],
      },
      {
        id: 'sec-signature',
        title: 'TITLE NAME',
        required: false,
        fields: [
          { id: 'f-sig', type: 'SIGNATURE', label: 'SIGNATURE' },
          { id: 'f-img', type: 'PHOTO', label: 'IMAGE' },
        ],
      },
    ],
  };
}

function asDefinition(v: unknown): SafetyFormDefinition {
  if (v && typeof v === 'object' && Array.isArray((v as any).sections)) {
    return v as SafetyFormDefinition;
  }
  return demoDefinition();
}

function formatPreviewDate(d: Date) {
  return d
    .toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'America/Chicago',
    })
    .toUpperCase();
}

function formatPreviewDateTime(d: Date) {
  return (
    d
      .toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/Chicago',
      })
      .replace(',', '')
      .toUpperCase() + ' CT'
  );
}

@Injectable()
export class SafetyFormsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.ensureDemo();
    } catch {
      // DB may not be migrated yet during boot
    }
  }

  async ensureDemo() {
    const existing = await this.prisma.safetyForm.findUnique({
      where: { code: DEMO_FORM_CODE },
    });

    const definition = demoDefinition();
    const form =
      existing ??
      (await this.prisma.safetyForm.create({
        data: {
          code: DEMO_FORM_CODE,
          title: 'CUSTOMER OWNED EQUIPMENT INSPECTION',
          version: 'V1.0',
          status: SafetyFormStatus.ACTIVE,
          definition: definition as unknown as Prisma.InputJsonValue,
        },
      }));

    if (existing) {
      await this.prisma.safetyForm.update({
        where: { id: existing.id },
        data: {
          title: 'CUSTOMER OWNED EQUIPMENT INSPECTION',
          version: existing.version || 'V1.0',
          status: SafetyFormStatus.ACTIVE,
          definition:
            asDefinition(existing.definition).sections.length > 0
              ? (existing.definition as Prisma.InputJsonValue)
              : (definition as unknown as Prisma.InputJsonValue),
        },
      });
    }

    const sub = await this.prisma.safetyFormSubmission.findUnique({
      where: { code: DEMO_SUBMISSION_CODE },
    });

    const submittedAt = new Date('2026-09-18T19:32:00.000Z');
    const meta = {
      company: {
        name: 'DARK HORSE DISPLAY',
        address: '2400 INDUSTRIAL BLVD · MIDLAND TX 79701',
        phone: '(432) 555-0140',
        website: 'DARKHORSEDISPLAY.COM',
      },
      formLabel: 'SAFETY FORM',
      formDate: 'SEP 18, 2026',
      workOrder: 'WO-2026-0187',
      customer: 'PERMIAN BASIN ENERGY',
      location: 'MIDLAND TX - SITE A',
      submittedLabel: formatPreviewDateTime(submittedAt),
      employee: {
        name: 'RYAN CRAWFORD',
        id: 'EMP-041',
        inspectionDate: 'SEP 18, 2026',
        crew: 'CREW ALPHA — MIDLAND',
      },
      companyInfo: {
        name: 'PERMIAN BASIN ENERGY',
        contact: 'J. WHITFIELD',
        phone: '(432) 555-0100',
        siteAddress: '1200 ENERGY PLAZA, MIDLAND TX',
      },
      equipment: {
        type: 'GAS MONITOR MX6',
        serial: 'MX6-8821-TX',
        lastCalibrated: 'AUG 14, 2026',
        condition: 'OPERATIONAL — NO DEFECTS',
      },
      signature: {
        title: 'TITLE NAME — SIGNATURE',
        onFile: true,
        signedBy: 'RYAN CRAWFORD',
        signedAt: formatPreviewDateTime(submittedAt),
        gps: '31.9973° N, 102.0779° W',
      },
      footer: {
        submissionId: DEMO_SUBMISSION_CODE,
        submittedBy: 'RYAN CRAWFORD',
        submittedAt: formatPreviewDateTime(submittedAt),
        locked: true,
      },
    };

    const values = {
      'f-emp-name': 'RYAN CRAWFORD',
      'f-emp-location': 'MIDLAND TX - SITE A',
      'f-co-name': 'PERMIAN BASIN ENERGY',
      'f-co-work': 'WO-2026-0187',
      'f-co-contact': 'J. WHITFIELD · (432) 555-0100',
      'f-eq-name': 'GAS MONITOR MX6',
      'f-eq-condition': 'OPERATIONAL — NO DEFECTS',
      'f-eq-desc': 'SERIAL MX6-8821-TX · LAST CALIBRATED AUG 14, 2026',
      'f-sig': '[SIGNATURE ON FILE]',
      'f-img': null,
    };

    if (!sub) {
      await this.prisma.safetyFormSubmission.create({
        data: {
          code: DEMO_SUBMISSION_CODE,
          formId: form.id,
          workOrderCode: 'WO-2026-0187',
          customerName: 'PERMIAN BASIN ENERGY',
          locationLabel: 'MIDLAND TX - SITE A',
          status: 'LOCKED',
          values: values as unknown as Prisma.InputJsonValue,
          meta: meta as unknown as Prisma.InputJsonValue,
          submittedByName: 'RYAN CRAWFORD',
          submittedAt,
          lockedAt: submittedAt,
        },
      });
    } else {
      await this.prisma.safetyFormSubmission.update({
        where: { id: sub.id },
        data: {
          formId: form.id,
          workOrderCode: 'WO-2026-0187',
          customerName: 'PERMIAN BASIN ENERGY',
          locationLabel: 'MIDLAND TX - SITE A',
          status: 'LOCKED',
          values: values as unknown as Prisma.InputJsonValue,
          meta: meta as unknown as Prisma.InputJsonValue,
          submittedByName: 'RYAN CRAWFORD',
          submittedAt,
          lockedAt: submittedAt,
        },
      });
    }

    return form;
  }

  async list(query: SafetyFormListQueryDto) {
    await this.ensureDemo();
    const where: Prisma.SafetyFormWhereInput = {};
    if (query.status) {
      where.status = query.status as SafetyFormStatus;
    }
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ];
    }

    const items = await this.prisma.safetyForm.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { submissions: true } } },
    });

    return {
      data: {
        items: items.map((f) => ({
          id: f.id,
          code: f.code,
          title: f.title,
          version: f.version,
          status: f.status,
          submissionCount: f._count.submissions,
          updatedAt: f.updatedAt.toISOString(),
        })),
        total: items.length,
        fieldLibrary: FIELD_LIBRARY,
      },
    };
  }

  async getOne(id: string) {
    await this.ensureDemo();
    const form = await this.prisma.safetyForm.findFirst({
      where: {
        OR: [{ id }, { code: id }],
      },
    });
    if (!form) throw new NotFoundException('Form not found');

    const definition = asDefinition(form.definition);
    return {
      data: {
        id: form.id,
        code: form.code,
        title: form.title,
        version: form.version,
        status: form.status,
        sections: definition.sections,
        definition,
        fieldLibrary: FIELD_LIBRARY,
        updatedAt: form.updatedAt.toISOString(),
        createdAt: form.createdAt.toISOString(),
      },
    };
  }

  async update(id: string, dto: UpdateSafetyFormDto) {
    const form = await this.prisma.safetyForm.findFirst({
      where: { OR: [{ id }, { code: id }] },
    });
    if (!form) throw new NotFoundException('Form not found');

    const current = asDefinition(form.definition);
    const nextDefinition: SafetyFormDefinition = dto.sections
      ? { sections: dto.sections as SafetyFormSection[] }
      : dto.definition
        ? asDefinition(dto.definition)
        : current;

    const updated = await this.prisma.safetyForm.update({
      where: { id: form.id },
      data: {
        ...(dto.title != null ? { title: dto.title.trim() } : {}),
        ...(dto.version != null ? { version: dto.version } : {}),
        ...(dto.status != null ? { status: dto.status } : {}),
        definition: nextDefinition as unknown as Prisma.InputJsonValue,
      },
    });

    const definition = asDefinition(updated.definition);
    return {
      data: {
        id: updated.id,
        code: updated.code,
        title: updated.title,
        version: updated.version,
        status: updated.status,
        sections: definition.sections,
        definition,
        fieldLibrary: FIELD_LIBRARY,
        updatedAt: updated.updatedAt.toISOString(),
        createdAt: updated.createdAt.toISOString(),
      },
    };
  }

  async preview(id: string, submissionId?: string) {
    await this.ensureDemo();
    const form = await this.prisma.safetyForm.findFirst({
      where: { OR: [{ id }, { code: id }] },
    });
    if (!form) throw new NotFoundException('Form not found');

    const submission = submissionId
      ? await this.prisma.safetyFormSubmission.findFirst({
          where: {
            formId: form.id,
            OR: [{ id: submissionId }, { code: submissionId }],
          },
        })
      : await this.prisma.safetyFormSubmission.findFirst({
          where: { formId: form.id },
          orderBy: { submittedAt: 'desc' },
        });

    if (!submission) throw new NotFoundException('Submission not found');

    const definition = asDefinition(form.definition);
    const meta = (submission.meta ?? {}) as Record<string, unknown>;
    const values = (submission.values ?? {}) as Record<string, unknown>;

    return {
      data: {
        form: {
          id: form.id,
          code: form.code,
          title: form.title,
          version: form.version,
          sections: definition.sections,
        },
        submission: {
          id: submission.id,
          code: submission.code,
          status: submission.status,
          workOrderCode: submission.workOrderCode,
          customerName: submission.customerName,
          locationLabel: submission.locationLabel,
          submittedByName: submission.submittedByName,
          submittedAt: submission.submittedAt?.toISOString() ?? null,
          lockedAt: submission.lockedAt?.toISOString() ?? null,
          values,
          meta,
        },
        printTitle: `${form.title} · PRINT PREVIEW`,
        previewDate: formatPreviewDate(
          submission.submittedAt ?? submission.createdAt,
        ),
      },
    };
  }
}
