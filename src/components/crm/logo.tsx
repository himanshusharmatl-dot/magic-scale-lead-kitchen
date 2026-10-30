import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-brand text-primary-foreground shadow-brand",
        className,
      )}
    >
      <Sparkles className="h-[18px] w-[18px]" />
    </span>
  );
}

export function Logo({ subtitle = "Growth CRM" }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <div className="leading-tight">
        <p className="font-display text-[15px] font-semibold">Magic Scale</p>
        <p className="text-[11px] uppercase tracking-[0.14em] opacity-60">{subtitle}</p>
      </div>
    </div>
  );
}
