// Domain types for the Magic Scale CRM.
// These mirror the tables described in docs/supabase-schema.sql so the
// demo repository can later be swapped for the company Supabase database.

export const LEAD_STATUSES = [
  "New",
  "Not Called",
  "Call Connected",
  "Interested",
  "Follow-up Required",
  "Quotation Shared",
  "Payment Pending",
  "Converted",
  "Lost",
  "Not Interested",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = ["Manual", "Website", "CRM Enquiry Page", "Advertisement"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const SERVICES = [
  "Swiggy Onboarding",
  "Zomato Onboarding",
  "Swiggy + Zomato Onboarding",
  "Menu Optimization",
  "Ads & Promotions Management",
  "Restaurant Growth Package",
  "Photography & Listing",
  "FSSAI / GST Assistance",
] as const;

export const CUISINES = [
  "North Indian",
  "South Indian",
  "Chinese",
  "Biryani",
  "Fast Food",
  "Cafe & Bakery",
  "Mughlai",
  "Street Food",
  "Desserts",
  "Multi-cuisine",
  "Continental",
  "Pizza",
] as const;

export const CITIES = [
  "Delhi",
  "Mumbai",
  "Bengaluru",
  "Hyderabad",
  "Pune",
  "Jaipur",
  "Lucknow",
  "Chandigarh",
  "Ahmedabad",
  "Kolkata",
  "Indore",
  "Noida",
  "Gurugram",
] as const;

export const EXECUTIVE_ROLES = ["Sales Executive", "Senior Executive", "Team Lead"] as const;
export type ExecutiveRole = (typeof EXECUTIVE_ROLES)[number];

export type AssignmentMode = "manual" | "auto";

export interface Lead {
  id: string;
  customerName: string;
  phone: string;
  restaurantName: string;
  city: string;
  cuisine: string;
  service: string;
  source: LeadSource;
  executiveId: string | null;
  assignmentMode: AssignmentMode | null;
  status: LeadStatus;
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

export interface Executive {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: ExecutiveRole;
  city: string;
  active: boolean;
  inRotation: boolean;
  joinedAt: string;
}

export type FollowUpStatus = "pending" | "done";

export interface FollowUp {
  id: string;
  leadId: string;
  executiveId: string | null;
  dueAt: string;
  note: string;
  status: FollowUpStatus;
  outcome: string;
  createdAt: string;
  completedAt: string | null;
}

export type ActivityType = "created" | "status" | "assigned" | "note" | "follow_up";

export interface LeadActivity {
  id: string;
  leadId: string;
  type: ActivityType;
  message: string;
  createdAt: string;
}

export interface AssignmentSettings {
  autoAssign: boolean;
  lastAssignedExecutiveId: string | null;
}

export type LeadInput = Omit<
  Lead,
  "id" | "createdAt" | "updatedAt" | "assignmentMode" | "executiveId"
> & {
  /** null = leave unassigned, "auto" = round robin, otherwise an executive id */
  executiveId: string | null | "auto";
};

export type ExecutiveInput = Omit<Executive, "id" | "joinedAt">;

export type StatusTone = "info" | "neutral" | "brand" | "warning" | "teal" | "success" | "danger";

export const STATUS_TONE: Record<LeadStatus, StatusTone> = {
  New: "info",
  "Not Called": "neutral",
  "Call Connected": "info",
  Interested: "brand",
  "Follow-up Required": "warning",
  "Quotation Shared": "teal",
  "Payment Pending": "warning",
  Converted: "success",
  Lost: "danger",
  "Not Interested": "neutral",
};

/** Statuses that mean the lead is closed and needs no further work. */
export const CLOSED_STATUSES: LeadStatus[] = ["Converted", "Lost", "Not Interested"];
