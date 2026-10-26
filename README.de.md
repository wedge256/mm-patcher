<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/banner-dark.png">
    <img src="assets/banner-light.png" alt="M&amp;M_Patcher" width="640">
  </picture>
</p>

<p align="center"><a href="README.md">English</a> · <b>Deutsch</b></p>

<p align="center">
  <a href="https://raw.githubusercontent.com/wedge256/mm-patcher/main/mm-patcher.user.js"><img src="https://img.shields.io/badge/Installieren-mm--patcher.user.js-1c5cab?style=for-the-badge&logo=tampermonkey&logoColor=white" alt="Installieren"></a>
</p>
<p align="center">
  <a href="https://github.com/wedge256/mm-patcher/releases"><img src="https://img.shields.io/github/v/release/wedge256/mm-patcher?label=Version&color=05164D" alt="Version"></a>
  <a href="CHANGELOG.de.md"><img src="https://img.shields.io/badge/Changelog-lesen-05164D" alt="Changelog"></a>
  <a href="LICENSE.md"><img src="https://img.shields.io/badge/Lizenz-PolyForm%20Strict-6c757d" alt="Lizenz"></a>
</p>

Userscript für die Prämienflugsuche auf miles-and-more.com. Es zeigt den Kalender für alle vier Kabinen,
zu jedem Flug den Sitzplan mit freien Plätzen, kennt 11.000 Flughäfen statt 1.500 und findet über das
Buchungsbüro Partnerawards, die M&M sonst nicht anzeigt. 

---

## Installation

1. [Tampermonkey](https://www.tampermonkey.net/) installieren (Chrome, Firefox, Edge).
   Violentmonkey und Greasemonkey funktionieren ebenfalls.

   1a. Chrome: [chrome://extensions](chrome://extensions) öffnen → Tampermonkey → Details:
   „Nutzerscripts zulassen“ aktivieren

   1b. Safari: statt Tampermonkey [Userscripts](https://apps.apple.com/de/app/userscripts/id1463298887)
   aus dem App Store installieren, dann Safari → Einstellungen → Erweiterungen: Userscripts aktivieren

2. [**mm-patcher.user.js**](https://raw.githubusercontent.com/wedge256/mm-patcher/main/mm-patcher.user.js)
   anklicken – Tampermonkey öffnet den Installationsdialog

   2a. Safari: Userscripts-Symbol in der Symbolleiste anklicken → installieren, beim ersten Besuch auf
   M&M den Zugriff erlauben

Alle Funktionen lassen sich einzeln abschalten: Knopf **M&M Patcher** (mit dem Pflaster) oben rechts auf
der Ergebnisseite.

---

## Funktionen

### Suche

- **Zugangsbeschränkung aufgehoben**

  Die Suchmaske auf miles-and-more.com sucht auch mit weniger als 1.500 Prämienmeilen.

- **Erweiterte Flughafenliste**

  Erweitert die kastrierte Prämienliste von ~1.500 auf 11.161 Orte, dazu Bahnhöfe und Städte
  ohne Flughafen wie AGY (Augsburg) und KNC (Konstanz Bahnhof).

- **Verbesserte Flughafensuche**

  „BER“ findet Berlin statt Berbera, „FRA“ Frankfurt statt Francistown. Ein Ländername wie
  „Japan“ listet alle Städte des Landes.

- **Suchmaske**

  Ein Tauschknopf dreht Start und Ziel.
  
- **Datumswähler mit Preisen**

  Das Datumsfeld zeigt einen Monat mit den Meilenpreisen je Tag, Hin- und Rückflug als
  Zeitraum mit Anzahl der Nächte.

- **„Ich fliege nicht selbst“**

  Buchen für andere direkt im Shop, im Dialog „Reisende“, nicht nur auf der Hauptseite.

- **Gespeicherte Suchanfragen (Hauptseite)**

  „Letzte Suchanfragen“ bleiben auch nach dem Abmelden erhalten.

- **Suchlimit im Blick**

  M&M erlaubt etwa 37 Suchen je IP-Adresse und Stunde, danach ist die Adresse für eine Stunde
  gesperrt. Ein Zähler zeigt den Stand und lässt sich nach einem IP-Wechsel leeren.

### Kalender

- **Größerer Kalender**

  15 Tage statt 7, auf Wunsch für alle vier Kabinen. 
  Dazu die Bestpreise des ganzen Jahres von der M&M-Hauptseite ("Best-By-Day"-API; nicht für jede Route verfügbar und oft veraltet).

  <img src="assets/kalender.png" alt="Kalender" width="700">

### Ergebnisse

- **Übersichtliche Ergebniskarten**

  Zeitleiste und Umsteigezeiten sind übersichtlicher dargestellt, dazu das eingesetzte
  Flugzeug samt Besonderheiten (Allegris, Retrofit-Business in der A380). Alle Tarife je
  Kabine nebeneinander, mit Anzeige der noch buchbaren Plätze.

- **Sitzplan für jeden Flug**

  Ein Klick auf den Flugzeugtyp öffnet den Sitzplan und zeigt, welche Plätze noch frei sind.

  <img src="assets/sitzplan.png" alt="Sitzplan" width="700">

### Buchungsbüro & Währung

- **Buchungsbüro wählen**

  Das Buchungsbüro entscheidet mit, welche Flüge M&M anzeigt und welche Währung abgerechnet wird. 
  Es richtet sich in der Regel nach dem Abflugort der Suche. Je nach Büro tauchen Partnerawards auf,
  die sonst fehlen: DE findet z. B. keine Ethiopian-Flüge ab Deutschland - AT oder CH schon.
  Voreingestellt ist „Automatisch (Abflugland)“, umstellbar in den Einstellungen.
  An den Preisen/Meilen ändert ein anderes Buchungsbüro nichts.

- **Zuzahlung in wählbarer Währung**

  Wer auch gerade keine Ahnung hat, wie viel 782.773,36 Argentinische Pesos heute in € wert sind: 
  Beträge in Fremdwährung zeigen den umgerechneten Betrag an, in Euro oder einer anderen wählbaren Währung.

### Sonstiges

- **Angemeldet bleiben**

  Verhindert vorzeitigen Logout, wenn man mal 15 Minuten Kaffee holen ist.

- **Entschuldigung, das bereitgestellte Vielfliegerprofil ist falsch**

  Diese eine Meldung bekommt man für JEDEN Fehler einer Sitzung. Das Script ersetzt sie durch
  eine Seite, die meistens das tatsächliche Problem nennt.

---

## Sprachen

Die Oberfläche folgt der Sprache der Seite, in allen Sprachen, die Miles & More anbietet.
Bei Bedarf jederzeit direkt nahtlos umschaltbar.

(Außer Deutsch und Englisch sind die Übersetzungen maschinell erstellt. Verbesserungen gern als
[Issue](https://github.com/wedge256/mm-patcher/issues)).

## Hinweise

Kein offizielles Angebot der Lufthansa Group / Miles & More.

## Unterstützen

M&M Patcher unterstützen: [🍺 Bier spendieren](https://buymeacoffee.com/wedge_mm)

## Lizenz

[PolyForm Strict 1.0.0](LICENSE.md): private, nichtkommerzielle Nutzung erlaubt. Weitergeben und
Verändern nicht erlaubt, auch nicht unter anderem Namen.
