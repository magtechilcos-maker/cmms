# System przeglądów prewencyjnych dla IL Cosmetics Polska

Aplikacja webowa do harmonogramowania przeglądów technicznych maszyn i linii produkcyjnych:

- każda maszyna ma przypisaną częstotliwość przeglądu (co tydzień / co miesiąc / dowolna liczba dni),
- każdy mechanik loguje się swoim imieniem + hasłem (min. 8 znaków) i widzi **listę przeglądów do zrobienia dziś**, przypisaną tylko do niego,
- każda maszyna ma naklejkę z kodem **QR** — zeskanowanie go **dowolnym telefonem** (aparatem, bez żadnej dodatkowej appki) otwiera publiczną stronę statusu tej maszyny: czy przegląd jest aktualny, czy zaległy, i historię przeglądów,
- z poziomu strony statusu albo panelu mechanika można zarejestrować przegląd — automatycznie generuje się **raport do wydruku** z miejscem na podpisy,
- panel administratora (`/admin`) służy do dodawania maszyn, mechaników, przypisywania maszyn do mechaników, drukowania arkusza etykiet QR i raportów zbiorczych.

Dane trzymane są w Supabase (baza danych w chmurze), a sama strona jest małą aplikacją React, którą hostujesz np. na Vercelu połączonym z Twoim repozytorium GitHub.

---

## 1. Konfiguracja Supabase

1. Wejdź na [supabase.com](https://supabase.com) i stwórz nowy projekt (jeśli jeszcze go nie masz).
2. W panelu projektu wejdź w **SQL Editor** → **New query**.
3. Wklej całą zawartość pliku [`supabase/schema.sql`](./supabase/schema.sql) i kliknij **Run**.
   - To utworzy tabele `machines`, `mechanics`, `inspections`, potrzebne widoki, wyzwalacze i funkcje logowania.
4. Wejdź w **Project Settings → API** i skopiuj:
   - `Project URL` → to będzie `VITE_SUPABASE_URL`,
   - `anon public` key → to będzie `VITE_SUPABASE_ANON_KEY`.

## 2. Wrzucenie projektu na GitHub — bez terminala

1. Rozpakuj plik `cmms-app.zip` na dysku (prawym przyciskiem → *Rozpakuj* / *Extract*). Powinieneś dostać folder `cmms-app` z plikami takimi jak `package.json`, `src`, `supabase` itd.
2. Wejdź na [github.com](https://github.com) i zaloguj się.
3. Kliknij zielony przycisk **New** (lub „+" w prawym górnym rogu → **New repository**).
4. Nadaj nazwę repozytorium, np. `cmms-przeglady`, zostaw je jako **Private** (zalecane) i kliknij **Create repository** — *nie* zaznaczaj „Add a README file" (mamy już swój).
5. Na stronie nowo utworzonego, pustego repozytorium kliknij link **uploading an existing file** (jest w treści strony, pod poleceniami do terminala — te polecenia możesz całkowicie zignorować).
6. Otwórz rozpakowany folder `cmms-app` na swoim komputerze, **zaznacz wszystkie pliki i podfoldery w środku** (Ctrl+A / Cmd+A) i przeciągnij je myszką na stronę GitHuba do pola „Drag files here to add them to your repository".
   - Ważne: przeciągasz **zawartość** folderu `cmms-app`, a nie sam folder `cmms-app` jako jedną paczkę — inaczej pliki wylądują w niewłaściwym miejscu w repozytorium.
   - Upewnij się, że w folderze nie ma `node_modules` ani `dist` — w paczce, którą dostałeś, ich nie ma, więc jeśli nic sam nie instalowałeś lokalnie, wszystko będzie w porządku.
7. Na dole strony kliknij **Commit changes**. Gotowe — cały projekt jest teraz na GitHubie, bez jednej wpisanej komendy.

Jeśli kiedyś zechcesz coś zmienić w kodzie, możesz podmieniać pojedyncze pliki bezpośrednio w GitHubie (ikona ołówka przy pliku → edytuj → **Commit changes**) albo znowu przeciągnąć nowe wersje plików przez **Add file → Upload files**.

## 3. Wdrożenie na Vercel (połączone z GitHub)

1. Wejdź na [vercel.com](https://vercel.com), zaloguj się kontem GitHub i kliknij **Add New → Project**.
2. Wybierz repozytorium `cmms-przeglady`, które przed chwilą utworzyłeś — Vercel sam rozpozna, że to projekt Vite/React.
3. W sekcji **Environment Variables** dodaj (same nazwy i wartości, wpisywane w formularzu na stronie):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SITE_URL` — wpisz adres, pod którym Vercel opublikuje stronę (np. `https://cmms-przeglady.vercel.app`; możesz to zaktualizować po pierwszym wdrożeniu i wdrożyć ponownie).
4. Kliknij **Deploy**. Po chwili aplikacja będzie publicznie dostępna pod adresem Vercela — to jest adres, który trafi do kodów QR.

Cała instalacja zależności i budowanie strony (to, do czego normalnie służy `npm install` / `npm run build`) dzieje się automatycznie na serwerach Vercela — nie musisz tego robić lokalnie ani w terminalu.

Każda kolejna zmiana plików na GitHubie (np. edycja przez przeglądarkę) automatycznie zaktualizuje wdrożoną stronę.

### Uruchomienie lokalne (opcjonalne, tylko jeśli chcesz testować na swoim komputerze przed wdrożeniem)

To już wymaga terminala, więc jeśli masz z nim problem, spokojnie pomiń ten krok — nie jest potrzebny do wdrożenia:

```bash
npm install
cp .env.example .env
# uzupełnij .env swoimi danymi z Supabase
npm run dev
```

## 4. Instalacja jako aplikacja na Windows (ikonka i osobne okno)

Aplikacja jest przygotowana jako PWA (Progressive Web App), więc po wdrożeniu na Vercel możesz "zainstalować" panel administratora jako zwykłą aplikację na Windows — z ikoną, własnym oknem (bez paska adresu przeglądarki) i skrótem w menu Start:

1. Otwórz `https://twoja-aplikacja.vercel.app/admin` w **Chrome** albo **Edge** (to jedyne przeglądarki na Windows, które to obsługują).
2. Po prawej stronie paska adresu pojawi się ikona instalacji (komputer ze strzałką) — kliknij ją, a potem **Zainstaluj**.
   - Jeśli ikony nie widać: menu (⋮) → **Zainstaluj System przeglądów prewencyjnych...** (Chrome) albo **Aplikacje → Zainstaluj tę stronę jako aplikację** (Edge).
3. Aplikacja pojawi się jako osobny program — z ikoną na pulpicie i w menu Start, we własnym oknie.

Uwaga: to dalej ta sama strona internetowa "w przebraniu" — do działania nadal potrzebuje internetu i łączy się z tą samą bazą Supabase. Telefony mechaników skanujące kody QR działają zupełnie niezależnie od tego, czy ktoś zainstalował aplikację na komputerze, czy nie.

Jeśli wolisz, żeby po instalacji aplikacja od razu otwierała listę zadań mechanika zamiast panelu admina, zainstaluj ją analogicznie z adresu `https://twoja-aplikacja.vercel.app/dashboard` zamiast `/admin` — możesz mieć obie zainstalowane naraz, jako dwie osobne ikony.

## 5. Import 127 maszyn i 12 pracowników z Twojego starego systemu

W paczce jest gotowy plik **`supabase/import_data.sql`**, wygenerowany bezpośrednio z Twojej bazy `system_serwisowy.db`. Zawiera:

- 12 pracowników jako mechaników (z losowymi, nieznanymi hasłami — ustawisz im hasła tymczasowe w panelu, patrz niżej),
- 12 szablonów list kontrolnych (pogrupowane automatycznie wg identycznych punktów, żeby nie duplikować tego samego zestawu dla dziesiątek podobnych maszyn),
- 127 maszyn, z przypisanym mechanikiem, numerem seryjnym, numerem porządkowym i szablonem listy kontrolnej.

**Kolejność uruchamiania w SQL Editor (ważne):**
1. Najpierw cały `supabase/schema.sql` (jak dotychczas).
2. Potem cały `supabase/import_data.sql` — jednorazowo. Jest bezpieczny do ponownego uruchomienia (pomija rekordy, które już istnieją), więc nic się nie stanie, jeśli uruchomisz go przez pomyłkę dwa razy.

**Rzeczy, o których warto wiedzieć po imporcie:**
- Wszystkie zaimportowane maszyny dostały częstotliwość **"co tydzień"** — tak działał Twój poprzedni system. Jeśli któraś powinna być przeglądana rzadziej, zmień to w panelu admina.
- Stary system przypisywał konkretny **dzień tygodnia** do każdej maszyny (np. "poniedziałek") — nowy system tego nie wymusza (liczy termin od daty ostatniego przeglądu, a nie od stałego dnia), ale dla orientacji dopisałem tę informację do pola "Lokalizacja" każdej maszyny.
- Konta pracowników powstają z **losowym, nieznanym hasłem** — w pliku importu nie ma żadnych haseł. Po imporcie wejdź w panelu admina w **Mechanicy → Edytuj**, kliknij **Generuj** i przekaż wygenerowane hasło tymczasowe danemu pracownikowi. Przy pierwszym logowaniu system poprosi go o ustawienie własnego hasła, którego Ty już nie poznasz.

## Szablony list kontrolnych

Zamiast wpisywać te same kilkanaście punktów kontrolnych dla każdej z podobnych maszyn, w panelu admina jest teraz zakładka **"Szablony list kontrolnych"**: definiujesz listę raz (np. dla "Drukarka", "Zgrzewarka"), a przy dodawaniu/edycji maszyny tylko wybierasz gotowy szablon z listy. Jeśli konkretna maszyna ma się różnić, możesz dodatkowo wpisać jej **własną listę** w formularzu maszyny — nadpisze ona szablon tylko dla tej jednej maszyny.

## 6. Pierwsze kroki w aplikacji (jeśli zaczynasz od zera, bez importu)

1. W SQL Editor Supabase odszukaj na końcu `schema.sql` blok **PIERWSZY ADMINISTRATOR** — podmień w nim `'Jan Kowalski'` i `'ZmienMnie-123'` na swoje imię i hasło (min. 8 znaków) **przed** uruchomieniem. Konto startowe powstaje tylko wtedy, gdy w bazie nie ma jeszcze żadnego administratora, więc ponowne uruchomienie schematu niczego nie dubluje.
2. Wejdź na `https://twoja-aplikacja.vercel.app/login`, kliknij **Zaloguj jako admin** i zaloguj się danymi, które przed chwilą ustawiłeś. System poprosi Cię o ustawienie własnego hasła, a potem wpuści do panelu `/admin`.
3. Zakładka **Mechanicy** → dodaj resztę mechaników (imię, hasło tymczasowe — najlepiej przyciskiem „Generuj" — i opcjonalnie zaznacz "Uprawnienia administratora" dla kolejnych osób, które mają mieć dostęp do panelu).
4. Zakładka **Maszyny** → dodaj maszyny/linie, ustaw częstotliwość przeglądu, przypisz mechanika i uzupełnij **listę kontrolną** (punkty do sprawdzenia, różne dla drukarki i zgrzewarki, np. "Poziom oleju", "Osłony bezpieczeństwa"). Możesz też podać nr porządkowy (D1, Z1...) i nr seryjny.
5. Zakładka **Raporty i etykiety** → wydrukuj arkusz kodów QR i naklej je na maszynach.
6. Mechanicy logują się pod adresem głównym (`https://twoja-aplikacja.vercel.app`) swoim imieniem i hasłem i widzą listę zadań na dziś. Osoby bez uprawnień administratora, które spróbują wejść na `/admin`, zostaną przekierowane z powrotem do swojej listy zadań.
7. Skanując kod QR na maszynie dowolnym telefonem, każdy (nawet niezalogowany) zobaczy status przeglądu; żeby zarejestrować przegląd, trzeba się zalogować.

## Lista kontrolna i wydruki

Każda maszyna może mieć własną **listę kontrolną** (edytowaną w panelu admina, przy dodawaniu/edycji maszyny) — to punkty, które mechanik fizycznie sprawdza podczas przeglądu, np. dla drukarki: "Stan głowicy", "Czystość podajnika", a dla zgrzewarki: "Docisk elektrod", "Stan kabli".

Lista ta pojawia się na **dwóch rodzajach wydruku**, zawsze z pustymi kratkami do ręcznego zaznaczenia (✓ lub ✗) długopisem — nie trzeba nic zaznaczać cyfrowo w telefonie:

- **Raport z przeglądu** — drukuje się automatycznie zaraz po zapisaniu przeglądu w aplikacji (wynik ogólny + uwagi wpisane cyfrowo, a lista kontrolna czeka na ręczne zaznaczenie).
- **Karta kontrolna** — całkowicie pusty formularz (bez zapisanego przeglądu), do wydrukowania z wyprzedzeniem i zabrania na obchód. Dostępna pod przyciskiem drukarki przy maszynie w panelu admina oraz na stronie statusu maszyny (`/m/:id`).

Obie wersje mają też ramkę **Uwagi** na komentarze w stylu "zaplanowano do wymiany" czy "oczekiwanie na części".

**Nr dokumentu i data zatwierdzenia** widoczne w nagłówku obu wydruków ustawiasz raz w panelu admina, w zakładce **Raporty i etykiety → Dane w nagłówku wydruków**. Od tej pory każdy wydruk (dla każdej maszyny) automatycznie użyje tych samych wartości — nie trzeba niczego wpisywać przy każdym druku. Zmieniasz je tylko wtedy, gdy faktycznie się zmienią (np. nowa wersja dokumentu).

## Uwagi dot. bezpieczeństwa

To rozwiązanie jest pomyślane jako **wewnętrzne narzędzie dla małego zespołu**, a nie publiczny system z pełnym uwierzytelnianiem. Logowanie mechanika (imię + hasło) jest celowo proste. Warto wiedzieć:

- Dostęp do panelu `/admin` wymaga zalogowania się jako mechanik z zaznaczonym polem "Uprawnienia administratora" — osoby bez tej flagi są automatycznie przekierowywane do swojej listy zadań.
- Hasła są przechowywane w bazie wyłącznie w postaci zahaszowanej (bcrypt) — nikt, łącznie z administratorem, nie może ich odczytać.
- Hasło ustawione przez administratora jest **tymczasowe**: pracownik musi je zmienić przy pierwszym logowaniu. Zmiany można dokonać też później przyciskiem z kluczem w górnym pasku.
- Po **5 błędnych próbach** logowania konto jest blokowane na 10 minut (ochrona przed zgadywaniem haseł).
- **Pracownicy nie powinni używać tu haseł z innych systemów.** To prosty system wewnętrzny bez pełnego uwierzytelniania (np. SSO), więc osobne, unikalne hasło chroni ich pozostałe konta na wypadek wycieku.
- Pojedyncze konto administratora może zostać zablokowane na 10 minut przez celowe wpisywanie złych haseł — to świadomy kompromis wynikający z tej ochrony.
- Klucz `anon` używany przez stronę ma jednak prawo zapisu do tabel `machines` i `inspections` — to konieczne, bo strona nie loguje się do Supabase "na sztywno". W praktyce oznacza to, że ktoś, kto pozna adres Twojej aplikacji i klucz `anon` (widoczny w kodzie strony), technicznie mógłby zapisywać dane bezpośrednio przez API Supabase, z pominięciem interfejsu i ekranu logowania.
- Dla wewnętrznego systemu w zaufanym zespole to zwykle akceptowalne ryzyko. Jeśli w przyszłości potrzebujesz twardszej ochrony (np. żeby dane były niedostępne nawet przy znajomości klucza `anon`), warto dodać pełne logowanie Supabase Auth dla roli kierownika/administratora — mogę pomóc to rozbudować.

## Struktura projektu

```
src/
  pages/
    Login.jsx              — logowanie (imię + hasło), tryb administratora
    ChangePassword.jsx     — zmiana hasła (wymuszona przy pierwszym logowaniu)
    MechanicDashboard.jsx  — lista zadań "na dziś" dla zalogowanego mechanika
    MachineStatus.jsx      — publiczna strona statusu maszyny (/m/:id), otwierana z QR
    Admin.jsx              — panel administratora
  components/
    InspectionForm.jsx     — formularz rejestracji przeglądu
    PrintReports.jsx       — szablony do wydruku (raport z przeglądu, raport zbiorczy, arkusz QR)
  lib/status.js            — logika liczenia terminów i statusów przeglądów
  supabaseClient.js        — konfiguracja połączenia z Supabase
supabase/schema.sql        — pełny schemat bazy danych do wklejenia w Supabase
```
