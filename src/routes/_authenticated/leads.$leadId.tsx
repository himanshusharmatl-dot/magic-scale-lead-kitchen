import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format, formatDistanceToNow, isBefore } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarPlus,
  Check,
  MessageSquareText,
  Pencil,
  Phone,
  Store,
  UserRound,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, SourceLabel } from "@/components/crm/status-badge";
import { LeadFormDialog } from "@/components/crm/lead-form-dialog";
import { FollowUpDialog } from "@/components/crm/follow-up-dialog";
import { SimpleSelect, toOptions } from "@/components/crm/simple-select";
import { crm } from "@/lib/crm";
import { activitiesQuery, executivesQuery, followUpsQuery, leadsQuery, useCrmMutation } from "@/lib/crm/queries";
import { findDuplicateLeads } from "@/lib/crm/phone";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/leads/$leadId")({
  loader: async ({ context, params }) => {
    const leads = await context.queryClient.ensureQueryData(leadsQuery);
    if (!leads.some((l) => l.id === params.leadId)) throw notFound();
    await context.queryClient.ensureQueryData(activitiesQuery(params.leadId));
  },
  head: () => ({
    meta: [
      { title: "Lead details — Magic Scale CRM" },
      { name: "description", content: "Lead profile, follow-ups and activity history." },
      { property: "og:title", content: "Lead details — Magic Scale CRM" },
      { property: "og:description", content: "Lead profile, follow-ups and activity history." },
    ],
  }),
  notFoundComponent: () => (
    <div className="py-20 text-center">
      <h1 className="text-xl font-semibold">Lead not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">It may have been deleted.</p>
      <Button asChild className="mt-6" variant="outline"><Link to="/leads">Back to leads</Link></Button>
    </div>
  ),
  component: LeadDetail,
});

const UNASSIGNED = "__none";

function LeadDetail() {
  const { leadId } = Route.useParams();
  const { data: leads } = useSuspenseQuery(leadsQuery);
  const { data: executives } = useSuspenseQuery(executivesQuery);
  const { data: followUps } = useSuspenseQuery(followUpsQuery);
  const { data: activities } = useSuspenseQuery(activitiesQuery(leadId));
  const lead = leads.find((l) => l.id === leadId);
  const [note, setNote] = useState("");

  const setStatus = useCrmMutation((s: LeadStatus) => crm.setLeadStatus(leadId, s), { success: (_, s) => `Status set to ${s}` });
  const setExec = useCrmMutation(
    (id: string | null) => (id ? crm.assignLeads([leadId], id) : crm.updateLead(leadId, { executiveId: null })),
    { success: "Assignment updated" },
  );
  const addNote = useCrmMutation((m: string) => crm.addNote(leadId, m), { success: "Note added" });
  const complete = useCrmMutation((id: string) => crm.completeFollowUp(id, "Done"), { success: "Follow-up completed" });

  if (!lead) return null;
  const duplicates = findDuplicateLeads(leads, lead.phone, lead.id);
  const myFollowUps = followUps.filter((f) => f.leadId === lead.id).sort((a, b) => b.dueAt.localeCompare(a.dueAt));
  const exec = executives.find((e) => e.id === lead.executiveId);

  const details = [
    { label: "Customer", value: lead.customerName, icon: UserRound },
    { label: "Phone", value: lead.phone, icon: Phone },
    { label: "Restaurant", value: lead.restaurantName, icon: Store },
  ];

  return (
    <div className="space-y-6">
      <Link to="/leads" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All leads
      </Link>

      <div className="flex flex-col gap-4 rounded-2xl bg-gradient-ink p-6 text-ink-foreground shadow-elevated sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={lead.status} />
            {duplicates.length > 0 && <Badge variant="warning">Duplicate number</Badge>}
          </div>
          <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">{lead.restaurantName}</h1>
          <p className="mt-1 text-sm opacity-75">
            {lead.cuisine} · {lead.city} · added {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <a href={`tel:${lead.phone.replace(/\s/g, "")}`}><Phone /> Call</a>
          </Button>
          <FollowUpDialog lead={lead} trigger={<Button variant="brand"><CalendarPlus /> Follow-up</Button>} />
          <LeadFormDialog lead={lead} trigger={<Button variant="secondary"><Pencil /> Edit</Button>} />
        </div>
      </div>

      {duplicates.length > 0 && (
        <div className="flex gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
          <div>
            <p className="font-semibold text-warning-foreground">Same phone number found on other leads</p>
            <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {duplicates.map((d) => (
                <li key={d.id}>
                  <Link to="/leads/$leadId" params={{ leadId: d.id }} className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                    {d.restaurantName} ({d.status})
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display text-base">Lead details</CardTitle></CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-3">
              {details.map((d) => (
                <div key={d.label}>
                  <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground"><d.icon className="h-3.5 w-3.5" />{d.label}</p>
                  <p className="mt-1 font-semibold tabular">{d.value}</p>
                </div>
              ))}
              <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Service required</p><p className="mt-1 font-semibold">{lead.service}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Cuisine</p><p className="mt-1 font-semibold">{lead.cuisine}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Source</p><div className="mt-1"><SourceLabel source={lead.source} /></div></div>
              <div className="sm:col-span-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Remarks</p>
                <p className="mt-1 text-sm leading-relaxed">{lead.remarks || <span className="text-muted-foreground">No remarks yet.</span>}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display text-base">Follow-ups</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {myFollowUps.length === 0 && <p className="text-sm text-muted-foreground">No follow-ups scheduled.</p>}
              {myFollowUps.map((f) => {
                const overdue = f.status === "pending" && isBefore(new Date(f.dueAt), new Date());
                return (
                  <div key={f.id} className={cn("flex items-center justify-between gap-3 rounded-lg border p-3", f.status === "done" && "bg-muted/40")}>
                    <div className="min-w-0">
                      <p className={cn("text-sm font-medium", f.status === "done" && "text-muted-foreground line-through")}>{f.note || "Call back"}</p>
                      <p className={cn("text-xs", overdue ? "text-destructive" : "text-muted-foreground")}>
                        {format(new Date(f.dueAt), "EEE, d MMM · h:mm a")}
                        {overdue && " · overdue"}
                        {f.status === "done" && f.outcome && ` · ${f.outcome}`}
                      </p>
                    </div>
                    {f.status === "pending" ? (
                      <Button size="sm" variant="outline" onClick={() => complete.mutate(f.id)}><Check /> Done</Button>
                    ) : (
                      <Badge variant="success">Done</Badge>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display text-base">Status & owner</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                <SimpleSelect value={lead.status} onChange={(v) => setStatus.mutate(v as LeadStatus)} options={toOptions(LEAD_STATUSES)} />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assigned executive</p>
                <SimpleSelect
                  value={lead.executiveId ?? UNASSIGNED}
                  onChange={(v) => setExec.mutate(v === UNASSIGNED ? null : v)}
                  options={[{ value: UNASSIGNED, label: "Unassigned" }, ...executives.filter((e) => e.active || e.id === lead.executiveId).map((e) => ({ value: e.id, label: e.name }))]}
                />
                {exec && (
                  <p className="text-xs text-muted-foreground">
                    {lead.assignmentMode === "auto" ? "Assigned by round robin" : "Assigned manually"} · {exec.phone}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display text-base">Activity</CardTitle></CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!note.trim()) return;
                  addNote.mutate(note.trim(), { onSuccess: () => setNote("") });
                }}
                className="mb-5 space-y-2"
              >
                <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a call note…" />
                <Button type="submit" size="sm" variant="secondary" disabled={!note.trim() || addNote.isPending}>
                  <MessageSquareText /> Add note
                </Button>
              </form>
              <ol className="relative space-y-4 border-l pl-4">
                {activities.map((a) => (
                  <li key={a.id} className="relative">
                    <span className={cn("absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-card", a.type === "note" ? "bg-teal" : a.type === "status" ? "bg-primary" : a.type === "assigned" ? "bg-info" : "bg-muted-foreground/50")} />
                    <p className="text-sm">{a.message}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(a.createdAt), "d MMM yyyy, h:mm a")}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
