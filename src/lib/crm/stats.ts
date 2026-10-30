import { isSameDay, isBefore, startOfDay } from "date-fns";
import type { Executive, FollowUp, Lead } from "./types";
import { CLOSED_STATUSES } from "./types";

export function computeLeadStats(leads: Lead[], followUps: FollowUp[], now = new Date()) {
  const pending = followUps.filter((f) => f.status === "pending");
  return {
    total: leads.length,
    newLeads: leads.filter((l) => l.status === "New").length,
    followUps: pending.length,
    followUpsDueToday: pending.filter((f) => isSameDay(new Date(f.dueAt), now)).length,
    overdueFollowUps: pending.filter((f) => isBefore(new Date(f.dueAt), startOfDay(now))).length,
    converted: leads.filter((l) => l.status === "Converted").length,
    lost: leads.filter((l) => l.status === "Lost").length,
    unassigned: leads.filter((l) => !l.executiveId).length,
  };
}

export function conversionRate(converted: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((converted / total) * 1000) / 10;
}

export interface ExecutivePerformance {
  executive: Executive;
  assigned: number;
  open: number;
  converted: number;
  lost: number;
  pendingFollowUps: number;
  conversionRate: number;
}

export function executivePerformance(
  executives: Executive[],
  leads: Lead[],
  followUps: FollowUp[],
): ExecutivePerformance[] {
  return executives.map((executive) => {
    const mine = leads.filter((l) => l.executiveId === executive.id);
    const converted = mine.filter((l) => l.status === "Converted").length;
    return {
      executive,
      assigned: mine.length,
      open: mine.filter((l) => !CLOSED_STATUSES.includes(l.status)).length,
      converted,
      lost: mine.filter((l) => l.status === "Lost" || l.status === "Not Interested").length,
      pendingFollowUps: followUps.filter(
        (f) => f.executiveId === executive.id && f.status === "pending",
      ).length,
      conversionRate: conversionRate(converted, mine.length),
    };
  });
}
