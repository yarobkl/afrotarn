create index if not exists email_outbox_order_id_idx on public.email_outbox(order_id);
create index if not exists order_events_actor_user_id_idx on public.order_events(actor_user_id);
