import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { crm } from "./index";

export const leadsQuery = queryOptions({ queryKey: ["crm", "leads"], queryFn: () => crm.listLeads() });
export const executivesQuery = queryOptions({
  queryKey: ["crm", "executives"],
  queryFn: () => crm.listExecutives(),
});
export const followUpsQuery = queryOptions({
  queryKey: ["crm", "followUps"],
  queryFn: () => crm.listFollowUps(),
});
export const settingsQuery = queryOptions({
  queryKey: ["crm", "settings"],
  queryFn: () => crm.getSettings(),
});
export const activitiesQuery = (leadId: string) =>
  queryOptions({ queryKey: ["crm", "activities", leadId], queryFn: () => crm.listActivities(leadId) });

/** Mutation that refreshes all CRM data on success and toasts errors. */
export function useCrmMutation<TArgs, TResult>(
  fn: (args: TArgs) => Promise<TResult>,
  opts: { success?: string | ((r: TResult, args: TArgs) => string) } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result, args) => {
      qc.invalidateQueries({ queryKey: ["crm"] });
      if (opts.success) {
        toast.success(typeof opts.success === "function" ? opts.success(result, args) : opts.success);
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Something went wrong"),
  });
}
