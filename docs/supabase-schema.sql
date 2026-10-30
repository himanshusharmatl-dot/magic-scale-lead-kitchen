-- Magic Scale CRM — schema for the company-owned Supabase project.
-- Run in the Supabase SQL editor of Magic Scale's own project.
-- Contains NO data. Review before running in production.

-- ---------- Enums ----------
create type public.lead_status as enum (
  'New','Not Called','Call Connected','Interested','Follow-up Required',
  'Quotation Shared','Payment Pending','Converted','Lost','Not Interested'
);
create type public.lead_source as enum ('Manual','Website','CRM Enquiry Page','Advertisement');
create type public.executive_role as enum ('Sales Executive','Senior Executive','Team Lead');
create type public.assignment_mode as enum ('manual','auto');
create type public.app_role as enum ('admin','executive');

-- ---------- Roles (separate table, never on profiles) ----------
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users read own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid());
create policy "Admins manage roles" on public.user_roles
  for all to authenticated using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ---------- Executives ----------
create table public.executives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null unique,
  phone text not null,
  role public.executive_role not null default 'Sales Executive',
  city text not null,
  active boolean not null default true,
  in_rotation boolean not null default true,
  joined_at timestamptz not null default now()
);

-- ---------- Leads ----------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  phone_normalized text generated always as (right(regexp_replace(phone, '\D', '', 'g'), 10)) stored,
  restaurant_name text not null,
  city text not null,
  cuisine text not null,
  service text not null,
  source public.lead_source not null default 'Manual',
  executive_id uuid references public.executives(id) on delete set null,
  assignment_mode public.assignment_mode,
  status public.lead_status not null default 'New',
  remarks text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_phone_normalized_idx on public.leads (phone_normalized);
create index leads_executive_idx on public.leads (executive_id);
create index leads_status_idx on public.leads (status);

-- ---------- Follow-ups ----------
create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  executive_id uuid references public.executives(id) on delete set null,
  due_at timestamptz not null,
  note text not null default '',
  status text not null default 'pending' check (status in ('pending','done')),
  outcome text not null default '',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index follow_ups_due_idx on public.follow_ups (status, due_at);

-- ---------- Activity log ----------
create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  type text not null check (type in ('created','status','assigned','note','follow_up')),
  message text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- Assignment settings (single row) ----------
create table public.assignment_settings (
  id boolean primary key default true check (id),
  auto_assign boolean not null default true,
  last_assigned_executive_id uuid references public.executives(id) on delete set null
);
insert into public.assignment_settings (id) values (true);

-- ---------- Round robin (atomic, server-side) ----------
create or replace function public.next_round_robin_executive()
returns uuid language plpgsql security definer set search_path = public as $$
declare
  _last uuid;
  _next uuid;
begin
  select last_assigned_executive_id into _last from assignment_settings where id for update;
  select e.id into _next from executives e
   where e.active and e.in_rotation
     and (_last is null or (e.name, e.id) > (select name, id from executives where id = _last))
   order by e.name, e.id limit 1;
  if _next is null then
    select e.id into _next from executives e where e.active and e.in_rotation order by e.name, e.id limit 1;
  end if;
  update assignment_settings set last_assigned_executive_id = _next where id;
  return _next;
end $$;

-- ---------- Row level security: admins only (extend for executives later) ----------
alter table public.executives enable row level security;
alter table public.leads enable row level security;
alter table public.follow_ups enable row level security;
alter table public.lead_activities enable row level security;
alter table public.assignment_settings enable row level security;

create policy "Admins full access" on public.executives for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins full access" on public.leads for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins full access" on public.follow_ups for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins full access" on public.lead_activities for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins full access" on public.assignment_settings for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

grant select, insert, update, delete on
  public.executives, public.leads, public.follow_ups, public.lead_activities,
  public.assignment_settings, public.user_roles
to authenticated;
grant execute on function public.next_round_robin_executive() to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

-- Website / CRM Enquiry Page leads should be inserted through a server-side
-- endpoint that validates the request, not by granting anon insert on leads.
