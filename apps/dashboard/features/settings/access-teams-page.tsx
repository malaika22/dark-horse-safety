"use client";

import * as React from "react";
import { cn } from "@dark-horse-safety/ui";
import { useSetHeaderBreadcrumb } from "@/features/app-shell/header-actions-context";
import { toastApiError, toastError, toastSuccess } from "@/lib/toast";
import { settingsApi, type AccessTeam, type AccessTeamInput, type AccessTeamsPage, type TeamProfile } from "@/lib/settings-api";
import { AccessSectionLinks, fieldClass, SettingsPanel } from "./settings-frame";

const SORTS = [
  { value: "RECENT", label: "Recent" },
  { value: "NAME", label: "Name" },
  { value: "MEMBERS", label: "Members" },
  { value: "REGION", label: "Region" },
  { value: "OWNER", label: "Owner" },
];

const emptyFilters = { region: "ALL", access: "ALL", owner: "ALL" };
const blankTeam = (): AccessTeamInput => ({
  name: "",
  lead: "",
  region: "MIDLAND",
  modules: "OPS, SAFETY",
  dashboards: "OPERATIONS",
  owner: "S. NGUYEN",
  access: "STANDARD",
  kind: "FIELD",
});

export function AccessTeamsPage() {
  useSetHeaderBreadcrumb("Settings / Access Control / Team Access");
  const [query, setQuery] = React.useState("");
  const [filters, setFilters] = React.useState(emptyFilters);
  const [draft, setDraft] = React.useState(emptyFilters);
  const [kind, setKind] = React.useState("ALL");
  const [sort, setSort] = React.useState("RECENT");
  const [data, setData] = React.useState<AccessTeamsPage | null>(null);
  const [sortOpen, setSortOpen] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [editing, setEditing] = React.useState<AccessTeam | null>(null);
  const [openTeam, setOpenTeam] = React.useState<AccessTeam | null>(null);
  const [memberName, setMemberName] = React.useState("");
  const [memberRole, setMemberRole] = React.useState("TECHNICIAN");
  const [memberNote, setMemberNote] = React.useState("");
  const [team, setTeam] = React.useState<AccessTeamInput>(blankTeam());

  const load = React.useCallback(() => {
    void settingsApi.accessTeams({
      q: query || undefined,
      region: filters.region === "ALL" ? undefined : filters.region,
      access: filters.access === "ALL" ? undefined : filters.access,
      owner: filters.owner === "ALL" ? undefined : filters.owner,
      kind: kind === "ALL" ? undefined : kind,
      sort,
    }).then((res) => setData(res.data)).catch(toastApiError);
  }, [filters, kind, query, sort]);

  React.useEffect(() => { load(); }, [load]);

  const summary = data?.summary;
  const filtersOn = Object.values(filters).some((value) => value !== "ALL");

  async function exportCsv() {
    if (!data) return;
    const header = "Team,Code,Lead,Members,Region,Modules,Dashboards,Owner,Access,Status";
    const lines = data.items.map((row) => [row.name, row.code, row.lead, row.members, row.region, row.modules, row.dashboards, row.owner, row.access, row.status].join(","));
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "team-access.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function createTeam() {
    if (!team.name.trim() || !team.lead.trim()) {
      toastError("Team name and lead are required");
      return;
    }
    try {
      if (editing) await settingsApi.updateAccessTeam(editing.id, team);
      else await settingsApi.createAccessTeam(team);
      toastSuccess(editing ? "Team saved" : "Team added");
      setAdding(false);
      setEditing(null);
      setTeam(blankTeam());
      load();
    } catch (error) {
      toastApiError(error);
    }
  }

  function startEdit(row: AccessTeam) {
    setEditing(row);
    setTeam({ name: row.name, lead: row.lead, region: row.region, modules: row.modules, dashboards: row.dashboards, owner: row.owner, access: row.access, kind: row.kind });
    setAdding(true);
  }

  async function addMember() {
    if (!openTeam || !memberName.trim()) {
      toastError("Member name is required");
      return;
    }
    try {
      const res = await settingsApi.addTeamMember(openTeam.id, { name: memberName, role: memberRole, note: memberNote });
      setOpenTeam(res.data);
      setMemberName("");
      setMemberNote("");
      toastSuccess("Member added");
      load();
    } catch (error) {
      toastApiError(error);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-sans text-[11px] font-[510] uppercase tracking-[0.14em] text-[#959597]">Settings / Access Control / Team Access</p>
          <h1 className="mt-2 font-sans text-[28px] font-[590] uppercase tracking-[-0.03em] text-[#FDFDFF]">Team access</h1>
          <AccessSectionLinks current="teams" />
        </div>
        <button type="button" onClick={() => setAdding(true)} className="rounded-lg bg-white px-4 py-2 text-[11px] font-[590] uppercase text-black">Add team</button>
      </div>

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-5">
          <Stat value={summary.teams} label="Crews & departments" caption="Teams" />
          <Stat value={summary.members} label="Matches users list" caption="Members" />
          <Stat value={summary.regions} label={summary.regionNames} caption="Regions" />
          <Stat value={summary.custom} label={summary.customNames || "None"} caption="Custom access" />
          <Stat value={summary.unassigned} label="No team" caption="Unassigned" />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search teams, lead or region" className={`${fieldClass} max-w-sm`} />
        <button type="button" onClick={() => { setDraft(filters); setFilterOpen(true); }} className="rounded-lg border border-white/15 px-3 py-2 text-[11px] uppercase text-[#FDFDFF]">Filter {filtersOn ? "✓" : ""}</button>
        <div className="relative ml-auto">
          <button type="button" onClick={() => setSortOpen((open) => !open)} className="rounded-lg border border-white/15 px-3 py-2 text-[11px] uppercase text-[#FDFDFF]">Sort: {SORTS.find((item) => item.value === sort)?.label}</button>
          {sortOpen ? (
            <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-white/10 bg-[#1C1C1E] py-1">
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
          { label: `Field crews · ${summary?.field ?? 0}`, value: "FIELD" },
          { label: `HQ teams · ${summary?.hq ?? 0}`, value: "HQ" },
          { label: `Custom access · ${summary?.custom ?? 0}`, value: "CUSTOM" },
          { label: "All regions", value: "ALL" },
        ].map((chip) => (
          <button key={chip.value} type="button" onClick={() => setKind(chip.value)} className={cn("rounded-full border px-3 py-1 font-sans text-[10px] uppercase", kind === chip.value ? "border-white text-white" : "border-white/15 text-[#959597]")}>
            {chip.label}
          </button>
        ))}
      </div>

      <SettingsPanel>
        <div className="grid grid-cols-[1.1fr_1fr_70px_80px_1.1fr_90px_1fr_90px_80px] gap-2 border-b border-white/10 px-4 py-2 font-sans text-[10px] uppercase tracking-[0.08em] text-[#959597]">
          <span>Team</span><span>Lead</span><span>Members</span><span>Region</span><span>Modules</span><span>Dashboards</span><span>Owner</span><span>Access</span><span>Status</span>
        </div>
        {data?.items.map((row) => (
          <button key={row.id} type="button" onClick={() => setOpenTeam(row)} className="grid w-full grid-cols-[1.1fr_1fr_70px_80px_1.1fr_90px_1fr_90px_80px] items-center gap-2 border-b border-white/5 px-4 py-3 text-left font-sans text-[11px] uppercase text-[#FDFDFF] hover:bg-white/5">
            <div>
              <p className="font-[590]">{row.name}</p>
              <p className="text-[10px] text-[#959597]">{row.code}</p>
            </div>
            <span>{row.lead}</span>
            <span>{row.members}</span>
            <span>{row.region}</span>
            <span className="text-[#C8C8CC]">{row.modules}</span>
            <span>{row.dashboards}</span>
            <span className="text-[#7DD3FC]">{row.owner}</span>
            <span className={cn("w-fit rounded-full px-2 py-1 text-[10px]", row.access === "CUSTOM" ? "bg-[#3F3514] text-[#F5C451]" : "bg-[#312E81] text-[#C7D2FE]")}>{row.access}</span>
            <span className="w-fit rounded-full bg-[#14532D] px-2 py-1 text-[10px] text-[#86EFAC]">{row.status}</span>
          </button>
        ))}
      </SettingsPanel>

      {filterOpen ? (
        <div className="fixed inset-0 z-30 flex justify-end bg-black/40" onClick={() => setFilterOpen(false)}>
          <aside className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#141416] p-5" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <p className="font-sans text-[14px] font-[590] uppercase text-[#FDFDFF]">Filters</p>
              <button type="button" onClick={() => setFilterOpen(false)} className="text-[#C8C8CC]">×</button>
            </div>
            <Select label="Region" hint="Midland · Odessa · Pecos · HQ." value={draft.region} options={["ALL", ...(data?.regions ?? [])]} onChange={(region) => setDraft({ ...draft, region })} />
            <Select label="Access" hint="Standard · custom." value={draft.access} options={["ALL", "STANDARD", "CUSTOM"]} onChange={(access) => setDraft({ ...draft, access })} />
            <Select label="Owner" value={draft.owner} options={["ALL", ...(data?.owners ?? [])]} onChange={(owner) => setDraft({ ...draft, owner })} />
            <div className="mt-auto flex justify-end gap-2">
              <button type="button" onClick={() => setFilterOpen(false)} className="rounded-lg border border-white/15 px-4 py-2 text-[11px] uppercase text-[#FDFDFF]">Close</button>
              <button type="button" onClick={() => setDraft(emptyFilters)} className="rounded-lg border border-white/15 px-4 py-2 text-[11px] uppercase text-[#FDFDFF]">Clear all</button>
              <button type="button" onClick={() => { setFilters(draft); setFilterOpen(false); }} className="rounded-lg bg-white px-4 py-2 text-[11px] font-[590] uppercase text-black">Apply</button>
            </div>
          </aside>
        </div>
      ) : null}

      {adding ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4" onClick={() => setAdding(false)}>
          <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#1C1C1E] p-5" onClick={(event) => event.stopPropagation()}>
            <p className="font-sans text-[14px] font-[590] uppercase text-[#FDFDFF]">{editing ? "Edit team" : "Add team"}</p>
            <div className="mt-4 grid gap-3">
              <input className={fieldClass} placeholder="Team name" value={team.name} onChange={(event) => setTeam({ ...team, name: event.target.value })} />
              <input className={fieldClass} placeholder="Lead" value={team.lead} onChange={(event) => setTeam({ ...team, lead: event.target.value })} />
              <select className={fieldClass} value={team.region} onChange={(event) => setTeam({ ...team, region: event.target.value })}>
                {(data?.regions.length ? data.regions : ["MIDLAND", "ODESSA", "PECOS", "HQ"]).map((region) => <option key={region}>{region}</option>)}
              </select>
              <input className={fieldClass} placeholder="Modules" value={team.modules} onChange={(event) => setTeam({ ...team, modules: event.target.value })} />
              <input className={fieldClass} placeholder="Dashboards" value={team.dashboards} onChange={(event) => setTeam({ ...team, dashboards: event.target.value })} />
              <select className={fieldClass} value={team.owner} onChange={(event) => setTeam({ ...team, owner: event.target.value })}>
                {(data?.owners ?? ["S. NGUYEN"]).map((owner) => <option key={owner}>{owner}</option>)}
              </select>
              <select className={fieldClass} value={team.access} onChange={(event) => setTeam({ ...team, access: event.target.value })}>
                <option>STANDARD</option><option>CUSTOM</option>
              </select>
              <select className={fieldClass} value={team.kind} onChange={(event) => setTeam({ ...team, kind: event.target.value })}>
                <option value="FIELD">FIELD</option><option value="HQ">HQ</option>
              </select>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => { setAdding(false); setEditing(null); }} className="rounded-lg border border-white/15 px-4 py-2 text-[11px] uppercase text-[#FDFDFF]">Cancel</button>
              <button type="button" onClick={() => void createTeam()} className="rounded-lg bg-white px-4 py-2 text-[11px] font-[590] uppercase text-black">{editing ? "Save team" : "Add team"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {openTeam ? (
        <TeamDrawer
          team={openTeam}
          memberName={memberName}
          memberRole={memberRole}
          memberNote={memberNote}
          onName={setMemberName}
          onRole={setMemberRole}
          onNote={setMemberNote}
          onAdd={() => void addMember()}
          onEdit={() => startEdit(openTeam)}
          onClose={() => setOpenTeam(null)}
        />
      ) : null}
    </div>
  );
}

function parseProfile(raw: string): TeamProfile {
  try {
    return JSON.parse(raw) as TeamProfile;
  } catch {
    return { subtitle: "", ownerRole: "", accessNote: "", members: [], moduleAccess: "", dashboards: "", mobile: "", custom: [] };
  }
}

function TeamDrawer({ team, memberName, memberRole, memberNote, onName, onRole, onNote, onAdd, onEdit, onClose }: {
  team: AccessTeam;
  memberName: string;
  memberRole: string;
  memberNote: string;
  onName: (value: string) => void;
  onRole: (value: string) => void;
  onNote: (value: string) => void;
  onAdd: () => void;
  onEdit: () => void;
  onClose: () => void;
}) {
  const profile = parseProfile(team.profile);
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
      <aside className="h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#141416] p-5" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-sans text-[14px] font-[590] uppercase text-[#FDFDFF]">{team.name} · {team.code}</p>
            <p className="mt-1 font-sans text-[10px] uppercase text-[#959597]">{profile.subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="text-[#C8C8CC]">×</button>
        </div>
        <Detail label="Lead" value={team.lead} />
        <Detail label="Owner" value={`${team.owner}${profile.ownerRole ? ` · ${profile.ownerRole}` : ""}`} />
        <Detail label="Region" value={team.region} />
        <Detail label="Access" value={profile.accessNote || team.access} />
        <p className="mt-4 font-sans text-[10px] uppercase text-[#959597]">Members · {profile.members.length || team.members}</p>
        {profile.members.map((member) => (
          <div key={`${member.name}-${member.note}`} className="mt-2 flex items-center justify-between gap-2 border-b border-white/10 py-2">
            <div>
              <p className="font-sans text-[12px] uppercase text-[#FDFDFF]">{member.name}</p>
              <p className="font-sans text-[10px] uppercase text-[#959597]">{member.role}{member.note ? ` · ${member.note}` : ""}</p>
            </div>
            <span className="rounded-full bg-[#14532D] px-2 py-1 font-sans text-[10px] uppercase text-[#86EFAC]">{member.status}</span>
          </div>
        ))}
        <p className="mt-4 font-sans text-[10px] uppercase text-[#959597]">Module access</p>
        <Detail label="Modules" value={profile.moduleAccess || team.modules} />
        <Detail label="Dashboards" value={profile.dashboards || team.dashboards} />
        {profile.mobile ? <Detail label="Mobile app" value={profile.mobile} /> : null}
        {profile.custom.length ? (
          <>
            <p className="mt-4 font-sans text-[10px] uppercase text-[#F5C451]">Custom access · overrides the role defaults</p>
            {profile.custom.map((item) => <Detail key={item.label} label={item.label} value={item.detail} />)}
          </>
        ) : null}
        <div className="mt-4 grid gap-2">
          <input className={fieldClass} placeholder="Member name" value={memberName} onChange={(event) => onName(event.target.value)} />
          <input className={fieldClass} placeholder="Role" value={memberRole} onChange={(event) => onRole(event.target.value)} />
          <input className={fieldClass} placeholder="Note" value={memberNote} onChange={(event) => onNote(event.target.value)} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onAdd} className="rounded-lg bg-[#3A3A3C] px-3 py-2 font-sans text-[11px] uppercase text-[#FDFDFF]">Add member</button>
          <button type="button" onClick={onEdit} className="rounded-lg bg-white px-3 py-2 font-sans text-[11px] uppercase text-black">Edit team</button>
        </div>
      </aside>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 border-b border-white/10 py-2 font-sans text-[11px] uppercase">
      <span className="text-[#959597]">{label}</span>
      <span className="text-right text-[#FDFDFF]">{value}</span>
    </div>
  );
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
