import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export type CsvColumn<T> = {
  key: string;
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
};

export type ExportFormat = 'csv' | 'pdf' | 'xlsx';

/** Generalized CSV / PDF / Excel export used by CRM list screens. */
@Injectable()
export class ExportService {
  toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v);
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const header = columns.map((c) => escape(c.header)).join(',');
    const body = rows
      .map((row) => columns.map((c) => escape(c.value(row))).join(','))
      .join('\n');
    return `${header}\n${body}`;
  }

  async toPdfBase64<T>(
    title: string,
    rows: T[],
    columns: CsvColumn<T>[],
  ): Promise<string> {
    const landscape = columns.length > 6;
    const doc = new PDFDocument({
      margin: 28,
      size: 'LETTER',
      layout: landscape ? 'landscape' : 'portrait',
      info: { Title: title, Author: 'Dark Horse Force' },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    doc.fillColor('#E31C23').fontSize(9).text('DARK HORSE FORCE');
    doc.fillColor('#111111').fontSize(14).text(title);
    doc
      .fillColor('#666666')
      .fontSize(8)
      .text(
        `Generated ${new Date().toISOString().slice(0, 19)} UTC · ${rows.length} rows · ${columns.length} columns`,
      );
    doc.moveDown(0.6);

    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colW = pageWidth / Math.max(columns.length, 1);
    const left = doc.page.margins.left;
    const fontSize = columns.length > 10 ? 6 : columns.length > 7 ? 7 : 8;
    const rowH = fontSize + 8;

    const ensureSpace = (needed: number) => {
      if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
      }
    };

    const paintHeader = () => {
      ensureSpace(rowH + 8);
      const y = doc.y;
      doc.font('Helvetica-Bold').fontSize(fontSize).fillColor('#111111');
      columns.forEach((col, i) => {
        doc.text(col.header, left + i * colW, y, {
          width: colW - 3,
          lineBreak: false,
          ellipsis: true,
        });
      });
      doc.y = y + rowH;
      doc
        .strokeColor('#CCCCCC')
        .moveTo(left, doc.y)
        .lineTo(left + pageWidth, doc.y)
        .stroke();
      doc.moveDown(0.25);
      doc.font('Helvetica');
    };

    paintHeader();

    for (const row of rows) {
      ensureSpace(rowH + 2);
      const y = doc.y;
      doc.fontSize(fontSize).fillColor('#222222');
      columns.forEach((col, i) => {
        const raw = col.value(row);
        doc.text(raw == null ? '' : String(raw), left + i * colW, y, {
          width: colW - 3,
          lineBreak: false,
          ellipsis: true,
          height: rowH - 2,
        });
      });
      doc.y = y + rowH;
    }

    doc.end();
    const buffer = await done;
    return buffer.toString('base64');
  }

  async toXlsxBase64<T>(
    title: string,
    rows: T[],
    columns: CsvColumn<T>[],
  ): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Dark Horse Force';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet(title.slice(0, 31) || 'Export', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: Math.min(Math.max(col.header.length + 4, 12), 36),
    }));

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE31C23' },
    };
    headerRow.alignment = { vertical: 'middle' };

    for (const row of rows) {
      const values: Record<string, string | number | boolean> = {};
      for (const col of columns) {
        const v = col.value(row);
        values[col.key] = v == null ? '' : (v as string | number | boolean);
      }
      sheet.addRow(values);
    }

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return buffer.toString('base64');
  }

  /** Build export payload for csv | pdf | xlsx with the same column set. */
  async buildExport<T>(
    title: string,
    filenameBase: string,
    rows: T[],
    columns: CsvColumn<T>[],
    format: ExportFormat = 'csv',
  ) {
    if (format === 'pdf') {
      const pdf = await this.toPdfBase64(title, rows, columns);
      return { data: { pdf, filename: `${filenameBase}.pdf` } };
    }
    if (format === 'xlsx') {
      const xlsx = await this.toXlsxBase64(title, rows, columns);
      return { data: { xlsx, filename: `${filenameBase}.xlsx` } };
    }
    const csv = this.toCsv(rows, columns);
    return { data: { csv, filename: `${filenameBase}.csv` } };
  }

  parseIds(ids?: string | string[]): string[] | undefined {
    if (!ids) return undefined;
    if (Array.isArray(ids)) return ids.filter(Boolean);
    return ids
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

export function userLabel(
  u?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null,
) {
  if (!u) return '';
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || u.email || '';
}

export function isoDate(d?: Date | null) {
  if (!d) return '';
  return d.toISOString().slice(0, 10);
}
