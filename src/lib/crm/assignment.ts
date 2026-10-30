import type { Executive } from "./types";

/** Executives eligible for automatic assignment, in a stable rotation order. */
export function rotationPool(executives: Executive[]): Executive[] {
  return executives
    .filter((e) => e.active && e.inRotation)
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

/**
 * Round robin: the executive after the last one who received a lead.
 * Wraps to the start; if the last executive left the pool, starts from the first.
 */
export function pickNextExecutive(pool: Executive[], lastAssignedId: string | null): Executive | null {
  if (pool.length === 0) return null;
  const idx = lastAssignedId ? pool.findIndex((e) => e.id === lastAssignedId) : -1;
  return pool[(idx + 1) % pool.length];
}

/** Assign several leads in turn. Returns lead→executive pairs and the new pointer. */
export function distributeRoundRobin(
  leadIds: string[],
  pool: Executive[],
  lastAssignedId: string | null,
): { assignments: { leadId: string; executiveId: string }[]; lastAssignedId: string | null } {
  const assignments: { leadId: string; executiveId: string }[] = [];
  let last = lastAssignedId;
  for (const leadId of leadIds) {
    const next = pickNextExecutive(pool, last);
    if (!next) break;
    assignments.push({ leadId, executiveId: next.id });
    last = next.id;
  }
  return { assignments, lastAssignedId: last };
}

/** Upcoming executives in the queue, starting with who gets the next lead. */
export function upcomingQueue(pool: Executive[], lastAssignedId: string | null): Executive[] {
  const first = pickNextExecutive(pool, lastAssignedId);
  if (!first) return [];
  const start = pool.findIndex((e) => e.id === first.id);
  return [...pool.slice(start), ...pool.slice(0, start)];
}
