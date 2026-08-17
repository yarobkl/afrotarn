create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','staff')
  );
$$;

revoke all on function private.is_staff() from public;
revoke all on function private.is_staff() from anon;
grant execute on function private.is_staff() to authenticated;

alter function public.generate_order_number() set search_path = public, pg_temp;
alter function public.set_updated_at() set search_path = public, pg_temp;

drop policy if exists "staff read profiles" on public.profiles;
drop policy if exists "staff read orders" on public.orders;
drop policy if exists "staff update orders" on public.orders;
drop policy if exists "staff read order items" on public.order_items;
drop policy if exists "staff read events" on public.order_events;
drop policy if exists "staff read email outbox" on public.email_outbox;

create policy "staff read profiles" on public.profiles
for select to authenticated using (private.is_staff());

create policy "staff read orders" on public.orders
for select to authenticated using (private.is_staff());

create policy "staff update orders" on public.orders
for update to authenticated using (private.is_staff()) with check (private.is_staff());

create policy "staff read order items" on public.order_items
for select to authenticated using (private.is_staff());

create policy "staff read events" on public.order_events
for select to authenticated using (private.is_staff());

create policy "staff read email outbox" on public.email_outbox
for select to authenticated using (private.is_staff());

revoke all on function public.set_order_status(uuid, public.order_status) from public;
revoke all on function public.set_order_status(uuid, public.order_status) from anon;
revoke all on function public.set_order_status(uuid, public.order_status) from authenticated;
drop function if exists public.set_order_status(uuid, public.order_status);

drop function if exists public.is_staff();
