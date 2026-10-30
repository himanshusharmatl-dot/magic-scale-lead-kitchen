import { useEffect, useState, type FormEvent, type ReactNode } from "react";
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
import { Switch } from "@/components/ui/switch";
import { SimpleSelect, toOptions } from "./simple-select";
import { crm } from "@/lib/crm";
import { useCrmMutation } from "@/lib/crm/queries";
import { CITIES, EXECUTIVE_ROLES, type Executive, type ExecutiveInput } from "@/lib/crm/types";
import { isValidPhone, formatPhone } from "@/lib/crm/phone";

const EMPTY: ExecutiveInput = {
  name: "",
  email: "",
  phone: "",
  role: "Sales Executive",
  city: "",
  active: true,
  inRotation: true,
};

export function ExecutiveFormDialog({ executive, trigger }: { executive?: Executive; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ExecutiveInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(executive ? { ...executive } : EMPTY);
  }, [open, executive]);

  const save = useCrmMutation(
    (input: ExecutiveInput) =>
      executive ? crm.updateExecutive(executive.id, input) : crm.createExecutive(input),
    { success: executive ? "Executive updated" : "Executive added" },
  );

  const set = <K extends keyof ExecutiveInput>(k: K, v: ExecutiveInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Name is required");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError("Enter a valid email");
    if (!isValidPhone(form.phone)) return setError("Enter a valid 10-digit mobile number");
    if (!form.city) return setError("Select a city");
    await save.mutateAsync({ ...form, name: form.name.trim(), phone: formatPhone(form.phone) });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">{executive ? "Edit executive" : "Add executive"}</DialogTitle>
          <DialogDescription>Executives receive leads manually or through round robin.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ex-name">Full name</Label>
              <Input id="ex-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ex-email">Email</Label>
              <Input id="ex-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ex-phone">Phone</Label>
              <Input id="ex-phone" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <SimpleSelect value={form.role} onChange={(v) => set("role", v as ExecutiveInput["role"])} options={toOptions(EXECUTIVE_ROLES)} />
            </div>
            <div className="space-y-1.5">
              <Label>Base city</Label>
              <SimpleSelect value={form.city} onChange={(v) => set("city", v)} options={toOptions(CITIES)} placeholder="Select city" />
            </div>
          </div>
          <div className="space-y-3 rounded-lg border bg-muted/50 p-3">
            <label className="flex items-center justify-between text-sm">
              <span>
                <span className="font-medium">Active</span>
                <span className="block text-xs text-muted-foreground">Can be assigned leads</span>
              </span>
              <Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v, inRotation: v ? f.inRotation : false }))} />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>
                <span className="font-medium">Include in round robin</span>
                <span className="block text-xs text-muted-foreground">Receives automatically assigned leads</span>
              </span>
              <Switch checked={form.inRotation} disabled={!form.active} onCheckedChange={(v) => set("inRotation", v)} />
            </label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="animate-spin" />}
              {executive ? "Save" : "Add executive"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
