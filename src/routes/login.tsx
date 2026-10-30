import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/crm/logo";
import { getSession, signIn } from "@/lib/auth";
import heroImg from "@/assets/login-hero.jpg";

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  beforeLoad: () => {
    if (getSession()) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Admin sign in — Magic Scale CRM" },
      { name: "description", content: "Sign in to the Magic Scale CRM admin console." },
      { property: "og:title", content: "Admin sign in — Magic Scale CRM" },
      { property: "og:description", content: "Sign in to the Magic Scale CRM admin console." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect: back } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      if (back && back.startsWith("/")) navigate({ to: back, replace: true });
      else navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-gradient-ink text-ink-foreground lg:block">
        <img
          src={heroImg}
          alt="Chef plating biryani in a busy restaurant kitchen"
          width={1200}
          height={1600}
          className="absolute inset-0 h-full w-full object-cover opacity-55 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/10" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo />
          <div className="max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-glow">
              Swiggy · Zomato · Growth
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight">
              Every restaurant lead, from first call to first order.
            </h2>
            <p className="mt-4 text-sm leading-relaxed opacity-75">
              Track onboarding enquiries, assign them fairly across your team and never miss a
              follow-up.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-semibold">Admin sign in</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Use your Magic Scale admin account to continue.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@magicscale.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>
            {error && (
              <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" variant="brand" size="lg" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              Sign in
            </Button>
          </form>

          <div className="mt-8 flex gap-3 rounded-xl border border-dashed bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
            <p>
              <span className="font-semibold text-foreground">Preview mode.</span> Any email and a
              6+ character password opens the demo. Real admin accounts will be checked against
              Magic Scale's own database once it's connected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
