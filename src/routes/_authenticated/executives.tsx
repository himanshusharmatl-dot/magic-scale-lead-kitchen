import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Mail, MapPin, Pencil, Phone, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/crm/page-header";
import { ExecutiveAvatar } from "@/components/crm/executive-avatar";
import { ExecutiveFormDialog } from "@/components/crm/executive-form-dialog";
import { SimpleSelect } from "@/components/crm/simple-select";
import { crm } from "@/lib/crm";
import { executivesQuery, followUpsQuery, leadsQuery, useCrmMutation } from "@/lib/crm/queries";
import { executivePerformance } from "@/lib/crm/stats";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/executives")({
  head: () => ({
    meta: [
      { title: "Executives — Magic Scale CRM" },
      { name: "description", content: "Manage Magic Scale sales executives and their lead load." },
      { property: "og:title", content: "Executives — Magic Scale CRM" },
      { property: "og:description", content: "Manage Magic Scale sales executives and their lead load." },
    ],
  }),
  component: ExecutivesPage,
});

function ExecutivesPage() {
  const { data: executives } = useSuspenseQuery(executivesQuery);
  const { data: leads } = useSuspenseQuery(leadsQuery);
  const { data: followUps } = useSuspenseQuery(followUpsQuery);
  const [q, setQ] = useState("");
  const [show, setShow] = useState("all");

  const perf = useMemo(() => executivePerformance(executives, leads, followUps), [executives, leads, followUps]);
  const filtered = perf.filter(({ executive: e }) => {
    if (show === "active" && !e.active) return false;
    if (show === "inactive" && e.active) return false;
    if (show === "rotation" && !e.inRotation) return false;
    const t = q.trim().toLowerCase();
    return !t || `${e.name} ${e.email} ${e.city} ${e.role}`.toLowerCase().includes(t);
  });

  const toggle = useCrmMutation(
    ({ id, patch }: { id: string; patch: { active?: boolean; inRotation?: boolean } }) => crm.updateExecutive(id, patch),
    { success: "Executive updated" },
  );

  const activeCount = executives.filter((e) => e.active).length;
  const rotationCount = executives.filter((e) => e.inRotation).length;

  return (
    <div>
      <PageHeader
        title="Executives"
        description={`${executives.length} team members · ${activeCount} active · ${rotationCount} in round robin`}
        actions={<ExecutiveFormDialog trigger={<Button><Plus /> Add executive</Button>} />}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email or city…" className="bg-card pl-9" />
        </div>
        <SimpleSelect
          className="sm:w-52"
          value={show}
          onChange={setShow}
          options={[
            { value: "all", label: "All executives" },
            { value: "active", label: "Active only" },
            { value: "rotation", label: "In round robin" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map(({ executive: e, assigned, open, converted, pendingFollowUps, conversionRate }) => (
          <div key={e.id} className={cn("rounded-xl border bg-card p-5 shadow-card", !e.active && "opacity-70")}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <ExecutiveAvatar name={e.name} className="h-11 w-11 text-sm" />
                <div>
                  <p className="font-semibold">{e.name}</p>
                  <p className="text-xs text-muted-foreground">{e.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {e.active ? <Badge variant="success">Active</Badge> : <Badge variant="neutral">Inactive</Badge>}
                <ExecutiveFormDialog executive={e} trigger={<Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${e.name}`}><Pencil /></Button>} />
              </div>
            </div>

            <div className="mt-4 space-y-1 text-xs text-muted-foreground">
              <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{e.email}</p>
              <p className="flex items-center gap-2 tabular"><Phone className="h-3.5 w-3.5" />{e.phone}</p>
              <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{e.city}</p>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2 rounded-lg bg-muted/60 p-3 text-center">
              {[
                ["Leads", assigned],
                ["Open", open],
                ["Won", converted],
                ["Rate", `${conversionRate}%`],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="font-display text-base font-semibold tabular">{v}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{l}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2 border-t pt-4 text-sm">
              <label className="flex items-center gap-2">
                <Switch checked={e.inRotation} disabled={!e.active} onCheckedChange={(v) => toggle.mutate({ id: e.id, patch: { inRotation: v } })} aria-label="Include in round robin" />
                <span className="text-muted-foreground">Round robin</span>
              </label>
              <label className="flex items-center gap-2">
                <span className="text-muted-foreground">Active</span>
                <Switch checked={e.active} onCheckedChange={(v) => toggle.mutate({ id: e.id, patch: { active: v } })} aria-label="Active" />
              </label>
            </div>
            <Link to="/leads" search={{ executive: e.id }} className="mt-3 block text-xs font-semibold text-primary hover:underline">
              View {assigned} leads{pendingFollowUps ? ` · ${pendingFollowUps} follow-ups pending` : ""} →
            </Link>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">No executives match.</p>}
    </div>
  );
}
