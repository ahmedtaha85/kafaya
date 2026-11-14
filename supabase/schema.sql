-- Ku ordi Supabase > SQL Editor
create table if not exists catalog_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cat text not null,
  price numeric default 0,
  note text,
  img text,
  variants jsonb default '[]',
  created_at timestamptz default now()
);
alter table catalog_items enable row level security;
create policy "staff all" on catalog_items for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public) values ('products','products',true) on conflict do nothing;
create policy "img read"  on storage.objects for select using (bucket_id = 'products');
create policy "img add"   on storage.objects for insert to authenticated with check (bucket_id = 'products');
create policy "img del"   on storage.objects for delete to authenticated using (bucket_id = 'products');
