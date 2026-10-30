import type { AssignmentSettings, Executive, FollowUp, Lead, LeadActivity } from "./types";
export * from "./types";

export interface CrmData {
  leads: Lead[];
  executives: Executive[];
  followUps: FollowUp[];
  activities: LeadActivity[];
  settings: AssignmentSettings;
}
