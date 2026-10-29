# Changelog

[English](CHANGELOG.md)

## 1.10.2 — 2026-10-29

### Behoben

- **Kalender läuft seltener ins Suchlimit (429)**
- **Kalender bei Hin-/Rückflügen zeigt richtige Werte an (Work in Progress)**
- **Dark Mode auf den Buchungsseiten**

## 1.10.1 — 2026-10-29

### Behoben

- **Dark Mode: Umschalten blendete langsam über statt sofort**
- **Hinweis bei Suchlimit (HTTP 429) zeigte weder Grund noch genaue Sperrzeit an**

## 1.10.0 — 2026-10-28

### Neu

- **Dark Mode** für die Shop-Seite

### Behoben

- **Kalender bei Hin-/Rück- und Gabelflügen zeigte fehlerhafte Werte und nicht buchbare Tarife an**

## 1.9.1 — 2026-10-27

### Behoben

- **Kalender: nach einer Suche ohne Treffer blieb er beim Datum der vorigen Suche stehen**

## 1.9.0 — 2026-10-26

### Neu

- **Mehrsprachigkeit**, 16 Sprachen wählbar
- **Zuzahlungen in wählbarer Währung** (nicht nur €)

### Geändert

- **Bessere Sitzpläne**
- **Datumswähler mit Meilenpreisen je Tag**
- **Kalender: Layout leicht geändert**

### Behoben

- **Grundlegende Performance-Optimierungen**
- **Kalender: manche Tage meldeten „Datumsleiste antwortet nicht“ und suchten nie**
- **Filter, Sortierung und Suchzähler erschienen erst Sekunden nach dem Ergebnis**
- **Tauschknopf: erster Klick tat oft nichts**
- **Rückflug-Kalender: nach einem Tag ohne Angebot kamen die Ergebnisse des Suchtags nicht zurück**
- **Fehlerseite: „Zurück zur Suche“ funktionierte nicht**
- **Viele kleinere Bugs unter der Haube**

## 1.8.0 — 2026-10-14

### Neu

- **Hauptseite: Suche auch mit weniger als 1.500 Prämienmeilen**
- **Hauptseite: „Letzte Suchanfragen“ bleiben auch nach dem Abmelden erhalten**

### Geändert

- **Ethiopian A350 heißt jetzt korrekt „A350-900“**

### Behoben

- **Sitzplan: erste Economy-Reihe der Ethiopian A350 war fehlerhaft**

## 1.7.4 — 2026-10-03

### Neu

- **Schalter „Buchungsbüro-Zeile" in den Einstellungen**

### Geändert

- **Nach „Installieren" lädt die Seite einmal neu, damit die neue Version läuft**

### Behoben

- **Kalender: Klick auf einen Tag in einem anderen Monat scheiterte manchmal**
- **Kalender: Ladeanzeige drehte weiter, obwohl der Suchmonat fertig war**
- **Kalender: nach „Cache leeren" luden Monate nicht mehr von selbst**

## 1.7.3 — 2026-10-02

### Neu

- **Update-Hinweis zeigt, was sich geändert hat**

### Behoben

- **Kalender zeigte beim Tageswechsel eine Ladeanzeige, obwohl alles geladen war**

## 1.7.2 — 2026-09-29

### Geändert

- **Filter neu gestaltet und erweitert**

### Behoben

- **Alle Airlines zeigen jetzt richtiges Logo statt Platzhalter**
- **Von Hand eingetragenes Buchungsbüro zeigte das falsche Land**
- **In der Mobilansicht zeigte der Klassenfilter keine Tarife**

## 1.7.1 — 2026-09-24

### Geändert

- **Einige Hinweistexte überarbeitet**

### Behoben

- **Nach einem Wechsel des Buchungsbüros lief der Warenkorb im alten Büro**
  (andere Währung als in der Trefferliste)

## 1.7.0 — 2026-09-23

### Neu

- **„Ich fliege nicht selbst" jetzt auch im Shop wählbar**, nicht mehr nur
  auf der Hauptseite
- **Ergebnisansicht leicht überarbeitet**
- **Übersichtlichere Preise bei mehreren Reisenden**: pro Erwachsener oder
  gesamt (Idee aus [#6](https://github.com/wedge256/mm-patcher/pull/6), danke
  [@simonguenther](https://github.com/simonguenther))

### Behoben

- **Kalender zeigte teils das Ziel des ersten Tages statt des gesuchten**
- **Verbindungen mit Zuganschluss ließen sich nicht wählen**
- **Kalender zeigte bei mehreren Reisenden teils den Kleinkindpreis**

## 1.6.4 — 2026-09-19

### Neu

- **Reiseklassenfilter in der Trefferliste**

### Behoben

- **Kalenderklick auf eine andere Kabine am bereits gesuchten Tag löst wieder
  eine Suche aus**

## 1.6.3 — 2026-09-16

### Behoben

- **Kalender: doppelte Kabinen-Beschriftung unter dem Raster entfernt**
- **Airline-Symbole: fehlende und leere Logos ergänzt**
- **Sitzplan: Kabinen, Sitzbreiten und Rumpf korrigiert**

## 1.6.2 — 2026-09-16

### Behoben

- **Update-Hinweis erschien bis zu 24 h nach einem Release**

## 1.6.1 — 2026-09-16

### Behoben

- **Buchungsbüro: Automatikmodus & Bürowechsel**

## 1.6.0 — 2026-09-15

### Hinzugefügt

- **Buchungsbüro frei wählbar, voreingestellt automatisch nach Abflugland**
  (Hintergrund: Buchungsbüro DE findet keine ET Flüge ab DE; Büro CH/AT
  dagegen schon)

### Geändert

- **Verbesserte Erkennung von Städten ohne Flughafen (Konstanz, …)
  und neuen Flughäfen (WSI)**
- **Vorschläge beim Tippen erscheinen sofort, unverzüglich**
- **Kalender lädt nur noch den gesuchten Monat automatisch**

### Behoben

- **Suchen landeten auf der Fehlerseite, obwohl die Anmeldung stand**
- **Kalender konnte still hängenbleiben**
- **Viele kleinere Bugs**

## 1.5.0 — 2026-09-12

### Hinzugefügt

- **Freie Plätze auf jeder Ergebniskarte**
- **Suchzähler: warnt vor dem IP-Limit von Miles & More**

### Behoben

- **Bugfixes und bessere Behandlung des IP-Limits**

## 1.4.0 — 2026-08-31

### Hinzugefügt

- **Ländersuche: Ein Ländername listet alle Städte des Landes**

### Geändert

- **Darstellung während der Sucheingabe optimiert**

### Behoben

- **„Wählen" scheiterte mit „Auswahl nicht möglich. Seite neu laden."**
- **Darstellungsfehler und kosmetische Bugs gefixt**
- **Performance-Optimierung**

## 1.3.0 — 2026-08-24

### Hinzugefügt

- **Sitzplan zeigt auch den Flugzeugtyp an**
- **Kennzeichnung besonderer Business-Kabinen in der Übersicht (Allegris,
  Swiss Senses) bzw. der Seatmap (ANA THE Room, Polaris Studio u. a.)**

### Behoben

- **Sitzplan-Darstellung war teilweise fehlerhaft**
- **Avianca hatte kein Logo**

## 1.2.2 — 2026-08-24

### Behoben

- **Kleinere Performance-Bugfixes**

## 1.2.1 — 2026-08-24

### Behoben

- **Hin- und Rückflug: Beim Wechsel des Rückflugdatums zeigt der Kalender
  nicht mehr die Tarife der alten Suche**

## 1.2.0 — 2026-08-24

### Hinzugefügt

- **Rückflug-Kalender: Tage ohne Angebot zum gewählten Hinflug sind
  durchgestrichen**
- **Sitzplan: „Erneut laden", wenn eine Kabine nicht geladen werden konnte**

### Behoben

- **Hin- und Rückflug: Kalender und Rückflug-Auswahl funktionieren jetzt
  richtig**
- **Ladeanimation bleibt beim Neuaufbau der Ergebnisliste sichtbar**
- **UI Reparaturen**

## 1.1.0 — 2026-08-22

### Behoben

- **Hin- und Rückflug sollten jetzt normal funktionieren**
- **Tarifwahl funktioniert auch in englischsprachigen Sitzungen**
- **Sitzplan: Preise werden auch in Euro umgerechnet**

### Hinzugefügt

- **Hinweis auf das aktive Buchungsbüro**, falls Zuzahlungen in Fremdwährung
  berechnet werden

### Geändert

- **Tarif-Details nennen bei Fremdwährung zusätzlich den Originalbetrag**

## 1.0.2 — 2026-08-22

### Behoben

- **Update-Prüfung funktioniert jetzt korrekt.**

## 1.0.1 — 2026-08-22

### Behoben

- **Läuft jetzt auch unter Greasemonkey und Violentmonkey.**

### Geändert

- kleinere optische Änderungen

## 1.0.0 — 2026-08-21

Initial Release.
