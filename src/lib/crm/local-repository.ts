// Browser-only demo data source. Data lives in localStorage on this device and
// is replaced by the company Supabase database once connected.
import { distributeRoundRobin, pickNextExecutive, rotationPool } from "./assignment";
import type { CrmData } from "./data-shape";
import type { CrmRepository } from "./repository";
import { buildSeed } from "./seed";
import type { Lead, LeadActivity } from "./types";

const STORAGE_KEY = "magicscale-crm-demo-v1";

let cache: CrmData | null = null;

function load(): CrmData {
  if (cache) return cache;
  if (typeof window === "undefined") return (cache = buildSeed());
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return (cache = JSON.parse(raw) as CrmData);
  } catch {
    /* fall through to seed */
  }
  cache = buildSeed();
  save();
  return cache;
}

function save() {
  if (typeof window === "undefined" || !cache) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
}

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const nowIso = () => new Date().toISOString();
const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 60));

function log(data: CrmData, leadId: string, type: LeadActivity["type"], message: string) {
  data.activities.push({ id: uid("act"), leadId, type, message, createdAt: nowIso() });
}

function execName(data: CrmData, id: string | null) {
  return data.executives.find((e) => e.id === id)?.name ?? "Unassigned";
}

function mustFind<T extends { id: string }>(arr: T[], id: string, what: string): T {
  const item = arr.find((x) => x.id === id);
  if (!item) throw new Error(`${what} not found`);
  return item;
}

export const localRepository: CrmRepository = {
  mode: "demo",

  async listLeads() {
    return delay([...load().leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },

  async createLead(input) {
    const data = load();
    let executiveId: string | null = null;
    let assignmentMode: Lead["assignmentMode"] = null;
    if (input.executiveId === "auto") {
      const next = pickNextExecutive(rotationPool(data.executives), data.settings.lastAssignedExecutiveId);
      if (next) {
        executiveId = next.id;
        assignmentMode = "auto";
        data.settings.lastAssignedExecutiveId = next.id;
      }
    } else if (input.executiveId) {
      executiveId = input.executiveId;
      assignmentMode = "manual";
    }
    const lead: Lead = {
      ...input,
      id: uid("lead"),
      executiveId,
      assignmentMode,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    data.leads.push(lead);
    log(data, lead.id, "created", `Lead captured from ${lead.source}`);
    if (executiveId) {
      log(data, lead.id, "assigned", `Assigned to ${execName(data, executiveId)}${assignmentMode === "auto" ? " (round robin)" : ""}`);
    }
    save();
    return delay(lead);
  },

  async updateLead(id, patch) {
    const data = load();
    const lead = mustFind(data.leads, id, "Lead");
    if (patch.status && patch.status !== lead.status) log(data, id, "status", `Status changed to ${patch.status}`);
    if (patch.executiveId !== undefined && patch.executiveId !== lead.executiveId) {
      log(data, id, "assigned", `Assigned to ${execName(data, patch.executiveId)}`);
      patch.assignmentMode = patch.executiveId ? "manual" : null;
    }
    Object.assign(lead, patch, { updatedAt: nowIso() });
    save();
    return delay(lead);
  },

  async deleteLead(id) {
    const data = load();
    data.leads = data.leads.filter((l) => l.id !== id);
    data.followUps = data.followUps.filter((f) => f.leadId !== id);
    data.activities = data.activities.filter((a) => a.leadId !== id);
    save();
    return delay(undefined);
  },

  async assignLeads(leadIds, executiveId) {
    const data = load();
    for (const id of leadIds) {
      const lead = mustFind(data.leads, id, "Lead");
      lead.executiveId = executiveId;
      lead.assignmentMode = "manual";
      lead.updatedAt = nowIso();
      log(data, id, "assigned", `Assigned to ${execName(data, executiveId)}`);
      for (const f of data.followUps) if (f.leadId === id && f.status === "pending") f.executiveId = executiveId;
    }
    save();
    return delay(undefined);
  },

  async autoAssignLeads(leadIds) {
    const data = load();
    const { assignments, lastAssignedId } = distributeRoundRobin(
      leadIds,
      rotationPool(data.executives),
      data.settings.lastAssignedExecutiveId,
    );
    for (const { leadId, executiveId } of assignments) {
      const lead = mustFind(data.leads, leadId, "Lead");
      lead.executiveId = executiveId;
      lead.assignmentMode = "auto";
      lead.updatedAt = nowIso();
      log(data, leadId, "assigned", `Assigned to ${execName(data, executiveId)} (round robin)`);
    }
    data.settings.lastAssignedExecutiveId = lastAssignedId;
    save();
    return delay(assignments.length);
  },

  async setLeadStatus(id, status) {
    await localRepository.updateLead(id, { status });
  },

  async listExecutives() {
    return delay([...load().executives].sort((a, b) => a.name.localeCompare(b.name)));
  },

  async createExecutive(input) {
    const data = load();
    const exe = { ...input, id: uid("exe"), joinedAt: nowIso() };
    data.executives.push(exe);
    save();
    return delay(exe);
  },

  async updateExecutive(id, patch) {
    const data = load();
    const exe = mustFind(data.executives, id, "Executive");
    Object.assign(exe, patch);
    if (!exe.active) exe.inRotation = false;
    save();
    return delay(exe);
  },

  async listFollowUps() {
    return delay([...load().followUps].sort((a, b) => a.dueAt.localeCompare(b.dueAt)));
  },

  async createFollowUp(input) {
    const data = load();
    const lead = mustFind(data.leads, input.leadId, "Lead");
    const fu = {
      id: uid("fu"),
      leadId: input.leadId,
      executiveId: input.executiveId ?? lead.executiveId,
      dueAt: input.dueAt,
      note: input.note,
      status: "pending" as const,
      outcome: "",
      createdAt: nowIso(),
      completedAt: null,
    };
    data.followUps.push(fu);
    log(data, input.leadId, "follow_up", `Follow-up scheduled: ${input.note || "Call back"}`);
    save();
    return delay(fu);
  },

  async completeFollowUp(id, outcome) {
    const data = load();
    const fu = mustFind(data.followUps, id, "Follow-up");
    fu.status = "done";
    fu.outcome = outcome;
    fu.completedAt = nowIso();
    log(data, fu.leadId, "follow_up", `Follow-up completed${outcome ? `: ${outcome}` : ""}`);
    save();
    return delay(undefined);
  },

  async rescheduleFollowUp(id, dueAt) {
    const data = load();
    const fu = mustFind(data.followUps, id, "Follow-up");
    fu.dueAt = dueAt;
    save();
    return delay(undefined);
  },

  async listActivities(leadId) {
    return delay(
      load()
        .activities.filter((a) => a.leadId === leadId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  },

  async addNote(leadId, message) {
    const data = load();
    log(data, leadId, "note", message);
    save();
    return delay(undefined);
  },

  async getSettings() {
    return delay(load().settings);
  },

  async updateSettings(patch) {
    const data = load();
    Object.assign(data.settings, patch);
    save();
    return delay(data.settings);
  },

  async resetDemoData() {
    cache = buildSeed();
    save();
    return delay(undefined);
  },
};
