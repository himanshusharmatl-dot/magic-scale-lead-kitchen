import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/lib/crm/types";

const TONES = {
  brand: "bg-primary/10 text-primary",
  info: "bg-info/10 text-info",
  warning: "bg-warning/15 text-warning-foreground",
  success: "bg-success/10 text-success",
  danger: "bg-destructive/10 text-destructive",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  status,
  to = "/leads",
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  tone: keyof typeof TONES;
  status?: LeadStatus;
  to?: "/leads" | "/follow-ups";
}) {
  return (
    <Link
      to={to}
      search={to === "/leads" && status ? { status } : undefined}
      className="group rounded-xl border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={cn("grid h-9 w-9 place-items-center rounded-lg", TONES[tone])}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tabular text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Link>
  );
}
