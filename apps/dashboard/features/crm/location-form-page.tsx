"use client";

import * as React from "react";
import {
  DashboardField,
  DashboardFormGrid,
  DashboardSelectField,
  DashboardTextField,
  DashboardToggle,
} from "@dark-horse-safety/ui";
import { CrmFormPageShell } from "./crm-form-page-shell";
import {
  LOCATION_FORM,
  LOCATION_FORM_EDIT_DEFAULTS,
} from "./data/crm-forms.mock";

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

const controlClass =
  "h-10 w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] outline-none transition-colors placeholder:text-[#959597] focus:border-[#5A5A5A] md:text-[13px]";

/**
 * Shared Add / Edit Location screen — same UI for both modes.
 * Header title (Add Location vs Edit Location) comes from app-shell path.
 */
export function LocationFormPage({
  mode = "create",
  locationId,
}: {
  mode?: "create" | "edit";
  locationId?: string;
}) {
  void locationId;
  const isEdit = mode === "edit";
  const d = isEdit ? LOCATION_FORM_EDIT_DEFAULTS : null;
  const [gpsRequired, setGpsRequired] = React.useState(d?.gpsRequired ?? false);

  return (
    <CrmFormPageShell
      cancelHref="/crm/locations"
      submitLabel="Save"
      sections={[
        {
          title: "Location Details",
          content: (
            <DashboardFormGrid className="gap-x-4 gap-y-5">
              <DashboardTextField
                label="Location Name *"
                defaultValue={d?.locationName}
                placeholder="Location name"
              />
              <DashboardTextField
                label="Well / Pad Number"
                defaultValue={d?.wellPadNumber}
                placeholder="WPC-0000"
              />
              <DashboardTextField
                label="API Number"
                defaultValue={d?.apiNumber}
                placeholder="API number"
              />
              <DashboardTextField
                label="Customer *"
                defaultValue={d?.customer}
                placeholder="Customer name"
              />
              <DashboardSelectField
                label="County *"
                defaultValue={d?.county ?? "midland"}
                options={LOCATION_FORM.counties}
              />
              <DashboardSelectField
                label="State *"
                defaultValue={d?.state ?? "tx"}
                options={LOCATION_FORM.states}
              />
              <DashboardField label="Coordinates *">
                <div className="relative">
                  <input
                    className={`${controlClass} pr-9`}
                    defaultValue={d?.coordinates}
                    placeholder="Lat, Long"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#959597]">
                    <MapPinIcon />
                  </span>
                </div>
              </DashboardField>
              <DashboardSelectField
                label="Site Type"
                defaultValue={d?.siteType ?? "well"}
                options={LOCATION_FORM.siteTypes}
              />
              <DashboardSelectField
                label="Status"
                defaultValue={d?.status ?? "active"}
                options={LOCATION_FORM.statuses}
              />
              <DashboardTextField
                label="Access Notes"
                defaultValue={d?.accessNotes}
                placeholder="Access notes"
              />
              <DashboardSelectField
                label="Site Contact"
                defaultValue={d?.siteContact ?? "active"}
                options={LOCATION_FORM.siteContacts}
              />
              <DashboardTextField
                label="Geofence Radius"
                defaultValue={d?.geofenceRadius}
                placeholder="Geofence radius"
              />
              <DashboardToggle
                label="GPS Required?"
                checked={gpsRequired}
                onCheckedChange={setGpsRequired}
              />
              <DashboardTextField
                label="Nearest Hospital"
                defaultValue={d?.nearestHospital}
                placeholder="Hospital name"
              />
            </DashboardFormGrid>
          ),
        },
      ]}
    />
  );
}
