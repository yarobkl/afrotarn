create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null,
  description text,
  price_cents integer check (price_cents is null or price_cents >= 0),
  currency text not null default 'EUR',
  active boolean not null default true,
  orderable boolean not null default false,
  stock_mode text not null default 'store_only' check (stock_mode in ('tracked','store_only','arrival')),
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  safety_stock integer not null default 0 check (safety_stock >= 0),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

alter table public.products enable row level security;

create policy "public read active products" on public.products
for select to anon, authenticated using (active = true);

create policy "staff read all products" on public.products
for select to authenticated using (private.is_staff());

create policy "staff insert products" on public.products
for insert to authenticated with check (private.is_staff());

create policy "staff update products" on public.products
for update to authenticated using (private.is_staff()) with check (private.is_staff());

create policy "staff delete products" on public.products
for delete to authenticated using (private.is_staff());

alter table public.orders alter column customer_email drop not null;

insert into public.products(id, name, category, description, price_cents, active, orderable, stock_mode)
values
  ('1','Plantain','Fruits & légumes','Vert ou mûr, pour alloco, banane frite et recettes du quotidien.',null,true,false,'arrival'),
  ('2','Manioc','Fruits & légumes','Un incontournable à cuisiner bouilli, frit ou transformé.',null,true,false,'arrival'),
  ('3','Attiéké','Épicerie','Semoule de manioc, idéale avec poisson, poulet ou légumes.',null,true,false,'store_only'),
  ('4','Épices & sauces','Épicerie','Des bases parfumées pour retrouver les goûts de la maison.',null,true,false,'store_only'),
  ('5','Poissons','Surgelés','Tilapia et références sélectionnées selon les arrivages.',null,true,false,'arrival'),
  ('6','Saka-saka & feuilles','Surgelés','Feuilles et légumes africains prêts à cuisiner.',null,true,false,'store_only'),
  ('7','Karité & soins','Cosmétiques','Soins nourrissants et hydratants pour la peau et les cheveux.',null,true,false,'store_only'),
  ('8','Boissons & douceurs','Boissons','Boissons, gourmandises et produits à découvrir en rayon.',null,true,false,'store_only')
on conflict (id) do nothing;

create index if not exists products_category_active_idx on public.products(category, active);
create index if not exists products_orderable_idx on public.products(orderable) where orderable = true;
