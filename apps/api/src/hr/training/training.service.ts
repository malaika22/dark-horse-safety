import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  SsePairingStatus,
  TrainingAssignReason,
  TrainingRecordStatus,
  TrainingTopicKind,
  TrainingVerification,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, parsePage } from '../../common/utils/pagination.util';
import {
  AssignTrainingDto,
  CreateCertificateDto,
  CreateSsePairingDto,
  CreateTrainingRecordDto,
  TrainingQueryDto,
} from './dto/training.dto';

function parseDate(value?: string | null) {
  if (!value?.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(`Invalid date: ${value}`);
  }
  return d;
}

function shortName(first: string, last: string) {
  const initial = first.trim().charAt(0).toUpperCase();
  return `${initial}. ${last.trim().toUpperCase()}`;
}

function kindLabel(kind: TrainingTopicKind, topic?: string) {
  switch (kind) {
    case TrainingTopicKind.BBS:
      return 'BBS';
    case TrainingTopicKind.FIT_TEST:
      return 'Fit Test';
    case TrainingTopicKind.SSE:
      return 'SSE';
    case TrainingTopicKind.ALL:
      return 'All';
    default: {
      const t = (topic || '').toUpperCase();
      if (t.includes('H2S') || t.includes('H₂S')) return 'H₂S';
      if (t.includes('FIRST AID') || t.includes('CPR')) return 'First Aid';
      if (t.includes('FALL')) return 'Fall Prot';
      return 'General';
    }
  }
}

const COURSE_SEED: Array<{
  name: string;
  kind: TrainingTopicKind;
  code: string;
  issuingBody: string;
}> = [
  {
    name: 'H2S Awareness',
    kind: TrainingTopicKind.GENERAL,
    code: 'H2S-001',
    issuingBody: 'PEC Safeland',
  },
  {
    name: 'Fall Protection',
    kind: TrainingTopicKind.GENERAL,
    code: 'FALL-002',
    issuingBody: 'OSHA',
  },
  {
    name: 'Fit Test',
    kind: TrainingTopicKind.FIT_TEST,
    code: 'FIT-003',
    issuingBody: 'NIOSH',
  },
  {
    name: 'BBS Retrain',
    kind: TrainingTopicKind.BBS,
    code: 'BBS-004',
    issuingBody: 'Internal',
  },
  {
    name: 'SSE Mentorship',
    kind: TrainingTopicKind.SSE,
    code: 'SSE-005',
    issuingBody: 'Internal',
  },
  {
    name: 'First Aid / CPR',
    kind: TrainingTopicKind.GENERAL,
    code: 'FA-006',
    issuingBody: 'Red Cross',
  },
];

@Injectable()
export class TrainingService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86_400_000);

    const [
      activeEmployees,
      recordsOnFile,
      topics,
      expiringSoon,
      dueIn30,
      records,
      assignments,
      certificates,
      completions,
      expiryRows,
    ] = await Promise.all([
      this.prisma.employee.count({ where: { status: 'ACTIVE' } }),
      this.prisma.trainingRecord.count(),
      this.prisma.trainingCourse.count(),
      this.prisma.trainingRecord.count({
        where: { expiryAt: { gte: now, lte: in30 } },
      }),
      this.prisma.trainingRecord.count({
        where: {
          expiryAt: {
            gte: now,
            lte: new Date(now.getTime() + 30 * 86_400_000),
          },
        },
      }),
      this.prisma.trainingRecord.findMany({
        take: 50,
        orderBy: { completedAt: 'desc' },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          course: { select: { id: true, name: true } },
        },
      }),
      this.prisma.trainingAssignment.findMany({
        take: 10,
        orderBy: { dueDate: 'asc' },
        include: {
          employee: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.trainingCertificate.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.trainingCourse.findMany({
        take: 8,
        orderBy: { name: 'asc' },
      }),
      this.prisma.trainingRecord.findMany({
        where: { expiryAt: { not: null } },
        take: 8,
        orderBy: { expiryAt: 'asc' },
        include: {
          employee: { select: { firstName: true, lastName: true } },
          course: { select: { name: true } },
        },
      }),
    ]);

    const preferredOrder = [
      'H2S Awareness',
      'Fall Protection',
      'First Aid / CPR',
      'Fit Test',
    ];
    const orderedCompletions = [...completions].sort((a, b) => {
      const ai = preferredOrder.indexOf(a.name);
      const bi = preferredOrder.indexOf(b.name);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    const assignmentDone = assignments.filter(
      (a) => a.status === 'COMPLETED',
    ).length;
    const assignmentTotal = assignments.length;
    const overdueAssignments = assignments.filter(
      (a) => a.status !== 'COMPLETED',
    );

    const recordCountsByCourse = await this.prisma.trainingRecord.groupBy({
      by: ['courseId'],
      _count: { _all: true },
    });
    const countByCourse = new Map(
      recordCountsByCourse.map((r) => [r.courseId ?? '', r._count._all]),
    );

    const scoredByCourse = await this.prisma.trainingRecord.groupBy({
      by: ['courseId'],
      where: { score: { not: null } },
      _count: { _all: true },
    });
    const scoredCountByCourse = new Map(
      scoredByCourse.map((r) => [r.courseId ?? '', r._count._all]),
    );

    return {
      data: {
        kpis: {
          activeEmployees,
          enrolledLabel: 'All enrolled',
          recordsOnFile,
          topicsLabel: `Across ${topics} topics`,
          expiringSoon,
          dueLabel: `${dueIn30} due in 30d`,
        },
        records: records.map((r) => this.mapRecord(r)),
        widgets: {
          completion: orderedCompletions.slice(0, 3).map((c) => {
            const completed = countByCourse.get(c.id) ?? 0;
            const action =
              completed === 0 ? ('RENEW' as const) : ('PLAN' as const);
            return {
              id: c.id,
              title: `${c.name} · ${completed} completed`,
              subtitle: `${topics} topics tracked`,
              action,
            };
          }),
          assignments: {
            completed: assignmentDone,
            total: assignmentTotal,
            summaryLabel: 'Completed this week',
            overdueLabel: 'Overdue this week',
            rows: overdueAssignments.map((a) => ({
              id: a.id,
              name: shortName(a.employee.firstName, a.employee.lastName),
              status: 'MISSING',
            })),
          },
          certificates: certificates.map((c) => {
            const label =
              c.verification === TrainingVerification.REJECTED
                ? 'MISSING'
                : c.verification;
            const expiry = c.expiryAt
              ? `Expires ${c.expiryAt.toLocaleString('en-US', { month: 'short', year: 'numeric' })}`
              : 'Not on file';
            return {
              id: c.id,
              label:
                c.label ||
                `${shortName(c.employee.firstName, c.employee.lastName)} · Cert.pdf`,
              subtitle: `${c.issuingBody || '—'} · ${expiry}`,
              verification: c.verification,
              verificationLabel: label,
            };
          }),
          expiry: expiryRows.slice(0, 3).map((r) => {
            const days =
              r.expiryAt != null
                ? Math.ceil(
                    (r.expiryAt.getTime() - now.getTime()) / 86_400_000,
                  )
                : null;
            const expired = days != null && days < 0;
            return {
              id: r.id,
              title: `${shortName(r.employee.firstName, r.employee.lastName)} · ${r.course?.name ?? r.topic}`,
              subtitle:
                r.expiryAt != null
                  ? `${expired ? 'Expired' : 'Expires'} ${r.expiryAt.toLocaleString('en-US', { month: 'short', day: 'numeric' })} · ${Math.abs(days ?? 0)}d`
                  : null,
              action: expired || (days != null && days <= 14)
                ? ('RENEW' as const)
                : ('PLAN' as const),
            };
          }),
          quizzes: orderedCompletions.slice(0, 3).map((c) => {
            const scored = scoredCountByCourse.get(c.id) ?? 0;
            const completed = countByCourse.get(c.id) ?? 0;
            return {
              id: c.id,
              title: `${c.name} Quiz · ${scored}/${completed || scored} scored`,
              subtitle:
                completed === 0
                  ? 'No records yet'
                  : `${scored} of ${completed} records have scores`,
              action: scored === 0 ? ('RENEW' as const) : ('PLAN' as const),
            };
          }),
        },
      },
    };
  }

  private mapRecord(r: {
    id: string;
    employeeId: string;
    topic: string;
    topicCode: string | null;
    kind: TrainingTopicKind;
    completedAt: Date | null;
    mentorName: string | null;
    score: string | null;
    verification: TrainingVerification;
    status: TrainingRecordStatus;
    employee: {
      firstName: string;
      lastName: string;
      email: string | null;
    };
  }) {
    return {
      id: r.id,
      employee: shortName(r.employee.firstName, r.employee.lastName),
      employeeId: r.employeeId,
      user: kindLabel(r.kind, r.topic),
      topic: r.topic,
      topicCode: r.topicCode
        ? r.topicCode.startsWith('REF')
          ? r.topicCode
          : `REF ${r.topicCode}`
        : null,
      date: r.completedAt
        ? r.completedAt
            .toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
            .toUpperCase()
        : null,
      dateRaw: r.completedAt?.toISOString().slice(0, 10) ?? null,
      mentor: r.mentorName,
      score: r.score,
      verification:
        r.status === TrainingRecordStatus.EXPIRED
          ? 'EXPIRED'
          : r.verification,
      status: r.status,
      kind: r.kind,
    };
  }

  async listRecords(query: TrainingQueryDto) {
    const { page, pageSize, skip, take } = parsePage(
      query.page,
      query.pageSize ?? 20,
    );
    const where: Prisma.TrainingRecordWhereInput = {};
    if (query.kind && query.kind !== TrainingTopicKind.ALL) {
      where.kind = query.kind;
    }
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { topic: { contains: q, mode: 'insensitive' } },
        { mentorName: { contains: q, mode: 'insensitive' } },
        {
          employee: {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.trainingRecord.count({ where }),
      this.prisma.trainingRecord.findMany({
        where,
        skip,
        take,
        orderBy: { completedAt: 'desc' },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      data: paginate(
        rows.map((r) => this.mapRecord(r)),
        total,
        page,
        pageSize,
      ),
    };
  }

  async listCourses() {
    const courses = await this.prisma.trainingCourse.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, kind: true },
    });
    const metaByName = new Map(COURSE_SEED.map((c) => [c.name, c]));
    return {
      data: courses.map((c) => ({
        id: c.id,
        name: c.name,
        kind: c.kind,
        code: metaByName.get(c.name)?.code ?? null,
        issuingBody: metaByName.get(c.name)?.issuingBody ?? null,
      })),
    };
  }

  async createRecord(dto: CreateTrainingRecordDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    let courseName = dto.topic?.trim() || 'Training';
    let kind = dto.kind ?? TrainingTopicKind.GENERAL;
    let issuingBody = dto.issuingBody?.trim() || null;
    let courseId = dto.courseId || null;
    let topicCode: string | null = null;

    if (dto.courseId) {
      const course = await this.prisma.trainingCourse.findUnique({
        where: { id: dto.courseId },
      });
      if (!course) throw new NotFoundException('Course not found');
      courseName = dto.topic?.trim() || course.name;
      kind = dto.kind ?? course.kind;
      const meta = COURSE_SEED.find((c) => c.name === course.name);
      issuingBody = dto.issuingBody?.trim() || meta?.issuingBody || null;
      topicCode = meta?.code ?? null;
      courseId = course.id;
    }

    const completedAt = parseDate(dto.completedAt) ?? new Date();
    const expiryAt = parseDate(dto.expiryAt);

    const created = await this.prisma.trainingRecord.create({
      data: {
        employeeId: dto.employeeId,
        courseId,
        topic: courseName,
        topicCode,
        kind,
        issuingBody,
        instructor: dto.instructor?.trim() || null,
        completedAt,
        expiryAt,
        score: dto.score?.trim() || null,
        cost: dto.cost?.trim() || null,
        certificateName: dto.certificateName?.trim() || null,
        certificateSize: dto.certificateSize?.trim() || null,
        reminderLead: dto.reminderLead?.trim() || null,
        notes: dto.notes?.trim() || null,
        verification: TrainingVerification.PENDING,
        status: TrainingRecordStatus.COMPLETE,
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return { data: this.mapRecord(created) };
  }

  async assign(dto: AssignTrainingDto) {
    if (!dto.employeeIds?.length) {
      throw new BadRequestException('Select at least one technician');
    }

    let courseName = dto.courseName?.trim() || 'Assigned training';
    let courseId = dto.courseId || null;
    if (dto.courseId) {
      const course = await this.prisma.trainingCourse.findUnique({
        where: { id: dto.courseId },
      });
      if (!course) throw new NotFoundException('Course not found');
      courseName = dto.courseName?.trim() || course.name;
      courseId = course.id;
    }

    const dueDate = parseDate(dto.dueDate);
    const created = await this.prisma.$transaction(
      dto.employeeIds.map((employeeId) =>
        this.prisma.trainingAssignment.create({
          data: {
            employeeId,
            courseId,
            courseName,
            dueDate,
            reason: dto.reason ?? TrainingAssignReason.NEW_HIRE,
            notify: dto.notify ?? true,
            linkedSource: dto.linkedSource?.trim() || null,
            status: 'ASSIGNED',
          },
        }),
      ),
    );
    return { data: { count: created.length, items: created } };
  }

  async createCertificate(dto: CreateCertificateDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const created = await this.prisma.trainingCertificate.create({
      data: {
        employeeId: dto.employeeId,
        label: dto.label.trim(),
        expiryAt: parseDate(dto.expiryAt),
        verification: dto.verification ?? TrainingVerification.PENDING,
        issuingBody: dto.issuingBody?.trim() || null,
        fileName: dto.fileName?.trim() || null,
        fileSize: dto.fileSize?.trim() || null,
        renewalReminder: dto.renewalReminder ?? true,
      },
    });
    return { data: created };
  }

  async getSseDashboard() {
    const pairings = await this.prisma.ssePairing.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        mentor: { select: { firstName: true, lastName: true } },
        mentee: { select: { firstName: true, lastName: true } },
      },
    });

    const active = pairings.filter((p) => p.status === SsePairingStatus.ACTIVE);
    const evalsDue = pairings.filter((p) => p.evalStatus === 'DUE');
    const evalsSubmitted = pairings.filter((p) => p.evalStatus === 'SUBMITTED');
    const now = new Date();

    return {
      data: {
        kpis: {
          activePairings: active.length || pairings.length,
          pairingsLabel: 'Mentor-mentee',
          evaluationsThisWeek: `${evalsSubmitted.length}/${active.length || pairings.length || 1}`,
          missingLabel: `${evalsDue.length} missing`,
          sseEvaluations: evalsSubmitted.length + evalsDue.length,
          cycleLabel: `Cycle ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        },
        widgets: {
          pairings: pairings.map((p) => ({
            id: p.id,
            label: `${shortName(p.mentor.firstName, p.mentor.lastName)} <-> ${shortName(p.mentee.firstName, p.mentee.lastName)}`,
            status: p.status,
            action:
              p.status === SsePairingStatus.ACTIVE
                ? ('PLAN' as const)
                : ('RENEW' as const),
          })),
          evaluationsDue: {
            completed: evalsSubmitted.length,
            total: active.length || pairings.length || 1,
            summaryLabel: 'Evaluations completed this cycle',
            pendingLabel: 'Pending this cycle',
            rows: pairings.map((p) => ({
              id: p.id,
              label: `${shortName(p.mentee.firstName, p.mentee.lastName)} — ${p.evalDueLabel ?? 'Evaluation'}`,
              status: p.evalStatus ?? 'DUE',
            })),
          },
          mentorScorecard: pairings.map((p) => ({
            id: p.id,
            label: `${shortName(p.mentor.firstName, p.mentor.lastName)} rates ${shortName(p.mentee.firstName, p.mentee.lastName)}`,
            status: p.scorecardStatus ?? 'PENDING',
            action:
              p.scorecardStatus === 'SUBMITTED'
                ? ('PLAN' as const)
                : ('RENEW' as const),
          })),
          graduation: pairings.map((p) => ({
            id: p.id,
            name: shortName(p.mentee.firstName, p.mentee.lastName),
            label: p.graduationLabel ?? `In progress — ${p.progressPct}%`,
            action:
              p.status === SsePairingStatus.GRADUATED
                ? ('PLAN' as const)
                : ('RENEW' as const),
          })),
          decisions: pairings
            .filter((p) => p.decisionLabel)
            .map((p, i) => ({
              id: p.id,
              label: p.decisionLabel!,
              detail:
                p.decisionLabel && p.updatedAt
                  ? `Submitted ${p.updatedAt.toLocaleString('en-US', { month: 'short', day: 'numeric' })} — Pending ${30 + i * 14}d`
                  : p.graduationLabel,
              action: i % 2 === 0 ? ('PLAN' as const) : ('RENEW' as const),
            })),
          feedback: pairings.map((p) => ({
            id: p.id,
            label: `${shortName(p.mentee.firstName, p.mentee.lastName)} rates ${shortName(p.mentor.firstName, p.mentor.lastName)}`,
            status: p.feedbackStatus ?? 'PENDING',
            action:
              p.feedbackStatus === 'SUBMITTED'
                ? ('PLAN' as const)
                : ('RENEW' as const),
          })),
        },
      },
    };
  }

  async createSsePairing(dto: CreateSsePairingDto) {
    if (dto.mentorId === dto.menteeId) {
      throw new BadRequestException('Mentor and mentee must differ');
    }
    const [mentor, mentee] = await Promise.all([
      this.prisma.employee.findUnique({ where: { id: dto.mentorId } }),
      this.prisma.employee.findUnique({ where: { id: dto.menteeId } }),
    ]);
    if (!mentor || !mentee) {
      throw new NotFoundException('Mentor or mentee not found');
    }

    const created = await this.prisma.ssePairing.create({
      data: {
        mentorId: dto.mentorId,
        menteeId: dto.menteeId,
        status: SsePairingStatus.ACTIVE,
        progressPct: 0,
        evalDueLabel: 'Mentor scorecard due',
        evalStatus: 'DUE',
        scorecardStatus: 'PENDING',
        graduationLabel: 'In progress — 0%',
        feedbackStatus: 'PENDING',
      },
    });
    return { data: created };
  }
}
