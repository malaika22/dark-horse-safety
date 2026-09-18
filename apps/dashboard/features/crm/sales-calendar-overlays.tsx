"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn, useScrollLock } from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";
import { toastApiError } from "@/lib/toast";

const fieldClass =
  "h-10 w-full appearance-none rounded-lg border-0 bg-[#2A2A2A] px-3 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#5A5A5A]";

function CloseX({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Close"
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#959597] transition-colors hover:bg-white/5 hover:text-[#FDFDFF]"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6 6l12 12M18 6L6 18"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

function useModalLock(open: boolean, onClose: () => void) {
  useScrollLock(open);
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
}

function GhostBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="px-2 py-2 font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#959597] transition-colors hover:text-[#FDFDFF] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function SecondaryPill({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg bg-[#2A2A2A] px-4 py-2.5 font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] transition-colors hover:bg-[#353535] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function PrimaryPill({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg bg-[#FDFDFF] px-4 py-2.5 font-sans text-[12px] font-[590] uppercase tracking-[-0.02em] text-[#0D0D0D] transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function WarnTriangleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 2 20h20L12 3Z"
        stroke="#E8C47C"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M12 10v4M12 17.5v.5"
        stroke="#E8C47C"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ErrorXIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="#EF4444" strokeWidth="1.75" />
      <path
        d="M9 9l6 6M15 9l-6 6"
        stroke="#EF4444"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export type NewActivityPrefill = {
  dayKey: string;
  hour: number;
  repId: string;
  repName: string;
  slotLabel: string;
};

export type NewActivityPayload = {
  type: string;
  customerId: string;
  contactId?: string;
  locationId?: string;
  subject?: string;
  repId: string;
  date: string;
  time: string;
  duration: string;
  recurring?: string;
  notes: string;
  file?: File | null;
  force?: boolean;
};

export function NewActivityModal({
  open,
  prefill,
  customers,
  reps,
  busy,
  onClose,
  onCreate,
}: {
  open: boolean;
  prefill: NewActivityPrefill | null;
  customers: { value: string; label: string }[];
  reps: { value: string; label: string }[];
  busy?: boolean;
  onClose: () => void;
  onCreate: (payload: NewActivityPayload) => void | Promise<void>;
}) {
  useModalLock(open, onClose);
  const [type, setType] = React.useState("");
  const [customerId, setCustomerId] = React.useState("");
  const [contactId, setContactId] = React.useState("");
  const [locationId, setLocationId] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [repId, setRepId] = React.useState("");
  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("");
  const [duration, setDuration] = React.useState("");
  const [recurring, setRecurring] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [contactOptions, setContactOptions] = React.useState<
    { value: string; label: string }[]
  >([]);
  const [locationOptions, setLocationOptions] = React.useState<
    { value: string; label: string }[]
  >([]);
  const [lookupsLoading, setLookupsLoading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open || !prefill) return;
    setType("");
    setCustomerId("");
    setContactId("");
    setLocationId("");
    setSubject("");
    setRepId("");
    setDate("");
    setTime("");
    setDuration("");
    setRecurring("");
    setNotes("");
    setFile(null);
    setContactOptions([]);
    setLocationOptions([]);
  }, [open, prefill]);

  React.useEffect(() => {
    if (!open || !customerId) {
      setContactOptions([]);
      setLocationOptions([]);
      return;
    }
    let cancelled = false;
    setLookupsLoading(true);
    (async () => {
      try {
        const [customer, locs] = await Promise.all([
          crmApi.getCustomer(customerId),
          crmApi.lookupLocations(undefined, customerId),
        ]);
        if (cancelled) return;
        setContactOptions(
          (customer.data.contacts ?? []).map((c) => ({
            value: c.id,
            label: (c.fullName ?? "").toUpperCase(),
          })),
        );
        setLocationOptions(
          (locs.data ?? []).map((l) => ({
            value: l.id,
            label: (l.name ?? "").toUpperCase(),
          })),
        );
      } catch (err) {
        toastApiError(err);
        if (!cancelled) {
          setContactOptions([]);
          setLocationOptions([]);
        }
      } finally {
        if (!cancelled) setLookupsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, customerId]);

  if (!open || !prefill || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[96]">
      <button
        type="button"
        aria-label="Close backdrop"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New activity"
        className="absolute left-1/2 top-1/2 max-h-[92vh] w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-2xl border border-[#2D2D30] bg-[#121212] p-5 shadow-2xl scrollbar-hidden sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-sans text-[16px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              New Activity
            </h2>
            <p className="mt-1.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
              {prefill.slotLabel}
            </p>
          </div>
          <CloseX onClick={onClose} />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="font-sans text-[11px] uppercase text-[#959597]">
              Activity Type
            </span>
            <select
              className={fieldClass}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">Select…</option>
              {["VISIT", "CALL", "MEETING", "EMAIL"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="font-sans text-[11px] uppercase text-[#959597]">
              Customer
            </span>
            <select
              className={fieldClass}
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setContactId("");
                setLocationId("");
              }}
            >
              <option value="">Select…</option>
              {customers.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="font-sans text-[11px] uppercase text-[#959597]">
              Contact
            </span>
            <select
              className={fieldClass}
              value={contactId}
              disabled={!customerId || lookupsLoading}
              onChange={(e) => setContactId(e.target.value)}
            >
              <option value="">Select Contact</option>
              {contactOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="font-sans text-[11px] uppercase text-[#959597]">
              Location
            </span>
            <select
              className={fieldClass}
              value={locationId}
              disabled={!customerId || lookupsLoading}
              onChange={(e) => setLocationId(e.target.value)}
            >
              <option value="">Select Location</option>
              {locationOptions.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 block space-y-1.5">
          <span className="font-sans text-[11px] uppercase text-[#959597]">
            Subject
          </span>
          <input
            className={fieldClass}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Add a subject"
          />
        </label>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="font-sans text-[11px] uppercase text-[#959597]">
              Date
            </span>
            <input
              type="date"
              className={fieldClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="space-y-1.5">
            <span className="font-sans text-[11px] uppercase text-[#959597]">
              Time
            </span>
            <input
              type="time"
              className={fieldClass}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
          <label className="space-y-1.5">
            <span className="font-sans text-[11px] uppercase text-[#959597]">
              Rep
            </span>
            <select
              className={fieldClass}
              value={repId}
              onChange={(e) => setRepId(e.target.value)}
            >
              <option value="">Select…</option>
              {reps.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="font-sans text-[11px] uppercase text-[#959597]">
              Duration
            </span>
            <select
              className={fieldClass}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              <option value="">Select…</option>
              {["15M", "30M", "1H", "2H"].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 block space-y-1.5">
          <span className="font-sans text-[11px] uppercase text-[#959597]">
            Recurring
          </span>
          <select
            className={fieldClass}
            value={recurring}
            onChange={(e) => setRecurring(e.target.value)}
          >
            {[
              "",
              "DOES NOT REPEAT",
              "DAILY",
              "WEEKLY",
              "MONTHLY",
            ].map((r) => (
              <option key={r || "empty"} value={r}>
                {r || "Select recurring"}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block space-y-1.5">
          <span className="font-sans text-[11px] uppercase text-[#959597]">
            Notes
          </span>
          <textarea
            className={cn(fieldClass, "h-20 resize-none py-2.5")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes..."
          />
        </label>

        <div className="mt-4 space-y-1.5">
          <span className="font-sans text-[11px] uppercase text-[#959597]">
            Upload Image or File
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".png,.jpg,.jpeg,.pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#3E3E3E] bg-[#1A1A1A] px-4 py-8 text-center transition-colors hover:border-[#5A5A5A]"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 16V5M8 9l4-4 4 4M5 19h14"
                stroke="#FDFDFF"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              {file ? file.name : "Drop a file or click to upload"}
            </span>
            <span className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
              Png · Jpg · Pdf · Max 10mb
            </span>
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <GhostBtn onClick={onClose} disabled={busy}>
            Cancel
          </GhostBtn>
          <PrimaryPill
            disabled={busy || !customerId || !repId || !type || !date || !time}
            onClick={() =>
              void onCreate({
                type,
                customerId,
                contactId: contactId || undefined,
                locationId: locationId || undefined,
                subject: subject || undefined,
                repId,
                date,
                time,
                duration,
                recurring,
                notes,
                file,
              })
            }
          >
            Create
          </PrimaryPill>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export type EventPopoverData = {
  id: string;
  customer: string;
  subtitle: string;
  when: string;
  rep: string;
  status: string;
  href: string;
  kindLabel: string;
  fromLabel: string;
  openLabel?: string;
};

export function EventDetailPopover({
  open,
  data,
  onClose,
  onReschedule,
  onOpen,
}: {
  open: boolean;
  data: EventPopoverData | null;
  onClose: () => void;
  onReschedule: () => void;
  onOpen: () => void;
}) {
  useModalLock(open, onClose);
  if (!open || !data || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[96]">
      <button
        type="button"
        aria-label="Close backdrop"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="absolute left-1/2 top-1/2 w-[min(92vw,400px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#2D2D30] bg-[#121212] p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-sans text-[15px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
              {data.customer}
            </h2>
            <p className="mt-1.5 font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
              {data.subtitle}
            </p>
          </div>
          <CloseX onClick={onClose} />
        </div>

        <dl className="mt-5 space-y-3">
          {(
            [
              ["When", data.when],
              ["Rep", data.rep],
              ["Status", data.status],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="grid grid-cols-[72px_1fr] gap-3">
              <dt className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
                {label}
              </dt>
              <dd className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex items-center justify-end gap-2">
          <GhostBtn onClick={onReschedule}>Reschedule</GhostBtn>
          <PrimaryPill onClick={onOpen}>
            {data.openLabel ?? "Open Activity"}
          </PrimaryPill>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function RescheduleConfirmModal({
  open,
  description,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  description: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  useModalLock(open, onClose);
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[97]">
      <button
        type="button"
        aria-label="Close backdrop"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Reschedule activity"
        className="absolute left-1/2 top-1/2 w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#2D2D30] bg-[#121212] p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-sans text-[15px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            Reschedule Activity?
          </h2>
          <CloseX onClick={onClose} />
        </div>
        <p className="mt-4 font-sans text-[12px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
          {description}
        </p>
        <div className="mt-6 flex items-center justify-end gap-2">
          <GhostBtn onClick={onClose} disabled={busy}>
            Cancel
          </GhostBtn>
          <PrimaryPill disabled={busy} onClick={() => void onConfirm()}>
            Confirm Reschedule
          </PrimaryPill>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function SchedulingConflictModal({
  open,
  message,
  busy,
  primaryLabel = "Reschedule Anyway",
  onClose,
  onPickAnotherTime,
  onForce,
}: {
  open: boolean;
  message: string;
  busy?: boolean;
  primaryLabel?: string;
  onClose: () => void;
  onPickAnotherTime: () => void;
  onForce: () => void | Promise<void>;
}) {
  useModalLock(open, onClose);
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[98]">
      <button
        type="button"
        aria-label="Close backdrop"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Scheduling conflict"
        className="absolute left-1/2 top-1/2 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#2D2D30] bg-[#121212] p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-sans text-[15px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            Scheduling Conflict
          </h2>
          <CloseX onClick={onClose} />
        </div>
        <div className="mt-4 flex items-start gap-3">
          <span className="mt-0.5 shrink-0">
            <WarnTriangleIcon />
          </span>
          <p className="font-sans text-[12px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
            {message}
          </p>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <SecondaryPill onClick={onClose} disabled={busy}>
            Cancel
          </SecondaryPill>
          <SecondaryPill onClick={onPickAnotherTime} disabled={busy}>
            Pick Another Time
          </SecondaryPill>
          <PrimaryPill disabled={busy} onClick={() => void onForce()}>
            {primaryLabel}
          </PrimaryPill>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function RescheduleFailedModal({
  open,
  message,
  busy,
  onClose,
  onRetry,
}: {
  open: boolean;
  message: string;
  busy?: boolean;
  onClose: () => void;
  onRetry: () => void | Promise<void>;
}) {
  useModalLock(open, onClose);
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[98]">
      <button
        type="button"
        aria-label="Close backdrop"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Reschedule failed"
        className="absolute left-1/2 top-1/2 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#2D2D30] bg-[#121212] p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-sans text-[15px] font-[590] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            Reschedule Failed
          </h2>
          <CloseX onClick={onClose} />
        </div>
        <div className="mt-4 flex items-start gap-3">
          <span className="mt-0.5 shrink-0">
            <ErrorXIcon />
          </span>
          <p className="font-sans text-[12px] uppercase leading-relaxed tracking-[-0.02em] text-[#959597]">
            {message}
          </p>
        </div>
        <div className="mt-6 flex items-center justify-end gap-2">
          <SecondaryPill onClick={onClose} disabled={busy}>
            Cancel
          </SecondaryPill>
          <PrimaryPill disabled={busy} onClick={() => void onRetry()}>
            Retry
          </PrimaryPill>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Banner shown while picking a new calendar slot after Reschedule. */
export function RescheduleHintBar({
  active,
  onCancel,
}: {
  active: boolean;
  onCancel: () => void;
}) {
  if (!active) return null;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#2D2D30] bg-[#1A1A1A] px-4 py-3",
      )}
    >
      <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
        Select an empty slot to move this activity
      </p>
      <GhostBtn onClick={onCancel}>Cancel</GhostBtn>
    </div>
  );
}
