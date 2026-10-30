import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Loader2 } from "lucide-react";
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
import { SimpleSelect, toOptions } from "./simple-select";
import { crm } from "@/lib/crm";
import {
  CITIES,
  CUISINES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  SERVICES,
  type Lead,
  type LeadInput,
} from "@/lib/crm/types";
import { executivesQuery, leadsQuery, settingsQuery, useCrmMutation } from "@/lib/crm/queries";
import { findDuplicateLeads, formatPhone, isValidPhone } from "@/lib/crm/phone";

type FormState = Omit<LeadInput, "executiveId"> & { executiveId: string };

const UNASSIGNED = "__none";
const AUTO = "auto";

function emptyForm(autoAssign: boolean): FormState {
  return {
    customerName: "",
    phone: "",
    restaurantName: "",
    city: "",
    cuisine: "",
    service: "",
    source: "Manual",
    status: "New",
    remarks: "",
    executiveId: autoAssign ? AUTO : UNASSIGNED,
  };
}

export function LeadFormDialog({
  lead,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  lead?: Lead;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const [innerOpen, setInnerOpen] = useState(false);
  const open = openProp ?? innerOpen;
  const setOpen = onOpenChange ?? setInnerOpen;

  const { data: leads = [] } = useQuery(leadsQuery);
  const { data: executives = [] } = useQuery(executivesQuery);
  const { data: settings } = useQuery(settingsQuery);

  const [form, setForm] = useState<FormState>(() => emptyForm(true));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (lead) {
      setForm({
        customerName: lead.customerName,
        phone: lead.phone,
        restaurantName: lead.restaurantName,
        city: lead.city,
        cuisine: lead.cuisine,
        service: lead.service,
        source: lead.source,
        status: lead.status,
        remarks: lead.remarks,
        executiveId: lead.executiveId ?? UNASSIGNED,
      });
    } else {
      setForm(emptyForm(settings?.autoAssign ?? true));
    }
  }, [open, lead, settings?.autoAssign]);

  const duplicates = useMemo(
    () => findDuplicateLeads(leads, form.phone, lead?.id),
    [leads, form.phone, lead?.id],
  );

  const execOptions = [
    ...(lead ? [] : [{ value: AUTO, label: "Auto — round robin" }]),
    { value: UNASSIGNED, label: "Leave unassigned" },
    ...executives
      .filter((e) => e.active || e.id === lead?.executiveId)
      .map((e) => ({ value: e.id, label: e.name })),
  ];

  const create = useCrmMutation((input: LeadInput) => crm.createLead(input), {
    success: (l) => `Lead added for ${l.restaurantName}`,
  });
  const update = useCrmMutation(
    (patch: Partial<Lead>) => crm.updateLead(lead!.id, patch),
    { success: "Lead updated" },
  );
  const pending = create.isPending || update.isPending;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function validate() {
    const e: typeof errors = {};
    if (!form.customerName.trim()) e.customerName = "Required";
    if (!isValidPhone(form.phone)) e.phone = "Enter a valid 10-digit Indian mobile number";
    if (!form.restaurantName.trim()) e.restaurantName = "Required";
    if (!form.city) e.city = "Required";
    if (!form.cuisine) e.cuisine = "Required";
    if (!form.service) e.service = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    const base = {
      ...form,
      customerName: form.customerName.trim(),
      restaurantName: form.restaurantName.trim(),
      phone: formatPhone(form.phone),
      remarks: form.remarks.trim(),
    };
    if (lead) {
      await update.mutateAsync({
        ...base,
        executiveId: form.executiveId === UNASSIGNED ? null : form.executiveId,
      });
    } else {
      await create.mutateAsync({
        ...base,
        executiveId: form.executiveId === UNASSIGNED ? null : form.executiveId,
      });
    }
    setOpen(false);
  }

  const field = (key: keyof FormState, label: string, node: ReactNode) => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      {node}
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">{lead ? "Edit lead" : "Add new lead"}</DialogTitle>
          <DialogDescription>
            {lead
              ? "Update the restaurant and contact details."
              : "Capture a new restaurant enquiry. Phone numbers are checked for duplicates."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {field(
              "customerName",
              "Customer name",
              <Input id="customerName" value={form.customerName} onChange={(e) => set("customerName", e.target.value)} />,
            )}
            {field(
              "phone",
              "Phone number",
              <Input
                id="phone"
                inputMode="tel"
                placeholder="98765 43210"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />,
            )}
          </div>

          {duplicates.length > 0 && (
            <div className="flex gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
              <div>
                <p className="font-semibold text-warning-foreground">
                  This number already exists on {duplicates.length} lead
                  {duplicates.length > 1 ? "s" : ""}
                </p>
                <ul className="mt-1 space-y-0.5 text-muted-foreground">
                  {duplicates.slice(0, 3).map((d) => (
                    <li key={d.id}>
                      <Link
                        to="/leads/$leadId"
                        params={{ leadId: d.id }}
                        className="underline-offset-2 hover:underline"
                        onClick={() => setOpen(false)}
                      >
                        {d.restaurantName} · {d.customerName} · {d.status}
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-muted-foreground">You can still save it if this is a separate outlet.</p>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {field(
              "restaurantName",
              "Restaurant name",
              <Input id="restaurantName" value={form.restaurantName} onChange={(e) => set("restaurantName", e.target.value)} />,
            )}
            {field("city", "City", <SimpleSelect id="city" value={form.city} onChange={(v) => set("city", v)} options={toOptions(CITIES)} placeholder="Select city" />)}
            {field("cuisine", "Cuisine", <SimpleSelect id="cuisine" value={form.cuisine} onChange={(v) => set("cuisine", v)} options={toOptions(CUISINES)} placeholder="Select cuisine" />)}
            {field("service", "Service required", <SimpleSelect id="service" value={form.service} onChange={(v) => set("service", v)} options={toOptions(SERVICES)} placeholder="Select service" />)}
            {field("source", "Lead source", <SimpleSelect id="source" value={form.source} onChange={(v) => set("source", v as FormState["source"])} options={toOptions(LEAD_SOURCES)} />)}
            {field("status", "Status", <SimpleSelect id="status" value={form.status} onChange={(v) => set("status", v as FormState["status"])} options={toOptions(LEAD_STATUSES)} />)}
          </div>

          {field(
            "executiveId",
            "Assigned executive",
            <SimpleSelect id="executiveId" value={form.executiveId} onChange={(v) => set("executiveId", v)} options={execOptions} />,
          )}

          {field(
            "remarks",
            "Remarks",
            <Textarea id="remarks" rows={3} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} placeholder="Anything the executive should know" />,
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {lead ? "Save changes" : "Add lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
