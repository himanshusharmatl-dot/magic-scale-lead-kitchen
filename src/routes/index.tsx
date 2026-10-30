import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Magic Scale CRM — Restaurant Growth Leads" },
      { name: "description", content: "Magic Scale's internal CRM for Swiggy & Zomato onboarding leads." },
      { property: "og:title", content: "Magic Scale CRM — Restaurant Growth Leads" },
      { property: "og:description", content: "Magic Scale's internal CRM for Swiggy & Zomato onboarding leads." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
