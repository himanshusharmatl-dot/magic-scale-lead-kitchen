import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { addDays, format } from "date-fns";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { crm } from "@/lib/crm";
import { useCrmMutation } from "@/lib/crm/queries";
import type { Lead } from "@/lib/crm/types";

const toLocalInput = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");

export function FollowUpDialog({ lead, trigger }: { lead: Lead; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [dueAt, setDueAt] = useState("");
  const [note, setNote] = useState("");
  const [markStatus, setMarkStatus] = useState(true);

  useEffect(() => {
    if (open) {
      const d = addDays(new Date(), 1);
      d.setHours(11, 0, 0, 0);
      setDueAt(toLocalInput(d));
      setNote("");
      setMarkStatus(lead.status !== "Follow-up Required");
    }
  }, [open, lead.status]);

  const create = useCrmMutation(
    async () => {
      await crm.createFollowUp({ leadId: lead.id, dueAt: new Date(dueAt).toISOString(), note: note.trim() });
      if (markStatus && lead.status !== "Follow-up Required") {
        await crm.setLeadStatus(lead.id, "Follow-up Required");
      }
    },
    { success: "Follow-up scheduled" },
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!dueAt) return;
    await create.mutateAsync(undefined);
    setOpen(false);
  }

  const quick = [
    { label: "In 2 hours", d: () => new Date(Date.now() + 2 * 3600e3) },
    { label: "Tomorrow 11 AM", d: () => { const d = addDays(new Date(), 1); d.setHours(11, 0, 0, 0); return d; } },
    { label: "In 3 days", d: () => { const d = addDays(new Date(), 3); d.setHours(11, 0, 0, 0); return d; } },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Schedule follow-up</DialogTitle>
          <DialogDescription>
            {lead.restaurantName} · {lead.customerName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="dueAt">Date & time</Label>
            <Input id="dueAt" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} required />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {quick.map((q) => (
                <Button key={q.label} type="button" size="sm" variant="secondary" onClick={() => setDueAt(toLocalInput(q.d()))}>
                  {q.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">What to do</Label>
            <Textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Share Zomato onboarding quotation" />
          </div>
          {lead.status !== "Follow-up Required" && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={markStatus} onChange={(e) => setMarkStatus(e.target.checked)} className="accent-primary" />
              Also set status to “Follow-up Required”
            </label>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
