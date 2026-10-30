// Fictional demo data so the interface can be explored before the company
// database is connected. None of these people, restaurants or numbers are real.
import { addDays, subDays, setHours } from "date-fns";
import { rotationPool } from "./assignment";
import {
  CITIES,
  CUISINES,
  EXECUTIVE_ROLES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  SERVICES,
  type CrmData,
} from "./data-shape";
import type { Executive, FollowUp, Lead, LeadActivity, LeadStatus } from "./types";

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = [
  "Aarav", "Vivaan", "Aditya", "Ishaan", "Kabir", "Rohan", "Arjun", "Karan", "Nikhil", "Rahul",
  "Priya", "Ananya", "Diya", "Kavya", "Meera", "Neha", "Pooja", "Riya", "Sneha", "Tanvi",
  "Farhan", "Imran", "Harpreet", "Gurpreet", "Suresh", "Ramesh", "Lakshmi", "Deepak", "Manish", "Sanjay",
];
const LAST = [
  "Sharma", "Verma", "Gupta", "Mehta", "Iyer", "Reddy", "Nair", "Khan", "Singh", "Kapoor",
  "Joshi", "Patel", "Das", "Bose", "Malhotra", "Chawla", "Agarwal", "Rao", "Pillai", "Saxena",
];
const R_PREFIX = [
  "Spice", "Tandoor", "Masala", "Saffron", "Curry", "Chai", "Royal", "Urban", "Desi", "Golden",
  "Biryani", "Dosa", "Momo", "Tikka", "Paratha", "Coastal", "Punjabi", "Lucky", "Green", "Midnight",
];
const R_SUFFIX = [
  "Kitchen", "House", "Junction", "Corner", "Bistro", "Dhaba", "Express", "Point", "Cafe", "Eatery",
  "Bowl", "Grill", "Tales", "Story", "Hub",
];
const REMARKS = [
  "Owner wants both Swiggy and Zomato live before festive season.",
  "Asked for pricing on menu revamp and photoshoot.",
  "Already on Zomato, wants Swiggy onboarding only.",
  "Call back after 6 PM, busy during lunch rush.",
  "Interested in ads management, budget discussion pending.",
  "FSSAI licence in process, follow up next week.",
  "Requested quotation on WhatsApp.",
  "Not reachable on first attempt.",
  "",
];

export function buildSeed(now = new Date()): CrmData {
  const rand = mulberry32(20261030);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
  const phone = () => `9${Math.floor(100000000 + rand() * 899999999)}`;

  const execNames = new Set<string>();
  while (execNames.size < 22) execNames.add(`${pick(FIRST)} ${pick(LAST)}`);
  const executives: Executive[] = [...execNames].map((name, i) => ({
    id: `exe_${String(i + 1).padStart(3, "0")}`,
    name,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    phone: phone(),
    role: i < 2 ? "Team Lead" : i < 7 ? "Senior Executive" : EXECUTIVE_ROLES[0],
    city: pick(CITIES),
    active: i !== 19,
    inRotation: i !== 19 && i !== 21,
    joinedAt: subDays(now, 60 + Math.floor(rand() * 600)).toISOString(),
  }));

  const statusWeights: [LeadStatus, number][] = [
    ["New", 14], ["Not Called", 8], ["Call Connected", 10], ["Interested", 12],
    ["Follow-up Required", 14], ["Quotation Shared", 9], ["Payment Pending", 6],
    ["Converted", 16], ["Lost", 6], ["Not Interested", 5],
  ];
  const totalW = statusWeights.reduce((s, [, w]) => s + w, 0);
  const pickStatus = (): LeadStatus => {
    let r = rand() * totalW;
    for (const [s, w] of statusWeights) if ((r -= w) <= 0) return s;
    return LEAD_STATUSES[0];
  };

  const leads: Lead[] = [];
  const activities: LeadActivity[] = [];
  const followUps: FollowUp[] = [];
  const assignable = rotationPool(executives);

  for (let i = 0; i < 140; i++) {
    const created = subDays(now, Math.floor(Math.pow(rand(), 1.4) * 75));
    created.setHours(9 + Math.floor(rand() * 10), Math.floor(rand() * 60));
    const status = i < 6 ? "New" : pickStatus();
    const unassigned = status === "New" && rand() < 0.35;
    const exec = unassigned ? null : assignable[i % assignable.length];
    const id = `lead_${String(i + 1).padStart(4, "0")}`;
    const lead: Lead = {
      id,
      customerName: `${pick(FIRST)} ${pick(LAST)}`,
      phone: phone(),
      restaurantName: `${pick(R_PREFIX)} ${pick(R_SUFFIX)}`,
      city: pick(CITIES),
      cuisine: pick(CUISINES),
      service: pick(SERVICES),
      source: pick(LEAD_SOURCES),
      executiveId: exec?.id ?? null,
      assignmentMode: exec ? (rand() < 0.7 ? "auto" : "manual") : null,
      status,
      remarks: pick(REMARKS),
      createdAt: created.toISOString(),
      updatedAt: created.toISOString(),
    };
    leads.push(lead);
    activities.push({
      id: `act_${id}_c`,
      leadId: id,
      type: "created",
      message: `Lead captured from ${lead.source}`,
      createdAt: lead.createdAt,
    });
    if (exec) {
      activities.push({
        id: `act_${id}_a`,
        leadId: id,
        type: "assigned",
        message: `Assigned to ${exec.name}${lead.assignmentMode === "auto" ? " (round robin)" : ""}`,
        createdAt: lead.createdAt,
      });
    }
    if (status !== "New") {
      activities.push({
        id: `act_${id}_s`,
        leadId: id,
        type: "status",
        message: `Status changed to ${status}`,
        createdAt: addDays(created, 1).toISOString(),
      });
    }
    if (["Follow-up Required", "Interested", "Quotation Shared", "Payment Pending", "Call Connected"].includes(status)) {
      const offset = Math.floor(rand() * 9) - 3;
      followUps.push({
        id: `fu_${id}`,
        leadId: id,
        executiveId: lead.executiveId,
        dueAt: setHours(addDays(now, offset), 10 + Math.floor(rand() * 8)).toISOString(),
        note: pick([
          "Share Swiggy onboarding checklist",
          "Confirm documents: FSSAI, GST, PAN",
          "Discuss growth package pricing",
          "Collect payment for onboarding",
          "Call back to finalise quotation",
        ]),
        status: "pending",
        outcome: "",
        createdAt: created.toISOString(),
        completedAt: null,
      });
    }
  }

  // A few intentional duplicates so duplicate detection can be seen in action.
  for (const [a, b] of [[3, 41], [12, 88], [27, 103]]) {
    leads[b].phone = `+91 ${leads[a].phone.slice(0, 5)} ${leads[a].phone.slice(5)}`;
  }

  // Completed follow-ups history.
  for (let i = 0; i < 30; i++) {
    const lead = leads[(i * 7) % leads.length];
    const due = subDays(now, 2 + Math.floor(rand() * 20));
    followUps.push({
      id: `fu_done_${i}`,
      leadId: lead.id,
      executiveId: lead.executiveId,
      dueAt: due.toISOString(),
      note: "Introductory call",
      status: "done",
      outcome: pick(["Spoke with owner", "Shared brochure", "Asked to call later", "Meeting fixed"]),
      createdAt: subDays(due, 1).toISOString(),
      completedAt: due.toISOString(),
    });
  }

  const lastAuto = [...leads].reverse().find((l) => l.assignmentMode === "auto");
  return {
    leads,
    executives,
    followUps,
    activities,
    settings: { autoAssign: true, lastAssignedExecutiveId: lastAuto?.executiveId ?? null },
  };
}
