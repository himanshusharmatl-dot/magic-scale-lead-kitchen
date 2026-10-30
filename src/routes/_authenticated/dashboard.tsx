import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow, isBefore, isSameDay, startOfDay, subDays } from "date-fns";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CircleSlash,
  Layers,
  Sparkles,
  Shuffle,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/crm/stat-card";
import { StatusBadge } from "@/components/crm/status-badge";
import { ExecutiveName } from "@/components/crm/executive-avatar";
import { executivesQuery, followUpsQuery, leadsQuery } from "@/lib/crm/queries";
import { computeLeadStats, conversionRate } from "@/lib/crm/stats";
import { LEAD_SOURCES, LEAD_STATUSES, STATUS_TONE } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Magic Scale CRM" },
      { name: "description", content: "Lead pipeline overview for Magic Scale's restaurant growth team." },
      { property: "og:title", content: "Dashboard — Magic Scale CRM" },
      { property: "og:description", content: "Lead pipeline overview for Magic Scale's restaurant growth team." },
    ],
  }),
  component: Dashboard,
});

const BAR_TONE: Record<string, string> = {
  info: "bg-info",
  neutral: "bg-muted-foreground/40",
  brand: "bg-primary",
  warning: "bg-warning",
  teal: "bg-teal",
  success: "bg-success",
  danger: "bg-destructive",
};

const SOURCE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function Dashboard() {
  const { session } = Route.useRouteContext();
  const { data: leads } = useSuspenseQuery(leadsQuery);
  const { data: followUps } = useSuspenseQuery(followUpsQuery);
  const { data: executives } = useSuspenseQuery(executivesQuery);
  const stats = computeLeadStats(leads, followUps);
  const execById = new Map(executives.map((e) => [e.id, e]));
  const leadById = new Map(leads.map((l) => [l.id, l]));
  const now = new Date();

  const inflow = Array.from({ length: 14 }, (_, i) => {
    const day = subDays(now, 13 - i);
    const dayLeads = leads.filter((l) => isSameDay(new Date(l.createdAt), day));
    return {
      day: format(day, "d MMM"),
      leads: dayLeads.length,
      converted: dayLeads.filter((l) => l.status === "Converted").length,
    };
  });

  const pipeline = LEAD_STATUSES.map((s) => ({ status: s, count: leads.filter((l) => l.status === s).length }));
  const maxPipe = Math.max(1, ...pipeline.map((p) => p.count));

  const sources = LEAD_SOURCES.map((s) => ({ name: s, value: leads.filter((l) => l.source === s).length }));

  const todays = followUps
    .filter((f) => f.status === "pending" && (isSameDay(new Date(f.dueAt), now) || isBefore(new Date(f.dueAt), startOfDay(now))))
    .slice(0, 6);

  const recent = leads.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{format(now, "EEEE, d MMMM yyyy")}</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-[1.7rem]">
            {greeting()}, {session.name.split(" ")[0]}
          </h1>
        </div>
        <Button asChild variant="outline">
          <Link to="/reports">
            View reports <ArrowRight />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total leads" value={stats.total} icon={Layers} tone="brand" hint={`${stats.unassigned} unassigned`} />
        <StatCard label="New leads" value={stats.newLeads} icon={Sparkles} tone="info" status="New" hint="Waiting for first call" />
        <StatCard
          label="Follow-ups"
          value={stats.followUps}
          icon={CalendarClock}
          tone="warning"
          to="/follow-ups"
          hint={`${stats.followUpsDueToday} due today · ${stats.overdueFollowUps} overdue`}
        />
        <StatCard
          label="Converted"
          value={stats.converted}
          icon={BadgeCheck}
          tone="success"
          status="Converted"
          hint={`${conversionRate(stats.converted, stats.total)}% conversion rate`}
        />
        <StatCard label="Lost leads" value={stats.lost} icon={CircleSlash} tone="danger" status="Lost" hint="Marked as lost" />
      </div>

      {stats.unassigned > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-accent p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
              <Shuffle className="h-4 w-4" />
            </span>
            <p className="text-sm">
              <span className="font-semibold">{stats.unassigned} leads</span> are not assigned to any executive yet.
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/assignment">Assign now</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-base">Lead inflow</CardTitle>
            <CardDescription>New enquiries over the last 14 days</CardDescription>
          </CardHeader>
          <CardContent className="h-72 pl-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={inflow} margin={{ left: 0, right: 12 }}>
                <defs>
                  <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={36} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)" }} />
                <Area type="monotone" dataKey="leads" name="Leads" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#gLeads)" />
                <Area type="monotone" dataKey="converted" name="Converted" stroke="var(--chart-5)" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base">Pipeline</CardTitle>
            <CardDescription>Leads by current status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {pipeline.map((p) => (
              <Link key={p.status} to="/leads" search={{ status: p.status }} className="group block">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground group-hover:text-foreground">{p.status}</span>
                  <span className="font-semibold tabular">{p.count}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", BAR_TONE[STATUS_TONE[p.status]])}
                    style={{ width: `${(p.count / maxPipe) * 100}%` }}
                  />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="font-display text-base">Due today</CardTitle>
              <CardDescription>Today's and overdue follow-ups</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/follow-ups">All</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {todays.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nothing due. Nice work!</p>}
            {todays.map((f) => {
              const lead = leadById.get(f.leadId);
              if (!lead) return null;
              const overdue = isBefore(new Date(f.dueAt), startOfDay(now));
              return (
                <Link
                  key={f.id}
                  to="/leads/$leadId"
                  params={{ leadId: lead.id }}
                  className="flex items-start justify-between gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{lead.restaurantName}</p>
                    <p className="truncate text-xs text-muted-foreground">{f.note || "Call back"}</p>
                  </div>
                  <span className={cn("shrink-0 text-xs font-semibold", overdue ? "text-destructive" : "text-warning-foreground")}>
                    {overdue ? "Overdue" : format(new Date(f.dueAt), "h:mm a")}
                  </span>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="font-display text-base">Recent leads</CardTitle>
              <CardDescription>Latest enquiries</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/leads">All</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {recent.map((l) => (
              <Link
                key={l.id}
                to="/leads/$leadId"
                params={{ leadId: l.id }}
                className="flex items-center justify-between gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{l.restaurantName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {l.city} · {formatDistanceToNow(new Date(l.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <StatusBadge status={l.status} />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base">Lead sources</CardTitle>
            <CardDescription>Where enquiries come from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sources} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3} strokeWidth={0}>
                    {sources.map((_, i) => (
                      <Cell key={i} fill={SOURCE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm">
              {sources.map((s, i) => (
                <li key={s.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: SOURCE_COLORS[i] }} />
                    {s.name}
                  </span>
                  <span className="font-semibold tabular">{s.value}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="font-display text-base">Top executives</CardTitle>
            <CardDescription>Most conversions so far</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/reports">Full report</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[...execById.values()]
            .map((e) => ({ e, c: leads.filter((l) => l.executiveId === e.id && l.status === "Converted").length, t: leads.filter((l) => l.executiveId === e.id).length }))
            .sort((a, b) => b.c - a.c)
            .slice(0, 4)
            .map(({ e, c, t }, i) => (
              <div key={e.id} className="rounded-lg border bg-muted/40 p-3">
                <div className="flex items-center justify-between">
                  <ExecutiveName name={e.name} />
                  <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="font-display text-lg font-semibold text-foreground">{c}</span> converted of {t} leads
                </p>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
