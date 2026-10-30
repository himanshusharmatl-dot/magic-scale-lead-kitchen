import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { addDays, endOfDay, format, isBefore, isSameDay, startOfDay } from "date-fns";
import { CalendarClock, Check, Clock, Phone } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/crm/page-header";
import { StatusBadge } from "@/components/crm/status-badge";
import { ExecutiveName } from "@/components/crm/executive-avatar";
import { SimpleSelect, toOptions } from "@/components/crm/simple-select";
import { crm } from "@/lib/crm";
import { executivesQuery, followUpsQuery, leadsQuery, useCrmMutation } from "@/lib/crm/queries";
import { LEAD_STATUSES, type FollowUp, type LeadStatus } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/follow-ups")({
  head: () => ({
    meta: [
      { title: "Follow-ups — Magic Scale CRM" },
      { name: "description", content: "Overdue, today's and upcoming lead follow-ups." },
      { property: "og:title", content: "Follow-ups — Magic Scale CRM" },
      { property: "og:description", content: "Overdue, today's and upcoming lead follow-ups." },
    ],
  }),
  component: FollowUpsPage,
});

type Tab = "overdue" | "today" | "upcoming" | "done";
const ALL = "__all";
const KEEP = "__keep";

function FollowUpsPage() {
  const { data: followUps } = useSuspenseQuery(followUpsQuery);
  const { data: leads } = useSuspenseQuery(leadsQuery);
  const { data: executives } = useSuspenseQuery(executivesQuery);
  const leadById = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads]);
  const execById = useMemo(() => new Map(executives.map((e) => [e.id, e])), [executives]);
  const [tab, setTab] = useState<Tab>("today");
  const [exec, setExec] = useState(ALL);
  const [completing, setCompleting] = useState<FollowUp | null>(null);

  const now = new Date();
  const buckets = useMemo(() => {
    const scoped = followUps.filter((f) => exec === ALL || f.executiveId === exec);
    const pending = scoped.filter((f) => f.status === "pending");
    return {
      overdue: pending.filter((f) => isBefore(new Date(f.dueAt), startOfDay(now))),
      today: pending.filter((f) => isSameDay(new Date(f.dueAt), now)),
      upcoming: pending.filter((f) => !isBefore(new Date(f.dueAt), endOfDay(now))),
      done: scoped.filter((f) => f.status === "done").sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followUps, exec]);

  const reschedule = useCrmMutation(({ id, days }: { id: string; days: number }) => {
    const d = addDays(new Date(), days);
    d.setHours(11, 0, 0, 0);
    return crm.rescheduleFollowUp(id, d.toISOString());
  }, { success: "Follow-up rescheduled" });

  const list = buckets[tab];

  return (
    <div>
      <PageHeader
        title="Follow-ups"
        description="Stay on top of every callback promised to a restaurant owner."
        actions={
          <SimpleSelect className="w-56" value={exec} onChange={setExec} options={[{ value: ALL, label: "All executives" }, ...executives.map((e) => ({ value: e.id, label: e.name }))]} />
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mb-4">
        <TabsList className="h-auto flex-wrap bg-secondary p-1">
          {([
            ["overdue", "Overdue"],
            ["today", "Today"],
            ["upcoming", "Upcoming"],
            ["done", "Completed"],
          ] as const).map(([k, label]) => (
            <TabsTrigger key={k} value={k} className="gap-2 data-[state=active]:shadow-card">
              {label}
              <span className={cn("rounded-full px-1.5 text-[11px] font-bold tabular", k === "overdue" && buckets.overdue.length ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground")}>
                {buckets[k].length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="space-y-2">
        {list.length === 0 && (
          <div className="rounded-xl border border-dashed bg-card py-16 text-center">
            <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">No follow-ups here.</p>
          </div>
        )}
        {list.map((f) => {
          const lead = leadById.get(f.leadId);
          if (!lead) return null;
          const overdue = tab === "overdue";
          return (
            <div key={f.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-card md:flex-row md:items-center">
              <div className={cn("flex w-28 shrink-0 flex-col rounded-lg px-3 py-2 text-center", overdue ? "bg-destructive/10 text-destructive" : tab === "done" ? "bg-success/10 text-success" : "bg-warning/15 text-warning-foreground")}>
                <span className="text-xs font-semibold uppercase">{format(new Date(f.dueAt), "EEE d MMM")}</span>
                <span className="font-display text-lg font-semibold">{format(new Date(f.dueAt), "h:mm a")}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to="/leads/$leadId" params={{ leadId: lead.id }} className="font-semibold hover:text-primary">{lead.restaurantName}</Link>
                  <StatusBadge status={lead.status} />
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {f.note || "Call back"}
                  {f.status === "done" && f.outcome && <> · <span className="text-foreground">{f.outcome}</span></>}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{lead.customerName}</span>
                  <span className="tabular">{lead.phone}</span>
                  <ExecutiveName name={execById.get(f.executiveId ?? "")?.name} />
                </div>
              </div>
              {f.status === "pending" && (
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline"><a href={`tel:${lead.phone.replace(/\s/g, "")}`}><Phone /> Call</a></Button>
                  <Button size="sm" variant="outline" onClick={() => reschedule.mutate({ id: f.id, days: 1 })}><Clock /> Tomorrow</Button>
                  <Button size="sm" variant="success" onClick={() => setCompleting(f)}><Check /> Done</Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <CompleteDialog followUp={completing} onClose={() => setCompleting(null)} currentStatus={completing ? leadById.get(completing.leadId)?.status : undefined} />
    </div>
  );
}

function CompleteDialog({ followUp, onClose, currentStatus }: { followUp: FollowUp | null; onClose: () => void; currentStatus?: LeadStatus }) {
  const [outcome, setOutcome] = useState("");
  const [status, setStatus] = useState<string>(KEEP);
  const done = useCrmMutation(async () => {
    if (!followUp) return;
    await crm.completeFollowUp(followUp.id, outcome.trim());
    if (status !== KEEP) await crm.setLeadStatus(followUp.leadId, status as LeadStatus);
  }, { success: "Follow-up completed" });

  return (
    <Dialog open={!!followUp} onOpenChange={(o) => { if (!o) { onClose(); setOutcome(""); setStatus(KEEP); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Complete follow-up</DialogTitle>
          <DialogDescription>Record what happened on the call.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="outcome">Outcome</Label>
            <Input id="outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="e.g. Quotation accepted, sending invoice" />
          </div>
          <div className="space-y-1.5">
            <Label>Update lead status</Label>
            <SimpleSelect value={status} onChange={setStatus} options={[{ value: KEEP, label: `Keep as ${currentStatus ?? "is"}` }, ...toOptions(LEAD_STATUSES)]} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="success" disabled={done.isPending} onClick={async () => { await done.mutateAsync(undefined); onClose(); setOutcome(""); setStatus(KEEP); }}>
            Mark done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
