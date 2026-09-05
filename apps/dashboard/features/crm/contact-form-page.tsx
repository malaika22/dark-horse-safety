"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextField,
  DashboardToggle,
  DashboardToolbarButton,
  type DashboardSelectOption,
} from "@dark-horse-safety/ui";
import { crmApi } from "@/lib/crm-api";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { CrmFormPageShell } from "./crm-form-page-shell";
import { LinkToExistingContactModal } from "./link-to-existing-contact-modal";

const ROLE_OPTIONS: DashboardSelectOption[] = [
  { value: "Operations Manager", label: "Operations Manager" },
  { value: "Site Supervisor", label: "Site Supervisor" },
  { value: "AP / Billing", label: "AP / Billing" },
  { value: "Field Ops", label: "Field Ops" },
  { value: "Safety Lead", label: "Safety Lead" },
];
const PREFERRED_OPTIONS: DashboardSelectOption[] = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "sms", label: "SMS" },
];

/**
 * Shared Add / Edit Contact screen — same UI for both modes.
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
  const [primaryContact, setPrimaryContact] = React.useState(false);
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [ready, setReady] = React.useState(!isEdit);

  const [fullName, setFullName] = React.useState("");
  const [roleTitle, setRoleTitle] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [mobile, setMobile] = React.useState("");
  const [officePhone, setOfficePhone] = React.useState("");
  const [preferredMethod, setPreferredMethod] = React.useState("email");
  const [customerId, setCustomerId] = React.useState(
    searchParams.get("customerId") ?? "",
  );
  const [notes, setNotes] = React.useState("");
  const [linkedFromScan, setLinkedFromScan] = React.useState("");
  const [customers, setCustomers] = React.useState<DashboardSelectOption[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await crmApi.lookupCustomers();
        if (cancelled) return;
        const opts = res.data.map((c) => ({
          value: c.id,
          label: c.name,
        }));
        setCustomers(opts);
        if (!isEdit && !customerId && opts[0]) setCustomerId(opts[0].value);
      } catch (err) {
        toastApiError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- load lookups once

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
        setPreferredMethod(c.preferredMethod ?? "email");
        setPrimaryContact(Boolean(c.isPrimary));
        setNotes(c.notes ?? "");
        setLinkedFromScan(c.linkedFromScan ?? "");
        setCustomerId(c.primaryCustomerId ?? "");
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

  async function handleSave(addAnother = false) {
    if (!fullName.trim()) {
      toastApiError(new Error("Full name is required"));
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        fullName: fullName.trim(),
        roleTitle: roleTitle.trim() || undefined,
        email: email.trim() || undefined,
        mobile: mobile.trim() || undefined,
        officePhone: officePhone.trim() || undefined,
        preferredMethod,
        isPrimary: primaryContact,
        notes: notes.trim() || undefined,
        linkedFromScan: linkedFromScan.trim() || undefined,
        primaryCustomerId: customerId || undefined,
        customerIds: customerId ? [customerId] : undefined,
        status: "ACTIVE",
      };
      if (isEdit && contactId) {
        await crmApi.updateContact(contactId, body);
        toastSuccess("Contact updated");
        router.push(`/crm/contacts/${contactId}`);
      } else {
        await crmApi.createContact(body);
        toastSuccess("Contact created");
        if (addAnother) {
          setFullName("");
          setEmail("");
        } else {
          router.push("/crm/contacts");
        }
      }
    } catch (err) {
      toastApiError(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="bg-shell p-6 font-sans text-sm text-[#959597]">
        Loading contact…
      </div>
    );
  }

  return (
    <>
      <CrmFormPageShell
        cancelHref={isEdit && contactId ? `/crm/contacts/${contactId}` : "/crm/contacts"}
        submitLabel="Save"
        submitting={submitting}
        onSave={() => handleSave(false)}
        onSaveAndAddAnother={isEdit ? undefined : () => handleSave(true)}
        extraFooterActions={
          isEdit ? undefined : (
            <DashboardToolbarButton onClick={() => setLinkOpen(true)}>
              Link to Existing Contact
            </DashboardToolbarButton>
          )
        }
        sections={[
          {
            title: "Details",
            content: (
              <DashboardFormGrid className="gap-x-4 gap-y-5">
                <DashboardTextField
                  label="Full Name *"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full name"
                />
                <DashboardSelectField
                  label="Role / Title"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  options={[{ value: "", label: "—" }, ...ROLE_OPTIONS]}
                />
                <DashboardTextField
                  label="Email *"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@company.com"
                />
                <DashboardTextField
                  label="Mobile"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="(432) 555-0000"
                />
                <DashboardTextField
                  label="Office Phone"
                  value={officePhone}
                  onChange={(e) => setOfficePhone(e.target.value)}
                  placeholder="(432) 555-0000"
                />
                <DashboardSelectField
                  label="Preferred Contact Method"
                  value={preferredMethod}
                  onChange={(e) => setPreferredMethod(e.target.value)}
                  options={PREFERRED_OPTIONS}
                />
                <DashboardSelectField
                  label="Customers *"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  options={
                    customers.length
                      ? customers
                      : [{ value: "", label: "Loading…" }]
                  }
                />
                <DashboardToggle
                  label="Primary Contact?"
                  checked={primaryContact}
                  onCheckedChange={setPrimaryContact}
                />
                <DashboardTextField
                  label="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes"
                />
                <DashboardTextField
                  label="Linked from Business Card Scan"
                  value={linkedFromScan}
                  onChange={(e) => setLinkedFromScan(e.target.value)}
                  placeholder="Scan source"
                  containerClassName="md:col-span-2"
                />
              </DashboardFormGrid>
            ),
          },
        ]}
      />

      {!isEdit ? (
        <LinkToExistingContactModal
          open={linkOpen}
          onClose={() => setLinkOpen(false)}
        />
      ) : null}
    </>
  );
}
