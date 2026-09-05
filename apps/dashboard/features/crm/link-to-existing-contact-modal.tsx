"use client";

import * as React from "react";
import {
  DashboardModal,
  DashboardToolbarButton,
} from "@dark-horse-safety/ui";

export type LinkableContact = {
  id: string;
  name: string;
  avatarUrl: string;
};

export const LINKABLE_CONTACTS: LinkableContact[] = [
  {
    id: "ryan",
    name: "Ryan Crawford",
    avatarUrl: "https://picsum.photos/seed/ryan-crawford/64/64",
  },
  {
    id: "martinez",
    name: "J. Martinez",
    avatarUrl: "https://picsum.photos/seed/j-martinez/64/64",
  },
  {
    id: "doe",
    name: "John Doe",
    avatarUrl: "https://picsum.photos/seed/john-doe/64/64",
  },
  {
    id: "reed",
    name: "D. Reed",
    avatarUrl: "https://picsum.photos/seed/d-reed/64/64",
  },
];

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
  contacts = LINKABLE_CONTACTS,
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
            className="!rounded-full"
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
      <ul className="space-y-1">
        {contacts.map((contact) => {
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={contact.avatarUrl}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
                <span className="min-w-0 flex-1 truncate font-sans text-[13px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[14px]">
                  {contact.name}
                </span>
                <RadioMark checked={checked} />
              </button>
            </li>
          );
        })}
      </ul>
    </DashboardModal>
  );
}
