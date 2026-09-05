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

export function SendQuoteModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
}) {
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
            onClick={() => {
              onConfirm?.();
              onClose();
            }}
          >
            Confirm
          </DashboardToolbarButton>
        </>
      }
    >
      <div className="space-y-4">
        <DashboardTextField label="Recipient" placeholder="" />
        <DashboardTextField label="Subject" placeholder="" />
        <DashboardField label="Message">
          <textarea className={textareaClass} rows={3} />
        </DashboardField>
        <DashboardSelectField
          label="Send/Schedule"
          defaultValue="now"
          options={[
            { value: "now", label: "Send now" },
            { value: "later", label: "Schedule" },
          ]}
        />
        <DashboardToolbarButton>Attachments</DashboardToolbarButton>
      </div>
    </DashboardModal>
  );
}
