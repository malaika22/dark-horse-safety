"use client";

import * as React from "react";
import {
  DashboardModal,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";

export type LinkableContact = {
  id: string;
  name: string;
  avatarUrl?: string;
};

function RadioMark({ checked }: { checked: boolean }) {
  return (
    <span
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
        checked ? "border-[#FDFDFF]" : "border-[#959597]"
      }`}
      aria-hidden
    >
      {checked ? (
        <span className="h-2.5 w-2.5 rounded-full bg-[#FDFDFF]" />
      ) : null}
    </span>
  );
}

export function LinkToExistingContactModal({
  open,
  onClose,
  onConfirm,
  contacts = [],
}: {
  open: boolean;
  onClose: () => void;
  onConfirm?: (contactId: string) => void;
  contacts?: LinkableContact[];
}) {
  const [selectedId, setSelectedId] = React.useState(contacts[0]?.id ?? "");

  React.useEffect(() => {
    if (open) setSelectedId(contacts[0]?.id ?? "");
  }, [open, contacts]);

  const list = contacts;

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Link to Existing Contact"
      widthClassName="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#959597] transition-colors hover:text-[#FDFDFF]"
          >
            Cancel
          </button>
          <DashboardToolbarButton
            variant="primary"
            disabled={!selectedId}
            onClick={() => {
              if (selectedId) onConfirm?.(selectedId);
              onClose();
            }}
          >
            Confirm
          </DashboardToolbarButton>
        </>
      }
    >
      {list.length === 0 ? (
        <p className="py-6 text-center font-sans text-[12px] uppercase tracking-[-0.02em] text-[#6F6F72]">
          No contacts found
        </p>
      ) : (
        <ul className="space-y-1">
          {list.map((contact) => {
            const checked = selectedId === contact.id;
            return (
              <li key={contact.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => setSelectedId(contact.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-1 py-3 text-left transition-colors hover:bg-white/[0.03]"
                >
                  {contact.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={contact.avatarUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2A2A2A] font-sans text-[12px] font-[590] uppercase text-[#FDFDFF]">
                      {contact.name
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((p) => p[0])
                        .join("")
                        .toUpperCase() || "?"}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate font-sans text-[13px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[14px]">
                    {contact.name}
                  </span>
                  <RadioMark checked={checked} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardModal>
  );
}
