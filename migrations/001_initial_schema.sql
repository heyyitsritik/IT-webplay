-- ============================================================
-- IT-WebPlay: Supabase Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Profiles table (extends auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  role        text not null default 'user'
                check (role in ('user', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. Game accounts table
create table if not exists public.game_accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  display_name    text not null,
  username_enc    text not null,   -- AES-256-GCM encrypted game email
  password_enc    text not null,   -- AES-256-GCM encrypted game password
  zone            text not null default 'E'
                    check (zone in ('E', 'W')),
  server          integer not null,
  sort_order      integer not null default 0,
  device_no       text,            -- persistent device fingerprint per account
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 3. Admin audit logs
create table if not exists public.admin_logs (
  id                uuid primary key default gen_random_uuid(),
  admin_id          uuid not null references public.profiles(id),
  action            text not null,
  target_user_id    uuid references public.profiles(id),
  target_account_id uuid references public.game_accounts(id),
  details           jsonb,
  created_at        timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists idx_game_accounts_user_id
  on public.game_accounts(user_id);

create index if not exists idx_game_accounts_sort
  on public.game_accounts(user_id, sort_order);

create index if not exists idx_admin_logs_admin
  on public.admin_logs(admin_id, created_at desc);

create index if not exists idx_admin_logs_target
  on public.admin_logs(target_user_id, created_at desc);

-- ============================================================
-- Row Level Security
-- ============================================================

-- Profiles
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile (non-role fields)"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Game accounts: full user isolation
alter table public.game_accounts enable row level security;

create policy "Users can view own game accounts"
  on public.game_accounts for select
  using (auth.uid() = user_id);

create policy "Users can insert own game accounts"
  on public.game_accounts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own game accounts"
  on public.game_accounts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own game accounts"
  on public.game_accounts for delete
  using (auth.uid() = user_id);

-- Admin logs: no direct client access (use service role only)
alter table public.admin_logs enable row level security;

create policy "No direct access to admin logs"
  on public.admin_logs for all
  using (false);

-- ============================================================
-- Triggers
-- ============================================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

drop trigger if exists game_accounts_updated_at on public.game_accounts;
create trigger game_accounts_updated_at
  before update on public.game_accounts
  for each row execute function public.update_updated_at();

-- ============================================================
-- Seed: make the first registered user an admin (optional)
-- Uncomment and set your user ID after first signup
-- ============================================================
-- update public.profiles set role = 'admin' where email = 'your@email.com';
