-- AfroTarn order workflow
-- Payment -> preparation -> ready -> collected

create extension if not exists pgcrypto;

create type public.order_status as enum (
  'pending_payment',
  'paid',
  'preparing',
  'ready',
  'collected',
  'cancelled',
  'refunded'
);

create type public.payment_method as enum ('card', 'apple_pay', 'google_pay', 'other');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'staff' check (role in ('admin','staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists public.order_number_seq start 1;

create or replace function public.generate_order_number()
returns text
language plpgsql
as $$
declare
  seq_value bigint;
begin
  seq_value := nextval('public.order_number_seq');
  return 'AFR-' || to_char(now() at time zone 'Europe/Paris', 'YYMMDD') || '-' || lpad(seq_value::text, 4, '0');
end;
$$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default public.generate_order_number(),
  status public.order_status not null default 'pending_payment',
  customer_email text not null,
  customer_name text,
  customer_phone text,
  currency text not null default 'EUR',
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  payment_method public.payment_method,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  paid_at timestamptz,
  preparing_at timestamptz,
  ready_at timestamptz,
  collected_at timestamptz,
  cancelled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null default 0 check (unit_price_cents >= 0),
  line_total_cents integer generated always as (quantity * unit_price_cents) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null,
  from_status public.order_status,
  to_status public.order_status,
  actor_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  template text not null check (template in ('payment_confirmed','order_ready','order_cancelled','order_refunded')),
  recipient text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed')),
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_status_created_idx on public.orders(status, created_at desc);
create index if not exists orders_customer_email_idx on public.orders(customer_email);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists order_events_order_idx on public.order_events(order_id, created_at desc);
create index if not exists email_outbox_status_idx on public.email_outbox(status, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger email_outbox_set_updated_at
before update on public.email_outbox
for each row execute function public.set_updated_at();

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','staff')
  );
$$;

create or replace function public.set_order_status(p_order_id uuid, p_status public.order_status)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order public.orders;
  previous_status public.order_status;
begin
  if not public.is_staff() then
    raise exception 'not authorized';
  end if;

  select * into current_order from public.orders where id = p_order_id for update;
  if current_order.id is null then
    raise exception 'order not found';
  end if;

  previous_status := current_order.status;

  update public.orders
  set status = p_status,
      preparing_at = case when p_status = 'preparing' and preparing_at is null then now() else preparing_at end,
      ready_at = case when p_status = 'ready' and ready_at is null then now() else ready_at end,
      collected_at = case when p_status = 'collected' and collected_at is null then now() else collected_at end,
      cancelled_at = case when p_status = 'cancelled' and cancelled_at is null then now() else cancelled_at end
  where id = p_order_id
  returning * into current_order;

  insert into public.order_events(order_id, event_type, from_status, to_status, actor_user_id)
  values (p_order_id, 'status_changed', previous_status, p_status, auth.uid());

  if p_status = 'ready' and previous_status is distinct from 'ready' then
    insert into public.email_outbox(order_id, template, recipient, payload)
    values (
      current_order.id,
      'order_ready',
      current_order.customer_email,
      jsonb_build_object('order_number', current_order.order_number)
    );
  end if;

  return current_order;
end;
$$;

alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.email_outbox enable row level security;

create policy "staff read profiles" on public.profiles
for select to authenticated using (public.is_staff());

create policy "staff read orders" on public.orders
for select to authenticated using (public.is_staff());

create policy "staff update orders" on public.orders
for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "staff read order items" on public.order_items
for select to authenticated using (public.is_staff());

create policy "staff read events" on public.order_events
for select to authenticated using (public.is_staff());

create policy "staff read email outbox" on public.email_outbox
for select to authenticated using (public.is_staff());

revoke all on function public.set_order_status(uuid, public.order_status) from public;
grant execute on function public.set_order_status(uuid, public.order_status) to authenticated;
