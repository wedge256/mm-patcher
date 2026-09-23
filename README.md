# M&M Patcher

Die Prämienflugsuche von Miles & More zeigt sieben Tage im Kalender, eine gekürzte
Flughafenliste und für jeden Fehler dieselbe Meldung.

Das Script ersetzt das durch einen größeren Kalender mit Preisen aller Kabinen,
übersichtliche Ergebniskarten mit Sitzplan und freien Plätzen, eine vollständige
Flughafenliste und eine Fehlerseite, die die tatsächliche Ursache nennt. Über das
Buchungsbüro lassen sich außerdem Partnerawards finden, die M&M sonst nicht anzeigt.

---

## Installation

1. [Tampermonkey](https://www.tampermonkey.net/) installieren (Chrome, Firefox, Edge).
   Violentmonkey und Greasemonkey funktionieren ebenfalls.

   1a. Chrome only: URL eingeben: [chrome://extensions](chrome://extensions) -> Tampermonkey -> Details: "Nutzerscripte zulassen" aktivieren

2. [**mm-searchbar.user.js**](https://raw.githubusercontent.com/wedge256/mm-patcher/main/mm-searchbar.user.js)
   anklicken - Tampermonkey öffnet den Installationsdialog

Updates kommen automatisch, zusätzlich weist das Script auf eine neue Version hin.
Alle Funktionen lassen sich einzeln abschalten: Knopf "M&M Patcher Settings" oben
rechts auf der Ergebnisseite.

---

## Funktionen

### Sitzplan

- **Seatmaps für jeden Flug**

  Ein Klick auf den Flugzeugtyp öffnet den Sitzplan und zeigt, welche Plätze noch frei sind.

### Mehr Flüge finden

- **Buchungsbüro wählen**

  Das Buchungsbüro entscheidet mit, welche Flüge M&M anzeigt. Es richtet sich nicht
  nach IP oder Wohnsitz, sondern nach dem Abflugort der Suche. Je nach Büro tauchen
  Partnerawards auf, die sonst fehlen: DE findet z. B. keine Ethiopian-Flüge ab
  Deutschland, AT oder CH schon. Voreingestellt ist "Automatisch (Abflugland)",
  umstellbar in den Settings.

### Suche

- **Suchmaske**

  Ein Swap-Knopf dreht Start und Ziel. Auch nach Orten, die die originale Prämiensuche gar
  nicht kennt, lässt sich jetzt suchen.
  Den "Ändern"-Button hat M&M inzwischen selbst wieder freigeschaltet; falls er
  erneut verschwindet, holt das Script ihn zurück.

- **Verbesserte Flughafensuche**

  "BER" findet Berlin statt Berbera, "FRA" Frankfurt statt Francistown. Ein
  Ländername wie "Japan" listet alle Städte des Landes.

- **Erweiterte Flughafenliste**

  Erweitert die kastrierte Prämienliste von ~1.500 auf 11.161 Orte, dazu Bahnhöfe und
  Städte ohne Flughafen wie z.B. AGY (Augsburg) und KNC (Konstanz Bahnhof).

- **Suchlimit im Blick**

  M&M erlaubt etwa 40 Suchen je IP-Adresse und Stunde, danach ist die Adresse eine
  Stunde gesperrt. Ein Zähler zeigt den Stand und lässt sich nach IP-Wechsel leeren.

### Kalender

- **Größerer Kalender**

  15 Tage statt 7, zum Blättern, auf Wunsch für alle vier Kabinen. Ein Klick auf
  einen Tag sucht direkt in dieser Kabine. Dazu die Bestpreise des ganzen Jahres von
  der M&M-Hauptseite (nicht für jede Route verfügbar und oft veraltet).

### Ergebnisse

- **Übersichtliche Ergebniskarten**

  Zeitleiste und Umsteigezeiten sind übersichtlicher dargestellt, dazu das eingesetzte
  Flugzeug samt Besonderheiten (Allegris, Retrofit-Business in der A380). Alle Tarife
  je Kabine nebeneinander, mit den noch freien Plätzen, soweit M&M sie herausgibt.

- **Zuzahlung in Euro**

  Auch gerade keine Ahnung, wie viel 2.330.434.500 Argentinische Pesos heute sind?
  Beträge in Fremdwährung zeigen jetzt den umgerechneten Euro-Betrag an.

- **Sortieren und filtern**

  Nach Meilen, Zuzahlung, Abflug oder Dauer, gerechnet in der gesuchten Kabine. Dazu
  ein Filter nach Reiseklasse.

- **Mehrere Reisende**

  Preise wahlweise pro Erwachsener oder gesamt; in den Tarifdetails stehen die Summe
  und der Preis für Kinder und Kleinkinder.

### Buchen

- **"Ich fliege nicht selbst"**

  Buchen für andere direkt im Shop, im Dialog "Reisende" - nicht mehr nur auf der
  Hauptseite.

- **Angemeldet bleiben**

  Verhindert vorzeitigen Logout, wenn man mal 15 Minuten Kaffee holen ist.

- **Entschuldigung, das bereitgestellte Vielfliegerprofil ist falsch**

  Diese eine Meldung bekommt man für JEDEN Fehler einer Sitzung. Das Script ersetzt sie
  durch eine Seite, die meistens das tatsächliche Problem nennt.

---

## Hinweise

Kein offizielles Angebot der Lufthansa Group / Miles & More.
