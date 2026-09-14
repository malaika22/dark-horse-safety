import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CardExceptionKind,
  CardExceptionResolution,
  CardExceptionSource,
  CardReconStatus,
  CrmRecordStatus,
  ExpenseStatus,
  Prisma,
  SalesActivityType,
} from '@prisma/client';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AddChargeDto,
  EnsureReconciliationDto,
  FinishReconciliationDto,
  LinkExpenseDto,
  WaiveExceptionDto,
} from './dto/card-reconciliation.dto';

const INCLUDE = {
  customer: { select: { id: true, name: true, code: true } },
  paymentCard: true,
  cardholder: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  exceptions: {
    orderBy: { exceptionDate: 'desc' as const },
    include: {
      expense: {
        select: {
          id: true,
          code: true,
          merchant: true,
          amount: true,
          status: true,
          receiptUrl: true,
          noReceipt: true,
          missingReceiptReason: true,
        },
      },
    },
  },
} satisfies Prisma.CardReconciliationInclude;

function money(n: Prisma.Decimal | number | string | null | undefined) {
  if (n == null) return 0;
  return typeof n === 'object' && 'toString' in n
    ? Number(n.toString())
    : Number(n);
}

function shortName(
  first?: string | null,
  last?: string | null,
  email?: string | null,
) {
  const f = (first ?? '').trim();
  const l = (last ?? '').trim();
  if (f && l) return `${f.charAt(0).toUpperCase()}. ${l.toUpperCase()}`;
  const full = [f, l].filter(Boolean).join(' ').trim();
  return (full || email || 'CARDHOLDER').toUpperCase();
}

function statementLabelFor(d: Date) {
  return `${d
    .toLocaleDateString('en-US', { month: 'short' })
    .toUpperCase()} STATEMENT`;
}

function periodFor(now = new Date()) {
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
  return { periodStart, periodEnd, statementLabel: statementLabelFor(periodStart) };
}

function quarterLabel(d = new Date()) {
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q} ${d.getFullYear()}`;
}

function expenseExceptionKind(
  status: ExpenseStatus,
): CardExceptionKind | null {
  if (status === ExpenseStatus.MISSING_RECEIPT) {
    return CardExceptionKind.MISSING_RECEIPT;
  }
  if (status === ExpenseStatus.UNMATCHED || status === ExpenseStatus.DRAFT) {
    return CardExceptionKind.UNMATCHED_EXPENSE;
  }
  return null;
}

@Injectable()
export class CardReconciliationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: CodeGeneratorService,
  ) {}

  private serialize(
    row: Prisma.CardReconciliationGetPayload<{ include: typeof INCLUDE }>,
  ) {
    const exceptions = row.exceptions.map((ex) => ({
      ...ex,
      amount: money(ex.amount),
      expense: ex.expense
        ? { ...ex.expense, amount: money(ex.expense.amount) }
        : null,
    }));
    const statementLines = exceptions.filter(
      (e) => e.source === CardExceptionSource.STATEMENT,
    );
    const openExceptions = exceptions.filter((e) => !e.resolved);
    const matchedTotal = statementLines
      .filter((e) => e.resolved || e.kind === CardExceptionKind.MATCHED)
      .reduce((sum, e) => sum + e.amount, 0);
    const unmatchedStatement = statementLines
      .filter((e) => !e.resolved)
      .reduce((sum, e) => sum + e.amount, 0);
    const statementTotal = statementLines.reduce((sum, e) => sum + e.amount, 0);
    const unresolvedCharges = openExceptions.filter(
      (e) => e.kind === CardExceptionKind.UNMATCHED_CHARGE,
    );
    const cardholderName = shortName(
      row.cardholder?.firstName,
      row.cardholder?.lastName,
      row.cardholder?.email,
    );
    const qLabel = quarterLabel();

    return {
      ...row,
      statementTotal,
      matchedTotal,
      unmatchedTotal: unmatchedStatement,
      exceptionCount: openExceptions.length,
      unresolvedChargeCount: unresolvedCharges.length,
      unresolvedCharges,
      bonusDeductionWarning:
        unresolvedCharges.length > 0
          ? `Finishing will record these against ${cardholderName}'s ${qLabel} bonus deduction.`
          : null,
      cardholderName,
      quarterLabel: qLabel,
      exceptions: openExceptions,
      allExceptions: exceptions,
      needsPaymentCard: !row.paymentCardId,
    };
  }

  private async load(id: string) {
    const row = await this.prisma.cardReconciliation.findUnique({
      where: { id },
      include: INCLUDE,
    });
    if (!row) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Card reconciliation not found',
      });
    }
    return row;
  }

  private async recomputeTotal(id: string) {
    const agg = await this.prisma.cardReconException.aggregate({
      where: {
        reconciliationId: id,
        source: CardExceptionSource.STATEMENT,
      },
      _sum: { amount: true },
    });
    await this.prisma.cardReconciliation.update({
      where: { id },
      data: { statementTotal: agg._sum.amount ?? 0 },
    });
  }

  async getForCustomer(customerId: string, dto?: EnsureReconciliationDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, archivedAt: null },
      select: { id: true, assignedRepId: true },
    });
    if (!customer) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Customer not found',
      });
    }

    let recon = await this.prisma.cardReconciliation.findFirst({
      where: { customerId, status: CardReconStatus.OPEN },
      include: INCLUDE,
      orderBy: { periodStart: 'desc' },
    });

    if (!recon) {
      const card =
        (dto?.paymentCardId
          ? await this.prisma.paymentCard.findFirst({
              where: {
                id: dto.paymentCardId,
                archivedAt: null,
                active: true,
              },
            })
          : null) ??
        (await this.prisma.paymentCard.findFirst({
          where: { archivedAt: null, active: true },
          orderBy: { createdAt: 'asc' },
        }));

      if (!card) {
        return {
          data: {
            id: null,
            customerId,
            needsPaymentCard: true,
            statementTotal: 0,
            matchedTotal: 0,
            unmatchedTotal: 0,
            exceptionCount: 0,
            unresolvedChargeCount: 0,
            unresolvedCharges: [],
            exceptions: [],
            allExceptions: [],
            bonusDeductionWarning: null,
            cardholderName: null,
            cardLabel: null,
            statementLabel: statementLabelFor(new Date()),
            status: 'OPEN',
            paymentCard: null,
          },
        };
      }

      const { periodStart, periodEnd, statementLabel } = periodFor();
      const code = await this.codes.next('cardReconciliation');
      recon = await this.prisma.cardReconciliation.create({
        data: {
          code,
          customerId,
          paymentCardId: card.id,
          cardLabel: card.label,
          cardholderId: card.ownerId ?? customer.assignedRepId,
          periodStart,
          periodEnd,
          statementLabel,
        },
        include: INCLUDE,
      });
    } else if (dto?.paymentCardId && !recon.paymentCardId) {
      const card = await this.prisma.paymentCard.findFirst({
        where: { id: dto.paymentCardId, archivedAt: null, active: true },
      });
      if (card) {
        recon = await this.prisma.cardReconciliation.update({
          where: { id: recon.id },
          data: {
            paymentCardId: card.id,
            cardLabel: card.label,
            cardholderId: card.ownerId ?? recon.cardholderId,
          },
          include: INCLUDE,
        });
      }
    }

    await this.syncFromExpenses(recon.id);
    return { data: this.serialize(await this.load(recon.id)) };
  }

  async getById(id: string) {
    return { data: this.serialize(await this.load(id)) };
  }

  async syncFromExpenses(id: string) {
    const recon = await this.load(id);
    if (recon.status === CardReconStatus.FINISHED) {
      return { data: this.serialize(recon) };
    }

    const expenses = await this.prisma.expense.findMany({
      where: {
        customerId: recon.customerId,
        archivedAt: null,
        expenseDate: { gte: recon.periodStart, lte: recon.periodEnd },
      },
      orderBy: { expenseDate: 'desc' },
    });

    const linked = new Set(
      recon.exceptions.map((e) => e.expenseId).filter(Boolean) as string[],
    );

    for (const expense of expenses) {
      if (linked.has(expense.id)) continue;
      const kind = expenseExceptionKind(expense.status);
      if (!kind) continue;

      await this.prisma.cardReconException.create({
        data: {
          reconciliationId: recon.id,
          kind,
          source: CardExceptionSource.EXPENSE,
          exceptionDate: expense.expenseDate,
          merchant: expense.merchant,
          amount: expense.amount,
          resolved: false,
          resolution: CardExceptionResolution.NONE,
          expenseId: expense.id,
        },
      });
    }

    await this.recomputeTotal(recon.id);
    return { data: this.serialize(await this.load(id)) };
  }

  async addCharge(id: string, dto: AddChargeDto) {
    const recon = await this.load(id);
    if (recon.status === CardReconStatus.FINISHED) {
      throw new BadRequestException({
        code: 'FINISHED',
        message: 'Reconciliation is already finished',
      });
    }
    if (!recon.paymentCardId) {
      throw new BadRequestException({
        code: 'NO_PAYMENT_CARD',
        message: 'Assign a payment card before adding statement charges',
      });
    }
    await this.prisma.cardReconException.create({
      data: {
        reconciliationId: id,
        kind: CardExceptionKind.UNMATCHED_CHARGE,
        source: CardExceptionSource.STATEMENT,
        exceptionDate: new Date(dto.exceptionDate),
        merchant: dto.merchant.trim(),
        amount: new Prisma.Decimal(dto.amount),
        resolved: false,
        resolution: CardExceptionResolution.NONE,
      },
    });
    await this.recomputeTotal(id);
    return { data: this.serialize(await this.load(id)) };
  }

  async autoMatch(id: string) {
    const recon = await this.load(id);
    if (recon.status === CardReconStatus.FINISHED) {
      throw new BadRequestException({
        code: 'FINISHED',
        message: 'Reconciliation is already finished',
      });
    }

    const openCharges = recon.exceptions.filter(
      (e) =>
        !e.resolved &&
        e.kind === CardExceptionKind.UNMATCHED_CHARGE &&
        e.source === CardExceptionSource.STATEMENT &&
        !e.expenseId,
    );
    const expenses = await this.prisma.expense.findMany({
      where: {
        customerId: recon.customerId,
        archivedAt: null,
        expenseDate: { gte: recon.periodStart, lte: recon.periodEnd },
        status: {
          notIn: [ExpenseStatus.DRAFT],
        },
      },
    });
    const usedExpenseIds = new Set(
      recon.exceptions.map((e) => e.expenseId).filter(Boolean) as string[],
    );

    for (const charge of openCharges) {
      const amount = money(charge.amount);
      const merchantKey = charge.merchant.trim().toLowerCase();
      const match = expenses.find((exp) => {
        if (usedExpenseIds.has(exp.id)) return false;
        if (Math.abs(money(exp.amount) - amount) > 0.01) return false;
        const expMerchant = exp.merchant.trim().toLowerCase();
        return (
          expMerchant.includes(merchantKey) ||
          merchantKey.includes(expMerchant) ||
          expMerchant === merchantKey
        );
      });
      if (!match) continue;
      usedExpenseIds.add(match.id);
      const missing =
        match.status === ExpenseStatus.MISSING_RECEIPT ||
        Boolean(match.noReceipt && !match.receiptUrl);
      await this.prisma.cardReconException.update({
        where: { id: charge.id },
        data: {
          expenseId: match.id,
          kind: missing
            ? CardExceptionKind.MISSING_RECEIPT
            : CardExceptionKind.MATCHED,
          resolved: !missing,
          resolution: missing
            ? CardExceptionResolution.EXPENSE_LOGGED
            : CardExceptionResolution.MATCHED,
        },
      });
      // Resolve any expense-sourced duplicate for same expense
      await this.prisma.cardReconException.updateMany({
        where: {
          reconciliationId: id,
          expenseId: match.id,
          source: CardExceptionSource.EXPENSE,
          resolved: false,
        },
        data: {
          resolved: true,
          resolution: CardExceptionResolution.MATCHED,
        },
      });
    }

    // Promote missing-receipt statement lines when expense now has receipt
    for (const ex of recon.exceptions) {
      if (
        ex.resolved ||
        ex.kind !== CardExceptionKind.MISSING_RECEIPT ||
        !ex.expenseId
      ) {
        continue;
      }
      const expense = await this.prisma.expense.findUnique({
        where: { id: ex.expenseId },
      });
      if (
        expense &&
        !expense.noReceipt &&
        expense.receiptUrl &&
        expense.status !== ExpenseStatus.MISSING_RECEIPT
      ) {
        await this.prisma.cardReconException.update({
          where: { id: ex.id },
          data: {
            kind:
              ex.source === CardExceptionSource.STATEMENT
                ? CardExceptionKind.MATCHED
                : CardExceptionKind.MATCHED,
            resolved: true,
            resolution: CardExceptionResolution.MATCHED,
          },
        });
      }
    }

    await this.syncFromExpenses(id);
    return { data: this.serialize(await this.load(id)) };
  }

  private async getOpenException(reconId: string, exceptionId: string) {
    const ex = await this.prisma.cardReconException.findFirst({
      where: { id: exceptionId, reconciliationId: reconId },
    });
    if (!ex) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Exception not found',
      });
    }
    return ex;
  }

  async requestReceipt(reconId: string, exceptionId: string) {
    const ex = await this.getOpenException(reconId, exceptionId);
    if (ex.kind !== CardExceptionKind.MISSING_RECEIPT) {
      throw new BadRequestException({
        code: 'INVALID_KIND',
        message: 'Only missing-receipt exceptions can request a receipt',
      });
    }
    await this.prisma.cardReconException.update({
      where: { id: ex.id },
      data: {
        receiptRequestedAt: new Date(),
        resolution: CardExceptionResolution.RECEIPT_REQUESTED,
      },
    });
    if (ex.expenseId) {
      const expense = await this.prisma.expense.findUnique({
        where: { id: ex.expenseId },
        select: {
          id: true,
          code: true,
          customerId: true,
          repId: true,
          notes: true,
        },
      });
      if (expense) {
        const stamp = `\n[Receipt requested ${new Date().toISOString()}]`;
        await this.prisma.expense.update({
          where: { id: expense.id },
          data: {
            notes: `${expense.notes ?? ''}${stamp}`.trim(),
          },
        });
        if (expense.repId) {
          const activityCode = await this.codes.next('salesActivity');
          await this.prisma.salesActivity.create({
            data: {
              activityCode,
              type: SalesActivityType.OTHER,
              subject: `Receipt requested · ${expense.code}`,
              notes: `Please upload a receipt for expense ${expense.code}.`,
              customerId: expense.customerId,
              repId: expense.repId,
              createFollowUpTask: true,
              followUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              status: CrmRecordStatus.PENDING,
            },
          });
        }
      }
    }
    return { data: this.serialize(await this.load(reconId)) };
  }

  async waive(
    reconId: string,
    exceptionId: string,
    dto: WaiveExceptionDto,
  ) {
    const ex = await this.getOpenException(reconId, exceptionId);
    if (ex.kind !== CardExceptionKind.MISSING_RECEIPT) {
      throw new BadRequestException({
        code: 'INVALID_KIND',
        message: 'Only missing-receipt exceptions can be waived',
      });
    }
    if (!dto.reason?.trim()) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: 'Waive reason is required',
      });
    }
    await this.prisma.cardReconException.update({
      where: { id: ex.id },
      data: {
        resolved: true,
        resolution: CardExceptionResolution.WAIVED,
        waiveReason: dto.reason.trim(),
        kind:
          ex.source === CardExceptionSource.STATEMENT
            ? CardExceptionKind.MATCHED
            : ex.kind,
      },
    });
    return { data: this.serialize(await this.load(reconId)) };
  }

  async linkExpense(
    reconId: string,
    exceptionId: string,
    dto: LinkExpenseDto,
  ) {
    const ex = await this.getOpenException(reconId, exceptionId);
    if (ex.kind !== CardExceptionKind.UNMATCHED_CHARGE) {
      throw new BadRequestException({
        code: 'INVALID_KIND',
        message: 'Only unmatched charges can link an expense',
      });
    }
    const expense = await this.prisma.expense.findFirst({
      where: { id: dto.expenseId, archivedAt: null },
    });
    if (!expense) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Expense not found',
      });
    }
    const missing =
      expense.status === ExpenseStatus.MISSING_RECEIPT ||
      Boolean(expense.noReceipt && !expense.receiptUrl);
    await this.prisma.cardReconException.update({
      where: { id: ex.id },
      data: {
        expenseId: expense.id,
        kind: missing
          ? CardExceptionKind.MISSING_RECEIPT
          : CardExceptionKind.MATCHED,
        resolved: !missing,
        resolution: missing
          ? CardExceptionResolution.EXPENSE_LOGGED
          : CardExceptionResolution.MATCHED,
      },
    });
    await this.recomputeTotal(reconId);
    return { data: this.serialize(await this.load(reconId)) };
  }

  async markPersonal(reconId: string, exceptionId: string) {
    const ex = await this.getOpenException(reconId, exceptionId);
    if (ex.kind !== CardExceptionKind.UNMATCHED_EXPENSE) {
      throw new BadRequestException({
        code: 'INVALID_KIND',
        message: 'Only unmatched expenses support this action',
      });
    }
    await this.prisma.cardReconException.update({
      where: { id: ex.id },
      data: {
        resolved: true,
        resolution: CardExceptionResolution.PERSONAL,
      },
    });
    if (ex.expenseId) {
      await this.prisma.expense.update({
        where: { id: ex.expenseId },
        data: {
          reimbursable: true,
          paymentMethod: 'Personal Card',
          status: ExpenseStatus.APPROVED,
        },
      });
    }
    return { data: this.serialize(await this.load(reconId)) };
  }

  async dispute(reconId: string, exceptionId: string) {
    return this.resolveUnmatchedExpense(
      reconId,
      exceptionId,
      CardExceptionResolution.DISPUTED,
    );
  }

  async deleteException(reconId: string, exceptionId: string) {
    return this.resolveUnmatchedExpense(
      reconId,
      exceptionId,
      CardExceptionResolution.DELETED,
    );
  }

  private async resolveUnmatchedExpense(
    reconId: string,
    exceptionId: string,
    resolution: CardExceptionResolution,
  ) {
    const ex = await this.getOpenException(reconId, exceptionId);
    if (ex.kind !== CardExceptionKind.UNMATCHED_EXPENSE) {
      throw new BadRequestException({
        code: 'INVALID_KIND',
        message: 'Only unmatched expenses support this action',
      });
    }
    await this.prisma.cardReconException.update({
      where: { id: ex.id },
      data: { resolved: true, resolution },
    });
    if (ex.expenseId && resolution === CardExceptionResolution.DELETED) {
      await this.prisma.expense.update({
        where: { id: ex.expenseId },
        data: { archivedAt: new Date() },
      });
    }
    return { data: this.serialize(await this.load(reconId)) };
  }

  async finish(id: string, dto: FinishReconciliationDto) {
    const recon = await this.load(id);
    if (recon.status === CardReconStatus.FINISHED) {
      return { data: this.serialize(recon) };
    }
    const unresolvedCharges = recon.exceptions.filter(
      (e) => !e.resolved && e.kind === CardExceptionKind.UNMATCHED_CHARGE,
    );
    if (unresolvedCharges.length > 0 && !dto.force) {
      throw new BadRequestException({
        code: 'UNRESOLVED_EXCEPTIONS',
        message: 'Unresolved unmatched charges remain',
        unresolvedCount: unresolvedCharges.length,
      });
    }

    const deductionAmount = unresolvedCharges.reduce(
      (sum, e) => sum + money(e.amount),
      0,
    );
    const cardholderId = recon.cardholderId;

    await this.prisma.$transaction(async (tx) => {
      await tx.cardReconciliation.update({
        where: { id },
        data: {
          status: CardReconStatus.FINISHED,
          finishedAt: new Date(),
          forceFinished: Boolean(dto.force && unresolvedCharges.length > 0),
        },
      });
      if (dto.force && cardholderId && deductionAmount > 0) {
        await tx.bonusDeduction.create({
          data: {
            userId: cardholderId,
            amount: new Prisma.Decimal(deductionAmount),
            quarterLabel: quarterLabel(),
            reason: `Unresolved card charges on ${recon.code} (${recon.cardLabel})`,
            reconciliationId: id,
          },
        });
      }
    });

    return { data: this.serialize(await this.load(id)) };
  }
}
