"use client";

import * as React from "react";
import {
  DashboardField,
  DashboardModal,
  DashboardSelectField,
  DashboardTextField,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";

const textareaClass =
  "min-h-[72px] w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 py-2.5 font-sans text-[12px] font-normal uppercase leading-normal tracking-[-0.02em] text-[#FDFDFF] outline-none transition-colors placeholder:text-[#959597] focus:border-[#5A5A5A] md:text-[13px]";

export type SendQuotePayload = {
  recipient: string;
  subject: string;
  message: string;
  schedule: "now" | "later";
  attachmentNames: string[];
  files: File[];
};

export function SendQuoteModal({
  open,
  onClose,
  onConfirm,
  defaultRecipient = "",
  defaultSubject = "",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm?: (payload: SendQuotePayload) => void | Promise<void>;
  defaultRecipient?: string;
  defaultSubject?: string;
}) {
  const [recipient, setRecipient] = React.useState(defaultRecipient);
  const [subject, setSubject] = React.useState(defaultSubject);
  const [message, setMessage] = React.useState("");
  const [schedule, setSchedule] = React.useState<"now" | "later">("now");
  const [attachmentNames, setAttachmentNames] = React.useState<string[]>([]);
  const [files, setFiles] = React.useState<File[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setRecipient(defaultRecipient);
    setSubject(defaultSubject);
    setMessage("");
    setSchedule("now");
    setAttachmentNames([]);
    setFiles([]);
    setSubmitting(false);
  }, [open, defaultRecipient, defaultSubject]);

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Send Quote"
      widthClassName="max-w-lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#959597] hover:text-[#FDFDFF]"
          >
            Cancel
          </button>
          <DashboardToolbarButton
            variant="primary"
            disabled={submitting || !recipient.trim()}
            onClick={() => {
              void (async () => {
                setSubmitting(true);
                try {
                  await onConfirm?.({
                    recipient: recipient.trim(),
                    subject: subject.trim(),
                    message,
                    schedule,
                    attachmentNames,
                    files,
                  });
                  onClose();
                } finally {
                  setSubmitting(false);
                }
              })();
            }}
          >
            Confirm
          </DashboardToolbarButton>
        </>
      }
    >
      <div className="space-y-4">
        <DashboardTextField
          label="Recipient"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="email@company.com"
        />
        <DashboardTextField
          label="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Quote"
        />
        <DashboardField label="Message">
          <textarea
            className={textareaClass}
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </DashboardField>
        <DashboardSelectField
          label="Send/Schedule"
          value={schedule}
          onChange={(e) =>
            setSchedule(e.target.value === "later" ? "later" : "now")
          }
          options={[
            { value: "now", label: "Send now" },
            { value: "later", label: "Schedule" },
          ]}
        />
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const selected = Array.from(e.target.files ?? []);
              setFiles(selected);
              setAttachmentNames(selected.map((f) => f.name));
            }}
          />
          <DashboardToolbarButton
            onClick={() => fileInputRef.current?.click()}
          >
            Attachments
          </DashboardToolbarButton>
          {attachmentNames.length > 0 ? (
            <p className="font-sans text-[11px] uppercase text-[#959597]">
              {attachmentNames.join(", ")}
            </p>
          ) : null}
        </div>
      </div>
    </DashboardModal>
  );
}
