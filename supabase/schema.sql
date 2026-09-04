-- =========================================================
-- CMMS Przeglądy — schemat bazy danych dla Supabase
-- Wklej całość do Supabase → SQL Editor → Run
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- MECHANICY
-- ---------------------------------------------------------
create table if not exists mechanics (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  pin_hash text not null,
  is_admin boolean not null default false,
  created_at timestamptz default now()
);

alter table mechanics enable row level security;
alter table mechanics add column if not exists is_admin boolean not null default false;

-- Widok bez hasha PIN-u — bezpieczny do pokazania na liście logowania
create or replace view mechanics_public as
  select id, name, is_admin from mechanics;

grant select on mechanics_public to anon, authenticated;

-- Nikt nie czyta bezpośrednio tabeli mechanics z frontendu (PIN hash musi być ukryty)
revoke all on mechanics from anon, authenticated;

-- ---------------------------------------------------------
-- SZABLONY LIST KONTROLNYCH
-- Pozwalają zdefiniować listę punktów raz (np. dla typu maszyny)
-- i przypisać ją do wielu maszyn zamiast wpisywać punkty osobno
-- dla każdej z nich.
-- ---------------------------------------------------------
create table if not exists checklist_templates (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  items text[] not null default '{}',
  created_at timestamptz default now()
);

alter table checklist_templates enable row level security;

drop policy if exists "checklist_templates_public_read" on checklist_templates;
create policy "checklist_templates_public_read" on checklist_templates
  for select using (true);

drop policy if exists "checklist_templates_public_write" on checklist_templates;
create policy "checklist_templates_public_write" on checklist_templates
  for all using (true) with check (true);

-- ---------------------------------------------------------
-- MASZYNY / LINIE
-- ---------------------------------------------------------
create table if not exists machines (
  id text primary key,                     -- np. MASZ-A1B2, kodowane w QR
  name text not null,
  location text,
  serial_number text,                      -- nr seryjny urządzenia
  sequence_number text,                    -- nr porządkowy, np. D1, Z1
  checklist_items text[] not null default '{}', -- własna lista (nadpisuje szablon, jeśli niepusta)
  checklist_template_id uuid references checklist_templates(id) on delete set null,
  interval_type text not null check (interval_type in ('weekly','monthly','custom')),
  custom_days int,
  assigned_mechanic_id uuid references mechanics(id) on delete set null,
  last_inspection_date timestamptz,
  created_at timestamptz default now()
);

alter table machines enable row level security;
alter table machines add column if not exists serial_number text;
alter table machines add column if not exists sequence_number text;
alter table machines add column if not exists checklist_items text[] not null default '{}';
alter table machines add column if not exists checklist_template_id uuid references checklist_templates(id) on delete set null;

drop policy if exists "machines_public_read" on machines;
create policy "machines_public_read" on machines
  for select using (true);

drop policy if exists "machines_public_write" on machines;
create policy "machines_public_write" on machines
  for insert with check (true);

drop policy if exists "machines_public_update" on machines;
create policy "machines_public_update" on machines
  for update using (true);

drop policy if exists "machines_public_delete" on machines;
create policy "machines_public_delete" on machines
  for delete using (true);

-- ---------------------------------------------------------
-- PRZEGLĄDY
-- ---------------------------------------------------------
create table if not exists inspections (
  id uuid primary key default gen_random_uuid(),
  machine_id text references machines(id) on delete cascade,
  mechanic_id uuid references mechanics(id) on delete set null,
  technician_name text not null,
  result text not null check (result in ('ok','issue')),
  notes text,
  date timestamptz not null default now()
);

alter table inspections enable row level security;

drop policy if exists "inspections_public_read" on inspections;
create policy "inspections_public_read" on inspections
  for select using (true);

drop policy if exists "inspections_public_write" on inspections;
create policy "inspections_public_write" on inspections
  for insert with check (true);

-- Po dodaniu przeglądu automatycznie aktualizujemy datę ostatniego przeglądu maszyny
create or replace function set_last_inspection_date()
returns trigger
language plpgsql
security definer
as $$
begin
  update machines set last_inspection_date = new.date where id = new.machine_id;
  return new;
end;
$$;

drop trigger if exists trg_set_last_inspection_date on inspections;
create trigger trg_set_last_inspection_date
  after insert on inspections
  for each row execute function set_last_inspection_date();

-- ---------------------------------------------------------
-- LOGOWANIE MECHANIKA (imię + PIN) — bez ujawniania hashy
-- Zwraca też is_admin, żeby aplikacja wiedziała, czy wpuścić do /admin
-- ---------------------------------------------------------
drop function if exists verify_mechanic_pin(text, text);
create or replace function verify_mechanic_pin(p_name text, p_pin text)
returns table(id uuid, name text, is_admin boolean)
language plpgsql
security definer
as $$
begin
  return query
    select m.id, m.name, m.is_admin
    from mechanics m
    where m.name = p_name
      and m.pin_hash = crypt(p_pin, m.pin_hash);
end;
$$;

grant execute on function verify_mechanic_pin(text, text) to anon, authenticated;

-- Tworzenie / edycja mechanika z panelu admina (haszuje PIN po stronie serwera)
-- p_is_admin: null = nie zmieniaj przy edycji (przy nowym mechaniku traktowane jako false)
drop function if exists upsert_mechanic(text, text, uuid);
create or replace function upsert_mechanic(p_name text, p_pin text, p_id uuid default null, p_is_admin boolean default null)
returns table(id uuid, name text, is_admin boolean)
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  if p_id is not null then
    update mechanics set
      name = p_name,
      pin_hash = case when p_pin is not null and p_pin <> '' then crypt(p_pin, gen_salt('bf')) else pin_hash end,
      is_admin = coalesce(p_is_admin, mechanics.is_admin)
      where mechanics.id = p_id
      returning mechanics.id into v_id;
  else
    insert into mechanics(name, pin_hash, is_admin)
      values (p_name, crypt(p_pin, gen_salt('bf')), coalesce(p_is_admin, false))
      returning mechanics.id into v_id;
  end if;
  return query select mechanics.id, mechanics.name, mechanics.is_admin from mechanics where mechanics.id = v_id;
end;
$$;

grant execute on function upsert_mechanic(text, text, uuid, boolean) to anon, authenticated;

create or replace function delete_mechanic(p_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  delete from mechanics where id = p_id;
end;
$$;

grant execute on function delete_mechanic(uuid) to anon, authenticated;

-- =========================================================
-- PIERWSZY ADMINISTRATOR (wykonaj RAZ, ręcznie)
-- Dopóki nikt nie ma is_admin = true, nikt nie wejdzie do /admin, żeby
-- dodać pierwszego administratora przez interfejs — trzeba to zrobić
-- raz, bezpośrednio w SQL Editor. Podmień imię i PIN poniżej, uruchom,
-- a potem zaloguj się w aplikacji tymi danymi pod /login.
-- Bezpieczne do wielokrotnego uruchomienia — jeśli taki mechanik już
-- istnieje, po prostu nic się nie stanie zamiast błędu.
-- =========================================================
do $$
begin
  perform upsert_mechanic('Jan Kowalski', '1234', null, true);
exception when unique_violation then
  raise notice 'Mechanik o tej nazwie już istnieje — pomijam tworzenie.';
end $$;

-- =========================================================
-- UWAGA DOT. BEZPIECZEŃSTWA
-- Ten system nie używa pełnego uwierzytelniania Supabase Auth —
-- logowanie mechanika (imię + PIN) jest uproszczone i wygodne dla
-- małego zespołu, ale klucz "anon" używany przez frontend ma prawo
-- zapisu do tabeli machines/inspections. To wystarcza dla wewnętrznego
-- narzędzia w zaufanej sieci firmowej. Jeśli w przyszłości potrzebujesz
-- twardszej ochrony (np. panel admina dostępny publicznie w internecie),
-- warto dodać Supabase Auth dla roli "kierownik/admin".
-- =========================================================
