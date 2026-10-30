import { cn } from "@/lib/utils";

const TONES = [
  "bg-primary/15 text-accent-foreground",
  "bg-teal/15 text-teal",
  "bg-info/15 text-info",
  "bg-success/15 text-success",
  "bg-warning/20 text-warning-foreground",
];

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ExecutiveAvatar({ name, className }: { name: string; className?: string }) {
  const tone = TONES[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % TONES.length];
  return (
    <span
      className={cn(
        "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold",
        tone,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function ExecutiveName({ name }: { name: string | undefined }) {
  if (!name) return <span className="text-sm italic text-muted-foreground">Unassigned</span>;
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <ExecutiveAvatar name={name} className="h-6 w-6 text-[10px]" />
      {name}
    </span>
  );
}
