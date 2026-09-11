// licznik.js — beacon licznika wejść dla PODSTRON (mapa.html, watki.html, historia.html, fala.html).
// Wydzielony 2026-09-11: dotąd licznik był TYLKO w index.html, więc wejścia z linków do mapy
// (wysyłanych znajomym, z reklam) nie istniały w statystykach — panel pokazywał 2 unikalnych
// przy realnie większym ruchu. Treść 1:1 z bloku w index.html (tam zostaje inline, żeby nie
// liczyć strony głównej dwa razy). ⚠️ Zmieniając logikę, zmień w OBU miejscach.
// ══ Licznik wejść (2026-08-01) ════════
// Woła własną Edge Function w Supabase, NIE zewnętrzny analytics. Powody
// (adblock, brak baneru cookies, dane u nas) opisane w supabase/functions/licznik/index.ts.
// Tu nie ma ŻADNEGO ciasteczka ani wpisu w localStorage — wysyłamy sam adres strony
// i referrera, a kto to był, rozstrzyga się po stronie funkcji (hash z solą dnia).
// ⚠️ SW przepuszcza POST prosto do sieci (service-worker.js, gałąź „nie-GET"),
// więc beacon nie wymaga bumpa CACHE_NAME ani wyjątku w cache'u.
(function licznikWejsc() {
  // Tylko produkcja. Bez tego lokalny podgląd i sandbox dosypywałyby wejść do statystyk,
  // a właściciel patrzyłby na liczby napompowane własnym testowaniem.
  if (!location.hostname.endsWith('brifup.com')) return;

  // ⚠️ Wykluczenie WŁASNYCH urządzeń właściciela (2026-08-04). Flaga w localStorage — beacon
  // w ogóle nie wychodzi. CELOWO nie po IP: właściciel chodzi po VPN (adres zmienny i
  // współdzielony — filtr po IP wycinałby też obcych czytelników za tym samym VPN-em),
  // a licznik z założenia nie zapisuje IP. Flagę ustawia automatycznie logowanie do knagi
  // (tam wchodzi tylko właściciel) albo ręcznie wejście na brifup.com/?licznik=off
  // (cofnięcie: ?licznik=on). To NIE jest identyfikator śledzący — deklaracja „zero wpisów
  // w localStorage" dotyczy CZYTELNIKÓW; ta flaga wyłącza pomiar, niczego nie mierzy.
  try {
    const q = new URLSearchParams(location.search).get('licznik');
    if (q === 'off') localStorage.setItem('brifup_pomin_licznik', '1');
    if (q === 'on') localStorage.removeItem('brifup_pomin_licznik');
    if (localStorage.getItem('brifup_pomin_licznik') === '1') return;
  } catch (_) {}

  const ENDPOINT = 'https://utmvokfjvrthvcmxzowc.supabase.co/functions/v1/licznik';
  let ostatnieZgloszenie = 0;

  // `typ` rozróżnia REALNE ZAŁADOWANIE STRONY od powrotu do już otwartej apki
  // (2026-08-05). Bez tego obie rzeczy były jednym „wyświetleniem", więc nie dało się
  // ruszyć progu wznowień bez napompowania licznika odsłon. ⚠️ Wartości muszą się
  // zgadzać co do znaku z `check (typ in (...))` w supabase_schema.sql, sekcja 9d —
  // inna etykieta zostanie odrzucona przez bazę i wejście przepadnie w całości.
  function zglos(typ) {
    ostatnieZgloszenie = Date.now();
    try {
      fetch(ENDPOINT, {
        method: 'POST',
        keepalive: true,               // przeżywa zamknięcie karty
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sciezka: location.pathname, referrer: document.referrer || '', typ }),
      }).catch(() => {});              // licznik NIGDY nie może popsuć strony
    } catch (_) {}
  }

  // Przeładowanie wywołane przez samą apkę (nowy SW / watchdog) NIE jest nową wizytą — patrz
  // `oznaczPrzeladowanieWlasne`. Znacznik konsumujemy od razu, więc pomija dokładnie JEDNO
  // najbliższe załadowanie; kolejne wejścia liczą się normalnie.
  let wlasnePrzeladowanie = false;
  try {
    wlasnePrzeladowanie = sessionStorage.getItem('brifup_wlasne_przeladowanie') === '1';
    if (wlasnePrzeladowanie) sessionStorage.removeItem('brifup_wlasne_przeladowanie');
  } catch (_) {}
  // ⚠️ `ostatnieZgloszenie` ustawiane TAK CZY TAK — inaczej pominięte wejście zostawiłoby zero
  // i pierwsze przełączenie karty (nawet po minucie) zgłosiłoby fałszywe „wznowienie",
  // bo próg 30 minut liczy się od tego znacznika.
  if (wlasnePrzeladowanie) ostatnieZgloszenie = Date.now();
  else zglos('wejscie');

  // Dlaczego jeszcze wznowienie: w zainstalowanej PWA system WZNAWIA istniejące okno
  // zamiast ładować stronę od nowa (ta sama mechanika, dla której istnieje
  // `checkAppShellUpdate`). Bez tego najbardziej lojalni czytelnicy — ci z apką na
  // ekranie głównym — byliby liczeni raz na instalację, a nie raz na wizytę.
  // 30 minut to standardowy próg końca sesji; krótsze przełączenie się nie liczy.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - ostatnieZgloszenie > 30 * 60 * 1000) zglos('wznowienie');
  });
})();
