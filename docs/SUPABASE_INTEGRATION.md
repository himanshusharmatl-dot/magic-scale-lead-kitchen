# Connecting Magic Scale's own Supabase database

The CRM currently runs on **demo data stored in the browser** (`src/lib/crm/local-repository.ts`).
No real customer data and no credentials are in this codebase.

## 1. Prepare the database
Run `docs/supabase-schema.sql` in the SQL editor of Magic Scale's Supabase project.
Then make the first admin:

```sql
insert into public.user_roles (user_id, role) values ('<auth-user-uuid>', 'admin');
```

## 2. Connect the project
In Lovable: **Project Settings → General → External Supabase → Connect**, and pick the
Magic Scale project. Only the project URL and publishable (anon) key reach the app.
Never paste the `service_role` key into code or chat.

## 3. Swap the data source
1. Create `src/lib/crm/supabase-repository.ts` implementing `CrmRepository`
   (`src/lib/crm/repository.ts`). Map snake_case columns to the camelCase types in
   `src/lib/crm/types.ts`.
   - Auto assignment: call `rpc('next_round_robin_executive')` so the pointer is updated atomically.
   - Duplicate detection: query `leads` by `phone_normalized`.
2. In `src/lib/crm/index.ts`, export the Supabase repository instead of `localRepository`.

## 4. Real admin sign-in
Replace the bodies of `signIn`, `signOut` and `getSession` in `src/lib/auth.ts` with
Supabase Auth calls, and check `has_role(auth.uid(), 'admin')` after sign-in.

## Field mapping
| App field | Column |
|---|---|
| customerName | customer_name |
| restaurantName | restaurant_name |
| executiveId | executive_id |
| assignmentMode | assignment_mode |
| inRotation | in_rotation |
| dueAt / completedAt | due_at / completed_at |
| lastAssignedExecutiveId | last_assigned_executive_id |
