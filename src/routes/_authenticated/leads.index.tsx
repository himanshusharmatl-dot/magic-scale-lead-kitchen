import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  MoreHorizontal,
  Plus,
  Search,
  Shuffle,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/crm/page-header";
import { StatusBadge, SourceLabel } from "@/components/crm/status-badge";
import { ExecutiveName } from "@/components/crm/executive-avatar";
import { LeadFormDialog } from "@/components/crm/lead-form-dialog";
import { SimpleSelect, toOptions } from "@/components/crm/simple-select";
import { crm } from "@/lib/crm";
import { executivesQuery, leadsQuery, useCrmMutation } from "@/lib/crm/queries";
import { duplicateLeadIds } from "@/lib/crm/phone";
import { filterLeads, type LeadFilters } from "@/lib/crm/filters";
import { downloadCsv } from "@/lib/crm/csv";
import { CITIES, LEAD_SOURCES, LEAD_STATUSES, type Lead, type LeadStatus } from "@/lib/crm/types";

const PAGE_SIZE = 25;
const ALL = "__all";

type Search = LeadFilters & { page?: number };

export const Route = createFileRoute("/_authenticated/leads/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" && s.q ? s.q : undefined,
    status: typeof s.status === "string" && s.status ? s.status : undefined,
    source: typeof s.source === "string" && s.source ? s.source : undefined,
    executive: typeof s.executive === "string" && s.executive ? s.executive : undefined,
    city: typeof s.city === "string" && s.city ? s.city : undefined,
    dup: s.dup === true || s.dup === "true" ? true : undefined,
    page: typeof s.page === "number" && s.page > 1 ? s.page : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Leads — Magic Scale CRM" },
      { name: "description", content: "Search, filter and manage restaurant onboarding leads." },
      { property: "og:title", content: "Leads — Magic Scale CRM" },
      { property: "og:description", content: "Search, filter and manage restaurant onboarding leads." },
    ],
  }),
  component: LeadsPage,
});

function LeadsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/leads/" });
  const { data: leads } = useSuspenseQuery(leadsQuery);
  const { data: executives } = useSuspenseQuery(executivesQuery);
  const execById = useMemo(() => new Map(executives.map((e) => [e.id, e])), [executives]);
  const dupIds = useMemo(() => duplicateLeadIds(leads), [leads]);
  const filtered = useMemo(() => filterLeads(leads, search, dupIds), [leads, search, dupIds]);

  const [q, setQ] = useState(search.q ?? "");
  useEffect(() => setQ(search.q ?? ""), [search.q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if ((search.q ?? "") !== q.trim()) setSearch({ q: q.trim() || undefined });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState<Lead | null>(null);

  const page = search.page ?? 1;
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function setSearch(patch: Partial<Search>) {
    navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }), replace: true });
    setSelected(new Set());
  }
  const hasFilters = !!(search.q || search.status || search.source || search.executive || search.city || search.dup);

  const assign = useCrmMutation(
    ({ ids, executiveId }: { ids: string[]; executiveId: string }) => crm.assignLeads(ids, executiveId),
    { success: (_, a) => `${a.ids.length} lead(s) assigned to ${execById.get(a.executiveId)?.name}` },
  );
  const autoAssign = useCrmMutation((ids: string[]) => crm.autoAssignLeads(ids), {
    success: (n) => `${n} lead(s) distributed by round robin`,
  });
  const bulkStatus = useCrmMutation(
    async ({ ids, status }: { ids: string[]; status: LeadStatus }) => {
      for (const id of ids) await crm.setLeadStatus(id, status);
    },
    { success: "Status updated" },
  );
  const remove = useCrmMutation((id: string) => crm.deleteLead(id), { success: "Lead deleted" });

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () =>
    setSelected((s) => {
      const next = new Set(s);
      if (allOnPageSelected) rows.forEach((r) => next.delete(r.id));
      else rows.forEach((r) => next.add(r.id));
      return next;
    });
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  function exportCsv() {
    downloadCsv(`magic-scale-leads-${format(new Date(), "yyyy-MM-dd")}.csv`, [
      ["Customer", "Phone", "Restaurant", "City", "Cuisine", "Service", "Source", "Executive", "Status", "Remarks", "Created"],
      ...filtered.map((l) => [
        l.customerName, l.phone, l.restaurantName, l.city, l.cuisine, l.service, l.source,
        execById.get(l.executiveId ?? "")?.name ?? "", l.status, l.remarks, format(new Date(l.createdAt), "yyyy-MM-dd HH:mm"),
      ]),
    ]);
  }

  const activeExecs = executives.filter((e) => e.active);
  const ids = [...selected];

  return (
    <div>
      <PageHeader
        title="Leads"
        description={`${filtered.length} of ${leads.length} leads${dupIds.size ? ` · ${dupIds.size} share a phone number` : ""}`}
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}>
              <Download /> Export
            </Button>
            <LeadFormDialog trigger={<Button><Plus /> New lead</Button>} />
          </>
        }
      />

      <div className="rounded-xl border bg-card shadow-card">
        <div className="flex flex-col gap-3 border-b p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone, restaurant or remark…" className="pl-9" aria-label="Search leads" />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
              <SimpleSelect className="lg:w-44" value={search.status ?? ALL} onChange={(v) => setSearch({ status: v === ALL ? undefined : v })} options={[{ value: ALL, label: "All statuses" }, ...toOptions(LEAD_STATUSES)]} />
              <SimpleSelect className="lg:w-40" value={search.source ?? ALL} onChange={(v) => setSearch({ source: v === ALL ? undefined : v })} options={[{ value: ALL, label: "All sources" }, ...toOptions(LEAD_SOURCES)]} />
              <SimpleSelect className="lg:w-44" value={search.executive ?? ALL} onChange={(v) => setSearch({ executive: v === ALL ? undefined : v })} options={[{ value: ALL, label: "All executives" }, { value: "unassigned", label: "Unassigned" }, ...executives.map((e) => ({ value: e.id, label: e.name }))]} />
              <SimpleSelect className="lg:w-36" value={search.city ?? ALL} onChange={(v) => setSearch({ city: v === ALL ? undefined : v })} options={[{ value: ALL, label: "All cities" }, ...toOptions(CITIES)]} />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch checked={!!search.dup} onCheckedChange={(v) => setSearch({ dup: v || undefined })} />
              Show duplicate phone numbers only
            </label>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setQ(""); navigate({ search: {}, replace: true }); }}>
                <X /> Clear filters
              </Button>
            )}
          </div>
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b bg-accent/60 px-4 py-2.5 text-sm">
            <span className="font-semibold">{selected.size} selected</span>
            <span className="mx-1 h-4 w-px bg-border" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline"><UserPlus /> Assign to</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-72 overflow-y-auto">
                {activeExecs.map((e) => (
                  <DropdownMenuItem key={e.id} onClick={() => assign.mutate({ ids, executiveId: e.id }, { onSuccess: () => setSelected(new Set()) })}>
                    {e.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="outline" onClick={() => autoAssign.mutate(ids, { onSuccess: () => setSelected(new Set()) })}>
              <Shuffle /> Round robin
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">Change status</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {LEAD_STATUSES.map((s) => (
                  <DropdownMenuItem key={s} onClick={() => bulkStatus.mutate({ ids, status: s }, { onSuccess: () => setSelected(new Set()) })}>
                    {s}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="w-10 px-4 py-3"><Checkbox checked={allOnPageSelected} onCheckedChange={toggleAll} aria-label="Select all" /></th>
                <th className="px-3 py-3 font-semibold">Restaurant</th>
                <th className="px-3 py-3 font-semibold">Customer</th>
                <th className="px-3 py-3 font-semibold">City</th>
                <th className="px-3 py-3 font-semibold">Service</th>
                <th className="px-3 py-3 font-semibold">Source</th>
                <th className="px-3 py-3 font-semibold">Executive</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Added</th>
                <th className="w-10 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-muted-foreground">
                    No leads match these filters.
                  </td>
                </tr>
              )}
              {rows.map((l) => (
                <tr key={l.id} className="border-b last:border-0 transition-colors hover:bg-muted/40" data-state={selected.has(l.id) ? "selected" : undefined}>
                  <td className="px-4 py-3"><Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggle(l.id)} aria-label={`Select ${l.restaurantName}`} /></td>
                  <td className="px-3 py-3">
                    <Link to="/leads/$leadId" params={{ leadId: l.id }} className="font-semibold text-foreground hover:text-primary">
                      {l.restaurantName}
                    </Link>
                    <p className="text-xs text-muted-foreground">{l.cuisine}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium">{l.customerName}</p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground tabular">
                      {l.phone}
                      {dupIds.has(l.id) && (
                        <Badge variant="warning" className="px-1.5 py-0 text-[10px]"><Copy className="h-2.5 w-2.5" /> Duplicate</Badge>
                      )}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{l.city}</td>
                  <td className="max-w-[180px] px-3 py-3"><span className="line-clamp-2">{l.service}</span></td>
                  <td className="px-3 py-3"><SourceLabel source={l.source} /></td>
                  <td className="px-3 py-3"><ExecutiveName name={execById.get(l.executiveId ?? "")?.name} /></td>
                  <td className="px-3 py-3"><StatusBadge status={l.status} /></td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">{format(new Date(l.createdAt), "d MMM, h:mm a")}</td>
                  <td className="px-3 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Lead actions"><MoreHorizontal /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild><Link to="/leads/$leadId" params={{ leadId: l.id }}>Open lead</Link></DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditing(l)}>Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(l)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
          <span>
            Page {page} of {pages}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => navigate({ search: (p) => ({ ...p, page: page - 1 > 1 ? page - 1 : undefined }) })} aria-label="Previous page"><ChevronLeft /></Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pages} onClick={() => navigate({ search: (p) => ({ ...p, page: page + 1 }) })} aria-label="Next page"><ChevronRight /></Button>
          </div>
        </div>
      </div>

      {editing && <LeadFormDialog lead={editing} open={!!editing} onOpenChange={(o) => !o && setEditing(null)} />}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.restaurantName} and its follow-ups will be removed permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleting && remove.mutate(deleting.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
