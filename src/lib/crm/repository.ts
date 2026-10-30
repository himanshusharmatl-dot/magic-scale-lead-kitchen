import type {
  AssignmentSettings,
  Executive,
  ExecutiveInput,
  FollowUp,
  Lead,
  LeadActivity,
  LeadInput,
  LeadStatus,
} from "./types";

/**
 * The contract every data source must fulfil. The UI only talks to this
 * interface, so connecting Magic Scale's own Supabase database means writing
 * a `supabaseRepository` that implements it and switching the export in
 * `src/lib/crm/index.ts`. See docs/SUPABASE_INTEGRATION.md.
 */
export interface CrmRepository {
  readonly mode: "demo" | "supabase";

  listLeads(): Promise<Lead[]>;
  createLead(input: LeadInput): Promise<Lead>;
  updateLead(id: string, patch: Partial<Omit<Lead, "id" | "createdAt">>): Promise<Lead>;
  deleteLead(id: string): Promise<void>;
  assignLeads(leadIds: string[], executiveId: string): Promise<void>;
  autoAssignLeads(leadIds: string[]): Promise<number>;
  setLeadStatus(id: string, status: LeadStatus): Promise<void>;

  listExecutives(): Promise<Executive[]>;
  createExecutive(input: ExecutiveInput): Promise<Executive>;
  updateExecutive(id: string, patch: Partial<ExecutiveInput>): Promise<Executive>;

  listFollowUps(): Promise<FollowUp[]>;
  createFollowUp(input: Pick<FollowUp, "leadId" | "dueAt" | "note"> & { executiveId?: string | null }): Promise<FollowUp>;
  completeFollowUp(id: string, outcome: string): Promise<void>;
  rescheduleFollowUp(id: string, dueAt: string): Promise<void>;

  listActivities(leadId: string): Promise<LeadActivity[]>;
  addNote(leadId: string, message: string): Promise<void>;

  getSettings(): Promise<AssignmentSettings>;
  updateSettings(patch: Partial<AssignmentSettings>): Promise<AssignmentSettings>;

  resetDemoData?(): Promise<void>;
}
