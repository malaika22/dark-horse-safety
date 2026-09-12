"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextAreaField,
  DashboardTextField,
  DashboardToolbarButton,
  cn,
  type DashboardSelectOption,
} from "@dark-horse-safety/ui";
import { crmApi, type CrmContact } from "@/lib/crm-api";
import { assetUrl } from "@/lib/api";
import { toastApiError, toastSuccess, toastValidationError } from "@/lib/toast";
import { CrmFormPageShell } from "./crm-form-page-shell";
import {
  LinkToExistingContactModal,
  type LinkableContact,
} from "./link-to-existing-contact-modal";
import { useCustomerOptions } from "./use-customer-options";

type FieldErrors = Record<string, string | undefined>;

type CustomerLinkRow = {
  key: string;
  customerId: string;
  role: string;
  isPrimary: boolean;
};

type PendingPhoto = {
  name: string;
  sizeLabel: string;
  contentBase64: string;
  dimensionsLabel?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return (name.slice(0, 2) || "CT").toUpperCase();
}

function newLinkRow(customerId = "", primary = false): CustomerLinkRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    customerId,
    role: "",
    isPrimary: primary,
  };
}

function fileToPendingPhoto(file: File): Promise<PendingPhoto> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const contentBase64 = String(reader.result ?? "");
      const img = new Image();
      img.onload = () => {
        resolve({
          name: file.name,
          sizeLabel: formatBytes(file.size),
          contentBase64,
          dimensionsLabel: `${img.width} × ${img.height}`,
        });
      };
      img.onerror = () => {
        resolve({
          name: file.name,
          sizeLabel: formatBytes(file.size),
          contentBase64,
        });
      };
      img.src = contentBase64;
    };
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

function avatarUrlForContact(c: CrmContact): string | undefined {
  return c.photoUrl ? assetUrl(c.photoUrl) : undefined;
}

/**
 * Shared Add / Edit Contact screen — Figma layout + field validation.
 */
export function ContactFormPage({
  mode = "create",
  contactId,
}: {
  mode?: "create" | "edit";
  contactId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEdit = mode === "edit";
  const prefCustomerId = searchParams.get("customerId") ?? "";

  const [linkOpen, setLinkOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [ready, setReady] = React.useState(!isEdit);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<FieldErrors>({});

  const [fullName, setFullName] = React.useState("");
  const [roleTitle, setRoleTitle] = React.useState("");
  const [linkedIn, setLinkedIn] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [mobile, setMobile] = React.useState("");
  const [officePhone, setOfficePhone] = React.useState("");
  const [preferredMethod, setPreferredMethod] = React.useState("");
  const [timeZone, setTimeZone] = React.useState("");
  const [lastContacted, setLastContacted] = React.useState("—");
  const [doNotContact, setDoNotContact] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [howWeMet, setHowWeMet] = React.useState("");
  const [linkedFromScan, setLinkedFromScan] = React.useState("");
  const [customerLinks, setCustomerLinks] = React.useState<CustomerLinkRow[]>([
    newLinkRow(prefCustomerId, true),
  ]);
  const [photo, setPhoto] = React.useState<PendingPhoto | null>(null);
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  const [assignedRepId, setAssignedRepId] = React.useState("");
  const [locationLabel, setLocationLabel] = React.useState("");
  const [repOptions, setRepOptions] = React.useState<DashboardSelectOption[]>([]);
  const [allowDuplicate, setAllowDuplicate] = React.useState(false);
  const [duplicateMatch, setDuplicateMatch] = React.useState<{
    id: string;
    fullName: string;
    customerCount: number;
  } | null>(null);
  const [linkableContacts, setLinkableContacts] = React.useState<
    LinkableContact[]
  >([]);
  const [roleOptions, setRoleOptions] = React.useState<DashboardSelectOption[]>(
    [],
  );
  const [preferredOptions, setPreferredOptions] = React.useState<
    DashboardSelectOption[]
  >([]);
  const [timezoneOptions, setTimezoneOptions] = React.useState<
    DashboardSelectOption[]
  >([]);

  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const { options: customers, loading: customersLoading } = useCustomerOptions();

  function clearError(key: string) {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [lookups, reps] = await Promise.all([
          crmApi.lookups(),
          crmApi.lookupReps(),
        ]);
        if (cancelled) return;
        const d = lookups.data;
        if (d.contactRoles?.length) {
          setRoleOptions(
            d.contactRoles.map((o) => ({
              value: o.value || o.label,
              label: o.label,
            })),
          );
        }
        if (d.preferredContactMethods?.length) {
          setPreferredOptions(
            d.preferredContactMethods.map((o) => ({
              value: o.value || o.label,
              label: o.label,
            })),
          );
        }
        if (d.timezones?.length) {
          setTimezoneOptions(
            d.timezones.map((o) => ({ value: o.value, label: o.label })),
          );
        }
        setRepOptions(
          reps.data.map((r) => ({
            value: r.id,
            label:
              [r.firstName, r.lastName].filter(Boolean).join(" ").trim() ||
              r.email ||
              r.id,
          })),
        );
      } catch {
        /* empty until retry */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!isEdit || !contactId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.getContact(contactId);
        if (cancelled) return;
        const c = res.data;
        setFullName(c.fullName ?? "");
        setRoleTitle(c.roleTitle ?? "");
        setEmail(c.email ?? "");
        setMobile(c.mobile ?? "");
        setOfficePhone(c.officePhone ?? "");
        setPreferredMethod(c.preferredMethod ?? "");
        setLinkedIn(c.linkedIn ?? "");
        setTimeZone(c.timeZone ?? "");
        setDoNotContact(Boolean(c.doNotContact));
        setHowWeMet(c.howWeMet ?? "");
        setNotes(c.notes ?? "");
        setPhotoUrl(c.photoUrl ?? null);
        setAssignedRepId(c.assignedRepId ?? c.assignedRep?.id ?? "");
        setLocationLabel(c.locationLabel ?? "");
        setLinkedFromScan(c.linkedFromScan ?? "");
        setLastContacted(
          c.lastActivityAt
            ? new Date(c.lastActivityAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "—",
        );
        const links = (c.customers ?? []).map((row, i) => ({
          key: row.customerId || row.customer?.id || `edit-${i}`,
          customerId: row.customerId || row.customer?.id || "",
          role: row.roleAtCustomer ?? c.roleTitle ?? "",
          isPrimary: Boolean(row.isPrimary) || row.customerId === c.primaryCustomerId,
        }));
        setCustomerLinks(
          links.length
            ? links
            : [newLinkRow(c.primaryCustomerId ?? "", true)],
        );
        setReady(true);
      } catch (err) {
        toastApiError(err);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, contactId]);

  React.useEffect(() => {
    if (isEdit || !prefCustomerId) return;
    setCustomerLinks((prev) => {
      if (prev.some((r) => r.customerId === prefCustomerId)) return prev;
      const [first, ...rest] = prev;
      if (!first) return [newLinkRow(prefCustomerId, true)];
      return [{ ...first, customerId: prefCustomerId, isPrimary: true }, ...rest];
    });
  }, [isEdit, prefCustomerId]);

  async function checkDuplicate(name: string, mail: string) {
    const q = mail.trim() || name.trim();
    if (q.length < 3) {
      setDuplicateMatch(null);
      return;
    }
    try {
      const res = await crmApi.listContacts({ q, pageSize: 10 });
      const items = res.data.items ?? [];
      const match = items.find((c) => {
        if (isEdit && c.id === contactId) return false;
        const emailMatch =
          mail.trim() &&
          (c.email ?? "").toLowerCase() === mail.trim().toLowerCase();
        const nameMatch =
          name.trim() &&
          (c.fullName ?? "").toLowerCase() === name.trim().toLowerCase();
        return Boolean(emailMatch || nameMatch);
      });
      if (!match) {
        setDuplicateMatch(null);
        return;
      }
      setDuplicateMatch({
        id: match.id,
        fullName: match.fullName,
        customerCount: match.customers?.length ?? (match.primaryCustomer ? 1 : 0),
      });
      setAllowDuplicate(false);
    } catch {
      /* ignore lookup errors */
    }
  }

  function validateClient(): FieldErrors {
    const next: FieldErrors = {};
    if (!fullName.trim()) next.fullName = "Enter a full name.";
    if (!email.trim()) next.email = "Enter an email.";
    else if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email.";

    const linked = customerLinks.filter((r) => r.customerId);
    if (!linked.length) next.customers = "Select at least one customer.";
    else if (!linked.some((r) => r.isPrimary)) {
      next.customers = "Mark one customer as primary.";
    }

    if (duplicateMatch && !allowDuplicate) {
      next.email = next.email || "A matching contact already exists.";
    }
    return next;
  }

  async function handleSave(addAnother = false) {
    const clientErrors = validateClient();
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      toastValidationError();
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>("[aria-invalid='true']")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }

    setSubmitting(true);
    setSaveError(null);
    setErrors({});
    try {
      const linked = customerLinks.filter((r) => r.customerId);
      const primary =
        linked.find((r) => r.isPrimary)?.customerId || linked[0]!.customerId;
      const primaryRole =
        linked.find((r) => r.customerId === primary)?.role.trim() ||
        roleTitle.trim();

      let nextPhotoUrl = photoUrl;
      if (photo?.contentBase64) {
        const uploaded = await crmApi.uploadFile({
          folder: "contacts",
          fileName: photo.name,
          contentBase64: photo.contentBase64,
        });
        nextPhotoUrl = uploaded.data.url;
        setPhotoUrl(nextPhotoUrl);
      }

      const body = {
        fullName: fullName.trim(),
        roleTitle: primaryRole || roleTitle.trim() || undefined,
        email: email.trim() || undefined,
        mobile: mobile.trim() || undefined,
        officePhone: officePhone.trim() || undefined,
        preferredMethod: preferredMethod || undefined,
        isPrimary: true,
        notes: notes.trim() || undefined,
        linkedIn: linkedIn.trim() || undefined,
        timeZone: timeZone || undefined,
        doNotContact,
        howWeMet: howWeMet.trim() || undefined,
        photoUrl: nextPhotoUrl || undefined,
        assignedRepId: assignedRepId || undefined,
        locationLabel: locationLabel.trim() || undefined,
        linkedFromScan: linkedFromScan.trim() || undefined,
        primaryCustomerId: primary,
        customerIds: linked.map((r) => r.customerId),
        customerLinks: linked.map((r) => ({
          customerId: r.customerId,
          roleAtCustomer: r.role.trim() || undefined,
          isPrimary: Boolean(r.isPrimary),
        })),
        status: "ACTIVE",
      };

      if (isEdit && contactId) {
        await crmApi.updateContact(contactId, body);
        toastSuccess("Contact updated");
        router.push(`/crm/contacts/${contactId}`);
      } else {
        const created = await crmApi.createContact(body);
        toastSuccess("Contact created");
        if (addAnother) {
          setFullName("");
          setRoleTitle("");
          setLinkedIn("");
          setEmail("");
          setMobile("");
          setOfficePhone("");
          setPreferredMethod("");
          setTimeZone("");
          setDoNotContact(false);
          setNotes("");
          setHowWeMet("");
          setLinkedFromScan("");
          setPhoto(null);
          setPhotoUrl(null);
          setAssignedRepId("");
          setLocationLabel("");
          setDuplicateMatch(null);
          setAllowDuplicate(false);
          setCustomerLinks([newLinkRow("", true)]);
          setErrors({});
        } else {
          router.push(`/crm/contacts/${created.data.id}`);
        }
      }
    } catch (err) {
      toastApiError(err);
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  React.useEffect(() => {
    if (isEdit) return;
    function onLink() {
      void openLinkModal();
    }
    window.addEventListener("crm:link-existing-contact", onLink);
    return () => window.removeEventListener("crm:link-existing-contact", onLink);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  async function openLinkModal() {
    setLinkOpen(true);
    try {
      const res = await crmApi.listContacts({ pageSize: 50 });
      setLinkableContacts(
        (res.data.items ?? []).map((c) => ({
          id: c.id,
          name: c.fullName,
          avatarUrl: avatarUrlForContact(c),
        })),
      );
    } catch (err) {
      toastApiError(err);
    }
  }

  function handleLinkConfirm(id: string) {
    const primaryCustomer =
      customerLinks.find((r) => r.isPrimary)?.customerId ||
      customerLinks.find((r) => r.customerId)?.customerId;
    router.push(
      primaryCustomer
        ? `/crm/contacts/${id}/edit?customerId=${primaryCustomer}`
        : `/crm/contacts/${id}/edit`,
    );
  }

  if (!ready) {
    return (
      <div className="bg-shell p-6 font-sans text-sm text-[#959597]">
        Loading contact…
      </div>
    );
  }

  const photoMeta = photo
    ? [photo.name, photo.dimensionsLabel, photo.sizeLabel]
        .filter(Boolean)
        .join(" · ")
    : "No photo uploaded";

  return (
    <>
      <CrmFormPageShell
        cancelHref={
          isEdit && contactId ? `/crm/contacts/${contactId}` : "/crm/contacts"
        }
        submitLabel="Save"
        submitting={submitting}
        saveError={saveError}
        showTopCancel={false}
        onDiscardSave={() => setSaveError(null)}
        onRetrySave={() => void handleSave(false)}
        onSave={() => handleSave(false)}
        onSaveAndAddAnother={isEdit ? undefined : () => handleSave(true)}
        sections={[
          {
            title: "Upload Photo",
            content: (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                <div className="flex flex-col items-center gap-2 sm:items-start">
                  <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#3E3E3E] bg-[#1E3A5F] font-sans text-[22px] font-[590] text-[#7EB6FF]">
                    {photo?.contentBase64 || photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo?.contentBase64 || assetUrl(photoUrl)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initialsFromName(fullName || "PB")
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597] hover:text-[#FDFDFF]"
                  >
                    Click or drag to upload
                  </button>
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <p className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF] md:text-[13px]">
                    {photoMeta}
                  </p>
                  <p className="max-w-xl font-sans text-[10px] uppercase leading-relaxed tracking-[-0.02em] text-[#6F6F72]">
                    PNG, JPG or SVG — square works best.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <DashboardToolbarButton
                      disabled={!photo}
                      onClick={() => {
                        setPhoto(null);
                        setPhotoUrl(null);
                      }}
                    >
                      Remove
                    </DashboardToolbarButton>
                    <DashboardToolbarButton
                      variant="primary"
                      onClick={() => photoInputRef.current?.click()}
                    >
                      Replace Photo
                    </DashboardToolbarButton>
                  </div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      void fileToPendingPhoto(file).then(setPhoto);
                    }}
                  />
                </div>
              </div>
            ),
          },
          {
            title: "Details",
            content: (
              <div className="space-y-7">
                <div className="space-y-3">
                  <p className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#959597]">
                    Identity
                  </p>
                  <DashboardFormGrid className="gap-x-4 gap-y-5">
                    <DashboardTextField
                      label="Full Name *"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        clearError("fullName");
                      }}
                      onBlur={() => void checkDuplicate(fullName, email)}
                      error={errors.fullName}
                      placeholder="James Whitfield"
                    />
                    <div className="space-y-1.5">
                      <DashboardTextField
                        label="Role / Title"
                        value={roleTitle}
                        onChange={(e) => setRoleTitle(e.target.value)}
                        list="contact-role-titles"
                        placeholder="Operations Manager"
                      />
                      <datalist id="contact-role-titles">
                        {roleOptions.map((o) => (
                          <option key={o.value} value={o.value} />
                        ))}
                      </datalist>
                      <p className="font-sans text-[10px] uppercase leading-relaxed tracking-[-0.02em] text-[#6F6F72]">
                        Autocomplete from existing titles — prevents duplicates
                        like &apos;Ops Manager&apos; vs &apos;Operations
                        Manager.&apos;
                      </p>
                    </div>
                    <DashboardTextField
                      label="LinkedIn"
                      value={linkedIn}
                      onChange={(e) => setLinkedIn(e.target.value)}
                      placeholder="linkedin.com/in/jwhitfield"
                      containerClassName="md:col-span-2"
                    />
                    <DashboardSelectField
                      label="Assigned Rep"
                      value={assignedRepId}
                      onChange={(e) => setAssignedRepId(e.target.value)}
                      options={repOptions}
                      placeholder="Select rep"
                    />
                    <DashboardTextField
                      label="Location / Region"
                      value={locationLabel}
                      onChange={(e) => setLocationLabel(e.target.value)}
                      placeholder="Midland Basin"
                    />
                  </DashboardFormGrid>
                </div>

                <div className="space-y-3">
                  <p className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#959597]">
                    Contact Methods
                  </p>
                  <div className="space-y-5">
                    <DashboardFormGrid className="gap-x-4 gap-y-5">
                      <DashboardTextField
                        label="Email *"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          clearError("email");
                          setAllowDuplicate(false);
                        }}
                        onBlur={() => void checkDuplicate(fullName, email)}
                        error={errors.email}
                        placeholder="jwhitfield@example.com"
                      />
                      <DashboardTextField
                        label="Mobile"
                        value={mobile}
                        onChange={(e) => setMobile(formatPhone(e.target.value))}
                        placeholder="(432) 555-0178"
                      />
                    </DashboardFormGrid>

                    {duplicateMatch ? (
                      <div className="flex flex-col gap-3 rounded-lg border border-[#8B7355] bg-[#3A2E1C] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 16 16"
                            fill="none"
                            aria-hidden
                            className="shrink-0 text-[#E8B84A]"
                          >
                            <path
                              d="M8 1.5 14.5 13.5h-13L8 1.5Z"
                              stroke="currentColor"
                              strokeWidth="1.3"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M8 6v3.5M8 11.5h.01"
                              stroke="currentColor"
                              strokeWidth="1.3"
                              strokeLinecap="round"
                            />
                          </svg>
                          <p className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                            {duplicateMatch.fullName} already exists — linked to{" "}
                            {duplicateMatch.customerCount || 1} customer
                            {duplicateMatch.customerCount === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <DashboardToolbarButton
                            variant="primary"
                            onClick={() =>
                              router.push(
                                `/crm/contacts/${duplicateMatch.id}/edit`,
                              )
                            }
                          >
                            Link to This Customer Instead
                          </DashboardToolbarButton>
                          <DashboardToolbarButton
                            onClick={() => {
                              setAllowDuplicate(true);
                              clearError("email");
                            }}
                          >
                            Create Separate Contact
                          </DashboardToolbarButton>
                        </div>
                      </div>
                    ) : null}

                    <DashboardFormGrid className="gap-x-4 gap-y-5">
                      <DashboardTextField
                        label="Office Phone"
                        value={officePhone}
                        onChange={(e) =>
                          setOfficePhone(formatPhone(e.target.value))
                        }
                        placeholder="(432) 555-0231"
                      />
                      <DashboardSelectField
                        label="Preferred Contact Method"
                        value={preferredMethod}
                        onChange={(e) => setPreferredMethod(e.target.value)}
                        options={preferredOptions}
                        placeholder="Select method"
                      />
                      <DashboardSelectField
                        label="Time Zone"
                        value={timeZone}
                        onChange={(e) => setTimeZone(e.target.value)}
                        options={timezoneOptions}
                        placeholder="Select time zone"
                      />
                      <DashboardTextField
                        label="Last Contacted (Auto-filled)"
                        value={lastContacted || "—"}
                        disabled
                      />
                      <div className="flex h-10 items-center justify-between gap-4 md:col-span-2 md:mt-1">
                        <span className="font-sans text-[12px] font-normal uppercase tracking-[-0.02em] text-[#E5484D]">
                          Do Not Contact?
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={doNotContact}
                          onClick={() => setDoNotContact(!doNotContact)}
                          className={cn(
                            "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                            doNotContact ? "bg-[#FDFDFF]" : "bg-[#3E3E3E]",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-0.5 left-0.5 h-4 w-4 rounded-full transition-transform",
                              doNotContact
                                ? "translate-x-4 bg-[#1A1A1A]"
                                : "bg-[#959597]",
                            )}
                          />
                        </button>
                      </div>
                    </DashboardFormGrid>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#959597]">
                    Relationships
                  </p>
                  <div className="space-y-2">
                    <span className="font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[12px]">
                      Customers <span className="text-[#E5484D]">*</span>
                    </span>
                    <div className="overflow-hidden rounded-lg border border-[#3E3E3E] bg-[#2A2A2A]">
                      {customerLinks.map((row, index) => (
                        <div
                          key={row.key}
                          className={cn(
                            "grid grid-cols-1 gap-2 p-2.5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] sm:items-center sm:gap-3",
                            index > 0 && "border-t border-[#3E3E3E]",
                          )}
                        >
                          <DashboardSelectField
                            label=""
                            value={row.customerId}
                            onChange={(e) => {
                              const value = e.target.value;
                              setCustomerLinks((prev) =>
                                prev.map((r) =>
                                  r.key === row.key
                                    ? { ...r, customerId: value }
                                    : r,
                                ),
                              );
                              clearError("customers");
                            }}
                            options={customers}
                            loading={customersLoading}
                            placeholder="Select customer"
                            emptyMessage="No record found"
                          />
                          <DashboardTextField
                            label=""
                            value={row.role}
                            onChange={(e) =>
                              setCustomerLinks((prev) =>
                                prev.map((r) =>
                                  r.key === row.key
                                    ? { ...r, role: e.target.value }
                                    : r,
                                ),
                              )
                            }
                            list={`contact-customer-role-${row.key}`}
                            placeholder="Operations Manager"
                          />
                          <datalist id={`contact-customer-role-${row.key}`}>
                            {roleOptions.map((o) => (
                              <option key={o.value} value={o.value} />
                            ))}
                          </datalist>
                          <label className="flex h-10 cursor-pointer items-center gap-2 px-1">
                            <span
                              className={cn(
                                "inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2",
                                row.isPrimary
                                  ? "border-[#3B82F6]"
                                  : "border-[#959597]",
                              )}
                              aria-hidden
                            >
                              {row.isPrimary ? (
                                <span className="h-2.5 w-2.5 rounded-full bg-[#3B82F6]" />
                              ) : null}
                            </span>
                            <input
                              type="radio"
                              name="primary-customer"
                              checked={row.isPrimary}
                              onChange={() => {
                                setCustomerLinks((prev) =>
                                  prev.map((r) => ({
                                    ...r,
                                    isPrimary: r.key === row.key,
                                  })),
                                );
                                clearError("customers");
                              }}
                              className="sr-only"
                            />
                            <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                              Primary
                            </span>
                          </label>
                          <button
                            type="button"
                            aria-label="Remove customer"
                            disabled={customerLinks.length <= 1}
                            onClick={() => {
                              setCustomerLinks((prev) => {
                                const next = prev.filter(
                                  (r) => r.key !== row.key,
                                );
                                if (
                                  !next.some((r) => r.isPrimary) &&
                                  next[0]
                                ) {
                                  next[0] = { ...next[0], isPrimary: true };
                                }
                                return next;
                              });
                            }}
                            className="flex h-10 w-8 items-center justify-center text-[#959597] hover:text-[#FDFDFF] disabled:opacity-40"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    {errors.customers ? (
                      <span className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#E5484D]">
                        {errors.customers}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() =>
                        setCustomerLinks((prev) => [
                          ...prev,
                          newLinkRow("", false),
                        ])
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-dashed border-[#3E3E3E] px-2.5 py-1.5 font-sans text-[11px] font-[510] uppercase tracking-[-0.02em] text-[#959597] hover:border-[#5A5A5A] hover:text-[#FDFDFF]"
                    >
                      + Add Another Customer
                    </button>
                  </div>
                  <DashboardTextField
                    label="Linked from Business Card Scan"
                    value={linkedFromScan}
                    onChange={(e) => setLinkedFromScan(e.target.value)}
                    placeholder="Midland, TX"
                  />
                </div>

                <div className="space-y-5">
                  <DashboardTextAreaField
                    label="Notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Prefers morning calls. Decision-maker for site safety spend — renewals go through him."
                    rows={5}
                  />
                  <DashboardTextField
                    label="How We Met / Source"
                    value={howWeMet}
                    onChange={(e) => setHowWeMet(e.target.value)}
                    placeholder="Trade show"
                  />
                </div>
              </div>
            ),
          },
        ]}
      />

      {!isEdit ? (
        <LinkToExistingContactModal
          open={linkOpen}
          onClose={() => setLinkOpen(false)}
          contacts={linkableContacts}
          onConfirm={handleLinkConfirm}
        />
      ) : null}
    </>
  );
}
