import { Injectable } from '@nestjs/common';

export type CsvColumn<T> = {
  key: string;
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
};

/** Generalized CSV export used by all CRM list screens. */
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

  parseIds(ids?: string | string[]): string[] | undefined {
    if (!ids) return undefined;
    if (Array.isArray(ids)) return ids.filter(Boolean);
    return ids
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}
