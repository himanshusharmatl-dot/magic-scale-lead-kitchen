import { localRepository } from "./local-repository";
import type { CrmRepository } from "./repository";

/**
 * Single switch point for the data source.
 * Today: browser demo data. Later: replace with the Magic Scale Supabase
 * repository (see docs/SUPABASE_INTEGRATION.md).
 */
export const crm: CrmRepository = localRepository;

export * from "./types";
