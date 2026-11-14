"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@dark-horse-safety/ui";
import { useSetHeaderBreadcrumb } from "@/features/app-shell/header-actions-context";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { settingsApi, type AccessUser, type AccessUsersPage } from "@/lib/settings-api";
import { AccessSectionLinks, fieldClass, labelClass, SettingsPanel } from "./settings-frame";

const SORTS = [
  { value: "RECENT", label: "Recent" },
  { value: "NAME", label: "Name" },
  { value: "ROLE", label: "Role" },
  { value: "LAST_LOGIN", label: "Last login" },
  { value: "STATUS", label: "Status" },
];

const emptyFilters = { role: "ALL", team: "ALL", status: "ALL", mfa: "ALL", mobile: "ALL" };

export function AccessUsersPage() {
  useSetHeaderBreadcrumb("Settings / Access Control / Users");
  const [query, setQuery] = React.useState("");
  const [filters, setFilters] = React.useState(emptyFilters);
  const [draft, setDraft] = React.useState(emptyFilters);
  const [sort, setSort] = React.useState("RECENT");
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<AccessUsersPage | null>(null);
  const [menuId, setMenuId] = React.useState<string | null>(null);
  const [sortOpen, setSortOpen] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [resetUser, setResetUser] = React.useState<AccessUser | null>(null);
  const [deactivateUser, setDeactivateUser] = React.useState<AccessUser | null>(null);
  const [reactivateUser, setReactivateUser] = React.useState<AccessUser | null>(null);
  const [reactivateReason, setReactivateReason] = React.useState("RETURNED FROM LEAVE");
  const [resentEmail, setResentEmail] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState("");

  const load = React.useCallback((nextPage = page) => {
    void settingsApi.accessUsers({
      q: query || undefined,
      role: filters.role === "ALL" ? undefined : filters.role,
      team: filters.team === "ALL" ? undefined : filters.team,
      status: filters.status === "ALL" ? undefined : filters.status,
      mfa: filters.mfa === "ALL" ? undefined : filters.mfa,
      mobile: filters.mobile === "ALL" ? undefined : filters.mobile,
      page: String(nextPage),
      sort,
    }).then((res) => setData(res.data)).catch(toastApiError);
  }, [filters, page, query, sort]);

  React.useEffect(() => { load(page); }, [load, page]);

  const summary = data?.summary;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const from = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;
  const filtersOn = Object.values(filters).some((value) => value !== "ALL");

  async function exportCsv() {
    try {
      const res = await settingsApi.accessUsers({
        q: query || undefined,
        role: filters.role === "ALL" ? undefined : filters.role,
        team: filters.team === "ALL" ? undefined : filters.team,
        status: filters.status === "ALL" ? undefined : filters.status,
        mfa: filters.mfa === "ALL" ? undefined : filters.mfa,
        mobile: filters.mobile === "ALL" ? undefined : filters.mobile,
        page: "1",
        sort,
        pageSize: "100",
      });
      const header = "Name,Email,Role,Team,Phone,Last login,Mobile,MFA,Admin,Invite,Status";
      const lines = res.data.items.map((row) => [row.name, row.email, row.role, row.team, row.phone, row.lastLoginLabel, row.mobileLabel, row.mfa, row.adminAccess ? "YES" : "NO", row.inviteStatus, row.status].join(","));
      const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "access-users.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toastApiError(error);
    }
  }

  function run(action: Promise<{ data: unknown }>, fallback: string) {
    void action.then((res) => {
      const payload = res.data;
      const message = payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string" ? payload.message : fallback;
      toastSuccess(message);
      setMenuId(null);
      load(page);
    }).catch(toastApiError);
  }

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-sans text-[11px] font-[510] uppercase tracking-[0.14em] text-[#959597]">Settings / Access Control / Users</p>
          <h1 className="mt-2 font-sans text-[28px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">Users</h1>
          <AccessSectionLinks current="users" />
        </div>
        <Link href="/settings/access-control/users/invite" className="rounded-lg bg-white px-4 py-2 text-[11px] font-[590] uppercase text-black">Invite user</Link>
      </div>

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-5">
          <Stat value={summary.total} label="All roles" caption="Total users" />
          <Stat value={summary.active} label={`${summary.online} online now`} caption="Active" />
          <Stat value={summary.invited} label={summary.invitedName || "None"} caption="Invited" />
          <Stat value={summary.suspended} label={summary.suspendedName || "None"} caption="Suspended" />
          <Stat value={summary.admins} label={summary.adminName || "None"} caption="Admins" />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder="Search users, email or role" className={`${fieldClass} max-w-sm`} />
        <button type="button" onClick={() => { setDraft(filters); setFilterOpen(true); }} className="rounded-lg border border-white/15 px-3 py-2 text-[11px] uppercase text-[#FDFDFF]">Filter {filtersOn ? "✓" : ""}</button>
        <div className="relative ml-auto">
          <button type="button" onClick={() => setSortOpen((open) => !open)} className="rounded-lg border border-white/15 px-3 py-2 text-[11px] uppercase text-[#FDFDFF]">Sort: {SORTS.find((item) => item.value === sort)?.label}</button>
          {sortOpen ? (
            <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-white/10 bg-[#1C1C1E] py-1">
              {SORTS.map((item) => (
                <button key={item.value} type="button" onClick={() => { setSort(item.value); setSortOpen(false); }} className="flex w-full justify-between px-3 py-2 text-left font-sans text-[11px] uppercase text-[#FDFDFF] hover:bg-white/5">
                  {item.label}{sort === item.value ? <span>✓</span> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button type="button" onClick={() => void exportCsv()} className="rounded-lg border border-white/15 px-3 py-2 text-[11px] uppercase text-[#FDFDFF]">Export</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { label: `Active · ${summary?.active ?? 0}`, status: "ACTIVE" },
          { label: `Invited · ${summary?.invited ?? 0}`, status: "INVITED" },
          { label: `Suspended · ${summary?.suspended ?? 0}`, status: "SUSPENDED" },
          { label: "All roles", status: "ALL" },
        ].map((chip) => (
          <button key={chip.status} type="button" onClick={() => { setPage(1); setFilters({ ...filters, status: chip.status, role: chip.status === "ALL" ? "ALL" : filters.role }); }} className={cn("rounded-full border px-3 py-1 font-sans text-[10px] uppercase", filters.status === chip.status ? "border-white text-white" : "border-white/15 text-[#959597]")}>
            {chip.label}
          </button>
        ))}
      </div>

      <SettingsPanel>
        <div className="grid grid-cols-[1.3fr_90px_90px_110px_90px_110px_70px_70px_80px_80px_28px] gap-2 border-b border-white/10 px-4 py-2 font-sans text-[10px] uppercase tracking-[0.08em] text-[#959597]">
          <span>User</span><span>Role</span><span>Team</span><span>Phone</span><span>Last login</span><span>Mobile</span><span>MFA</span><span>Admin</span><span>Invite</span><span>Status</span><span />
        </div>
        {data?.items.map((row) => (
          <div key={row.id} className="relative grid grid-cols-[1.3fr_90px_90px_110px_90px_110px_70px_70px_80px_80px_28px] items-center gap-2 border-b border-white/5 px-4 py-3">
            <div>
              <p className="font-sans text-[12px] font-[590] uppercase text-[#FDFDFF]">{row.name}</p>
              <p className="font-sans text-[10px] uppercase text-[#959597]">{row.email}</p>
            </div>
            <span className="font-sans text-[11px] uppercase text-[#C8C8CC]">{row.role}</span>
            <span className="font-sans text-[11px] uppercase text-[#C8C8CC]">{row.team}</span>
            <span className="font-sans text-[11px] text-[#C8C8CC]">{row.phone}</span>
            <div>
              <p className="font-sans text-[11px] uppercase text-[#FDFDFF]">{row.lastLoginLabel}</p>
              <p className="font-sans text-[10px] uppercase text-[#959597]">{row.lastLoginDetail}</p>
            </div>
            <div>
              <p className="font-sans text-[11px] uppercase text-[#FDFDFF]">{row.mobileLabel}</p>
              <p className="font-sans text-[10px] uppercase text-[#959597]">{row.mobileDetail}</p>
            </div>
            <Pill value={row.mfa} />
            <Pill value={row.adminAccess ? "YES" : "NO"} />
            <Pill value={row.inviteStatus} />
            <Pill value={row.status} />
            <button type="button" aria-label={`Actions for ${row.name}`} onClick={() => setMenuId(menuId === row.id ? null : row.id)} className="text-[#C8C8CC]">⋮</button>
            {menuId === row.id ? (
              <RowMenu
                row={row}
                onClose={() => setMenuId(null)}
                onRun={run}
                onDelete={() => { setMenuId(null); load(page); }}
                onReset={() => { setMenuId(null); setResetUser(row); }}
                onDeactivate={() => { setMenuId(null); setReason(""); setDeactivateUser(row); }}
                onReactivate={() => { setMenuId(null); setReactivateReason("RETURNED FROM LEAVE"); setReactivateUser(row); }}
                onResend={() => {
                  setMenuId(null);
                  void settingsApi.resendAccessInvite(row.id).then((res) => {
                    setResentEmail(res.data.email);
                    load(page);
                  }).catch(toastApiError);
                }}
              />
            ) : null}
          </div>
        ))}
        <p className="px-4 py-3 font-sans text-[10px] uppercase tracking-[0.06em] text-[#959597]">Showing {from}–{to} of {data?.total ?? 0} users · page {data?.page ?? 1} of {pages}</p>
        <div className="flex justify-end gap-2 px-4 pb-4">
          <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-white/15 px-3 py-1 text-[11px] uppercase text-[#FDFDFF] disabled:opacity-40">Previous</button>
          <button type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-white/15 px-3 py-1 text-[11px] uppercase text-[#FDFDFF] disabled:opacity-40">Next</button>
        </div>
      </SettingsPanel>

      {filterOpen ? (
        <div className="fixed inset-0 z-30 flex justify-end bg-black/40" onClick={() => setFilterOpen(false)}>
          <aside className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#141416] p-5" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <p className="font-sans text-[14px] font-[590] uppercase text-[#FDFDFF]">Filters</p>
              <button type="button" onClick={() => setFilterOpen(false)} className="text-[#C8C8CC]">×</button>
            </div>
            <Select label="Role" hint="Admin · supervisor · technician · dispatcher · billing." value={draft.role} options={["ALL", ...(data?.roles ?? [])]} onChange={(role) => setDraft({ ...draft, role })} />
            <Select label="Team" value={draft.team} options={["ALL", ...(data?.teams ?? [])]} onChange={(team) => setDraft({ ...draft, team })} />
            <Select label="Status" hint="Active · invited · suspended." value={draft.status} options={["ALL", "ACTIVE", "INVITED", "SUSPENDED"]} onChange={(status) => setDraft({ ...draft, status })} />
            <Select label="MFA" hint="On · off · pending." value={draft.mfa} options={["ALL", "ON", "OFF", "PENDING"]} onChange={(mfa) => setDraft({ ...draft, mfa })} />
            <Select label="Mobile app" hint="Enabled · disabled." value={draft.mobile} options={["ALL", "ENABLED", "DISABLED"]} onChange={(mobile) => setDraft({ ...draft, mobile })} />
            <div className="mt-auto flex justify-end gap-2">
              <button type="button" onClick={() => setFilterOpen(false)} className="rounded-lg border border-white/15 px-4 py-2 text-[11px] uppercase text-[#FDFDFF]">Close</button>
              <button type="button" onClick={() => setDraft(emptyFilters)} className="rounded-lg border border-white/15 px-4 py-2 text-[11px] uppercase text-[#FDFDFF]">Clear all</button>
              <button type="button" onClick={() => { setFilters(draft); setPage(1); setFilterOpen(false); }} className="rounded-lg bg-white px-4 py-2 text-[11px] font-[590] uppercase text-black">Apply</button>
            </div>
          </aside>
        </div>
      ) : null}

      {resetUser ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#2A2A2C] p-5">
            <p className="font-sans text-[13px] font-[590] uppercase tracking-[0.06em] text-[#FDFDFF]">Reset password?</p>
            <p className="mt-3 font-sans text-[11px] uppercase leading-relaxed text-[#C8C8CC]">
              Send a password-reset link to {resetUser.email}. The current password stops working once a new one is set.
            </p>
            <div className="mt-4 flex justify-end gap-3 border-t border-white/10 pt-4">
              <button type="button" onClick={() => setResetUser(null)} className="px-3 py-2 font-sans text-[11px] uppercase text-[#C8C8CC]">Cancel</button>
              <button
                type="button"
                onClick={() => {
                  const user = resetUser;
                  setResetUser(null);
                  run(settingsApi.resetAccessPassword(user.id), "Password reset sent");
                }}
                className="rounded-full bg-white px-4 py-2 font-sans text-[11px] font-[590] uppercase text-black"
              >
                Send reset link
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {resentEmail ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#2A2A2C] p-6 text-center">
            <p className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#3A3A3C] text-[#4ADE80]">✓</p>
            <p className="mt-4 font-sans text-[16px] font-[590] uppercase text-[#FDFDFF]">Invite resent</p>
            <p className="mt-2 font-sans text-[11px] uppercase leading-relaxed text-[#C8C8CC]">A new invite was sent to {resentEmail}. It expires in 7 days.</p>
            <button type="button" onClick={() => setResentEmail(null)} className="mt-5 w-full rounded-lg bg-white px-4 py-2 font-sans text-[11px] font-[590] uppercase text-black">Done</button>
          </div>
        </div>
      ) : null}

      {reactivateUser ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#2A2A2C] p-5">
            <p className="font-sans text-[13px] font-[590] uppercase text-[#FDFDFF]">Reactivate {reactivateUser.name}?</p>
            <p className="mt-2 font-sans text-[11px] uppercase text-[#C8C8CC]">{reactivateUser.role} · {reactivateUser.team} · {reactivateUser.lastLoginDetail}{reactivateUser.lastLoginDetail.includes("2026") ? "" : ", 2026"}</p>
            <p className="mt-2 font-sans text-[11px] uppercase leading-relaxed text-[#959597]">Restores web and mobile sign-in. History is kept from before the suspension.</p>
            <label className={`${labelClass} mt-4`}>Reactivation reason (required)
              <select className={`${fieldClass} mt-1`} value={reactivateReason} onChange={(event) => setReactivateReason(event.target.value)}>
                {["RETURNED FROM LEAVE", "SUSPENSION LIFTED", "SEASONAL RETURN", "ROLE CHANGE"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <div className="mt-3 rounded-lg bg-[#3A3A3C] px-3 py-2">
              <p className="font-sans text-[11px] uppercase text-[#FDFDFF]">Will restore as: {reactivateUser.role} · {reactivateUser.team} · {reactivateUser.region}</p>
              <Link href={`/settings/access-control/users/${reactivateUser.id}`} className="mt-1 inline-block font-sans text-[11px] uppercase text-[#7DD3FC]">Change role after reactivating →</Link>
            </div>
            <p className="mt-2 font-sans text-[10px] uppercase text-[#959597]">The reason is saved with the reactivation in the audit log</p>
            <div className="mt-4 flex justify-end gap-3 border-t border-white/10 pt-4">
              <button type="button" onClick={() => setReactivateUser(null)} className="px-3 py-2 font-sans text-[11px] uppercase text-[#C8C8CC]">Cancel</button>
              <button type="button" onClick={() => { const user = reactivateUser; const note = reactivateReason; setReactivateUser(null); run(settingsApi.reactivateAccessUser(user.id, note), "User reactivated"); }} className="rounded-full bg-white px-4 py-2 font-sans text-[11px] font-[590] uppercase text-black">Reactivate user</button>
            </div>
          </div>
        </div>
      ) : null}

      {deactivateUser ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#2A2A2C] p-5">
            <p className="font-sans text-[13px] font-[590] uppercase tracking-[0.06em] text-[#FDFDFF]">Deactivate user?</p>
            <p className="mt-3 font-sans text-[11px] uppercase leading-relaxed text-[#C8C8CC]">
              This revokes access immediately and signs them out of web and mobile. The user record and history are kept.
            </p>
            <p className="mt-4 rounded-lg bg-[#3A3A3C] px-3 py-2 font-sans text-[11px] uppercase text-[#FDFDFF]">
              {deactivateUser.name} · {deactivateUser.role} · {deactivateUser.team}
            </p>
            <label className={`${labelClass} mt-4`}>Reason (optional · logged)
              <input className={`${fieldClass} mt-1`} value={reason} placeholder="E.g. terminated · on leave · role change" onChange={(event) => setReason(event.target.value)} />
            </label>
            <p className="mt-2 font-sans text-[10px] uppercase tracking-[0.04em] text-[#959597]">The reason is saved with the deactivation in the audit log</p>
            <div className="mt-4 flex justify-end gap-3 border-t border-white/10 pt-4">
              <button type="button" onClick={() => setDeactivateUser(null)} className="px-3 py-2 font-sans text-[11px] uppercase text-[#C8C8CC]">Cancel</button>
              <button
                type="button"
                onClick={() => {
                  const user = deactivateUser;
                  const note = reason;
                  setDeactivateUser(null);
                  run(settingsApi.deactivateAccessUser(user.id, note), "User deactivated");
                }}
                className="rounded-full bg-[#E11D2E] px-4 py-2 font-sans text-[11px] font-[590] uppercase text-white"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RowMenu({ row, onClose, onRun, onDelete, onReset, onDeactivate, onReactivate, onResend }: { row: AccessUser; onClose: () => void; onRun: (action: Promise<{ data: unknown }>, fallback: string) => void; onDelete: () => void; onReset: () => void; onDeactivate: () => void; onReactivate: () => void; onResend: () => void }) {
  return (
    <div className="absolute right-8 top-10 z-10 w-48 rounded-lg border border-white/10 bg-[#2A2A2A] py-1 text-[11px] uppercase">
      {row.status === "SUSPENDED" ? (
        <>
          <Link href={`/settings/access-control/users/${row.id}`} className="block px-3 py-2 text-[#FDFDFF] hover:bg-white/5" onClick={onClose}>View user</Link>
          <button type="button" className="block w-full px-3 py-2 text-left text-[#FDFDFF] hover:bg-white/5" onClick={onReactivate}>Reactivate</button>
          <button type="button" className="block w-full px-3 py-2 text-left text-[#FF8A8A] hover:bg-white/5" onClick={() => void settingsApi.deleteAccessUser(row.id).then(() => { toastSuccess("User deleted"); onDelete(); }).catch(toastApiError)}>Delete user</button>
        </>
      ) : row.status === "INVITED" ? (
        <>
          <Link href={`/settings/access-control/users/${row.id}`} className="block px-3 py-2 text-[#FDFDFF] hover:bg-white/5" onClick={onClose}>Edit user</Link>
          <button type="button" className="block w-full px-3 py-2 text-left text-[#FDFDFF] hover:bg-white/5" onClick={onResend}>Resend invite</button>
          <button type="button" className="block w-full px-3 py-2 text-left text-[#FF8A8A] hover:bg-white/5" onClick={() => void settingsApi.cancelAccessInvite(row.id).then(() => { toastSuccess("Invite cancelled"); onDelete(); }).catch(toastApiError)}>Cancel invite</button>
        </>
      ) : (
        <>
          <Link href={`/settings/access-control/users/${row.id}`} className="block px-3 py-2 text-[#FDFDFF] hover:bg-white/5" onClick={onClose}>Edit user</Link>
          <button type="button" className="block w-full px-3 py-2 text-left text-[#FDFDFF] hover:bg-white/5" onClick={onReset}>Reset password</button>
          <Link href={`/settings/access-control/preview?role=${encodeURIComponent(row.role)}`} className="block px-3 py-2 text-[#FDFDFF] hover:bg-white/5" onClick={onClose}>Preview as user</Link>
          <button type="button" className="block w-full px-3 py-2 text-left text-[#FF8A8A] hover:bg-white/5" onClick={onDeactivate}>Deactivate</button>
        </>
      )}
    </div>
  );
}

function Pill({ value }: { value: string }) {
  const tone = value === "ACTIVE" || value === "ON" || value === "YES" || value === "ACCEPTED"
    ? "bg-[#14532D] text-[#86EFAC]"
    : value === "SUSPENDED" || value === "OFF" || value === "NO"
      ? "bg-[#3A3A3C] text-[#C8C8CC]"
      : value === "INVITED" || value === "PENDING"
        ? "bg-[#3F3514] text-[#F5C451]"
        : "bg-[#3A3A3C] text-[#FDFDFF]";
  if (value === "SUSPENDED") return <span className="w-fit rounded-full bg-[#6B2430] px-2 py-1 font-sans text-[10px] uppercase text-[#FFB4B4]">{value}</span>;
  return <span className={cn("w-fit rounded-full px-2 py-1 font-sans text-[10px] uppercase", tone)}>{value}</span>;
}

function Stat({ value, label, caption }: { value: number; label: string; caption: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1C1C1E] px-4 py-3">
      <p className="font-sans text-[10px] uppercase tracking-[0.08em] text-[#959597]">{caption}</p>
      <p className="font-sans text-[28px] font-[590] text-[#FDFDFF]">{value}</p>
      <p className="font-sans text-[10px] uppercase text-[#959597]">{label}</p>
    </div>
  );
}

function Select({ label, hint, value, options, onChange }: { label: string; hint?: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="mb-4 block font-sans text-[10px] uppercase tracking-[0.08em] text-[#959597]">
      {label}
      <select className={`${fieldClass} mt-2`} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
      {hint ? <span className="mt-1 block text-[#6E6E73]">{hint}</span> : null}
    </label>
  );
}
