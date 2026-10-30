// Admin session handling.
// DEMO MODE: sign-in is simulated in the browser so the interface can be
// reviewed. When Magic Scale's Supabase project is connected, replace the
// bodies of signIn/signOut/getSession with Supabase Auth calls
// (see docs/SUPABASE_INTEGRATION.md). No credentials are stored here.

export interface AdminSession {
  email: string;
  name: string;
  role: "admin";
  signedInAt: string;
}

const KEY = "magicscale-crm-session";

export function getSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AdminSession) : null;
  } catch {
    return null;
  }
}

export async function signIn(email: string, password: string): Promise<AdminSession> {
  await new Promise((r) => setTimeout(r, 400));
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email address");
  if (password.length < 6) throw new Error("Password must be at least 6 characters");
  const name = email
    .split("@")[0]
    .split(/[._-]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
  const session: AdminSession = { email, name, role: "admin", signedInAt: new Date().toISOString() };
  window.localStorage.setItem(KEY, JSON.stringify(session));
  return session;
}

export async function signOut() {
  window.localStorage.removeItem(KEY);
}
