# Prywatny album weselny — GitHub Pages + Supabase

Gotowa strona dla gości weselnych:

- zdjęcie pary młodej w głównej sekcji,
- przycisk **Wgraj moment z wesela**,
- wybór zdjęć z telefonu,
- kompresowanie dużych fotografii w przeglądarce,
- automatyczna galeria poniżej,
- podgląd zdjęcia na pełnym ekranie,
- opcjonalna moderacja zdjęć.

## 1. Personalizacja strony

W pliku `config.js` zmień:

```js
COUPLE_NAMES: "Julia & Adam",
WEDDING_DATE: "20 CZERWCA 2026",
```

Podmień obraz `assets/hero-placeholder.svg` na własne zdjęcie, np. `assets/para-mloda.jpg`, a następnie wpisz:

```js
HERO_IMAGE: "./assets/para-mloda.jpg",
```

Najlepiej użyć poziomego zdjęcia JPG/WebP o szerokości około 1800–2400 px.

## 2. Utworzenie Supabase

1. Załóż projekt w Supabase.
2. Otwórz **SQL Editor**.
3. Skopiuj i uruchom cały plik `supabase/setup.sql`.
4. Otwórz ustawienia projektu i znajdź **Project URL** oraz **anon public key**.
5. Wklej te dane do `config.js`:

```js
SUPABASE_URL: "https://twoj-projekt.supabase.co",
SUPABASE_ANON_KEY: "twoj_anon_public_key",
```

Nie wstawiaj na stronę klucza `service_role`. Klucz `anon public` jest przeznaczony do użycia w przeglądarce, a dostęp ograniczają polityki RLS z pliku SQL.

## 3. Publikacja na GitHub Pages

1. Utwórz nowe repozytorium na GitHubie, np. `album-weselny`.
2. Wgraj wszystkie pliki z tego folderu do repozytorium.
3. Wejdź w **Settings → Pages**.
4. W sekcji **Build and deployment** wybierz **Deploy from a branch**.
5. Wybierz branch `main` oraz folder `/ (root)` i zapisz.
6. Adres strony będzie miał format:
   `https://twoj-login.github.io/album-weselny/`

Możesz ten adres zamienić w kod QR i położyć kartkę z kodem na stołach.

## 4. Zdjęcia natychmiast albo po zatwierdzeniu

Domyślnie zdjęcia pojawiają się w galerii od razu po przesłaniu.

Aby włączyć zatwierdzanie:

1. W Supabase SQL Editor uruchom `supabase/enable-moderation.sql`.
2. Nowe zdjęcia będą zapisane, ale niewidoczne dla gości.
3. Aby pokazać wybrane zdjęcie, przejdź do **Table Editor → photos** i ustaw pole `approved` na `true`.

## 5. Prywatność i bezpieczeństwo

Ta wersja jest albumem dostępnym dla osób posiadających link lub kod QR. Sam adres GitHub Pages jest publiczny w internecie, dlatego:

- nie publikuj linku publicznie w mediach społecznościowych,
- przed weselem przetestuj przesyłanie na kilku telefonach,
- dla większej ochrony włącz moderację,
- przy dużej liczbie nieznanych osób warto później dodać logowanie lub ochronę przed spamem.

Zdjęcia są przechowywane w prywatnym bucketcie Supabase i wyświetlane przez czasowe podpisane adresy tylko dla fotografii widocznych w tabeli `photos`.

## Struktura plików

```text
album-weselny/
├── index.html
├── styles.css
├── app.js
├── config.js
├── .nojekyll
├── assets/
│   ├── hero-placeholder.svg
│   └── favicon.svg
└── supabase/
    ├── setup.sql
    └── enable-moderation.sql
```
