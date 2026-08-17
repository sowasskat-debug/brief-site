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
 * Windowsa mogą je kiedyś dostać. Mierzymy więc SKUTEK: gdy para 🇵🇱 skleja się w jeden
 * glif, jest ~tak szeroka jak pojedynczy wskaźnik; gdy system rysuje dwie literki,
 * jest ~dwa razy szersza. Próg 1,5 leży w połowie między 1,0 a 2,0.
 * ⚠️ Świadomie `measureText`, a NIE `getImageData` (test na kolor): rozszerzenia
 * anty-fingerprintingowe zaszumiają odczyt pikseli i test koloru zacząłby kłamać.
 *
 * ⚠️ FAIL-SAFE W STRONĘ „NIC NIE RÓB": każdy wyjątek i każdy dziwny pomiar = zostawiamy
 * stan obecny. Najgorsze, co może się stać, to że Windows dalej pokazuje „PL" — czyli
 * dokładnie to, co było. Odwrotny fail-safe kazałby pobierać font ludziom, którzy go
 * nie potrzebują.
 *
 * PRZEŁĄCZNIK DO PODGLĄDU (bo na Macu objawu nie da się zobaczyć):
 *   brifup.com/?flagi=on   — wymuś font (zobaczysz to, co zobaczy Windows po poprawce)
 *   brifup.com/?flagi=off  — wyłącz nawet tam, gdzie wykrywanie go chce
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
  var PARA = '🇵🇱';  // 🇵🇱 — para wskaźników regionalnych
  var JEDEN = '🇵';             // 🇵 — sam wskaźnik, zawsze rysowany jako literka w ramce

  // true = system rysuje prawdziwe flagi, nie ma czego naprawiać.
  function systemMaFlagi() {
    try {
      var ctx = document.createElement('canvas').getContext('2d');
      if (!ctx) return true;
      ctx.font = '32px sans-serif';
      var para = ctx.measureText(PARA).width;
      var jeden = ctx.measureText(JEDEN).width;
      // Zerowe albo bezsensowne pomiary — nie zgadujemy.
      if (!para || !jeden) return true;
      return para < jeden * 1.5;
    } catch (e) {
      return true;
    }
  }

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

  function start() {
    var wymus = /[?&]flagi=on\b/.test(location.search);
    if (/[?&]flagi=off\b/.test(location.search)) return;
    if (wymus || !systemMaFlagi()) wlaczFont();
  }

  // `wlaczFont` czyta `document.body`, więc musi mieć DOM. Skrypt jest wpinany z `defer`,
  // ale `if` zostaje na wypadek wklejenia go kiedyś bez tego atrybutu.
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
