-- =========================================================
-- System przeglądów prewencyjnych dla IL Cosmetics Polska — schemat bazy (Supabase)
-- Wklej całość do Supabase → SQL Editor → Run
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- MECHANICY
-- ---------------------------------------------------------
create table if not exists mechanics (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  password_hash text not null,
  is_admin boolean not null default false,
  must_change_password boolean not null default false,
  created_at timestamptz default now()
);

-- Migracja ze starej wersji (PIN -> hasło): zmiana nazwy kolumny pin_hash
do $$
begin
  if exists (select 1 from pg_attribute
             where attrelid = 'public.mechanics'::regclass
               and attname = 'pin_hash' and not attisdropped) then
    alter table mechanics rename column pin_hash to password_hash;
  end if;
end $$;

alter table mechanics enable row level security;
alter table mechanics add column if not exists is_admin boolean not null default false;

-- Migracja: kolumna must_change_password. Przy pierwszym dodaniu wszystkie
-- istniejące konta (ze starymi 4-cyfrowymi PIN-ami) dostają obowiązek ustawienia
-- własnego hasła przy następnym logowaniu. Przy kolejnych uruchomieniach nic się nie dzieje.
do $$
begin
  if not exists (select 1 from pg_attribute
                 where attrelid = 'public.mechanics'::regclass
                   and attname = 'must_change_password' and not attisdropped) then
    alter table mechanics add column must_change_password boolean not null default false;
    update mechanics set must_change_password = true;
  end if;
end $$;

-- Widok bez hasha hasła — bezpieczny do pokazania na liście logowania
create or replace view mechanics_public as
  select id, name, is_admin from mechanics;

grant select on mechanics_public to anon, authenticated;

-- Nikt nie czyta bezpośrednio tabeli mechanics z frontendu (hash hasła musi być ukryty)
revoke all on mechanics from anon, authenticated;

-- ---------------------------------------------------------
-- USTAWIENIA RAPORTU (nr dokumentu / data zatwierdzenia)
-- Jeden wspólny rekord, edytowany z panelu admina — używany
-- automatycznie w nagłówku każdego wydrukowanego raportu.
-- ---------------------------------------------------------
create table if not exists report_settings (
  id int primary key default 1,
  doc_number text,
  approval_date date,
  updated_at timestamptz default now()
);

alter table report_settings enable row level security;

drop policy if exists "report_settings_public_read" on report_settings;
create policy "report_settings_public_read" on report_settings
  for select using (true);

drop policy if exists "report_settings_public_write" on report_settings;
create policy "report_settings_public_write" on report_settings
  for all using (true) with check (true);

insert into report_settings (id, doc_number, approval_date)
  values (1, null, null)
  on conflict (id) do nothing;

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
-- LOGOWANIE (imię + hasło) — bez ujawniania hashy
-- Ochrona przed zgadywaniem: po 5 błędnych próbach konto jest blokowane na 10 minut.
-- ---------------------------------------------------------
create table if not exists login_attempts (
  name text primary key,
  failed_count int not null default 0,
  locked_until timestamptz
);

alter table login_attempts enable row level security;
revoke all on login_attempts from anon, authenticated;

-- Funkcja wewnętrzna (niedostępna z frontendu): sprawdza hasło z licznikiem prób.
-- Zwraca id mechanika albo null; przy zablokowanym koncie zgłasza błąd ACCOUNT_LOCKED.
create or replace function _check_login(p_name text, p_password text)
returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
  v_hash text;
  v_locked timestamptz;
  v_count int;
begin
  select la.locked_until into v_locked from login_attempts la where la.name = p_name;
  if v_locked is not null and v_locked > now() then
    raise exception 'ACCOUNT_LOCKED';
  end if;

  select m.id, m.password_hash into v_id, v_hash from mechanics m where m.name = p_name;

  if v_id is not null and p_password is not null and v_hash = crypt(p_password, v_hash) then
    delete from login_attempts where login_attempts.name = p_name;
    return v_id;
  end if;

  if v_id is not null then
    insert into login_attempts as la (name, failed_count, locked_until)
      values (p_name, 1, null)
    on conflict (name) do update set
      failed_count = case when la.locked_until is not null and la.locked_until <= now()
                          then 1 else la.failed_count + 1 end,
      locked_until = null
    returning la.failed_count into v_count;

    if v_count >= 5 then
      update login_attempts set locked_until = now() + interval '10 minutes'
        where login_attempts.name = p_name;
    end if;
  end if;

  return null;
end;
$$;

revoke all on function _check_login(text, text) from public, anon, authenticated;

drop function if exists verify_mechanic_pin(text, text);
drop function if exists verify_mechanic_password(text, text);
create or replace function verify_mechanic_password(p_name text, p_password text)
returns table(id uuid, name text, is_admin boolean, must_change_password boolean)
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  v_id := _check_login(p_name, p_password);
  if v_id is null then
    return;
  end if;
  return query
    select m.id, m.name, m.is_admin, m.must_change_password
    from mechanics m
    where m.id = v_id;
end;
$$;

grant execute on function verify_mechanic_password(text, text) to anon, authenticated;

-- Zmiana własnego hasła przez zalogowanego użytkownika (wymaga podania obecnego hasła)
create or replace function change_password(p_name text, p_old text, p_new text)
returns boolean
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  if p_new is null or length(p_new) < 8 then
    raise exception 'PASSWORD_TOO_SHORT';
  end if;
  if p_new = p_old then
    raise exception 'PASSWORD_UNCHANGED';
  end if;
  v_id := _check_login(p_name, p_old);
  if v_id is null then
    return false;
  end if;
  update mechanics
    set password_hash = crypt(p_new, gen_salt('bf', 10)),
        must_change_password = false
    where mechanics.id = v_id;
  return true;
end;
$$;

grant execute on function change_password(text, text, text) to anon, authenticated;

-- Tworzenie / edycja mechanika z panelu admina (haszuje hasło po stronie serwera).
-- Hasło ustawione przez admina jest tymczasowe: pracownik musi je zmienić przy pierwszym logowaniu.
-- p_password przy edycji: puste = nie zmieniaj. p_is_admin: null = nie zmieniaj.
drop function if exists upsert_mechanic(text, text, uuid, boolean);
create or replace function upsert_mechanic(p_name text, p_password text, p_id uuid default null, p_is_admin boolean default null)
returns table(id uuid, name text, is_admin boolean)
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  if p_password is not null and p_password <> '' and length(p_password) < 8 then
    raise exception 'PASSWORD_TOO_SHORT';
  end if;

  if p_id is not null then
    update mechanics set
      name = p_name,
      password_hash = case when p_password is not null and p_password <> ''
                           then crypt(p_password, gen_salt('bf', 10)) else password_hash end,
      must_change_password = case when p_password is not null and p_password <> ''
                                  then true else must_change_password end,
      is_admin = coalesce(p_is_admin, mechanics.is_admin)
      where mechanics.id = p_id
      returning mechanics.id into v_id;
  else
    if p_password is null or p_password = '' then
      raise exception 'PASSWORD_REQUIRED';
    end if;
    insert into mechanics(name, password_hash, is_admin, must_change_password)
      values (p_name, crypt(p_password, gen_salt('bf', 10)), coalesce(p_is_admin, false), true)
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

-- ---------------------------------------------------------
-- USTAWIENIA WYDRUKU (nr dokumentu i data zatwierdzenia)
-- Ustawiane raz w panelu admina, używane automatycznie na każdym wydruku.
-- ---------------------------------------------------------
create table if not exists report_settings (
  id int primary key default 1,
  doc_number text not null default '',
  approval_date date,
  check (id = 1)
);

alter table report_settings enable row level security;

drop policy if exists "report_settings_public_all" on report_settings;
create policy "report_settings_public_all" on report_settings
  for all using (true) with check (true);

insert into report_settings (id) values (1) on conflict (id) do nothing;

-- =========================================================
-- PIERWSZY ADMINISTRATOR (tylko dla świeżej instalacji)
-- Konto startowe powstaje WYŁĄCZNIE wtedy, gdy w bazie nie ma jeszcze żadnego
-- administratora — przy ponownym uruchomieniu schematu nic nie jest dodawane
-- (dzięki temu nie powstają przypadkowe konta ze znanym hasłem).
-- Przed uruchomieniem podmień imię i hasło poniżej (min. 8 znaków).
-- Przy pierwszym logowaniu system poprosi o ustawienie własnego hasła.
-- =========================================================
do $$
begin
  if not exists (select 1 from mechanics where is_admin) then
    perform upsert_mechanic('Jan Kowalski', 'ZmienMnie-123', null, true);
  end if;
end $$;

-- =========================================================
-- UWAGA DOT. BEZPIECZEŃSTWA
-- Ten system nie używa pełnego uwierzytelniania Supabase Auth —
-- logowanie (imię + hasło) jest uproszczone i wygodne dla małego zespołu.
-- Hasła są haszowane (bcrypt) po stronie bazy, a po 5 błędnych próbach
-- konto jest blokowane na 10 minut. Klucz "anon" używany przez frontend
-- ma jednak prawo zapisu do tabel machines/inspections i może wywoływać
-- funkcje zarządzania kontami, więc to rozwiązanie jest przeznaczone dla
-- wewnętrznego narzędzia w zaufanej sieci firmowej. Pracownicy nie powinni
-- używać tu haseł, których używają w innych systemach. Dla twardszej ochrony
-- warto w przyszłości przejść na Supabase Auth.
-- =========================================================

-- Odśwież pamięć podręczną API Supabase po zmianie funkcji
notify pgrst, 'reload schema';
