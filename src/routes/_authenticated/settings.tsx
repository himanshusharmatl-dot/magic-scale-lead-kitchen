import { createFileRoute } from "@tanstack/react-router";
import { Database, KeyRound, RotateCcw, ShieldCheck, Table2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/crm/page-header";
import { crm } from "@/lib/crm";
import { useCrmMutation } from "@/lib/crm/queries";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Database & settings — Magic Scale CRM" },
      { name: "description", content: "Database connection status and CRM settings." },
      { property: "og:title", content: "Database & settings — Magic Scale CRM" },
      { property: "og:description", content: "Database connection status and CRM settings." },
    ],
  }),
  component: SettingsPage,
});

const TABLES = [
  ["executives", "Sales team members, active flag and round-robin membership"],
  ["leads", "Restaurant enquiries with status, source and assigned executive"],
  ["follow_ups", "Scheduled callbacks per lead and executive"],
  ["lead_activities", "Timeline of status changes, assignments and notes"],
  ["assignment_settings", "Round-robin on/off and last assigned executive"],
  ["admin_roles", "Which signed-in users are CRM admins"],
];

function SettingsPage() {
  const { session } = Route.useRouteContext();
  const reset = useCrmMutation(async () => crm.resetDemoData?.(), { success: "Demo data restored" });
  const demo = crm.mode === "demo";

  return (
    <div className="space-y-6">
      <PageHeader title="Database & settings" description="Connection status and preparation for Magic Scale's own database." />

      <Card className="overflow-hidden shadow-card">
        <div className="flex flex-col gap-4 bg-gradient-ink p-6 text-ink-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-ink-foreground/10"><Database className="h-5 w-5" /></span>
            <div>
              <p className="font-display text-lg font-semibold">{demo ? "Not connected — demo data" : "Connected to Magic Scale database"}</p>
              <p className="text-sm opacity-75">
                {demo
                  ? "Everything you see is sample data saved only in this browser. Nothing is sent anywhere."
                  : "Leads and team data are read from the company database."}
              </p>
            </div>
          </div>
          <Badge variant={demo ? "warning" : "success"} className="self-start sm:self-center">{demo ? "Demo mode" : "Live"}</Badge>
        </div>
        <CardContent className="grid gap-6 p-6 md:grid-cols-3">
          <Step n={1} icon={KeyRound} title="Share project URL & public key" text="Magic Scale's Supabase project URL and its publishable (anon) key. Private service keys are never placed in the app." />
          <Step n={2} icon={Table2} title="Create the tables" text="Run the prepared schema script in the company database. It creates the tables below with row-level security." />
          <Step n={3} icon={ShieldCheck} title="Switch the data source" text="The CRM swaps demo data for the live database in one place, and admin sign-in moves to real accounts." />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-base">Prepared tables</CardTitle>
            <CardDescription>Structure the CRM expects in the company database</CardDescription>
          </CardHeader>
          <CardContent className="divide-y rounded-lg border p-0">
            {TABLES.map(([name, desc]) => (
              <div key={name} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                <code className="w-44 shrink-0 font-mono text-xs font-semibold text-accent-foreground">{name}</code>
                <span className="text-sm text-muted-foreground">{desc}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display text-base">Signed in as</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-semibold">{session.name}</p>
              <p className="text-muted-foreground">{session.email}</p>
              <Badge variant="brand" className="mt-2">Admin</Badge>
            </CardContent>
          </Card>

          {demo && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-base">Demo data</CardTitle>
                <CardDescription>Restore the original sample leads and team.</CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full"><RotateCcw /> Reset demo data</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset demo data?</AlertDialogTitle>
                      <AlertDialogDescription>Any leads or changes you made while testing will be replaced by the original sample data.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => reset.mutate(undefined)}>Reset</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ n, icon: Icon, title, text }: { n: number; icon: typeof Database; title: string; text: string }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{n}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}
