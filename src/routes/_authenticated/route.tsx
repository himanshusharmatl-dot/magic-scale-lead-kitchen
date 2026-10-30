import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { LogOut, Plus, Search, Settings } from "lucide-react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppSidebar } from "@/components/crm/app-sidebar";
import { LeadFormDialog } from "@/components/crm/lead-form-dialog";
import { ExecutiveAvatar } from "@/components/crm/executive-avatar";
import { getSession, signOut } from "@/lib/auth";
import { executivesQuery, followUpsQuery, leadsQuery, settingsQuery } from "@/lib/crm/queries";
import { computeLeadStats } from "@/lib/crm/stats";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: ({ location }) => {
    const session = getSession();
    if (!session) throw redirect({ to: "/login", search: { redirect: location.href } });
    return { session };
  },
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(leadsQuery),
      context.queryClient.ensureQueryData(executivesQuery),
      context.queryClient.ensureQueryData(followUpsQuery),
      context.queryClient.ensureQueryData(settingsQuery),
    ]);
  },
  pendingComponent: () => (
    <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading CRM…</div>
  ),
  component: AppLayout,
});

function AppLayout() {
  const { session } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data: leads = [] } = useQuery(leadsQuery);
  const { data: followUps = [] } = useQuery(followUpsQuery);
  const stats = computeLeadStats(leads, followUps);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    navigate({ to: "/leads", search: { q: q.trim() || undefined } });
  }

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar overdue={stats.overdueFollowUps} />
        <SidebarInset className="bg-background">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur sm:px-6">
            <SidebarTrigger className="-ml-1" />
            <form onSubmit={onSearch} className="relative hidden max-w-md flex-1 sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search leads by name, phone or restaurant…"
                className="h-10 bg-card pl-9"
                aria-label="Search leads"
              />
            </form>
            <div className="ml-auto flex items-center gap-2">
              <LeadFormDialog
                trigger={
                  <Button size="sm" className="h-9">
                    <Plus /> <span className="hidden sm:inline">New lead</span>
                  </Button>
                }
              />
              <DropdownMenu>
                <DropdownMenuTrigger className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Account menu">
                  <ExecutiveAvatar name={session.name || "Admin"} className="h-9 w-9" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <p className="font-semibold">{session.name}</p>
                    <p className="truncate text-xs font-normal text-muted-foreground">{session.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
                    <Settings className="mr-2 h-4 w-4" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
