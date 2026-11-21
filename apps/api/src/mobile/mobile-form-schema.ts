/**
 * Dynamic form definitions for the mobile app.
 *
 * The admin form builder stores SafetyForm.definition as
 *   [{ id, title, required, fields: [{ id, type, label, placeholder?, required?, options? }] }]
 * This file turns that into one stable, documented shape (schemaVersion 1) and validates
 * submitted values against it, reporting errors per field key.
 */

export const MOBILE_FIELD_TYPES = [
  'TEXT', 'NUMBER', 'STATIC_TEXT', 'CALCULATOR', 'RATING',
  'DROPDOWN', 'SINGLE_CHOICE', 'MULTIPLE_CHOICES',
  'PHOTO', 'SIGNATURE', 'DRAWING', 'STATIC_IMAGE',
  'DATE', 'TIME', 'GPS',
  'CHECKBOX', 'LINK', 'MIRROR', 'BARCODE',
] as const;
export type MobileFieldType = (typeof MOBILE_FIELD_TYPES)[number];

/** Types that display something but collect no answer. */
const DISPLAY_ONLY = new Set<string>(['STATIC_TEXT', 'STATIC_IMAGE', 'LINK', 'MIRROR', 'CALCULATOR']);
/** Types whose answer is a file (URL string, or an inline { fileName, contentBase64 }). */
export const FILE_TYPES = new Set<string>(['PHOTO', 'SIGNATURE', 'DRAWING']);
const CHOICE_TYPES = new Set<string>(['DROPDOWN', 'SINGLE_CHOICE', 'MULTIPLE_CHOICES']);

type RawField = {
  id?: string; type?: string; label?: string; placeholder?: string; required?: boolean;
  options?: string[]; value?: unknown;
  validation?: Record<string, unknown>; visibleWhen?: { field: string; equals: unknown };
};
type RawSection = { id?: string; title?: string; required?: boolean; fields?: RawField[] };

export type MobileField = {
  key: string; label: string; type: string; required: boolean; order: number;
  placeholder: string | null; options: string[]; displayOnly: boolean; collectsFile: boolean;
  defaultValue: unknown; validation: Record<string, unknown>;
  visibleWhen: { field: string; equals: unknown } | null;
};
export type MobileSection = { key: string; title: string; required: boolean; order: number; fields: MobileField[] };
export type MobileDefinition = { schemaVersion: 1; sections: MobileSection[] };

export function normalizeDefinition(raw: unknown): MobileDefinition {
  const sections = Array.isArray(raw) ? (raw as RawSection[]) : [];
  let fieldOrder = 0;
  return {
    schemaVersion: 1,
    sections: sections.map((s, si) => ({
      key: String(s.id ?? `section-${si + 1}`),
      title: s.title ?? '',
      required: s.required !== false,
      order: si + 1,
      fields: (s.fields ?? []).map((f) => {
        const upper = String(f.type ?? 'TEXT').toUpperCase();
        const type = upper === 'BOOLEAN' ? 'CHECKBOX' : upper === 'SELECT' ? 'DROPDOWN' : upper;
        fieldOrder += 1;
        return {
          key: String(f.id),
          label: f.label ?? '',
          type,
          required: !!f.required && !DISPLAY_ONLY.has(type),
          order: fieldOrder,
          placeholder: f.placeholder ?? null,
          options: Array.isArray(f.options) ? f.options : [],
          displayOnly: DISPLAY_ONLY.has(type),
          collectsFile: FILE_TYPES.has(type),
          defaultValue: f.value ?? null,
          validation: f.validation ?? {},
          visibleWhen: f.visibleWhen ?? null,
        };
      }),
    })),
  };
}

const empty = (v: unknown) =>
  v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

const isFileValue = (v: unknown) =>
  typeof v === 'string' ||
  (typeof v === 'object' && v !== null && typeof (v as { contentBase64?: unknown }).contentBase64 === 'string');

/** Returns { fieldKey: [messages] }. Empty object means valid. Drafts skip required checks. */
export function validateValues(def: MobileDefinition, values: Record<string, unknown>, opts: { draft: boolean }) {
  const errors: Record<string, string[]> = {};
  const add = (k: string, m: string) => { (errors[k] ??= []).push(m); };
  const fields = def.sections.flatMap((s) => s.fields);
  const byKey = new Map(fields.map((f) => [f.key, f]));

  for (const k of Object.keys(values)) {
    if (!byKey.has(k)) add(k, 'Unknown field for this form version.');
  }

  for (const f of fields) {
    if (f.displayOnly) continue;
    if (f.visibleWhen && values[f.visibleWhen.field] !== f.visibleWhen.equals) continue; // hidden
    const v = values[f.key];
    if (empty(v)) {
      if (f.required && !opts.draft) add(f.key, `${f.label || f.key} is required.`);
      continue;
    }
    switch (f.type) {
      case 'NUMBER':
      case 'RATING': {
        const n = typeof v === 'number' ? v : Number(v);
        if (!Number.isFinite(n)) { add(f.key, 'Enter a number.'); break; }
        const min = f.validation.min as number | undefined;
        const max = f.validation.max as number | undefined;
        if (min !== undefined && n < min) add(f.key, `Must be at least ${min}.`);
        if (max !== undefined && n > max) add(f.key, `Must be at most ${max}.`);
        break;
      }
      case 'DATE':
        if (typeof v !== 'string' || Number.isNaN(Date.parse(v))) add(f.key, 'Enter a valid date (YYYY-MM-DD).');
        break;
      case 'TIME':
        if (typeof v !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) add(f.key, 'Enter a valid time (HH:mm).');
        break;
      case 'CHECKBOX':
        if (typeof v !== 'boolean') add(f.key, 'Must be true or false.');
        break;
      case 'GPS': {
        const g = v as { lat?: unknown; lng?: unknown };
        if (typeof g !== 'object' || typeof g?.lat !== 'number' || typeof g?.lng !== 'number') add(f.key, 'Provide { lat, lng }.');
        break;
      }
      case 'DROPDOWN':
      case 'SINGLE_CHOICE':
        if (typeof v !== 'string' || (f.options.length && !f.options.includes(v))) add(f.key, 'Choose one of the listed options.');
        break;
      case 'MULTIPLE_CHOICES':
        if (!Array.isArray(v) || v.some((x) => typeof x !== 'string' || (f.options.length && !f.options.includes(x)))) add(f.key, 'Choose from the listed options.');
        break;
      default:
        if (FILE_TYPES.has(f.type)) {
          if (!isFileValue(v)) add(f.key, 'Attach a file.');
        } else if (typeof v !== 'string') {
          add(f.key, 'Enter text.');
        } else {
          const minL = f.validation.minLength as number | undefined;
          const maxL = f.validation.maxLength as number | undefined;
          const pat = f.validation.pattern as string | undefined;
          if (minL !== undefined && v.length < minL) add(f.key, `Use at least ${minL} characters.`);
          if (maxL !== undefined && v.length > maxL) add(f.key, `Use at most ${maxL} characters.`);
          if (pat) { try { if (!new RegExp(pat).test(v)) add(f.key, 'Does not match the required format.'); } catch { /* bad pattern ignored */ } }
        }
    }
  }
  return errors;
}

export function fileFieldKeys(def: MobileDefinition) {
  return def.sections.flatMap((s) => s.fields).filter((f) => f.collectsFile).map((f) => f.key);
}
