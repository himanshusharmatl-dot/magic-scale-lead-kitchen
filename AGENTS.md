<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Project rules

- All CRM data access goes through the `CrmRepository` interface (`src/lib/crm/repository.ts`) and the single `crm` export in `src/lib/crm/index.ts` — so the demo source can be swapped for the company's external database without touching UI.
- Do not enable Lovable Cloud; the permanent database is an external Supabase project owned by the client (see docs/SUPABASE_INTEGRATION.md and docs/supabase-schema.sql).
- Admin auth lives behind `src/lib/auth.ts` (getSession/signIn/signOut) and the `_authenticated` layout (`ssr: false`) — so swapping to real auth is one file.
- Business rules (round robin, phone normalisation, stats) are pure functions in `src/lib/crm/*.ts` with tests in `crm-rules.test.ts` — keep logic out of components so it can be tested and reused server-side.
- Reads use react-query `queryOptions` from `src/lib/crm/queries.ts` (keys prefixed `["crm"]`); writes use `useCrmMutation`, which invalidates the whole `["crm"]` prefix.
