import { Badge } from "@/components/ui/badge";
import { STATUS_TONE, type LeadSource, type LeadStatus } from "@/lib/crm/types";
import { Globe, Megaphone, PenLine, Inbox } from "lucide-react";

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <Badge variant={STATUS_TONE[status]}>{status}</Badge>;
}

const SOURCE_ICON: Record<LeadSource, typeof Globe> = {
  Manual: PenLine,
  Website: Globe,
  "CRM Enquiry Page": Inbox,
  Advertisement: Megaphone,
};

export function SourceLabel({ source }: { source: LeadSource }) {
  const Icon = SOURCE_ICON[source];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {source}
    </span>
  );
}
