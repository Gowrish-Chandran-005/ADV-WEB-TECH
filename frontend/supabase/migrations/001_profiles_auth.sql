-- Phase 1 authentication foundation for GearLoop
-- Run this in Supabase SQL Editor.

create type public.user_role as enum ('RENTER', 'OWNER', 'ADMIN');
create type public.account_status as enum ('ACTIVE', 'SUSPENDED');

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  phone text,
  avatar_url text,
  bio text,
  role public.user_role not null default 'RENTER',
  account_status public.account_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
  normalized_role public.user_role;
  signup_name text;
  signup_phone text;
begin
  requested_role := coalesce(trim(new.raw_user_meta_data->>'role'), 'RENTER');
  signup_name := coalesce(trim(new.raw_user_meta_data->>'name'), '');
  signup_phone := coalesce(trim(new.raw_user_meta_data->>'phone'), '');

  if lower(requested_role) in ('renter', 'owner') then
    normalized_role := upper(requested_role)::public.user_role;
  else
    normalized_role := 'RENTER';
  end if;

  insert into public.profiles (
    id,
    email,
    name,
    phone,
    role,
    account_status,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    case when signup_name = '' then 'User' else signup_name end,
    case when signup_phone = '' then null else signup_phone end,
    normalized_role,
    'ACTIVE',
    now(),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(public.profiles.name, excluded.name),
    phone = excluded.phone,
    role = public.profiles.role,
    updated_at = now();

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create policy "Users can read their own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Users cannot read other users' profiles"
on public.profiles
for select
using (auth.uid() = id);

create policy "Users can insert their own profile row"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "Users can update their own safe profile data"
on public.profiles
for update
using (auth.uid() = id)
with check (
  auth.uid() = id
  and id = old.id
  and role = old.role
  and account_status = old.account_status
);

create policy "Admins can read all profiles"
on public.profiles
for select
using (
  exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid()
      and p.role = 'ADMIN'
  )
);

create policy "Admins can update admin-managed profile values"
on public.profiles
for update
using (
  exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid()
      and p.role = 'ADMIN'
  )
)
with check (
  exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid()
      and p.role = 'ADMIN'
  )
);

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute procedure public.update_updated_at_column();

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_role_idx on public.profiles (role, account_status);

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('RENTER', 'OWNER', 'ADMIN'));

alter table public.profiles
  add constraint profiles_account_status_check
  check (account_status in ('ACTIVE', 'SUSPENDED'));
