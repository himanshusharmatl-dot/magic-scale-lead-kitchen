import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, Shuffle, UserCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/crm/page-header";
import { ExecutiveAvatar } from "@/components/crm/executive-avatar";
import { SimpleSelect } from "@/components/crm/simple-select";
import { crm } from "@/lib/crm";
import { executivesQuery, leadsQuery, settingsQuery, useCrmMutation } from "@/lib/crm/queries";
import { rotationPool, upcomingQueue } from "@/lib/crm/assignment";

export const Route = createFileRoute("/_authenticated/assignment")({
  head: () => ({
    meta: [
      { title: "Lead assignment — Magic Scale CRM" },
      { name: "description", content: "Manual and round-robin lead assignment for the sales team." },
      { property: "og:title", content: "Lead assignment — Magic Scale CRM" },
      { property: "og:description", content: "Manual and round-robin lead assignment for the sales team." },
    ],
  }),
  component: AssignmentPage,
});

function AssignmentPage() {
  const { data: leads } = useSuspenseQuery(leadsQuery);
  const { data: executives } = useSuspenseQuery(executivesQuery);
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const pool = useMemo(() => rotationPool(executives), [executives]);
  const queue = upcomingQueue(pool, settings.lastAssignedExecutiveId);
  const unassigned = leads.filter((l) => !l.executiveId);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manualExec, setManualExec] = useState("");

  const loadByExec = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of leads) if (l.executiveId) m.set(l.executiveId, (m.get(l.executiveId) ?? 0) + 1);
    return m;
  }, [leads]);

  const updateSettings = useCrmMutation((autoAssign: boolean) => crm.updateSettings({ autoAssign }), {
    success: (s) => (s.autoAssign ? "Automatic round robin turned on" : "Automatic assignment turned off"),
  });
  const toggleRotation = useCrmMutation(({ id, v }: { id: string; v: boolean }) => crm.updateExecutive(id, { inRotation: v }));
  const distribute = useCrmMutation((ids: string[]) => crm.autoAssignLeads(ids), {
    success: (n) => `${n} lead(s) distributed by round robin`,
  });
  const assign = useCrmMutation(({ ids, id }: { ids: string[]; id: string }) => crm.assignLeads(ids, id), {
    success: (_, a) => `${a.ids.length} lead(s) assigned`,
  });

  const ids = selected.size ? [...selected] : unassigned.map((l) => l.id);
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="space-y-6">
      <PageHeader title="Lead assignment" description="Decide how new enquiries reach your executives." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden shadow-card lg:col-span-2">
          <div className="flex flex-col gap-4 bg-gradient-ink p-6 text-ink-foreground sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-brand shadow-brand">
                <Shuffle className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-lg font-semibold">Automatic round robin</p>
                <p className="mt-0.5 text-sm opacity-75">
                  New leads go to the next executive in the queue, one by one, so everyone gets a fair share.
                </p>
              </div>
            </div>
            <Switch checked={settings.autoAssign} onCheckedChange={(v) => updateSettings.mutate(v)} aria-label="Automatic round robin" />
          </div>
          <CardContent className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Queue order <span className="font-normal text-muted-foreground">· {pool.length} executives</span></p>
              <Button asChild variant="ghost" size="sm"><Link to="/executives">Manage team</Link></Button>
            </div>
            {queue.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No executives in the round robin. Add some below.</p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {queue.map((e, i) => (
                  <div key={e.id} className={i === 0 ? "min-w-[150px] rounded-lg border-2 border-primary bg-accent p-3" : "min-w-[150px] rounded-lg border bg-card p-3"}>
                    <div className="flex items-center justify-between">
                      <ExecutiveAvatar name={e.name} />
                      {i === 0 ? <Badge variant="brand">Next</Badge> : <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>}
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold">{e.name}</p>
                    <p className="text-xs text-muted-foreground">{loadByExec.get(e.id) ?? 0} leads</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base">Who's in the rotation</CardTitle>
            <CardDescription>Inactive executives are skipped automatically.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[340px] space-y-1 overflow-y-auto">
            {executives.map((e) => (
              <label key={e.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-muted">
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  <ExecutiveAvatar name={e.name} className="h-7 w-7 text-[10px]" />
                  <span className="truncate">{e.name}</span>
                  {!e.active && <Badge variant="neutral" className="text-[10px]">Inactive</Badge>}
                </span>
                <Switch checked={e.inRotation} disabled={!e.active} onCheckedChange={(v) => toggleRotation.mutate({ id: e.id, v })} aria-label={`${e.name} in round robin`} />
              </label>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader className="flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-display text-base">Unassigned leads ({unassigned.length})</CardTitle>
            <CardDescription>
              {selected.size ? `${selected.size} selected` : "Actions apply to all unassigned leads unless you select some."}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SimpleSelect className="w-48" value={manualExec} onChange={setManualExec} placeholder="Choose executive" options={executives.filter((e) => e.active).map((e) => ({ value: e.id, label: e.name }))} />
            <Button variant="outline" disabled={!manualExec || ids.length === 0} onClick={() => assign.mutate({ ids, id: manualExec }, { onSuccess: () => setSelected(new Set()) })}>
              <UserCheck /> Assign
            </Button>
            <Button disabled={ids.length === 0 || pool.length === 0} onClick={() => distribute.mutate(ids, { onSuccess: () => setSelected(new Set()) })}>
              <Shuffle /> Distribute by round robin
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {unassigned.length === 0 ? (
            <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">Every lead has an owner. 🎉</p>
          ) : (
            <div className="divide-y rounded-lg border">
              {unassigned.map((l) => (
                <label key={l.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-muted/40">
                  <Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggle(l.id)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{l.restaurantName}</p>
                    <p className="truncate text-xs text-muted-foreground">{l.customerName} · {l.city} · {l.service}</p>
                  </div>
                  <span className="hidden text-xs text-muted-foreground sm:block">{formatDistanceToNow(new Date(l.createdAt), { addSuffix: true })}</span>
                  <Link to="/leads/$leadId" params={{ leadId: l.id }} className="text-muted-foreground hover:text-primary" aria-label="Open lead">
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
