create unique index if not exists email_outbox_order_template_uidx on public.email_outbox(order_id, template);
