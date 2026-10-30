import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarClock,
  Contact,
  Database,
  LayoutDashboard,
  Shuffle,
  UsersRound,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo, LogoMark } from "./logo";
import { crm } from "@/lib/crm";

const MAIN = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Leads", url: "/leads", icon: Contact },
  { title: "Follow-ups", url: "/follow-ups", icon: CalendarClock },
] as const;

const TEAM = [
  { title: "Executives", url: "/executives", icon: UsersRound },
  { title: "Lead assignment", url: "/assignment", icon: Shuffle },
  { title: "Reports", url: "/reports", icon: BarChart3 },
] as const;

const SYSTEM = [{ title: "Database & settings", url: "/settings", icon: Database }] as const;

export function AppSidebar({ overdue }: { overdue: number }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) => path === url || path.startsWith(url + "/");

  const renderGroup = (
    label: string,
    items: readonly { title: string; url: string; icon: typeof LayoutDashboard }[],
  ) => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-sidebar-foreground/45 uppercase tracking-[0.14em] text-[10px]">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
                tooltip={item.title}
                className="h-9 data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:shadow-brand"
              >
                <Link to={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
              {item.url === "/follow-ups" && overdue > 0 && !collapsed && (
                <SidebarMenuBadge className="bg-sidebar-accent text-sidebar-primary">
                  {overdue}
                </SidebarMenuBadge>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        {collapsed ? <LogoMark className="mx-auto h-8 w-8" /> : <Logo />}
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Workspace", MAIN)}
        {renderGroup("Team", TEAM)}
        {renderGroup("System", SYSTEM)}
      </SidebarContent>
      {!collapsed && (
        <SidebarFooter className="p-3">
          <Link
            to="/settings"
            className="rounded-lg border border-sidebar-border bg-sidebar-accent/60 p-3 text-xs transition-colors hover:bg-sidebar-accent"
          >
            <div className="flex items-center gap-2 font-semibold text-sidebar-accent-foreground">
              <span className="h-2 w-2 rounded-full bg-warning" />
              {crm.mode === "demo" ? "Demo data" : "Connected"}
            </div>
            <p className="mt-1 text-sidebar-foreground/60">
              {crm.mode === "demo"
                ? "Company database not connected yet."
                : "Using Magic Scale database."}
            </p>
          </Link>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
