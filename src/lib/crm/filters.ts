import { normalizePhone } from "./phone";
import type { Lead } from "./types";

export interface LeadFilters {
  q?: string;
  status?: string;
  source?: string;
  executive?: string; // executive id or "unassigned"
  city?: string;
  dup?: boolean;
}

export function filterLeads(leads: Lead[], f: LeadFilters, duplicateIds: Set<string>): Lead[] {
  const q = f.q?.trim().toLowerCase();
  const qDigits = q ? normalizePhone(q) : "";
  return leads.filter((l) => {
    if (f.status && l.status !== f.status) return false;
    if (f.source && l.source !== f.source) return false;
    if (f.city && l.city !== f.city) return false;
    if (f.executive === "unassigned" ? l.executiveId !== null : f.executive && l.executiveId !== f.executive) return false;
    if (f.dup && !duplicateIds.has(l.id)) return false;
    if (q) {
      const text = `${l.customerName} ${l.restaurantName} ${l.city} ${l.remarks}`.toLowerCase();
      const phoneHit = qDigits.length >= 3 && normalizePhone(l.phone).includes(qDigits);
      if (!text.includes(q) && !phoneHit) return false;
    }
    return true;
  });
}
