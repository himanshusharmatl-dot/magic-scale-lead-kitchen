import type { Lead } from "./types";

/**
 * Normalise an Indian phone number so "+91 98765-43210", "098765 43210" and
 * "9876543210" are treated as the same number.
 */
export function normalizePhone(raw: string): string {
  let digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

export function isValidPhone(raw: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizePhone(raw));
}

export function formatPhone(raw: string): string {
  const d = normalizePhone(raw);
  if (d.length !== 10) return raw;
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
}

/** Other leads that share this phone number (ignoring `excludeId`). */
export function findDuplicateLeads(leads: Lead[], phone: string, excludeId?: string): Lead[] {
  const target = normalizePhone(phone);
  if (target.length < 10) return [];
  return leads.filter((l) => l.id !== excludeId && normalizePhone(l.phone) === target);
}

/** Set of lead ids whose phone number appears on more than one lead. */
export function duplicateLeadIds(leads: Lead[]): Set<string> {
  const byPhone = new Map<string, string[]>();
  for (const l of leads) {
    const key = normalizePhone(l.phone);
    if (!key) continue;
    byPhone.set(key, [...(byPhone.get(key) ?? []), l.id]);
  }
  const ids = new Set<string>();
  for (const group of byPhone.values()) if (group.length > 1) group.forEach((id) => ids.add(id));
  return ids;
}
