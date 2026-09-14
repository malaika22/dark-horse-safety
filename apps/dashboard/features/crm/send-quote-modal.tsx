"use client";

import * as React from "react";
import {
  DashboardField,
  DashboardModal,
  DashboardTextField,
  DashboardToolbarButton,
  cn,
} from "@dark-horse-safety/ui";

const inputClass =
  "h-10 w-full rounded-lg border-0 bg-[#2A2A2A] px-3 font-sans text-[12px] font-normal uppercase tracking-[-0.02em] text-[#FDFDFF] outline-none placeholder:text-[#959597] md:text-[13px]";

const textareaClass =
  "min-h-[120px] w-full resize-y rounded-lg border-0 bg-[#2A2A2A] px-3 py-2.5 font-sans text-[12px] font-normal uppercase leading-relaxed tracking-[-0.02em] text-[#FDFDFF] outline-none transition-colors placeholder:text-[#959597] md:text-[13px]";

export type SendQuotePayload = {
  recipient: string;
  cc: string;
  subject: string;
  message: string;
  schedule: "now" | "later";
  scheduledAt: string;
  attachmentNames: string[];
  files: File[];
  attachPdf: boolean;
};

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#959597]">
      {children}
      {required ? <span className="text-[#FF6B6B]"> *</span> : null}
    </span>
  );
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function SendQuoteModal({
  open,
  onClose,
  onConfirm,
  onPreview,
  defaultRecipient = "",
  defaultCc = "",
  defaultSubject = "",
  defaultMessage = "",
  defaultPdfName,
  defaultPdfSizeLabel,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm?: (payload: SendQuotePayload) => void | Promise<void>;
  onPreview?: () => void;
  defaultRecipient?: string;
  defaultCc?: string;
  defaultSubject?: string;
  defaultMessage?: string;
  defaultPdfName?: string | null;
  defaultPdfSizeLabel?: string | null;
}) {
  const [recipient, setRecipient] = React.useState(defaultRecipient);
  const [cc, setCc] = React.useState(defaultCc);
  const [subject, setSubject] = React.useState(defaultSubject);
  const [message, setMessage] = React.useState(defaultMessage);
  const [schedule, setSchedule] = React.useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [includePdf, setIncludePdf] = React.useState(Boolean(defaultPdfName));
  const [submitting, setSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setRecipient(defaultRecipient);
    setCc(defaultCc);
    setSubject(defaultSubject);
    setMessage(defaultMessage);
    setSchedule("now");
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    setScheduledAt(
      d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).toUpperCase(),
    );
    setFiles([]);
    setIncludePdf(Boolean(defaultPdfName));
    setSubmitting(false);
  }, [
    open,
    defaultRecipient,
    defaultCc,
    defaultSubject,
    defaultMessage,
    defaultPdfName,
  ]);

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Send Quote"
      widthClassName="max-w-xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#959597] hover:text-[#FDFDFF]"
          >
            Cancel
          </button>
          <DashboardToolbarButton onClick={() => onPreview?.()}>
            Preview
          </DashboardToolbarButton>
          <DashboardToolbarButton
            variant="primary"
            disabled={submitting || !recipient.trim() || !subject.trim()}
            onClick={() => {
              void (async () => {
                setSubmitting(true);
                try {
                  await onConfirm?.({
                    recipient: recipient.trim(),
                    cc: cc.trim(),
                    subject: subject.trim(),
                    message,
                    schedule,
                    scheduledAt,
                    attachmentNames: [
                      ...(includePdf && defaultPdfName ? [defaultPdfName] : []),
                      ...files.map((f) => f.name),
                    ],
                    files,
                    attachPdf: includePdf && Boolean(defaultPdfName),
                  });
                  onClose();
                } finally {
                  setSubmitting(false);
                }
              })();
            }}
          >
            Send Quote
          </DashboardToolbarButton>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block space-y-1.5">
          <FieldLabel required>Recipient</FieldLabel>
          <input
            className={inputClass}
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Name · email@company.com"
          />
        </label>
        <label className="block space-y-1.5">
          <FieldLabel>Cc</FieldLabel>
          <input
            className={inputClass}
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            placeholder="Rep · email@darkhorsesafety.com"
          />
        </label>
        <label className="block space-y-1.5">
          <FieldLabel required>Subject</FieldLabel>
          <input
            className={inputClass}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Quote …"
          />
        </label>
        <DashboardField label="Message">
          <textarea
            className={textareaClass}
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </DashboardField>

        <div className="space-y-2">
          <FieldLabel>Attachments</FieldLabel>
          {includePdf && defaultPdfName ? (
            <div className="flex items-center gap-3 rounded-lg bg-[#2A2A2A] px-3 py-2.5">
              <span className="text-[#959597]" aria-hidden>
                ▣
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                  {defaultPdfName}
                </p>
                {defaultPdfSizeLabel ? (
                  <p className="mt-0.5 font-sans text-[10px] uppercase text-[#959597]">
                    {defaultPdfSizeLabel}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Remove PDF"
                onClick={() => setIncludePdf(false)}
                className="text-[#959597] hover:text-[#FDFDFF]"
              >
                ×
              </button>
            </div>
          ) : null}
          {files.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="flex items-center gap-3 rounded-lg bg-[#2A2A2A] px-3 py-2.5"
            >
              <span className="text-[#959597]" aria-hidden>
                ▣
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                  {file.name}
                </p>
                <p className="mt-0.5 font-sans text-[10px] uppercase text-[#959597]">
                  {formatBytes(file.size)}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() =>
                  setFiles((prev) => prev.filter((_, i) => i !== idx))
                }
                className="text-[#959597] hover:text-[#FDFDFF]"
              >
                ×
              </button>
            </div>
          ))}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const selected = Array.from(e.target.files ?? []);
              setFiles((prev) => [...prev, ...selected]);
              e.target.value = "";
            }}
          />
          <DashboardToolbarButton onClick={() => fileInputRef.current?.click()}>
            + Add Attachment
          </DashboardToolbarButton>
        </div>

        <div className="space-y-2.5">
          <FieldLabel>Send / Schedule</FieldLabel>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {(
              [
                ["now", "Send Now"],
                ["later", "Schedule For Later"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSchedule(value)}
                className="inline-flex items-center gap-2 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]"
              >
                <span
                  className={cn(
                    "inline-flex h-4 w-4 items-center justify-center rounded-full border",
                    schedule === value
                      ? "border-[#4ADE80] bg-[#4ADE80]"
                      : "border-[#6F6F72] bg-transparent",
                  )}
                  aria-hidden
                >
                  {schedule === value ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#121212]" />
                  ) : null}
                </span>
                {label}
              </button>
            ))}
            <span
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#2D2D30] bg-[#1A1A1A] px-3 font-sans text-[11px] uppercase tracking-[-0.02em]",
                schedule === "later" ? "text-[#FDFDFF]" : "text-[#6F6F72]",
              )}
            >
              {scheduledAt || "—"}
              <span aria-hidden>▾</span>
            </span>
          </div>
        </div>
      </div>
    </DashboardModal>
  );
}

/** @deprecated kept for callers that only need recipient/subject */
export function SendQuoteSimpleFields(props: {
  recipient: string;
  subject: string;
  onRecipient: (v: string) => void;
  onSubject: (v: string) => void;
}) {
  return (
    <>
      <DashboardTextField
        label="Recipient"
        value={props.recipient}
        onChange={(e) => props.onRecipient(e.target.value)}
      />
      <DashboardTextField
        label="Subject"
        value={props.subject}
        onChange={(e) => props.onSubject(e.target.value)}
      />
    </>
  );
}
