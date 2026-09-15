# M&M Patcher

Die Prämienflugsuche von Miles & More zeigt sieben Tage im Kalender, eine gekürzte
Flughafenliste und für jeden Fehler dieselbe Meldung.

Das Script ersetzt das durch einen Monatskalender mit Preisen, Ergebniskarten mit
Sitzplan und freien Plätzen, eine vollständige Flughafenliste - und eine
Fehlerseite, die die tatsächliche Ursache nennt.

---

## Installation

1. [Tampermonkey](https://www.tampermonkey.net/) installieren (Chrome, Firefox, Edge)

   1a. Chrome only: URL eingeben: [chrome://extensions](chrome://extensions) -> Tampermonkey -> Details: "Nutzerscripte zulassen" aktivieren

2. [**mm-searchbar.user.js**](https://raw.githubusercontent.com/wedge256/mm-patcher/main/mm-searchbar.user.js)
   anklicken - Tampermonkey öffnet den Installationsdialog

---

## Funktionen

- **Suchmaske**

  Ein Swap-Knopf dreht Start und Ziel. Auch nach Orten, die die Prämiensuche gar
  nicht kennt, lässt sich suchen.
  Den "Ändern"-Button hat M&M inzwischen selbst wieder freigeschaltet; falls er
  erneut verschwindet, holt das Script ihn zurück.

- **Verbesserte Flughafensuche**

  "BER" findet Berlin statt Berbera, "FRA" Frankfurt statt Francistown.

- **Erweiterte Flughafenliste**

  Erweitert die kastrierte Prämienliste von ~1.500 auf 11.161 Orte, dazu Bahnhöfe und
  Städte ohne Flughafen wie z.B. AGY (Augsburg) und KNC (Konstanz Bahnhof).

- **Kalender**

  Der Kalender zeigt den ganzen Monat statt nur eine Woche, auf Wunsch für alle vier
  Kabinen. Dazu die Bestpreise des ganzen Jahres von der M&M-Hauptseite (nicht für
  jede Route verfügbar und oft veraltet).
  
- **Verbesserte Ergebnisliste**

  Zeitleiste und Umsteigezeiten sind übersichtlicher dargestellt. Dazu das eingesetzte
  Flugzeug samt Besonderheiten (Allegris, Retrofit-Business in der A380).

- **Seatmaps für jeden Flug**

  Ein Klick auf das Flugzeug öffnet den Sitzplan und zeigt, welche Plätze noch frei sind.

- **Zuzahlung in Euro**

  Auch gerade keine Ahnung, wie viel 2.330.434.500 Argentinische Pesos heute sind?
  Beträge in Fremdwährung zeigen jetzt den umgerechneten Euro-Betrag an.

- **Angemeldet bleiben**

  Verhindert vorzeitigen Logout, wenn man mal 15 Minuten Kaffee holen ist.

- **Freie Plätze und eigene Sortierung**

  Jede Tarifspalte nennt die noch buchbaren Plätze, soweit M&M sie herausgibt.
  Sortiert wird nach Meilen, Zuzahlung, Abflug oder Dauer - gerechnet in der
  gesuchten Kabine.

- **Suchlimit im Blick**

  M&M erlaubt etwa 40 Suchen je IP-Adresse und Stunde, danach ist die Adresse eine
  Stunde gesperrt. Ein Zähler zeigt den Stand und lässt sich nach IP-Wechsel leeren.

- **Buchungsbüro wechseln**

  Das Büro entscheidet mit, welche Flüge erscheinen - DE findet keine ET-Flüge ab
  Deutschland, CH oder AT schon. Folgt dem Abflugland, umstellbar im Panel.

- **Entschuldigung, das bereitgestellte Vielfliegerprofil ist falsch**

  Diese eine Meldung bekommt man für JEDEN Fehler einer Sitzung. Das Script ersetzt sie
  durch eine Seite, die meistens das tatsächliche Problem nennt.


---

## Hinweise

Kein offizielles Angebot der Lufthansa Group / Miles & More.


