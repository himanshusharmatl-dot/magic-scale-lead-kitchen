import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/crm/page-header";
import { ExecutiveName } from "@/components/crm/executive-avatar";
import { SimpleSelect } from "@/components/crm/simple-select";
import { executivesQuery, followUpsQuery, leadsQuery } from "@/lib/crm/queries";
import { conversionRate, executivePerformance } from "@/lib/crm/stats";
import { downloadCsv } from "@/lib/crm/csv";
import { LEAD_SOURCES, LEAD_STATUSES } from "@/lib/crm/types";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Magic Scale CRM" },
      { name: "description", content: "Executive performance and lead conversion reports." },
      { property: "og:title", content: "Reports — Magic Scale CRM" },
      { property: "og:description", content: "Executive performance and lead conversion reports." },
    ],
  }),
  component: ReportsPage,
});

const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

const FUNNEL = ["Call Connected", "Interested", "Quotation Shared", "Payment Pending", "Converted"] as const;
const tooltipStyle = { borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)" };

function ReportsPage() {
  const { data: allLeads } = useSuspenseQuery(leadsQuery);
  const { data: executives } = useSuspenseQuery(executivesQuery);
  const { data: followUps } = useSuspenseQuery(followUpsQuery);
  const [range, setRange] = useState("30");
  const [sort, setSort] = useState<"converted" | "rate" | "assigned">("converted");

  const leads = useMemo(() => {
    if (range === "all") return allLeads;
    const from = subDays(new Date(), Number(range));
    return allLeads.filter((l) => new Date(l.createdAt) >= from);
  }, [allLeads, range]);

  const perf = useMemo(
    () =>
      executivePerformance(executives, leads, followUps)
        .filter((p) => p.assigned > 0 || p.executive.active)
        .sort((a, b) =>
          sort === "rate" ? b.conversionRate - a.conversionRate : sort === "assigned" ? b.assigned - a.assigned : b.converted - a.converted,
        ),
    [executives, leads, followUps, sort],
  );

  const converted = leads.filter((l) => l.status === "Converted").length;
  const lost = leads.filter((l) => l.status === "Lost" || l.status === "Not Interested").length;

  // A lead "reached" a funnel stage if its current status is that stage or later.
  const funnel = FUNNEL.map((stage, i) => {
    const later = FUNNEL.slice(i);
    return { stage, count: leads.filter((l) => (later as readonly string[]).includes(l.status)).length };
  });
  const funnelMax = Math.max(1, leads.length);

  const bySource = LEAD_SOURCES.map((s) => {
    const sl = leads.filter((l) => l.source === s);
    const c = sl.filter((l) => l.status === "Converted").length;
    return { source: s, leads: sl.length, converted: c, rate: conversionRate(c, sl.length) };
  });

  const byCity = Object.entries(
    leads.reduce<Record<string, { leads: number; converted: number }>>((acc, l) => {
      acc[l.city] ??= { leads: 0, converted: 0 };
      acc[l.city].leads++;
      if (l.status === "Converted") acc[l.city].converted++;
      return acc;
    }, {}),
  )
    .map(([city, v]) => ({ city, ...v }))
    .sort((a, b) => b.leads - a.leads);

  function exportPerf() {
    downloadCsv(`executive-performance-${format(new Date(), "yyyy-MM-dd")}.csv`, [
      ["Executive", "Role", "Assigned", "Open", "Converted", "Lost", "Pending follow-ups", "Conversion %"],
      ...perf.map((p) => [p.executive.name, p.executive.role, p.assigned, p.open, p.converted, p.lost, p.pendingFollowUps, p.conversionRate]),
    ]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="How the team is performing and where leads convert."
        actions={
          <>
            <SimpleSelect className="w-40" value={range} onChange={setRange} options={RANGES} />
            <Button variant="outline" onClick={exportPerf}><Download /> Export</Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Leads in period", leads.length],
          ["Converted", converted],
          ["Conversion rate", `${conversionRate(converted, leads.length)}%`],
          ["Lost / not interested", lost],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl border bg-card p-5 shadow-card">
            <p className="text-sm text-muted-foreground">{l}</p>
            <p className="mt-2 font-display text-3xl font-semibold tabular">{v}</p>
          </div>
        ))}
      </div>

      <Card className="shadow-card">
        <CardHeader className="flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-display text-base">Executive performance</CardTitle>
            <CardDescription>Leads created in the selected period</CardDescription>
          </div>
          <SimpleSelect
            className="w-48"
            value={sort}
            onChange={(v) => setSort(v as typeof sort)}
            options={[
              { value: "converted", label: "Sort by conversions" },
              { value: "rate", label: "Sort by conversion rate" },
              { value: "assigned", label: "Sort by leads assigned" },
            ]}
          />
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-y bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-6 py-3 font-semibold">Executive</th>
                <th className="px-3 py-3 text-right font-semibold">Assigned</th>
                <th className="px-3 py-3 text-right font-semibold">Open</th>
                <th className="px-3 py-3 text-right font-semibold">Converted</th>
                <th className="px-3 py-3 text-right font-semibold">Lost</th>
                <th className="px-3 py-3 text-right font-semibold">Follow-ups due</th>
                <th className="w-56 px-6 py-3 font-semibold">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {perf.map((p) => (
                <tr key={p.executive.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-6 py-3"><ExecutiveName name={p.executive.name} /></td>
                  <td className="px-3 py-3 text-right tabular">{p.assigned}</td>
                  <td className="px-3 py-3 text-right tabular">{p.open}</td>
                  <td className="px-3 py-3 text-right font-semibold tabular text-success">{p.converted}</td>
                  <td className="px-3 py-3 text-right tabular text-muted-foreground">{p.lost}</td>
                  <td className="px-3 py-3 text-right tabular">{p.pendingFollowUps}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${Math.min(100, p.conversionRate)}%` }} />
                      </div>
                      <span className="w-12 text-right text-xs font-semibold tabular">{p.conversionRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base">Conversion funnel</CardTitle>
            <CardDescription>Leads that reached each stage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnel.map((f) => (
              <div key={f.stage}>
                <div className="flex justify-between text-sm">
                  <span>{f.stage}</span>
                  <span className="font-semibold tabular">{f.count} <span className="font-normal text-muted-foreground">({conversionRate(f.count, leads.length)}%)</span></span>
                </div>
                <div className="mt-1 h-7 overflow-hidden rounded-md bg-muted">
                  <div className="h-full rounded-md bg-gradient-brand" style={{ width: `${(f.count / funnelMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base">Conversion by source</CardTitle>
            <CardDescription>Which channels bring buyers</CardDescription>
          </CardHeader>
          <CardContent className="h-64 pl-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySource} margin={{ right: 12 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="source" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={36} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="leads" name="Leads" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="converted" name="Converted" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base">Status breakdown</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {LEAD_STATUSES.map((s) => {
              const n = leads.filter((l) => l.status === s).length;
              return (
                <div key={s} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{s}</span>
                  <span className="font-semibold tabular">{n}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base">By city</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byCity.map((c) => (
              <div key={c.city} className="flex items-center justify-between text-sm">
                <span>{c.city}</span>
                <span className="text-muted-foreground tabular">
                  <span className="font-semibold text-foreground">{c.leads}</span> leads · {c.converted} won · {conversionRate(c.converted, c.leads)}%
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
