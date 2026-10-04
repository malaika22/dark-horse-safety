import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SaveInvoiceDto, SendInvoiceDto } from './dto/invoice.dto';

function money(n: Prisma.Decimal | number | null | undefined) {
  const v = n == null ? 0 : Number(n);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
}

function hours(n: Prisma.Decimal | number | null | undefined) {
  const v = n == null ? 0 : Number(n);
  return Number.isFinite(v) ? Math.round(v * 10) / 10 : 0;
}

function invoiceCodeFromTicket(code: string) {
  const digits = code.replace(/\D/g, '');
  return `INV-${digits || '00000'}`;
}

function formatSentAt(d: Date) {
  return (
    d
      .toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Chicago',
      })
      .replace(',', '')
      .toUpperCase()
      .replace(/(\d{1,2}:\d{2})\s*(AM|PM)/, '$1 $2') + ' CT'
  );
}

/** Strip chars that break embedded Postgres WIN1252 client encoding. */
function asciiSafe(s: string) {
  return s
    .replace(/\uFFFD/g, '')
    .replace(/[·•]/g, ' - ')
    .replace(/[—–−]/g, '-')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
}

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  private async findTicket(idOrCode: string) {
    const row = await this.prisma.salesTicket.findFirst({
      where: {
        archivedAt: null,
        OR: [
          { id: idOrCode },
          { code: idOrCode },
          { code: idOrCode.replace(/\s+/g, '-') },
        ],
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            assignedRep: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
        workOrder: { select: { id: true, code: true } },
        employee: {
          select: { firstName: true, lastName: true },
        },
      },
    });
    if (!row) throw new NotFoundException('Invoice source ticket not found');
    return row;
  }

  private packet(row: { detailPacket: Prisma.JsonValue | null }) {
    return row.detailPacket && typeof row.detailPacket === 'object'
      ? ({ ...(row.detailPacket as Record<string, unknown>) } as Record<
          string,
          any
        >)
      : ({} as Record<string, any>);
  }

  async preview(idOrCode: string) {
    const row = await this.findTicket(idOrCode);
    const packet = this.packet(row);
    const invoiceCode = invoiceCodeFromTicket(row.code);
    const amount = money(row.amount ?? row.submittedValue);
    const rate = money(row.submittedRate) || 160;
    const billed = hours(row.billedHours ?? row.submittedHours);
    const worked = hours(row.workedHours ?? row.submittedHours);
    const delta = hours(row.deltaHours);
    const invoiceSend = packet.invoiceSend ?? null;

    const lineItems = Array.isArray(packet.lineItems)
      ? packet.lineItems
      : [
          {
            item: 'SITE SAFETY TECHNICIAN (PER HOUR)',
            qty: billed,
            qtyDelta: delta,
            rate,
            amount: Math.round(billed * rate * 100) / 100,
            woLink: packet.listWoCode ?? row.workOrder?.code,
            note: 'SERVICE CODES FROM BILLABLE LINE COMPARISON',
          },
          {
            item: 'MILEAGE - ROUND TRIP',
            qty: 240,
            qtyDelta: 0,
            rateLabel: 'CONOCOPHILLIPS',
            rate: 0,
            amount: 444,
            woLink: packet.listWoCode ?? row.workOrder?.code,
          },
          {
            item: 'EQUIPMENT - MONITOR M-04',
            qty: 1,
            qtyDelta: 0,
            rate: 220,
            amount: 220,
            woLink: packet.listWoCode ?? row.workOrder?.code,
          },
        ];

    const lineTotal = lineItems.reduce(
      (s: number, l: any) => s + money(l.amount),
      0,
    );
    const total = amount || lineTotal || 10904;

    const rep = row.customer.assignedRep;
    const repName = rep
      ? `${rep.firstName?.[0] ?? 'R'}. ${(rep.lastName ?? 'CRAWFORD').toUpperCase()}`
      : 'R. CRAWFORD';
    const repEmail =
      rep?.email?.toUpperCase() ?? 'RCRAWFORD@DARKHORSESAFETY.COM';

    const contactName =
      packet.company?.primaryContact ??
      packet.summary?.customer ??
      'J. WHITFIELD';
    const contactEmail =
      (packet.company?.email as string | undefined)?.toUpperCase() ??
      'JWHITFIELD@PERMIANBASIN.COM';

    const status =
      invoiceSend?.status === 'SENT'
        ? 'SENT'
        : invoiceSend?.status === 'FAILED'
          ? 'FAILED'
          : row.netsuiteStatus === 'SENT_INVOICE'
            ? 'SENT'
            : 'READY_TO_INVOICE';

    const stepperCurrent =
      status === 'SENT' ? 'SENT' : status === 'FAILED' ? 'DRAFT' : 'DRAFT';

    return {
      data: {
        ticketId: row.id,
        ticketCode: row.code,
        invoiceCode,
        status,
        statusLabel:
          status === 'READY_TO_INVOICE'
            ? 'READY TO INVOICE'
            : status === 'SENT'
              ? 'SENT'
              : 'DELIVERY FAILED',
        badgeTone:
          status === 'READY_TO_INVOICE'
            ? 'warning'
            : status === 'SENT'
              ? 'success'
              : 'error',
        stepper: ['DRAFT', 'SENT', 'VIEWED', 'PAID', 'OVERDUE'],
        stepperCurrent,
        stepperMeta:
          status === 'SENT'
            ? `SENT ${invoiceSend?.sentAtLabel ?? ''}`.trim()
            : 'CREATED JUN 15, 2026 · 11:00 CT · AWAITING SEND',
        jobRef: {
          ticketCode: row.code,
          customer: row.customer.name.toUpperCase(),
          location: (row.locationLabel ?? packet.summary?.location ?? 'SITE')
            .toString()
            .toUpperCase(),
          dateRange: row.jobDateLabel ?? packet.summary?.date ?? 'JUN 12-14',
        },
        terms: packet.summary?.paymentTerms ?? 'NET 30',
        subtotal: total,
        taxPct: 0,
        tax: 0,
        total,
        totalLabel: `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        lineItems,
        techTime: Array.isArray(packet.techTime) ? packet.techTime : [],
        quoteCompare: {
          quoted: 24500,
          invoiced: total,
          variance: Math.round((total - 24500) * 100) / 100,
          variancePct: Math.round(((total - 24500) / 24500) * 100),
          reason: 'SCOPE REDUCED',
        },
        netsuite: {
          statusLabel:
            packet.netsuiteCorrection?.valueLabel != null
              ? `NEEDED ${packet.netsuiteCorrection.valueLabel}`
              : row.billingFlag
                ? `${row.billingFlag} ${delta}H`
                : 'NEEDED',
          invoiceNotes:
            packet.invoiceNotes ??
            packet.netsuiteCorrection?.reason ??
            `Worked ${worked}H vs billed ${billed}H (delta ${delta}H).`,
          netsuiteRef:
            packet.netsuiteRef ??
            packet.netsuiteCorrection?.reference ??
            'NS-CORR-',
        },
        compose: {
          recipient: `${contactName} - ${contactEmail}`,
          recipientEmail: contactEmail,
          cc: `${repName} (ASSIGNED REP) - ${repEmail}`,
          ccEmail: repEmail,
          subject: `INVOICE ${invoiceCode} FROM DARK HORSE SAFETY - ${`$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}`,
          message: `HI JORDAN, PLEASE FIND ATTACHED INVOICE ${invoiceCode} FOR $${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, DUE JUL 15, 2026 (NET 30). THIS COVERS SITE SAFETY SERVICES AT ${(packet.summary?.location ?? 'SPRABERRY 31-4H').toString().toUpperCase()}, JUN 12-14, 2026.`,
          signature: `- ${repName} - DARK HORSE SAFETY - (432) 555-0100`,
          attachmentName: `INVOICE ${invoiceCode}.PDF`,
          attachmentSize: '240 KB',
          scheduleDefault: 'JUL 15, 2026 - 9:00 AM',
        },
        lastSend: invoiceSend,
        workOrderId: row.workOrderId,
        workOrderCode: row.workOrder?.code ?? null,
      },
    };
  }

  async save(idOrCode: string, dto: SaveInvoiceDto) {
    const row = await this.findTicket(idOrCode);
    const packet = this.packet(row);
    if (dto.invoiceNotes != null) packet.invoiceNotes = dto.invoiceNotes;
    if (dto.netsuiteRef != null) packet.netsuiteRef = dto.netsuiteRef;
    if (packet.netsuiteCorrection) {
      packet.netsuiteCorrection = {
        ...packet.netsuiteCorrection,
        ...(dto.invoiceNotes != null ? { reason: dto.invoiceNotes } : {}),
        ...(dto.netsuiteRef != null ? { reference: dto.netsuiteRef } : {}),
      };
    }

    await this.prisma.salesTicket.update({
      where: { id: row.id },
      data: { detailPacket: packet as Prisma.InputJsonValue },
    });

    return this.preview(row.id);
  }

  async send(idOrCode: string, dto: SendInvoiceDto) {
    const row = await this.findTicket(idOrCode);
    const packet = this.packet(row);
    const invoiceCode = invoiceCodeFromTicket(row.code);
    const now = new Date();
    const recipientEmail =
      dto.recipient.split(/[·•|]/).pop()?.trim().toUpperCase() ??
      dto.recipient.split(/\s-\s/).pop()?.trim().toUpperCase() ??
      dto.recipient.toUpperCase();

    const forceFail =
      dto.forceFail === true ||
      /bounce|fail|full/i.test(dto.recipient) ||
      /bounce|fail/i.test(recipientEmail);

    if (!dto.recipient?.trim() || !dto.subject?.trim()) {
      throw new BadRequestException('Recipient and subject are required');
    }

    if (forceFail) {
      const failed = {
        status: 'FAILED',
        recipient: asciiSafe(dto.recipient.trim().toUpperCase()),
        recipientEmail: asciiSafe(recipientEmail),
        cc: asciiSafe((dto.cc ?? '').trim().toUpperCase()) || null,
        subject: asciiSafe(dto.subject.trim().toUpperCase()),
        message: asciiSafe((dto.message ?? '').trim().toUpperCase()) || null,
        attachmentName: `INVOICE ${invoiceCode}.PDF`,
        attachmentSize: '240 KB',
        triedAt: now.toISOString(),
        triedAtLabel: formatSentAt(now),
        reason: 'MAILBOX FULL. THE INVOICE WAS NOT RECEIVED.',
        invoiceCode,
        amountLabel: `$${money(row.amount ?? row.submittedValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      };
      packet.invoiceSend = failed;
      await this.prisma.salesTicket.update({
        where: { id: row.id },
        data: { detailPacket: packet as Prisma.InputJsonValue },
      });
      return {
        data: {
          ok: false,
          ...failed,
        },
      };
    }

    const sent = {
      status: 'SENT',
      recipient: asciiSafe(dto.recipient.trim().toUpperCase()),
      recipientEmail: asciiSafe(recipientEmail),
      cc: asciiSafe((dto.cc ?? '').trim().toUpperCase()) || null,
      subject: asciiSafe(dto.subject.trim().toUpperCase()),
      message: asciiSafe((dto.message ?? '').trim().toUpperCase()) || null,
      attachmentName: `INVOICE ${invoiceCode}.PDF`,
      attachmentSize: '240 KB',
      sentAt: now.toISOString(),
      sentAtLabel: formatSentAt(now),
      scheduleMode: dto.scheduleMode ?? 'NOW',
      scheduledAt: dto.scheduledAt ? asciiSafe(dto.scheduledAt) : null,
      invoiceCode,
      amountLabel: `$${money(row.amount ?? row.submittedValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    };
    packet.invoiceSend = sent;

    await this.prisma.salesTicket.update({
      where: { id: row.id },
      data: {
        detailPacket: packet as Prisma.InputJsonValue,
        netsuiteStatus: 'SENT_INVOICE',
        workflowStep: 'SENT_TO_NETSUITE',
      },
    });

    return {
      data: {
        ok: true,
        ...sent,
      },
    };
  }
}
