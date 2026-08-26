-- ── Extensiones ──────────────────────────────────────────────
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ── Tipos personalizados ────────────────────────────────────
-- Enum para el estado de una venta
create type public.estado_venta as enum ('Pagado', 'Debe', 'Presupuesto');

-- ── Función reutilizable para updated_at ────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── clientes ────────────────────────────────────────────────
-- Se crea primero porque ventas y pagos referencian a esta tabla
create table public.clientes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre      text not null check (char_length(trim(nombre)) between 1 and 160),
  telefono    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, nombre)
);

create trigger set_clientes_updated_at
  before update on public.clientes
  for each row execute function public.set_updated_at();

alter table public.clientes enable row level security;

create policy "clientes_select_own" on public.clientes
  for select using (auth.uid() = user_id);
create policy "clientes_insert_own" on public.clientes
  for insert with check (auth.uid() = user_id);
create policy "clientes_update_own" on public.clientes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "clientes_delete_own" on public.clientes
  for delete using (auth.uid() = user_id);

-- ── ventas ───────────────────────────────────────────────────
create table public.ventas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fecha       date not null,
  cliente_id  uuid not null references public.clientes(id) on delete restrict,
  producto    text,
  precio      numeric(12,2) not null default 0 check (precio >= 0),
  cantidad    numeric(12,2) not null default 0 check (cantidad >= 0),
  total       numeric(12,2) generated always as (precio * cantidad) stored,
  status      public.estado_venta not null default 'Debe',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- Índices (con filtro parcial para excluir borrados lógicos)
create index ventas_user_fecha_idx on public.ventas (user_id, fecha desc) where deleted_at is null;
create index ventas_user_cliente_idx on public.ventas (user_id, cliente_id) where deleted_at is null;
create index ventas_user_status_idx on public.ventas (user_id, status) where deleted_at is null;
create index ventas_deleted_at_idx on public.ventas (deleted_at) where deleted_at is not null;

create trigger set_ventas_updated_at
  before update on public.ventas
  for each row execute function public.set_updated_at();

alter table public.ventas enable row level security;

create policy "ventas_select_own" on public.ventas
  for select using (auth.uid() = user_id and deleted_at is null);
create policy "ventas_insert_own" on public.ventas
  for insert with check (auth.uid() = user_id);
create policy "ventas_update_own" on public.ventas
  for update using (auth.uid() = user_id and deleted_at is null)
  with check (auth.uid() = user_id);
create policy "ventas_delete_own" on public.ventas
  for delete using (false); -- bloquea borrado físico; la app debe usar soft delete

-- ── pagos ────────────────────────────────────────────────────
create table public.pagos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fecha       date not null,
  cliente_id  uuid not null references public.clientes(id) on delete restrict,
  monto_usd   numeric(12,2) not null default 0 check (monto_usd >= 0),
  monto_bs    numeric(12,2) not null default 0 check (monto_bs >= 0),
  tasa        numeric(12,4) not null default 0 check (tasa >= 0),
  nota        text,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index pagos_user_cliente_idx on public.pagos (user_id, cliente_id) where deleted_at is null;
create index pagos_user_fecha_idx on public.pagos (user_id, fecha desc) where deleted_at is null;
create index pagos_deleted_at_idx on public.pagos (deleted_at) where deleted_at is not null;

alter table public.pagos enable row level security;

create policy "pagos_select_own" on public.pagos
  for select using (auth.uid() = user_id and deleted_at is null);
create policy "pagos_insert_own" on public.pagos
  for insert with check (auth.uid() = user_id);
create policy "pagos_update_own" on public.pagos
  for update using (auth.uid() = user_id and deleted_at is null)
  with check (auth.uid() = user_id);
create policy "pagos_delete_own" on public.pagos
  for delete using (false); -- soft delete vía UPDATE

-- ── app_config ───────────────────────────────────────────────
create table public.app_config (
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key         text not null check (char_length(trim(key)) between 1 and 80),
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (user_id, key)
);

create index app_config_user_key_idx on public.app_config (user_id, key);

create trigger set_app_config_updated_at
  before update on public.app_config
  for each row execute function public.set_updated_at();

alter table public.app_config enable row level security;

create policy "app_config_select_own" on public.app_config
  for select using (auth.uid() = user_id);
create policy "app_config_insert_own" on public.app_config
  for insert with check (auth.uid() = user_id);
create policy "app_config_update_own" on public.app_config
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "app_config_delete_own" on public.app_config
  for delete using (auth.uid() = user_id);pnpm 