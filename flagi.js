/* Flagi krajów na Windowsie — 2026-08-15
 *
 * ZGŁOSZENIE WŁAŚCICIELA: „na Windowsie jak wchodzę to flag nie widać, tylko «PL»".
 *
 * To NIE jest błąd w naszym kodzie. Flaga w emoji to PARA wskaźników regionalnych
 * (🇵🇱 = U+1F1F5 U+1F1F1), którą font ma skleić w jeden glif. Windows tego glifu NIE MA
 * — Segoe UI Emoji rysuje dwie literki w ramkach — więc Chrome i Edge na Windowsie
 * pokazują „PL", „US", „UA". (Firefox na Windowsie wozi własne Twemoji i flagi widzi,
 * więc sprawdzając w nim NIE zobaczysz objawu.)
 *
 * Lek: podstawiamy font, który te pary skleja — `fonts/TwemojiCountryFlags.woff2`
 * (Twemoji Mozilla, COLR/CPAL, 261 par flag, 78 KB). Szczegóły i licencja:
 * `fonts/FLAGI-LICENCJA.txt`.
 *
 * 🔴 DWA ZABEZPIECZENIA, ŻEBY NIE PŁACIŁ ZA TO KAŻDY CZYTELNIK — to repo raz już
 * odchudzało wejście z 1,63 MB do 0,34 MB i nie dokładamy 78 KB komuś, kto flagi widzi:
 *   1. `@font-face` wstrzykiwany WYŁĄCZNIE po wykryciu, że system flag nie rysuje.
 *      Na macOS, Androidzie i iOS nie powstaje nawet deklaracja, więc nie ma czego pobierać.
 *   2. `unicode-range: U+1F1E6-1F1FF` — font obsługuje TYLKO wskaźniki regionalne.
 *      Reszta pola `flag` (🚨 🌍 🛢 📰) idzie dalej z fontu systemowego, a teksty
 *      z DM Serif / Inter jak dotąd. Dlatego wolno go dopisać do stosu `body`.
 *
 * ⚠️ WYKRYWANIE PO SZEROKOŚCI, NIE PO `navigator.platform`. Sniffing systemu skłamie
 * w obie strony: Firefox na Windowsie flagi MA (nie potrzebuje fontu), a kolejne wydania
 * Windowsa mogą je kiedyś dostać. Mierzymy więc SKUTEK — czy shaper SKLEJA parę wskaźników
 * w jeden glif (szczegóły pomiaru i historia błędnego progu przy `maFlagi` niżej).
 * ⚠️ Świadomie `measureText`, a NIE `getImageData` (test na kolor): rozszerzenia
 * anty-fingerprintingowe zaszumiają odczyt pikseli i test koloru zacząłby kłamać.
 *
 * 🔴 FAIL-SAFE ODWRÓCONY 2026-08-19: wstrzykujemy font, DOPÓKI NIE MA DOWODU, że system
 * skleja parę w ligaturę. Do 19.08 było odwrotnie („nie wiem" = nie rób nic) i właśnie
 * dlatego ta poprawka dwa razy padła CICHO. Szczegóły przy `maFlagi`.
 *
 * PRZEŁĄCZNIK DO PODGLĄDU (bo na Macu objawu nie da się zobaczyć):
 *   brifup.com/?flagi=on   — wymuś font (zobaczysz to, co zobaczy Windows po poprawce)
 *   brifup.com/?flagi=off  — wyłącz nawet tam, gdzie wykrywanie go chce
 *   brifup.com/?flagi=diag — PANEL DIAGNOSTYCZNY: pokazuje zmierzone liczby, werdykt,
 *     czy styl został wstrzyknięty i czy font REALNIE się pobrał. Powstał, bo objawu
 *     nie da się odtworzyć poza Windowsem — jeden zrzut z panelu kończy zgadywanie.
 *
 * Wpięte w CZTERY strony: index.html, watki.html, fala.html, knaga.html.
 * ⚠️ Strony dzienne `d/*.html` generuje BOT (Runner.cs) i one tego skryptu NIE MAJĄ —
 * to osobna robota po stronie repo bota.
 * ⚠️ `fala.html` ma bliźniaka w repo `flusso` — przenosząc zmianę, przenieś oba pliki.
 */
(function () {
  'use strict';

  var RODZINA = 'Twemoji Country Flags';
  var PLIK = '/fonts/TwemojiCountryFlags.woff2';
  var PARA_Z_FLAGA  = '\u{1F1F5}\u{1F1F1}';  // 🇵🇱 — para, która TWORZY flagę
  var PARA_BEZ_FLAGI = '\u{1F1FF}\u{1F1FF}'; // 🇿🇿 — ZZ to kod zarezerwowany, flagi nie ma w ŻADNYM foncie

  /* true = system rysuje prawdziwe flagi, nie ma czego naprawiać.
   *
   * 🔴 POPRAWIONE 2026-08-18 — poprzedni test BYŁ MARTWY i zwracał `true` na KAŻDYM systemie,
   * więc font nie był wstrzykiwany nigdy, a Windows dalej pokazywał „PL" (zgłoszenie właściciela:
   * „flagi wciąż nie działają na windowsie" — trzy dni po wdrożeniu poprawki).
   *
   * Stary test porównywał PARĘ z POJEDYNCZYM wskaźnikiem i zakładał, że dwie literki w ramkach
   * są ~2× szersze niż jedna. 📊 Zmierzone w Chromium bez fontu emoji (czyli w stanie, w jakim
   * jest Windows): para 39,9 px, pojedynczy 28,3 px — stosunek **1,41**, a próg wynosił **1,5**.
   * Czyli warunek `para < jeden * 1.5` wychodził PRAWDZIWY także tam, gdzie flag nie ma.
   * Założenie „×2" było błędne, bo pojedynczy wskaźnik ma własne boczne marginesy i nie jest
   * połową pary — porównanie DWÓCH znaków z JEDNYM zależy od metryk fontu zastępczego, nie od
   * tego, o co pytamy.
   *
   * Teraz pytamy WPROST o to, co nas interesuje: czy shaper SKLEJA parę w ligaturę. Porównujemy
   * parę tworzącą flagę (🇵🇱) z parą, która flagi nie tworzy (🇿🇿) — oba napisy mają tę samą
   * długość i te same metryki bazowe, więc różnica bierze się WYŁĄCZNIE ze sklejenia.
   * 📊 Zmierzone (te same warunki):
   *     system BEZ flag:      🇵🇱 39,9  ·  🇿🇿 39,9  → stosunek 1,00
   *     z fontem Twemoji:     🇵🇱 32,0  ·  🇿🇿 64,0  → stosunek 0,50
   *   Próg 0,9 leży w bezpiecznej odległości od obu, a separacja jest dwukrotna zamiast 6-procentowej.
   *
   * ⚠️ Nie wracaj do porównania „para vs pojedynczy znak" — to jest dokładnie ten pomiar,
   *    który tu zawiódł, i zawiódł CICHO (bez błędu, bez śladu w konsoli).
   */
  /* Stos fontów UŻYWANY DO POMIARU — `body`, nie `sans-serif`.
   * 🔴 ZMIENIONE 2026-08-19: dotąd mierzyliśmy `32px sans-serif`, czyli INNYM stosem niż ten,
   *    którym strona realnie rysuje flagi (elementy `.news-flag`/`.hero-flag` nie mają własnego
   *    `font-family`, więc dziedziczą po `body`). Fallback dla brakującego glifu potrafi
   *    rozwiązać się inaczej dla `sans-serif` niż dla stosu strony — a wtedy pomiar odpowiada
   *    na pytanie o INNY font niż ten, o który nam chodzi. W sandboxie oba stosy dają ten sam
   *    wynik (brak jakiegokolwiek fontu flag), więc TEJ hipotezy nie dało się tu rozstrzygnąć —
   *    zmiana jest darmowa i usuwa jedną z niewielu pozostałych różnic wobec produkcji.
   * ⚠️ Elementy flag nie istnieją jeszcze w DOM, gdy skrypt startuje (feed renderuje JS po fetchu),
   *    więc celowo pytamy o `body`, a nie o `.news-flag` — to i tak ten sam odziedziczony stos. */
  function stosDoPomiaru() {
    try {
      var s = (window.getComputedStyle(document.body).fontFamily || '').trim();
      return s || 'sans-serif';
    } catch (e) { return 'sans-serif'; }
  }

  /* Zwraca surowy pomiar albo null, gdy się nie udał. Wydzielone z werdyktu,
   * żeby tryb `?flagi=diag` mógł pokazać te same liczby, na których zapada decyzja. */
  function pomiar() {
    try {
      var ctx = document.createElement('canvas').getContext('2d');
      if (!ctx) return null;
      var stos = stosDoPomiaru();
      ctx.font = '32px ' + stos;
      var zFlaga = ctx.measureText(PARA_Z_FLAGA).width;
      var bezFlagi = ctx.measureText(PARA_BEZ_FLAGI).width;
      if (!zFlaga || !bezFlagi) return null;
      return { stos: stos, zFlaga: zFlaga, bezFlagi: bezFlagi, stosunek: zFlaga / bezFlagi };
    } catch (e) { return null; }
  }

  /* true = system rysuje prawdziwe flagi, nie ma czego naprawiać.
   *
   * 🔴 FAIL-SAFE ODWRÓCONY 2026-08-19 — i to jest tu najważniejsza zmiana.
   * Dotąd każdy nieudany albo dziwny pomiar zwracał `true` („system ma flagi"), czyli
   * NIE wstrzykiwał fontu. Uzasadnienie było takie, żeby nie kazać nikomu pobierać 78 KB
   * bez potrzeby — ale skutkiem jest, że KAŻDA usterka pomiaru wyłącza całą poprawkę
   * CICHO i NA ZAWSZE. Ta bramka zawiodła już DWA RAZY dokładnie w ten sposób
   * (zły próg 15.08, martwy test do 18.08), za każdym razem bez błędu i bez śladu w konsoli.
   *
   * Teraz wstrzykujemy font, DOPÓKI NIE MAMY DOWODU, że system skleja parę w ligaturę.
   * Koszt pomyłki jest asymetryczny i właśnie dlatego tak: „ktoś pobiera 78 KB bez potrzeby"
   * jest odwracalne i niewidoczne, a „cały Windows nie widzi flag" jest widoczne i trwałe.
   * ⚠️ To ŚWIADOME odstępstwo od zasady „fail-safe w stronę nic nie rób" z nagłówka pliku —
   *    tamta zakładała, że pomiar jest wiarygodny. Nie jest.
   * ⚠️ Systemy, które flagi MAJĄ (macOS, Android, iOS), mierzą ~0,50 i dalej nic nie pobierają —
   *    odwrócenie dotyczy WYŁĄCZNIE przypadków nierozstrzygniętych, nie zdrowej ścieżki.
   */
  var PROG_LIGATURY = 0.9;

  /* Jedno źródło prawdy o werdykcie — używane i przez `start()`, i przez panel diagnostyczny,
   * żeby panel nie mógł pokazać innej liczby niż ta, na której zapadła decyzja. */
  function maFlagi(p) { return !!p && p.stosunek < PROG_LIGATURY; }

  function wlaczFont() {
    if (document.getElementById('brif-flagi')) return;

    // Stos fontów `body` ODCZYTANY, nie przepisany — inaczej ta poprawka zamrażałaby
    // typografię strony w takim stanie, w jakim była w dniu jej pisania.
    var stos = '';
    try { stos = (window.getComputedStyle(document.body).fontFamily || '').trim(); } catch (e) {}

    var st = document.createElement('style');
    st.id = 'brif-flagi';
    st.textContent =
      '@font-face{font-family:"' + RODZINA + '";' +
      'src:url("' + PLIK + '") format("woff2");' +
      'unicode-range:U+1F1E6-1F1FF;font-display:swap}' +
      (stos ? 'body{font-family:"' + RODZINA + '",' + stos + '}' : '') +
      // ⚠️ `watki.html` trzyma flagę WEWNĄTRZ `.node-text`, a ten element ma WŁASNY
      // `font-family` (DM Serif) — czyli nie dziedziczy po `body` i regułą wyżej
      // nie da się go objąć. Na pozostałych stronach ten selektor po prostu w nic nie trafia.
      '.node-text{font-family:"' + RODZINA + '","DM Serif Display",serif}';
    document.head.appendChild(st);
  }

  /* PANEL DIAGNOSTYCZNY (`?flagi=diag`) — 2026-08-19.
   *
   * Powód istnienia: objaw występuje WYŁĄCZNIE na Windowsie (zgłoszony na Microsoft Edge),
   * a poprawki powstają na macOS/Linuksie, gdzie systemowe flagi są i niczego nie widać.
   * Dwie tury napraw poszły więc „na ślepo" i obie padły. Panel oddaje DOKŁADNIE te liczby,
   * na których zapada decyzja, plus dwa fakty, których z zewnątrz nie da się sprawdzić:
   * czy styl w ogóle powstał i czy plik fontu realnie się pobrał.
   *
   * Rozstrzyga między trzema przyczynami, których inaczej nie odróżnimy:
   *   (a) pomiar mówi „system ma flagi"  → wina detekcji (stosunek < 0,9 mimo braku flag),
   *   (b) styl wstrzyknięty, font NIE załadowany → wina dostarczenia (404, blokada, MIME),
   *   (c) styl i font OK, a flagi dalej jako „PL" → wina CSS (reguła nie dociera do elementu).
   *
   * ⚠️ Nie renderuje się nigdzie poza `?flagi=diag`, więc nie dotyka zwykłego wejścia. */
  function panelDiag(p, wstrzyknieto) {
    function rysuj() {
      var d = document.createElement('div');
      d.setAttribute('style',
        'position:fixed;left:8px;right:8px;bottom:8px;z-index:2147483647;' +
        'background:#111;color:#eee;font:12px/1.45 monospace;padding:10px 12px;' +
        'border:2px solid #e01f0f;border-radius:6px;max-height:70vh;overflow:auto;white-space:pre-wrap');

      /* 🔴 POMIAR W DOM, NIE W CANVAS — dwie ślepe uliczki po drodze, obie kłamały „NIE",
       * gdy próbka obok pokazywała cztery poprawne flagi:
       *   (a) `document.fonts.check()` — przy `unicode-range` zwraca false mimo działającego fontu;
       *   (b) `canvas.measureText` z rodziną webfontu — canvas 2D nie stosuje `unicode-range`,
       *       więc mierzy font zastępczy zamiast Twemoji.
       * DOM renderuje dokładnie tak, jak strona, więc pytamy jego. Diagnostyka, która kłamie,
       * jest gorsza od jej braku — to ta sama klasa błędu, przez którą stoimy tu trzeci raz. */
      var maFont = false;
      try {
        var mierz = function (txt) {
          var sp = document.createElement('span');
          sp.setAttribute('style', 'position:absolute;visibility:hidden;white-space:pre;' +
                                   'font-size:32px;font-family:"' + RODZINA + '",monospace');
          sp.textContent = txt;
          document.body.appendChild(sp);
          var w = sp.getBoundingClientRect().width;
          document.body.removeChild(sp);
          return w;
        };
        var wA = mierz(PARA_Z_FLAGA), wZ = mierz(PARA_BEZ_FLAGI);
        maFont = !!wZ && (wA / wZ) < PROG_LIGATURY;
      } catch (e) {}

      var linie = [
        'DIAGNOSTYKA FLAG — pokaż ten zrzut',
        '─────────────────────────────',
        'stos pomiaru : ' + (p ? p.stos : '(pomiar się nie udał)'),
        'szerokość 🇵🇱 : ' + (p ? p.zFlaga.toFixed(1) : '—'),
        'szerokość 🇿🇿 : ' + (p ? p.bezFlagi.toFixed(1) : '—'),
        'stosunek     : ' + (p ? p.stosunek.toFixed(3) : '—') + '   (próg ' + PROG_LIGATURY.toFixed(3) + ')',
        'werdykt      : ' + (maFlagi(p)
                              ? 'system MA flagi → font NIE jest potrzebny'
                              : 'system NIE ma flag → font potrzebny'),
        'styl wstrzyknięty : ' + (wstrzyknieto ? 'TAK' : 'NIE'),
        'font DZIAŁA (skleja): ' + (maFont ? 'TAK' : 'NIE'),
        '─────────────────────────────',
        'próbka w foncie Twemoji:'
      ];
      d.textContent = linie.join('\n');

      var prob = document.createElement('div');
      prob.setAttribute('style', 'font-family:"' + RODZINA + '",monospace;font-size:26px;margin-top:4px');
      prob.textContent = '\u{1F1F5}\u{1F1F1} \u{1F1FA}\u{1F1F8} \u{1F1FA}\u{1F1E6} \u{1F1EE}\u{1F1F1}';
      d.appendChild(prob);

      var opis = document.createElement('div');
      opis.setAttribute('style', 'margin-top:6px;color:#aaa');
      opis.textContent = 'Widzisz cztery flagi → font działa, problem był w detekcji.\n' +
                         'Widzisz PL US UA IL → font się nie stosuje (dostarczenie albo CSS).';
      d.appendChild(opis);

      document.body.appendChild(d);
    }
    /* 🔴 `document.fonts.ready` TU NIE WYSTARCZA i to była trzecia ślepa uliczka.
     * Font jest ładowany LENIWIE — przeglądarka sięga po plik dopiero, gdy na stronie pojawi
     * się znak z jego `unicode-range`. Panel powstaje ZANIM feed się wyrenderuje, więc nie ma
     * jeszcze ani jednej flagi, nic nie jest „pending" i `ready` rozwiązuje się NATYCHMIAST —
     * pomiar łapał wtedy font zastępczy i wiersz pokazywał „NIE" przy działającym foncie.
     * `fonts.load()` żąda go WPROST, więc mierzymy dopiero, gdy realnie jest. */
    try {
      document.fonts.load('32px "' + RODZINA + '"', PARA_Z_FLAGA)
        .then(rysuj, rysuj);
    } catch (e) { rysuj(); }
  }

  function start() {
    var wymus = /[?&]flagi=on\b/.test(location.search);
    var diag  = /[?&]flagi=diag\b/.test(location.search);
    if (/[?&]flagi=off\b/.test(location.search)) return;

    var p = pomiar();
    var systemMa = maFlagi(p);   // brak pomiaru = false = wstrzykujemy (patrz fail-safe)
    var wstrzyknieto = false;
    if (wymus || diag || !systemMa) { wlaczFont(); wstrzyknieto = true; }

    if (diag) panelDiag(p, wstrzyknieto);
  }

  // `wlaczFont` czyta `document.body`, więc musi mieć DOM. Skrypt jest wpinany z `defer`,
  // ale `if` zostaje na wypadek wklejenia go kiedyś bez tego atrybutu.
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
