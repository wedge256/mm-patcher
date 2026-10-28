// ==UserScript==
// @name         Miles & More: Prämienflug-Suche erweitert
// @name:en      Miles & More: Award Flight Search Extended
// @namespace    https://www.awardmap.net
// @version      1.10.0
// @description  Erweitert die M&M um nützliche Features: Sitzpläne, erweiterter Kalender, mehr Städte, uvm.
// @description:en  Adds useful features to Miles & More: seat maps, an extended calendar, more cities and more.
// @author       wedge
// @license      PolyForm Strict 1.0.0 (https://polyformproject.org/licenses/strict/1.0.0)
// @homepageURL  https://www.awardmap.net
// @supportURL   https://github.com/wedge256/mm-patcher/issues
// @icon         data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIj48ZyB0cmFuc2Zvcm09InJvdGF0ZSgtMzUgMTAwIDEwMCkiPjxyZWN0IHg9IjEyIiB5PSI2MiIgd2lkdGg9IjE3NiIgaGVpZ2h0PSI3NiIgcng9IjM4IiBmaWxsPSIjRjJCNzA1Ii8+PHJlY3QgeD0iNzAiIHk9IjYyIiB3aWR0aD0iNjAiIGhlaWdodD0iNzYiIGZpbGw9IiMwNTE2NEQiLz48ZyBmaWxsPSIjMDAwIiBvcGFjaXR5PSIuMjIiPjxjaXJjbGUgY3g9IjM2IiBjeT0iODgiIHI9IjQiLz48Y2lyY2xlIGN4PSIzNiIgY3k9IjExMiIgcj0iNCIvPjxjaXJjbGUgY3g9IjE2NCIgY3k9Ijg4IiByPSI0Ii8+PGNpcmNsZSBjeD0iMTY0IiBjeT0iMTEyIiByPSI0Ii8+PC9nPjwvZz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMDAgMTAwKSByb3RhdGUoMTApIHNjYWxlKDIuMikgdHJhbnNsYXRlKC0xMiAtMTIpIj48cGF0aCBmaWxsPSIjZmZmIiBkPSJNMjEgMTZ2LTJsLTgtNVYzLjVjMC0uODMtLjY3LTEuNS0xLjUtMS41UzEwIDIuNjcgMTAgMy41VjlsLTggNXYybDgtMi41VjE5bC0yIDEuNVYyMmwzLjUtMSAzLjUgMXYtMS41TDEzIDE5di01LjVsOCAyLjV6Ii8+PC9nPjwvc3ZnPg==
// @match        https://shop.miles-and-more.com/*
// @match        https://www.miles-and-more.com/*
// @updateURL    https://raw.githubusercontent.com/wedge256/mm-patcher/main/mm-patcher.meta.js
// @downloadURL  https://raw.githubusercontent.com/wedge256/mm-patcher/main/mm-patcher.user.js
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @grant        unsafeWindow
// @connect      api.shop.miles-and-more.com
// @noframes
// ==/UserScript==

(function () {
    function __mmMain() {
if ("shop.miles-and-more.com" === location.hostname) {
  (() => {
    "use strict";
    const VERSION = 9;
    if (window.__mmAuth && window.__mmAuth.version >= VERSION) return;
    const state = {
      version: VERSION,
      code: null,
      refresh: null,
      repaired: !1,
      seenCodes: 0,
      miles: null,
      tier: null,
      milesAt: 0,
      profile: null
    };
    try {
      Object.defineProperty(window, "__mmAuth", {
        value: state,
        configurable: !0
      });
    } catch (e) {
      try {
        window.__mmAuth = state;
      } catch (e2) {
        return;
      }
    }
    const profileListeners = new Set;
    state.onProfile = fn => {
      profileListeners.add(fn);
      return () => profileListeners.delete(fn);
    };
    const OFFICE_RE = /^[A-Z0-9]{7,10}$/;
    function chosenOffice() {
      try {
        const v = window.__mmSettings?.get("office");
        const s = String(v || "").trim().toUpperCase();
        return OFFICE_RE.test(s) ? s : null;
      } catch (e) {
        return null;
      }
    }
    function tokenContext() {
      try {
        const all = JSON.parse(sessionStorage.getItem("gateway-auth-tokens") || "{}");
        for (const k of Object.keys(all)) {
          const tok = all[k] && all[k].token;
          if ("string" != typeof tok || 3 !== tok.split(".").length) continue;
          const pl = JSON.parse(atob(tok.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
          const ctx = "string" == typeof pl.context ? JSON.parse(pl.context) : pl.context || {};
          if (ctx && (ctx.officeId || ctx.country)) return ctx;
        }
      } catch (e) {}
      return null;
    }
    state.activeOffice = () => {
      const c = tokenContext();
      return c && c.officeId ? String(c.officeId) : null;
    };
    state.activeCountry = () => {
      const c = tokenContext();
      return c && c.country ? String(c.country).toUpperCase() : null;
    };
    state.chosenOffice = chosenOffice;
    window.__mmAuthHooks = {
      kindOf: u => {
        u = String(u || "");
        return /\/auth\/token(\?|$)/.test(u) ? "token" : /oauth2\/userAuthorize/.test(u) ? "authz" : /\/travels\/travelers-profile(\?|$)/.test(u) ? "profile" : null;
      },
      rewriteBody: body => {
        const fixed = function(body) {
          if (window.__mmHandoverBusy) return null;
          if (state.repaired || !state.code || !state.refresh) return null;
          if (!(b = body, "string" == typeof b && /grant_type=client_credentials/.test(b))) return null;
          var b;
          state.repaired = !0;
          const context = JSON.stringify({
            authenticationCode: state.code,
            userRedirectUri: location.origin
          });
          return body.replace(/grant_type=client_credentials/, "grant_type=refresh_token").replace(/&context=[^&]*/g, "") + "&context=" + encodeURIComponent(context) + "&refresh_token=" + encodeURIComponent(state.refresh);
        }(body);
        fixed && (body = fixed);
        return function(body) {
          const office = chosenOffice();
          if (!office || "string" != typeof body) return null;
          try {
            const p = new URLSearchParams(body);
            if ("client_credentials" !== p.get("grant_type")) return null;
            const key = p.has("contextData") ? "contextData" : "context";
            let ctx = {};
            if (p.has(key)) try {
              ctx = JSON.parse(p.get(key)) || {};
            } catch (e) {
              ctx = {};
            }
            if (ctx.officeId === office) return null;
            ctx.officeId = office;
            p.set(key, JSON.stringify(ctx));
            state.officeApplied = (state.officeApplied || 0) + 1;
            return p.toString();
          } catch (e) {
            return null;
          }
        }(body) || body;
      },
      read: (kind, text) => {
        "authz" === kind ? function(text) {
          const m = /[?&]code=([^&"'\s]+)/.exec(String(text || ""));
          if (m) {
            state.seenCodes++;
            state.code = m[1];
          }
        }(text) : "profile" === kind ? function(text) {
          try {
            const j = JSON.parse(text);
            const d = j && j.data;
            const list = Array.isArray(d) ? d : Array.isArray(d?.travelers) ? d.travelers : [];
            const primary = list.find(x => x?.isPrimaryTraveler);
            if (primary) {
              state.profile = primary;
              profileListeners.forEach(fn => {
                try {
                  fn(primary);
                } catch (e) {}
              });
            }
            const t = list.find(x => x?.isPrimaryTraveler && x.milesAssetBalance) || list.find(x => x?.milesAssetBalance);
            const b = t?.milesAssetBalance?.[0];
            const n = b ? parseFloat(b.assetValue) : NaN;
            if (!Number.isFinite(n)) return;
            state.miles = n;
            state.tier = t.frequentFlyerCard?.tierLevelName || null;
            state.milesAt = Date.now();
          } catch (e) {}
        }(text) : function(text) {
          try {
            const j = JSON.parse(text);
            j && j.refresh_token && (state.refresh = j.refresh_token);
          } catch (e) {}
        }(text);
      }
    };
    if (!window.__mmAuthHooked) {
      window.__mmAuthHooked = !0;
      const nativeFetch = window.fetch;
      "function" == typeof nativeFetch && (window.fetch = function(input, init) {
        const H = window.__mmAuthHooks;
        const kind = H.kindOf("string" == typeof input ? input : input && input.url || "");
        if ("token" === kind && init && "string" == typeof init.body) try {
          const body = H.rewriteBody(init.body);
          body !== init.body && (init = Object.assign({}, init, {
            body: body
          }));
        } catch (e) {}
        const p = nativeFetch.apply(this, [ input, init ]);
        return kind ? p.then(res => {
          try {
            ("profile" !== kind || res.ok) && res.clone().text().then(t => H.read(kind, t)).catch(() => {});
          } catch (e) {}
          return res;
        }) : p;
      });
      const open = XMLHttpRequest.prototype.open;
      const send = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function(method, url) {
        this.__mmAuthUrl = url;
        return open.apply(this, arguments);
      };
      XMLHttpRequest.prototype.send = function(body) {
        const H = window.__mmAuthHooks;
        const kind = H.kindOf(this.__mmAuthUrl);
        try {
          "token" === kind && (body = H.rewriteBody(body));
          kind && this.addEventListener("load", () => {
            try {
              "profile" === kind && 200 !== this.status || H.read(kind, this.responseText);
            } catch (e) {}
          });
        } catch (e) {}
        return send.call(this, body);
      };
    }
    state.summary = () => ({
      version: VERSION,
      seenCodes: state.seenCodes,
      repaired: state.repaired,
      miles: state.miles
    });
  })();
  (() => {
    "use strict";
    const VERSION = 17;
    if (window.__mmI18n && window.__mmI18n.version >= VERSION) return;
    const LANGS = {
      en: {
        "@language": "English",
        "@locale": "en-GB",
        "Rückflug:": "Return:",
        "Hinflug:": "Outbound:",
        "{n}. Abschnitt:": "Flight {n}:",
        "Kalender zeigen": "Show calendar",
        "Aktuelle Anzeige: {state}": "Currently shown: {state}",
        "Kalenderpreise unvollständig": "Calendar prices incomplete",
        "Nur BBD-Preise": "Best-by-Day prices only",
        "Keine Preise": "No prices",
        "Holt die Kalenderpreise für {month}.": "Fetches the calendar prices for {month}.",
        "Können veraltet oder nicht mehr verfügbar sein.": "They may be outdated or no longer available.",
        "Kalender wartet …": "Calendar waiting …",
        "wartet …": "waiting …",
        "Kalender lädt …": "Calendar loading …",
        "lädt …": "loading …",
        "Kalender laden": "Load calendar",
        Laden: "Load",
        "{date}: mit dem gewählten Hinflug kein Angebot": "{date}: no offer with the chosen outbound flight",
        "{cabin}: Kalenderpreise werden geholt.": "{cabin}: fetching calendar prices.",
        "{cabin}: wird geladen …": "{cabin}: loading …",
        "{cabin}: kein bekannter Preis": "{cabin}: no known price",
        "Klicken startet die Suche für diesen Tag.": "Click to search this day.",
        "Mit dem gewählten Hinflug kein Angebot an diesem Tag.": "No offer on this day with the chosen outbound flight.",
        "Zuzahlung {amount}": "Surcharge {amount}",
        "{miles} Meilen": "{miles} miles",
        "Günstigster Tag im Ausschnitt": "Cheapest day in view",
        "Quelle: {source}": "Source: {source}",
        "Suche {time}": "Search {time}",
        Kalender: "Calendar",
        "Kabinen werden geladen … {done}/{total}": "Loading cabins … {done}/{total}",
        "Prüft, ob die Sperre vorbei ist …": "Checking whether the block has ended …",
        "Preise werden geladen …": "Loading prices …",
        "gedrosselt, damit der Server nicht sperrt": "throttled so the server does not block",
        "Seite neu laden": "Reload page",
        "Jetzt versuchen": "Try now",
        "Erneut versuchen": "Try again",
        "gesuchte Kabine": "searched cabin",
        "Keine Prämienflüge vom {range}.": "No award flights for {range}.",
        "Für {range} sind noch keine Preise geladen.": "No prices loaded yet for {range}.",
        "Preise laden": "Load prices",
        "Nicht geladen: {list}": "Not loaded: {list}",
        "keine Verfügbarkeit im Zeitraum": "no availability in this period",
        "dunkler: teurer als der günstigste Tag": "darker: more expensive than the cheapest day",
        "kein bekannter Preis": "no known price",
        "<s>Tag</s> kein Angebot zum Hinflug": "<s>Day</s> no offer with the outbound flight",
        "Preise pro Erwachsener": "Prices per adult",
        "7 Tage zurück": "7 days back",
        "zum Suchdatum": "to search date",
        "7 Tage weiter": "7 days forward",
        "Kalender einklappen": "Collapse calendar",
        "Vier Abfragen pro Monat statt einer. Kann Tarife zeigen, die eine einzelne Abfrage nicht findet. Dauert länger.": "Four requests per month instead of one. Can show fares a single request does not find. Takes longer.",
        "Alle Kabinen": "All cabins",
        "Nächster Versuch in {time}.": "Next attempt in {time}.",
        "Am {date} gibt es zum gewählten Hinflug keinen Rückflug.": "On {date} there is no return flight for the chosen outbound flight.",
        "Die Suchmaske der Seite hat die Suche nicht gestartet. Bitte noch einmal klicken.": "The page's search form did not start the search. Please click again.",
        "Die Seite hat den Tag nicht übernommen. Bitte noch einmal klicken.": "The page did not take the day. Please click again.",
        "Monatsübersicht Meilenpreise": "Monthly overview of mile prices",
        "{n} Nacht": {
          one: "{n} night",
          other: "{n} nights"
        },
        Hinflug: "Outbound",
        "Rückflug": "Return",
        "Flug {n} auswählen": "Select flight {n}",
        "Hinflug auswählen": "Select outbound flight",
        "Vorheriger Monat": "Previous month",
        "Nächster Monat": "Next month",
        "Keine Preise für {cabin} bekannt": "No known prices for {cabin}",
        "günstigster Tag": "cheapest day",
        "Meilen pro Erwachsener": "Miles per adult",
        "wählen": "select",
        "kein Angebot": "no offer",
        "Reisedatum wählen": "Choose travel date",
        "Kalender-Abfrage abgewiesen: HTTP 429, zu viele Anfragen (der Browser meldet nur „Failed to fetch“). Sperre etwa 10 Minuten, seit {since}, voraussichtlich bis {until}.": "Calendar request refused: HTTP 429, too many requests (the browser only reports “Failed to fetch”). Block of about 10 minutes, since {since}, probably until {until}.",
        "Noch keine Suchvorlage. Bitte einmal eine Suche ausführen.": "No search template yet. Please run a search once.",
        "nicht gesendet (Sperre)": "not sent (block)",
        Netzwerkfehler: "Network error",
        Netzfehler: "Network error",
        "HTTP {status}: Anmeldung der Buchungsstrecke abgelaufen, Erneuerung fehlgeschlagen. Seite neu laden.": "HTTP {status}: booking session login expired, renewal failed. Reload the page.",
        "HTTP {status}: Laden fehlgeschlagen.": "HTTP {status}: loading failed.",
        "Keine Internetverbindung.": "No internet connection.",
        "Netzfehler: {detail}": "Network error: {detail}",
        unbekannt: "unknown",
        "Laden fehlgeschlagen: {detail}": "Loading failed: {detail}",
        "Netzfehler ohne Status": "Network error without status",
        "{n} von 4 Kabinen nicht geladen ({reasons})": "{n} of 4 cabins not loaded ({reasons})",
        "nicht erreichbar ({detail})": "not reachable ({detail})",
        Fehler: "Error",
        Suchen: "Search",
        "Ändern Sie oben Datum, Flughäfen oder Kabine.": "Change the date, airports or cabin above.",
        "Gegenrichtung suchen": "Search the opposite direction",
        "Abflug und Ziel tauschen": "Swap departure and destination",
        "🔍 Suche": "🔍 Search",
        "🔤 Besserer Suchalgorithmus": "🔤 Better search",
        'Eigene Vorschlagsliste: schnell, „Stadt, Ort (Kürzel)", Flughäfen vor Bahnhöfen. „BER" findet Berlin statt Berbera, „Brasilien" listet alle Städte des Landes. Ländersuche greift nach Neuladen.': "Own suggestion list: fast, “City, place (code)”, airports before stations. “BER” finds Berlin instead of Berbera, “Brazil” lists all cities of the country. Country search applies after a reload.",
        "🌍 Mehr Ziele": "🌍 More destinations",
        "Rund 11.000 Flughäfen und Bahnhöfe der Hauptseite statt der 1.500 der Awardsuche. Greift nach Neuladen.": "Around 11,000 airports and stations of the main site instead of the 1,500 of the award search. Applies after a reload.",
        "⇄ Richtungstausch": "⇄ Swap direction",
        "Tauscht Abflug und Zielort (wie auf der Hauptseite).": "Swaps departure and destination (as on the main site).",
        "📅 Kalender": "📅 Calendar",
        "📅 Monatskalender": "📅 Month calendar",
        "Voller Monat statt einer Woche, je nach Einstellung für alle 4 Kabinen.": "A full month instead of a week, for all 4 cabins depending on the setting.",
        "📈 Best-by-Day-Preise": "📈 Best-by-Day prices",
        "Ergänzt den Kalender um die Preise der Hauptseite (bester Preis pro Tag und Kabine). Serverseitig lange gecached, oft veraltet. Wirkt nur mit Monatskalender.": "Adds the main site’s prices to the calendar (best price per day and cabin). Cached on the server for a long time, often outdated. Only works with the month calendar.",
        "🗓 Datumswähler mit Preisen": "🗓 Date picker with prices",
        "Monatsansicht, Meilenpreise der gewählten Kabine, Hin- und Rückflug als Zeitraum mit Nächten. Economy lädt fehlende Monate selbst.": "Month view, mile prices of the chosen cabin, outbound and return as a range with nights. Economy loads missing months itself.",
        Leeren: "Clear",
        "🗑 Kalender-Cache": "🗑 Calendar cache",
        "Verwirft gespeicherte Kalenderpreise (60 Minuten gültig) und lädt den Suchmonat neu.": "Discards stored calendar prices (valid for 60 minutes) and reloads the search month.",
        "🛬 Ergebnisse": "🛬 Results",
        "🛬 Ergebniskarten": "🛬 Result cards",
        "Eigene Ergebniskarten mit mehr Details und Sortierung; Tarif wählen mit einem Klick statt über die Kabinenkästen.": "Own result cards with more detail and sorting; choose a fare with one click instead of via the cabin boxes.",
        "💺 Sitzplan": "💺 Seat map",
        "Sitzplan bei Hover oder Klick auf den Flugzeugtyp. Wirkt nur mit Ergebniskarten.": "Seat map on hover or click on the aircraft type. Only works with result cards.",
        "🏢 Buchungsbüro-Zeile": "🏢 Booking office line",
        "Zeile über den Ergebniskarten, wenn das Buchungsbüro nicht im Abflugland liegt: Büro und Währung der Zuzahlungen. Wirkt nur mit Ergebniskarten.": "Line above the result cards when the booking office is not in the departure country: office and currency of the surcharges. Only works with result cards.",
        "🧰 Sonstiges": "🧰 Other",
        "🔐 Angemeldet bleiben": "🔐 Stay logged in",
        "Verhindert das Session-Ende nach 15 Minuten Inaktivität.": "Prevents the session from ending after 15 minutes of inactivity.",
        "💱 Währungsumrechnung": "💱 Currency conversion",
        "Fremdwährungsbeträge zusätzlich in {target} (Kalender, Karten, Sitzplan).": "Foreign-currency amounts also in {target} (calendar, cards, seat map).",
        "💱 Umrechnen in": "💱 Convert to",
        "⚠️ Bessere Fehlerseiten": "⚠️ Better error pages",
        "Fehlerseite und Warenkorb-Hinweise nennen die echte Ursache, mit Relogin-Knopf.": "Error page and basket notices state the real cause, with a re-login button.",
        "↻ Greift nach Neuladen: {link}": "↻ Applies after a reload: {link}",
        "jetzt neu laden": "reload now",
        "🏢 Buchungsbüro": "🏢 Booking office",
        "Automatisch (Abflugland)": "Automatic (departure country)",
        "Webseite (Standard)": "Website (default)",
        "Andere Kennung …": "Other ID …",
        Kennung: "ID",
        "Aktiv: {office}": "Active: {office}",
        "M&M Patcher: Einstellungen": "M&M Patcher: settings",
        "M&amp;M Patcher unterstützen": "Enjoying M&amp;M Patcher?",
        "Bier spendieren": "Buy me a beer",
        "Auf Updates prüfen": "Check for updates",
        "Update-Hinweis ist abgeschaltet": "Update notice is switched off",
        "prüfe …": "checking …",
        "Prüfung fehlgeschlagen": "Check failed",
        "v{version} verfügbar": "v{version} available",
        "✓ aktuell": "✓ up to date",
        "Greift nach Neuladen.": "Applies after a reload.",
        "Büro wird gewechselt …": "Switching office …",
        "Wechsel fehlgeschlagen: {reason}": "Switch failed: {reason}",
        "unbekannt (noch kein Token)": "unknown (no token yet)",
        "Ich fliege nicht selbst, sondern führe die Buchung für eine oder mehrere andere Personen durch.": "I am not travelling myself; I am making the booking for one or more other people.",
        Bahnhof: "Station",
        Bus: "Bus",
        Ort: "Place",
        "+ {n} weitere im Changelog": "+ {n} more in the changelog",
        "Update verfügbar": "Update available",
        Installieren: "Install",
        "Diese Version nicht mehr anzeigen": "Stop showing this version",
        "Update hilfreich?": "Enjoying the update?",
        "Startseite von Miles &amp; More": "Miles &amp; More home page",
        "Flugsuche auf miles-and-more.com": "Flight search on miles-and-more.com",
        "Zur Anmeldung": "Go to login",
        Mitgliederkonto: "Member account",
        "Der gewählte Hinflug ist abgelaufen. Eine neue Suche behebt das.": "The selected outbound flight has expired. A new search will fix this.",
        "Kein Flug für den Rückflug an diesem Tag.": "No flight for the return on this day.",
        "Kein Flug für den Hinflug an diesem Tag.": "No flight for the outbound on this day.",
        "Flug {n}": "Flight {n}",
        "Gemischte Kabinen": "Mixed cabins",
        Meilen: "Miles",
        Zuzahlung: "Surcharge",
        "Preis geändert": "Price changed",
        "Die Suche ist unerwartet abgebrochen.": "The search ended unexpectedly.",
        "Auf vielfachen Kundenwunsch haben wir daher Ihre Session beendet.": "By popular demand, we have therefore ended your session.",
        "Manchmal hilft hier schlicht ein neuer Versuch oder ein neuer Login. Who knows.": "Sometimes a new attempt or a new login is all it takes. Who knows.",
        "keine Antwort": "no response",
        "Erfasst: <code>{name} → HTTP {status}, {secs} s</code><br>": "Recorded: <code>{name} → HTTP {status}, {secs} s</code><br>",
        "Erfasst: <code>{name} → HTTP {status}</code><br>": "Recorded: <code>{name} → HTTP {status}</code><br>",
        "Die Anmeldung hat nicht gegriffen:": "The login did not take effect:",
        "Miles &amp; More\nmeldet Sie zwar als angemeldet, akzeptiert die Sitzung aber nicht mehr. In diesem Fall\nhilft nur, sich richtig abzumelden und danach neu anzumelden. Der Knopf unten\nerledigt das Abmelden direkt.": "Miles &amp; More shows you as logged in but no longer accepts the session. In this case the only fix is to log out properly and then log in again. The button below logs you out directly.",
        "Suche wiederholen": "Repeat search",
        "Bei Miles &amp; More anmelden": "Log in to Miles &amp; More",
        "Bei Miles &amp; More abmelden": "Log out of Miles &amp; More",
        "Zurück zur Suche": "Back to search",
        "Die Anmeldung läuft in einem eigenen Fenster. Sobald\nSie hierher zurückkehren, wird die Suche wiederholt. Über den Knopf lässt sie sich auch\njederzeit von Hand starten.": "Login is running in a separate window. As soon as you return here, the search is repeated. You can also start it at any time with the button.",
        "Falls nichts davon hilft:": "If none of this helps:",
        "Originalmeldung der Seite: <code>{text}</code>": "Original message from the page: <code>{text}</code>",
        "Abmelden hier nicht möglich": "Logging out is not possible here",
        "Zum Abmelden auf miles-and-more.com": "Log out on miles-and-more.com",
        "Abmeldung läuft …": "Logging out …",
        "Abgemeldet. Melden Sie sich jetzt neu an.": "Logged out. Please log in again now.",
        "Profil wird geladen …": "Loading profile …",
        Vielfliegerprofil: "Frequent flyer profile",
        "des Vielfliegerprofils": "the frequent flyer profile",
        "Prämienflüge werden gesucht …": "Searching for award flights …",
        "Prämienflugsuche": "Award flight search",
        "der Prämienflugsuche": "the award flight search",
        "Kalenderpreise werden geladen …": "Loading calendar prices …",
        Kalenderpreise: "Calendar prices",
        "der Kalenderpreise": "the calendar prices",
        "Anmeldung wird geprüft …": "Checking login …",
        Anmeldestatus: "Login status",
        "des Anmeldestatus": "the login status",
        "Authentifizierung läuft …": "Authenticating …",
        Authentifizierung: "Authentication",
        "der Authentifizierung": "the authentication",
        Anfrage: "Request",
        "der Anfrage": "the request",
        "Prämienflugsuche wird geöffnet …": "Opening award flight search …",
        "{name} ({secs} s)": "{name} ({secs} s)",
        "Dauert länger als üblich. Es wartet noch: {list}": "Taking longer than usual. Still waiting for: {list}",
        "Dauert länger als üblich (seit {n} Sekunde).": {
          one: "Taking longer than usual (for {n} second).",
          other: "Taking longer than usual (for {n} seconds)."
        },
        "Das Zugangstoken dieses Tabs ist um {time} Uhr abgelaufen.": "This tab’s access token expired at {time}.",
        "Neu anmelden, dann geht die Suche hier weiter.": "Log in again and the search can continue here.",
        "Auf vielfachen Kundenwunsch haben wir die Session an dieser Stelle für Sie beendet.": "By popular demand, we have ended your session at this point.",
        "Ab {origin} gibt es an diesem Datum keine Prämienflüge.": "There are no award flights from {origin} on this date.",
        "Für diese Strecke gibt es an diesem Datum keine Prämienflüge.": "There are no award flights on this route on this date.",
        "Auf vielfachen Kundenwunsch haben wir Ihnen ein leeres Ergebnis als technischen Fehler verkauft.": "By popular demand, we have sold you an empty result as a technical error.",
        "Die Anmeldung ist in Ordnung. Anderes Datum oder anderen Abflugort versuchen. Manche Bahnhofs- und Off-Line-Codes verkaufen gar keine Prämienflüge.": "Your login is fine. Try another date or departure point. Some station and off-line codes do not sell award flights at all.",
        "{origin} kennt die Prämienflugsuche nicht.": "The award flight search does not know {origin}.",
        "Diesen Abflugort kennt die Prämienflugsuche nicht.": "The award flight search does not know this departure point.",
        "Auf vielfachen Kundenwunsch bieten wir Orte an, an denen wir nicht fliegen.": "By popular demand, we offer places we do not fly to.",
        "Die Anmeldung ist in Ordnung. Nächstgelegenen Flughafen oder Bahnhof wählen.": "Your login is fine. Choose the nearest airport or station.",
        "Auf vielfachen Kundenwunsch haben wir die Suche an dieser Stelle beendet.": "By popular demand, we ended the search at this point.",
        "Die Anmeldung ist in Ordnung. Ein erneuter Versuch oder ein anderes Datum hilft meist.": "Your login is fine. Trying again or choosing another date usually helps.",
        "Sie sind angemeldet. Die Buchungsstrecke hat die Anmeldung nicht übernommen.": "You are logged in. The booking flow did not pick up the login.",
        "Auf vielfachen Kundenwunsch haben wir Ihre Anmeldung ignoriert und den Abruf <b>{of}</b> ohne Kundenkonto geschickt (HTTP {status}).": "By popular demand, we ignored your login and sent the request for <b>{of}</b> without a customer account (HTTP {status}).",
        "Eine neue Anmeldung ändert daran nichts. Ein erneuter Versuch zieht die Anmeldung nach.": "Logging in again will not change this. Trying again picks the login up.",
        "Der Auth-Token ist nicht mehr gültig (HTTP {status}).": "The auth token is no longer valid (HTTP {status}).",
        "Die Sitzung war beim Abruf {of} nicht mehr gültig (HTTP {status}).": "The session was no longer valid for the request for {of} (HTTP {status}).",
        "Eine neue Anmeldung sollte das lösen.": "Logging in again should fix this.",
        "Miles & More hat den Abruf {of} vorübergehend gedrosselt (HTTP 429).": "Miles & More has temporarily throttled the request for {of} (HTTP 429).",
        "Auf vielfachen Kundenwunsch bearbeiten wir Anfragen jetzt in einem entspannteren Tempo.": "By popular demand, we now process requests at a more relaxed pace.",
        "Ein paar Minuten abwarten, dann nochmal versuchen.": "Wait a few minutes, then try again.",
        "Der Abruf {of} hat nach {n} Sekunde nicht geantwortet (HTTP {status}).": {
          one: "The request for {of} did not respond after {n} second (HTTP {status}).",
          other: "The request for {of} did not respond after {n} seconds (HTTP {status})."
        },
        "Auf vielfachen Kundenwunsch lässt sich unser Server heute etwas mehr Zeit.": "By popular demand, our server is taking its time today.",
        "Das liegt wahrscheinlich an Miles & More, nicht an der Anmeldung. Später erneut versuchen.": "This is probably down to Miles & More, not your login. Try again later.",
        "Der Abruf {of} ist mit HTTP {status} fehlgeschlagen.": "The request for {of} failed with HTTP {status}.",
        "Auf vielfachen Kundenwunsch legt der Server eine kurze Pause ein.": "By popular demand, the server is taking a short break.",
        "Ein Fehler auf Seiten von Miles & More. Später erneut versuchen.": "An error on the Miles & More side. Try again later.",
        "Der Abruf {of} kam nach {n} Sekunde nicht durch.": {
          one: "The request for {of} did not get through after {n} second.",
          other: "The request for {of} did not get through after {n} seconds."
        },
        "Auf vielfachen Kundenwunsch wurde die Verbindung vorzeitig beendet.": "By popular demand, the connection was ended early.",
        "Der Abruf {of} wurde mit HTTP {status} abgelehnt.": "The request for {of} was rejected with HTTP {status}.",
        "Auf vielfachen Kundenwunsch haben wir diese Anfrage nicht bearbeitet.": "By popular demand, we did not process this request.",
        "Meist eine abgelaufene Anmeldung.": "Usually an expired login.",
        Erwachsener: "Adult",
        Kind: "Child",
        "{n} Stopp": {
          one: "{n} stop",
          other: "{n} stops"
        },
        Direktflug: "Nonstop",
        "Handgepäck": "Carry-on bag",
        "mehr Beinfreiheit": "extra legroom",
        "Lehne nicht verstellbar": "seat back does not recline",
        "Babybett möglich": "bassinet possible",
        "über der Tragfläche": "over the wing",
        "Sitzplan wird geladen …": "Loading seat map …",
        frei: "free",
        Gesamt: "Total",
        kostenlos: "free",
        ausverkauft: "sold out",
        "zu kurz vor Abflug": "too close to departure",
        "nicht verfügbar": "not available",
        Zug: "Train",
        "US-Dom.": "US dom.",
        Europa: "Europe",
        "keine API-Zugangsdaten": "no API credentials",
        Fernbahnhof: "Rail station",
        "Durchgeführt von {name}": "Operated by {name}",
        "{aircraft}: Sitzplan ansehen": "{aircraft}: view seat map",
        "Umgerüsteter A380 mit der neuen Business Class (1-2-1, direkter Gangzugang)": "Refitted A380 with the new Business Class (1-2-1, direct aisle access)",
        "Ankunft {n} Tag später": {
          one: "Arrives {n} day later",
          other: "Arrives {n} days later"
        },
        "Kurze Umstiegszeit": "Short connection time",
        "Langer Aufenthalt": "Long layover",
        "Flughafenwechsel in {place}:": "Airport change in {place}:",
        "Flughafenwechsel:": "Airport change:",
        "Der Transfer erfolgt in eigener Verantwortung. Gepäck muss neu aufgegeben werden, Check-in erneut.": "The transfer is at your own responsibility. Baggage must be checked in again, and so must you.",
        "Wechsel in {place}:": "Change in {place}:",
        "Wechsel:": "Change:",
        "Terminalwechsel in {place}:": "Terminal change in {place}:",
        "Terminalwechsel:": "Terminal change:",
        "Wechsel zwischen Fernbahnhof und Terminal": "Change between rail station and terminal",
        "Terminalwechsel beim Umstieg": "Terminal change when connecting",
        "Umstiegszeit in {place}:": "Connection time in {place}:",
        "Umstiegszeit:": "Connection time:",
        "Zwischenlandung ohne Umstieg, Sie bleiben an Bord": "Stopover without changing planes, you stay on board",
        "Zwischenlandung in {place}:": "Stopover in {place}:",
        "Zwischenlandung:": "Stopover:",
        "Halt ohne Umstieg, Sie bleiben sitzen": "Stop without changing, you stay seated",
        "{n} Zwischenhalt": {
          one: "{n} intermediate stop",
          other: "{n} intermediate stops"
        },
        "Junger Erw.": "Young adult",
        Kleinkind: "Infant",
        "Erw.": "Adult",
        "unter 2": "under 2",
        Companion: "Companion",
        Reisender: "Passenger",
        "nicht möglich": "not possible",
        "Aufgabegepäck": "Checked bag",
        "nicht inkl.": "not incl.",
        "Pers. Gegenstand": "Personal item",
        "1 Stück": "1 piece",
        Sitzplatzwahl: "Seat selection",
        inklusive: "included",
        "gegen Gebühr": "for a fee",
        Umbuchung: "Rebooking",
        Erstattung: "Refund",
        "zzgl. Tarifdifferenz": "plus fare difference",
        "▲ mehr als {tier}": "▲ more than {tier}",
        Preis: "Price",
        "je Person": "per person",
        Leistungen: "Services",
        "für {n} Reisende": {
          one: "for {n} passenger",
          other: "for {n} passengers"
        },
        "Schließen": "Close",
        "Wählen": "Select",
        "Meilenstand {have} · es fehlen {missing}": "Miles balance {have} · {missing} short",
        "Meilenstand {have}": "Miles balance {have}",
        "Warenkorb nicht erreichbar. Netzverbindung prüfen.": "Shopping cart unreachable. Check your connection.",
        "Der gewählte Hinflug ist abgelaufen (65012). Eine neue Suche behebt das.": "The chosen outbound flight has expired (65012). A new search fixes this.",
        "Warenkorb abgelehnt (38608: Angebot nicht zusammenführbar).": "Shopping cart refused (38608: offer cannot be combined).",
        "Warenkorb abgelehnt ({code}).": "Shopping cart refused ({code}).",
        "Warenkorb abgelehnt (HTTP {status}).": "Shopping cart refused (HTTP {status}).",
        "Nicht buchbar": "Not bookable",
        "Tarif von der Seite gesperrt. Suche neu starten.": "Fare blocked by the page. Restart the search.",
        "Rückflüge werden geladen …": "Loading return flights …",
        "Warenkorb wird geöffnet …": "Opening shopping cart …",
        "Auswahl nicht möglich. Seite neu laden.": "Selection not possible. Reload the page.",
        "Tarif wird gewählt …": "Selecting fare …",
        "Tarif nicht wählbar": "Fare cannot be selected",
        "Zuzahlung gesamt": "Total surcharge",
        "Zuzahlung gesamt ab": "Total surcharge from",
        "Zuzahlung ab": "Surcharge from",
        "statt der gesuchten": "instead of the one searched",
        "nur noch 1 Platz": "only 1 seat left",
        "9+ Plätze": "9+ seats",
        "{n} Platz übrig": {
          one: "{n} seat left",
          other: "{n} seats left"
        },
        "Miles &amp; More nennt die genaue Platzzahl erst bei 6 oder weniger.": "Miles &amp; More only gives the exact number of seats at 6 or fewer.",
        "7+ Plätze": "7+ seats",
        "Alle {cabin}-Tarife erscheinen erst bei einer {cabin}-Suche.": "All {cabin} fares only appear in a search for {cabin}.",
        "Eine eigene {cabin}-Suche kann weitere Tarife finden.": "A separate {cabin} search can find more fares.",
        "Prämienflüge": "Award flights",
        "Flüge werden gesucht …": "Searching for flights …",
        "Buchungsbüro {office}: diese Ergebnisse stammen noch aus Büro {from}. Eine neue Suche rechnet im aktuellen Büro.": "Booking office {office}: these results still come from office {from}. A new search is priced in the current office.",
        "Buchungsbüro {office}: Zuzahlungen in {currency}.": "Booking office {office}: surcharges in {currency}.",
        "Buchungsbüro {office}.": "Booking office {office}.",
        "Es gilt für die ganze Sitzung und wechselt nicht mit dem Abflugort. Im Panel umstellbar.": "It applies to the whole session and does not change with the departure airport. Can be changed in the panel.",
        "Buchungsbüro {office}: diese Ergebnisse sind noch unter Büro {from} in {currency} berechnet (Anzeige in {target} umgerechnet). Eine neue Suche rechnet im aktuellen Büro.": "Booking office {office}: these results were still priced under office {from} in {currency} (shown converted to {target}). A new search is priced in the current office.",
        "Buchungsbüro {office}: diese Ergebnisse sind noch unter Büro {from} in {currency} berechnet. Eine neue Suche rechnet im aktuellen Büro.": "Booking office {office}: these results were still priced under office {from} in {currency}. A new search is priced in the current office.",
        "Buchungsbüro {office}: Zuzahlungen werden in {currency} berechnet (Anzeige in {target} umgerechnet).": "Booking office {office}: surcharges are charged in {currency} (shown converted to {target}).",
        "Buchungsbüro {office}: Zuzahlungen werden in {currency} berechnet.": "Booking office {office}: surcharges are charged in {currency}.",
        "Gewählter Hinflug: <b>{label}</b>. Die Rückflüge unten gelten zu diesem Hinflug.": "Chosen outbound flight: <b>{label}</b>. The return flights below apply to this outbound flight.",
        "Hinflug ändern": "Change outbound flight",
        "Der gewählte Hinflug ist abgelaufen.": "The chosen outbound flight has expired.",
        "Suche fehlgeschlagen ({detail}).": "Search failed ({detail}).",
        "Suche fehlgeschlagen.": "Search failed.",
        "Suche neu starten": "Restart search",
        "Eine Verbindung gefunden, {reasons}.": {
          one: "One connection found, {reasons}.",
          other: "{n} connections found, {reasons}."
        },
        "Eine Verbindung gefunden, keine buchbar: {reasons}.": {
          one: "One connection found, none bookable: {reasons}.",
          other: "{n} connections found, none bookable: {reasons}."
        },
        "In der {cabin} Class gibt es an diesem Tag keine Prämienflüge. Die Karten zeigen die übrigen Kabinen.": "There are no award flights in {cabin} Class on this day. The cards show the other cabins.",
        "Kein Flug entspricht den Filtern.": "No flight matches the filters.",
        "Filter zurücksetzen": "Reset filters",
        Hauptdeck: "Main deck",
        Oberdeck: "Upper deck",
        Unterdeck: "Lower deck",
        "Trennwand davor": "bulkhead in front",
        Notausstiegsreihe: "exit row",
        behindertengerecht: "accessible",
        Vorzugsplatz: "preferred seat",
        "Sitzplan {flight} {deck}": "Seat map {flight} {deck}",
        "Tür / Notausgang": "Door / emergency exit",
        Toilette: "Lavatory",
        "Toilette, barrierefrei": "Lavatory, accessible",
        "Bordküche": "Galley",
        Stauraum: "Storage",
        Treppe: "Stairs",
        Ablage: "Shelf",
        "nicht buchbar": "not bookable",
        belegt: "taken",
        "{cabin}: {free} von {total} frei, ab {price}": "{cabin}: {free} of {total} free, from {price}",
        "{cabin}: {free} von {total} frei": "{cabin}: {free} of {total} free",
        "Für diesen Flug liegt kein Sitzplan vor.": "There is no seat map for this flight.",
        "Sitzplan {flight} · {from} → {to}": "Seat map {flight} · {from} → {to}",
        "EXIT = Notausstiegsreihe": "EXIT = exit row",
        "Kabinenvorlage dieser Variante": "Cabin template of this variant",
        "Größe für Großraumflugzeuge; ein Klick auf den Wert stellt wieder automatisch ein": "Size for wide-body aircraft; click the value to reset to automatic",
        "Größe für Schmalrumpfflugzeuge; ein Klick auf den Wert stellt wieder automatisch ein": "Size for narrow-body aircraft; click the value to reset to automatic",
        "Größe": "Size",
        "Kein Plan für dieses Deck.": "No plan for this deck.",
        "Nicht geladen: {cabins}.": "Not loaded: {cabins}.",
        "Erneut laden": "Reload",
        "{airline} meldet keine Preise für Sitzplatzreservierungen an das Buchungssystem.": "{airline} does not report seat reservation prices to the booking system.",
        "Die Airline meldet keine Preise für Sitzplatzreservierungen an das Buchungssystem.": "The airline does not report seat reservation prices to the booking system.",
        auto: "auto",
        "Zu diesem Flug ist im Buchungssystem kein Sitzplan hinterlegt.": "The booking system has no seat map for this flight.",
        "Diese Airline liefert dem Buchungssystem keinen Sitzplan.": "This airline does not provide a seat map to the booking system.",
        "Der Sitzplan konnte nicht geladen werden.": "The seat map could not be loaded.",
        "Klicken für Details und Sitzpreise": "Click for details and seat prices",
        "Swiss Senses: neue Kabinengeneration, Business teils als Suite mit Schiebetür": "Swiss Senses: new cabin generation, Business partly as a suite with a sliding door",
        "Eurowings Discover: neue Langstreckenkabine (Ocean Blue)": "Eurowings Discover: new long-haul cabin (Ocean Blue)",
        "Business Suiten": "Business Suites",
        "Air India A350: Business als Suite mit Schiebetür (1-2-1)": "Air India A350: Business as a suite with a sliding door (1-2-1)",
        "Turkish Crystal Business: Suiten mit Schiebetür (1-2-1), nur auf dem A350-1000": "Turkish Crystal Business: suites with a sliding door (1-2-1), A350-1000 only",
        "Air Canada 787-10: Signature-Kabine mit Signature-Plus-Suiten (Tür) vorn": "Air Canada 787-10: Signature cabin with Signature Plus suites (door) at the front",
        "Stück": "piece",
        "Suchlimit erreicht (HTTP 429).": "Search limit reached (HTTP 429).",
        "Suche fehlgeschlagen (HTTP {http}).": "Search failed (HTTP {http}).",
        "IP-Sperre etwa eine Stunde, bis ca. {time}.": "IP blocked for about an hour, until approx. {time}.",
        "IP-Sperre etwa eine Stunde.": "IP blocked for about an hour.",
        "Netzfehler, kein HTTP-Status ({detail})": "Network error, no HTTP status ({detail})",
        "Zugangsdaten der App noch nicht gesehen": "App credentials not seen yet",
        "Anmeldeaufruf der App noch nicht gesehen und keine Seitenkonfiguration (data-bootstrapconfig)": "App login request not seen yet and no page configuration (data-bootstrapconfig)",
        "anonymes Token nicht ausgestellt (Land {country}), {detail}": "anonymous token not issued (country {country}), {detail}",
        "anonymes Token ohne refresh_token (Land {country})": "anonymous token without refresh_token (country {country})",
        "Gruppen-Login abgelaufen (userAuthorize HTTP 401). Auf www.miles-and-more.com neu anmelden, dann Büro wählen.": "Group login expired (userAuthorize HTTP 401). Log in again on www.miles-and-more.com, then choose the office.",
        "kein Anmeldecode (HTTP {status})": "no login code (HTTP {status})",
        "Einlösung des Codes fehlgeschlagen, {detail}": "Redeeming the code failed, {detail}",
        "Einlösung des Codes ohne access_token": "Redeeming the code returned no access_token",
        "Günstigste Meilen": "Lowest miles",
        "Günstigste Zuzahlung": "Lowest surcharge",
        "Frühester Abflug": "Earliest departure",
        "Spätester Abflug": "Latest departure",
        "Kürzeste Dauer": "Shortest duration",
        Nacht: "Night",
        "Früh": "Early",
        Vormittag: "Morning",
        Nachmittag: "Afternoon",
        Abend: "Evening",
        Direkt: "Direct",
        "max. 1 Stopp": "Max. 1 stop",
        "nicht im Angebot": "not offered",
        "An diesem Tag nicht im Angebot": "Not offered on this day",
        "keine Tarife": "no fares",
        "Zu dieser Suche gibt es keine Tarife in dieser Kabine.": "This search has no fares in this cabin.",
        Stopps: "Stops",
        "{time} Uhr": "{time}",
        Abflug: "Departure",
        Ankunft: "Arrival",
        Airline: "Airline",
        Flugzeug: "Aircraft",
        Zubringer: "Feeder",
        Filter: "Filters",
        "Sortieren nach": "Sort by",
        "{label}-Filter entfernen": "Remove {label} filter",
        "{shown} von {total} Flug": {
          one: "{shown} of {total} flight",
          other: "{shown} of {total} flights"
        },
        "Zurücksetzen": "Reset",
        Preise: "Prices",
        "pro Erwachsener": "per adult",
        "gesamt · {n} Reisende": "total · {n} passengers",
        "Miles & More erlaubt etwa {limit} Suchen je IP-Adresse und Stunde, danach ist die Adresse eine Stunde gesperrt. Gezählt wird nur dieser Browser.": "Miles & More allows about {limit} searches per IP address and hour; after that the address is blocked for an hour. Only this browser is counted.",
        "Zähler wieder leer um {time}.": "Counter empty again at {time}.",
        "Zähler zurücksetzen nach IP-Wechsel (VPN, Hotspot, anderes Netz)": "Reset the counter after an IP change (VPN, hotspot, other network)",
        "Suchzähler zurücksetzen": "Reset search counter",
        "Suchen {calls}/{limit}": "Searches {calls}/{limit}",
        "Zubringer-Airlines": "Feeder airlines",
        "{n} · {picked} gewählt": "{n} · {picked} selected",
        "{shown} von {total} Flug entspricht diesen Kriterien": {
          one: "{shown} of {total} flight matches these criteria",
          other: "{shown} of {total} flights match these criteria"
        },
        Fertig: "Done",
        "🏢 Buchungsbüro & Währung": "🏢 Booking office & currency",
        Kabine: "Cabin",
        "sucht …": "searching …",
        "Dunkles Design": "Dark mode",
        "Helles Design": "Light mode",
        "Das war wohl jemand übereifrig… (HTTP 429)": "Someone got a bit overeager… (HTTP 429)",
        "Das war zu viel… (HTTP 429)": "That was too much… (HTTP 429)",
        "Die IP-Adresse wurde deswegen bis {time} gesperrt (noch {n} Minute).": {
          one: "The IP address has therefore been blocked until {time} ({n} minute left).",
          other: "The IP address has therefore been blocked until {time} ({n} minutes left)."
        },
        "Die IP-Adresse ist noch bis {time} gesperrt ({n} Minute).": {
          one: "The IP address is still blocked until {time} ({n} minute left).",
          other: "The IP address is still blocked until {time} ({n} minutes left)."
        },
        "Suche fehlgeschlagen (keine Antwort vom Server).": "Search failed (no response from the server).",
        "Mit gewähltem Hinflug nicht buchbar.": "Not bookable with the chosen outbound flight.",
        "Buchbar mit {fare} im Hinflug.": "Bookable with {fare} outbound.",
        "Buchbar mit Comfort im Hinflug, jede Kabine.": "Bookable with Comfort outbound, any cabin.",
        "Buchbar mit Comfort +, Flex oder Standard im Hinflug, jede Kabine.": "Bookable with Comfort +, Flex or Standard outbound, any cabin.",
        "nicht mit gewähltem Hinflug buchbar": "not bookable with the chosen outbound flight",
        "Rückflug nur {fare}": "Return only {fare}",
        "Rückflug nur Comfort, jede Kabine": "Return only Comfort, any cabin",
        "Rückflug Comfort +, Flex oder Standard, jede Kabine": "Return Comfort +, Flex or Standard, any cabin"
      }
    };
    const LANG_URL = "https://raw.githubusercontent.com/wedge256/mm-patcher/v1.10.0/lang/{code}.json";
    const SOURCE = "de", SOURCE_LOCALE = "de-DE", FALLBACK = "en";
    const fmtCache = new Map;
    const ruleCache = new Map;
    const pageLocale = () => {
      const l = String(document.documentElement && document.documentElement.lang || "").trim();
      return /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(l) ? l : "";
    };
    const base = l => l.split("-")[0].toLowerCase();
    const fileCode = l => /^zh-/i.test(l) ? l : base(l);
    const STORE = "mm_lang_";
    const asked = new Set;
    function lang() {
      const pl = pageLocale();
      if (!pl || base(pl) === SOURCE) return SOURCE;
      const code = fileCode(pl);
      LANGS[code] || function(code) {
        if (!LANG_URL || asked.has(code) || !/^[a-z]{2,3}(-[A-Za-z]{4})?$/.test(code)) return;
        asked.add(code);
        const url = LANG_URL.replace("{code}", code);
        try {
          const kept = JSON.parse(localStorage.getItem(STORE + code) || "null");
          if (kept && kept.url === url && kept.dict) {
            LANGS[code] = kept.dict;
            return;
          }
        } catch (e) {}
        try {
          fetch(url, {
            credentials: "omit"
          }).then(r => r.ok ? r.json() : null).then(dict => {
            if (dict && dict["@language"]) {
              LANGS[code] = dict;
              try {
                localStorage.setItem(STORE + code, JSON.stringify({
                  url: url,
                  dict: dict
                }));
              } catch (e) {}
              !function() {
                try {
                  for (let i = localStorage.length - 1; i >= 0; i--) {
                    const k = localStorage.key(i);
                    if (!k || 0 !== k.indexOf(STORE)) continue;
                    const want = '{"url":' + JSON.stringify(LANG_URL.replace("{code}", k.slice(STORE.length)));
                    0 !== String(localStorage.getItem(k)).indexOf(want) && localStorage.removeItem(k);
                  }
                } catch (e) {}
              }();
              fileCode(pageLocale()) === code && redraw();
            }
          }).catch(() => {});
        } catch (e) {}
      }(code);
      return LANGS[code] ? code : LANGS[FALLBACK] ? FALLBACK : SOURCE;
    }
    function locale() {
      const l = lang(), pl = pageLocale();
      return pl && fileCode(pl) === l ? pl : l === SOURCE ? SOURCE_LOCALE : LANGS[l]["@locale"] || l;
    }
    const fill = (s, p) => p ? String(s).replace(/\{(\w+)\}/g, (m, k) => null != p[k] ? String(p[k]) : m) : String(s);
    function lookup(msg) {
      const l = lang();
      if (l === SOURCE) return;
      const own = LANGS[l] && LANGS[l][msg];
      if (null != own && "" !== own) return own;
      const en = LANGS[FALLBACK] && LANGS[FALLBACK][msg];
      return null != en && "" !== en ? en : void 0;
    }
    function cached(kind, Ctor, opts) {
      const key = kind + "|" + locale() + "|" + JSON.stringify(opts || {});
      let f = fmtCache.get(key);
      if (!f) {
        f = new Ctor(locale(), opts);
        fmtCache.set(key, f);
      }
      return f;
    }
    const dtf = opts => cached("d", Intl.DateTimeFormat, opts);
    const cap = s => s ? s.charAt(0).toLocaleUpperCase(locale()) + s.slice(1) : s;
    const textCache = new Map;
    const REDRAW = [ [ "__mmIata", "redraw" ], [ "__mmCalUI", "render" ], [ "__mmCards", "render" ], [ "__mmSort", "rerender" ], [ "__mmPicker", "render" ], [ "__mmSettings", "redraw" ], [ "__mmsuHooks", "redraw" ], [ "__mmDark", "redraw" ] ];
    function redraw() {
      for (const [name, fn] of REDRAW) try {
        const o = window[name];
        o && "function" == typeof o[fn] && o[fn]();
      } catch (e) {}
    }
    try {
      window.__mmI18n?._langObserver?.disconnect();
    } catch (e) {}
    let langObserver = null;
    if ("shop.miles-and-more.com" === location.hostname) {
      langObserver = new MutationObserver(recs => {
        recs.some(r => r.target === document.documentElement) && redraw();
      });
      langObserver.observe(document, {
        attributes: !0,
        attributeFilter: [ "lang" ],
        subtree: !0
      });
    }
    const state = {
      version: VERSION,
      t: function(msg, params) {
        const v = lookup(msg);
        return fill("string" == typeof v ? v : msg, params);
      },
      tn: function(n, one, other, params) {
        const p = Object.assign({
          n: n
        }, params);
        const v = lookup(one);
        if (v && "object" == typeof v) {
          const loc = locale();
          let rules = ruleCache.get(loc);
          if (!rules) {
            rules = new Intl.PluralRules(loc);
            ruleCache.set(loc, rules);
          }
          const form = null != v[rules.select(n)] ? v[rules.select(n)] : v.other;
          if (null != form) return fill(form, p);
        }
        return fill("string" == typeof v ? v : 1 === n ? one : other, p);
      },
      lang: lang,
      locale: locale,
      dtf: dtf,
      nf: opts => cached("n", Intl.NumberFormat, opts),
      cap: cap,
      days: function(style) {
        const f = dtf({
          weekday: style || "short"
        });
        return Array.from({
          length: 7
        }, (_, i) => cap(f.format(new Date(2024, 0, 1 + i)).replace(/\.$/, "")));
      },
      redraw: redraw,
      pageText: function(key) {
        const ck = document.documentElement.lang + "|" + key;
        if (textCache.has(ck)) return textCache.get(ck);
        const loc = function() {
          try {
            for (const t of window.getAllAngularTestabilities ? window.getAllAngularTestabilities() : []) {
              let loc = null;
              t?._destroyRef?.records?.forEach(r => {
                const v = r?.value;
                !loc && v && "object" == typeof v && "function" == typeof v.useLanguage && "function" == typeof v.getTranslateService && (loc = v);
              });
              if (loc) return loc;
            }
          } catch (e) {}
          return null;
        }();
        if (!loc) return "";
        let text = "";
        try {
          const v = loc.getTranslateService().instant(key);
          "string" == typeof v && v !== key && (text = ((new DOMParser).parseFromString(v.split(/\{/)[0], "text/html").body.textContent || "").replace(/\s+/g, " ").trim());
        } catch (e) {}
        text && textCache.set(ck, text);
        return text;
      },
      languages: () => [ SOURCE ].concat(Object.keys(LANGS)),
      _langObserver: langObserver
    };
    try {
      Object.defineProperty(window, "__mmI18n", {
        value: state,
        enumerable: !1,
        configurable: !0
      });
    } catch (e) {
      window.__mmI18n = state;
    }
  })();
  (() => {
    "use strict";
    const VERSION = 5;
    if (window.__mmDark && window.__mmDark.version >= VERSION) return;
    try {
      window.__mmDark?._retire?.();
    } catch (e) {}
    const state = {
      version: VERSION
    };
    try {
      Object.defineProperty(window, "__mmDark", {
        value: state,
        enumerable: !1,
        configurable: !0
      });
    } catch (e) {
      try {
        window.__mmDark = state;
      } catch (e2) {}
    }
    const CHOICE = "mm_theme";
    const HUE = 222;
    const BASE = [ HUE, .22, .055 ], CARD = [ HUE, .16, .15 ], LAYER = [ HUE, .15, .2 ];
    const CANVAS = new Set([ "245,245,245" ]);
    const hsl = ([h, s, l], a) => `hsl(${h.toFixed(1)} ${(100 * s).toFixed(1)}% ${(100 * l).toFixed(1)}%${a < 1 ? " / " + a : ""})`;
    const neutral = (s, l) => s * (1 - Math.abs(2 * l - 1)) < .05;
    const MAP = {
      bg(h, s, l, key, layer) {
        if (CANVAS.has(key) && !layer) return BASE;
        if (l >= .97 && neutral(s, l)) return layer ? LAYER : CARD;
        if (l >= .7) {
          const tone = (layer ? LAYER : CARD)[2] + Math.min(.09, 1.2 * (1 - l));
          return neutral(s, l) ? [ HUE, .15, tone ] : [ h, Math.min(s, .4), tone + .02 ];
        }
        return l >= .45 ? s > .25 ? [ h, .8 * s, .36 ] : [ HUE, .12, .3 ] : s > .4 && l < .3 ? [ h, .5 * s, .4 ] : [ h, s, l ];
      },
      fg: (h, s, l) => l > .55 ? [ h, s, l ] : neutral(s, l) ? [ HUE, .12, .92 - .4 * l ] : l < .25 ? [ h, .3, .88 ] : [ h, .8 * s, .88 - .3 * l ],
      bd: (h, s, l) => l >= .5 ? neutral(s, l) ? [ HUE, .12, .24 + .35 * (1 - l) ] : [ h, Math.min(s, .3), .26 + .35 * (1 - l) ] : s > .3 ? [ h, .7 * s, .65 ] : [ HUE, .1, .45 ]
    };
    const COLOR_RE = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|\bwhite\b|\bblack\b/gi;
    function recolorValue(v, kind, layer) {
      return v.replace(COLOR_RE, c => {
        const p = function(c) {
          let m = /^#([0-9a-f]{3,8})$/i.exec(c);
          if (m) {
            let x = m[1];
            x.length <= 4 && (x = x.replace(/./g, "$&$&"));
            return [ parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16), 8 === x.length ? +(parseInt(x.slice(6), 16) / 255).toFixed(3) : 1 ];
          }
          m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(c);
          return m ? [ +m[1], +m[2], +m[3], void 0 === m[4] ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : +m[4] ] : /^white$/i.test(c) ? [ 255, 255, 255, 1 ] : /^black$/i.test(c) ? [ 0, 0, 0, 1 ] : null;
        }(c);
        if (!p || 0 === p[3]) return c;
        const [h, s, l] = function(r, g, b) {
          r /= 255;
          g /= 255;
          b /= 255;
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
          let h = 0, s = 0;
          if (d) {
            s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
            h = 60 * (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4);
          }
          return [ h, s, l ];
        }(p[0], p[1], p[2]);
        return hsl(MAP[kind](h, s, l, p[0] + "," + p[1] + "," + p[2], layer), p[3]);
      });
    }
    const VAR_LAYER_RE = /panel|menu|dialog|tooltip|overlay|popover|dropdown|snackbar|datepicker|autocomplete/i;
    const LAYER_SEL_RE = /cdk-overlay|menu-panel|menu-content|menu-item|select-panel|autocomplete-panel|dialog|popup|datepicker-content|tooltip|popover|dropdown/i;
    function kindOf(p) {
      return p.startsWith("--") ? /^--mat-sys-(primary|secondary|tertiary|error)$/.test(p) ? "fg" : !/color|background|surface|container|bg|text|foreground|border|outline|divider|fill/i.test(p) || /shadow|opacity|elevation|size|width|radius|weight|family|tracking|line-height/i.test(p) ? null : /background|surface|container|bg\b|-bg-|fill/i.test(p) && !/on-surface|on-primary|on-secondary|on-error|on-tertiary|text|foreground|label|icon/i.test(p) ? "bg" : /border|outline|divider/i.test(p) ? "bd" : "fg" : "background-color" === p || "background-image" === p ? "bg" : "color" === p || "fill" === p || "stroke" === p || "caret-color" === p || "text-decoration-color" === p || "-webkit-text-fill-color" === p ? "fg" : /^border-.*-color$|^outline-color$|^column-rule-color$/.test(p) ? "bd" : null;
    }
    let on = !1;
    let undo = [];
    let seen = new WeakSet;
    const adopted = new Map;
    const stats = {
      decls: 0,
      ms: 0
    };
    function setProp(st, p, v, out) {
      const pr = st.getPropertyPriority(p);
      undo.push([ st, p, st.getPropertyValue(p), pr ]);
      st.setProperty(p, v, pr);
      out.n++;
    }
    function recolorRules(list, sheetLayer, out) {
      for (const r of list) {
        if (7 === r.type) continue;
        if (r.cssRules && !r.style) {
          recolorRules(r.cssRules, sheetLayer, out);
          continue;
        }
        const st = r.style;
        if (!st) continue;
        const sel = r.selectorText || "";
        if (-1 !== sel.indexOf("mm-dark")) continue;
        const layer = sheetLayer || LAYER_SEL_RE.test(sel) || /^(absolute|fixed)$/.test(st.getPropertyValue("position")) && "" !== st.getPropertyValue("z-index");
        const op = parseFloat(st.getPropertyValue("opacity"));
        op >= .2 && op <= .6 && !/backdrop/i.test(sel) && setProp(st, "opacity", String(+(op + .4 * (1 - op)).toFixed(2)), out);
        for (let i = 0; i < st.length; i++) {
          const p = st[i];
          const kind = kindOf(p);
          if (!kind) continue;
          const v = st.getPropertyValue(p);
          const custom = p.startsWith("--");
          if (!v || !custom && -1 !== v.indexOf("var(") || -1 !== v.indexOf("url(")) continue;
          COLOR_RE.lastIndex = 0;
          if (!COLOR_RE.test(v)) continue;
          const nv = recolorValue(v, kind, layer || custom && VAR_LAYER_RE.test(p));
          nv !== v && setProp(st, p, nv, out);
        }
      }
    }
    function recolorSheet(sheet, layer) {
      if (!sheet || seen.has(sheet)) return;
      let rules;
      try {
        rules = sheet.cssRules;
      } catch (e) {
        return;
      }
      if (!rules) return;
      seen.add(sheet);
      const t0 = performance.now();
      const out = {
        n: 0
      };
      recolorRules(rules, layer, out);
      stats.decls += out.n;
      stats.ms += performance.now() - t0;
    }
    function recolorAll() {
      if (on) {
        for (const sh of document.styleSheets) recolorSheet(sh, !1);
        for (const [sh, layer] of adopted) recolorSheet(sh, layer);
      }
    }
    function restore() {
      for (let i = undo.length - 1; i >= 0; i--) {
        const [st, p, v, pr] = undo[i];
        try {
          v ? st.setProperty(p, v, pr) : st.removeProperty(p);
        } catch (e) {}
      }
      undo = [];
      seen = new WeakSet;
    }
    const css = `
html.mm-dark { color-scheme: dark; background-color: ${hsl(BASE, 1)};
    --mm-dark-base: ${hsl(BASE, 1)}; --mm-dark-card: ${hsl(CARD, 1)}; --mm-dark-layer: ${hsl(LAYER, 1)}; }
html.mm-dark body { background-color: ${hsl(CARD, 1)}; }
html.mmdm-switching *, html.mmdm-switching *::before, html.mmdm-switching *::after { transition: none !important; }
html.mm-dark img.logo-img { filter: brightness(0) invert(.9); }
html.mm-dark :is(.mat-mdc-select-panel, .mat-mdc-autocomplete-panel, .mat-mdc-menu-panel, .mat-mdc-dialog-surface,
    .mat-datepicker-content, .mdc-tooltip__surface) { background-color: var(--mm-dark-layer) !important; }
.mmdm-opt { margin-right: 1rem; }
.mmdm-btn { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; padding: 0;
    border: 0; border-radius: 50%; background: transparent; color: #05164D; cursor: pointer; }
.mmdm-btn:hover { background: rgba(5,22,77,.08); }
.mmdm-btn:focus-visible { outline: 2px solid #1c5cab; outline-offset: 1px; }
.mmdm-btn svg { width: 20px; height: 20px; display: block; }
`;
    let styleEl = null;
    let boldEl = null;
    const fontSeen = new WeakSet;
    function boldFace() {
      if (!boldEl || !boldEl.isConnected) for (const sh of document.styleSheets) {
        if (fontSeen.has(sh)) continue;
        let rules;
        try {
          rules = sh.cssRules;
        } catch (e) {
          continue;
        }
        if (rules) {
          fontSeen.add(sh);
          for (const r of rules) {
            if (5 !== r.type || "lufthansa-bold" !== r.style.getPropertyValue("font-family").replace(/["']/g, "").trim()) continue;
            const base = sh.href || document.baseURI;
            const src = r.style.getPropertyValue("src").replace(/url\((["']?)([^"')]+)\1\)/g, (m, q, u) => 'url("' + new URL(u, base).href + '")');
            boldEl = document.createElement("style");
            boldEl.id = "mmdm-bold";
            boldEl.textContent = "@font-face { font-family: lufthansa-regular; font-weight: 600 900; src: " + src + "; }";
            (document.head || document.documentElement).appendChild(boldEl);
            return;
          }
        }
      }
    }
    const ICON = body => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + "</svg>";
    const MOON = ICON('<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z"/>');
    const SUN = ICON('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4' + 'M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>');
    let opt = null;
    function paint() {
      const b = opt && opt.firstElementChild;
      if (!b) return;
      const label = (s = on ? "Helles Design" : "Dunkles Design", window.__mmI18n ? window.__mmI18n.t(s, p) : p ? String(s).replace(/\{(\w+)\}/g, (m, k) => null != p[k] ? String(p[k]) : m) : String(s));
      var s, p;
      if (b.title !== label) {
        b.title = label;
        b.setAttribute("aria-label", label);
      }
      const icon = on ? "sun" : "moon";
      if (b.dataset.icon !== icon) {
        b.dataset.icon = icon;
        b.innerHTML = on ? SUN : MOON;
      }
    }
    function place() {
      if (opt && opt.isConnected) return;
      const box = document.querySelector(".right-header-content .header-options-container");
      if (!box) return;
      if (!opt) {
        opt = document.createElement("div");
        opt.className = "header-option mmdm-opt";
        const b = document.createElement("button");
        b.type = "button";
        b.className = "mmdm-btn";
        b.addEventListener("click", () => {
          const next = !on;
          ((k, v) => {
            try {
              null == v ? localStorage.removeItem(k) : localStorage.setItem(k, v);
            } catch (e) {}
          })(CHOICE, next ? "dark" : null);
          apply(next);
        });
        opt.appendChild(b);
      }
      const lang = box.querySelector("refx-header-language-selector-pres");
      const before = lang && lang.closest(".header-option") || box.firstElementChild;
      box.insertBefore(opt, before && before.parentElement === box ? before : box.firstChild);
      paint();
    }
    function apply(dark) {
      if (dark !== on) {
        on = dark;
        const root = document.documentElement;
        root.classList.add("mmdm-switching");
        root.classList.toggle("mm-dark", dark);
        dark ? recolorAll() : restore();
        document;
        root.classList.remove("mmdm-switching");
      }
      paint();
    }
    function onLoad(e) {
      if (e.target && "LINK" === e.target.tagName) {
        boldFace();
        on && recolorAll();
      }
    }
    let headObserver = null, rootObserver = null, domObserver = null;
    !function() {
      if (!styleEl || !styleEl.isConnected) {
        styleEl = document.getElementById("mmdm-styles");
        if (!styleEl) {
          styleEl = document.createElement("style");
          styleEl.id = "mmdm-styles";
          styleEl.textContent = css;
          (document.head || document.documentElement).appendChild(styleEl);
        }
      }
    }();
    apply("dark" === (k => {
      try {
        return localStorage.getItem(k);
      } catch (e) {
        return null;
      }
    })(CHOICE));
    !function watchHead() {
      if (document.head) {
        headObserver = new MutationObserver(() => {
          boldFace();
          recolorAll();
        });
        headObserver.observe(document.head, {
          childList: !0,
          subtree: !0,
          characterData: !0
        });
        boldFace();
        recolorAll();
      } else {
        rootObserver = new MutationObserver(() => {
          if (document.head) {
            rootObserver.disconnect();
            rootObserver = null;
            watchHead();
          }
        });
        rootObserver.observe(document.documentElement, {
          childList: !0
        });
      }
    }();
    document.addEventListener("load", onLoad, !0);
    domObserver = new MutationObserver(() => {
      opt && opt.isConnected || place();
    });
    domObserver.observe(document.documentElement, {
      childList: !0,
      subtree: !0
    });
    place();
    state.isOn = () => on;
    state.redraw = paint;
    state.stats = () => ({
      on: on,
      decls: stats.decls,
      ms: +stats.ms.toFixed(1),
      undo: undo.length
    });
    state.adopt = (sheet, layer) => {
      if (sheet) {
        adopted.set(sheet, !!layer);
        on && recolorSheet(sheet, !!layer);
      }
    };
    state._retire = () => {
      restore();
      on = !1;
      document.documentElement.classList.remove("mm-dark");
      [ headObserver, rootObserver, domObserver ].forEach(o => {
        try {
          o && o.disconnect();
        } catch (e) {}
      });
      document.removeEventListener("load", onLoad, !0);
      try {
        opt && opt.remove();
      } catch (e) {}
      try {
        styleEl && styleEl.remove();
      } catch (e) {}
      try {
        boldEl && boldEl.remove();
      } catch (e) {}
    };
  })();
  (() => {
    "use strict";
    const VERSION = "1.18.23";
    const vnum = s => String(s || "0").split(".").reduce((a, n) => 1e3 * a + (parseInt(n, 10) || 0), 0);
    if (window.mmSearchUnlock && vnum(window.mmSearchUnlock.version) >= vnum(VERSION)) return;
    const T = (s, p) => window.__mmI18n ? window.__mmI18n.t(s, p) : p ? String(s).replace(/\{(\w+)\}/g, (m, k) => null != p[k] ? String(p[k]) : m) : String(s);
    const FLAGS = [ "enableOriginDestinationModification", "showModifyExpansionButton", "showModifyCancelButton" ];
    const PATTERNS = FLAGS.map(name => ({
      name: name,
      re: new RegExp('"' + name + '"\\s*:\\s*false', "g"),
      fix: '"' + name + '":true'
    }));
    const CONFIG_URL_RE = /global\.config\.post\.json|configuration/i;
    const CONFIG_KEY = "configuration";
    const BOUNDS_RE = /air-bounds/i;
    const stats = {
      version: VERSION,
      responses: 0,
      writes: 0,
      reads: 0,
      lastUrl: null
    };
    function flipFlags(text) {
      if ("string" != typeof text || text.length < 20) return null;
      if (-1 === text.indexOf("ModifySearch") && -1 === text.indexOf("showModifyExpansionButton")) return null;
      let changed = !1;
      for (const p of PATTERNS) {
        p.re.lastIndex = 0;
        if (p.re.test(text)) {
          text = text.replace(p.re, p.fix);
          changed = !0;
        }
      }
      return changed ? text : null;
    }
    const HIDDEN_CODES = [ "38809" ];
    const HIDE_LIST_RE = /"dapiCodesToHide"\s*:\s*\[([^\]]*)\]/g;
    function hideCodes(text) {
      if ("string" != typeof text || -1 === text.indexOf("dapiCodesToHide")) return null;
      let changed = !1;
      const out = text.replace(HIDE_LIST_RE, (all, items) => {
        const add = HIDDEN_CODES.filter(c => -1 === items.indexOf('"' + c + '"')).map(c => '{"code":"' + c + '","flowType":"all"}');
        if (!add.length) return all;
        changed = !0;
        return all.slice(0, -1) + (items.trim() ? "," : "") + add.join(",") + "]";
      });
      return changed ? out : null;
    }
    const HEADER_OPTIONS_RE = /"headerOptionsDisplay"\s*:\s*\[\s*"Profile"\s*\]/g;
    const LANGUAGE_MENU = '{"name":"HeaderLanguageSelectorPresConfig","library":"@refx/shared-components",' + '"config":{"useDialogToSelectLanguage":false}}';
    function showLanguageOption(text) {
      if ("string" != typeof text || -1 === text.indexOf("headerOptionsDisplay")) return null;
      let out = text.replace(HEADER_OPTIONS_RE, '"headerOptionsDisplay":["Language","Profile"]');
      /^\s*\[/.test(out) && -1 === out.indexOf('"HeaderLanguageSelectorPresConfig"') && (out = out.replace(/\]\s*$/, "," + LANGUAGE_MENU + "]"));
      return out !== text ? out : null;
    }
    window.__mmsuHooks = {
      isConfigUrl: u => CONFIG_URL_RE.test(String(u || "")),
      isBoundsUrl: u => BOUNDS_RE.test(String(u || "")),
      flip: function(text) {
        let out = null;
        for (const rewrite of [ flipFlags, hideCodes, showLanguageOption ]) out = rewrite(out || text) || out;
        return out;
      },
      align: function(bodyText) {
        if (!window.__mmsuTouched) return null;
        let body;
        try {
          body = JSON.parse(bodyText);
        } catch (e) {
          return null;
        }
        const legs = body?.itineraries;
        if (!legs?.length) return null;
        const shown = shownRoute();
        const date = shownDate();
        const cabin = shownCabin();
        let changed = !1;
        if (shown && (legs[0].originLocationCode !== shown.from || legs[0].destinationLocationCode !== shown.to)) {
          setRoute(legs, shown);
          changed = !0;
        }
        if (date && String(legs[0].departureDateTime || "").slice(0, 10) !== date) {
          legs[0].departureDateTime = date + "T00:00:00.000";
          changed = !0;
        }
        const rdate = isReturnPair(legs) ? shownReturnDate() : null;
        if (rdate && String(legs[1].departureDateTime || "").slice(0, 10) !== rdate) {
          legs[1].departureDateTime = rdate + "T00:00:00.000";
          changed = !0;
        }
        let cabinChanged = !1;
        if (cabin && body.cabin && body.cabin !== cabin) {
          body.cabin = cabin;
          const cff = cffFor(cabin);
          cff && body.commercialFareFamilies && (body.commercialFareFamilies = [ cff ]);
          cabinChanged = !0;
          changed = !0;
        }
        if (!changed) return null;
        const st = searchState();
        if (st) try {
          const {o: o, e: e} = st;
          const stored = e?.itineraries || [];
          shown && stored[0] && setRoute(stored, shown);
          date && stored[0] && (stored[0].departureDateTime = date + "T00:00:00.000");
          rdate && stored[1] && isReturnPair(stored) && (stored[1].departureDateTime = rdate + "T00:00:00.000");
          if (cabin && cabinChanged) {
            e.cabin = cabin;
            const cff = cffFor(cabin);
            cff && (e.commercialFareFamilies = [ cff ]);
          }
          sessionStorage.setItem(SEARCH_KEY, JSON.stringify(o));
        } catch (e) {}
        stats.aligned = (stats.aligned || 0) + 1;
        return JSON.stringify(body);
      },
      codes: function() {
        const codes = [];
        storedLegs().forEach(l => {
          [ l.originLocationCode, l.destinationLocationCode ].forEach(c => {
            const up = String(c || "").toUpperCase();
            /^[A-Z]{3}$/.test(up) && codes.indexOf(up) < 0 && codes.push(up);
          });
        });
        return codes;
      },
      mute: function(fields) {
        const boxes = fields.map(el => el && el.closest("mat-form-field")).filter(Boolean);
        if (!boxes.length) return () => {};
        const strip = () => boxes.forEach(box => {
          for (const [cls, sel] of INVALID_CLASSES) {
            const target = sel ? box.querySelector(sel) : box;
            target && target.classList.contains(cls) && target.classList.remove(cls);
          }
        });
        const form = document.querySelector(FORM);
        form && form.classList.add("mmsu-swapping");
        let obs = null;
        try {
          obs = new MutationObserver(strip);
          boxes.forEach(box => obs.observe(box, {
            attributes: !0,
            attributeFilter: [ "class" ],
            subtree: !0
          }));
        } catch (e) {}
        strip();
        return () => {
          try {
            obs && obs.disconnect();
          } catch (e) {}
          form && form.classList.remove("mmsu-swapping");
        };
      },
      pick: (input, code) => async function(input, code) {
        const f = searchForm();
        const field = f && function(form, input) {
          const id = input && input.id || "";
          if ("origin" === id) return {
            control: form.controls.originLocationCode,
            destination: !1
          };
          if ("destination" === id) return {
            control: form.controls.destinationLocationCode,
            destination: !0
          };
          const m = /^(.*)multicity-(origin|destination)$/.exec(id);
          const legs = form.controls.multiCityItinerary?.controls;
          if (!m || !legs) return null;
          const kind = m[2];
          const leg = legs[/^\d+$/.test(m[1]) ? +m[1] : [ ...document.querySelectorAll('input[id$="multicity-' + kind + '"]') ].indexOf(input)];
          const control = leg && leg.controls["origin" === kind ? "multiCityOrigin" : "multiCityDestination"];
          return control ? {
            control: control,
            destination: "destination" === kind
          } : null;
        }(f.comp.modifySearchForm, input);
        const place = field && (f.comp.defaultAirportList || []).find(o => o && o.code === code);
        if (!place) return !1;
        picking = input;
        try {
          const stable = new Promise(resolve => {
            const s = f.zone.onStable.subscribe(() => {
              s.unsubscribe();
              resolve();
            });
          });
          f.zone.run(() => {
            field.control.setValue(place);
            field.control.markAsDirty();
          });
          await stable;
          f.zone.run(() => {
            field.control.updateValueAndValidity();
            f.comp.onBlur(null, code, field.destination);
          });
          window.__mmsuTouched = !0;
          return field.control.valid;
        } finally {
          picking = null;
        }
      }(input, code),
      picking: () => picking,
      form: () => searchForm(),
      takeover: function() {
        if (picking) return !1;
        if (!function() {
          const form = document.querySelector(FORM);
          if (!form || !form.classList.contains("ng-invalid")) return !1;
          const bad = [ ...form.querySelectorAll("input.ng-invalid, mat-select.ng-invalid") ];
          if (!bad.length) return !1;
          const from = originField(), to = destField();
          return bad.every(el => el === from || el === to);
        }()) return !1;
        const search = function() {
          const from = originField(), to = destField();
          if (!(from && to && looksPicked(from.value) && looksPicked(to.value))) return null;
          const route = shownRoute();
          if (!route) return null;
          const kind = function() {
            const r = document.querySelector(FORM + ' input[name="trip-type"]:checked');
            return r ? String(r.value) : "";
          }();
          if ("openjaws" === kind) return null;
          const entity = searchState()?.e;
          const legs = entity?.itineraries || [];
          const iso = /^\d{4}-\d{2}-\d{2}$/;
          const date = shownDate() || String((legs[0] || {}).departureDateTime || "").slice(0, 10);
          if (!iso.test(date)) return null;
          const itineraries = [ {
            departureDateTime: date + "T00:00:00.000",
            originLocationCode: route.from,
            destinationLocationCode: route.to
          } ];
          if ("roundtrip" === kind) {
            const back = shownReturnDate() || (isReturnPair(legs) ? String(legs[1].departureDateTime || "").slice(0, 10) : "");
            if (!iso.test(back)) return null;
            itineraries.push({
              departureDateTime: back + "T00:00:00.000",
              originLocationCode: route.to,
              destinationLocationCode: route.from
            });
          }
          const cabin = shownCabin() || "ECONOMY";
          const cff = cffFor(cabin);
          return {
            cabin: cabin,
            itineraries: itineraries,
            travelers: entity?.travelers || [ {
              passengerTypeCode: "ADT"
            } ],
            commercialFareFamilies: cff ? [ cff ] : void 0
          };
        }();
        if (!search) return !1;
        stats.takeovers = (stats.takeovers || 0) + 1;
        !function(search) {
          const form = document.createElement("form");
          form.method = "POST";
          form.action = function() {
            let lang = null, country = null;
            try {
              const t = JSON.parse(sessionStorage.getItem("analytics") || "null")?.touchpointInfo;
              t && "string" == typeof t.market && /^[a-z]{2}$/i.test(t.market) && (country = t.market.toLowerCase());
              t && "string" == typeof t.language && /^[a-z]{2}$/i.test(t.language) && (lang = t.language.toLowerCase());
            } catch (e) {}
            const doc = String(document.documentElement.lang || "");
            const full = /^[a-z]{2}-[A-Z]{2}$/.test(doc) ? doc : lang && country ? lang + "-" + country.toUpperCase() : "de-DE";
            return "https://shop.miles-and-more.com/reward/reward/availability" + "?lang=" + encodeURIComponent(full) + "&portalCountry=" + encodeURIComponent(country || full.slice(3).toLowerCase());
          }();
          form.style.display = "none";
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = "search";
          input.value = JSON.stringify(search);
          form.appendChild(input);
          !function(form) {
            let value = null;
            try {
              value = window.__mmSponsor && window.__mmSponsor.postField();
            } catch (e) {
              return;
            }
            if (!value) return;
            const el = document.createElement("input");
            el.type = "hidden";
            el.name = "portalFacts";
            el.value = value;
            form.appendChild(el);
          }(form);
          document.body.appendChild(form);
          form.submit();
        }(search);
        return !0;
      },
      redraw: () => {
        recapKey = null;
        try {
          showCabinInRecap(null);
        } catch (e) {}
        try {
          !function() {
            const legs = formControl("multiCityItinerary")?.controls || [];
            [ formControl("departureDate"), formControl("returnDate") ].concat(legs.map(g => g.controls && g.controls.multiCityDepartureTime)).forEach(c => {
              c && c.value && c.setValue(c.value);
            });
          }();
        } catch (e) {}
        try {
          dressLanguageMenu();
        } catch (e) {}
      },
      note: (kind, url) => {
        if ("reads" !== kind && "writes" !== kind) {
          stats.responses++;
          stats.lastUrl = url;
        } else stats[kind]++;
      }
    };
    const alreadyHooked = !!window.__mmsuHooked;
    window.__mmsuHooked = !0;
    function patchStorage(storage) {
      const setItem = storage.setItem.bind(storage);
      const getItem = storage.getItem.bind(storage);
      storage.setItem = function(key, value) {
        if (key === CONFIG_KEY) try {
          const h = window.__mmsuHooks;
          const patched = h.flip(value);
          if (patched) {
            value = patched;
            h.note("writes");
          }
        } catch (e) {}
        return setItem(key, value);
      };
      let seenIn = null, seenOut = null;
      storage.getItem = function(key) {
        const value = getItem(key);
        if (key !== CONFIG_KEY) return value;
        if (null !== value && value === seenIn) return seenOut;
        let out = value;
        try {
          const h = window.__mmsuHooks;
          const patched = h.flip(value);
          if (patched) {
            h.note("reads");
            setItem(key, patched);
            out = patched;
          }
        } catch (e) {}
        seenIn = value;
        seenOut = out;
        return out;
      };
    }
    if (!alreadyHooked) {
      try {
        patchStorage(sessionStorage);
      } catch (e) {}
      try {
        patchStorage(localStorage);
      } catch (e) {}
    }
    try {
      sessionStorage.getItem(CONFIG_KEY);
    } catch (e) {}
    if (!alreadyHooked) {
      const markTouched = e => {
        try {
          const t = e.target;
          t && t.closest && t.closest("form.modify-search-form") && (window.__mmsuTouched = !0);
        } catch (err) {}
      };
      try {
        document.addEventListener("input", markTouched, !0);
        document.addEventListener("change", markTouched, !0);
      } catch (e) {}
      const takeover = (e, matches) => {
        try {
          if (!matches(e.target)) return;
          const h = window.__mmsuHooks;
          if (h && h.takeover && h.takeover()) {
            e.preventDefault();
            e.stopImmediatePropagation();
          }
        } catch (err) {}
      };
      try {
        document.addEventListener("click", e => takeover(e, t => !!(t && t.closest && t.closest("#modify-button"))), !0);
        document.addEventListener("submit", e => takeover(e, t => !!(t && t.matches && t.matches("form.modify-search-form"))), !0);
      } catch (e) {}
    }
    if (!alreadyHooked) {
      const hooks = () => window.__mmsuHooks;
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        try {
          const h = hooks();
          const init = args[1];
          if (h.isBoundsUrl("string" == typeof args[0] ? args[0] : args[0] && args[0].url || "") && init && "string" == typeof init.body) {
            const fixed = h.align(init.body);
            fixed && (args[1] = Object.assign({}, init, {
              body: fixed
            }));
          }
        } catch (e) {}
        const response = await originalFetch.apply(this, args);
        try {
          const h = hooks();
          const url = "string" == typeof args[0] ? args[0] : args[0] && args[0].url || "";
          if (!h.isConfigUrl(url)) return response;
          const text = await response.clone().text();
          const patched = h.flip(text);
          if (!patched) return response;
          h.note("fetch", url);
          return new Response(patched, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        } catch (e) {
          return response;
        }
      };
      const xhrOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        let watch = !1;
        try {
          watch = hooks().isConfigUrl(url);
        } catch (e) {}
        watch && this.addEventListener("readystatechange", function() {
          if (4 === this.readyState) try {
            const h = hooks();
            const patched = h.flip(this.responseText);
            if (!patched) return;
            Object.defineProperty(this, "responseText", {
              get: () => patched,
              configurable: !0
            });
            Object.defineProperty(this, "response", {
              get: () => patched,
              configurable: !0
            });
            h.note("xhr", url);
          } catch (e) {}
        });
        this.__mmsuUrl = String(url);
        return xhrOpen.call(this, method, url, ...rest);
      };
      const xhrSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.send = function(body) {
        try {
          const h = hooks();
          if (h.isBoundsUrl(this.__mmsuUrl || "") && "string" == typeof body) {
            const fixed = h.align(body);
            fixed && (body = fixed);
          }
        } catch (e) {}
        return xhrSend.call(this, body);
      };
    }
    const COLLAPSE_CSS = "refx-modify-search-cont mat-expansion-panel { overflow: hidden !important; }" + "refx-modify-search-cont mat-expansion-panel.collapsed-expansion-panel { height: auto !important; min-height: 4rem !important; }";
    const FORM = "form.modify-search-form";
    function injectStyle(id, css) {
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement("style");
        el.id = id;
        document.head.appendChild(el);
      }
      el.textContent = css;
    }
    function injectStyles() {
      if (document.head) {
        injectStyle("mmsu-collapse-fix", COLLAPSE_CSS);
        restyle();
      }
    }
    let styleCss = null;
    function restyle() {
      if (!document.head) return;
      const css = `
#modify-button .modify-search-button-label { display: none; }
#modify-button .mdc-button__label::after { content: '${T("Suchen")}'; }

.upsell-link-out.no-availability {
    background: #fff !important; border: 1px solid #e1e0d9; border-left: 4px solid #05164D;
    border-radius: 8px; padding: 16px 18px !important; }
.upsell-link-out.no-availability .title-label { color: #05164D; }
.upsell-link-out.no-availability .footer { display: none; }
.upsell-link-out.no-availability .message { display: none; }
.upsell-link-out.no-availability .content::before {
    content: '${T("Ändern Sie oben Datum, Flughäfen oder Kabine.")}';
    color: #52514e; }

.header-option refx-header-language-selector-pres { color: #05164D; margin-right: 1.6rem; }
.header-option refx-header-language-selector-pres .menu-title-underline,
.header-option refx-header-language-selector-pres .menu-chevron { display: none; }
.header-option refx-header-language-selector-pres .mmsu-globe { font-size: 2.4rem; line-height: 1; }
.header-option refx-header-language-selector-pres .menu-trigger::after {
    content: attr(data-mm-code); margin-left: .6rem; font-size: 1.4rem; font-weight: 600; letter-spacing: .04em; }
.cdk-overlay-pane .mat-mdc-menu-panel.mmsu-langmenu > .mat-mdc-menu-content { padding: 4px 0; }
.cdk-overlay-pane .mat-mdc-menu-panel.mmsu-langmenu > .mat-mdc-menu-content > .mat-mdc-menu-item {
    min-height: 32px; padding: 0 14px; font-size: 1.4rem; line-height: 2rem; }
.cdk-overlay-pane .mat-mdc-menu-panel.mmsu-langmenu > .mat-mdc-menu-content > .mat-mdc-menu-item > .mat-mdc-menu-item-text {
    padding: 6px 0; }

refx-upsell-premium-pres refx-no-flights-found-pres { display: none; }

${FORM} > .modify-search-inputs > .origin-location-field,
${FORM} > .modify-search-inputs > .destination-location-field { position: relative; }
.mmsu-swap {
    position: absolute; z-index: 3; width: 26px; height: 26px; padding: 0;
    display: flex; align-items: center; justify-content: center;
    border: 1px solid #e1e0d9; border-radius: 50%; background: #fff;
    color: #05164D; cursor: pointer; font: inherit; line-height: 1;
    box-shadow: 0 1px 2px rgba(0,0,0,.06); }
${FORM}.mmsu-swapping .mat-mdc-form-field-error-wrapper { display: none !important; }
.cdk-overlay-pane .mat-select-panel-animations-enabled,
.cdk-overlay-pane .mat-select-panel-animations-enabled.mat-select-panel-exit { animation-fill-mode: forwards; }

.mmsu-swap:hover { background: #f3f6fc; border-color: #b9c6e0; }
.mmsu-swap:active { transform: translateY(1px) scale(.94); }
.mmsu-swap:disabled { opacity: .4; cursor: default; }
.mmsu-swap svg { width: 14px; height: 14px; display: block; }

@media (min-width: 900px) {
refx-modify-search-cont mat-expansion-panel.mat-expanded:not(.mmsu-trip-below) .mat-expansion-panel-content-wrapper {
    margin-top: -38px; }
${FORM} { display: grid; grid-template-columns: repeat(3, 1fr); column-gap: 14px; align-items: start; }
${FORM} > mat-radio-group.trip-type-radio { grid-column: 1 / -1; }
${FORM} > .modify-search-inputs { display: contents; }
${FORM} .multicity-section { grid-column: 1 / -1; }
${FORM} > .modify-search-inputs > .modify-search-input,
${FORM} > .modify-search-inputs > .modify-search-passenger-input {
    width: auto; max-width: none; flex: 1 1 auto; margin: 0; }
${FORM} > .discounts-and-submit-button { grid-column: 3; align-self: center; padding: 0; margin: 0; }
${FORM} .modify-search-button { margin: 0 0 0 auto !important; }
${FORM} .modify-search-button #modify-button { margin-bottom: 0 !important; }
.mmsu-swap { left: -20px; top: 26px; }
}

@media (max-width: 899px) {
.mmsu-swap { left: auto; right: 14px; top: -13px; }
.mmsu-swap svg { transform: rotate(90deg); }
}
`;
      if (css !== styleCss) {
        styleCss = css;
        injectStyle("mmsu-compact-layout", css);
      }
    }
    "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", injectStyles) : injectStyles();
    const IATA_RE = /\(([A-Z]{3})\)/;
    const originField = () => document.querySelector("#origin, input.origin-input, .origin-input input");
    const destField = () => document.querySelector("#destination, input.destination-input, .destination-input input");
    const codeIn = text => IATA_RE.exec(text || "")?.[1] ?? null;
    const looksPicked = v => IATA_RE.test(v) && v.replace(IATA_RE, "").trim().length > 0;
    const INVALID_CLASSES = [ [ "mat-form-field-invalid", null ], [ "mdc-text-field--invalid", ".mdc-text-field" ] ];
    let picking = null;
    function searchForm() {
      try {
        for (const t of window.getAllAngularTestabilities()) {
          let app = null;
          t?._destroyRef?.records?.forEach(r => {
            const v = r?.value;
            !app && v && "function" == typeof v.tick && Array.isArray(v.components) && (app = v);
          });
          if (!app) continue;
          const seen = new Set;
          const stack = app.components.map(c => c.hostView && c.hostView._lView);
          for (;stack.length; ) {
            const view = stack.pop();
            if (Array.isArray(view) && !seen.has(view)) {
              seen.add(view);
              for (const x of view) if (Array.isArray(x)) stack.push(x); else if (x?.modifySearchForm?.controls?.originLocationCode) return {
                comp: x,
                zone: t._ngZone
              };
            }
          }
        }
      } catch (e) {}
      return null;
    }
    function swapFields() {
      const f = searchForm();
      if (!f) return !1;
      const form = f.comp.modifySearchForm;
      const a = form.controls.originLocationCode.value, z = form.controls.destinationLocationCode.value;
      if (!(a && z && a.code && z.code && a.code !== z.code)) return !1;
      f.zone.run(() => {
        form.patchValue({
          originLocationCode: z,
          destinationLocationCode: a
        });
        f.comp.onBlur(null, z.code, !1);
      });
      window.__mmsuTouched = !0;
      return !0;
    }
    let lastRoute = null;
    function shownRoute() {
      if (picking) return lastRoute;
      const from = codeIn(originField()?.value);
      const to = codeIn(destField()?.value);
      from && to && from !== to && (lastRoute = {
        from: from,
        to: to
      });
      return lastRoute;
    }
    function formControl(name) {
      const f = searchForm();
      return f && f.comp.modifySearchForm && f.comp.modifySearchForm.controls[name] || null;
    }
    function controlDay(name) {
      const c = formControl(name);
      const d = c && !c.pristine && c.value instanceof Date && !isNaN(c.value) ? c.value : null;
      return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : null;
    }
    const shownDate = () => controlDay("departureDate");
    const shownReturnDate = () => controlDay("returnDate");
    const CFF_FALLBACK = {
      ECONOMY: "CFFECODYN",
      PREMIUMECO: "CFFPECODYN",
      BUSINESS: "CFFBUSDYN",
      FIRST: "CFFFIRSDYN"
    };
    function cffFor(apiCabin) {
      try {
        const v = window.__mmCalUI?.cffFor?.(apiCabin);
        if (v) return v;
      } catch (e) {}
      return CFF_FALLBACK[apiCabin] || null;
    }
    const SEARCH_KEY = "airBoundsSearch";
    function searchState() {
      try {
        const o = JSON.parse(sessionStorage.getItem(SEARCH_KEY));
        return {
          o: o,
          e: o.entities[o.selectedAirBoundsSearchId]
        };
      } catch (e) {
        return null;
      }
    }
    function shownCabin() {
      const c = formControl("cabin");
      if (c && "string" == typeof c.value && c.value) return c.value;
      const st = searchState();
      return st && cabinOfState(st.e) || null;
    }
    function isReturnPair(legs) {
      return !!(legs && 2 === legs.length && legs[0] && legs[1]) && legs[1].originLocationCode === legs[0].destinationLocationCode && legs[1].destinationLocationCode === legs[0].originLocationCode;
    }
    function setRoute(legs, route) {
      const mirror = isReturnPair(legs);
      legs[0].originLocationCode = route.from;
      legs[0].destinationLocationCode = route.to;
      if (mirror) {
        legs[1].originLocationCode = route.to;
        legs[1].destinationLocationCode = route.from;
      }
    }
    const CABIN_LABEL = {
      ECONOMY: "Economy",
      PREMIUMECO: "Premium Economy",
      BUSINESS: "Business",
      FIRST: "First"
    };
    const CFF_CABIN = [ [ "CFFPECO", "PREMIUMECO" ], [ "CFFECO", "ECONOMY" ], [ "CFFBUS", "BUSINESS" ], [ "CFFFIRS?", "FIRST" ] ].map(([prefix, cabin]) => [ new RegExp("^" + prefix, "i"), cabin ]);
    let cffCache = {
      raw: null,
      map: null
    };
    function cabinOfState(e) {
      const map = function() {
        let raw = null;
        try {
          raw = sessionStorage.getItem(CONFIG_KEY);
        } catch (e) {
          return null;
        }
        if (raw === cffCache.raw) return cffCache.map;
        let map = null;
        try {
          map = function walk(o, d) {
            if (!o || d > 6 || "object" != typeof o) return null;
            if (Array.isArray(o.cabintoCFFForReward)) return o.cabintoCFFForReward;
            for (const k of Object.keys(o)) {
              const r = walk(o[k], d + 1);
              if (r) return r;
            }
            return null;
          }(JSON.parse(raw || "{}"), 0);
        } catch (e) {
          map = null;
        }
        cffCache = {
          raw: raw,
          map: map
        };
        return map;
      }();
      for (const code of e?.commercialFareFamilies || []) {
        if (map) {
          const hit = map.find(x => x.cff === code);
          if (hit && hit.cabin) return hit.cabin;
        }
        const guess = CFF_CABIN.find(([re]) => re.test(code));
        if (guess) return guess[1];
      }
      return e?.cabin || null;
    }
    function finder(sel) {
      let ref = null;
      return records => {
        if (ref && ref.isConnected) return ref;
        ref = null;
        if (!records) return ref = document.querySelector(sel);
        for (const r of records) for (const n of r.addedNodes) {
          if (1 !== n.nodeType) continue;
          const hit = n.matches(sel) ? n : n.querySelector(sel);
          if (hit && hit.isConnected) return ref = hit;
        }
        return null;
      };
    }
    const travelersBlock = finder("refx-flight-recap-travelers:not(.mmsu-cabin)");
    let recapKey = null;
    function showCabinInRecap(records) {
      const src = travelersBlock(records);
      if (!src || !src.parentElement) return;
      let raw = null;
      try {
        raw = sessionStorage.getItem(SEARCH_KEY);
      } catch (e) {}
      let el = src.parentElement.querySelector(":scope > .mmsu-cabin");
      if (el && raw === recapKey) return;
      const name = function() {
        const st = searchState();
        return st && CABIN_LABEL[cabinOfState(st.e)] || null;
      }();
      if (!name) return;
      if (!el) {
        el = document.createElement("refx-flight-recap-travelers");
        el.className = "travelers sub-component mmsu-cabin";
        el.innerHTML = '<span class="cdk-visually-hidden flight-recap-travelers-sr"></span>' + '<div class="flight-recap-travelers">' + '<div aria-hidden="true" class="refx-display-5 flight-recap-travelers-passengers"></div>' + '<div aria-hidden="true" class="refx-body-1 flight-recap-travelers-number-of-travelers">' + '<span class="flight-recap-travelers-number"></span></div></div>';
        src.parentElement.insertBefore(el, src.nextSibling);
      }
      const label = T("Kabine");
      el.querySelector(".flight-recap-travelers-passengers").textContent = label;
      el.querySelector(".flight-recap-travelers-number").textContent = name;
      el.querySelector(".flight-recap-travelers-sr").textContent = label + " " + name;
      recapKey = raw;
    }
    let legsMemo = {
      raw: void 0,
      legs: []
    };
    function storedLegs() {
      let raw = null;
      try {
        raw = sessionStorage.getItem(SEARCH_KEY);
      } catch (e) {
        return [];
      }
      if (raw !== legsMemo.raw) {
        let legs = [];
        try {
          const o = JSON.parse(raw);
          legs = o.entities[o.selectedAirBoundsSearchId].itineraries || [];
        } catch (e) {}
        legsMemo = {
          raw: raw,
          legs: legs
        };
      }
      return legsMemo.legs;
    }
    function labelSwap(b) {
      const title = T("Gegenrichtung suchen"), aria = T("Abflug und Ziel tauschen");
      b.title !== title && (b.title = title);
      b.getAttribute("aria-label") !== aria && b.setAttribute("aria-label", aria);
    }
    const swapAnchor = finder(FORM + " > .modify-search-inputs > .destination-location-field");
    function placeSwapButton(records) {
      const dest = swapAnchor(records);
      if (!dest) return;
      const existing = dest.querySelector(".mmsu-swap");
      if (window.__mmSettings && !1 === window.__mmSettings.get("swap") || !function() {
        const legs = storedLegs();
        return 1 === legs.length || isReturnPair(legs);
      }()) existing && existing.remove(); else {
        if (existing) {
          if (vnum(existing.dataset.mmsuVersion) >= vnum(VERSION)) return;
          existing.remove();
        }
        dest.appendChild(function() {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "mmsu-swap";
          b.dataset.mmsuVersion = VERSION;
          labelSwap(b);
          b.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" ' + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + '<path d="M2 5h10M9.5 2.5 12 5 9.5 7.5"/><path d="M14 11H4M6.5 8.5 4 11l2.5 2.5"/></svg>';
          b.addEventListener("mousedown", e => e.preventDefault());
          b.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            try {
              swapFields();
            } catch (err) {}
          });
          return b;
        }());
      }
    }
    stats.swapFields = () => swapFields();
    function dressLanguageMenu() {
      const btn = document.querySelector(".header-option refx-header-language-selector-pres .menu-trigger");
      if (!btn) return;
      if (!btn.querySelector(":scope > .mmsu-globe")) {
        const globe = document.createElement("i");
        globe.className = "refx-icon-language mmsu-globe";
        globe.setAttribute("aria-hidden", "true");
        btn.prepend(globe);
      }
      const lang = String(document.documentElement.lang || "").split("-")[0];
      const code = "uk" === lang ? "UA" : lang.toUpperCase();
      btn.dataset.mmCode !== code && (btn.dataset.mmCode = code);
      const list = document.querySelector(".cdk-overlay-container .mat-mdc-menu-panel:not(.mmsu-langmenu)");
      list && list.querySelector(".mat-mdc-menu-item-text > span[lang]") && list.classList.add("mmsu-langmenu");
    }
    let tripKey = null;
    function onDomChange(records) {
      restyle();
      try {
        !function() {
          const panel = document.querySelector("refx-modify-search-cont mat-expansion-panel");
          const header = panel && panel.querySelector("mat-expansion-panel-header");
          const group = panel && panel.querySelector(FORM + " > mat-radio-group.trip-type-radio");
          const last = group && group.querySelector("mat-radio-button:last-of-type");
          if (!header || !last) return;
          const key = group.textContent + "|" + window.innerWidth;
          if (key === tripKey && panel.__mmsuTrip === last) return;
          const r = last.getBoundingClientRect();
          if (r.width) {
            tripKey = key;
            panel.__mmsuTrip = last;
            panel.classList.toggle("mmsu-trip-below", r.right > header.getBoundingClientRect().left - 8);
          }
        }();
      } catch (e) {}
      try {
        dressLanguageMenu();
      } catch (e) {}
      document.querySelectorAll(".mmsu-swap").forEach(labelSwap);
      !function() {
        try {
          const S = window.__mmSettings;
          if (!S || !S.onChange || stats._settingsRef === S) return;
          try {
            stats._offSettings && stats._offSettings();
          } catch (e) {}
          stats._offSettings = S.onChange(k => {
            if ("swap" === k) try {
              placeSwapButton();
            } catch (e) {}
          });
          stats._settingsRef = S;
          window.__mmsuSwapOffSettings = stats._offSettings;
        } catch (e) {}
      }();
      try {
        placeSwapButton(records);
      } catch (e) {}
      try {
        showCabinInRecap(records);
      } catch (e) {}
    }
    function watchForPanel() {
      try {
        window.__mmsuSwapObserver && window.__mmsuSwapObserver.disconnect();
      } catch (e) {}
      try {
        if (window.__mmsuSwapOffSettings) {
          window.__mmsuSwapOffSettings();
          window.__mmsuSwapOffSettings = null;
        }
      } catch (e) {}
      document.querySelectorAll(".mmsu-swap").forEach(e => e.remove());
      const obs = new MutationObserver(onDomChange);
      obs.observe(document.body, {
        childList: !0,
        subtree: !0
      });
      try {
        window.__mmsuSwapObserver = obs;
      } catch (e) {}
      onDomChange();
    }
    "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", watchForPanel) : watchForPanel();
    !function(name, value) {
      try {
        Object.defineProperty(window, name, {
          value: value,
          enumerable: !1,
          configurable: !0
        });
      } catch (e) {
        try {
          window[name] = value;
        } catch (e2) {}
      }
    }("mmSearchUnlock", {
      version: VERSION,
      status: () => ({
        ...stats,
        config: (() => {
          try {
            const entry = (JSON.parse(sessionStorage.getItem(CONFIG_KEY) || "{}").entities || {})["@refx/booking-components#ModifySearchContConfig"];
            if (!entry) return "ModifySearchContConfig not loaded yet";
            const out = {};
            FLAGS.forEach(f => out[f] = entry[f]);
            out.modifySearchCalendarRangeDays = entry.modifySearchCalendarRangeDays;
            return out;
          } catch (e) {
            return "unreadable: " + e.message;
          }
        })(),
        formPresent: !!document.querySelector(FORM),
        headerPresent: !!document.querySelector("aside.modify-search-wrapper mat-expansion-panel-header")
      })
    });
  })();
  (() => {
    "use strict";
    const VERSION = 109;
    if (window.__mmSettings && window.__mmSettings.version >= VERSION) return;
    const T = (s, p) => window.__mmI18n ? window.__mmI18n.t(s, p) : p ? String(s).replace(/\{(\w+)\}/g, (m, k) => null != p[k] ? String(p[k]) : m) : String(s);
    const dtf = o => window.__mmI18n ? window.__mmI18n.dtf(o) : new Intl.DateTimeFormat("de-DE", o);
    const inherited = window.__mmSettings;
    if (inherited) {
      inherited.superseded = !0;
      try {
        inherited._observer && inherited._observer.disconnect();
      } catch (e) {}
    }
    document.querySelectorAll(".mmset-fab, .mmset-panel, .mmset-tip").forEach(e => e.remove());
    const KEY = "mm_features";
    const MARK = '<svg class="mmset-mark" viewBox="0 0 200 200" aria-hidden="true">' + '<g transform="rotate(-35 100 100)"><rect x="12" y="62" width="176" height="76" rx="38" fill="#F2B705"/>' + '<rect x="70" y="62" width="60" height="76" fill="#05164D"/><g fill="#000" opacity=".22">' + '<circle cx="36" cy="88" r="4"/><circle cx="36" cy="112" r="4"/><circle cx="164" cy="88" r="4"/>' + '<circle cx="164" cy="112" r="4"/></g></g><g transform="translate(100 100) rotate(10) scale(2.2) translate(-12 -12)">' + '<path fill="#fff" d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22' + 'l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></g></svg>';
    const OFFICES = [ [ "DE", "FRALH08MP" ], [ "AT", "VIELH08MP" ], [ "CH", "ZRHLH08MP" ], [ "NL", "AMSLH08MP" ], [ "BE", "BRULH08MP" ], [ "LU", "LUXLH08MP" ], [ "FR", "PARLH08MP" ], [ "IT", "MILLH08MP" ], [ "ES", "MADLH08MP" ], [ "PT", "LISLH08MP" ], [ "IE", "DUBLH08MP" ], [ "GB", "LONLH08MP" ], [ "FI", "HELLH08MP" ], [ "SE", "STOLH08MP" ], [ "PL", "WAWLH08MP" ], [ "GR", "ATHLH08MP" ], [ "TR", "ISTLH08MP" ], [ "US", "NYCLH08MP" ], [ "CA", "YTOLH08MP" ], [ "MX", "MEXLH08MP" ], [ "BR", "SAOLH08MP" ], [ "SG", "SINLH08MP" ], [ "JP", "TYOLH08MP" ], [ "CN", "BJSLH08MP" ], [ "HK", "HKGLH08MP" ], [ "TW", "TPELH08MP" ], [ "KR", "SELLH08MP" ], [ "TH", "BKKLH08MP" ], [ "MY", "KULLH08MP" ], [ "IN", "DELLH08MP" ], [ "AE", "DXBLH08MP" ], [ "ZA", "JNBLH08MP" ], [ "AU", "SYDLH08MP" ], [ "NZ", "AKLLH08MP" ] ];
    function countryName(iso) {
      try {
        const I = window.__mmIata;
        return I && I.countryNameOf && I.countryNameOf(iso) || new Intl.DisplayNames([ dtf().resolvedOptions().locale ], {
          type: "region"
        }).of(iso) || iso;
      } catch (e) {
        return iso;
      }
    }
    const DEFAULTS = {
      smartsearch: !0,
      iataExt: !0,
      swap: !0,
      calendar: !0,
      bbd: !0,
      datePicker: !0,
      results: !0,
      seatmap: !0,
      officeNote: !0,
      office: "auto",
      officeAutoMigrated: 0,
      keepalive: !0,
      currency: !0,
      fxTarget: "EUR",
      waiting: !0
    };
    const groups = () => [ {
      header: T("🔍 Suche"),
      subs: [ {
        key: "smartsearch",
        label: T("🔤 Besserer Suchalgorithmus"),
        reload: !0,
        tip: T('Eigene Vorschlagsliste: schnell, „Stadt, Ort (Kürzel)", ' + 'Flughäfen vor Bahnhöfen. „BER" findet Berlin statt Berbera, ' + '„Brasilien" listet alle Städte des Landes. Ländersuche greift ' + "nach Neuladen.")
      }, {
        key: "iataExt",
        label: T("🌍 Mehr Ziele"),
        reload: !0,
        tip: T("Rund 11.000 Flughäfen und Bahnhöfe der Hauptseite statt der " + "1.500 der Awardsuche. Greift nach Neuladen.")
      }, {
        key: "swap",
        label: T("⇄ Richtungstausch"),
        tip: T("Tauscht Abflug und Zielort (wie auf der Hauptseite).")
      }, {
        key: "datePicker",
        label: T("🗓 Datumswähler mit Preisen"),
        tip: T("Monatsansicht, Meilenpreise der gewählten Kabine, Hin- und " + "Rückflug als Zeitraum mit Nächten. Economy lädt fehlende " + "Monate selbst.")
      } ]
    }, {
      header: T("📅 Kalender"),
      subs: [ {
        key: "calendar",
        label: T("📅 Monatskalender"),
        tip: T("Voller Monat statt einer Woche, je nach Einstellung für alle " + "4 Kabinen.")
      }, {
        key: "bbd",
        label: T("📈 Best-by-Day-Preise"),
        tip: T("Ergänzt den Kalender um die Preise der Hauptseite (bester " + "Preis pro Tag und Kabine). Serverseitig lange gecached, oft " + "veraltet. Wirkt nur mit Monatskalender.")
      }, {
        key: "calCache",
        action: T("Leeren"),
        label: T("🗑 Kalender-Cache"),
        tip: T("Verwirft gespeicherte Kalenderpreise (60 Minuten gültig) und " + "lädt den Suchmonat neu.")
      } ]
    }, {
      header: T("🛬 Ergebnisse"),
      subs: [ {
        key: "results",
        label: T("🛬 Ergebniskarten"),
        tip: T("Eigene Ergebniskarten mit mehr Details und Sortierung; " + "Tarif wählen mit einem Klick statt über die Kabinenkästen.")
      }, {
        key: "seatmap",
        label: T("💺 Sitzplan"),
        tip: T("Sitzplan bei Hover oder Klick auf den Flugzeugtyp. Wirkt nur " + "mit Ergebniskarten.")
      } ]
    }, {
      header: T("🏢 Buchungsbüro & Währung"),
      office: !0,
      subs: [ {
        key: "officeNote",
        label: T("🏢 Buchungsbüro-Zeile"),
        tip: T("Zeile über den Ergebniskarten, wenn das Buchungsbüro nicht im Abflugland " + "liegt: Büro und Währung der Zuzahlungen. Wirkt nur mit Ergebniskarten.")
      }, {
        key: "currency",
        label: T("💱 Währungsumrechnung"),
        tip: T("Fremdwährungsbeträge zusätzlich in {target} (Kalender, Karten, " + "Sitzplan).", {
          target: window.__mmCurrency?.sign ? window.__mmCurrency.sign() : "€"
        })
      }, {
        fx: !0
      } ]
    }, {
      header: T("🧰 Sonstiges"),
      subs: [ {
        key: "keepalive",
        label: T("🔐 Angemeldet bleiben"),
        tip: T("Verhindert das Session-Ende nach 15 Minuten Inaktivität.")
      }, {
        key: "waiting",
        label: T("⚠️ Bessere Fehlerseiten"),
        tip: T("Fehlerseite und Warenkorb-Hinweise nennen die echte " + "Ursache, mit Relogin-Knopf.")
      } ]
    } ];
    const INK_primary = "#05164D", INK_secondary = "#52514e", INK_muted = "#898781", INK_hairline = "#e1e0d9", INK_accent = "#1c5cab";
    const PANEL_W = 296;
    const DONATE_URL = "https://buymeacoffee.com/wedge_mm";
    const MUG = `<svg class="mmset-don-mug" viewBox="0 0 32 32" width="20" height="20" aria-hidden="true">
        <path d="M23 13.5h2.2a3.3 3.3 0 0 1 3.3 3.3v2.9a3.3 3.3 0 0 1-3.3 3.3H23" fill="none" stroke="#B87A06" stroke-width="2.4" stroke-linecap="round"/>
        <rect x="6" y="10.5" width="17" height="18" rx="3" fill="#F6B51E" stroke="#B87A06" stroke-width="1.6"/>
        <path d="M10.5 15.5v8.5M14.5 15.5v8.5M18.5 15.5v8.5" stroke="#FFD866" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M5 12.5C4.6 9.6 6.6 7.6 9.3 8.1 9.9 5.6 12.2 4 14.8 4.5c1.7-1.4 4.6-.9 5.6 1.4 2.6-.4 4.6 1.6 4.2 4.1.6.7.6 1.8.1 2.5H5z" fill="#fff" stroke="#E6D7AE" stroke-width="1.3" stroke-linejoin="round"/></svg>`;
    const normText = v => {
      const s = String(v ?? "").trim();
      return /^auto$/i.test(s) ? "auto" : s.toUpperCase();
    };
    let prefs = (() => {
      let stored = null;
      try {
        stored = JSON.parse(localStorage.getItem(KEY) || "null");
      } catch (e) {}
      stored || (stored = (() => {
        try {
          const m = new RegExp("(?:^|;\\s*)" + KEY + "=([^;]*)").exec(document.cookie || "");
          return m ? JSON.parse(decodeURIComponent(m[1])) : null;
        } catch (e) {
          return null;
        }
      })());
      if (stored) {
        void 0 === stored.iataExt && !1 === stored.iata && (stored.iataExt = !1);
        void 0 === stored.bbd && !1 === stored.calendar && (stored.bbd = !1);
        void 0 !== stored.smartsearch || !1 !== stored.search && !1 !== stored.ownlist || (stored.smartsearch = !1);
        if ("" === stored.office && !stored.officeAutoMigrated) {
          stored.office = "auto";
          stored.officeAutoMigrated = 1;
          try {
            localStorage.setItem(KEY, JSON.stringify(stored));
          } catch (e) {}
        }
      }
      const out = {
        ...DEFAULTS
      };
      Object.keys(DEFAULTS).forEach(k => {
        stored && void 0 !== stored[k] && (out[k] = "string" == typeof DEFAULTS[k] ? normText(stored[k]) : stored[k]);
      });
      return out;
    })();
    const listeners = inherited && Array.isArray(inherited._listeners) ? inherited._listeners : [];
    const bootPrefs = inherited && inherited._bootPrefs || {
      ...prefs
    };
    const save = () => {
      try {
        localStorage.setItem(KEY, JSON.stringify(prefs));
      } catch (e) {}
      (v => {
        try {
          v = Object.fromEntries(Object.entries(v).filter(([k, x]) => x !== DEFAULTS[k]));
          const exp = new Date(Date.now() + 365 * 24 * 3600 * 1e3).toUTCString();
          document.cookie = KEY + "=" + encodeURIComponent(JSON.stringify(v)) + ";expires=" + exp + ";path=/;SameSite=Lax";
        } catch (e) {}
      })(prefs);
    };
    save();
    const state = {
      version: VERSION,
      _listeners: listeners,
      _bootPrefs: bootPrefs,
      get: k => prefs[k],
      all: () => ({
        ...prefs
      }),
      set: (k, v) => {
        prefs[k] = "string" == typeof DEFAULTS[k] ? normText(v) : !!v;
        save();
        syncUI();
        (k => {
          listeners.forEach(fn => {
            try {
              fn(k, prefs);
            } catch (e) {}
          });
        })(k);
      },
      onChange: fn => {
        listeners.push(fn);
        return () => {
          const i = listeners.indexOf(fn);
          i >= 0 && listeners.splice(i, 1);
        };
      }
    };
    try {
      Object.defineProperty(window, "__mmSettings", {
        value: state,
        enumerable: !1,
        configurable: !0
      });
    } catch (e) {
      try {
        window.__mmSettings = state;
      } catch (e2) {}
    }
    let panel = null;
    let tipEl = null;
    const RELOADS = {};
    groups().forEach(g => g.subs.forEach(s => {
      s.reload && (RELOADS[s.key] = !0);
    }));
    const FX_CHOICES = [ "EUR", "CHF", "GBP", "PLN", "CZK", "HUF", "RON", "DKK", "SEK", "NOK", "ISK", "RSD", "UAH", "TRY", "USD", "CAD", "BRL", "JPY", "KRW", "CNY", "TWD", "HKD", "AUD", "INR" ];
    function groupHtml(g) {
      return `<div class="mmset-grp${g.office ? " mmset-office" : ""}"><div class="mmset-head">${g.header}</div>` + (g.office ? `<div class="mmset-row is-sub mmset-office-row" data-office-row>
                <span class="mmset-label">${T("🏢 Buchungsbüro")}</span>
                <select class="mmset-office-sel" data-office>
                    <option value="auto">${T("Automatisch (Abflugland)")}</option>
                    <option value="">${T("Webseite (Standard)")}</option>
                    ${OFFICES.map(([iso, id]) => `<option value="${id}">${countryName(iso)} (${id.slice(0, 3)})</option>`).join("")}
                    <option value="__custom">${T("Andere Kennung …")}</option>
                </select>
            </div>
            <div class="mmset-row is-sub mmset-office-row" data-office-custom hidden>
                <span class="mmset-label">${T("Kennung")}</span>
                <input type="text" class="mmset-office-txt" data-office-text maxlength="10"
                       placeholder="XXXLH08MP" spellcheck="false" autocomplete="off">
            </div>
            <div class="mmset-office-state">${T("Aktiv: {office}", {
        office: '<span class="mmset-office-active">–</span>'
      })}</div>
            <div class="mmset-office-pending" hidden></div>` : "") + g.subs.map(s => s.fx ? `<div class="mmset-row is-sub mmset-office-row">
                <span class="mmset-label">${T("💱 Umrechnen in")}</span>
                <select class="mmset-office-sel" data-fx></select>
            </div>` : s.action ? function(s) {
        return `<div class="mmset-row is-sub" data-key="${s.key}">
            <span class="mmset-label">${s.label}</span>
            <button type="button" class="mmset-act" data-action="${s.key}">${s.action}</button>
        </div>`;
      }(s) : function(key, label) {
        const hint = RELOADS[key] ? `<div class="mmset-reload" data-for="${key}" hidden>` + T("↻ Greift nach Neuladen: {link}", {
          link: `<a class="mmset-reload-link">${T("jetzt neu laden")}</a>`
        }) + `</div>` : "";
        return `<div class="mmset-row is-sub" data-key="${key}">
            <span class="mmset-label">${label}</span>
            <label class="mmset-sw">
                <input type="checkbox" data-feature="${key}" ${prefs[key] ? "checked" : ""}>
                <span class="mmset-track"></span>
            </label>
        </div>` + hint;
      }(s.key, s.label)).join("") + `</div>`;
    }
    let fab = null;
    function dock() {
      if (state.superseded || !fab || !document.body) return;
      const host = document.querySelector("refx-search-recap-cont .flight-recap") || document.querySelector("refx-search-recap-cont");
      if (fab.parentElement !== (host || document.body)) {
        fab.classList[host ? "add" : "remove"]("is-docked");
        (host || document.body).appendChild(fab);
      }
    }
    function positionPanel() {
      if (!panel || !fab) return;
      const r = fab.getBoundingClientRect();
      const w = PANEL_W;
      panel.style.top = Math.round(r.bottom + 8) + "px";
      panel.style.left = Math.round(Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8))) + "px";
      panel.style.maxHeight = Math.max(160, Math.round(window.innerHeight - r.bottom - 16)) + "px";
    }
    function mountUI() {
      if (fab && fab.isConnected) return;
      !function() {
        const css = `
.mmset-fab { position: fixed; top: 12px; right: 18px; z-index: 2147483000;
             box-shadow: 0 2px 10px rgba(0,0,0,.18);
             width: auto !important; max-width: max-content;
             border: 1px solid ${INK_hairline}; background: #fff; color: ${INK_primary};
             font-size: 12px; font-weight: 600; line-height: 1.6; padding: 4px 12px;
             border-radius: 6px; cursor: pointer; white-space: nowrap;
             display: inline-flex; align-items: center; gap: 6px; }
.mmset-fab:hover { background: #f2f5fa; }
.mmset-fab .mmset-mark { width: 20px; height: 20px; margin-left: -4px; flex: 0 0 auto; }
.mmset-fab.is-docked { position: static; z-index: auto; box-shadow: none;
                       align-self: center; margin-left: 16px; flex: 0 0 auto; }
.mmset-panel { position: fixed; z-index: 2147483001;
               width: ${PANEL_W}px; background: #fff; border: 1px solid ${INK_hairline}; border-radius: 10px;
               box-shadow: 0 6px 24px rgba(0,0,0,.18); padding: 10px 14px; line-height: 1.35; font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
               display: none; box-sizing: border-box; overflow-y: auto; overscroll-behavior: contain; }
.mmset-panel.is-open { display: block; }
.mmset-top { display: flex; align-items: center; justify-content: space-between; gap: 8px;
             padding-bottom: 6px; border-bottom: 1px solid ${INK_hairline}; }
.mmset-title { font-size: 14px; font-weight: 700; color: ${INK_primary}; margin: 0;
               display: flex; align-items: center; gap: 7px; }
.mmset-title .mmset-mark { width: 24px; height: 24px; flex: 0 0 auto; }
.mmset-don { display: inline-flex; align-items: center; gap: 4px; flex: 0 0 auto;
             text-decoration: none !important; cursor: pointer; }
.mmset-don-mug { display: block; width: 18px; height: 18px; }
.mmset-don-cta { font-size: 11.5px; font-weight: 600; color: #8A5A00; white-space: nowrap; }
.mmset-don:hover .mmset-don-cta { text-decoration: underline; }
.mmset-grp { padding: 1px 0 3px; }
.mmset-grp + .mmset-grp { border-top: 1px solid ${INK_hairline}; }
.mmset-head { font-size: 12px; font-weight: 700; color: ${INK_muted};
              letter-spacing: .02em; padding: 4px 0 1px; }
.mmset-row { display: flex; align-items: center; justify-content: space-between; gap: 10px;
             margin-left: 9px; padding: 1.5px 0 1.5px 12px; border-left: 2px solid ${INK_hairline}; }
.mmset-act { font: inherit; font-size: 11px; border: 1px solid ${INK_hairline}; background: #fff;
             color: ${INK_primary}; border-radius: 5px; padding: 1px 8px; cursor: pointer; flex: 0 0 auto; }
.mmset-act:hover { background: #f3f6fc; border-color: #b9c6e0; }
.mmset-reload { margin: -2px 0 4px 21px; font-size: 11px; color: ${INK_muted}; }
.mmset-reload-link { color: ${INK_accent}; text-decoration: underline; cursor: pointer; }
.mmset-label { font-size: 12px; color: ${INK_secondary}; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.mmset-tip { position: fixed; z-index: 2147483002; width: 252px;
             background: #fff; color: ${INK_primary}; border: 1px solid ${INK_hairline};
             border-radius: 7px; padding: 8px 10px;
             font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
             font-size: 11.5px; line-height: 1.5; pointer-events: none;
             opacity: 0; transition: opacity .12s; transition-delay: 0s;
             box-shadow: 0 4px 14px rgba(5,22,77,.12); }
.mmset-tip.is-on { opacity: 1; transition-delay: .3s; }
.mmset-sw { position: relative; width: 30px; height: 18px; flex: 0 0 30px; }
.mmset-sw input { opacity: 0; width: 0; height: 0; position: absolute; }
.mmset-track { position: absolute; inset: 0; background: #cdd3df; border-radius: 999px; transition: background .15s; cursor: pointer; }
.mmset-track::before { content: ''; position: absolute; left: 3px; top: 3px; width: 12px; height: 12px;
                       background: #fff; border-radius: 50%; transition: transform .15s; }
.mmset-sw input:checked + .mmset-track { background: ${INK_accent}; }
.mmset-sw input:checked + .mmset-track::before { transform: translateX(12px); }
.mmset-foot { margin-top: 6px; font-size: 10px; color: ${INK_muted}; }
.mmset-row[hidden] { display: none !important; }
.mmset-office-row .mmset-label { white-space: nowrap; }
.mmset-office-sel, .mmset-office-txt { font: inherit; font-size: 11.5px; color: ${INK_primary};
  border: 1px solid ${INK_hairline}; border-radius: 4px; background: #fff; padding: 1px 4px;
  flex: 0 1 140px; min-width: 100px; box-sizing: border-box; }
.mmset-office-txt { text-transform: uppercase; letter-spacing: .04em; }
.mmset-office-state, .mmset-office-pending { margin: 0 0 1px 23px; font-size: 11.5px; color: ${INK_secondary};
  line-height: 1.35; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mmset-office-pending { color: #b3261e; margin-bottom: 3px; }
.mmset-office-active { color: ${INK_primary}; font-weight: 600; font-variant-numeric: tabular-nums; letter-spacing: .02em; }
.mmset-office-active.is-off { color: #b3261e; }
.mmset-verline a { color: ${INK_muted}; text-decoration: underline; cursor: pointer; }
.mmset-updres { font-weight: 600; }
.mmset-updres a { color: #1a6b2f; }
`;
        let el = document.getElementById("mmset-styles");
        if (!el) {
          el = document.createElement("style");
          el.id = "mmset-styles";
          document.head.appendChild(el);
        }
        el.textContent !== css && (el.textContent = css);
      }();
      document.querySelectorAll(".mmset-fab, .mmset-panel").forEach(e => e.remove());
      fab = document.createElement("button");
      fab.className = "mmset-fab";
      fab.type = "button";
      fab.title = T("M&M Patcher: Einstellungen");
      fab.innerHTML = MARK + "<span>M&amp;M Patcher</span>";
      document.body.appendChild(fab);
      panel = document.createElement("div");
      panel.className = "mmset-panel";
      document.body.appendChild(panel);
      !function() {
        if (!tipEl) {
          tipEl = document.createElement("div");
          tipEl.className = "mmset-tip";
          document.body.appendChild(tipEl);
        }
        panel.addEventListener("mouseover", e => {
          const row = e.target.closest && e.target.closest(".mmset-row[data-key]");
          if (!row) {
            tipEl.classList.remove("is-on");
            return;
          }
          tipEl.textContent = (key => {
            for (const g of groups()) for (const s of g.subs) if (s.key === key) return s.tip;
            return "";
          })(row.dataset.key);
          const r = row.getBoundingClientRect();
          const w = 252;
          const left = r.left - w - 12 >= 8 ? r.left - w - 12 : Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
          tipEl.style.left = Math.round(left) + "px";
          tipEl.style.top = Math.round(Math.min(r.top, window.innerHeight - 150)) + "px";
          tipEl.classList.add("is-on");
        });
        panel.addEventListener("mouseleave", () => tipEl.classList.remove("is-on"));
      }();
      let builtLang = null;
      const pageLang = () => window.__mmI18n ? window.__mmI18n.lang() : "de";
      const retitle = () => {
        fab.title = T("M&M Patcher: Einstellungen");
      };
      function fillPanel() {
        builtLang = pageLang();
        retitle();
        panel.innerHTML = `
            <div class="mmset-top"><div class="mmset-title">${MARK}M&amp;M Patcher</div>
                <a class="mmset-don" href="${DONATE_URL}" target="_blank" rel="noopener"
                   title="${T("M&amp;M Patcher unterstützen")}">${MUG}<span class="mmset-don-cta">${T("Bier spendieren")}</span></a></div>
            ${groups().map(groupHtml).join("")}
            <div class="mmset-foot mmset-verline"><span class="mmset-ver"></span> ·
                <a href="#" class="mmset-upd">${T("Auf Updates prüfen")}</a>
                <span class="mmset-updres"></span></div>`;
        const updRes = panel.querySelector(".mmset-updres");
        const updLink = panel.querySelector(".mmset-upd");
        updLink && updRes && updLink.addEventListener("click", async e => {
          e.preventDefault();
          e.stopPropagation();
          const u = window.__mmUpdate;
          if (u && u.check) {
            updRes.textContent = T("prüfe …");
            try {
              await u.check(!0);
              const s = u.status();
              if (s.error) {
                updRes.textContent = T("Prüfung fehlgeschlagen");
                return;
              }
              if (s.latest && s.current && s.latest !== s.current) {
                updRes.textContent = "";
                const a = document.createElement("a");
                a.href = s.page || "#";
                a.target = "_blank";
                a.rel = "noopener";
                a.textContent = T("v{version} verfügbar", {
                  version: s.latest
                });
                a.addEventListener("click", () => {
                  try {
                    u.armReload && u.armReload();
                  } catch (e3) {}
                });
                updRes.appendChild(a);
              } else updRes.textContent = T("✓ aktuell");
            } catch (e2) {
              updRes.textContent = T("Prüfung fehlgeschlagen");
            }
          } else updRes.textContent = T("Update-Hinweis ist abgeschaltet");
        });
        panel.querySelectorAll("input[data-feature]").forEach(inp => {
          inp.addEventListener("change", () => state.set(inp.dataset.feature, inp.checked));
        });
        !function() {
          const sel = panel.querySelector("[data-office]");
          const txtRow = panel.querySelector("[data-office-custom]");
          const txt = panel.querySelector("[data-office-text]");
          if (sel && txt && txtRow) {
            sel.addEventListener("change", () => {
              if ("__custom" !== sel.value) {
                txtRow.hidden = !0;
                state.set("office", sel.value);
                applyOffice();
              } else {
                txtRow.hidden = !1;
                txt.focus();
              }
            });
            txt.addEventListener("change", () => {
              state.set("office", txt.value);
              applyOffice();
            });
            txt.addEventListener("keydown", e => e.stopPropagation());
          }
        }();
        const fxSel = panel.querySelector("[data-fx]");
        fxSel && fxSel.addEventListener("change", () => state.set("fxTarget", fxSel.value));
      }
      fab.addEventListener("mouseenter", () => {
        builtLang !== pageLang() && retitle();
      });
      fab.addEventListener("click", e => {
        e.stopPropagation();
        if (panel.classList.toggle("is-open")) {
          builtLang !== pageLang() && fillPanel();
          syncUI();
          positionPanel();
          showVersion();
        }
      });
      function showVersion() {
        const verEl = panel.querySelector(".mmset-ver");
        if (verEl && !verEl.textContent) {
          const v = (() => {
            try {
              const s = window.__mmUpdate && window.__mmUpdate.status();
              if (s && s.current) return s.current;
            } catch (e) {}
            try {
              if ("undefined" != typeof GM_info && GM_info.script && GM_info.script.version) return GM_info.script.version;
            } catch (e) {}
            return null;
          })();
          verEl.textContent = "M&M Patcher" + (v ? " v" + v : "");
        }
      }
      document.addEventListener("click", e => {
        panel.classList.contains("is-open") && !panel.contains(e.target) && e.target !== fab && panel.classList.remove("is-open");
      });
      try {
        window.addEventListener("resize", () => {
          panel.classList.contains("is-open") && positionPanel();
        });
        window.addEventListener("scroll", () => {
          panel.classList.contains("is-open") && positionPanel();
        }, !0);
      } catch (e) {}
      fillPanel();
      state.redraw = () => {
        retitle();
        if (panel.classList.contains("is-open")) {
          fillPanel();
          syncUI();
          positionPanel();
          showVersion();
        }
      };
      panel.addEventListener("click", e => {
        const act = e.target.closest && e.target.closest("[data-action]");
        if (act && "calCache" === act.dataset.action) try {
          window.__mmCalUI && window.__mmCalUI.clearCache && window.__mmCalUI.clearCache();
        } catch (err) {} else e.target.closest && e.target.closest(".mmset-reload-link") && location.reload();
      });
      dock();
      const obs = new MutationObserver(dock);
      state._observer = obs;
      obs.observe(document.body, {
        childList: !0,
        subtree: !0
      });
    }
    const isAuto = v => "auto" === v;
    function originCountry() {
      try {
        const o = JSON.parse(sessionStorage.getItem("airBoundsSearch"));
        const iata = window.__mmIata;
        return iata && iata.isoOf && iata.isoOf(o.entities[o.selectedAirBoundsSearchId].itineraries[0].originLocationCode) || null;
      } catch (err) {
        return null;
      }
    }
    let officeRun = 0;
    async function applyOffice() {
      const pend = panel && panel.querySelector(".mmset-office-pending");
      const B = window.__mmBounds;
      const run = ++officeRun;
      const say = t => {
        if (pend) {
          pend.hidden = !t;
          pend.textContent = t || "";
        }
      };
      if (!B || "function" != typeof B.handover) {
        say(T("Greift nach Neuladen."));
        return;
      }
      const office = String(prefs.office || "");
      let ctx;
      if (isAuto(office)) {
        const country = originCountry();
        ctx = country ? {
          country: country
        } : {};
      } else ctx = office ? {
        officeId: office
      } : {};
      say(T("Büro wird gewechselt …"));
      try {
        await B.handover(ctx);
        if (run !== officeRun) return;
        say("");
        syncUI();
        try {
          window.dispatchEvent(new CustomEvent("mm:office", {
            detail: {
              office: office
            }
          }));
        } catch (e) {}
      } catch (e) {
        if (run !== officeRun) return;
        say(T("Wechsel fehlgeschlagen: {reason}", {
          reason: e && e.message ? e.message : e
        }));
      }
    }
    state._applyOffice = applyOffice;
    state.mark = MARK;
    state.officeIso = id => {
      const up = String(id || "").toUpperCase();
      const hit = OFFICES.find(([, x]) => x === up);
      if (hit) return hit[0];
      try {
        const I = window.__mmIata;
        return (I && I.isoOf ? I.isoOf(up.slice(0, 3)) : null) || null;
      } catch (e) {
        return null;
      }
    };
    state.officeName = id => {
      const iso = state.officeIso(id);
      return iso ? countryName(iso) : null;
    };
    function syncUI() {
      if (!panel) return;
      panel.querySelectorAll(".mmset-row[data-key]").forEach(row => {
        const inp = row.querySelector("input[data-feature]");
        inp && (inp.checked = !!prefs[row.dataset.key]);
      });
      const fxSel = panel.querySelector("[data-fx]");
      fxSel && function(sel) {
        const fx = window.__mmCurrency;
        const chosen = prefs.fxTarget || "EUR";
        const rated = new Set(fx && fx.currencies ? fx.currencies() : FX_CHOICES);
        const codes = FX_CHOICES.filter(c => "EUR" === c || rated.has(c));
        if (sel.options.length !== codes.length) {
          const locale = dtf().resolvedOptions().locale;
          let names = null;
          try {
            names = new Intl.DisplayNames([ locale ], {
              type: "currency"
            });
          } catch (e) {}
          const name = c => {
            let n = c;
            try {
              n = names && names.of(c) || c;
            } catch (e) {}
            return n.charAt(0).toLocaleUpperCase(locale) + n.slice(1);
          };
          const others = codes.filter(c => "EUR" !== c).sort((a, b) => name(a).localeCompare(name(b), locale));
          sel.innerHTML = [ "EUR" ].concat(others).map(c => `<option value="${c}">${name(c)} (${c})</option>`).join("");
        }
        sel.value = chosen;
      }(fxSel);
      const sel = panel.querySelector("[data-office]");
      const txtRow = panel.querySelector("[data-office-custom]");
      const txt = panel.querySelector("[data-office-text]");
      const act = panel.querySelector(".mmset-office-active");
      if (sel && txt && txtRow) {
        const v = String(prefs.office || "");
        if ([ ...sel.options ].some(o => o.value === v)) {
          sel.value = v;
          document.activeElement !== txt && (txtRow.hidden = !0);
        } else {
          sel.value = "__custom";
          txtRow.hidden = !1;
          document.activeElement !== txt && (txt.value = v);
        }
      }
      if (act) {
        let live = null;
        try {
          live = window.__mmAuth && window.__mmAuth.activeOffice && window.__mmAuth.activeOffice();
        } catch (e) {}
        const want = String(prefs.office || "");
        const countryNameOf = state.officeName;
        let off = !(!want || isAuto(want) || !live || want === live);
        if (isAuto(want)) {
          const wanted = originCountry();
          let actual = null;
          try {
            actual = window.__mmAuth && window.__mmAuth.activeCountry ? window.__mmAuth.activeCountry() : null;
          } catch (err) {}
          off = !(!wanted || !actual || wanted === actual);
        }
        act.textContent = live ? live + (countryNameOf(live) ? " · " + countryNameOf(live) : "") : T("unbekannt (noch kein Token)");
        act.classList.toggle("is-off", off);
      }
      panel.querySelectorAll(".mmset-reload[data-for]").forEach(el => {
        const k = el.dataset.for;
        el.hidden = !!prefs[k] == !!bootPrefs[k];
      });
    }
    state.superseded || window.__mmSettings !== state || (document.body ? mountUI() : document.addEventListener("DOMContentLoaded", () => {
      state.superseded || window.__mmSettings !== state || mountUI();
    }));
    try {
      window.addEventListener("pagehide", e => {
        if (!e || !e.persisted) {
          state.superseded = !0;
          try {
            state._observer && state._observer.disconnect();
          } catch (e2) {}
        }
      });
    } catch (e) {}
  })();
  (() => {
    "use strict";
    const VERSION = 32;
    if (window.__mmSponsor && window.__mmSponsor.version >= VERSION) return;
    if (window.__mmSponsor) try {
      window.__mmSponsor.teardown();
    } catch (e) {}
    const state = {
      version: VERSION
    };
    try {
      Object.defineProperty(window, "__mmSponsor", {
        value: state,
        enumerable: !1,
        configurable: !0
      });
    } catch (e) {
      try {
        window.__mmSponsor = state;
      } catch (e2) {}
    }
    const KEY = "bookForOthers";
    const PREF = "mm_book_for_others";
    const POST = "_post";
    const PARAM = "portalFacts";
    const HOST = "refx-passenger-type-selection-popup-pres";
    const INK_primary = "#05164D", INK_hairline = "#e1e0d9", INK_accent = "#1c5cab";
    const SP = Object.getPrototypeOf(sessionStorage);
    const rawGet = k => {
      try {
        return SP.getItem.call(sessionStorage, k);
      } catch (e) {
        return null;
      }
    };
    const rawSet = (k, v) => {
      try {
        SP.setItem.call(sessionStorage, k, v);
      } catch (e) {}
    };
    const wanted = () => {
      try {
        return "1" === localStorage.getItem(PREF);
      } catch (e) {
        return !1;
      }
    };
    state.wanted = wanted;
    state.active = () => "true" === rawGet(KEY);
    const readPost = () => {
      try {
        const raw = rawGet(POST);
        return raw ? JSON.parse(raw) : {};
      } catch (e) {
        return {};
      }
    };
    const factsOf = obj => {
      try {
        const raw = obj && obj[PARAM];
        if (!raw) return [];
        const v = "string" == typeof raw ? JSON.parse(raw) : raw;
        return Array.isArray(v) ? v : [];
      } catch (e) {
        return [];
      }
    };
    state.postField = () => {
      const list = factsOf(readPost()).filter(f => f && f.key !== KEY);
      if (!wanted()) return list.length ? JSON.stringify(list) : null;
      list.push({
        key: KEY,
        value: "true"
      });
      return JSON.stringify(list);
    };
    function alignFacts(obj) {
      const list = factsOf(obj);
      if ((list => list.some(f => f && f.key === KEY && "true" === String(f.value)))(list) === wanted()) return !1;
      const rest = list.filter(f => f && f.key !== KEY);
      wanted() && rest.push({
        key: KEY,
        value: "true"
      });
      rest.length ? obj[PARAM] = JSON.stringify(rest) : delete obj[PARAM];
      return !0;
    }
    function alignPost() {
      const post = readPost();
      alignFacts(post) && rawSet(POST, JSON.stringify(post));
    }
    function alignKey() {
      wanted() ? "true" !== rawGet(KEY) && rawSet(KEY, "true") : null !== rawGet(KEY) && (k => {
        try {
          SP.removeItem.call(sessionStorage, k);
        } catch (e) {}
      })(KEY);
    }
    state.set = on => {
      try {
        localStorage.setItem(PREF, on ? "1" : "0");
      } catch (e) {}
      alignKey();
      alignPost();
      paint();
    };
    alignKey();
    alignPost();
    window.__mmSponsorStore = {
      patch: (key, value) => {
        try {
          if (key === KEY) return wanted() ? "true" : "false";
          if (key !== POST) return value;
          const obj = JSON.parse(value || "{}");
          return obj && "object" == typeof obj && alignFacts(obj) ? JSON.stringify(obj) : value;
        } catch (e) {
          return value;
        }
      }
    };
    if (!window.__mmSponsorStoreHooked) {
      window.__mmSponsorStoreHooked = !0;
      try {
        const prev = sessionStorage.setItem.bind(sessionStorage);
        sessionStorage.setItem = function(key, value) {
          try {
            const h = window.__mmSponsorStore;
            h && (value = h.patch(key, value));
          } catch (e) {}
          return prev(key, value);
        };
      } catch (e) {}
    }
    const JWT_NONE = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.";
    const SEARCH_RE = /\/search\/air-/i;
    const FACTS_HDR = "ama-client-facts";
    state.applyFacts = facts => {
      const o = Object.assign({
        sub: "fact"
      }, facts || {});
      if (wanted()) {
        o.bookForOthers = "true";
        delete o.isCompanion;
      } else {
        delete o.bookForOthers;
        o.isCompanion = "true";
      }
      return o;
    };
    state.fixJwt = (value, url) => {
      if (!SEARCH_RE.test(String(url || ""))) return null;
      try {
        const parts = String(value || "").split(".");
        if (parts.length < 2) return null;
        const cur = JSON.parse((t => {
          let x = String(t).replace(/-/g, "+").replace(/_/g, "/");
          for (;x.length % 4; ) x += "=";
          return atob(x);
        })(parts[1]));
        return cur && "object" == typeof cur ? "true" === String(cur.bookForOthers) === wanted() ? null : JWT_NONE + (s = JSON.stringify(state.applyFacts(cur)), 
        btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")) + "." : null;
      } catch (e) {
        return null;
      }
      var s;
    };
    window.__mmSponsorHook = {
      fix: (v, url) => state.fixJwt(v, url)
    };
    if (!window.__mmSponsorHooked) {
      window.__mmSponsorHooked = !0;
      const urlOf = input => {
        try {
          if ("string" == typeof input) return input;
          if (input && "string" == typeof input.url) return input.url;
        } catch (e) {}
        return "";
      };
      const origFetch = window.fetch;
      "function" == typeof origFetch && (window.fetch = function(input, init) {
        try {
          const h = window.__mmSponsorHook;
          const url = urlOf(input);
          if (h && init && init.headers) {
            const hdrs = init.headers;
            if ("undefined" != typeof Headers && hdrs instanceof Headers) {
              const cur = hdrs.get(FACTS_HDR);
              const next = cur && h.fix(cur, url);
              next && hdrs.set(FACTS_HDR, next);
            } else if ("object" == typeof hdrs) {
              const key = Object.keys(hdrs).find(k => k.toLowerCase() === FACTS_HDR);
              const next = key && h.fix(hdrs[key], url);
              next && (hdrs[key] = next);
            }
          }
        } catch (e) {}
        return origFetch.apply(this, arguments);
      });
      const origOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url) {
        try {
          this.__mmSponsorUrl = String(url || "");
        } catch (e) {}
        return origOpen.apply(this, arguments);
      };
      const origSet = XMLHttpRequest.prototype.setRequestHeader;
      XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
        try {
          if (String(name).toLowerCase() === FACTS_HDR) {
            const h = window.__mmSponsorHook;
            const next = h && h.fix(value, this.__mmSponsorUrl);
            if (next) return origSet.call(this, name, next);
          }
        } catch (e) {}
        return origSet.apply(this, arguments);
      };
    }
    const PANE = ".cdk-overlay-pane:has(" + HOST + ")";
    const STEP = HOST + " refx-number-stepper .number-stepper-container .stepper-inputs " + "button.stepper-button.mdc-button.mat-mdc-outlined-button.mat-mdc-button-base";
    const SANS = 'system-ui, -apple-system, "Segoe UI", sans-serif';
    const CSS = `
${PANE} { height: auto !important; max-height: 92vh !important; }
${PANE} mat-dialog-container { width: 440px !important; max-width: calc(100vw - 32px) !important;
        min-width: 0 !important; }
${PANE} .mat-mdc-dialog-surface,
${PANE} .mat-mdc-dialog-inner-container,
${PANE} mat-dialog-container { height: auto !important; max-height: 92vh !important; }
${PANE},
${PANE} mat-dialog-container,
${PANE} .mat-mdc-dialog-surface { border-radius: 14px !important; overflow: hidden !important; }
${PANE} .mat-mdc-dialog-surface { box-shadow: 0 8px 30px rgba(0,0,0,.20) !important;
        background: #fff !important; }

${HOST} .refx-dialog-container { font: 13px/1.45 ${SANS};
        color: ${INK_primary}; }
${HOST} .refx-dialog-title { padding: 4px 0 0 !important; margin: 0 0 12px !important;
        font: 600 17px/1.3 ${SANS} !important;
        min-height: 0 !important; }
${HOST} .refx-dialog-content { padding: 0 20px !important; overflow: visible !important;
        max-height: none !important; }
${HOST} .refx-dialog-content .container { display: flex; flex-direction: column;
        border: 1px solid ${INK_hairline}; border-radius: 10px; padding: 0 13px; }
${HOST} .rows-passengers { border: 0 !important; padding: 0 !important; margin: 0 !important;
        min-height: 0 !important; }
${HOST} .rows-passengers + .rows-passengers { border-top: 1px solid ${INK_hairline} !important; }
${HOST} .row.passengerItem { margin: 0 !important; min-height: 0 !important; height: auto !important;
        align-items: center !important; }
${HOST} .passenger { display: flex !important; align-items: baseline !important; gap: 7px;
        height: auto !important; min-height: 0 !important; padding: 11px 0 !important; }
${HOST} .passenger-desc { color: ${"#898781"}; margin: 0 !important; font: 400 11.5px/1.3 ${SANS} !important; }
${HOST} .passenger-count-stepper,
${HOST} refx-number-stepper,
${HOST} .number-stepper-container,
${HOST} .stepper-inputs { height: auto !important; min-height: 0 !important; }
${HOST} .stepper-button { width: 30px !important; height: 30px !important;
        min-width: 0 !important; padding: 0 !important; }
${HOST} .refx-dialog-actions { padding: 12px 20px 14px !important;
        justify-content: flex-end !important; min-height: 0 !important; }

${HOST} .refx-dialog-header { padding: 14px 14px 0 20px !important; align-items: center !important;
        min-height: 0 !important; }
${HOST} h1.refx-title { font: 700 18px/1.3 ${SANS} !important;
        color: ${INK_primary} !important; margin: 0 !important; }
${HOST} .refx-dialog-header button.refx-dialog-close-btn-corner.mat-mdc-mini-fab { width: 32px !important;
        height: 32px !important; min-width: 0 !important; padding: 0 !important; box-shadow: none !important;
        transform: none !important;
        background: #f1f0ec !important; color: ${"#52514e"} !important; border-radius: 999px !important; }
${HOST} .refx-dialog-header button.refx-dialog-close-btn-corner.mat-mdc-mini-fab:hover { background: #e7e6e0 !important; }
${HOST} .refx-dialog-header button.refx-dialog-close-btn-corner .mdc-button__label,
${HOST} .refx-dialog-header button.refx-dialog-close-btn-corner .mat-focus-indicator { width: 32px !important;
        height: 32px !important; display: flex !important; align-items: center !important; justify-content: center !important; }
${HOST} .refx-dialog-header button.refx-dialog-close-btn-corner i { font-size: 15px !important; width: auto !important;
        height: auto !important; line-height: 1 !important; }
${HOST} .passenger-type { font: 500 14px/1.3 ${SANS} !important;
        color: ${INK_primary} !important; }
${HOST} .stepper-inputs { align-items: center !important; gap: 4px; }
${STEP} { position: relative !important; width: 30px !important; height: 30px !important;
        min-width: 0 !important; min-height: 0 !important; display: inline-flex !important;
        align-items: center !important; justify-content: center !important; padding: 0 !important; border-radius: 999px !important;
        border: 1px solid ${INK_hairline} !important; background: #fff !important; color: ${INK_primary} !important; }
${STEP}:not(.mat-mdc-button-disabled):hover {
        border-color: #b9c6e0 !important; background: #f4f8fd !important; }
${STEP}.mat-mdc-button-disabled { opacity: .35 !important; }
${STEP} i { display: none !important; }
${STEP} .mdc-button__label { position: absolute !important; left: 50% !important; top: 50% !important;
        transform: translate(-50%, -50%) !important; width: 11px !important; height: 11px !important; margin: 0 !important; }
${STEP} .mdc-button__label::before,
${STEP}[id$="plusButton"] .mdc-button__label::after { content: ''; position: absolute; background: currentColor;
        border-radius: 1px; }
${STEP} .mdc-button__label::before { left: 0; right: 0; top: 5px; height: 1.5px; }
${STEP}[id$="plusButton"] .mdc-button__label::after { top: 0; bottom: 0; left: 5px; width: 1.5px; }
${STEP}.mat-mdc-button-disabled .mdc-button__label::before,
${STEP}[id$="plusButton"].mat-mdc-button-disabled .mdc-button__label::after { background: ${INK_primary}; }
html.mm-dark ${STEP}.mat-mdc-button-disabled .mdc-button__label::before,
html.mm-dark ${STEP}[id$="plusButton"].mat-mdc-button-disabled .mdc-button__label::after { background: currentColor; }
${STEP} .mat-focus-indicator,
${STEP} .mat-mdc-button-touch-target { width: 30px !important; height: 30px !important; }
${HOST} .stepper-inputs .value-container { border: 0 !important; width: 30px !important; height: 30px !important; }
${HOST} .stepper-inputs .number-wrapper { height: 30px !important; border: 0 !important;
        justify-content: center !important; align-items: center !important; }
${HOST} .stepper-value { font: 700 15px/1 ${SANS} !important;
        color: ${INK_primary} !important; font-variant-numeric: tabular-nums; }
${HOST} .confirm-button { border-radius: 999px !important; height: 40px !important; padding: 0 24px !important;
        background: ${INK_primary} !important; color: #fff !important; }
${HOST} .confirm-button:hover { background: #1e449c !important; }
${HOST} .confirm-button span { font: 700 14px/1 ${SANS} !important;
        letter-spacing: .02em; }
${HOST} .passenger-desc.mmsp-noage { display: none !important; }
.mmsp-row { display: flex; align-items: flex-start; gap: 10px; margin: 10px 0 0;
        border: 1px solid ${INK_hairline}; border-radius: 10px; padding: 10px 13px;
        cursor: pointer; transition: border-color .12s, background .12s;
        font: 13px/1.45 ${SANS}; color: ${INK_primary}; }
.mmsp-row:hover { border-color: #b9c6e0; background: #f8fafd; }
.mmsp-row.is-on { border-color: ${INK_accent}; background: #f4f8fd; }
.mmsp-box { flex: 0 0 auto; width: 18px; height: 18px; margin-top: 1px; border-radius: 4px;
        border: 1.5px solid #b9c6e0; background: #fff; display: flex; align-items: center;
        justify-content: center; font-size: 12px; line-height: 1; color: #fff; }
.mmsp-row.is-on .mmsp-box { background: ${INK_accent}; border-color: ${INK_accent}; }
.mmsp-txt { display: block; min-width: 0; }
.mmsp-title { display: block; font-weight: 500; }
.mmsp-row input { position: absolute; opacity: 0; pointer-events: none; }
`;
    const STYLE_ID = "mmsp-style";
    function ensureStyle() {
      if (document.getElementById(STYLE_ID)) return;
      const el = document.createElement("style");
      el.id = STYLE_ID;
      el.textContent = CSS;
      (document.head || document.documentElement).appendChild(el);
    }
    const dialog = () => document.querySelector(HOST);
    function paint() {
      const row = document.querySelector(".mmsp-row");
      if (!row) return;
      const on = wanted();
      row.classList.toggle("is-on", on);
      row.setAttribute("aria-checked", on ? "true" : "false");
      const box = row.querySelector(".mmsp-box");
      box && (box.textContent = on ? "✓" : "");
      const cb = row.querySelector("input");
      cb && (cb.checked = on);
    }
    function mount() {
      const host = dialog();
      if (!host) return;
      ensureStyle();
      !function(host) {
        host.querySelectorAll(".rows-passengers .passenger-desc").forEach(d => {
          /^\s*\+\s*15\b/.test(d.textContent || "") && d.classList.add("mmsp-noage");
        });
      }(host);
      if (host.querySelector(".mmsp-row")) {
        paint();
        return;
      }
      const anchor = (host => host.querySelector(".refx-dialog-content .container"))(host);
      if (!anchor) return;
      const row = document.createElement("label");
      row.className = "mmsp-row";
      row.setAttribute("role", "checkbox");
      row.innerHTML = '<input type="checkbox">' + '<span class="mmsp-box" aria-hidden="true"></span>' + '<span class="mmsp-txt">' + '<span class="mmsp-title">' + (s = "Ich fliege nicht selbst, sondern führe die " + "Buchung für eine oder mehrere andere Personen durch.", 
      window.__mmI18n ? window.__mmI18n.t(s, p) : p ? String(s).replace(/\{(\w+)\}/g, (m, k) => null != p[k] ? String(p[k]) : m) : String(s)) + "</span>" + "</span>";
      var s, p;
      row.querySelector("input").addEventListener("change", e => state.set(!!e.target.checked));
      anchor.parentNode.insertBefore(row, anchor.nextSibling);
      paint();
    }
    const obs = new MutationObserver(() => {
      if (dialog()) try {
        mount();
      } catch (e) {}
    });
    let watched = null;
    const watch = () => {
      const box = document.querySelector(".cdk-overlay-container");
      if (box && box !== watched) {
        watched = box;
        obs.observe(box, {
          childList: !0,
          subtree: !0
        });
        if (dialog()) try {
          mount();
        } catch (e) {}
      }
    };
    const outer = new MutationObserver(watch);
    const observe = () => {
      try {
        outer.observe(document.body || document.documentElement, {
          childList: !0
        });
      } catch (e) {}
      watch();
    };
    document.body ? observe() : document.addEventListener("DOMContentLoaded", observe, {
      once: !0
    });
    ensureStyle();
    try {
      mount();
    } catch (e) {}
    state.teardown = () => {
      try {
        obs.disconnect();
        outer.disconnect();
      } catch (e) {}
      document.querySelectorAll(".mmsp-row").forEach(e => e.remove());
      const st = document.getElementById(STYLE_ID);
      st && st.remove();
    };
  })();
  (() => {
    "use strict";
    const VERSION = 62;
    if (window.__mmIata && window.__mmIata.version >= VERSION) return;
    const inherited = window.__mmIata;
    if (inherited) {
      inherited.superseded = !0;
      try {
        inherited._stop && inherited._stop();
      } catch (e) {}
      inherited._stop = null;
    }
    const DEFAULT_AIRPORTS_RE = /defaultAirports\.json/i;
    const state = {
      version: VERSION,
      added: 0,
      patched: 0,
      hooked: !1
    };
    try {
      Object.defineProperty(window, "__mmIata", {
        value: state,
        enumerable: !1,
        configurable: !0
      });
    } catch (e) {
      try {
        window.__mmIata = state;
      } catch (e2) {}
    }
    const smartOn = () => !window.__mmSettings || !1 !== window.__mmSettings.get("smartsearch");
    const iataListOn = () => !window.__mmSettings || !1 !== window.__mmSettings.get("iataExt");
    const originalFetch = window.__mmIataOrigFetch || (window.__mmIataOrigFetch = window.fetch);
    const EXTRA_AIRPORTS = [ [ "WSI", "Sydney - Western Sydney International", "Sydney" ] ];
    const RAIL_METRO = [ [ "XHJ", "Aachen Hbf Rail Station", "Aachen/Maastricht" ], [ "QPP", "Berlin Hbf Rail Station", "Berlin" ], [ "ZQU", "Braunschweig/Wolfsburg Rail Station", "Braunschweig" ], [ "DHC", "Bremen Hbf", "Bremen" ], [ "DTZ", "Dortmund Hbf Rail Station", "Dortmund" ], [ "XIR", "Dresden Hbf Rail Station", "Dresden" ], [ "QDU", "Düsseldorf Hauptbahnhof", "Düsseldorf" ], [ "XIU", "Erfurt Hbf Rail Station", "Erfurt" ], [ "ESZ", "Essen Hbf Rail Station", "Essen" ], [ "ZRB", "Frankfurt Hbf Rail Station", "Frankfurt" ], [ "QFB", "Freiburg Hbf", "Freiburg" ], [ "ZEU", "Göttingen Rail Station", "Göttingen" ], [ "ZMB", "Hamburg Hbf Rail Station", "Hamburg" ], [ "ZVR", "Hannover Hbf Rail Station", "Hannover" ], [ "KJR", "Karlsruhe Hauptbahnhof", "Karlsruhe" ], [ "KWQ", "Kassel/Calden", "Kassel" ], [ "QKL", "Köln Hbf Rail Station", "Köln" ], [ "QKU", "Köln Messe/Deutz Bahnhof", "Köln" ], [ "XIT", "Leipzig Hbf Rail Station", "Leipzig/Halle" ], [ "MHJ", "Mannheim Hbf Railway Station", "Mannheim" ], [ "AGY", "Augsburg Hbf Rail Station", "München" ], [ "ZMU", "München Hbf Rail Station", "München" ], [ "MKF", "Münster Hbf", "Münster/Osnabrück" ], [ "ZPE", "Osnabrück Hbf", "Münster/Osnabrück" ], [ "ZAQ", "Nürnberg Hauptbahnhof", "Nürnberg" ], [ "ZPY", "Siegburg/Bonn Bahnhof", "Siegburg/Bonn" ], [ "ZWS", "Stuttgart Hauptbahnhof", "Stuttgart" ], [ "QUL", "Ulm Rail Station", "Ulm" ], [ "QWU", "Würzburg Hauptbahnhof", "Würzburg" ], [ "ZBA", "Basel Bad Rail Station", "Basel" ], [ "ZDH", "Basel SBB Rail Station", "Basel" ], [ "ZDI", "Bellinzona Rail Station", "Bellinzona" ], [ "ZDJ", "Bern Rail Station", "Bern" ], [ "ZDT", "Chur Rail Station", "Chur" ], [ "ZHF", "Fribourg Rail Station", "Fribourg" ], [ "ZHT", "Genf Rail Station", "Genf" ], [ "ZIN", "Interlaken Ost", "Interlaken" ], [ "QLS", "Lausanne Rail Station", "Lausanne" ], [ "QLJ", "Luzern Rail Station", "Luzern" ], [ "QDL", "Lugano Railway Station", "Lugano" ], [ "ZKO", "Sierre/Siders Rail Station", "Sierre" ], [ "XGZ", "Bregenz Rail Station", "Bregenz" ], [ "GGZ", "Graz Rail Station", "Graz" ], [ "LZS", "Linz Rail Station", "Linz" ], [ "ZSB", "Salzburg Hbf Rail Station", "Salzburg" ] ];
    const RAIL_CODES = new Set(RAIL_METRO.map(([code]) => code));
    const STATION_RE = /rail|railway|bahnhof|\bbhf\b|\bhbf\b|bus station|bus stn|harbour|ferry/i;
    const JUNK_PLACE = /ficti?ti?ous|\bfict\b|rail zone|\(generic\)|generic\)?$/i;
    const STATION_SUFFIX = [ /\s+(?:haupt)?bahnhof\b.*$/i, /\s+\b(?:hbf|bf)\b.*$/i, /\s+\b(?:railway|rail|train)\b\s*(?:station|stn\.?)?.*$/i, /\s+\b(?:bus|coach)\b\s*(?:station|stn\.?|stop)?.*$/i, /\s+\b(?:harbour|harbor)\b.*$/i, /\s+ferry\s*terminal\b.*$/i, /\s+off-?\s?line\s*\b(?:pt|point)\b.*$/i ];
    function cityOfPlace(name) {
      return STATION_SUFFIX.reduce((t, re) => t.replace(re, ""), String(name || "").replace(/\s*\([^)]*\)\s*$/, "")).replace(/[\s,\-–]+$/, "").trim() || String(name || "");
    }
    function normPlace(s) {
      return String(s || "").toLowerCase().replace(/\(.*?\)/g, " ").replace(/off-?\s?line\s*(pt|point)?|railway\s*(stn|station)?\.?|rail\s*(stn|station)?|hauptbahnhof|bahnhof|\bhbf\b|bus\s*(stn|station|stop)?|harbour|ferry\s*terminal?/g, " ").replace(/[^a-zà-ÿ0-9]+/g, "");
    }
    const ATLAS_BASE = "https://api.miles-and-more.com/content/v3/atlas/airport-atlas.json";
    const ATLAS_KEY = "agGBZmuTGwFXWzVDg8ckGKGBytemE1nS";
    const ATLAS_STORE = "mmiata_atlas";
    const ATLAS_FORMAT = 7;
    const ATLAS_TTL = 30 * 24 * 3600 * 1e3;
    let atlasPromise = null;
    function fetchAtlasCodes() {
      if (atlasPromise) return atlasPromise;
      atlasPromise = originalFetch.call(window, ATLAS_BASE + "?lang=" + placeLocale().lang, {
        headers: {
          "x-api-key": ATLAS_KEY,
          accept: "application/json"
        }
      }).then(r => r.ok ? r.json() : null).then(j => {
        const codes = [];
        const seen = new Set;
        const cc = {};
        const iso = {};
        const names = {};
        const raw = {};
        const kind = {};
        const rawAll = {};
        const dropped = [];
        const add = code => {
          if (/^[A-Z]{3}$/.test(code) && !seen.has(code)) {
            seen.add(code);
            codes.push(code);
          }
        };
        (j?.language?.countries || []).forEach(c => (c.cities || []).forEach(ct => {
          const cityCode = String(ct.code || "").toUpperCase();
          const countryCode = String(c.code || "").toUpperCase();
          ct.code && c.name && (cc[cityCode] = c.name);
          ct.code && countryCode && (iso[cityCode] = countryCode);
          (ct.airports || []).forEach(a => {
            const code = String(a.code || "").toUpperCase();
            c.name && !cc[code] && (cc[code] = c.name);
            countryCode && !iso[code] && (iso[code] = countryCode);
            const t = String(a.locationType || "");
            if ("Off-Line Point" === t || "Harbour" === t) {
              dropped.push([ code, normPlace(a.name), c.name || "" ]);
              return;
            }
            add(code);
            "Rail Station" === t ? kind[code] = "R" : "Bus Station" === t && (kind[code] = "B");
            const displayName = a.shortName || a.name;
            displayName && !names[code] && (names[code] = displayName);
            a.name && !rawAll[code] && (rawAll[code] = a.name);
          });
          if (!(ct.airports || []).length) {
            if (JUNK_PLACE.test(ct.name || "")) return;
            add(cityCode);
            kind[cityCode] = "C";
            ct.name && !raw[cityCode] && (raw[cityCode] = ct.name);
            ct.name && !rawAll[cityCode] && (rawAll[cityCode] = ct.name);
          }
        }));
        if (!codes.length) return null;
        const place = {};
        codes.forEach(c => {
          const k = normPlace(rawAll[c] || "") + "|" + (cc[c] || "");
          k.length > 1 && !place[k] && (place[k] = c);
        });
        const alias = {};
        dropped.forEach(([code, key, country]) => {
          const hit = place[key + "|" + country];
          hit && hit !== code && (alias[code] = hit);
        });
        const store = {
          v: ATLAS_FORMAT,
          ts: Date.now(),
          lang: placeLocale().lang,
          codes: codes,
          cc: cc,
          iso: iso,
          names: names,
          raw: raw,
          alias: alias,
          kind: kind
        };
        try {
          localStorage.setItem(ATLAS_STORE, JSON.stringify(store));
        } catch (e) {}
        atlasMem = null;
        return store;
      }).catch(() => null).then(c => {
        atlasPromise = null;
        return c;
      });
      return atlasPromise;
    }
    let atlasMem = null;
    function atlasStore() {
      if (atlasMem) return atlasMem;
      let s = null;
      try {
        s = JSON.parse(localStorage.getItem(ATLAS_STORE) || "null");
      } catch (e) {}
      atlasMem = {
        s: s,
        names: s?.names || {},
        raw: s?.raw || {},
        alias: s?.alias || {},
        cc: s?.cc || {},
        iso: s?.iso || {},
        kind: s?.kind || {}
      };
      return atlasMem;
    }
    function atlasData() {
      const hit = atlasStore().s;
      if (hit && hit.v === ATLAS_FORMAT && Array.isArray(hit.codes) && hit.codes.length && hit.lang === placeLocale().lang) {
        Date.now() - (hit.ts || 0) > ATLAS_TTL && fetchAtlasCodes();
        return Promise.resolve(hit);
      }
      return fetchAtlasCodes();
    }
    const CITY_STORE = "mmiata_cities";
    const AIRPORT_STORE = "mmiata_airports";
    let cityNames = null;
    let airportNames = null;
    let namesReady = !1;
    const selfNamed = new Set;
    const byLang = new Map;
    let namesLang = null;
    const pageLang = () => String(document.documentElement?.lang || "");
    function syncNames() {
      const l = pageLang();
      if (l === namesLang) return;
      namesLang = l;
      const e = byLang.get(l);
      countryNames = e ? e.countries : null;
      airportNames = e ? e.airports : null;
      cityNames = e ? e.cities : null;
      namesReady = !!e;
      namesFetched = !1;
      labelCache.clear();
    }
    function keepCityNames(data, lang) {
      const cl = {};
      const map = {};
      const ap = {};
      for (const k of Object.keys(data)) if (data[k]) if (0 === k.lastIndexOf("refx-country-list.", 0)) cl[k.slice(18)] = String(data[k]); else if (0 === k.lastIndexOf("global.cities.", 0)) {
        const code = k.slice(14);
        3 === code.length && (map[code] = String(data[k]));
      } else if (0 === k.lastIndexOf("global.airports.", 0)) {
        const code = k.slice(16);
        3 === code.length && (ap[code] = String(data[k]));
      }
      if (Object.keys(ap).length) {
        byLang.set(lang, {
          countries: Object.keys(cl).length ? cl : null,
          airports: ap,
          cities: map
        });
        try {
          localStorage.setItem(AIRPORT_STORE, JSON.stringify({
            ts: Date.now(),
            lang: lang,
            map: ap
          }));
          localStorage.setItem(CITY_STORE, JSON.stringify({
            ts: Date.now(),
            lang: lang,
            map: map
          }));
        } catch (e) {}
        if (lang === pageLang()) {
          namesLang = null;
          syncNames();
          try {
            reformatFields();
          } catch (e) {}
        }
      }
    }
    const fromStore = storeKey => {
      try {
        const s = JSON.parse(localStorage.getItem(storeKey) || "null");
        return s && s.lang === pageLang() && s.map || {};
      } catch (e) {
        return {};
      }
    };
    const contentBase = () => {
      const b = document.body?.dataset?.dynamiccontentpath;
      return b ? String(b).replace(/\/$/, "") : null;
    };
    function assetLoader(storeKey, path) {
      let value = null, failed = !1, pending = null;
      return {
        get value() {
          return value;
        },
        load() {
          if (value) return Promise.resolve(value);
          if (failed) return Promise.resolve(null);
          try {
            const s = JSON.parse(localStorage.getItem(storeKey) || "null");
            if (s && s.map && Date.now() - (s.ts || 0) <= ATLAS_TTL) {
              value = s.map;
              return Promise.resolve(value);
            }
          } catch (e) {}
          if (pending) return pending;
          const base = contentBase();
          if (!base) return Promise.resolve(null);
          pending = originalFetch.call(window, base + path).then(r => r.ok ? r.text() : null).then(t => {
            if (!t) {
              failed = !0;
              return null;
            }
            65279 === t.charCodeAt(0) && (t = t.slice(1));
            value = JSON.parse(t);
            labelCache.clear();
            try {
              localStorage.setItem(storeKey, JSON.stringify({
                ts: Date.now(),
                map: value
              }));
            } catch (e) {}
            try {
              refreshDisplay();
            } catch (e) {}
            return value;
          }).catch(() => {
            failed = !0;
            return null;
          }).then(m => {
            pending = null;
            return m;
          });
          return pending;
        }
      };
    }
    const cityMapAsset = assetLoader("mmiata_citymap", "/assets/airport-code-city-code.json");
    const countryMapAsset = assetLoader("mmiata_countrymap", "/assets/data/airport-to-country-map/airport-to-country-map.json");
    function cityName(code) {
      if (!code) return null;
      syncNames();
      cityNames || (cityNames = fromStore(CITY_STORE));
      const c = String(code).toUpperCase();
      if (cityNames[c]) return cityNames[c];
      cityMapAsset.load();
      const prim = cityMapAsset.value?.[c];
      return prim && cityNames[String(prim).toUpperCase()] || null;
    }
    function namesStore() {
      syncNames();
      if (!airportNames) {
        airportNames = fromStore(AIRPORT_STORE);
        Object.keys(airportNames).length && (namesReady = !0);
      }
      return airportNames;
    }
    function airportName(code, noFetch) {
      if (!code) return null;
      const up = String(code).toUpperCase();
      const names = namesStore();
      if (names[up] && !selfNamed.has(up)) return names[up];
      const p = placeName(up);
      if (p) return p;
      const st = atlasStore();
      noFetch || !namesReady || st.names[up] || function(code) {
        if (!/^[A-Z]{3}$/.test(code) || placeWanted.has(code)) return;
        const s = placeStore();
        if (void 0 !== s.names[code]) return;
        if (s.gaveUp) return;
        placeWanted.add(code);
        const loc = placeLocale();
        placeQueue = placeQueue.then(() => placeStore().gaveUp ? null : originalFetch.call(window, `${PLACE_URL}&site=${loc.site}&lang=${loc.lang}&query=${code}`).then(r => r && r.ok ? r.json() : null).then(j => {
          if (null === j && placeStore().gaveUp) return;
          const hit = (j?.items || []).find(i => String(i.code || "").toUpperCase() === code);
          s.names[code] = hit ? String(hit.airport || "") : "";
          hit && hit.country && (s.countries[code] = String(hit.country));
          if (hit) {
            s.misses = 0;
            s.hits = (s.hits || 0) + 1;
          } else if (!s.hits) {
            s.misses = (s.misses || 0) + 1;
            s.misses >= MISS_LIMIT && (s.gaveUp = !0);
          }
          try {
            localStorage.setItem(PLACE_STORE, JSON.stringify(s));
          } catch (e) {}
          s.names[code] && function() {
            if (!placeDirty && !state.superseded) {
              placeDirty = !0;
              setTimeout(() => {
                placeDirty = !1;
                if (!state.superseded) try {
                  refreshDisplay();
                } catch (e) {}
              }, 120);
            }
          }();
        }).catch(() => {})).then(() => new Promise(r => setTimeout(r, 250)));
      }(up);
      return names[up] || st.names[up] || st.raw[up] || null;
    }
    const PLACE_URL = "https://www.lufthansa.com/service/api/suggestions/airports" + "?rep=airportsReq&start=0&rd=y&portal=MM";
    const PLACE_STORE = "mmiata_places";
    let placeCache = null;
    const placeWanted = new Set;
    let placeQueue = Promise.resolve();
    let placeDirty = !1;
    function placeLocale() {
      const l = String(document.documentElement?.lang || "de-DE");
      const m = /^([a-z]{2})-([A-Z]{2})$/.exec(l);
      return m ? {
        lang: m[1],
        site: m[2]
      } : {
        lang: "de",
        site: "DE"
      };
    }
    function placeStore() {
      if (placeCache) return placeCache;
      try {
        placeCache = JSON.parse(localStorage.getItem(PLACE_STORE) || "null") || {};
      } catch (e) {
        placeCache = {};
      }
      const key = placeLocale().lang;
      placeCache.lang !== key && (placeCache = {
        lang: key,
        names: {},
        countries: {},
        misses: 0,
        hits: 0,
        gaveUp: !1
      });
      placeCache.names || (placeCache.names = {});
      placeCache.countries || (placeCache.countries = {});
      return placeCache;
    }
    const placeName = code => placeStore().names[code] || null;
    const placeCountry = code => placeStore().countries[code] || null;
    const MISS_LIMIT = 8;
    function aliasOf(code) {
      return code && atlasStore().alias[String(code).toUpperCase()] || null;
    }
    function countryOf(code) {
      if (!code) return null;
      const up = String(code).toUpperCase();
      const fromPage = function(code) {
        syncNames();
        if (!countryNames) return null;
        const iso = isoOf(code);
        return iso && countryNames[iso] || null;
      }(up);
      if (fromPage) return fromPage;
      countryMapAsset.value || countryMapAsset.load();
      return atlasStore().cc[up] || placeCountry(up) || null;
    }
    function isoOf(code) {
      const up = String(code || "").toUpperCase();
      return atlasStore().iso[up] || countryMapAsset.value?.[up] || null;
    }
    let countryNames = null;
    const LOCALE_RE = /\/[a-z]{2}-[A-Za-z]{2,4}\.json(\?|$)/;
    window.__mmIataHooks = {
      on: () => smartOn() || iataListOn(),
      extend: async function(response) {
        const data = await response.clone().json();
        if (!Array.isArray(data.defaultAirportList)) return response;
        state.baseCodes = data.defaultAirportList.slice();
        const seen = new Set(data.defaultAirportList);
        let added = 0;
        const add = code => {
          if (code && !seen.has(code)) {
            data.defaultAirportList.push(code);
            seen.add(code);
            added++;
          }
        };
        if (iataListOn()) {
          try {
            ((await atlasData())?.codes || []).forEach(add);
          } catch (e) {}
          RAIL_METRO.forEach(([code]) => add(code));
          EXTRA_AIRPORTS.forEach(([code]) => add(code));
        }
        state.added = added;
        if (smartOn()) try {
          const cmap = await cityMapAsset.load() || {};
          const atlas = await atlasData();
          const atlasSet = atlas && atlas.codes ? new Set(atlas.codes) : null;
          const L = data.defaultAirportList;
          const prim = c => cmap[c] || c;
          const rankOf = new Map(L.map(c => [ c, RAIL_CODES.has(c) || STATION_RE.test(airportName(c, !0) || "") || atlasSet && !atlasSet.has(c) && cmap[c] ? 1 : 0 ]));
          const groupMin = new Map;
          const orig = new Map;
          L.forEach((c, i) => {
            orig.set(c, i);
            const p = prim(c);
            groupMin.has(p) || groupMin.set(p, i);
          });
          L.sort((a, b) => groupMin.get(prim(a)) - groupMin.get(prim(b)) || rankOf.get(a) - rankOf.get(b) || orig.get(a) - orig.get(b));
        } catch (e) {}
        state.codeList = data.defaultAirportList.slice();
        try {
          window.dispatchEvent(new Event("mmiata:list"));
        } catch (e) {}
        if (window.__mmSuggest && smartOn()) {
          const list = state.baseCodes.slice();
          const seenBase = new Set(list);
          let running = [];
          try {
            running = window.__mmsuHooks?.codes?.() || [];
          } catch (e) {}
          running.forEach(c => {
            if (c && !seenBase.has(c)) {
              list.push(c);
              seenBase.add(c);
            }
          });
          data.defaultAirportList = list;
        }
        state.appCodes = new Set(data.defaultAirportList);
        return new Response(JSON.stringify(data), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      },
      locale: async function(response) {
        const data = await response.clone().json();
        try {
          window.dispatchEvent(new CustomEvent("mmiata:locale", {
            detail: data
          }));
        } catch (e) {}
        let changed = 0;
        if (iataListOn()) {
          try {
            await atlasData();
            const atl = atlasStore().names;
            const raw = atlasStore().raw;
            const pl = placeStore().names;
            Object.keys(atl).concat(Object.keys(raw)).forEach(code => {
              const aKey = "global.airports." + code;
              const cKey = "global.cities." + code;
              if (data[aKey] || data[cKey]) return;
              const full = pl[code] || atl[code] || raw[code];
              data[aKey] = full;
              data[cKey] = cityOfPlace(full);
              atl[code] || selfNamed.add(code);
            });
          } catch (e) {}
          for (const [code, name, metro] of RAIL_METRO.concat(EXTRA_AIRPORTS)) {
            const aKey = "global.airports." + code;
            const cKey = "global.cities." + code;
            if (!data[aKey]) {
              data[aKey] = name;
              changed++;
            }
            const city = data[cKey];
            if (city) {
              if (-1 === String(city).indexOf(metro)) {
                data[cKey] = city + " / " + metro;
                changed++;
              }
            } else {
              data[cKey] = metro;
              changed++;
            }
          }
        }
        Object.keys(data).forEach(k => {
          const v = data[k];
          if (!("string" != typeof v || v.indexOf("} - - {") < 0)) {
            data[k] = v.split("} - - {").join("} - {");
            changed++;
          }
        });
        try {
          window.dispatchEvent(new Event("mmiata:names"));
        } catch (e) {}
        keepCityNames(data, (/\/([a-z]{2}-[A-Za-z]{2,4})\.json(\?|$)/.exec(response.url || "") || [])[1] || pageLang());
        if (smartOn()) try {
          await atlasData();
          Object.keys(data).forEach(k => {
            if (0 !== k.indexOf("global.airports.")) return;
            const iso = isoOf(k.slice(16));
            const country = iso && data["refx-country-list." + iso];
            const v = data[k];
            if (country && "string" == typeof v && -1 === v.indexOf(country)) {
              data[k] = v + " · " + country;
              changed++;
            }
          });
        } catch (e) {}
        return changed ? new Response(JSON.stringify(data), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        }) : response;
      }
    };
    if (!window.__mmIataHooked) {
      window.__mmIataHooked = !0;
      const baseFetch = window.fetch;
      window.fetch = async function(...args) {
        const url = "string" == typeof args[0] ? args[0] : args[0] && args[0].url || "";
        const res = await baseFetch.apply(this, args);
        const h = window.__mmIataHooks;
        if (!h?.on?.()) return res;
        if (DEFAULT_AIRPORTS_RE.test(url)) try {
          return await h.extend(res);
        } catch (e) {
          return res;
        }
        if (h.locale && LOCALE_RE.test(url)) try {
          return await h.locale(res);
        } catch (e) {
          return res;
        }
        return res;
      };
    }
    state.hooked = !0;
    state.cityName = cityName;
    state.placeLabel = code => {
      const l = optionLabel(String(code || "").toUpperCase());
      return l ? l.replace(/ \([A-Z0-9]{3}\)$/, "") : null;
    };
    const esc = s => String(null == s ? "" : s).replace(/[&<>"]/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    }[c]));
    const protoValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    const normName = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const labelCache = new Map;
    function optionLabel(code) {
      if (labelCache.has(code)) return labelCache.get(code);
      const label = (() => {
        const anRaw = airportName(code);
        if (!anRaw) return null;
        const an = String(anRaw).replace(/\s+/g, " ").trim();
        const cnRaw = cityName(code);
        const cn = cnRaw ? String(cnRaw).replace(/\s+/g, " ").trim() : null;
        if (!cn) return an + " (" + code + ")";
        if (-1 !== normName(cn).indexOf(normName(an))) return cn + " (" + code + ")";
        const place = function(an, cn) {
          const cands = [ cn ].concat(String(cn).split("/")).map(s => s.trim()).filter(s => s.length > 2).sort((a, b) => b.length - a.length);
          let p = an;
          for (let round = 0; round < 2; round++) for (const c of cands) {
            const n = normName(c), np = normName(p);
            0 === np.lastIndexOf(n + " ", 0) ? p = p.slice(c.length + 1) : np.length > n.length && -1 !== np.indexOf(" " + n, np.length - n.length - 1) && (p = p.slice(0, p.length - c.length - 1));
          }
          p = p.replace(/^[-–,.\s]+|[-–,.\s]+$/g, "");
          const paren = /^\((.+)\)$/.exec(p);
          return paren ? paren[1] : p;
        }(an, cn);
        return place ? cn + ", " + place + " (" + code + ")" : cn + " (" + code + ")";
      })();
      labelCache.set(code, label);
      return label;
    }
    function highlighted(label, query) {
      const q = (query || "").trim();
      if (q.length < 2) return esc(label);
      const i = label.toLowerCase().indexOf(q.toLowerCase());
      return -1 === i ? esc(label) : esc(label.slice(0, i)) + '<span class="highlight-match">' + esc(label.slice(i, i + q.length)) + "</span>" + esc(label.slice(i + q.length));
    }
    function refreshDisplay() {
      formatOptions(!0);
      reformatFields();
    }
    let namesFetched = !1;
    const FMT_CHUNK = 120;
    let fmtTimer = null;
    function formatOptions(force) {
      if (state.superseded || !smartOn()) return;
      const opts = document.querySelectorAll(PANEL_SEL + " mat-option");
      if (!opts.length) return;
      !function() {
        if (namesFetched) return;
        namesStore();
        if (namesReady) return;
        namesFetched = !0;
        const base = contentBase();
        if (!base) return;
        const lang = pageLang();
        lang && originalFetch.call(window, `${base}/${lang}.json`).then(r => r.ok ? r.json() : null).then(d => {
          if (d) {
            keepCityNames(d, lang);
            refreshDisplay();
          }
        }).catch(() => {});
      }();
      let q = "";
      const ae = document.activeElement;
      if (ae && "INPUT" === ae.tagName && protoValue && protoValue.get) try {
        q = String(protoValue.get.call(ae));
      } catch (e) {}
      let rebuilt = 0;
      for (const opt of opts) {
        const line = opt.querySelector(".mdc-list-item__primary-text");
        if (!line) continue;
        if (!force && opt.dataset.mmiataFmt && line.querySelector(".mmiata-opt")) continue;
        const m = /\(([A-Z0-9]{3})\)\s*$/.exec(line.textContent || "");
        const code = m ? m[1] : line.querySelector(".mmiata-opt") ? opt.dataset.mmiataFmt : null;
        if (!code) continue;
        if (rebuilt >= FMT_CHUNK) {
          fmtTimer || (fmtTimer = setTimeout(() => {
            fmtTimer = null;
            formatOptions(force);
          }, 40));
          return;
        }
        const label = optionLabel(code);
        if (null == label) continue;
        const country = smartOn() ? countryOf(code) : null;
        line.innerHTML = '<span class="mmiata-opt">' + '<span class="mmiata-opt-main">' + highlighted(label, q) + "</span>" + (country ? '<span class="mmiata-opt-country">' + esc(country) + "</span>" : "") + "</span>";
        opt.classList.toggle("mmiata-two", !!country);
        opt.dataset.mmiataFmt = code;
        rebuilt++;
      }
    }
    function reformatFields() {
      smartOn() && protoValue && protoValue.get && document.querySelectorAll(FIELD_SEL).forEach(el => {
        if (!el.__mmiataPatched) return;
        const v = protoValue.get.call(el);
        const m = /\(([A-Z0-9]{3})\)\s*$/.exec(String(v || ""));
        if (!m) return;
        const label = optionLabel(m[1]);
        if (label && label !== v) {
          el.__mmiataOrig = v;
          el.__mmiataDisp = label;
          protoValue.set.call(el, label);
        }
      });
    }
    const FIELD_SEL = 'input[id$="origin"], input[id$="destination"]';
    const PANEL_SEL = ".mat-mdc-autocomplete-panel";
    const inPanel = n => {
      const el = 1 === n.nodeType ? n : n.parentElement;
      return !!el && (!!el.closest(PANEL_SEL) || 1 === n.nodeType && !!n.querySelector(PANEL_SEL));
    };
    function patchInputs() {
      if (!protoValue || !protoValue.get) return () => {};
      const desc = protoValue;
      const done = new WeakSet;
      const patch = input => {
        if (!done.has(input)) {
          done.add(input);
          Object.defineProperty(input, "value", {
            get() {
              const v = desc.get.call(this);
              return null != this.__mmiataOrig && v === this.__mmiataDisp ? this.__mmiataOrig : smartOn() && /^[A-Za-z]{3}$/.test(v) ? "(" + (aliasOf(v) || v.toUpperCase()) + ")" : v;
            },
            set(v) {
              this.__mmiataOrig = null;
              if (smartOn()) {
                const m = /\(([A-Z0-9]{3})\)\s*$/.exec(String(v ?? ""));
                const label = m ? optionLabel(m[1]) : null;
                if (label && label !== v) {
                  this.__mmiataOrig = v;
                  this.__mmiataDisp = label;
                  v = label;
                }
              }
              desc.set.call(this, v);
            },
            configurable: !0
          });
          input.__mmiataPatched = !0;
          state.patched++;
          reformatFields();
        }
      };
      !function() {
        const css = `
.mat-mdc-autocomplete-panel mat-option { content-visibility: auto; contain-intrinsic-size: auto 48px; }
.mat-mdc-autocomplete-panel mat-option .mmiata-opt { display: flex; flex-direction: column;
    align-items: flex-start; line-height: 1.35; padding: 3px 0; }
.mat-mdc-autocomplete-panel mat-option .mmiata-opt-country { font-size: 11px; color: #898781; }
.mat-mdc-autocomplete-panel mat-option.mmiata-two { height: auto; min-height: 48px; }`;
        let el = document.getElementById("mmiata-styles");
        if (!el) {
          el = document.createElement("style");
          el.id = "mmiata-styles";
          document.head.appendChild(el);
        }
        el.textContent !== css && (el.textContent = css);
      }();
      document.querySelectorAll(FIELD_SEL).forEach(patch);
      try {
        formatOptions();
      } catch (e) {}
      const obs = new MutationObserver(records => {
        if (state.superseded) return;
        let options = !1;
        for (const r of records) for (const n of r.addedNodes) {
          if (1 === n.nodeType) {
            if (n.classList.contains("mmiata-opt")) continue;
            n.matches(FIELD_SEL) ? patch(n) : n.firstElementChild && n.querySelectorAll(FIELD_SEL).forEach(patch);
          }
          !options && inPanel(n) && (options = !0);
        }
        if (options) try {
          formatOptions();
        } catch (e) {}
      });
      document.body && obs.observe(document.body, {
        childList: !0,
        subtree: !0
      });
      return () => obs.disconnect();
    }
    "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", () => {
      state.superseded || (state._stop = patchInputs());
    }) : state._stop = patchInputs();
    try {
      window.addEventListener("pagehide", e => {
        if ((!e || !e.persisted) && state._stop) {
          try {
            state._stop();
          } catch (e2) {}
          state._stop = null;
        }
      });
      window.addEventListener("pageshow", e => {
        e && e.persisted && !state._stop && !state.superseded && (state._stop = patchInputs());
      });
    } catch (e) {}
    state.airportName = airportName;
    state.countryOf = countryOf;
    state.cityOfPlace = cityOfPlace;
    state.aliasOf = aliasOf;
    state.isoOf = isoOf;
    state.countryNameOf = iso => {
      syncNames();
      return countryNames?.[String(iso || "").toUpperCase()] || null;
    };
    state.redraw = () => {
      syncNames();
      refreshDisplay();
      try {
        window.dispatchEvent(new Event("mmiata:names"));
      } catch (e) {}
    };
    state.kindOf = code => atlasStore().kind[String(code || "").toUpperCase()] || "A";
    state.optionLabel = code => optionLabel(String(code || "").toUpperCase());
  })();
  (() => {
    "use strict";
    const VERSION = 3;
    if (window.__mmPageLang && window.__mmPageLang.version >= VERSION) return;
    try {
      window.__mmPageLang?._observer?.disconnect();
    } catch (e) {}
    const state = {
      version: VERSION
    };
    try {
      Object.defineProperty(window, "__mmPageLang", {
        value: state,
        enumerable: !1,
        configurable: !0
      });
    } catch (e) {
      try {
        window.__mmPageLang = state;
      } catch (e2) {}
    }
    const EXTRA = [ "uk-UA" ];
    const BEFORE = {
      "uk-UA": "ru-RU"
    };
    const CHOICE = "mm_page_lang";
    const LANG_URL = "https://raw.githubusercontent.com/wedge256/mm-patcher/v1.10.0/lang/{code}.json";
    const FILE_RE = /\/(uk-UA)\.json(\?|$)/;
    const ANY_FILE_RE = /\/statics\/reward\/content\/.*\/[a-z]{2}-[A-Za-z]{2,4}\.json(\?|$)/;
    const NAME_FIX = [ "Украї́нська", "Українська" ];
    const store_get = k => {
      try {
        return localStorage.getItem(k);
      } catch (e) {
        return null;
      }
    }, store_set = (k, v) => {
      try {
        null == v ? localStorage.removeItem(k) : localStorage.setItem(k, v);
      } catch (e) {}
    };
    const textsCache = new Map;
    async function texts(locale) {
      const url = (locale => LANG_URL ? LANG_URL.replace("/lang/{code}.json", "/lang/app/" + locale + ".json") : "")(locale);
      if (!url) return {};
      if (textsCache.has(url)) return textsCache.get(url);
      const key = "mm_applang_" + locale;
      let data = null;
      try {
        const kept = JSON.parse(store_get(key) || "null");
        kept && kept.url === url && (data = kept.texts);
      } catch (e) {}
      if (!data) try {
        const res = await fetch(url);
        data = res.ok ? await res.json() : {};
        store_set(key, JSON.stringify({
          url: url,
          texts: data
        }));
      } catch (e) {
        data = {};
      }
      const flat = {};
      for (const k in data) "@" !== k.charAt(0) && "string" == typeof data[k] && (flat[k] = data[k]);
      textsCache.set(url, flat);
      return flat;
    }
    window.__mmPageLangHooks = {
      file: async (url, init, baseFetch) => {
        const locale = FILE_RE.exec(url)[1];
        const [res, ours] = await Promise.all([ baseFetch(url.replace(FILE_RE, "/en-GB.json$2"), init), texts(locale) ]);
        if (!res.ok) return res;
        const data = await res.json();
        let regions = null;
        try {
          regions = new Intl.DisplayNames([ locale ], {
            type: "region"
          });
        } catch (e) {}
        if (regions) for (const k in data) {
          const m = /^refx-country-list\.([A-Z]{2})$/.exec(k);
          if (m) try {
            const n = regions.of(m[1]);
            n && n !== m[1] && (data[k] = n);
          } catch (e) {}
        }
        Object.assign(data, ours);
        return new Response(JSON.stringify(data).split(NAME_FIX[0]).join(NAME_FIX[1]), {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        });
      },
      name: async res => {
        const text = await res.text();
        return new Response(text.split(NAME_FIX[0]).join(NAME_FIX[1]), {
          status: res.status,
          statusText: res.statusText,
          headers: res.headers
        });
      }
    };
    if (!window.__mmPageLangHooked) {
      window.__mmPageLangHooked = !0;
      const baseFetch = window.fetch;
      window.fetch = function(...args) {
        const url = "string" == typeof args[0] ? args[0] : args[0] && args[0].url || "";
        return FILE_RE.test(url) && /\/statics\/reward\/content\//.test(url) ? window.__mmPageLangHooks.file(url, args[1], (u, i) => baseFetch.call(window, u, i)) : ANY_FILE_RE.test(url) ? baseFetch.apply(this, args).then(res => res.ok ? window.__mmPageLangHooks.name(res).catch(() => res) : res) : baseFetch.apply(this, args);
      };
    }
    let listened = !1, restored = !1;
    const patched = new WeakSet;
    async function apply() {
      const s = function() {
        try {
          for (const t of window.getAllAngularTestabilities ? window.getAllAngularTestabilities() : []) {
            let loc = null, app = null;
            t?._destroyRef?.records?.forEach(r => {
              const v = r?.value;
              if (v && "object" == typeof v) {
                loc || "function" != typeof v.useLanguage || "function" != typeof v.getTranslateService || (loc = v);
                !app && "function" == typeof v.tick && Array.isArray(v.components) && (app = v);
              }
            });
            if (loc && app) return {
              loc: loc,
              app: app
            };
          }
        } catch (e) {}
        return null;
      }();
      if (!s) return !1;
      const {loc: loc, app: app} = s;
      for (const list of [ loc.getLanguages && loc.getLanguages(), loc.supportedLocales, loc.configuration && loc.configuration.supportedLocales ]) Array.isArray(list) && EXTRA.forEach(l => {
        list.includes(l) || list.push(l);
      });
      if (!listened) {
        listened = !0;
        loc.getTranslateService().onLangChange.subscribe(e => {
          EXTRA.includes(e.lang) ? store_set(CHOICE, e.lang) : restored && store_set(CHOICE, null);
        });
      }
      const comp = function(app) {
        const seen = new Set;
        const stack = app.components.map(c => c.hostView && c.hostView._lView);
        for (;stack.length; ) {
          const view = stack.pop();
          if (Array.isArray(view) && !seen.has(view)) {
            seen.add(view);
            for (const x of view) if (Array.isArray(x)) stack.push(x); else if (x && "function" == typeof x.getFilteredLanguageList$ && x.languageSelectFormControl) return x;
          }
        }
        return null;
      }(app);
      if (!comp) return !1;
      if (!patched.has(comp)) {
        patched.add(comp);
        const cfg = await (obs = comp.config$, new Promise(res => {
          let sub = null, done = !1;
          sub = obs.subscribe(v => {
            if (!done) {
              done = !0;
              res(v);
              setTimeout(() => sub && sub.unsubscribe(), 0);
            }
          });
        }));
        const langs = (cfg.languages || []).filter(l => !EXTRA.includes(l));
        EXTRA.forEach(l => {
          const i = langs.indexOf(BEFORE[l]);
          i >= 0 ? langs.splice(i, 0, l) : langs.push(l);
        });
        comp.dynamicConfig$.next(Object.assign({}, cfg, {
          languages: langs
        }));
        comp.filteredLanguageList$ = comp.getFilteredLanguageList$();
        app.tick();
      }
      var obs;
      const wanted = store_get(CHOICE);
      if (!restored) {
        restored = !0;
        EXTRA.includes(wanted) && document.documentElement.lang !== wanted && comp.languageSelectFormControl.setValue(wanted);
      }
      return !0;
    }
    let busy = !1, doneFor = null;
    const check = () => {
      const el = document.querySelector("refx-header-language-selector-pres");
      if (el && el !== doneFor && !busy) {
        busy = !0;
        apply().then(ok => {
          ok && (doneFor = el);
        }).catch(() => {}).finally(() => {
          busy = !1;
        });
      }
    };
    const mo = new MutationObserver(check);
    state._observer = mo;
    const start = () => {
      mo.observe(document.documentElement, {
        childList: !0,
        subtree: !0
      });
      check();
    };
    document.documentElement ? start() : document.addEventListener("DOMContentLoaded", start, {
      once: !0
    });
    state.apply = apply;
  })();
  (() => {
    "use strict";
    const VERSION = 41;
    if (window.__mmSuggest && window.__mmSuggest.version >= VERSION) return;
    const T = (s, p) => window.__mmI18n ? window.__mmI18n.t(s, p) : p ? String(s).replace(/\{(\w+)\}/g, (m, k) => null != p[k] ? String(p[k]) : m) : String(s);
    if (window.__mmSuggest) try {
      window.__mmSuggest.superseded = !0;
      window.__mmSuggest.teardown();
    } catch (e) {}
    const INK_muted = "#898781", INK_hairline = "#e1e0d9";
    const state = {
      version: VERSION,
      indexed: 0,
      lastHits: 0,
      lastMs: 0,
      superseded: !1
    };
    try {
      Object.defineProperty(window, "__mmSuggest", {
        value: state,
        enumerable: !1,
        configurable: !0
      });
    } catch (e) {
      window.__mmSuggest = state;
    }
    const iata = () => window.__mmIata || null;
    const isActive = () => !(window.__mmSettings && !1 === window.__mmSettings.get("smartsearch") || !(index && index.length || buildIndex()));
    const EXTRA = {
      "ß": "ss",
      "ø": "o",
      "đ": "d",
      "ð": "d",
      "ł": "l",
      "æ": "ae",
      "œ": "oe",
      "þ": "th",
      "ı": "i",
      "ħ": "h",
      "ŋ": "n",
      "ʻ": ""
    };
    function fold(s) {
      let out = String(s ?? "").toLowerCase();
      out = out.replace(/[ßøđðłæœþıħŋʻ]/g, c => EXTRA[c] || c);
      return out.normalize("NFD").replace(/[̀-ͯ]/g, "");
    }
    const UMLAUT = {
      "ä": "ae",
      "ö": "oe",
      "ü": "ue",
      "å": "aa",
      "ø": "oe"
    };
    function haystack(s) {
      return " " + fold(s) + " ";
    }
    function haystackDe(s) {
      const a = fold(s), b = function(s) {
        return fold(String(s ?? "").toLowerCase().replace(/[äöüåø]/g, c => UMLAUT[c] || c));
      }(s);
      return b === a ? null : " " + b + " ";
    }
    let index = null;
    function buildIndex() {
      const I = iata();
      if (!I || !Array.isArray(I.codeList) || !I.codeList.length) return !1;
      const home = function() {
        const I = iata();
        const m = /^[a-z]{2}-([A-Z]{2})$/.exec(String(document.documentElement.lang || ""));
        return m && I && I.countryNameOf && I.countryNameOf(m[1]) || null;
      }();
      const basis = new Set(I.baseCodes || []);
      const list = [];
      I.codeList.forEach((code, pos) => {
        const city = I.cityName && I.cityName(code) || "";
        const place = I.airportName && I.airportName(code, !0) || "";
        const country = I.countryOf && I.countryOf(code) || "";
        list.push({
          code: code,
          city: city,
          place: place,
          country: country,
          hc: haystack(city),
          hcDe: haystackDe(city),
          hp: haystack(place),
          hpDe: haystackDe(place),
          hk: haystack(country),
          kind: I.kindOf ? I.kindOf(code) : "A",
          rel: (basis.has(code) ? 0 : 1) + (home && country === home ? 0 : 1),
          pos: pos
        });
      });
      index = list;
      state.indexed = list.length;
      return !0;
    }
    const KIND_RANK = {
      A: 0,
      R: 1,
      B: 2,
      C: 3
    };
    function search(query, limit) {
      if (!index && !buildIndex()) return [];
      const q = fold(query).trim();
      if (!q) return [];
      const t0 = performance.now();
      const I = iata();
      const alias = 3 === q.length && I && I.aliasOf ? I.aliasOf(q.toUpperCase()) : null;
      const qc = q.toUpperCase();
      const fullCode = 3 === q.length;
      const sp = " " + q;
      const hits = [];
      for (let i = 0; i < index.length; i++) {
        const e = index[i];
        let tier;
        if (fullCode && e.code === qc || alias && e.code === alias) tier = 0; else if (0 === e.hc.indexOf(sp) || e.hcDe && 0 === e.hcDe.indexOf(sp)) tier = 1; else if (0 === e.hp.indexOf(sp) || e.hpDe && 0 === e.hpDe.indexOf(sp)) tier = 2; else if (0 === e.code.indexOf(qc)) tier = 3; else if (e.hc.indexOf(sp) > 0 || e.hp.indexOf(sp) > 0 || e.hcDe && e.hcDe.indexOf(sp) > 0 || e.hpDe && e.hpDe.indexOf(sp) > 0) tier = 4; else if (e.hk.indexOf(sp) >= 0) tier = 5; else {
          if (!(e.hc.indexOf(q) >= 0 || e.hp.indexOf(q) >= 0 || e.hcDe && e.hcDe.indexOf(q) >= 0 || e.hpDe && e.hpDe.indexOf(q) >= 0)) continue;
          tier = 6;
        }
        e.tier = tier;
        hits.push(e);
      }
      hits.sort((a, b) => a.tier - b.tier || (3 === a.tier ? a.code < b.code ? -1 : a.code > b.code ? 1 : 0 : 0) || a.rel - b.rel || (KIND_RANK[a.kind] || 0) - (KIND_RANK[b.kind] || 0) || a.pos - b.pos);
      state.lastHits = hits.length;
      state.lastMs = +(performance.now() - t0).toFixed(1);
      return limit ? hits.slice(0, limit) : hits;
    }
    const ROW_H = 44;
    const PANEL_H = 264;
    const BUFFER = 4;
    let host = null, panel = null, viewport = null, spacer = null, rows = null;
    let current = [];
    let active = -1;
    let field = null;
    const pool = [];
    function makeRow() {
      const row = document.createElement("div");
      row.className = "mmsg-row";
      row.setAttribute("role", "option");
      const main = document.createElement("span");
      main.className = "mmsg-main";
      const name = markable();
      const code = document.createElement("span");
      code.className = "mmsg-code";
      const tag = document.createElement("span");
      tag.className = "mmsg-tag";
      main.appendChild(name);
      main.appendChild(document.createTextNode(" "));
      main.appendChild(code);
      main.appendChild(tag);
      const sub = document.createElement("span");
      sub.className = "mmsg-sub";
      const countryEl = markable();
      sub.appendChild(countryEl);
      row.appendChild(main);
      row.appendChild(sub);
      row._name = name;
      row._code = code;
      row._tag = tag;
      row._country = countryEl;
      return row;
    }
    function markable() {
      const bdi = document.createElement("bdi");
      bdi.appendChild(document.createTextNode(""));
      const b = document.createElement("b");
      b.appendChild(document.createTextNode(""));
      bdi.appendChild(b);
      bdi.appendChild(document.createTextNode(""));
      return bdi;
    }
    function setMarked(bdi, text, q) {
      const t = String(text ?? "");
      const kids = bdi.childNodes;
      const h = q ? fold(t) : "";
      const at = q && h.length === t.length ? h.indexOf(q) : -1;
      if (at < 0) {
        kids[0].nodeValue = t;
        kids[1].firstChild.nodeValue = "";
        kids[2].nodeValue = "";
      } else {
        kids[0].nodeValue = t.slice(0, at);
        kids[1].firstChild.nodeValue = t.slice(at, at + q.length);
        kids[2].nodeValue = t.slice(at + q.length);
      }
    }
    const kindTag = kind => "R" === kind ? T("Bahnhof") : "B" === kind ? T("Bus") : "C" === kind ? T("Ort") : "";
    const SAYS_STATION = /bahnhof|hbf|\brail\b|railway|\bstn\b|station|busbahnhof|\bbus\b/i;
    let lastQuery = "";
    let drawQueued = !1;
    let viewH = PANEL_H;
    function scheduleDraw() {
      if (!drawQueued) {
        drawQueued = !0;
        requestAnimationFrame(() => {
          drawQueued = !1;
          draw();
        });
      }
    }
    function draw() {
      if (!panel) return;
      const I = iata();
      const top = viewport.scrollTop;
      const first = Math.max(0, Math.floor(top / ROW_H) - BUFFER);
      const last = Math.min(current.length, Math.ceil((top + viewH) / ROW_H) + BUFFER);
      const n = Math.max(0, last - first);
      for (;pool.length < n; ) {
        const r = makeRow();
        pool.push(r);
        rows.appendChild(r);
      }
      for (let k = 0; k < pool.length; k++) {
        const row = pool[k];
        if (k >= n) {
          "none" !== row.style.display && (row.style.display = "none");
          continue;
        }
        const i = first + k;
        const e = current[i];
        I && I.airportName && I.airportName(e.code);
        row.style.display = "";
        row.style.top = i * ROW_H + "px";
        row.dataset.i = i;
        const selected = i === active;
        if (row._active !== selected) {
          row._active = selected;
          row.classList.toggle("mmsg-active", selected);
          row.setAttribute("aria-selected", selected ? "true" : "false");
        }
        const showCity = e.city && e.place && fold(e.place).indexOf(fold(e.city)) < 0;
        setMarked(row._name, (showCity ? e.city + ", " : "") + (e.place || e.city), lastQuery);
        row._code.textContent = e.code;
        const tag = SAYS_STATION.test(e.place || "") ? "" : kindTag(e.kind);
        row._tag.textContent !== tag && (row._tag.textContent = tag);
        setMarked(row._country, e.country, lastQuery);
      }
    }
    let geom = null;
    let placeQueued = !1;
    function measure() {
      const r = field.getBoundingClientRect();
      const rb = (field.closest(".mat-mdc-form-field") || field).getBoundingClientRect();
      const bottom = Math.round(r.bottom + 6);
      const space = window.innerHeight - bottom - 8;
      if (space < 120 && r.top > space) {
        const h = Math.min(PANEL_H, Math.round(r.top - 14));
        geom = {
          left: Math.round(rb.left),
          width: Math.round(rb.width),
          top: Math.round(r.top - 6 - h),
          height: h
        };
      } else geom = {
        left: Math.round(rb.left),
        width: Math.round(rb.width),
        top: bottom,
        height: Math.min(PANEL_H, Math.max(88, space))
      };
    }
    function fitViewport() {
      if (!geom) return;
      const h = Math.min(geom.height, Math.max(ROW_H, current.length * ROW_H));
      viewport.style.height = h + "px";
      viewH = h;
    }
    function place(remeasure) {
      if (!panel || !field) return;
      !remeasure && geom || measure();
      const g = geom;
      panel.style.left = g.left + "px";
      panel.style.width = g.width + "px";
      panel.style.top = g.top + "px";
      fitViewport();
    }
    function schedulePlace() {
      if (!placeQueued && visible()) {
        placeQueued = !0;
        requestAnimationFrame(() => {
          placeQueued = !1;
          if (visible()) {
            place(!0);
            draw();
          }
        });
      }
    }
    function show(input, query) {
      !function() {
        if (panel) return panel;
        host = document.createElement("div");
        host.className = "mmsg-host";
        host.style.cssText = "position:absolute;top:0;left:0;width:0;height:0";
        const root = host.attachShadow({
          mode: "open"
        });
        const style = document.createElement("style");
        style.textContent = css;
        root.appendChild(style);
        panel = document.createElement("div");
        panel.className = "mmsg-panel";
        panel.setAttribute("role", "listbox");
        viewport = document.createElement("div");
        viewport.className = "mmsg-viewport";
        spacer = document.createElement("div");
        spacer.className = "mmsg-spacer";
        rows = document.createElement("div");
        rows.className = "mmsg-rows";
        spacer.appendChild(rows);
        viewport.appendChild(spacer);
        panel.appendChild(viewport);
        root.appendChild(panel);
        document.body.appendChild(host);
        try {
          window.__mmDark?.adopt?.(style.sheet, !0);
        } catch (e) {}
        viewport.addEventListener("scroll", scheduleDraw, {
          passive: !0
        });
        panel.addEventListener("mousedown", ev => {
          const row = ev.target.closest && ev.target.closest(".mmsg-row");
          if (row) {
            ev.preventDefault();
            pick(+row.dataset.i);
          }
        });
      }();
      const newField = field !== input;
      field = input;
      !newField && geom || measure();
      lastQuery = fold(query).trim();
      current = search(query, 0);
      active = current.length ? 0 : -1;
      spacer.style.height = current.length * ROW_H + "px";
      fitViewport();
      viewport.scrollTop = 0;
      panel.style.display = current.length ? "block" : "none";
      place();
      draw();
    }
    function hide() {
      if (panel) {
        panel.style.display = "none";
        current = [];
        active = -1;
      }
    }
    const visible = () => !(!panel || "block" !== panel.style.display);
    function move(delta) {
      if (!current.length) return;
      active = (active + delta + current.length) % current.length;
      const top = active * ROW_H;
      top < viewport.scrollTop ? viewport.scrollTop = top : top + ROW_H > viewport.scrollTop + viewH && (viewport.scrollTop = top + ROW_H - viewH);
      draw();
    }
    const nativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    let committing = !1;
    const landing = input => {
      if (committing) return !0;
      try {
        return window.__mmsuHooks?.picking?.() === input;
      } catch (e) {
        return !1;
      }
    };
    async function pick(i) {
      const e = current[i];
      if (!e || !field) return;
      const input = field;
      hide();
      suppressed.delete(input);
      typed.delete(input);
      const h = window.__mmsuHooks;
      if ((code => {
        try {
          const set = iata()?.appCodes;
          return !set || "function" != typeof set.has || set.has(code);
        } catch (e) {
          return !0;
        }
      })(e.code) && h && h.pick && await h.pick(input, e.code)) {
        state.picked = e.code;
        release(input);
        return;
      }
      const I = iata();
      const label = I && I.optionLabel && I.optionLabel(e.code) || e.code;
      committing = !0;
      nativeValue.set.call(input, label);
      input.dispatchEvent(new Event("input", {
        bubbles: !0
      }));
      !function(input) {
        release(input);
        try {
          const h = window.__mmsuHooks;
          h && h.mute && muted.set(input, h.mute([ input ]));
        } catch (e) {}
      }(input);
      state.picked = e.code;
      state.pickedWithoutOption = (state.pickedWithoutOption || 0) + 1;
      setTimeout(() => {
        committing = !1;
        typed.delete(input);
      }, 60);
    }
    const muted = new Map;
    function release(input) {
      const undo = muted.get(input);
      if (undo) {
        muted.delete(input);
        try {
          undo();
        } catch (e) {}
      }
    }
    const SENTINEL = "";
    const suppressed = new Set;
    const typed = new WeakSet;
    const MARK = "__mmsgValue";
    const restore = new Map;
    function wrapValue(input) {
      const own = Object.getOwnPropertyDescriptor(input, "value");
      if (own && own.get && own.get[MARK]) return;
      const under = own && own.get ? own : nativeValue;
      const get = function() {
        return suppressed.has(this) && isActive() && document.activeElement === this && !landing(this) ? SENTINEL : under.get.call(this);
      };
      get[MARK] = !0;
      try {
        Object.defineProperty(input, "value", {
          get: get,
          set(v) {
            under.set.call(this, v);
          },
          configurable: !0
        });
      } catch (e) {
        return;
      }
      restore.set(input, own);
    }
    const FIELD_SEL = 'input[id$="origin"], input[id$="destination"]';
    const hooked = new WeakSet;
    function isOwn(el) {
      if (!el || !el.matches || !el.matches(FIELD_SEL)) return !1;
      hooked.has(el) || hook(el);
      return !0;
    }
    function onInputCapture(ev) {
      const input = ev.target;
      if (!landing(input) && isOwn(input) && isActive()) {
        wrapValue(input);
        if (typed.has(input)) {
          typed.delete(input);
          ev.stopPropagation();
          !function(ev) {
            const input = ev.target;
            if (landing(input)) return;
            if (!isActive()) {
              suppressed.delete(input);
              hide();
              return;
            }
            suppressed.add(input);
            release(input);
            const raw = nativeValue.get.call(input);
            raw ? show(input, raw) : hide();
          }(ev);
        }
      }
    }
    function onFieldFocus(ev) {
      const input = ev.target;
      if (!isOwn(input) || landing(input)) return;
      geom = null;
      if (!isActive()) {
        suppressed.delete(input);
        return;
      }
      wrapValue(input);
      suppressed.add(input);
      ev.stopPropagation();
      const raw = nativeValue.get.call(input);
      raw ? show(input, raw) : hide();
    }
    function onFieldClick(ev) {
      const input = ev.target;
      isOwn(input) && isActive() && !landing(input) && ev.stopPropagation();
    }
    function onTyping(ev) {
      const input = ev.target;
      !landing(input) && isOwn(input) && isActive() && ("keydown" !== ev.type || "Shift" !== ev.key && "Control" !== ev.key && "Alt" !== ev.key && "Meta" !== ev.key) && typed.add(input);
    }
    function onKey(ev) {
      const input = ev.target;
      if (!landing(input) && isOwn(input) && isActive() && visible()) if ("ArrowDown" === ev.key) {
        ev.preventDefault();
        ev.stopPropagation();
        move(1);
      } else if ("ArrowUp" === ev.key) {
        ev.preventDefault();
        ev.stopPropagation();
        move(-1);
      } else if ("Enter" === ev.key) {
        if (active >= 0) {
          ev.preventDefault();
          ev.stopPropagation();
          pick(active);
        }
      } else if ("Escape" === ev.key) {
        ev.stopPropagation();
        hide();
      } else "Tab" === ev.key && hide();
    }
    function onBlur(ev) {
      const input = ev.target;
      hooked.has(input) && setTimeout(() => {
        if (document.activeElement !== input) {
          suppressed.delete(input);
          typed.delete(input);
          hide();
        }
      }, 120);
    }
    function hook(input) {
      if (!hooked.has(input)) {
        hooked.add(input);
        wrapValue(input);
        document.activeElement === input && isActive() && suppressed.add(input);
      }
    }
    const css = `
.mmsg-panel { position: fixed; z-index: 1001; display: none; background: #fff;
  border: 1px solid ${INK_hairline}; border-radius: 4px;
  box-shadow: 0 4px 16px rgba(0,0,0,.16); font-family: inherit; }
.mmsg-viewport { overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; }
.mmsg-spacer { position: relative; }
.mmsg-rows { position: absolute; inset: 0; }
.mmsg-row { position: absolute; left: 0; right: 0; height: ${ROW_H}px; padding: 5px 12px;
  box-sizing: border-box; cursor: pointer; display: flex; flex-direction: column;
  justify-content: center; gap: 1px; }
.mmsg-row:hover { background: #f4f3ef; }
.mmsg-row.mmsg-active { background: #eaf1fa; }
.mmsg-main { font-size: 14px; color: ${"#05164D"}; white-space: nowrap;
  display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.mmsg-main > bdi { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.mmsg-main b { font-weight: 700; }
.mmsg-code { flex: 0 0 auto; margin-left: auto; font-weight: 600; letter-spacing: .04em;
  color: ${"#1c5cab"}; font-variant-numeric: tabular-nums; }
.mmsg-tag { flex: 0 0 auto; font-size: 10px; color: ${INK_muted};
  border: 1px solid ${INK_hairline}; border-radius: 3px; padding: 0 4px; }
.mmsg-tag:empty { display: none; }
.mmsg-sub { font-size: 11px; color: ${INK_muted}; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; }`;
    const rebuild = () => {
      index = null;
      const build = () => {
        state.superseded || index || buildIndex();
      };
      window.requestIdleCallback ? window.requestIdleCallback(build, {
        timeout: 2e3
      }) : setTimeout(build, 300);
    };
    const ac = new AbortController;
    state.teardown = () => {
      state.superseded = !0;
      ac.abort();
      try {
        host && host.remove();
      } catch (e) {}
      host = panel = null;
      pool.length = 0;
      suppressed.clear();
      [ ...muted.keys() ].forEach(release);
      restore.forEach((own, input) => {
        try {
          const currentDesc = Object.getOwnPropertyDescriptor(input, "value");
          if (!currentDesc || !currentDesc.get || !currentDesc.get[MARK]) return;
          own ? Object.defineProperty(input, "value", own) : delete input.value;
        } catch (e) {}
      });
      restore.clear();
    };
    state.search = (q, n) => {
      const r = search(q, n || 20);
      return {
        hits: state.lastHits,
        ms: state.lastMs,
        top: r.map(e => e.tier + " " + e.code + " " + (e.city || "") + " / " + (e.place || "") + " [" + e.kind + " rel" + e.rel + "]")
      };
    };
    !function() {
      const on = (target, type, fn, opts) => target.addEventListener(type, fn, {
        ...opts,
        signal: ac.signal
      });
      on(document, "focusin", onFieldFocus, {
        capture: !0
      });
      on(document, "focusout", onBlur, {
        capture: !0
      });
      on(document, "click", onFieldClick, {
        capture: !0
      });
      on(document, "input", onInputCapture, {
        capture: !0
      });
      on(document, "keydown", onTyping, {
        capture: !0
      });
      on(document, "paste", onTyping, {
        capture: !0
      });
      on(document, "compositionend", onTyping, {
        capture: !0
      });
      on(document, "compositionupdate", onTyping, {
        capture: !0
      });
      on(document, "keydown", onKey, {
        capture: !0
      });
      document.body && document.querySelectorAll(FIELD_SEL).forEach(hook);
      rebuild();
      on(window, "resize", schedulePlace);
      on(window, "scroll", schedulePlace, {
        capture: !0
      });
      on(window, "mmiata:list", rebuild);
      on(window, "mmiata:names", rebuild);
    }();
  })();
  (() => {
    "use strict";
    const VERSION = 10;
    if (window.__mmFareNames && window.__mmFareNames.version >= VERSION) return;
    const inherited = window.__mmFareNames;
    const FF_RE = /fare-families\.json/i;
    const LOC_RE = new RegExp("[a-z]{2}[-_][A-Z]{2}\\.json", "i");
    const state = {
      version: VERSION,
      codes: inherited?.codes || {},
      loc: inherited?.loc || null,
      names: inherited?.names || {},
      ready: !!inherited?.ready,
      _readyListeners: Array.isArray(inherited?._readyListeners) ? inherited._readyListeners : []
    };
    try {
      Object.defineProperty(window, "__mmFareNames", {
        value: state,
        enumerable: !1,
        configurable: !0
      });
    } catch (e) {
      try {
        window.__mmFareNames = state;
      } catch (e2) {}
    }
    const CABIN_PREFIX = /^(Premium Economy|Economy|Business|First)\s*/;
    function resolve() {
      if (!state.loc || !Object.keys(state.codes).length) return;
      const out = {};
      for (const code of Object.keys(state.codes)) {
        const name = state.loc[state.codes[code]];
        name && (out[code] = String(name).replace(/\s+/g, " ").trim());
      }
      state.names = out;
      state.ready = !0;
      state._readyListeners.forEach(fn => {
        try {
          fn();
        } catch (e) {}
      });
    }
    state.onReady = fn => {
      state._readyListeners.push(fn);
      if (state.ready) try {
        fn();
      } catch (e) {}
      return () => {
        const i = state._readyListeners.indexOf(fn);
        i >= 0 && state._readyListeners.splice(i, 1);
      };
    };
    function takeFamilies(json) {
      const ff = json && json.fareFamilies;
      if (!ff || "object" != typeof ff) return;
      const map = {};
      for (const code of Object.keys(ff)) {
        const k = ff[code] && ff[code].nameKey;
        k && (map[code] = k);
      }
      if (Object.keys(map).length) {
        state.codes = map;
        resolve();
      }
    }
    function takeLocalisation(json) {
      if (!json || "object" != typeof json) return;
      const loc = {};
      for (const k of Object.keys(json)) 0 === k.indexOf("refx-fare-family.") && (loc[k] = json[k]);
      if (Object.keys(loc).length) {
        state.loc = loc;
        resolve();
      }
    }
    const originalFetch = window.fetch;
    window.__mmFareHooks = {
      takeFamilies: takeFamilies,
      takeLocalisation: takeLocalisation
    };
    if (!window.__mmFareHooked) {
      window.__mmFareHooked = !0;
      let handed = 0;
      window.addEventListener("mmiata:locale", e => {
        handed++;
        try {
          (window.__mmFareHooks || {}).takeLocalisation(e.detail);
        } catch (err) {}
      });
      window.fetch = async function(...args) {
        const url = "string" == typeof args[0] ? args[0] : args[0]?.url || "";
        const before = handed;
        const res = await originalFetch.apply(this, args);
        try {
          const h = window.__mmFareHooks || {};
          FF_RE.test(url) ? res.clone().json().then(h.takeFamilies).catch(() => {}) : LOC_RE.test(url) && handed === before && res.clone().json().then(h.takeLocalisation).catch(() => {});
        } catch (e) {}
        return res;
      };
    }
    async function catchUp() {
      if (state.ready) return;
      let urls = [];
      try {
        urls = performance.getEntriesByType("resource").map(r => r.name);
      } catch (e) {
        return;
      }
      await tryAll(urls.filter(u => FF_RE.test(u)), takeFamilies, () => Object.keys(state.codes).length > 0);
      await tryAll(urls.filter(u => LOC_RE.test(u)), takeLocalisation, () => !!state.loc);
    }
    async function tryAll(list, take, done) {
      for (const u of list) {
        if (done()) return;
        try {
          take(await (await originalFetch.call(window, u)).json());
        } catch (e) {}
      }
    }
    "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", () => catchUp()) : catchUp();
    state.nameOf = code => code && state.names[code] || null;
    state.tierOf = code => {
      const n = state.nameOf(code);
      if (!n) return null;
      const t = n.replace(CABIN_PREFIX, "").trim();
      return t ? "Comfort Plus" === t ? "Comfort +" : t : null;
    };
    const NAME_CABIN = [ [ /^Premium Economy/i, "ecoPremium" ], [ /^Economy/i, "eco" ], [ /^Business/i, "business" ], [ /^First/i, "first" ] ];
    state.cabinOf = code => {
      const n = state.nameOf(code);
      if (!n) return null;
      const hit = NAME_CABIN.find(([re]) => re.test(n));
      return hit ? hit[1] : null;
    };
    const PAIR_RE = /^(?:MMWW[XRIO](LIGHT|NC|RC|FF)|ZMI[XRIO](NOR))$/;
    const PAIR_GROUP = {
      LIGHT: "light",
      NC: "comfort",
      RC: "plus",
      FF: "plus",
      NOR: "plus"
    };
    state.pairGroup = code => {
      const m = PAIR_RE.exec(String(code || ""));
      return m ? PAIR_GROUP[m[1] || m[2]] : null;
    };
    state.combinable = (outCode, outCabin, retCode, retCabin) => {
      if (outCode && outCode === retCode) return !0;
      const a = state.pairGroup(outCode), b = state.pairGroup(retCode);
      return a && b ? a === b && ("light" !== a || !!outCabin && outCabin === retCabin) : null;
    };
    state.summary = () => ({
      version: VERSION,
      ready: state.ready,
      codes: Object.keys(state.codes).length,
      names: Object.keys(state.names).length
    });
  })();
  (() => {
    "use strict";
    const VERSION = 11;
    if (window.__mmCurrency && window.__mmCurrency.version >= VERSION) return;
    const inherited = window.__mmCurrency;
    if (inherited) try {
      inherited._offSettings?.();
    } catch (e) {}
    const target = () => String(window.__mmSettings?.get("fxTarget") || "EUR").toUpperCase();
    const CACHE_KEY = "mmfx_rates";
    const CACHE_FORMAT = 1;
    const RETRY_AFTER = 10 * 60 * 1e3;
    const SOURCES = [ {
      name: "er-api",
      url: "https://open.er-api.com/v6/latest/EUR",
      pick: j => j && j.rates
    }, {
      name: "ecb",
      url: "https://api.frankfurter.dev/v1/latest?base=EUR",
      pick: j => j && j.rates
    } ];
    const state = {
      version: VERSION,
      rates: inherited?.rates || null,
      date: inherited?.date || null,
      loading: !1,
      error: null,
      listeners: Array.isArray(inherited?.listeners) ? inherited.listeners : []
    };
    try {
      Object.defineProperty(window, "__mmCurrency", {
        value: state,
        enumerable: !1,
        configurable: !0
      });
    } catch (e) {
      try {
        window.__mmCurrency = state;
      } catch (e2) {}
    }
    state.onUpdate = fn => {
      state.listeners.push(fn);
      return () => {
        const i = state.listeners.indexOf(fn);
        i >= 0 && state.listeners.splice(i, 1);
      };
    };
    const emit = () => state.listeners.forEach(fn => {
      try {
        fn();
      } catch (e) {}
    });
    const today = () => (new Date).toDateString();
    function readCache() {
      try {
        const j = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
        return j && j.v === CACHE_FORMAT && j.rates ? j : null;
      } catch (e) {
        return null;
      }
    }
    function adopt(cached) {
      state.rates = cached.rates;
      state.date = cached.date;
    }
    async function load() {
      const cached = readCache();
      if (cached && cached.date === today()) {
        adopt(cached);
        emit();
        return;
      }
      if (state.loading) return;
      state.loading = !0;
      const problems = [];
      const attempt = async src => {
        try {
          const res = await fetch(src.url);
          if (!res.ok) throw new Error("HTTP " + res.status);
          const rates = src.pick(await res.json());
          if (!rates || !Object.keys(rates).length) throw new Error("leere Antwort");
          return {
            rates: rates,
            name: src.name
          };
        } catch (e) {
          problems.push(src.name + ": " + (e.message || e));
          return null;
        }
      };
      try {
        let hit = null;
        for (const src of SOURCES) {
          hit = await attempt(src);
          if (hit) break;
        }
        if (hit) {
          state.rates = {
            ...hit.rates,
            EUR: 1
          };
          state.date = today();
          state.source = hit.name;
          state.error = null;
          !function(rates) {
            try {
              localStorage.setItem(CACHE_KEY, JSON.stringify({
                v: CACHE_FORMAT,
                date: today(),
                ts: Date.now(),
                rates: rates
              }));
            } catch (e) {}
          }(state.rates);
        } else {
          state.error = problems.join(" · ");
          cached && cached.rates && adopt(cached);
          askedDay = null;
          retryAt = Date.now() + RETRY_AFTER;
        }
      } finally {
        state.loading = !1;
      }
      emit();
    }
    {
      const cached = readCache();
      cached && cached.date === today() && adopt(cached);
    }
    let askedDay = null;
    let retryAt = 0;
    function ensureRates() {
      if (state.loading || Date.now() < retryAt) return;
      const day = today();
      if (!(askedDay === day || state.rates && state.date === day)) {
        askedDay = day;
        load();
      }
    }
    state.ensureRates = ensureRates;
    state.reload = () => {
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch (e) {}
      askedDay = today();
      return load();
    };
    state.target = target;
    const SIGN = {
      EUR: "€",
      USD: "$",
      GBP: "£",
      JPY: "¥"
    };
    state.sign = code => SIGN[code || target()] || code || target();
    state.convert = (amount, currency) => {
      if (!1 === window.__mmSettings?.get("currency")) return null;
      if (null == amount || !currency) return null;
      const t = target();
      if (currency === t) return amount;
      ensureRates();
      const from = "EUR" === currency ? 1 : state.rates && state.rates[currency];
      const to = "EUR" === t ? 1 : state.rates && state.rates[t];
      return from && to ? amount / from * to : null;
    };
    state.label = (amount, currency) => {
      const v = state.convert(amount, currency);
      if (null == v || currency === target()) return "";
      const digits = v >= 10 ? 0 : 2;
      return "≈ " + (o = {
        style: "currency",
        currency: target(),
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
      }, window.__mmI18n ? window.__mmI18n.nf(o) : new Intl.NumberFormat("de-DE", o)).format(v);
      var o;
    };
    state.currencies = () => state.rates ? Object.keys(state.rates) : Intl.supportedValuesOf ? Intl.supportedValuesOf("currency") : [ "EUR" ];
    state.summary = () => ({
      version: VERSION,
      date: state.date,
      source: state.source || null,
      error: state.error,
      currencies: state.rates ? Object.keys(state.rates).length : 0,
      sample: state.rates ? {
        CNY: state.rates.CNY,
        USD: state.rates.USD
      } : null
    });
    try {
      window.__mmSettings && window.__mmSettings.onChange && (state._offSettings = window.__mmSettings.onChange(k => {
        "currency" !== k && "fxTarget" !== k || emit();
      }));
    } catch (e) {}
  })();
  (() => {
    "use strict";
    const VERSION = 61;
    if (window.__mmCal && window.__mmCal.version >= VERSION) return;
    const T = (s, p) => window.__mmI18n ? window.__mmI18n.t(s, p) : p ? String(s).replace(/\{(\w+)\}/g, (m, k) => null != p[k] ? String(p[k]) : m) : String(s);
    const inheritedCal = window.__mmCal;
    const FLEXIBILITY = 15;
    const FLEX_ROUNDTRIP = 7;
    const CAL_RE = /air-calendars/i;
    const STOP_WARNING = "40834";
    const BOUNDS_RE = /air-bounds/i;
    const CACHE_KEY = "mmcal_cache";
    const PREF_KEY = "mmcal_all_cabins";
    const CACHE_TTL_MS = 60 * 60 * 1e3;
    const CACHE_FORMAT = 3;
    const state = {
      version: VERSION,
      days: [],
      route: null,
      dictionaries: null,
      responses: 0,
      listeners: inheritedCal && Array.isArray(inheritedCal.listeners) ? inheritedCal.listeners : [],
      template: inheritedCal && inheritedCal.template || null,
      loading: null,
      searchingSince: null,
      progress: null,
      error: null,
      poolErrors: [],
      blockedSince: 0,
      blockedUntil: 0,
      authDead: !1,
      loadedMonths: new Set,
      poolsLoaded: new Set,
      noOffer: null,
      journey: inheritedCal && inheritedCal.journey || null
    };
    try {
      Object.defineProperty(window, "__mmCal", {
        value: state,
        enumerable: !1,
        configurable: !0
      });
    } catch (e) {
      try {
        window.__mmCal = state;
      } catch (e2) {}
    }
    state.onUpdate = fn => {
      state.listeners.push(fn);
      return () => {
        const i = state.listeners.indexOf(fn);
        i >= 0 && state.listeners.splice(i, 1);
      };
    };
    const emit = () => state.listeners.forEach(fn => {
      try {
        fn(state);
      } catch (e) {}
    });
    state.allCabins = (() => {
      try {
        return "1" === localStorage.getItem(PREF_KEY);
      } catch (e) {
        return !1;
      }
    })();
    state.setAllCabins = on => {
      state.allCabins = !!on;
      try {
        localStorage.setItem(PREF_KEY, on ? "1" : "0");
      } catch (e) {}
      emit();
    };
    let cacheMem = null;
    try {
      window.addEventListener("storage", e => {
        e.key !== CACHE_KEY && null !== e.key || (cacheMem = null);
      });
    } catch (e) {}
    function readCache() {
      if (!cacheMem) try {
        cacheMem = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") || {};
      } catch (e) {
        cacheMem = {};
      }
      const parsed = cacheMem;
      const now = Date.now();
      let changed = !1;
      Object.keys(parsed).forEach(route => {
        Object.keys(parsed[route] || {}).forEach(month => {
          const e = parsed[route][month];
          if ((e.v || 1) === CACHE_FORMAT) {
            if (now - (e.ts || 0) > CACHE_TTL_MS) {
              delete parsed[route][month];
              changed = !0;
            }
          } else {
            delete parsed[route][month];
            changed = !0;
          }
        });
        if (!Object.keys(parsed[route] || {}).length) {
          delete parsed[route];
          changed = !0;
        }
      });
      if (changed) try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
      } catch (e) {}
      return parsed;
    }
    const MAX_ROUTES = 8;
    const newestTs = r => Math.max(0, ...Object.keys(r || {}).map(m => (r[m] || {}).ts || 0));
    function writeCache(routeKey, items) {
      const cache = readCache();
      cache[routeKey] || (cache[routeKey] = {});
      const ts = Date.now();
      items.forEach(([month, days, pools]) => {
        cache[routeKey][month] = {
          v: CACHE_FORMAT,
          ts: ts,
          pools: pools || [],
          days: days
        };
      });
      const byAge = Object.keys(cache).sort((a, b) => newestTs(cache[b]) - newestTs(cache[a]));
      for (const k of byAge.slice(MAX_ROUTES)) delete cache[k];
      for (;;) try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        return;
      } catch (e) {
        const keys = Object.keys(cache).filter(k => k !== routeKey);
        if (!keys.length) {
          try {
            localStorage.removeItem(CACHE_KEY);
          } catch (e2) {}
          return;
        }
        delete cache[keys.sort((a, b) => newestTs(cache[a]) - newestTs(cache[b]))[0]];
      }
    }
    function cachedPools(entry) {
      return entry ? Array.isArray(entry.pools) ? entry.pools.filter(p => POOLS.includes(p)) : entry.allCabins ? POOLS.slice() : [] : [];
    }
    state.cacheStats = () => {
      const cache = readCache();
      const out = {
        ttlMinutes: CACHE_TTL_MS / 6e4,
        routes: {}
      };
      Object.keys(cache).forEach(route => {
        out.routes[route] = Object.entries(cache[route]).map(([month, e]) => ({
          month: month,
          ageMinutes: Math.round((Date.now() - e.ts) / 6e4),
          pools: cachedPools(e),
          days: (e.days || []).length
        }));
      });
      return out;
    };
    state.clearCache = () => {
      try {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(SEARCH_KEY);
        localStorage.removeItem(NAMES_KEY);
      } catch (e) {}
      cacheMem = null;
      searchMem = null;
      namesMem = null;
      state.fareNamesRev++;
      rawReplies.clear();
      state.days = [];
      state.loadedMonths.clear();
      state.poolsLoaded.clear();
      emit();
    };
    const SEARCH_KEY = "mmcal_search";
    let searchMem = null;
    function searchStore() {
      if (!searchMem) try {
        searchMem = JSON.parse(localStorage.getItem(SEARCH_KEY) || "{}") || {};
      } catch (e) {
        searchMem = {};
      }
      return searchMem;
    }
    const NAMES_KEY = "mmcal_farenames";
    const NAMES_TTL_MS = 24 * 60 * 60 * 1e3;
    let namesMem = null;
    function namesStore() {
      if (!namesMem) try {
        namesMem = JSON.parse(localStorage.getItem(NAMES_KEY) || "{}") || {};
      } catch (e) {
        namesMem = {};
      }
      return namesMem;
    }
    state.fareNamesRev = 0;
    state.faresAt = (route, cabin, miles) => {
      const e = namesStore()[route];
      return e && Date.now() - e.ts <= NAMES_TTL_MS && e.m[cabin] && e.m[cabin][miles] || [];
    };
    state.addSearchFares = (bodyText, fares) => {
      let body = null;
      try {
        body = JSON.parse(bodyText);
      } catch (e) {}
      body && function(body, fares) {
        const j = journeyOf(body);
        const first = j.legs[0];
        if ("multi" === j.kind || !first || !first.o || !first.d) return;
        const route = first.o + "-" + first.d;
        const store = namesStore();
        const now = Date.now();
        const e = store[route] && now - store[route].ts <= NAMES_TTL_MS ? store[route] : {
          m: {}
        };
        let added = !1;
        (fares || []).forEach(f => {
          if (!f || !f.cabin || !f.code || "number" != typeof f.miles) return;
          const list = (e.m[f.cabin] = e.m[f.cabin] || {})[f.miles] = e.m[f.cabin][f.miles] || [];
          if (list.indexOf(f.code) < 0) {
            list.push(f.code);
            added = !0;
          }
        });
        if (added) {
          e.ts = now;
          store[route] = e;
          Object.keys(store).forEach(r => {
            now - store[r].ts > NAMES_TTL_MS && delete store[r];
          });
          try {
            localStorage.setItem(NAMES_KEY, JSON.stringify(store));
          } catch (e2) {}
          state.fareNamesRev++;
        }
      }(body, fares);
      const it = body ? requestedItin(body) : null;
      const date = it && String(it.departureDateTime || "").slice(0, 10);
      if (!date || !it.originLocationCode || !it.destinationLocationCode) return;
      const store = searchStore();
      const route = routeKeyOf(body);
      if (!route || body.selectedBoundId && route.indexOf("#") < 0) return;
      const day = (store[route] = store[route] || {})[date] = store[route][date] || {};
      const best = {};
      (fares || []).forEach(f => {
        f && f.cabin && null != f.miles && (!best[f.cabin] || f.miles < best[f.cabin].miles) && (best[f.cabin] = f);
      });
      const ts = Date.now();
      Object.keys(best).forEach(cab => {
        const f = best[cab];
        day[cab] = {
          code: f.code,
          miles: f.miles,
          taxes: f.taxes,
          currency: f.currency,
          ts: ts
        };
      });
      Object.keys(store).forEach(r => {
        Object.keys(store[r]).forEach(d => {
          Object.keys(store[r][d]).forEach(c => {
            ts - store[r][d][c].ts > CACHE_TTL_MS && delete store[r][d][c];
          });
          Object.keys(store[r][d]).length || delete store[r][d];
        });
        Object.keys(store[r]).length || delete store[r];
      });
      try {
        localStorage.setItem(SEARCH_KEY, JSON.stringify(store));
      } catch (e) {}
      emit();
    };
    state.searchFares = (route, date) => {
      const day = (searchStore()[route] || {})[date];
      if (!day) return null;
      const now = Date.now(), out = {};
      Object.keys(day).forEach(c => {
        now - day[c].ts <= CACHE_TTL_MS && (out[c] = day[c]);
      });
      return Object.keys(out).length ? out : null;
    };
    function requestedItin(body) {
      const its = body && body.itineraries || [];
      return its.find(x => x && !0 === x.isRequestedBound) || its[0] || null;
    }
    function routeKeyOf(body) {
      try {
        const it = requestedItin(body);
        let key = it.originLocationCode + "-" + it.destinationLocationCode;
        const its = body.itineraries || [];
        if (its.length > 1) {
          const other = its.find(x => x && x !== it);
          const d = other && String(other.departureDateTime || "").slice(0, 10);
          d && (key += "@" + d + "/" + other.originLocationCode + "-" + other.destinationLocationCode);
          body.selectedBoundId && (key += "#" + body.selectedBoundId);
        }
        return key;
      } catch (e) {
        return null;
      }
    }
    function journeyOf(body) {
      const its = body && body.itineraries || [];
      const legs = its.map(x => ({
        o: x.originLocationCode,
        d: x.destinationLocationCode,
        date: String(x.departureDateTime || "").slice(0, 10)
      }));
      return {
        kind: legs.length < 2 ? "oneway" : 2 === legs.length && legs[1].o === legs[0].d && legs[1].d === legs[0].o ? "return" : "multi",
        legs: legs,
        req: Math.max(0, its.findIndex(x => x && !0 === x.isRequestedBound)),
        selectedBoundId: body && body.selectedBoundId || null
      };
    }
    const baseOf = key => String(key || "").split("@")[0].split("#")[0];
    state.baseRoute = () => baseOf(state.routeKey || state.route);
    state.searchRoute = () => String(state.routeKey || state.route || "").split("#")[0];
    state.faresRoute = () => String(state.routeKey || state.route || "");
    function switchRoute(routeKey) {
      if (routeKey) {
        if (state.routeKey && state.routeKey !== routeKey) {
          state.days = [];
          state.loadedMonths.clear();
          state.poolsLoaded.clear();
          state.hydratedRoute = null;
          state.route = null;
          state.noOffer = null;
          state.queue.length = 0;
        }
        state.routeKey = routeKey;
        !function(routeKey) {
          if (!routeKey || state.hydratedRoute === routeKey) return;
          state.hydratedRoute = routeKey;
          state.routeKey = routeKey;
          const months = readCache()[routeKey];
          if (!months) return;
          let restored = 0;
          const byDate = new Map(state.days.map(d => [ d.date, d ]));
          Object.keys(months).forEach(month => {
            const entry = months[month];
            if (!entry || !Array.isArray(entry.days)) return;
            entry.days.forEach(d => {
              byDate.has(d.date) || byDate.set(d.date, d);
            });
            state.days = [ ...byDate.values() ].sort((a, b) => a.date.localeCompare(b.date));
            const [y, m] = month.split("-").map(Number);
            if (isMonthComplete(y, m - 1)) {
              state.loadedMonths.add(month);
              cachedPools(entry).forEach(p => state.poolsLoaded.add(poolKey(month, p)));
            }
            restored++;
          });
          restored && emit();
        }(routeKey);
      }
    }
    function searchSettled() {
      if (state.searchingSince) {
        state.searchingSince = null;
        emit();
      }
    }
    const POOLS = [ "ECONOMY", "PREMIUMECO", "BUSINESS", "FIRST" ];
    const poolKey = (month, pool) => month + "|" + pool;
    const conditioned = () => {
      try {
        return !(!state.template || !JSON.parse(state.template.body).selectedBoundId);
      } catch (e) {
        return !1;
      }
    };
    const poolsMissing = month => conditioned() ? [] : POOLS.filter(p => !state.poolsLoaded.has(poolKey(month, p)));
    const poolsHave = month => POOLS.filter(p => state.poolsLoaded.has(poolKey(month, p)));
    const b64url = s => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const JWT_NONE = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.";
    const sponsorFacts = facts => {
      try {
        const s = window.__mmSponsor;
        if (s && "function" == typeof s.applyFacts) return s.applyFacts(facts);
      } catch (e) {}
      return facts;
    };
    const b64urlDecode = t => {
      let x = String(t).replace(/-/g, "+").replace(/_/g, "/");
      for (;x.length % 4; ) x += "=";
      return atob(x);
    };
    let boundsCabinOnce = null;
    function setBoundsCabinOnce(apiCabin) {
      boundsCabinOnce = apiCabin || null;
    }
    const RAW_MAX = 24;
    const RAW_TTL_MS = CACHE_TTL_MS;
    const rawReplies = new Map;
    function varyingDateKey(json) {
      const deps = new Set, rets = new Set;
      (json.data || []).forEach(e => {
        e.departureDate && deps.add(e.departureDate);
        e.returnDate && rets.add(e.returnDate);
      });
      return rets.size > deps.size ? "returnDate" : "departureDate";
    }
    function requestedBoundOf(json) {
      const first = (json.data || []).find(e => e.bounds && e.bounds.length);
      if (!first) return null;
      const idx = "returnDate" === varyingDateKey(json) ? first.bounds.length - 1 : 0;
      return first.bounds[idx] || null;
    }
    function parse(json) {
      const out = [];
      const dicts = json.dictionaries || {};
      const fareDict = dicts.fareFamilyWithServices || {};
      const currencyDict = dicts.currency || {};
      const dateKey = varyingDateKey(json);
      (json.data || []).forEach(entry => {
        let code = entry.fareFamilyCode || null;
        let miles = null, taxes = null, currency = null;
        try {
          let p = entry.prices;
          const bs = entry.bounds;
          if (bs && bs.length > 1) {
            const b = bs["returnDate" === dateKey ? bs.length - 1 : 0];
            b && b.prices && (p = b.prices);
            b && b.fareFamilyCode && (code = b.fareFamilyCode);
          }
          const adultUnit = list => {
            const adults = (list || []).filter(u => u && /^ADT-/.test((u.travelerIds || [])[0] || ""));
            const miles = u => u.milesConversion && u.milesConversion.convertedMiles && u.milesConversion.convertedMiles.total || 0;
            return adults.sort((a, b) => miles(b) - miles(a))[0] || (list || [])[0] || null;
          };
          const unit = Array.isArray(p) ? p[0] : p.unitPrices ? adultUnit(p.unitPrices) : null;
          if (unit) {
            const price = Array.isArray(unit.prices) ? unit.prices[0] : unit.prices;
            unit.milesConversion && unit.milesConversion.convertedMiles && (miles = unit.milesConversion.convertedMiles.base);
            if (price) {
              currency = price.currencyCode;
              const tdp = (currencyDict[currency] || {}).decimalPlaces;
              taxes = null == price.totalTaxes ? null : price.totalTaxes / Math.pow(10, null == tdp ? 2 : tdp);
            }
          }
        } catch (e) {}
        out.push({
          date: entry[dateKey],
          fareFamilyCode: code,
          cabin: code && fareDict[code] ? fareDict[code].cabin : null,
          miles: miles,
          taxes: taxes,
          currency: currency,
          available: !!code && null !== miles,
          reason: entry.status || entry.availabilityReason || null
        });
      });
      out.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      return {
        days: out,
        dictionaries: dicts
      };
    }
    const monthKey = (year, month) => `${year}-${String(month + 1).padStart(2, "0")}`;
    function firstLoadableDay(year, month) {
      const now = new Date;
      now.setHours(0, 0, 0, 0);
      return new Date(year, month + 1, 0) < now ? null : year === now.getFullYear() && month === now.getMonth() ? now.getDate() : 1;
    }
    function monthCoverage(year, month) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const start = firstLoadableDay(year, month);
      if (null === start) return {
        need: 0,
        have: 0,
        daysInMonth: daysInMonth,
        complete: !0,
        past: !0
      };
      const prefix = monthKey(year, month) + "-";
      let have = 0;
      for (const d of state.days) d.date && d.date.startsWith(prefix) && parseInt(d.date.slice(-2), 10) >= start && have++;
      const need = daysInMonth - start + 1;
      return {
        need: need,
        have: have,
        start: start,
        daysInMonth: daysInMonth,
        complete: have >= need,
        past: !1
      };
    }
    state.monthCoverage = monthCoverage;
    function isMonthComplete(year, month) {
      return monthCoverage(year, month).complete;
    }
    function noteMonths(days) {
      const touched = new Set;
      days.forEach(d => {
        d.date && touched.add(d.date.slice(0, 7));
      });
      touched.forEach(key => {
        const [y, m] = key.split("-").map(Number);
        isMonthComplete(y, m - 1) && state.loadedMonths.add(key);
      });
    }
    function merge(days) {
      const byDate = new Map(state.days.map(d => [ d.date, d ]));
      const toFare = i => ({
        code: i.fareFamilyCode,
        cabin: i.cabin,
        miles: i.miles,
        taxes: i.taxes,
        currency: i.currency
      });
      const resort = new Set;
      days.forEach(incoming => {
        const existing = byDate.get(incoming.date);
        if (!existing) {
          byDate.set(incoming.date, {
            date: incoming.date,
            available: incoming.available,
            reason: incoming.reason,
            fares: incoming.available ? [ toFare(incoming) ] : []
          });
          return;
        }
        if (!incoming.available) return;
        existing.available = !0;
        existing.reason = null;
        const hit = existing.fares.find(f => f.code === incoming.fareFamilyCode);
        if (hit) {
          if (null != incoming.miles && (null == hit.miles || incoming.miles < hit.miles)) {
            hit.miles = incoming.miles;
            hit.taxes = incoming.taxes;
            hit.currency = incoming.currency;
            resort.add(existing);
          }
        } else {
          existing.fares.push(toFare(incoming));
          resort.add(existing);
        }
      });
      resort.forEach(d => d.fares.sort((a, b) => (a.miles ?? 1 / 0) - (b.miles ?? 1 / 0)));
      state.days = [ ...byDate.values() ].sort((a, b) => a.date.localeCompare(b.date));
    }
    function noteConditioned(days, sel) {
      if (sel) {
        state.noOffer && state.noOffer.boundId === sel || (state.noOffer = {
          boundId: sel,
          days: new Set
        });
        days.forEach(d => {
          d.available ? state.noOffer.days.delete(d.date) : state.noOffer.days.add(d.date);
        });
      }
    }
    const originalFetch = window.__mmCalOrigFetch || (window.__mmCalOrigFetch = window.fetch);
    window.__mmCalHooks = {
      ingest: function(json, reqBody) {
        searchSettled();
        try {
          const t = window.__mmRecTrack;
          t && t.note && (json && json.warnings || []).forEach(w => {
            "40834" === String(w && w.code) && t.note("air-calendars", {
              code: w.code,
              detail: w.detail || w.title,
              warning: !0
            });
          });
        } catch (e) {}
        try {
          const {days: days, dictionaries: dictionaries} = parse(json);
          if (!days.length) return;
          let reqKey = null;
          try {
            reqKey = reqBody ? routeKeyOf(JSON.parse(reqBody)) : null;
          } catch (e) {}
          if (reqKey && state.routeKey && reqKey !== state.routeKey) return;
          try {
            if (reqKey) switchRoute(reqKey); else {
              const b = requestedBoundOf(json);
              const base = b.originLocationCode + "-" + b.destinationLocationCode;
              baseOf(state.routeKey) !== base && switchRoute(base);
            }
          } catch (e) {}
          try {
            noteConditioned(days, reqBody ? JSON.parse(reqBody).selectedBoundId : null);
          } catch (e) {}
          merge(days);
          noteMonths(days);
          state.dictionaries = dictionaries;
          state.responses++;
          try {
            let route = function() {
              const base = baseOf(state.routeKey);
              return /^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(base) ? base : null;
            }();
            if (!route) {
              const b = requestedBoundOf(json);
              route = b.originLocationCode + "-" + b.destinationLocationCode;
            }
            state.route = route;
            state.routeKey = state.routeKey || state.route;
          } catch (e) {}
          const rk = state.routeKey || state.route;
          rk && writeCache(rk, [ ...new Set(days.map(d => d.date.slice(0, 7))) ].map(month => [ month, state.days.filter(d => d.date.startsWith(month + "-")), poolsHave(month) ]));
          emit();
        } catch (e) {}
      },
      widenRequest: function(bodyText) {
        try {
          const body = JSON.parse(bodyText);
          const its = body.itineraries || [];
          const it = requestedItin(body);
          if (!it) return null;
          const flex = its.length > 1 ? FLEX_ROUNDTRIP : FLEXIBILITY;
          if (it.flexibility === flex) return null;
          it.flexibility = flex;
          return JSON.stringify(body);
        } catch (e) {
          return null;
        }
      },
      switchRoute: switchRoute,
      calendarOn: () => !window.__mmSettings || !1 !== window.__mmSettings.get("calendar"),
      routeKeyOf: routeKeyOf,
      headersToObject: function(h) {
        const out = {};
        try {
          if (!h) return out;
          if (h instanceof Headers) {
            h.forEach((v, k) => out[k] = v);
            return out;
          }
          if (Array.isArray(h)) {
            h.forEach(([k, v]) => out[k] = v);
            return out;
          }
          Object.keys(h).forEach(k => out[k] = h[k]);
        } catch (e) {}
        return out;
      },
      state: state,
      rawKey: (url, body, headers) => url + "|" + body + "|" + (headers && (headers["ama-client-facts"] || headers["Ama-Client-Facts"]) || ""),
      rememberRaw: function(key, text) {
        if (key && text) {
          rawReplies.delete(key);
          rawReplies.set(key, {
            text: text,
            ts: Date.now()
          });
          for (;rawReplies.size > RAW_MAX; ) rawReplies.delete(rawReplies.keys().next().value);
        }
      },
      recallRaw: function(key) {
        const hit = key && rawReplies.get(key);
        if (!hit) return null;
        if (Date.now() - hit.ts > RAW_TTL_MS) {
          rawReplies.delete(key);
          return null;
        }
        return hit.text;
      },
      rawReplies: rawReplies,
      noteSearch: function(url, body) {
        if (!BOUNDS_RE.test(String(url || "")) || "string" != typeof body) return;
        let rk = null, parsed = null;
        try {
          parsed = JSON.parse(body);
          rk = routeKeyOf(parsed);
        } catch (e) {}
        if (rk) {
          state.journey = journeyOf(parsed);
          switchRoute(rk);
          state.searchingSince = Date.now();
          emit();
        }
      },
      searchSettled: searchSettled,
      withoutStopWarning: function(text) {
        if (!text || text.indexOf('"' + STOP_WARNING + '"') < 0) return null;
        try {
          const j = JSON.parse(text);
          if (!Array.isArray(j.warnings)) return null;
          const rest = j.warnings.filter(w => String(w && w.code) !== STOP_WARNING);
          if (rest.length === j.warnings.length) return null;
          rest.length ? j.warnings = rest : delete j.warnings;
          return JSON.stringify(j);
        } catch (e) {
          return null;
        }
      },
      noteRefusal: noteRefusal,
      clearBlock: clearBlock,
      setBoundsCabinOnce: setBoundsCabinOnce,
      cabinizeBounds: function(url, headers) {
        if (!boundsCabinOnce || !BOUNDS_RE.test(String(url || ""))) return null;
        const cabin = boundsCabinOnce;
        boundsCabinOnce = null;
        let facts = {
          sub: "fact",
          cabin: cabin,
          isCompanion: "true"
        };
        const key = Object.keys(headers || {}).find(k => "ama-client-facts" === k.toLowerCase());
        if (key) try {
          const cur = JSON.parse(b64urlDecode(String(headers[key]).split(".")[1]));
          cur && "object" == typeof cur && (facts = {
            ...cur,
            cabin: cabin
          });
        } catch (e) {}
        return {
          name: key || "ama-client-facts",
          value: JWT_NONE + b64url(JSON.stringify(sponsorFacts(facts))) + "."
        };
      }
    };
    if (!window.__mmCalHooked) {
      window.__mmCalHooked = !0;
      const baseFetch = window.fetch;
      const h = () => window.__mmCalHooks || {};
      const countStrip = () => {
        const st = h().state;
        st.stopWarningsStripped = (st.stopWarningsStripped || 0) + 1;
      };
      const captureRequest = (c, tpl) => {
        c.state.pendingTemplate = tpl;
        try {
          c.switchRoute(c.routeKeyOf(JSON.parse(tpl.body)));
        } catch (e) {}
        const widened = c.calendarOn() ? c.widenRequest(tpl.body) : null;
        widened && (tpl.body = widened);
        return tpl.body;
      };
      const stripText = raw => {
        try {
          return h().withoutStopWarning ? h().withoutStopWarning(raw) : null;
        } catch (e) {
          return null;
        }
      };
      window.fetch = async function(...args) {
        let url = "string" == typeof args[0] ? args[0] : args[0] && args[0].url || "";
        const isCal = CAL_RE.test(url);
        if (!isCal) {
          try {
            const c = h();
            c.noteSearch && c.noteSearch(url, (args[1] || {}).body);
          } catch (e) {}
          try {
            const c = h();
            if (c.cabinizeBounds) {
              const init = args[1] || {};
              const hdrs = c.headersToObject(init.headers);
              const fix = c.cabinizeBounds(url, hdrs);
              if (fix) {
                hdrs[fix.name] = fix.value;
                init.headers = hdrs;
                args[1] = init;
              }
            }
          } catch (e) {}
        }
        if (isCal) try {
          const init = args[1] || {};
          if ("string" == typeof init.body) {
            const c = h();
            const body = captureRequest(c, {
              url: url,
              method: init.method || "POST",
              headers: c.headersToObject(init.headers),
              body: init.body
            });
            if (body !== init.body) {
              init.body = body;
              args[1] = init;
            }
          }
        } catch (e) {}
        if (isCal) {
          const c = h();
          const init = args[1] || {};
          const key = c.rawKey && "string" == typeof init.body ? c.rawKey(url, init.body, c.headersToObject(init.headers)) : null;
          const hit = c.recallRaw ? c.recallRaw(key) : null;
          if (hit) {
            c.state.servedFromCache = (c.state.servedFromCache || 0) + 1;
            try {
              c.searchSettled && c.searchSettled();
            } catch (e) {}
            const cleaned = stripText(hit);
            cleaned && countStrip();
            return new Response(cleaned || hit, {
              status: 200,
              headers: {
                "content-type": "application/json"
              }
            });
          }
          let res;
          try {
            res = await baseFetch.apply(this, args);
          } catch (e) {
            try {
              c.searchSettled && c.searchSettled();
            } catch (e2) {}
            if (("undefined" == typeof navigator || !1 !== navigator.onLine) && c.noteRefusal && (!e || "AbortError" !== e.name)) try {
              c.noteRefusal(e && e.message || "Failed to fetch");
            } catch (e2) {}
            c.state.pendingTemplate = null;
            throw e;
          }
          if (res.ok && c.state.pendingTemplate) {
            c.state.template = c.state.pendingTemplate;
            c.state.pendingTemplate = null;
          } else if (!res.ok) {
            c.state.pendingTemplate = null;
            if (429 === res.status && c.noteRefusal) {
              let ra = 0;
              try {
                ra = Number(res.headers.get("retry-after")) || 0;
              } catch (e) {}
              try {
                c.noteRefusal("HTTP 429", ra);
              } catch (e) {}
            }
          }
          if (res.ok && c.clearBlock) try {
            c.clearBlock();
          } catch (e) {}
          let text = null;
          try {
            text = await res.clone().text();
          } catch (e) {}
          if (null !== text) {
            key && res.ok && c.rememberRaw(key, text);
            try {
              h().ingest(JSON.parse(text), (args[1] || {}).body);
            } catch (e) {}
            const cleaned = stripText(text);
            if (cleaned) {
              countStrip();
              return new Response(cleaned, {
                status: res.status,
                statusText: res.statusText,
                headers: res.headers
              });
            }
          }
          return res;
        }
        return await baseFetch.apply(this, args);
      };
      const XO = XMLHttpRequest.prototype.open;
      const XS = XMLHttpRequest.prototype.send;
      const XH = XMLHttpRequest.prototype.setRequestHeader;
      XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        this.__mmCalUrl = url;
        this.__mmCalMethod = method;
        this.__mmCalHeaders = {};
        return XO.call(this, method, url, ...rest);
      };
      XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
        if ("ama-client-facts" === String(name).toLowerCase()) try {
          const c = h();
          const fix = c.cabinizeBounds && c.cabinizeBounds(this.__mmCalUrl, {
            [name]: value
          });
          fix && (value = fix.value);
        } catch (e) {}
        this.__mmCalHeaders && (this.__mmCalHeaders[name] = value);
        return XH.call(this, name, value);
      };
      XMLHttpRequest.prototype.send = function(body) {
        if (CAL_RE.test(this.__mmCalUrl || "")) {
          const c = h();
          "string" == typeof body && (body = captureRequest(c, {
            url: this.__mmCalUrl,
            method: this.__mmCalMethod || "POST",
            headers: {
              ...this.__mmCalHeaders || {}
            },
            body: body
          }));
          const sentBody = body;
          const proto = XMLHttpRequest.prototype;
          const rawText = Object.getOwnPropertyDescriptor(proto, "responseText");
          const rawResp = Object.getOwnPropertyDescriptor(proto, "response");
          const xhr = this;
          let counted = !1;
          const strip = raw => {
            const cleaned = stripText(raw);
            if (cleaned && !counted) {
              counted = !0;
              countStrip();
            }
            return cleaned;
          };
          const cleanText = raw => "string" != typeof raw || 4 !== xhr.readyState ? raw : strip(raw) || raw;
          try {
            rawText && rawText.get && Object.defineProperty(this, "responseText", {
              configurable: !0,
              get() {
                return cleanText(rawText.get.call(this));
              }
            });
            rawResp && rawResp.get && Object.defineProperty(this, "response", {
              configurable: !0,
              get() {
                const r = rawResp.get.call(this);
                if ("string" == typeof r) return cleanText(r);
                if (r && "object" == typeof r && Array.isArray(r.warnings) && r.warnings.some(w => String(w && w.code) === STOP_WARNING)) {
                  const cleaned = strip(JSON.stringify(r));
                  if (cleaned) return JSON.parse(cleaned);
                }
                return r;
              }
            });
          } catch (e) {}
          this.addEventListener("load", () => {
            const c2 = h();
            if (this.status >= 200 && this.status < 300) {
              if (c2.state.pendingTemplate) {
                c2.state.template = c2.state.pendingTemplate;
                c2.state.pendingTemplate = null;
              }
            } else c2.state.pendingTemplate = null;
            let raw = null;
            try {
              raw = rawText && rawText.get ? rawText.get.call(this) : this.responseText;
            } catch (e) {
              raw = this.responseText;
            }
            try {
              h().ingest(JSON.parse(raw), sentBody);
            } catch (e) {}
          });
        } else try {
          const c = h();
          c.noteSearch && c.noteSearch(this.__mmCalUrl, body);
        } catch (e) {}
        return XS.call(this, body);
      };
    }
    const gate = {
      limits: {
        maxInFlight: 2,
        minGapMs: 400,
        perWindow: 20,
        windowMs: 6e4
      },
      inFlight: 0,
      starts: [],
      waiting: 0,
      lastStart: 0,
      _wake: []
    };
    state.gate = gate;
    function gateDelay() {
      const now = Date.now();
      const L = gate.limits;
      gate.starts = gate.starts.filter(t => now - t < L.windowMs);
      return gate.inFlight >= L.maxInFlight ? -1 : Math.max(0, gate.lastStart ? gate.lastStart + L.minGapMs - now : 0, gate.starts.length >= L.perWindow ? gate.starts[0] + L.windowMs - now : 0);
    }
    const TOK_KEY = "gateway-auth-tokens";
    function storedBearer() {
      try {
        const all = JSON.parse(sessionStorage.getItem(TOK_KEY) || "{}");
        const k = Object.keys(all)[0];
        return k && all[k] && all[k].token ? String(all[k].token) : null;
      } catch (e) {
        return null;
      }
    }
    state.storedBearer = storedBearer;
    const BLOCK_WINDOW_MS = 10 * 60 * 1e3;
    const PROBE_GAP_MS = 60 * 1e3;
    const hhmm = ms => {
      try {
        return (o = {
          hour: "2-digit",
          minute: "2-digit"
        }, window.__mmI18n ? window.__mmI18n.dtf(o) : new Intl.DateTimeFormat("de-DE", o)).format(ms);
      } catch (e) {
        return "";
      }
      var o;
    };
    const offline = () => "undefined" != typeof navigator && !1 === navigator.onLine;
    function noteRefusal(detail, retryAfterS) {
      const now = Date.now();
      state.blockedSince || (state.blockedSince = now);
      state.blockedUntil = now + (retryAfterS > 0 ? 1e3 * retryAfterS + 500 : PROBE_GAP_MS);
      state.error = function() {
        const since = state.blockedSince || Date.now();
        return T("Kalender-Abfrage abgewiesen: HTTP 429, zu viele Anfragen (der Browser meldet nur „Failed to fetch“). " + "Sperre etwa 10 Minuten, seit {since}, voraussichtlich bis {until}.", {
          since: hhmm(since),
          until: hhmm(since + BLOCK_WINDOW_MS)
        });
      }();
      emit();
    }
    function clearBlock() {
      if (state.blockedSince || state.blockedUntil) {
        state.blockedSince = 0;
        state.blockedUntil = 0;
        state.error && /HTTP 429/.test(state.error) && (state.error = null);
      }
    }
    state.blocked = () => Date.now() < state.blockedUntil;
    state.setBoundsCabinOnce = setBoundsCabinOnce;
    state.boundsCabinArmed = () => !!boundsCabinOnce;
    state.noteRefusal = noteRefusal;
    state.clearBlock = clearBlock;
    state.queue = [];
    const inQueue = key => state.queue.some(q => q.key === key);
    state.isQueued = (year, month) => inQueue(monthKey(year, month));
    state.loadMonth = async function(year, month, opts = {}) {
      const key = monthKey(year, month);
      if (null === firstLoadableDay(year, month)) return "cached";
      const allPools = (void 0 !== opts.allPools ? opts.allPools : state.allCabins) && !conditioned();
      const named = opts.pools && !conditioned() && state.poolsLacking(year, month, opts.pools);
      const pools = named || (allPools ? poolsMissing(key) : [ null ]);
      if (!named && !allPools && state.hasMonth(year, month)) return "cached";
      if (!pools.length) return "cached";
      if (state.loading) {
        if (state.loading !== key && !inQueue(key)) {
          state.queue.push({
            key: key,
            year: year,
            month: month,
            opts: opts
          });
          emit();
        }
        return "queued";
      }
      if (!opts.force && state.blocked()) return "blocked";
      if (!state.template) {
        state.error = T("Noch keine Suchvorlage. Bitte einmal eine Suche ausführen.");
        emit();
        return "error";
      }
      state.loading = key;
      state.error = null;
      state.poolErrors = [];
      state.authDead = !1;
      state.progress = {
        done: 0,
        total: pools.length
      };
      const routeAtStart = state.routeKey;
      emit();
      try {
        const body = JSON.parse(state.template.body);
        const flex = (body.itineraries || []).length > 1 ? FLEX_ROUNDTRIP : FLEXIBILITY;
        const span = 2 * flex + 1;
        const today = new Date;
        today.setHours(0, 0, 0, 0);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = firstLoadableDay(year, month);
        const its = body.itineraries || [];
        const ri = Math.max(0, its.findIndex(x => x && !0 === x.isRequestedBound));
        const legDay = i => its[i] && its[i].departureDateTime ? new Date(String(its[i].departureDateTime).slice(0, 10) + "T00:00:00") : null;
        const lo = legDay(ri - 1), hi = legDay(ri + 1);
        const inMonth = dt => dt && dt.getFullYear() === year && dt.getMonth() === month;
        const first = lo && lo > new Date(year, month + 1, 0) ? daysInMonth + 1 : inMonth(lo) ? Math.max(firstDay, lo.getDate()) : firstDay;
        const last = hi && hi < new Date(year, month, 1) ? 0 : inMonth(hi) ? hi.getDate() : daysInMonth;
        const centres = [];
        for (let d = first; d <= last; d += span) {
          let c = new Date(year, month, Math.min(d + flex, last));
          c < today && (c = today);
          centres.push(c);
        }
        if (!centres.length) {
          state.loadedMonths.add(key);
          pools.forEach(p => {
            p && state.poolsLoaded.add(poolKey(key, p));
          });
          return "cached";
        }
        state.progress = {
          done: 0,
          total: pools.length * centres.length
        };
        let refusedNow = !1;
        let authDead = !1;
        const runPool = async pool => {
          if (refusedNow) return {
            failed: T("nicht gesendet (Sperre)"),
            pool: pool,
            refused: !0,
            skipped: !0
          };
          const headers = {
            ...state.template.headers
          };
          const poolBody = JSON.parse(state.template.body);
          const poolIt = requestedItin(poolBody);
          if (pool) {
            Object.keys(headers).forEach(k => {
              "ama-client-facts" === k.toLowerCase() && delete headers[k];
            });
            headers["ama-client-facts"] = JWT_NONE + b64url(JSON.stringify(sponsorFacts({
              sub: "fact",
              cabin: pool,
              isCompanion: "true"
            }))) + ".";
            delete poolBody.selectedBoundId;
          }
          let okCount = 0, lastStatus = null, lastFailed = null, refused = !1, retryAfter = 0;
          let renewed = !1;
          const send = async renew => {
            const h = await async function(base, renew) {
              const h = {
                ...base
              };
              const B = window.__mmBounds;
              if (B && "function" == typeof B.refreshAuth) try {
                await B.refreshAuth(!!renew);
              } catch (e) {}
              const token = storedBearer();
              if (!token) return h;
              h[Object.keys(h).find(x => "authorization" === x.toLowerCase()) || "authorization"] = "Bearer " + token;
              return h;
            }(headers, renew);
            return async function() {
              gate.waiting++;
              try {
                for (;;) {
                  const d = gateDelay();
                  if (0 === d) break;
                  d > 500 && emit();
                  await new Promise(r => {
                    d > 0 ? setTimeout(r, d) : gate._wake.push(r);
                  });
                }
              } finally {
                gate.waiting--;
              }
              gate.inFlight++;
              gate.lastStart = Date.now();
              gate.starts.push(gate.lastStart);
              try {
                return await (refusedNow ? Promise.reject(Object.assign(new Error(T("nicht gesendet (Sperre)")), {
                  name: "SkipError"
                })) : originalFetch(state.template.url, {
                  method: state.template.method,
                  headers: h,
                  body: JSON.stringify(poolBody),
                  credentials: "include"
                }).then(res => {
                  429 === res.status && (refusedNow = !0);
                  return res;
                }, e => {
                  offline() || e && "AbortError" === e.name || (refusedNow = !0);
                  throw e;
                }));
              } finally {
                gate.inFlight--;
                gate._wake.splice(0).forEach(r => r());
              }
            }();
          };
          for (const c of centres) {
            poolIt.departureDateTime = `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, "0")}-` + `${String(c.getDate()).padStart(2, "0")}T00:00:00.000`;
            poolIt.flexibility = flex;
            try {
              let res = await send(!1);
              if ((401 === res.status || 403 === res.status) && !renewed) {
                renewed = !0;
                res = await send(!0);
              }
              if (!res.ok) {
                lastStatus = res.status;
                if (401 === res.status || 403 === res.status) {
                  authDead = !0;
                  break;
                }
                if (429 === res.status) {
                  refused = !0;
                  refusedNow = !0;
                  try {
                    retryAfter = Number(res.headers.get("retry-after")) || 0;
                  } catch (e) {}
                  break;
                }
                continue;
              }
              const json = await res.json();
              if (state.routeKey !== routeAtStart) return {
                stale: !0
              };
              clearBlock();
              const {days: days, dictionaries: dictionaries} = parse(json);
              merge(days);
              noteMonths(days);
              noteConditioned(days, poolBody.selectedBoundId);
              dictionaries && (state.dictionaries = dictionaries);
              state.responses++;
              state.progress && state.progress.done++;
              okCount++;
              emit();
            } catch (e) {
              lastFailed = e && e.message || T("Netzwerkfehler");
              if (!(offline() || e && "AbortError" === e.name)) {
                refused = !0;
                refusedNow = !0;
              }
              break;
            }
          }
          if (!okCount) return lastStatus ? {
            status: lastStatus,
            pool: pool,
            refused: refused,
            retryAfter: retryAfter
          } : {
            failed: lastFailed || T("Netzwerkfehler"),
            pool: pool,
            refused: refused
          };
          pool && state.poolsLoaded.add(poolKey(key, pool));
          return {
            ok: !0,
            pool: pool
          };
        };
        let results;
        if (state.blockedSince) {
          results = [];
          for (const pool of pools) {
            const r = await runPool(pool);
            results.push(r);
            if (r.refused || r.stale) break;
          }
        } else results = await Promise.all(pools.map(runPool));
        if (state.routeKey !== routeAtStart) return "stale";
        const okCount = results.filter(r => r.ok).length;
        const why = r => r.status ? "HTTP " + r.status : r.failed || T("Netzfehler");
        const rf = results.find(r => r.refused && !r.skipped) || results.find(r => r.refused);
        rf && noteRefusal(0, rf.retryAfter);
        if (!okCount) {
          if (!rf) {
            const s = results.find(r => r.status);
            const f = results.find(r => r.failed);
            state.authDead = authDead || !(!s || 401 !== s.status && 403 !== s.status);
            state.error = state.authDead ? T("HTTP {status}: Anmeldung der Buchungsstrecke abgelaufen, Erneuerung fehlgeschlagen. Seite neu laden.", {
              status: s.status
            }) : s ? T("HTTP {status}: Laden fehlgeschlagen.", {
              status: s.status
            }) : offline() ? T("Keine Internetverbindung.") : T("Netzfehler: {detail}", {
              detail: f ? f.failed : T("unbekannt")
            });
          }
          return "error";
        }
        state.poolErrors = results.filter(r => !r.ok && !r.stale && !r.refused).map(r => ({
          pool: r.pool,
          why: why(r)
        }));
        if (state.routeKey !== routeAtStart) return "stale";
        state.loadedMonths.add(key);
        const rk = routeKeyOf(body) || state.routeKey;
        if (rk) {
          const monthDays = state.days.filter(d => d.date && d.date.startsWith(key + "-"));
          writeCache(rk, [ [ key, monthDays, poolsHave(key) ] ]);
        }
        return "loaded";
      } catch (e) {
        state.error = T("Laden fehlgeschlagen: {detail}", {
          detail: e.message || e
        });
        return "error";
      } finally {
        state.loading = null;
        state.progress = null;
        emit();
        !function() {
          const n = state.queue.shift();
          n && queueMicrotask(() => {
            try {
              state.loadMonth(n.year, n.month, n.opts);
            } catch (e) {}
          });
        }();
      }
    };
    state.poolsLacking = (year, month, pools) => {
      if (null === firstLoadableDay(year, month)) return [];
      const key = monthKey(year, month), own = function() {
        try {
          const h = state.template.headers;
          const k = Object.keys(h).find(x => "ama-client-facts" === x.toLowerCase());
          return JSON.parse(b64urlDecode(String(h[k]).split(".")[1])).cabin || null;
        } catch (e) {
          return null;
        }
      }();
      return pools.filter(p => !(state.poolsLoaded.has(poolKey(key, p)) || p === own && state.hasMonth(year, month)));
    };
    state.hasMonth = (year, month) => state.loadedMonths.has(monthKey(year, month)) || isMonthComplete(year, month);
    state.poolsPendingFor = (year, month) => state.allCabins ? poolsMissing(monthKey(year, month)) : null;
    state.hasAllPools = (year, month) => null === firstLoadableDay(year, month) || 0 === poolsMissing(monthKey(year, month)).length;
  })();
  (() => {
    "use strict";
    const VERSION = 24;
    if (window.__mmBBD && window.__mmBBD.version >= VERSION) return;
    const T = (s, p) => window.__mmI18n ? window.__mmI18n.t(s, p) : p ? String(s).replace(/\{(\w+)\}/g, (m, k) => null != p[k] ? String(p[k]) : m) : String(s);
    const inherited = window.__mmBBD;
    if (inherited) {
      inherited.superseded = !0;
      try {
        inherited._off && inherited._off();
      } catch (e) {}
      try {
        inherited._offSettings && inherited._offSettings();
      } catch (e) {}
    }
    const URL_ = "https://api.miles-and-more.com/flights/v3/bestbyday";
    const URL_RETURN = "https://api.miles-and-more.com/flights/v3/bestreturn";
    const KEY = "agGBZmuTGwFXWzVDg8ckGKGBytemE1nS";
    const CFF = {
      eco: "CFFECOINS2",
      ecoPremium: "CFFPECOIN2",
      business: "CFFBUSINS2",
      first: "CFFFIRSIN2"
    };
    const CABIN_NAME = {
      eco: "Economy",
      ecoPremium: "Premium Economy",
      business: "Business",
      first: "First"
    };
    const COUNTRY = {
      FRA: "DE",
      MUC: "DE",
      BER: "DE",
      DUS: "DE",
      HAM: "DE",
      STR: "DE",
      CGN: "DE",
      HAJ: "DE",
      NUE: "DE",
      LEJ: "DE",
      BRE: "DE",
      DRS: "DE",
      ERF: "DE",
      FMO: "DE",
      PAD: "DE",
      DTM: "DE",
      FDH: "DE",
      FKB: "DE",
      SCN: "DE",
      XER: "DE",
      XIT: "DE",
      XIU: "DE",
      ZSB: "AT",
      QDU: "DE",
      ZAQ: "DE",
      ZVR: "DE",
      AGY: "DE",
      ZMU: "DE",
      ZRB: "DE",
      QPP: "DE",
      ZMB: "DE",
      DHC: "DE",
      DTZ: "DE",
      XIR: "DE",
      ESZ: "DE",
      QKL: "DE",
      QKU: "DE",
      MHJ: "DE",
      KJR: "DE",
      KWQ: "DE",
      MKF: "DE",
      ZPE: "DE",
      ZPY: "DE",
      ZWS: "DE",
      ZEU: "DE",
      QUL: "DE",
      QWU: "DE",
      QFB: "DE",
      ZQU: "DE",
      XHJ: "DE",
      ZBA: "CH",
      ZDH: "CH",
      ZDI: "CH",
      ZDJ: "CH",
      ZDT: "CH",
      ZHF: "CH",
      ZHT: "CH",
      ZIN: "CH",
      QLS: "CH",
      QLJ: "CH",
      QDL: "CH",
      ZKO: "CH",
      XGZ: "AT",
      GGZ: "AT",
      LZS: "AT",
      VIE: "AT",
      SZG: "AT",
      GRZ: "AT",
      INN: "AT",
      LNZ: "AT",
      ZRH: "CH",
      GVA: "CH",
      BSL: "CH",
      AMS: "NL",
      RTM: "NL",
      EIN: "NL",
      PAR: "FR",
      CDG: "FR",
      ORY: "FR",
      LYS: "FR",
      NCE: "FR",
      MRS: "FR",
      TLS: "FR",
      BOD: "FR",
      LON: "GB",
      LHR: "GB",
      LGW: "GB",
      STN: "GB",
      LTN: "GB",
      LCY: "GB",
      MAN: "GB",
      EDI: "GB",
      BHX: "GB",
      GLA: "GB",
      BRU: "BE",
      LUX: "LU",
      MAD: "ES",
      BCN: "ES",
      PMI: "ES",
      AGP: "ES",
      VLC: "ES",
      BIO: "ES",
      ROM: "IT",
      FCO: "IT",
      MXP: "IT",
      MIL: "IT",
      LIN: "IT",
      VCE: "IT",
      BLQ: "IT",
      NAP: "IT",
      TRN: "IT",
      LIS: "PT",
      OPO: "PT",
      WAW: "PL",
      KRK: "PL",
      GDN: "PL",
      POZ: "PL",
      WRO: "PL",
      CPH: "DK",
      ARN: "SE",
      GOT: "SE",
      OSL: "NO",
      BGO: "NO",
      HEL: "FI",
      PRG: "CZ",
      BUD: "HU",
      ATH: "GR",
      SKG: "GR",
      DUB: "IE",
      RIX: "LV",
      TLL: "EE",
      VNO: "LT",
      LJU: "SI",
      ZAG: "HR",
      SPU: "HR",
      DBV: "HR",
      BEG: "RS",
      OTP: "RO",
      CLJ: "RO",
      SOF: "BG",
      SKP: "MK",
      TIA: "AL",
      SJJ: "BA",
      TGD: "ME",
      BTS: "SK",
      KSC: "SK",
      IST: "TR",
      SAW: "TR",
      KEF: "IS",
      MLA: "MT",
      LCA: "CY",
      NYC: "US",
      JFK: "US",
      EWR: "US",
      LGA: "US",
      ORD: "US",
      IAD: "US",
      LAX: "US",
      SFO: "US",
      BOS: "US",
      MIA: "US",
      SEA: "US",
      ATL: "US",
      YVR: "CA",
      YYZ: "CA",
      YUL: "CA",
      MEX: "MX",
      SAO: "BR",
      GRU: "BR",
      GIG: "BR",
      EZE: "AR",
      BOG: "CO",
      SCL: "CL",
      LIM: "PE",
      JNB: "ZA",
      CPT: "ZA",
      LOS: "NG",
      LAD: "AO",
      NBO: "KE",
      MRU: "MU",
      WDH: "NA",
      SEZ: "SC",
      ACC: "GH",
      ADD: "ET",
      DXB: "AE",
      AUH: "AE",
      RUH: "SA",
      DMM: "SA",
      JED: "SA",
      DOH: "QA",
      TLV: "IL",
      CAI: "EG",
      AMM: "JO",
      DEL: "IN",
      BOM: "IN",
      BLR: "IN",
      MAA: "IN",
      HYD: "IN",
      HND: "JP",
      NRT: "JP",
      KIX: "JP",
      BKK: "TH",
      HKT: "TH",
      ICN: "KR",
      ALA: "KZ",
      TSE: "KZ",
      PVG: "CN",
      PEK: "CN",
      CAN: "CN",
      CTU: "CN",
      CMB: "LK",
      SIN: "SG",
      HKG: "HK",
      KUL: "MY",
      MNL: "PH",
      CGK: "ID",
      DPS: "ID",
      SGN: "VN",
      HAN: "VN",
      TPE: "TW",
      KTM: "NP",
      MLE: "MV",
      SYD: "AU",
      MEL: "AU",
      BNE: "AU",
      PER: "AU",
      AKL: "NZ"
    };
    const CURRENCY = {
      CH: "CHF",
      GB: "GBP",
      SE: "SEK",
      DK: "DKK",
      NO: "NOK",
      PL: "PLN",
      CZ: "CZK",
      HU: "HUF",
      RO: "RON",
      BG: "BGN",
      RS: "RSD",
      BA: "BAM",
      MK: "MKD",
      AL: "ALL",
      TR: "TRY",
      IS: "ISK",
      US: "USD",
      CA: "CAD",
      MX: "MXN",
      BR: "BRL",
      AR: "ARS",
      CO: "COP",
      CL: "CLP",
      PE: "PEN",
      ZA: "ZAR",
      NG: "NGN",
      AO: "AOA",
      KE: "KES",
      MU: "MUR",
      NA: "NAD",
      SC: "SCR",
      GH: "GHS",
      ET: "ETB",
      AE: "AED",
      SA: "SAR",
      QA: "QAR",
      IL: "ILS",
      EG: "EGP",
      JO: "JOD",
      IN: "INR",
      JP: "JPY",
      TH: "THB",
      KR: "KRW",
      KZ: "KZT",
      CN: "CNY",
      LK: "LKR",
      SG: "SGD",
      HK: "HKD",
      MY: "MYR",
      PH: "PHP",
      ID: "IDR",
      VN: "VND",
      TW: "TWD",
      NP: "NPR",
      MV: "MVR",
      AU: "AUD",
      NZ: "NZD"
    };
    const countryOf = iata => {
      for (const h of [ window.__mmBounds, window.__mmCal ]) try {
        const loc = h && h.dictionaries && h.dictionaries.location;
        const c = loc && loc[iata] && loc[iata].countryCode;
        if (c) return c;
      } catch (e) {}
      return COUNTRY[iata] || null;
    };
    const currencyOfCountry = cc => CURRENCY[cc] || "EUR";
    const originalFetch = window.fetch;
    const CACHE_KEY = "mmbbd_cache";
    const TTL_MS = 6 * 60 * 60 * 1e3;
    const CACHE_FORMAT = 4;
    const state = {
      version: VERSION,
      superseded: !1,
      route: null,
      days: [],
      loading: !1,
      error: null,
      listeners: inherited && Array.isArray(inherited.listeners) ? inherited.listeners : []
    };
    try {
      Object.defineProperty(window, "__mmBBD", {
        value: state,
        enumerable: !1,
        configurable: !0
      });
    } catch (e) {
      try {
        window.__mmBBD = state;
      } catch (e2) {}
    }
    state.onUpdate = fn => {
      state.listeners.push(fn);
      return () => {
        const i = state.listeners.indexOf(fn);
        i >= 0 && state.listeners.splice(i, 1);
      };
    };
    const emit = () => {
      state.listeners.forEach(fn => {
        try {
          fn();
        } catch (e) {}
      });
    };
    const calendarOn = () => !window.__mmSettings || !1 !== window.__mmSettings.get("calendar");
    const bbdOn = () => !window.__mmSettings || !1 !== window.__mmSettings.get("bbd");
    let cacheMem = null;
    try {
      window.addEventListener("storage", e => {
        e.key !== CACHE_KEY && null !== e.key || (cacheMem = null);
      });
    } catch (e) {}
    function readCache() {
      if (!cacheMem) try {
        cacheMem = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") || {};
      } catch (e) {
        cacheMem = {};
      }
      const j = cacheMem;
      const now = Date.now();
      let dropped = !1;
      for (const k of Object.keys(j)) if (!j[k] || (j[k].v || 1) !== CACHE_FORMAT || !j[k].ts || now - j[k].ts > TTL_MS) {
        delete j[k];
        dropped = !0;
      }
      if (dropped) try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(j));
      } catch (e) {}
      return j;
    }
    const MAX_ROUTES = 8;
    function writeCache(route, days) {
      const j = readCache();
      j[route] = {
        v: CACHE_FORMAT,
        ts: Date.now(),
        days: days
      };
      const byAge = Object.keys(j).sort((a, b) => (j[b].ts || 0) - (j[a].ts || 0));
      for (const k of byAge.slice(MAX_ROUTES)) delete j[k];
      for (;;) try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(j));
        return;
      } catch (e) {
        const keys = Object.keys(j);
        if (keys.length <= 1) {
          try {
            localStorage.removeItem(CACHE_KEY);
          } catch (e2) {}
          return;
        }
        delete j[keys.sort((a, b) => (j[a].ts || 0) - (j[b].ts || 0))[0]];
      }
    }
    const todayISO = () => {
      const d = new Date;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    const specKey = s => s.origin + "-" + s.dest + ("trip" === s.kind ? "~" + s.duration : "return" === s.kind ? "<" + s.date : "");
    async function fetchRoute(spec, cc, signal) {
      let failed = 0, aborted = !1;
      const reasons = [];
      const lists = await Promise.all(Object.keys(CFF).map(cab => async function(spec, cabin, cc, signal) {
        const {kind: kind, origin: origin, dest: dest} = spec;
        const out = {
          departureDateTime: ("return" === kind ? spec.date : todayISO()) + "T00:00:00",
          originLocationCode: origin,
          destinationLocationCode: dest
        };
        const body = JSON.stringify({
          commercialFareFamilies: [ CFF[cabin] ],
          corporateCodes: [ 223293 ],
          countryOfCommencement: cc,
          currencyCode: currencyOfCountry(cc),
          itineraries: "oneway" === kind ? [ out ] : [ out, {
            originLocationCode: dest,
            destinationLocationCode: origin
          } ],
          tripDetails: "oneway" === kind ? {
            rangeOfDeparture: 360
          } : "trip" === kind ? {
            rangeOfDeparture: 360,
            tripDuration: spec.duration
          } : {
            durationFlexibility: 30,
            tripDuration: 1
          }
        });
        const res = await originalFetch.call(window, "return" === kind ? URL_RETURN : URL_, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": KEY,
            rtw: "true"
          },
          body: body,
          signal: signal
        });
        if (400 === res.status) return [];
        if (!res.ok) throw new Error("HTTP " + res.status);
        const j = await res.json();
        const curDict = j.dictionaries && j.dictionaries.currency || {};
        const amount = (v, code) => {
          if (null == v) return null;
          const dp = (curDict[code] || {}).decimalPlaces;
          return v / Math.pow(10, null == dp ? 2 : dp);
        };
        const leg = "oneway" === kind ? null : "trip" === kind ? 0 : 1;
        return (j.data || []).map(e => {
          const b = null == leg ? null : (e.bounds || [])[leg];
          const p = null == leg ? e.prices || {} : b && b.prices;
          if (!p) return null;
          const date = String((1 === leg ? e.returnDate : e.departureDate) || "").slice(0, 10);
          const miles = p.milesConversion && p.milesConversion.convertedMiles ? p.milesConversion.convertedMiles.base : null;
          const tp = p.totalPrices && p.totalPrices[0] || {};
          if (null == miles) return null;
          const row = {
            date: date,
            cabin: cabin,
            code: b && b.fareFamilyCode || e.fareFamilyCode,
            miles: miles,
            taxes: amount(tp.totalTaxes, tp.currencyCode),
            currency: tp.currencyCode || null
          };
          1 === leg && (row.out = ((e.bounds || [])[0] || {}).fareFamilyCode || null);
          return row;
        }).filter(Boolean);
      }(spec, cab, cc, signal).catch(e => {
        if (e && "AbortError" === e.name) {
          aborted = !0;
          return [];
        }
        failed++;
        const why = e && /^HTTP \d+/.test(e.message) ? e.message : "undefined" != typeof navigator && !1 === navigator.onLine ? "offline" : T("Netzfehler ohne Status");
        reasons.push(CABIN_NAME[cab] + ": " + why);
        return [];
      })));
      const best = new Map;
      lists.flat().forEach(r => {
        const k = r.date + "|" + r.cabin;
        const prev = best.get(k);
        (!prev || r.miles < prev.miles) && best.set(k, r);
      });
      return {
        days: [ ...best.values() ].sort((a, b) => a.date.localeCompare(b.date)),
        failed: failed,
        reasons: reasons,
        aborted: aborted
      };
    }
    function named(spec, days) {
      if ("oneway" === spec.kind) return days;
      const at = window.__mmCal && window.__mmCal.faresAt;
      const route = spec.origin + "-" + spec.dest;
      return days.map(d => {
        const codes = at ? at(route, d.cabin, d.miles) : [];
        return codes.indexOf(d.code) >= 0 ? d : 1 === codes.length ? Object.assign({}, d, {
          code: codes[0]
        }) : /^ZM/.test(d.code || "") && d.miles % 500 != 0 ? null : d;
      }).filter(Boolean);
    }
    let inflight = null;
    async function load(spec, grid, mark) {
      const key = specKey(spec);
      const pick = days => {
        const d = named(spec, days);
        return mark ? d.map(mark).filter(Boolean) : d;
      };
      state.pick = pick;
      state.raw = null;
      try {
        inflight && inflight.abort();
      } catch (e) {}
      inflight = null;
      const cached = readCache()[key];
      if (cached) {
        state.route = grid;
        state.raw = cached.days;
        state.days = pick(cached.days);
        byDate = null;
        state.error = null;
        state.loading = !1;
        emit();
        return;
      }
      const cc = countryOf(spec.origin);
      if (!cc) {
        state.route = null;
        state.days = [];
        byDate = null;
        state.loading = !1;
        state.error = null;
        emit();
        return;
      }
      const ctrl = "undefined" != typeof AbortController ? new AbortController : null;
      inflight = ctrl;
      state.loading = !0;
      state.error = null;
      state.route = grid;
      state.days = [];
      byDate = null;
      emit();
      try {
        const {days: days, failed: failed, reasons: reasons, aborted: aborted} = await fetchRoute(spec, cc, ctrl ? ctrl.signal : void 0);
        if (aborted || ctrl && inflight !== ctrl || state.superseded || state.route !== grid) return;
        state.raw = days;
        state.days = pick(days);
        byDate = null;
        state.error = failed ? T("{n} von 4 Kabinen nicht geladen ({reasons})", {
          n: failed,
          reasons: reasons.join(", ")
        }) : null;
        failed || writeCache(key, days);
      } catch (e) {
        e && "AbortError" === e.name || (state.error = T("nicht erreichbar ({detail})", {
          detail: e && e.message || T("Fehler")
        }));
      } finally {
        if (!ctrl || inflight === ctrl) {
          inflight = null;
          if (!state.superseded && state.route === grid) {
            state.loading = !1;
            emit();
          }
        }
      }
    }
    function none(grid) {
      try {
        inflight && inflight.abort();
      } catch (e) {}
      inflight = null;
      state.route = grid;
      state.days = [];
      state.raw = null;
      byDate = null;
      state.loading = !1;
      state.error = null;
      emit();
    }
    let namesRev = -1;
    let byDate = null;
    function indexOf(days) {
      const map = new Map;
      for (const d of days) {
        let day = map.get(d.date);
        if (!day) {
          day = {};
          map.set(d.date, day);
        }
        const prev = day[d.cabin];
        (!prev || prev.blocked && !d.blocked || !prev.blocked == !d.blocked && d.miles < prev.miles) && (day[d.cabin] = d);
      }
      return map;
    }
    const index = () => byDate = indexOf(state.days);
    state.forDate = dateStr => (byDate || index()).get(dateStr) || {};
    const others = new Map;
    function forSpec(spec) {
      const key = specKey(spec);
      if (others.has(key)) return others.get(key);
      if (state.superseded || !calendarOn() || !bbdOn()) return null;
      const cached = readCache()[key];
      if (cached) {
        others.set(key, indexOf(named(spec, cached.days)));
        return others.get(key);
      }
      const cc = spec.origin && spec.dest ? countryOf(spec.origin) : null;
      if (!cc) return null;
      others.size >= MAX_ROUTES && others.delete(others.keys().next().value);
      others.set(key, null);
      fetchRoute(spec, cc).then(r => {
        others.set(key, indexOf(named(spec, r.days)));
        r.failed || writeCache(key, r.days);
        emit();
      });
      return null;
    }
    const split = route => {
      const [origin, dest] = String(route || "").split("-");
      return {
        origin: origin,
        dest: dest
      };
    };
    state.forRoute = route => route === state.route ? state.loading ? null : byDate || index() : forSpec(Object.assign({
      kind: "oneway"
    }, split(route)));
    state.forTrip = (route, days) => forSpec(Object.assign({
      kind: "trip",
      duration: days
    }, split(route)));
    state.forReturn = (route, date) => forSpec(Object.assign({
      kind: "return",
      date: date
    }, split(route)));
    state.clearCache = () => {
      cacheMem = null;
      others.clear();
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch (e) {}
    };
    function syncRoute() {
      if (state.superseded || !calendarOn() || !bbdOn()) return;
      const cal = window.__mmCal;
      const route = cal && (cal.baseRoute ? cal.baseRoute() : String(cal.routeKey || cal.route || "").split("@")[0].split("#")[0]);
      if (!route) return;
      !function() {
        const rev = window.__mmCal && window.__mmCal.fareNamesRev || 0;
        if (rev !== namesRev) {
          namesRev = rev;
          for (const [k, v] of others) v && others.delete(k);
          if (state.raw && state.pick && !state.loading) {
            state.days = state.pick(state.raw);
            byDate = null;
            emit();
          }
        }
      }();
      const j = cal.journey;
      if (!j || "oneway" === j.kind) {
        route !== state.route && load(Object.assign({
          kind: "oneway"
        }, split(route)), route);
        return;
      }
      const leg = j.legs[0];
      if ("return" === j.kind && 0 === j.req) {
        const span = Math.round((new Date(j.legs[1].date) - new Date(leg.date)) / 864e5);
        const spec = {
          kind: "trip",
          origin: leg.o,
          dest: leg.d,
          duration: span
        };
        span >= 1 && specKey(spec) !== state.route ? load(spec, specKey(spec)) : span < 1 && state.route !== route + "|none" && none(route + "|none");
        return;
      }
      const outbound = "return" === j.kind && 1 === j.req && j.selectedBoundId ? function(id) {
        try {
          for (const b of window.__mmBounds.bounds.values()) for (const f of b.fares || []) if (f.airBoundId === id) return {
            code: f.code,
            cabin: f.cabin
          };
        } catch (e) {}
        return null;
      }(j.selectedBoundId) : null;
      if (!outbound) {
        const grid = (cal.searchRoute ? cal.searchRoute() : route) + "|none";
        grid !== state.route && none(grid);
        return;
      }
      const grid = leg.o + "-" + leg.d + "<" + leg.date + "|" + outbound.code + "/" + outbound.cabin;
      grid !== state.route && load({
        kind: "return",
        origin: leg.o,
        dest: leg.d,
        date: leg.date
      }, grid, function(outbound) {
        const F = window.__mmFareNames;
        return r => {
          const ok = F && F.combinable ? F.combinable(outbound.code, outbound.cabin, r.code, r.cabin) : r.out === outbound.code || null;
          return !0 === ok ? r : !1 === ok ? Object.assign({}, r, {
            blocked: !0
          }) : null;
        };
      }(outbound));
    }
    window.__mmCal && window.__mmCal.onUpdate && (state._off = window.__mmCal.onUpdate(syncRoute));
    syncRoute();
    try {
      window.__mmSettings && window.__mmSettings.onChange && (state._offSettings = window.__mmSettings.onChange(k => {
        if (!(state.superseded || "bbd" !== k && "calendar" !== k)) {
          calendarOn() && bbdOn() && syncRoute();
          emit();
        }
      }));
    } catch (e) {}
    try {
      window.addEventListener("pagehide", e => {
        if (!e || !e.persisted) {
          state.superseded = !0;
          try {
            state._off && state._off();
          } catch (e2) {}
          try {
            state._offSettings && state._offSettings();
          } catch (e2) {}
        }
      });
    } catch (e) {}
  })();
  (() => {
    "use strict";
    const VERSION = 168;
    if (window.__mmCalUI && window.__mmCalUI.version >= VERSION) return;
    const inherited = window.__mmCalUI;
    if (inherited) {
      inherited.superseded = !0;
      try {
        inherited._observer && inherited._observer.disconnect();
      } catch (e) {}
      try {
        inherited.teardown && inherited.teardown();
      } catch (e) {}
      try {
        inherited._off && inherited._off();
      } catch (e) {}
      try {
        inherited._offBbd && inherited._offBbd();
      } catch (e) {}
      try {
        inherited._offFx && inherited._offFx();
      } catch (e) {}
      try {
        inherited._offSettings && inherited._offSettings();
      } catch (e) {}
    }
    const T = (s, p) => window.__mmI18n ? window.__mmI18n.t(s, p) : p ? String(s).replace(/\{(\w+)\}/g, (m, k) => null != p[k] ? String(p[k]) : m) : String(s);
    const dtf = o => window.__mmI18n ? window.__mmI18n.dtf(o) : new Intl.DateTimeFormat("de-DE", o);
    const cap = s => window.__mmI18n?.cap ? window.__mmI18n.cap(s) : s;
    const nf = o => window.__mmI18n ? window.__mmI18n.nf(o) : new Intl.NumberFormat("de-DE", o);
    const CABIN_BY_LETTER = {
      X: "eco",
      R: "ecoPremium",
      I: "business",
      O: "first"
    };
    const TIER_BY_SUFFIX = {
      LIGHT: "Light",
      NC: "Comfort",
      RC: "Comfort +",
      FF: "Flex",
      NOR: "Standard",
      CLS: "Comfort",
      BXX: "Comfort",
      FLX: "Flex",
      BUZ: "Flex"
    };
    const CABIN_META = {
      eco: {
        short: "Eco",
        full: "Economy",
        color: "#4C6E48",
        rank: 1
      },
      ecoPremium: {
        short: "Prem.Eco",
        full: "Premium Economy",
        color: "#2C5744",
        rank: 2
      },
      business: {
        short: "Business",
        full: "Business",
        color: "#47616C",
        rank: 3
      },
      first: {
        short: "First",
        full: "First",
        color: "#A54A4A",
        rank: 4
      }
    };
    const INK_primary = "#05164D", INK_secondary = "#52514e", INK_muted = "#898781", INK_hairline = "#e1e0d9", INK_accent = "#1c5cab";
    const curFmt = (n, code, digits) => {
      const c = code || "EUR";
      let mine = "EUR";
      try {
        mine = window.__mmCurrency?.target?.() || "EUR";
      } catch (e) {}
      try {
        return nf({
          style: "currency",
          currency: c,
          currencyDisplay: c === mine ? "narrowSymbol" : "code",
          minimumFractionDigits: digits,
          maximumFractionDigits: digits
        }).format(n);
      } catch (e) {
        return nf({
          minimumFractionDigits: digits,
          maximumFractionDigits: digits
        }).format(n) + " " + c;
      }
    };
    const SEARCH_KEY = "airBoundsSearch";
    let searchRaw, searchParsed = null;
    function searchEntity() {
      let raw = null;
      try {
        raw = sessionStorage.getItem(SEARCH_KEY);
      } catch (e) {}
      if (raw !== searchRaw) {
        searchRaw = raw;
        try {
          const o = JSON.parse(raw);
          searchParsed = o.entities[o.selectedAirBoundsSearchId] || null;
        } catch (e) {
          searchParsed = null;
        }
      }
      return searchParsed;
    }
    const calRoute = cal => cal ? cal.baseRoute ? cal.baseRoute() : String(cal.routeKey || cal.route || "").split("@")[0].split("#")[0] : "";
    function describeFare(code, cabinFromDict) {
      if (!code) return null;
      let cabin = cabinFromDict || null;
      let tier = null;
      let split = null;
      for (let i = 2; i <= 4 && i < code.length - 2; i++) {
        const c = CABIN_BY_LETTER[code[i]];
        if (!c) continue;
        const rawTier = code.slice(i + 1);
        if (TIER_BY_SUFFIX[rawTier]) {
          split = {
            cabin: c,
            tier: TIER_BY_SUFFIX[rawTier]
          };
          break;
        }
        split = {
          cabin: c,
          tier: rawTier
        };
      }
      if (split) {
        cabin = cabin || split.cabin;
        tier = split.tier;
      }
      try {
        const fn = window.__mmFareNames;
        if (fn) {
          const t = fn.tierOf(code);
          t && (tier = t);
          const c = fn.cabinOf(code);
          c && (cabin = c);
        }
      } catch (e) {}
      cabin || (cabin = "eco");
      const meta = CABIN_META[cabin] || CABIN_META.eco;
      return {
        cabin: cabin,
        tier: tier,
        meta: meta,
        code: code,
        label: tier ? meta.short + " " + tier : meta.short
      };
    }
    const CHEVRON = {
      left: "M10 3.5 5.5 8 10 12.5",
      right: "M6 3.5 10.5 8 6 12.5",
      up: "M3.5 10 8 5.5 12.5 10",
      down: "M3.5 6 8 10.5 12.5 6"
    };
    const chevron = dir => '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="' + CHEVRON[dir] + '"/></svg>';
    const esc = s => String(null == s ? "" : s).replace(/[&<>"]/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    }[c]));
    const monthYearFmt = () => dtf({
      month: "long",
      year: "numeric"
    });
    const monthFmt = () => dtf({
      month: "long"
    });
    const monthShortFmt = () => dtf({
      month: "short"
    });
    const fmtMiles = n => "number" == typeof n ? nf().format(n) : null == n ? "" : String(n);
    const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const parseISO = s => {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(y, m - 1, d);
    };
    const state = {
      version: VERSION,
      dayOffset: 0,
      root: null,
      selectedDate: null,
      lastSearchDate: null,
      navigating: null,
      superseded: !1,
      _observer: null,
      hiddenStrip: inherited && inherited.hiddenStrip || null
    };
    if (inherited && inherited.root) try {
      inherited.root.remove();
    } catch (e) {}
    const FOLD_KEY = "mm_cal_folded";
    state.folded = (() => {
      try {
        return "1" === localStorage.getItem(FOLD_KEY);
      } catch (e) {
        return !1;
      }
    })();
    function activeBoundIdx() {
      try {
        const bd = window.__mmBounds;
        const first = bd && bd.bounds && Array.isArray(bd.current) && bd.current.length ? bd.bounds.get(bd.current[0]) : null;
        const its = searchEntity().itineraries || [];
        if (first && its.length > 1) {
          const loc = (bd.dictionaries || {}).location || {};
          const same = (iata, code) => iata === code || (loc[iata] || {}).cityCode === code;
          const outO = its[0].originLocationCode;
          if (same(first.origin, its[1].originLocationCode) && !same(first.origin, outO)) return 1;
          if (same(first.origin, outO)) return 0;
        }
      } catch (e) {}
      const m = /availability\/(\d+)/.exec(location.pathname || "");
      return m ? parseInt(m[1], 10) : 0;
    }
    let stripRef = null;
    function nativeStrip() {
      stripRef && stripRef.isConnected || (stripRef = document.querySelector("refx-calendar-cont"));
      return stripRef;
    }
    function currentSearchDate() {
      try {
        const sig = window.__mmBounds && window.__mmBounds.listSig;
        const its = sig && JSON.parse(sig).i;
        const it = its && its[Math.min(activeBoundIdx(), its.length - 1)];
        if (it && /^\d{4}-\d{2}-\d{2}/.test(it.departureDateTime || "")) return it.departureDateTime.slice(0, 10);
      } catch (e) {}
      try {
        const its = searchEntity().itineraries;
        const it = its[Math.min(activeBoundIdx(), its.length - 1)];
        const base = calRoute(window.__mmCal);
        const storeRoute = it.originLocationCode && it.destinationLocationCode ? it.originLocationCode + "-" + it.destinationLocationCode : null;
        return base && storeRoute && storeRoute !== base ? templateDate() : it.departureDateTime.slice(0, 10);
      } catch (e) {
        return templateDate();
      }
    }
    function templateDate() {
      try {
        const cal = window.__mmCal;
        const base = calRoute(cal);
        const b = JSON.parse(cal.template.body);
        const it = (b.itineraries || [])[Math.min(activeBoundIdx(), (b.itineraries || []).length - 1)];
        return base && it.originLocationCode + "-" + it.destinationLocationCode === base ? String(it.departureDateTime).slice(0, 10) : null;
      } catch (e) {
        return null;
      }
    }
    const SPAN = 15, STEP = 7;
    const startOfToday = () => {
      const t = new Date;
      t.setHours(0, 0, 0, 0);
      return t;
    };
    function dayRange() {
      let min = startOfToday(), max = null;
      try {
        const its = searchEntity().itineraries || [];
        const idx = Math.min(activeBoundIdx(), its.length - 1);
        const day = it => it && parseISO(String(it.departureDateTime).slice(0, 10));
        const prev = day(its[idx - 1]), next = day(its[idx + 1]);
        prev && prev > min && (min = prev);
        next && (max = next);
      } catch (e) {}
      return {
        min: min,
        max: max
      };
    }
    function minOffset() {
      const anchor = state.selectedDate || currentSearchDate() || iso(new Date);
      return Math.round((dayRange().min - parseISO(anchor)) / 864e5) + 7;
    }
    function syncAnchorToSearch() {
      const searchDate = currentSearchDate();
      if (searchDate) if (state.navigating) state.lastSearchDate = state.lastSearchDate || searchDate; else {
        if (state.lastSearchDate && searchDate !== state.lastSearchDate) {
          state.selectedDate = null;
          state.dayOffset = 0;
          state.pickNotice = null;
        }
        state.lastSearchDate = searchDate;
      }
    }
    function windowStart() {
      const anchor = state.selectedDate || currentSearchDate() || iso(new Date);
      const d = parseISO(anchor);
      d.setDate(d.getDate() - 7 + Math.max(state.dayOffset, minOffset()));
      return d;
    }
    function cellsFor(days, dateStr, bbdDay, searchDay) {
      const out = {};
      const cabKey = (c, fallback) => c && CABIN_META[c] ? c : fallback;
      const bbd = window.__mmBBD;
      const b = bbdShown() ? void 0 !== bbdDay ? bbdDay : bbd && !bbd.superseded && bbd.days && bbd.days.length ? bbd.forDate(dateStr) : null : null;
      if (b) for (const cab of Object.keys(b)) {
        const x = b[cab];
        const fare = describeFare(x.code, cab);
        fare && (out[cabKey(cab, cabKey(fare.cabin, "eco"))] = {
          fare: fare,
          miles: x.miles,
          taxes: x.taxes,
          currency: x.currency,
          src: "bbd",
          blocked: !!x.blocked,
          code: x.code
        });
      }
      const rec = days.get(dateStr);
      if (rec && rec.available && rec.fares) for (const f of rec.fares) {
        const fare = describeFare(f.code, f.cabin);
        if (!fare) continue;
        const cab = cabKey(fare.cabin, "eco");
        const prev = out[cab];
        prev && !prev.blocked && prev.miles <= f.miles || (out[cab] = {
          fare: fare,
          miles: f.miles,
          taxes: f.taxes,
          currency: f.currency,
          src: "cal"
        });
      }
      const cal = window.__mmCal;
      const s = void 0 !== searchDay ? searchDay : cal && cal.searchFares ? cal.searchFares(cal.faresRoute ? cal.faresRoute() : cal.searchRoute ? cal.searchRoute() : calRoute(cal), dateStr) : null;
      if (s) for (const cab of Object.keys(s)) {
        const x = s[cab];
        const fare = describeFare(x.code, cab);
        if (!fare) continue;
        const k = cabKey(cab, cabKey(fare.cabin, "eco"));
        out[k] && !out[k].blocked && out[k].miles < x.miles || (out[k] = {
          fare: fare,
          miles: x.miles,
          taxes: x.taxes,
          currency: x.currency,
          src: "search",
          ts: x.ts
        });
      }
      return out;
    }
    function page(v) {
      state.dayOffset = 0 === v ? 0 : Math.max(minOffset(), state.dayOffset + v * STEP);
      render();
      let live = document.getElementById("mmcal-live");
      if (!live) {
        live = document.createElement("div");
        live.id = "mmcal-live";
        live.className = "mmcal-live";
        live.setAttribute("aria-live", "polite");
        document.body.appendChild(live);
      }
      const a = windowStart(), b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + SPAN - 1);
      live.textContent = rangeLabel(a, b);
    }
    const ROWS = [ "", "eco", "ecoPremium", "business", "first" ];
    const keyOf = el => el.dataset.date + "|" + (el.dataset.cabin || "");
    function cellAt(date, cabin) {
      return state.root.querySelector(cabin ? '.mmcal-c[data-date="' + date + '"][data-cabin="' + cabin + '"]' : '.mmcal-hd[data-date="' + date + '"]');
    }
    function onGridKey(e) {
      const t = e.target;
      if (!t.matches || !t.matches(".mmcal-hd, .mmcal-c")) return;
      if ("PageUp" === e.key || "PageDown" === e.key) {
        e.preventDefault();
        const col = [ ...state.root.querySelectorAll(".mmcal-hd") ].findIndex(h => h.dataset.date === t.dataset.date);
        const btn = state.root.querySelector('[data-nav="' + ("PageUp" === e.key ? -1 : 1) + '"]');
        if (!btn || btn.disabled) return;
        page("PageUp" === e.key ? -1 : 1);
        const now = [ ...state.root.querySelectorAll(".mmcal-hd") ][col];
        const next = now && cellAt(now.dataset.date, t.dataset.cabin || "");
        if (next && !next.disabled) {
          state.focusKey = keyOf(next);
          [ ...state.root.querySelectorAll('[tabindex="0"]') ].forEach(x => x.tabIndex = -1);
          next.tabIndex = 0;
          next.focus();
        }
        return;
      }
      const heads = [ ...state.root.querySelectorAll(".mmcal-hd") ];
      let c = heads.findIndex(h => h.dataset.date === t.dataset.date);
      let r = t.classList.contains("mmcal-hd") ? 0 : ROWS.indexOf(t.dataset.cabin);
      if ("ArrowLeft" === e.key) c--; else if ("ArrowRight" === e.key) c++; else if ("ArrowUp" === e.key) r--; else if ("ArrowDown" === e.key) r++; else if ("Home" === e.key) c = 0; else {
        if ("End" !== e.key) return;
        c = heads.length - 1;
      }
      e.preventDefault();
      if (c < 0 || c >= heads.length || r < 0 || r >= ROWS.length) return;
      const next = cellAt(heads[c].dataset.date, ROWS[r]);
      if (next && !next.disabled) {
        t.tabIndex = -1;
        next.tabIndex = 0;
        state.focusKey = keyOf(next);
        next.focus();
      }
    }
    let tipEl = null;
    let tipFor = null;
    function showTip(el) {
      const text = el && el.dataset.tip;
      if (!text) {
        hideTip();
        return;
      }
      if (el === tipFor && tipEl && tipEl.isConnected && tipEl.textContent === text) return;
      if (!tipEl || !tipEl.isConnected) {
        tipEl = document.getElementById("mmcal-tip") || document.createElement("div");
        tipEl.id = "mmcal-tip";
        tipEl.setAttribute("aria-hidden", "true");
        document.body.appendChild(tipEl);
      }
      tipEl.textContent = text;
      const r = el.getBoundingClientRect();
      const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
      const left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8));
      const top = r.top - h - 6 >= 8 ? r.top - h - 6 : r.bottom + 6;
      tipEl.style.left = Math.round(left) + "px";
      tipEl.style.top = Math.round(top) + "px";
      tipEl.classList.add("is-on");
      tipFor = el;
    }
    function hideTip() {
      tipFor = null;
      tipEl && tipEl.classList.remove("is-on");
    }
    function onGridClick(e) {
      const b = e.target.closest && e.target.closest("[data-date], [data-nav], [data-load], [data-loadmonth], [data-pools], [data-fold], [data-reload]");
      if (!b || !state.root || !state.root.contains(b) || b.disabled) return;
      const cal = window.__mmCal;
      if (b.dataset.reload) try {
        window.location.reload();
      } catch (err) {} else if (b.dataset.load) ensureMonthLoaded({
        force: !0
      }); else if (b.dataset.pools) {
        const on = !cal.allCabins;
        cal.setAllCabins(on);
        on && ensureMonthLoaded();
      } else if (b.dataset.loadmonth) {
        const [y, mo] = b.dataset.loadmonth.split("-").map(Number);
        cal.loadMonth(y, mo, {
          force: !0
        });
      } else b.dataset.fold ? function(on) {
        state.folded = !!on;
        try {
          localStorage.setItem(FOLD_KEY, on ? "1" : "0");
        } catch (e) {}
        render();
      }(!state.folded) : b.dataset.nav ? page(Number(b.dataset.nav)) : selectDate(b.dataset.date, b.dataset.cabin);
    }
    const ORDER = [ "eco", "ecoPremium", "business", "first" ];
    function monthLoadState(v, i, cols) {
      const cal = v.cal;
      const d = v.win[i].d;
      const mk = v.win[i].dateStr.slice(0, 7);
      let done = !0;
      try {
        done = monthDone(cal, {
          y: d.getFullYear(),
          m: d.getMonth()
        });
      } catch (e) {}
      const key = (cal.route || "") + "|" + d.getFullYear() + "-" + d.getMonth();
      const queued = !(!cal.isQueued || !cal.isQueued(d.getFullYear(), d.getMonth()));
      const busy = cal.loading === mk || autoPending.has(key) || queued;
      if (done) return null;
      const mKey = d.getFullYear() + "-" + pad(d.getMonth() + 1);
      const inMonth = list => (list || []).some(x => x && String(x.date).slice(0, 7) === mKey);
      const inCal = inMonth(cal.days);
      const bbd = bbdShown() && (() => {
        const b = window.__mmBBD;
        return !(!b || b.superseded || !inMonth(b.days));
      })();
      const name = monthFmt().format(d);
      const status = T("Aktuelle Anzeige: {state}", {
        state: T(inCal ? "Kalenderpreise unvollständig" : bbd ? "Nur BBD-Preise" : "Keine Preise")
      });
      const word = T(queued ? cols >= 4 ? "Kalender wartet …" : "wartet …" : busy ? cols >= 4 ? "Kalender lädt …" : "lädt …" : cols >= 4 ? "Kalender laden" : "Laden");
      const dot = cols < 2;
      return {
        button: '<button type="button" class="mmcal-loadbtn' + (busy ? " is-busy" : "") + (dot ? " is-dot" : "") + '"' + (busy ? " disabled" : ' data-loadmonth="' + d.getFullYear() + "-" + d.getMonth() + '"') + (dot ? ' aria-label="' + esc(word) + '"' : "") + ' title="' + esc(T("Holt die Kalenderpreise für {month}.", {
          month: name
        }) + " " + status + "." + (bbd && !inCal ? " " + T("Können veraltet oder nicht mehr verfügbar sein.") : "")) + '">' + '<span class="mmcal-loaddot"></span>' + (dot ? "" : word) + "</button>",
        status: status,
        text: busy || cols < 7 ? "" : '<span class="mmcal-loadsub">' + esc(status) + "</span>"
      };
    }
    function emptyCellHtml(v, w, cab, thin, nm) {
      const meta = CABIN_META[cab];
      const wait = v.waiting(w.dateStr, cab);
      const tip = v.longDate(w.d) + "\n" + (wait ? T("{cabin}: wird geladen …", {
        cabin: meta.full
      }) : T("{cabin}: kein bekannter Preis", {
        cabin: meta.full
      }) + "\n" + T("Klicken startet die Suche für diesen Tag.")) + (w.dead ? "\n" + T("Mit dem gewählten Hinflug kein Angebot an diesem Tag.") : "");
      return '<button type="button" class="mmcal-c is-none' + nm + (thin ? " is-thin" : "") + (wait ? " is-wait" : "") + (w.dead ? " is-deadday" : "") + (state.navigating === w.dateStr ? " is-busy" : "") + '" style="--mc:' + meta.color + '" data-date="' + w.dateStr + '" data-cabin="' + cab + '" tabindex="-1"' + (w.off ? " disabled" : "") + ' data-tip="' + esc(tip) + '" aria-label="' + esc(tip.replace(/\n/g, ", ")) + '">' + '<span class="mmcal-dash">–</span></button>';
    }
    function priceCellHtml(v, w, cab, x, best, nm) {
      const meta = CABIN_META[cab];
      const isBbd = "bbd" === x.src;
      const busy = state.navigating === w.dateStr;
      const fx = window.__mmCurrency;
      const eur = (() => {
        try {
          return null != x.taxes && fx ? fx.label(x.taxes, x.currency) : "";
        } catch (e) {
          return "";
        }
      })();
      const eurVal = (() => {
        try {
          return null != x.taxes && x.currency && fx && x.currency !== fx.target() ? fx.convert(x.taxes, x.currency) : null;
        } catch (e) {
          return null;
        }
      })();
      const tipTax = null != x.taxes ? "\n" + T("Zuzahlung {amount}", {
        amount: curFmt(Math.round(x.taxes), x.currency, 0) + (eur ? " (" + eur + ")" : "")
      }) : "";
      const isBest = null != best && x.miles === best && !w.off && !x.blocked;
      const tipText = v.longDate(w.d) + "\n" + meta.full + " " + (x.fare.tier || "") + "\n" + T("{miles} Meilen", {
        miles: fmtMiles(x.miles)
      }) + tipTax + (isBest ? "\n" + T("Günstigster Tag im Ausschnitt") : "") + (x.blocked ? "\n" + T("Mit gewähltem Hinflug nicht buchbar.") + function(code, cab) {
        const F = window.__mmFareNames;
        const g = F && F.pairGroup ? F.pairGroup(code) : null;
        return "light" === g ? "\n" + T("Buchbar mit {fare} im Hinflug.", {
          fare: CABIN_META[cab].full + " Light"
        }) : "comfort" === g ? "\n" + T("Buchbar mit Comfort im Hinflug, jede Kabine.") : "plus" === g ? "\n" + T("Buchbar mit Comfort +, Flex oder Standard im Hinflug, jede Kabine.") : "";
      }(x.code, cab) : "") + "\n" + T("Quelle: {source}", {
        source: isBbd ? "Best-by-Day" : "search" === x.src ? T("Suche {time}", {
          time: (ts = x.ts, dtf({
            hour: "2-digit",
            minute: "2-digit"
          }).format(ts))
        }) : T("Kalender")
      }) + (w.dead ? "\n" + T("Mit dem gewählten Hinflug kein Angebot an diesem Tag.") : "");
      var ts;
      return '<button type="button" class="mmcal-c ' + (isBbd ? "is-bbd" : "is-cal") + nm + (x.blocked ? " is-blocked" : isBest ? " is-best" : null != best ? " is-dear" : "") + (w.dead ? " is-deadday" : "") + (busy ? " is-busy" : "") + '" style="--mc:' + meta.color + '" data-date="' + w.dateStr + '" data-cabin="' + cab + '" tabindex="-1"' + (w.off ? " disabled" : "") + ' data-tip="' + esc(tipText) + '" aria-label="' + esc(tipText.replace(/\n/g, ", ")) + '">' + '<span class="mmcal-tier">' + esc(x.fare.tier || "") + (busy ? " · " + esc(T("sucht …")) : "") + "</span>" + '<span class="mmcal-miles">' + esc(fmtMiles(x.miles)) + "</span>" + (null != x.taxes ? '<span class="mmcal-tax">+ ' + esc(null != eurVal ? curFmt(Math.round(eurVal), fx.target(), 0) : curFmt(Math.round(x.taxes), x.currency, 0)) + "</span>" : "") + "</button>";
    }
    function paint(html) {
      if (state.root.__mmcalHtml !== html) {
        state.root.innerHTML = html;
        state.root.__mmcalHtml = html;
      }
    }
    function render() {
      const cal = window.__mmCal;
      if (!state.root || !cal) return;
      syncAnchorToSearch();
      const hadFocus = state.root.contains(document.activeElement);
      const route = function() {
        try {
          const its = searchEntity().itineraries || [];
          return its.length < 2 ? "" : '<span class="mmcal-bound">' + function(its, idx) {
            return function(its) {
              return 2 === its.length && its[1].originLocationCode === its[0].destinationLocationCode && its[1].destinationLocationCode === its[0].originLocationCode;
            }(its) ? T(idx > 0 ? "Rückflug:" : "Hinflug:") : T("{n}. Abschnitt:", {
              n: idx + 1
            });
          }(its, activeBoundIdx()) + "</span>";
        } catch (e) {
          return "";
        }
      }() + esc((cal.route || "").replace("-", " → "));
      if (state.folded) {
        state.root.classList.add("is-folded");
        paint('<div class="mmcal-head">' + '<span class="mmcal-route">' + route + "</span>" + '<span class="mmcal-nav">' + '<button type="button" class="mmcal-btn is-wide" data-fold="1" aria-expanded="false">' + T("Kalender zeigen") + chevron("down") + "</button>" + "</span>" + "</div>");
        return;
      }
      state.root.classList.remove("is-folded");
      const v = function(cal) {
        const days = new Map(cal.days.map(d => [ d.date, d ]));
        const searchDate = currentSearchDate();
        const deadDays = activeBoundIdx() > 0 ? (() => {
          const dead = stripNoOfferDates();
          try {
            cal.noOffer && cal.noOffer.days && cal.noOffer.days.forEach(d => dead.add(d));
          } catch (e) {}
          return dead;
        })() : null;
        const start = windowStart();
        const range = dayRange();
        const win = [];
        for (let i = 0; i < SPAN; i++) {
          const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
          const dateStr = iso(d);
          win.push({
            d: d,
            dateStr: dateStr,
            cells: cellsFor(days, dateStr),
            dead: !(!deadDays || !deadDays.has(dateStr)),
            off: d < range.min || !!range.max && d > range.max
          });
        }
        const monthPhase = new Map;
        const monthPools = new Map;
        win.forEach(w => {
          const key = w.dateStr.slice(0, 7);
          if (monthPhase.has(key)) return;
          const [y, mo] = key.split("-").map(Number);
          let done = !1;
          try {
            done = monthDone(cal, {
              y: y,
              m: mo - 1
            });
          } catch (e) {}
          monthPhase.set(key, cal.loading === key ? "loading" : done ? "done" : "pending");
          let pending = null;
          try {
            pending = cal.poolsPendingFor ? cal.poolsPendingFor(y, mo - 1) : null;
          } catch (e) {}
          monthPools.set(key, pending);
        });
        return {
          cal: cal,
          win: win,
          searchDate: searchDate,
          frameDate: state.selectedDate || searchDate,
          atStart: iso(start) === iso(range.min),
          atEnd: win[SPAN - 1].off,
          startsMonth: win.map((w, i) => 0 === i || w.d.getMonth() !== win[i - 1].d.getMonth()),
          known: win.filter(w => Object.keys(w.cells).length).length,
          waiting: (dateStr, cab) => {
            const key = dateStr.slice(0, 7);
            if ("loading" !== monthPhase.get(key)) return !1;
            const pending = monthPools.get(key);
            return !(cab && API_CABIN[cab] && pending) || pending.indexOf(API_CABIN[cab]) >= 0;
          },
          longDate: dt => cap(dtf({
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
          }).format(dt))
        };
      }(cal);
      const rows = function(v) {
        let html = "";
        let anyBest = !1, anyNone = !1, anyBlocked = !1;
        const cabinsPresent = new Set;
        for (const cab of ORDER) {
          const meta = CABIN_META[cab];
          const rlWait = v.win.some(w => v.waiting(w.dateStr, cab));
          const thin = !rlWait && !v.win.some(w => w.cells[cab]);
          const priced = v.win.filter(w => !w.off && w.cells[cab] && !w.cells[cab].blocked && "number" == typeof w.cells[cab].miles).map(w => w.cells[cab].miles);
          const best = priced.length && new Set(priced).size > 1 ? Math.min(...priced) : null;
          null != best && (anyBest = !0);
          html += '<div class="mmcal-rl' + (rlWait ? " is-wait" : "") + (thin ? " is-thin" : "") + '"' + (rlWait ? ' title="' + esc(T("{cabin}: Kalenderpreise werden geholt.", {
            cabin: meta.full
          })) + '"' : "") + '><span class="mmcal-pip" style="background:' + meta.color + '"></span>' + meta.short + "</div>";
          v.win.forEach((w, i) => {
            const nm = v.startsMonth[i] && i > 0 ? " mmcal-newmo" : "";
            const x = w.cells[cab];
            if (x) {
              cabinsPresent.add(cab);
              x.blocked && !w.off && (anyBlocked = !0);
              html += priceCellHtml(v, w, cab, x, best, nm);
            } else {
              v.waiting(w.dateStr, cab) || w.off || (anyNone = !0);
              html += emptyCellHtml(v, w, cab, thin, nm);
            }
          });
        }
        return {
          html: html,
          anyBest: anyBest,
          anyNone: anyNone,
          anyBlocked: anyBlocked,
          cabinsPresent: cabinsPresent
        };
      }(v);
      const s = function(cal, v) {
        const anchor = anchorMonth();
        const anchorDone = anchor.length > 0 && anchor.every(m => monthDone(cal, m) || autoTried.has(cal.route + "|" + m.k));
        const searching = !cal.loading && cal.searchingSince && !anchorDone && Date.now() - cal.searchingSince < 45e3;
        if (state._searchTimer) {
          clearTimeout(state._searchTimer);
          state._searchTimer = null;
        }
        if (searching) {
          const left = 45e3 - (Date.now() - cal.searchingSince);
          state._searchTimer = setTimeout(() => {
            state._searchTimer = null;
            !state.superseded && calendarOn() && state.root && render();
          }, left + 200);
        }
        const blocked = !(!cal.blocked || !cal.blocked());
        const isLoading = !!cal.loading || !!searching && !blocked;
        const loadingMonth = (() => {
          const m = /^(\d{4})-(\d{2})$/.exec(String(cal.loading || ""));
          return m ? cap(monthYearFmt().format(new Date(Number(m[1]), Number(m[2]) - 1, 1))) : "";
        })();
        const g = cal.gate;
        const throttled = !!(g && g.waiting > 0 && g.limits && g.starts && g.starts.length >= g.limits.perWindow);
        return {
          blocked: blocked,
          isLoading: isLoading,
          text: (cal.progress && cal.progress.total > 1 ? T("Kabinen werden geladen … {done}/{total}", {
            done: cal.progress.done,
            total: cal.progress.total
          }) : T(cal.loading && cal.blockedSince ? "Prüft, ob die Sperre vorbei ist …" : "Preise werden geladen …")) + (loadingMonth ? " · " + loadingMonth : "") + (throttled ? " · " + T("gedrosselt, damit der Server nicht sperrt") : ""),
          overlay: isLoading && !v.known
        };
      }(cal, v);
      const selIdx = v.win.findIndex(w => w.dateStr === v.searchDate);
      const selframe = selIdx < 0 ? "" : '<div class="mmcal-selframe" style="grid-column:' + (selIdx + 2) + " / " + (selIdx + 3) + ";grid-row:2 / " + (3 + ORDER.length) + '"></div>';
      const body = '<div class="mmcal-scroll"><div class="mmcal-grid" style="grid-template-columns:92px repeat(' + SPAN + ', minmax(52px, 1fr))">' + function(v) {
        const win = v.win;
        let band = "<div></div>";
        for (let i = 0; i < win.length; ) {
          let j = i + 1;
          for (;j < win.length && !v.startsMonth[j]; ) j++;
          const dt = win[i].d;
          const wide = j - i >= 3;
          const showYear = 0 === i || dt.getFullYear() !== win[i - 1].d.getFullYear();
          const full = cap(monthYearFmt().format(dt));
          const label = wide ? cap(monthFmt().format(dt)) + (showYear ? ' <span class="yr">' + dt.getFullYear() + "</span>" : "") : cap(monthShortFmt().format(dt));
          const st = monthLoadState(v, i, j - i);
          band += '<div class="mmcal-mo' + (i > 0 ? " mmcal-newmo" : "") + '" style="grid-column: span ' + (j - i) + '" title="' + esc(full + (st ? ". " + st.status : "")) + '">' + '<span class="mmcal-moname">' + label + "</span>" + (st ? st.button + st.text : "") + "</div>";
          i = j;
        }
        return band;
      }(v) + function(v) {
        const DOW = window.__mmI18n ? window.__mmI18n.days() : [ "Mo", "Di", "Mi", "Do", "Fr", "Sa", "So" ];
        const todayStr = iso(startOfToday());
        let heads = "<div></div>";
        v.win.forEach((w, i) => {
          const any = Object.keys(w.cells).length;
          const headTip = w.dead ? T("{date}: mit dem gewählten Hinflug kein Angebot", {
            date: v.longDate(w.d)
          }) : v.longDate(w.d);
          heads += '<button type="button" class="mmcal-hd' + (w.dateStr === v.frameDate ? " is-sel" : "") + (w.dead ? " is-dead" : "") + (any || v.waiting(w.dateStr) ? "" : " is-empty") + (v.startsMonth[i] && i > 0 ? " mmcal-newmo" : "") + (0 === w.d.getDay() || 6 === w.d.getDay() ? " is-we" : "") + (w.dateStr === todayStr ? " is-today" : "") + '" data-date="' + w.dateStr + '" tabindex="-1"' + (w.off ? " disabled" : "") + ' data-tip="' + esc(headTip) + '" aria-label="' + esc(headTip) + '">' + '<span class="mmcal-dw">' + DOW[(w.d.getDay() + 6) % 7] + "</span>" + '<span class="mmcal-dn">' + w.d.getDate() + "</span></button>";
        });
        return heads;
      }(v) + rows.html + selframe + "</div></div>" + (s.overlay ? '<div class="mmcal-overlay"><span class="mmcal-spinner"></span>' + s.text + "</div>" : "") + function(cal, v, s) {
        const retryBtn = cls => cal.authDead ? ' <button type="button" class="' + cls + '" data-reload="1">' + T("Seite neu laden") + "</button>" : ' <button type="button" class="' + cls + '" data-load="1">' + T(s.blocked ? "Jetzt versuchen" : "Erneut versuchen") + "</button>";
        const blockNote = s.blocked ? ' <span class="mmcal-count">' + esc(blockCountdown(cal)) + "</span>" : "";
        let html = "";
        if (v.known || s.isLoading) v.known && cal.error && !s.isLoading ? html += '<div class="mmcal-errline">' + esc(cal.error) + blockNote + retryBtn("mmcal-linkbtn") + "</div>" : v.known && !s.isLoading && cal.poolErrors && cal.poolErrors.length && (html += '<div class="mmcal-errline">' + T("Nicht geladen: {list}", {
          list: esc(cal.poolErrors.map(p => {
            return ((pool = p.pool) ? CABIN_OPTION[pool] || pool : T("gesuchte Kabine")) + " (" + p.why + ")";
            var pool;
          }).join(", "))
        }) + retryBtn("mmcal-linkbtn") + "</div>"); else {
          const span = rangeLabel(v.win[0].d, v.win[v.win.length - 1].d);
          html += cal.error ? '<div class="mmcal-msg mmcal-err">' + esc(cal.error) + blockNote + retryBtn("mmcal-btn is-wide") + "</div>" : function(win) {
            const cal = window.__mmCal;
            if (!cal || "function" != typeof cal.hasMonth) return !1;
            const seen = new Set;
            for (const w of win) {
              const key = w.d.getFullYear() + "-" + w.d.getMonth();
              if (!seen.has(key)) {
                seen.add(key);
                if (!monthDone(cal, {
                  y: w.d.getFullYear(),
                  m: w.d.getMonth()
                })) return !1;
              }
            }
            return !0;
          }(v.win) ? '<div class="mmcal-msg">' + T("Keine Prämienflüge vom {range}.", {
            range: span
          }) + "</div>" : '<div class="mmcal-msg">' + T("Für {range} sind noch keine Preise geladen.", {
            range: span
          }) + " " + '<button type="button" class="mmcal-btn is-wide" data-load="1">' + T("Preise laden") + "</button></div>";
        }
        const bbd = window.__mmBBD;
        bbd && bbd.error && bbdShown() && (html += '<div class="mmcal-errline">Best-by-day: ' + esc(bbd.error) + "</div>");
        state.pickNotice && (html += '<div class="mmcal-noteline">' + esc(state.pickNotice) + "</div>");
        return html;
      }(cal, v, s);
      const legend = function(v, r) {
        return [ v.known && !ORDER.some(c => r.cabinsPresent.has(c)) ? "<span>" + T("keine Verfügbarkeit im Zeitraum") + "</span>" : "", r.anyBest ? "<span>" + T("dunkler: teurer als der günstigste Tag") + "</span>" : "", r.anyNone ? "<span>– " + T("kein bekannter Preis") + "</span>" : "", r.anyBlocked ? '<span><i class="mmcal-lgblk"></i>' + T("nicht mit gewähltem Hinflug buchbar") + "</span>" : "", v.win.some(w => w.dead) ? "<span>" + T("<s>Tag</s> kein Angebot zum Hinflug") + "</span>" : "", travellerCount() > 1 ? "<span>" + T("Preise pro Erwachsener") + "</span>" : "" ].join("");
      }(v, rows);
      const wantAll = !!cal.allCabins;
      paint('<div class="mmcal-head">' + '<span class="mmcal-route">' + route + "</span>" + (s.isLoading && v.known ? '<span class="mmcal-spinner mmcal-headspin" title="' + esc(s.text) + '"></span>' : "") + '<span class="mmcal-nav">' + '<button type="button" class="mmcal-btn" data-nav="-1"' + (v.atStart ? " disabled" : "") + ' aria-label="' + T("7 Tage zurück") + '">' + chevron("left") + "</button>" + '<button type="button" class="mmcal-btn is-wide" data-nav="0"' + (state.dayOffset ? "" : " disabled") + ">" + T("zum Suchdatum") + "</button>" + '<button type="button" class="mmcal-btn" data-nav="1"' + (v.atEnd ? " disabled" : "") + ' aria-label="' + T("7 Tage weiter") + '">' + chevron("right") + "</button>" + '<button type="button" class="mmcal-btn mmcal-fold" data-fold="1" aria-expanded="true"' + ' aria-label="' + T("Kalender einklappen") + '" title="' + T("Kalender einklappen") + '">' + chevron("up") + "</button>" + "</span>" + "</div>" + '<div class="mmcal-body">' + body + "</div>" + '<div class="mmcal-foot">' + '<button type="button" class="mmcal-pool" data-pools="1" aria-pressed="' + wantAll + '"' + (s.isLoading ? " disabled" : "") + ' title="' + T("Vier Abfragen pro Monat statt einer. Kann Tarife zeigen, die eine einzelne Abfrage nicht findet. Dauert länger.") + '">' + (wantAll ? "☑" : "☐") + " " + T("Alle Kabinen") + "</button>" + (legend ? '<span class="mmcal-legend">' + legend + "</span>" : "") + "</div>");
      !function(blocked) {
        if (state._blockTick) {
          clearInterval(state._blockTick);
          state._blockTick = null;
        }
        blocked && (state._blockTick = setInterval(() => {
          const c = window.__mmCal;
          const stop = () => {
            clearInterval(state._blockTick);
            state._blockTick = null;
          };
          if (state.superseded || !state.root || !c || !calendarOn()) {
            stop();
            return;
          }
          const el = state.root.querySelector(".mmcal-count");
          el && (el.textContent = blockCountdown(c));
          if (!c.blocked()) {
            stop();
            autoLoad();
          }
        }, 1e3));
      }(s.blocked);
      !function() {
        const root = state.root;
        if (root && !root.__mmcalWired) {
          root.__mmcalWired = !0;
          root.addEventListener("click", onGridClick);
          root.addEventListener("keydown", onGridKey);
          root.addEventListener("focusin", e => {
            const t = e.target.closest && e.target.closest(".mmcal-hd, .mmcal-c");
            if (t) {
              state.focusKey = keyOf(t);
              showTip(t);
            }
          });
          root.addEventListener("focusout", hideTip);
          root.addEventListener("mouseover", e => showTip(e.target.closest && e.target.closest("[data-tip]")));
          root.addEventListener("mouseleave", hideTip);
        }
      }();
      !function(focus) {
        const all = [ ...state.root.querySelectorAll(".mmcal-hd, .mmcal-c") ];
        if (!all.length) return;
        const [d, c] = (state.focusKey || "").split("|");
        const pick = state.focusKey && cellAt(d, c) || all.find(el => el.classList.contains("is-sel")) || all.find(el => !el.disabled);
        if (pick && !pick.disabled) {
          pick.tabIndex = 0;
          focus && pick.focus();
        }
      }(hadFocus);
    }
    function anchorMonth() {
      const a = state.selectedDate || currentSearchDate();
      if (!a) return [];
      const d = parseISO(a);
      return [ {
        k: d.getFullYear() + "-" + d.getMonth(),
        y: d.getFullYear(),
        m: d.getMonth()
      } ];
    }
    function monthDone(cal, m) {
      return cal.allCabins && "function" == typeof cal.hasAllPools ? cal.hasAllPools(m.y, m.m) : cal.hasMonth(m.y, m.m);
    }
    async function ensureMonthLoaded(opts = {}) {
      const cal = window.__mmCal;
      if (cal && cal.loadMonth) for (const m of function() {
        const start = windowStart();
        const out = [];
        for (let i = 0; i < SPAN; i++) {
          const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
          const k = d.getFullYear() + "-" + d.getMonth();
          out.some(m => m.k === k) || out.push({
            k: k,
            y: d.getFullYear(),
            m: d.getMonth()
          });
        }
        return out;
      }()) monthDone(cal, m) || await cal.loadMonth(m.y, m.m, opts);
    }
    function blockCountdown(cal) {
      const left = Math.max(0, (cal.blockedUntil || 0) - Date.now());
      const m = Math.floor(left / 6e4), s = Math.floor(left % 6e4 / 1e3);
      return T("Nächster Versuch in {time}.", {
        time: m + ":" + String(s).padStart(2, "0")
      });
    }
    const autoTried = new Set;
    const autoPending = new Set;
    const autoFails = new Map;
    const MAX_AUTO_FAILS = 3;
    const AUTO_BACKOFF_MS = 15e3;
    let autoBlockedUntil = 0;
    let autoRunning = !1;
    const STALE_RETRY_MS = 1200;
    const MAX_STALE_RETRIES = 3;
    let staleRetry = null;
    let staleRetries = 0;
    async function autoLoad() {
      const cal = window.__mmCal;
      if (autoRunning || !cal || !cal.loadMonth || !cal.route || cal.loading) return;
      if (!state.selectedDate && !currentSearchDate()) return;
      if (Date.now() < autoBlockedUntil) return;
      if (cal.blocked && cal.blocked()) return;
      autoRunning = !0;
      let staleSeen = !1;
      try {
        for (const m of anchorMonth()) {
          const k = cal.route + "|" + m.k;
          autoTried.has(k) || monthDone(cal, m) || autoPending.add(k);
        }
        for (const m of anchorMonth()) {
          const key = cal.route + "|" + m.k;
          if (autoTried.has(key) || monthDone(cal, m)) continue;
          state.root && render();
          let r;
          try {
            r = await cal.loadMonth(m.y, m.m);
          } finally {
            autoPending.delete(key);
          }
          if ("stale" === r) {
            staleSeen = !0;
            continue;
          }
          if ("blocked" === r || "queued" === r) continue;
          staleRetries = 0;
          if ("error" !== r) {
            autoTried.add(key);
            autoFails.delete(key);
            continue;
          }
          const n = (autoFails.get(key) || 0) + 1;
          autoFails.set(key, n);
          n >= MAX_AUTO_FAILS && autoTried.add(key);
          autoBlockedUntil = Date.now() + AUTO_BACKOFF_MS;
        }
      } finally {
        autoRunning = !1;
        autoPending.clear();
        if (staleSeen && !staleRetry && staleRetries < MAX_STALE_RETRIES) {
          staleRetries++;
          staleRetry = setTimeout(() => {
            staleRetry = null;
            autoLoad();
          }, STALE_RETRY_MS);
        }
      }
    }
    const pad = n => String(n).padStart(2, "0");
    function rangeLabel(a, b) {
      return dtf({
        day: "numeric",
        month: "long",
        year: "numeric"
      }).formatRange(a, b);
    }
    const API_CABIN = {
      eco: "ECONOMY",
      ecoPremium: "PREMIUMECO",
      business: "BUSINESS",
      first: "FIRST"
    };
    function cffFor(apiCabin) {
      try {
        const found = function walk(o, depth) {
          if (!o || depth > 6 || "object" != typeof o) return null;
          if (Array.isArray(o.cabintoCFFForReward)) return o.cabintoCFFForReward;
          for (const k of Object.keys(o)) {
            const r = walk(o[k], depth + 1);
            if (r) return r;
          }
          return null;
        }(JSON.parse(sessionStorage.getItem("configuration") || "{}"), 0);
        const hit = found && found.find(e => e.cabin === apiCabin);
        if (hit && hit.cff) return hit.cff;
      } catch (e) {}
      return {
        ECONOMY: "CFFECODYN",
        PREMIUMECO: "CFFPECODYN",
        BUSINESS: "CFFBUSDYN",
        FIRST: "CFFFIRSDYN"
      }[apiCabin] || null;
    }
    const CABIN_OPTION = Object.fromEntries(Object.entries(API_CABIN).map(([k, api]) => [ api, CABIN_META[k].full ]));
    function stripNoOfferDates() {
      const dead = new Set;
      const strip = nativeStrip();
      const btns = strip ? [ ...strip.querySelectorAll("button.calendar-btn") ] : [];
      const at = btns.findIndex(b => b.classList.contains("active"));
      const day = currentSearchDate();
      if (at < 0 || !day) return dead;
      const d = parseISO(day);
      btns.forEach((b, i) => {
        b.disabled && dead.add(iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + i - at)));
      });
      return dead;
    }
    function setCabinForNextSearch(api) {
      try {
        const c = window.__mmCal;
        c && c.setBoundsCabinOnce && c.setBoundsCabinOnce(api);
      } catch (e) {}
    }
    const cabinArmed = () => {
      try {
        const c = window.__mmCal;
        return !!(c && c.boundsCabinArmed && c.boundsCabinArmed());
      } catch (e) {
        return !1;
      }
    };
    function setPanelCabin(apiCabin) {
      let f = null;
      try {
        f = window.__mmsuHooks && window.__mmsuHooks.form && window.__mmsuHooks.form();
      } catch (e) {}
      const c = f && f.comp.modifySearchForm && f.comp.modifySearchForm.controls.cabin;
      if (!c || !(f.comp.cabinCffList || []).some(o => o && o.cabinCode === apiCabin)) return !1;
      if (c.value === apiCabin) return "same";
      f.zone.run(() => {
        c.setValue(apiCabin);
        c.markAsDirty();
      });
      return c.value === apiCabin;
    }
    const DATE_ACTION = "[AirBoundsSearch] update selected bound dates";
    function storeSearch(store) {
      let st = null;
      try {
        store.subscribe(v => {
          st = v;
        }).unsubscribe();
      } catch (e) {
        return null;
      }
      const abs = st && st.airBoundsSearch;
      return abs && abs.entities && abs.entities[abs.selectedAirBoundsSearchId] || null;
    }
    function travellerCount() {
      try {
        return (searchEntity().travelers || []).length || 1;
      } catch (e) {
        return 1;
      }
    }
    async function selectDate(dateStr, cabin) {
      const boundIdx = activeBoundIdx();
      const returnStep = boundIdx > 0;
      const wantCabin = !returnStep && cabin && API_CABIN[cabin] ? API_CABIN[cabin] : null;
      state.selectedDate = dateStr;
      state.navigating = dateStr;
      state.dayOffset = 0;
      state.pickNotice = null;
      render();
      let path = null;
      let formFailed = !1;
      try {
        wantCabin && setCabinForNextSearch(wantCabin);
        {
          const via = currentSearchDate() === dateStr ? "same-day" : returnStep && stripNoOfferDates().has(dateStr) ? "unavailable" : function(dateStr, boundIdx) {
            const store = function() {
              try {
                for (const t of window.getAllAngularTestabilities()) {
                  const recs = t && t._destroyRef && t._destroyRef.records;
                  if (!recs || "function" != typeof recs.forEach) continue;
                  let hit = null;
                  recs.forEach(r => {
                    const v = r && r.value;
                    !hit && v && "function" == typeof v.dispatch && "function" == typeof v.addReducer && "function" == typeof v.subscribe && (hit = v);
                  });
                  if (hit) return hit;
                }
              } catch (e) {}
              return null;
            }();
            const its = store && (storeSearch(store) || {}).itineraries;
            if (!(its && its[boundIdx] && its[0].departureDateTime instanceof Date)) return !1;
            const DT = its[0].departureDateTime.constructor;
            const d = parseISO(dateStr);
            const dates = [];
            dates[boundIdx] = new DT(d.getFullYear(), d.getMonth(), d.getDate());
            1 === boundIdx && (dates[0] = new DT(its[0].departureDateTime));
            try {
              store.dispatch({
                type: DATE_ACTION,
                dates: dates
              });
            } catch (e) {
              return !1;
            }
            const now = (storeSearch(store) || {}).itineraries;
            const got = now && now[boundIdx] && now[boundIdx].departureDateTime;
            return got instanceof Date && iso(got) === dateStr;
          }(dateStr, boundIdx) ? "store" : null;
          if ("store" === via) {
            path = "store";
            if (wantCabin) {
              !function(apiCabin) {
                try {
                  const cff = cffFor(apiCabin);
                  if (!cff) return;
                  const o = JSON.parse(sessionStorage.getItem(SEARCH_KEY));
                  const e = o.entities[o.selectedAirBoundsSearchId];
                  if (!e) return;
                  e.commercialFareFamilies = [ cff ];
                  sessionStorage.setItem(SEARCH_KEY, JSON.stringify(o));
                } catch (e) {}
              }(wantCabin);
              setPanelCabin(wantCabin);
            }
          } else if ("same-day" === via) {
            if (returnStep) {
              setCabinForNextSearch(null);
              const cards = window.__mmCards;
              cards && cards.showNoOffer && cards.showNoOffer(null);
              clearNavigating();
              render();
              return;
            }
            const set = wantCabin ? setPanelCabin(wantCabin) : "same";
            if ("same" === set) {
              setCabinForNextSearch(null);
              clearNavigating();
              render();
              return;
            }
            set && await async function() {
              const btn = document.querySelector("button#modify-button");
              if (!btn || btn.disabled) return !1;
              let sent = null, off = null;
              try {
                const bd = window.__mmBounds;
                if (bd && bd.onRequest) {
                  let started;
                  sent = new Promise(r => {
                    started = r;
                  });
                  off = bd.onRequest(active => {
                    active && started(!0);
                  });
                }
              } catch (e) {}
              const wasArmed = cabinArmed();
              let timer = null;
              try {
                btn.click();
                return !off && !wasArmed || !(!wasArmed || cabinArmed()) || (off ? await Promise.race([ sent, new Promise(r => {
                  timer = setTimeout(() => r(null), 5e3);
                }) ]) : await (fn = () => !cabinArmed(), ms = 5e3, new Promise(resolve => {
                  const first = fn();
                  if (first) {
                    resolve(first);
                    return;
                  }
                  let timer = null;
                  const done = v => {
                    clearTimeout(timer);
                    obs.disconnect();
                    resolve(v);
                  };
                  const obs = new MutationObserver(() => {
                    const v = fn();
                    v && done(v);
                  });
                  timer = setTimeout(() => done(fn() || null), ms);
                  obs.observe(document, {
                    subtree: !0,
                    childList: !0,
                    attributes: !0,
                    characterData: !0
                  });
                })));
              } finally {
                clearTimeout(timer);
                if (off) try {
                  off();
                } catch (e) {}
              }
              var fn, ms;
            }() ? path = "formular" : formFailed = !0;
          } else if ("unavailable" === via) {
            clearNavigating();
            state.selectedDate = dateStr;
            const msg = T("Am {date} gibt es zum gewählten Hinflug keinen Rückflug.", {
              date: dtf({
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
              }).format(parseISO(dateStr))
            });
            const cards = window.__mmCards;
            cards && cards.showNoOffer && cards.showNoOffer(msg) || (state.pickNotice = msg);
            setCabinForNextSearch(null);
            render();
            return;
          }
        }
        path || setCabinForNextSearch(null);
      } finally {
        path || clearNavigating();
      }
      state.lastPick = {
        date: dateStr,
        path: path || null
      };
      if (path) {
        !function() {
          navTimer && clearTimeout(navTimer);
          navTimer = setTimeout(() => {
            navTimer = null;
            if (state.navigating) {
              state.navigating = null;
              state.root && !state.superseded && render();
            }
          }, NAV_TIMEOUT_MS);
        }();
        render();
      } else {
        clearNavigating();
        state.selectedDate = dateStr;
        state.pickNotice = T(formFailed ? "Die Suchmaske der Seite hat die Suche nicht gestartet. Bitte noch einmal klicken." : "Die Seite hat den Tag nicht übernommen. Bitte noch einmal klicken.");
        render();
      }
    }
    const gridHost = () => document.querySelector("div.offer-container") || (nativeStrip() || {}).parentElement || null;
    function hideStrip(strip) {
      if (strip && state.hiddenStrip !== strip) {
        strip.style.display = "none";
        state.hiddenStrip = strip;
      }
    }
    function mount() {
      !function() {
        const css = `
.mmcal { font-family: inherit; background: #fff; border: 1px solid ${INK_hairline};
         border-radius: 8px; padding: 12px 14px 12px; margin: 0 0 12px;
         width: 100%; box-sizing: border-box; }
.mmcal-live { position: absolute; width: 1px; height: 1px; overflow: hidden;
              clip: rect(0 0 0 0); white-space: nowrap; }
.mmcal-hd:focus-visible, .mmcal-c:focus-visible { outline: 2px solid ${INK_accent};
                                                  outline-offset: 1px; z-index: 2; }
#mmcal-tip { position: fixed; z-index: 2147483000; pointer-events: none; max-width: 240px;
             background: #fff; color: ${INK_primary}; border: 1px solid ${INK_hairline};
             border-radius: 6px; padding: 7px 9px;
             font: 12px/1.45 system-ui, sans-serif; white-space: pre-line;
             box-shadow: 0 4px 14px rgba(5,22,77,.12); opacity: 0; transition: opacity .08s; }
#mmcal-tip.is-on { opacity: 1; }

body:has(.mmcal) refx-page-title-pres { display: none; }

.mmcal-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap;
              margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid ${INK_hairline}; }
.mmcal-route { font-size: 15px; font-weight: 700; color: ${INK_primary}; letter-spacing: .01em; }
.mmcal-bound { font-weight: 600; color: ${INK_secondary}; margin-right: 6px; }
.mmcal-nav { margin-left: auto; display: flex; gap: 5px; align-items: center; }
.mmcal-btn { font: inherit; font-size: 13px; line-height: 1; border: 1px solid ${INK_hairline};
             background: #fff; color: ${INK_primary}; border-radius: 5px; width: 27px; height: 26px;
             cursor: pointer; padding: 0; display: inline-flex; align-items: center; justify-content: center; gap: 4px; }
.mmcal-btn.is-wide { width: auto; padding: 0 11px; font-size: 12px; font-weight: 600; }
.mmcal-btn svg { width: 14px; height: 14px; flex: none; fill: none; stroke: currentColor; stroke-width: 2;
                 stroke-linecap: round; stroke-linejoin: round; }
.mmcal-btn:hover:not(:disabled) { background: #f3f6fc; border-color: #b9c6e0; }
.mmcal-btn:disabled { opacity: .35; cursor: default; }

.mmcal-fold { margin-left: 6px; }
.mmcal.is-folded { padding-top: 9px; padding-bottom: 9px; }
.mmcal.is-folded .mmcal-head { margin-bottom: 0; padding-bottom: 0; border-bottom: 0; }

.mmcal-grid { display: grid; gap: 2px; position: relative; }

.mmcal-loadbtn { font: inherit; font-size: 11px; font-weight: 600;
                 background: #fff; color: ${INK_primary}; border: 1px solid ${INK_hairline};
                 border-radius: 5px; padding: 2px 8px; cursor: pointer;
                 display: inline-flex; align-items: center; gap: 5px;
                 white-space: nowrap; flex: 0 0 auto; }
.mmcal-loadbtn:hover { background: #f7f8fb; border-color: ${INK_primary}; }
.mmcal-loadbtn.is-dot { padding: 2px 6px; }
.mmcal-loadsub { font-weight: 400; color: ${INK_muted}; white-space: nowrap;
                 overflow: hidden; text-overflow: ellipsis; min-width: 0; flex: 0 1 auto; }
.mmcal-loadbtn .mmcal-loaddot { width: 5px; height: 5px; border-radius: 50%;
                                background: ${INK_primary}; flex: 0 0 auto; }
.mmcal-loadbtn.is-busy { background: #fff; color: ${INK_secondary};
                         border-color: ${INK_hairline}; cursor: default; }
.mmcal-loadbtn.is-busy .mmcal-loaddot { background: ${INK_primary};
                                        animation: mmcalPuls 1s ease-in-out infinite; }
@keyframes mmcalPuls { 0%, 100% { opacity: 1 } 50% { opacity: .25 } }
@media (prefers-reduced-motion: reduce) { .mmcal-loadbtn.is-busy .mmcal-loaddot { animation: none } }
.mmcal-scroll { overflow-x: auto; }

.mmcal-mo { font-size: 11px; font-weight: 700; color: ${INK_secondary};
            padding: 0 0 5px 2px; align-self: end; min-width: 0;
            display: flex; align-items: center; flex-wrap: nowrap; gap: 7px;
            overflow: hidden; }
.mmcal-moname { white-space: nowrap; flex: 0 0 auto; }
.mmcal-mo .yr { font-weight: 400; color: ${INK_muted}; }

.mmcal-hd { text-align: center; padding: 3px 2px 5px; border-bottom: 1px solid ${INK_hairline};
            background: none; border-left: 0; border-right: 0; border-top: 0; font: inherit;
            cursor: pointer; border-radius: 4px 4px 0 0; }
.mmcal-hd:hover { background: #f7f8fb; }
.mmcal-hd.is-sel { background: ${INK_primary}; border-bottom-color: ${INK_primary}; }
.mmcal-hd.is-sel .mmcal-dw, .mmcal-hd.is-sel .mmcal-dn { color: #fff; }
.mmcal-hd.is-dead { opacity: .55; }
.mmcal-hd.is-dead .mmcal-dn { text-decoration: line-through; }
.mmcal-c.is-deadday { opacity: .4; }
.mmcal-hd.is-empty { opacity: .4; }
.mmcal-hd:disabled, .mmcal-c:disabled { opacity: .2; pointer-events: none; }
.mmcal-dw { display: block; font-size: 9.5px; text-transform: uppercase; color: ${INK_muted};
            letter-spacing: .04em; line-height: 1.3; }
.mmcal-hd.is-we:not(.is-sel) { background: #f4f6fa; }
.mmcal-hd.is-we:not(.is-sel):hover { background: #eceff6; }
.mmcal-hd.is-today .mmcal-dn { text-decoration: underline 2px ${INK_accent}; text-underline-offset: 3px; }
.mmcal-dn { display: block; font-size: 14px; font-weight: 600; line-height: 1.15; color: ${INK_primary}; }

.mmcal-rl { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600;
            color: ${INK_secondary}; padding-right: 7px; white-space: nowrap; }
.mmcal-pip { width: 8px; height: 8px; border-radius: 2px; flex: 0 0 auto; }
.mmcal-rl.is-wait .mmcal-pip { animation: mmcalPuls 1s ease-in-out infinite; }
.mmcal-rl.is-wait { color: ${INK_primary}; }
@media (prefers-reduced-motion: reduce) {
    .mmcal-rl.is-wait .mmcal-pip { animation: none; opacity: .4; } }

.mmcal-c { border-radius: 3px; padding: 4px 2px; text-align: center; min-height: 46px;
           display: flex; flex-direction: column; justify-content: center; gap: 1px;
           border: 1px solid transparent; font: inherit; cursor: pointer; overflow: hidden;
           position: relative; }
.mmcal-c.is-cal, .mmcal-c.is-bbd { background: var(--mc); }
.mmcal-c.is-none { background: #faf9f6; opacity: .45; cursor: pointer; }
.mmcal-c.is-none:hover { opacity: .8; border-color: var(--mc); }
.mmcal-selframe { position: absolute; inset: 0; pointer-events: none;
                  border: 2px solid ${INK_primary}; border-radius: 5px; z-index: 1; }
.mmcal-c:hover:not(.is-none) { border-color: rgba(255,255,255,.65); }
.mmcal-c.is-busy { border-color: #fff; box-shadow: inset 0 0 0 1px rgba(255,255,255,.7); }
.mmcal-c.is-busy .mmcal-miles, .mmcal-c.is-busy .mmcal-tax { opacity: .35; }
.mmcal-c.is-busy::after { content: ''; position: absolute; inset: auto 0 0 0; height: 2px;
                          background: #fff; animation: mmcal-run 1s linear infinite; }
@keyframes mmcal-run { 0% { transform: scaleX(.15); transform-origin: left; }
                       50% { transform: scaleX(1); transform-origin: left; }
                       100% { transform: scaleX(.15); transform-origin: right; } }
@media (prefers-reduced-motion: reduce) { .mmcal-c.is-busy::after { animation: none; } }
.mmcal-c.is-wait { cursor: default; }
.mmcal-c.is-wait .mmcal-dash { opacity: 0; }
.mmcal-c.is-wait::before { content: ''; position: absolute; inset: 0; pointer-events: none;
                           background: linear-gradient(100deg, transparent 22%,
                               color-mix(in oklab, var(--mc) 26%, #fff) 50%, transparent 78%);
                           background-size: 220% 100%;
                           animation: mmcal-shim 1.15s ease-in-out infinite; }
@keyframes mmcal-shim { from { background-position: 130% 0; } to { background-position: -30% 0; } }
@media (prefers-reduced-motion: reduce) {
    .mmcal-c.is-wait::before { animation: none; opacity: .45; } }
.mmcal-tier { font-size: 9.5px; text-transform: uppercase; font-weight: 700; color: var(--mc); line-height: 1.2; }
.mmcal-miles { font-size: 14px; font-weight: 700; line-height: 1.1; color: ${INK_primary}; }
.mmcal-tax { font-size: 11px; color: ${INK_secondary}; line-height: 1.2; }
.mmcal-c.is-dear { background: color-mix(in oklab, var(--mc) 84%, #000); }
.mmcal-c.is-blocked { opacity: .5;
    background-image: repeating-linear-gradient(135deg, rgba(255,255,255,.16) 0 3px, transparent 3px 7px); }
.mmcal-lgblk { display: inline-block; width: 14px; height: 10px; margin-right: 5px; vertical-align: -1px;
               border-radius: 2px; opacity: .5; background-color: ${INK_secondary};
               background-image: repeating-linear-gradient(135deg, rgba(255,255,255,.4) 0 2px, transparent 2px 5px); }
.mmcal-rl.is-thin { font-weight: 400; color: ${INK_muted}; }
.mmcal-c.is-thin { min-height: 18px; padding: 0 2px; }
.mmcal-c.is-thin .mmcal-dash { font-size: 10px; line-height: 1; }
.mmcal-c.is-cal .mmcal-tier, .mmcal-c.is-bbd .mmcal-tier { color: rgba(255,255,255,.82); }
.mmcal-c.is-cal .mmcal-miles, .mmcal-c.is-bbd .mmcal-miles { color: #fff; }
.mmcal-c.is-cal .mmcal-tax, .mmcal-c.is-bbd .mmcal-tax { color: rgba(255,255,255,.85); }
.mmcal-dash { color: ${INK_muted}; font-size: 12px; }

.mmcal-newmo { box-shadow: -2px 0 0 0 color-mix(in oklab, ${INK_primary} 25%, #fff); }

.mmcal-std { display: grid; gap: 2px; margin-top: 7px; padding-top: 7px;
             border-top: 1px dashed ${INK_hairline}; }
.mmcal-stdl { display: flex; align-items: center; font-size: 10.5px; color: ${INK_muted};
              padding-right: 7px; white-space: nowrap; }
.mmcal-stdc { text-align: center; font-size: 10.5px; color: ${INK_muted}; padding: 2px 0; }

.mmcal-foot { display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
              margin-top: 11px; font-size: 11.5px; color: ${INK_secondary}; }
.mmcal-legend { display: flex; flex-wrap: wrap; gap: 12px; }
.mmcal-pool { font: inherit; font-size: 11.5px; border: 1px solid ${INK_hairline}; background: #fff;
              color: ${INK_primary}; border-radius: 5px; padding: 3px 9px; cursor: pointer; }
.mmcal-pool[aria-pressed="true"] { background: ${INK_primary}; color: #fff; border-color: ${INK_primary}; }
.mmcal-linkbtn { font: inherit; font-size: 11.5px; background: none; border: 0; color: ${INK_muted};
                 text-decoration: underline; cursor: pointer; padding: 0; margin-left: auto; }
.mmcal-linkbtn:disabled { opacity: .4; cursor: default; }

.mmcal-msg { font-size: 13px; color: ${INK_secondary}; padding: 14px 4px; text-align: center; }
.mmcal-err { color: #963e37; }
.mmcal-errline { font-size: 11.5px; color: #963e37; padding: 4px 4px 0; text-align: right; }
.mmcal-noteline { font-size: 11.5px; color: #7a5c12; padding: 4px 4px 0; text-align: right; }
.mmcal-body { position: relative; }
.mmcal-overlay { position: absolute; inset: 0; background: rgba(255,255,255,.82);
                 display: flex; align-items: center; justify-content: center; gap: 9px;
                 font-size: 13px; color: ${INK_secondary}; }
.mmcal-spinner { width: 16px; height: 16px; border: 2px solid ${INK_hairline};
                 border-top-color: ${INK_primary}; border-radius: 50%; animation: mmcal-spin .9s linear infinite; }
.mmcal-headspin { display: inline-block; width: 12px; height: 12px;
                  margin-left: 8px; vertical-align: -1px; }
@keyframes mmcal-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .mmcal-spinner { animation-duration: 2.4s; } }

html.mm-dark .mmcal-c:hover:not(.is-none) { border-color: rgba(255,255,255,.65); }
html.mm-dark .mmcal-c.is-busy { border-color: #fff; box-shadow: inset 0 0 0 1px rgba(255,255,255,.7); }
html.mm-dark .mmcal-c.is-busy::after { background: #fff; }
html.mm-dark .mmcal-c.is-none.is-busy { border-color: transparent; box-shadow: none; }
html.mm-dark .mmcal-c.is-none.is-busy::after { content: none; }
html.mm-dark .mmcal-newmo { box-shadow: -2px 0 0 0 hsl(222 14% 36%); }
html.mm-dark .mmcal-c.is-wait { background: color-mix(in oklab, var(--mc) 45%, var(--mm-dark-card)); }
html.mm-dark .mmcal-c.is-wait:not(.is-deadday) { animation: mmcal-tile 1.6s ease-in-out infinite; }
html.mm-dark .mmcal-c.is-wait::before { content: none; }
@keyframes mmcal-tile { 0%, 100% { opacity: .35; } 50% { opacity: .8; } }
@media (prefers-reduced-motion: reduce) { html.mm-dark .mmcal-c.is-wait:not(.is-deadday) { animation-duration: 2.6s; } }
`;
        let el = document.getElementById("mmcal-styles");
        if (!el) {
          el = document.createElement("style");
          el.id = "mmcal-styles";
          document.head.appendChild(el);
        }
        el.textContent !== css && (el.textContent = css);
      }();
      const host = gridHost();
      if (!host) return !1;
      const strip = nativeStrip();
      const existing = document.querySelector(".mmcal");
      if (existing) {
        hideStrip(strip);
        if (existing === state.root) return !0;
        state.root = existing;
        render();
        return !0;
      }
      const root = document.createElement("section");
      root.className = "mmcal";
      root.setAttribute("aria-label", T("Monatsübersicht Meilenpreise"));
      host.insertBefore(root, strip && strip.parentElement === host ? strip : host.firstChild);
      state.root = root;
      render();
      hideStrip(strip);
      return !0;
    }
    function restoreOriginalStrip() {
      if (state.hiddenStrip) {
        state.hiddenStrip.style.display = "";
        state.hiddenStrip = null;
      }
      if (state.root) {
        state.root.remove();
        state.root = null;
      }
    }
    const calendarOn = () => !window.__mmSettings || !1 !== window.__mmSettings.get("calendar");
    const bbdShown = () => !window.__mmSettings || !1 !== window.__mmSettings.get("bbd");
    const OWN_SELECTOR = ".mmcal, #mmcal-tip, #mmcal-live, #mmcal-styles";
    const isOwnNode = n => {
      const el = n && (1 === n.nodeType ? n : n.parentElement);
      return !!el && !!el.closest(OWN_SELECTOR);
    };
    const isOwnMutation = r => isOwnNode(r.target) || !r.removedNodes.length && r.addedNodes.length > 0 && [ ...r.addedNodes ].every(isOwnNode);
    const resultsAnchor = function(sel) {
      let ref = null;
      return records => {
        if (ref && ref.isConnected) return ref;
        ref = null;
        if (!records) return ref = document.querySelector(sel);
        for (const r of records) for (const n of r.addedNodes) {
          if (1 !== n.nodeType) continue;
          const hit = n.matches(sel) ? n : n.querySelector(sel);
          if (hit && hit.isConnected) return ref = hit;
        }
        return null;
      };
    }("div.offer-container, refx-calendar-cont");
    function boot() {
      if (state.superseded || !calendarOn()) return;
      autoLoad();
      mount();
      if (state._observer) return;
      resultsAnchor();
      const obs = new MutationObserver(records => {
        if (!state.superseded && document.body && calendarOn() && resultsAnchor(records) && !records.every(isOwnMutation)) {
          try {
            !function() {
              if (state.superseded || !calendarOn()) return;
              let cleared = !1;
              if (state.navigating && currentSearchDate() === state.navigating) {
                clearNavigating();
                cleared = !0;
              }
              const before = state.lastSearchDate;
              syncAnchorToSearch();
              if (before !== state.lastSearchDate) {
                state.root && render();
                autoLoad();
              } else cleared && state.root && render();
            }();
          } catch (e) {}
          state.root && state.root.isConnected ? hideStrip(nativeStrip()) : gridHost() && mount();
        }
      });
      state._observer = obs;
      obs.observe(document.body, {
        childList: !0,
        subtree: !0
      });
    }
    const NAV_TIMEOUT_MS = 1e4;
    let navTimer = null;
    function clearNavigating() {
      if (navTimer) {
        clearTimeout(navTimer);
        navTimer = null;
      }
      state.navigating = null;
    }
    function redraw() {
      !state.superseded && calendarOn() && state.root && render();
    }
    window.__mmCal && (state._off = window.__mmCal.onUpdate(function() {
      if (!state.superseded && calendarOn()) {
        if (state.lastRoute && window.__mmCal.routeKey && window.__mmCal.routeKey !== state.lastRoute) {
          state.selectedDate = null;
          state.dayOffset = 0;
          state.lastSearchDate = null;
        }
        state.lastRoute = window.__mmCal.routeKey;
        syncAnchorToSearch();
        state.root ? render() : boot();
        autoLoad();
      }
    }));
    window.__mmBBD && window.__mmBBD.onUpdate && (state._offBbd = window.__mmBBD.onUpdate(redraw));
    window.__mmCurrency && window.__mmCurrency.onUpdate && (state._offFx = window.__mmCurrency.onUpdate(redraw));
    window.__mmSettings && (state._offSettings = window.__mmSettings.onChange(k => {
      state.superseded || ("calendar" !== k ? "bbd" === k && calendarOn() && state.root && render() : calendarOn() ? boot() : restoreOriginalStrip());
    }));
    "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", boot) : boot();
    const api = {
      version: VERSION,
      render: render,
      mount: mount,
      selectDate: selectDate,
      describeFare: describeFare,
      restoreOriginalStrip: restoreOriginalStrip,
      CABIN_META: CABIN_META,
      cffFor: cffFor,
      cellsFor: cellsFor,
      clearCache: function() {
        const cal = window.__mmCal;
        if (cal && cal.clearCache) {
          cal.clearCache();
          autoTried.clear();
          autoFails.clear();
          ensureMonthLoaded();
        }
      },
      get root() {
        return state.root;
      },
      get hiddenStrip() {
        return state.hiddenStrip;
      },
      get _observer() {
        return state._observer;
      },
      get _off() {
        return state._off;
      },
      get _offBbd() {
        return state._offBbd;
      },
      get _offFx() {
        return state._offFx;
      },
      get _offSettings() {
        return state._offSettings;
      },
      get lastPick() {
        return state.lastPick;
      },
      get superseded() {
        return state.superseded;
      },
      set superseded(v) {
        state.superseded = !!v;
      },
      teardown() {
        state.superseded = !0;
        if (state._searchTimer) {
          try {
            clearTimeout(state._searchTimer);
          } catch (e) {}
          state._searchTimer = null;
        }
        if (state._observer) {
          try {
            state._observer.disconnect();
          } catch (e) {}
          state._observer = null;
        }
        for (const k of [ "_off", "_offBbd", "_offFx", "_offSettings" ]) if (state[k]) {
          try {
            state[k]();
          } catch (e) {}
          state[k] = null;
        }
      }
    };
    try {
      Object.defineProperty(window, "__mmCalUI", {
        value: api,
        enumerable: !1,
        configurable: !0
      });
    } catch (e) {
      try {
        window.__mmCalUI = api;
      } catch (e2) {}
    }
    try {
      window.addEventListener("pagehide", e => {
        e && e.persisted || api.teardown();
      });
    } catch (e) {}
  })();
  (() => {
    "use strict";
    const VERSION = 15;
    if (window.__mmPicker && window.__mmPicker.version >= VERSION) return;
    if (window.__mmPicker) try {
      window.__mmPicker.teardown();
    } catch (e) {}
    const T = (s, p) => window.__mmI18n ? window.__mmI18n.t(s, p) : p ? String(s).replace(/\{(\w+)\}/g, (m, k) => null != p[k] ? String(p[k]) : m) : String(s);
    const dtf = o => window.__mmI18n ? window.__mmI18n.dtf(o) : new Intl.DateTimeFormat("de-DE", o);
    const nf = o => window.__mmI18n ? window.__mmI18n.nf(o) : new Intl.NumberFormat("de-DE", o);
    const INK_primary = "#05164D", INK_secondary = "#52514e", INK_muted = "#898781", INK_hairline = "#e1e0d9", INK_best = "#2e7d4f";
    const CABIN_OF = {
      ECONOMY: "eco",
      PREMIUMECO: "ecoPremium",
      BUSINESS: "business",
      FIRST: "first"
    };
    const CABIN_NAME = {
      eco: "Economy",
      ecoPremium: "Premium Economy",
      business: "Business",
      first: "First"
    };
    const POOLS_FOR = {
      eco: [ "ECONOMY" ],
      ecoPremium: [ "PREMIUMECO", "BUSINESS", "FIRST" ],
      business: [ "BUSINESS", "FIRST" ],
      first: [ "BUSINESS", "FIRST" ]
    };
    const FIELDS = ".date-field-ow, .date-field-rt, .multicity-date-field-ow";
    const DAY_MS = 864e5;
    const on = () => !window.__mmSettings || !1 !== window.__mmSettings.get("datePicker");
    const esc = s => String(null == s ? "" : s).replace(/[&<>"]/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    }[c]));
    const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const parseISO = s => {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(y, m - 1, d);
    };
    const dayOf = v => {
      const d = v instanceof Date ? v : v ? new Date(v) : null;
      return d && !isNaN(d) ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null;
    };
    const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
    const monthKey = d => iso(d).slice(0, 7);
    const cap = s => window.__mmI18n?.cap ? window.__mmI18n.cap(s) : s;
    const short = d => cap(dtf({
      weekday: "short",
      day: "numeric",
      month: "short"
    }).format(d));
    const hhmm = d => dtf({
      hour: "2-digit",
      minute: "2-digit"
    }).format(d);
    const fmtMiles = n => null == n ? "" : nf().format(n);
    const nightsLabel = (a, b) => {
      return n = ((a, b) => Math.round((b - a) / DAY_MS))(a, b), one = "{n} Nacht", other = "{n} Nächte", 
      window.__mmI18n ? window.__mmI18n.tn(n, one, other, p) : T(1 === n ? one : other, Object.assign({
        n: n
      }, p));
      var n, one, other, p;
    };
    const curFmt = (n, code, digits) => {
      const c = code || "EUR";
      let mine = "EUR";
      try {
        mine = window.__mmCurrency?.target?.() || "EUR";
      } catch (e) {}
      try {
        return nf({
          style: "currency",
          currency: c,
          currencyDisplay: c === mine ? "narrowSymbol" : "code",
          minimumFractionDigits: digits,
          maximumFractionDigits: digits
        }).format(n);
      } catch (e) {
        return nf({
          minimumFractionDigits: digits,
          maximumFractionDigits: digits
        }).format(n) + " " + c;
      }
    };
    const state = {
      version: VERSION,
      superseded: !1,
      open: null,
      el: null,
      offCal: null,
      offBbd: null
    };
    try {
      Object.defineProperty(window, "__mmPicker", {
        value: state,
        enumerable: !1,
        configurable: !0
      });
    } catch (e) {
      window.__mmPicker = state;
    }
    function context(open) {
      const f = (() => {
        try {
          const h = window.__mmsuHooks || null;
          return h && h.form ? h.form() : null;
        } catch (e) {
          return null;
        }
      })();
      if (!f) return null;
      const c = f.comp.modifySearchForm.controls;
      const code = v => v && v.code || null;
      const today = dayOf(new Date);
      const max = dayOf(f.comp.maxAllowedDate) || addDays(today, 360);
      const cabin = CABIN_OF[c.cabin.value] || "eco";
      if (null != open.leg) {
        const legs = c.multiCityItinerary && c.multiCityItinerary.controls || [];
        const g = legs[open.leg] && legs[open.leg].controls;
        if (!g) return null;
        const at = i => legs[i] ? dayOf(legs[i].controls.multiCityDepartureTime.value) : null;
        const prev = at(open.leg - 1), next = at(open.leg + 1);
        const route = [ code(g.multiCityOrigin.value), code(g.multiCityDestination.value) ];
        const o = legs[0 === open.leg ? 1 : 0], oc = o && o.controls, od = o && at(0 === open.leg ? 1 : 0);
        const key = oc && od && route[0] && route[1] ? route.join("-") + "@" + iso(od) + "/" + code(oc.multiCityOrigin.value) + "-" + code(oc.multiCityDestination.value) : null;
        return {
          f: f,
          kind: "leg",
          cabin: cabin,
          ctrl: g.multiCityDepartureTime,
          date: at(open.leg),
          route: route,
          key: key,
          bbd: null,
          min: prev && prev > today ? prev : today,
          max: next && next < max ? next : max
        };
      }
      const route = [ code(c.originLocationCode.value), code(c.destinationLocationCode.value) ];
      if ("roundtrip" !== c.tripType.value) return {
        f: f,
        kind: "one",
        cabin: cabin,
        ctrl: c.departureDate,
        date: dayOf(c.departureDate.value),
        route: route,
        key: route.join("-"),
        bbd: {
          fn: "route",
          route: route.join("-")
        },
        min: today,
        max: max
      };
      const dep = dayOf(c.departureDate.value), ret = dayOf(c.returnDate.value);
      const back = "ret" === open.stage && dep;
      const span = dep && ret ? Math.round((ret - dep) / 864e5) : 0;
      return {
        f: f,
        kind: "range",
        cabin: cabin,
        dep: dep,
        ret: ret,
        ctrl: back ? c.returnDate : c.departureDate,
        date: back ? ret : dep,
        route: back ? [ route[1], route[0] ] : route,
        key: back || !ret ? null : route.join("-") + "@" + iso(ret) + "/" + route[1] + "-" + route[0],
        bbd: back ? {
          fn: "return",
          route: route.join("-"),
          date: iso(dep)
        } : {
          fn: "trip",
          route: route.join("-"),
          days: span || 7
        },
        min: back ? dep : today,
        max: max
      };
    }
    const sameJourney = (cal, ctx) => !!(cal && ctx.key && cal.searchRoute && cal.searchRoute() === ctx.key);
    function prices(ctx, dates) {
      const out = new Map;
      const ui = window.__mmCalUI, cal = window.__mmCal, bbd = window.__mmBBD;
      if (!(ui && ui.cellsFor && ctx.route[0] && ctx.route[1])) return out;
      const days = sameJourney(cal, ctx) ? new Map(cal.days.map(d => [ d.date, d ])) : new Map;
      const idx = function(bbd, q) {
        return bbd && q ? "route" === q.fn ? bbd.forRoute ? bbd.forRoute(q.route) : null : "trip" === q.fn ? bbd.forTrip ? bbd.forTrip(q.route, q.days) : null : "return" === q.fn && bbd.forReturn ? bbd.forReturn(q.route, q.date) : null : null;
      }(bbd, ctx.bbd);
      for (const ds of dates) {
        const found = cal && ctx.key && cal.searchFares ? cal.searchFares(ctx.key, ds) : null;
        const cell = ui.cellsFor(days, ds, idx && idx.get(ds) || null, found)[ctx.cabin] || null;
        const rec = days.get(ds);
        out.set(ds, {
          cell: cell,
          none: !cell && !!rec && !1 === rec.available
        });
      }
      return out;
    }
    function missing(ctx, months) {
      const cal = window.__mmCal;
      return cal && cal.poolsLacking && cal.template && sameJourney(cal, ctx) ? months.filter(m => cal.poolsLacking(m.getFullYear(), m.getMonth(), POOLS_FOR[ctx.cabin]).length) : [];
    }
    function load(ctx, months) {
      const cal = window.__mmCal;
      months.forEach(m => {
        try {
          cal.loadMonth(m.getFullYear(), m.getMonth(), {
            pools: POOLS_FOR[ctx.cabin]
          });
        } catch (e) {}
      });
    }
    function refresh() {
      const open = state.open;
      const ctx = open && context(open);
      if (ctx && "eco" === ctx.cabin) {
        const todo = missing(ctx, [ open.view ]).filter(m => !open.asked.has(ctx.route.join("-") + monthKey(m)));
        todo.forEach(m => open.asked.add(ctx.route.join("-") + monthKey(m)));
        load(ctx, todo);
      }
      render();
    }
    function render() {
      const open = state.open;
      if (!open) return;
      const ctx = context(open);
      if (!ctx || !document.contains(open.field)) {
        close(!1);
        return;
      }
      const month = open.view;
      const dates = [];
      for (let d = month; d.getMonth() === month.getMonth(); d = addDays(d, 1)) dates.push(iso(d));
      const pr = prices(ctx, dates);
      open.pr = pr;
      const priced = [ ...pr.values() ].filter(p => p.cell).map(p => p.cell.miles);
      const best = new Set(priced).size > 1 ? Math.min(...priced) : null;
      const todayStr = iso(dayOf(new Date));
      const minStr = iso(ctx.min), maxStr = iso(ctx.max);
      (!open.focus || open.focus < minStr || open.focus > maxStr) && (open.focus = iso(ctx.date && ctx.date >= ctx.min && ctx.date <= ctx.max ? ctx.date : ctx.min));
      const [rs, re] = rangeOf(ctx, open);
      let html = '<div class="mmdp-head">';
      html += "range" === ctx.kind ? '<div class="mmdp-tabs">' + tab("dep", T("Hinflug"), ctx.dep) + tab("ret", T("Rückflug"), ctx.ret) + "</div>" : '<div class="mmdp-title">' + ("leg" === ctx.kind ? T("Flug {n} auswählen", {
        n: open.leg + 1
      }) : T("Hinflug auswählen")) + "</div>";
      html += '<span class="mmdp-sub">' + esc((ctx.route[0] && ctx.route[1] ? ctx.route[0] + " → " + ctx.route[1] + " · " : "") + CABIN_NAME[ctx.cabin]) + "</span></div>" + '<div class="mmdp-bar"><button type="button" class="mmdp-nav" data-nav="-1" aria-label="' + T("Vorheriger Monat") + '"' + (monthKey(month) <= monthKey(ctx.min) ? " disabled" : "") + ">‹</button>" + '<span class="mmdp-mlabel">' + esc((d = month, 
      cap(dtf({
        month: "long",
        year: "numeric"
      }).format(d)))) + "</span>" + '<button type="button" class="mmdp-nav" data-nav="1" aria-label="' + T("Nächster Monat") + '"' + (monthKey(month) >= monthKey(ctx.max) ? " disabled" : "") + ">›</button></div>";
      var d;
      html += '<div class="mmdp-grid" role="grid">' + (window.__mmI18n ? window.__mmI18n.days() : [ "Mo", "Di", "Mi", "Do", "Fr", "Sa", "So" ]).map((w, i) => '<span class="mmdp-dow' + (i > 4 ? " is-we" : "") + '" role="columnheader">' + w + "</span>").join("") + "<span></span>".repeat((month.getDay() + 6) % 7);
      for (const ds of dates) {
        const d = parseISO(ds);
        const p = pr.get(ds) || {};
        const off = ds < minStr || ds > maxStr;
        const sel = ds === rs || ds === re || "range" !== ctx.kind && ctx.date && ds === iso(ctx.date);
        const isBest = null != best && p.cell && p.cell.miles === best && !off;
        html += '<button type="button" class="mmdp-d' + (0 === d.getDay() || 6 === d.getDay() ? " is-we" : "") + (ds === todayStr ? " is-today" : "") + (sel ? " is-sel" : rs && re && ds > rs && ds < re ? " is-in" : "") + (isBest ? " is-best" : "") + '" data-date="' + ds + '" tabindex="' + (ds === open.focus ? 0 : -1) + '"' + (off ? " disabled" : "") + ' aria-label="' + esc(label(d, p, isBest, rs)) + '"' + (sel ? ' aria-selected="true"' : "") + ">" + (isBest ? '<span class="mmdp-star" aria-hidden="true">★</span>' : "") + '<span class="mmdp-n">' + d.getDate() + "</span>" + '<span class="mmdp-p">' + (p.cell ? esc(fmtMiles(p.cell.miles)) : p.none ? "–" : "") + "</span></button>";
      }
      html += "</div>";
      const cal = window.__mmCal;
      const lack = missing(ctx, [ month ]);
      const busy = cal && lack.some(m => cal.loading === monthKey(m) || cal.isQueued && cal.isQueued(m.getFullYear(), m.getMonth()));
      html += '<div class="mmdp-foot"><span class="mmdp-info">' + esc(info(ctx, rs, pr)) + "</span>" + "<span>" + (priced.length ? (null != best ? "★ " + T("günstigster Tag") + " · " : "") + T("Meilen pro Erwachsener") : T("Keine Preise für {cabin} bekannt", {
        cabin: CABIN_NAME[ctx.cabin]
      })) + "</span>" + (busy ? "<span>" + T("Kalender lädt …") + "</span>" : lack.length ? '<button type="button" class="mmdp-load">' + T("Kalender laden") + "</button>" : "") + "</div>";
      const hadFocus = state.el.contains(document.activeElement);
      state.rendering = !0;
      state.el.innerHTML = html;
      state.rendering = !1;
      if (hadFocus || open.wantFocus) {
        open.wantFocus = !1;
        const b = state.el.querySelector('.mmdp-d[tabindex="0"]');
        b && b.focus({
          preventScroll: !0
        });
      }
      place();
    }
    function rangeOf(ctx, open) {
      const rs = "range" === ctx.kind && ctx.dep ? iso(ctx.dep) : null;
      const ret = ctx.ret && iso(ctx.ret);
      return [ rs, rs && ("ret" === open.stage && open.hover && open.hover >= rs ? open.hover : ret) ];
    }
    function tab(stage, name, date) {
      return '<button type="button" class="mmdp-tab" data-stage="' + stage + '" aria-pressed="' + (state.open.stage === stage) + '"><b>' + name + "</b>" + (date ? esc(short(date)) : T("wählen")) + "</button>";
    }
    function label(d, p, isBest, rs) {
      let s = (d => cap(dtf({
        weekday: "long",
        day: "numeric",
        month: "long"
      }).format(d)))(d);
      p.cell ? s += ", " + (p.cell.fare && p.cell.fare.label || "") + " " + T("{miles} Meilen", {
        miles: fmtMiles(p.cell.miles)
      }) : p.none && (s += ", " + T("kein Angebot"));
      isBest && (s += ", " + T("günstigster Tag"));
      rs && "ret" === state.open.stage && iso(d) >= rs && (s += ", " + nightsLabel(parseISO(rs), d));
      return s;
    }
    function info(ctx, rs, pr) {
      const h = state.open.hover;
      if (h) {
        const d = parseISO(h);
        const p = pr && pr.get(h) || prices(ctx, [ h ]).get(h) || {};
        let s = short(d);
        if (p.cell) {
          const c = p.cell;
          s += " · " + (c.fare && c.fare.label || CABIN_NAME[ctx.cabin]) + " · " + T("{miles} Meilen", {
            miles: fmtMiles(c.miles)
          });
          if (null != c.taxes) {
            const fx = window.__mmCurrency;
            let conv = null;
            try {
              c.currency && fx && c.currency !== fx.target() && (conv = fx.convert(c.taxes, c.currency));
            } catch (e) {}
            s += " + " + (null != conv ? curFmt(Math.round(conv), fx.target(), 0) : curFmt(Math.round(c.taxes), c.currency, 0));
          }
          "search" === c.src && (s += " · " + T("Suche {time}", {
            time: hhmm(c.ts)
          }));
        } else p.none && (s += " · " + T("kein Angebot"));
        rs && "ret" === state.open.stage && h >= rs && (s += " · " + nightsLabel(parseISO(rs), d));
        return s;
      }
      const re = rangeOf(ctx, state.open)[1];
      return rs && re ? short(parseISO(rs)) + " – " + short(parseISO(re)) + " · " + nightsLabel(parseISO(rs), parseISO(re)) : ctx.date ? short(ctx.date) : "";
    }
    function place() {
      const open = state.open, el = state.el;
      if (!open || !el) return;
      const r = open.field.getBoundingClientRect();
      const x = Math.max(8, Math.min(r.left, window.innerWidth - el.offsetWidth - 8));
      el.style.left = x + window.scrollX + "px";
      el.style.top = r.bottom + window.scrollY + 6 + "px";
    }
    function openFor(field, target) {
      const legs = [ ...document.querySelectorAll(".multicity-date-field-ow") ];
      const open = {
        field: field,
        leg: field.matches(".multicity-date-field-ow") ? legs.indexOf(field) : null,
        stage: target && target.closest(".return-date-rt") ? "ret" : "dep",
        asked: new Set,
        wantFocus: !0,
        focus: null,
        hover: null,
        view: null
      };
      const prev = state.open;
      state.open = open;
      const ctx = context(open);
      if (!ctx) {
        state.open = prev;
        return !1;
      }
      "ret" !== open.stage || ctx.dep || (open.stage = "dep");
      const c2 = context(open);
      const start = c2.date && c2.date >= c2.min ? c2.date : c2.min;
      open.view = new Date(start.getFullYear(), start.getMonth(), 1);
      if (!state.el) {
        !function() {
          if (document.getElementById("mmdp-css")) return;
          const css = `
#mmdp { position: absolute; z-index: 1000; background: #fff; color: ${INK_primary};
        border: 1px solid ${INK_hairline}; border-radius: 10px; padding: 14px 14px 10px;
        box-sizing: border-box; max-width: calc(100vw - 16px);
        box-shadow: 0 8px 28px rgba(5,22,77,.16); font-family: inherit; font-size: 13px; }
.mmdp-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px; margin-bottom: 6px; }
.mmdp-title { font-size: 17px; font-weight: 700; }
.mmdp-sub { font-size: 12px; color: ${INK_secondary}; }
.mmdp-tabs { display: flex; gap: 6px; width: 100%; margin-bottom: 2px; }
.mmdp-tab { flex: 1; font: inherit; font-size: 12.5px; border: 1px solid ${INK_hairline}; background: #fff;
            color: ${INK_primary}; border-radius: 6px; padding: 5px 10px; cursor: pointer; text-align: left; }
.mmdp-tab b { display: block; font-size: 10.5px; font-weight: 600; color: ${INK_secondary}; }
.mmdp-tab[aria-pressed="true"] { border-color: ${INK_primary}; box-shadow: inset 0 0 0 1px ${INK_primary}; }
.mmdp-nav { font: inherit; font-size: 18px; line-height: 1; width: 30px; height: 30px; border-radius: 50%;
            border: 1px solid ${INK_hairline}; background: #fff; color: ${INK_primary}; cursor: pointer; }
.mmdp-nav:hover:not(:disabled) { background: #f3f6fc; }
.mmdp-nav:disabled { opacity: .3; cursor: default; }
.mmdp-bar { display: flex; align-items: center; justify-content: space-between; margin: 6px 0; }
.mmdp-mlabel { font-weight: 700; }
.mmdp-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 46px)); grid-template-rows: 20px; grid-auto-rows: 44px; gap: 2px 0; }
.mmdp-dow { font-size: 11px; color: ${INK_muted}; text-align: center; align-self: end; padding-bottom: 2px; }
.mmdp-dow.is-we { color: ${INK_secondary}; font-weight: 600; }
.mmdp-d { font: inherit; border: 0; background: transparent; color: ${INK_primary}; cursor: pointer;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 1px; padding: 0; border-radius: 6px; position: relative; }
.mmdp-d.is-we { background: #f4f6fa; }
.mmdp-d:hover:not(:disabled) { box-shadow: inset 0 0 0 1px ${INK_primary}; }
.mmdp-d:focus-visible { outline: 2px solid ${INK_primary}; outline-offset: 1px; }
.mmdp-d:disabled { opacity: .25; cursor: default; }
.mmdp-n { font-size: 13.5px; font-weight: 600; line-height: 1; }
.mmdp-p { font-size: 10.5px; line-height: 1; color: ${INK_secondary}; min-height: 10px; }
.mmdp-d.is-today .mmdp-n { text-decoration: underline; text-underline-offset: 3px; }
.mmdp-d.is-best .mmdp-p { color: ${INK_best}; font-weight: 700; }
.mmdp-star { position: absolute; top: 2px; right: 3px; font-size: 9px; line-height: 1; color: ${INK_best}; }
.mmdp-d.is-in { background: #dbe3f3; border-radius: 0; }
.mmdp-d.is-sel { background: ${INK_primary}; color: #fff; }
.mmdp-d.is-sel .mmdp-p, .mmdp-d.is-sel .mmdp-star { color: #fff; }
.mmdp-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; margin-top: 8px; padding-top: 8px;
             contain: inline-size;
             border-top: 1px solid ${INK_hairline}; font-size: 12px; color: ${INK_secondary}; }
.mmdp-info { flex: 1 0 100%; min-height: 2lh; color: ${INK_primary}; }
.mmdp-load { margin-left: auto; font: inherit; font-size: 12px; border: 1px solid ${INK_hairline}; background: #fff;
             color: ${INK_primary}; border-radius: 6px; padding: 4px 10px; cursor: pointer; }
.mmdp-load:hover { border-color: ${INK_primary}; }
.mmdp-live { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
`;
          const st = document.createElement("style");
          st.id = "mmdp-css";
          st.textContent = css;
          (document.head || document.documentElement).appendChild(st);
        }();
        state.el = document.createElement("div");
        state.el.id = "mmdp";
        state.el.setAttribute("role", "dialog");
        state.el.setAttribute("aria-label", T("Reisedatum wählen"));
        state.el.addEventListener("click", onPanelClick);
        state.el.addEventListener("keydown", onPanelKey);
        state.el.addEventListener("mouseover", onHover);
        state.el.addEventListener("mouseleave", () => setHover(null));
        document.body.appendChild(state.el);
      }
      !state.offCal && window.__mmCal && window.__mmCal.onUpdate && (state.offCal = window.__mmCal.onUpdate(render));
      !state.offBbd && window.__mmBBD && window.__mmBBD.onUpdate && (state.offBbd = window.__mmBBD.onUpdate(render));
      refresh();
      return !0;
    }
    function close(refocus) {
      const open = state.open;
      state.open = null;
      if (state.el) {
        state.el.remove();
        state.el = null;
      }
      for (const k of [ "offCal", "offBbd" ]) if (state[k]) {
        try {
          state[k]();
        } catch (e) {}
        state[k] = null;
      }
      if (refocus && open && open.field) {
        const input = open.field.querySelector("ret" === open.stage ? ".return-date-rt" : "input");
        input && input.focus({
          preventScroll: !0
        });
      }
    }
    function onPanelClick(e) {
      const t = e.target.closest("button");
      if (t && !t.disabled && state.open) if (t.dataset.date) !function(ds) {
        const open = state.open;
        const ctx = context(open);
        if (!ctx) return;
        const d = parseISO(ds);
        ctx.f.zone.run(() => {
          ctx.ctrl.setValue(d);
          ctx.ctrl.markAsDirty();
          "range" === ctx.kind && "dep" === open.stage && ctx.ret && ctx.ret < d && ctx.f.comp.modifySearchForm.controls.returnDate.setValue(null);
        });
        if ("range" !== ctx.kind || "dep" !== open.stage) close(!0); else {
          open.stage = "ret";
          open.focus = ds;
          open.hover = null;
          open.wantFocus = !0;
          refresh();
        }
      }(t.dataset.date); else if (t.dataset.nav) !function(n) {
        const open = state.open;
        open.view = ((d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1))(open.view, n);
        const f = parseISO(open.focus);
        monthKey(f) !== monthKey(open.view) && (open.focus = iso(new Date(open.view.getFullYear(), open.view.getMonth(), Math.min(f.getDate(), 28))));
        refresh();
      }(Number(t.dataset.nav)); else {
        if (t.dataset.stage) {
          const ctx = context(state.open);
          if (!("ret" !== t.dataset.stage || ctx && ctx.dep)) return;
          state.open.stage = t.dataset.stage;
          state.open.focus = null;
          state.open.wantFocus = !0;
          refresh();
          return;
        }
        if (t.classList.contains("mmdp-load")) {
          const ctx = context(state.open);
          ctx && load(ctx, missing(ctx, [ state.open.view ]));
        }
      }
    }
    function setHover(ds) {
      const open = state.open;
      if (!open || open.hover === ds) return;
      open.hover = ds;
      const ctx = context(open);
      if (!ctx || !state.el) {
        render();
        return;
      }
      const [rs, re] = rangeOf(ctx, open);
      const infoEl = state.el.querySelector(".mmdp-info");
      infoEl && (infoEl.textContent = info(ctx, rs, open.pr));
      for (const btn of state.el.querySelectorAll(".mmdp-d")) {
        const day = btn.dataset.date;
        const sel = day === rs || day === re || "range" !== ctx.kind && !!ctx.date && day === iso(ctx.date);
        btn.classList.toggle("is-sel", sel);
        btn.classList.toggle("is-in", !sel && !!rs && !!re && day > rs && day < re);
        sel ? btn.setAttribute("aria-selected", "true") : btn.removeAttribute("aria-selected");
      }
    }
    function onHover(e) {
      const b = e.target.closest(".mmdp-d");
      setHover(b && !b.disabled ? b.dataset.date : null);
    }
    function onPanelKey(e) {
      const open = state.open;
      if (!open) return;
      if ("Escape" === e.key) {
        e.preventDefault();
        e.stopPropagation();
        close(!0);
        return;
      }
      if (!e.target.classList.contains("mmdp-d")) return;
      const d = parseISO(e.target.dataset.date);
      const dow = (d.getDay() + 6) % 7;
      const step = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -7,
        ArrowDown: 7,
        Home: -dow,
        End: 6 - dow
      }[e.key];
      let next = null != step ? addDays(d, step) : "PageUp" === e.key ? new Date(d.getFullYear(), d.getMonth() - 1, Math.min(d.getDate(), 28)) : "PageDown" === e.key ? new Date(d.getFullYear(), d.getMonth() + 1, Math.min(d.getDate(), 28)) : null;
      if (!next) return;
      e.preventDefault();
      const ctx = context(open);
      ctx && (next = next < ctx.min ? ctx.min : next > ctx.max ? ctx.max : next);
      open.focus = iso(next);
      open.hover = "ret" === open.stage ? open.focus : null;
      open.wantFocus = !0;
      monthKey(next) !== monthKey(open.view) && (open.view = new Date(next.getFullYear(), next.getMonth(), 1));
      refresh();
    }
    const fieldOf = t => {
      const f = t && t.closest && t.closest(FIELDS);
      return f && f.closest("form.modify-search-form") ? f : null;
    };
    function onDocClick(e) {
      if (state.superseded || !on()) return;
      const field = fieldOf(e.target);
      if (field) if (!state.open || state.open.field !== field || e.target.closest("input")) {
        if (openFor(field, e.target)) {
          e.preventDefault();
          e.stopPropagation();
        }
      } else {
        e.preventDefault();
        e.stopPropagation();
        close(!0);
      } else state.open && state.el && !state.el.contains(e.target) && close(!1);
    }
    function onDocKey(e) {
      if (state.superseded || !on()) return;
      const field = fieldOf(e.target);
      if (field && ("Enter" === e.key || e.altKey && "ArrowDown" === e.key)) {
        if (openFor(field, e.target)) {
          e.preventDefault();
          e.stopPropagation();
        }
      } else field && state.open && "Escape" === e.key && close(!1);
    }
    function onFocusOut(e) {
      const to = e.relatedTarget;
      state.open && state.el && !state.rendering && to && (state.el.contains(to) || state.open.field.contains(to) || state.el.contains(e.target) && close(!1));
    }
    const onResize = () => {
      state.open && place();
    };
    document.addEventListener("click", onDocClick, !0);
    document.addEventListener("keydown", onDocKey, !0);
    document.addEventListener("focusout", onFocusOut, !0);
    window.addEventListener("resize", onResize);
    state.close = close;
    state.render = render;
    state.teardown = () => {
      state.superseded = !0;
      close(!1);
      document.removeEventListener("click", onDocClick, !0);
      document.removeEventListener("keydown", onDocKey, !0);
      document.removeEventListener("focusout", onFocusOut, !0);
      window.removeEventListener("resize", onResize);
      const st = document.getElementById("mmdp-css");
      st && st.remove();
    };
    try {
      window.addEventListener("pagehide", e => {
        e && e.persisted || close(!1);
      });
    } catch (e) {}
  })();
  (() => {
    "use strict";
    const VERSION = 74;
    if (window.__mmBounds && window.__mmBounds.version >= VERSION) return;
    const T = (s, p) => window.__mmI18n ? window.__mmI18n.t(s, p) : p ? String(s).replace(/\{(\w+)\}/g, (m, k) => null != p[k] ? String(p[k]) : m) : String(s);
    const Tn = (n, one, other, p) => window.__mmI18n ? window.__mmI18n.tn(n, one, other, p) : T(1 === n ? one : other, Object.assign({
      n: n
    }, p));
    const dtf = o => window.__mmI18n ? window.__mmI18n.dtf(o) : new Intl.DateTimeFormat("de-DE", o);
    const inherited = window.__mmBounds;
    const BOUNDS_RE = /air-bounds/i;
    const API_RE = /\/one-booking\/v\d+\//i;
    function isWidebody(name, code) {
      const s = (name || code || "").toUpperCase();
      return !!/A3(00|10|30|40|50|80)/.test(s) || !!/7(47|67|77|87)/.test(s) || !!/IL.?96|MD.?11|DC.?10|L.?1011|TRISTAR/.test(s);
    }
    const VARIANT_BY_OPERATOR = {
      "ET|787": "BOEING 787-8",
      "ET|350": "AIRBUS A350-900"
    };
    const variantName = (op, code) => VARIANT_BY_OPERATOR[(op || "") + "|" + (code || "")] || null;
    const ALLEGRIS_ACV = new Set([ "A42", "A43", "A44", "A45", "A46", "78F", "78G", "78J", "78K", "A74", "B74", "K74", "O74", "L74" ]);
    const isAllegris = (operating, acv) => "LH" === operating && ALLEGRIS_ACV.has(acv);
    const A380_NEW_BC_ACV = new Set([ "L38" ]);
    const isNewBizA380 = (operating, acv) => "LH" === operating && A380_NEW_BC_ACV.has(acv);
    const PREMIUM_BY_ACV = [ {
      op: "LX",
      acvs: new Set([ "A35", "A36", "33F", "33R" ]),
      label: "Senses",
      title: () => T("Swiss Senses: neue Kabinengeneration, Business teils als Suite mit Schiebetür")
    }, {
      op: "4Y",
      acvs: new Set([ "33B", "33F" ]),
      label: "Ocean Blue",
      title: () => T("Eurowings Discover: neue Langstreckenkabine (Ocean Blue)")
    } ];
    const PREMIUM_BY_TYPE = [ {
      op: "AI",
      re: /A350/,
      label: () => T("Business Suiten"),
      title: () => T("Air India A350: Business als Suite mit Schiebetür (1-2-1)")
    }, {
      op: "TK",
      re: /A350-1000/,
      label: "Crystal",
      title: () => T("Turkish Crystal Business: Suiten mit Schiebetür (1-2-1), nur auf dem A350-1000")
    }, {
      op: "AC",
      re: /787-10/,
      label: "Signature Plus",
      title: () => T("Air Canada 787-10: Signature-Kabine mit Signature-Plus-Suiten (Tür) vorn")
    } ];
    const premiumCabin = (operating, acName, acv) => {
      const byAcv = PREMIUM_BY_ACV.find(p => p.op === operating && p.acvs.has(acv));
      if (byAcv) return {
        label: byAcv.label,
        title: byAcv.title()
      };
      if ("LX" === operating && ("A37" === acv || "33S" === acv)) return null;
      if ("LX" === operating && /A350/.test(acName || "")) return {
        label: "Senses",
        title: PREMIUM_BY_ACV[0].title()
      };
      const hit = PREMIUM_BY_TYPE.find(p => p.op === operating && p.re.test(acName || ""));
      return hit ? {
        label: "function" == typeof hit.label ? hit.label() : hit.label,
        title: hit.title()
      } : null;
    };
    const AIRLINES = {
      LH: "Lufthansa",
      LX: "Swiss",
      OS: "Austrian",
      SN: "Brussels Airlines",
      EN: "Air Dolomiti",
      EW: "Eurowings",
      CL: "Lufthansa CityLine",
      VL: "Lufthansa City",
      WK: "Edelweiss",
      AC: "Air Canada",
      UA: "United",
      AA: "American",
      DL: "Delta",
      TK: "Turkish Airlines",
      SQ: "Singapore Airlines",
      NH: "ANA",
      TG: "Thai Airways",
      CA: "Air China",
      OZ: "Asiana",
      ET: "Ethiopian",
      MS: "EgyptAir",
      SA: "South African",
      AI: "Air India",
      BR: "EVA Air",
      CI: "China Airlines",
      JL: "Japan Airlines",
      AV: "Avianca",
      CM: "Copa",
      LO: "LOT",
      SK: "SAS",
      TP: "TAP",
      A3: "Aegean",
      ZH: "Shenzhen Airlines",
      MU: "China Eastern",
      SW: "Air Namibia",
      QK: "Air Canada Jazz"
    };
    const state = {
      version: VERSION,
      bounds: new Map,
      current: [],
      dictionaries: null,
      responses: 0,
      lastRaw: null,
      api: null,
      listeners: [],
      reqListeners: [],
      cartListeners: [],
      cartInFlight: 0,
      lastCart: null
    };
    try {
      Object.defineProperty(window, "__mmBounds", {
        value: state,
        enumerable: !1,
        configurable: !0
      });
    } catch (e) {
      try {
        window.__mmBounds = state;
      } catch (e2) {}
    }
    if (inherited) try {
      inherited.bounds && inherited.bounds.forEach((v, k) => state.bounds.set(k, v));
      Array.isArray(inherited.current) && (state.current = inherited.current.slice());
      inherited.dictionaries && (state.dictionaries = inherited.dictionaries);
      inherited.lastRaw && (state.lastRaw = inherited.lastRaw);
      inherited.listSig && (state.listSig = inherited.listSig);
      inherited.lastError && (state.lastError = inherited.lastError);
      inherited.api && (state.api = inherited.api);
      Array.isArray(inherited.listeners) && (state.listeners = inherited.listeners);
      Array.isArray(inherited.reqListeners) && (state.reqListeners = inherited.reqListeners);
      Array.isArray(inherited.cartListeners) && (state.cartListeners = inherited.cartListeners);
      inherited.lastCart && (state.lastCart = inherited.lastCart);
      "number" == typeof inherited.cartInFlight && (state.cartInFlight = inherited.cartInFlight);
      inherited.lastRaw = null;
      inherited.bounds = null;
      inherited.dictionaries = null;
      try {
        inherited._offFareNames && inherited._offFareNames();
      } catch (e2) {}
    } catch (e) {}
    const subscriber = key => fn => {
      const list = state[key];
      list.push(fn);
      return () => {
        const i = list.indexOf(fn);
        i >= 0 && list.splice(i, 1);
      };
    };
    state.onUpdate = subscriber("listeners");
    state.onRequest = subscriber("reqListeners");
    state.onCart = subscriber("cartListeners");
    const emit = () => state.listeners.forEach(fn => {
      try {
        fn(state);
      } catch (e) {}
    });
    const searchSig = b => {
      try {
        return JSON.stringify({
          i: b.itineraries,
          c: b.commercialFareFamilies || null
        });
      } catch (e) {
        return null;
      }
    };
    const emitRequest = (active, meta) => state.reqListeners.forEach(fn => {
      try {
        fn(active, meta);
      } catch (e) {}
    });
    const hhmm = iso => {
      const m = /T(\d{2}:\d{2})/.exec(iso || "");
      return m ? m[1] : null;
    };
    const airlineName = (code, dictName) => {
      if (code && AIRLINES[code]) return AIRLINES[code];
      const n = (dictName || "").trim();
      return n ? n.replace(/\s*[-–].*$/, "").split(/\s+/).slice(0, 3).join(" ").replace(/[A-ZÄÖÜ][A-ZÄÖÜ]+/g, w => w[0] + w.slice(1).toLowerCase()) : code || "";
    };
    const GROUND_EQUIPMENT = [ "BUS", "TRN", "TRS" ];
    const PAX_ORDER = [ "ADT", "B15", "CHD", "INF" ];
    function dayDiff(a, b) {
      const pa = /^(\d{4})-(\d{2})-(\d{2})/.exec(a || "");
      const pb = /^(\d{4})-(\d{2})-(\d{2})/.exec(b || "");
      return pa && pb ? Math.round((Date.UTC(+pb[1], +pb[2] - 1, +pb[3]) - Date.UTC(+pa[1], +pa[2] - 1, +pa[3])) / 864e5) : null;
    }
    const FARE_CABIN = {
      X: "eco",
      R: "ecoPremium",
      I: "business",
      O: "first"
    };
    const FARE_TIER = {
      LIGHT: "Light",
      NC: "Comfort",
      RC: "Comfort +",
      FF: "Flex",
      NOR: "Standard",
      CLS: "Comfort",
      BXX: "Comfort",
      FLX: "Flex",
      BUZ: "Flex"
    };
    const CALLS_KEY = "mm_bounds_calls";
    const BUDGET_WINDOW_MS = 70 * 60 * 1e3;
    const BLOCK_MS = 61 * 60 * 1e3;
    const BUDGET_LIMIT = 37;
    function readCalls() {
      try {
        const a = JSON.parse(localStorage.getItem(CALLS_KEY) || "[]");
        const floor = Date.now() - BUDGET_WINDOW_MS;
        return Array.isArray(a) ? a.filter(t => "number" == typeof t && t > floor) : [];
      } catch (e) {
        return [];
      }
    }
    state.resetBudget = () => {
      try {
        localStorage.removeItem(CALLS_KEY);
      } catch (e) {}
      clearBlock();
      state.lastError && state.lastError.transport && (state.lastError = null);
      emit();
      return state.budget();
    };
    state.budget = () => {
      const a = readCalls();
      const lastAt = a.length ? a[a.length - 1] : null;
      return {
        calls: a.length,
        limit: BUDGET_LIMIT,
        windowMs: BUDGET_WINDOW_MS,
        lastAt: lastAt,
        freeAt: lastAt ? lastAt + BLOCK_MS : null
      };
    };
    const hhmmLocal = ms => {
      try {
        return dtf({
          hour: "2-digit",
          minute: "2-digit"
        }).format(new Date(ms));
      } catch (e) {
        return "";
      }
    };
    const hmsLocal = ms => {
      try {
        return dtf({
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        }).format(new Date(ms));
      } catch (e) {
        return "";
      }
    };
    const BLOCK_KEY = "mm_block";
    const BURST_S = 900;
    function clearBlock() {
      try {
        localStorage.getItem(BLOCK_KEY) && localStorage.removeItem(BLOCK_KEY);
      } catch (e) {}
    }
    let probing = null;
    function failed(status, detail, sig) {
      const http = Number(status) || 0;
      const what = detail ? String(detail).slice(0, 200) : null;
      const blocked = 429 === http || 0 === http;
      const title = blocked ? T("Suchlimit erreicht (HTTP 429).") : T("Suche fehlgeschlagen (HTTP {http}).", {
        http: http
      });
      const free = blocked ? state.budget().freeAt : null;
      const why = blocked ? free ? T("IP-Sperre etwa eine Stunde, bis ca. {time}.", {
        time: hhmmLocal(free)
      }) : T("IP-Sperre etwa eine Stunde.") : "";
      const err = state.lastError = {
        code: null,
        http: http,
        transport: !0,
        title: title,
        why: why,
        detail: what,
        t: Date.now()
      };
      noList(void 0 !== sig ? sig : state._pendingSig);
      emit();
      blocked && function() {
        if (probing) return probing;
        probing = (path = "air-bounds", new Promise(resolve => {
          let bridge = !1;
          const pong = () => {
            bridge = !0;
          };
          document.addEventListener("mm:probe-pong", pong);
          document.dispatchEvent(new CustomEvent("mm:probe-ping"));
          document.removeEventListener("mm:probe-pong", pong);
          if (!bridge) {
            resolve(null);
            return;
          }
          const id = Math.random().toString(36).slice(2);
          const finish = r => {
            document.removeEventListener("mm:probe-result", onResult);
            clearTimeout(timer);
            resolve(r);
          };
          const onResult = e => {
            let r = null;
            try {
              r = JSON.parse(String(e.detail));
            } catch (x) {}
            r && r.id === id && finish(r);
          };
          const timer = setTimeout(() => finish(null), 2e4);
          document.addEventListener("mm:probe-result", onResult);
          document.dispatchEvent(new CustomEvent("mm:probe", {
            detail: JSON.stringify({
              id: id,
              path: path
            })
          }));
        })).then(r => {
          probing = null;
          if (!r) return null;
          if (429 !== r.status || !(r.retryAfter > 0)) {
            clearBlock();
            return {
              status: r.status
            };
          }
          const until = Date.now() + 1e3 * r.retryAfter;
          const prev = function() {
            try {
              const b = JSON.parse(localStorage.getItem(BLOCK_KEY) || "null");
              return b && b.until > Date.now() ? b : null;
            } catch (e) {
              return null;
            }
          }();
          const same = prev && Math.abs(prev.until - until) < 15e3;
          const b = {
            status: 429,
            until: until,
            kind: r.retryAfter > BURST_S + 60 ? "hour" : same && prev.kind ? prev.kind : r.retryAfter >= BURST_S - 30 ? "burst" : null,
            retryAfter: r.retryAfter,
            t: Date.now()
          };
          try {
            localStorage.setItem(BLOCK_KEY, JSON.stringify(b));
          } catch (e) {}
          return b;
        }, () => {
          probing = null;
          return null;
        });
        var path;
        return probing;
      }().then(b => {
        if (b && state.lastError === err) {
          if (429 === b.status) {
            const t = function(b) {
              const n = Math.max(1, Math.ceil((b.until - Date.now()) / 6e4));
              const p = {
                time: hmsLocal(b.until),
                n: n
              };
              return {
                head: T("hour" === b.kind ? "Das war zu viel… (HTTP 429)" : "Das war wohl jemand übereifrig… (HTTP 429)"),
                hint: b.kind ? Tn(n, "Die IP-Adresse wurde deswegen bis {time} gesperrt (noch {n} Minute).", "Die IP-Adresse wurde deswegen bis {time} gesperrt (noch {n} Minuten).", p) : Tn(n, "Die IP-Adresse ist noch bis {time} gesperrt ({n} Minute).", "Die IP-Adresse ist noch bis {time} gesperrt ({n} Minuten).", p)
              };
            }(b);
            err.title = t.head;
            err.why = t.hint;
            err.block = b;
          } else if (b.status) {
            err.title = T("Suche fehlgeschlagen (keine Antwort vom Server).");
            err.why = "";
          }
          emit();
        }
      });
    }
    function noList(sig) {
      state.current = [];
      state.lastRaw = null;
      state.listSig = sig || null;
    }
    const STOP_WARNING = "40834";
    function noteCause(code, detail, warning) {
      try {
        code && window.__mmRecTrack?.note?.("air-bounds", {
          code: code,
          detail: detail,
          warning: warning
        });
      } catch (e) {}
    }
    function ingest(json, status, sig) {
      const callSig = void 0 !== sig ? sig : state._pendingSig;
      try {
        if (json && Array.isArray(json.errors) && json.errors.length) {
          const e = json.errors[0] || {};
          state.lastError = {
            code: e.code || null,
            title: e.title || null,
            detail: e.detail || null,
            http: Number(status) || null,
            t: Date.now()
          };
          noteCause(e.code, e.detail || e.title, !1);
          noList(callSig);
          emit();
          return;
        }
        (json && json.warnings || []).forEach(w => {
          "40834" === String(w && w.code) && noteCause(w.code, w.detail || w.title, !0);
        });
        if (Number(status) >= 400 && !(json && json.data && json.data.airBoundGroups)) {
          failed(status, json && (json.message || json.error || json.title), callSig);
          return;
        }
        state.lastError = null;
        const dicts = json.dictionaries || {};
        const groups = json.data && json.data.airBoundGroups || [];
        state.dictionaries = state.dictionaries || {};
        Object.keys(dicts).forEach(k => {
          dicts[k] && (state.dictionaries[k] = Object.assign({}, state.dictionaries[k], dicts[k]));
        });
        state.lastRaw = json;
        const keys = [];
        const dup = new Map;
        const unavailable = {
          total: 0,
          reasons: {}
        };
        const noteUnavailable = ab => {
          const s = ab && ab.status;
          const reason = s && "unavailable" === s.value ? (s.unavailabilityReasonCodes || [])[0] || "unavailable" : s && s.value || "unavailable";
          unavailable.total++;
          unavailable.reasons[reason] = (unavailable.reasons[reason] || 0) + 1;
        };
        groups.forEach(g => {
          if (!(g.airBounds || []).some(ab => ab && ab.prices)) {
            noteUnavailable((g.airBounds || [])[0]);
            return;
          }
          (g.airBounds || []).forEach(ab => {
            ab && ab.status && ab.status.value && "available" !== ab.status.value && noteUnavailable(ab);
          });
          const it = function(group, dicts) {
            const bd = group.boundDetails;
            if (!bd || !bd.segments || !bd.segments.length) return null;
            const flightDict = dicts.flight || {};
            const acDict = dicts.aircraft || {};
            const locDict = dicts.location || {};
            const alDict = dicts.airline || {};
            const legs = [];
            const layovers = [];
            let firstDepDT = null, lastArrDT = null;
            for (let i = 0; i < bd.segments.length; i++) {
              const seg = bd.segments[i];
              const f = flightDict[seg.flightId];
              if (!f) return null;
              const opCode = f.operatingAirlineCode || f.marketingAirlineCode || null;
              const acName = variantName(opCode, f.aircraftCode) || String(acDict[f.aircraftCode] || f.aircraftCode).replace(/\bINDUSTRIE\s+/i, "");
              0 === i && (firstDepDT = f.departure.dateTime);
              lastArrDT = f.arrival.dateTime;
              const cityOf = c => {
                const l = locDict[c];
                return l && (l.cityName || l.airportName) || null;
              };
              legs.push({
                flightId: seg.flightId,
                from: f.departure.locationCode,
                to: f.arrival.locationCode,
                fromCity: cityOf(f.departure.locationCode),
                toCity: cityOf(f.arrival.locationCode),
                dep: hhmm(f.departure.dateTime),
                arr: hhmm(f.arrival.dateTime),
                termDep: f.departure.terminal || null,
                termArr: f.arrival.terminal || null,
                operating: opCode,
                operatingName: airlineName(opCode, alDict[opCode]),
                codeshare: !(!f.operatingAirlineCode || !f.marketingAirlineCode || f.operatingAirlineCode === f.marketingAirlineCode),
                flightNo: (f.marketingAirlineCode || "") + (f.marketingFlightNumber || ""),
                mkt: f.marketingAirlineCode || null,
                mktNo: String(f.marketingFlightNumber || "").replace(/^0+/, ""),
                depDate: (f.departure.dateTime || "").slice(0, 10) || null,
                acv: f.aircraftConfigurationVersion || null,
                aircraftName: acName,
                widebody: isWidebody(acName, f.aircraftCode),
                allegris: isAllegris(f.operatingAirlineCode, f.aircraftConfigurationVersion),
                newBiz: isNewBizA380(f.operatingAirlineCode, f.aircraftConfigurationVersion),
                premium: premiumCabin(f.operatingAirlineCode, acName, f.aircraftConfigurationVersion),
                duration: f.duration,
                ground: GROUND_EQUIPMENT.includes(f.aircraftCode),
                techStops: (f.stops || []).map(t => ({
                  airport: t.locationCode,
                  city: cityOf(t.locationCode) || t.locationCode,
                  duration: t.duration || null,
                  changeOfGauge: !!t.isChangeOfGauge
                }))
              });
              if (i < bd.segments.length - 1) {
                const loc = locDict[f.arrival.locationCode];
                layovers[legs.length - 1] = seg.connectionTime ? {
                  airport: f.arrival.locationCode,
                  city: loc ? loc.cityName || loc.airportName : f.arrival.locationCode,
                  duration: seg.connectionTime
                } : null;
              }
            }
            if (!legs.length) return null;
            const first = legs[0], last = legs[legs.length - 1];
            const stops = legs.length - 1 + legs.reduce((n, l) => n + (l.ground ? 0 : (l.techStops || []).length), 0);
            const key = ((origin, dest, dep, arr, stops) => `${origin}|${dest}|${dep}|${arr}|${stops}`)(bd.originLocationCode, bd.destinationLocationCode, first.dep, last.arr, stops);
            const fares = function(group, dicts, legs) {
              const fcDict = dicts.fareConditions || {};
              const ffDict = dicts.fareFamilyWithServices || {};
              const curDict = dicts.currency || {};
              const amount = (value, code) => null == value ? null : value / Math.pow(10, curDict[code]?.decimalPlaces ?? 2);
              return (group.airBounds || []).map(ab => {
                const m = function(code) {
                  const s = String(code || "");
                  let fallback = null;
                  for (let i = 2; i <= 4 && i < s.length - 2; i++) {
                    const cabin = FARE_CABIN[s[i]];
                    if (!cabin) continue;
                    const rawTier = s.slice(i + 1);
                    if (FARE_TIER[rawTier]) return {
                      cabin: cabin,
                      tier: FARE_TIER[rawTier]
                    };
                    fallback = {
                      cabin: cabin,
                      tier: rawTier
                    };
                  }
                  return fallback;
                }(ab.fareFamilyCode);
                const ff = ffDict[ab.fareFamilyCode] || {};
                let cabin = m && m.cabin || ff.cabin || null;
                let tier = m ? m.tier : null;
                try {
                  const fn = window.__mmFareNames;
                  if (fn) {
                    const t = fn.tierOf(ab.fareFamilyCode);
                    t && (tier = t);
                    const c = fn.cabinOf(ab.fareFamilyCode);
                    c && (cabin = c);
                  }
                } catch (e) {}
                const prices = ab.prices || {};
                const total = (prices.totalPrices || [])[0] || {};
                const miles = prices.milesConversion && prices.milesConversion.convertedMiles ? prices.milesConversion.convertedMiles.total : null;
                const cpIds = new Set;
                (ab.fareInfos || []).forEach(fi => {
                  (fi.pricedPassengerTypeCodes || []).includes("CP") && (fi.travelerIds || []).forEach(id => cpIds.add(id));
                });
                const units = (prices.unitPrices || []).map(u => {
                  const p = (u.prices || [])[0] || {};
                  const cm = u.milesConversion && u.milesConversion.convertedMiles;
                  const ids = u.travelerIds || [];
                  return {
                    type: String(ids[0] || "").replace(/-\d+$/, "") || null,
                    count: ids.length || 1,
                    companion: ids.some(id => cpIds.has(id)),
                    miles: cm ? cm.total : null,
                    cash: amount(p.totalTaxes, p.currencyCode)
                  };
                });
                const rank = u => 2 * (PAX_ORDER.indexOf(u.type) + 1 || 9) + (u.companion ? 1 : 0);
                units.sort((a, b) => rank(a) - rank(b) || (b.miles || 0) - (a.miles || 0));
                const lead = units.reduce((n, u) => n + u.count, 0) > 1 ? units.find(u => "ADT" === u.type && !u.companion) || units.find(u => "ADT" === u.type) || units[0] : null;
                const details = ab.availabilityDetails || [];
                const detailOf = new Map(details.filter(a => a.flightId).map(a => [ a.flightId, a ]));
                const perLeg = legs.map((l, i) => ({
                  cabin: (detailOf.get(l.flightId) || details[i] || {}).cabin || null,
                  from: l.from || null,
                  to: l.to || null,
                  duration: null != l.duration ? l.duration : null,
                  operating: l.operating || null
                }));
                const cond = {};
                (ab.fareConditionsCodes || []).forEach(c => {
                  const x = fcDict[c];
                  if (!x) return;
                  const det = (x.details || [])[0] || {};
                  const prev = cond[x.category];
                  prev && prev.allowed && !det.isAllowed || (cond[x.category] = {
                    allowed: !1 !== det.isAllowed,
                    fee: det.penalty && det.penalty.price ? amount(det.penalty.price.total, det.penalty.price.currencyCode) : null,
                    currency: det.penalty && det.penalty.price ? det.penalty.price.currencyCode : null
                  });
                });
                const famTexts = (ff.services || []).map(s => function(code, dicts) {
                  const s = (dicts.service || {})[code];
                  if (!s) return null;
                  const long = (s.serviceDescriptions || []).find(x => "longText" === x.type);
                  if (long) return long.content;
                  const b = (s.baggagePolicyDescriptions || [])[0];
                  if (b) {
                    const c = (b.baggageCharacteristics || [])[0];
                    const kg = c && /(\d+)\s*KG/i.exec(c.description || "");
                    return b.quantity + " × " + (kg ? kg[1] + " kg" : c ? c.description : T("Stück"));
                  }
                  return null;
                }(s.serviceCode, dicts)).filter(Boolean);
                const pick = re => famTexts.find(t => re.test(t)) || null;
                const checkedBag = pick(/CHECKED BAG/i) || pick(/×/);
                const quotas = (ab.availabilityDetails || []).map(a => a && a.quota).filter(q => "number" == typeof q);
                return {
                  code: ab.fareFamilyCode,
                  cabin: cabin,
                  tier: tier,
                  notOffered: ab.status && ab.status.value && "available" !== ab.status.value ? String(ab.status.value) : null,
                  seatsLeft: quotas.length ? Math.min(...quotas) : null,
                  airBoundId: ab.airBoundId || null,
                  miles: lead ? lead.miles : miles,
                  cash: lead ? lead.cash : amount(total.totalTaxes, total.currencyCode),
                  totalMiles: miles,
                  totalCash: amount(total.totalTaxes, total.currencyCode),
                  pax: lead ? units : null,
                  currency: total.currencyCode || null,
                  perLeg: perLeg,
                  mixed: perLeg.length > 1 && perLeg.some(l => l.cabin !== cabin),
                  baggage: checkedBag,
                  cabinBag: pick(/CABIN BAG/i),
                  personalItem: !!pick(/PERSONAL ITEM/i),
                  seatReservation: !!pick(/SEAT RESERVATION/i),
                  change: cond.change || null,
                  refund: cond.refund || null
                };
              }).filter(f => null != f.miles);
            }(group, dicts, legs);
            const notOffered = fares.length && fares.every(f => f.notOffered) ? fares[0].notOffered : null;
            return {
              key: key,
              origin: bd.originLocationCode,
              dest: bd.destinationLocationCode,
              depTime: first.dep,
              arrTime: last.arr,
              stops: stops,
              depDate: (firstDepDT || "").slice(0, 10) || null,
              daysOffset: dayDiff(firstDepDT, lastArrDT),
              totalDuration: bd.duration,
              legs: legs,
              layovers: layovers,
              fares: fares,
              notOffered: notOffered
            };
          }(g, state.dictionaries);
          if (!it) return;
          if (it.notOffered) return;
          const n = (dup.get(it.key) || 0) + 1;
          dup.set(it.key, n);
          n > 1 && (it.key += "#" + n);
          state.bounds.set(it.key, it);
          keys.push(it.key);
        });
        state.unavailable = unavailable;
        state.current = keys;
        state.listSig = callSig || null;
        state.responses++;
        !function(keys, sig) {
          try {
            const cal = window.__mmCal;
            const body = state.lastBody;
            if (!cal || !cal.addSearchFares || !body || searchSig(JSON.parse(body)) !== sig) return;
            const fares = [];
            keys.forEach(k => (state.bounds.get(k).fares || []).forEach(f => {
              f.notOffered || fares.push({
                cabin: f.cabin,
                code: f.code,
                miles: f.miles,
                taxes: f.cash,
                currency: f.currency
              });
            }));
            cal.addSearchFares(body, fares);
          } catch (e) {}
        }(keys, callSig);
        emit();
      } catch (e) {}
    }
    state.reingest = () => {
      state.lastRaw && ingest(state.lastRaw);
    };
    try {
      const fn = window.__mmFareNames;
      fn && fn.onReady && (state._offFareNames = fn.onReady(() => state.reingest()));
    } catch (e) {}
    const AUTH_HEADERS = [ "authorization", "ama-client-facts", "ama-client-ref", "callid", "accept" ];
    function headersToObject(h) {
      const out = {};
      if (!h) return out;
      try {
        if ("function" == typeof h.forEach && !Array.isArray(h)) {
          h.forEach((v, k) => {
            out[k] = v;
          });
          return out;
        }
        if (Array.isArray(h)) {
          h.forEach(([k, v]) => {
            out[k] = v;
          });
          return out;
        }
        Object.keys(h).forEach(k => {
          out[k] = h[k];
        });
      } catch (e) {}
      return out;
    }
    const CART_RE = /\/one-booking\/v\d+\/shopping\/carts(\?|$|\/[^/?]+\/air-offers(\?|$))/i;
    const cartPayload = j => !!(j && j.data && (j.data.id || Array.isArray(j.data) && j.data.length));
    const TOKEN_PATH = "/auth/token";
    const TOK_KEY = "gateway-auth-tokens";
    const RT_KEY = "refresh_token";
    const SKEW_MS = 8 * 60 * 1e3;
    const TOKEN_TTL_S = 899;
    const auth = {
      form: null,
      base: null,
      inflight: null,
      timer: null,
      authzUrl: null
    };
    const GATEWAY_RE = /api\.shop\.miles-and-more\.com\/one-booking\/v\d+\/(?!auth\/)/i;
    function swapBearer(value) {
      if (!/^Bearer\s+\S+/i.test(String(value || ""))) return null;
      const cur = storedToken();
      if (!cur || !cur.token) return null;
      if (cur.expiresAt && cur.expiresAt < Date.now()) return null;
      if (String(value).replace(/^Bearer\s+/i, "") === cur.token) return null;
      state.bearerSwaps++;
      return "Bearer " + cur.token;
    }
    function storedToken() {
      try {
        const all = JSON.parse(sessionStorage.getItem(TOK_KEY) || "{}");
        const key = auth.form && auth.form.id && all[auth.form.id] ? auth.form.id : Object.keys(all)[0];
        const e = key && all[key];
        return e && e.token ? {
          key: key,
          all: all,
          token: e.token,
          expiresAt: Number(e.expiresAt) || 0
        } : null;
      } catch (e) {
        return null;
      }
    }
    function refreshToken(force) {
      const cur = storedToken();
      if (!force && cur && cur.expiresAt - Date.now() > SKEW_MS) return Promise.resolve(cur.token);
      if (auth.inflight) return auth.inflight;
      const base = state.api && state.api.base || auth.base;
      let rt = null;
      try {
        rt = sessionStorage.getItem(RT_KEY);
      } catch (e) {}
      if (!base || !auth.form || !rt) return Promise.resolve(cur ? cur.token : null);
      const p = postToken(base, "grant_type=refresh_token&refresh_token=" + encodeURIComponent(rt)).then(j => {
        if (!j || !j.access_token) return cur ? cur.token : null;
        try {
          storeToken(j);
        } catch (e) {}
        state.tokenRenewals++;
        return j.access_token;
      }).catch(() => cur ? cur.token : null).then(t => {
        auth.inflight = null;
        return t;
      });
      auth.inflight = p;
      return p;
    }
    async function postToken(base, tail) {
      const body = "client_id=" + encodeURIComponent(auth.form.id) + "&client_secret=" + encodeURIComponent(auth.form.secret) + "&" + tail;
      let r;
      try {
        r = await fetch(base + TOKEN_PATH, {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            accept: "application/json"
          },
          body: body
        });
      } catch (e) {
        throw new Error(T("Netzfehler, kein HTTP-Status ({detail})", {
          detail: e && e.message || e
        }));
      }
      if (!r.ok) {
        let reason = "";
        try {
          const j = await r.json();
          reason = j && (j.error_description || j.error || j.message) || "";
        } catch (e) {}
        throw new Error("HTTP " + r.status + (reason ? ": " + String(reason).slice(0, 120) : ""));
      }
      return r.json();
    }
    function storeToken(j) {
      const cur = storedToken();
      const all = cur && cur.all || {};
      all[cur && cur.key || auth.form.id] = {
        token: j.access_token,
        expiresAt: Date.now() + 1e3 * (Number(j.expires_in) || TOKEN_TTL_S)
      };
      sessionStorage.setItem(TOK_KEY, JSON.stringify(all));
      j.refresh_token && sessionStorage.setItem(RT_KEY, j.refresh_token);
    }
    const AUTHZ_SCOPE = "AUTHENTICATED%20IDENTIFIED%20urn%3Amilesandmore%3Atech%3Abackground%3Av1%3Aactive";
    function portalLocale() {
      const locale = String(document.documentElement.lang || navigator.language || "de-DE").split("-");
      return {
        language: (locale[0] || "de").toLowerCase(),
        country: (locale[1] || "DE").toUpperCase()
      };
    }
    function builtAuthzUrl() {
      try {
        const raw = document.body && document.body.getAttribute("data-bootstrapconfig");
        if (!raw) return null;
        const cfg = JSON.parse(raw);
        const base = cfg.MAM_BASE_URL, id = cfg.LATE_LOGIN_CLIENT_ID;
        const ctx = "oip" === cfg.tokenFormat ? cfg.oipContextPath : cfg.oneBookingContextPath;
        if (!base || !id || !ctx) return null;
        const {language: language, country: country} = portalLocale();
        return base.replace(/\/$/, "") + "/oauth2/userAuthorize?client_id=" + encodeURIComponent(id) + "&redirect_uri=" + encodeURIComponent(location.origin) + "&response_type=code&state=" + encodeURIComponent((ctx.startsWith("/") ? "" : "/") + ctx) + "&scope=" + AUTHZ_SCOPE + "&country=" + country + "&language=" + language;
      } catch (e) {
        return null;
      }
    }
    async function handover(context) {
      const base = state.api && state.api.base || auth.base;
      if (!base || !auth.form) throw new Error(T("Zugangsdaten der App noch nicht gesehen"));
      const authzUrl = auth.authzUrl || builtAuthzUrl();
      if (!authzUrl) throw new Error(T("Anmeldeaufruf der App noch nicht gesehen und keine Seitenkonfiguration (data-bootstrapconfig)"));
      window.__mmHandoverBusy = !0;
      try {
        const bootCtx = Object.assign({
          country: portalLocale().country
        }, context || {});
        let anon;
        try {
          anon = await postToken(base, "grant_type=client_credentials&context=" + encodeURIComponent(JSON.stringify(bootCtx)));
        } catch (e) {
          throw new Error(T("anonymes Token nicht ausgestellt (Land {country}), {detail}", {
            country: bootCtx.country,
            detail: e && e.message || e
          }));
        }
        if (!anon.refresh_token) throw new Error(T("anonymes Token ohne refresh_token (Land {country})", {
          country: bootCtx.country
        }));
        const r = await fetch(authzUrl, {
          credentials: "include",
          headers: {
            "x-code": "body",
            accept: "application/json"
          }
        });
        const text = await r.text();
        const m = /[?&]code=([^&"'\s]+)/.exec(text);
        if (401 === r.status) throw new Error(T("Gruppen-Login abgelaufen (userAuthorize HTTP 401). Auf www.miles-and-more.com neu anmelden, dann Büro wählen."));
        if (!r.ok || !m) throw new Error(T("kein Anmeldecode (HTTP {status})", {
          status: r.status
        }));
        const ctx = JSON.stringify({
          authenticationCode: m[1],
          userRedirectUri: location.origin
        });
        let tok;
        try {
          tok = await postToken(base, "grant_type=refresh_token&refresh_token=" + encodeURIComponent(anon.refresh_token) + "&context=" + encodeURIComponent(ctx));
        } catch (e) {
          throw new Error(T("Einlösung des Codes fehlgeschlagen, {detail}", {
            detail: e && e.message || e
          }));
        }
        if (!tok.access_token) throw new Error(T("Einlösung des Codes ohne access_token"));
        storeToken(tok);
        try {
          window.__mmAuth && (window.__mmAuth.code = null);
        } catch (e) {}
        state.handovers = (state.handovers || 0) + 1;
        return tok.access_token;
      } finally {
        window.__mmHandoverBusy = !1;
      }
    }
    let officeFollowing = !1;
    state.freshHeaders = function(force) {
      const a = state.api;
      return a ? refreshToken(force).then(token => {
        if (!token) return a.headers;
        const h = {
          ...a.headers
        };
        h[Object.keys(h).filter(x => "authorization" === x.toLowerCase())[0] || "authorization"] = "Bearer " + token;
        return h;
      }) : Promise.resolve(null);
    };
    state.refreshAuth = force => refreshToken(force).then(t => !!t);
    state.handover = handover;
    state.authzUrl = () => auth.authzUrl || builtAuthzUrl();
    state.handovers = inherited && inherited.handovers || 0;
    state.tokenRenewals = inherited && inherited.tokenRenewals || 0;
    state.bearerSwaps = inherited && inherited.bearerSwaps || 0;
    state._stopKeepalive = () => {
      clearInterval(auth.timer);
      auth.timer = null;
    };
    try {
      inherited && inherited._stopKeepalive && inherited._stopKeepalive();
    } catch (e) {}
    if (inherited && inherited._auth) {
      auth.authzUrl = inherited._auth.authzUrl || null;
      auth.form = inherited._auth.form || null;
      auth.base = inherited._auth.base || null;
    }
    Object.defineProperty(state, "_auth", {
      get: () => ({
        form: auth.form,
        base: auth.base,
        authzUrl: auth.authzUrl
      }),
      enumerable: !1
    });
    !function() {
      auth.timer && clearInterval(auth.timer);
      const t = setInterval(() => {
        (() => {
          const s = window.__mmSettings;
          return !s || !1 !== s.get("keepalive");
        })() && (state.api || auth.base) && refreshToken(!1);
      }, 60 * 1e3);
      t && "function" == typeof t.unref && t.unref();
      auth.timer = t;
    }();
    let placeholderScan = null;
    window.__mmBoundsHooks = {
      ingest: ingest,
      ingestText: function(text, status, sig) {
        let json = null;
        try {
          json = JSON.parse(text);
        } catch (e) {}
        if (json && "object" == typeof json) {
          status >= 200 && status < 300 && clearBlock();
          ingest(json, status, sig);
          const groups = json.data?.airBoundGroups;
          placeholderScan = {
            text: text,
            has: Array.isArray(groups) && groups.some(g => !(Array.isArray(g?.airBounds) ? g.airBounds : []).some(b => b?.prices))
          };
          return;
        }
        failed(status, String(text || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(), sig);
      },
      failed: failed,
      noteApi: function(url, headers) {
        const h = {};
        Object.keys(headers || {}).forEach(k => {
          AUTH_HEADERS.indexOf(k.toLowerCase()) >= 0 && (h[k] = headers[k]);
        });
        (h.authorization || h.Authorization) && (state.api = {
          base: String(url).replace(/(\/one-booking\/v\d+)\/.*$/, "$1"),
          headers: h
        });
      },
      noteTokenCall: function(url, body) {
        "string" == typeof url && /oauth2\/userAuthorize/.test(url) && (auth.authzUrl = url);
        if (!("string" != typeof url || url.indexOf(TOKEN_PATH) < 0 || "string" != typeof body || body.indexOf("client_secret") < 0)) try {
          const p = new URLSearchParams(body);
          const id = p.get("client_id"), secret = p.get("client_secret");
          id && secret && (auth.form = {
            id: id,
            secret: secret
          });
          auth.base = url.slice(0, url.indexOf(TOKEN_PATH));
        } catch (e) {}
      },
      cartStart: function() {
        state.cartInFlight = (state.cartInFlight || 0) + 1;
      },
      noteCart: function(status, text) {
        state.cartInFlight = Math.max(0, (state.cartInFlight || 0) - 1);
        let j = null;
        try {
          j = JSON.parse(text || "");
        } catch (e) {}
        const err = j && j.errors && j.errors[0] || null;
        const cart = {
          t: Date.now(),
          status: status,
          ok: cartPayload(j),
          code: err ? String(err.code || "") : null,
          title: err ? String(err.title || "") : null,
          detail: err ? String(err.detail || "") : null
        };
        state.lastCart = cart;
        state.cartListeners.forEach(fn => {
          try {
            fn(cart);
          } catch (e) {}
        });
        return cart;
      },
      isCartCall: (url, method) => CART_RE.test(String(url || "")) && "POST" === String(method || "GET").toUpperCase(),
      headersToObject: headersToObject,
      withoutStopWarning: function(text) {
        if (!text || text.indexOf('"' + STOP_WARNING + '"') < 0) return null;
        try {
          const j = JSON.parse(text);
          if (!Array.isArray(j.warnings)) return null;
          const rest = j.warnings.filter(w => String(w && w.code) !== STOP_WARNING);
          if (rest.length === j.warnings.length) return null;
          rest.length ? j.warnings = rest : delete j.warnings;
          return JSON.stringify(j);
        } catch (e) {
          return null;
        }
      },
      withoutPricelessGroups: function(text) {
        if (!text || text.indexOf('"airBoundGroups"') < 0) return null;
        try {
          const j = JSON.parse(text);
          const groups = j && j.data && j.data.airBoundGroups;
          if (!Array.isArray(groups) || !groups.length) return null;
          const priced = b => {
            const cm = b && b.prices && b.prices.milesConversion && b.prices.milesConversion.convertedMiles;
            return !(!cm || !cm.total);
          };
          if (!groups.every(g => (g && Array.isArray(g.airBounds) ? g.airBounds : []).every(b => !priced(b)))) return null;
          j.data.airBoundGroups = [];
          return JSON.stringify(j);
        } catch (e) {
          return null;
        }
      },
      followOrigin: async function(body) {
        if (!(() => {
          try {
            const cfg = window.__mmSettings;
            return !cfg || "auto" === cfg.get("office");
          } catch (e) {
            return !1;
          }
        })() || officeFollowing) return;
        let want = null;
        try {
          const from = (JSON.parse(body).itineraries || [])[0].originLocationCode;
          const iata = window.__mmIata;
          want = iata && iata.isoOf ? iata.isoOf(from) : null;
        } catch (e) {
          return;
        }
        if (!want) return;
        let have = null;
        try {
          const a = window.__mmAuth;
          have = a && a.activeCountry && a.activeCountry() || null;
        } catch (e) {}
        if (have !== want) {
          officeFollowing = !0;
          try {
            await handover({
              country: want
            });
          } catch (e) {} finally {
            officeFollowing = !1;
          }
        }
      },
      swapBearer: swapBearer,
      adjustFetch: function(url, args) {
        if (!GATEWAY_RE.test(String(url || ""))) return null;
        const init = args[1] || {};
        const obj = headersToObject(init.headers || (args[0] && "object" == typeof args[0] ? args[0].headers : null));
        const k = Object.keys(obj).find(x => "authorization" === x.toLowerCase());
        if (!k) return null;
        const swapped = swapBearer(obj[k]);
        if (!swapped) return null;
        obj[k] = swapped;
        return [ args[0], Object.assign({}, init, {
          headers: obj
        }) ];
      },
      adjustHeader: function(url, name, value) {
        return "authorization" === String(name).toLowerCase() && GATEWAY_RE.test(String(url || "")) ? swapBearer(value) : null;
      },
      withoutPlaceholderGroups: text => function(text) {
        const scan = placeholderScan;
        placeholderScan = null;
        return !!scan && scan.text === text && !scan.has;
      }(text) ? null : function(text) {
        if (!text || text.indexOf('"airBoundGroups"') < 0) return null;
        try {
          const j = JSON.parse(text);
          const groups = j && j.data && j.data.airBoundGroups;
          if (!Array.isArray(groups) || !groups.length) return null;
          const kept = groups.filter(g => (g && Array.isArray(g.airBounds) ? g.airBounds : []).some(b => b && b.prices));
          if (kept.length === groups.length) return null;
          j.data.airBoundGroups = kept;
          return JSON.stringify(j);
        } catch (e) {
          return null;
        }
      }(text),
      start: body => {
        !function() {
          const a = readCalls();
          a.push(Date.now());
          try {
            localStorage.setItem(CALLS_KEY, JSON.stringify(a));
          } catch (e) {}
        }();
        state.lastBody = "string" == typeof body ? body : null;
        const meta = (body => {
          try {
            const b = JSON.parse(body);
            const meta = {
              fresh: !b.selectedBoundId,
              sig: searchSig(b)
            };
            state._pendingSig = meta.sig;
            return meta;
          } catch (e) {
            return {
              fresh: !0,
              sig: null
            };
          }
        })(body);
        emitRequest(!0, meta);
        return meta.sig;
      },
      end: () => emitRequest(!1)
    };
    const hook = (name, ...args) => (() => {
      try {
        return window.__mmBoundsHooks?.[name]?.(...args);
      } catch (e) {}
    })();
    const count = name => {
      const b = window.__mmBounds;
      b && (b[name] = (b[name] || 0) + 1);
    };
    if (!window.__mmBoundsHooked) {
      window.__mmBoundsHooked = !0;
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        const url = "string" == typeof args[0] ? args[0] : args[0] && args[0].url || "";
        let callSig;
        const watched = BOUNDS_RE.test(url);
        const cartCall = !!hook("isCartCall", url, args[1]?.method || args[0]?.method);
        cartCall && hook("cartStart");
        hook("noteTokenCall", url, args[1]?.body);
        let sentBody = args[1]?.body;
        if (watched && "string" != typeof sentBody && args[0] && "object" == typeof args[0] && "function" == typeof args[0].clone && null == args[1]?.body) try {
          sentBody = await args[0].clone().text();
        } catch (e) {}
        if (watched && "string" == typeof sentBody) try {
          await (window.__mmBoundsHooks?.followOrigin?.(sentBody));
        } catch (e) {}
        const adjusted = hook("adjustFetch", url, args);
        adjusted && (args = adjusted);
        (watched || API_RE.test(url)) && hook("noteApi", url, hook("headersToObject", args[1]?.headers));
        watched && (callSig = hook("start", sentBody));
        try {
          let res;
          try {
            res = await originalFetch.apply(this, args);
          } catch (e) {
            watched && hook("failed", 0, e?.message, callSig);
            cartCall && hook("noteCart", 0, null);
            throw e;
          }
          if (cartCall) {
            let ct = null;
            try {
              ct = await res.clone().text();
            } catch (e) {}
            hook("noteCart", res.status, ct);
          }
          if (watched) {
            const status = res.status;
            let text = null;
            try {
              text = await res.clone().text();
            } catch (e) {
              hook("failed", status, e?.message, callSig);
            }
            if (null !== text) {
              hook("ingestText", text, status, callSig);
              let cleaned = hook("withoutStopWarning", text) || null;
              cleaned && count("stopWarningsStripped");
              const emptied = cleaned && hook("withoutPricelessGroups", cleaned);
              if (emptied) {
                count("pricelessGroupsEmptied");
                cleaned = emptied;
              }
              const stripped = hook("withoutPlaceholderGroups", cleaned || text);
              if (stripped) {
                count("placeholderGroupsRemoved");
                cleaned = stripped;
              }
              if (cleaned) return new Response(cleaned, {
                status: res.status,
                statusText: res.statusText,
                headers: res.headers
              });
            }
          }
          return res;
        } finally {
          watched && hook("end");
        }
      };
      const XO = XMLHttpRequest.prototype.open;
      const XS = XMLHttpRequest.prototype.send;
      const XH = XMLHttpRequest.prototype.setRequestHeader;
      XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
        const swapped = hook("adjustHeader", this.__mmBoundsUrl, name, value);
        swapped && (value = swapped);
        if (this.__mmBoundsWatched || this.__mmApiCall) {
          this.__mmBoundsHeaders = this.__mmBoundsHeaders || {};
          this.__mmBoundsHeaders[name] = value;
        }
        return XH.call(this, name, value);
      };
      XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        this.__mmBoundsWatched = BOUNDS_RE.test(String(url));
        this.__mmApiCall = API_RE.test(String(url));
        this.__mmBoundsHeaders = null;
        this.__mmBoundsUrl = String(url);
        this.__mmCartCall = !!hook("isCartCall", url, method);
        if (this.__mmCartCall && !this.__mmCartWired) {
          this.__mmCartWired = !0;
          this.addEventListener("load", () => {
            this.__mmCartCall && hook("noteCart", this.status, this.responseText);
          });
          [ "error", "abort", "timeout" ].forEach(ev => this.addEventListener(ev, () => {
            this.__mmCartCall && hook("noteCart", 0, null);
          }));
        }
        if (this.__mmBoundsWatched && !this.__mmBoundsWired) {
          this.__mmBoundsWired = !0;
          this.addEventListener("load", () => {
            if (this.__mmBoundsWatched) try {
              window.__mmBoundsHooks?.ingestText?.(this.responseText, this.status, this.__mmBoundsSig);
            } catch (e) {
              hook("failed", this.status, e?.message, this.__mmBoundsSig);
            }
          });
          [ "error", "abort", "timeout" ].forEach(ev => this.addEventListener(ev, () => {
            this.__mmBoundsWatched && hook("failed", 0, ev, this.__mmBoundsSig);
          }));
          this.addEventListener("loadend", () => {
            this.__mmBoundsWatched && hook("end");
          });
        }
        return XO.call(this, method, url, ...rest);
      };
      XMLHttpRequest.prototype.send = function(...rest) {
        hook("noteTokenCall", this.__mmBoundsUrl, rest[0]);
        this.__mmCartCall && hook("cartStart");
        (this.__mmBoundsWatched || this.__mmApiCall) && hook("noteApi", this.__mmBoundsUrl, this.__mmBoundsHeaders);
        this.__mmBoundsWatched && (this.__mmBoundsSig = hook("start", rest[0]));
        return XS.apply(this, rest);
      };
    }
    state.airlineName = airlineName;
    state.summary = () => ({
      version: state.version,
      responses: state.responses,
      boundsKnown: state.bounds.size,
      current: state.current.length
    });
  })();
  (() => {
    "use strict";
    const VERSION = 386;
    if (window.__mmCards?.version >= VERSION) return;
    const T = (s, p) => window.__mmI18n ? window.__mmI18n.t(s, p) : p ? String(s).replace(/\{(\w+)\}/g, (m, k) => null != p[k] ? String(p[k]) : m) : String(s);
    const Tn = (n, one, other, p) => window.__mmI18n ? window.__mmI18n.tn(n, one, other, p) : T(1 === n ? one : other, Object.assign({
      n: n
    }, p));
    const nf = o => window.__mmI18n ? window.__mmI18n.nf(o) : new Intl.NumberFormat("de-DE", o);
    const inherited = window.__mmCards;
    if (inherited) {
      inherited.superseded = !0;
      try {
        inherited._observer?.disconnect();
      } catch (e) {}
      try {
        inherited._offData?.();
      } catch (e) {}
      try {
        inherited._offReq?.();
      } catch (e) {}
      try {
        inherited._offCart?.();
      } catch (e) {}
      try {
        inherited._offFx?.();
      } catch (e) {}
      try {
        inherited._offSettings?.();
      } catch (e) {}
      try {
        inherited.destroy?.();
      } catch (e) {}
      try {
        inherited._abort?.abort();
      } catch (e) {}
    }
    const INK_primary = "#05164D", INK_secondary = "#52514e", INK_muted = "#898781", INK_hairline = "#e1e0d9", INK_accent = "#1c5cab", INK_warn = "#A54A4A";
    const CABIN = {
      eco: {
        name: "Economy",
        color: "#4C6E48",
        rank: 1
      },
      ecoPremium: {
        name: "Premium Economy",
        color: "#2C5744",
        rank: 2
      },
      business: {
        name: "Business",
        color: "#47616C",
        rank: 3
      },
      first: {
        name: "First",
        color: "#A54A4A",
        rank: 4
      }
    };
    const ORDER = [ "eco", "ecoPremium", "business", "first" ];
    const reasonText = r => "soldOut" === r ? T("ausverkauft") : "tooCloseToDeparture" === r ? T("zu kurz vor Abflug") : "unavailable" === r ? T("nicht verfügbar") : r;
    const CFF_CABIN = [ [ /^CFFPECO/i, "ecoPremium" ], [ /^CFFECO/i, "eco" ], [ /^CFFBUS/i, "business" ], [ /^CFFFIRS?/i, "first" ] ];
    const storedSearch = () => {
      const j = JSON.parse(sessionStorage.getItem("airBoundsSearch"));
      return j.entities[j.selectedAirBoundsSearchId];
    };
    const state = {
      version: VERSION,
      rendered: 0,
      superseded: !1,
      counts: {
        shown: 0,
        total: 0
      }
    };
    const abort = new AbortController;
    state._abort = abort;
    try {
      Object.defineProperty(window, "__mmCards", {
        value: state,
        enumerable: !1,
        configurable: !0
      });
    } catch (e) {
      try {
        window.__mmCards = state;
      } catch (e2) {}
    }
    const cardsOn = () => !window.__mmSettings || !1 !== window.__mmSettings.get("results");
    const boundsData = () => window.__mmBounds || {};
    const seatmapOn = () => cardsOn() && (!window.__mmSettings || !1 !== window.__mmSettings.get("seatmap"));
    const esc = s => String(null == s ? "" : s).replace(/[&<>"]/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    }[c]));
    const num = n => null == n ? "" : nf().format(n);
    const curFmt = (n, code, digits) => {
      const c = code || "EUR";
      let mine = "EUR";
      try {
        mine = window.__mmCurrency?.target?.() || "EUR";
      } catch (e) {}
      try {
        return nf({
          style: "currency",
          currency: c,
          currencyDisplay: c === mine ? "narrowSymbol" : "code",
          minimumFractionDigits: digits,
          maximumFractionDigits: digits
        }).format(n);
      } catch (e) {
        return nf({
          minimumFractionDigits: digits,
          maximumFractionDigits: digits
        }).format(n) + " " + c;
      }
    };
    const MCT = {
      BER: 65,
      BKK: 80,
      BLQ: 60,
      BOS: 67,
      BRU: 50,
      CAI: 70,
      CGN: 50,
      DEN: 111,
      DUS: 45,
      EWR: 94,
      FCO: 60,
      FRA: 45,
      GRU: 120,
      GVA: 105,
      HAM: 60,
      IAD: 63,
      IAH: 110,
      JNB: 65,
      KIX: 80,
      LAS: 66,
      LAX: 110,
      LHR: 70,
      LIN: 60,
      MUC: 40,
      ORD: 85,
      PMI: 95,
      PRG: 35,
      SPU: 85,
      STR: 50,
      VIE: 25,
      WAW: 50,
      WDH: 115,
      YUL: 44,
      YYC: 95,
      ZAG: 40,
      ZRH: 40
    };
    const MCT_DEFAULT = 60;
    const RUN_SVG = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false">' + '<path fill="currentColor" d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9' + "l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1" + '-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z"/></svg>';
    const LOUNGE_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">' + '<path fill="currentColor" d="M5.35 5.64c-.9-.64-1.12-1.88-.49-2.79.63-.9 1.88-1.12 2.79-.49.9.64 1.12' + " 1.88.49 2.79-.64.9-1.89 1.12-2.79.49zM16 19H8.93c-1.48 0-2.74-1.08-2.96-2.54L4 7H2l1.99 9.76A5.01 5.01" + " 0 0 0 8.94 21H16v-2zm.23-4h-4.88l-1.03-4.1c1.58.89 3.28 1.54 5.15 1.22V19h2v-7c-2.5.4-4.9-.85-6.03-2.72" + 'l-.98-1.63c-.42-.71-1.31-1-2.06-.68-.85.36-1.28 1.33-.99 2.21L9.9 15c.3 1.13 1.32 1.94 2.5 1.94h3.83V15z"/></svg>';
    const cashLabel = (amount, currency) => {
      if (null == amount) return "";
      try {
        const c = window.__mmCurrency;
        const v = c?.convert ? c.convert(amount, currency || "EUR") : null;
        if (null != v) return curFmt(v, c.target(), 2);
      } catch (e) {}
      return curFmt(amount, currency || "EUR", 2);
    };
    const properCase = s => String(null == s ? "" : s).replace(/[A-ZÄÖÜ][A-ZÄÖÜ'’-]+/g, w => w.charAt(0) + w.slice(1).toLowerCase());
    const cityOf = (code, english) => {
      try {
        const ia = window.__mmIata;
        const de = ia && "function" == typeof ia.cityName ? ia.cityName(code) : null;
        if (de) return de;
      } catch (e) {}
      return properCase(english || code || "");
    };
    const fmtDur = sec => {
      if (!sec && 0 !== sec) return "";
      const h = Math.floor(sec / 3600), m = Math.round(sec % 3600 / 60);
      return h ? `${h}h ${String(m).padStart(2, "0")}min` : `${m}min`;
    };
    const isRail = leg => /TRAIN|RAIL/i.test(String(leg?.aircraftName || ""));
    const isBus = leg => /\bBUS\b/i.test(String(leg?.aircraftName || ""));
    const PLANE_PATH = "M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19" + "l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z";
    const TRAIN_PATH = "M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 " + "3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 " + "1.5S8.33 17 7.5 17zM11 10H6V6h5v4zm2 0V6h5v4h-5zm3.5 7c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 " + "1.5.67 1.5 1.5-.67 1.5-1.5 1.5z";
    const BUS_PATH = "M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 " + "1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 " + "0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67" + "-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM18 11H6V6h12v5z";
    const shortAircraft = name => {
      let s = (name || "").replace(/\s*\(.*?\)\s*/g, " ").replace(/\/.*$/, "").replace(/\s+/g, " ").trim();
      if (!s) return name || "";
      if (/TRAIN|RAIL/i.test(s)) return T("Zug");
      if (/\bBUS\b/i.test(s)) return "Bus";
      let m = /^CANADAIR\s+REGIONAL\s+JET\s+(\S+)/i.exec(s) || /^(?:BOMBARDIER\s+)?CRJ[\s-]*(\S+)/i.exec(s);
      if (m) return "CRJ-" + m[1];
      m = /^EMBRAER\s+(?:ERJ[\s-]*)?(\S+)/i.exec(s);
      if (m) return /^E/i.test(m[1]) ? m[1].toUpperCase() : "E" + m[1];
      m = /(?:DASH\s*8|DHC[\s-]*8|\bQ(?=\d{3}\b))[\s-]*(?:Q?(\d{3})\b)?/i.exec(s);
      if (m) return "Dash 8" + (m[1] ? "-" + m[1] : "");
      s = s.replace(/\s+(ALL\s+)?SERIES\b/i, "").replace(/\s+(PASSENGER|PAX|FREIGHTER)\b/i, "").trim();
      return s.replace(/^(AIRBUS(\s+INDUSTRIE)?|BOEING|BOMBARDIER|DE\s+HAVILLAND(\s+CANADA)?)\s+/i, "").trim() || s;
    };
    const EU = new Set([ "DE", "AT", "CH", "FR", "IT", "ES", "PT", "NL", "BE", "LU", "DK", "SE", "NO", "FI", "IE", "GB", "PL", "CZ", "SK", "HU", "SI", "HR", "RO", "BG", "GR", "EE", "LV", "LT", "IS", "MT", "CY" ]);
    const NA = new Set([ "US", "CA" ]);
    const LOGO_KEY = "mmrc_logo_base";
    let logoBase = null;
    try {
      logoBase = localStorage.getItem(LOGO_KEY);
    } catch (e) {}
    const LOGO_EMBED = {
      AV: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAAHKklEQVR42o1YS2wbVRs9d8bvvJpHGzu208QJNE2ThkKJItQiFQkEKhJih0SlgoBFxZINEqwQEhKwQSxYIwQsWHXFgk1XbEBVXyqPQuIkTVtIUYJTNXZsz2FxcjMz9jj/f6Wra4+/O/fc7zvfy4bAPRiTgusaNJseACCRAJ56Crh0CSAB1wWefNJBpQIsLhLVKhE1urqAY8cMGg0HN28S1aoXKZdOA4WCg0zGwY0bDTSbBGAArIJAnTqWdF2tn3xC/vyzPmcy5NSUZl8f92RbZzpNjo2Rk5NkV1e0jDFaBwfJxx8nu7v9Z5qrhsA2gCRcF/A8YHYWuHoV2NwEpqeBoSHd6pdfgEYj8sKIxYB8XvsrFeDffwFjdETUcBwgHgdqNQOAu9MAWAaBKgHScYTy4kWSJD2PfOMNslQiU6nwDVs1099Pjoxo7aTB/ae3u5YFyII5coSs18lGQ6C+/pqMxXywQdUbIzC5HHnsGJlMdgZtDDkxIfPvB8iYsrOnQgB4+WWpv9nU94UF/UbKBHbY1zz6KNDfDywuArVatJkSCWBqSqZPJPQs+K6gXD4fFxJv1xmeeUar5VOpBJw+jRBoQPafmBCn1teB7e12MMboctms5H7/Xby0F4oCdPiw58BxdLhc1n+ZBXnuXPtBR44AfX3A0pIARWmGBHI5rRsbmvuNBw+AK1ea4lAsRj79tM8dz9MkyY0NcmhIRkokyNFR32U7cSYWE8GHh8lDhzrLRZDaQTIJDAxIZdYsxmg2m8CBA8Arr/hmGxwE/vxTNwpqxu5JJLQnnwcePgT+/rtzCBgdlWwwImBkRAd7XjvZ7PcLF8SHahW4cUNxppUL9q5jY0ChAKysAFtb0WBcV/zM54FkMnSWg4cPBWh11d9oV8fRb9PTwNmzetZsRgN3HKBY1AHr69JgK2grl80K1NIS8NdfIdAOtrcNNjflAZVKZ9K9+65vligCT0zooNu3gbU13yla5bJZvWNrC7h3rw20g0qFMAa4fx9YXm6/letKKwsLwAsv6LPrhtNANgv09urGGxvRccYY8WVnR++3YFqzyt6hJPDjj7ucj07S+OCDcDyy4IeHpZX796PN5Lo+0QHJRoEGjNzeZvkzZ+TqzSbbhg0J5875rm2pHI/vn90LBfLkSWV5m3ai3H5k5K6fXK3glSuKQRaAHc2mnq+skD09/zu22PcND5OzsypNooBLzmM2S5ZKt51QmO/qAj780CduUPU2oheLwGefKXZFq93fn88Dhw/LlOUyUK9Hyx08qHTUaHigMdJQLkeeOqWs/emn0kqtFtaS1ZznkS++GC7qWm89OEieOEEWi/trs6+P7O/3ODpKum5ZgHI58vhx2dqq9auvfO4EOWVN+dNP4pHrhg+zn48eJcfHO5cjjiPTT02R+XygHioWq5yfV4EVFLalrB3BOqle1/rRR+0EDxK9ExiAHBgg5+fFMdcNADpxotam1iCo558nb94Mm65eJ6tVae7ZZzuD6gSmv19F3SOP2Go0ACiX2+l4k1hMNx0bIy9cIH/4QUCCY3NTFUAyKTMlEtrXWmnaM4aGpJlSKTLbGwJVAMlI9vf2AnNzqgjX1vTb5KSKttOngaNHgfFx4NYt4L335EkrK+2J1Abb3l5l+FoN+OOPYBDdK/LbAVkwAwNy20pFCbBej47ihYLm5CTw+usCdesWcO0acPmynyIcRyEgldLv4Q7GAir7gbHVxvPz8hLbkVgzJBIq7uNxyY2Pk/m8nr//ftic6+vkt9+Sc3M+0a0ZwzTxdn9fDUdqgDxwgJyZEeH+nxamtSk8f57c2mpPPefPM9RuhZXgsauLnJm5E2uLssmk1Lm4qO+5HPDaa35V6boyX0+PXnn3rt9uA6oSL18Gvv9e0X9kRGafmtL+YLS29OjuVgfjec1oDlmy2Uw9Pa16Z2BAjcBzz/kNQdQggc8/Bz7+WOWK5VFUZ5LJAIUCEY8b/Prrbue6fwEengcPynVzOfKtt8jr1/20Uq0qRtnIfv26797JZHREz2bJxx7zduNRGcxkqpyd7dxV2o09PeTCgvgVzNrpNPnOO+Q///ippdHwo/mdO+RLL4U7kiAw1yXj8b3OFXziiRrn5vz+PWp2dyvnzMz4ydR6npUpFMhvvgmXK8Hk/MUXfjtl9/vAApG6VKrt9eWdtNPbq+QbJWcjeiIh4K++Sl66FPawnR2t5TL55pv6yyaoIWMCgFKp7V2E+0/H6fybMR5PnvQ4M+M/O3vW48WLHh888EiG5/Kyx7ff9tjXZ+Wbu+uSoaJk9H84nWrr4EillA4cRxG9UtE+603FInDqFHDmjNLQoUP6g6K7G/jtN+C774Avv1SEB+4aAtcAJEKuaIyD6ekY1taAjY2djp1nPO7g+PEUYrEdXL3aRLXKPdlgDgMMMpkYMhkinW5ie5tIpwUsmQTKZWJ93QGw9h+C3sO4fktDHgAAAABJRU5ErkJggg==",
      CX: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAAE4UlEQVR42s2XXWid9R3HP9/f/zk5SVtUGrEtZG/1Zaww03TV2pvR7m5uoCIBB4XQNDmyeCUF8UI4BDYEL3QMRE3iWKRj6BlzrBMKboOjF4rzDcWI7Xylk24Q+0bMyznP7+fFOWY5Sdq0Xdrsufv/z/9/nu/zfXv+Dyy8hoY2MDS0gTW8rGU0O/sNpqa6miOtPSAopGK2rclSrAWoVkDr06lwXcXMTOf/h2SnZ88QoZTSNkqlQpOlNQRULAZmCriJublvrz1Ded6OIsO9I7Wl7Rw4sPFKG7wVUEpnEWdDsSGCrpRxM3197VfS4K2ARkam3XUKsZ5QR3hsJc+3rGXsg5RO4Eqh2Iysk3VtNzbZibUABO4nMPsSdF2ENltwc2FgoHttJAM4efI/kn9KsFHh3wv0zdzih+zff22Dw9CVA1QuG5VKbmETwBmka4BN4Wy1lPZy332dSJdVutQyqlYDwHftOiP32yS6ha7CNAV0WV6zuP6Go0xM5JdLwrTMnHj99Wnr6fkO0o+J2CTURkQbWFu2rnDa33j7s8vVT9mSmQiQcOkF87gLsZeIbYKOMIp5blkaHNyYT0//jUOHplY7gUtNLQXlsjE29gnG3zETIKStQruRdkXEfjqK+zh4cD3QWL9KbKVlZ/fsEdVqxM7vf65It5NSJ+4BJBHXAl2CW5mb2UjPjk947LHJZvrsax+uLqBqtfHUj/76C/1gew66fd4zUkJqR7pa6DZJP4od3ce5486jVKtBb29iYmKVAf03cYqdt7yn8G6ywndxzxfIHEAipU2CO21Hz+bo2X2MQ+OT8+DLZaNavShA59e9XDaGh5177+228L8gdZHnjmQLQhCYiZSgXv8INOZmz/DUU/+aX9Pb23jw555zJM4XgpWN2NubqFRy6++/h2S/RSriHkhqeQdGBFkyEOT5P138HvPnmTz7HpXKXMs9y+XG3okJUan4QoAXloxAiLDBA/dj6RHcM8CXpDTCkYSZMIN6/QuCl1z+IspeI6UPeeKJk5cu2ZKKiLDBgQdBv0AyIvJz+DCaUhpZBnkO7pPAceAziX+7M4WRIvQMo6P/OHcxno8nFD7KwzbY/yVhD5NSB3m+HCghCfegVmswadaJ1Al0B6BiAWZmPg3p0IWl7NyMKt5869XY2fO+glvIsk7cz7FajW6KCMBxBzNRq9dUrz3raIDR0XfO39QrstRs5pGn/+i5/5R6/vyi32lJIOSYGSklJJH7i066Oz/2YR9jY0cX2+bS676ZPgArHdhH6FdInU0QAI6UyDKo1aZBL8n96bxeP8z4+ExLrfzPgBb+0cDATVLcL7QPWNf0C82UTYo4Av67XIW/MjJSW7A/lusjXbSHymUxPOyUe9vsxNV95PEghWwr0fwwcQf3Yy4qpMIfePLJt+dvvAwjlw6olZXtgock7qZQaICo108jXiVU8VrtBcbHTyyS1y/kmLIyoAjN132ptA5qP7dID9Defh2zs0C8G3kciVyH+fjYK1Sr9UVsxsWcl3TBrPT37zXTLykUdlOvn4qII2HpTxTqL/P4bz5ftCcu9dC2MkMDA12KOCjTz4DjyJ51OMzIyAct3ljmvbRagBpzfX3FVMz2eHAHEXNh2Z/ZsuVlhofnWtgAVjLq6lyl0vWUSj9hqP9bS2S8jB+NXwFJqCJ5lxS9VgAAAABJRU5ErkJggg==",
      LA: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAAK4klEQVR42pWYe3Bc9XXHP+e+9qW3tJZk2fJLfuASB3BKzdMlExqXZMZgUKaZTuPSSchMh0CKxyWUgKyZhAkdPJMw7bR02kBDQ4hFYhIPEBxDUAM10NpjiGwixUa2hWyv3tLuanfv6/QP3zVrWXLa38ydnbn37u987/ec3/c8hGipqoiIMs9S1VqgozQ8ms1f/ZX/iBvWQKg8XTUy1iv0+gC6p8/h2sY2musgHh8TkSwLLFV1gGYRGZr7TLjMUlUB0kA7cAphbDx9x4eNZmz5VOgiwvtmyIu+G7xYN/Wzj4BZwEAkz+bNBr29gYDy/1jGQg+6uroM9u1L4HnLKTIGjMMuQZB86Hk+oeeosaHKch41GlKHc1ffsz9/ywM7pus+nxYIpbfXF1Dt7DQVDFW1/i+AFmbIMlHPXw5YPPnK0KH7Hwk3csifSN++u8FM/E1JPXLqQ3WyZLQ12YlzU4Y9mScrQdFEXg+UF6yq2MvVg89nMEF9Xc3IiHLvvYPs2RPODY/IG/YlgLroMrrpDscSn2tLbLmm062Zeab+3783deGP3GOPN4//hV0qfVGWLrqxelFTvDg8Qn5iMkDFFyFWLRaGCHnfnQgd+9X4lmt/Ze76y/5vL02/2S0SLhAeBvAHlwBSMATCkaatNzUa9n9m8U8L8pKE+uPqMftNoSeINoj5//bSZ/ze39xUev3wZ0zX35g0bWbVp6SBp6C2mE51cxNBIkZ+emYodnZsX6Km9COGDrwVuUcrD5SqLpJLUD7zhiN331LMpLfdkDC0N1TMasOiqCG+ap+4/gvxP920337uoSxwUkRyCkY2ve060DtU2BozrA6z5JNvriVM2EHcLUhibNoIJMEz+Tp9NLvqirM82K+owMWukzk+bHfz+UYnlToy1XJ7u6gxaIlQCIMSImZSTCth2uRXpDGr4u8GfSef801+Xn+6Z7C8z6vNO1Kfco/fWLMy/UWrOLs5K86S94Z9/WWxkdfcpmAoSMaqYNMxdrzb1fUra9euP3ZEZPYiQBGYVmAJcBrIiIiOL7r9noQY3RZmCwJZt4h0LC6RjNuJExnDLnrkJJwJMH4ZhEZP2pk4IGdeG5dqhx0/mLiq8NhzOz48NLRtIKyOFTGMBKHGQX2CP+qXhw5Nni2srG2ONwDvi4gLIKpqAnXRlRORTBRLIqBnWraka0huCUPt1CD8dHVNdcpFyU5nCS0jSIqYVYYASn/BPPmUtXb/zB9+csPwsfFPnRwqWm7okZIAEyVQmxAT13HXD5QezMzOeh3JpH2BgDKgBNACFIBRIBQRVZA32GzeEikxwFDTttVx1a0x0TtiVrhBNEyOhY530K3zXio0Sb/ZlGpY1koY+pwbnqCYL4WKYeQx1cPwY0gmabt7+9wHu4GafJ5CVZWcuyiGVLX5PCFMiYirdJpCTzCZ3nqVLeYPPS/YW/zcjftaf/i376Afx993Uvd/fTywv/mmW586Fdp23LbMK6+sD/ACv//YuMyGWIpp1OCF1zlZro1N9zth4Wt3u99/TV1tJ49HihERCeYCWgcMSKQPZUDTi++8PuHJW3ZrPSytJTiZ+fWPPrSf7y6ta4yH0pmDdQFixwlIxjRY1FIttQ3VxvGjM5ieywp7ipucseDm2IS52polFbhQX+sONLe/8vZXtt/3pS85GZE1pUuUWlVtEfE+1qHzgDLxP7m+aUXLW2eb07nesZjzxnHT+Y1bRza0AB9wQxFVX02zuqqalevqGDyeOTE2Vdz7eN2Jxi3O+J1VZlADATOewWB1Ojxot+pB2szD4/4VfeP3/Ra6DOi+SCitSjAAu1ivqiqvfflfc71vjmfe/7Ch+chQkUCLmsRzTVxAYqYkDBCE4kgul3vl7BnjJ+9OffQ67M53ToGuXXv/wdFNjx51k/ftL9ab3pLVklfTOH0s43leIUC4kHYrhLFFLpPpW3b+48mW/X/38qZgZuYuMG4W4jZAQLGgcMAj6EmQ3N/H1zNlEenQb6cd7FuLGFsLGNc5trStWFkjCfV15MxMOJsLLbWNT/zW29kHXYbqLo3ANAJJmQeIDSwHJoHpMoNreGKdSbDNMMSdCUt7T+s3z9U02PnspM8mdiey6M1K2AncZuC0ynngrFpfH8RiljH4u5zM5gRhdswlWH+ch8egS6A7jHRwEZCQOZSlgKZIMEdFJL+ZLqsXQugOyzTXNcWYHC1e/djXXl/x7D8c2mgI20StdYJJSImQwEWQ1rY6uzFdz9DgKJNT+SOOYf20GBaeO84jJ4jSRkTAKmACmJmby1YBzUCfiMxUVpGdnXvMnp6j+tD2jWtGz5S2j57L3jZwdPQTRhgXxSPE8wUCMGKmxPHVZ82VDR95rr+3f2DyxyfY+V8S5a0KAhLAYsAFJkUkJxFdJrAMSEYJMzu3WOvu7g6ffep/Wr//rXeO2GZqUebsJMVSMTQED8UxiItgEFCaNJBf+ITPV9Vr76HJb0yX97mI7fPAlgFtwAciMqmqUnbZkgjpcRGZmKe+FlWVf374YOuLe947OjI8G88XSqYjMQu1CSi6gvSC9oyS3zdK9wX17WSP2UMP0BOeN3URAVXA7yqTq6WqrVHcDC0Appx8l3zylubaf9qdDcNSMmZJSKjBYQhfAOvnx3jgqJOEUl6bX3nyz2NP33/E76Ez7OFjJa6seyKbAyIye5FNVW2NqCsbvqSSKxaL61S19cmHe1es4bF31svu767lieuh06x8b8+/vHfX4zsPfPl8oKrM81Go6iJVvUZVF89nU35f0a2qaaADOCXyhcxmbrN7ubtYfr6Wxxc3tSRvbUqntrsF2XxmeOzt9wo7b5irwhXs1AK1InJ6Pm9YlwFiRAHXDBwVkRmAXnqClXynNonxaRfudGz5bMJONWWnfHLTXjhb8IqVKnzhy8vlhcg0MF1577KAKlBXRYAGgSyq0iFPOjazj4F5V4jZnrAsrJiPp7Ol4qwnuRnbscQwzoM5VlmNWiLi/x5PGEDrJX1ZhUB2ABlgRAQQUY+JhCL3GmK2q1lyU3Wht3RFA/kJIzY94TqGuP+NyrcA6ezsrOxSr4gCeaE4FSAFLF7IZUVgLDp5Wg5Qm4ZQpDDqqte2almL48RNzg1P9edniy8alv60z3/g3ciE9PRIoKpxYCXgRF0tC7TrDrAaGJsXUFQ0nZ57P0VoFDSsa6ivmlzSUXVg+ZqGHq8x/rPu7i+4+B/3dbsUBbWjNrwYfVhuofmBiJRU9QyQqTyOduTHy6zt8T+74dm/Onxw+FZVTVYq8PlThVTst1hVl0ZZfF5XXS6gLFVdG12ykJ9VNaaqS1S1asuW78U2OE+smas3FVrTGJXHC9m0VTV2ybAhGgK0AbXAyHx+Frlgc9XTf//2hqtSu//65C/cdzzXf3UjX7UqABuqWgfUA3a5g5mPgCi21kb/kcpj3xT9Hi8nuPkUVkT01Kmps9995Ncv+258mUVIQHByjFZTBC86nfXAOuAEMLJAGrKivFkd2QznjmMEyAFT820gIlpmaNmyupmSG/hKyQ3xUUg0bVwcqIKq1kTNZibqYLRyr4hBG2gEbGBQRKYWmg+Nish8I5KyC8rBKwIxk5gDkhXhqUOHvuqdOjVVD6wBSiJyQkRKC4htLNKbGWBivlg1ROSszDMiiV5uA1YPD2sCYJgGU+CDAK8bStd8wDe6BgYGYu3ttbVACRicz0jkznQEaBqYmMtgef0v3NH/K4n0NDoAAAAASUVORK5CYII=",
      ZH: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAAMW0lEQVR42oVYe3Ad1X3+fufs7r1370O6elq2hNHDkjGysOUHaUItDAQSTKZ1QIaZ2OC2zHTStJ2mJVNaIGZCkukkE9q8mEybAIEkBSmFlNK6DTa2EyB1jN9CSJZ0jfyQJUtXurrvu7vn/PqH7oVrV3LOXzu7O3u+/T2+3/cdAgBm9gNgIiqgbDEzEREzswWgFdnsPGx77iht9OoaTeO6C/+bK38fBLDmqDsZXzW6/o6ASqZuAdMtivSNAOp8EKoAPHs4O/rXu0ZGlhnhcKNpWROIRs8TkS5+4tqLmSWAJgB1AM4S0fSJ+q4gpzL7fcBxFzjGBS+OSjsY6GhfY1RHP14YHm1xzk8sDwoprOIWDhgFZnisue5vdt/Y8NQTCQAFIprtQ6/cgX71OwExcwBACwAJYJiICn2A3AGoY4GWF1dL/86LygEsE0ZVJWTQhpNKQ01ehmkYSLH2mPk9JhokRoUp6Dan4KT83Z1HTKKAc2Lo3aRJz38sPTrIgCBA0xJAqAjiegARAENElGVmAhGeBOjTVW0hO8/PCaW2+yoryaqpgk6lkZ+ZhQucl8C/a81vGWT8+obc8MRRs7nLNMWJGkjSUsDTGgYzUuBcnvHQ+txofx96JS0Gplg3zQCiAEaJKFm6DwAMEAEMABce+uIDhcGhW71EynMvXb5ArnfEb+Pd1rnY/IlA271+Qr/DOkVCSCi91xPyP9lzpsgwmgTRZwOgu3Japz3b6NgQH56gRSKDIqDgwiWly8FcUVv5/Er4/QkAaSJyyp+fQZvPhEuzUt8Z3djVHPrs3ZMzT/9zWiVTn2CimxlYycy1TBSqElLE06nPreeJPuOKJinblIgyi90vW3Xw+5chHnf6a2rmD/T0GDgEhJGmGFp0O/oLAHDxj740p53C9rmfvXqHmc41RoQBCYICIw2NHDijlDJ8Ldd3AvgllaVIAlgG4FKpBZeoLxPASgDhYjpTpTQeBORWwAOAgdquT1kV4UdMv+92kXfgXZyEJiAHjjP418T0pmI+Zgb85925uGj47tca6v/8T2aprJvaAPgADBBRfolCR5EClgE4Q0SJIhghAM0AjtmrbrKc/FfNaPQeq7YayOXhzMThuuoIG/S8T+G19tzohf/3p1KC9+0zqFgrtQACAM4TUfoahd5YBDNORNPFrhMEqD5ArrbbHhee93ehphU+zQzHc6ESyVdVMvXNLkz8pvybA1hjTWNQbwVUsUkWiLG4iQCQuLqbFin0EAAfEcWZmQ7SrXIrDnnHwi2rfEo8GwTdkmmoZcMwXGkHDuXee/87HtGAtIwGuGjSkoUgcQnp5NBanpoG0Iy9ey/Q3Xd/OCGImVsATBNRarFuWmodAIytgHfEbrk7xPSCoXV1ribqhFe3mc7kzJnMyNhByzA3anCXBTKJCGCG0hqoqkyEN687bG2745/q/+zB/+5zt3/E1MxsEZGzFBhmrgUwU/aMDqBHbsUh76jd/McByB8ygXh5vWfUVpN7/iJ7s/NGNQtIInhgMAAGQwMoVITA0QqENJA9N5FIu4XPbXLG/+uaTF3WTSVyPE1E2YXI9Bhbccg7Gmj504iQP8i6jksNdRS+/jrDGJ+AnppGmhguMA7mYSaKgTDNWYdkXfR6X031ncGCWxefmVFGwZEkqKCgN6/NnD3dvwBqUTBWsXgrAEwQUbwczJFA831hYfS5nksVDctgrGjA/PT0JSc2vh+Wuc+CNeB5KislV3iSGrxsripy83rpr6+ZKKxpvZx//tVujse/ow0JG8JMaf3m+tzY7bwYIGb2AagBYAJIEtEsAJSG6pFA8+aoMA9bAOZc55Kvof41/5abX0+//IuY9JtNyqVbNPEWZnT5hKj0aYasqYKwAyDTRDZ29sK86/6BYflXhcEvzbPWBghOdr59A1+O0SKRMYpSI0lEs8xMTxLRkwCfDDevMpT8reWp4xkpn5FSnBaO065B95EUd/mFqLNAH0oNx3OVFYnIqq41KExextwH444NYeXBs56QHVKpdyyiVYbW8Jqbdq0ZPPiOUcYxZhFIGMAHRJQrtXvfAi2AXNQrt/Agb+uZkm+88xmh8a2gaTUxgCwvkPscK8ULzYJQfZ1Ec+N4ynV+nJ+cao+weACCUA9ZNem5HSzwngVaReEQm50dVQDmjbLuWQ0gA+AiEeXKuo52AAoAToO03d11H+ZzO+1IhJLzScwL9gTAEiTTWj3NQmz1ud4GUVPFxg1t55p/8aMesu1xADhht0k/89wMvFcKjTWnA+NTmwohH9vVUYKnEwBSgpkNZl5Z1D9ZIkp+SIQAMfbQGcB3OtT2XHhFw1t+KXeJi1M0k0xqV5BmgEIkTYf5Xtc0+kKeWss1Uc9e2UhW97ovHLGbw8N22/eG7LYhMHsJxlM5U4wEPpj8caA6ukLats4rNWtv7PwfInKImdcWwQxdPcMYvZLQr45FOl5YUVOza9YyXJHPm9lLk/9BwtgCQriChJhj9dPubGzngN02xUrVhaOVyHe2fXf1/p//5YlA8xNtwveVmHZggVAgQGgNKxKBVxH0au2wcSEW+0J38swzB3p6DGLm7nJF+JEIWwBzvGLV9gphvZJbVlMIZAu+RHymV7NujEB+y2HNzEjMbG5cFvnN+L9ETXN3jpk91oOZXGyTBXh+rCEvkH8xKowdOTCU54F8PkTWd8KbTSAxMfH1dfHBx/p6e+WO/n4lAIyVSK8EZg8gsGcNDzR+rMpfU/t9b+UKFY7P++Zn4l/xPD4cgnw6y5pDJKVD2Bk4NLSlJhLZndSeSwR2IR7+OJBLoYc7Meisy8XuT7J+WGn1ho5WfGCt7Rj1tP7XTMjuWRcffGwP9ogd/QujY4k51WMAwNBt9//k3I238XDTJn3K33IKAE7arScH7TY9FlzFx+yWl/oAObRy89Tolu3eeEM3HzGbvlH+jfIBzczEjrOZmVtLFNjX2yuvEIlXz7ASAQ7ds+v+YCL9UmpmxhPjE0ZaO21CWjuqSX49ycoTjOTl3Fh97Zotz1ZVVO7KpNOcjZ0bms243dMYd3sX5hKXjAFOnap0mpubrFDIBTDcTzsIvcDVkVlU5GcOH++afPRr+/Lvj1aFEikRl3hCKfmziOTRPNirhDATkj8TuHmDFbp4+d8SjuOKS1NG3nF+f7137u3ST12lpcIoFJowOjqKzk63ZBKueidwRVhH9u61ABhT33jmH3j4bI1Ipnleivc2ZEe/ejLQekITIcTCnNPq53U7d72ZefvQxHwhr+zpOXNO63/s9s69XZIlJWdSin5R6g4uViJFMAJAh2BAcE+P0U8k2u/vLYz/xeOP4cjJT2VmZx1DCCpI796jdsvfRoW8yWNWOeUlml750RdT7596Sc4mKzieEEnXGdHR6ON9gLy1GJliuqzfYUSpzMq3AXCuSNmpivY/9Pntl/OJhK42ff5J7X5ZKvViwDDHCmAVctnUn/zEI6I6OmW8ffTFxKVJ12KYaYGtmzJjB/sAuYNIgRnMHClucpaI5q6ht3wAbsCCORgxjhlNn7elsSUvRBiu2uYWkqg1fZhW3i835mJPnbRbTzKD/JrNbEPVm52vv3BwZN2d+zOXJlUYZCZIf29TJnawJE2KYKJFZ1IAkF3KSjGzDWBFycoRkSPs7q7bzUj4gSrQNosESIiZOa2+f1Nu7K6Tduu3QxBdLmuF61bkOk/tf2ygY8ujGI5VSIDS4FhDNvToQqpu1cwsmLmyqKNmi5sUrpE1ASBYAsPMRMy8+sK3n1Ozj3y5wfL5Gz3m5QWFo4bAg36i3QWwikaj0virhz+ffuNXSfHWb3+ahnYDJM0MvE92Z87uK7F6sTCvA+ACiC9mpxY7XSGij1qfz56tLF0ft1t2TwU7+HKwg6dDq3nU38rv1651xr/01N9ffuNX7QO+5qlTdqsbC7bzMbv1BwBwoGeBAJm5kplbmbmqmIpyL1cOQFwLoEHNzQkGxEFAKGG8PqPdbUzi90ijUjPi2nFfCxrCmbznoZellLV+IkqxN2YF/Y/wtl5J/f1eOp1uAGBhocOSRORdMRc/4hkfgHZmvlgSf1fX1pIi/zCWVweDgf1aI6BYtwalIQHAY30hTfzpzZnYQFlhrgGQKw5ptcThRKhoGgwAI4sZ0lJRlckN0LvYYGZHRpr8a9uWE2OMCDUkBBW0jivml+PK7dmciQ309fbKokXqADBVPNBaCkywaBpSxffSSwXi/wCuQMUjRLoBhwAAAABJRU5ErkJggg=="
    };
    const LOGO_ALIAS = {
      VL: "LH",
      JJ: "LA",
      "4C": "LA",
      LP: "LA",
      XL: "LA",
      PZ: "LA",
      OA: "A3",
      LR: "AV",
      "2K": "AV"
    };
    const iconCode = code => LOGO_ALIAS[code] || code;
    const logoUrl = code => logoBase && /^[A-Z0-9]{2}$/.test(code || "") ? logoBase + "icon-" + code + ".svg" : null;
    function logoHtml(leg) {
      const mark = function(leg) {
        const code = leg.operating || "";
        const own = iconCode(code);
        const src = LOGO_EMBED[own] || (emptyIcons.has(own) ? null : logoUrl(own));
        const mkt = leg.mkt && leg.mkt !== code ? iconCode(leg.mkt) : null;
        const alt = mkt ? LOGO_EMBED[mkt] || (emptyIcons.has(mkt) ? null : logoUrl(mkt)) : null;
        return {
          code: code,
          icon: own,
          src: src || alt,
          alt: src ? alt : null,
          embedded: !!LOGO_EMBED[own]
        };
      }(leg);
      if (!mark.src) return `<span class="mmrc-logofallback">${esc(mark.code)}</span>`;
      mark.embedded || function(code, url) {
        if (code && !iconChecked.has(code) && !emptyIcons.has(code)) {
          iconChecked.add(code);
          fetch(url).then(r => r.ok ? r.text() : null).then(t => {
            t && !/<(path|polygon|polyline|circle|ellipse|text|image|use)\b/i.test(t) && function(code) {
              emptyIcons.add(code);
              try {
                localStorage.setItem(EMPTY_KEY, JSON.stringify({
                  base: logoBase,
                  codes: [ ...emptyIcons ]
                }));
              } catch (e) {}
              document.querySelectorAll('img.mmrc-logo[data-icon="' + code + '"]').forEach(swapLogo);
            }(code);
          }).catch(() => {});
        }
      }(mark.icon, mark.src);
      return `<img class="mmrc-logo" src="${esc(mark.src)}" alt="" aria-hidden="true" ` + `data-code="${esc(mark.code)}" data-icon="${esc(mark.icon)}"` + (mark.alt ? ` data-alt="${esc(mark.alt)}"` : "") + `>`;
    }
    const EMPTY_KEY = "mmrc_logo_empty";
    let emptyIcons = new Set;
    try {
      const c = JSON.parse(localStorage.getItem(EMPTY_KEY) || "null");
      c && c.base === logoBase && (emptyIcons = new Set(c.codes || []));
    } catch (e) {}
    const iconChecked = new Set;
    function swapLogo(img) {
      if (img.dataset.alt) {
        img.src = img.dataset.alt;
        img.removeAttribute("data-alt");
      } else img.replaceWith(function(code) {
        const s = document.createElement("span");
        s.className = "mmrc-logofallback";
        s.textContent = code;
        return s;
      }(img.dataset.code));
    }
    const CSS = `
html.mmrc-active .upsell-premium-pres-container > mat-accordion { display: none !important; }

html.mmrc-active .footer-buttons .continue-button-container { display: none !important; }

html.mmrc-active refx-messages-panel-cont.mmrc-dup-msg,
html.mmrc-active .messages-list .message.mmrc-dup-msg { display: none !important; }

.mmrc-list { list-style: none; margin: 0; padding: 0; display: flex;
             flex-direction: column; gap: 12px;
             container-type: inline-size; container-name: mmliste; }
.mmrc-card { display: grid; grid-template-columns: minmax(320px, 1fr) minmax(0, auto);
             gap: 8px 14px; padding: 12px 14px; background: #fff;
             border: 1px solid #cfcdc3; border-radius: 12px;
             box-shadow: 0 1px 4px rgba(5,22,77,.07);
             font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
.mmrc-left { min-width: 0; display: flex; flex-direction: column; }
.mmrc-meta { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;
             padding: 0 0 2px; }
.mmrc-dur { font-size: 15px; font-weight: 700; color: ${INK_primary};
            font-variant-numeric: tabular-nums; }
.mmrc-stops { font-size: 11.5px; color: ${INK_secondary}; }

.mmrc-seatbtn { font: inherit; display: inline-flex; align-items: center; gap: 4px;
                white-space: nowrap; font-size: 10.5px; font-weight: 600; line-height: 1.45;
                padding: 1px 8px 1px 6px; border: 1px solid transparent; border-radius: 999px;
                background: #eef2f9; color: #3a465f; cursor: pointer;
                max-width: 16ch; overflow: hidden; text-overflow: ellipsis;
                transition: background .12s, color .12s; }
.mmrc-seatbtn svg { width: 11px; height: 11px; fill: currentColor; flex: 0 0 11px; }
.mmrc-seatbtn:hover, .mmrc-seatbtn.is-on { background: ${INK_accent}; color: #fff; }
.mmrc-seatbtn.is-wide { background: ${INK_primary}; color: #fff; }
.mmrc-seatbtn.is-wide:hover { background: ${INK_accent}; }

@container mmliste (max-width: 940px) {
    .mmrc-card { grid-template-columns: minmax(0, 1fr); }
    .mmrc-cols { grid-template-columns:
        repeat(var(--mm-n, 4), minmax(0, 1fr)) !important; }
    .mmrc-ti { white-space: nowrap; letter-spacing: .02em; }
}

.mmrc-cabpick { display: none; }
@container mmliste (max-width: 620px) {
    .mmrc-cols { grid-template-columns: minmax(0, 1fr) !important; }
    .mmrc-col:not(.is-current) { display: none; }
    .mmrc-cabpick { display: flex; flex-wrap: wrap; gap: 5px;
                    grid-column: 1 / -1; padding-top: 7px; }
    .mmrc-cab { font: inherit; display: flex; flex-direction: column; align-items: center;
                flex: 1 1 auto; min-width: 76px; cursor: pointer; background: #fff;
                border: 1px solid color-mix(in srgb, var(--mmc) 45%, #fff);
                border-top: 2px solid var(--mmc); border-radius: 5px; padding: 3px 7px 4px; }
    .mmrc-cab:hover { background: color-mix(in srgb, var(--mmc) 7%, #fff); }
    .mmrc-cab i { font-style: normal; font-size: 9.5px; font-weight: 700;
                  color: var(--mmc); letter-spacing: .01em; }
    .mmrc-cab b { font-size: 13px; font-variant-numeric: tabular-nums; }
    .mmrc-cab.is-empty { border-top-color: #d8d5cd; }
    .mmrc-cab.is-empty i { color: #98968f; font-weight: 400; }
    .mmrc-cab.is-empty b { color: #b6b4ad; font-weight: 400; }
    .mmrc-col.is-fallback .mmrc-nm::after { content: attr(data-instead); display: block;
                                            width: 100%; font-size: 9px; font-weight: 400;
                                            opacity: .8; }
}
@container mmliste (max-width: 470px) {
    .mmrc-card { grid-template-columns: minmax(0, 1fr); }
}

.mmrc-msg { padding: 18px 16px; text-align: center; font-size: 13.5px; white-space: pre-line;
            color: ${INK_secondary}; background: #fff;
            border: 1px solid ${INK_hairline}; border-radius: 10px; }
.mmrc-msg button { font: inherit; font-size: 12.5px; font-weight: 600; margin-left: 10px;
                   border: 1px solid ${INK_hairline}; background: #fff; color: ${INK_primary};
                   border-radius: 999px; padding: 5px 13px; cursor: pointer; }
.mmrc-msg button:hover { border-color: #b9c6e0; background: #f3f6fc; }

.mmrc-office { padding: 10px 16px; font-size: 12.5px; color: ${INK_muted}; }
.mmrc-office a { color: ${INK_accent}; text-decoration: underline; }
.mmrc-outbound-edit { font: inherit; font-size: 11.5px; font-weight: 600; margin-left: 6px;
  padding: 2px 10px; border: 1px solid #ccd6e8; border-radius: 999px;
  background: #fff; color: ${INK_accent}; cursor: pointer; }
.mmrc-outbound-edit:hover { border-color: #b9c6e0; background: #f3f6fc; }
.cdk-overlay-pane.mat-mdc-dialog-panel:has(refx-confirm-restart-flight-selection-dialog-pres) {
  height: auto !important; }
.mat-mdc-dialog-panel:has(refx-confirm-restart-flight-selection-dialog-pres) .mat-mdc-dialog-container,
.mat-mdc-dialog-panel:has(refx-confirm-restart-flight-selection-dialog-pres) .mat-mdc-dialog-inner-container,
.mat-mdc-dialog-panel:has(refx-confirm-restart-flight-selection-dialog-pres) .mat-mdc-dialog-surface {
  height: auto !important; min-height: 0 !important; }
refx-confirm-restart-flight-selection-dialog-pres refx-dialog-pres,
refx-confirm-restart-flight-selection-dialog-pres .refx-dialog-container {
  height: auto !important; }
refx-confirm-restart-flight-selection-dialog-pres .refx-dialog-content {
  height: auto !important; min-height: 0 !important; width: auto !important;
  flex: 0 0 auto !important; }
refx-confirm-restart-flight-selection-dialog-pres .refx-dialog-actions {
  display: flex; gap: 12px; flex-wrap: wrap; justify-content: flex-end;
  padding-top: 18px; }
refx-confirm-restart-flight-selection-dialog-pres .refx-dialog-actions button {
  width: auto !important; min-width: 0 !important; max-width: none !important;
  white-space: nowrap; }

.mmrc-bar-text { margin: 0 0 10px; font-size: 13.5px; font-weight: 600; color: ${INK_secondary}; }
.mmrc-skel { display: flex; flex-direction: column; gap: 12px; }
.mmrc-skel-card { display: grid; grid-template-columns: minmax(0, 1fr) 168px 168px;
                  gap: 16px; align-items: stretch; padding: 20px 22px;
                  background: #fff; border: 1px solid ${INK_hairline}; border-radius: 10px; }
.mmrc-skel-tl { display: flex; flex-direction: column; gap: 14px; justify-content: center; }
.mmrc-skel-tl i, .mmrc-skel-col {
    border-radius: 6px;
    background: linear-gradient(90deg, #dde3ee 25%, #f1f4fa 45%, #dde3ee 65%);
    background-size: 200% 100%;
    animation: mmrc-shimmer 1.3s linear infinite; }
.mmrc-skel-tl i { height: 14px; }
.mmrc-skel-tl i:nth-child(1) { width: 62%; }
.mmrc-skel-tl i:nth-child(2) { width: 40%; }
.mmrc-skel-tl i:nth-child(3) { width: 55%; }
.mmrc-skel-col { min-height: 120px; }
@keyframes mmrc-shimmer { from { background-position: 200% 0; }
                            to { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) {
    .mmrc-skel-tl i, .mmrc-skel-col { animation-duration: 3.5s; } }
@media (max-width: 900px) {
    .mmrc-skel-card { grid-template-columns: minmax(0, 1fr) 130px; }
    .mmrc-skel-col:last-child { display: none; } }

.mmrc-tl { display: block; width: 100%; container-type: inline-size; }
.mmrc-row { display: grid; grid-template-columns: 44px minmax(54px, 108px) 44px minmax(150px, 1fr);
            align-items: center; column-gap: 9px; }
.mmrc-row.is-leg { padding: 7px 0;
                   grid-template-columns: auto minmax(56px, 1fr) auto;
                   column-gap: 12px; row-gap: 1px; }
.mmrc-row > .mmrc-t:nth-of-type(2) { justify-content: flex-end; }
.mmrc-t { display: flex; align-items: baseline; gap: 6px;
          font-size: 15px; font-weight: 700; color: ${INK_primary};
          font-variant-numeric: tabular-nums; letter-spacing: .01em; line-height: 1.15; }
.mmrc-t::after { content: attr(data-iata); font-size: 15px; font-weight: 700;
                 color: ${INK_secondary}; letter-spacing: .02em; }
.mmrc-list [data-place] { position: relative; }
.mmrc-list [data-place]::before { content: attr(data-place); position: absolute;
    left: 0; bottom: calc(100% + 4px); z-index: 40;
    background: #fff; border: 1px solid ${INK_hairline}; color: ${INK_secondary};
    font-size: 11px; font-weight: 500; letter-spacing: 0; line-height: 1.3;
    padding: 3px 7px; border-radius: 5px; white-space: nowrap;
    pointer-events: none; opacity: 0; visibility: hidden;
    transition: opacity .12s; box-shadow: 0 3px 10px rgba(5,22,77,.10); }
.mmrc-list [data-place]:hover::before { opacity: 1; visibility: visible; transition-delay: .15s; }
.mmrc-row > .mmrc-t[data-place]:nth-of-type(2)::before { left: auto; right: 0; }
.mmrc-seg [data-place]::before { bottom: auto; top: calc(100% + 4px); }
.mmrc-arrow { position: relative; align-self: center; height: 18px; }
.mmrc-arrow::before { content: ''; position: absolute; left: 0; right: 6px; top: 12px;
                      height: 1px; background: #cbd2df; }
.mmrc-arrow::after { content: ''; position: absolute; right: 0; top: 8px;
                     border: 4px solid transparent; border-left-color: #cbd2df; border-right: 0; }
.mmrc-arrow span { position: absolute; left: 0; right: 0; top: -1px; width: max-content;
                   margin: 0 auto; text-align: center; padding: 0 3px; background: #fff;
                   font-size: 10.5px; color: ${INK_secondary}; font-variant-numeric: tabular-nums; }
.mmrc-nextday { font-size: 10px; font-weight: 600; color: ${INK_muted}; margin-left: 3px;
                vertical-align: 1px; }
.mmrc-legmeta { display: flex; flex-wrap: wrap; align-items: center;
                gap: 4px 7px; min-width: 0; padding: 1px 0;
                grid-column: 1 / -1; padding-bottom: 1px; }
.mmrc-acgroup { display: inline-flex; flex-direction: row; align-items: center;
                gap: 5px; min-width: 0; }
.mmrc-cabinbadges { display: flex; flex-wrap: wrap; gap: 5px; }
@container (max-width: 420px) {
    .mmrc-arrow span { font-size: 10px; padding: 0 2px; }
    .mmrc-seatbtn, .mmrc-ac { padding: 1px 6px 1px 5px; }
}
.mmrc-logo { width: 17px; height: 17px; object-fit: contain; flex: 0 0 auto;
             border-radius: 2px; vertical-align: middle; }
.mmrc-logofallback { width: 17px; height: 17px; flex: 0 0 auto; border-radius: 2px;
                     background: ${INK_primary}; color: #fff; font-size: 8px;
                     font-weight: 700; display: inline-flex; align-items: center;
                     justify-content: center; letter-spacing: .2px; }
.mmrc-air { display: inline; font-size: 12px; font-weight: 600; color: ${INK_primary};
            white-space: nowrap; max-width: 22ch; overflow: hidden; text-overflow: ellipsis; }
.mmrc-fno { font-size: 11.5px; color: ${INK_secondary};
            font-variant-numeric: tabular-nums; white-space: nowrap; }
.mmrc-air.is-codeshare { color: #8a5a00; font-weight: 600; }
.mmrc-air.is-codeshare::before { content: '↷ '; }
.mmrc-durleg { font-size: 11.5px; color: ${INK_muted}; white-space: nowrap;
               font-variant-numeric: tabular-nums; }
.mmrc-ac { display: inline-flex; align-items: center; white-space: nowrap;
           font-size: 10.5px; font-weight: 600; line-height: 1.45; padding: 1px 7px;
           border-radius: 999px; background: #eef2f9; color: #3a465f;
           max-width: 14ch; overflow: hidden; text-overflow: ellipsis; }
.mmrc-ac.is-wide { background: ${INK_primary}; color: #fff; }
.mmrc-allegris, .mmrc-newbiz, .mmrc-theroom, .mmrc-premcab {
    font-size: 10.5px; font-weight: 600; line-height: 1.45;
    letter-spacing: 0; text-transform: none; white-space: nowrap;
    padding: 1px 7px; border-radius: 999px;
    background: #f7edd0; color: #8a6d1f; }
.mmrc-row.is-lay { display: block; padding: 0; }
.mmrc-laymeta { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 4px 7px;
                margin: 2px 0 2px 44px; padding: 2px 9px 2px 7px; border-radius: 4px;
                background: #f6f5f1; font-size: 11.5px; color: ${INK_secondary}; }
.mmrc-laymeta::before { content: '⇄'; color: ${INK_muted}; }
.mmrc-laymeta b { font-weight: 700; color: ${INK_primary}; font-variant-numeric: tabular-nums; }
.mmrc-lead { font-weight: 700; color: ${INK_primary}; }
.mmrc-lead.is-plain { font-weight: 600; color: ${INK_secondary}; }
.mmrc-row.is-apchange .mmrc-laymeta { background: #fbe3e1; }
.mmrc-row.is-apchange .mmrc-laymeta::before { content: '⚠'; color: #b02a2a; }
.mmrc-row.is-apchange .mmrc-lead { color: #b02a2a; }
.mmrc-tc { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;
           font-size: 10.5px; font-weight: 700; color: #b02a2a;
           font-variant-numeric: tabular-nums; }
.mmrc-tc i { font-style: normal; }
.mmrc-tsame { font-size: 10.5px; color: ${INK_muted}; font-variant-numeric: tabular-nums; }
.mmrc-row.is-lay.is-long .mmrc-laymeta b,
.mmrc-row.is-lay.is-tight .mmrc-laymeta b { color: #b02a2a; }
.mmrc-run, .mmrc-lounge { display: inline-flex; vertical-align: -2px; margin-right: 1px; color: #b02a2a; }

.mmrc-cols { display: grid; gap: 6px; grid-template-rows: auto auto auto 1fr auto;
             align-content: stretch; }
.mmrc-col { grid-row: 1/-1; display: grid; grid-template-rows: subgrid;
            text-align: left; }
.mmrc-col.is-3d { perspective: 1800px; }
.mmrc-col.is-3d .mmrc-colflip { transform-style: preserve-3d; will-change: transform; }
.mmrc-colflip { grid-row: 1/-1; display: grid;
                grid-template-rows: subgrid; grid-template-columns: minmax(0, 1fr);
                transition: transform .45s cubic-bezier(.4, .1, .2, 1); }
.mmrc-col.is-open .mmrc-colflip { transform: rotateY(180deg); }
.mmrc-col.mmrc-instant .mmrc-colflip,
.mmrc-col.mmrc-instant .mmrc-colface-front,
.mmrc-col.mmrc-instant .mmrc-colface-back { transition: none; }
.mmrc-colface { grid-row: 1/-1; grid-column: 1; min-width: 0;
                border: 1.5px solid color-mix(in srgb, var(--mmc) 62%, #fff);
                border-radius: 8px; background: #fff; }
.mmrc-colface-front { display: grid; grid-template-rows: subgrid;
                      visibility: visible; transition: visibility 0s linear .225s; }
.mmrc-col.is-open .mmrc-colface-front { visibility: hidden; }
.mmrc-colface-back { transform: rotateY(180deg); position: relative;
                     display: flex; flex-direction: column; overflow: hidden;
                     visibility: hidden; transition: visibility 0s linear .225s; }
.mmrc-col.is-open .mmrc-colface-back { visibility: visible; }
.mmrc-col.is-searched .mmrc-colface { border: 2px solid var(--mmc); margin: -0.5px; }
.mmrc-col.is-empty .mmrc-colface { background: #faf9f7;
                     border-color: color-mix(in srgb, var(--mmc) 22%, #fff); }
.mmrc-h { padding: 7px 8px 8px; border-top: none; text-align: center;
          border-radius: 6px 6px 0 0; }
.mmrc-col:not(.is-empty) .mmrc-h { background: var(--mmc);
                                   border-bottom: 1px solid var(--mmc); }
.mmrc-col.is-empty .mmrc-h { background: #f3f2ef; border-bottom: 1px solid #e7e5df; }
.mmrc-nm { font-size: 13px; font-weight: 700; color: var(--mmc); line-height: 1.2;
           display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap;
           justify-content: center; }
.mmrc-seats { display: block; font-size: 10px; font-weight: 600; color: ${INK_muted};
              white-space: nowrap; margin-top: 2px; }
.mmrc-seats.is-low { color: ${INK_warn}; }
.mmrc-cash { font-size: 13px; font-weight: 700; color: ${INK_primary}; margin-top: 3px;
             font-variant-numeric: tabular-nums; white-space: nowrap; }
.mmrc-cash::before { content: attr(data-label) " "; font-size: 10px; font-weight: 400;
                     color: ${INK_muted}; letter-spacing: 0; text-transform: none; }
.mmrc-col:not(.is-empty) .mmrc-nm,
.mmrc-col:not(.is-empty) .mmrc-cash { color: #fff; }
.mmrc-col:not(.is-empty) .mmrc-cash::before,
.mmrc-col:not(.is-empty) .mmrc-seats { color: rgba(255,255,255,.85); }
.mmrc-col:not(.is-empty) .mmrc-seats.is-low { color: #ffd9d4; }
.mmrc-segs { padding: 4px 8px 5px; font-size: 9.5px; color: ${INK_secondary}; line-height: 1.5;
             background: #fdf5e7; border-bottom: 1px solid ${INK_hairline}; }
.mmrc-segs:empty { background: transparent; padding: 0; border-bottom: 1px solid ${INK_hairline}; }
.mmrc-col.is-empty .mmrc-segs:empty { border-bottom: 0; }
.mmrc-lbl { display: flex; align-items: center; gap: 3px; font-size: 8.5px; font-weight: 700;
            letter-spacing: .05em; text-transform: uppercase; color: #8a5a00; margin-bottom: 1px; }
.mmrc-lbl::before { content: '⇅'; font-size: 10px; line-height: 1; }
.mmrc-seg { display: flex; justify-content: space-between; gap: 5px; }
.mmrc-seg em { font-style: normal; font-weight: 600; color: ${INK_secondary}; }
.mmrc-seg em.is-down { color: ${INK_warn}; font-weight: 700; }
.mmrc-seg em.is-note { color: ${INK_warn}; font-weight: 700; }
.mmrc-flist { display: grid; grid-template-rows: subgrid; padding: 0 8px; }
.mmrc-f { position: relative; display: grid; grid-template-columns: 1fr auto;
          align-items: center; gap: 8px; padding: 3px 4px; cursor: pointer;
          border-bottom: 1px solid ${INK_hairline}; }
.mmrc-f:last-child { border-bottom: 0; }
.mmrc-f::before { content: ''; position: absolute; left: -5px; right: -5px; top: 0; bottom: 0;
                  border-radius: 4px; }
.mmrc-f:hover::before { background: color-mix(in srgb, var(--mmc) 8%, #fff); }
.mmrc-f.is-gap { cursor: default; }
.mmrc-f.is-gap::after { content: ''; grid-column: 1 / -1; text-align: center;
                        color: #d8d5cc; font-size: 12px; }
.mmrc-mi { position: relative; font-size: 16.5px; font-weight: 700; color: var(--mmc);
           font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -.02em; }
.mmrc-ti { position: relative; font-size: 10px; font-weight: 700; color: ${INK_muted};
           text-transform: uppercase; letter-spacing: .05em; }
.mmrc-none { padding: 12px 8px; font-size: 11px; color: ${INK_muted}; text-align: center; align-self: center; }

.mmrc-colface-front > .mmrc-h { grid-row: 1; }
.mmrc-colface-front > .mmrc-segs { grid-row: 2; }
.mmrc-colface-front > .mmrc-body, .mmrc-colface-front > .mmrc-none { grid-row: 3 / -3; }
.mmrc-colface-front > .mmrc-note { grid-row: -2 / -1; }
.mmrc-body { display: grid; grid-template-rows: subgrid; min-height: 0; }
.mmrc-body > .mmrc-flist { grid-row: 1 / -1; }

.mmrc-fclose { position: absolute; top: 6px; right: 6px; z-index: 1;
              width: 24px; height: 24px; border-radius: 999px; border: 0; cursor: pointer;
              background: rgba(255,255,255,.25); color: #fff; font-size: 11px; line-height: 1; }
.mmrc-fclose:hover { background: rgba(255,255,255,.42); }
.mmrc-fback-head { padding: 7px 9px 8px; text-align: center; color: #fff;
                   background: var(--mmc); }
.mmrc-fback-cabin, .mmrc-fback-tier { padding-right: 20px; }
.mmrc-fback-cabin { font-size: 10px; font-weight: 700; text-transform: uppercase;
                    letter-spacing: .06em; opacity: .9; }
.mmrc-fback-tier { font-size: 15px; font-weight: 700; margin-top: 1px; line-height: 1.2; }
.mmrc-fback-balance { font-size: 10.5px; margin-top: 3px; opacity: .85; }
.mmrc-fback-balance.is-short { color: #ffd9d4; opacity: 1; font-weight: 600; }
.mmrc-fback-combo { font-size: 10.5px; margin-top: 3px; opacity: .85; }
.mmrc-fback-big { font-size: 19px; font-weight: 800; margin-top: 5px; line-height: 1.15;
                  font-variant-numeric: tabular-nums; }
.mmrc-fback-bigc { font-size: 12px; font-weight: 600; opacity: .95; font-variant-numeric: tabular-nums; }
.mmrc-fback-split { display: flex; justify-content: center; flex-wrap: wrap; margin: 6px auto 0; padding-top: 5px;
                    width: 82%; border-top: 1px solid rgba(255,255,255,.28); font-size: 10.5px; opacity: .85;
                    font-variant-numeric: tabular-nums; }
.mmrc-fback-split span + span::before { content: '·'; margin: 0 6px; opacity: .7; }
.mmrc-fback-note { margin: 6px 9px 0; padding: 6px 8px; font-size: 11px; line-height: 1.35;
  color: #5a1a12; background: #fdecea; border: 1px solid #f3c4bd; border-radius: 4px; }
.mmrc-blk { padding: 7px 12px 8px; }
.mmrc-blk + .mmrc-blk { border-top: 1px solid #eceae4; }
.mmrc-colface-back .mmrc-blk { padding: 7px 7px 8px; }
.mmrc-colface-back .mmrc-svc li { font-size: 10.5px; gap: 0 3px; grid-template-columns: 13px minmax(0, 1fr) auto; }
.mmrc-colface-back .mmrc-ic { width: 13px; height: 13px; font-size: 8px; }
.mmrc-cap { display: flex; justify-content: space-between; font-size: 9.5px; font-weight: 700;
            letter-spacing: .07em; text-transform: uppercase; color: ${INK_muted}; margin-bottom: 4px; }
.mmrc-cap i { font-style: normal; font-weight: 500; letter-spacing: 0; text-transform: none; }
.mmrc-ptab { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; font-size: 11px; }
.mmrc-ptab td { padding: 2px 0; white-space: nowrap; }
.mmrc-ptab td.mmrc-pw { color: ${INK_secondary}; }
.mmrc-ptab td.mmrc-pw small { color: ${INK_muted}; font-size: 10px; }
.mmrc-ptab td.mmrc-pm { text-align: right; font-weight: 600; color: #3d3c39; }
.mmrc-ptab td.mmrc-pe { text-align: right; padding-left: 10px; color: ${INK_secondary}; }
.mmrc-ptab tr.is-sum td { border-top: 1px solid ${INK_hairline}; padding-top: 4px;
                          color: var(--mmc); font-weight: 600; }
.mmrc-ptab tr.is-shown td.mmrc-pw::after { content: '◂'; color: var(--mmc); margin-left: 4px; font-size: 9px; }
.mmrc-svc { list-style: none; margin: 0; padding: 0; display: grid; gap: 3px; }
.mmrc-svc li { display: grid; grid-template-columns: 15px minmax(0, 1fr) auto; align-items: center;
               gap: 0 5px; font-size: 11px; line-height: 1.25; }
.mmrc-ic { width: 14px; height: 14px; border-radius: 999px; display: grid; place-items: center;
           font-size: 8.5px; font-weight: 800; line-height: 1; }
.mmrc-ic.is-y { background: #e4ede2; color: #3e5e3a; }
.mmrc-ic.is-n { background: #f3e3e1; color: #9a3f37; }
.mmrc-ic.is-p { background: #ecebe6; color: ${INK_secondary}; }
.mmrc-sk { color: ${INK_secondary}; hyphens: auto; overflow-wrap: break-word; }
.mmrc-sv { text-align: right; font-variant-numeric: tabular-nums; color: ${INK_secondary}; white-space: nowrap; }
.mmrc-svc li.is-up .mmrc-sv { color: var(--mmc); font-weight: 600; }
.mmrc-svc li.is-up .mmrc-sv::before { content: '▲'; font-size: 7px; color: var(--mmc); margin-right: 4px; vertical-align: 1px; }
.mmrc-ssub { grid-column: 2 / -1; font-size: 9.5px; line-height: 1.2; color: ${INK_muted}; margin-bottom: 1px; }
.mmrc-colface-back .mmrc-fchoose { margin-top: auto; }
.mmrc-fchoose { display: block; width: calc(100% - 18px); margin: 8px 9px 9px; cursor: pointer;
               border: 0; border-radius: 6px; background: ${INK_primary}; color: #fff;
               font: inherit; font-size: 12.5px; font-weight: 700; padding: 9px 12px;
               letter-spacing: .02em; }
.mmrc-fchoose:hover { background: #1e449c; }
.mmrc-fchoose:disabled { opacity: .6; cursor: default; }
.mmrc-fchoose.is-error { background: ${INK_warn}; }
.mmrc-note { padding: 4px 6px 5px; border-top: none; font-size: 9.5px;
             line-height: 1.35; text-align: center; color: ${INK_muted}; }
.mmrc-note:empty { padding: 0; }
.mmrc-pop { position: absolute; left: 50%; transform: translateX(-50%); top: calc(100% + 6px); z-index: 2147482000;
            width: 236px; background: #fff; border: 1px solid ${INK_hairline}; border-radius: 8px;
            box-shadow: 0 14px 34px rgba(5,22,77,.2); display: none; text-align: left;
            cursor: default; overflow: hidden; }
.mmrc-f:hover .mmrc-pop { display: block; }
.mmrc-f:hover { z-index: 2147482001; }
.mmrc-col.is-open .mmrc-pop { display: none !important; }
.mmrc-pop-h { padding: 8px 12px 7px; border-bottom: 1px solid #eceae4; display: flex;
              justify-content: space-between; align-items: baseline; gap: 8px; }
.mmrc-pop-h b { font-size: 12px; color: var(--mmc); }
.mmrc-pop-h span { font-size: 10px; color: ${INK_muted}; white-space: nowrap; }

html.mm-dark .mmrc-col, html.mm-dark .mmrc-cab {
    --mmrc-ink: oklch(from var(--mmc) calc(l * 0.9 + 0.33) min(calc(c * 1.6), 0.09) h); }
html.mm-dark :is(.mmrc-mi, .mmrc-col.is-empty .mmrc-nm, .mmrc-cab i, .mmrc-pop-h b, .mmrc-ptab tr.is-sum td, .mmrc-svc li.is-up .mmrc-sv),
html.mm-dark .mmrc-ptab tr.is-shown td.mmrc-pw::after, html.mm-dark .mmrc-svc li.is-up .mmrc-sv::before { color: var(--mmrc-ink); }
html.mm-dark .mmrc-segs:not(:empty) { background: var(--mm-dark-layer); }
html.mm-dark .mmrc-colface { border-color: color-mix(in oklab, var(--mmc) 65%, var(--mm-dark-card)); }
html.mm-dark .mmrc-col.is-empty .mmrc-colface { border-color: color-mix(in oklab, var(--mmc) 30%, var(--mm-dark-card)); }
html.mm-dark .mmrc-cab { border-color: color-mix(in oklab, var(--mmc) 55%, var(--mm-dark-card)); border-top-color: var(--mmc); }
html.mm-dark .mmrc-cab:hover, html.mm-dark .mmrc-f:hover::before {
    background: color-mix(in oklab, var(--mmc) 18%, var(--mm-dark-card)); }
html.mm-dark img.mmrc-logo { background: #fff; border-radius: 3px; box-shadow: 0 0 0 1.5px #fff; }
`;
    let styleEl = null;
    function injectStyles() {
      if (document.head) {
        if (!styleEl || !styleEl.isConnected) {
          styleEl = document.getElementById("mmrc-styles");
          if (!styleEl) {
            styleEl = document.createElement("style");
            styleEl.id = "mmrc-styles";
            document.head.appendChild(styleEl);
          }
        }
        styleEl.textContent !== CSS && (styleEl.textContent = CSS);
      }
    }
    function apiOf() {
      const a = boundsData().api;
      return a && a.base && a.headers ? a : null;
    }
    async function apiGet(path, retried) {
      const a = apiOf();
      if (!a) throw new Error(T("keine API-Zugangsdaten"));
      const bd = boundsData();
      const headers = bd.freshHeaders && await bd.freshHeaders() || a.headers;
      const r = await fetch(a.base + path, {
        method: "GET",
        headers: headers,
        credentials: "include"
      });
      if ((401 === r.status || 403 === r.status) && !retried && bd.refreshAuth && await bd.refreshAuth(!0)) return apiGet(path, !0);
      const text = await r.text();
      if (!r.ok) {
        let code = "", title = "";
        try {
          const errs = JSON.parse(text).errors || [];
          code = errs.map(e => e.code).join(",");
          title = errs.map(e => e.title).filter(Boolean).join(",");
        } catch (e) {}
        const err = new Error("HTTP " + r.status + (code ? " (" + code + ")" : ""));
        err.status = r.status;
        err.apiCode = code;
        err.apiTitle = title;
        throw err;
      }
      return JSON.parse(text);
    }
    function placeName(code, fallbackCity) {
      try {
        const ia = window.__mmIata;
        const l = ia && "function" == typeof ia.placeLabel ? ia.placeLabel(code) : null;
        if (l) return l;
      } catch (e) {}
      return fallbackCity ? properCase(fallbackCity) : "";
    }
    function timelineHtml(it) {
      const termLabel = t => "TN" === t ? T("Fernbahnhof") : "T" + t;
      const tSpan = (code, city, inner) => {
        const t = placeName(code, city);
        return `<span class="mmrc-t" data-iata="${esc(code)}"${t ? ` data-place="${esc(t)}"` : ""}>${inner}</span>`;
      };
      const extraOf = (leg, i) => i === it.legs.length - 1 && it.daysOffset ? `<span class="mmrc-nextday" title="${Tn(it.daysOffset, "Ankunft {n} Tag später", "Ankunft {n} Tage später")}">` + `+${it.daysOffset}</span>` : "";
      const rows = [];
      it.legs.forEach((leg, i) => {
        rows.push(((leg, legIdx) => {
          const acLabel = shortAircraft(leg.aircraftName);
          const parts = [ logoHtml(leg) ];
          leg.operatingName && parts.push(`<span class="mmrc-air${leg.codeshare ? " is-codeshare" : ""}"` + (leg.codeshare ? ` title="${T("Durchgeführt von {name}", {
            name: esc(leg.operatingName)
          })}"` : "") + `>${esc(leg.operatingName)}</span>`);
          parts.push(`<span class="mmrc-fno">${esc((f = leg.flightNo, (f || "").replace(/^([A-Z]{2})(\d)/, "$1 $2")))}</span>`);
          var f;
          seatmapOn() && apiOf() && leg.mkt && leg.mktNo && leg.depDate ? parts.push(`<button type="button" class="mmrc-seatbtn${leg.widebody ? " is-wide" : ""}" ` + `data-leg="${legIdx}" title="${T("{aircraft}: Sitzplan ansehen", {
            aircraft: esc(leg.aircraftName)
          })}">` + (leg => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="` + (isRail(leg) ? TRAIN_PATH : isBus(leg) ? BUS_PATH : PLANE_PATH) + `"/></svg>`)(leg) + `${esc(acLabel)}</button>`) : parts.push(`<span class="mmrc-ac${leg.widebody ? " is-wide" : ""}" title="${esc(leg.aircraftName)}">${esc(acLabel)}</span>`);
          const cabinBadges = [];
          leg.allegris && cabinBadges.push(`<span class="mmrc-allegris">Allegris</span>`);
          leg.newBiz && cabinBadges.push(`<span class="mmrc-newbiz" title="${T("Umgerüsteter A380 mit der neuen Business Class (1-2-1, direkter Gangzugang)")}">BC Retrofit</span>`);
          leg.premium && cabinBadges.push(`<span class="mmrc-premcab" title="${esc(leg.premium.title)}">${esc(leg.premium.label)}</span>`);
          const acIdx = parts.length - 1;
          cabinBadges.length && (parts[acIdx] = `<span class="mmrc-acgroup">${parts[acIdx]}` + `<span class="mmrc-cabinbadges">${cabinBadges.join("")}</span></span>`);
          return `<div class="mmrc-row is-leg">` + ((leg, extra) => tSpan(leg.from, leg.fromCity, esc(leg.dep)) + `<span class="mmrc-arrow">` + (leg.duration ? `<span>${esc(fmtDur(leg.duration))}</span>` : "") + `</span>` + tSpan(leg.to, leg.toCity, `${esc(leg.arr)}${extra || ""}`))(leg, extraOf(leg, legIdx)) + `<span class="mmrc-legmeta">${parts.join("")}</span></div>`;
        })(leg, i));
        const stops = leg.techStops || [];
        stops.length && (isRail(leg) || isBus(leg)) ? rows.push((stops => {
          const placeNames = stops.map(techPlace).filter(Boolean);
          const n = stops.length;
          const tip = placeNames.length ? placeNames.join(", ") : T("Halt ohne Umstieg, Sie bleiben sitzen");
          return `<div class="mmrc-row is-lay is-tech">` + `<span class="mmrc-laymeta">` + `<span class="mmrc-lead is-plain" title="${esc(tip)}">` + `${Tn(n, "{n} Zwischenhalt", "{n} Zwischenhalte")}</span>` + `</span></div>`;
        })(stops)) : stops.forEach(t => rows.push((t => {
          const placeName = cityOf(t.airport, t.city);
          const durationHtml = null != t.duration ? `<b>${esc(fmtDur(t.duration))}</b>` : "";
          return `<div class="mmrc-row is-lay is-tech">` + `<span class="mmrc-laymeta">` + `<span class="mmrc-lead is-plain" title="${T("Zwischenlandung ohne Umstieg, Sie bleiben an Bord")}">` + `${placeName ? T("Zwischenlandung in {place}:", {
            place: esc(placeName)
          }) : T("Zwischenlandung:")}</span> ${durationHtml}` + `</span></div>`;
        })(t)));
        if (i === it.legs.length - 1) return;
        const layHtml = ((lo, leg, next) => {
          const dur = lo ? lo.duration : null;
          const long = null != dur && dur >= 4 * 3600;
          const mct = MCT[String(leg.to || "").toUpperCase()] || MCT_DEFAULT;
          const tight = null != dur && dur <= 60 * (mct + 15);
          const airportChanged = leg.to && next && next.from && leg.to !== next.from;
          const changed = !airportChanged && leg.termArr && next && next.termDep && leg.termArr !== next.termDep;
          const place = cityOf(leg.to, leg.toCity);
          const figure = tight ? `<span class="mmrc-run" title="${T("Kurze Umstiegszeit")}">${RUN_SVG}</span>` : long && !airportChanged ? `<span class="mmrc-lounge" title="${T("Langer Aufenthalt")}">${LOUNGE_SVG}</span>` : "";
          const time = null != dur ? `${figure}<b>${esc(fmtDur(dur))}</b>` : "";
          let cls = "", lead = "", mark = "";
          if (airportChanged) {
            cls = " is-apchange";
            lead = `<span class="mmrc-lead">${place ? T("Flughafenwechsel in {place}:", {
              place: esc(place)
            }) : T("Flughafenwechsel:")}</span>`;
            mark = `<span class="mmrc-tc" title="${T("Der Transfer erfolgt in eigener Verantwortung. Gepäck muss neu aufgegeben werden, Check-in erneut.")}">` + `${esc(leg.to)} <i>→</i> ${esc(next.from)}</span>`;
          } else if (changed) {
            const rail = "TN" === leg.termArr || "TN" === next.termDep;
            cls = " is-tchange";
            lead = `<span class="mmrc-lead">${rail ? place ? T("Wechsel in {place}:", {
              place: esc(place)
            }) : T("Wechsel:") : place ? T("Terminalwechsel in {place}:", {
              place: esc(place)
            }) : T("Terminalwechsel:")}</span>`;
            mark = `<span class="mmrc-tc" title="${T(rail ? "Wechsel zwischen Fernbahnhof und Terminal" : "Terminalwechsel beim Umstieg")}">` + (rail ? `${esc(termLabel(leg.termArr))} <i>→</i> ${esc(termLabel(next.termDep))}` : `T${esc(leg.termArr)} <i>→</i> T${esc(next.termDep)}`) + `</span>`;
          } else {
            lead = `<span class="mmrc-lead is-plain">${place ? T("Umstiegszeit in {place}:", {
              place: esc(place)
            }) : T("Umstiegszeit:")}</span>`;
            leg.termArr && (mark = `<span class="mmrc-tsame">(${esc(termLabel(leg.termArr))})</span>`);
          }
          return time || mark ? `<div class="mmrc-row is-lay${cls}${long ? " is-long" : ""}${tight ? " is-tight" : ""}">` + `<span class="mmrc-laymeta">${`${lead} ${time} ${mark}`}</span></div>` : "";
        })(it.layovers[i], leg, it.legs[i + 1]);
        layHtml && rows.push(layHtml);
      });
      return `<div class="mmrc-tl">${rows.join("")}</div>`;
    }
    const PM_KEY = "mmrc_priceMode";
    let priceMode = (() => {
      try {
        return "total" === localStorage.getItem(PM_KEY) ? "total" : "adult";
      } catch (e) {
        return "adult";
      }
    })();
    const asTotal = f => "total" === priceMode && !!f.pax;
    const shownMiles = f => asTotal(f) ? f.totalMiles : f.miles;
    const shownCash = f => asTotal(f) ? f.totalCash : f.cash;
    const paxHeads = f => f.pax.reduce((n, u) => n + u.count, 0);
    const paxLabel = t => "ADT" === t ? T("Erwachsener") : "B15" === t ? T("Junger Erw.") : "CHD" === t ? T("Kind") : "INF" === t ? T("Kleinkind") : "";
    const paxAge = t => "CHD" === t ? "2–11" : "INF" === t ? T("unter 2") : "";
    function paxGroups(f) {
      const out = [];
      for (const u of f.pax) {
        const same = !u.companion && out.find(g => !g.companion && g.miles === u.miles && g.cash === u.cash);
        same ? same.count += u.count : out.push(Object.assign({}, u));
      }
      return out;
    }
    const paxLeadGroup = groups => groups.find(g => "ADT" === g.type && !g.companion) || groups[0];
    function services(f, withItem) {
      const size = s => {
        const m = /(\d+)\s*×\s*(\d+)/.exec(s || "");
        return m ? 1e3 * +m[1] + +m[2] : 0;
      };
      const fee = x => x ? x.allowed ? x.fee ? [ cashLabel(x.fee, x.currency), "p", 1e6 - x.fee ] : [ T("kostenlos"), "y", 1e9 ] : [ T("nicht möglich"), "n", 0 ] : null;
      const hand = f.cabinBag ? bagText(f.cabinBag) : null;
      const bag = f.baggage ? bagText(f.baggage) : null;
      const out = [];
      hand && out.push([ "hand", T("Handgepäck"), hand, "y", size(hand) ]);
      out.push([ "bag", T("Aufgabegepäck"), bag || T("nicht inkl."), bag ? "y" : "n", size(bag) ]);
      withItem && out.push([ "item", T("Pers. Gegenstand"), T(f.personalItem ? "1 Stück" : "nicht inkl."), f.personalItem ? "y" : "n", f.personalItem ? 1 : 0 ]);
      out.push([ "seat", T("Sitzplatzwahl"), T(f.seatReservation ? "inklusive" : "gegen Gebühr"), f.seatReservation ? "y" : "n", f.seatReservation ? 1 : 0 ]);
      const c = fee(f.change), r = fee(f.refund);
      c && out.push([ "chg", T("Umbuchung"), ...c ]);
      r && out.push([ "ref", T("Erstattung"), ...r ]);
      return out;
    }
    function servicesHtml(f, base, withItem) {
      const ref = base && base !== f ? new Map(services(base, withItem).map(s => [ s[0], s[4] ])) : null;
      const IC = {
        y: "✓",
        n: "✕",
        p: "€"
      };
      let ups = 0;
      return {
        html: '<ul class="mmrc-svc" lang="' + (window.__mmI18n ? window.__mmI18n.lang() : "de") + '">' + services(f, withItem).map(([key, k, v, ic, rank]) => {
          const up = !!ref && ref.has(key) && rank > ref.get(key);
          up && ups++;
          return `<li${up ? ' class="is-up"' : ""}><span class="mmrc-ic is-${ic}" aria-hidden="true">${IC[ic]}</span>` + `<span class="mmrc-sk">${esc(k)}</span><span class="mmrc-sv">${esc(v)}</span>` + ("chg" === key && "p" === ic ? '<span class="mmrc-ssub">' + T("zzgl. Tarifdifferenz") + "</span>" : "") + "</li>";
        }).join("") + "</ul>",
        ups: ups
      };
    }
    function bagText(s) {
      const m = /(\d+)\s+(?:CHECKED BAGS?|CABIN BAGS?)[^0-9]*(\d+)\s*KG/i.exec(s || "");
      return m ? m[1] + " × " + m[2] + " kg" : properCase(s || "");
    }
    function anchorSig(card) {
      const q = sel => {
        const el = card.querySelector(sel);
        return el ? el.textContent.replace(/\s+/g, " ").trim() : null;
      };
      const dep = q(".bound-departure-airport-code"), arr = q(".bound-arrival-airport-code");
      const dt = q(".bound-departure-datetime"), at = q(".bound-arrival-datetime");
      if (!(dep && arr && dt && at)) return null;
      const stops = stopCount(card);
      return null == stops ? null : dep + "|" + arr + "|" + dt + "|" + at + "|" + stops;
    }
    function stopCount(card) {
      const nb = card.querySelector(".bound-nb-stop");
      const n = nb && /^\s*(\d+)\s*$/.exec(nb.textContent || "");
      return n ? parseInt(n[1], 10) : !nb && card.querySelector(".bound-stop-text") ? 0 : null;
    }
    function textSig(card) {
      let txt = "";
      !function walk(node) {
        if (3 !== node.nodeType) {
          if (1 === node.nodeType && !("REFX-FLIGHT-DETAILS" === node.tagName || node.classList && node.classList.contains("cdk-visually-hidden"))) for (let n = node.firstChild; n; n = n.nextSibling) walk(n);
        } else txt += node.nodeValue + " ";
      }(card);
      txt = txt.replace(/\s+/g, " ");
      const times = txt.match(/\b(\d{2}:\d{2})\b/g);
      const codes = txt.match(/\b([A-Z]{3})\b/g);
      const stops = stopCount(card);
      return !times || times.length < 2 || !codes || codes.length < 2 || null == stops ? null : codes[0] + "|" + codes[1] + "|" + times[0] + "|" + times[1] + "|" + stops;
    }
    function nativeCardFor(key) {
      const km = /^(.*?)(?:#(\d+))?$/.exec(String(key || ""));
      const want = km[1], nth = km[2] ? parseInt(km[2], 10) : 1;
      let hits = 0;
      for (const card of document.querySelectorAll("refx-flight-card-pres")) try {
        if ((anchorSig(card) || textSig(card)) === want && ++hits === nth) return card;
      } catch (e) {}
      return null;
    }
    let pendingBooking = null;
    function milesBalance() {
      const el = document.querySelector(".miles-asset-value .miles-value, span.miles-value");
      if (el) {
        const n = parseInt(String(el.textContent || "").replace(/[^\d]/g, ""), 10);
        if (Number.isFinite(n)) return n;
      }
      const a = window.__mmAuth;
      return a && Number.isFinite(a.miles) ? a.miles : null;
    }
    function balanceHtml(f) {
      const have = milesBalance();
      const need = f.totalMiles ?? f.miles;
      if (null == have || null == need) return "";
      const short = have < need;
      return `<div class="mmrc-fback-balance${short ? " is-short" : ""}">` + (short ? T("Meilenstand {have} · es fehlen {missing}", {
        have: esc(num(have)),
        missing: esc(num(need - have))
      }) : T("Meilenstand {have}", {
        have: esc(num(have))
      })) + `</div>`;
    }
    const messageNodes = () => [ ...document.querySelectorAll(".messages-list .message") ];
    const messageText = li => (li.textContent || "").replace(/\s+/g, " ").trim();
    const trace = [];
    const note = why => {
      trace.push(Date.now() % 1e5 + " " + why);
      trace.length > 30 && trace.shift();
    };
    function checkRefusal() {
      const p = pendingBooking;
      if (!p || !p.nativeBtn || p.refused) return;
      const bd = boundsData();
      if (bd?.cartInFlight > 0) {
        note("Warenkorb-Aufruf läuft — die Antwort entscheidet");
        return;
      }
      if (bd && bd.lastCart && bd.lastCart.t >= (p.startedAt || 0)) {
        note("Warenkorb-Aufruf schon beantwortet — onCart entscheidet");
        return;
      }
      const known = p.messages || [];
      const rows = messageNodes();
      const fresh = rows.filter(li => !known.includes(li)).map(messageText).filter(Boolean);
      if (fresh.length) {
        note("Ablehnung ohne Anfrage: " + fresh[0].slice(0, 40));
        refuseBooking(fresh[0]);
      } else note("keine neue Meldung (" + rows.length + ")");
    }
    function onCartAnswer(cart) {
      if (pendingBooking && !pendingBooking.refused && cart && !(cart.t < (pendingBooking.startedAt || 0))) if (cart.ok) note("Warenkorb angelegt — die App übernimmt"); else {
        note("Warenkorb abgelehnt: " + (cart.code || cart.status));
        refuseBooking(function(cart) {
          const code = String(cart.code || "");
          return cart.status ? "65012" === code ? T("Der gewählte Hinflug ist abgelaufen (65012). Eine neue Suche behebt das.") : "38608" === code ? T("Warenkorb abgelehnt (38608: Angebot nicht zusammenführbar).") : code ? T("Warenkorb abgelehnt ({code}).", {
            code: code
          }) : T("Warenkorb abgelehnt (HTTP {status}).", {
            status: cart.status
          }) : T("Warenkorb nicht erreichbar. Netzverbindung prüfen.");
        }(cart));
      }
    }
    const REFUSAL_FLASH_MS = 8e3;
    function hideShownRefusal() {
      const text = pendingBooking && pendingBooking.refused;
      const panels = new Map;
      messageNodes().forEach(li => {
        const same = !!text && messageText(li) === text;
        li.classList.contains("mmrc-dup-msg") !== same && li.classList.toggle("mmrc-dup-msg", same);
        const box = li.closest("refx-messages-panel-cont");
        if (box) {
          const n = panels.get(box) || [ 0, 0 ];
          n[0]++;
          same && n[1]++;
          panels.set(box, n);
        }
      });
      document.querySelectorAll("refx-messages-panel-cont").forEach(box => {
        const n = panels.get(box);
        const all = !!n && n[1] > 0 && n[1] === n[0];
        box.classList.contains("mmrc-dup-msg") !== all && box.classList.toggle("mmrc-dup-msg", all);
      });
    }
    function refuseBooking(text) {
      const p = pendingBooking;
      if (p) {
        p.refused = text;
        p.refusedAt = Date.now();
        p.text = T("Nicht buchbar");
        p.nativeBtn = null;
        restoreBooking();
        hideShownRefusal();
        setTimeout(() => {
          if (pendingBooking !== p) return;
          const list = listEl();
          const btn = list?.querySelector(".mmrc-fchoose.is-error");
          if (btn) {
            btn.classList.remove("is-error");
            btn.textContent = T("Wählen");
          }
        }, REFUSAL_FLASH_MS);
      }
    }
    function refuseLocked() {
      const why = messageNodes().map(messageText).filter(Boolean).pop();
      note("nativer Knopf gesperrt");
      refuseBooking(why || T("Tarif von der Seite gesperrt. Suche neu starten."));
    }
    const bookingInFlight = () => !!(pendingBooking && pendingBooking.nativeBtn && pendingBooking.nativeBtn.isConnected && pendingBooking.nativeBtn.disabled);
    function book(fare, uiBtn, boundKey) {
      if (!fare || !fare.airBoundId) return;
      const label = uiBtn ? uiBtn.textContent : null;
      const outboundStep = (() => {
        try {
          return "return" !== listSide() && (storedSearch().itineraries || []).length > 1;
        } catch (e) {
          return !1;
        }
      })();
      const CART = T(outboundStep ? "Rückflüge werden geladen …" : "Warenkorb wird geöffnet …");
      const busy = t => {
        pendingBooking = {
          key: boundKey,
          code: fare.code,
          text: t,
          listSig: boundsData().listSig || null,
          startedAt: Date.now(),
          messages: messageNodes()
        };
        if (t === CART && outboundStep) try {
          sessionStorage.setItem("mmrc_outbound_pick", JSON.stringify({
            code: fare.code,
            cabin: fare.cabin || null,
            tier: fare.tier || null
          }));
        } catch (e) {}
        if (uiBtn) {
          uiBtn.disabled = !0;
          uiBtn.classList.remove("is-error");
          uiBtn.textContent = t;
        }
      };
      const fail = t => {
        note("book gescheitert: " + t);
        const p = pendingBooking;
        pendingBooking = null;
        const btn = uiBtn && uiBtn.isConnected ? uiBtn : p && function(key, code) {
          const card = [ ...listEl()?.querySelectorAll(".mmrc-card") || [] ].find(c => c.dataset.key === key);
          const tile = card && [ ...card.querySelectorAll(".mmrc-f[data-code]") ].find(t => t.dataset.code === code);
          return tile && tile.closest(".mmrc-col")?.querySelector(".mmrc-fchoose") || null;
        }(p.key, p.code);
        if (btn) {
          btn.disabled = !1;
          btn.classList.add("is-error");
          btn.textContent = t;
          setTimeout(() => {
            if (btn.isConnected) {
              btn.classList.remove("is-error");
              btn.textContent = label || T("Wählen");
            }
          }, 5e3);
        }
      };
      const id = "selectFare-" + fare.airBoundId + "-" + fare.code;
      const find = () => document.getElementById(id);
      const direct = find();
      if (direct) {
        note("book: Knopf da" + (direct.disabled ? " (gesperrt)" : ""));
        busy(CART);
        pendingBooking && (pendingBooking.nativeBtn = direct);
        if (direct.disabled) {
          refuseLocked();
          return;
        }
        direct.click();
        return;
      }
      const native = nativeCardFor(boundKey);
      const card = native && fare.cabin ? function(el) {
        try {
          for (const t of window.getAllAngularTestabilities()) {
            let app = null;
            t?._destroyRef?.records?.forEach(r => {
              const v = r?.value;
              !app && v && "function" == typeof v.tick && Array.isArray(v.components) && (app = v);
            });
            if (!app || !t._ngZone) continue;
            const seen = new Set;
            const stack = app.components.map(c => c.hostView && c.hostView._lView);
            for (;stack.length; ) {
              const view = stack.pop();
              if (Array.isArray(view) && !seen.has(view)) {
                seen.add(view);
                if (view[0] === el && "function" == typeof view[8]?.onFlightCardClick) return {
                  comp: view[8],
                  zone: t._ngZone
                };
                for (const x of view) Array.isArray(x) && stack.push(x);
              }
            }
          }
        } catch (e) {}
        return null;
      }(native) : null;
      if (!card) {
        fail(T("Auswahl nicht möglich. Seite neu laden."));
        return;
      }
      const scope = native.closest(".upsell-premium-row-pres, refx-upsell-premium-row-pres") || native.parentElement || native;
      const suffix = "-" + fare.code;
      let collapsed = !0;
      try {
        card.comp.isCollapsed$.subscribe(v => {
          collapsed = v;
        }).unsubscribe();
      } catch (e) {}
      const open = !collapsed && card.comp.expansionCollpaseTracker === card.comp.id + fare.cabin;
      busy(T("Tarif wird gewählt …"));
      const t0 = Date.now();
      let done = !1, failTimer = null;
      const check = () => {
        if (done) return;
        const target = find() || [ ...scope.querySelectorAll('[id^="selectFare-"]') ].find(b => b.id.endsWith(suffix)) || null;
        target && (target => {
          done = !0;
          mo.disconnect();
          clearTimeout(failTimer);
          note("book: Knopf nach " + (Date.now() - t0) + " ms" + (target.disabled ? " (gesperrt)" : ""));
          busy(CART);
          pendingBooking && (pendingBooking.nativeBtn = target);
          target.disabled ? refuseLocked() : target.click();
        })(target);
      };
      const mo = new MutationObserver(check);
      mo.observe(document.body, {
        childList: !0,
        subtree: !0
      });
      open || card.zone.run(() => card.comp.onFlightCardClick(fare.cabin));
      check();
      done || (failTimer = setTimeout(() => {
        mo.disconnect();
        fail(T("Tarif nicht wählbar"));
      }, 2e3));
    }
    const TIER_ORDER = [ "Basic", "Light", "Classic", "Comfort", "Comfort +", "Flex", "Standard" ];
    let openFareCol = null;
    function closeFarePop() {
      if (!openFareCol) return;
      const col = openFareCol;
      openFareCol = null;
      col.classList.remove("is-open");
      const fp = col.querySelector(".mmrc-colface-back");
      const flip = col.querySelector(".mmrc-colflip");
      let timer = null;
      const finish = () => {
        clearTimeout(timer);
        flip && flip.removeEventListener("transitionend", onEnd);
        if (col !== openFareCol) {
          fp && fp.remove();
          col.classList.remove("is-3d");
        }
      };
      const onEnd = e => {
        e.target === flip && "transform" === e.propertyName && finish();
      };
      flip && flip.addEventListener("transitionend", onEnd);
      timer = setTimeout(finish, 480);
    }
    state._closeFarePop = closeFarePop;
    document.addEventListener("click", e => {
      e.isTrusted && !e.target.closest(".mmrc-col") && closeFarePop();
    }, {
      signal: abort.signal
    });
    const colData = new WeakMap, cardItem = new WeakMap, pickerOf = new WeakMap;
    function onListClick(e) {
      const t = e.target;
      const seat = t.closest(".mmrc-seatbtn");
      if (seat) {
        const it = cardItem.get(seat.closest(".mmrc-card"));
        it && seatmapOn() && window.__mmSeatmap && window.__mmSeatmap.open(it.legs, Number(seat.dataset.leg));
        return;
      }
      const chip = t.closest(".mmrc-cab");
      if (chip) {
        const p = pickerOf.get(chip.parentElement);
        p && p.pick(chip.dataset.cabin);
        return;
      }
      const col = t.closest(".mmrc-col");
      const d = col && colData.get(col);
      if (!d || t.closest(".mmrc-pop")) return;
      if (t.closest(".mmrc-fclose")) {
        closeFarePop();
        return;
      }
      const choose = t.closest(".mmrc-fchoose");
      if (choose) {
        const back = choose.closest(".mmrc-colface-back");
        const f = back && d.byCode.get(back.dataset.code);
        f && book(f, choose, d.boundKey);
        return;
      }
      if (t.closest(".mmrc-colface-back")) return;
      const tile = t.closest(".mmrc-f");
      const f = tile && d.byCode.get(tile.dataset.code);
      f && function(col, f) {
        const d = colData.get(col);
        const back = col.querySelector(".mmrc-colface-back");
        if (openFareCol === col && back && back.dataset.code === f.code) {
          closeFarePop();
          return;
        }
        closeFarePop();
        const stale = col.querySelector(".mmrc-colface-back");
        stale && stale.remove();
        const fp = document.createElement("div");
        fp.className = "mmrc-colface mmrc-colface-back";
        fp.dataset.code = f.code;
        fp.innerHTML = function(f, cabinMeta, base) {
          let price;
          if (f.pax) {
            const groups = paxGroups(f);
            const lead = paxLeadGroup(groups);
            const parts = groups.map(g => {
              return (g.companion ? T("Companion") : ("ADT" === (t = g.type) ? T("Erw.") : paxLabel(t)) || g.type) + " " + (null != g.miles ? num(g.miles) : "–") + (null != g.cash && g.cash !== lead.cash ? " + " + cashLabel(g.cash, f.currency) : "");
              var t;
            });
            price = `<div class="mmrc-fback-big">${null != f.totalMiles ? T("{miles} Meilen", {
              miles: esc(num(f.totalMiles))
            }) : ""}</div>` + `<div class="mmrc-fback-bigc">${null != f.totalCash ? "+ " + esc(cashLabel(f.totalCash, f.currency)) + " " : ""}` + `${Tn(paxHeads(f), "für {n} Reisende", "für {n} Reisende")}</div>` + `<div class="mmrc-fback-split">${parts.map(p => `<span>${esc(p)}</span>`).join("")}</div>`;
          } else price = (null != f.miles ? `<div class="mmrc-fback-big">${T("{miles} Meilen", {
            miles: esc(num(f.miles))
          })}</div>` : "") + (null != f.cash ? `<div class="mmrc-fback-bigc">+ ${esc(cashLabel(f.cash, f.currency))}</div>` : "");
          return `<button type="button" class="mmrc-fclose" title="${T("Schließen")}" aria-label="${T("Schließen")}">✕</button>` + `<div class="mmrc-fback-head">` + `<div class="mmrc-fback-cabin">${esc(cabinMeta.name)}</div>` + `<div class="mmrc-fback-tier">${esc(f.tier || "")}</div>` + price + balanceHtml(f) + function(f, cabinMeta) {
            const j = window.__mmCal && window.__mmCal.journey;
            const F = window.__mmFareNames;
            if (!j || "return" !== j.kind || 0 !== j.req || !F || !F.pairGroup) return "";
            const g = F.pairGroup(f.code);
            const text = "light" === g ? T("Rückflug nur {fare}", {
              fare: cabinMeta.name + " Light"
            }) : "comfort" === g ? T("Rückflug nur Comfort, jede Kabine") : "plus" === g ? T("Rückflug Comfort +, Flex oder Standard, jede Kabine") : "";
            return text ? `<div class="mmrc-fback-combo">${esc(text)}</div>` : "";
          }(f, cabinMeta) + `</div>` + `<div class="mmrc-blk"><div class="mmrc-cap">${T("Leistungen")}</div>${servicesHtml(f, base, !0).html}</div>` + `<button type="button" class="mmrc-fchoose">${T("Wählen")}</button>`;
        }(f, d.meta, d.base);
        col.querySelector(".mmrc-colflip").appendChild(fp);
        openFareCol = col;
        col.classList.add("is-3d");
        requestAnimationFrame(() => {
          openFareCol === col && col.classList.add("is-open");
        });
      }(col, f);
    }
    const pop = document.createElement("span");
    pop.className = "mmrc-pop";
    function onListOver(e) {
      const tile = e.target.closest(".mmrc-f");
      if (!tile || tile.contains(pop)) return;
      const col = tile.closest(".mmrc-col");
      const d = col && colData.get(col);
      const f = d && d.byCode.get(tile.dataset.code);
      if (f) {
        pop.innerHTML = function(f, cabinMeta, base) {
          const svc = servicesHtml(f, base, !1);
          return `<div class="mmrc-pop-h"><b>${esc(cabinMeta.name)} ${esc(f.tier || "")}</b>` + (svc.ups ? `<span>${T("▲ mehr als {tier}", {
            tier: esc(base.tier || "")
          })}</span>` : "") + `</div>` + (f.pax ? `<div class="mmrc-blk"><div class="mmrc-cap">${T("Preis")} <i>${T("je Person")}</i></div>${function(f) {
            const groups = paxGroups(f);
            const lead = paxLeadGroup(groups);
            return `<table class="mmrc-ptab">${groups.map(g => `<tr${asTotal(f) || g !== lead ? "" : ' class="is-shown"'}>` + `<td class="mmrc-pw">${g.count} × ${esc(g.companion ? T("Companion") : paxLabel(g.type) || g.type || T("Reisender"))}` + (!g.companion && paxAge(g.type) ? ` <small>${paxAge(g.type)}</small>` : "") + `</td>` + `<td class="mmrc-pm">${null != g.miles ? esc(num(g.miles)) : "–"}</td>` + `<td class="mmrc-pe">${null != g.cash ? esc(cashLabel(g.cash, f.currency)) : ""}</td></tr>`).join("")}` + `<tr class="is-sum${asTotal(f) ? " is-shown" : ""}"><td class="mmrc-pw">${T("Gesamt")}</td>` + `<td class="mmrc-pm">${null != f.totalMiles ? esc(num(f.totalMiles)) : "–"}</td>` + `<td class="mmrc-pe">${null != f.totalCash ? esc(cashLabel(f.totalCash, f.currency)) : ""}</td></tr></table>`;
          }(f)}</div>` : "") + `<div class="mmrc-blk"><div class="mmrc-cap">${T("Leistungen")}</div>${svc.html}</div>`;
        }(f, d.meta, d.base);
        tile.appendChild(pop);
      }
    }
    function onSeatHover(e) {
      const btn = e.target;
      if (!btn.classList || !btn.classList.contains("mmrc-seatbtn")) return;
      const sm = window.__mmSeatmap;
      if (!sm || !seatmapOn()) return;
      if ("mouseleave" === e.type) {
        sm.hidePeek();
        return;
      }
      const it = cardItem.get(btn.closest(".mmrc-card"));
      it && sm.peek(btn, it.legs, Number(btn.dataset.leg));
    }
    function cardEl(it, cabins, dicts, searched) {
      const li = document.createElement("li");
      li.className = "mmrc-card";
      li.dataset.key = it.key;
      const left = document.createElement("div");
      left.className = "mmrc-left";
      const stopsLabel = 0 === it.stops ? T("Direktflug") : Tn(it.stops, "{n} Stopp", "{n} Stopps");
      left.innerHTML = `<div class="mmrc-meta">` + `<span class="mmrc-dur">${esc(fmtDur(it.totalDuration))}</span>` + `<span class="mmrc-stops">${esc(stopsLabel)}</span>` + `</div>` + timelineHtml(it);
      const byCabin = {};
      (it.fares || []).forEach(f => {
        f.cabin && (byCabin[f.cabin] = byCabin[f.cabin] || []).push(f);
      });
      Object.keys(byCabin).forEach(c => byCabin[c].sort((a, b) => a.miles - b.miles));
      const cols = document.createElement("div");
      cols.className = "mmrc-cols";
      cols.style.gridTemplateColumns = `repeat(${cabins.length}, minmax(0, 168px))`;
      const axis = function(byCabin, cabins) {
        const seen = [];
        cabins.forEach(c => (byCabin[c] || []).forEach(f => {
          const t = f.tier || "";
          t && -1 === seen.indexOf(t) && seen.push(t);
        }));
        const rank = t => {
          const i = TIER_ORDER.indexOf(t);
          return -1 === i ? TIER_ORDER.length + seen.indexOf(t) : i;
        };
        return seen.sort((a, b) => rank(a) - rank(b));
      }(byCabin, cabins);
      axis.length && (cols.style.gridTemplateRows = `auto auto repeat(${axis.length}, auto) 1fr auto`);
      cabins.forEach(c => cols.appendChild(function(cabin, fares, dicts, searched, boundKey, axis) {
        const meta = CABIN[cabin];
        const col = document.createElement("div");
        col.className = "mmrc-col" + (fares.length ? "" : " is-empty") + (searched && cabin === searched ? " is-searched" : "");
        col.dataset.cabin = cabin;
        col.style.setProperty("--mmc", meta.color);
        const cashes = fares.map(shownCash).filter(v => null != v);
        const cash = cashes.length ? Math.min(...cashes) : null;
        const cur = fares.length ? fares[0].currency : null;
        const uniform = fares.every(f => null == shownCash(f) || shownCash(f) === cash);
        const cashWord = fares.some(asTotal) ? T(uniform ? "Zuzahlung gesamt" : "Zuzahlung gesamt ab") : T(uniform ? "Zuzahlung" : "Zuzahlung ab");
        const base = fares.slice().sort((a, b) => (a.miles ?? 1 / 0) - (b.miles ?? 1 / 0))[0] || null;
        const seatMin = fares.reduce((m, f) => null != f.seatsLeft && (null == m || f.seatsLeft < m) ? f.seatsLeft : m, null);
        let html = `<div class="mmrc-h"><div class="mmrc-nm" data-instead="${T("statt der gesuchten")}">${esc(meta.name)}</div>` + (null != seatMin ? `<span class="mmrc-seats${seatMin <= 3 ? " is-low" : ""}${seatMin >= 9 ? " is-many" : ""}">` + (1 === seatMin ? T("nur noch 1 Platz") : seatMin >= 9 ? T("9+ Plätze") : Tn(seatMin, "{n} Platz übrig", "{n} Plätze übrig")) + `</span>` : fares.length ? `<span class="mmrc-seats is-many" title="${T("Miles &amp; More nennt die genaue Platzzahl erst bei 6 oder weniger.")}">${T("7+ Plätze")}</span>` : "") + (null != cash ? `<div class="mmrc-cash" data-label="${cashWord}">` + `${esc(cashLabel(cash, cur))}</div>` : "") + `</div>`;
        const mixed = fares.find(f => f.mixed);
        if (mixed) {
          const segs = mixed.perLeg.map(l => {
            const note = function(cabin, leg, dicts) {
              if (!leg) return null;
              const loc = dicts?.location || {};
              const c1 = loc[leg.from]?.countryCode, c2 = loc[leg.to]?.countryCode;
              return c1 && c2 ? "first" === cabin && NA.has(c1) && NA.has(c2) && (leg.duration || 0) < 6 * 3600 ? T("US-Dom.") : "business" === cabin && EU.has(c1) && EU.has(c2) && (leg.duration || 0) < 4 * 3600 ? T("Europa") : null : null;
            }(l.cabin, l, dicts);
            const lower = CABIN[l.cabin]?.rank < meta.rank;
            const label = CABIN[l.cabin]?.name || l.cabin;
            const cls = note ? "is-note" : lower ? "is-down" : "";
            const segTitle = [ placeName(l.from), placeName(l.to) ];
            return `<div class="mmrc-seg"><span` + (segTitle[0] && segTitle[1] ? ` data-place="${esc(segTitle[0])} → ${esc(segTitle[1])}"` : "") + `>${esc(l.from)}→${esc(l.to)}</span>` + `<em class="${cls}">${esc(label)}${note ? " · " + esc(note) : lower ? " ↓" : ""}</em></div>`;
          }).join("");
          html += `<div class="mmrc-segs"><span class="mmrc-lbl">${T("Gemischte Kabinen")}</span>${segs}</div>`;
        } else html += `<div class="mmrc-segs"></div>`;
        html += fares.length ? `<div class="mmrc-body"><div class="mmrc-flist">` + (axis && axis.length ? axis : fares.map(f => f.tier || "")).map(tier => {
          const f = fares.filter(x => (x.tier || "") === tier).sort((a, b) => a.miles - b.miles)[0];
          return f ? `<div class="mmrc-f" data-code="${esc(f.code)}">` + `<span class="mmrc-ti">${esc(tier)}</span>` + `<span class="mmrc-mi">${num(shownMiles(f))}</span>` + `</div>` : `<div class="mmrc-f is-gap" aria-hidden="true"></div>`;
        }).join("") + `</div></div>` : `<div class="mmrc-none">${T("kein Angebot")}</div>`;
        let note = "";
        searched && cabin !== searched && (note = T(fares.length ? "Alle {cabin}-Tarife erscheinen erst bei einer {cabin}-Suche." : "Eine eigene {cabin}-Suche kann weitere Tarife finden.", {
          cabin: esc(meta.name)
        }));
        html += `<div class="mmrc-note">${note}</div>`;
        const flip = document.createElement("div");
        flip.className = "mmrc-colflip";
        const front = document.createElement("div");
        front.className = "mmrc-colface mmrc-colface-front";
        front.innerHTML = html;
        flip.appendChild(front);
        col.appendChild(flip);
        colData.set(col, {
          meta: meta,
          base: base,
          boundKey: boundKey,
          byCode: new Map(fares.map(f => [ f.code, f ]))
        });
        return col;
      }(c, byCabin[c] || [], dicts, searched, it.key, axis)));
      cols.style.setProperty("--mm-n", cabins.length);
      const fromMiles = {};
      cabins.forEach(c => {
        const shown = (byCabin[c] || []).filter(f => !axis.length || axis.includes(f.tier || "")).map(shownMiles).filter(v => v > 0);
        fromMiles[c] = shown.length ? Math.min(...shown) : 1 / 0;
      });
      !function(cols, pickKey, searched, fromMiles) {
        const all = [ ...cols.querySelectorAll(".mmrc-col") ];
        if (!all.length) return;
        const milesOf = c => fromMiles[c.dataset.cabin];
        const filled = all.filter(c => !c.classList.contains("is-empty"));
        let active = all.find(c => c.dataset.cabin === pickedCabin.get(pickKey));
        active || (active = filled.find(c => c.classList.contains("is-searched")));
        if (!active) {
          active = filled.slice().sort((a, b) => milesOf(a) - milesOf(b))[0] || all[0];
          const filteredOut = !(!view.cabins || !searched || view.cabins.has(searched));
          filled.length && !filteredOut && active.classList.add("is-fallback");
        }
        active.classList.add("is-current");
        if (all.length < 2) return;
        const bar = document.createElement("div");
        bar.className = "mmrc-cabpick";
        const chip = c => {
          const m = milesOf(c);
          const b = document.createElement("button");
          b.type = "button";
          b.className = "mmrc-cab" + (c.classList.contains("is-empty") ? " is-empty" : "");
          b.dataset.cabin = c.dataset.cabin;
          b.style.setProperty("--mmc", c.style.getPropertyValue("--mmc"));
          b.innerHTML = "<i>" + esc(CABIN[c.dataset.cabin].name) + "</i>" + "<b>" + (m === 1 / 0 ? "–" : num(m)) + "</b>";
          return b;
        };
        const draw = () => {
          const now = all.find(c => c.classList.contains("is-current"));
          bar.replaceChildren(...all.filter(c => c !== now).map(chip));
        };
        pickerOf.set(bar, {
          pick: cabin => {
            const c = all.find(x => x.dataset.cabin === cabin);
            if (c) {
              all.forEach(x => x.classList.remove("is-current", "is-fallback"));
              c.classList.add("is-current");
              pickedCabin.set(pickKey, cabin);
              draw();
            }
          }
        });
        draw();
        cols.appendChild(bar);
      }(cols, it.key + "|" + (it.depDate || ""), searched, fromMiles);
      li.appendChild(left);
      li.appendChild(cols);
      cardItem.set(li, it);
      return li;
    }
    document.addEventListener("keydown", e => {
      "Escape" === e.key && closeFarePop();
    }, {
      signal: abort.signal
    });
    const pickedCabin = new Map;
    const view = {
      cmp: null,
      pred: null,
      cabins: null
    };
    state.setView = v => {
      view.cmp = v?.cmp || null;
      view.pred = v?.pred || null;
      view.cabins = v?.cabins || null;
      render();
    };
    state.items = () => {
      const bd = boundsData();
      const map = bd.bounds;
      return map && Array.isArray(bd.current) ? bd.current.map(k => map.get(k)).filter(Boolean) : [];
    };
    state.priceMode = () => priceMode;
    state.setPriceMode = m => {
      priceMode = "total" === m ? "total" : "adult";
      try {
        localStorage.setItem(PM_KEY, priceMode);
      } catch (e) {}
      scheduleRender();
    };
    state.paxHeads = () => {
      for (const it of state.items()) {
        const f = (it.fares || []).find(x => x.pax);
        if (f) return paxHeads(f);
      }
      return 1;
    };
    const renderHooks = [];
    state.onRender = fn => {
      renderHooks.push(fn);
      return () => {
        const i = renderHooks.indexOf(fn);
        i >= 0 && renderHooks.splice(i, 1);
      };
    };
    function resultsHost() {
      const oc = document.querySelector("div.offer-container");
      if (!oc) return document.querySelector(".upsell-premium-pres-container");
      const kids = [ ...oc.children ];
      let host = kids.find(k => k.classList.contains("mm-results")) || null;
      const block = kids.find(k => [ ...k.children ].some(c => "refx-upsell-premium-cont" === c.localName));
      if (host && !(block && block.compareDocumentPosition(host) & Node.DOCUMENT_POSITION_FOLLOWING)) return host;
      if (!host) {
        host = document.createElement("div");
        host.className = "mm-results";
      }
      const cal = block ? null : kids.filter(k => "refx-calendar-cont" === k.localName || k.classList.contains("mmcal")).pop();
      oc.insertBefore(host, block || (cal ? cal.nextSibling : null));
      return host;
    }
    let sizeWatch = null, sizeHost = null;
    function listEl() {
      const host = resultsHost();
      if (!host) return null;
      host.parentNode && (state._skelAnchor = host.parentNode);
      !function(host) {
        if (host !== sizeHost) {
          sizeHost = host;
          if ("function" == typeof ResizeObserver) {
            if (!sizeWatch) {
              sizeWatch = new ResizeObserver(entries => {
                const w = entries[entries.length - 1].target.offsetWidth;
                w && (state._skelWidth = w);
              });
              abort.signal.addEventListener("abort", () => sizeWatch.disconnect());
            }
            sizeWatch.disconnect();
            sizeWatch.observe(host);
          } else state._skelWidth = host.offsetWidth || state._skelWidth;
        }
      }(host);
      let list = host.querySelector(".mmrc-list");
      if (!list) {
        document.querySelectorAll(".mmrc-list").forEach(e => e.remove());
        list = document.createElement("ol");
        list.className = "mmrc-list";
        list.setAttribute("aria-label", T("Prämienflüge"));
        list.addEventListener("error", e => {
          e.target.matches?.("img.mmrc-logo") && swapLogo(e.target);
        }, !0);
        list.addEventListener("click", onListClick);
        list.addEventListener("mouseover", onListOver);
        list.addEventListener("mouseenter", onSeatHover, !0);
        list.addEventListener("mouseleave", onSeatHover, !0);
        host.appendChild(list);
      }
      return list;
    }
    let searching = 0;
    let noOffer = null;
    state.showNoOffer = text => {
      if (state.superseded || !cardsOn()) return !1;
      if (!listEl()) return !1;
      noOffer = text ? String(text) : null;
      render();
      return !0;
    };
    function restartSearch() {
      try {
        const e = storedSearch();
        const search = {
          itineraries: (e.itineraries || []).map(i => ({
            originLocationCode: i.originLocationCode,
            destinationLocationCode: i.destinationLocationCode,
            departureDateTime: i.departureDateTime
          })),
          travelers: e.travelers || [ {
            passengerTypeCode: "ADT"
          } ]
        };
        e.cabin && (search.cabin = e.cabin);
        e.commercialFareFamilies && (search.commercialFareFamilies = e.commercialFareFamilies);
        const lang = document.documentElement.lang || "de-DE";
        const country = (lang.split("-")[1] || "DE").toLowerCase();
        const form = document.createElement("form");
        form.method = "POST";
        form.action = "https://shop.miles-and-more.com/reward/reward/availability?lang=" + encodeURIComponent(lang) + "&portalCountry=" + encodeURIComponent(country);
        form.style.display = "none";
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = "search";
        input.value = JSON.stringify(search);
        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
        return !0;
      } catch (err) {
        return !1;
      }
    }
    function skelHtml() {
      const card = '<div class="mmrc-skel-card">' + '<div class="mmrc-skel-tl"><i></i><i></i><i></i></div>' + '<div class="mmrc-skel-col"></div><div class="mmrc-skel-col"></div></div>';
      return '<div class="mmrc-bar-text">' + T("Flüge werden gesucht …") + "</div>" + '<div class="mmrc-skel">' + card + card + card + "</div>";
    }
    function skeleton(list) {
      list.innerHTML = "<li>" + skelHtml() + "</li>";
    }
    const FLOAT_ID = "mmrc-skel-float";
    function showFloatSkel() {
      if (document.getElementById(FLOAT_ID)) return;
      let fallback = null;
      document.querySelectorAll(".main-content").forEach(e => {
        (!fallback || e.offsetWidth < fallback.offsetWidth) && (fallback = e);
      });
      const host = state._skelAnchor && state._skelAnchor.isConnected && state._skelAnchor || fallback || document.body;
      const div = document.createElement("div");
      div.id = FLOAT_ID;
      if (state._skelWidth) {
        div.style.width = Math.round(state._skelWidth) + "px";
        div.style.maxWidth = "100%";
        div.style.margin = "0 auto";
      }
      div.innerHTML = skelHtml();
      host.appendChild(div);
    }
    function hideFloatSkel() {
      const e = document.getElementById(FLOAT_ID);
      e && e.remove();
    }
    const jwtPayload = jwt => JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    function pricedOffice() {
      try {
        const api = boundsData().api;
        const h = api?.headers || {};
        const key = Object.keys(h).find(k => "authorization" === k.toLowerCase());
        const jwt = String(h[key]).replace(/^Bearer\s+/i, "");
        const ctx = JSON.parse(jwtPayload(jwt).context);
        return {
          office: ctx.officeId || null,
          country: ctx.country || null
        };
      } catch (e) {
        return null;
      }
    }
    function officeNoteEl(all) {
      if (window.__mmSettings && !1 === window.__mmSettings.get("officeNote")) return null;
      const fx = window.__mmCurrency;
      const shown = fx?.target ? fx.target() : "EUR";
      let foreign = null, priced = !1;
      outer: for (const it of all) for (const f of it.fares || []) {
        f.currency && (priced = !0);
        if (f.currency && f.currency !== shown) {
          foreign = f.currency;
          break outer;
        }
      }
      const off = function() {
        try {
          const all = JSON.parse(sessionStorage.getItem("gateway-auth-tokens") || "{}");
          for (const k of Object.keys(all)) {
            const tok = all[k] && all[k].token;
            if ("string" != typeof tok || 3 !== tok.split(".").length) continue;
            const pl = jwtPayload(tok);
            const ctx = "string" == typeof pl.context ? JSON.parse(pl.context) : pl.context || {};
            if (ctx && ctx.officeId) return {
              office: String(ctx.officeId),
              country: ctx.country || null
            };
          }
        } catch (e) {}
        return pricedOffice();
      }();
      const pr = pricedOffice();
      const stale = !!(pr && pr.office && off && off.office && pr.office !== off.office);
      const S = window.__mmSettings;
      const dep = function() {
        try {
          const code = (storedSearch().itineraries || [])[0].originLocationCode;
          const loc = boundsData().dictionaries?.location || {};
          return loc[code]?.countryCode || window.__mmIata?.isoOf?.(code) || null;
        } catch (e) {
          return null;
        }
      }();
      const abroad = o => {
        const c = o && o.office ? (o => {
          try {
            return (S?.officeIso ? S.officeIso(o.office) : window.__mmIata?.isoOf?.(o.office.slice(0, 3))) || null;
          } catch (e) {
            return null;
          }
        })(o) : null;
        return !!c && !!dep && c !== dep;
      };
      if (!(abroad(off) || stale && abroad(pr))) return null;
      let chosen = "";
      try {
        chosen = S?.get ? String(S.get("office") || "") : "";
      } catch (e) {}
      const labelOf = o => {
        let name = null;
        try {
          name = S?.officeName ? S.officeName(o.office) : null;
        } catch (e) {}
        return o.office.slice(0, 3) + (name ? " (" + name + ")" : "");
      };
      const officeLabel = esc(labelOf(off));
      if (!foreign) {
        const li = document.createElement("li");
        li.className = "mmrc-msg mmrc-office";
        li.innerHTML = stale ? T("Buchungsbüro {office}: diese Ergebnisse stammen noch aus Büro {from}. Eine neue Suche rechnet im aktuellen Büro.", {
          office: officeLabel,
          from: esc(labelOf(pr))
        }) : priced ? T("Buchungsbüro {office}: Zuzahlungen in {currency}.", {
          office: officeLabel,
          currency: esc(shown)
        }) : T("Buchungsbüro {office}.", {
          office: officeLabel
        });
        return li;
      }
      const converts = (() => {
        try {
          return !(!fx || !fx.convert || null == fx.convert(1, foreign));
        } catch (e) {
          return !1;
        }
      })();
      const li = document.createElement("li");
      li.className = "mmrc-msg mmrc-office";
      const cur = esc(foreign);
      const hint = !abroad(off) || chosen ? "" : " " + T("Es gilt für die ganze Sitzung und wechselt nicht mit dem Abflugort. Im Panel umstellbar.");
      const p = {
        office: officeLabel,
        from: esc(labelOf(pr)),
        currency: cur,
        target: esc(fx?.sign ? fx.sign() : "€")
      };
      li.innerHTML = stale ? T(converts ? "Buchungsbüro {office}: diese Ergebnisse sind noch unter Büro {from} in {currency} berechnet (Anzeige in {target} umgerechnet). Eine neue Suche rechnet im aktuellen Büro." : "Buchungsbüro {office}: diese Ergebnisse sind noch unter Büro {from} in {currency} berechnet. Eine neue Suche rechnet im aktuellen Büro.", p) : T(converts ? "Buchungsbüro {office}: Zuzahlungen werden in {currency} berechnet (Anzeige in {target} umgerechnet)." : "Buchungsbüro {office}: Zuzahlungen werden in {currency} berechnet.", p) + hint;
      return li;
    }
    try {
      document.documentElement.classList.remove("mmrc-owns-empty");
    } catch (e) {}
    let lastAll = [];
    function refreshOfficeNote() {
      const old = document.querySelector(".mmrc-list .mmrc-office:not(.mmrc-returnnote)");
      if (!old) return !1;
      const fresh = officeNoteEl(lastAll);
      fresh ? old.replaceWith(fresh) : old.remove();
      return !0;
    }
    window.addEventListener("mm:office", () => {
      try {
        refreshOfficeNote() || scheduleRender();
      } catch (e) {}
    }, {
      signal: abort.signal
    });
    function listSide() {
      try {
        const its = storedSearch().itineraries || [];
        if (its.length < 2) return "outbound";
        const bd = boundsData();
        const key = bd?.current?.[0];
        const first = key ? bd.bounds instanceof Map ? bd.bounds.get(key) : bd.bounds[key] : null;
        if (!first) return null;
        const loc = bd.dictionaries?.location || {};
        const same = (iata, code) => !(!iata || !code || iata !== code && (!loc[iata] || loc[iata].cityCode !== code));
        return same(first.origin, its[1].originLocationCode) ? "return" : same(first.origin, its[0].originLocationCode) ? "outbound" : null;
      } catch (e) {
        return null;
      }
    }
    let restartDialogSeen = !1;
    const msgLi = cls => {
      const li = document.createElement("li");
      li.className = "mmrc-msg" + (cls ? " " + cls : "");
      return li;
    };
    const emptyList = () => {
      state.counts.shown = 0;
      state.counts.total = 0;
      emitRender();
    };
    function render() {
      if (state.superseded || !cardsOn()) return;
      const list = listEl();
      if (!list) {
        searching ? showFloatSkel() : hideFloatSkel();
        return;
      }
      hideFloatSkel();
      injectStyles();
      document.documentElement.classList.add("mmrc-active");
      if (searching) {
        list.querySelector(".mmrc-skel") || skeleton(list);
        return;
      }
      renders++;
      const lastErr = boundsData()?.lastError;
      if (lastErr) {
        list.innerHTML = "";
        const li = msgLi("mmrc-nooffer");
        const expired = "65012" === String(lastErr.code);
        const noFlight = "7959" === String(lastErr.code);
        const transport = !!lastErr.transport;
        const blocked = transport && (429 === lastErr.http || !lastErr.http);
        const seg = /SEGMENT (\d)/.exec(lastErr.detail || "");
        const bannerOwned = transport && !(!window.__mmRecovery || !window.__mmRecovery.version);
        const text = expired ? T("Der gewählte Hinflug ist abgelaufen.") : noFlight ? T(seg && "2" === seg[1] ? "Kein Flug für den Rückflug an diesem Tag." : "Kein Flug für den Hinflug an diesem Tag.") : transport && lastErr.title ? lastErr.title + (lastErr.why ? "\n" + lastErr.why : "") : lastErr.code ? T("Suche fehlgeschlagen ({detail}).", {
          detail: lastErr.code + (lastErr.detail ? ": " + lastErr.detail : "")
        }) : T("Suche fehlgeschlagen.");
        li.innerHTML = (bannerOwned ? "" : esc(text)) + (noFlight || blocked ? "" : '<button type="button" class="mmrc-restart">' + T("Suche neu starten") + "</button>");
        const rb = li.querySelector(".mmrc-restart");
        rb && rb.addEventListener("click", restartSearch);
        li.innerHTML && list.appendChild(li);
        emptyList();
        return;
      }
      if (noOffer) {
        list.innerHTML = "";
        const li = msgLi("mmrc-nooffer");
        li.textContent = noOffer;
        list.appendChild(li);
        emptyList();
        return;
      }
      const all = state.items();
      state.counts.total = all.length;
      if (!all.length) {
        list.innerHTML = "";
        lastAll = [];
        const note = officeNoteEl([]);
        note && list.appendChild(note);
        const un = boundsData().unavailable;
        if (un && un.total) {
          const reasons = Object.keys(un.reasons);
          const li = msgLi("mmrc-unavailable");
          li.textContent = 1 === reasons.length ? Tn(un.total, "Eine Verbindung gefunden, {reasons}.", "{n} Verbindungen gefunden, {reasons}.", {
            reasons: reasonText(reasons[0])
          }) : Tn(un.total, "Eine Verbindung gefunden, keine buchbar: {reasons}.", "{n} Verbindungen gefunden, keine buchbar: {reasons}.", {
            reasons: reasons.map(r => un.reasons[r] + " " + reasonText(r)).join(", ")
          });
          list.appendChild(li);
        }
        emptyList();
        return;
      }
      let items = view.pred ? all.filter(view.pred) : all;
      state.counts.shown = items.length;
      view.cmp && (items = items.slice().sort(view.cmp));
      !function() {
        const img = document.querySelector('img[src*="/assets/img/airlines/icon-"]');
        const m = img && /^(.*\/assets\/img\/airlines\/)icon-/.exec(img.src);
        if (m && m[1] !== logoBase) {
          logoBase = m[1];
          try {
            localStorage.setItem(LOGO_KEY, logoBase);
          } catch (e) {}
        }
      }();
      const searched = function() {
        try {
          for (const code of storedSearch().commercialFareFamilies || []) {
            const hit = CFF_CABIN.find(([re]) => re.test(code));
            if (hit) return hit[1];
          }
        } catch (e) {}
        return null;
      }();
      const dicts = boundsData().dictionaries;
      const cabinsAll = function(items) {
        return ORDER.filter(c => items.some(it => (it.fares || []).some(f => f.cabin === c)));
      }(all);
      const cabins = view.cabins ? cabinsAll.filter(c => view.cabins.has(c)) : cabinsAll;
      list.innerHTML = "";
      if (searched && !cabinsAll.includes(searched)) {
        const li = msgLi("mmrc-nofare");
        li.textContent = T("In der {cabin} Class gibt es an diesem Tag keine Prämienflüge. Die Karten zeigen die übrigen Kabinen.", {
          cabin: CABIN[searched].name
        });
        list.appendChild(li);
      }
      lastAll = all;
      const officeNote = officeNoteEl(all);
      officeNote && list.appendChild(officeNote);
      const returnNote = function() {
        let pick = null;
        try {
          pick = JSON.parse(sessionStorage.getItem("mmrc_outbound_pick"));
        } catch (e) {}
        if (!pick || !pick.code) return null;
        const side = listSide();
        if ("return" !== side) {
          if ("outbound" === side) try {
            sessionStorage.removeItem("mmrc_outbound_pick");
          } catch (e) {}
          return null;
        }
        const meta = pick.cabin ? CABIN[pick.cabin] : null;
        const label = ((meta ? meta.name : pick.cabin || "") + " " + (pick.tier || "")).trim();
        const li = document.createElement("li");
        li.className = "mmrc-msg mmrc-office mmrc-returnnote";
        const back = document.querySelector("button.upsell-back-button");
        li.innerHTML = T("Gewählter Hinflug: <b>{label}</b>. Die Rückflüge unten gelten zu diesem Hinflug.", {
          label: esc(label || pick.code)
        }) + (back ? ' <button type="button" class="mmrc-outbound-edit">' + T("Hinflug ändern") + "</button>" : "");
        const b = li.querySelector(".mmrc-outbound-edit");
        b && b.addEventListener("click", () => {
          const btn = document.querySelector("button.upsell-back-button");
          btn && btn.click();
        });
        return li;
      }();
      returnNote && list.appendChild(returnNote);
      if (items.length) items.forEach(it => {
        try {
          list.appendChild(cardEl(it, cabins, dicts, searched));
        } catch (e) {}
      }); else {
        const li = msgLi();
        li.innerHTML = T("Kein Flug entspricht den Filtern.") + '<button type="button" class="mmrc-reset-filter">' + T("Filter zurücksetzen") + "</button>";
        li.querySelector(".mmrc-reset-filter").addEventListener("click", () => {
          resetHooks.forEach(fn => {
            try {
              fn();
            } catch (e) {}
          });
        });
        list.appendChild(li);
      }
      state.rendered++;
      restoreBooking();
      emitRender();
    }
    function restoreBooking() {
      if (!pendingBooking) return;
      const list = listEl();
      if (!list) {
        note("restore: keine Liste");
        return;
      }
      const cards = [ ...list.querySelectorAll(".mmrc-card") ];
      const card = cards.find(c => c.dataset.key === pendingBooking.key);
      if (!card) {
        note("restore: Karte fehlt (" + cards.length + " Karten)");
        return;
      }
      const tile = [ ...card.querySelectorAll(".mmrc-f[data-code]") ].find(t => t.dataset.code === pendingBooking.code);
      if (!tile) {
        note("restore: Tarif fehlt");
        return;
      }
      note("restore: " + (pendingBooking.refused ? "Ablehnung" : pendingBooking.text));
      const col = tile.closest(".mmrc-col");
      col.classList.add("mmrc-instant");
      const back = col.querySelector(".mmrc-colface-back");
      back && back.dataset.code === pendingBooking.code || tile.click();
      const btn = col.querySelector(".mmrc-fchoose");
      if (btn) if (pendingBooking.refused) !function(col, btn, p) {
        const flashing = Date.now() - (p.refusedAt || 0) < REFUSAL_FLASH_MS;
        btn.disabled = !1;
        btn.classList.toggle("is-error", flashing);
        btn.textContent = T(flashing ? "Nicht buchbar" : "Wählen");
        let el = col.querySelector(".mmrc-fback-note");
        if (!el) {
          el = document.createElement("div");
          el.className = "mmrc-fback-note";
          btn.insertAdjacentElement("beforebegin", el);
        }
        el.textContent = p.refused;
      }(col, btn, pendingBooking); else {
        btn.disabled = !0;
        btn.textContent = pendingBooking.text;
      }
      requestAnimationFrame(() => requestAnimationFrame(() => col.classList.remove("mmrc-instant")));
    }
    const emitRender = () => renderHooks.forEach(fn => {
      try {
        fn(state.counts);
      } catch (e) {}
    });
    const resetHooks = [];
    state.onFilterReset = fn => {
      resetHooks.push(fn);
      return () => {
        const i = resetHooks.indexOf(fn);
        i >= 0 && resetHooks.splice(i, 1);
      };
    };
    let renderQueued = !1, renders = 0;
    function scheduleRender() {
      if (renderQueued) return;
      renderQueued = !0;
      const at = renders;
      Promise.resolve().then(() => {
        renderQueued = !1;
        renders === at && render();
      });
    }
    const bd = window.__mmBounds;
    if (bd) {
      bd.onUpdate && (state._offData = bd.onUpdate(() => {
        noOffer = null;
        pendingBooking && "outbound" === listSide() && bd.listSig !== pendingBooking.listSig && !bookingInFlight() && (pendingBooking = null);
        scheduleRender();
      }));
      bd.onCart && (state._offCart = bd.onCart(onCartAnswer));
      bd.onRequest && (state._offReq = bd.onRequest((active, meta) => {
        searching = Math.max(0, searching + (active ? 1 : -1));
        if (!state.superseded && cardsOn()) if (active) {
          if ((!meta || meta.fresh && meta.sig !== bd.listSig) && !bookingInFlight()) {
            pendingBooking = null;
            try {
              sessionStorage.removeItem("mmrc_outbound_pick");
            } catch (e) {}
          }
          noOffer = null;
          const list = listEl();
          injectStyles();
          list ? skeleton(list) : showFloatSkel();
        } else scheduleRender();
      }));
    }
    window.__mmCurrency?.onUpdate && (state._offFx = window.__mmCurrency.onUpdate(scheduleRender));
    const obs = new MutationObserver(records => {
      if (state.superseded) return;
      if (records.every(r => (node => {
        const el = 1 === node.nodeType ? node : node.parentElement;
        return !!el && !!el.closest(".mmrc-list, .mmsm-overlay, .mmsm-peek, #" + FLOAT_ID);
      })(r.target))) return;
      pendingBooking && !/\/availability\b/.test(location.pathname) && (pendingBooking = null);
      if (!cardsOn()) return;
      if ((pendingBooking || restartDialogSeen) && document.querySelector("refx-confirm-restart-flight-selection-dialog-pres")) restartDialogSeen = !0; else if (restartDialogSeen) {
        restartDialogSeen = !1;
        setTimeout(() => {
          if (pendingBooking && !searching && "outbound" === listSide()) {
            pendingBooking = null;
            scheduleRender();
          }
        }, 600);
      }
      checkRefusal();
      hideShownRefusal();
      const host = resultsHost();
      host && !host.querySelector(".mmrc-list") && render();
    });
    state._observer = obs;
    state._setPending = p => {
      pendingBooking = p;
    };
    state._pending = () => pendingBooking;
    state._restoreBooking = restoreBooking;
    state.refreshOfficeNote = refreshOfficeNote;
    state._trace = trace;
    state._checkRefusal = checkRefusal;
    state._hideShownRefusal = hideShownRefusal;
    state._css = CSS;
    state._nativeCardFor = nativeCardFor;
    state._onCartAnswer = onCartAnswer;
    state._milesBalance = milesBalance;
    state._book = book;
    state._shortAircraft = shortAircraft;
    state._balanceHtml = balanceHtml;
    state._apiGet = apiGet;
    state.apiGet = apiGet;
    state.cashLabel = cashLabel;
    state.shortAircraft = shortAircraft;
    state._injectStyles = injectStyles;
    state.destroy = () => {
      document.documentElement.classList.remove("mmrc-active");
      document.querySelectorAll(".mmrc-list, .mmsm-overlay, .mmsm-peek").forEach(e => e.remove());
    };
    window.__mmSettings && (state._offSettings = window.__mmSettings.onChange(k => {
      state.superseded || "results" !== k && "officeNote" !== k || (cardsOn() ? render() : state.destroy());
    }));
    state.render = render;
    state.logoHtml = logoHtml;
    state.swapLogo = swapLogo;
    function boot() {
      if (!state.superseded && cardsOn()) {
        injectStyles();
        document.documentElement.classList.add("mmrc-active");
        obs.observe(document.body, {
          childList: !0,
          subtree: !0
        });
        render();
      }
    }
    "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", boot) : boot();
    try {
      window.addEventListener("pagehide", e => {
        if (!e?.persisted) {
          state.superseded = !0;
          try {
            obs.disconnect();
          } catch (e2) {}
        }
      }, {
        signal: abort.signal
      });
      window.addEventListener("pageshow", e => {
        if (e && e.persisted && state.superseded && window.__mmCards === state) {
          state.superseded = !1;
          boot();
        }
      }, {
        signal: abort.signal
      });
    } catch (e) {}
    state.summary = () => ({
      version: state.version,
      rendered: state.rendered,
      shown: state.counts.shown,
      total: state.counts.total
    });
  })();
  (() => {
    "use strict";
    const VERSION = 135;
    if (window.__mmSeatmap && window.__mmSeatmap.version >= VERSION) return;
    if (window.__mmSeatmap) try {
      window.__mmSeatmap.teardown();
    } catch (e) {}
    const T = (s, p) => window.__mmI18n ? window.__mmI18n.t(s, p) : p ? String(s).replace(/\{(\w+)\}/g, (m, k) => null != p[k] ? String(p[k]) : m) : String(s);
    const abort = new AbortController;
    const state = {
      version: VERSION
    };
    try {
      Object.defineProperty(window, "__mmSeatmap", {
        value: state,
        enumerable: !1,
        configurable: !0
      });
    } catch (e) {
      window.__mmSeatmap = state;
    }
    const INK_primary = "#05164D", INK_secondary = "#52514e", INK_muted = "#898781", INK_hairline = "#e1e0d9", INK_accent = "#1c5cab";
    const CABIN = {
      eco: {
        name: "Economy",
        color: "#4C6E48"
      },
      ecoPremium: {
        name: "Premium Economy",
        color: "#2C5744"
      },
      business: {
        name: "Business",
        color: "#47616C"
      },
      first: {
        name: "First",
        color: "#A54A4A"
      }
    };
    const ORDER = [ "eco", "ecoPremium", "business", "first" ];
    const deckName = type => "main" === type ? T("Hauptdeck") : "upper" === type ? T("Oberdeck") : "lower" === type ? T("Unterdeck") : type;
    const seatChar = k => "L" === k ? T("mehr Beinfreiheit") : "K" === k ? T("Trennwand davor") : "OW" === k ? T("über der Tragfläche") : "1D" === k ? T("Lehne nicht verstellbar") : "E" === k ? T("Notausstiegsreihe") : "B" === k ? T("Babybett möglich") : "H" === k ? T("behindertengerecht") : "O" === k ? T("Vorzugsplatz") : void 0;
    const esc = s => String(null == s ? "" : s).replace(/[&<>"]/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    }[c]));
    const cards = () => window.__mmCards || {};
    const on = () => !window.__mmSettings || !1 !== window.__mmSettings.get("results") && !1 !== window.__mmSettings.get("seatmap");
    const money = (amount, cur) => {
      return cards().cashLabel ? cards().cashLabel(amount, cur) : (o = {
        maximumFractionDigits: 2
      }, window.__mmI18n ? window.__mmI18n.nf(o) : new Intl.NumberFormat("de-DE", o)).format(amount) + " " + (cur || "");
      var o;
    };
    const legKey = leg => (leg.mkt || "") + (leg.mktNo || "") + "|" + (leg.depDate || "");
    const r1 = v => Math.round(10 * v) / 10;
    const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    function readVlq(s, i) {
      let c, z = 0, shift = 0;
      do {
        c = B64.indexOf(s[i++]);
        z |= (31 & c) << shift;
        shift += 5;
      } while (32 & c);
      return [ 1 & z ? -(z >>> 1) : z >>> 1, i ];
    }
    function unpack(s, k) {
      const out = [];
      for (let i = 0, t = 0; i < s.length; ) {
        const [d, next] = readVlq(s, i);
        i = next;
        t += d;
        out.push(t / k);
      }
      return out;
    }
    const SHAPES = {
      a320: {
        nose: [ .7, 1, .9, .84, .77, .71, .65, .58, .5, .4, .28, .12 ],
        tail: [ 1.52, 1, .85, .7, .57, .47, .39, .32, .27, .23 ],
        wing: [ 4.37, 0, .36, .55, .2, .41, .55, .4, .46, .57, .6, .5, .59, .8, .55, .62, 1, .6, .66 ],
        htp: [ 1.16, 0, .87, .96, .2, .89, .97, .4, .9, .97, .6, .92, .98, .8, .93, .98, 1, .95, .99 ]
      },
      a333: {
        nose: [ 1.24, 1, .91, .86, .81, .75, .68, .59, .5, .39, .27, .06 ],
        tail: [ 2.47, 1, .9, .8, .7, .6, .5, .41, .32, .23 ],
        wing: [ 4.48, 0, .37, .53, .2, .39, .54, .4, .45, .56, .6, .5, .59, .8, .56, .62, 1, .64, .66 ],
        htp: [ 1.02, 0, .9, .97, .2, .91, .97, .4, .92, .98, .6, .93, .98, .8, .95, .99, 1, .97, .99 ]
      },
      a343: {
        nose: [ 1.29, 1, .92, .87, .81, .75, .68, .6, .5, .39, .27, .05 ],
        tail: [ 2.51, 1, .9, .8, .7, .6, .5, .41, .32, .23 ],
        wing: [ 4.48, 0, .37, .53, .2, .39, .54, .4, .45, .56, .6, .5, .59, .8, .56, .62, 1, .64, .66 ],
        htp: [ 1, 0, .89, .95, .2, .9, .96, .4, .91, .96, .6, .92, .96, .8, .94, .97, 1, .96, .97 ]
      },
      a359: {
        nose: [ 1.44, 1, .93, .89, .83, .78, .7, .63, .54, .43, .3, .03 ],
        tail: [ 1.78, 1, .85, .7, .58, .48, .4, .33, .27, .23 ],
        wing: [ 4.6, 0, .34, .52, .2, .37, .53, .4, .45, .56, .6, .52, .59, .8, .58, .63, 1, .66, .67 ],
        htp: [ 1.58, 0, .84, .92, .2, .85, .92, .4, .86, .92, .6, .87, .92, .8, .87, .92, 1, .88, .92 ]
      },
      a388: {
        cockpit: "main",
        nose: [ .88, 1, .92, .87, .82, .77, .71, .64, .55, .46, .35, .12 ],
        tail: [ 2.33, 1, .87, .75, .64, .54, .45, .36, .29, .23 ],
        wing: [ 5.25, 0, .36, .64, .2, .45, .67, .4, .51, .71, .6, .57, .75, .8, .68, .79, 1, .81, .82 ],
        htp: [ 1.6, 0, .87, .98, .2, .9, .99, .4, .92, 1, .6, .95, 1.01, .8, .98, 1.02, 1, 1.03, 1.03 ]
      },
      b738: {
        nose: [ 1.41, 1, .91, .85, .8, .74, .67, .6, .51, .41, .29, .07 ],
        tail: [ 1.82, 1, .89, .78, .67, .57, .48, .39, .3, .23 ],
        wing: [ 4.15, 0, .39, .57, .2, .43, .57, .4, .48, .59, .6, .53, .61, .8, .57, .63, 1, .61, .66 ],
        htp: [ 1.32, 0, .87, .95, .2, .88, .95, .4, .9, .96, .6, .91, .96, .8, .92, .97, 1, .94, .97 ]
      },
      b744: {
        cockpit: "upper",
        nose: [ 1.54, 1, .92, .88, .83, .79, .73, .65, .58, .48, .34, .08 ],
        tail: [ 1.81, 1, .9, .81, .71, .61, .52, .42, .33, .23 ],
        wing: [ 4.13, 0, .3, .49, .2, .37, .52, .4, .43, .56, .6, .49, .6, .8, .57, .65, 1, .69, .71 ],
        htp: [ 1.71, 0, .86, .96, .2, .88, .96, .4, .89, .96, .6, .9, .96, .8, .91, .96, 1, .92, .96 ]
      },
      b77w: {
        nose: [ 1.1, 1, .91, .85, .8, .74, .67, .59, .51, .41, .29, .09 ],
        tail: [ 2.06, 1, .86, .73, .61, .51, .42, .34, .28, .23 ],
        wing: [ 4.15, 0, .36, .56, .2, .39, .56, .4, .45, .57, .6, .52, .6, .8, .57, .63, 1, .64, .65 ],
        htp: [ 1.08, 0, .88, .96, .2, .9, .97, .4, .91, .98, .6, .93, .99, .8, .95, .99, 1, .96, 1 ]
      },
      b788: {
        nose: [ 1.2, 1, .94, .9, .85, .8, .72, .64, .55, .43, .28, .05 ],
        tail: [ 1.92, 1, .9, .81, .71, .61, .52, .42, .33, .23 ],
        wing: [ 4.43, 0, .34, .54, .2, .37, .55, .4, .45, .58, .6, .53, .61, .8, .6, .65, 1, .68, .7 ],
        htp: [ 1.01, 0, .88, .96, .2, .89, .96, .4, .91, .97, .6, .93, .98, .8, .96, .98, 1, .99, .99 ]
      }
    };
    const GLASS = {
      a320: {
        len: 1.36,
        nose: "8B8BgCsBkBgBaaWYWUUUUUSSSSQSQQQQOQOOOOMMMMMKKKIKIGGIGEGEEEEEEEECECECCECCCCQ",
        panes: [ [ [ .676, .357 ], [ .822, .406 ], [ .822, .336 ], [ .786, .301 ], [ .676, .259 ] ], [ [ .644, .245 ], [ .577, .208 ], [ .475, .239 ], [ .514, .271 ], [ .57, .308 ], [ .612, .332 ], [ .663, .352 ], [ .663, .254 ] ], [ [ .456, .005 ], [ .335, .005 ], [ .454, .207 ], [ .466, .226 ], [ .571, .196 ] ] ],
        mirror: 1,
        dark: !1
      },
      a330: {
        len: 1.5,
        nose: "I+B0BmBgBccYYWWUSSSSSQQQQQQOQOOOMOOMMMMKMKMKKKIKKIIKIIIGIIIGGIGGGGEGEGEEEEEEECCQ",
        panes: [ [ [ .447, .158 ], [ .415, .149 ], [ .369, .16 ], [ .368, .174 ], [ .47, .222 ], [ .47, .167 ] ], [ [ .594, .243 ], [ .557, .2 ], [ .486, .173 ], [ .486, .23 ], [ .594, .277 ] ], [ [ .256, .007 ], [ .334, .153 ], [ .394, .14 ], [ .331, .007 ] ] ],
        mirror: 1,
        dark: !1
      },
      b737: {
        len: 1.8,
        nose: "a6ByBgBaWUSSQQOQOOQOOMOOMOMOMMMMMMMMKMKMKKKMKKIKKKIKIKIIKIIGIIIIGIGGIGGGGGEGGEEEEEEEECECECCCCQ",
        panes: [ [ [ .412, .014 ], [ .514, .208 ], [ .584, .192 ], [ .489, .015 ] ], [ [ .544, .231 ], [ .647, .279 ], [ .653, .277 ], [ .7, .24 ], [ .694, .236 ], [ .601, .207 ], [ .534, .222 ], [ .534, .226 ] ], [ [ .728, .246 ], [ .721, .247 ], [ .675, .283 ], [ .677, .287 ], [ .813, .314 ], [ .828, .314 ], [ .837, .31 ], [ .838, .288 ], [ .829, .279 ] ] ],
        mirror: 1,
        dark: !1
      },
      b787: {
        len: 1.44,
        nose: "0BuB2BoBiBccYYYWUUUSSQSQOQOOOOOMMMOKMMMKMKKKKKKIKIKIIIIIGIGIGGGGGGEGEEEGCEECEQ",
        panes: [ [ [ .265, .059 ], [ .282, .088 ], [ .303, .114 ], [ .329, .139 ], [ .35, .154 ], [ .377, .157 ], [ .446, .15 ], [ .456, .146 ], [ .452, .136 ], [ .409, .086 ], [ .372, .024 ], [ .362, .015 ], [ .279, .013 ], [ .261, .015 ], [ .256, .021 ], [ .254, .03 ] ], [ [ .554, .218 ], [ .497, .175 ], [ .483, .168 ], [ .405, .174 ], [ .392, .177 ], [ .388, .181 ], [ .39, .187 ], [ .4, .196 ], [ .443, .226 ], [ .507, .262 ], [ .539, .274 ], [ .584, .282 ], [ .592, .28 ], [ .576, .237 ] ] ],
        mirror: 1,
        dark: !1
      },
      a359: {
        len: 1.68,
        nose: "c2ByBkBeaaWWUUSSSQQQQOQOOMOOMMMMMMMKMKMKKKKKKIKIKIIKIIGIIIGIGGIGGGGGGEGEGEEGEECEEECECCCQ",
        panes: [ [ [ .319, .049 ], [ .325, .069 ], [ .339, .092 ], [ .374, .135 ], [ .401, .162 ], [ .411, .165 ], [ .42, .164 ], [ .465, .131 ], [ .467, .122 ], [ .463, .111 ], [ .433, .066 ], [ .408, .02 ], [ .401, .013 ], [ .327, .012 ], [ .318, .025 ] ], [ [ .432, .197 ], [ .455, .219 ], [ .49, .242 ], [ .52, .256 ], [ .53, .258 ], [ .536, .255 ], [ .535, .187 ], [ .525, .172 ], [ .497, .149 ], [ .487, .146 ], [ .478, .147 ], [ .432, .178 ], [ .428, .186 ] ], [ [ .633, .288 ], [ .637, .281 ], [ .635, .269 ], [ .614, .239 ], [ .571, .206 ], [ .561, .202 ], [ .553, .204 ], [ .552, .261 ], [ .555, .266 ], [ .57, .275 ], [ .609, .287 ], [ .623, .29 ] ] ],
        mirror: 1,
        dark: !0
      },
      b777: {
        len: 1.42,
        nose: "O0B0BkBgBcaaYWWWUUUSSSQQQQOOOOMMMMMMKMMMKMKKMKKKKKKKIKIIKIIGIIGGIGGEGGEEEEES",
        panes: [ [ [ .286, .139 ], [ .291, .141 ], [ .342, .112 ], [ .342, .106 ], [ .269, .007 ], [ .206, .007 ], [ .206, .016 ] ], [ [ .418, .18 ], [ .356, .126 ], [ .301, .157 ], [ .333, .191 ], [ .383, .227 ], [ .389, .225 ], [ .419, .183 ] ], [ [ .432, .198 ], [ .403, .239 ], [ .491, .271 ], [ .489, .231 ], [ .438, .194 ], [ .435, .194 ] ] ],
        mirror: 1,
        dark: !1
      },
      b767: {
        len: 1.22,
        nose: "a4B4BqBiBgBcccWYYWUWUUSUSSSSQSOOOOOOMOMMMMKKKKKKIIKIIIGIGGIEGEEGEES",
        panes: [ [ [ .261, .023 ], [ .36, .176 ], [ .37, .18 ], [ .429, .14 ], [ .341, .023 ] ], [ [ .527, .233 ], [ .478, .195 ], [ .448, .163 ], [ .378, .21 ], [ .424, .256 ], [ .483, .295 ], [ .506, .256 ] ], [ [ .548, .249 ], [ .533, .264 ], [ .508, .308 ], [ .619, .348 ], [ .619, .3 ], [ .592, .283 ] ] ],
        mirror: 1,
        dark: !1
      },
      b747: {
        len: 1.82,
        nose: "kB0B6BqBkBiBeaWUUSSQQQOOOMOMMMMKMKMKIKKKIKIIIIKIGIIIGIGIGIGIGEGGEGGGGEGEGEGEGEEEEEEEEEEEECECECECEQ",
        panes: [ [ [ .986, .167 ], [ .921, .146 ], [ .921, .197 ], [ .986, .224 ] ], [ [ .883, .133 ], [ .839, .151 ], [ .828, .158 ], [ .907, .19 ], [ .907, .142 ] ], [ [ .807, .15 ], [ .864, .127 ], [ .834, .109 ], [ .81, .084 ], [ .793, .053 ], [ .784, .017 ], [ .695, .017 ], [ .696, .049 ], [ .701, .072 ], [ .752, .119 ], [ .781, .138 ] ] ],
        mirror: 1,
        dark: !1,
        deck: "upper"
      },
      a380: {
        len: 1.7,
        nose: "8BgCgCsBkBiBccYYWUUUSSQQQOOOMMMMMKKKIIKIIKIIKIIIGIGGIGGIEGGGGEGEGEEEEEGEECEEECECECCECACCACAQ",
        panes: [ [ [ .523, .265 ], [ .523, .235 ], [ .513, .216 ], [ .497, .202 ], [ .464, .178 ], [ .456, .175 ], [ .45, .177 ], [ .45, .238 ], [ .46, .246 ], [ .511, .266 ], [ .52, .267 ] ], [ [ .434, .219 ], [ .434, .159 ], [ .398, .123 ], [ .391, .119 ], [ .384, .121 ], [ .341, .147 ], [ .386, .198 ], [ .422, .223 ], [ .431, .225 ] ], [ [ .359, .116 ], [ .371, .111 ], [ .372, .099 ], [ .313, .01 ], [ .305, .006 ], [ .262, .007 ], [ .258, .015 ], [ .26, .048 ], [ .282, .085 ], [ .306, .114 ], [ .317, .126 ], [ .323, .128 ] ] ],
        mirror: 1,
        dark: !1
      },
      e190: {
        len: 1.7,
        nose: "AgEc6BqBiBiBccYYWUSSQQQOOOQMOOMMOMKMKKKKIKIIIIIIGGGGGGGGGGEEEGGEEGEEEECEECEECECECECCCCCCECA",
        panes: [ [ [ .634, -.032 ], [ .841, -.032 ], [ .854, -.045 ], [ .865, -.103 ], [ .891, -.164 ], [ .955, -.241 ], [ .822, -.316 ], [ .798, -.308 ], [ .745, -.271 ], [ .66, -.175 ], [ .623, -.074 ], [ .621, -.045 ] ], [ [ .886, -.332 ], [ .902, -.316 ], [ .987, -.273 ], [ 1.003, -.273 ], [ 1.162, -.345 ], [ 1.178, -.361 ], [ 1.178, -.416 ], [ 1.154, -.43 ], [ 1.003, -.393 ], [ .91, -.361 ] ] ],
        mirror: 1,
        dark: !1
      },
      dh4: {
        len: 1.32,
        nose: "sBuBuBYYYaWYWWWUWUUUUSSUQSSQQQQOQOOOOOMMMOKMKMKKKIIKIIIGIGGGGEGEEEEECQ",
        panes: [ [ [ .892, .326 ], [ .918, .351 ], [ .943, .367 ], [ .993, .388 ], [ 1.052, .408 ], [ 1.112, .425 ], [ 1.203, .442 ], [ 1.326, .453 ], [ 1.332, .374 ], [ 1.271, .361 ], [ 1.212, .34 ], [ 1.152, .307 ], [ 1.093, .263 ] ], [ [ .892, -.326 ], [ .918, -.351 ], [ .943, -.367 ], [ .993, -.388 ], [ 1.052, -.408 ], [ 1.112, -.425 ], [ 1.203, -.442 ], [ 1.326, -.453 ], [ 1.332, -.374 ], [ 1.271, -.361 ], [ 1.212, -.34 ], [ 1.152, -.307 ], [ 1.093, -.263 ] ], [ [ .668, -.003 ], [ .892, .326 ], [ 1.093, .263 ], [ .9, -.002 ], [ 1.095, -.265 ], [ .893, -.329 ] ] ],
        dark: !1
      },
      b757: {
        len: 1.42,
        nose: "6B0BgCwBkBgBaaYYWWWWWUUUSUSQQQOOOOOOKMMMKKKIIKIIGGIGIGEGEGEGEEEECECECECAEECCAQ",
        panes: [ [ [ .552, .187 ], [ .447, .247 ], [ .476, .279 ], [ .505, .305 ], [ .593, .361 ], [ .669, .288 ], [ .592, .226 ] ], [ [ .552, -.187 ], [ .447, -.247 ], [ .476, -.279 ], [ .505, -.305 ], [ .593, -.361 ], [ .669, -.288 ], [ .592, -.226 ] ], [ [ .447, -.248 ], [ .291, 0 ], [ .447, .247 ], [ .552, .187 ], [ .414, 0 ], [ .552, -.187 ] ] ],
        dark: !1
      },
      erj: {
        len: 1.5,
        nose: "CqCsBeWYYWWUWUUSUSSUSSQSSQQQQQQQMMOMMMKMMKKKKKKKMIGIIIGIIIGGGEGGGGGEEECEEEEEAQ",
        panes: [ [ [ 1.084, .047 ], [ 1.098, .125 ], [ 1.112, .165 ], [ 1.153, .247 ], [ 1.195, .303 ], [ 1.237, .345 ], [ 1.272, .374 ], [ 1.291, .38 ], [ 1.467, .288 ], [ 1.47, .282 ], [ 1.464, .265 ], [ 1.428, .222 ], [ 1.403, .177 ], [ 1.382, .127 ], [ 1.366, .067 ], [ 1.364, .044 ], [ 1.355, .027 ], [ 1.349, .024 ], [ 1.101, .024 ], [ 1.092, .027 ], [ 1.087, .034 ] ], [ [ 1.687, .489 ], [ 1.688, .397 ], [ 1.684, .39 ], [ 1.612, .363 ], [ 1.526, .324 ], [ 1.511, .324 ], [ 1.358, .4 ], [ 1.352, .408 ], [ 1.359, .42 ], [ 1.366, .425 ], [ 1.449, .454 ], [ 1.493, .466 ], [ 1.624, .487 ], [ 1.663, .491 ] ] ],
        mirror: 1,
        dark: !1
      },
      c919: {
        len: .78,
        nose: "asCqC4BuBoBkBiBeeaaYYWWUUSUSQQSOQOOOOMMMMMKMsCCQ",
        panes: [ [ [ .441, .247 ], [ .565, .22 ], [ .569, .212 ], [ .566, .204 ], [ .491, .117 ], [ .458, .07 ], [ .431, .024 ], [ .424, .016 ], [ .414, .013 ], [ .283, .013 ], [ .276, .016 ], [ .268, .031 ], [ .272, .07 ], [ .277, .081 ], [ .296, .109 ], [ .339, .162 ], [ .388, .213 ], [ .42, .241 ], [ .432, .247 ] ], [ [ .655, .278 ], [ .612, .249 ], [ .599, .246 ], [ .476, .272 ], [ .472, .276 ], [ .477, .287 ], [ .555, .341 ], [ .634, .387 ], [ .705, .414 ], [ .816, .441 ], [ .818, .438 ], [ .791, .398 ], [ .763, .343 ] ] ],
        mirror: 1,
        dark: !1
      },
      c909: {
        len: 1.36,
        nose: "8BmBQSciBoBmBmBiBceYWYSUWSUQSQSMOMSMMKQOMMKMOKIIIIIEIIIIIIICECEGGCGGGGAACACS",
        panes: [ [ [ .858, .205 ], [ .788, .244 ], [ .858, .325 ], [ .928, .364 ], [ .939, .313 ], [ .959, .304 ], [ .959, .254 ], [ .908, .243 ] ], [ [ .976, .284 ], [ .948, .374 ], [ 1.117, .393 ], [ 1.116, .342 ] ], [ [ .858, -.205 ], [ .788, -.244 ], [ .858, -.325 ], [ .928, -.364 ], [ .939, -.313 ], [ .959, -.304 ], [ .959, -.254 ], [ .908, -.243 ] ], [ [ .976, -.284 ], [ .948, -.374 ], [ 1.117, -.393 ], [ 1.116, -.342 ] ], [ [ .778, -.261 ], [ .758, -.211 ], [ .728, -.191 ], [ .708, -.122 ], [ .629, -.013 ], [ .709, .096 ], [ .728, .165 ], [ .758, .185 ], [ .779, .236 ], [ .789, .216 ], [ .85, .195 ], [ .83, .125 ], [ .781, .076 ], [ .75, -.005 ], [ .672, -.013 ], [ .75, -.021 ], [ .781, -.102 ], [ .83, -.152 ], [ .85, -.211 ] ] ],
        dark: !1
      },
      crj: {
        len: 1.34,
        nose: "qBgBiBgBeeecaaaYYYWWWWUUSSSSSQOQQOOMOMOMMKKKKKKIIIIIIIGGGGGGEGEEEEECCECQ",
        panes: [ [ [ 1.247, .441 ], [ 1.245, .381 ], [ 1.163, .354 ], [ 1.113, .335 ], [ 1.042, .296 ], [ .993, .262 ], [ .867, .32 ], [ .863, .324 ], [ .862, .331 ], [ .866, .337 ], [ .902, .356 ], [ .964, .384 ], [ 1.037, .409 ], [ 1.119, .43 ], [ 1.216, .447 ], [ 1.236, .45 ], [ 1.243, .448 ] ], [ [ .822, .301 ], [ .951, .241 ], [ .956, .233 ], [ .953, .225 ], [ .91, .176 ], [ .872, .121 ], [ .826, .027 ], [ .817, .021 ], [ .62, .023 ], [ .615, .03 ], [ .615, .035 ], [ .635, .078 ], [ .669, .141 ], [ .694, .178 ], [ .722, .214 ], [ .756, .252 ], [ .813, .301 ] ] ],
        mirror: 1,
        dark: !1
      },
      a220: {
        len: 1.5,
        nose: "sBqB0BqBiBgBcaaWYWSUUUQSQSQQQOQOQOMMMMMMMMMIIKIKIKIIIGGIGGGGIGEEEGEEGEEECECEECECCQ",
        panes: [ [ [ .618, .255 ], [ .709, .226 ], [ .712, .212 ], [ .709, .203 ], [ .674, .169 ], [ .637, .122 ], [ .62, .095 ], [ .601, .052 ], [ .59, .038 ], [ .57, .024 ], [ .557, .021 ], [ .407, .021 ], [ .391, .03 ], [ .382, .045 ], [ .381, .07 ], [ .397, .112 ], [ .421, .145 ], [ .485, .196 ], [ .566, .247 ], [ .593, .256 ] ], [ [ .742, .254 ], [ .64, .283 ], [ .638, .288 ], [ .645, .298 ], [ .702, .333 ], [ .782, .368 ], [ .857, .389 ], [ .898, .395 ], [ .913, .392 ], [ .915, .376 ], [ .909, .355 ], [ .897, .337 ], [ .886, .328 ], [ .768, .257 ], [ .753, .253 ] ] ],
        mirror: 1,
        dark: !1
      }
    };
    Object.values(GLASS).forEach(g => {
      g.nose = unpack(g.nose, 1e3);
      g.mirror && (g.panes = g.panes.concat(g.panes.map(p => p.map(([x, y]) => [ x, -y ]))));
    });
    function shapeKeyFor(leg) {
      const s = String(leg?.aircraftName || "").toUpperCase();
      return /A380/.test(s) ? "a388" : /A35\d/.test(s) ? "a359" : /A34\d/.test(s) ? "a343" : /A3(3\d|10|00)/.test(s) ? "a333" : /A(3(1[89]|2\d)|22\d)/.test(s) ? "a320" : /747|B?74\d/.test(s) ? "b744" : /78\d|DREAMLINER/.test(s) ? "b788" : /77\d/.test(s) ? "b77w" : /7[0-6]\d|MAX/.test(s) ? "b738" : leg?.widebody ? "a333" : "a320";
    }
    function glassFor(leg) {
      const s = String(leg?.aircraftName || "").toUpperCase();
      return /A350|A35\d/.test(s) ? GLASS.a359 : /A3[34]\d|A330|A340/.test(s) ? GLASS.a330 : /A3(1[89]|2\d)/.test(s) ? GLASS.a320 : /A38\d/.test(s) ? GLASS.a380 : /A22\d|CS[13]00|BD-?500/.test(s) ? GLASS.a220 : /EMBRAER 1[79]\d|\bE-?(17|19)\d/.test(s) ? GLASS.e190 : /78\d|DREAMLINER/.test(s) ? GLASS.b787 : /77\d/.test(s) ? GLASS.b777 : /76\d/.test(s) ? GLASS.b767 : /74\d/.test(s) ? GLASS.b747 : /737|73\d|MAX/.test(s) ? GLASS.b737 : null;
    }
    const glassOn = (leg, deck) => {
      const g = glassFor(leg);
      return g && (g.deck || "main") === (deck?.type || "main") ? g : null;
    };
    const TYPES = {
      a319: {
        F: 3.95,
        glass: "a320",
        doors: [ 5.04, 25.81 ],
        ow: [ 12.83, 13.68 ],
        cut: 27.98,
        tail: [ 24.11, "yeRXdvBrBvBvB" ],
        wing: [ "AQoBmBoBoBoBmBoBoBoBmBoBoB", "8gC6BuEUWUUUWUUUWU", "4rDAAAAAAAAAAAAA" ]
      },
      a320: {
        F: 3.95,
        glass: "a320",
        doors: [ 5.04, 29.53 ],
        ow: [ 14.43, 15.28 ],
        cut: 31.7,
        tail: [ 27.91, "weRZpBlBrBvBvB" ],
        wing: [ "AQoBmBoBoBoBmBoBoBoBmBoBoB", "8qC6BuEUWUUUWUUUWU", "41DAAAAAAAAAAAAA" ]
      },
      a321: {
        F: 3.95,
        glass: "a320",
        doors: [ 5.02, 13.84, 24.79, 36.58 ],
        ow: [],
        cut: 38.75,
        tail: [ 34.86, "weTXfvBtBvBvB" ],
        wing: [ "AmEoBoBmBoBoBoBmBoBoB", "+qDkCUWUUUWUUW", "yxEAAAAAQRAAA" ]
      },
      a321acf: {
        F: 3.95,
        glass: "a320",
        doors: [ 5.04, 26.82, 36.47 ],
        ow: [ 18.7, 19.54 ],
        cut: 38.64,
        tail: [ 34.86, "weTXfvBtBvBvB" ],
        wing: [ "AmEoBoBmBoBoBoBmBoBoB", "+qDkCUWUUUWUUW", "yxEAAAAAQRAAA" ]
      },
      a221: {
        F: 3.7,
        glass: "a220",
        doors: [ 4.6, 25.7 ],
        ow: [ 13.11 ],
        cut: 27.73,
        tail: [ 27.18, "weT" ],
        wing: [ "AOmBkBmBkBmBkBmBkBmBkBmBkB", "spCgB0CsBYWUWUWUUWU", "+0DAAAACAACAAAAC" ]
      },
      a223: {
        F: 3.7,
        glass: "a220",
        doors: [ 4.6, 29.46 ],
        ow: [ 15.26 ],
        cut: 31.5,
        tail: [ 31.02, "ye" ],
        wing: [ "AOmBkBmBkBmBkBmBkBmBkBmBkB", "s2CiB2CsBWWUWUWUWUW", "giEAACAAACAAACAA" ]
      },
      a332: {
        F: 5.64,
        glass: "a330",
        doors: [ 5.85, 14.56, 45.63 ],
        ow: [ 32.77 ],
        cut: 48.73,
        tail: [ 39.68, "0eJJPNNNVRRRRdVTXVhBV" ],
        wing: [ "AoE4B4B4B4B6B4B4B4B4B", "u3DyE8BuBkBiBkBiBkBiBkB", "y8FOGGE8BTZGGe" ]
      },
      a333: {
        F: 5.64,
        glass: "a330",
        doors: [ 5.85, 17.74, 50.96 ],
        ow: [ 35.96 ],
        cut: 54.06,
        tail: [ 45.15, "yeJJPNNNXPRTRdVVVVhB" ],
        wing: [ "AoE4B4B4B4B6B4B4B4B4B", "2rE0E8BuBkBiBkBiBkBkBiB", "8wGOGGG6BTZGGe" ]
      },
      a339: {
        F: 5.64,
        glass: "a330",
        doors: [ 5.85, 17.74, 50.96 ],
        ow: [ 35.96 ],
        cut: 54.06,
        tail: [ 45.26, "weHLPNNPXPRTTdTVVXhB" ],
        wing: [ "AoE4B4B4B4B6B4B4B4B4B", "4oEuDuBuBuBuBsBuBuBuBuB", "0wGQGGGGGGGGG" ]
      },
      a343: {
        F: 5.64,
        glass: "a330",
        doors: [ 5.85, 17.74, 50.96 ],
        ow: [ 35.96 ],
        cut: 54.06,
        tail: [ 45.09, "0eJJRLNPVRRRTdTVVXf" ],
        wing: [ "AoE4B4B4B4B6B4B4B4B4B", "srEyE+BsBkBkBiBkBiBkBkB", "wwGOGGG6BTXGEe" ]
      },
      a346: {
        F: 5.64,
        glass: "a330",
        doors: [ 5.85, 23.91, 47.46, 61.58 ],
        ow: [ 34.09 ],
        cut: 64.68,
        tail: [ 55.64, "0eJJPNNNXPRRTdTVVXfX" ],
        wing: [ "AoE4B4B4B4B6B4B4B4B4B", "yuFiFkC0BqBoBmBoBmBmBmB", "4+HOGGGmCZdGGoB" ]
      },
      a359: {
        F: 5.96,
        glass: "a359",
        doors: [ 6.82, 18.86, 37.93, 52.55 ],
        ow: [],
        cut: 55.83,
        tail: [ 49.8, "yeLNPTVnBdhBjBlBnBpB" ],
        wing: [ "A0C6B8B8B8B8B8B6B8B8B8B6B", "wpEqDqC4BuBuBuBuBuBsBuBuBuB", "y/GECACCCCCCCCC" ]
      },
      a351: {
        F: 5.96,
        glass: "a359",
        doors: [ 6.82, 23.3, 42.38, 59.53 ],
        ow: [],
        cut: 62.81,
        tail: [ 57.6, "weJJJNRlBhBjBhBhB" ],
        wing: [ "A0C6B8B8B8B8B8B6B8B8B8B6B", "uiFsDuC4BuBuBuBuBuBuBuBuBuB", "y5HCCCCCACCCCCC" ]
      },
      a388: {
        F: 7.14,
        glass: "a380",
        doors: [ 6.32, 16.5, 44.74, 53.63 ],
        ow: [ 32.68 ],
        cut: 57.56,
        tail: [ 51.8, "wePHRTTLVXfTpB" ],
        wing: [ "AsFmCoCoCoCmCoCoCmCoC", "k4DmE4B+B8B8B+B8B8B+B8B", "umHuBUSUSUUSUU" ],
        upper: {
          from: 7.7,
          to: 56.9,
          F: 6.05,
          doors: [ 20.94, 40.3, 49.19 ]
        }
      },
      b737: {
        F: 3.76,
        glass: "b737",
        doors: [ 5.03, 26.04 ],
        ow: [ 14.81 ],
        cut: 28.11,
        tail: [ 24.05, "+eThBfd5BvBxBpC" ],
        wing: [ "AOmBmBmBmBkBmBmBmBmB", "4qCKcaaacaaac", "8yDAAAAAAAAAA" ]
      },
      b738: {
        F: 3.76,
        glass: "b737",
        doors: [ 5.03, 31.88 ],
        ow: [ 16.71, 17.68 ],
        cut: 33.95,
        tail: [ 29.91, "6eTjBdhB9BvBvBvC" ],
        wing: [ "AOmBmBmBmBkBmBmBmBmB", "w9CMaaaacaaac", "2lEAAAAAAAAAA" ]
      },
      b739: {
        F: 3.76,
        glass: "b737",
        doors: [ 5.03, 34.52 ],
        ow: [ 18.29, 19.25, 26.7 ],
        cut: 36.59,
        tail: [ 32.62, "gfVjBdhB7BxBvB" ],
        wing: [ "AOmBmBmBmBkBmBmBmBmB", "wnDKcaaaacaaa", "6vEAAAAAAAAAA" ]
      },
      b38m: {
        F: 3.76,
        glass: "b737",
        doors: [ 5.03, 31.88 ],
        ow: [ 16.71, 17.68 ],
        cut: 33.95,
        tail: [ 29.57, "yeNZXbrBlBpBlC" ],
        wing: [ "AOmBmBmBmBkBmBmBmB", "m6CUyBqBkBccccc", "ykEAAAAAAAAA" ]
      },
      b39m: {
        F: 3.76,
        glass: "b737",
        doors: [ 5.03, 34.52 ],
        ow: [ 18.29, 19.25, 26.7 ],
        cut: 36.59,
        tail: [ 32.02, "ofDVXXAAvBjCtB" ],
        wing: [ "A0BmBmBmBkBmBmBmBmBwD", "qiDqC2BkBkBeaYccuC", "4uEAAAKAAAAAsE" ]
      },
      b744: {
        F: 6.5,
        glass: "b747",
        doors: [ 9.5, 18.8, 30.61, 40.74, 55.14 ],
        ow: [],
        cut: 58.72,
        tail: [ 49.3, "yeJJJNLRJRVVVVVXfdfd" ],
        wing: [ "AaiCgCgCiCgCiCgCiCiCgCiCgC", "4jEY8B6B8B6B8B6B8B8B6B8B6B8B", "ygHIUWUWUWUWUWUW" ],
        upper: {
          from: 0,
          to: 25.65,
          F: 4.5,
          doors: [ 15.25 ]
        }
      },
      b748: {
        F: 6.5,
        glass: "b747",
        doors: [ 9.5, 22.9, 34.7, 46.3, 60.8 ],
        ow: [],
        cut: 64.38,
        tail: [ 57.36, "ufJNNPRTJVXXZbdf" ],
        wing: [ "AaiCgCgCiCgCiCgCiCiC", "i8EY8B8B6B8B8B8B8B8B8B", "y5HIWUWWUWU4CiE" ],
        upper: {
          from: 0,
          to: 29.95,
          F: 4.5,
          doors: [ 15.25 ]
        }
      },
      b763: {
        F: 5.03,
        glass: "b767",
        doors: [ 5.7, 15.96, 42.55 ],
        ow: [],
        cut: 45.32,
        tail: [ 43.23, "wfLVPX" ],
        wing: [ "AUyByByB0ByByByByByB0ByB", "s3DiB6CoCmBiBiBiBiBkBiBiBiB", "28FCGGGGEGGGGEG" ]
      },
      b764: {
        F: 5.03,
        glass: "b767",
        doors: [ 5.7, 19.34, 48.95 ],
        ow: [ 33.76 ],
        cut: 51.72,
        tail: [ 48.46, "weLVRZRhB" ],
        wing: [ "AUyByByB0ByByByByByB0ByB", "gqEgByC4BkBiBiBiBiBiBiBiBiB", "msGCGGEGGGEGGGE" ]
      },
      b772: {
        F: 6.2,
        glass: "b777",
        doors: [ 6.75, 17.07, 36.33, 49.54 ],
        ow: [],
        cut: 52.95,
        tail: [ 45.79, "0eLNPPRVVVZZddfpB" ],
        wing: [ "AY+B+B+B+B+B+B+B+B+B+B+B+B", "8kEQsBqBqBsBqBqBqBsBqBqBsBqB", "41GAAAAAAAAAAAAA" ]
      },
      b77w: {
        F: 6.2,
        glass: "b777",
        doors: [ 6.75, 17.07, 32.92, 46.46, 59.66 ],
        ow: [],
        cut: 63.07,
        tail: [ 57.69, "qfLNPRTTXVXZ" ],
        wing: [ "A2C+B+B+B+B+B+B+B+B+B+B+B", "8oF8CkCqBqBqBqBsBqBqBqBqBqB", "w+HAAAAAAAAAAAA" ]
      },
      b779: {
        F: 6.2,
        glass: "b777",
        doors: [ 6.76, 23.47, 42.72, 61.8 ],
        ow: [],
        cut: 65.21,
        tail: [ 58.44, "seLLNPRTTXXZbbf" ],
        wing: [ "AY+B+B+B+B+B+B+B+B+B+B+B+B", "opFakCqBoBoBoBmBoBoBoBoBoBmB", "4hICCECCECCECECC" ]
      },
      b788: {
        F: 5.77,
        glass: "b787",
        doors: [ 6.3, 15.32, 32.39, 43.56 ],
        ow: [],
        cut: 46.73,
        tail: [ 41.34, "weRTTfVXXZXlB" ],
        wing: [ "AwC6B6B6B6B6B4B6B6B6B6B6B", "80DwC6BsBoBoBmBoBoBoBoBoBoB", "sgGEECCECECECCE" ]
      },
      b789: {
        F: 5.77,
        glass: "b787",
        doors: [ 6.3, 18.36, 35.43, 49.66 ],
        ow: [],
        cut: 52.83,
        tail: [ 47.29, "0eRTdVVXVZjBZb" ],
        wing: [ "AwC6B6B6B6B6B4B6B6B6B6B6B", "0nEwC6BsBoBoBmBoBoBoBoBoBoB", "kzGECECECECECEC" ]
      },
      b78x: {
        F: 5.77,
        glass: "b787",
        doors: [ 6.3, 21.41, 38.48, 55.14 ],
        ow: [],
        cut: 58.31,
        tail: [ 53, "ueRTdVVXXZjBZ" ],
        wing: [ "AwC6B6B6B6B6B4B6B6B6B6B6B", "y7EoC0BqBoBoBoBmBoBoBoBoBoB", "ymHECECECECCECE" ]
      },
      b752: {
        F: 3.76,
        glass: "b757",
        doors: [ 5.05, 13.99, 38.23 ],
        ow: [ 20.65, 21.6 ],
        cut: 40.3,
        tail: [ 36.64, "yePZXZnBVA" ],
        wing: [ "AOmBmBmBmBkBmBmBmBmBmBkBmB", "mrDiB2C0BkBcWUWUUUUW", "giFAAAAAAAAAAAAA" ]
      },
      b753: {
        F: 3.76,
        glass: "b757",
        doors: [ 5.05, 13.99, 36.98, 45.34 ],
        ow: [ 24.75, 25.65 ],
        cut: 47.41,
        tail: [ 44.95, "yeRZXZ" ],
        wing: [ "AOmBmBmBmBkBmBmBmBmBmBkBmB", "wkEoBmD8BqBeYUUWUUUU", "q9FAAAAAAAAAAAAA" ]
      },
      e170: {
        F: 3.01,
        glass: "e190",
        doors: [ 5.13, 21.68 ],
        ow: [],
        cut: 23.34,
        tail: [ 20.9, "weRZhBzB" ],
        wing: [ "AMeeeeeeeegBc", "wkCQoBSOQOQOQOQ", "gjDAAAAAAAAAAA" ]
      },
      e175: {
        F: 3.01,
        glass: "e190",
        doors: [ 5.13, 23.46 ],
        ow: [],
        cut: 25.12,
        tail: [ 22.17, "weRXnBlBpB" ],
        wing: [ "AMeeeeeeeegBc", "yoCSoBUQQQQQQOQ", "8oDAAAAAAAAAAA" ]
      },
      e190: {
        F: 3.01,
        glass: "e190",
        doors: [ 5.13, 28.01 ],
        ow: [ 15.64 ],
        cut: 29.67,
        tail: [ 27.32, "weRbjB1B" ],
        wing: [ "AqBeeeeeeegBcgBe", "o1CoBcQOQOQOQQOQ", "25DbVAAAAAAAAAA" ]
      },
      e195: {
        F: 3.01,
        glass: "e190",
        doors: [ 5.13, 30.43 ],
        ow: [ 16.46 ],
        cut: 32.09,
        tail: [ 29.6, "6fTVjBxBrB" ],
        wing: [ "AoCeeeeeegBcgBe", "85CgCaQOQOQQOQO", "u9DAAAAAAAAAAA" ]
      },
      e290: {
        F: 3.01,
        glass: "e190",
        doors: [ 5.1, 28 ],
        ow: [ 15.7 ],
        cut: 29.66,
        tail: [ 27.26, "yePbrBrB" ],
        wing: [ "AmDeeeeegBcgBe", "ktC4BSQQSQQSQQ", "8xDHDDADAADAA" ]
      },
      e295: {
        F: 3.01,
        glass: "e190",
        doors: [ 5.1, 33.3 ],
        ow: [ 16.6, 17.8 ],
        cut: 34.96,
        tail: [ 32.52, "yePbjBzB" ],
        wing: [ "AmDeeeeegBcgBe", "u/C4BQSQQSQQQS", "ikEFAADADAADA" ]
      },
      dh4: {
        F: 2.69,
        glass: "dh4",
        doors: [ 5.33, 18.42 ],
        ow: [],
        cut: 19.9,
        tail: [ 19.9, "qf" ],
        wing: [ "AyEaacaca", "4lCDAAAADA", "moDAAAAAAA" ]
      },
      crj7: {
        F: 2.69,
        glass: "crj",
        doors: [ 4.7 ],
        ow: [ 16.1 ],
        cut: 24.2,
        tail: [ 22.8, "yehBlB" ],
        wing: [ "AKcacacaacaca", "2yCMaSQQOQQOQQQ", "4xDCCACCCCCACCC" ],
        ref: [ 4.7, 16.1 ]
      },
      crj9: {
        F: 2.69,
        glass: "crj",
        doors: [ 4.7 ],
        ow: [ 17.2, 18.3 ],
        cut: 28.1,
        tail: [ 26.78, "wenBrB" ],
        wing: [ "AKcacacaacaca", "qhDIUQQOQQQOQQQ", "ggEACCACCCCCACC" ],
        ref: [ 4.7, 18.3 ]
      },
      crj2: {
        F: 2.69,
        glass: "crj",
        doors: [ 4.7 ],
        ow: [ 11.04 ],
        cut: 18,
        tail: [ 17.18, "4cR" ],
        wing: [ "AKcacacaacaca", "++BIUUSWSSWSUUU", "25CAAEAACAAEAEA" ],
        ref: [ 4.7, 11.04 ]
      },
      e145: {
        F: 2.28,
        glass: "erj",
        doors: [ 4.9 ],
        ow: [ 15.02 ],
        cut: 23.76,
        tail: [ 23.76, "of" ],
        wing: [ "AgBWYWYWWYWYW", "qyCQKMMMMKMMMK", "mtDDDDADDADDDA" ],
        ref: [ 4.9, 15.02 ]
      },
      c919: {
        F: 3.96,
        glass: "c919",
        doors: [ 5.01, 30.99 ],
        ow: [ 15.36, 16.5 ],
        cut: 33.17,
        tail: [ 29.09, "weRZbtBnBtBxB1B" ],
        wing: [ "AQoBmBoBoBoBoBoBmBoBoBoBoB", "00CSsBUUWUUUWUUWU", "+8DLZAAAAAAAAAAC" ]
      },
      c909: {
        F: 3.33,
        glass: "c909",
        doors: [ 4.4 ],
        ow: [ 19.19 ],
        cut: 23,
        tail: [ 22.59, "sd" ],
        wing: [ "AOgBiBmFiBgBiBiB", "w0CQmBUAACkEU", "k0DDAAoL+BAAA" ],
        ref: [ 4.4, 19.19 ]
      },
      dh1: {
        F: 2.69,
        glass: "dh4",
        doors: [ 4.88 ],
        ow: [ 5.42, 8.36 ],
        cut: 14.9,
        tail: [ 13, "ueAPlB" ],
        wing: [ "AK+F", "6zBAA", "ukCAA" ],
        ref: [ 4.88, 8.36 ]
      },
      dh3: {
        F: 2.69,
        glass: "dh4",
        doors: [ 4.88 ],
        ow: [ 5.41, 13.16 ],
        cut: 17.6,
        tail: [ 16.43, "ueAP" ],
        wing: [ "AK+F", "0gCAA", "oxCAA" ],
        ref: [ 4.88, 13.16 ]
      }
    };
    Object.values(TYPES).forEach(t => {
      t.tail = [ t.tail[0], unpack(t.tail[1], 1e3) ];
      const [d, le, te] = t.wing.map(w => unpack(w, 100));
      t.wing = d.map((x, i) => [ x, le[i], te[i] ]);
    });
    const TYPE_CODE = {
      319: "a319",
      "31N": "a319",
      320: "a320",
      "32A": "a320",
      "32N": "a320",
      321: "a321",
      "32B": "a321",
      "21N": "a321",
      "32Q": "a321",
      221: "a221",
      223: "a223",
      332: "a332",
      338: "a332",
      333: "a333",
      339: "a339",
      343: "a343",
      346: "a346",
      359: "a359",
      351: "a351",
      388: "a388",
      "7M8": "b38m",
      738: "b738",
      "73H": "b738",
      "7M9": "b39m",
      744: "b744",
      "74H": "b748",
      763: "b763",
      "76W": "b763",
      "73G": "b737",
      "73W": "b737",
      739: "b739",
      "73J": "b739",
      752: "b752",
      "75W": "b752",
      753: "b753",
      "75T": "b753",
      764: "b764",
      CR7: "crj7",
      CR9: "crj9",
      CR5: "crj7",
      CR2: "crj2",
      CRJ: "crj2",
      ER4: "e145",
      ERJ: "e145",
      919: "c919",
      AR1: "c909",
      C27: "c909",
      E70: "e170",
      DH1: "dh1",
      DH2: "dh1",
      DH3: "dh3",
      772: "b772",
      "77L": "b772",
      773: "b77w",
      "77W": "b77w",
      779: "b779",
      788: "b788",
      789: "b789",
      781: "b78x",
      E75: "e175",
      E7W: "e175",
      E90: "e190",
      E95: "e195",
      290: "e290",
      295: "e295",
      "77B": "b77w",
      "77K": "b77w",
      "33D": "a333",
      "33S": "a333",
      "35D": "a359",
      "35E": "a359",
      "78D": "b738",
      "79Y": "b739",
      N78: "b38m",
      N79: "b39m",
      N32: "a321",
      M32: "a321",
      R21: "a321",
      "32R": "a321",
      DH4: "dh4",
      DH8: "dh4"
    };
    function typeKeyFor(leg, code) {
      if (code && TYPE_CODE[code]) return TYPE_CODE[code];
      const s = String(leg?.aircraftName || "").toUpperCase();
      const hit = [ [ /A380/, "a388" ], [ /A350-1000|A35K/, "a351" ], [ /A350|A35\d/, "a359" ], [ /A340-6/, "a346" ], [ /A340|A34\d/, "a343" ], [ /A330-9|A330 ?NEO|A339/, "a339" ], [ /A330-[28]|A33[28]/, "a332" ], [ /A330|A33\d/, "a333" ], [ /A321/, "a321" ], [ /A320/, "a320" ], [ /A319/, "a319" ], [ /A220-100|A221|CS100/, "a221" ], [ /A220|A223|CS300/, "a223" ], [ /777-3/, "b77w" ], [ /777-9/, "b779" ], [ /777/, "b772" ], [ /787-10/, "b78x" ], [ /787-8/, "b788" ], [ /787|78\d/, "b789" ], [ /767-4/, "b764" ], [ /767/, "b763" ], [ /747-8/, "b748" ], [ /747/, "b744" ], [ /757-3/, "b753" ], [ /757/, "b752" ], [ /737-9\d\d/, "b739" ], [ /737 MAX 9|737-9/, "b39m" ], [ /737-8\d\d/, "b738" ], [ /737-7\d\d/, "b737" ], [ /737/, "b38m" ], [ /CRJ.?9|REGIONAL JET 900/, "crj9" ], [ /CRJ.?[57]|REGIONAL JET [57]/, "crj7" ], [ /CRJ|REGIONAL JET/, "crj2" ], [ /ERJ.?1[34]|EMBRAER 1[34]\d|EMB.?1[34]\d/, "e145" ], [ /C919/, "c919" ], [ /ARJ.?21|C909/, "c909" ], [ /195.?E2/, "e295" ], [ /190.?E2/, "e290" ], [ /EMBRAER 195/, "e195" ], [ /EMBRAER 190/, "e190" ], [ /EMBRAER 170|\bE170/, "e170" ], [ /EMBRAER 17\d/, "e175" ], [ /(DASH 8|DHC-8).?[12]\d\d|Q[12]00/, "dh1" ], [ /(DASH 8|DHC-8).?3\d\d|Q300/, "dh3" ], [ /DASH 8|DHC-8|Q400/, "dh4" ] ].find(([re]) => re.test(s));
      return hit ? hit[1] : null;
    }
    const CABIN_ROWS = {
      "2L": "290bC2EI6KeK6M6B67BxWyZWyZyU+WU+W|w484v4geqwm3mn5hf2g484nk4ueg5d5vkausc5w65kausgm3mnfgtg 295bCqEIwJeKoLmCs8BxeibgBkdycgZcgZ|w4d4w4kerwm1mh5if2g4d4pk4ueg5a62k7upcm1mhfgth E90bCoFIsLeKsN4B67BxaqeaqeyY2bY2b|w484v4netwm3mn5kf4g484nk5ueg5d5tk5ungm3mnfitk E95bCmDIkJeKkL+Bg8B|w4a4v4letwm2mk5lf5g4a4ok6uec5o5v4dccgm2mkfitg",
      "4Y": "320bCwEGwIeIwKgCk8BxW4YY+ayUwWUwW|w444p4ydwwm2molwsawm2mog9lwg434pi2qwg434nr2tzc5d5m4ge0g5d5mjjuhglzmo6ng1 332bC4DIoLbKwRM+TpU0WYwZemBoa6BmnBe8B+rB4Ck9B|w494n7jdow8z9cp0ucwfog1p0ucwflg4hkl4wflg4dzhkwfog14oa0g484ngurhg545heckrg5b5h5kb9g5b5hnrtgc5i5q57b9c7y8b4m9yg8r94dflnc8z944oa0c9d9pp0ucglzn3k7olglzn3afetcn4n8ezk1||AC:1-3:0.0168;DEFG:20-31:-0.0055;DEFG:32-39:-0.0083;DEG:40-44:-0.0086 333bC0EKoNpUyUc2YegBqa4B0lBe6BoqB8Cy8B|w4c4p7mdow9ra4p2uew9ra44p9ywf8fk4p9ywfefsdbhkwfefshklpwfffvp0ucwfkfv4p9yg4c4pgvrhg545fe1kzc5b5q54a7c5b5qoutzc5g5ke3kzg8o8ue1kxc8t934m9yc8t93p0ueg8v96e1kxg9k9wdqlccf8ffp0uccftg0cum9clhlmdzkzglymxagetglymxk7olgmxn2f0k1|-1|DEG:10-16:-0.0126;DEG:43-46:0.0072;DEFG:18-42:0.0062 333bC8DM0LpO2RW8WeYyY0B0mBe2BmqB4C08B|w4c4p7kdmw8c8pp2uew8c8u4o9ywfcfrdbhkwfcfrhklpwfift4o9ywfiftp0ucg4c4pgurgg545ke1kzg5a5k58akg5a5koettg8c8ndfllc8q91p2uec8u914m9yg919cdfllcfrg1cum9clhlmdzkzglymxafetglymxk7olgmxn3f2k1|-2|DEFG:15-27:0.0076;DEFG:28-40:0.007;DEG:41-44:0.0071 333bCmDQmOpU0TeqYeoBiagCinBeiC6qBkD48B|w4c4p7ldnw9pa0p2ucw9pa04qa0wf9fqhll4wf9fqe0hlwfmfx4qa0wfmfxp0ucg4c4pgvrhg545fe2l0c5b5k5e9tc5b5kp7toc5g5ke2l0g8s93dhlmc8z934oa0c8z93p2ueg9j9udhlmcfrg0cvm9cl9lke0l0glymxaheuglymxk8olgmxn3f3k2|-3|DEG:11-15:0.0112;DEG:46-49:0.0083;DEFG:21-30:0.0113;DEFG:34-45:0.0088",
      A3: "320bCwEQySeSwU8B25BxW4YY8ayUwWUwW|w444p4zdwwkola4xdywkolal1u2g434pi1qvg434nr1tyc5d5j4he0g5d5jjiuggm1mo6ss7|-1 320bC8EM8OeO4Q8B25BxW4YY8ayUuWUuW|w444p4zdwwkola4vdywkolal0u1g434pi1qug434nr0txg5e5pjiuggm2mo6ps9|-2 321bCyDOuNeQiPoC24BxSkSyBipBywBgmBwBgmB|w4b4s4zdxwkdku4idxwkdkul3ufwkvlb4vdtg4a4si3qxg4a4qr4u1c5c5h4ge1g5c5hjkujgkulcl3u7glymf6psc|-1 321bCuDOwNeQkPoCw6BxSmSwB+oByuBwlBuBwlB|w4b4r4zdxwkvlc4tdvwkvlcl2u4g4a4qr3u0g4a4si1qxglymf6tsc|-2 32NbC6EM6OeO4Q+Bs7BxW0YY6ayUuWUuW|w444p51dywm1mn6qcywm1mncying434pi3qvg434nr1tyc5d5m4je2g5d5mjjugcl6lb5mdugl6lbl8tgglymnitsc 32QbC4DOuNeQgPsCi7BxiB0bkBqdx4B+sB4B+sBygB+Z2BqqB|w4b4r54dywkzle50e0wlymf6qcywlymfcying4a4si3qvg4a4qr1tyc5a5h4je2g5a5hjjuggkzlekyu0glwmgitsc",
      AC: "223bCuFGmKeY2NoCg8BxmBubmBubykBkZkBkZ|w464v52etwm0mjctiawm0mj5qchg464nk0trg5b5uk7ulc5m5v4hdigm0mjihtf 320bC6DIgLeY6NiC45BxiB0YkB+aygBsWgBsW|w434p50dzwkplcl1u2wkplc4ydzg434pi0qvg434nr1tyc5d634ie1gm2mo93ptcm2mopzsbcm2mo6n8x|-1 320bCyDGyIeY2LkC45BxkB0YmB8ayiBqWiBqW|w434p50dwwkplbl2u0wkplb4ydwg434phzqvg434nqztwgm2mo93prcm2mopvsacm2mo6m8x|-2 320bCmFEqIeY4LmC85BxkB6YmBibyiBwWiBwW|w434p4ydwwkrlc4ydywkrlcl3u3g434pi0qyg434nr0tzc5d5o4ge0g5d5ojiuhgm2mo6psa|-3 320bC0EkBq5BxQ6bQ6byO0VO0V|w444p4jdswkplbl6ukwkplb4fdsg434pi3rag434nrfugc5e6340dwcm2mo688mgm2mo8sq4cm2moqbsr|-4 320bCyDGqIeYiLqCg7BxmB0YoB8aykBsWkBsW|w434p4ydwwm2mo6ncwwm2mocwimg434pi0qwg434nr2tzcl2lc52dygl2lcl1txglzmoissc|-5 321bCwDIkJeYyL0Cs7BxgB4S6BqoByekQ4BslB|w4e4v4ydywesf8l1ulwm2mj6ncnwm2mjcyimg4e4vhwqrg4e4tr0tzc5d5k4ge0g5d5kkvufcl4lh4ydygl7lhkztzglzmjissc|-2|DEF:21-27:-0.0051 321bCgEEmGeYgJ4B6iBe6BkoByC26BxkBsTkBsTyiB0QiB0Q|w4b4r50dywekf3lvukwekf34id7wkxle50e2g4a4si1qxg4a4qr1u0c5a5l4ie2g5a5ljiuigkxlel0u6glymg6psd|-3 321bCwDIiJeYyL0Cs7BxgB4S6BooByekQ4BslB|w4b4r4xdvwepf4l1ulwlymf6mcvwlymfcvimg4a4shzqwg4a4qr2tzc595g4fe0g595gkvufcl0le4zdxgl4lel1u1glwmfissc|-4|DEF:21-27:-0.0052 32QbC2DOuNeYqQuCi7BxmB2boBudx8BgtB8BgtBykBga6BurB|w4b4r4tduwl1le4tdywlymf6ictwlymgctimg4a4si2qzg4a4qr5u3c5a5m4df1g5a5mjzumgl1lel2u5glwmgissg 333bCwDQsOpY+Se6WekB8YgCmoBeiCorBgDy7B|w4c4p7mdow9pa04oa0w9pa0p0ucwfmg3dzicwfmg3gil4wl3lkhil2wl3lke1hig4c4pgurgg555gddllg5c5qoetkc5c5q5eamg8z9bddlncl3le6jbgcl3lenkshglymxagetglymxk7olgmxn3f2k1|-1|DEFG:33-38:-0.0032;DEFG:43-45:-0.003 333pC0EK+MeMiVsBknBeuBorBsCk8B|w8s934n9yw8s93p7ufwfkg3e3hewfnfy4n9ywfnfyp7ufwfkg3hol2wl2ld6kb0wl2ldnvskwldlme3l2c4c4p7jdqg4c4pgwrjg525eebktc5b5p55adg5b5posu0g5e5nebktg8q91ebktg929debktc9ra84la0c9ra8p2uhg9sa3dflpglymxahevglymxk9ongmxn3f1k3|-3|DEFG:6-22:-0.0063;DEFG:23-33:0.0074;DEG:34-38:0.0073 77LbCqDOkNbQuRWyWpYgZc4bekB4d4Cy8Bx8B6rB8B6rBy4BmpB4BmpB|w3x4a83c7w9c9o4t9qw9c9op9u7wfog74t9qwfygad9hlwfygahlltwm1mm72auwm1mmoas0g3x4bfyr4g4b4p6yc7c4b4oots6g4u51ekkhg515eekkhc5b5k5g9lc5b5kphtlg8d8pd7lvg929bd7lvclalmdhllglymzb2f0glymzk4o2||DEFG:12-14:-0.0056;DEFG:31-37:-0.0088;DEFG:38-44:-0.0062;ABC:23-26:0.0037 77WbC2CO0KbQmOWqSpYoUcwWekBkYuB2ce8ByfgE68BxkD2vBkD2vBy6CutB6CutB|w444g82cqw8j8s4s9rw8j8sp9u7wctd24s9rwctd2p9u7wctd3d8hiwctd3hilswguha4s9pwlymco7rxwlymc71atg444gfxr4g4g4rots3c4g4q6xcsg4v51ejkhg515bejkhc595g5fabc595goptlg7q80d6lug8b8id8luggth3dglkcldlnd8hgcldlnhmluglvmpatezcmcmp8aatglvmpk3o7cmcmpo7qq|-1|DEFG:12-14:-0.0041;ABC:40-43:0.0029 77WbC2CO4KpYqPcwRekBqT6Bwde+BugB6CutBekD6wB+D88B|w444h82cqw4f4q6zcqw8f8pcwhcw8f8pham4wd1dad8hiwd1dahilswhahkd8hiwhahkhilswlymco7rxwlymc71atg444gfxi2g444gi8r4g4g4snjs9g4g4sfxjpg525ce2h2g525ch8l0c595g5fabc595goptlc8387dalwc8j8r4s9rc8j8rpbuacl6lfoltbcl6lf5pafclalmd8hgclalmhmluglvmpatezcmcmp8aatglvmpk3o7cmcmpo7qq|-2|DEFG:50-63:-0.0079 77WbC2CO4KpYqPcwRekBwT4Bude+BugB6CutBekD6wB+D88B|w444h84cqw4f4q6zcqw8f8pcuhcw8f8pham4wd1dbd8hiwd1dbhilswhahkd8hiwhahkhilswlymco7rxwlymc71atg444gfxi2g444gi8r2g4g4snjs7g4g4sfxjpg525ce2h2g525ch8l0c595g5gabc595goptkc8387d8lwc8j8r4s9sc8j8rpauacl6lfoltbcl6lf5pafclalmd8heclalmhmluglvmpatezcmcmp8aatglvmpk3o7cmcmpo7qq|-3|DEFG:50-63:-0.0079 781bCkDW0RpY6We0aekBwc4BymBe6BmqB+C67B|w4f4q6vdpwagaroxubwagar4oa3wfhfq4oa3wfgfxe2h6wfgfxh3kzwl3leo1tuwl3le59b0g4f4qhgs6g545eeckrg5f5meakrg9qa0dplcgadaodplccfgfqp0ugcl6laeakrclblleakrglwmg6kbsglwmgn9sggmgms7wc2gmgmrc7mugmgmrn1r5||DEG:12-15:-0.0045;DEF:18-20:-0.0037;DEF:30-46:0.0037 788bCkFKwNpYgUcqXekB+Z8BypBe+B+tB0Ck8B|w494m6xdnw9f9vowu6w9f9v4ua6wg1gne2h5wg1gnh5kwwkylc5fb5wkylcnttjg484mhgs3g555jdplbg5e6154ajg5e61oftug5j5xdplbg8u90dplbg9g9vdplbglaloeakqgm1mn6ubxgm1mnn3s6gmon1c7mtgmon27tc3gmon2mxr5||DEG:31-37:-0.0046 789bC8DQsPpY4VcyYekB8a8BqoBe+B6rB8Cy8B|w4d4p6wdpwa0ad4qa6wa0adoyuewfnfzowucwfpg8e2h6wfpg8h4l0wl2lenvtowl2le5eb5g4d4phhs6g555hdpldg5c5rojtug5i5udpldg999ldrldga1addpldgldlpe2l2glzml6nbuglzmln5sagmmmy7zc3gmmmyc7mvgmmmyn1r3 7M8bCmFI4LeY6OqCy8BxmBwcoB2eykBoakBoa|w4d4t6ofawlymm8xdqwlymle3iyg4c4ojks2g5a5sjmtnc5g5s5beigkyldkttlclymb6s8mglymbj9sa|-1 7M8eC0DgCq6BxescgB0eycmacma|w4d4t6ofawkul9kxtnwkul95be1g4c4ojks2glumbbhnhglymb6obdglymbnlsc|-2|ABC:2-4:-0.0159 7M8bC4EG+IeYoMuCw8BxqBwcsB2eyoBoaoBoa|w4d4t6tfbwlyml90dswlymle5izg4c4ojks0g5a5ojmthc5g5n5lekgkyldkttjclymb6v8nglymbjas9|-rv CR9bC+NI8aeYqgB2Bw4CxmBq7BmBq7BykB42BkB42B|w6n7jkguswt6u4f7umc3d3orvvjc3p4e48csg3p4mkduvg5s6mkduvc5s6m4bcsc6n7k48csct6u448es DH4eC2FoBo7BxEwIEwI|w3w4nkdukc3w4g4acsc4o5lkdunc5m6dm9unckkl94gercm3mp4aun|-2 DH4eC2FoBo7BxEwIEwI|w3w4nkdunc3w4f4acsc4o5lkdunc5m6dm9unckkl9kaukcm3mp4aun|-3 DH4eC2FoBo7BxEwIEwI|w3v4mkaulc3v4f49crc4n5kkauoc5l6cm6uocm3mp49uo E75bCyGI4PeY6T2Bq7B|w414t4ierwm7mv5gf3g414kk6uig5g5uk6urgm7mwfhtn",
      AI: "319bC2EEkIeGuMqB64BxS8aS8ayQkYQkY|w3x4n4ydvwkjl94wdxwkjl9l0u1g3x4ni1qug3x4kqytxgm6mw6osb|-2 320bCsEGuJeI2M0Bu5BxU2YW+aySuWSuW|w444p4zdywkplb4vdywkplbl0u1g434phzqug434nqytxc5f5m4ge0g5f5mjhufcm1mn6n8wgm1mo92pscm1mopysa 321bCiEGgIeI0KgC64BxSwTsB+oByQ4QqBmmB|w4a4r4xdvwkfkw4jdxwkfkwl0ueg4a4shyqug4a4qr0txc5c5m4fdzg5c5mjhuggkwle4tdxgkwlel0u3glymf6os9 32NbCuEEiHpGuKM0QeOyS6B67BxU2YW+aySuWSuW|w444p4ydvwm1mn6lcuwm1mncuilg434pi1qyg434nr2tzc5e5l4edzg5e5ljiuhglymnirsc|-3 32QbC4FG+LpImPOmUeQ0VkC66BxY4bcmdxwB0sBwB0sByW8ZuBgqB|w4a4r50dwwkkkz4mdywkzle50dywkzlel0u2g4a4ri0qwg4a4qr2u0g5a5qjjuic5a5p4ecsclymf6p8wglymf92puclymgq0sb 359bC2EO2OpQ8UUwXeW2ZwB4nBeyBwsBwC48B|w5b5o5mb7w5b5onttgwfng6e6hkwfng6hkkvwfsg34s9lwfsg3pfu8wlymfobs2wlymf6yapg4d4p7udtg4d4pgur6g535fdrl7c5f5qdrl7c5p5w58a9c5p5wottsc9599esk9c9p9x4q9lc9pa1dflnc9ra0phucc9xa64q9lca0a6phuccg7gee8ktcl3lc5galcl3lcoftkclalme4kxglymtapf8cmfmt83apglymtk1obcmfmtobqy||DEFG:8-10:-0.009;DEG:11-24:-0.0095;DEG:25-40:-0.0062 77WfCkDCkDbQ0FUiKbYgQcoSeiBoU0B8ce2BugBwCwsBeyC6wBqDw8B|w444gfuk0w4g4q6yc4w8j8t4o9jw8j8tpfucwcocy4o9jwcocypfucwcvd6d6hjwcvd6hjluwgzh94o9lwgzh9pduawlymfo9s0wlymf72apc444f81c6g444gk8r3g4g4rots4g4g4sfuk2g515bdqlac7w804q99c7w80pruag7w86d6lug8k8td6lugh2hcdqlaghphzdqlacl4lg5kahcl4lgojteclblme8kqglwmpazeyglwmpk2nz|-1|DEF:22-25:-0.0035;DEF:27-32:-0.0086;DEF:33-38:-0.0113;DEF:42-48:0.0027 77WfCwDEkGbK2IMgKbOsQe4ZegB0bkBqdemBmgBgC4sBeiCwwB8C+8B|w444ffwk5w555ee1l1w8r91hiltw8r91d7hiwcxd6d7hiwcxd6hiltwguh84q9owguh8pcuawlymfoarzwlymf73aqc444f7zc8c444gkbr5c4g4q6xc8c4g4vfwk5c4g4rous5c5a5f5c9sc5a5fp8tqg7u84d3lvc7v81p8uac7w814q9sg8h8rd5lvc8i8w4s9sc8i8wpauagh1hbdplbghnhxd5lvclalkd7hgclalkhmlvglwmqb0ezglwmqk3o0|-2|EF:7-11:0.0076;DEFG:19-32:-0.0042;DEFG:35-46:-0.0104 788bC0FG6LeW2R4BkoBe8B6tBuCu6B|w494n6xdpw5h5vomtywfygb4qa5wfygbouu9wg6gndphlwg6gnhllcwkwl95fb5wl2loe2hlwl2lohlkzg494nhgs4g565ke0l1g5h5v53afc5k5te2l1g8e8je2l1c8g8o4qa5c8g8oouubg8k8ye0l1g9h9ve0l1ckwl9nutogm0mn6xbzgm0mnn4s4gmnn1camtgmon27vc3gmon2n0r6|-1|DF:1-3:-0.0039;DEF:12-28:0.0135;DEF:30-39:-0.007 788bC0FG6LeW2R4BkoBe6B6rBwCi8B|w494m6xdpw5h5vomtywftgfe2h8wftgfh3l1wfygb4pa4wfygbouu9wkwl9nwtmwkwl95fb5g494nhgs4g565ke0l1g5h5v52afc5k5te0l1g8e8je0l1c8g8o4pa4c8g8oouubg8k8ye0l1g9h9ve0l1gl9lnedkogm0mn6ubzgm0mnn4s6gmnn1c7mtgmon27vc3gmon2n0r6|-2|DF:1-3:-0.0039;DEF:12-29:0.0135 788bCwFKyMpewSkBsXeyB6ZoCqoBeqC0tB+C66B|w494n6tdnw5f5sostxwfygb4la1wfygbouuawg2goe0h6wg2goh2l0wkwl95bb2g494nhfs7g565kdxl0c5e5s52a8c5k5te0l0c5t5z4uaac5t5zoqu4g8k8ye0l0g9e9sdxl0ckwl9nttpckzl8eakngl9lneakngm0mn6rbwgm0mnn3s7gmnn1c7mtgmon27rc0gmon2mzr4|-3|DEG:16-18:-0.0062;DEG:32-35:0.005 789bC4EQsPpeqVkB0ZeyB2boCkoBeqCwrBoDy8B|w4d4p6zdrw5c5nopttw9yaaotu8wfmfy4sa7wfkg3e4h7wfkg3h7l0wl2lenxtnwl2le5gb5g4d4phis5g555he4l2c5b5o59adg5h5te2l2c5o5t51adc5o5topu1g929edjlog9ua6dhloc9yaa4ua9gldlpe2l2glzml6tbxglzmln5s9gmmmycamvgmmmy82c6gmmmyn1r3|-2|DEG:15-18:-0.0054;DEG:37-42:-0.0038 789bCqEQqPpqB8VuB4Ye+B8a0CinBe2C+rB2D29B|w4d4p6zdrwa1ag4ua9wa1agotu7wfmfyovu7wfmfy4sa6wfkg2e4h7wfjg2h7l0wgcgmeckrg4d4phis5g555he4l2c5c5l57adg5c5lootvg5i5pe1l2c9096dilng969jdglnga0acdglnglzml6sbwglzmln5s9gmmmyc9mugmmmy83c5gmmmyn1r2||EF:1-7:0.0058;DEG:21-23:-0.0046;DEG:31-59:-0.0039",
      AV: "319pCiEGkJeIoL4B84BxW+aW+ayUkYUkY|w3x4n50dxwkil8l2u3wkil84wdxg3x4ni0qyg3x4kr2tzgm6mw6rsa 320pCwDG4HeIyJgC+7BxY0YcgbyWoWWoW|w444p51dxwm2mocmikwm2mo6pcmg434pi0qvg434nr1twglzmoiss8 32NpCwDG2HeIyJgC87BxYyYc+ayWoWWoW|w444p51dxwm1mncmikwm1mn6pcmg434pi0qvg434nr1twglymnissa|-1 788bCiFK0MeQiSyCy9Bx4BwsB4BwsBy2B2pB2B2pB|w5e5t53b1w5e5tnytxwftgfe1hdwftgfhmkywkylcnwtmwkylc5db4g494n6tdog494nhfs4g555je1l0c5k5rdzl0g949iddlmglolreckqgm0mn6tbygm0mnn4s6gmon27rc2gmon1c6mtgmon2mzr4|-2|DEF:8-25:0.0094",
      AZ: "221bCoFMsQeO0S2Bu7BxUgaUgaySiXSiX|w414v4veqwm0ms5dexg414lk1trg5d5pk6umgm0msf4tk 223bCwEImKeKiM+B+7BxcybcybyYmZYmZ|w464v4terwkslb4fd4wm0mj5leyg464nk2ttg5b5mk7ungm0mjf5th 319bC2EQ0VeSgYyB+4BxU8aU8a|w3x4n53dywkkl951duwkkl9l7tzg3x4ni3qug3x4kr0txgm6mw6ts9 320bCwDS2SeUyUgC+5BxY2YcgbyWuWWuW|w444p51dxwkqlc51dzwkqlcl3tzg434pi2qug434nr1txgm2mo6ss9|-1 320bC0DQoSeSsU+B+5BxW2YYgbyUuWUuW|w444p52dywkqlc52e0wkqlcl3tzg434pi2qug434nr0txgm2mo6ss9|-2 32NbCwDS0SeUwUgCm6BxY2YcgbyWuWWuW|w444p4wdvwktlc4sdtwktlcl3u2g434pi1qxg434nr3u0gm1mn6nsb|-1 32NbCwDS0SeUwUgCk6BxY2YcgbyWsWWsW|w434p55e0wkslb4zdwwkslbl4txg434pi3qug434nr0txgm1mn6vs9|-2 32QbC2DMwNpoBwQsB2Ue8B0WqD06BxiCwbkCodx4C2sB4C2sBygC6Z2CkrB|w4b4r53dzwkiky4ne1wksl7l5ubwkxld51e1c383hdae3g4a4si4qxg4a4qr4u1c9ua39dahcaean9dahgl8ldl5tvglymg95pvclymgq1seclzmg6q8z||DEF:49-53:-0.0047 332bC0DKuLpQ0RUwUeYyV4BgnBe6BgsB0Cm8B|w484n7ldlw909dp0ucwfdfy4pa2wfmfyp0ucwfng3cthkwfng3hkm6g484ngurcg555he0l1c5b5o59afg5b5ooltrg838gdnlcg8v98dflnc909d4na0cl2lfe0l1glzn3afetglzn3k7olgn3n7f1k1||EG:1-5:-0.0121;DEGH:29-38:-0.013 339bCqDQ+NpoB0UuBwYe8BqZ0C8mBe2C8pB4D48B|w4c4o7jdnw9oa4p2ucw9oa44n9xwfkft4n9xwfkftp0ucwl4lfntshwlwmecefnwm0me7uc3g4c4ogurgg545fdflnc5d5j5d9rc5d5jp6tkc5g5mdflng8n8wdflng8w98dflnc8x934l9xc8x93oyuag9m9xdflncfpfycrm8cldljdykzglymxk7olgmfmwafesgmxn2f1k0||DEH:20-23:-0.0119;DEGH:30-43:0.0073;DEGH:44-46:0.0032 359bC6DS4PpoB4UsBqXe8BoZ2C4nBe4C0rB2Dw8B|w4c4o7tdsw5b5oogtlwftg34naswftg3o8udwfsg9e4hkwfsg9hkkywl2lc5dbdwl2lcnotpg4c4ogur8g545fdmlec5b5m5hamc5g5kdmlec5p60ppu1c9qa34n9kc9q9zphudg9ua5doleca0a6phudcl9lke8kuglulyerk8glwmj6uc3glwmjmxs6gmjms8bcbgmhmtchmhgmjmsmpqp||DEH:55-59:-0.0031",
      BR: "321bCgEEoGeoB+IoC6iBeqCmoBkD26Bx0BsT0BsTyyBwQyBwQ|w4b4s50dxwekf3lsujwekf34gd7wkxle4wdzg4b4si3qwg4b4qr2tzc5a5l4ie1g5a5ljjuhgkxlel0u5glymf6rsa|br-32b 333bMsEU6MeoBqSsCumBewCgqByDy9B|w4c4p7jdnw5a5lnxtow8q914l9xwfgfs4n9xwfgfrozucwfffvctgwwfffvghm6g4c4pgurgg545fdyl1g5a5l59b2g5f5le0l1g8o8ze0l1c8q91ozucg9f9tdclmclhlne9kqglymxafesglymxk7okgmxn2ezk0|-1|DEFG:41-52:-0.0087;DEG:53-57:-0.0089 333bMuEUgNeoBqSsCsmBewCgqByDy9B|w4c4p7ldnw5a5lnxtow8q914l9xwfgfs4n9xwfgfsozucwfffvctgwwfffvghm6g4c4pgurgg545fdyl1g5a5l59b3g5f5le0l1g8q91dyl1c8q91ozucg9g9sddlnclhlne9kqglymxafesglymxk7okgmxn2ezk0|-2|DEFG:41-52:-0.0088;DEG:53-57:-0.0089 77WbCiDOsKbQwPWyTpoByV0Bsce6C0gB0D6sBe4D0wByE88B|w4c4q70c6w5a5lpatyw7m814s9bwcrd1h6lvwcrd14s9bwcrd1puucwcrd1d8h8wh0h94s9bwh0h9puucwlymfoarzwlymf74aqc444c8fc8g444gfvk3g444gk9r5g4g4qfvk3g4g4rous5c555fdrlbc5a5l529tg7u84d8lzc7z81puucg8h8qd6lxc8k8r4s9bc8k8rpuuccgxgz4s9bcgxgzpuucgh2hcd6lxghnhxebkrcl7lbebkrclbllebkrglwmpb0ezglwmpk3o0|br-77a|DEG:45-58:-0.0055;DEG:61-68:0.0025 77WbCiDOsKbQyPWyTpoByV0Bsce6C0gB0D8sBe4D0wByEg9B|w4c4r6zc5w5a5lp8tww7m814s98wcrd1h5ltwcrd14s98wcrd1psu8wcrd1d7h7wh0ha4s98wh0hapsuawlymfo8rxwlymf71aqg444gfuk2g444gk8r3c444c8dc5g4g4rfuk2g4g4ross3c565fdpl9c5a5l529sg7u84d7lxc7z81psuag8h8qd5lvc8k8r4s9ac8k8rpsuacgwh04s9acgwh0psuagh2hcd3lvghnhxdrl9cl7lbd5ltclblld5hfclbllhlltglwmpb0eyglwmpk2ny|br-77b|DEFG:45-58:-0.0061 77WbCiDM6JbQwPW0TpoByV2Bwde6C0gByDqsBe4D0wBwE67B|w4c4r70c6w7o814s99w7o81puuawd2dch4ltwd2dcd8h6wh0h94s99wh0h9puucwl3ldhmlvwl5lg5oagwl5lgomtec444c8dc6g444gfvk3g444gk9r5g4g4rfvk3g4g4rous5c555fdrlbc5a5o4y9tc5a5opau4g7u84d8lzg8g8qd6lxc8k8r4q9bc8k8rpuucggyh2dplbgh2hcd6lvghohye9krcl3ldd6hgclelod8lvglzmj8bcuglzmjm9qpgmjmpd0lz|br-77m|DEG:46-57:-0.0034;DEG:62-64:0.0042;DEG:68-71:-0.0059 781bCsDU+OeoBgWoCymBewCoqB2D28B|w4f4q6sdjw989i4pa3w989noyubwfffq4pa3wfffqowubwflfxhhlbwflfxdohhwl2ldnztqwl2ld58azg4f4qhhs6g555sebkpc5d5l50a5c5d5loutwg979ldlldc9j9v4na3g9l9wdlldc9n9vowubga9akdlldcafaj4na3cafajowubckul250b1gldlodolbglwmg6mbrglwmgn8sfgmgmr7vc1gmgmrc8msgmgmrmzr3||DEG:20-26:0.0041;DEG:27-34:0.0069 789bC2DQyNeoByUoCinBewCsrBuDy7B|w4d4p6wdow8v964ma2w8v9coyubwflfwowu9wflfw4ra4wfrg5dohkwfrg5hklbwl2lenvtlwl2le5cb2g4d4phgs3g555weakpg5f5o54aug5f5oo6tug8v91dmldg929edoldc979c4ma2g9ta6dmldc9ya34ma2c9ya3owubcktl152b2cl5lce1l0glclodzl0glzml6qbuglzmln3s8gmmmy7zc3gmmmyc7mtgmmmymzr1||DEG:20-26:0.0066;DEG:27-34:0.0097;DEG:41-54:0.0035 789bC2DQyNpoB2UuBmZe6CubuDknBe4DsrB0Ey7B|w4d4p6wdpw8v964na2w8v9coyubwflfwowu9wflfw4ra4wfrg5dphkwfrg5hklbwl2lenvtlwl2le5cb2g4d4phgs4g555weakqg5f5o54aug5f5oo6tug8v91dpldg929ednldc979c4na2g9ta6dnldc9ya34na2c9ya3owubcktl152b2cl5lce2l0glcloe2l0glzml6qbuglzmln3s8gmmmy7zc3gmmmyc7mtgmmmymzr1|br-78p|DEG:20-23:0.0049;DEG:45-49:0.006;DEG:50-54:0.0092;DEG:61-73:0.0038",
      BT: "223bCiEI6JeK4L+Bg8BxcwbcwbyYkZYkZ|w464v4yerwm0mj5leyg464nk2trg5b5kkcumc5m5z4fcygm0mjf5tg|-1 223bC0EG4IeI6K+Bm8BxYwbYwbyWkZWkZ|w464v4yerwm0mj5neyg464nk2trg5b5kkbulgm0mjfatg|-2",
      CA: "319bC0FE4IeWyM8B+4BxiBibiBibygBkYgBkY|w3x4n4sdtwkjl84odpwkjl8l7u9g3x4ni1r0g3x4kr4u3c5f5q49dxg5f5qjiulgm6mw6jsd 31NbCwFEyIeWyM8B+4BxiBibiBibygBkYgBkY|w3x4n4sdtwkjl84odpwkjl8l7u9g3x4ni1r0g3x4kr2u3c5f5q49dxg5f5qjiulgm6mw6jsd 320bC4EEuHeW4KmC+5BxkB2YmBgbyiBuWiBuW|w444p4wdwwkqlc4udywkqlcl3u7g434pi3r1g434nr3u3c5d5m4de0g5d5mjkulgm2mo6nse 321bC6DIqKeWqNwB2iBeyB6nBsCs8BxcgTcgTyauQauQ|w4b4s4wdvwelf24acewelf2mhulwkxlel2u7g4a4si2qyg4a4qr4u3c5a5h4cdzg5a5hjjulglymf6lsd|-1 321bC2DG2HeWuK0B2iBe2B6nBwCs8BxgBgTgBgTyewQewQ|w4b4s4vdvwelf24bcewelf2mhunwkxlel2u7g4a4si2r1g4a4qr7u3c5a5h4ddzg5a5hjjulglymf6msd|-2 32NbC0EEoHeW2KmC85BxkB2YmB+ayiBsWiBsW|w434p4wdwwkqlb4udwwkqlbl3u7g434pi3r1g434nr3u3c5d5m4de0g5d5mjkulgm1mn6nse 32QbC0DG2HeWuK2BkjBe4B6nB0Cs8BxgB8SgB8SyesQesQ|w4a4r4ydwwemf24dcdwemf3mkupwkyldl3u7g4a4si2qzg4a4qr5u3c5a5h4de0g5a5hjjulclymf6n8uclymfq2sdglymf90pw|-1 32QbC0DG2HeW0K8B+nBe+BosB0Cu8BxsB+buBudyqBgaqBga|w4a4r4vdvwfwga4bcewfwgamhulwkzldl2u7g4a4ri2qyg4a4qr5u3c5a5h4ddzg5a5hjjulglymg90pwclymgq2sgclymf6i8u|-2 332bW8EegWe+B2Y0C8mBe2C8rByD09Bxc8Sc8SyaoLaoL|w484n7fdlw909d4g9vwfmfz4g9vwfmfzp3ugwfkg1hhm8wfkg1cqhhg484ngtrlg555ie7ksg5d5n52asg5d5no9tzg5i5ne9ksg8d8ke9ksc909dp1uig929edlleglzn3aberglzn3k8oocn4n8exk1|-1|DH:11-13:0.0055;DEH:54-57:-0.0141;DEFH:32-34:0.0045;DEFH:43-53:-0.0138 332bWmEYyGe+BiJiC2LekCgSkD+mBemD4rBiEy9B|w494n7kdow919d4m9zwfmfz4m9zwfmfzp2udwfkg1hjm8wfkg1cthjg484ngvrjg555ie9ksg5d5n5cawg5d5no6tsg8d8kdolec919dp0ugg929fdoleglzn3aeetglzn3k8oncn4n8f2k2|-2|DEFH:51-61:-0.0146;DEH:62-65:-0.017 332bW8Ea6Le+BgS+C8mBegD6rB8D09B|w494n7edjw919d4h9wwfmfy4h9wwfmfzp3uiwfkg1him9wfkg1crhig494ngurlg555ie7ksg5d5o55atg5d5oo9tzg5i5pe7ksg8f8meaksc919dp1uig929fdoleglzn3aberglzn3k8oocn3n7f0k2|-3|DH:11-13:0.0085;DEFH:48-58:-0.0138;DEH:59-62:-0.0141 333bWkEewOp+BuUgC6VeiCgX+C0mBegDsrBiE69B|w4c4p7idnw9qa34m9xw9qa3p3ugwfhft4m9xwfhftp3ugwfifzdyhmwfifzhml4g4c4pgurig555ge0l2g5b5l58ayg5b5lo7tsg929edyl2g9sa3dfloglymxaeetglymxk8omgmxn2f1k1|-1|DEFH:48-52:-0.0135;DEFH:53-59:-0.0101;DEH:61-65:-0.0068 333bWgEgByOp+B+SiC6VekCgXgD0mBeiDsrBkE69B|w4c4p7ldnw9qa34m9xw9qa3p3ugwfift4m9xwfiftp3ugwfifzdyhnwfifzhnl6g4c4pgurig555ge0l2g5b5l58awg5b5lo7tsc7w7yr5tzg909ce0l2glymxaeetglymxk8omgmxn2f1k1|-2|DH:11-16:-0.0067;DEFH:49-53:-0.0135;DEFH:54-60:-0.0101;DEH:62-66:-0.0068 359bWgEkB2Op+BkViC6XekC6Z+C4nBegDmsB+Dq8B|w4d4p7vdtw9ra24q9jw9ra2pdu8wfog7e5hdwfsg24qaowfsg2o9u8wfog7hnkuwl0lbobtkwl0lb5caog4d4pgtr4g545fdxl2g5b5m5lawg5b5mo3tec5g5kdxl2g909bcsm5g9qa1csm7ca3a94q9mca3a9pdu8gglgwe9kscl7lie9ksglwmj6xc6glwmjmvs2gmhmtcimfgmjmtmnqogmjmt8dcc|-1|DEFH:31-33:-0.0102;DEH:34-47:-0.0072;DEH:50-63:-0.0054 359bW2DkByOp+BkViC6XekC6Z+C4nBegDmsB+Dq8B|w4d4p7vdtw9ra24q9jw9ra2pdu6wfog7e5iawfsg24qaowfsg2o9u8wfog7ghkuwl0lbobtkwl0lb5camg4d4pgtr4g545gdxl2g5b5m5nawg5b5mo3teg8z9acsm5g9pa0csm5ca3a9pdu8ca3a94q9mgglgwe9kscl7lie7ksglwmj6xc4glwmjmvs2gmjmt8dccgmhmtcimfgmjmtmlqo|-2|DEFH:31-33:-0.0102;DEH:34-47:-0.0072;DEH:50-63:-0.0054 738bCkFG8JeWoNmCo6BxmBucoB2eykBoakBoa|w4d4t6ofbwkulb5ee2wkulbkvtmg4d4ojms1g5a5sjmtmc5g5s5eejckckt4xe5glumbbjnhglxmb6obfglxmbnls9|-1 738bCkFEwHeWwKqCo6BxqBwcsB2eyoBoaoBoa|w4d4u6ofawkulb5de2wkulbkvtmg4d4ojms0g5a5sjmtmc5g5s5dejckckt4we4glumbbingglxmb6obeglxmbnls9|-2 73GbCsGEoJeWkN8Bo5BxkBuekBueyiBsbiBsb|w474r6rfbwkml75ee3wkml7kvtmg474ljms0g5c5yjmtmc5k5y5eekglwmhbjnhgm0mh6rbfgm0mhnls9 744bWnIc7BfCiGGyKe+BwTsCsbeuC0e+C2nBegDivB8D6+B|w5d5p589rw5p614x9rw7x88d6hlw7x88hllvwc9ckd8hlwc9ckhllvwfrg24q8zwfrg2q3ucwm3mhhjluwm3mhd8hjwmemrbbhlwmemrhlntc212dcgmmg4u55eskbc5d61pdu6g5j5udhlmc5v61dhlmc7p7wd8lsc8l93gwlsc8r9u4o90c8r9uq1uec9g9witluc9o9wd4iogfpg0d6luggegpd6lucgoh74o8zcgoh7q1u6gh3hed6lucm0ml7ub3cm0mlo0r8|-m|DEFH:31-35:0.0031;DEFH:39-62:-0.0056 74HbW7GazCbcqEeiGfCiJGkOp+BgWqCmdesCwgB+C0pBegDmvBgE++B|w5b5op3tvw5b5o559xw9na2q3ucw9sa74o8ywcud4h3ltwcud4d5h5wdddod5hkwdddohklvwm3mfd7hkwm3mfhklvwmcmobahkwmcmohkntc2b2jcum8g4t54egklg5g5qd7lvc90944o9qc9094pduec9197d5ltc9h9xgyltc9n9r4n90ca3aiq1ueca8ai4n90ca9aljfltcabald5jaccqctd5lvgg2gcd5ltcgagq4n90cgagqq1ueggogzd5ltch8hfq1ueghahld5ltcm0mj7tb2cm0mjo0r8|ca-748-m|AC:11-13:-0.0074;DEFH:31-36:0.0047;DEFH:39-44:0.0028;DEFH:50-64:-0.006;JKL:50-58:0.0163 77WfCuDEgGbW2OiBuZe+BwbiCudekCmgB8C4rBe+CqwB4D88B|w4d4q6xc4w717epwuew717e4n97w7q7zpuuew7q7z4n97wd1dad6hkwd1dahkluwguh84p97wguh8puuewlalkhmluc444d89c4g444gfuk4g444gkar8g4g4ufuk4g4g4rows8c545edqlcc595e599tc595epatug6u72d6lwc6v704n97c6v70puugg737dd6lwc7f7p4n97c7f7ppuueg7p7zd6lwg8b8gd6lwggvh5dqlcghghqdqlcclalkd6hgglwmpazeyglwmpk4o2clymf6zarclymfocs4|-1|DEH:47-59:0.0085 77WbW+CaiHbc0OgBmSe+BqUwC8ceyCqgBqD2rBesDuwBmE88B|w4d4q70c5w7q7zptuaw7q7z4t98wcyd8d7hjwcyd8hjlswguh84r98wguh8pru8wlalkhllsc444d8ac5g444gfuk3g444gk9r5g4g4ufuk3g4g4rots4c565gdqlac595b5f9uc595bp7tkc6z734p9ac6z73pruac747p4p98c747ppruag757fd7lug7s82d7lug8d8id7luccvd04p98ccvd0prucgguh4dqlaghfhpdqlaclalkd7hfglwmpazeyglwmpk3o0clymf70arclymfo9s0gmgmp8iaz|-2|DH:11-13:0.0093;DH:14-16:0.0043;DEFH:31-40:0.0052;DEFH:41-45:-0.0032;DEFH:54-60:0.0061;DEFH:61-66:0.0083 789bWqEegOp+BkUkCkYemCua8CinBe+CisB6Dq8B|w4d4p6vdpw8t9coxudw909c4oa2wfnfyozudwfnfy4oa2wl0lcnytpwl0lc5eb2g4d4phhs7g555he2l3c5d5l53a8g5d5lostvg5i5ue2l3c8t8z4oa4g929edplbg9ta5dpldgflfxe2l3ggcgoe2l3gldlpe0l3glzml6pbuglzmln6sbgmmmy80c3gmmmycamvgmmmyn2r4||DH:11-15:0.0145;DEH:31-34:0.0101;DEH:36-41:-0.0061;DEH:42-44:-0.0036;DEH:55-61:0.0039 7M8bCkFEwHeWwKsCs6BxqBwcsB2eyoBoaoBoa|w4d4u6qfbwkul95fe0wkul9kxtmg4d4ojms0g5a5sjmtmc5g5s5dejglumbbingglxmb6obeglxmbnls9 919bCqEE6GeWmKmC+5BxmBqaoBycykB0XkB0X|w444p51dtwkrlckzttwkrlc51dtg434pi1tvc5d5i4hemg5d5ikbueglymh6vs1 C27eW0J4B4lC|w5n6j4cdkwo6pekyulc444c5ee4g444rk1u0g5t6jk1ujco6pf4jcw",
      CM: "738bCuFIiMeKiPkCy6BxiBuckB0eyWmaWma|w4d4t6sfbwkwld5je5wkwldkqtgg4c4ojmrzg595vjktpc5g5v5befglumbbmngglxmb6wbfglxmbnks8|-1 738bCuFIiMeKiPkCy6BxiBuckB0eyWmaWma|w4d4t6sfbwkwld5je7wkwldkrthg4c4ojms0g595vjktrc5g5v5begglumbbmngglxmb6wbfglxmbnks8|-2 738bCyFI4NeK8QkCw6BxiBuckB0eyUmaUma|w4d4t6sfcwkwld5ie5wkwldkrthg4d4ojns0g595vjltrc5g5v5begglumbbkngglxmb6xbgglxmbnls8|-3 73GbC4GGqMeKqQ6Bg5BxiBoeiBoeyU2bU2b|w474r6rfcwkll85ee3wkll8kwtng474ljns2g5b63jltrc5j635aegglwmhbknigm0mh6wbggm0mhnmsa 7M8bCuFIkMeKiPkCy6BxiBuckB0eyWmaWma|w4d4t6ufbwkwld5he5wkwldkrthg4c4ojkryg595vjitnc5g5v5begglumbbmngglxmb6wbfglxmbnks8 7M9bCgFIuPeK6SmC86BxiBqdkBqfyUqbUqb|w4f4u6tfcwkzld5ge3wkzldkvtkg4f4pjmrzg595tjktpc5e5k7iegc999j4mdvglum9bkngglwm96zbgglxm9nks8|-1|AB:1-4:-0.0157 7M9bCmFGqMeK0PmC86BxiBqdkBqfyYqbYqb|w4f4u6sfbwkzld5fe3wkzldkvtlg4f4pjmrzg595tjktpc8g8p4mduglum9bkngglwm96wbgglxm9nks8|-2|AB:1-3:-0.0131",
      CX: "32QbWgEcoIeuCiLqEk7BxiD2bkDudx2DyrB2DyrBygD+Z0DgqB|w4a4r4xdvwkml04ndxwkylel1u2wl1le4zdzg4a4si2qwg4a4qr2u0g5c5oktuec5c5n4je4glymf91puclymfq0sdclymf6k8v|cx-32p|HJK:66-69:-0.0052 32QbUgEYoIesB+KgE+6BxmC6boCqdxuDstBuDstBygCga6C8qB|w4b4r4xdwwkzle4vdwwlymf6mcvwlymfcvimg4a4si2qwg4a4qr2tzc5c5n4je4g5c5oktudgkzlekzu1glwmfissc 333bWqEiBsNbkB4UoBgYeuCoamD+nBe2DmrB4E+9B|w5b5modtuw5b5m54aow8t94p0ucw8t944k9ywfifxd9hjwfifxhjlpwl3lenksgwl3le6gb9g4c4o7hdmg4c4pgtrhg545fe1kxg5g5re1kxg8r92ddlng9f9qddlnc9pa34k9yc9pa3p3ugg9ra2dzl1glymxaderglymxk7olgmxn2f0k0|cx-33a|DG:14-17:-0.0043;DEFG:59-63:-0.0134;DEFG:64-70:-0.0101;DEG:71-76:-0.0071 333bWmDkB+NeuC2UuDymBe0DkqB2E28B|w4c4p7jdkw5b5noatuw9qa1p3uewfiftp0uewfift4l9ywfhfvd9hjwfhfvhjlpg4c4pgtrhg545fe1kxg5b5j56b1g8p90dzl1c8t944l9yc8y94p0ueg919cdelng9pa0delnc9qa54l9yca2a5p3ugcfcfgdelncl4lfnksicl8ljeakqglymxaderglymxk7olgmxn3f0k0|cx-33b|DG:11-18:-0.0073;HK:11-18:0.0085;DEFG:39-55:-0.009;DEFG:59-69:0.0085;DEG:70-74:0.0078 333bWwEkBuObmBmUqBwXeuCgakDmmBe2D2qB2E28B|w4c4o7hdkw5b5mobtuw9qa1p3ugwf6fhp3ugwfiftp3ugwfift4l9ywfhfvd9hjwfhfvhjlpg4c4pgtrig535eeakqg5b5m52aog5f5meakqc5n5teakqg919ddelnc9p9v4i9wg9q9zdelnca1a7p3ugcfcfgdelncl3lfnlsjcl8ljeakqglymxadesglymxk7olgmxn2f0k0|cx-33e|DEFG:39-48:-0.0055;DEFG:59-70:-0.0094;DEG:71-75:-0.01 333bWwEkBuOeuC2UuDymBe2D2qB2E28B|w4c4p7jdkw5b5nodtuw9qa1p3ugwfiftp0uewfift4l9ywfhfvd9hjwfhfvhjlpg4c4pgtrhg535feakqg5b5n52aog5f5neakqc5n5teakqg929ddelng9pa1delnc9qa64l9yca2a5p3ugcfcfgdelncl3lfnksicl8ljeakqglymxaderglymxk7olgmxn2f0k0|cx-33j|DEFG:39-55:-0.009;DEFG:59-70:-0.0094;DEG:71-75:-0.01 333bWwEkBuObmBmUqBwXp8B+ZgCwceuC0e8CumBe2D2qB2E28B|w4c4o7jdkw5b5moatuw9qa1p3ugwf6fhp3uewfiftp3ugwfift4k9ywfgfvcshjwfgfvhjm6g4c4pgtrfg535eeakqg5b5m52aog5f5meakqc5n5teakqg919dddlnc9p9v4i9vg9q9zddlnca1a7p3ugcl3lfnksicl8ljeakqglymxaderglymxk7olgmxn2f0k0|cx-33k|DEFG:59-70:-0.0094;DEG:71-75:-0.01 333bWmDeiJeuCgL0CiOe2C2U2DymBe4D2qB4E28B|w4c4p7hdmw5b5nodtuw9qa1p3uewfiftp3uewfift4i9wwfhfvd9hjwfgfvhjlpg4c4pgtrhg545ge1kxg5b5j56b1c7f7qe4kxg8w90delnc8y944i9wg919cdelng9pa0delnc9qa54i9wca2a5p3ugcfcfgdelncl4lfnksicl8ljeakqglymxaderglymxk7olgmxn3f0k0|cx-33p|DG:11-15:-0.0074;HK:11-15:0.0085;HK:40-42:0.0097;DEFG:40-42:-0.0036;DEFG:43-71:-0.0095;DEG:72-76:-0.01 359bW2DmBqOboB4UqBoWp8ByYiCwceuC4dgDunBe2D6rB0Ew8B|w5b5o5mb7w5b5onttgw9o9zp7uawfefq4r9uwfqg14r9swfqg1p7uawfmg5e5h8wfmg5h6kuwl0lc5daqg4c4p7udvg4d4pgur5g545fdzl2g5f5ndzl2g929dd5lxc9oa34r9ug9qa2d5lxca0a3p7uaga2a8d5lxcfgfme3kwcl0lco9tmcl9lke9ksglwmj6yc7glwmjmvs2gmhmtcfmbgmjmtmhqjgmjmt8cc9|cx-35g|DEFG:30-32:0.0049;DEG:59-68:-0.0073;DEG:69-74:-0.0052 351bWmDuBgSp8BgYiCubeuCkdiDqmBe2DmrB6E48B|w5a5l5mb7w5a5lnttgwaharp7uawasb24r9swfefo4r9swfefop7uawfofy4r9swfofyp7uawfmg2e5h8wfmg2h8kvg4f4rhcrag4g4q7sdpg535ddzl3g5d5kdxl3ga1aad5lxcahar4p9uganaxd3lxcasb2p9uacfgfle5kxcg3g7e5kxcl5lf5fapcl5lfodtmclalke9ktglxmhmvs2glxmh6yc7gmhmp8ccfgmgmqcjmhgmhmqmnqm|cx-35j|DEFG:30-33:-0.0075;DEG:40-48:0.0076;DEG:62-73:-0.0039;DEG:74-77:-0.0054 77WfCiDEiFbW4HYiJbe8O0Bkdp8BgfkCwjBeuCslB8C+rBe2DwwBwE48B|w444gfvk3w4g4r70c6w7m7wd8hiw7m7whiltw7m80pruaw7q804o97wdhdrpru8wgsh14o97wlbllholvwlymfoarzwlymf74aqc444f81c8g444gk9r5g4g4sfvk3g4g4rous5g545ddrlbc7m7q4o97g7w86d8lvc8i8sptucg8i8sd8lvccyd0pruacgth9pruaggvh5d8lvch2h94o97ghhhqd8lvcl4lfomtgclblld8hgglwmqb0ezglwmqk3o0|cx-77a|HK:32-34:0.0122;HJK:40-46:-0.0027;ABC:41-44:0.0037;DEFG:60-68:-0.0069;DEG:69-72:-0.0052 77WbWuCkBqKbmBoPuBwUp8BuWmCsceuCkgBqDotBe2DwwBwE68B|w444g85c6w4e4q70c6w7m804q99wcrd14q99wcrd1psuawczd9d8hiwczd9hiltwl4lfomtfwlbllhmltwlymfoarzwlymf74arg444gfxr5g4g4rnbs5g515be2l1g7p7zd8lvc7y80pkucg8c8md6lvc8j8p4q9jc8j8ppkucccsczd8lvgguh4dillghfhpdillcl4lf5kafclblld8hgglwmpb0ezglwmpk4o0|cx-77j|DEFG:44-51:0.0035;DEFG:60-68:-0.0065;DEG:69-72:-0.0049 77WbW4CmByKboBiPuBiTp8BiViCuYeuCoa0Cmde2CkgByDytBe2DwwBwE68B|w444gftk1w4g4q70c5w8j8x4r99wcqczppu7wcyd8d7hhwcyd8hhlrwl4lf5kacwlbllhllrwlymfo7rywlymf74aqc444f83c5g444gk7r2g4g4rftk1g4g4rors2g525cdql9g7q80d7ltg8c8md7ltc8j8tpru8c8u92pru8c8y924r99gguh4d7ltcguh9ppu5ghfhpd7ltcl4lfoltdclblld7hfglwmpb0eyglwmpk1ny|cx-77k|DEFG:60-68:-0.0069;ABC:52-57:-0.003;DEG:69-72:-0.0053 77WbWoCkBuKeuC0PqDudesDwgBmE+sBeoEkyBgF29B|w595k56a0w8j8t4q99w8j8tpru7wcrd14q97wcrd1ptu9wcxd7d7hiwcxd7hilswl4lfoltfwlymfo9rywlymf73aqg444gfwr4c444f7zc8c4g4r6xc6g4g4rots4g4z59drlac595koztvg7p7zdrlag7z89d7lug8k8ud7luc8t94pru9gh0hadrlach5ha4q99ch5hapru9ghnhxd7luchri24q99chri2pru9clilmdzl0glwmpb0ezglwmpk3nz|cx-77p|DEG:12-17:0.0043;DEG:76-80:-0.0075;DEFG:45-49:-0.0039;DEFG:50-53:-0.0061;DEFG:54-67:-0.0086;DEFG:68-75:-0.0063",
      EN: "E90bCmGQmVeSqX6B87BxYmeYmeyW0bW0b|w484v4ketwm3mn5lf5g484nk8ukg5d5xkbuwc5p5z49ergm3mnfjtp E95bC2FQsTeSqVgCo8B|w4a4v4ferwm2mj5gf2g4a4ok6ulg5c5uk6uuc5p5x46c8gm2mkfgtq",
      ET: "351bC8DY2QeqB6VyCyoBe8C6rBgE28B|w5a5o5db4w5a5onutlw9qa04m9pw9qa0p9ubwfrg04o9pwfugah5kuwfugae3h5wlwmdoes6wlwmd6ualg4f4qhbreg4f4q7mdng535ddvl3g5d5kdvl3c9k9p4k9rc9k9pp7udg9n9rd3lxg9sa2d1lxgaeandhlfcfpfte7ksclblle5ksglwmkalerglwmkk8oe||FG:1-11:-0.0072;DFH:21-39:0.0118;DFH:46-64:-0.0043 359bCmEK0MeqBgTyC8oBe8CgtB6Du9B|w5b5r5fb6w5b5rnwtmw8q924p9jw8q92pgubwfpgae5hlwfpgahlkwwl1lc5bajwl1lcoitqg4d4p7sdvg4d4pgur7g555ldrl8g8m8ue7kug8u96dpleg9j9vdnlccl9lke3kyglwmj6wc6glwmjmxs6gmjmt8cccgmimtcimhgmjmtmnqt|-1|DFH:21-39:0.0118;DFH:46-61:-0.0205 359bCuEQyNeqBgTyC8oBe8CgtB6Du9B|w5b5r5fb6w5b5rnvtlw8r924p9jw8r92phubwfpgae5hkwfpgahkkvwl1lc5bahwl1lcohtpg4d4p7sdtg4d4pgur8g545fdxl4g5f5ndxl4g8v96dnlcg9j9vdnlccl9lke3kxglwmj6wc6glwmjmws4gmjmt8cccgmimtcimggmjmtmmqs|-2|FG:1-7:-0.0083;DFH:21-39:0.0118;DFH:46-61:-0.0205 359bCoDQoOeqBkUuC8nBe8CisB6D+7B|w4d4p7udtw9pa04na1w9pa0ozuewftg34narwftg3o7ucwfqg9h6kwwfqg9e5h6wl2lc5dbeg4c4pgur6g535fdxl4c5c5l5la1c5c5loxtdc8t944na3c8t94ozueg9096d4lyg9l9wd4lycl2lcnjtncl6lhe7kuglslwerk7glwmj6wc6glwmjmxs5gmhmtcimggmjmt8cccgmjmtmmqs|-3|DFH:21-39:-0.0058;DFH:46-58:-0.0093 738bCqFIuNeWkRkC+5BxiBuckB0eygBmagBma|w4d4t6sfcwkslbkytnwkslb5je3g4d4ojns2g5c5sjltnc8q8y4heiglumbbmniglxmb6wbgglxmbnmsa||AB:1-4:-0.0116 73GbCqFI2QeWyU2Bg5Bxeseeseycqbcqb|w474r6rfbwkml95ee7wkml9kttpg474ljns1g5f5yjltnc5k5p8geic9j9w4defglwmhbjnhgm0mh6vbfgm0mhnmsa||AB:1-4:-0.0199 77LbC+DI8MeqB+TuC+oBe8CktB2Dw8B|w3x4b7yc2w4b4o6wc2w9e9x4k9iwfvg74k9iwfvg7phudwg5gjd4hcwlalndkhcwm0mmods5wm0mm6waog3x4bfur7g4b4pfuk5g4b4oovs7g535fdolbc5b5g5aacc5b5gontpg8p91d4lvc9d9xphufg9i9udolbcg5gjhklvclalnhklfglymzawewglymzk3o3||DFH:46-59:-0.0047 77WbCkDI0KeqBiQmCsde8CogB0D2rBeuEuwBoF88B|w444g7yc2w4f4q6wc2wcrd14k9iwcrd1phuewcyd9d4hjwcyd9hjlvwgvh94k9iwh0h9pfuawlymfobs1wlymf6yamg444gfsk3g444gk9r7g4g4qfsk3g4g4rovs7g525cdolbg828cd4lvc8i8p4m9kc8i8zphugg8o8ydmlbccscxdcljggvh4dolbcgvgzpfueghghpdolbclalldellglwmpawewglwmpk3o1|-1|ABC:21-35:-0.0145;DFH:71-83:0.0083 77WbC2CO2KpqBqQwB4TeyB0VgCuce8CqgB2D6sBeuEywBmF87B|w444gfvk1w4e4q6xc7w8k8zpuubwcrd1puubwcrd14r9awd0dad7hiwd0dahiltwh0h9puudwl5lg5nagwl5lgootfwlelohmlvc444d87c7g444gk9r6g4g4tfvk3g4g4rous5g525cebkrg8e8od7lvc8k8z4r9ag9099d7lxccrczdrlbggvgzebkrggzh9dplbch4h94r9aghlhudplbclelod5heglzmj8bctglzmjm9qsgmjmpczlz|-2|FG:1-7:0.0044;DFGH:21-23:0.016;JKL:51-55:0.0036;JKL:56-58:0.0056;DFH:71-83:0.0142 788bC0EI0MeqB4TqCwpBe8C+tByD88B|w494n6vdow9f9touu9w9f9t4sa5wg2gne1hhwg2gnhhl0wkylc5fb6wkylcnttjg494nhfs4g565je9kpg5e5n52azg5e5nnxtsg8p93e9kpg9k9ydqlbckskx55b6ckskxnvtuglclpebkngm1mo6tbxgm1mon3s6gmon2c8mtgmpn27rc2gmpn2mzr5|-1|DFH:21-36:0.0073;DFH:46-57:-0.0089 788bCkFIuNeqB4TyD88BxuCisBuCisBysC4qBsC4qB|w5e5roatww5e5r52aow9f9t4sa5wg2gne1hhwg2gnhhl0wkylc5fb6wkylcnttmg494n6tdog494nhfs4g565webkpg9f9te9kpga9anebkpckskx55b6ckskxnvtwglclpebkngm1mo6tbxgm1mon3s6gmon27rc2gmon2c8mtgmpn2mzr5|-2|DH:1-4:0.0128;DFH:21-34:0.0494;DFH:46-57:-0.0089;JKL:21-24:-0.0262;JKL:25-29:-0.0301;JKL:30-34:-0.0342;JKL:35-39:-0.0375 789bCqEK6NeqBmUsCooBe8C8rB4Dq8B|w4d4p6xdpw8u9a4ta7w8u9aotu7wfnfz4ta7wfrgae2hkwfrgahkl0wl2lenvtkwl2le5eb3g4d4phgs2g555hedkpg5c5l55b1g5c5lnxtsc5i5oedkpg929edhllg9sa4dpl9glalme0l0glzml6rbvglzmln3s9gmmmy82c3gmmmycamsgmmmymzr0|-1|DH:1-5:0.0085;DFH:21-37:0.0073 789bC0DQwPeqBwVqCsoBe8C+rB6D09B|w4d4p70dpw555heokdwa0ac4ta7wa0acotu7wfrgae2hkwfrgahkl0wl2lenvtkwl2ld5eb3g4d4phgs3c5c5l56b1g5c5lnvtqg5i5oeokfg949fdhlmg9sa4dpl9glllpe0l0glzml6rbvglzmln3s7gmmmycamsgmmmy82c4gmmmymzr0|-2|DFH:21-37:-0.0126;DFH:46-61:-0.0031 7M8bCoFIgNeWiRkCq6BxiBwckB2eygBoagBoa|w4d4t6pfbwkul959e2wkul9kztsg4d4ojos4g5c5sjmtqc5i5s5behc8t924dehc8t92kkuoglumbbinjglxmb6tbeglxmbnnsc|-1 7M8bCoEEuGeWwJwCi8BxsBwcuB2eyqBqaqBqa|w4d4t6ofbwlymc8wdrg4d4ojos4g5b5kjlthgkwlbkxtsglumcj9loclymc6r8pglymcltsa|-2 DH4bC0FG6MeW+Q0Bu6BxEoJEoJ|w3w4nkcukc3v4f49crc4o5kkcunc5m6cm8uncl1l94feqcl1l9k9ukcm3mp49un|-1 DH4eW6F8Bu6BxY0IY0I|w3w4nkcukc3v4f4acrc4o5kkcunc5m6cm9uncl1l94gercl1l9k9ukcm3mp4aun|-2",
      EW: "319bCwEGsJeI6L0B07BxU+aU+aySoYSoY|w3x4n4ydwwm6mw6pfrg3x4ni0qyg3x4kr4u0gm6mwfzsb|-1 321bCgDGiGeI0HwCw8BxWgT0B0oByUsQyBimB|w4b4s4ydwwlymfm4sbwlymfgbm4g4a4si0qyg4a4qr2tzglwmf6lg5 320eC4E+Bi8BxW4YYgbyUwWUwW|w444p4ydywm2molwsdwm2mog9lwg434pi0qyg434nr4u0c5d5m4ge0g5d5mjjuiglzmo6lg3|ew-32a 32NeC0E+Bi8BxW0YY8ayUuWUuW|w444p51dwwm1mnlwsawm1mng9lwg434pi0qyg434nr4tzc5d5m4he1g5d5mjjuhglymn6kg1|-1 32NbCiFEgIeI2K+Bi8BxW0YY8ayUuWUuW|w444p4ydwwm1mnlvsawm1mng9lvg434pi0qyg434nr4tzc5d5m4ge0g5d5mjiuhc6a6j98afc6a6jojptc727c9aahc727cojprglymn6lg3|-2 32QbC0DG2GeIoIwCu8BxkB0bmBudx6B+sB6B+sByiB8Z4BuqB|w4a4r4ydwwlymfm3sawlymfgbm3g4a4ri0qvg4a4qr2tzc5a5h4ge0g5a5hjiuhglwmg6lg5",
      KC: "290bC+FGyKeW0MgD87Bx+ByZ+ByZygB+WgB+W|w484v4leswm3mn5lf6g484nk4ubg5e5wkaupc5o5w4dc8gm3mnfhth 321bCkEOqPeWwSiD26BxqCqoBqCqoByoCylBoCylB|w4b4s51dxwkxle4xdzwkxlel2u4g4a4si3qyg4a4qr2u0c5b5k4he1g5b5kjjuiglymf6qsb 32NbC2EI8LeWyO6Cy5BxgB2YiB+ayeuWeuW|w434p4zdwwkplb4xdywkplbl1u1g434pi0qug434nr0txc5d5m4he0g5d5mjiuggm1mn6qs9 32QbCiEOqPeW6VgDu8BxmC2oBmC2oBykCylBkCylB|w4b4r50dxw9xacmauhw9xac4icrg4a4si3qwg4a4qr2tzc5b5k4ie1g5b5kjjuhglymf6rsb|-1 32QbC0FK8OeW4RgDs5BxiB2b+BudxwCosBwCosBygBgauC0qB|w4a4r52dxwkkl04qe3wl0lf54e3wl0lfkytxg4a4ri1qtg4a4qqztvc5b604kefg5b60jiudc6d6l969uc6d6laaayc6d6lo0ooc6z77m2mqc6z77c9czc7l7taaayc7l7to0ooc7m7t969uc8u92969uc8u92aab0c8u92o0oockkkzkyubclymf6o8yglymf94prclymgpxs9|-2 763bC4FQwSeWwVqDk8Bx+B2dgC0fygBuciB6d|w454n5tc1w5d5t4maawc4ch4maawc4choquewkxlb4oafwl5lrhilrwl5lrd9hig454jfokhg454jkoswg4k4yfokhg5d5tonugg5g5udul5c5u614ja2c5u61ozugc5v6bcum3ca5ab4jacca5abonugglzmm5fb0glzmmo1tkgmmmz6ib3gmlmzbanpgmmmznwsi||DEF:11-17:-0.0187;DEF:32-53:-0.0078",
      LA: "295pC+EIyKeKkMkCm8BxckbemdyaiZaiZ|w4d4w4leswm0mg5lf4g4d4pk4ubg5a5uk7unc5k5u4aeqgm0mgfhth 319pCsEGuJeIgMwBq7BxU+aU+aySgYSgY|w3x4n4wdvwm6mw6ngzc3x4ni1qxc3x4kr3u0gm6mwh5sb|-1 319pCsEGuJeIgMwB+4BxU+aU+aySgYSgY|w3x4n4wdvwkjl84tdxwkjl8l1u5c3x4nhzqxc3x4kr3u1gm6mw6nsc|-2 319pC4EGiKeIsMwBw7BxU8aU8ayS4XS4X|w3x4n51dxwm6mw6rgzc3x4ni1qtc3x4kqztvc5f5l4jehc5f5lkiudgm6mwh5s7|-3 320pC2DGgIeIkK8Bk8BxWyYYgbyUiWUiW|w444p4zdxwm2mocuinwm2mo6hckg434pi2qwg434nr2u0glzmoitsb|-1 321pC8CGoGeIgIsC08BxU2SwB2oBySgQuBqmB|w4b4s4zdxwlymgcuilwlymg6hcug4b4si1qwg4b4qr3u0glwmgitsd 32NpC2DGgIeIkK8Bi8BxWwYYgbyUiWUiW|w444p4xdvwm1mnctimwm1mn6icjg434pi2qwg434nr2u0glymnissb 32QpC6CGkGeI4HsC49BxiB2bkBydx2B+sB2B+sBygBoa0B2pB|w4a4r4ydwwlymf6ncwwlymfcwing4a4si2qwg4a4qr2u0glwmfitsd||ABC:28-31:-0.0135;ABC:32-34:-0.0165;ABC:35-38:-0.0193 763bCgFK6NeYkQ4Ci8BxsBqeuB8fyqB4cqB4c|w454n5sbyw5e5u4na9wc6cm4ka9wc6cmoqufwkxlb4naewlblpdwl3g454jfokhg454jkosxg5b5odul5g5e5uooufckkkw4iagckxlbomufglzmm5daxglzmmo2tjgmmmz6jb2gmlmzb9nqgmmmznxsg|-1|EF:1-5:-0.0092;DFH:12-21:-0.0055;DFH:24-28:0.0038 77WbC4CUmSeYyTsCstBeuCswBmD87BxO8MuBsfyMiKsBwd|w4e4q6yc4w7q804q9pw7q80p9uawcncz4o9pwctd3d6hhwctd3hhlswl4lf5mafwl4lfoltgwlymfobrywlymf70apc444d87c4g444gfvr2g4g4rn9s4g4x57eakqc575heakqc8i8n4o9pgh1hbdglkghnhwdglkcl5lddglkcldlndglkglwmpazeyglwmpk2nz||EF:1-7:0.0129;ABC:12-20:0.0047;DEFH:40-46:0.0028 788bCoFKgNeYoS4BioBe8B4tByCq8B|w494m6wdpw5m60oau2wfugge2h5wfuggh3kywfzgd4ra4wfzgdowu9wkwla5hb7g484mhgs4g555jeakqc5e5m58apg5e5moatsg5j5reckqc5m604xapc8n8sdglmc959bdglmckokv56b7cl3l8eckqcl4laoatfgl9lneakqgm0mn6wbygm0mnn3rzgmnn27vc3gmnn1c7mtgmnn1mzr3|-2|DH:1-5:-0.0091;DFH:12-17:-0.007;DFH:19-28:-0.0053;DFH:30-41:-0.0169 788bCmGKyVeYwYwBmoBeyBktBoCq7BxIwSIwSyG0MG0M|w494m6xdqw5m60obu3wfxgb4sa5wfxgboxuawfwgie2h6wfwgih4kzg484mhhs4g555jebkrc5e5m59aqg5e5mobtsg5j5xedkrc5m604yaqc8l8sebkrcl3lae2l1cl3lb5maqcl3lbobtgglblpe2l1gm0mn6xbzgm0mnn4s2gmnn27vc4gmnn1c8mugmon1n0r4||DH:1-4:-0.0054;DFH:12-25:-0.0046;DFH:26-35:0.004 789bCsEKqPeYoU4BinBe8BmsB4Ci8B|w4d4p6xdqw5d5poctxwfmfy4sa5wfmfyovu8wfmg5e2h6wfmg5h6kzwg6gifmkzg4d4phhs7g555hebkrc5d5l59aqg5i5mebkrc9d9gedkrc9ta0ebkrc9za9oxuccg6gie2fccl0lc5bb5cl0lcnutpglelqe0l2glzml6qbvglzmln5s9gmmmy82c4gmmmyc8mugmmmyn0r2|-1|JL:1-5:0.004;JKL:12-27:0.0183;DFH:30-44:0.0077 789bC6EQsQeY8U2BinBe8BmsB4Cs8B|w4d4p6xdqw5d5pobtvwfjg1e3h6wfjg1h6kzwfnfz4sa5wfnfzotu6wg2gefmkzg4d4phhs7g555hebkrc5d5p51apg5i5rebkrc949b4qa3c949boxucc9ya4edkrc9za34qa5c9za9oxuccg2gee1fccl0lc5cb6cl0lcnutoclblee3l2glelqe3l2glzml6rbvglzmln5s7gmmmy82c4gmmmyc8mugmmmyn0r2|-2|JKL:16-20:0.004;DFH:14-27:-0.0043 789bCyEQiQeY2U2BgnBe8BksB4Cm8B|w4d4p6xdqw5d5poctywfjg1e3h6wfig1h6l0wfnfy4sa5wfnfyovu9wg2gefnl0g4c4phhs8g555hebkrc5d5n52aog5h5qebkrc959d4pa5c959doyudc9ua0edkrc9za34pa3c9za8oyudcg2gee1fccl0lc5bb5cl0lcnvtpcl9lde3l2glelqe1l2glzml6rbvglzmln5sagmmmy80c4gmmmyc8mugmmmyn1r3|-3|DH:1-8:-0.009;DEH:12-27:-0.005;JKL:12-18:0.0057;JKL:19-22:0.0035",
      LG: "295eCiFkCs8Bxcibemdya8Ya8Y|w4d4w4gerwm1mh5hf5g4d4pk5ugg5a5uk5upc5k5u4aeugm1mhfgtl 738eCiF+B06Bxcyce4eyasaasa|w4d4u6rfbwkwlc5ge4wkwlckutig4d4ojmrzg5a5tjmtkc5h5t5eewglumbbjngglxmb6tbfglxmbnks7 73GbCqFKqOeMyQwBm5BxYweYweyW6bW6b|w474r6tfbwkll8kxtlwkll85ie2g474ljmrzg5c69jmttglwmhblnggm0mh6pbfgm0mhnks8 7M8eCiF+B06Bxcyce4eyasaasa|w4d4t6rfbwkwlc5ge4wkwlckwtig4d4ojmrzg5a5tjmtkc5h5t5eewglumbblngglxmb6rbfglxmbnks7|-1 7M8bCyFG2KeMkO+B06Bxcyce4eyasaasa|w4d4t6qfbwkwlc5fe4wkwlckttjg4d4ojms0g5a5wjmtoc5h5w59ewglumbbingglxmb6ubeglxmbnls9|-2 DH4bC0FGoLeIiOoBo7BxEuIEuI|w3w4nkcukc3v4f4acrc4o5kkcunc5i5p4acrc5m6cm9unckkl94gercm3mp4aun",
      LH: "319bCiGMqReOyTyB84BxU8aU8aySiYSiY|w3x4n4zdxwkjl84xdzwkjl8l1u3g3x4ni2qyg3x4kr4tzc5h5v4he1g5h5vjjuhgm6mw6qsa 320bCgFQ0SeSyU8B85BxW4YY+ayUwWUwW|w444p51dxwkqlb4xdzwkqlbl1u3g434pi2qxg434nr4tzc5f5r4he1g5f5rjjuhgm2mo6qsa|-1 320bCyEQ0SeSyUgCi8BxW4YY+ayUwWUwW|w444p51dywm2molxsbwm2mogblxg434qi1qzg434nr5u0c5d5m4je2g5d5mjkuiglzmo6ng5|-2 321bC+DQyOeSiQsC66BxU6S0B+oByyBmmByBmmB|w4b4s4zdxwkxld4vdzwkxldl2u3g4a4si3qyg4a4qr2tzc5c5l4he1g5c5rjjuic5s5zlouiglymf6ssb 32NbCwEQ0SeSyUgCi8BxW2YY+ayUuWUuW|w444p4zdwwm1mnlvsawm1mng9lvg434qi2qxg434nr3tzc5d5m4he0g5d5mjjuhglymn6mg3 32QbC+DQ8OeSuQuCm7BxkB0bmBsdx6B4sB6B4sBygB6Z4BmqB|w4b4r4zdwwfzgcmguhwkxldl1u3wl0le4xdyg4a4si2qxg4a4qr3tzc5a5k4he0g5a5kjjuhglymg93ptclymgpzscclymf6o8w||DEF:30-39:-0.0045 333bCyEKmNbUgVWmXpe2ZmB6desBgf4BglBe6BiqB8C08B|w4c4o7odnw9qa34o9xw9qa3p1ucwf8fk4q9zwfcfrhim6wfcfrcvhiwfffwp3ucwflfw4q9zg4c4ogvrfg545fe2kzc5b5q55a8c5b5qostxc5f5ke4kzg8o8we2kxc8t924o9zc8t92ozucg8w97e2kxg9n9ydglkcf3f74oa2cf3fep1uecf9fccvm8cfrg1csm8glxmxaheuglxmxk7okgmxn2f0k0||DEG:15-19:-0.0063;DEG:41-46:0.0106;DEFG:23-40:0.0115 343bC0EKoNpUoUcqYegB6Z2BolBe6B6qB8C08B|w4c4o7odnw9pa04pa0w9pa0p1ucwf9fkedkowfafl4p9ywfaflp3ucwfmfx4p9ywfmfxp3ucg4c4ogvrfg545fe2kxc5b5q56a8c5b5qostxc5f5le4kzg8q8we2kxc8t924pa0c8t92ozucg8w97e2kxg9m9ydglkcf5f94ma0cf5f9p1uecf6f8cvmccfsg1drlcglxmxaheuglxmxk7okgmxn2f0k1||DEG:10-16:0.0032;DEG:41-46:0.0106;DEFG:30-40:0.0114 346fC6EEkHbG4JO4QbUyXeuepyBygB6B+jBe+BolBwCgtBe2CswB0Dk9B|w5j5uouu4w5j5u4va4w9n9x4oa0w9n9xp3ucwasb8p3ucg4h4r7odng4h4rgtr8g565fe0l0c5a5j58a6c5a5josttc5g5pe0l0c7376d2lxc74764oa0c7476p1ueg9p9ye0l0c9xa74oa0c9xa7p1ueg9ya7dflkgakatdflkcaoas4oa0caoasp1uecasb84oa0cataxdflkch6hacthfch6ha4m9ych6hap1ueclalidykyglwmoafesglwmok6ojgmomtezk0|-1|DEG:54-57:0.0035;DEFG:44-53:0.0033 359bC4DMmObOgVQiXpYsZekcegBwd0BmnBe2B6rB0Cw8B|w4c4o7wdsw9oa04p9jw9oa0peuawfqg9e6hdwfsg24parwfsg2o6u8wfqg9hokvwl1lc5danwl1lcoctog4c4ogtr7g535ee6ktc5b5h5ralc5b5hoet8g8y96dyl3g969cdwl3g9qa1csm7cfnfr4natcfnfro6uackwl155apckwl1octwclblme8ktglwmj6wc6glwmjmvs3gmhmscimfgmjms8accgmjmsmlqr||DEG:16-39:0.0061 359fC8DC8DbEwGOgObQgUY0apcickB2femBihByB4nBe0BusByC08B|w4d4p7udsw9pa04o9iw9pa0pdu9wfsg24oatwfsg2o7ubwfwgde4hkwfwgdhkkvwl2lc5fbhg4d4pgtr6g545fdwl3c6c6fdyl3g8r92d4lyc8y924o9kc8y92phudg9h9sd4lycl9lke8ktglwmj6tc3glwmjmws4gmjn28ad0gmjn2lyqogmrn2d2ls|lh-35p|DEG:15-25:0.007;DEG:26-41:-0.0072 359bCyDQoOpSiTYoXecwZ4BynBe8BmsB6Cu8B|w5b5snvtmw5b5s5hb8w9pa0pfuawfkg2e6ibwfkg2gjkwwfrg24s9lwfrg2pfuawl2le5jaug4c4p7vdwg4c4pgvr5g535ee0l4g5f5le0l4c5t5y5eaac5t5yovtqc8z954u9pc8z95phucg919ccum6g9qa1cum6cgaggeakucl2lfo7tkcl8lkeakuglwmj6zc6glwmjmws4gmhmtckmggmjmt8fcegmjmtmmqr|lh-35s|DEG:14-24:-0.0084;DEG:25-28:-0.0104;DEG:38-45:-0.0037 388pkDuCyD4Le4DuSuFqwBewFs2B8F48Bx2EyjB2EyjBy0EqhB0EqhB|w858hhlm0w858hd4hlwdpe0hlm0wdpe0d2hlweaelhlm0weaeld4hlwldlohnllwldlodehewlym9ezjowm3mcj8ofc4d4rn1rfc4e4r7kd2c4e4tfsmwg8q8uctm9g8u95cvm9c8v9k4m8wc8v9kq3ucg9h9sdclnci3i94m8wci3i9q3ucgi8ijdelngiuj5dclncivj64m8wcivj6q3uccm3mb6nahcm3mbomshcm4m9e7es|-2-m|DEFG:52-56:0.0103;DEFG:61-73:-0.0051;DEFG:76-87:0.0097 388pkDuCyD4Le4DuSuFowBewFs2B8F28Bx2EyjB2EyjBy0EohB0EohB|w858hhlm0w858hd4hlwdpe0hlm0wdpe0d4hlweaelhlm0weaeld4hlwldlohillwldlodehiwlym9exjowm2mbj8ofc4d4r7md2c4d4tfsmwc4d4rn1rfg8q8tcvm9g8u95cvm9c8v9k4m8wc8v9kq3ucg9h9sdelnci3i94p8wci3i9q3ucgi8iidelngitj4delnciuj54m8wciuj5q3uccm2mb6lahcm2mbomsf|-m|DEFG:52-56:0.0103;DEFG:61-73:-0.0051;DEFG:76-87:0.0097 744bCjII7BbUiEcsKpwB0T2B0Xe6BgZ+BkbegC+d0C4oBe2CgvB0D8+B|w515hhilgw515hdjhiw8r92q3uewc6chd6hjwc6chhjlvwcrd2d6hjwcrd2hjlvwm3mhhiltwm3mhd6hiwmemrb9hjwmemrhjnsc2129clmgc4l4peskbc7x854la5c7x85ouuec8188d6lvc8l93gxlvc8r9u4l8yc939uq1uec9g9uhllvc9o9ud6hgcgkh4d4lvcgoh74l8wcgoh7q1uccm0ml7rb1cm0mlo0r8|-m|AC:10-14:-0.0049;HK:10-14:-0.0049;DEFG:33-42:0.0075;DEFG:43-58:-0.0039 74HfCrHGtCbIuESuObUkWW2YegBiaoB+cpqB4gByBskBe2BulBiCqrBekC0wBiD++B|w5c5s529ww5c5sp3tyw8x99d4hjw8x99hjltwctd3d4hjwctd3hjlvwm3mfd6hjwm3mfhjlvwmcmob9hjwmdmohjnsc2c2jctm8c4l4s63aqc4l4so7swg4r51dclog5d5od4lvc8u8xd4ltc9h9xgxltc9nae4l8yc9naeq1ueca9alhjltcagald4heggfgqd4ltgh3hld4ltch7ho4l8ych7hoq1uecm0mk7rb1cm0mjo0ra|-m|DEFG:18-22:-0.0057;DEFG:23-25:-0.0032;DEFG:34-49:-0.0038 74HfCrHGtCbIgFY0Obc6WgBmZekBgboBgdpqBsgByBilBe0BumB+BsrBegC0wB+Cg/B|w5c5s509ww5c5sp2tww9n9yq2ubw9ra24n8wwcxd7d6hjwcxd7hjluwm3mfd6hjwm3mdhjluwmcmobahdwmemohlnrc2c2jctm7c4l4s63aqc4l4so6svg4r51dblng5d5od4lsc8z96d4luc9h9xgwlsc9n9r4l8yc9zadq0udca3ae4l8yca9ajhjlscadaiq0udcadaid6hfcafai4l8yggfgqd4lsgh3hld4lsch8hn4l8ych8hnq0udcm0mk7tb1cm0mjnzr9|lh-74p-m|EF:4-12:-0.0065;DEFG:21-25:0.0085;DEFG:32-47:-0.004 789bCiEO4NpQyUUwXeW+Z0B6oBe2BgsB0Cw9B|w4d4p6wdpw8w9c4qa4w8w9cowucwfmfyoyucwftgce2h6wftgch6l0wl0lcnytpwl0lc5cb2g4d4phhs9g555hdpldc5c5o51aag5c5ooqtxg5i5udpldg8o90dplbg919ddplbg9sa4dplbc9xa7owucc9xa44qa4glflre2l2glzml6pbuglzmln6s7gmmmy81c3gmmmyc7mvgmmmyn1r2|-1|HK:8-10:0.0047;ABC:11-19:-0.0049;ABC:20-26:-0.0081;HJK:12-20:0.0047;HJK:21-24:0.0069;DEG:28-32:-0.0047;DEG:33-37:-0.0083;DEG:38-42:-0.0112 789bCwDSsPpU8Vcmaeeyb0BknBe2BsrB0Cy8B|w4d4p6udowa0agoyucwa0ag4oa3wfig1e1h5wfig1h5l0wfnfxofucwfnfx4oamwl2lc5cbeg4d4phgs9g545geckrg5g5neckrg8x92dqlcc929c4ka3g929edqlcg9ta5dqlcga5a8dolccg2g6e1l2cl2lcnntrglclodzl2glzml6obtglzmln5sbgmmmy7zc2gmmmyc8mugmmmyn1r4|-2|DEG:10-18:-0.0124;DEG:21-26:-0.0067",
      LO: "295bCwEI4JeKwLkCm8Bxcgbeidya+Ya+Y|w4d4w4nerwm1mh5kf5g4d4pk3uag5a5lk3ujgm1mhfgtg 320bC2DG8HeI+J8B25BxW0YY8ayUsWUsW|w434p4zdvwkola4vdvwkolal0u1g434phzqug434nr0txgm1mn6ps8 738bCqFKqMeMiO+Bs6Bxcsceyeyaqaaqa|w4d4t6sfbwkulb5fe3wkulbkutkg4d4ojmrzg5a5ujmtkc5g5u5bewglumbbknfglxmb6wbfglxmbnks7 772bCgEK2LbSqRWuUpc2WgBwZekB4b8BopBe+BqtB4Cu8B|w5a5m589uw868pp7u5wfvg7p7u5wfxg9d7hhwfxg9hhlrwgkgwd7hhwgkgwhhlrwl0le5qagwl0ldomtac3x4b7zc7g3x4bfvr2c4b4n6zc5g4b4on8s2g4z5bhjltg565bd5hfc5b5gpbtlc5c5od5ltc5n5s509wc8b8hd5ltc8d8p4q9qc8u91d5ltcl8ldemkpclelqe8kpgm2mr8bctgm2mrm7qngmqn2czlx|-1|DEGH:14-16:0.0059;DEGH:32-39:-0.0053;ABC:20-30:0.0057;EGH:40-44:-0.0051 772bCoDOmMpuBiS2BiYemCya8CioBe+CgtB4D28B|w3x4b7zclw8a8q4r9ow8a8qp8u6wfvg7p8u8wfvg84s9qwfxg9d7hdwgkgwcnhrwgkgwhrmbwl0le5oagwl0leoktcg3x4bfuogc4b4o6wc5g4b4omvs3g535fdrlac5d5k589qc5d5kp8tqc8j8qd5luc949gd5lucfxg9hllsclelqe9kqgm2mr8bctgm2mrm7qogmqn2czlx|-2|DEFG:23-27:0.0065;DEFG:35-40:0.0057 788bCyFG0LpIySM2VeOqYmBooBeoB+tB+Bo8B|w494n6zdpw5g5vnytywfygcowu9wfygc4ra7wg1gne2h5wg1gnh5kzwkylcnwtlwkylc5hb7g494nhgs4g555jenkfc5f5v50b3g5k5venkfc8e8o4ra7g8e8kdplbc8e8oouubg939gdplbckoky54ajckokyojtyglblpe0l1gm0mn6ubzgm0mnn4s6gmnn1camtgmon2mzr6gmon27vc3||DEF:20-27:-0.0084 789bC8EIkNpKsUOkXeQmZoBinBeqBgsBoCi9B|w4d4p70drw8y9b4ta8w8y9botu9wfmfyotu6wfmfy4ra6wfqg9e4h7wfqg9h7l0wl2lenxtnwl2le5fb4g4d4phis6g555hepkhc5e5q52b4g5e5qnxu0g5i5qenkhc8r8x4ta8g8r8xenkhc8r8xotubg8y9adrldg9oa0drldckvl154b7ckvl1nvtygldlpe1l2glzml6qbwglzmln5sagmmmyc9mvgmmmy83c3gmmmyn1r3||DEF:8-20:0.0055;DEF:21-36:-0.0064 7M8bCqFKqMeMiO+Bs6Bxcsceyeyaqaaqa|w4d4t6sfbwkulb5fe3wkulbkutkg4d4ojmrzg5a5ujmtkc5g5u5bewglumbbknfglxmb6wbfglxmbnks7|-1 7M8bCkEM0MeOoOgCs6BxescgByeycqacqa|w4d4t6tfbwkulb5ge3wkulbkutjg4d4ojmryg5a5ujmtjglumbbknfglxmb6xbgglxmbnjs7|-2|DEF:2-6:-0.0064 7M8bCqFKqMeMiOgCk8Bxcsceyeyaqaaqa|w4d4t6sfbwlxmc8ydswlxmce3iwg4d4ojmryg5a5ujmtjc5g5u5bewgkulckutjglumbj7lmclxmb6u8qglxmblss5|-3 E70bC0FIqOeKkRoB66B|w3x4t4meuwman15kf5g3x4ik6uec61724bcagman1fgth E75bC4GI+OeKyRqBw7B|w414u4jeswm7mv5kf3g414kk5ueg5g6mk8upgm7mwfhtk|-1 E75bC6GIqOeK6QsBq7B|w414u4jeswm7mw5jf3g414kk5ueg5h60k8upgm7mwfhtj|-2 E90bC+EKoNeMqP2B+7BxaseaseyY4bY4b|w484v4leswm3mn5mf3g484nk5ueg5d65k5ungm3mnfhtj E95bC0HK4PeM0R4Bg8B|w4a4v4mesg4a4ok5udg5c6ek7upc5p6e4bc8|-1 E95bCsDK8LeM6N8B87B|w4a4v4ierg4a4ok4udc5o5w47d1|-2 E95bC2EKmMeMiO8Bg8B|w5o66kaupc4a4w86crg4a4wd2evg4a4ok5ueg5c5nk8up|-3",
      LX: "221bCsFMwQeO2S0Bs7BxUiaUiaySkXSkX|w424v4yeswm1ms5gezg414lk0tug5d5sk7umgm1msf5tn 223bC0EM8OeO+Q8Bs6BxYybYybyWiZWiZ|w464v4yeswktld4id6wm0mj5oezg464nk3tsg5b5ok7umgkwl2klu3gl3lckludgm0mjf6tg 320bC2EQ2SeSyUsCk8BxW4YY+ayUwWUwW|w444p52dywm2molxsawm2mogblxg434pi2qxg434nr3u1c5d5m4ie2g5d5mjkujglzmo6lg3 321bC2DQyOeSiQuCi9BxUqSyB0oBywBqlBwBqlB|w4b4s4xdwwerf5mhujwlymfm0sawlymfg9m0g4a4si0qzg4a4qr3u1c5a5h4fe0g5a5hjjujgl5ld53fbglwmf6ig3||DEF:31-34:-0.0052;DEF:35-39:-0.008 32NbC2EQ2SeSyUsCi8BxW4YY+ayUwWUwW|w444p4ydxwm1mnlxscwm1mngalxg434pi1qxg434nr3u1c5d5o4ge1g5d5ojkujglymn6lg4 32QbC+DQgPeSyQsCm7BxiB0bkBudx4B8sB4B8sBygB8Z2BoqB|w4b4r4ydxwfygbmhukwkxlel3u5wl0lf4wdzg4a4si1r0g4a4qr2u1c5a5k4fe1g5a5kjkukclymf6l8wglymf92pvclymgq1sf||DEF:28-38:-0.0054 333fCoEEgHbIoKK6LbMiUcgfesB+gB4B+mBe6BkrB6C08B|w4c4p7mdow8c8op3ufw8c8t4m9ywflfx4m9ywflfxp1udwfqg4dbhlwfqg4hllqg4c4pgvrhg545ke1l0g5a5k5aaig5a5kohtsc737e4ma1c737edglmc737ep3ufg8c8mdilmg8n8ydglmc8p93p3ufc8t934m9yg9d9pdglmc9oa04m9yc9oa0p3ufc9p9xdglmcdhdl4m9ycdhdlp3ufcldljdzl0glymxageuglymxk8omgmxn3f2k2|-1|DEFG:23-28:0.0088 333fC4DC4DbEuGOsObQyUe0dpoBmgBuBmkBe2BwlB4BymBe6B8qB8Cy9B|w525denkfw9qa14q9zw9qa1p1uawfgfucuhkwfgfuhkm6wfjfv4q9zwfjfvozuac4c4p7ldpg4c4pgurfc696edelig8s8wdglmg8x98dglmg9m9ydglmca2ad4oa1ca2adp1uccldlldzl1glymxagetglymxk7okgmxn3f2k0|-2|DEG:20-23:-0.0038;DEG:43-46:-0.0152;DEFG:29-42:-0.0139 343fCsFEmIbI0LKmNbM0Uc0fpoBohBsB+jBe2B6lB4B+mBe6B6pB6Cq7B|w4c4o7ndpw5a5n59b8w8p92p1ucw8p924q9zwflfw4q9zwflfwozuawl4lf6lb6wl4lfnusgg4c4ogvrfg555je6kzg595nnqtrc5k5te2kzc5n5t539tc5n5tp8txc7e7q4oa1c7e7qdglkc7e7qp1ucg8p93dglkg9g9udglkc9pa34oa1c9pa3p1ucc9va4dglkca4af4oa1ca4afp1uccfqfzdelncl0l36cb6cl1l3nusocl7lidzkzglxmxahetglxmxk7okgmxn2f2k1||DEG:20-22:0.009;DEG:42-45:0.0109;DEFG:27-41:0.0106 359fC0DCmEbEwGOgObQ+TeydpoB+eyBklBe0BymB2B2nBe4BusB2Cw8B|w4d4p7sdsw9pa14m9hw9pa1phucwfsg24maswfsg2o8uewfwgdhokwwfwgde4hewl1lb5bbcg4d4pgurag535fdwl4c6c6fdyl4g8r92d3lzc8y924m9jc8y92pjugg9h9sd1lzcl8lje8kugltm4eqkaglwmjmxs6glwmj6uc1gmjn289czgmjn2lzqpgmrn2d3lt||DEG:21-27:0.0075;DEG:28-43:-0.0076 77WfC+CEsFbIuIK6JbMsQiB2dpoBogBsByiBe2B6jBoCssBeuCywBoD68B|w444gfuk1w4g4q70c6w8k8tpsuaw8u94psu9w8u944r99wh0h9psuawgzh94t9bwh4hed8hkwh4hehkluwl5lg5nafwl5lgontfc444f82c6g444gk9r4g4g4qfuk3g4g4rots3g515adrlac6n6w4rarc6n6wd8luc6n6wo9u9c7s804r99g7s7vd8luc7s80pqu9g7v85d6lug8h8qd8luc8k8t4r99g8r90d8luc949do5uac949b4r99ghohydflkglglpdhlkglzmj8ccuglzmjm8qogmjmpd0ly||DEFG:20-22:-0.0064;DEFG:34-36:0.0062;DEFG:40-52:0.0027",
      MS: "32NbQsFWuOeoBqSwC45BxuB2YwB+aysBuWsBuW|w444p51dwwkplb4zdywkplbl1u0g434pi2qvg434nr1tyc5f5r4he0g5f5rjkuigm1mn92pscm1mnpzsbcm1mn6m8w 32QbQmEWoLeoBmOqCioBesCqsB+C25Bx6Bwb8Bwdy4Bia4Bia|w4a4r4ydwwkxldkyu0wkxld4ydyg4a4rhxqrg4a4qqztyc5b5l4ge0g5b5ljiugcfugal0umcg0ga4ge0ckmkw4mdickmkwlhueglymf92psclymfpysbclymf6l8w 332bQyEWqLeoB2QqCgnBesC6rBmDs8B|w494n7jdkw5c5q58ayw5c5qo0tqwfhg0hhm0wfhg0d0hhwfng04k9xwfog0oyuawl0ldnnsjwl0ld6fb9g494ngtrig535gdxl1g5h5odzl1g8a8hdzl1g8v99ddlncl4l9e1kvcl9lme1kvglzn3aderglzn3k7olcn4n8f0k0||DEFG:21-37:-0.0085;DEFG:38-47:-0.0134;DEG:48-51:-0.0132 333bQmDcqOeoBoUqCqnBesCmrBsDk9B|w4c4p7jdkw9qa14l9ww9qa1p1ucwfefw4l9ywflfwp1ucwfmg2hhm0wfmg2d1hhwl3lenrsjg4c4pgurig535eeakrc5b5k59azg5b5knytog8x98eakrg9oa0dcllcl8le6nb8clflme2kvglymxadesglymxk7omgmxn3f0k1||DG:8-14:-0.0107;HK:25-29:0.0047;HK:30-34:0.0082;DEFG:28-49:-0.0042;DEG:50-54:-0.0048 359bQsDgBmOeoBoUsC6nBeuCusBsD48B|w4d4p7tdsw5b5onutjw5b5o5gb3w9pa14o9iw9pa1phubwftg34oatwftg3o7ubwfrgah5kvwfrgae4h5g4d4phcreg535ge2kxc5p5u549mc5p5updttc8x954k9ec8x95pjudg8z9ccrm8g9qa3cum8cflfre8ktcl8lje6ktgltm4esk9glwmj6vc5glwmjmws4gmjn389d0gmjn3m0qqgmrn2d4ly||DEG:20-37:0.0039;DEG:39-54:-0.0109 738bQuGcmTeoByWuCg6BxuBwcwB2eysBqasBqa|w4d4u6qfbwkrl95be5wkrl9kvtpg4d4ojns1g5a5sjntnc5g5x59ewc5s5xjntrglumbblnhglxmb6ubfglxmbnlsa|-1 738bQuGWiOeoBuR0Cg6Bx0Bwc2B2eyyBqayBqa|w4d4u6pf9wkrl958e3wkrl9kutpg4d4ojls1g5c5xjjtrc5i5x56efglumbbgngglxmb6sbcglxmbnlsa|-2 77WbQ+CW4JbY8PesUeoB2W0Byce2ByfwCosBeyCiwBuDg9B|w4c4q6uc5w8i8spuuew8i8s4p96wcmd04p96wcrd0psucwcsd3dnhkwcsd3hklfwh0h9psuawgzh94p98wl1lcdnhkwl1ldhkldwldlohmldc444b8ec5g444gfuk4g444gkar6g4g4vfuk4g4g4rovs6c565gdrlbc7u814r9ac7u81psucg7y88d7lvg8k8ud7lvggyh8ebkrgldlodlhgglzmj8actglzmjm9qqgmjmpczlz||DEG:8-11:0.0065;DEG:12-15:0.0039;DEG:28-30:0.0031;DEG:42-53:0.0075;HJK:22-26:-0.0029 789bQ+DgBwPeoB8UoCknBeqCsrBoDq8B|w4d4p6xdqwa3af4ra7wa3afosu7wfmfyouu7wfmfy4ra5wfng5e3h6wfng5h6l2wl2lenytowl2le5db3g4d4phhs6g555heokhg5c5m54b1g5c5mo0txg5i5qeokhg959hdflog9va7dhloglcloe3l2glzml6qbvglzmln6sagmmmycamvgmmmy81c4gmmmyn1r3||DEG:38-52:0.0034 7M8bQsGWkOeoBuR2Cs6Bx0Bwc2B2eyyBqayBqa|w4d4t6qfbwkul95fe2wkul9kxtmg4d4ojks1g5c5xjktoc5i5x59ehglumbbjnhglxmb6ubeglxmbnls9",
      NH: "32NbCgFE8HeK6L2B84BxW0YY8ayUsWUsW|w434p4xdvwkplb4vdxwm1mn6kcmwm1mnckilg434phzqvg434nr1tzc5d5m4fdzg5d5mjiuhgkhlbl0ubglymnirsc 32QbC8DEkGeKkJqC88BxWyTwBkpByU8QuBmmB|w4a4r4xdvwlymfckilwlymf6lckg4a4si1qvg4a4qr2tzc5a5h4edzg5a5hjiuhgl3lel1u1glwmfirsc||ABC:12-37:-0.008 388emCsC2CkLe4C2SyDmhBe0D0kBqE+wBesEq0B4E86B|w4d4r7re5w7x88prubwdpe1ham0wdpe1d5hawecenhmm0wecend4hmwkxl8hjlvwkxl8d9hjwl0lc61a7wl0lcotszc4d4thcnac4d4rnhrbc7x884r9dg858hdllog8u96dgloc8w9l4r9fc8w9lppubg9j9vdelocetex3m4ccf9fd3m4ccf9fdurvgghxi8delochxiapsu9cjxk13m4ccjxk1urvgck5k93m4cck5k9urvgckdkh3m4ecklkp3r4icklkpumvcckvkz4za7ckvkzoru1cl0lc4y5scl0lct8u1cl9lkd9lvclzmn6meccm2mbo8sgcm8mqhfo1|-m 738bCsFEuIeK8L+B87Bxcwce2eyaqaaqa|w4d4t6wfcwlymca3fmg4d4ojlrvg5a5sjltfc5h5s5fexcktlb5je8glumciyonclxmb729xglxmbfviuglxmbous3 763bCuFOmUeemXiB+ZekB4fuCw8B|w454o5ob5w5e5tovuhwc5clovuewc5cl4la4wl4lpd8h3wl4lph0lrg454okoteg454heqkgg4h50eikgc5e5t4ia7g5g5vdul5gc8cmdul5gd4didul5cl1laolueglzml5eb0glzmlo1tigmlmznxsggmlmz6jb2gmlmzbanp|nh-76e|DFG:15-38:0.0059 763bCiDEkFeK4HoBiceqB6f2C89B|w454o5qb5wc5cnovuewcsd3dul3wl0ldolucg454okoteg454heikhg4h4xeikhcc1c4osuhccdcjdul5glzmlo2tlglzml5lb0gmlmznxsigmlmz6jb2gmlmzbanp|nh-76p 772bC+CGyGeK6I+BioBegCotB+Cw+BxWkRWkRyUwOUwO|w4b4p6wc5w9f9wp9ucwfwg84r9pwfwg8p9ucwm2mf7ec9wm2mfmmrhg3x4bfwr5c3x4b7yc5g4b4ofuk3g4b4oots4g525adqlag9i9udqlac9xa4p9ucgfyg4dqlagghgmdqlagmfmrmmq7gmfmr8oc9gmqn2czly|-1|DEFG:24-31:0.0031;DEFG:32-47:-0.0051 772bC+CIsIeK+K+BioBegCotB+Cw+BxWkRWkRyQwOQwO|w4b4p6wc5w9f9wpaudwfwg84r9qwfwg8paudwm2mf7ec9wm2mfmmrhg3x4bfwr5c3x4b7yc5g4b4ofuk3g4b4oous5g525adrlbg9i9udrlbc9xa4paudgfyg4drlbgghgmdrlbgmfmrmmq8gmfmr8oc9gmqn2czlz|-2|DEFG:24-31:0.0031;DEFG:32-47:-0.0051 773bCsCGmFeK+G4B0de6BugB2CwtBe4C0wB0D89BxW6NW6NyU2LU2L|w4g4r6xc4w8l8zpaubwdbdld8hhwdbdlhhlswlymfoarzwlymf71apc444f7zc4g444gfwr5g4g4rfuk3g4g4rous5g5158dqlac8a8ddglkc8l8vdqlac9095paudcd1d4delkgh2hbdqlaghohqdqlaglwmqb1eyglwmqk3o0||DEFG:44-54:0.0028 77WfCyDEkGbKuHoB0nBpyBwpB2B+rBe8B4wB0C88BxO8OiBmiByM2JgB4d|w454gfuk3w4g4r70c6w7q804s9bw7q80psubwdke04u99wdke0psubwgyh94s9bwlbllhmlswlymfobrywlymf74aqc454g81c6g454gk9r4g4g4rfuk3g4g4rots4g545gdrlac5a5h589tc5a5hp7trg7r7zd7lug8089d7luc8j8r4s9bc8j8rpsubg8n8wd7lugdldqevk7gdqe0drlacgwhapou9ggxh0d7lugh0had7lughohydrlacl5leohthclblld9hgglwmqb2ezglwmqk3nz|-1|DEFG:38-42:-0.0037 77WfCuDEgGbKqIMgKbO0QiBydbkBqiBqBmmBpyBsoB2B4qBe8B2wB0C08B|w444gfuk3w4g4r6zc5w7q804r9aw7q80ptucwdhdr4r9awdhdrptucwgth74r98wgxh7ptucwlbllhmlswlymfocrzwlymf73aqc444g81c7g444gk9r5g4g4rfuk3g4g4rous5g545hdrlbc595d5d9uc595dp7tog7v83dhlkg838dd5lwc8k8y4r9ac8k8yptucg8r91d3lucdedod5lwggjgndflkcgmgs4r9acgmgwptucggngxd5lwgh9hjdrlbcl5leogticlblld9hgglwmqb0eyglwmqk3o0|-2|DEFG:25-27:-0.0038;DEFG:30-40:-0.0066 781bC8DU6Qpe8WiBwZeoBgb+BymBegCgrB+Cw7B|w4f4q6udnw9k9xhflbw9k9xdnhfwagarowu9wagar4pa2wfbfqdnh4wfbfqh2lbwl2ldo0tqwl2ld56azg4f4qhfs4g555fe0l0c5a5l50a7c5a5lostzg5g5re0l0c9o9v4na2c9o9wowucga9ajdnl9cfgfp4na2cfgfpowucgfrg1dnlbggegpdnlbcl2lddnl9gldlodnl9glwmg6mbrglwmgn8sfgmgmrc8mtgmgmrmzr3gmhmr7xc1||DFG:15-17:-0.0124;DFG:21-30:0.0084 788bCkFK0MbMiVS4ape4dgByfeoBmiBwB6nBeyB+tBmC+7B|w494n6wdpw9h9xouuaw9h9x4sa6wfwg94oa4wfwg9owucwfxgje1h5wfxgjh5kzg494nhgs4g555jdplbc5e5p58a8c5e5poutxc5k5udplbc8k8p4oa4c8k8pouucg8p93drlbg9k9ydrlbckul8njtqgl8lleakqgm0mn6wbwgm1mnn4s4gmnn1c7mtgmon27uc3gmon2n0r4|-2|DFG:20-24:0.004 789bCsEO8NbQgVa+cpeufiBsiBeoBykBsBgnBeuBksBoCm8B|w4d4p6udmw8z9bowucw8z9b4oa5wfmfy4ma2wfmfyoyucwfkg3e1h5wfkg3h5kzwl2lenxtpg4d4phgs7g555he1kzc5b5o4za9g5b5ooptxg5i5se1kvc5s5ve1kvg8v97dolag989kdolaga0acdolaggigue1l2ckvl1nvtxcl8le5gb7glblne1l2glzml6qbtglzmln5sbgmmmy7zc2gmmmyc6mugmmmyn1r4|-1|DFG:15-17:-0.0046;DFG:24-35:0.0047 789bCsEQ0PbSgVWiYpewagB+beoBue2B+mBe4BksB0Cm9B|w4d4p6sdlw999odphiw999ohilcwfmfy4n9zwfjg2e0h5wfjg2h5kzwl2le5ab2wl2lenxtpg4d4phfs7g555he0l1c5b5o4xa8g5c5oopu0c5i5ue0l1ca1addnlacfmfyoyufcgfgre0l1ckvl152b2ckvl1nvtxglzml6obsglzmln5sbgmmmy7vc1gmmmyc5mugmmmyn1r4|-2|DFG:20-27:-0.0037;DFG:29-42:0.0047 789bCmDGuGeK2IW4PeYsT+BsoBegC+rBgD09B|w4d4p6xdnw919ke2h6w919kh6kzwlzmcn6r8wlzmc7tbvg4d4phgs4g555dedkqc929e4pa2c9ua6e2l1cg1g8e2l1gmcmln6r8gmdml7ibxgmmmy82c3gmmmycamtgmmmyn0r2|-3|DFG:13-32:0.0039;DFG:33-48:0.0066 789bC4DYmepeugBiBsjBeoBylBqB6mBesB6rBoCk9BxO4TO4TyMiOMiO|w4d4p79dww8x9cp0udw8x9c54afwflfx54afwfkg3ebhdwfkg3hbl5wl1ldo0tog4d4phos7g555helkwc5d5t5dbjg5d5tnuu0g5i5qelkwc5r5xejkwg909cebl7g9ra3e9l7ca0a552adca0a5p0ubcflfxp0udcgiguebl5ckvl0nytwcl8ld5wbhglcloejkwglzml72c4glzmln9sbgmmmy8dcdgmmmychmygmmmyn5r5|-5|EF:2-6:0.0065;DFG:24-36:-0.0099 789bCuDK8JeMmMS4PeUsT6BsoBe8B+rB8C29B|w4d4p6xdnw8y9he2h6w8y9hh6kzwlzmcn6r8wlzmc7rbtg4d4phhs4g555hedkqc5i5qedkqc8r8ye0l1c939b4qa3c9ua6e2l1cg1g8e2l1gmcml7rbtgmcmln4rlgmmmy80c4gmmmyc8mugmmmyn0r2|nh-78g|DG:2-5:-0.0033;DFG:11-46:0.0057 781bCiDK4IeM8Kc0See+WgCwnBeiCirBoD09B|w4f4q6udlwaiasowucwaias4pa3wfsg8e1h4wfsg8h4kywlxm97pbrg4f4qhfs4g555febkpc5g5nebkpc9o9x4na3gahasdol9glwmgnasfgm9mg7gbrgmgmr7vc2gmgmrc8mtgmgmrmzr3|nh-78k|DG:2-5:-0.0029;DFG:32-52:0.0042 788bC4DImLbKwSOqYeYuasBynBeuB8tBkCo8B|w494n6ydow8a8qouu9w8a8q4ta8wfwg9ozubwfsg94ra5wl8lmedkowm1mn7yc0g494nhhs4g555jdslcg989mdslcggagodoleckyl9njtqgm1mnn4s4gmon1c8mugmon2n0r6gmon27wc4|nh-78m|DG:1-4:0.0079;DG:5-7:0.0138;HJK:19-22:0.0041;DFG:23-34:-0.0051 788bCyDEiGeKiJSmOeU2R6B+pBe8BkuB0Cw9B|w494n6tdnwg9gve0h4wg9gvh4kxwm1mg7sbug494nhes4g555ddplacg1g8e0l0gm0mnn3s6gmhmn7jbugmnn1c7msgmon2mzr5gmon27sc0|nh-78p|DFG:5-9:-0.0088;DFG:10-13:-0.0035;DFG:30-42:0.0042",
      NZ: "320eCyD6B67BxW4YYgbyUwWUwW|w444p50dwwm1mn6qgzg434pi1qwg434nr0txg5f5njiufgm1moh5sa||DEF:2-6:-0.014 32NeCiE4B45BxW2YYibyUqWUqW|w434p51dwwkqlb4zdywkqlbkztzg434pi1qug434nqytvc5d5l4le2ckhkpkzu7gm1mn6rs7||DEF:17-20:-0.0062;DEF:21-25:-0.0098;DEF:26-28:-0.0129 32QeCiEqCu8BxgBsbiBsdx2ButB2ButBye8Z0B0qB|w4a4r50dxwlymfcuikwlymf6ocug4a4ri0qug4a4qqytxc5b5i4ie1g5b5ljiuggkyldl1u3glwmfissb|-dom|ABC:1-10:-0.0058 32QeCiEqCw8BxgBsbiBsdx2B8sB2B8sBye8Z0B2qB|w4b4r51dzwfug9mfugwkyldl1u1g4a4si2qvg4a4qqztxc5b5i4je1g5b5ljjugclymf6n8yglymf94psclymgpysb|-int|ABC:1-7:-0.006;DEF:28-37:-0.0215 77WbC0COqKbSiPYsTpuByV8BkeekCsgB+CqtBegDgxB4D+8B|w444f84cmw8k8t4w9ew8k8tptuawckd04w9ewcqd0ptuawgzh94w9ewh0h9pru6wl5lg5sahwl5lgoltbwlzma7wceg444gfwohg4g4r71c8g4g4rmws3g525cdtlbc5b5g5c9tc5b5gpbtrg7v85dalvcckcpptuagdedodalvgh9hjdalvglflodalvglzmjm9qqgmamj8wcegmjmqd2lz|-1|DEFG:23-30:-0.009;DEFG:35-41:0.0034;DEFG:48-55:0.0034 77WfCiDEiFbW4HYiJbe8O0Bidp8BgfkCwjBeuCqlB8C8rBe2DwwBwE48B|w444gftjzw4g4q6zc5w7m7wd6hgw7m7whglqw7m80ppu7w7q804o96wdhdrppu7wgrh14o96wlblkhmlswlymfo7rwwlymf73aqc444f83c5g444gk7r2g4g4rftk1g4g4rors2g535ddql9c7m7p4o96g7w86d6lsc8i8spru8g8i8sd6lsccyd0ppu7cgth8ppu7ggvh5d6lsch2h84o96ghghqd6lscl4lfohtdclblld6heglwmpazeyglwmpk1nx|-2|HK:32-34:0.0122;HJK:40-46:-0.0027;ABC:41-44:0.0037;DEFG:60-68:-0.0069;DEG:69-72:-0.0052 77WbW4CmBwKboBiPuBiTp8BiViCsYeuCoa0Cmde2CkgByDytBe2DwwBwE68B|w444gftk1w4g4q6zc5w8k8x4r98wcqczpou6wcyd8d6hgwcyd8hglqwl4lf5kacwlbllhklqwlymfo7rxwlymf73aqc444f81c7g444gk7r2g4g4rftk1g4g4rors1g525cdql9g7q80d4lsg8c8md6lsc8j8tpqu8c8u92pqu8c8y924r98gguh4d6lscguh9pou6ghfhpd6lscl4lfohtdclblld6heglwmpb0eyglwmpk1nxgmgmpnxqe|-3|DEFG:60-68:-0.0069;ABC:51-57:-0.0029;DEG:69-72:-0.0053 789bC8DMqKpuB8MyB0PekC+UiDinBekD4rBiEi9B|w4d4p6xdmw5d5poftzw9zab4q9zwfmfy4qa3wflg4e1hkwflg4hkkywl2lenwtmwl2ld5bb2g4d4phgs4g575le1l1g5d5p51ang9a9ne3l3c9za7owuaga0acdol9cabai4ma1cfhfle1l1cfmfyosuagghgteakqckvl155b4ckvl1nwtvglelqdzl1glzml6pbuglzmln4s9gmmmy7yc2gmmmyc7mtgmmmymzr2|-1|DEF:23-25:-0.0062;DEF:35-49:-0.0088;DEF:52-65:-0.0057 789bC8DSkOpuBwU2BiaemCqc6CqoBe8C4rB6Di9B|w4d4p6xdow5d5poftzw919d4q9zw919dowu8wfmfy4oa3wflg3e3hdwflg3hokywl2lenwtmwl2le5bb2g4d4phgs4g575le1l1g5d5p51ang8z9be1l1g9ra3dol9c9zab4m9zcfgfke1l1ggfgre1l1ckvl155b4ckvl1nwtvgldlpe1l1glzml6pbuglzmln4s6gmmmy7yc2gmmmyc7mtgmmmymzr2|-2|AB:24-27:-0.0038;DEG:24-27:0.007;DEF:35-43:0.0084;DEF:48-61:-0.0078 789bC+DOuOpuBuU2BqaekC0c4CuoBe6C8rB4Dg9B|w4d4p6udnw5d5po5txw909c4p9tw9zabp3uawfmfy4pa4wfkg3e2h5wfkg3h5kzwl2lenwtmwl2ld5cb2g4d4phgs4g545geckqc5d5k58awg5h5neckqg8x99delmc959cp3ucg9oa0delmcfdfje0l1cfgfl4pa4cghgteckqckvl156b4ckvl1nwtvgldlpe2l1glzml6qbuglzmln4s9gmmmy81c3gmmmyc7mtgmmmyn0r2|-4|HJK:34-44:-0.0031;ABC:39-42:0.0041;DEF:47-60:-0.0067 789bCkEOuObS4UY2ZpuByc8B+mBemC8rBiDu8B|w4d4p6sdlw5d5po5tyw919d4o9uwfefq4oa2wfefqoxubwfng1hhliwfng1djhhwl2le5ab1g4d4phfs5g545gebkqc5c5l55aug5h5ne9kqc5o5xe9kqg8y9addlmc959cp3udg9pa1dblmcf8fd4ma4cf8fdovudcfrfx4ma4cfrfxovudcktl1nwu0ckwl153b3cl2lenutpglclodyl1glzml6nbtglzmln4s9gmmmy7xc1gmmmyc6mtgmmmyn0r2|-5|ABC:38-48:-0.007;HJK:40-47:0.0046 DH3eC0KaywC|w2r49kduhc2r3v4fcuc4b64kdukcpvr7kauk",
      OA: "DH1eC6ZSmnExIikCIikCyG20BG20B|w0038kcukc002948cqc3e6wkcun",
      OS: "320bCwEQwSeSwU8B+5BxW2YY8ayUyWUyW|w434p4xdwwkqlc4vdywkqlcl1u4g434pi0qwg434nr2u0c5e5m4he2g5e5ljjuigm1mo6osd|-1 320bCwEQySeSyU+Bm8BxW4YY8ayUyWUyW|w444p4wdvwm2molvsbwm2mog8lvg434phzqwg434nr2u0c5e5m4ge1g5e5mjiuiglzmo6hg0|-2 320bCwDQ6QeS4S+B+5BxY2Yc8ayWyWWyW|w434p4xdwwkqlc4vdywkqlcl1u6g434pi0qwg434nr2u0gm1mo6qsb|-3 321bC0DQuOeS+PoCg5BxUgTyB2oBywBkmBwBkmB|w4b4s51dywkfkwl3ugwkfkw4kdywkxle4xdwg4a4si1qxg4a4qr3u0c5b5h4ke4g5b5hjkuigkxlel3u6glymg6rsb 32NbC2EQwSeSwU+Bg8BxW0YY6ayUuWUuW|w434p53e0wm1mnlxsawm1mngblxg434pi2qxg434nr3u0c5e5m4le4g5e5ljkuiglymn6lg5 763bC+FMwPpU+SeuZemBqeyCm8BxoBigBoBigB|w454n5vc2w5d5t4oabwc4ck4oabwc4ckooubwkxlb4qagwkxlbojubg454jfokgg454jknsug4k4yfokgg5a5odvl4g5d5tomuec5p65cvm2c5u614la4c5u61oyuec9h9k4ladc9h9komubccjcpdvl4glblpdvl4glzmm5hb2glzmmo0tigmmmz6kb6gmlmzbbnogmmmznvsf 772bC0DOgNpUiTe6YegBya6BipBe8B2sB4Cq8B|w4b4p6xc5w9c9op9u7w9c9o4u9owfwg8p9u7wfwg84u9qwg5gjd7hewl0le5qaewl0leolt9g3x4bfwr4c3x4a81c5g4b4zfwk5g4b4oots4c5c5i5c9mc5c5ipdtpc5d5mdrlag8d8kdrlag8l8xd5lug9b9jd7lucg5gjhlluglglsdrlagm2mr8bctgm2mrm8qogmqn2czly||DEFG:10-16:-0.0076;DEFG:17-19:0.0078;DEFG:20-22:0.0046;DEFG:31-44:0.009 789bCiEO4NpQyUUwXeW6Z0B4oBe2B+rB0Cw9B|w4d4p6vdnw8w9c4qa4w8w9cowucwfmfyowucwftgce2h6wftgch6l0wl1ldnytowl1ld5bb2g4d4phhs6g555hdpldc5c5o51aag5c5ooqtxg5i5udpldg8o90dplbg919ddplbg9sa4dpldc9xa44qa4c9xa7owucglflre0l2glzml6pbuglzmln6sbgmmmy80c3gmmmyc7mvgmmmyn1r4||HK:8-10:0.0046;ABC:11-18:-0.0047;ABC:19-26:-0.0077;HJK:11-20:0.0043;HJK:21-24:0.0065;DEG:28-32:-0.0049;DEG:33-37:-0.0084;DEG:38-42:-0.0112 E95bC0FQqTeSoV+Bo8B|w4a4v4metwm2mj5mf5g4a4ok7uhg5c5uk7uqc5p5w4accgm2mkfjtn",
      OU: "221bC+FGoKeIsM2Bw7BxUgaUgaySoXSoX|w424v50eswm0ms5jezg414lk1tog5d5wk6ugc5q5w4idicknl9iwugcm0msf6tk 223bCoFGsJeIsL+Bg8BxYubYubyWgZWgZ|w464v50eswm0mj5peeg464njztog5b5sk6ugc5n5s4hdhgm0mjeltd 319bCyFMmReOyTyB+4BxU8aU8aySmYSmY|w3x4n51dywkjl84zdywkjl8l3u4g3x4ni1qxg3x4kr3u0c5f5r4ke4g5f5rjkuigm6mw6rsd 320bC2EMyOeOyQ8B85BxW4YYgbyUwWUwW|w434p51dywkplb4ze0wkplbl3u4g434pi4qxg434nr3u0c5d5m4le4g5d5njkuigm1mo6sse DH4eC0FqBq7BxEwIEwI|w3w4nkaugc3v4f4acqc4o5kkaujc5i5p4acqc5m6cm6ujckkl94gepcm3mp4auj",
      OZ: "321bO0ES6Ie4B0L0CojBe2CioBuD46BxgCmTgCmTy+BuQ+BuQ|w4b4r50dxwenf44hckwenf4mgujwkxle4ydxg4a4si0qvg4a4qr2tzg5a5rjjuhc5a5q4fcsckhkwloujgkwlel1u5glymf6qsa 32QbO0EQ6Ge4B4JyD24BxuCybwCsdxiD6rBiD6rBysC4ZgDoqB|w4a4r51dywkfkwlouewkfkx4ndgwkwle4xdyg4a4si3qxg4a4qr3tyg5a5qjjugc5a5q4hctgkxlel2u4glymg94ptclymgpzscclzmg6q8y|-1 32QbO0ESgJe4B+LuD24BxqCybsCsdx+C6rB+C6rByoC4Z8CoqB|w4a4r51dywkfkwlouewkfkx4ndgwkwle4xdyg4a4qr3tyg4a4si1qxg5a5qjjugc5a5q4hcugkxlel2u4glymg95ptclymgpzscclzmg6q8y|-2 333bOqEWuMe4B4S8CmoBe+C0rB6Dy7B|w4c4p7ndnw5b5pnwtvw8r92p3udw8r924n9zwfffw4n9dwfmg0hhm7wfmg0cvhhwl3le6ibbwl3lenrsig4c4pgvrhg555gedkrc5g5meakrc5j5p54b6g8k8qe0l2c8m8r4n9zc8m8rp3ufg8q92e2l2g9f9rcsm9cfqfxptufcl1l8eakrcl9lkedkrglymxageuglymxk8olgmxn3f2k1|-1|CDEF:28-30:0.004;CDEF:47-57:-0.0035;GH:28-31:-0.0076;GH:32-46:-0.011;AB:39-42:0.0047;DEF:58-61:-0.0033 333bOqEWuMe4B2S+C+nBegD0rB8Dw7B|w4c4p7ndpw5b5pnwtvw8r92p3udw8r924n9zwfafr4n9ewfmg0hhm7wfmg0cvhhwl3le6kbbwl3lenpskg4c4pgvrhg555gedkrc5g5meakrc5j5p54b6g8k8qe0l2c8m8r4n9zc8m8rp3ufg8q92e2l2g9f9rctm9cfpfsptufcl0l8eakrcl8lkedkrglymxageuglymxk8omgmxn2f3k2|-2|CDEF:28-38:0.0053;CDEF:39-42:0.0033;CDEF:48-58:-0.0035;GH:28-36:-0.0067;GH:37-47:-0.0095;DEF:59-62:-0.0033 359bO2EcwOe4BuV4C0nBe6C6rB4D87B|w4d4p7vdtw5c5onwtkw9qa3pjudwfrg24p9jwfrg2pjudwfrgagtkxwfrgae6iowl1lcokttwl1lc5eakg4d4pgvr7g555ge8kug5b5o5gb6c5h5oe8kug939ed3lzc9qa14n9lg9ta5d3lzca2ab4n9lca4abphufca5abd5lzckwl057amckwl0oitxcl9lke8kuglwmj6wc7glwmjmxs6gmjmt8bcdgmhmtcjmhgmjmtmnqt||EF:7-11:-0.0037;DEF:46-53:0.0078;DEF:54-60:0.0053 388bCkGG+Le4BuSwC8feyCwkBmD0vBeoD8zB4D68B|w4d4r7md1w5l5zoctpwdfdqdmh5wdfdqh5ldwdpe06kaswdpe0oaskwldlpdmhjwldlphjldwlym9exjowm3mcj8ogc4d4rn2rhc4d4tfrmwc5d5l5vapc5d5loct7c5l5z6fapg8q91dmlfc8w974l8wc8w97q5uec989j4l8wc989kq5ueg9e9pdmlfcd9dfdklfcdpe04j6dcdpe0squgcdzeadklfghti5dclochxi84j8tchxi8q5uegiiiudclocivizdclocm2mb6magcm2mbonsi|-m|DEFG:29-39:-0.0089;DEFG:41-51:-0.0055;DEFG:53-59:0.0126 772bO+DYqMe4BqT8C4oBe+CytB4Dq9B|w8d8p4k9nw8d8ppeufw9c9tpeuhwfwg84k9nwfwg8peufwg3ghd6hgwkzlcoqtlwlelsd6hiwlelshilvc3x4b7vc7g3x4bfur8g4b4yfuk5c4b4p6oc7g4b4ooysac5a5ed6lxc5c5k529nc5c5kpgtxc868d4k9nc868dpeuhg8k8wd6lxg9a9md6lxc9c9o4k9ng9n9sdqldcfrfv4k9ncg3ghhmlvgm1mrmbqwgm2mr87crgmqn2cym1|-1|EF:7-11:-0.0066;GHJ:28-45:0.0061;DEF:47-54:-0.0069;DEF:55-60:-0.0096 772bO+DYyMe4BqT8C4oBe+CytB4Dq9B|w3x4b7wc7w4b4p6qc7w9c9tpeufwfwg84l9mwfwg8peufwg3ghd5hgwkzlcoqtnwlelsd5hiwlelshilvg3x4bfurag4b4yfuk5g4b4ooysbc5a5ed3lxc5c5k519mc5c5kpgtxg8k8wd5lxc8n8q4j9mc8n8qpeuhg9a9nd5lxc9c9o4j9mg9n9sdpldcfrfv4j9mcg3ghhmlvgm2mr86crgm2mrmbqwgmqn2cxm1|-2|EF:7-11:-0.0067;GHJ:28-45:0.0061;DEF:47-54:-0.0069;DEF:55-60:-0.0096 772bOkDYkMe4ByS8CsoBe+CytB4Dq9B|w484p6mc5w8f8r4i9lw8f8rpduewfwg84i9lwfwg8pduewg3ghd4hfwkzlcootjwkzlc5ea7wlelsd4hbc3x4785c5g3x4bfsr7g4b4rfsk3g4c4oows9g535fd2hfg535fhllwg8k8wd2lwg9a9nd2lwc9c9k4i9lc9c9kpdugg9n9sdmlccfrfv4i9lcg3ghhlluglelshjlugm2mr85cqgm2mrmaqvgmqn2cwm0|-3|EF:7-11:0.0066;DEF:28-45:0.0122;DEF:47-53:-0.0066;DEF:54-60:-0.0094",
      QS: "223eCgF8Bq6BxawbawbyYiZYiZ|w464v4zeswktldlkujwktld4ldkg464nk0trg5b5ok7ujgm0mj5mtg 738eCoEkCo6BxiBwckB2eycsacsa|w4d4u6ofbwkslbkxtlwkslb5fe2g4d4ojks0g5a5sjmtlglumbbingglxmb6ubeglxmbnks8 739eCuEoC86BxiBqdkBofygBqbgBqb|w4f4u6mf9wkyld5be0wkyldkttlg4f4pjlrzg595pjltlgltm9bhnfglwm96sbcglwm9njs8 7M8bCqFE2HeG0KkCm6BxiBuckByeyYqaYqa|w4d4u6of9wksl959dwwksl9kvtkg4d4ojkrxg5a5ujktkc5g5s5feic6b6i9wayc6b6inzp3c6y769wayc6y75nzp3glumbbkneglxmb6ubdglxmbnis5|-2 7M8eCoEkCo6BxiBwckB2eycsacsa|w4d4u6ofawksl959dywksl9kwtng4d4ojms0g5a5sjmtlglumbbingglxmb6ubeglxmbnks8",
      RV: "319bCqEG8JeY8MgC+4BxkByakByayiB+XiB+X|w3x4n4ydwwkjl9l4u4wkjl94wdwg3x4ni0qxg3x4kr1u0gm6mw6psb 320bC2DGqIeY6KqCg7BxmB0YoB8aykBsWkBsW|w434p4ydwwm2mocuilwm2mo6ncug434pi0qxg434nr1u0cl2lc52dygl2lcl0tuglzmoitsb 321bCkDG4GeY+I2C86BxkBqT+B6oByiByQ8BkmB|w4b4r4ydwwkikx4idwwkyld4wdwwkyldl2u0g4a4shwqsg4a4qr1u0c5a5e4ge0g5a5ekwugglymg92puclymgq0sbclymf6n8w",
      SA: "320bCqFMwReWwU8By5Bxc6YeibyYyWYyW|w434p4tdvwkplb4rdxwkplbl4uag434pi3r3g434nr7u6c5f5r4adzg5f5rjkuogm2mo6ksg|-1 320eC0D+Bw7BxYwYa8ayWiWWiW|w434p4zdwwm2mo6ncwwm2mocwimg434pi2qxg434nr3tycl4l957doglzmoissc|-2 333bCqDQmObSuVYiae6CicsD+lBeuDkrBuE08B|w4c4p7gdjw9qa14h9ww9qa1p4uhwfafod8hjwfafohjlqwfbfw4h9uwflfwp2uhwl3lensslwl3le6bb6g4c4pgtrkg555gdyl2c5a5j559uc5a5jp2tqc5g5qdhmeg8s8zdlldg909bdnldc90934f9uc9093p4ujg9ra2daloca1abp2uhca2ab4h9wca3accdlbcf5f9d6lscfbfkp2uhcfpfxd6lscl9lkdyl2glymxaberglymxk7ongmxn2ezk1||DEFG:45-53:0.0059;DEFG:55-66:-0.0087;DEG:67-71:-0.0074 343bC6DKqObe8UgBsXe6C0ZwD2mBe6DkqB4Ew7B|w5b5m59ahw9qa14j9ww9qa1p0udwfhfvd9hjwfhfvhjlpwflfw4j9wwflfwp2ufwl3lenqsiwl3le6gb7g4c4o7fdmg4c4ogtrhg545fdxl1g5b5mogttc8i8r4j9wc8i8rp2ufc8r934j9wc8r93p2ufg8y99dmlcg9m9xdblmcl2lddzl1clelkdxl1glxmxaderglxmxk6olgmxn2f0k0||DG:1-5:-0.0091;DEFG:46-56:-0.0033 738eC+DkCi6BxgBwckB2eyesaesa|w4d4t6rfbwksl95fe3wksl9kxtng4d4ojms0g5a5sjmtlglumbbmngglxmb6wbfglxmbnls8",
      SN: "319bC2FMoReOwTyBu7BxU+aU+aySkYSkY|w3x4n51dwwkkl9l1u3g3x4ni0qyg3x4kr0tzc5i5s4ge0g5i5wjjuhgm6mw6psa 320bC8EM0OeOyQ+Bg8BxW0YY4ayUuWUuW|w434p4zdwwm2molwsawm2mogdlwg434pi0qwg434nr0tzc5f5o4ge0g5f5rjjuhclzmo6ng7 32NbC4EG4IeI2K+Bg8BxW4YY8ayUwWUwW|w434p4xdwwm1mnlvsbwm1mngdlvg434pi0qwg434nr2tzc5d5m4fe0g5d5mjiuiglymn6mg7 333bC6DO2OpUiTY6VeoB6XkCgnBewCorBwD08B|w4c4p7mdmw8p934n9zwfig0dzifwfmfx4p9zwfmfxp0ucwfig0gdl2wl3le6hbag4c4pgvrgg545fe1l2g5a5n58b8g5a5nnttsc5g5pe1l2c5o5z4tb8c5o5zp9u5g8v96dolcg9k9vdgllcl3lenosjcl7lje1l2glymxagetglymxk7olgmxn3f0k1|-1|DFG:10-12:0.0094;DFG:53-56:-0.0099;DEFG:21-34:-0.0065;DEFG:40-52:-0.0095 333bCmEO8NpUiTY6VeoB6XkCgnBewCorBwD08B|w4c4p7mdlw8t944n9ywfig0dyidwflfw4n9ywflfwoxu8wfig0gckzwl3le6jb9g4c4pgtrdg565he0kzg5b5p56b7g5b5pnstrc8l8s4n9yg8v96dnlac8x95ozubg9k9wdfljcl3lenmsgcl7lje0kzglymxafesglymxk5oigmxn3f1jz|-2|DFG:10-12:0.0094;DFG:53-56:-0.0098;DEFG:21-34:-0.0065;DEFG:40-52:-0.0095 333bC0EKoNpUyUc2YegBma4B2lBe6BmqB8C28B|w4c4p7ldnw9ra4p5udw9ra44p9zwfafl4p9zwfcfrhjm7wfcfrcvhjwfhfxp1udwfmfx4p9zg4c4pgvrhg545pe2l0g5b5n59ang5b5nofttg8v96dglmc8w924n9zc8w92p3ufg9k9wdglmcfafgp1udcfrfzcvm9clhlme0l0glymxageuglymxk8olgmxn3f2k1|-3|DEG:10-16:-0.012;DEFG:18-42:0.0057;DFG:43-46:0.0059",
      TG: "320bWsEcqJe+BuMsD25BxqC4YsCibyoCuWoCuW|w444p4ydwwkolb4qdwwkolbl2u4g434pi0qxg434nr3u0gm2mo92pucm2moq0secm2mo6n8w|-2 32QbWwFgB4Oe+BwRyD06BxqC0bsCsdxgD6sBgD6sByoC6Z+CorB|w4a4r50dywkgky4mddwkxldl2u4wkwle4ye0g4a4si1qxg4a4qr3u0c5c5s4ie2g5c5sjmukglymg94puclymgq0sdclzmg6p8y 333pW8CsBqOpuB0U8B4de+B8fwDs8BxwC+qBwC+qByuC4oBuC4oB|w4c4p7ndow9ra34p9zw9ra4p1ucwa5ahp1ucwf7fi4n9zwfhfsp1uawl3lennsiwl3le6ibag4c4pgurfg545adzl1g5a5g5hb8g5a5gnstic8y944l9zc8y94p1ucgafardflmcfjfs4na1clalldzl1glymxagetglymxk6okgmxn2ezk0|tg-33c 333bW0DkByNe+BqU+CkmBegDkrBgE08B|w4c4o7idlw8t944j9ww8t94p4ufwfkfwp4ufwfkfw4n9uwfifyhilzwfifyd1hiwl2ld6eb6wl2ldnqskg4c4ogurjg525de9ksg8t94e0l2g9h9sdclmc9qa14j9wc9qa1p4uhg9ta4dclmcfdfj4h9wcfdfjp4uhcl6lhebksglymxaeesglymxk8ongmxn2ezk1|tg-33r|DEFG:31-47:0.0047;DEFG:48-59:-0.0102;DEF:60-64:-0.0114 359bWsEgBwOe+BqTiDqnBekD0rBkEw8B|w5b5onythw5b5o5ib5wfcfopiudwfffyhkkwwfffye4hkwfofz4n9iwfofzpiubwl0lb5cajg4d4p7rdsg4d4pgur7g555ge6kuc5h5le6kuc9298e6kucfyg2e2kycl0lboittgl7lie2kyglwmj6xc3glwmjmxs6gmhmtcimhgmjmtmnqngmjmt8bcb|-3|EF:11-16:-0.0046;DEF:31-50:-0.0124;DEF:51-66:-0.0063 359bWsDoB4Pe+BgTiDwnBekDisBiEm8B|w4d4p7tdrw5b5onutiwfqg14n9hwfqg1pguawfvgde3h7wfvgdh5kuwl0ld5aaowl0ldoatmg4c4pgsr5g545fdllcc5c5j5maic5p5yp2twc9pa04n9jc9ta4dllccl9lke7ksglum0esk8glwmj6uc4glwmjmvs3gmjmt8bcbgmhmtchmfgmjmtmlql|-4|DEF:32-49:0.0068 359bW6DmBoOe+BuUgDunBeiDksB+D27B|w4d4p7tdsw9qa2pgubw9qa24n9kwfig2h6kwwfig2e4h6wfqg14n9iwfqg1pgudwgagje8kswl0lcoctrwl0lc59aog4d4pgur9g545fdolec5c5j5laic5c5joktfg8z9bd4lyg9oa0d4lycfcfie8kuckul053aicl9lje2kyglrlxfnjfglwmj6uc3glwmjmxs6gmhmschmhgmjmsmnqngmjms89cb||EF:14-18:-0.0065;DEF:31-47:-0.0038;DEF:49-62:0.0078;HJK:54-58:-0.0044;HJK:59-62:-0.0072 359bW0DoB0Pe+BgTiDwnBekDisBiEm8B|w4d4p7sdsw5b5onwtlwfrg24n9hwfrg2piudwfvgeh6kwwfvgee4h6wl1ldoctrwl0ld59aog4d4pgur9g545fdwl4c5c5j5laic5p5yp4tzc9pa04n9jg9ta4e6kucl9lke2kyglum0eqk9glwmj6yc3glwmjmxs6gmhmtchmhgmjmtmnqrgmjmt8bcb|tg-35b|DEF:32-49:0.0062 77WbW6CiBsJbkBiPsBqUe+B6VuCqdewCogBsDstBe4DyxBwE88B|w4d4r6sc8w7q7zpwugw7q7z4o96wcncwd8hiwcncwhiluwcnd04o98wd6dgd8hiwd6dghiluwlbllhmluwlymfoes2wlymf6yaog444d88c8g444gfur6c4g4rows8g505ad6lwg7o7yd4lwg8a8jd4lwc8j8r4o98c8j8rpwugggzh9dyl2ghlhvd6lwchrhv4o98chrhvpuuechvi1dqlcclblld8hgglwmpayeyglwmpk4o2|tg-77b|DEF:31-37:0.0071;DEF:41-53:-0.0029;DEF:61-72:-0.0067 772bWmDgBgMe+B6TgDmpBekDktB6Di7B|w4b4p6qc8w9c9t4m9ow9c9tpcuewfvg7pcucwfvg74m9mwg4ggd6hgwkzlc5gacwkzlcootiwl2led6hiwl2lehilug3x4b7wc8g3x4bfur6c4b4oows8g515ddyl2g8i8ndqlcc8j8o4m9oc8j8opcueg8n8zdqlcg9e9qd6lwcg4gghmluckwl1dqlcglelrdolcgm2mr88csgm2mrmaqugmqn2cym0|tg-77e|DEF:31-48:-0.0056;DEF:50-61:-0.0071 77WfCgDE0FbWmIYwJbc6PqBuZe+BkbgCiceiCogB+CstBegDyxB4D88B|w444gfuk4w4d4r6pc8w7q7zpwugw7q7z4n98w8l8v4n98wcnd0pwuewcrd04n96wcsd2d8hiwcsd2hiluwlbllholuwlymfoes2wlymf6zaoc444d88c8g444gkar6g4g4rfuk4g4g4rows8g505ad6lwg7q80d6lwg8c8md6lwc8j8l4n98c8j8rpwugg8n8rdqlcccmcse8kscdadfeaksggxh7dyl2ghkhud6lwchrhv4n98chrhvpuuecl4lbd6lwclblld6hgglwmpayeyglwmpk4o2|tg-77y|DEF:34-46:-0.0052;DEF:48-59:-0.003 788bWmFe4Me+B6T8CkoBegD6tB0Ds7B|w494n6wdpw9e9uouu9wfsg5e2jbwfxgb4ra2wfxgboyucwg6gse2h5wg6gsh5kzwkylcnutmwkylc5hb7g494nhgs4g565jdplbc5f5o58a6c5f5oostsg5j5ndplbc5n5vdplbg8b8ieckqg8j8xeakqc9e9u4ra6g9f9tdrlbckpkx54ajckpkxohtxcl2l9eckqglaloeakqgm0mn6wbygm0mnn4s6gmnn1c7mtgmon27sc3gmon2n0r6||EF:11-14:0.0115;DEF:37-40:0.0049;DEF:41-44:0.0083 789bW6EoBuPe+BmW6CinBe8C+rB6Dy8B|w4d4p6wdmw5e5qoetvw9yae4oa1wfafme1jcwfnfyotu8wfnfy4ra4wfng6e1h4wfng6h4kywl2ldnvtlg4d4phfs3g545geckpc5e5q4zalg5h5neckpc909c4oa4c909covuag9c9pdolbga4ajotu8ga4agdqlbcaeaj4ma1cfafmjkkycl2ld5cb6glclpe1l0glzml6pbuglzmln3s9gmmmy80c2gmmmyc9msgmmmymzr0|-2|DEF:31-42:-0.0041;DEG:46-51:-0.0111;DEG:52-57:-0.0143 789bW+EmByPe+BuV8CgnBegDisB8Du8B|w4d4p6xdpw5e5qoftxwfmfy4qa5wfmfyowu9wflg4e2h6wflg4h4kzwgegpe2l1wl2ldnwtmwl2ld5fb3g4d4phgs4g555he2l1g5e5q50amg5i5qe2l1g8y92e0l1g939fdplag9va7dplac9zab4sa5c9zabowu9ca7ace0l1glcloe0kzglzml6rbvglzmln4s9gmmmycamtgmmmy82c4gmmmyn0r2",
      TK: "319bC2FGgLeI0NuBg5BxS8aS8ayQkYQkY|w3x4n50dxwkkl94ydzwkkl9l1u1g3x4ni2qug3x4kqytxc5g5r4ie1g5g5rjiufgm6mw6rs9 320bCiFGuJeI0L2B65BxU4YW+aySwWSwW|w434p50dxwkplb4ydzwkplbl1u1g434pi0qug434nr1txc5e5r4ke3g5e5rjiugck7kp4mdzgm1mo6rs9|-1 320bCwDImJeKiL8B+5BxY2Ya8ayWuWWuW|w434p4ydwwkqlc4ydywkqlcl1u3g434pi0qwg434nr2tzgm1mo6psa|-2 320bCwDImJeKiL+B+7BxY2Ya8ayWuWWuW|w434p4ydwwm2mo6pd2wm2mod2ikg434pi0qwg434nr2tzglzmoiusc|-3 320bCkFGuJeI0L2B85BxU4YWgbySwWSwW|w444p50dxwkqlb4ydzwkqlbl1u1g434qi2qug434nr0txc5e5s4ke3g5e5sjiufgm2mo6ts9|-4 321bCiEGsHeIgJiCq4BxSqSuBgpByQwPsBqmB|w4b4s50dxwkiky4mdzwkxle4ydzwkxlel1u1g4b4si0qug4b4qr1txc5b5l4ie1g5b5ljiugckbkh4iddckbkhllugckikxl1ueglymf6rs9|-1 321bC6CIkHeKwIsC26BxWsS0BipByU2PyBsmB|w4b4s4wdvwkiky4hdxwkxle4tdxwkxlel1u4g4b4si1qwg4b4qr2u0glymf6nsb|-2 321bCkFKoOeMwRgC66BxoB0oBoB0oBymBgmBmBgmB|w4b4s52dxwkxle4ydzwkxlel1u1g4b4si2qug4b4qr0txc5c5r4ie1g5c5rjiufglymf6rs9|tk-32m 32QbC8DK+MeMgQgCq5Bxa0bcwdxwB8sBwB8sByY4ZuBqrB|w4b4r54dzwkgkw4qe1wkwlcl2u1wkxle52dzg4a4si1qug4a4qr0txc5b5i4me3g5b5ijkufckjkvl2udclymg6q91glymg97psclymgpysa|-1|ABC:28-32:-0.0045 32QbC8DI2KeM0NkCq5Bxe0bgBwdx0B8sB0B8sByc4ZyBqrB|w4b4r57dzwkgkw4re1wkwlcl2u0wkxle53e1g4a4si2qug4a4qr0twc5b5i4ne3g5b5ijkueckjkvl2ucclymg6r91glymg97psclymgpysa|-2|ABC:30-34:-0.0045 321bCgEIqKeMwNiCs5BxSkTsB0oByQ0QqBgmB|w4b4s50dxwkgkx4mdzwkvlcl1u1wkxle4ydzg4b4si2qug4b4qr0txc5c5i4ie1g5c5ijiufckjkvl1udglymf6rs9|tk-32r-2|ABC:30-33:-0.0049 332bCmEGmLeI0UmBioBeoBisBiCq8B|w494n7jdlw8z9bozu9w8z9b4n9zw9qa2ozu9w9qa24n9zwfkfx4n9zwfkfxozubwlzmcaeeswlzmck8okg484ngtrfg545he0l0g5c5n5dawg5c5no5tlg838gdyl0g8u97delmc9c9p4n9zc9c9poxubg9l9ydelmcfug6delmcl8lle2kugmcn3aeesgmcn3k6okgn4n8f1k0||DE:1-3:-0.01;DEFG:4-29:-0.0071;DEF:30-33:-0.0058 333bCkEKyOeQoUyBinBe4BsrB4C08B|w4c4p7mdlw9ra24oa0w9ra2ozu9wfdfrdahkwfdfrhklowfhfx4m9ywfmfxp1ubwl3lenosgwl3le6hb9g4c4pgurfg565he0l1g5b5k57aug5b5ko5tpc5h5rdyl1g8p90dyl1g919cdyl1g9qa2ddlmcfcfh4m9ycfsg3dalrckwl26ab5ckwl2nuspcldlje3kuglymxafesglymxk7okgmxn3f1k0||DE:1-4:0.0144;DEFG:8-13:0.0035;DEFG:28-39:-0.0051 332bCiEIgLeKuRsCq8BxyBisByBisBywBypBwBypB|w494n7ldnw8z9b4n9zw8z9bozu9wfmfy4n9zwfmfzp1ubwlzmcaeeswlzmck8okg494ngtrfg535gdyl0g5c5mo5tlg5d5m5batg848hdyl0g8v98delmckwl5e2kucl5lie2kugmcn3aeesgmcn3k6okgn3n7f1k0|tk-33a|DE:1-4:-0.0089;DEF:34-37:-0.006;DEFG:6-24:-0.0048;DEFG:25-33:-0.0061 332bC2EG2JbIiRK0TeMsWmC69BxoBiqBoBiqBymBgnBmBgnB|w494n7jdow5d5po7tqw7z8bp1ubwfefvdbhkwfefvhklqwfmfy4na0wfmfzp1ueg494ngvrig535gdzl2g5c5p5baug5h5odzl2g7w89dzl2c7y8b4na0g8q92ddloglzn3afetglzn3k8omgn3n7ezk1|tk-33m|DEFG:6-20:0.0061;DEFG:21-29:-0.0065;DEF:30-35:-0.0076 33SbCuDOsOeQoU2C08Bx2BsqB2BsqBy0B8nB0B8nB|w4c4p7ndmw8r93ozu9w9ra24pa1w9ra2ozu9wfifxdbhkwfifxhklpwl3lenosiwl3le6ibac4c4pgvrgc555ge1l1c5b5i5davc5b5mo5tpg919cdzl1g9ra4dglncfdfhdglncftfy4pa1cftfyp2udcktl261b6cldlle3kvglymxagetglymxk7okgmxn3f0k1||DE:1-7:-0.0033;JK:1-6:0.0092;DEFG:8-24:0.0048 359bC0DQ0OeSmV2B0oBe4BmsB2Cs8B|w4d4p7udsw9qa24p9jw9qa9pfu9wfqg14p9jwfqg1pfu9wl0lcohtpwlymgobs4wlymg6wang4d4pgtr4g535fdsl8g5b5l5lavg5b5lo3tag909ccum6g9ra3crm6ca2a94n9lgfwg8e6ksgglgxe8ksclalle6ksglyn3anescmgn382anglyn3k8obcmgn3obqygmxn3eyk2|-1|EF:1-7:-0.0083;DEG:9-27:-0.0093;DEG:30-43:-0.003 359bC2EO4OeQ4UwBynBeyBysBwC48B|w5b5o5lb6w5b5onstfwflg5e4hjwflg5hjktwfrg24q9jwfrg2peu5wlymgoas3wlymg6vang4d4p7tdsg4d4pgtr5g525edql6g5e5pdql6c5p5x56a7c5p5xostrc9498eqk7c9oa0delmc9p9y4o9jc9ra0peu9c9za64o9jca1a5peu9cg6gde8krcl4ld5cajcl4ldoetjclalle2kvglyn3anescmgn383anglyn3k7oacmgn3oaqxcmxn3eyk1|-2|DG:1-7:-0.0028;DEFG:8-10:-0.0082;DEG:11-40:-0.0084 359bC0DQ0OeSmV2B0oBe4BksB2Cq8B|w4d4p7udsw9qa24p9jw9qa9pfu9wfqg1pfu9wfugde4hjwfugdhjkuwlymgobs4wlymg6wang4d4pgtr4g535fdsl8g5b5l5lavg5b5lo3tbg909ccum6g9ra3csm6ca2a94n9lclalle6ksglyn3anescmgn382anglyn3k8obcmgn3obqygmxn3eyk2|-3|EF:1-7:-0.0083;DEG:9-27:-0.0101 738bCoGImOeKoR2Bg6BxWwcY2eyUqaUqa|w4d4t6qfbwkrl9kwtpwkrl95be2g4d4ojns1g5c62jltwc5i6252ehglumbbjnhglxmb6wbeglxmbnmsa 739bC4FI+MeK6P+B66BxasdcqfyYsbYsb|w4f4u6qfbwkyld5de3wkyldkwtng4f4pjns1g5c5zjltwc5h5z53eigltm9blnhglxm96vbfglxm9nmsa 77WbC+CI6JbK2QOqVeWsXgBgceuB2esCqtBewC2wBqD+8BxwBmgBwBmgB|w4g4q6xc4w8k8t4p98w8k8zpuudwcnd0puudwcnd04n96wlymfoarzwlymf71aoc444f7yc4g444gftk3g444gk9r6g4g4qftk3g4g4rous5g525cdqlac7u814p98c7u81psubg7u84d6lug8h8rd6luc8r8xd6luc8u8z4p98cckcudqlach0h84n96ch0h8puudgh3hdd6lughohydqlacl7ljdolaglwmpayexglwmpk3o0|-1|DEG:5-7:-0.005;DEG:11-16:-0.0041;DEG:24-38:-0.0096;DEG:42-53:-0.0114 77WbC8CI0JeWqP0Bwde6BsgByC+rBe2CywBwD68B|w4g4q70c6w7r81puuaw7r814t99w8k8z4t99w8p8zpuuawd2dbd8hhwd2dbhhltwgzh9puucwgzh94r97wlaljhmltwlymfoarzwlymf74arc444f82c8g444gfvk4g444gkar5g4g4qfvk4g4g4rous5g525cdslbg7v85d8lvg8h8rd8lvc8k8ppsuaggvh5dslbcgwgzpuuccgwgz4p99ghhhqdqlbcl9ljd8hhglwmpb1ezglwmpk4o0|-2|DEG:44-56:-0.0064 789bCsEQwPeSkWwBknBeyBisBwCg9B|w4d4p6zdrw9zaioxuawa6ai4wa2wfhg0e4hmwfhg0hml0wfmfy4ua7wl2lenxtmwl2le5fb5g4d4phis5g575je4l2g5d5k5baqg5d5koctqc5k5qe4l2g9197e6l4g989ke6l4c9za54qa2ga0acdrldcfmfyotuaggegqe4l2ckvl159b7ckvl1nxtvgl9lle2l2glzml6qbxglzmln5s9gmmmyc9mugmmmy82c5gmmmyn1r2||EF:1-7:0.0051;DEG:9-24:-0.0087;DEG:27-40:-0.0129 738bCoGImOeKoR2Bg6BxWwcY2eyUqaUqa|w4d4u6ofbwkrl95be4wkrl9kvtpg4d4ojms1g5c62jktvc5i6252ehckbkq4wffglumbbjnhglxmb6ubeglxmbnnsa|tk-78d 739bCgGI+NeKsR2B46BxWsdYsfyUqbUqb|w4f4u6qfbwkikx4we2wkyldkytnwkyld5de2g4f4pjns1g5c5zjltwc5h5z52ehgltm9bjnhglwm96ubeglwm9nmsa|tk-79b 739bC4FI+MeK6P+B66BxasdcsfyYsbYsb|w4f4u6qfbwkikx4we3wkyldkwtnwkyld5de3g4f4pjns1g5c5zjltwc5h5z53eigltm9bjnhglwm9nmsaglxm96vbf|tk-79d 7M8bCkGIgOeKmR2Bi6BxWucY0eyUqaUqa|w4d4t6tfbwkrl95fe3wkrl9kttkg4d4ojlrxg5c62jjtqc5i6256eickbkq50ffglumbbkneglxmb6xbgglxmbnis5 7M9bCyFI6MeK6P+B46BxasdcqfyYsbYsb|w4f4u6sfbwkikx51e3wkyldkttgwkyld5he3g4f4pjlrwg5c5zjjtrc5h5z57eigltm9bkneglwm96ybgglwm9nis4",
      TP: "319bCoEU8aeWidwBg5BySgYSgY|w3x4n4zdxwkjl94xdzwkjl9l2u4g3x4ni2qwg3x4kr2u0cm6mw6l8wgm6mw93pucm6mwq0sd 320bC0DY+aea4c6B85BxW0YW0YyUqWUqW|w444p4zdxwkqlb4xdzwkqlbl2u3g434pi0qwg434nr2tzgm1mo93ptcm1moq0sdcm2mo6m8x 321bC6CeyaegBgcqC66BxUsSwBooByS6PuB6lB|w4b4s52dzwkxle50dzwkxlel3u4g4a4si4qzg4a4qr3u0glymg95pvclymgq1sdclymg6p8z 32NbC0DY8aea4c6B65BxW0YW0YyUqWUqW|w444p4zdxwkplb4xdzwkplbl2u3g434pi0qwg434nr2tzgm1mn93ptcm1mnq0sdcm1mn6m8x 32QbC6CewaegBgcqC66BxUsSwBooByS6PuB4lB|w4b4s52dywkxle4ydywkxlel2u4g4a4si3qyg4a4qr3u0glymf94puclymfq0sdclymf6n8y|-1 32QbC4CiBidekBueqC66BxUqSwBooBySwPuBulB|w4a4r50dxwkxle4wdzwkxldl2u4g4a4si3qzg4a4qr5u0glymf93puclymfq0sdclymf6m8x|-2 32QbC6CI2HeKqJqCi7BxgB0biBudx2B8sB2B8sBye4Z0BiqB|w4b4r51dxwkzle4xdzwkzlekzu1g4a4si2qyg4a4qr2tzglymf92ptclymfq0sdclymf6l8w|-3 32QbCgEKiNeMuR+B66BxY8baudxsBysBsBysByWgaqBgqB|w4a4r4zdxw8r964jdzwkzle4zdzwkzlel0u2g4a4si3qyg4a4qr2u0c5a5h4lerg5a5hk7uec6n6tcwehc7v80cwehc8r96l0ukglymf93puclymfq0sdclymf6m8x|-lr 332bC+CMyLeO4RwBynBeyByrBsC46B|w494n7ldkw8y9b4n9zw8y9boyu8wflfxoyubwflfx4n9zwkyla6ib8wkylanrsig494ngtrfg545ddxl0c5d5o5b9fg5d5onctpg808ddxl0g8u96delmcfffk4n9zcfffkowubcfofsdelmcfsg3jvm1cl4lgejkeglzn3aeesglzn3k6ojcn4n8f0jz||DEFG:7-25:-0.0061;DEFG:26-34:0.011;DEG:35-38:0.012 339bCsCSsOeUqU0B+mBe2BorB2C88B|w4c4o7jdmw9qa1p1ucw9qa14l9wwflfw4l9wwflfwp1uewlxmebpfqwm0me7scog4c4ogtrig5358cqm9c5d5k599pc5d5kp7tlg909bdblng9qa1delncfkfpdelncfpfzdelncl6lc6gb8cl6lcnrsgcl8ljdxkzglymxk7olgmfmxa4ewgmxn2f0k0||EF:5-9:-0.0042;DEFG:27-39:-0.0106;DEG:40-43:-0.0111 E90bC6DIqKeKwM2B07BxaueaueyY2bY2b|w484v4jerwm3mn5kf2g484nk5ufgm3mnfgtk E95bCwDIsJeKsL8B+7B|w4a4v4gerg4a4ok4ufc5n5v42cv",
      UA: "319bCyEGsKeOwOmC+4BxqB6aqB6ayekYekY|w3x4n4zdwwkjl94vdwwm6mw6ngzg3x4nhzqug3x4kr0txgkjl9l2u5gm6mwh5s9|ua-19f 319bCyEGqKeOyOmC64BxqB6aqB6ayemYemY|w3x4n52dwwkjl94wdwwm6mw6pgxg3x4nhzqug3x4kqytwgkjl9l2u4gm6mwh7sa|ua-19s 32QbC0DUmSpoBkVsBgZe8B6bkDs5Bx+BydyC4rBywCoqBwCoqB|w4b4r4xdwwkkky4ldywkzlfkzu2wkzle4tdwg4a4si0qxg4a4qr3u0c595k4efag595kjpulgkkkykzugglymg6osb|ua-21l 32QbCoDK8KeOsN0C67BxoBybqBsdx+B6sB+B6sBygB6Z8BqrB|w4b4r51dyw868k4hckwlymf6qcywlymgcying4a4si1qwg4a4qr0tzc5a5e4je2g5a5gjkuhcktl2l0u9cl3le51e0gl3lel0txglwmgiusa|ua-21n|ABC:25-42:-0.006 320bCwEGuJeOsNsC85BxoB2YqBgbyYsWYsW|w444p53b5wkqlc52b6wm2mo69d8g434pdxjyg434nk2m1gkqlcfzm5gm2modcj8gm2mojckx|ua-32s-2 320bCwEGyJeOqNsC65BxoB2YqBgbyYsWYsW|w444p50dxwkqlc4wdzwm2mo6qh0g434pi0qvg434nr1tygkqlcl1u4gm2moh6ptgm2mopzsb|ua-32s 7M8bCqFI4LeO6OsC46BxoBwcqB2eyeqaeqa|w4d4u6tfbwkxld5le7wkxldkpteg4d4ojlrvg5a5ujjtkc5g5u5feiglumbbkneglymb6ybgglymbnjs5|ua-37e 7M9bC4EK6MeOgPuCi7BxoBodqBofyeobeob|w4f4u6rfbw8q944le7wkzldkttiwkzld5he3g4f4pjlrvg595rjjtmc5f5r5feigltm9bkneglwm96ybgglwm9njs5|ua-39m-1 7M9bC4EKyMeOuPuCi7BxoBodqBofyeobeob|w4f4u6tfbw8n924le7wkzldkutiwkzld5he3g4f4pjlrxg595rjjtkc5f5r5feigltm9bkneglwm96xbgglxm9njs5|ua-39m-2 738bCqFI4LeO8OsC06BxoBwcqB2eyeoaeoa|w4d4u6sfbwkwld5ke5wkwldkrtcg4d4ojlrvg5a5sjjtic5g5s5geiglumbblndglymb6ybgglymbnis4|-1 738bCqFI4LeO2OsC06BxoBwcqB2eyeoaeoa|w4d4t6vfdwkwld5pe7wkwldksteg4d4ojmrwg5a5sjktic5g5s5iejglumbbnneglxmb71biglxmbnis4|-2 739bC8EK2MeOsPuC+6BxoBqdqBqfyeqbeqb|w4f4u6tfbw8p934le5wkzld5he3wkzldkutig4f4pjlrxg595qjjtkc5f5q5feigltm9bkneglwm96xbgglxm9njs5|ua-73c-1 739bC8EK2MeOqPuC+6BxoBqdqBqfyeqbeqb|w4f4u6rfbw8p934je7wkzldkutiwkzld5he3g4f4pjlrxg595qjjtkc5f5q5feigltm9bkneglwm96xbgglxm9nls5|ua-73c-2 73GbCyGGgMeOgQkC05BxqBueqBueye0be0b|w474r6vfcwkql95ne8wkql9krtcg474ljlrtg5c5zjjtic5k5z5heiglwmhblnegm0mh6zbhgm0mhnis4 739bC8EK2MeOqPuC+6BxoBqdqBqfyeqbeqb|w4f4u6tfbw8p934le5wkzld5he3wkzldkutig4f4pjlrxg595qjjtkc5f5q5feigltm9bkneglwm96xbgglxm9njs5|ua-73kl-2 739bC8EK2MeOsPuC+6BxoBqdqBqfyeqbeqb|w4f4u6tfbw8p934je5wkzldkutiwkzld5he3g4f4pjlrxg595qjjtkc5f5q5feigltm9bknfglwm96xbgglwm9njs6|ua-73l-1 738bCsFI2LeOiPsC46BxoBwcqB2eyeoaeoa|w4d4u6sfcwkxld5me8wkxldksteg4d4ojmrvg5a5sjktkc5g5s5gejglumbblnfglxmb6zbhglxmbnls6|ua-73u 753bCwDM8KeO0OkC2uBemC6yB2Co8BxqBifsBogByoB0doB0d|w4j4v5pe8w858h4nd6whni04ld4whni0lxuhg4j4sivt5g565jjtudc5a5j4qe3c858hlsudgl9lg5advgl9lgl7tsclvm96j8mglvm98sq6clvm9qcsk|ua-75e 752bCqEIiMeOyTyCi7BxoB+dqB2fyYmcYmc|w4f4u5se8w8v9a4md4wkzlelgtzwkzle55dng4f4riwt3g585kjru9c8i8v4kcfg8k9ajwuhclxmd6j8nglxmd8tq6clxmdqcsk|ua-75s|AB:1-4:-0.0045 763bCkFkB6dpoBsgBuBglBe8BsnB4C06ByiByciByc|w5e5t4oasw5e5to6uawcnd2dxl1wkvl9oiuawkxljhhlpwkxljd9hhg454o5rb6g454oejkfg454okmtag595odvl3c5p62dvl3ckvl94raiglklqd9lpglzml5mb1glzmlnzthgmlmy6kb4gmlmynusegmlmybbnn|ua-76l|DF:21-23:-0.0046;DEF:31-33:0.0158;DEF:34-36:0.0113;DEF:37-39:0.0065 763bCkFU4UpoB2WuBqbe8BqemDy6Bx+B4f+B4f|w5e5t4qatw5e5to7uawkvl94tahwkvl9ojuawktlfhilqwktlfdahig454o5tb8g454oekkgg454okntag595mdwl4c5w62dwl4glglqdalqglzml5jb1glzmlo0thgmlmynvsfgmlmy6mb5gmlmybdno|ua-76q|DF:20-23:0.0133;DEF:31-34:0.0069;DEF:35-41:0.0122;DEF:42-48:0.0157 764bCsDYsSpoB6XuB4be8B+dqCgmBesCoqBsDo9B|wamayp5ubwamay4s9vwfbfnp5ubwfbfn4s9vwfdfshfllwfdfsdhhfg4a4q5sb7g4a4qekkgg4a4qknt8g565cewk6g595f4natg595fohudgakaxdwl4gljlpdklgglwmf5ib2glwmfnxtkgmfmsntsdgmfms6nb5gmemrbcno|ua-76u|DEF:38-40:-0.0033;DEF:46-50:0.0044;KL:52-54:-0.0072 772bC+CQ0NbS0TeyZpoBgcsB8ee8B4gBsCopBewCotBqDk8B|w3x4bfuk1w9c9o4r9pw9c9op7u5wfwg8p7u7wg3gfd7hdwgrh3e8knwkzlc5oaewkzlcojtbc3x4b7zc5g3x4bk7r2c4b4o70c7g4b4qfuk1g4b4oors2g525ed7ltg8u96d7ltg9l9xd5ltg9ya3dbltcg3gfhllrclclodfljgm2mr8bctgm2mrm6qogmqn2czlx|ua-77e|DG:1-7:0.0091;DEFG:20-22:-0.0061;DEFG:31-34:0.0134;DEFG:35-37:0.0108;DEFG:41-53:0.0056 772bCyCIyLegBwQqCopBeuCmtBqDq9B|w3x4bftk0w3x4b82c4w8c8o4p9pw8c8op8u8wgmh0d6h3wgmh0h3lrwkzlc5nadwkzlcoktfg3x4bk8r3c4b4o6yc6g4b4pftk2g4b4ooss3g525ed6ltc5b5g5d9pc5b5gpctnc5f5mccmng7v87d6ltg8n8zd4ltgm2mr8acsgm2mrm7qqgmqn2cylx|ua-77g|DEFG:17-24:0.0071 772bCyCIyLegByQqCopBeuCmtBqDq9B|w3x4bfuk2w3x4b82c5w8c8o4q9qw8c8op8u8wfzgbd7hhwfzgbhhlrwgoh0e8kowkzlcoktdg3x4bk8r3c4b4o6zc7g4b4pfuk2g4b4ooss3g525ed7ltc5b5g5d9qc5b5gpctnc5f5mcdmng7v87d7ltg8n8zd5ltgm2mrm7qqgm2mr8cctgmqn2czlx|ua-77m|DEFG:17-24:0.0081;DEFG:30-36:0.0031 772bCyCI0LegByQqCupBeuCotBqDo9B|w3x4bfuk1w3x4b84c6w9b9n4r9rw9b9np8u6wg2ged7hewgph1e9kowkzlc5pafwkzlcoltfg3x4bk8r4c4b4o6yc8g4b4pfuk3g4b4oots3g525cd7luc5b5g5f9rc5b5gpctnc8d8p4r9rc8d8pp8u8g8o90d7lucg2gehmlsgm2mrm8qqgm2mr8bcugmqn2czly|ua-77o|DEFG:1-4:-0.0062;DEFG:18-36:0.0047 77WbCuCQyKbS4QkB6YpoB8asBmde8BkgB2CusBe6CuwB0D68B|w444g83c7w4f4q6zc7w8l914q9qw8r91p8u7wczd8d7hhwczd8hhlswh0hapauawh0ha4q9qwl5lg5maewl5lgoltdg444gfuk2g444gk8r4g4g4sfuk2g4g4rots5c535dd5lug7i7ld7lug7m7vd5lug878hd5luc8l8qpau9g8v91d5lugh0had5lughmhvd5luglelod5luglzmj8bctglzmjm8qqgmimpczlygmjmp91cr|ua-77x|DG:1-5:0.0073;DEFG:35-37:-0.0028 788bC8EK+MbMkTOsUpoBkXsBqae8B2cwC2pBe0C4tBqDm8B|w494m6ydnw5e5tortuwg6gqe2h4wg6gqh2kwwkzlcntthwkzlc5jb7g494mhfs0g555jdpl9c5d5t52a7g5k5ndpl9c5u5x509xc5u5xp1tyg8h8vdpl9g9b9gdpl9cknkynttucl8lbeekoglclpeakogm0mn6wbzgm0mnn1s2gmnn1c8mqgmon17uc1gmon1mxr2|ua-78h|DF:1-5:-0.0144;DEF:30-32:0.0051;DEF:33-39:0.0093;DEF:42-53:-0.0051 781bCiEWwRpoB4XsBkae8B+bwCumBe0CwqB4Du8B|w4f4q6zdqw5b5lovtqwalay4ta6wamayotu5wf7fiedkmwfgfq4ta6wfgfqotu5wl6lg5gb4wl6lgnvthg4f4qhgs0g555fdqlac5b5m53a6c5g5ldqlag9va6dqlacafak4ta6cafamp2u7gaiatdqlagaub0dqlagfjftdslagg5ggebkpclblfedkpglglqebkpglwmg6pbuglwmgn8sbgmgmrc9mrgmhms80c4gmhmrmxr0|ua-78j|DEF:30-37:0.0032;DEF:44-59:-0.0072 789bCkEQyPbSgWiB6gBpoBkjBwByoBe8B2rB4C87B|w4d4p6vdpw5d5rovtywa1adoxubwa1ad4oa1wghgweckpwl2le5bb2wl2lenztqg4d4phgs6g555hdplcc5d5n53a3g5h5mdplcg979jdplcg9xa9drlcgaaaedrlccg1g6delnckwl155b4ckwl1nxtwcl6lbeakpglblneakrgloltfhkrglzml6pbuglzmln5sagmmmy80c2gmmmyc7mugmmmyn1r3|ua-78l 789bCqEQiPbSiWYmapoBycsBqfe8BuhBmCmnBe0C2rByD+8B|w4d4p6ydqw5d5pottuw9zabovu7wfnfzovu7wfnfz4ra5wfog5e2h5wfog5h3kyg4d4phgs2g555hdqlbc5d5p54a5g5i5ldqlbg949fdqlbc999dovu7c999d4ra3g9va7dslbc9za94ra3ga8abdqlbcghgtedkpglelqebkpglzml6qbvglzmln3s6gmmmy81c4gmmmyc8msgmmmymyr0|ua-78p|DF:1-7:-0.0098;DEF:44-57:-0.0035 CR2eCqNaulD|wvdxek2unc0000ayc3c2k3n4bcrg2l4ckbuq CR5bC8NIifeOmsBiB+0C|wscthf7uic3h4a4cctg3h4jkbuoc5z7a4fctg5z7akbuoccsfikbuoce7fj4fctcscth4ces CR7bC6IEwOeOsUuBg1C|wscthf6uhc3h4a4ectg3h4kkauncscth4ees ER4eC2IwBk9C|wuivr9fpgc3r474fcsg3r5klpulg5m6bheulg7v8kheulcuhvr4f94cuhvrpsul|ua-e45 E70bCiHEwKeOiOwBg7B|w3x4t4ketwman15kf4g3x4ik5ueg5h5yk5umgman1fftg E75bCuGIiQeO8TuBq7B|w414u4kerwm7mw5if2g414kk4udg5g5skaurckll8kiumcm7mwfgtj|-1 E75bCuGIiQeO6TwBq7B|w414u4leswm7mw5if4g414kk6uhg5g5skcuvcm7mwfitm|-2",
      VL: "319bCyFM+QeOoT0B84BxU6aU6aySmYSmY|w3x4n51dwwkjl84xdywkjl8l1u2g3x4ni2qxg3x4kr3tyc5e5r4he1g5e5rjjuhgm6mw6qsa|-2 319bCwEM0QeOiT2B07BxU8aU8aySmYSmY|w3x4n4zdwwm6mw6pfrg3x4ni2qyg3x4kr2tzgm6mwg1sa 32NbC0EQ2SeSyUgCi8BxW2YY+ayUuWUuW|w444p50dxwm1mnlwsawm1mngalwg434qi2qxg434nr4tzc5d5m4he1g5d5mjjuhglymn6mg2",
      WK: "320eC2EsCk8BxW6YY+ayUwWUwW|w444p4xdvwm2molwscwm2mog8lwg434phzqxg434nr3u1c5d5m4ddzg5d5mjiujglzmo6gg0|-2 320bC0EG4IeI6KqCk6BxW2YY+ayUuWUuW|w444p4udtwkslb4qdtwkslbl1u4g434pi0qxg434nr3u0c5d5m4idzg5d5mjjujgm2mo6nsb 32NbC2EG6IeI6KsCi8BxW4YY+ayUwWUwW|w444p4xdvwm1mnlwsawm1mng8lwg434phzqxg434nr3u1c5d5m4ddzg5d5mjiujglymn6gg0 343eCgDUiObWgUiB6bekB4d2BmnBe4BwqB6Cq8B|w4b4o7ldmw8r92p2ufw8r924n9ywfnfy4n9ywfnfyp0udwl3lenpskwl3le6gb9g4b4ogurhc5a5e5m9eg5a5epktec8m8q4la0c8m8qp2ufg8q91dfllg9i9tdfllc9o9y4la0c9o9yp2ufc9t9ydfllcfnfrdfljcl0l2npskclalldykzglxmxafetglxmwk7olgmxn2f1k1|-1|DEFG:1-10:-0.0136;DEFG:29-38:0.0032 343eCgDUiObW0UkBieeoB6f2BknBe4BoqB6Cs8B|w4c4o7pdqw8r92p3ufw8r924ra1wfnfy4ra1wfnfyp1ucwl3lenqskwl3le6kbcg4c4ogwrhc5a5f5s9hg5a5fpktec8m8q4pa1c8m8qp3ufg8q92dilmg9i9tdilmc9pa04pa3c9pa0p3ufc9ta1dilmca0a84pa3ca0a8p3ufca1a6dilmca9ag4pa1ca9agp3ufcfqfzdilocl0l26ibecl0l2nqskclalle1l1glymxaievglymxk9omgmxn2f4k2|-2|DEFG:1-10:-0.0136;DEFG:20-38:0.0042 359bCiEQ6OpUiUckYeoB0ZiC8nBekCqsBiDs8B|w4d4p7vdtw9pa0pgu9w9pa04r9kwfng6hkkuwfng6e5hkwfug34rauwfug3o5u9wl2lc5jbgg4d4pgtr6g535ed3lxc5c5j5r9wg5c5jp1t6g5f5nd5lxg979dd5lxg9qa1d5lxcg6gfe3kwcl2lcnltkclalle7ksglwmj6xc6glwmjmvs4gmjn28dd1gmjn2lxqmgmrn2d5lr|-2|DFG:10-14:0.0033;DFG:20-32:0.0067;DFG:34-39:-0.0029 359bCqEKwOeoBsTsCqnBeuC2rBuDu8B|w5b5onvtew5b5o5lb6wfcfopfu8wfffyhkkuwfffye5hkwfofzpfu8wfofz4r9kwl0lb5famg4d4p7udvg4d4pgur4g555ge7ksc5h5le7ksc9298e7kscfyg2e3kwcl4lboftigl7lie3kwglwmjmvs2glwmj6yc7gmhmtcjmfcmjmtmlqocmjmt8ecd||DG:1-5:-0.0043;DFG:20-39:-0.0125;DFG:40-55:-0.0061;HJK:47-53:0.0043",
      ZH: "320bC6EEuHeG+K2B25BxU6YWibySyWSyW|w444p50dywkplb4ydywkplbl1u3g434pi0qwg434nr2tzc5d5m4fe0g5d5mjiuigm2mo6osb|-1 320bCsFE6IeG8M0B25BxS6YUibyQyWQyW|w444p4zdywkplb4xdywkplbl1u4g434pi0qwg434nr2u0c5d5m4fe0g5d5mjiuigm2mo6osb|-2 320eC6D6B25BxY6YaibyWyWWyW|w444p4ydywkplb4ydywkplbl1u4g434pi0qwg434nr2u0gm2mo6osb|-3 32NbC6EEsHeG+K2B05BxU6YWibySwWSwW|w444p50dywkpla4ydywkplal1u3g434pi0qwg434nr2tzc5d5m4fe0g5d5mjiuigm1mn6osb|-1 32NbCsFE6IeG8M0B05BxS6YUibyQwWQwW|w444p4zdywkpla4vdywkplal1u4g434pi0qwg434nr2u0c5d5m4fe0g5d5mjiuigm1mn6osb|-2 32NeC6D6B05BxY6YaibyWwWWwW|w444p50dywkpla4ydywkplal1u4g434pi0qwg434nr2u0gm1mn6osb|-3 32QbCiEGoKeIyNqB8nBesBksBgCi7Bxa8bcsdyYgaYga|w4a4r4ydxwfwga4bcewfwgamfukwkzle4udxg4a4rhzqwg4a4qr0u0gkzlekzu2clymf6n8uglymf90ptclymgpzsd 333bCgFGmJpImLM2NeOkUwB2nBeyB0rByCu9B|w4c4o7kdow9qa14k9xw9qa1p2ugwfiftp5ugwfift4m9xwfog2dbhlwfog2hllrg4c4ogvrkg545fe1l1g5b5o53asg5b5oo8twc8v944k9xc8v94p2ugg8z9adzl3g9pa0doleclflmeaksglymxaeetglymxk9ongmxn2f2k2||AB:1-3:-0.0068;HJ:1-3:-0.0068;DEFG:4-6:0.007;DEFG:13-18:-0.0044;DEFG:19-24:-0.0071;DEFG:25-36:-0.012;DEG:37-41:-0.0109 359bW2DkB0Op+BkViC6XekC6Z+C6nBegDosB+Ds8B|w4d4p7xdtw9ra34r9kw9ra2pdu8wfog7e5iawftg24raowftg2o9u6wfog7ghkuwl0lbobtkwl0lb5damg4d4pgtr4g555gdxl2g5b5m5nawg5b5mo3tcg8z9bcsm5g9pa0csm5ca3a94p9mca3a9pdu8gglgwe7kscl7lie7ksglwmj6xc4glwmjmvs2gmjmt8dccgmhmtcimfgmjmtmlqo||DEFH:31-33:-0.0103;DEH:34-47:-0.0076;DEH:50-63:-0.0063 738bC0FEmIeGyL6Bo6BxYwcaweyWqaWqa|w4d4t6rfbwkulb5ee2wkulbkutkg4d4ojmrzg5a5sjmtkc5g5s5eejglumbbjngglxmb6pbfglxmbnks8|-1 738bC+FEoJeGuN4Bo6BxWwcYweyUqaUqa|w4d4t6tfcwkulb5ge3wkulbkvtlg4d4ojns0g5a5sjntlc5g5s5gekglumbbmngglxmb6vbgglxmbnls6|-2 738bCoFE0HeG+K8Bu6Bxawcc2eyYqaYqa|w4d4t6rfbwkulb5ee2wkulbkutlg4d4ojmrzg5a5sjmtlc5g5s5gejglumbbjngglxmb6vbfglxmbnks8|-3 7M8bC+FEoJeGuN4Bo6BxWwcYweyUqaUqa|w4d4t6rfcwkulb5ge4wkulbkvtlg4d4ojns0g5a5sjntlc5g5s5gekglumbbkngglxmb6vbgglxmbnns6"
    };
    const CABIN_LETTER = {
      b: "business",
      e: "eco",
      p: "ecoPremium",
      f: "first"
    };
    const fitOutMemo = {};
    function fitOuts(airline) {
      if (airline in fitOutMemo) return fitOutMemo[airline];
      const packed = CABIN_ROWS[airline];
      return fitOutMemo[airline] = packed ? packed.split(" ").map(s => {
        const [blocks, fittings = "", lopa = "", shifts] = s.split("|");
        const v = [ blocks.slice(0, 3) ];
        for (let i = 3; i < blocks.length; ) {
          v.push(blocks[i++]);
          for (let k = 0; k < 4; k++) {
            const [n, next] = readVlq(blocks, i);
            i = next;
            v.push(k % 2 ? n / 1e3 : n);
          }
        }
        const name = airline.toLowerCase() + "-" + v[0].toLowerCase();
        v.push("m", fittings, lopa ? "-" === lopa[0] ? name + lopa : lopa : name);
        shifts && v.push(shifts);
        return v;
      }) : null;
    }
    function cabinRows(deck, leg, key, family) {
      const list = fitOuts(leg.operating || leg.mkt);
      if (!list || !key || "upper" === deck.type) return null;
      const byRow = new Map, exitRows = new Set;
      deck.seats.forEach(s => {
        byRow.set(s.row, s.cabin);
        (s.chars || []).indexOf("E") >= 0 && exitRows.add(s.row);
      });
      const rows = [ ...byRow.keys() ].sort((p, q) => p - q), ends = new Set;
      rows.forEach((r, i) => {
        i && byRow.get(rows[i - 1]) === byRow.get(r) || ends.add(r + byRow.get(r));
        i !== rows.length - 1 && byRow.get(rows[i + 1]) === byRow.get(r) || ends.add(r + byRow.get(r));
      });
      const first = rows[0], last = rows[rows.length - 1];
      let best = null;
      list.filter(v => family ? (TYPE_CODE[v[0]] || "").slice(0, 3) === key.slice(0, 3) : TYPE_CODE[v[0]] === key).forEach(v => {
        const pts = [], end = v.indexOf("m") > 0 ? v.indexOf("m") : v.length;
        const xs = [];
        for (let i = 1; i < end; i += 5) "x" === v[i] && xs.push(v[i + 1], v[i + 3]);
        let score = 0;
        for (let i = 1; i < end; i += 5) {
          if ("x" === v[i] || "y" === v[i]) {
            [ [ v[i + 1], v[i + 2] ], [ v[i + 3], v[i + 4] ] ].forEach(([r, at]) => {
              const exit = "x" === v[i] ? !exitRows.size || exitRows.has(r) : exitRows.has(r + 1) && xs.indexOf(r + 1) >= 0;
              byRow.has(r) && exit && !pts.some(p => p[0] === r) && pts.push([ r, at, "x" ]);
            });
            continue;
          }
          const c = CABIN_LETTER[v[i]];
          [ [ v[i + 1], v[i + 2], 1 === i || v[i - 5] !== v[i] ], [ v[i + 3], v[i + 4], i + 5 >= v.length || v[i + 5] !== v[i] ] ].forEach(([r, at, limit]) => {
            if (limit ? ends.has(r + c) : byRow.get(r) === c) {
              pts.push([ r, at, null, c + "|" + i ]);
              limit && score++;
            }
          });
        }
        let n = end - 5;
        for (;n > 1 && ("x" === v[n] || "y" === v[n]); ) n -= 5;
        if (!pts.some(p => p[0] === last) && CABIN_LETTER[v[n]] === byRow.get(last) && Math.abs(v[n + 3] - last) <= 2 && last > v[n + 1]) {
          pts.push([ last, v[n + 4] ]);
          score += .5;
        }
        if (!pts.some(p => p[0] === first) && v[2] === first) {
          pts.push([ first, v[3] ]);
          score += .5;
        }
        pts.some(p => p[0] === first) && pts.some(p => p[0] === last) && (!best || score > best.score) && (best = {
          pts: pts,
          key: TYPE_CODE[v[0]],
          score: score,
          fittings: v[end + 1],
          lopa: v[end + 2],
          shifts: v[end + 3]
        });
      });
      if (best) return best;
      const blocks = [];
      rows.forEach((r, i) => {
        !i || byRow.get(rows[i - 1]) !== byRow.get(r) || r - rows[i - 1] >= 3 ? blocks.push([ r, r, byRow.get(r) ]) : blocks[blocks.length - 1][1] = r;
      });
      let fit = null;
      list.filter(v => family ? (TYPE_CODE[v[0]] || "").slice(0, 3) === key.slice(0, 3) : TYPE_CODE[v[0]] === key).forEach(v => {
        const own = [];
        for (let i = 1; i < v.length && "x" !== v[i] && "y" !== v[i] && "m" !== v[i]; i += 5) own.push(v.slice(i, i + 5));
        if (own.length !== blocks.length) return;
        let off = 0;
        for (let k = 0; k < own.length; k++) {
          const d = Math.abs(own[k][3] - own[k][1] - (blocks[k][1] - blocks[k][0]));
          if (CABIN_LETTER[own[k][0]] !== blocks[k][2] || d > 1) return;
          off += d;
        }
        (!fit || off < fit.off) && (fit = {
          off: off,
          key: TYPE_CODE[v[0]],
          score: 0,
          fittings: v[v.indexOf("m") + 1] || null,
          lopa: v[v.indexOf("m") + 2],
          shifts: v[v.indexOf("m") + 3],
          pts: own.flatMap((b, k) => [ [ blocks[k][0], b[2], null, blocks[k][2] + "|" + k ], [ blocks[k][1], b[4], null, blocks[k][2] + "|" + k ] ])
        });
      });
      return fit;
    }
    function through(pairs, s) {
      const pts = pairs.slice().sort((p, q) => p[0] - q[0]);
      return y => {
        if (y <= pts[0][0]) return pts[0][1] + (y - pts[0][0]) * s;
        for (let i = 1; i < pts.length; i++) if (y <= pts[i][0]) {
          const [p0, t0] = pts[i - 1], [p1, t1] = pts[i];
          return t0 + (t1 - t0) * (y - p0) / (p1 - p0);
        }
        const [pl, tl] = pts[pts.length - 1];
        return tl + (y - pl) * s;
      };
    }
    function typed(plan, deck, leg, key) {
      const TY = TYPES[key];
      if (!TY || !plan || !plan.seats.length) return null;
      const upper = "upper" === deck.type;
      if (upper && !TY.upper) return null;
      const Fm = upper ? TY.upper.F : TY.F;
      const anchors = (upper ? TY.upper.doors : TY.doors.concat(TY.ow)).slice().sort((p, q) => p - q);
      const own = plan.doors.map(d => (d.y0 + d.y1) / 2).sort((p, q) => p - q).filter((c, i, a) => !i || c - a[i - 1] > .6 * ("grid" === plan.source ? PITCH.eco : 40));
      const ecoW = plan.seats.filter(s => "eco" === (deck.seats.get(s.nr) || {}).cabin).map(s => s.box.w).sort((p, q) => p - q);
      const ax0 = "grid" === plan.source ? plan.W / 2 : (plan.across[0] + plan.across[1]) / 2;
      const sx = (Fm - ("grid" === plan.source ? .4 : 0)) / ("grid" === plan.source ? plan.W : plan.across[1] - plan.across[0]);
      const s0 = "grid" === plan.source ? .79 / PITCH.eco : ecoW.length ? .5 / ecoW[ecoW.length >> 1] : sx;
      const front = Math.min(...plan.seats.map(s => s.box.y), ...plan.rooms.map(r => r.box.y));
      const back = Math.max(...plan.seats.map(s => s.box.y + s.box.h), ...plan.rooms.map(r => r.box.y + r.box.h));
      const limit = upper ? TY.upper.to : TY.cut;
      let pairs = [], s = s0, o = (upper ? TY.upper.doors[0] : TY.doors[0] + .6) - s0 * front, matched = 0, single = null, nominal = !1;
      if (own.length >= 2) {
        let best = null;
        for (let i1 = 0; i1 < own.length; i1++) for (let i2 = i1 + 1; i2 < own.length; i2++) for (let j1 = 0; j1 < anchors.length; j1++) for (let j2 = j1 + 1; j2 < anchors.length; j2++) {
          const ss = (anchors[j2] - anchors[j1]) / (own[i2] - own[i1]);
          if (ss < .7 * s0 || ss > 1.45 * s0) continue;
          const oo = anchors[j1] - ss * own[i1];
          const used = new Set, pp = [];
          let res = 0;
          own.forEach(p => {
            let bj = -1, bd = 1.2;
            anchors.forEach((t, j) => {
              const d = Math.abs(t - (ss * p + oo));
              if (d < bd && !used.has(j)) {
                bd = d;
                bj = j;
              }
            });
            if (bj >= 0) {
              used.add(bj);
              pp.push([ p, anchors[bj] ]);
              res += bd;
            }
          });
          const fm = ss * front + oo, bm = ss * back + oo, lo0 = anchors[0] + .5, hi0 = limit - 1;
          const off = Math.max(0, lo0 - fm) + Math.max(0, bm - hi0) + Math.max(0, fm - lo0 - 2) + Math.max(0, hi0 - 2 - bm);
          const score = 10 * pp.length - res - 2 * off;
          (!best || score > best.score) && (best = {
            score: score,
            pp: pp,
            ss: ss,
            oo: oo
          });
        }
        if (best && best.pp.length >= 2) {
          pairs = best.pp;
          s = best.ss;
          o = best.oo;
          matched = best.pp.length;
        }
      } else if (1 === own.length) {
        const fit = anchors.map(t => {
          const oo = t - s0 * own[0];
          return {
            t: t,
            oo: oo,
            over: Math.max(0, -(s0 * front + oo)) + Math.max(0, s0 * back + oo - limit)
          };
        }).sort((p, q) => p.over - q.over);
        if (fit.length) {
          o = fit[0].oo;
          single = [ own[0], fit[0].t ];
        }
      }
      const grid = "grid" === plan.source;
      const lo = (upper ? TY.upper.from : TY.doors[0]) + .5, hi = limit - (upper ? .5 : 1);
      if (grid && pairs.length >= 2 && Math.abs(pairs[pairs.length - 1][1] - pairs[0][1]) < .2 * (back - front) * s0) {
        s = s0;
        o = pairs.reduce((a, q) => a + q[1] - s0 * q[0], 0) / pairs.length;
        pairs = [];
        nominal = !0;
      }
      const [d0, d1] = TY.ref || [ TY.doors[0], TY.doors[TY.doors.length - 1] ];
      let byRows = grid && plan.rowsAt ? plan.rowsAt.map(([r, at, x, blk]) => {
        const ys = plan.seats.filter(q => parseInt(q.nr, 10) === r).map(q => q.box.y + q.box.h / 2);
        return ys.length ? [ ys.reduce((a, b) => a + b, 0) / ys.length, d0 + at * (d1 - d0), x, blk ] : null;
      }).filter(Boolean).sort((p, q) => p[0] - q[0]) : [];
      const blocks = new Map;
      byRows.forEach(p => {
        p[3] && (blocks.get(p[3]) || blocks.set(p[3], []).get(p[3])).push(p);
      });
      const whole = [ ...blocks.values() ].filter(b => 2 === b.length && b[1][0] > b[0][0]), cabOf = b => b[0][3].split("|")[0];
      new Set(whole.map(cabOf)).forEach(c => {
        const mine = whole.filter(b => cabOf(b) === c);
        if (mine.length < 2) return;
        const k = mine.reduce((a, b) => a + b[1][1] - b[0][1], 0) / mine.reduce((a, b) => a + b[1][0] - b[0][0], 0);
        mine.forEach(([p, q]) => {
          const ym = (p[0] + q[0]) / 2, m = (p[1] + q[1]) / 2;
          p[1] = m + k * (p[0] - ym);
          q[1] = m + k * (q[0] - ym);
        });
      });
      for (let n = -1; n !== byRows.length; ) {
        n = byRows.length;
        byRows = byRows.filter((p, i, all) => "x" !== p[2] || [ all[i - 1], all[i + 1] ].filter(Boolean).every(q => {
          const k = Math.abs(q[1] - p[1]) / (Math.abs(q[0] - p[0]) * s0);
          const door = TY.doors.concat(TY.ow).some(x => x > Math.min(p[1], q[1]) && x < Math.max(p[1], q[1]));
          return k > .8 && k < (door ? 2.5 : 1.6);
        }));
      }
      if (byRows.length >= 2) {
        const rough = through(byRows, s0), pts = byRows.slice(), groups = [];
        own.forEach(y => {
          const t = rough(y), g = groups[groups.length - 1];
          g && t - g[g.length - 1][1] < 3 ? g.push([ y, t ]) : groups.push([ [ y, t ] ]);
        });
        groups.forEach(g => {
          let best = null;
          for (let j = 0; j + g.length <= anchors.length; j++) {
            const dev = g.map(([, t], k) => Math.abs(anchors[j + k] - t)), sum = dev.reduce((p, q) => p + q, 0);
            Math.max(...dev) < 1.2 && (!best || sum < best.sum) && (best = {
              sum: sum,
              j: j
            });
          }
          best && g.forEach(([y], k) => pts.push([ y, anchors[best.j + k] ]));
        });
        pts.sort((p, q) => p[0] - q[0]);
        const kept = pts.filter((p, i) => !i || p[0] > pts[i - 1][0] && p[1] > pts[i - 1][1]);
        const at = through(kept, s0), k0 = kept[0], k1 = kept[kept.length - 1];
        front < k0[0] && at(front) < lo - .7 && kept.unshift([ front, Math.min(lo - .7, k0[1] - .1) ]);
        back > k1[0] && at(back) > hi + .3 && kept.push([ back, Math.max(hi + .3, k1[1] + .1) ]);
        pairs = kept;
        s = s0;
        nominal = !0;
      }
      if (grid && pairs.length < 2 && !nominal && own.length && !upper) {
        const pts = [];
        const root = TY.wing && TY.wing[0];
        if (plan.wingSpan && root) {
          const [w0, w1] = plan.wingSpan, sw = (root[2] - root[1]) / Math.max(1, w1 - w0);
          if (sw >= .85 * s0 && sw <= 1.15 * s0) {
            pts.push([ w0, root[1] ], [ w1, root[2] ]);
            s = sw;
          }
        }
        single && pts.push(single);
        if (pts.length) {
          pts.sort((p, q) => p[0] - q[0]);
          const [ay, at] = pts[0];
          const cabinAt = plan.seats.reduce((b, q) => Math.abs(q.box.y - ay) < Math.abs(b.box.y - ay) ? q : b, plan.seats[0]);
          const cab = (deck.seats.get(cabinAt.nr) || {}).cabin;
          const start = Math.min(...plan.seats.filter(q => (deck.seats.get(q.nr) || {}).cabin === cab).map(q => q.box.y));
          const t0 = at - s * (ay - start);
          if (start > front && t0 > lo && start < ay) {
            pts.unshift([ start, t0 ]);
            const door = TY.doors.filter(x => x > lo + 1 && x < t0).pop();
            const ahead = plan.seats.filter(q => q.box.y + q.box.h <= start);
            null != door && ahead.length && pts.unshift([ Math.max(...ahead.map(q => q.box.y + q.box.h)), door - .6 ]);
          }
          pts.unshift([ front, lo + (TY.F > 5 ? 1 : 0) ]);
          const steady = pts.filter((p, i) => !i || p[0] > pts[i - 1][0] && p[1] > pts[i - 1][1]);
          steady.length >= 2 && steady[0][0] === front && (pairs = steady);
        }
      }
      if (grid && !own.length && byRows.length < 2) {
        s = (hi - lo) / Math.max(1, back - front);
        o = lo - s * front;
      }
      let along;
      if (pairs.length >= 2 && grid) along = through(pairs, s); else {
        if (pairs.length >= 2) {
          const n = pairs.length, mx = pairs.reduce((a, p) => a + p[0], 0) / n, my = pairs.reduce((a, p) => a + p[1], 0) / n;
          const sxy = pairs.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0), sxx = pairs.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
          s = sxx > 0 ? sxy / sxx : s;
          o = my - s * mx;
        }
        along = y => s * y + o;
      }
      if (grid) {
        const f0 = along(front), b0 = along(back);
        if (f0 < lo - .7 || b0 > hi + .3) {
          const raw = along, k = (Math.min(hi, b0) - Math.max(lo, f0)) / Math.max(.01, b0 - f0), base = Math.max(lo, f0);
          along = y => base + (raw(y) - f0) * k;
        }
      }
      const C = 100, axis = Fm * C / 2;
      const X = x => axis + (x - ax0) * sx * C;
      const sBox = grid ? s0 : s;
      const box = b => {
        const c = along(b.y + b.h / 2), h = b.h * sBox;
        return {
          x: X(b.x),
          y: (c - h / 2) * C,
          w: b.w * sx * C,
          h: Math.max(1, h * C)
        };
      };
      const rooms = plan.rooms.map(r => Object.assign({}, r, {
        box: box(r.box)
      }));
      const fitOut = [];
      if (grid && plan.fittings && plan.rowsAt) {
        const num = (t, i, off, k) => parseInt(t.substr(i, 2), 36) / k - off;
        for (let i = 0; i + 9 <= plan.fittings.length; i += 9) {
          const t = plan.fittings, a0 = num(t, i + 1, .3, 600), a1 = num(t, i + 3, .3, 600), s0 = num(t, i + 5, .2, 900), s1 = num(t, i + 7, .2, 900);
          const y0 = (d0 + a0 * (d1 - d0)) * C, y1 = (d0 + a1 * (d1 - d0)) * C, x0 = X(s0 * plan.W), x1 = X(s1 * plan.W);
          fitOut.push({
            kind: {
              g: "galley",
              w: "toilet",
              c: "closet"
            }[t[i]],
            soft: !0,
            box: {
              x: x0,
              y: y0,
              w: x1 - x0,
              h: y1 - y0
            }
          });
        }
        if (fitOut.length) {
          const access = rooms.filter(r => "toiletAccessible" === r.kind).map(r => r.box);
          fitOut.forEach(f => {
            const c = f.box.y + f.box.h / 2;
            "toilet" === f.kind && access.some(a => Math.abs(a.y + a.h / 2 - c) < 200 && Math.min(a.x + a.w, f.box.x + f.box.w) - Math.max(a.x, f.box.x) > 0) && (f.kind = "toiletAccessible");
          });
          for (let i = rooms.length - 1; i >= 0; i--) /^(galley|toilet|closet)/.test(rooms[i].kind) && rooms.splice(i, 1);
          rooms.push(...fitOut);
        }
      }
      const shifts = grid && plan.rowsAt && plan.shifts ? plan.shifts.split(";").map(t => t.split(":")).map(([key, rr, d]) => ({
        key: key,
        r0: +rr.split("-")[0],
        r1: +rr.split("-")[1],
        d: +d * (d1 - d0) * C
      })) : [];
      const placed = (seats => {
        const out = seats.map(q => Object.assign({}, q, {
          box: Object.assign({}, q.box)
        }));
        out.forEach((p, i) => out.slice(i + 1).forEach(q => {
          const a = p.box, b = q.box;
          const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          if (ox <= 0 || oy <= 0) return;
          const [k, n] = ox <= oy ? [ "x", "w" ] : [ "y", "h" ];
          const [lo, hi] = a[k] <= b[k] ? [ a, b ] : [ b, a ], cut = Math.min(lo[k] + lo[n], hi[k] + hi[n]) - hi[k];
          lo[n] -= cut / 2;
          hi[k] += cut / 2;
          hi[n] -= cut / 2;
        }));
        return out;
      })((seats => {
        const row = q => parseInt(q.nr, 10), mid = b => b.y + b.h / 2;
        const across = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const walls = rooms.filter(r => "console" !== r.kind).map(r => r.box);
        const to = new Map;
        seats.forEach(q => {
          const b = q.box;
          const nest = seats.filter(o => row(o) !== row(q) && across(o.box, b) > 2 && ((a, b) => Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))(o.box, b) > 2);
          if (!nest.length || nest.some(o => mid(o.box) <= mid(b))) return;
          const near = Math.min(...nest.map(o => o.box.y));
          const ahead = seats.filter(o => o !== q && nest.indexOf(o) < 0).map(o => o.box).concat(walls).filter(o => across(o, b) > 0 && mid(o) < mid(b)).map(o => o.y + o.h);
          const y = (near + (ahead.length ? Math.max(...ahead) : near - b.h)) / 2 - b.h / 2;
          y < b.y && to.set(q, y);
        });
        return seats.map(q => to.has(q) ? Object.assign({}, q, {
          box: Object.assign({}, q.box, {
            y: to.get(q)
          })
        }) : q);
      })((seats => {
        const cab = q => (deck.seats.get(q.nr) || {}).cabin, size = {};
        const med = v => v.sort((p, q) => p - q)[v.length >> 1];
        new Set(seats.map(cab).filter(Boolean)).forEach(c => {
          const mine = seats.filter(q => cab(q) === c), hs = mine.map(q => q.box.h), h0 = med(hs.slice());
          size[c] = {
            w: med(mine.map(q => q.box.w)),
            h: grid ? Math.min(...hs) : h0
          };
        });
        return seats.map(q => {
          const m = size[cab(q)];
          if (!m) return q;
          const w = grid ? q.box.w : m.w;
          return Math.abs(q.box.w - w) > .15 * w || !grid && (q.box.h < .75 * m.h || q.box.h > 1.15 * m.h) ? q : Object.assign({}, q, {
            box: {
              x: q.box.x + q.box.w / 2 - w / 2,
              y: q.box.y + q.box.h / 2 - m.h / 2,
              w: w,
              h: m.h
            }
          });
        });
      })((seats => {
        const sold = q => (deck.seats.get(q.nr) || {}).cabin;
        const ecoWs = seats.filter(q => "eco" === sold(q)).map(q => q.box.w).sort((p, q) => p - q), ecoW = ecoWs[ecoWs.length >> 1];
        const cab = q => "eco" === sold(q) || "ecoPremium" === sold(q) ? sold(q) : ecoW && Math.abs(q.box.w - ecoW) < .15 * ecoW ? "eco" : grid ? sold(q) : null;
        const list = seats.filter(q => cab(q));
        const mid = q => [ q.box.x + q.box.w / 2, q.box.y + q.box.h / 2 ];
        const pitchOf = new Map(list.map(q => {
          const [cx, cy] = mid(q);
          return [ q, Math.min(...list.map(o => {
            const [, oy] = mid(o);
            return cab(o) === cab(q) && (o => Math.min(o.box.x + o.box.w, q.box.x + q.box.w) - Math.max(o.box.x, q.box.x) > .3 * Math.min(o.box.w, q.box.w))(o) && Math.abs(oy - cy) > q.box.h / 2 ? Math.abs(oy - cy) : 1 / 0;
          })) ];
        }));
        const usual = {};
        new Set(list.map(cab)).forEach(c => {
          const v = list.filter(q => cab(q) === c).map(q => pitchOf.get(q)).filter(isFinite).sort((p, q) => p - q);
          usual[c] = v[v.length >> 1];
        });
        return seats.map(q => {
          const pitch = pitchOf.get(q);
          if (null == pitch || !isFinite(pitch)) return q;
          const share = "eco" === cab(q) ? 42 / PITCH.eco : .78, suite = {
            business: 160,
            first: 200
          }[cab(q)];
          const h = grid && suite ? Math.min(suite, usual[cab(q)] * ("first" === cab(q) ? .9 : .78)) : grid ? Math.min(q.box.h, pitch * share) : Math.max(q.box.h, Math.min(pitch, usual[cab(q)]) * share);
          return h === q.box.h ? q : Object.assign({}, q, {
            box: Object.assign({}, q.box, {
              y: q.box.y + q.box.h / 2 - h / 2,
              h: h
            })
          });
        });
      })((seats => {
        if (!shifts.length) return seats;
        const out = seats.slice(), rowsOf = new Map;
        const across = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0;
        out.forEach((s, i) => {
          const r = parseInt(s.nr, 10);
          (rowsOf.get(r) || rowsOf.set(r, []).get(r)).push(i);
        });
        const rowNrs = [ ...rowsOf.keys() ].sort((p, q) => p - q);
        shifts.forEach(t => {
          const inRow = r => {
            let idx = rowsOf.get(r);
            if (!idx) return [];
            idx = idx.slice().sort((p, q) => out[p].box.x - out[q].box.x);
            const own = [ [ idx[0] ] ];
            idx.slice(1).forEach((i, k) => {
              const a = out[idx[k]].box;
              out[i].box.x - (a.x + a.w) > .5 * a.w ? own.push([ i ]) : own[own.length - 1].push(i);
            });
            return own.filter(blk => blk.every(i => t.key.indexOf(out[i].nr.slice(-1)) >= 0));
          };
          const blocks = rowNrs.filter(r => r >= t.r0 && r <= t.r1).flatMap(inRow);
          const guard = moving => {
            let d = t.d;
            moving.forEach(i => {
              const b = out[i].box;
              out.forEach((o, j) => {
                if (!moving.has(j) && across(o.box, b)) {
                  d < 0 && o.box.y + o.box.h <= b.y + 1 && (d = Math.max(d, Math.min(0, -(b.y - o.box.y - o.box.h - 10))));
                  d > 0 && o.box.y >= b.y + b.h - 1 && (d = Math.min(d, Math.max(0, o.box.y - b.y - b.h - 10)));
                }
              });
            });
            return d;
          };
          const d0 = guard(new Set(blocks.flat()));
          const cy = blk => blk.reduce((a, i) => a + out[i].box.y + out[i].box.h / 2, 0) / blk.length;
          const side = d0 > 0 ? rowNrs.filter(r => r > t.r1) : rowNrs.filter(r => r < t.r0).reverse();
          const other = r => shifts.some(o => o !== t && r >= o.r0 && r <= o.r1 && [ ...o.key ].some(L => t.key.indexOf(L) >= 0));
          let prev = inRow(d0 > 0 ? t.r1 : t.r0).flat();
          for (const r of side) {
            const next = other(r) ? [] : inRow(r).filter(blk => blk.some(i => prev.some(j => across(out[i].box, out[j].box)))).flat();
            if (!next.length || !prev.length || Math.abs(cy(next) - cy(prev) - d0) >= .65 * Math.abs(cy(next) - cy(prev))) break;
            blocks.push(next);
            prev = next;
          }
          const moving = new Set(blocks.flat());
          const d = guard(moving);
          if (!d) return;
          const swept = [ ...moving ].map(i => out[i].box).map(b => ({
            x: b.x,
            w: b.w,
            y: d < 0 ? b.y + d : b.y + b.h,
            h: Math.abs(d)
          }));
          rooms.forEach(r => {
            r.soft || "console" === r.kind || swept.some(w => across(w, r.box) && Math.min(w.y + w.h, r.box.y + r.box.h) - Math.max(w.y, r.box.y) > 0) && (r.box.y += d);
          });
          moving.forEach(i => {
            out[i] = Object.assign({}, out[i], {
              box: Object.assign({}, out[i].box, {
                y: out[i].box.y + d
              })
            });
          });
        });
        return out;
      })(plan.seats.map(s => Object.assign({}, s, {
        box: box(s.box)
      })))))));
      if (grid) {
        const KNEE = 30, cabOf = q => (deck.seats.get(q.nr) || {}).cabin, mid = q => q.box.y + q.box.h / 2;
        const mains = (upper ? TY.upper.doors : TY.doors).map(x => [ (x - .5) * C, (x + .5) * C ]);
        const rowsOf = new Map;
        placed.forEach(q => {
          const r = parseInt(q.nr, 10);
          (rowsOf.get(r) || rowsOf.set(r, []).get(r)).push(q);
        });
        const rowList = [ ...rowsOf.values() ].map(list => ({
          list: list,
          c: list.reduce((a, q) => a + mid(q), 0) / list.length
        })).sort((p, q) => p.c - q.c);
        const blocks = [];
        rowList.forEach((row, i) => {
          const prev = rowList[i - 1];
          prev && !mains.some(([y0, y1]) => (y0 + y1) / 2 > prev.c && (y0 + y1) / 2 < row.c) || blocks.push([]);
          blocks[blocks.length - 1].push(...row.list);
        });
        const over = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 2;
        const things = rooms.filter(r => "console" !== r.kind).map(r => r.box);
        const free = (blk, dir) => {
          const mine = new Set(blk);
          let k = 1 / 0, any = !1;
          blk.forEach(q => {
            const b = q.box, edge = dir < 0 ? b.y : b.y + b.h;
            let best = null;
            const see = (y0, y1, kind) => {
              const d = dir < 0 ? edge - y1 : y0 - edge;
              d >= -1 && d < 400 && (!best || d < best.d) && (best = {
                d: d,
                kind: kind
              });
            };
            placed.forEach(o => {
              o !== q && over(o.box, b) && see(o.box.y, o.box.y + o.box.h, mine.has(o) ? "own" : "seat");
            });
            things.forEach(t => {
              over(t, b) && see(t.y, t.y + t.h, "room");
            });
            mains.forEach(([y0, y1]) => see(y0, y1, "door"));
            if (best && "own" !== best.kind) if ("seat" === best.kind) k = 0; else {
              any = !0;
              k = Math.min(k, best.d - KNEE);
            }
          });
          return any ? Math.max(0, Math.min(150, k)) : 0;
        };
        const ends = blocks.map(blk => {
          const ys = blk.map(mid), c0 = Math.min(...ys), c1 = Math.max(...ys), f = free(blk, -1), b = free(blk, 1);
          const cs = [ ...new Set(blk.map(q => parseInt(q.nr, 10))) ].map(r => rowsOf.get(r).reduce((a, q) => a + mid(q), 0) / rowsOf.get(r).length).sort((p, q) => p - q), gaps = cs.slice(1).map((c, i) => c - cs[i]).sort((p, q) => p - q);
          const s = c1 - c0 > 1 ? Math.min(1 + 10 / gaps[gaps.length >> 1], (c1 - c0 + f + b) / (c1 - c0)) : 1;
          return {
            blk: blk,
            c0: c0,
            c1: c1,
            f: f,
            b: b,
            cabs: new Set(blk.map(cabOf)),
            s: s
          };
        });
        for (let n = 0; n < 3; n++) {
          const least = new Map;
          ends.forEach(e => e.cabs.forEach(c => least.set(c, Math.min(least.has(c) ? least.get(c) : 1 / 0, e.s))));
          ends.forEach(e => e.cabs.forEach(c => {
            e.s = Math.min(e.s, least.get(c));
          }));
        }
        ends.forEach(e => {
          const s = e.s, start = (e.c0 - e.f + e.c1 + e.b) / 2 - s * (e.c1 - e.c0) / 2;
          const to = y => start + (y - e.c0) * s;
          if (Math.abs(to(e.c0) - e.c0) < 1 && Math.abs(to(e.c1) - e.c1) < 1) return;
          const lo = Math.min(...e.blk.map(q => q.box.y)), hi = Math.max(...e.blk.map(q => q.box.y + q.box.h));
          rooms.forEach(r => {
            const c = r.box.y + r.box.h / 2;
            fitOut.indexOf(r) < 0 && c > lo && c < hi && (r.box.y = to(c) - r.box.h / 2);
          });
          e.blk.forEach(q => {
            q.box.y = to(mid(q)) - q.box.h / 2;
          });
        });
      }
      const across = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0;
      const reach = b => {
        const seat = placed.map(q => q.box).filter(q => across(q, b));
        const wide = {
          x: b.x - 50,
          y: b.y,
          w: b.w + 100,
          h: b.h
        };
        const room = rooms.filter(o => o.box !== b && "console" !== o.kind).map(o => o.box).filter(q => across(q, wide));
        const mid = b.y + b.h / 2;
        const side = (l, k) => l.filter(q => (q.y + q.h / 2 - mid) * k > 0 && !(q => Math.min(q.y + q.h, b.y + b.h) - Math.max(q.y, b.y) > .5 * Math.min(q.h, b.h))(q));
        return {
          ahead: (l = seat, Math.max(-1 / 0, ...l.filter(q => q.y + q.h <= b.y + 1).map(q => q.y + q.h))),
          behind: (l => Math.min(1 / 0, ...l.filter(q => q.y >= b.y + b.h - 1).map(q => q.y)))(seat),
          roomAhead: Math.max(-1 / 0, ...side(room, -1).map(q => q.y + q.h)),
          roomBehind: Math.min(1 / 0, ...side(room, 1).map(q => q.y))
        };
        var l;
      };
      const doorSpans = (upper ? TY.upper.doors.map(x => [ x, 1 ]) : TY.doors.map(x => [ x, 1 ]).concat(TY.ow.map(x => [ x, .55 ]))).map(([x, w]) => [ (x - w / 2) * C, (x + w / 2) * C ]);
      const was = new Map(rooms.map(r => [ r, r.box.y ]));
      grid && rooms.forEach(r => {
        if ("console" === r.kind) return;
        const b = r.box;
        if (placed.some(q => across(q.box, b) && Math.min(q.box.y + q.box.h, b.y + b.h) - Math.max(q.box.y, b.y) > 0)) return;
        const {ahead: ahead, behind: behind, roomAhead: roomAhead, roomBehind: roomBehind} = reach(b), ga = b.y - ahead, gb = behind - b.y - b.h;
        const near = (gap, y0, y1) => gap > 2 && !((y0, y1) => (upper ? TY.upper.doors : TY.doors.concat(TY.ow)).some(x => x * C > y0 && x * C < y1))(y0, y1) && (gap < 60 || ((y0, y1) => y1 - y0 < 2.5 * PITCH.eco * s0 * C && placed.some(q => q.box.y + q.box.h / 2 > y0 && q.box.y + q.box.h / 2 < y1))(y0, y1));
        const mid = b.y + b.h / 2;
        const fore = b.y - roomAhead < 45 || doorSpans.some(([f, e]) => e >= b.y - 45 && f <= mid);
        const aft = roomBehind - b.y - b.h < 45 || doorSpans.some(([f, e]) => f <= b.y + b.h + 45 && e >= mid);
        ga <= gb && !aft && near(ga, ahead, b.y) && roomAhead < ahead ? b.y = ahead + 2 : gb < ga && !fore && near(gb, b.y + b.h, behind) && roomBehind > behind && (b.y = behind - 2 - b.h);
      });
      if (grid) {
        const fronts = (upper ? TY.upper.doors.map(x => [ x, 1 ]) : TY.doors.map(x => [ x, 1 ]).concat(TY.ow.map(x => [ x, .55 ]))).map(([x, w]) => (x - w / 2) * C);
        rooms.forEach(r => {
          if ("console" === r.kind) return;
          const b = r.box, end = b.y + b.h;
          const front = fronts.filter(y => y - end > 30 && y - end < 150).sort((p, q) => p - q)[0];
          null == front || placed.some(q => across(q.box, b) && q.box.y + q.box.h / 2 > end && q.box.y + q.box.h / 2 < front) || rooms.some(o => o !== r && "console" !== o.kind && across(o.box, b) && o.box.y + o.box.h / 2 > end && o.box.y < front - 2) || (b.y = front - 2 - b.h);
        });
        const twins = rooms.filter(r => "console" !== r.kind);
        const done = new Set;
        twins.forEach(r => {
          if (done.has(r)) return;
          const y0 = was.get(r), h = r.box.h;
          const set = twins.filter(o => !done.has(o) && Math.abs(was.get(o) - y0) < 5 && Math.abs(o.box.h - h) < 5);
          set.forEach(o => done.add(o));
          if (set.length < 2) return;
          const ds = set.map(o => o.box.y - was.get(o));
          const d = ds.every(v => v > 0) ? Math.min(...ds) : ds.every(v => v < 0) ? Math.max(...ds) : 0;
          set.forEach(o => {
            o.box.y = was.get(o) + d;
          });
        });
      }
      if (grid) {
        const edge = .2 * Fm * C, lavs = rooms.filter(r => "toilet" === r.kind && !r.soft && (r.box.x < X(0) + edge || r.box.x + r.box.w > X(plan.W) - edge));
        const mid = X(plan.W / 2), row = PITCH.eco * s0 * C;
        lavs.filter(p => p.box.x + p.box.w / 2 < mid).forEach(p => {
          const q = lavs.find(o => o.box.x + o.box.w / 2 >= mid && Math.abs(o.box.y - p.box.y) > 5 && Math.abs(o.box.y - p.box.y) < 1.3 * row);
          if (!q) return;
          const [fwd, aft] = q.box.y > p.box.y ? [ p, q ] : [ q, p ];
          fwd.box.y = aft.box.y;
          fwd.box.h = aft.box.h;
          const {ahead: ahead} = reach(fwd.box);
          fwd.box.y - ahead > 10 && fwd.box.y - ahead < 1.5 * row && rooms.push({
            kind: "closet",
            box: {
              x: fwd.box.x,
              y: ahead + 2,
              w: fwd.box.w,
              h: fwd.box.y - ahead - 4
            }
          });
        });
      }
      if (grid) {
        const ways = (upper ? TY.upper.doors.map(x => [ x, 1 ]) : TY.doors.map(x => [ x, 1 ]).concat(TY.ow.map(x => [ x, .55 ]))).map(([x, w]) => [ (x - w / 2 - .1) * C, (x + w / 2 + .1) * C ]);
        const wall = .2 * Fm * C;
        rooms.forEach(r => {
          const b = r.box;
          "console" === r.kind || b.x > X(0) + wall && b.x + b.w < X(plan.W) - wall || ways.forEach(([d0w, d1w]) => {
            if (Math.min(b.y + b.h, d1w) - Math.max(b.y, d0w) <= 0) return;
            const mid = (d0w + d1w) / 2, side = f => Math.min(f.box.x + f.box.w, b.x + b.w) - Math.max(f.box.x, b.x);
            const kin = fitOut.filter(f => side(f) > 0 && Math.abs(f.box.y + f.box.h / 2 - mid) < 300).sort((p, q) => (q.kind === r.kind) - (p.kind === r.kind) || side(q) - side(p))[0];
            const fore = (kin ? kin.box.y + kin.box.h / 2 : b.y + b.h / 2) < mid, at = y => rooms.some(o => o !== r && "console" !== o.kind && Math.min(o.box.x + o.box.w, b.x + b.w) - Math.max(o.box.x, b.x) > 0 && Math.min(o.box.y + o.box.h, y + b.h) - Math.max(o.box.y, y) > 0);
            const [y0, y1] = fore ? [ d0w - b.h, d1w ] : [ d1w, d0w - b.h ];
            if (!at(y0) || !at(y1)) {
              b.y = at(y0) ? y1 : y0;
              r.soft = !0;
            }
          });
        });
      }
      const firm = rooms.filter(r => !r.soft && "console" !== r.kind);
      const soft = rooms.filter(r => r.soft || "console" === r.kind).map(r => {
        const b = r.box, mid = b.y + b.h / 2;
        const hit = placed.map(q => q.box).filter(q => Math.min(q.x + q.w, b.x + b.w) - Math.max(q.x, b.x) > 0);
        const lo = Math.max(-1 / 0, ...hit.filter(q => q.y + q.h / 2 < mid).map(q => q.y + q.h));
        const hi = Math.min(1 / 0, ...hit.filter(q => q.y + q.h / 2 >= mid).map(q => q.y));
        if ("console" !== r.kind && hi - lo < 50) return null;
        let y0 = b.y, y1 = b.y + b.h;
        if (y0 < lo) {
          y0 = lo;
          y1 = lo + b.h;
        }
        if (y1 > hi) {
          y1 = hi;
          y0 = Math.max(lo, hi - b.h);
        }
        return y1 - y0 >= .4 * b.h ? Object.assign({}, r, {
          box: Object.assign({}, b, {
            y: y0,
            h: y1 - y0
          })
        }) : null;
      }).filter(Boolean);
      const F = Fm * C, hull = [];
      const G = GLASS[TY.glass];
      const tailAt = m => {
        const [x0, hs] = TY.tail;
        if (m <= x0) return .5;
        const i = (m - x0) / .5, k = Math.min(hs.length - 1, Math.floor(i));
        const a = hs[k];
        return a + (hs[Math.min(hs.length - 1, k + 1)] - a) * (i - k);
      };
      if (upper) if ("a388" === key) {
        const u = TY.upper, r = .8 * Fm;
        for (let m = u.from; m <= u.to + 1e-6; m += .25) {
          let h = .5;
          m < u.from + r && (h = .5 * Math.sqrt(Math.max(0, 1 - ((u.from + r - m) / r) ** 2)));
          m > u.to - .7 * Fm && (h = Math.min(h, .5 - .15 * (m - (u.to - .7 * Fm)) / (.7 * Fm)));
          hull.push([ m * C, axis - h * F, axis + h * F ]);
        }
      } else {
        const u = TY.upper;
        for (let m = 0; m <= u.to + 1e-6; m += m < G.len * TY.F ? .02 * TY.F : .25) {
          const i = m / (.02 * TY.F);
          let h = Math.min(.5 * Fm, (i >= G.nose.length - 1 ? .5 : G.nose[Math.floor(i)]) * TY.F);
          m > u.to - 4 && (h = Math.min(h, .5 * Fm * (1 - .45 * (m - (u.to - 4)) / 4)));
          hull.push([ m * C, axis - h * C, axis + h * C ]);
        }
      } else {
        const noseAt = m => {
          const i = m / (.02 * TY.F);
          return i >= G.nose.length - 1 ? .5 : G.nose[Math.floor(i)] + (G.nose[Math.min(G.nose.length - 1, Math.floor(i) + 1)] - G.nose[Math.floor(i)]) * (i - Math.floor(i));
        };
        for (let m = 0; m <= TY.cut + 1e-6; m += m < G.len * TY.F ? .02 * TY.F : .25) {
          const h = Math.min(noseAt(m), tailAt(m)) * F;
          hull.push([ m * C, axis - h, axis + h ]);
        }
        hull.push([ TY.cut * C, axis - tailAt(TY.cut) * F, axis + tailAt(TY.cut) * F ]);
      }
      const wing = upper ? [] : TY.wing.map(([d, le, te]) => [ axis - F / 2 - d * C, le * C, te * C ]);
      const doors = [];
      (upper ? TY.upper.doors.map(x => [ x, 1 ]) : TY.doors.map(x => [ x, 1 ]).concat(TY.ow.map(x => [ x, .55 ]))).forEach(([x, w]) => [ "L", "R" ].forEach(side => doors.push({
        side: side,
        y0: (x - w / 2) * C,
        y1: (x + w / 2) * C
      })));
      return {
        source: "type",
        W: F,
        hull: hull,
        wing: wing,
        doors: doors,
        seats: ((seats, rooms) => {
          const out = seats.map(q => Object.assign({}, q, {
            box: Object.assign({}, q.box)
          }));
          const across = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0;
          out.forEach(q => {
            const b = q.box, others = out.filter(o => o !== q && across(o.box, b)).map(o => o.box);
            rooms.forEach(({box: r}) => {
              if (across(r, b)) if (r.y < b.y + b.h && r.y + r.h > b.y + b.h && b.y + b.h - r.y < .4 * b.h) {
                const o = b.y + b.h - r.y, free = Math.min(o, ...others.filter(z => z.y + z.h <= b.y).map(z => b.y - z.y - z.h));
                b.y -= Math.max(0, free);
                b.h -= o - Math.max(0, free);
              } else if (r.y + r.h > b.y && r.y < b.y && r.y + r.h - b.y < .4 * b.h) {
                const o = r.y + r.h - b.y, free = Math.min(o, ...others.filter(z => z.y >= b.y + b.h).map(z => z.y - b.y - b.h));
                b.y += o;
                b.h -= o - Math.max(0, free);
              }
            });
          });
          return out;
        })(placed, firm),
        rooms: firm.concat(soft),
        walls: plan.walls.map(w => ({
          kind: w.kind,
          x0: X(w.x0),
          x1: X(w.x1),
          y: along(w.y) * C
        })),
        glassTip: 0,
        glassF: TY.F * C,
        typeKey: key,
        end: (upper ? TY.upper.to : TY.cut) * C,
        fit: matched,
        lopa: grid ? plan.lopa : null,
        plausible: "grid" !== plan.source || s >= .88 * s0
      };
    }
    const SEAT_BC = {
      eco: "X",
      ecoPremium: "R",
      business: "I",
      first: "O"
    };
    const LAYOUT_KEY = "mmrc_seat_layouts";
    const LAYOUT_TTL = 30 * 24 * 3600 * 1e3;
    const cache = new Map;
    const CACHE_MAX = 150;
    const put = (key, p) => {
      cache.set(key, p);
      cache.size > CACHE_MAX && cache.delete(cache.keys().next().value);
    };
    const layoutMem = new Map;
    function apiGet(path) {
      const get = cards().apiGet;
      return get ? get(path) : Promise.reject(new Error(T("keine API-Zugangsdaten")));
    }
    function normalise(j, cabin) {
      const chars = {};
      const dict = j.dictionaries?.seatCharacteristic || {};
      Object.keys(dict).forEach(k => {
        chars[k] = dict[k].name || k;
      });
      const curDict = j.dictionaries?.currency || {};
      const real = (total, cur) => {
        if (null == total) return null;
        const dp = curDict[cur]?.decimalPlaces;
        return total / Math.pow(10, null == dp ? 2 : dp);
      };
      const decks = [];
      (j.data?.seatmaps || []).forEach(m => (m.decks || []).forEach(d => {
        const plan = ((d.aircraftPlan || []).find(p => "de-DE" === p.lang) || (d.aircraftPlan || [])[0] || {}).imageURL || null;
        const dims = d.deckDimensions || {};
        const seats = [];
        (d.seats || []).forEach(s => {
          const m2 = /^0*(\d+)([A-Z])$/.exec(s.seatNumber || "");
          if (!m2) return;
          const t = (s.travelers || [])[0] || {};
          const p0 = (t.prices || [])[0] || {};
          seats.push({
            nr: m2[1] + m2[2],
            row: Number(m2[1]),
            L: m2[2],
            cabin: s.cabin || cabin,
            label: s.cabin || null,
            free: "available" === t.seatAvailabilityStatus,
            price: real(p0.total, p0.currencyCode),
            currency: p0.currencyCode || null,
            chars: t.seatCharacteristicsCodes || s.seatCharacteristicsCodes || [],
            x: s.coordinates ? s.coordinates.x : null,
            y: s.coordinates ? s.coordinates.y : null
          });
        });
        seats.length && decks.push({
          type: d.deckType || "main",
          plan: plan,
          cabin: cabin,
          width: dims.width ?? null,
          length: dims.length ?? null,
          wingX: [ dims.startWingsX ?? null, dims.endWingsX ?? null ],
          exitX: (dims.exitRowsX || []).length ? dims.exitRowsX.filter(x => null != x) : [ ...new Set(seats.filter(s => null != s.x && s.chars.indexOf("E") >= 0).map(s => s.x)) ],
          facilities: (d.facilities || []).filter(f => f && f.code && f.coordinates && null != f.coordinates.x && null != f.coordinates.y).map(f => ({
            code: f.code,
            x: f.coordinates.x,
            y: f.coordinates.y
          })),
          seats: seats
        });
      }));
      return {
        cabin: cabin,
        decks: decks,
        chars: chars,
        code: j.data?.flight?.aircraftCode || null,
        warnings: (j.warnings || []).map(w => w.code)
      };
    }
    function merge(parts, failedCabins) {
      const chars = {};
      const warnings = new Set;
      const byDeck = new Map;
      const asked = new Map(parts.map(p => [ p.cabin, new Set(p.decks.flatMap(d => d.seats.map(s => s.nr))) ]));
      parts.forEach(part => {
        Object.assign(chars, part.chars);
        part.warnings.forEach(w => warnings.add(w));
        part.decks.forEach(d => {
          const e = byDeck.get(d.type) || {
            type: d.type,
            plan: null,
            seats: new Map,
            answers: []
          };
          e.plan = e.plan || d.plan;
          e.answers.push(d);
          d.seats.forEach(s => {
            if (((s, part) => s.label && s.label !== part.cabin && asked.has(s.label) && !asked.get(s.label).has(s.nr))(s, part)) {
              s.cabin = part.cabin;
              s.doubt = !0;
            }
            const had = e.seats.get(s.nr);
            (!had || had.doubt && !s.doubt || !!had.doubt == !!s.doubt && had.answer.cabin !== had.cabin && s.cabin === part.cabin) && e.seats.set(s.nr, Object.assign({
              answer: d
            }, s));
          });
          byDeck.set(d.type, e);
        });
      });
      const decks = [ ...byDeck.values() ].sort((a, b) => ("main" === a.type ? 0 : 1) - ("main" === b.type ? 0 : 1));
      const model = {
        decks: decks,
        chars: chars,
        warnings: [ ...warnings ],
        failedCabins: failedCabins,
        demotedFirst: !1,
        code: (parts.find(q => q.code) || {}).code || null
      };
      const has = new Set;
      decks.forEach(d => d.seats.forEach(s => has.add(s.cabin)));
      if (has.has("first") && has.has("eco") && !has.has("business") && !has.has("ecoPremium") && failedCabins.indexOf("business") < 0 && failedCabins.indexOf("ecoPremium") < 0) {
        decks.forEach(d => d.seats.forEach(s => {
          "first" === s.cabin && (s.cabin = "business");
        }));
        model.demotedFirst = !0;
      }
      return model;
    }
    function loadAll(leg) {
      const key = legKey(leg) + "|all";
      if (cache.has(key)) return cache.get(key);
      const p = function(leg) {
        if (!leg.acv || !leg.mkt) return Promise.resolve(null);
        const key = leg.acv + "|" + leg.mkt;
        if (layoutMem.has(key)) return layoutMem.get(key);
        let store = {};
        try {
          store = JSON.parse(localStorage.getItem(LAYOUT_KEY) || "{}");
        } catch (e) {}
        const hit = store[key];
        if (hit && Array.isArray(hit.cabins) && Date.now() - (hit.ts || 0) < LAYOUT_TTL) {
          const p = Promise.resolve({
            cabins: hit.cabins
          });
          layoutMem.set(key, p);
          return p;
        }
        const p = apiGet("/shopping/seatmaps/template?aircraftConfigurationVersion=" + encodeURIComponent(leg.acv) + "&marketingAirlineCode=" + encodeURIComponent(leg.mkt)).then(j => {
          const found = new Set;
          (j.data?.seatmaps || []).forEach(m => (m.decks || []).forEach(d => (d.seats || []).forEach(s => {
            s.cabin && SEAT_BC[s.cabin] && found.add(s.cabin);
          })));
          const cabins = ORDER.filter(c => found.has(c));
          try {
            const now = Date.now();
            for (const k of Object.keys(store)) now - (store[k]?.ts || 0) >= LAYOUT_TTL && delete store[k];
            store[key] = {
              ts: now,
              cabins: cabins
            };
            localStorage.setItem(LAYOUT_KEY, JSON.stringify(store));
          } catch (e) {}
          return {
            cabins: cabins
          };
        }).catch(() => {
          layoutMem.get(key) === p && layoutMem.delete(key);
          return null;
        });
        layoutMem.set(key, p);
        return p;
      }(leg).then(layout => {
        const cabins = layout && layout.cabins && layout.cabins.length ? layout.cabins : ORDER.slice();
        return Promise.allSettled(cabins.map(c => function(leg, cabin) {
          const key = legKey(leg) + "|" + cabin;
          if (cache.has(key)) return cache.get(key);
          const p = apiGet("/shopping/seatmaps" + "?originLocationCode=" + encodeURIComponent(leg.from) + "&destinationLocationCode=" + encodeURIComponent(leg.to) + "&departureDate=" + encodeURIComponent(leg.depDate) + "&marketingAirlineCode=" + encodeURIComponent(leg.mkt) + "&marketingFlightNumber=" + encodeURIComponent(leg.mktNo) + "&bookingClass=" + SEAT_BC[cabin]).then(j => normalise(j, cabin));
          p.catch(() => {
            cache.get(key) === p && cache.delete(key);
          });
          put(key, p);
          return p;
        }(leg, c))).then(results => {
          const parts = results.filter(r => "fulfilled" === r.status).map(r => r.value);
          const failed = cabins.filter((c, i) => {
            if ("rejected" !== results[i].status) return !1;
            const e = results[i].reason || {};
            return !(String(e.apiCode || "").split(",").indexOf("85") >= 0 || e.status >= 400 && e.status < 500);
          });
          const model = merge(parts, failed);
          if (!model.decks.length) {
            const firstErr = results.find(r => "rejected" === r.status);
            if (firstErr) throw firstErr.reason;
          }
          failed.length && cache.get(key) === p && cache.delete(key);
          return model;
        });
      });
      p.catch(() => {
        cache.get(key) === p && cache.delete(key);
      });
      put(key, p);
      return p;
    }
    const plans = new Map;
    function measure(text) {
      const svg = function(text) {
        const svg = (new DOMParser).parseFromString(text, "image/svg+xml").documentElement;
        if (!svg || "svg" !== svg.nodeName.toLowerCase()) throw new Error("kein SVG");
        svg.querySelectorAll("script, foreignObject, iframe, image, use, a").forEach(e => e.remove());
        svg.querySelectorAll("*").forEach(e => [ ...e.attributes ].forEach(a => {
          (/^on/i.test(a.name) || /href$/i.test(a.name)) && e.removeAttribute(a.name);
        }));
        return document.importNode(svg, !0);
      }(text);
      const W = Number(svg.getAttribute("width")) || 1016, H = Number(svg.getAttribute("height")) || 4e3;
      const host = document.createElement("div");
      host.style.cssText = `position:fixed;left:-${W + 2e4}px;top:0;width:${W}px;visibility:hidden;pointer-events:none;contain:layout`;
      svg.setAttribute("width", W);
      svg.setAttribute("height", H);
      svg.style.cssText = `display:block;width:${W}px;height:${H}px`;
      host.appendChild(svg);
      document.body.appendChild(host);
      try {
        return planOf(svg, W);
      } finally {
        host.remove();
      }
    }
    function planOf(svg, W) {
      const o = svg.getBoundingClientRect();
      if (!o.width) throw new Error("ohne Layout");
      const box = e => {
        const b = e.getBoundingClientRect();
        return {
          x: b.left - o.left,
          y: b.top - o.top,
          w: b.width,
          h: b.height
        };
      };
      const name = e => (e.getAttribute("id") || "") + " " + (e.getAttribute("class") || "");
      svg.querySelectorAll('[class*="Restriction"], [id*="Restriction"], [id*="Information"], [id*="icon-circle-info"], ' + '[class*="icon-circle-info"], [id^="ui-message-info"], [class="Placeholder_Small"], [id^="Placeholder"]').forEach(e => {
        e.style.display = "none";
      });
      const seats = [];
      const seen = new Set;
      svg.querySelectorAll('g[id^="Seat_"], g[class^="Seat_"]').forEach(g => {
        const m = /^Seat_0*(\d+[A-L])\b/.exec(g.getAttribute("id") || g.getAttribute("class") || "");
        if (!m || seen.has(m[1])) return;
        seen.add(m[1]);
        const b = box(g);
        b.w > 2 && b.h > 2 && seats.push({
          nr: m[1],
          box: b
        });
      });
      const overlaps = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 4 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 4;
      const rooms = [];
      svg.querySelectorAll('[id^="Galley_Toilet_"], [class^="Galley_Toilet_"]').forEach(e => {
        if (e.parentElement && /Galley_Toilet_/.test(name(e.parentElement))) return;
        const kind = e.querySelector('.ToiletAccessible, [id^="ToiletAccessible"]') ? "toiletAccessible" : e.querySelector('.Toilet, [id^="Toilet"]') ? "toilet" : e.querySelector('.Galley, [id^="Galley_"]:not([id^="Galley_Toilet"])') ? "galley" : (e => {
          for (let p = e.parentElement; p && p !== svg; p = p.parentElement) {
            const n = name(p);
            if (/Toilets?_/.test(n)) return "toilet";
            if (/Galleys?_/.test(n)) return "galley";
          }
          return null;
        })(e);
        const b = box(e);
        kind && b.w > 4 && b.h > 4 && rooms.push({
          kind: kind,
          box: b
        });
      });
      new Set(svg.querySelectorAll('[id^="Storage"], [class^="Storage"]')).forEach(g => {
        if (g.parentElement && /^Storage/.test(name(g.parentElement).trim())) return;
        const kids = [ ...g.children ].filter(c => /^(path|rect|g|polygon)$/.test(c.tagName));
        (kids.length ? kids : [ g ]).forEach(c => {
          const b = box(c);
          b.w >= 30 && b.h >= 30 && !(b => seats.some(s => overlaps(s.box, b)))(b) && rooms.push({
            kind: "closet",
            box: b
          });
        });
      });
      const stairEls = [ ...new Set(svg.querySelectorAll('[id*="Stairs"], [class*="Stairs"]')) ];
      const stairs = stairEls.filter(e => !stairEls.some(o => o !== e && e.contains(o))).map(box).filter(b => b.w > 10 && b.h > 10).sort((p, q) => q.w * q.h - p.w * p.h);
      stairs.forEach(b => {
        rooms.some(r => "stairs" === r.kind && Math.abs(r.box.y + r.box.h / 2 - (b.y + b.h / 2)) < W) || rooms.push({
          kind: "stairs",
          box: b
        });
      });
      const walls = [];
      svg.querySelectorAll('[id*="PartitionWall"], [class*="PartitionWall"], [id*="Curtain"], [class*="Curtain"]').forEach(e => {
        const n = name(e);
        if (/PartitionWalls|Curtains/.test(n) && e.children.length) return;
        const b = box(e);
        b.w >= 15 && b.w >= 2 * b.h && walls.push({
          kind: /Curtain/.test(n) ? "curtain" : "wall",
          x0: b.x,
          x1: b.x + b.w,
          y: b.y + b.h / 2
        });
      });
      const doors = [];
      const doorSeen = new Set;
      const expand = e => {
        const b = box(e);
        if (b.h > 200 && e.children.length > 1) {
          [ ...e.children ].forEach(expand);
          return;
        }
        if (b.w <= 0 || b.h <= 0) return;
        const k = Math.round(b.x) + "," + Math.round(b.y);
        if (!doorSeen.has(k)) {
          doorSeen.add(k);
          doors.push({
            side: b.x + b.w / 2 < W / 2 ? "L" : "R",
            y0: b.y,
            y1: b.y + b.h
          });
        }
      };
      new Set(svg.querySelectorAll('[id^="EmergencyExits"], [class^="EmergencyExits"]')).forEach(l => [ ...l.children ].forEach(expand));
      const hullBoxes = [ ...new Set(svg.querySelectorAll('[id^="AirplaneFrame"] path, [class^="AirplaneFrame"] path, [id^="AirplaneFrame"] rect')) ].map(box).filter(b => b.w > 0);
      const lastSeat = Math.max(...seats.map(s => s.box.y + s.box.h));
      const fixed = rooms.filter(r => "closet" !== r.kind);
      for (let i = rooms.length - 1; i >= 0; i--) {
        const r = rooms[i];
        "closet" === r.kind && (r.box.y > lastSeat || fixed.some(f => overlaps(f.box, r.box))) && rooms.splice(i, 1);
      }
      if (!hullBoxes.length || seats.length < 4) throw new Error("Plan unlesbar");
      const across = [ r1(Math.min(...hullBoxes.map(b => b.x))), r1(Math.max(...hullBoxes.map(b => b.x + b.w))) ];
      return {
        source: "plan",
        W: W,
        seats: seats,
        rooms: rooms,
        walls: walls,
        doors: doors,
        across: across
      };
    }
    const PITCH = {
      eco: 50,
      ecoPremium: 62,
      business: 86,
      first: 112
    };
    const GAP_CAP = 4;
    function acrossMap(lanes, F, aisle, aisleBetween) {
      const ys = [ ...new Set(lanes) ].sort((p, q) => p - q);
      if (!ys.length) return {
        at: () => F / 2,
        seat: aisle,
        ys: ys,
        aisleBetween: aisleBetween
      };
      let small = 0, big = 0;
      ys.slice(1).forEach((y, i) => {
        aisleBetween(ys[i], y) ? big++ : small += y - ys[i];
      });
      const seat = Math.max(1, Math.min(2.6 * aisle, (F - big * aisle) / (small + big + 1)));
      const pos = [ seat / 2 ];
      ys.slice(1).forEach((y, i) => pos.push(pos[i] + (aisleBetween(ys[i], y) ? seat + aisle : (y - ys[i]) * seat)));
      return {
        at: y => {
          if (y <= ys[0]) return pos[0] - (ys[0] - y) * seat;
          for (let i = 1; i < ys.length; i++) if (y <= ys[i]) return pos[i - 1] + (pos[i] - pos[i - 1]) * (y - ys[i - 1]) / (ys[i] - ys[i - 1]);
          return pos[pos.length - 1] + (y - ys[ys.length - 1]) * seat;
        },
        seat: seat,
        ys: ys,
        aisleBetween: aisleBetween
      };
    }
    function gridPlan(deck, leg) {
      const answers = deck.answers.slice();
      const firstRow = a => Math.min(...a.seats.map(s => s.row));
      answers.sort((a, b) => firstRow(a) - firstRow(b));
      const eco = answers.find(a => "eco" === a.cabin);
      const cw = 45, F = Math.max(4, (eco || answers[0]).width || 7) * cw;
      const letterLane = {};
      let ecoLanes = [];
      if (eco) {
        const tally = {};
        eco.seats.forEach(s => {
          if (null == s.y) return;
          const t = tally[s.L] = tally[s.L] || {};
          t[s.y] = (t[s.y] || 0) + 1;
        });
        Object.keys(tally).forEach(L => {
          letterLane[L] = Number(Object.entries(tally[L]).sort((p, q) => q[1] - p[1])[0][0]);
        });
        ecoLanes = [ ...new Set(Object.values(letterLane)) ].sort((p, q) => p - q);
      }
      const ecoLetters = Object.keys(letterLane).sort((p, q) => letterLane[p] - letterLane[q]);
      const skipped = (y0, y1) => y1 - y0 > 1.01;
      const ecoAisle = (y0, y1) => ecoLanes.length ? ecoLanes.some((l, i) => i > 0 && l - ecoLanes[i - 1] > 1.01 && ecoLanes[i - 1] >= y0 - .01 && l <= y1 + .01) : skipped(y0, y1);
      const ecoMap = acrossMap(ecoLanes.length ? ecoLanes : [ 0 ], F, cw, skipped);
      const aislesOf = ecoLanes.filter((l, i) => i > 0 && l - ecoLanes[i - 1] > 1.01).length;
      const seats = [], rooms = [], doors = [], fittings = [], parts = [];
      let cursor = 0;
      answers.forEach((a, ai) => {
        const own = a.seats.filter(s => deck.seats.get(s.nr) && deck.seats.get(s.nr).answer === a);
        if (!own.length) return;
        const mark = [ seats.length, rooms.length, doors.length, fittings.length ];
        let pitch = PITCH[a.cabin] || PITCH.eco;
        let lanes = [ ...new Set(own.map(s => s.y).filter(y => null != y)) ].sort((p, q) => p - q);
        const sameGrid = a !== eco && !!eco && a.width === eco.width;
        const byLane = {};
        own.forEach(s => {
          null != s.y && (byLane[s.y] = byLane[s.y] || new Set).add(s.L);
        });
        const jump = lanes.some((l, i) => i > 0 && l - lanes[i - 1] <= 1.01 && [ ...byLane[lanes[i - 1]] ].some(p => [ ...byLane[l] ].some(q => {
          const ip = ecoLetters.indexOf(p), iq = ecoLetters.indexOf(q);
          return ip >= 0 && iq >= 0 && Math.abs(iq - ip) > 1;
        })));
        const blocks = [];
        ecoLanes.forEach((l, i) => {
          (!i || l - ecoLanes[i - 1] > 1.01) && blocks.push([]);
          blocks[blocks.length - 1].push(l);
        });
        const half = lanes.every(l => ecoLanes.indexOf(l) >= 0) && blocks.some(b => {
          const k = b.filter(l => lanes.indexOf(l) >= 0).length;
          return k > 0 && k <= b.length / 2;
        });
        const full = sameGrid && [ ...new Set(own.map(q => q.row)) ].every(r => own.filter(q => q.row === r).length >= ecoLetters.length);
        const shell = sameGrid && aislesOf < 2 && (jump || half || full);
        const midL = ecoLetters.filter(L => blocks.some(b => 3 === b.length && b[1] === letterLane[L]));
        const isMid = q => midL.indexOf(q.L) >= 0;
        const blocked = full && own.some(isMid) && !own.some(q => q.free && isMid(q)) && own.some(q => q.free && !isMid(q));
        shell && (pitch = PITCH.eco);
        let remap = null;
        if (!sameGrid && a !== eco && aislesOf >= 2 && 4 === lanes.length && 1 === lanes.filter((l, i) => i > 0 && l - lanes[i - 1] > 1.01).length) {
          remap = {
            [lanes[0]]: 0,
            [lanes[1]]: 2,
            [lanes[2]]: 3,
            [lanes[3]]: 5
          };
          lanes = [ 0, 2, 3, 5 ];
        }
        let byLetter = null;
        if (!sameGrid && a !== eco && !remap) {
          const rowsOfL = new Map, lettersAt = new Map;
          own.forEach(s => {
            (rowsOfL.get(s.L) || rowsOfL.set(s.L, new Set).get(s.L)).add(s.row);
            null != s.y && (lettersAt.get(s.y) || lettersAt.set(s.y, new Set).get(s.y)).add(s.L);
          });
          const apart = (p, q) => ![ ...rowsOfL.get(p) ].some(r => rowsOfL.get(q).has(r));
          const stacked = [ ...lettersAt.values() ].some(Ls => Ls.size > 1 && [ ...Ls ].every(p => [ ...Ls ].every(q => p === q || apart(p, q))));
          const blocksL = [];
          lanes.forEach((l, i) => {
            (!i || l - lanes[i - 1] > 1.01) && blocksL.push([]);
            blocksL[blocksL.length - 1].push(...[ ...lettersAt.get(l) ].sort());
          });
          const close = lanes.some((l, i) => i && l - lanes[i - 1] < .75);
          const even = bs => {
            const per = [ ...rowsOfL.values() ].reduce((rs, set) => {
              set.forEach(r => rs.add(r));
              return rs;
            }, new Set);
            const n = r => own.filter(s => s.row === r).length, top = Math.max(...[ ...per ].map(n));
            return 1 === new Set([ ...per ].filter(r => n(r) === top).map(r => bs.map(b => b.filter(L => rowsOfL.get(L).has(r)).length).join())).size;
          };
          let moved = !1;
          if (blocksL.length > 1 && !even(blocksL)) for (let b = 0; b < blocksL.length && !moved; b++) for (const dir of [ -1, 1 ]) {
            const to = b + dir, L = dir < 0 ? blocksL[b][0] : blocksL[b][blocksL[b].length - 1];
            if (to < 0 || to >= blocksL.length || blocksL[b].length < 2) continue;
            const next = blocksL.map(x => x.slice());
            next[b] = next[b].filter(x => x !== L);
            dir < 0 ? next[to].push(L) : next[to].unshift(L);
            if (even(next)) {
              blocksL.splice(0, blocksL.length, ...next);
              moved = !0;
              break;
            }
          }
          if (stacked || close || moved) {
            byLetter = {};
            let lane = 0;
            blocksL.forEach((b, i) => {
              i && lane++;
              b.slice().sort().forEach(L => {
                null == byLetter[L] && (byLetter[L] = lane++);
              });
            });
            lanes = [ ...new Set(Object.values(byLetter)) ].sort((p, q) => p - q);
          }
        }
        let perSeat = null;
        if (!sameGrid && a !== eco) {
          const base = s => remap && null != remap[s.y] ? remap[s.y] : byLetter && null != byLetter[s.L] ? byLetter[s.L] : s.y ?? 0;
          const bl = [];
          lanes.forEach((l, i) => {
            (!i || l - lanes[i - 1] > 1.01) && bl.push([]);
            bl[bl.length - 1].push(l);
          });
          const rowNrs = [ ...new Set(own.map(s => s.row)) ].sort((p, q) => p - q);
          const laneSet = new Map;
          own.forEach(s => (laneSet.get(s.row) || laneSet.set(s.row, new Set).get(s.row)).add(base(s)));
          const side = (edge, next) => {
            const across = next.length && (next[0] > edge ? next[0] : next[next.length - 1]);
            const has = (r, l) => laneSet.get(r).has(l), inNext = r => next.some(l => has(r, l));
            const rs = rowNrs.filter(r => has(r, edge) && inNext(r));
            if (rs.length < 4 || !rs.every((r, k) => !k || has(r, across) !== has(rs[k - 1], across))) return null;
            const out = new Map;
            let prev = null;
            rowNrs.forEach(r => {
              if (has(r, edge)) {
                prev = inNext(r) ? !has(r, across) : null != prev && !prev;
                out.set(r, prev);
              }
            });
            return out;
          };
          const left = bl.length > 2 && 1 === bl[0].length ? side(bl[0][0], bl[1]) : null;
          const right = bl.length > 2 && 1 === bl[bl.length - 1].length ? side(bl[bl.length - 1][0], bl[bl.length - 2]) : null;
          if (left || right) {
            const k = .8, L0 = bl[0][0], R0 = bl[bl.length - 1][0], shift = l => l + (left && l > L0 ? k : 0);
            perSeat = new Map;
            own.forEach(s => {
              const l = base(s);
              perSeat.set(s.nr, left && l === L0 ? L0 + (left.get(s.row) ? k : 0) : right && l === R0 ? shift(R0) + (right.get(s.row) ? 0 : k) : shift(l));
            });
            lanes = [ ...new Set(perSeat.values()) ].sort((p, q) => p - q);
          }
        }
        const map = a === eco || shell ? ecoMap : acrossMap(lanes, F, cw, sameGrid ? ecoAisle : skipped);
        const yAcross = s => perSeat && perSeat.has(s.nr) ? perSeat.get(s.nr) : shell && null != letterLane[s.L] ? letterLane[s.L] : remap && null != remap[s.y] ? remap[s.y] : byLetter && null != byLetter[s.L] ? byLetter[s.L] : s.y ?? 0;
        const FAC = [ "LA", "GN", "BA", "CL", "SO", "ST" ];
        const xs = [ ...new Set(own.map(s => s.x).concat(a.facilities.filter(f => FAC.indexOf(f.code) >= 0).map(f => f.x)).filter(x => null != x)) ].sort((p, q) => p - q);
        const rowsByNr = [ ...new Set(own.map(s => s.row)) ].sort((p, q) => p - q);
        const slotY = new Map;
        if (xs.length) {
          let y = cursor, prev = null;
          const rowX = new Set(own.map(s => s.x));
          xs.forEach(x => {
            null != prev && (y += rowX.has(x) && rowX.has(prev) ? pitch * Math.min(GAP_CAP, Math.max(1, x - prev)) : PITCH.eco * Math.min(2, Math.max(1, x - prev)));
            slotY.set(x, y);
            prev = x;
          });
        }
        const yOf = s => null != s.x && slotY.has(s.x) ? slotY.get(s.x) : cursor + rowsByNr.indexOf(s.row) * pitch;
        const len = "eco" === a.cabin || shell ? 42 : .78 * pitch;
        const wideMax = "business" === a.cabin ? 1.5 * ecoMap.seat : 1 / 0;
        const rowsOf = new Map;
        own.forEach(s => (rowsOf.get(s.row) || rowsOf.set(s.row, []).get(s.row)).push(s));
        const put = (nr, y, cx, wide) => seats.push({
          nr: nr,
          box: {
            x: cx - wide / 2,
            y: y + (pitch - len) / 2,
            w: wide,
            h: len
          }
        });
        const stagger = s => {
          const i = rowsByNr.indexOf(s.row), side = [ rowsByNr[i - 1], rowsByNr[i + 1] ].filter(r => null != r);
          const at = map.at(yAcross(s)), here = (r, k) => (rowsOf.get(r) || []).some(t => Math.abs(map.at(yAcross(t)) - at) < k * map.seat);
          return a !== eco && side.length > 0 && side.every(r => !here(r, .95)) && [ rowsByNr[i - 2], rowsByNr[i + 2] ].some(r => null != r && here(r, .5));
        };
        const ownOnEco = sameGrid && !shell;
        const blockOf = y => blocks.reduce((best, b) => Math.abs((b[0] + b[b.length - 1]) / 2 - y) < Math.abs((best[0] + best[best.length - 1]) / 2 - y) ? b : best, blocks[0]);
        const most = new Map;
        const lanesHere = [ ...new Set(own.map(yAcross)) ].sort((p, q) => p - q), blocksHere = [];
        lanesHere.forEach((l, i) => {
          i && !map.aisleBetween(lanesHere[i - 1], l) || blocksHere.push([]);
          blocksHere[blocksHere.length - 1].push(l);
        });
        const thrones = new Map;
        a === eco || ownOnEco || shell || rowsOf.forEach((list, r) => {
          const i = rowsByNr.indexOf(r), side = [ rowsByNr[i - 1], rowsByNr[i + 1] ].filter(q => null != q);
          const inBlock = (b, l) => (l || []).filter(s => b.indexOf(yAcross(s)) >= 0);
          blocksHere.forEach(b => {
            const mine = inBlock(b, list);
            1 === mine.length && b.length > 1 && side.length && side.every(q => {
              const theirs = inBlock(b, rowsOf.get(q));
              return theirs.length > 1 && theirs.some(t => yAcross(t) !== yAcross(mine[0]) && stagger(t));
            }) && thrones.set(mine[0].nr, b);
          });
        });
        ownOnEco && blocks.length && rowsOf.forEach(list => {
          const n = new Map;
          list.forEach(s => {
            const b = blockOf(yAcross(s));
            n.set(b, (n.get(b) || 0) + 1);
          });
          n.forEach((k, b) => most.set(b, Math.max(most.get(b) || 0, k)));
        });
        rowsOf.forEach(list => {
          const ys = list.map(yAcross);
          if (ownOnEco && blocks.length) {
            const groups = new Map;
            list.forEach((s, i) => {
              const b = blockOf(ys[i]);
              (groups.get(b) || groups.set(b, []).get(b)).push([ s, ys[i] ]);
            });
            groups.forEach((members, b) => {
              const l = ecoMap.at(b[0]) - ecoMap.seat / 2, part = (ecoMap.at(b[b.length - 1]) + ecoMap.seat / 2 - l) / most.get(b);
              const off = (most.get(b) - members.length) / 2;
              members.sort((p, q) => p[1] - q[1]).forEach(([s], j) => put(s.nr, yOf(s), l + (off + j + .5) * part, Math.min(.9 * Math.min(part, 2 * ecoMap.seat), wideMax)));
            });
            return;
          }
          list.forEach((s, i) => {
            const me = ys[i];
            const near = ys.filter((v, j) => j !== i && !map.aisleBetween(Math.min(me, v), Math.max(me, v))).map(v => Math.abs(map.at(v) - map.at(me))).filter(d => d > 0);
            const room = near.length ? Math.min(...near, stagger(s) ? map.seat : 1 / 0) : map.seat;
            const b = thrones.get(s.nr), cx = b ? (map.at(b[0]) + map.at(b[b.length - 1])) / 2 : map.at(me);
            put(s.nr, yOf(s), cx, Math.min((a === eco || shell ? 1 : .9) * Math.min(room, 2 * map.seat), wideMax));
          });
        });
        if (a !== eco && !ownOnEco && !shell && own.some(stagger)) {
          const w = .5 * map.seat, h = .55 * len;
          rowsOf.forEach(list => {
            const cy = yOf(list[0]) + pitch / 2, used = l => list.some(s => Math.abs(map.at(yAcross(s)) - map.at(l)) < .6 * map.seat);
            blocksHere.filter(b => b.some(used) && !list.some(s => thrones.get(s.nr) === b)).forEach(b => b.filter(l => !used(l)).forEach(l => fittings.push({
              kind: "console",
              box: {
                x: map.at(l) - w / 2,
                y: cy - h / 2,
                w: w,
                h: h
              }
            })));
          });
          thrones.forEach((b, nr) => {
            const t = seats.find(p => p.nr === nr).box, cy = t.y + t.h / 2;
            [ [ map.at(b[0]) - map.seat / 2, t.x ], [ t.x + t.w, map.at(b[b.length - 1]) + map.seat / 2 ] ].forEach(([x0, x1]) => {
              const ww = Math.min(w, .7 * (x1 - x0));
              fittings.push({
                kind: "console",
                box: {
                  x: (x0 + x1 - ww) / 2,
                  y: cy - h / 2,
                  w: ww,
                  h: h
                }
              });
            });
          });
        }
        if (shell && blocked) {
          const mids = new Set(own.filter(isMid).map(q => q.nr));
          seats.forEach(p => {
            mids.has(p.nr) && (p.held = !0);
          });
        }
        shell && rowsOf.forEach((list, row) => {
          const has = new Set(list.map(s => s.L));
          ecoLetters.forEach(L => {
            has.has(L) || put(row + L, yOf(list[0]), ecoMap.at(letterLane[L]), .9 * ecoMap.seat);
          });
        });
        const slotOf = x => {
          if (slotY.has(x)) return slotY.get(x);
          const k = xs.findIndex(v => v > x);
          if (k <= 0) return 0 === k ? slotY.get(xs[0]) - pitch * Math.min(GAP_CAP, xs[0] - x) : slotY.get(xs[xs.length - 1]) + pitch * Math.min(GAP_CAP, x - xs[xs.length - 1]);
          const a0 = xs[k - 1], b0 = xs[k];
          return slotY.get(a0) + (slotY.get(b0) - slotY.get(a0)) * (x - a0) / (b0 - a0);
        };
        const KIND = {
          LA: "toilet",
          GN: "galley",
          BA: "galley",
          CL: "closet",
          SO: "closet",
          ST: "stairs"
        };
        const rMap = a === eco || shell || ownOnEco ? ecoMap : map;
        const rBlocks = (() => {
          const ls = rMap === ecoMap ? ecoLanes : lanes, out = [];
          ls.forEach((l, i) => {
            (!i || l - ls[i - 1] > 1.01) && out.push([]);
            out[out.length - 1].push(l);
          });
          return out.map(b => [ rMap.at(b[0]) - rMap.seat / 2, rMap.at(b[b.length - 1]) + rMap.seat / 2 ]);
        })();
        const blockAt = c => rBlocks.reduce((best, b) => c >= b[0] && c <= b[1] || Math.abs((b[0] + b[1]) / 2 - c) < Math.abs((best[0] + best[1]) / 2 - c) ? b : best, rBlocks[0] || [ 0, F ]);
        const fit = (c, w, blk) => {
          const ww = Math.min(w, blk[1] - blk[0]);
          const l = Math.max(blk[0], Math.min(blk[1] - ww, c - ww / 2));
          return [ l, l + ww ];
        };
        const freeAt = (y0, c, blk) => {
          const taken = seats.filter(t => t.box.y < y0 + .9 * pitch && t.box.y + t.box.h > y0 + .1 * pitch).map(t => [ t.box.x, t.box.x + t.box.w ]).filter(([l, r]) => r > blk[0] && l < blk[1]).sort((p, q) => p[0] - q[0]);
          let l = blk[0], r = blk[1];
          taken.forEach(([tl, tr]) => {
            tr <= c ? l = Math.max(l, tr) : tl >= c && (r = Math.min(r, tl));
          });
          return r - l > .5 * cw ? [ l, r ] : blk;
        };
        const cells = {};
        a.facilities.forEach(f => {
          const kind = KIND[f.code];
          !kind || !xs.length || "SO" === f.code && (f => a.facilities.some(g => ("GN" === g.code || "BA" === g.code) && Math.abs(g.x - f.x) <= 1 && Math.abs(g.y - f.y) <= 1))(f) || (cells[kind] = cells[kind] || []).push({
            x: f.x,
            y: f.y
          });
        });
        const push = (kind, l, r, y0, y1) => {
          const bx = {
            x: l + 2,
            y: y0 + 2,
            w: r - l - 4,
            h: y1 - y0 - 4
          };
          rooms.some(q => q.kind === kind && Math.abs(q.box.y - bx.y) < .6 * pitch && Math.abs(q.box.x - bx.x) < cw) || rooms.push({
            kind: kind,
            box: bx
          });
        };
        const lavs = new Map;
        (cells.toilet || []).forEach(c => {
          const blk = blockAt(rMap.at(c.y));
          const k = c.x + "|" + blk[0];
          (lavs.get(k) || lavs.set(k, {
            blk: blk,
            x: c.x,
            cs: []
          }).get(k)).cs.push(rMap.at(c.y));
        });
        lavs.forEach(({blk: blk, x: x, cs: cs}) => {
          const w = Math.min(2.3 * cw, (blk[1] - blk[0]) / cs.length), mid = cs.reduce((p, q) => p + q, 0) / cs.length;
          const y0 = slotOf(Number(x)), free = freeAt(y0, mid, blk);
          const [l0] = fit(mid, Math.min(w * cs.length, free[1] - free[0]), free);
          const wEach = Math.min(w, (free[1] - free[0]) / cs.length);
          wEach < 1.2 * cw || cs.sort((p, q) => p - q).forEach((_, i) => push("toilet", l0 + i * wEach, l0 + (i + 1) * wEach, y0, y0 + 1.4 * PITCH.eco));
        });
        [ "galley", "closet", "stairs" ].forEach(kind => {
          const left = (cells[kind] || []).slice();
          for (;left.length; ) {
            const patch = [ left.pop() ];
            for (let i = 0; i < patch.length; i++) for (let j = left.length - 1; j >= 0; j--) {
              const p = patch[i], q = left[j];
              (p.x === q.x && Math.abs(p.y - q.y) <= 1 || p.y === q.y && Math.abs(p.x - q.x) <= 1) && patch.push(left.splice(j, 1)[0]);
            }
            const x0 = Math.min(...patch.map(c => c.x)), x1 = Math.max(...patch.map(c => c.x));
            const lo = rMap.at(Math.min(...patch.map(c => c.y))) - rMap.seat / 2, hi = rMap.at(Math.max(...patch.map(c => c.y))) + rMap.seat / 2;
            const y0 = slotOf(x0), y1 = Math.max(slotOf(x1) + pitch, y0 + ("galley" === kind ? 1.4 * PITCH.eco : pitch));
            const blk = freeAt(y0, (lo + hi) / 2, blockAt((lo + hi) / 2));
            const [l, r] = "galley" === kind && hi - lo < 2 * cw ? fit((lo + hi) / 2, 2 * cw, blk) : [ Math.max(lo, blk[0]), Math.min(hi, blk[1]) ];
            push(kind, l, r, y0, y1);
          }
        });
        a.exitX.forEach(x => {
          const y = slotOf(x);
          null == y || isNaN(y) || doors.push({
            side: "L",
            y0: y + .15 * pitch,
            y1: y + .85 * pitch
          }, {
            side: "R",
            y0: y + .15 * pitch,
            y1: y + .85 * pitch
          });
        });
        const ys = own.map(yOf);
        parts.push({
          shell: shell,
          pitch: pitch,
          rows: rowsByNr.map(r => ({
            r: r,
            y: Math.min(...own.filter(s => s.row === r).map(yOf))
          })),
          items: [ seats.slice(mark[0]), rooms.slice(mark[1]), doors.slice(mark[2]), fittings.slice(mark[3]) ].flat()
        });
        cursor = Math.max(...ys) + pitch + (ai < answers.length - 1 && !shell ? 30 : 0);
      });
      const cutsOf = parts.map((p, i) => p.rows.slice(1).map((q, k) => [ p.rows[k], q ]).filter(([q0, q1]) => parts.some((o, j) => j !== i && o.rows.some(t => t.r > q0.r && t.r < q1.r))).map(([q0, q1]) => (q0.y + p.pitch + q1.y) / 2));
      if (cutsOf.some(c => c.length)) {
        const segs = [];
        parts.forEach((p, i) => {
          const own = cutsOf[i].map(() => []).concat([ [] ]);
          const at = y => cutsOf[i].filter(c => c <= y).length;
          p.items.forEach(it => own[at((it => it.box ? it.box.y + it.box.h / 2 : (it.y0 + it.y1) / 2)(it))].push(it));
          own.forEach((items, k) => {
            const rows = p.rows.filter(q => at(q.y + p.pitch / 2) === k);
            rows.length && segs.push({
              p: p,
              items: items,
              first: rows[0].r,
              s0: rows[0].y,
              s1: rows[rows.length - 1].y + p.pitch
            });
          });
        });
        segs.sort((p, q) => p.first - q.first);
        let y = Math.min(...segs.map(g => g.s0));
        segs.forEach((g, k) => {
          const d = y - g.s0;
          g.items.forEach(it => {
            if (it.box) it.box.y += d; else {
              it.y0 += d;
              it.y1 += d;
            }
          });
          y = g.s1 + d + (k < segs.length - 1 && !g.p.shell ? 30 : 0);
        });
      }
      for (let i = 0; i < rooms.length; i++) for (let j = i + 1; j < rooms.length; j++) {
        const p = rooms[i].box, q = rooms[j].box;
        const across = Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x);
        const gap = Math.max(p.y, q.y) - Math.min(p.y + p.h, q.y + q.h);
        if (rooms[i].kind === rooms[j].kind && "toilet" !== rooms[i].kind && gap <= 8 && across > .5 * Math.min(p.w, q.w)) {
          const x0 = Math.min(p.x, q.x), y0 = Math.min(p.y, q.y);
          rooms[i].box = {
            x: x0,
            y: y0,
            w: Math.max(p.x + p.w, q.x + q.w) - x0,
            h: Math.max(p.y + p.h, q.y + q.h) - y0
          };
          rooms.splice(j, 1);
          j = i;
        }
      }
      if (!seats.length) return null;
      for (let i = rooms.length - 1; i >= 0; i--) {
        const b = rooms[i].box, c = b.y + b.h / 2;
        let y0 = b.y, y1 = b.y + b.h;
        seats.forEach(t => {
          Math.min(t.box.x + t.box.w, b.x + b.w) - Math.max(t.box.x, b.x) <= .3 * Math.min(b.w, t.box.w) || t.box.y + t.box.h <= y0 || t.box.y >= y1 || (t.box.y + t.box.h / 2 < c ? y0 = Math.max(y0, t.box.y + t.box.h + 2) : y1 = Math.min(y1, t.box.y - 2));
        });
        y1 - y0 < ("toilet" === rooms[i].kind ? .8 : .45) * PITCH.eco ? rooms.splice(i, 1) : rooms[i].box = Object.assign({}, b, {
          y: y0,
          h: y1 - y0
        });
      }
      rooms.sort((p, q) => q.box.w * q.box.h - p.box.w * p.box.h);
      for (let j = rooms.length - 1; j > 0; j--) {
        const b = rooms[j].box, c = b.y + b.h / 2;
        let y0 = b.y, y1 = b.y + b.h;
        rooms.slice(0, j).forEach(({box: q}) => {
          Math.min(q.x + q.w, b.x + b.w) - Math.max(q.x, b.x) <= .3 * Math.min(b.w, q.w) || q.y + q.h <= y0 || q.y >= y1 || (q.y + q.h / 2 < c ? y0 = Math.max(y0, q.y + q.h + 2) : y1 = Math.min(y1, q.y - 2));
        });
        y1 - y0 < ("toilet" === rooms[j].kind ? .8 : .45) * PITCH.eco ? rooms.splice(j, 1) : rooms[j].box = Object.assign({}, b, {
          y: y0,
          h: y1 - y0
        });
      }
      rooms.push(...fittings);
      const shape = SHAPES[shapeKeyFor(leg)] || SHAPES.a320;
      const glass = glassOn(leg, deck);
      const front = Math.min(...seats.map(s => s.box.y), ...rooms.map(r => r.box.y)) - 30;
      const back = Math.max(...seats.map(s => s.box.y + s.box.h), ...rooms.map(r => r.box.y + r.box.h)) + 30;
      const half = F / 2 + 14, axis = F / 2;
      const hull = [];
      const noseLen = 2 * (glass ? glass.len : Math.min(shape.nose[0], 1.15)) * half;
      const cone = (arr, f) => {
        const n = arr.length - 1, t = Math.max(0, Math.min(1, f)) * (n - 1), i = Math.min(n - 2, Math.floor(t));
        const a0 = arr[1 + i];
        return .5 * (a0 + (arr[2 + i] - a0) * (t - i));
      };
      for (let t = 0; t <= 1.0001; t += .02) {
        const h = glass ? glass.nose[Math.min(glass.nose.length - 1, Math.round(t * (glass.nose.length - 1)))] || 0 : cone(shape.nose, 1 - t);
        hull.push([ front - noseLen * (1 - t), axis - 2 * h * half, axis + 2 * h * half ]);
      }
      for (let y = front; y <= back; y += 20) hull.push([ y, axis - half, axis + half ]);
      const tailLen = 2 * Math.min(shape.tail[0], 1.6) * half * .6;
      for (let t = .05; t <= 1.0001; t += .05) {
        const h = Math.max(.36, 2 * cone(shape.tail, .6 * t));
        hull.push([ back + tailLen * t, axis - h * half, axis + h * half ]);
      }
      const wing = [];
      const sweep = (y0, y1) => {
        const c = y1 - y0, edge = axis - half;
        for (let k = 0; k <= 10; k++) wing.push([ edge - .06 * k * F, y0 + .62 * c * k / 10, y1 + .08 * c * k / 10 ]);
      };
      const spans = answers.filter(a => null != a.wingX[0] && null != a.wingX[1]).map(a => {
        const own = a.seats.filter(s => null != s.x);
        const at = x => {
          const near = own.reduce((p, s) => Math.abs(s.x - x) < Math.abs(p.x - x) ? s : p, own[0]);
          const sp = near && seats.find(s => s.nr === near.nr);
          return sp ? sp.box.y + (x - near.x) * (PITCH[a.cabin] || PITCH.eco) : null;
        };
        return [ at(a.wingX[0]), at(a.wingX[1]) ];
      }).filter(([y0, y1]) => null != y0 && null != y1 && y1 > y0);
      if (spans.length) sweep(Math.min(...spans.map(q => q[0])), Math.max(...spans.map(q => q[1])) + PITCH.eco); else if (shape.wing) {
        const nose = hull[0][0], len = hull[hull.length - 1][0] - nose;
        sweep(nose + shape.wing[2] * len, nose + shape.wing[3] * len);
      }
      const wingSpan = spans.length ? [ Math.min(...spans.map(q => q[0])), Math.max(...spans.map(q => q[1])) + PITCH.eco ] : null;
      return {
        source: "grid",
        W: F,
        seats: seats,
        rooms: rooms,
        walls: [],
        doors: doors,
        hull: hull,
        wing: wing,
        wingSpan: wingSpan,
        glassTip: glass ? hull[0][0] : null
      };
    }
    const SCALE = .4;
    let patternSeq = 0;
    function deckSvg(plan, deck, leg, nameOf, chars, frame) {
      const tg = plan.typeKey && GLASS[TYPES[plan.typeKey].glass];
      const glass = plan.typeKey ? tg && (tg.deck || "main") === deck.type ? tg : null : glassOn(leg, deck);
      const hull = plan.hull;
      const F = Math.max(...hull.map(h => h[2] - h[1]));
      const widest = hull.find(h => h[2] - h[1] >= .985 * F) || hull[0];
      const axis = (widest[1] + widest[2]) / 2;
      let tip = hull[0][0];
      frame && (tip = Math.min(tip, frame.start));
      const yEnd = hull[hull.length - 1][0];
      const ecoSeats = plan.seats.filter(s => "eco" === (deck.seats.get(s.nr) || {}).cabin).map(s => s.box.w).sort((p, q) => p - q);
      const u = Math.max(34, Math.min(56, ecoSeats.length ? ecoSeats[ecoSeats.length >> 1] : 43));
      const hasWing = !(!plan.wing || !plan.wing.length || "upper" === deck.type);
      const reach = hasWing ? Math.min(.6 * F, plan.typeKey ? 240 : 1 / 0) : 1.8 * u;
      const yTop = axis - F / 2 - reach;
      const head = .3 * u, pad = frame ? 30 : .6 * u;
      const X = y => r1(yEnd - y + pad), Y = x => r1(x - yTop + head);
      const width = yEnd - tip + 2 * pad, height = axis + F / 2 + (hasWing ? reach : .4 * u) - yTop + head + .3 * u;
      const line = r1(.06 * u);
      const out = [];
      out.push(`<svg class="mmsm-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r1(width)} ${r1(height)}" width="${Math.round(width * SCALE)}" height="${Math.round(height * SCALE)}" data-axis="${r1(Y(axis))}" role="img" aria-label="${esc(T("Sitzplan {flight} {deck}", {
        flight: leg.flightNo || "",
        deck: [ "main", "upper", "lower" ].includes(deck.type) ? deckName(deck.type) : ""
      }))}">`);
      const stId = "mmsm-st" + ++patternSeq;
      out.push(`<defs><pattern id="${stId}" width="${r1(.25 * u)}" height="${r1(.25 * u)}" patternUnits="userSpaceOnUse"><rect width="${r1(.25 * u)}" height="${r1(.25 * u)}" fill="#eeebe5"/><rect width="${r1(.07 * u)}" height="${r1(.25 * u)}" fill="#bdb6aa"/></pattern></defs>`);
      if (hasWing) {
        const sm = k => plan.wing.map((_, i) => {
          const w = plan.wing.slice(Math.max(0, i - 2), i + 3);
          return w.reduce((a, q) => a + q[k], 0) / w.length;
        });
        const lo = sm(1), hi = sm(2);
        const keep = plan.wing.map((q, i) => [ q[0], lo[i], hi[i] ]).filter(q => q[0] >= axis - F / 2 - reach);
        if (keep.length > 1) {
          const left = keep.map(([x, l]) => [ x, l ]).concat(keep.map(([x, , h]) => [ x, h ]).reverse());
          [ left, left.map(([x, y]) => [ 2 * axis - x, y ]) ].forEach(poly => out.push(`<polygon class="mmsm-wing" points="${poly.map(([x, y]) => X(y) + "," + Y(x)).join(" ")}" stroke-width="${line}"/>`));
        }
      }
      const pts = hull.map(h => X(h[0]) + "," + Y(h[1])).concat(hull.slice().reverse().map(h => X(h[0]) + "," + Y(h[2])));
      out.push(`<polygon class="mmsm-hull" points="${pts.join(" ")}" stroke-width="${r1(1.6 * line)}"/>`);
      const hs = hull.slice().sort((p, q) => p[0] - q[0]);
      const edgeAt = (y, k) => {
        if (y <= hs[0][0]) return hs[0][k];
        for (let i = 1; i < hs.length; i++) if (y <= hs[i][0]) {
          const a0 = hs[i - 1], b0 = hs[i];
          return a0[k] + (b0[k] - a0[k]) * (b0[0] > a0[0] ? (y - a0[0]) / (b0[0] - a0[0]) : 0);
        }
        return hs[hs.length - 1][k];
      };
      plan.doors.forEach(d => {
        const k = "L" === d.side ? 1 : 2, y0 = d.y0 + .12 * u, y1 = d.y1 - .12 * u;
        const ptsD = [ 0, .25, .5, .75, 1 ].map(t => {
          const y = y0 + (y1 - y0) * t;
          return X(y) + "," + Y(edgeAt(y, k));
        });
        out.push(`<polyline class="mmsm-door" points="${ptsD.join(" ")}" stroke-width="${r1(3 * line)}"><title>${T("Tür / Notausgang")}</title></polyline>`);
      });
      plan.walls.forEach(w => out.push(`<line class="mmsm-${w.kind}" x1="${X(w.y)}" x2="${X(w.y)}" y1="${Y(w.x0)}" y2="${Y(w.x1)}" stroke-width="${r1("curtain" === w.kind ? 1.2 * line : 1.6 * line)}"/>`));
      const within = b0 => {
        const at = y => {
          let best = hull[0];
          for (const h of hull) Math.abs(h[0] - y) < Math.abs(best[0] - y) && (best = h);
          return best;
        };
        let y0 = Math.max(b0.y, hull[0][0]), y1 = Math.min(b0.y + b0.h, hull[hull.length - 1][0]);
        if (y1 - y0 < .5 * b0.h) return null;
        const room = hull.filter(h => h[0] >= y0 && h[0] <= y1).concat([ at(y0), at(y1) ]);
        const l0 = Math.max(...room.map(h => h[1])) + line, r0 = Math.min(...room.map(h => h[2])) - line;
        if (b0.w <= r0 - l0) return Object.assign({}, b0, {
          x: Math.min(Math.max(b0.x, l0), r0 - b0.w),
          y: y0,
          h: y1 - y0
        });
        const b = b0;
        const fits = y => {
          const h = at(y);
          return h[1] + line <= b.x && h[2] - line >= b.x + b.w;
        };
        for (;!fits(y1) && y1 - 5 > b.y + b.h / 2; ) y1 -= 5;
        for (;!fits(y0) && y0 + 5 < b.y + b.h / 2; ) y0 += 5;
        const span = hull.filter(h => h[0] >= y0 && h[0] <= y1);
        if (!span.length) return Object.assign({}, b, {
          y: y0,
          h: y1 - y0
        });
        const l = Math.max(...span.map(h => h[1])) + line, r = Math.min(...span.map(h => h[2])) - line;
        const x0 = Math.max(b.x, l), x1 = Math.min(b.x + b.w, r);
        return x1 - x0 > .3 * b.w ? {
          x: x0,
          y: y0,
          w: x1 - x0,
          h: y1 - y0
        } : Object.assign({}, b, {
          y: y0,
          h: y1 - y0
        });
      };
      const rooms = plan.rooms.map(rm => Object.assign({}, rm, {
        box: within(rm.box)
      })).filter(rm => rm.box);
      rooms.filter(rm => "stairs" === rm.kind).forEach(st => rooms.forEach(o => {
        if (o === st || "stairs" === o.kind) return;
        const b = st.box, q = o.box;
        const ox = Math.min(b.x + b.w, q.x + q.w) - Math.max(b.x, q.x), oy = Math.min(b.y + b.h, q.y + q.h) - Math.max(b.y, q.y);
        if (ox <= 0 || oy <= 0) return;
        const cuts = [ [ "y", q.y + q.h - b.y, b.h ], [ "h", b.y + b.h - q.y, b.h ], [ "x", q.x + q.w - b.x, b.w ], [ "w", b.x + b.w - q.x, b.w ] ].filter(c => c[1] < .6 * c[2]).sort((p, q2) => p[1] - q2[1]);
        const c = cuts[0];
        if (c) if ("y" === c[0]) {
          b.y += c[1];
          b.h -= c[1];
        } else if ("h" === c[0]) b.h -= c[1]; else if ("x" === c[0]) {
          b.x += c[1];
          b.w -= c[1];
        } else b.w -= c[1];
      }));
      rooms.forEach(rm => {
        const b = rm.box, x = X(b.y + b.h), y = Y(b.x), w = b.h, h = b.w;
        out.push(`<g class="mmsm-room is-${rm.kind}"><title>${k = rm.kind, "toilet" === k ? T("Toilette") : "toiletAccessible" === k ? T("Toilette, barrierefrei") : "galley" === k ? T("Bordküche") : "closet" === k ? T("Stauraum") : "stairs" === k ? T("Treppe") : "console" === k ? T("Ablage") : ""}</title>` + `<rect x="${r1(x + line)}" y="${r1(y + line)}" width="${r1(Math.max(1, w - 2 * line))}" height="${r1(Math.max(1, h - 2 * line))}" rx="${r1(.08 * u)}" stroke-width="${line}"${"stairs" === rm.kind ? ` style="fill:url(#${stId})"` : ""}/>`);
        var k;
        const cx = x + w / 2, cy = y + h / 2, s = Math.min(w, h);
        ("toilet" === rm.kind || "toiletAccessible" === rm.kind) && s >= .7 * u && out.push(`<text x="${r1(cx)}" y="${r1(cy + .17 * u)}" font-size="${r1(.46 * u)}">${"toiletAccessible" === rm.kind && s >= 1.4 * u ? "WC ♿" : "toiletAccessible" === rm.kind ? "♿" : "WC"}</text>`);
        if ("galley" === rm.kind && s >= .75 * u) {
          const k = .022 * u;
          out.push(`<path class="mmsm-cup" d="M${r1(cx - 7 * k)} ${r1(cy - 5 * k)} h${r1(12 * k)} v${r1(6 * k)} a${r1(6 * k)} ${r1(5 * k)} 0 0 1 ${r1(-12 * k)} 0 z M${r1(cx + 5 * k)} ${r1(cy - 3 * k)} a${r1(3 * k)} ${r1(3 * k)} 0 0 1 0 ${r1(6 * k)} M${r1(cx - 10 * k)} ${r1(cy + 8 * k)} h${r1(17 * k)}" stroke-width="${line}"/>`);
        }
        out.push("</g>");
      });
      const exitRows = new Set;
      const rowAt = new Map;
      const cabinOfRow = new Map;
      deck.seats.forEach(s => {
        cabinOfRow.has(s.row) || cabinOfRow.set(s.row, s.cabin);
        (s.chars || []).indexOf("E") >= 0 && exitRows.add(s.row);
      });
      (deck.answers || []).forEach(a => a.exitX.forEach(x => {
        const at = a.seats.filter(s => null != s.x && Math.abs(s.x - x) < .3);
        (at.length ? at : a.seats.filter(s => null != s.x && s.x > x && s.x - x <= 1.5).sort((p, q) => p.x - q.x).slice(0, 1)).forEach(s => exitRows.add(s.row));
      }));
      plan.seats.forEach(ps => {
        const s = deck.seats.get(ps.nr);
        const row = Number(ps.nr.replace(/[A-L]$/, ""));
        const cabin = s ? s.cabin : cabinOfRow.get(row) || "eco";
        const c = (CABIN[cabin] || CABIN.eco).color;
        const b = ps.box, gap = .05 * u;
        const x = X(b.y + b.h) + gap, y = Y(b.x) + gap, w = Math.max(1, b.h - 2 * gap), h = Math.max(1, b.w - 2 * gap);
        const state = !s || ps.held ? "is-held" : s.free ? "is-free" : "is-taken";
        const tip = s ? ps.nr + " · " + nameOf(cabin) + "\n" + (s.free ? T("frei") + (null != s.price ? " · " + money(s.price, s.currency) : "") : T("belegt")) + (s.chars || []).map(seatChar).filter(Boolean).map(t => "\n" + t).join("") : ps.nr + " · " + T("nicht buchbar");
        out.push(`<g class="mmsm-seat ${state}" style="--c:${c}" data-seat="${esc(ps.nr)}"><title>${esc(tip)}</title>` + `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="${r1(Math.min(.16 * u, h / 4))}" stroke-width="${r1(1.1 * line)}"/>` + `<rect class="mmsm-back" x="${r1(x + .06 * u)}" y="${r1(y + .08 * u)}" width="${r1(Math.max(.08 * u, .16 * w))}" height="${r1(Math.max(0, h - .16 * u))}" rx="${r1(.04 * u)}"/>` + (s && Math.min(w, h) >= .6 * u ? `<text class="mmsm-letter" x="${r1(x + .58 * w)}" y="${r1(y + h / 2 + .15 * u)}" font-size="${r1(.42 * u)}">${esc(ps.nr.slice(-1))}</text>` : "") + "</g>");
        const ra = rowAt.get(row) || {
          sum: 0,
          al: 0,
          n: 0,
          cabin: cabin
        };
        ra.sum += X(b.y + b.h / 2);
        ra.al += b.y + b.h / 2;
        ra.n++;
        rowAt.set(row, ra);
      });
      const firstOf = new Map;
      let lastX = null;
      [ ...rowAt.entries() ].sort((a, b) => a[0] - b[0]).forEach(([row, ra]) => {
        const cx = r1(ra.sum / ra.n), top = Y(edgeAt(ra.al / ra.n, 1));
        const ex = exitRows.has(row);
        const crowded = null != lastX && Math.abs(lastX - cx) < .8 * u;
        if (!crowded) {
          out.push(`<text class="mmsm-row${ex ? " is-exit" : ""}" x="${cx}" y="${r1(top - .25 * u)}" font-size="${r1(.5 * u)}">${row}</text>`);
          lastX = cx;
        }
        ex && !crowded && out.push(`<text class="mmsm-row is-exit" x="${cx}" y="${r1(top - .8 * u)}" font-size="${r1(.34 * u)}">EXIT</text>`);
        firstOf.has(ra.cabin) || firstOf.set(ra.cabin, []);
        firstOf.get(ra.cabin).push([ cx, top ]);
      });
      firstOf.forEach((list, cabin) => {
        const xs = list.map(q => q[0]), mid = (Math.min(...xs) + Math.max(...xs)) / 2, top = Math.min(...list.map(q => q[1]));
        const cc = (CABIN[cabin] || CABIN.eco).color;
        out.push(`<text class="mmsm-cabin" x="${r1(mid)}" y="${r1(top - 1.25 * u)}" font-size="${r1(.42 * u)}" fill="${cc}" style="--c:${cc}">${esc(nameOf(cabin).toUpperCase())}</text>`);
      });
      if (glass && null != plan.glassTip) {
        const FF = plan.glassF || F;
        glass.panes.forEach(p => out.push(`<polygon class="mmsm-glass${glass.dark ? " is-dark" : ""}" points="${p.map(([gx, gy]) => X(plan.glassTip + gx * FF) + "," + Y(axis + gy * FF)).join(" ")}" stroke-width="${r1(.7 * line)}"/>`));
      }
      out.push("</svg>");
      return out.join("");
    }
    function seatCabinName(leg, cabin, demoted) {
      if (demoted && "business" === cabin && "NH" === leg?.mkt) {
        const loc = (window.__mmBounds || {}).dictionaries?.location || {};
        const jp = c => "JP" === loc[c]?.countryCode;
        if (jp(leg.from) && jp(leg.to)) return "Premium Class";
      }
      return (CABIN[cabin] || {}).name || cabin;
    }
    async function drawings(model, leg) {
      const key = typeKeyFor(leg, model.code);
      return Promise.all(model.decks.map(async d => {
        let plan = null;
        if (d.plan) try {
          const p = await function(url) {
            if (plans.has(url)) return plans.get(url);
            const p = fetch(url, {
              credentials: "omit"
            }).then(r => {
              if (!r.ok) throw new Error("Plan " + r.status);
              return r.text();
            }).then(text => measure(text));
            p.catch(() => {
              plans.get(url) === p && plans.delete(url);
            });
            plans.set(url, p);
            return p;
          }(d.plan);
          const nrs = new Set(p.seats.map(s => s.nr));
          let hit = 0;
          d.seats.forEach(s => {
            nrs.has(s.nr) && hit++;
          });
          const cabins = new Set([ ...d.seats.values() ].map(s => s.cabin));
          const drawn = new Set([ ...d.seats.values() ].filter(s => nrs.has(s.nr)).map(s => s.cabin));
          hit >= .9 * d.seats.size && [ ...cabins ].every(c => drawn.has(c)) && (plan = function(p, deck) {
            const have = new Set(p.seats.map(s => s.nr));
            const missing = [ ...deck.seats.values() ].filter(s => !have.has(s.nr));
            if (!missing.length) return p;
            const rowOf = nr => Number(/^\d+/.exec(nr)[0]);
            const rows = [ ...new Set([ ...deck.seats.values() ].map(s => s.row)) ].sort((a, b) => a - b);
            const rank = new Map(rows.map((r, i) => [ r, i ]));
            const sum = new Map;
            p.seats.forEach(s => {
              const r = rowOf(s.nr);
              if (!rank.has(r)) return;
              const c = sum.get(r) || [ 0, 0 ];
              c[0] += s.box.y + s.box.h / 2;
              c[1]++;
              sum.set(r, c);
            });
            const known = [ ...sum ].map(([r, c]) => [ rank.get(r), c[0] / c[1] ]).sort((a, b) => a[0] - b[0]);
            if (known.length < 2) return p;
            const pitches = known.slice(1).map((q, i) => (q[1] - known[i][1]) / (q[0] - known[i][0])).sort((a, b) => a - b);
            const pitch = pitches[pitches.length >> 1];
            const along = k => {
              const lo = [ ...known ].reverse().find(q => q[0] <= k), hi = known.find(q => q[0] >= k);
              return lo ? hi ? lo[0] === hi[0] ? lo[1] : lo[1] + (hi[1] - lo[1]) * (k - lo[0]) / (hi[0] - lo[0]) : lo[1] + (k - lo[0]) * pitch : hi[1] - (hi[0] - k) * pitch;
            };
            const added = [];
            const clash = b => p.seats.concat(p.rooms, added).some(o => {
              const w = Math.min(b.x + b.w, o.box.x + o.box.w) - Math.max(b.x, o.box.x), h = Math.min(b.y + b.h, o.box.y + o.box.h) - Math.max(b.y, o.box.y);
              return w > 0 && h > 0 && w * h > .3 * b.w * b.h;
            });
            const place = (s, from) => {
              const k = rank.get(s.row);
              const like = from.filter(q => q.nr.slice(-1) === s.L && rank.has(rowOf(q.nr))).sort((a, b) => Math.abs(rank.get(rowOf(a.nr)) - k) - Math.abs(rank.get(rowOf(b.nr)) - k))[0];
              return like ? {
                nr: s.nr,
                box: {
                  x: like.box.x,
                  y: along(k) - like.box.h / 2,
                  w: like.box.w,
                  h: like.box.h
                }
              } : null;
            };
            missing.filter(s => sum.has(s.row)).map(s => place(s, p.seats)).forEach(q => {
              q && !clash(q.box) && added.push(q);
            });
            [ ...new Set(missing.filter(s => !sum.has(s.row)).map(s => s.row)) ].forEach(r => {
              const own = missing.filter(s => s.row === r);
              const byRow = new Map;
              p.seats.filter(q => (deck.seats.get(q.nr) || {}).cabin === own[0].cabin && rank.has(rowOf(q.nr))).forEach(q => {
                const list = byRow.get(rowOf(q.nr)) || [];
                list.push(q);
                byRow.set(rowOf(q.nr), list);
              });
              const model = [ ...byRow ].filter(([, list]) => own.every(s => list.some(q => q.nr.slice(-1) === s.L))).sort((a, b) => Math.abs(rank.get(a[0]) - rank.get(r)) - Math.abs(rank.get(b[0]) - rank.get(r)))[0];
              if (!model) return;
              const qs = own.map(s => place(s, model[1]));
              const n = added.length;
              qs.every(q => q && !clash(q.box) && added.push(q)) || (added.length = n);
            });
            return added.length ? Object.assign({}, p, {
              seats: p.seats.concat(added)
            }) : p;
          }(p, d));
        } catch (e) {
          plan = null;
        }
        const inType = (p, k0 = key) => k0 && p && ("a321" === k0 ? [ "a321", "a321acf" ] : [ k0 ]).map(k => typed(p, d, 0, k)).filter(Boolean).sort((a, b) => b.plausible - a.plausible || b.fit - a.fit)[0] || null;
        const out = inType(plan) || (() => {
          const g = gridPlan(d, leg);
          const rows = g && cabinRows(d, leg, key, !TYPE_CODE[model.code]);
          if (rows) {
            g.rowsAt = rows.pts;
            g.fittings = rows.fittings;
            g.lopa = rows.lopa;
            g.shifts = rows.shifts;
          }
          return inType(g, rows ? rows.key : key) || g;
        })();
        if (out && !out.lopa && "upper" !== d.type) {
          const rows = cabinRows(d, leg, key, !TYPE_CODE[model.code]);
          const v = !rows && (fitOuts(leg.operating || leg.mkt) || []).find(w => TYPE_CODE[w[0]] === key);
          out.lopa = rows ? rows.lopa : v ? v[v.indexOf("m") + 2] : null;
        }
        return out;
      }));
    }
    async function bodyHtml(model, leg) {
      if (!model.decks.length) return '<div class="mmsm-msg">' + T("Für diesen Flug liegt kein Sitzplan vor.") + "</div>";
      const nameOf = c => seatCabinName(leg, c, model.demotedFirst);
      const failed = model.failedCabins.filter(c => CABIN[c]);
      const noPrice = model.warnings.indexOf("8700") >= 0;
      const plans = await drawings(model, leg);
      const ac = (name = leg.aircraftName, cards().shortAircraft ? cards().shortAircraft(name) : name || "");
      var name;
      const main = Math.max(0, model.decks.findIndex(d => "main" === d.type));
      const frame = plans.every(p => p && "type" === p.source) ? {
        start: 0
      } : null;
      const typed0 = plans.find(p => p && p.typeKey);
      const body = (typed0 ? TYPES[typed0.typeKey].F >= 4.5 : leg.widebody) ? "wide" : "narrow";
      const lopa = (plans.find(p => p && p.lopa) || {}).lopa;
      return '<div class="mmsm-head"><span class="mmsm-title">' + T("Sitzplan {flight} · {from} → {to}", {
        flight: esc(leg.flightNo),
        from: esc(leg.from),
        to: esc(leg.to)
      }) + (ac ? " · " + esc(ac) : "") + "</span></div>" + '<div class="mmsm-stats">' + function(model, nameOf) {
        const per = {};
        model.decks.forEach(d => d.seats.forEach(s => {
          const e = per[s.cabin] = per[s.cabin] || {
            free: 0,
            total: 0,
            min: null,
            cur: null
          };
          e.total++;
          if (s.free) {
            e.free++;
            if (null != s.price && (null == e.min || s.price < e.min)) {
              e.min = s.price;
              e.cur = s.currency;
            }
          }
        }));
        return ORDER.filter(c => per[c]).map(c => {
          const e = per[c];
          return '<span><i style="border-color:' + CABIN[c].color + '"></i>' + (null != e.min ? T("{cabin}: {free} von {total} frei, ab {price}", {
            cabin: esc(nameOf(c)),
            free: e.free,
            total: e.total,
            price: esc(money(e.min, e.cur))
          }) : T("{cabin}: {free} von {total} frei", {
            cabin: esc(nameOf(c)),
            free: e.free,
            total: e.total
          })) + "</span>";
        }).join("");
      }(model, nameOf) + "</div>" + '<div class="mmsm-legend"><span><i class="is-free"></i>' + T("frei") + '</span><span><i class="is-taken"></i>' + T("belegt") + "</span>" + '<span><i class="is-held"></i>' + T("nicht buchbar") + '</span><span class="is-exit">' + T("EXIT = Notausstiegsreihe") + "</span>" + (lopa ? '<a class="mmsm-lopa" href="https://www.aerolopa.com/' + encodeURIComponent(lopa) + '" target="_blank" rel="noopener noreferrer" ' + 'title="' + T("Kabinenvorlage dieser Variante") + '">aeroLOPA ↗</a>' : "") + '<span class="mmsm-zoom" data-body="' + body + '" title="' + T("wide" === body ? "Größe für Großraumflugzeuge; ein Klick auf den Wert stellt wieder automatisch ein" : "Größe für Schmalrumpfflugzeuge; ein Klick auf den Wert stellt wieder automatisch ein") + '">' + T("Größe") + ' <button type="button" data-z="-1">−</button><b></b>' + '<button type="button" data-z="1">+</button></span></div>' + (model.decks.length > 1 ? '<div class="mmsm-decktabs">' + model.decks.map((d, i) => '<button type="button" class="mmsm-decktab' + (i === main ? " is-on" : "") + '" data-deck="' + i + '">' + esc(deckName(d.type)) + "</button>").join("") + "</div>" : "") + '<div class="mmsm-planes">' + model.decks.map((d, i) => '<div class="mmsm-deck' + (i !== main ? " is-off" : "") + ("upper" === d.type ? " is-upper" : "") + '" data-deck="' + i + '"' + (model.decks.length > 1 ? ' data-name="' + esc(deckName(d.type)) + '"' : "") + ">" + (plans[i] ? deckSvg(plans[i], d, leg, nameOf, 0, frame) : '<div class="mmsm-msg">' + T("Kein Plan für dieses Deck.") + "</div>") + "</div>").join("") + "</div>" + (failed.length ? '<div class="mmsm-note">' + T("Nicht geladen: {cabins}.", {
        cabins: failed.map(c => esc(nameOf(c))).join(", ")
      }) + " " + '<button type="button" class="mmsm-retry">' + T("Erneut laden") + "</button></div>" : "") + (noPrice ? '<div class="mmsm-note">' + (leg.operatingName ? T("{airline} meldet keine Preise für Sitzplatzreservierungen an das Buchungssystem.", {
        airline: esc(leg.operatingName)
      }) : T("Die Airline meldet keine Preise für Sitzplatzreservierungen an das Buchungssystem.")) + "</div>" : "");
    }
    const MODAL_MAX = 1e3, MODAL_PAD = 22, FULL_MIN = .6, FULL_MAX = .85, ZOOM_KEY = "mmSeatmapZoom";
    const setZoom = (body, z) => {
      try {
        const all = JSON.parse(localStorage.getItem(ZOOM_KEY) || "{}");
        null == z ? delete all[body] : all[body] = z;
        localStorage.setItem(ZOOM_KEY, JSON.stringify(all));
      } catch (e) {}
    };
    function fitScale(panel) {
      const svgs = [ ...panel.querySelectorAll(".mmsm-svg") ];
      svgs.forEach(s => {
        if (!s.dataset.w) {
          s.dataset.w = s.getAttribute("width");
          s.dataset.h = s.getAttribute("height");
        }
      });
      const w = Math.max(0, ...svgs.map(s => Number(s.dataset.w)));
      if (!w) return;
      const zoom = panel.querySelector(".mmsm-zoom"), own = zoom ? (body => {
        try {
          const z = JSON.parse(localStorage.getItem(ZOOM_KEY) || "{}")[body];
          return "number" == typeof z ? z : null;
        } catch (e) {
          return null;
        }
      })(zoom.dataset.body) : null;
      const room = Math.min(.94 * window.innerWidth, MODAL_MAX) - 2 * MODAL_PAD;
      const k = own ?? Math.max(FULL_MIN, Math.min(FULL_MAX, room / w));
      svgs.forEach(s => {
        s.setAttribute("width", Math.round(Number(s.dataset.w) * k));
        s.setAttribute("height", Math.round(Number(s.dataset.h) * k));
      });
      if (zoom) {
        zoom.dataset.k = k;
        zoom.querySelector("b").textContent = Math.round(100 * k) + " %" + (null == own ? " " + T("auto") : "");
      }
    }
    function fitDecks(panel, noseX) {
      const box = panel.querySelector(".mmsm-planes");
      if (!box) return;
      const svgs = [ ...box.querySelectorAll(".mmsm-svg") ];
      const on = box.querySelector(".mmsm-deck:not(.is-off) .mmsm-svg");
      null == noseX && (box.style.minHeight = "");
      if (!on) return;
      const B = box.clientWidth, wOf = s => Number(s.getAttribute("width")), hOf = s => Number(s.getAttribute("height"));
      const axisOf = s => Number(s.dataset.axis) * hOf(s) / Number(s.getAttribute("viewBox").split(" ")[3]);
      const wMax = Math.max(...svgs.map(wOf)), top = Math.max(...svgs.map(axisOf)), W = wOf(on);
      null == noseX && (noseX = wMax <= B ? (B + wMax) / 2 : B);
      on.style.marginLeft = W <= B ? Math.round(Math.min(B, Math.max(W, noseX)) - W) + "px" : "0";
      on.style.marginTop = Math.round(top - axisOf(on)) + "px";
      box.scrollLeft = W > B ? W - noseX : 0;
      box.style.minHeight = Math.max(box.offsetHeight, ...svgs.map(s => top - axisOf(s) + hOf(s))) + "px";
    }
    function close() {
      const ov = document.querySelector(".mmsm-overlay");
      if (ov) {
        ov.classList.remove("is-open");
        ov.dataset.legKey = "";
      }
    }
    document.addEventListener("keydown", e => {
      "Escape" === e.key && close();
    }, {
      signal: abort.signal
    });
    const HOVER_DWELL = 450, HOVER_SHOW = 200;
    const PEEK_ZOOM = .3575, PEEK_W = 680, PEEK_MAX = .55;
    let peekTimer = null, peekBtn = null;
    function hidePeek() {
      clearTimeout(peekTimer);
      peekBtn = null;
      const pk = document.querySelector(".mmsm-peek");
      pk && pk.remove();
    }
    const CSS = `
.mmsm-overlay { position: fixed; inset: 0; z-index: 2147483100; background: rgba(5,22,77,.42); display: none;
                align-items: center; justify-content: center; }
.mmsm-overlay.is-open { display: flex; }
.mmsm-modal { background: #fff; border-radius: 12px; padding: 16px ${MODAL_PAD}px 18px; max-width: min(94vw, ${MODAL_MAX}px);
              max-height: 88vh; overflow: auto; box-shadow: 0 18px 60px rgba(5,22,77,.35); font-family: inherit; }
.mmsm-close { float: right; margin: -2px -8px 0 12px; border: none; cursor: pointer; background: #eef1f7;
              color: ${INK_primary}; border-radius: 999px; width: 26px; height: 26px; font-size: 13px; line-height: 1; }
.mmsm-close:hover { background: ${INK_accent}; color: #fff; }
.mmsm-tabs { display: flex; gap: 6px; margin: 0 0 10px; flex-wrap: wrap; }
.mmsm-tabs button, .mmsm-decktab { font: inherit; font-size: 11px; border: 1px solid ${INK_hairline}; background: #fff;
              border-radius: 999px; padding: 3px 12px; cursor: pointer; color: ${INK_secondary}; }
.mmsm-tabs button.is-on, .mmsm-decktab.is-on { background: ${INK_primary}; color: #fff; border-color: ${INK_primary}; }
.mmsm-panel { min-width: min(86vw, 640px); }
.mmsm-head { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
.mmsm-title { font-size: 12.5px; font-weight: 700; color: ${INK_primary}; }
.mmsm-stats { display: flex; gap: 14px; flex-wrap: wrap; font-size: 11px; color: ${INK_secondary}; margin: 6px 0 4px; }
.mmsm-stats i, .mmsm-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; border: 1.5px solid;
              background: #fff; vertical-align: -1px; margin-right: 4px; }
.mmsm-legend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 10.5px; color: ${INK_muted}; margin-bottom: 8px; align-items: center; }
.mmsm-legend i.is-free { border-color: #8a9a86; }
.mmsm-legend i.is-taken { background: #d9d5ce; border-color: #d9d5ce; }
.mmsm-legend i.is-held { border-style: dashed; border-color: #a9a49a; }
.mmsm-legend .is-exit { color: #963e37; font-weight: 600; }
.mmsm-lopa { color: ${INK_muted}; text-decoration: none; }
.mmsm-lopa:hover { color: ${INK_accent}; text-decoration: underline; }
.mmsm-zoom { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; }
.mmsm-zoom button { font: inherit; font-size: 11px; line-height: 1; width: 20px; height: 20px; border-radius: 999px; cursor: pointer;
              border: 1px solid ${INK_hairline}; background: #fff; color: ${INK_secondary}; padding: 0; }
.mmsm-zoom button:hover { border-color: ${INK_accent}; color: ${INK_accent}; }
.mmsm-zoom b { font-weight: 600; color: ${INK_secondary}; cursor: pointer; min-width: 52px; text-align: center; }
.mmsm-decktabs { display: flex; gap: 6px; margin: 0 0 6px; }
.mmsm-planes { max-width: 100%; overflow-x: auto; box-sizing: border-box; }
.mmsm-deck.is-off { height: 0; overflow: hidden; visibility: hidden; }
.mmsm-svg { display: block; margin: 0 auto; }
.mmsm-svg text { font-family: inherit; text-anchor: middle; }
.mmsm-wing { fill: #e8e5de; stroke: #cdc7bb; }
.mmsm-hull { fill: #fbfaf7; stroke: #b3ab9e; stroke-linejoin: round; }
.mmsm-door { stroke: #c0392b; stroke-linecap: round; stroke-linejoin: round; fill: none; }
.mmsm-wall { stroke: #b9b3a4; }
.mmsm-curtain { stroke: #b9b3a4; stroke-dasharray: 6 5; }
.mmsm-room rect { fill: #e7e4de; stroke: #b5aea3; }
.mmsm-room.is-galley rect { fill: #ded5c4; stroke: #b5a68b; }
.mmsm-room.is-closet rect { fill: #eeece8; stroke: #d3cec5; }
.mmsm-room.is-console rect { fill: #f3f1ec; stroke: #e2ddd4; }
.mmsm-room text { fill: #8a8378; font-weight: 600; }
.mmsm-room.is-toiletAccessible text { fill: ${INK_accent}; }
.mmsm-cup { fill: none; stroke: #9b8b6e; stroke-linecap: round; }
.mmsm-seat rect { fill: #fff; stroke: var(--c); }
.mmsm-seat .mmsm-back { fill: var(--c); stroke: none; opacity: .3; }
.mmsm-seat.is-taken rect { fill: #d9d5ce; stroke: #cdc7bd; }
.mmsm-seat.is-taken .mmsm-back { fill: #c6c0b6; opacity: 1; }
.mmsm-seat.is-held rect { fill: #fbfaf7; stroke-dasharray: 5 4; opacity: .7; }
.mmsm-seat.is-held .mmsm-back { opacity: .12; }
.mmsm-letter { fill: var(--c); opacity: .75; font-weight: 600; pointer-events: none; }
.mmsm-seat.is-taken .mmsm-letter { fill: #a39c90; opacity: 1; }
.mmsm-row { fill: ${INK_muted}; font-weight: 600; }
.mmsm-row.is-exit { fill: #963e37; }
.mmsm-cabin { font-weight: 700; letter-spacing: .08em; }
.mmsm-glass { fill: #c3cdd6; stroke: #9aa6b2; stroke-linejoin: round; }
.mmsm-glass.is-dark { fill: #aebac6; }
.mmsm-msg { font-size: 12px; color: ${INK_secondary}; padding: 12px 4px; text-align: center; }
.mmsm-msgdetail { color: ${INK_muted}; font-size: 10.5px; }
.mmsm-note { font-size: 10.5px; color: ${INK_muted}; text-align: center; padding-top: 2px; }
.mmsm-retry { font: inherit; font-size: 10.5px; font-weight: 600; margin-left: 4px; border: 1px solid ${INK_hairline};
              background: #fff; color: ${INK_primary}; border-radius: 999px; padding: 1px 9px; cursor: pointer; }
.mmsm-peek { position: fixed; z-index: 2147481900; background: #fff; border: 1px solid ${INK_hairline}; border-radius: 10px;
             box-shadow: 0 10px 30px rgba(5,22,77,.22); padding: 6px 12px; pointer-events: none; }
.mmsm-peek .mmsm-panel { min-width: 0; zoom: ${PEEK_ZOOM}; }
.mmsm-peek .mmsm-zoom { display: none; }
.mmsm-peek .mmsm-planes { overflow: visible; display: flex; flex-direction: column; }
.mmsm-peek .mmsm-decktabs { display: none; }
.mmsm-peek .mmsm-deck.is-off { height: auto; overflow: visible; visibility: visible; }
.mmsm-peek .mmsm-deck.is-upper { order: -1; }
.mmsm-peek .mmsm-svg { margin: 0 0 0 auto; }
.mmsm-peek .mmsm-deck[data-name]::before { content: attr(data-name); display: block; font-size: 22px; font-weight: 600; color: ${INK_secondary}; }
.mmsm-peek .mmsm-head, .mmsm-peek .mmsm-legend, .mmsm-peek .mmsm-note { display: none; }
.mmsm-peekhint { font-size: 10.5px; color: ${INK_muted}; text-align: center; padding: 2px 0; }

html.mm-dark .mmsm-overlay { background: rgba(0, 0, 0, .6); }
html.mm-dark .mmsm-wing { fill: hsl(222 10% 25%); stroke: hsl(222 9% 36%); }
html.mm-dark .mmsm-hull { fill: hsl(222 13% 20%); stroke: hsl(222 10% 46%); }
html.mm-dark :is(.mmsm-wall, .mmsm-curtain) { stroke: hsl(222 9% 46%); }
html.mm-dark .mmsm-room rect { fill: hsl(222 10% 29%); stroke: hsl(222 9% 42%); }
html.mm-dark .mmsm-room.is-galley rect { fill: hsl(222 7% 34%); stroke: hsl(222 7% 46%); }
html.mm-dark .mmsm-room.is-closet rect { fill: hsl(222 9% 25%); stroke: hsl(222 8% 36%); }
html.mm-dark .mmsm-room.is-console rect { fill: hsl(222 9% 23%); stroke: hsl(222 8% 32%); }
html.mm-dark .mmsm-room text { fill: hsl(222 10% 68%); }
html.mm-dark .mmsm-cup { stroke: hsl(222 8% 62%); }
html.mm-dark .mmsm-glass { fill: hsl(210 18% 42%); stroke: hsl(210 14% 55%); }
html.mm-dark .mmsm-glass.is-dark { fill: hsl(210 18% 34%); }
html.mm-dark .mmsm-svg pattern rect:first-child { fill: hsl(222 9% 27%); }
html.mm-dark .mmsm-svg pattern rect:last-child { fill: hsl(222 9% 40%); }
html.mm-dark :is(.mmsm-seat, .mmsm-cabin) { --mmsm-ink: oklch(from var(--c) calc(l * 0.9 + 0.33) min(calc(c * 1.6), 0.09) h); }
html.mm-dark .mmsm-cabin { fill: var(--mmsm-ink); }
html.mm-dark .mmsm-seat rect { fill: hsl(222 13% 24%); stroke: var(--mmsm-ink); }
html.mm-dark .mmsm-seat .mmsm-back { fill: var(--mmsm-ink); opacity: .35; }
html.mm-dark .mmsm-letter { fill: var(--mmsm-ink); opacity: .9; }
html.mm-dark .mmsm-seat.is-taken rect { fill: hsl(222 8% 33%); stroke: hsl(222 8% 38%); }
html.mm-dark .mmsm-seat.is-taken .mmsm-back { fill: hsl(222 8% 40%); opacity: 1; }
html.mm-dark .mmsm-seat.is-taken .mmsm-letter { fill: hsl(222 8% 58%); }
html.mm-dark .mmsm-seat.is-held rect { fill: hsl(222 13% 20%); }
html.mm-dark .mmsm-legend i.is-taken { background: hsl(222 8% 33%); border-color: hsl(222 8% 38%); }
`;
    let styleEl = null;
    function injectStyles() {
      if (document.head) {
        if (!styleEl || !styleEl.isConnected) {
          styleEl = document.getElementById("mmsm-styles");
          if (!styleEl) {
            styleEl = document.createElement("style");
            styleEl.id = "mmsm-styles";
            document.head.appendChild(styleEl);
          }
        }
        styleEl.textContent !== CSS && (styleEl.textContent = CSS);
      }
    }
    state.open = function open(legs, idx) {
      const leg = (legs || [])[idx];
      if (!leg || !on()) return;
      injectStyles();
      hidePeek();
      const ov = function() {
        let ov = document.querySelector(".mmsm-overlay");
        if (ov) return ov;
        ov = document.createElement("div");
        ov.className = "mmsm-overlay";
        ov.innerHTML = '<div class="mmsm-modal"><button type="button" class="mmsm-close" title="' + T("Schließen") + '">✕</button>' + '<div class="mmsm-tabs"></div><div class="mmsm-panel"></div></div>';
        ov.addEventListener("click", e => {
          e.target === ov && close();
        });
        ov.querySelector(".mmsm-close").addEventListener("click", close);
        document.body.appendChild(ov);
        return ov;
      }();
      if (ov.classList.contains("is-open") && ov.dataset.legKey === legKey(leg)) {
        close();
        return;
      }
      ov.classList.add("is-open");
      ov.dataset.legKey = legKey(leg);
      const addressable = legs.map((l, i) => ({
        l: l,
        i: i
      })).filter(x => x.l.mkt && x.l.mktNo && x.l.depDate);
      const tabs = ov.querySelector(".mmsm-tabs");
      tabs.innerHTML = addressable.length > 1 ? addressable.map(x => '<button type="button" data-leg="' + x.i + '"' + (x.i === idx ? ' class="is-on"' : "") + ">" + esc((x.l.flightNo || "").replace(/^([A-Z0-9]{2})(\d)/, "$1 $2") + " · " + x.l.from + " → " + x.l.to) + "</button>").join("") : "";
      tabs.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
        ov.dataset.legKey = "";
        open(legs, Number(b.dataset.leg));
      }));
      const panel = ov.querySelector(".mmsm-panel");
      panel.innerHTML = '<div class="mmsm-msg">' + T("Sitzplan wird geladen …") + "</div>";
      loadAll(leg).then(model => bodyHtml(model, leg)).then(html => {
        if (ov.dataset.legKey !== legKey(leg)) return;
        panel.innerHTML = html;
        !function(panel) {
          const tabs = [ ...panel.querySelectorAll(".mmsm-decktab") ];
          tabs.forEach(tab => tab.addEventListener("click", () => {
            const box = panel.querySelector(".mmsm-planes"), was = box && box.querySelector(".mmsm-deck:not(.is-off) .mmsm-svg");
            const noseX = was ? was.getBoundingClientRect().right - box.getBoundingClientRect().left : null;
            tabs.forEach(t => t.classList.toggle("is-on", t === tab));
            panel.querySelectorAll(".mmsm-deck").forEach(d => d.classList.toggle("is-off", d.dataset.deck !== tab.dataset.deck));
            fitDecks(panel, noseX);
          }));
        }(panel);
        !function(panel) {
          const zoom = panel.querySelector(".mmsm-zoom");
          if (zoom) {
            zoom.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
              const k = Math.round(20 * (Number(zoom.dataset.k) + .05 * Number(b.dataset.z))) / 20;
              setZoom(zoom.dataset.body, Math.max(.25, Math.min(1.2, k)));
              fitScale(panel);
              fitDecks(panel);
            }));
            zoom.querySelector("b").addEventListener("click", () => {
              setZoom(zoom.dataset.body, null);
              fitScale(panel);
              fitDecks(panel);
            });
          }
        }(panel);
        fitScale(panel);
        fitDecks(panel);
        const retry = panel.querySelector(".mmsm-retry");
        retry && retry.addEventListener("click", () => {
          ov.dataset.legKey = "";
          open(legs, idx);
        });
      }).catch(e => {
        ov.dataset.legKey === legKey(leg) && (panel.innerHTML = '<div class="mmsm-msg">' + (e => "7425" === e?.apiCode ? T("Zu diesem Flug ist im Buchungssystem kein Sitzplan hinterlegt.") : e && String(e.apiCode || "").indexOf("65019") >= 0 ? T("Diese Airline liefert dem Buchungssystem keinen Sitzplan.") : T("Der Sitzplan konnte nicht geladen werden."))(e) + ' <span class="mmsm-msgdetail">' + esc(String(e?.message || "")) + "</span></div>");
      });
    };
    state.close = close;
    state.peek = function(btn, legs, idx) {
      const leg = (legs || [])[idx];
      if (!leg || !on()) return;
      injectStyles();
      hidePeek();
      peekBtn = btn;
      const cached = cache.has(legKey(leg) + "|all");
      peekTimer = setTimeout(() => {
        peekBtn === btn && loadAll(leg).then(model => bodyHtml(model, leg)).then(html => {
          if (peekBtn !== btn || !btn.isConnected) return;
          const pk = document.createElement("div");
          pk.className = "mmsm-peek";
          pk.innerHTML = '<div class="mmsm-panel">' + html + '</div><div class="mmsm-peekhint">' + T("Klicken für Details und Sitzpreise") + "</div>";
          const r = btn.getBoundingClientRect();
          pk.style.top = r.bottom + 6 + "px";
          document.body.appendChild(pk);
          const body = pk.querySelector(".mmsm-panel");
          const w = Math.max(0, ...[ ...pk.querySelectorAll(".mmsm-svg") ].map(sv => Number(sv.getAttribute("width"))));
          const z = w ? Math.max(PEEK_ZOOM, Math.min(PEEK_MAX, PEEK_W / w)) : PEEK_ZOOM;
          body.style.zoom = String(z);
          const room = window.innerWidth - 16;
          pk.offsetWidth > room && (body.style.zoom = String(z * room / pk.offsetWidth));
          pk.style.left = Math.max(8, Math.min(r.left, window.innerWidth - pk.offsetWidth - 8)) + "px";
        }).catch(() => {});
      }, cached ? HOVER_SHOW : HOVER_DWELL);
    };
    state.hidePeek = hidePeek;
    state.teardown = () => {
      abort.abort();
      hidePeek();
      const ov = document.querySelector(".mmsm-overlay");
      ov && ov.remove();
      styleEl && styleEl.remove();
    };
    state._normalise = normalise;
    state._merge = merge;
    state._gridPlan = gridPlan;
    state._planOf = planOf;
    state._measure = measure;
    state._deckSvg = deckSvg;
    state._bodyHtml = bodyHtml;
    state._shapeKeyFor = shapeKeyFor;
    state._glassFor = glassFor;
    state._typeKeyFor = typeKeyFor;
    state._typed = typed;
    state._seatCabinName = seatCabinName;
    state._css = CSS;
  })();
  (() => {
    "use strict";
    const VERSION = 57;
    if (window.__mmSort && window.__mmSort.version >= VERSION) return;
    const T = (s, p) => window.__mmI18n ? window.__mmI18n.t(s, p) : p ? String(s).replace(/\{(\w+)\}/g, (m, k) => null != p[k] ? String(p[k]) : m) : String(s);
    const Tn = (n, one, other, p) => window.__mmI18n ? window.__mmI18n.tn(n, one, other, p) : T(1 === n ? one : other, Object.assign({
      n: n
    }, p));
    if (window.__mmSort) try {
      window.__mmSort.superseded = !0;
      window.__mmSort.teardown();
    } catch (e) {}
    const INK_primary = "#05164D", INK_secondary = "#52514e", INK_muted = "#898781", INK_hairline = "#e1e0d9", INK_accent = "#1c5cab";
    const state = {
      version: VERSION,
      sort: null,
      sorted: 0,
      superseded: !1
    };
    try {
      Object.defineProperty(window, "__mmSort", {
        value: state,
        enumerable: !1,
        configurable: !0
      });
    } catch (e) {
      try {
        window.__mmSort = state;
      } catch (e2) {}
    }
    const ac = new AbortController;
    const {signal: signal} = ac;
    const sortOn = () => !window.__mmSettings || !1 !== window.__mmSettings.get("results");
    const esc = s => String(null == s ? "" : s).replace(/[&<>"]/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    }[c]));
    const boundsData = () => window.__mmBounds || {};
    const cards = () => window.__mmCards || null;
    const CFF_CABIN = [ [ /^CFFPECO/i, "ecoPremium" ], [ /^CFFECO/i, "eco" ], [ /^CFFBUS/i, "business" ], [ /^CFFFIRS?/i, "first" ] ];
    let entityRaw = null, entityCache = null;
    function searchEntity() {
      let raw = null;
      try {
        raw = sessionStorage.getItem("airBoundsSearch");
      } catch (e) {
        return null;
      }
      if (raw !== entityRaw) {
        entityRaw = raw;
        try {
          const o = JSON.parse(raw);
          entityCache = o.entities[o.selectedAirBoundsSearchId] || null;
        } catch (e) {
          entityCache = null;
        }
      }
      return entityCache;
    }
    function shown(f, field) {
      const c = cards();
      return f.pax && c && c.priceMode && "total" === c.priceMode() ? "miles" === field ? f.totalMiles : "cash" === field ? f.totalCash : f[field] : f[field];
    }
    const inCabin = (f, cabin) => !cabin || (cabin instanceof Set ? cabin.has(f.cabin) : f.cabin === cabin);
    function cheapest(item, field, cabin, convert) {
      let best = null;
      for (const f of item?.fares || []) {
        if (!inCabin(f, cabin)) continue;
        let v = shown(f, field);
        if (null != v) {
          convert && (v = convert(v, f));
          (null == best || v < best) && (best = v);
        }
      }
      return best;
    }
    function toCommon(raw, f) {
      try {
        const v = f.currency ? window.__mmCurrency?.convert?.(raw, f.currency) : null;
        if (null != v) return v;
      } catch (e) {}
      return raw;
    }
    const minutes = hhmm => {
      const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || ""));
      return m ? 60 * +m[1] + +m[2] : null;
    };
    const ORDERS = [ {
      id: "miles",
      get label() {
        return T("Günstigste Meilen");
      },
      hint: !0,
      value: (it, cabin) => cheapest(it, "miles", cabin)
    }, {
      id: "cash",
      get label() {
        return T("Günstigste Zuzahlung");
      },
      hint: !0,
      value: (it, cabin) => cheapest(it, "cash", cabin, toCommon)
    }, {
      id: "dep",
      get label() {
        return T("Frühester Abflug");
      },
      value: it => minutes(it && it.depTime)
    }, {
      id: "depLate",
      get label() {
        return T("Spätester Abflug");
      },
      desc: !0,
      value: it => minutes(it && it.depTime)
    }, {
      id: "dur",
      get label() {
        return T("Kürzeste Dauer");
      },
      value: it => it && it.totalDuration || null
    } ];
    const orderById = id => ORDERS.find(o => o.id === id) || ORDERS[0];
    function effectiveCabin(items) {
      const picked = has(filter.cabins) ? filter.cabins : null;
      let want = function() {
        for (const code of searchEntity()?.commercialFareFamilies || []) {
          const hit = CFF_CABIN.find(([re]) => re.test(code));
          if (hit) return hit[1];
        }
        return null;
      }();
      if (picked && (!want || !picked.has(want))) {
        if (1 !== picked.size) return new Set(picked);
        want = [ ...picked ][0];
      }
      if (!want) return null;
      if (!items || !items.length) return want;
      for (const it of items) if (it && (it.fares || []).some(f => f.cabin === want)) return want;
      return null;
    }
    function listedItems() {
      const c = cards();
      return c && c.items ? c.items() : [];
    }
    const STORE_KEY = "mmsort_order";
    const WINDOWS = [ {
      get label() {
        return T("Nacht");
      },
      time: "0–5",
      title: "00:00 – 04:59",
      from: 0,
      to: 300
    }, {
      get label() {
        return T("Früh");
      },
      time: "5–9",
      title: "05:00 – 08:59",
      from: 300,
      to: 540
    }, {
      get label() {
        return T("Vormittag");
      },
      time: "9–12",
      title: "09:00 – 11:59",
      from: 540,
      to: 720
    }, {
      get label() {
        return T("Nachmittag");
      },
      time: "12–18",
      title: "12:00 – 17:59",
      from: 720,
      to: 1080
    }, {
      get label() {
        return T("Abend");
      },
      time: "18–24",
      title: "18:00 – 23:59",
      from: 1080,
      to: 1440
    } ];
    const LONG_HAUL_S = 6 * 3600;
    const isLongLeg = l => !!l && !l.ground && (l.duration || 0) >= LONG_HAUL_S;
    const longLegs = it => (it && it.legs || []).filter(isLongLeg);
    const acLeg = (l, anyLong) => !!l && !l.ground && (!anyLong || isLongLeg(l));
    function acFamily(name) {
      const s = String(name || "").toUpperCase();
      let m = /\bA\s?(\d{3})/.exec(s);
      if (m) return "A" + m[1];
      m = /\b(7\d7)\b/.exec(s);
      if (m) return m[1];
      m = /EMBRAER\s*(?:ERJ\s*-?\s*)?E?(\d{3})(\s*-?\s*E2)?/.exec(s);
      if (m) return "E" + m[1] + (m[2] ? "-E2" : "");
      m = /(?:CRJ|REGIONAL\s+JET)\s*-?\s*(\d{3,4})/.exec(s);
      if (m) return "CRJ" + m[1];
      m = /\bATR\s*-?\s*(\d{2})/.exec(s);
      return m ? "ATR " + m[1] : /DHC\s*-?\s*8|DASH\s*8|\bQ400\b/.test(s) ? "Dash 8" : acVariant(name) || null;
    }
    const acVariant = name => String(name || "").replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+ALL\s+SERIES.*$/i, "").replace(/^(AIRBUS(\s+INDUSTRIE)?|BOEING)\s+/i, "").replace(/\s+/g, " ").trim();
    const STOPS = [ {
      get label() {
        return T("Direkt");
      },
      max: 0
    }, {
      get label() {
        return T("max. 1 Stopp");
      },
      max: 1
    } ];
    const CABINS = [ {
      key: "eco",
      label: "Economy"
    }, {
      key: "ecoPremium",
      label: "Prem. Eco"
    }, {
      key: "business",
      label: "Business"
    }, {
      key: "first",
      label: "First"
    } ];
    const CABIN_NAMES = {
      eco: "Economy",
      ecoPremium: "Premium Economy",
      business: "Business",
      first: "First"
    };
    const SETS = {
      cab: "cabins",
      air: "airlines",
      lha: "longAirlines",
      ac: "aircraft"
    };
    const filter = {
      cabins: null,
      stops: null,
      dep: null,
      arr: null,
      airlines: null,
      longAirlines: null,
      aircraft: null
    };
    let filterRoute = null;
    const has = set => !(!set || !set.size);
    const filterActive = () => null != filter.stops || null != filter.dep || null != filter.arr || Object.values(SETS).some(k => has(filter[k]));
    function resetFilter() {
      filter.stops = null;
      filter.dep = null;
      filter.arr = null;
      for (const k of Object.values(SETS)) filter[k] = null;
    }
    let formSearchAt = 0;
    let lastSearch = null;
    function noteFormSearch(e) {
      if (!e.isTrusted) return;
      const t = e.target;
      ("click" === e.type ? t?.closest?.("#modify-button") : "Enter" === e.key && t?.closest?.("form.modify-search-form")) && (formSearchAt = Date.now());
    }
    document.addEventListener("click", noteFormSearch, {
      capture: !0,
      signal: signal
    });
    document.addEventListener("keydown", noteFormSearch, {
      capture: !0,
      signal: signal
    });
    state._noteFormSearch = () => {
      formSearchAt = Date.now();
    };
    function listedLegs(items) {
      const long = new Set, short = new Set, ac = new Map;
      const anyLong = items.some(it => longLegs(it).length > 0);
      for (const it of items) for (const l of it && it.legs || []) {
        const isLong = isLongLeg(l);
        l.operatingName && (isLong ? long : short).add(l.operatingName);
        if (!acLeg(l, anyLong)) continue;
        const fam = acFamily(l.aircraftName);
        if (fam) {
          ac.has(fam) || ac.set(fam, new Set);
          ac.get(fam).add(acVariant(l.aircraftName));
        }
      }
      const sorted = s => [ ...s ].sort((a, b) => a.localeCompare(b, "de"));
      const absent = new Set;
      const keep = (list, picked) => {
        for (const v of picked || []) if (!list.includes(v)) {
          list.push(v);
          absent.add(v);
        }
        return list;
      };
      const aircraft = sorted(ac.keys()).map(k => ({
        key: k,
        variants: sorted(ac.get(k))
      }));
      for (const k of filter.aircraft || []) if (!ac.has(k)) {
        aircraft.push({
          key: k,
          variants: []
        });
        absent.add(k);
      }
      return {
        long: keep(sorted(long), filter.longAirlines),
        short: keep(sorted(short), filter.airlines),
        aircraft: aircraft,
        absent: absent
      };
    }
    function buildPred() {
      if (!filterActive()) return null;
      const copy = s => has(s) ? new Set(s) : null;
      const f = {
        cabins: copy(filter.cabins),
        stops: filter.stops,
        dep: filter.dep,
        arr: filter.arr,
        airlines: copy(filter.airlines),
        longAirlines: copy(filter.longAirlines),
        aircraft: copy(filter.aircraft)
      };
      const anyLong = listedItems().some(it => longLegs(it).length > 0);
      return it => {
        if (!it) return !1;
        if (f.cabins && !(it.fares || []).some(fa => f.cabins.has(fa.cabin))) return !1;
        if (null != f.stops && it.stops > f.stops) return !1;
        if (f.dep) {
          const m = minutes(it.depTime);
          if (null == m || m < f.dep.from || m >= f.dep.to) return !1;
        }
        if (f.arr) {
          const m = minutes(it.arrTime);
          if (null == m || m < f.arr.from || m >= f.arr.to) return !1;
        }
        return !(f.airlines && !(it.legs || []).some(l => !isLongLeg(l) && f.airlines.has(l.operatingName)) || f.longAirlines && !(it => {
          const ls = longLegs(it);
          return ls.length > 0 && ls.every(l => f.longAirlines.has(l.operatingName));
        })(it) || f.aircraft && !(it => {
          const ls = (it && it.legs || []).filter(l => acLeg(l, anyLong));
          return ls.length > 0 && ls.every(l => f.aircraft.has(acFamily(l.aircraftName)));
        })(it));
      };
    }
    function buildCmp() {
      const order = orderById(state.sort);
      const cabin = effectiveCabin(listedItems());
      return (a, b) => {
        const va = order.value(a, cabin), vb = order.value(b, cabin);
        const ea = null == va;
        return ea !== (null == vb) ? ea ? 1 : -1 : ea ? 0 : order.desc ? vb - va : va - vb;
      };
    }
    function apply() {
      if (state.superseded || !sortOn()) return;
      const c = cards();
      if (c && c.setView) {
        !function(items) {
          const first = items && items[0];
          const route = first ? first.origin + "-" + first.dest : null;
          route && filterRoute && route !== filterRoute && filterActive() && resetFilter();
          route && (filterRoute = route);
        }(c.items ? c.items() : []);
        !function() {
          const s = function() {
            const e = searchEntity();
            if (!e) return null;
            try {
              const its = e.itineraries || [];
              return {
                rest: JSON.stringify([ its.map(i => i.originLocationCode + "-" + i.destinationLocationCode), e.commercialFareFamilies || [], (e.travelers || []).map(t => t.passengerTypeCode) ]),
                date: its.map(i => String(i.departureDateTime || "").slice(0, 10)).join()
              };
            } catch (err) {
              return null;
            }
          }();
          if (s) {
            if (lastSearch && (s.rest !== lastSearch.rest || s.date !== lastSearch.date)) {
              const fromMask = formSearchAt && Date.now() - formSearchAt < 3e4;
              (s.rest !== lastSearch.rest || fromMask) && resetFilter();
              formSearchAt = 0;
            }
            lastSearch = s;
          }
        }();
        c.setView({
          cmp: buildCmp(),
          pred: buildPred(),
          cabins: filter.cabins && filter.cabins.size ? new Set(filter.cabins) : null
        });
        state.sorted++;
      }
    }
    const BAR_ID = "mmsort-bar";
    function resultsHost() {
      const oc = document.querySelector("div.offer-container");
      if (!oc) return document.querySelector(".upsell-premium-pres-container");
      const kids = [ ...oc.children ];
      let host = kids.find(k => k.classList.contains("mm-results")) || null;
      const block = kids.find(k => [ ...k.children ].some(c => "refx-upsell-premium-cont" === c.localName));
      if (host && !(block && block.compareDocumentPosition(host) & Node.DOCUMENT_POSITION_FOLLOWING)) return host;
      if (!host) {
        host = document.createElement("div");
        host.className = "mm-results";
      }
      const cal = block ? null : kids.filter(k => "refx-calendar-cont" === k.localName || k.classList.contains("mmcal")).pop();
      oc.insertBefore(host, block || (cal ? cal.nextSibling : null));
      return host;
    }
    const WIDE_MIN = 620;
    let hostWidth = null;
    let watchedHost = null;
    const sizeObs = "function" == typeof ResizeObserver ? new ResizeObserver(() => {
      hostWidth = watchedHost.clientWidth;
      onResize();
    }) : null;
    const wideMode = () => {
      if (state._mode) return "wide" === state._mode;
      if (null != hostWidth) return hostWidth >= WIDE_MIN;
      const host = resultsHost();
      return (host ? host.clientWidth : window.innerWidth) >= WIDE_MIN;
    };
    let shownWide = null;
    let openChip = null;
    let feederOpen = !1;
    function onResize() {
      if (!state.superseded && wideMode() !== shownWide) {
        filterPopEl()?.remove();
        openChip = null;
        refreshBar();
      }
    }
    sizeObs || window.addEventListener("resize", onResize, {
      signal: signal
    });
    function facts(items) {
      const legs = listedLegs(items);
      const cabinsAvail = function(items) {
        const seen = new Set;
        for (const it of items) for (const f of it && it.fares || []) f.cabin && seen.add(f.cabin);
        return seen;
      }(items);
      const inSet = (set, v) => has(set) && set.has(v);
      const gone = v => legs.absent.has(v) ? {
        dim: !0,
        hint: T("nicht im Angebot"),
        title: T("An diesem Tag nicht im Angebot")
      } : {};
      const rows = [];
      rows.push({
        fact: "cab",
        label: T("Kabine"),
        multi: !0,
        opts: CABINS.map((c, i) => ({
          i: i,
          label: c.label,
          on: inSet(filter.cabins, c.key),
          dim: !cabinsAvail.has(c.key),
          hint: cabinsAvail.has(c.key) ? "" : T("keine Tarife"),
          title: cabinsAvail.has(c.key) ? null : T("Zu dieser Suche gibt es keine Tarife in dieser Kabine.")
        }))
      });
      rows.push({
        fact: "stop",
        label: T("Stopps"),
        opts: STOPS.map((s, i) => ({
          i: i,
          label: s.label,
          on: filter.stops === s.max
        }))
      });
      const win = fact => WINDOWS.map((w, i) => ({
        i: i,
        label: w.label,
        time: w.time,
        hint: T("{time} Uhr", {
          time: w.time
        }),
        title: w.title,
        on: !!filter[fact] && filter[fact].from === w.from
      }));
      rows.push({
        fact: "dep",
        label: T("Abflug"),
        time: !0,
        opts: win("dep")
      });
      rows.push({
        fact: "arr",
        label: T("Ankunft"),
        time: !0,
        opts: win("arr")
      });
      legs.long.length > 1 && rows.push({
        fact: "lha",
        label: T("Airline"),
        multi: !0,
        opts: legs.long.map((a, i) => ({
          i: i,
          label: a,
          on: inSet(filter.longAirlines, a),
          ...gone(a)
        }))
      });
      legs.aircraft.length > 1 && rows.push({
        fact: "ac",
        label: T("Flugzeug"),
        multi: !0,
        opts: legs.aircraft.map((a, i) => ({
          i: i,
          label: a.key,
          hint: a.variants.filter(v => v !== a.key && /^(A\d|7\d7)/.test(v)).join(", "),
          title: a.variants.join(", "),
          on: inSet(filter.aircraft, a.key),
          ...gone(a.key)
        }))
      });
      let feeder = null;
      if (legs.short.length > 1) {
        feeder = {
          fact: "air",
          label: T(legs.long.length ? "Zubringer" : "Airline"),
          multi: !0,
          opts: legs.short.map((a, i) => ({
            i: i,
            label: a,
            on: inSet(filter.airlines, a),
            ...gone(a)
          }))
        };
        if (!legs.long.length) {
          const at = rows.findIndex(r => "ac" === r.fact);
          rows.splice(at < 0 ? rows.length : at, 0, feeder);
          feeder = null;
        }
      }
      return {
        rows: rows,
        feeder: feeder
      };
    }
    function menuParts() {
      const bar = document.getElementById(BAR_ID);
      return bar ? {
        list: bar.querySelector(".mmsort-list"),
        button: bar.querySelector(".mmsort-trigger")
      } : null;
    }
    function setMenu(open) {
      const t = menuParts();
      if (t && t.list && t.list.hidden !== !open) {
        t.list.hidden = !open;
        t.button?.setAttribute("aria-expanded", String(open));
      }
    }
    const closeMenu = () => setMenu(!1);
    const filterPopEl = () => document.querySelector(".mmflt-pop");
    function closeFilterPop() {
      const pop = filterPopEl();
      pop && pop.remove();
      refreshBar();
    }
    function renderFilterPop() {
      const bar = document.getElementById(BAR_ID);
      if (!bar) return;
      let pop = filterPopEl();
      if (!pop) {
        pop = document.createElement("div");
        pop.className = "mmflt-pop";
        pop.setAttribute("role", "dialog");
        pop.setAttribute("aria-label", T("Filter"));
        bar.appendChild(pop);
      }
      const items = listedItems();
      const {rows: rows, feeder: feeder} = facts(items);
      const pills = r => r.opts.map(o => {
        return label = o.label, time = o.time, `<button type="button" class="mmflt-pill${(on = o.on) ? " is-on" : ""}${o.dim ? " is-na" : ""}" data-fact="${r.fact}"` + ` data-i="${o.i}" aria-pressed="${!!on}"${(title = o.title) ? ` title="${esc(title)}"` : ""}>${esc(label)}` + `${time ? ` <span class="mmflt-time">${esc(time)}</span>` : ""}</button>`;
        var label, on, title, time;
      }).join("");
      let html = rows.map(r => `<div class="mmflt-grp"><span class="mmflt-lbl">${r.label}</span><div class="mmflt-pills">${pills(r)}</div></div>`).join("");
      if (feeder) {
        const picked = feeder.opts.filter(o => o.on).length;
        const open = feederOpen || picked > 0;
        html += `<div class="mmflt-feeder"><button type="button" class="mmflt-more" aria-expanded="${open}">` + `<span class="mmflt-tri" aria-hidden="true">${open ? "▾" : "▸"}</span>${T("Zubringer-Airlines")}` + `<span class="mmflt-cnt">${picked ? T("{n} · {picked} gewählt", {
          n: feeder.opts.length,
          picked: picked
        }) : feeder.opts.length}</span></button>` + (open ? `<div class="mmflt-pills">${pills(feeder)}</div>` : "") + "</div>";
      }
      const c = cards();
      const counts = c && c.counts ? c.counts : {
        shown: items.length,
        total: items.length
      };
      html += `<div class="mmflt-foot"><span class="mmflt-sum">${Tn(counts.total, "{shown} von {total} Flug entspricht diesen Kriterien", "{shown} von {total} Flügen entsprechen diesen Kriterien", {
        shown: counts.shown,
        total: counts.total
      })}</span>` + `<button type="button" class="mmflt-reset">${T("Zurücksetzen")}</button>` + `<button type="button" class="mmflt-apply">${T("Fertig")}</button></div>`;
      pop.innerHTML = html;
    }
    function handleFilterPill(pillBtn) {
      const fact = pillBtn.dataset.fact;
      const i = +pillBtn.dataset.i;
      const again = pillBtn.classList.contains("is-on");
      if ("stop" === fact) filter.stops = again ? null : STOPS[i].max; else if ("dep" === fact || "arr" === fact) filter[fact] = again ? null : {
        from: WINDOWS[i].from,
        to: WINDOWS[i].to
      }; else if (SETS[fact]) {
        const field = SETS[fact];
        const legs = "cab" === fact ? null : listedLegs(listedItems());
        const value = "cab" === fact ? CABINS[i] && CABINS[i].key : "lha" === fact ? legs.long[i] : "ac" === fact ? legs.aircraft[i] && legs.aircraft[i].key : legs.short[i];
        if (!value) return;
        const set = filter[field] || new Set;
        set.has(value) ? set.delete(value) : set.add(value);
        filter[field] = set.size ? set : null;
      }
      apply();
      filterPopEl() && renderFilterPop();
      refreshBar();
    }
    function closeAll() {
      closeMenu();
      filterPopEl() && closeFilterPop();
      if (openChip) {
        openChip = null;
        refreshBar();
      }
    }
    document.addEventListener("click", function(e) {
      if (state.superseded) return;
      const bar = document.getElementById(BAR_ID);
      bar && bar.contains(e.target) || closeAll();
    }, {
      signal: signal
    });
    document.addEventListener("keydown", function(e) {
      state.superseded || "Escape" !== e.key || closeAll();
    }, {
      signal: signal
    });
    let lastHtml = "";
    function refreshBar() {
      const bar = document.getElementById(BAR_ID);
      if (!bar) return;
      const html = function() {
        const cabin = effectiveCabin(listedItems());
        const name = cabin instanceof Set ? CABINS.filter(c => cabin.has(c.key)).map(c => CABIN_NAMES[c.key]).join(" + ") || null : CABIN_NAMES[cabin] || null;
        const activeOrder = orderById(state.sort);
        const opts = ORDERS.map(o => {
          const isCurrent = o.id === state.sort;
          const hint = o.hint && name ? ' <span class="mmsort-sub">' + esc(name) + "</span>" : "";
          return '<button type="button" role="menuitemradio" aria-checked="' + isCurrent + '"' + ' class="mmsort-opt' + (isCurrent ? " is-on" : "") + '" data-order="' + o.id + '">' + esc(o.label) + hint + "</button>";
        }).join("");
        shownWide = wideMode();
        const filterBtn = shownWide ? function() {
          const {rows: rows, feeder: feeder} = facts(listedItems());
          const chips = rows.map(r => {
            const extra = "lha" === r.fact && feeder ? feeder : null;
            const onOpts = r.opts.filter(o => o.on).concat(extra ? extra.opts.filter(o => o.on) : []);
            const on = onOpts.length > 0;
            let text = r.label;
            if (on) {
              const names = onOpts.map(o => o.label);
              text = r.time ? r.label + " " + onOpts[0].time : names.length <= 2 && names.join(", ").length <= 24 ? names.join(", ") : r.label + " · " + names.length;
            }
            const open = openChip === r.fact;
            const opt = (row, o) => `<button type="button" class="mmchip-opt${o.on ? " is-on" : ""}${o.dim ? " is-na" : ""}"` + ` role="${row.multi ? "menuitemcheckbox" : "menuitemradio"}" aria-checked="${!!o.on}"` + ` data-fact="${row.fact}" data-i="${o.i}"${o.title ? ` title="${esc(o.title)}"` : ""}>` + `<span class="mmchip-box"></span>${esc(o.label)}` + `${o.hint ? `<span class="mmchip-hint">${esc(o.hint)}</span>` : ""}</button>`;
            const menu = open ? `<div class="mmchip-dd" role="menu">` + r.opts.map(o => opt(r, o)).join("") + (extra ? `<div class="mmchip-sep">${T("Zubringer")}</div>` + extra.opts.map(o => opt(extra, o)).join("") : "") + `</div>` : "";
            return `<div class="mmchip-w"><button type="button" class="mmchip${on ? " is-on" : ""}"` + ` data-chip="${r.fact}" aria-haspopup="true" aria-expanded="${open}">${esc(text)}` + (on ? `<span class="mmchip-x" data-chip="${r.fact}" role="button" aria-label="${esc(T("{label}-Filter entfernen", {
              label: r.label
            }))}">×</span>` : `<span class="mmchip-car" aria-hidden="true"></span>`) + `</button>${menu}</div>`;
          }).join("");
          let end = "";
          if (filterActive()) {
            const c = cards();
            const n = c && c.counts ? c.counts : null;
            end = `<span class="mmchips-end">` + (n ? `<span class="mmchip-sum">${Tn(n.total, "{shown} von {total} Flug", "{shown} von {total} Flügen", {
              shown: n.shown,
              total: n.total
            })}</span>` : "") + `<button type="button" class="mmchip-reset">${T("Zurücksetzen")}</button></span>`;
          }
          return `<div class="mmchips" role="group" aria-label="${T("Filter")}">${chips}${end}</div>`;
        }() : '<button type="button" class="mmsort-filter' + (filterActive() ? " is-on" : "") + '">' + T("Filter") + (filterActive() ? '<span class="mmsort-dot" aria-hidden="true"></span>' : "") + "</button>";
        const valueHtml = esc(activeOrder.label) + (activeOrder.hint && name ? " · " + esc(name) : "");
        return filterBtn + '<div class="mmsort-menu">' + '<span class="mmsort-label">' + T("Sortieren nach") + "</span>" + '<button type="button" class="mmsort-trigger" aria-haspopup="true" aria-expanded="false">' + '<span class="mmsort-current">' + valueHtml + "</span>" + '<span class="mmsort-chevron" aria-hidden="true"></span></button>' + '<div class="mmsort-list" role="menu" hidden>' + opts + "</div>" + "</div>" + function() {
          const c = cards();
          const heads = c && c.paxHeads ? c.paxHeads() : 1;
          if (!(heads > 1 && c.priceMode)) return "";
          const m = c.priceMode();
          const b = (id, t) => '<button type="button" class="mmsort-pm-opt" data-pm="' + id + '" aria-pressed="' + (m === id) + '">' + esc(t) + "</button>";
          return '<div class="mmsort-pm"><span class="mmsort-label">' + T("Preise") + '</span><span class="mmsort-pm-sw">' + b("adult", T("pro Erwachsener")) + b("total", T("gesamt · {n} Reisende", {
            n: heads
          })) + "</span></div>";
        }() + function() {
          try {
            const bd = boundsData();
            if (!bd || "function" != typeof bd.budget) return "";
            const b = bd.budget();
            if (!b.calls) return "";
            const left = b.limit - b.calls;
            const cls = left <= 0 ? " is-out" : left <= 6 ? " is-low" : "";
            const until = b.freeAt ? (o = {
              hour: "2-digit",
              minute: "2-digit"
            }, window.__mmI18n ? window.__mmI18n.dtf(o) : new Intl.DateTimeFormat("de-DE", o)).format(new Date(b.freeAt)) : "";
            const tip = T("Miles & More erlaubt etwa {limit} Suchen je IP-Adresse und Stunde, " + "danach ist die Adresse eine Stunde gesperrt. Gezählt wird nur dieser Browser.", {
              limit: b.limit
            }) + (until ? " " + T("Zähler wieder leer um {time}.", {
              time: until
            }) : "");
            const reset = '<button type="button" class="mmsort-budget-reset" ' + 'title="' + esc(T("Zähler zurücksetzen nach IP-Wechsel (VPN, Hotspot, anderes Netz)")) + '" ' + 'aria-label="' + esc(T("Suchzähler zurücksetzen")) + '">↺</button>';
            return '<span class="mmsort-budget' + cls + '" title="' + esc(tip) + '">' + esc(T("Suchen {calls}/{limit}", {
              calls: b.calls,
              limit: b.limit
            })) + reset + "</span>";
          } catch (e) {
            return "";
          }
          var o;
        }();
      }();
      if (html === lastHtml) return;
      const oldList = bar.querySelector(".mmsort-list");
      const wasOpen = !(!oldList || oldList.hidden);
      const pop = bar.querySelector(".mmflt-pop");
      pop && pop.remove();
      bar.innerHTML = html;
      bar.classList.toggle("is-wide", !!shownWide);
      lastHtml = html;
      pop && bar.appendChild(pop);
      if (wasOpen) {
        const l = bar.querySelector(".mmsort-list");
        const t = bar.querySelector(".mmsort-trigger");
        l && (l.hidden = !1);
        t && t.setAttribute("aria-expanded", "true");
      }
    }
    function hideNativeBar() {
      document.querySelectorAll(".sorting-filtering-area").forEach(e => e.classList.add("mmsort-native-hidden"));
      document.querySelectorAll(".upsell-premium-pres-container refx-info-text").forEach(e => {
        RANKING_NOTICE.test(e.textContent) && e.classList.add("mmsort-native-hidden");
      });
    }
    const RANKING_NOTICE = (keys = [ "refx-find-more-flights-cont.cpdMessage" ], fallback = /neutral/i, 
    {
      test(text) {
        const i = window.__mmI18n;
        const own = i && i.pageText ? keys.map(k => i.pageText(k)).filter(Boolean) : [];
        const t = String(text || "").replace(/\s+/g, " ");
        return own.some(s => t.includes(s.slice(0, 40))) || fallback.test(t);
      }
    });
    var keys, fallback;
    function showNativeBar() {
      document.querySelectorAll(".mmsort-native-hidden").forEach(e => e.classList.remove("mmsort-native-hidden"));
    }
    const STYLE_ID = "mmsort-style";
    let styleEl = null;
    state.sort = function() {
      try {
        const v = localStorage.getItem(STORE_KEY);
        if (v && ORDERS.some(o => o.id === v)) return v;
      } catch (e) {}
      return ORDERS[0].id;
    }();
    let timer = null;
    function schedule() {
      timer || (timer = setTimeout(() => {
        timer = null;
        if (!state.superseded && sortOn()) try {
          !function() {
            if (!document.head || styleEl) return;
            styleEl = document.getElementById(STYLE_ID);
            if (!styleEl) {
              styleEl = document.createElement("style");
              styleEl.id = STYLE_ID;
              document.head.appendChild(styleEl);
            }
            const css = `
.mmsort-native-hidden { display: none !important; }

.mmsort { display: flex; align-items: center; flex-wrap: wrap; gap: 10px 14px;
          padding: 2px 0 16px; position: relative; }
.mmsort-label { font-size: 13px; color: ${INK_muted}; letter-spacing: .01em; }

.mmsort-pm { display: inline-flex; align-items: center; gap: 8px; }
.mmsort-pm-sw { display: inline-flex; padding: 3px; border-radius: 999px; background: #e9e8e3; }
.mmsort-pm-opt { border: 0; background: none; font: inherit; font-size: 13px; color: ${INK_secondary};
                 padding: 5px 13px; border-radius: 999px; cursor: pointer; white-space: nowrap; }
.mmsort-pm-opt[aria-pressed="true"] { background: #fff; color: ${INK_primary}; font-weight: 700;
                                      box-shadow: 0 1px 3px rgba(5,22,77,.18); }

.mmsort-budget { margin-left: auto; font-size: 12px; color: ${INK_muted}; white-space: nowrap;
                 cursor: default; }
.mmsort-budget.is-low { color: #b45309; font-weight: 600; }
.mmsort-budget.is-out { color: #b3261e; font-weight: 600; }
.mmsort-budget-reset { margin-left: 6px; padding: 0 4px; border: 0; background: none;
                       font: inherit; font-size: 13px; line-height: 1; cursor: pointer;
                       color: inherit; opacity: .55; vertical-align: -1px; }
.mmsort-budget-reset:hover { opacity: 1; }

.mmsort-list, .mmchip-dd, .mmflt-pop { background: #fff; border: 1px solid ${INK_hairline};
                                       border-radius: 12px; box-shadow: 0 10px 28px rgba(5,22,77,.13); }
.mmsort-chevron, .mmchip-car { width: 0; height: 0; border-left: 4px solid transparent;
                               border-right: 4px solid transparent; border-top: 5px solid ${INK_secondary};
                               transition: transform .15s; }
.mmsort-trigger[aria-expanded="true"] .mmsort-chevron,
.mmchip[aria-expanded="true"] .mmchip-car { transform: rotate(180deg); }
.mmsort-trigger:hover, .mmchip:hover, .mmflt-pill:hover, .mmflt-reset:hover { border-color: #b9c6e0; }
.mmsort-opt:hover, .mmchip-opt:hover { background: #f3f6fc; color: ${INK_primary}; }

.mmsort-menu { position: relative; display: inline-flex; align-items: center; gap: 8px;
               margin-left: auto; }
.mmsort-trigger { display: inline-flex; align-items: center; gap: 8px;
                  padding: 7px 13px; border-radius: 999px; cursor: pointer;
                  border: 1px solid ${INK_hairline}; background: #fff;
                  font: inherit; font-size: 13px; font-weight: 600;
                  color: ${INK_primary}; line-height: 1.25; }
.mmsort-list { position: absolute; top: calc(100% + 6px); right: 0; z-index: 40;
               min-width: 244px; padding: 5px; }
.mmsort-list[hidden] { display: none; }
.mmsort-opt { display: flex; align-items: baseline; gap: 7px; width: 100%;
              padding: 9px 11px; border: 0; border-radius: 8px; cursor: pointer;
              background: transparent; font: inherit; font-size: 13.5px;
              color: ${INK_secondary}; text-align: left; line-height: 1.3; }
.mmsort-opt.is-on { color: ${INK_primary}; font-weight: 600; }
.mmsort-opt.is-on::after { content: ''; margin-left: auto; width: 5px; height: 9px;
                           border: solid ${INK_primary}; border-width: 0 2px 2px 0;
                           transform: rotate(45deg) translateY(-1px); }
.mmsort-sub { font-size: 11.5px; font-weight: 400; color: ${INK_muted}; }

@media (max-width: 700px) {
    .mmsort { gap: 8px; }
    .mmsort-trigger { padding: 6px 11px; font-size: 12.5px; }
    .mmsort-list { min-width: 210px; }
}

.mmsort-filter { position: relative; display: inline-flex; align-items: center; gap: 7px;
                 padding: 7px 15px; border-radius: 999px; cursor: pointer;
                 border: 1px solid ${INK_primary}; background: ${INK_primary};
                 font: inherit; font-size: 13px; font-weight: 600; color: #fff;
                 line-height: 1.25; }
.mmsort-filter:hover { background: #0a2270; border-color: #0a2270; }
.mmsort-dot { width: 6px; height: 6px; border-radius: 50%; background: #fff; }

.mmsort.is-wide { flex-wrap: nowrap; align-items: flex-start; }
.mmsort.is-wide .mmsort-budget { line-height: 34px; }
.mmsort.is-wide .mmchips { flex: 1 1 auto; min-width: 0; }
.mmsort.is-wide .mmsort-menu, .mmsort.is-wide .mmsort-pm, .mmsort.is-wide .mmsort-budget { flex: 0 0 auto; white-space: nowrap; }
.mmsort.is-wide .mmsort-budget { margin-left: 0; }
.mmchips { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.mmchips-end { margin-left: auto; display: inline-flex; align-items: center; gap: 12px; }
.mmchip-w { position: relative; }
.mmchip { display: inline-flex; align-items: center; gap: 8px; padding: 7px 12px 7px 14px;
          border-radius: 999px; border: 1px solid ${INK_hairline}; background: #fff; cursor: pointer;
          font: inherit; font-size: 13px; font-weight: 600; color: ${INK_primary}; line-height: 1.25;
          white-space: nowrap; }
.mmchip[aria-expanded="true"] { border-color: ${INK_primary}; }
.mmchip.is-on { background: ${INK_primary}; border-color: ${INK_primary}; color: #fff; }
.mmchip-x { display: inline-flex; align-items: center; justify-content: center; width: 17px; height: 17px;
            margin-right: -4px; border-radius: 50%; background: rgba(255,255,255,.2); font-size: 13px; line-height: 1; }
.mmchip-x:hover { background: rgba(255,255,255,.38); }
.mmchip-dd { position: absolute; top: calc(100% + 6px); left: 0; z-index: 41; min-width: 230px;
             max-height: 380px; overflow: auto; padding: 5px; }
.mmchip-opt { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px; border: 0;
              border-radius: 8px; background: transparent; font: inherit; font-size: 13.5px;
              color: ${INK_secondary}; text-align: left; cursor: pointer; line-height: 1.3; white-space: nowrap; }
.mmchip-opt.is-on { color: ${INK_primary}; font-weight: 600; }
.mmchip-opt.is-na { color: ${INK_muted}; }
.mmchip-box { position: relative; flex: 0 0 auto; width: 15px; height: 15px; border: 1.5px solid #b9c0cf;
              border-radius: 4px; box-sizing: border-box; }
.mmchip-opt[role="menuitemradio"] .mmchip-box { border-radius: 50%; }
.mmchip-opt.is-on .mmchip-box { background: ${INK_primary}; border-color: ${INK_primary}; }
.mmchip-opt[role="menuitemcheckbox"].is-on .mmchip-box::after { content: ''; position: absolute; left: 4px; top: 1px;
              width: 4px; height: 8px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg); }
.mmchip-opt[role="menuitemradio"].is-on .mmchip-box::after { content: ''; position: absolute; inset: 3px;
              border-radius: 50%; background: #fff; }
.mmchip-hint { margin-left: auto; padding-left: 16px; font-size: 11.5px; font-weight: 400; color: ${INK_muted}; }
.mmchip-sep { margin: 4px 6px 0; padding: 9px 4px 4px; border-top: 1px solid ${INK_hairline}; }
.mmchip-sum { font-size: 12.5px; font-weight: 600; color: ${INK_primary}; white-space: nowrap; }
.mmchip-reset { padding: 0; border: 0; background: none; font: inherit; font-size: 12.5px; font-weight: 600;
                color: ${INK_accent}; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }

.mmflt-pop { position: absolute; top: calc(100% - 8px); left: 0; z-index: 41;
             width: min(620px, 94vw); padding: 6px 16px 12px; }
.mmflt-grp { display: flex; align-items: baseline; gap: 12px; padding: 8px 0; }
.mmflt-grp + .mmflt-grp { border-top: 1px solid ${INK_hairline}; }
.mmflt-lbl { flex: 0 0 70px; }
.mmflt-feeder { padding: 8px 0 6px; border-top: 1px solid ${INK_hairline}; }
.mmflt-feeder .mmflt-pills { margin-top: 8px; }
.mmflt-more { display: inline-flex; align-items: baseline; gap: 6px; padding: 0; border: 0;
              background: none; font: inherit; cursor: pointer; }
.mmflt-lbl, .mmflt-more, .mmchip-sep { font-size: 10.5px; font-weight: 700; color: ${INK_muted};
                                       text-transform: uppercase; letter-spacing: .05em; }
.mmflt-more:hover { color: ${INK_primary}; }
.mmflt-tri { width: 10px; letter-spacing: 0; }
.mmflt-cnt { font-weight: 500; text-transform: none; letter-spacing: 0; font-size: 11.5px; }
.mmflt-pills { display: flex; flex-wrap: wrap; gap: 6px; }
.mmflt-pill { border: 1px solid ${INK_hairline}; background: #fff; border-radius: 999px;
              padding: 4px 12px; font: inherit; font-size: 12.5px; font-weight: 600;
              color: ${INK_secondary}; cursor: pointer; line-height: 1.3;
              transition: background .12s, border-color .12s; }
.mmflt-pill:hover { background: #f8fafd; }
.mmflt-pill.is-na { color: ${INK_muted}; background: #f7f7f5; }
.mmflt-pill.is-on { background: ${INK_primary}; border-color: ${INK_primary}; color: #fff; }
.mmflt-time { font-size: 11px; font-weight: 500; color: ${INK_muted}; }
.mmflt-pill.is-on .mmflt-time { color: rgba(255,255,255,.72); }
.mmflt-foot { display: flex; align-items: center; gap: 8px; padding-top: 10px;
              margin-top: 2px; border-top: 1px solid ${INK_hairline}; }
.mmflt-sum { margin-right: auto; font-size: 12.5px; font-weight: 600; color: ${INK_primary}; }
.mmflt-reset, .mmflt-apply { font: inherit; font-size: 12.5px; font-weight: 600;
              border-radius: 999px; padding: 6px 14px; cursor: pointer; line-height: 1.25; }
.mmflt-reset { background: #fff; border: 1px solid ${INK_hairline}; color: ${INK_primary}; }
.mmflt-apply { background: ${INK_primary}; border: 1px solid ${INK_primary}; color: #fff; }
.mmflt-apply:hover { background: #0a2270; }

.mmsort-trigger:focus-visible, .mmsort-filter:focus-visible, .mmchip:focus-visible,
.mmflt-pill:focus-visible, .mmsort-budget-reset:focus-visible { outline: 2px solid ${INK_accent}; outline-offset: 2px; }
.mmsort-opt:focus-visible, .mmchip-opt:focus-visible { outline: 2px solid ${INK_accent}; outline-offset: -2px; }
.mmsort-pm-opt:focus-visible { outline: 2px solid ${INK_accent}; outline-offset: 1px; }
.mmsort-budget-reset:focus-visible { border-radius: 4px; }

html.mm-dark :is(.mmsort-list, .mmchip-dd, .mmflt-pop) { background-color: var(--mm-dark-layer); }
html.mm-dark :is(.mmchip, .mmsort-trigger, .mmflt-reset):not(.is-on) { background-color: var(--mm-dark-layer); border-color: hsl(222 12% 34%); }
html.mm-dark .mmchip-opt:not(.is-on) .mmchip-box { border-color: hsl(222 15% 60%); }
`;
            styleEl.textContent !== css && (styleEl.textContent = css);
          }();
          hideNativeBar();
          !function() {
            if (state.superseded || !sortOn()) return;
            const host = resultsHost();
            if (!host) return;
            !function(host) {
              if (sizeObs && host !== watchedHost) {
                sizeObs.disconnect();
                watchedHost = host;
                hostWidth = null;
                sizeObs.observe(host);
              }
            }(host);
            let bar = document.getElementById(BAR_ID);
            if (bar) bar.parentElement !== host && host.insertBefore(bar, host.firstChild); else {
              bar = document.createElement("div");
              bar.id = BAR_ID;
              bar.className = "mmsort";
              lastHtml = "";
              host.insertBefore(bar, host.firstChild);
              bar.addEventListener("click", e => {
                e.stopPropagation();
                const at = selector => e.target.closest?.(selector);
                if (at(".mmsort-budget-reset")) {
                  boundsData().resetBudget?.();
                  refreshBar();
                  return;
                }
                const pm = at(".mmsort-pm-opt");
                if (pm) {
                  cards()?.setPriceMode?.(pm.dataset.pm);
                  refreshBar();
                  apply();
                  return;
                }
                const cx = at(".mmchip-x");
                if (cx) {
                  !function(fact) {
                    if ("stop" === fact) filter.stops = null; else if ("dep" === fact || "arr" === fact) filter[fact] = null; else if (SETS[fact]) {
                      filter[SETS[fact]] = null;
                      "lha" === fact && (filter.airlines = null);
                    }
                  }(cx.dataset.chip);
                  openChip = null;
                  apply();
                  refreshBar();
                  return;
                }
                const copt = at(".mmchip-opt");
                if (copt) {
                  handleFilterPill(copt);
                  return;
                }
                const chip = at(".mmchip");
                if (chip) {
                  openChip = openChip === chip.dataset.chip ? null : chip.dataset.chip;
                  closeMenu();
                  refreshBar();
                  return;
                }
                if (at(".mmchip-reset")) {
                  resetFilter();
                  openChip = null;
                  apply();
                  refreshBar();
                  return;
                }
                if (at(".mmchip-dd")) return;
                if (at(".mmsort-trigger")) {
                  if (openChip) {
                    openChip = null;
                    refreshBar();
                  }
                  !function() {
                    const t = menuParts();
                    t && t.list && setMenu(t.list.hidden);
                  }();
                  return;
                }
                if (at(".mmsort-filter")) {
                  !function() {
                    if (filterPopEl()) closeFilterPop(); else {
                      closeMenu();
                      renderFilterPop();
                    }
                  }();
                  return;
                }
                const pill = at(".mmflt-pill");
                if (pill) {
                  handleFilterPill(pill);
                  return;
                }
                if (at(".mmflt-more")) {
                  feederOpen = !feederOpen;
                  renderFilterPop();
                  return;
                }
                if (at(".mmflt-reset")) {
                  resetFilter();
                  apply();
                  renderFilterPop();
                  refreshBar();
                  return;
                }
                if (at(".mmflt-apply")) {
                  closeFilterPop();
                  return;
                }
                if (at(".mmflt-pop")) return;
                const b = at(".mmsort-opt");
                if (b) {
                  !function(id) {
                    state.sort = id;
                    try {
                      localStorage.setItem(STORE_KEY, id);
                    } catch (e) {}
                  }(b.dataset.order);
                  closeMenu();
                  refreshBar();
                  apply();
                } else at(".mmsort-list") || closeMenu();
              });
            }
            refreshBar();
          }();
          apply();
        } catch (e) {}
      }, 120));
    }
    const HOST_SELECTOR = "div.offer-container, .upsell-premium-pres-container";
    const NATIVE_SHOWN = ".sorting-filtering-area:not(.mmsort-native-hidden), .upsell-premium-pres-container refx-info-text:not(.mmsort-native-hidden)";
    let looking = !1;
    const look = () => {
      looking = !1;
      try {
        if (state.superseded || !document.querySelector(HOST_SELECTOR)) return;
        if (!document.getElementById(BAR_ID)) {
          schedule();
          return;
        }
        sortOn() && document.querySelector(NATIVE_SHOWN) && hideNativeBar();
      } catch (e) {}
    };
    const obs = new MutationObserver(() => {
      if (!looking) {
        looking = !0;
        "function" == typeof requestAnimationFrame ? requestAnimationFrame(look) : setTimeout(look, 0);
      }
    });
    function start() {
      const target = document.querySelector(".main-content") || document.body;
      obs.disconnect();
      obs.observe(target, {
        childList: !0,
        subtree: !0
      });
      state._observer = obs;
    }
    "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", start, {
      signal: signal
    }) : start();
    schedule();
    const offs = [];
    const track = off => {
      off && offs.push(off);
    };
    try {
      const data = boundsData();
      track(data.onUpdate?.(() => {
        refreshBar();
        if (!state.superseded && sortOn()) if (document.getElementById(BAR_ID)) {
          hideNativeBar();
          apply();
        } else schedule();
      }));
      track(data.onRequest?.(() => {
        !state.superseded && sortOn() && refreshBar();
      }));
    } catch (e) {}
    try {
      const c = cards();
      track(c?.onRender?.(() => {
        if (!state.superseded && sortOn()) {
          refreshBar();
          filterPopEl() && renderFilterPop();
        }
      }));
      track(c?.onFilterReset?.(() => {
        resetFilter();
        apply();
        refreshBar();
      }));
    } catch (e) {}
    state.teardown = () => {
      try {
        obs.disconnect();
      } catch (e) {}
      try {
        sizeObs?.disconnect();
      } catch (e) {}
      ac.abort();
      offs.forEach(off => {
        try {
          off();
        } catch (e) {}
      });
      clearTimeout(timer);
      const bar = document.getElementById(BAR_ID);
      bar && bar.remove();
      showNativeBar();
      const st = styleEl || document.getElementById(STYLE_ID);
      st && st.remove();
      styleEl = null;
    };
    state.rerender = () => {
      refreshBar();
      schedule();
    };
    try {
      track(window.__mmSettings?.onChange?.(() => {
        if (sortOn()) {
          refreshBar();
          schedule();
        } else {
          document.getElementById(BAR_ID)?.remove();
          showNativeBar();
        }
      }));
    } catch (e) {}
    window.addEventListener("pagehide", e => {
      if (!e || !e.persisted) {
        state.superseded = !0;
        try {
          obs.disconnect();
        } catch (e2) {}
      }
    }, {
      signal: signal
    });
    window.addEventListener("pageshow", e => {
      if (e && e.persisted && state.superseded && window.__mmSort === state) {
        state.superseded = !1;
        start();
        schedule();
      }
    }, {
      signal: signal
    });
  })();
  (() => {
    "use strict";
    const VERSION = 63;
    if (window.__mmRecovery && window.__mmRecovery.version >= VERSION) return;
    const T = (s, p) => window.__mmI18n ? window.__mmI18n.t(s, p) : p ? String(s).replace(/\{(\w+)\}/g, (m, k) => null != p[k] ? String(p[k]) : m) : String(s);
    const Tn = (n, one, other, p) => window.__mmI18n ? window.__mmI18n.tn(n, one, other, p) : T(1 === n ? one : other, Object.assign({
      n: n
    }, p));
    const inherited = window.__mmRecovery;
    if (inherited) {
      inherited.superseded = !0;
      try {
        inherited._observer?.disconnect();
      } catch (e) {}
      for (const k of [ "_offSettings", "_offBounds", "_abort", "restore" ]) try {
        inherited[k]?.();
      } catch (e) {}
    }
    const INK_primary = "#05164D", INK_secondary = "#52514e", INK_muted = "#898781", INK_hairline = "#e1e0d9", INK_accent = "#1c5cab";
    const WARN = "#A54A4A";
    function pageMarket() {
      let lang = null, country = null;
      try {
        const t = JSON.parse(sessionStorage.getItem("analytics") || "null")?.touchpointInfo;
        t && "string" == typeof t.market && /^[a-z]{2}$/i.test(t.market) && (country = t.market.toLowerCase());
        t && "string" == typeof t.language && /^[a-z]{2}$/i.test(t.language) && (lang = t.language.toLowerCase());
      } catch (e) {}
      const doc = String(document.documentElement.lang || "");
      const full = /^[a-z]{2}-[A-Z]{2}$/.test(doc) ? doc : lang && country ? lang + "-" + country.toUpperCase() : "de-DE";
      return {
        full: full,
        country: country || full.slice(3).toLowerCase(),
        lang: full.slice(0, 2)
      };
    }
    const portalBase = () => {
      const m = pageMarket();
      return "https://www.miles-and-more.com/" + m.country + "/" + m.lang;
    };
    const loginUrl = () => "https://account.miles-and-more.com/web/" + pageMarket().country + "/" + pageMarket().lang + "/login.html?scope=AUTHENTICATED%20IDENTIFIED%20urn%3Amilesandmore%3Atech%3Abackground%3Av1%3Aactive" + "&response_type=code&reduced_state=NONE&principal_type=SERVICE_CARD_NUMBER" + "&client_id=agGBZmuTGwFXWzVDg8ckGKGBytemE1nS" + "&redirect_uri=https%3A%2F%2Fwww.miles-and-more.com" + "&state=NDkyMDIxODQzMTEwMTU5MjE1MTExNzY1Nzk2MTcwMjM5ODE2ODExOA" + "&prompt=login";
    const LOGOUT_HOSTS = [ "api.miles-and-more.com", "api.travelid.lufthansa.com" ];
    const esc = s => String(null == s ? "" : s).replace(/[&<>"]/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    }[c]));
    const RECOVERY_RE = /\/recovery/;
    const AVAIL_RE = /availability/;
    const state = {
      version: VERSION,
      superseded: !1,
      _observer: null,
      patched: 0
    };
    const ac = new AbortController;
    state._abort = () => ac.abort();
    const RESUME_COOKIE = "mmp_resume";
    const CFF_CABIN = [ [ /^CFFPECO/i, "PREMIUMECO" ], [ /^CFFECO/i, "ECONOMY" ], [ /^CFFBUS/i, "BUSINESS" ], [ /^CFFFIRS?/i, "FIRST" ] ];
    function cabinOf(e) {
      const cff = e && e.commercialFareFamilies && e.commercialFareFamilies[0];
      const hit = cff && CFF_CABIN.find(([re]) => re.test(String(cff)));
      return hit && hit[1] || e && e.cabin || "ECONOMY";
    }
    function currentSearch() {
      try {
        const o = JSON.parse(sessionStorage.getItem("airBoundsSearch"));
        const e = o.entities[o.selectedAirBoundsSearchId];
        return e && e.itineraries && e.itineraries.length ? {
          cabin: cabinOf(e),
          itineraries: e.itineraries.map(l => ({
            departureDateTime: l.departureDateTime,
            originLocationCode: l.originLocationCode,
            destinationLocationCode: l.destinationLocationCode
          })),
          travelers: e.travelers || [ {
            passengerTypeCode: "ADT"
          } ],
          commercialFareFamilies: e.commercialFareFamilies || void 0
        } : null;
      } catch (e) {
        return null;
      }
    }
    const LAST_KEY = "mm_last_search";
    function rememberSearch() {
      const s = currentSearch();
      if (s) try {
        sessionStorage.setItem(LAST_KEY, JSON.stringify(s));
      } catch (e) {}
    }
    function lastSearch() {
      try {
        return JSON.parse(sessionStorage.getItem(LAST_KEY));
      } catch (e) {
        return null;
      }
    }
    const flightSearch = () => portalBase() + "/spend/flights.html";
    let loginOpened = !1;
    let loginOpenedAt = 0;
    let loginPoll = null;
    let onLoginClosed = null;
    const RETRY_STAMP = "mm_retry_t";
    function retrySearch() {
      try {
        sessionStorage.setItem(RETRY_STAMP, String(Date.now()));
      } catch (e) {}
      backToSearch();
    }
    function backToSearch() {
      const search = currentSearch() || lastSearch() || function() {
        try {
          const hit = document.cookie.split("; ").find(c => 0 === c.indexOf(RESUME_COOKIE + "="));
          if (!hit) return null;
          const o = JSON.parse(decodeURIComponent(hit.slice(RESUME_COOKIE.length + 1)));
          return o && o.search ? o.search : null;
        } catch (e) {
          return null;
        }
      }();
      search ? function(search) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = "https://shop.miles-and-more.com/reward/reward/availability" + "?lang=" + encodeURIComponent(pageMarket().full) + "&portalCountry=" + encodeURIComponent(pageMarket().country);
        form.style.display = "none";
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = "search";
        input.value = JSON.stringify(search);
        form.appendChild(input);
        try {
          const facts = window.__mmSponsor && window.__mmSponsor.postField();
          if (facts) {
            const el = document.createElement("input");
            el.type = "hidden";
            el.name = "portalFacts";
            el.value = facts;
            form.appendChild(el);
          }
        } catch (e) {}
        document.body.appendChild(form);
        form.submit();
      }(search) : location.href = flightSearch();
    }
    let ticker = null;
    function every(fn, ms) {
      const t = setInterval(fn, ms);
      t && "function" == typeof t.unref && t.unref();
      return t;
    }
    try {
      Object.defineProperty(window, "__mmRecovery", {
        value: state,
        enumerable: !1,
        configurable: !0
      });
    } catch (e) {
      try {
        window.__mmRecovery = state;
      } catch (e2) {}
    }
    const waitingOn = () => !window.__mmSettings || !1 !== window.__mmSettings.get("waiting");
    const pageMessage = (keys, fallback) => ({
      test(text) {
        const i = window.__mmI18n;
        const own = i && i.pageText ? keys.map(k => i.pageText(k)).filter(Boolean) : [];
        const t = String(text || "").replace(/\s+/g, " ");
        return own.some(s => t.includes(s.slice(0, 40))) || fallback.test(t);
      }
    });
    const GENERIC_BANNER_RE = pageMessage([ "error.generic-server-error", "refx-messages-panel-pres.generic-server-error", "lhg-technical-error" ], /Leider ist ein Problem aufgetreten|Aus technischen Gründen können wir Ihre Flugsuche/);
    function bannerText(code, detail) {
      if ("65012" === (code = String(code || ""))) return T("Der gewählte Hinflug ist abgelaufen. Eine neue Suche behebt das.");
      if ("7959" === code) {
        const seg = /SEGMENT (\d)/.exec(detail || "");
        return T(seg && "2" === seg[1] ? "Kein Flug für den Rückflug an diesem Tag." : "Kein Flug für den Hinflug an diesem Tag.");
      }
      return detail ? code + ": " + detail : null;
    }
    function transportCause() {
      try {
        const be = window.__mmBounds && window.__mmBounds.lastError;
        return be && be.transport && be.title ? be : null;
      } catch (e) {
        return null;
      }
    }
    const NO_FLIGHT_BANNER_RE = pageMessage([ "lhg-upsell-link-out-error-title" ], /Leider haben wir keinen Flug gefunden/);
    function selectedCart() {
      try {
        const c = JSON.parse(sessionStorage.getItem("cart"));
        return c && c.entities && c.entities[c.selectedCartId] || null;
      } catch (e) {
        return null;
      }
    }
    const cartItems = cart => (cart?.airOffers || []).flatMap(o => o.offerItems || []);
    const matching = (leaves, re) => leaves.filter(n => !n.childElementCount && !n.dataset.mmrecDone && re.test(n.textContent || ""));
    const cell = (cls, text) => {
      const el = document.createElement("span");
      el.className = cls;
      el.textContent = text;
      return el;
    };
    function ownLine(n, block) {
      n.textContent = "";
      n.appendChild(block);
      const panel = n.closest(".messages-panel");
      if (panel) {
        panel.classList.add("mmrec-own");
        panel.classList.toggle("mmrec-own-only", 1 === panel.querySelectorAll(".messages-list .message").length);
      }
    }
    const MIXED_CABIN_RE = pageMessage([ "refx-shopping-cart.mixedCabinWarningMessage" ], /niedrigeren Klasse|in a lower class/);
    const CABIN_RANK = {
      first: 4,
      business: 3,
      ecoPremium: 2,
      eco: 1
    };
    const CABIN_LABEL = {
      first: "First",
      business: "Business",
      ecoPremium: "Premium Economy",
      eco: "Economy"
    };
    const PRICE_CHANGED_RE = pageMessage([ "error.DAPI/36806" ], /Die Flugpreise haben sich geändert|The flight prices changed/);
    const fmtNum = v => {
      return (o = {
        maximumFractionDigits: 2
      }, window.__mmI18n ? window.__mmI18n.nf(o) : new Intl.NumberFormat("de-DE", o)).format(Number(v));
      var o;
    };
    function rewriteBanners() {
      const leaves = [ ...document.querySelectorAll(".messages-list .message-title *") ].filter(n => !n.childElementCount && !n.dataset.mmrecDone);
      if (leaves.length) {
        !function(leaves) {
          const nodes = matching(leaves, MIXED_CABIN_RE);
          if (!nodes.length) return;
          const mixed = function() {
            const cart = selectedCart();
            if (!cart) return null;
            const bounds = cartItems(cart).flatMap(it => it.air?.bounds || []);
            const out = [];
            bounds.forEach((b, i) => {
              const fl = b.flights || [];
              if (!fl.some(f => f.cabin !== fl[0].cabin)) return;
              const top = Math.max(...fl.map(f => CABIN_RANK[f.cabin] || 0));
              out.push({
                label: 2 === bounds.length ? T(i ? "Rückflug" : "Hinflug") : bounds.length > 2 ? T("Flug {n}", {
                  n: i + 1
                }) : "",
                flights: fl.map(f => {
                  const x = f.flight || {};
                  return {
                    no: (x.marketingAirlineCode || "") + (x.marketingFlightNumber || ""),
                    route: (x.departure && x.departure.locationCode || "?") + " → " + (x.arrival && x.arrival.locationCode || "?"),
                    cabin: CABIN_LABEL[f.cabin] || f.cabin || "?",
                    lower: (CABIN_RANK[f.cabin] || 0) < top
                  };
                })
              });
            });
            return out.length ? out : null;
          }();
          if (mixed) {
            injectStyles();
            nodes.forEach(n => {
              const grid = document.createElement("div");
              grid.className = "mmrec-cabins";
              grid.appendChild(cell("mmrec-own-head mmrec-cabins-head", T("Gemischte Kabinen")));
              mixed.forEach(b => {
                b.label && grid.appendChild(cell("mmrec-cabins-bound", b.label));
                b.flights.forEach(f => {
                  const low = f.lower ? " mmrec-cabins-lower" : "";
                  grid.appendChild(cell("mmrec-cabins-no" + low, f.no));
                  grid.appendChild(cell("mmrec-cabins-route" + low, f.route));
                  grid.appendChild(cell("mmrec-cabins-cabin" + low, f.cabin));
                });
              });
              ownLine(n, grid);
            });
          }
        }(leaves);
        !function(leaves) {
          const nodes = matching(leaves, PRICE_CHANGED_RE);
          if (!nodes.length) return;
          const pc = function() {
            const items = cartItems(selectedCart());
            const B = window.__mmBounds;
            if (1 !== items.length || !B || !B.bounds || "function" != typeof B.bounds.values) return null;
            const it = items[0];
            const bounds = it.air && it.air.bounds || [];
            const last = bounds[bounds.length - 1];
            if (!last || !(last.flights || []).length) return null;
            const fx = f => f.flight || {};
            const sig = last.flights.map(f => (fx(f).marketingAirlineCode || "") + (fx(f).marketingFlightNumber || "")).join(",");
            const date = String((fx(last.flights[0]).departure || {}).dateTime || "").slice(0, 10);
            let fare = null;
            for (const b of B.bounds.values()) if (b && b.depDate === date && (b.legs || []).map(l => (l.mkt || "") + (l.mktNo || "")).join(",") === sig) {
              fare = (b.fares || []).find(f => f.code === last.fareFamilyCode) || null;
              if (fare) break;
            }
            if (!fare) return null;
            const p = it.prices || {};
            const total = (p.totalPrices || [])[0] || {};
            const miles = p.milesConversion && p.milesConversion.convertedMiles ? p.milesConversion.convertedMiles.total : null;
            const cash = null != total.total ? total.total / Math.pow(10, total.currency && null != total.currency.decimalPlaces ? total.currency.decimalPlaces : 2) : null;
            const lines = [];
            null != miles && null != fare.totalMiles && miles !== fare.totalMiles && lines.push([ T("Meilen"), fmtNum(fare.totalMiles), fmtNum(miles) ]);
            null != cash && null != fare.totalCash && (Math.abs(cash - fare.totalCash) > .005 || fare.currency && total.currencyCode !== fare.currency) && lines.push([ T("Zuzahlung"), fmtNum(fare.totalCash) + " " + (fare.currency || ""), fmtNum(cash) + " " + (total.currencyCode || "") ]);
            return {
              same: !lines.length,
              single: 1 === bounds.length,
              lines: lines
            };
          }();
          if (pc && (pc.same || pc.single)) {
            injectStyles();
            nodes.forEach(n => {
              if (pc.same) {
                n.dataset.mmrecDone = "same";
                const li = n.closest(".message");
                const panel = n.closest("refx-messages-panel-pres") || n.closest(".messages-panel");
                (panel && 1 === panel.querySelectorAll(".messages-list .message").length ? panel : li || n).classList.add("mmrec-hidden");
                return;
              }
              const grid = document.createElement("div");
              grid.className = "mmrec-price";
              grid.appendChild(cell("mmrec-own-head", T("Preis geändert")));
              pc.lines.forEach(([label, before, now]) => {
                grid.appendChild(cell("mmrec-price-label", label));
                grid.appendChild(cell("mmrec-price-before", before));
                grid.appendChild(cell("mmrec-price-now", now));
              });
              ownLine(n, grid);
            });
          }
        }(leaves);
      }
      const tc = transportCause();
      document.querySelectorAll("lhg-upsell-link-out .title-label, .no-flight-found .title-label").forEach(n => {
        if (n.childElementCount) return;
        const box = n.closest(".upsell-link-out") || n.closest("lhg-upsell-link-out");
        const msg = box && box.querySelector(".message");
        if (tc) {
          if (n.textContent === tc.title) return;
          if (!NO_FLIGHT_BANNER_RE.test(n.textContent || "")) return;
          n.dataset.mmrecOrig = n.textContent;
          n.textContent = tc.title;
          if (msg && !msg.childElementCount) {
            msg.dataset.mmrecOrig = msg.textContent;
            msg.textContent = tc.why || "";
          }
          injectStyles();
          box && box.classList.add("mmrec-noanswer");
        } else if (n.dataset.mmrecOrig) {
          n.textContent = n.dataset.mmrecOrig;
          delete n.dataset.mmrecOrig;
          if (msg && null != msg.dataset.mmrecOrig) {
            msg.textContent = msg.dataset.mmrecOrig;
            delete msg.dataset.mmrecOrig;
          }
          box && box.classList.remove("mmrec-noanswer");
        }
      });
      const panels = document.querySelectorAll("refx-messages-panel-cont");
      if (!panels.length) return;
      let cause = null;
      panels.forEach(panel => {
        if (!GENERIC_BANNER_RE.test(panel.textContent || "")) return;
        null === cause && (cause = function() {
          try {
            const be = window.__mmBounds && window.__mmBounds.lastError;
            if (be && be.code) {
              const t = bannerText(be.code, be.detail);
              if (t) return t;
            }
          } catch (e) {}
          const tc = transportCause();
          if (tc) return tc.title + (tc.why ? " " + tc.why : "");
          try {
            const m = JSON.parse(sessionStorage.getItem("messages"));
            const ids = m && m.ids || [];
            const e = m && m.entities && m.entities[ids[ids.length - 1]];
            if (e) {
              const t = bannerText(e.code, e.detail);
              if (t) return t;
            }
          } catch (e) {}
          return null;
        }() || !1);
        if (!cause) return;
        const walker = document.createTreeWalker(panel, NodeFilter.SHOW_ELEMENT);
        for (let n = walker.currentNode; n; n = walker.nextNode()) n.childElementCount || GENERIC_BANNER_RE.test(n.textContent || "") && (n.textContent = cause);
      });
    }
    state.rewriteBanners = rewriteBanners;
    function injectStyles() {
      const css = `
lhg-loading-screen { display: none !important; }
@keyframes mmrec-spin { to { transform: rotate(360deg); } }

.mmrec-wait {
    position: fixed; inset: 0; z-index: 2147483647;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 16px; background: #fff;
    font-family: inherit;
}
.mmrec-wait-ring {
    width: 52px; height: 52px; border-radius: 50%;
    border: 3px solid ${INK_hairline}; border-top-color: ${INK_primary};
    animation: mmrec-spin .9s linear infinite;
}
.mmrec-wait-label { font-size: 15px; color: ${INK_primary}; font-weight: 600; letter-spacing: .01em; }
.mmrec-wait-sub { font-size: 12.5px; color: ${INK_muted}; margin-top: -8px; }
@media (prefers-reduced-motion: reduce) { .mmrec-wait-ring { animation-duration: 2.4s; } }

.generic-error-panel-image-container { display: none !important; }

.mmrec {
    max-width: 560px; margin: 4px auto 22px; text-align: center;
    border: 1px solid ${INK_hairline}; border-left: 4px solid ${INK_primary};
    border-radius: 8px; background: #fff; padding: 18px 20px 20px;
}

html.mmrec-page .app-layout-container { min-height: 100vh; flex-direction: column; }
html.mmrec-page .main-content { flex: 1 1 auto; display: flex; flex-direction: column; }
html.mmrec-page .main-content > refx-recovery,
html.mmrec-page refx-recovery > refx-basic-in-flow-layout {
    display: flex; flex-direction: column; flex: 1 1 auto; }
html.mmrec-page .basic-in-flow-layout-container {
    flex: 1 1 auto; flex-direction: column; justify-content: center; }
.mmrec-h { font-size: 19px; font-weight: 700; color: ${INK_primary};
           margin: 0 0 8px; letter-spacing: .01em; line-height: 1.25; }
.mmrec-p { font-size: 14px; line-height: 1.55; color: ${INK_secondary}; margin: 0 0 6px; }
.mmrec-p b { color: ${INK_primary}; font-weight: 600; }
.mmrec-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; justify-content: center; }
.mmrec-btn {
    display: inline-flex; align-items: center; gap: 7px;
    background: ${INK_primary}; color: #fff; text-decoration: none;
    border: 1px solid ${INK_primary}; border-radius: 6px;
    padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer;
}
.mmrec-btn:hover { background: #0a2470; border-color: #0a2470; color: #fff; }
.mmrec-btn::before { content: '→'; font-weight: 400; }
.mmrec-btn[disabled] { opacity: .6; cursor: default; pointer-events: none; }
html.mmrec-own-back refx-recovery .action-button-container { display: none !important; }

.mmrec-waiting { color: ${INK_secondary}; font-style: italic; }
.mmrec-ghost { background: #fff !important; color: ${INK_primary} !important;
               border: 1px solid ${INK_hairline}; font: inherit; font-size: 14px;
               font-weight: 600; cursor: pointer; }
.mmrec-ghost:hover { border-color: #b9c6e0; background: #f3f6fc !important; }
.mmrec-ghost::before { content: '' !important; }
.mmrec-ways { margin-top: 18px; padding-top: 14px; border-top: 1px solid ${INK_hairline}; }
.mmrec-wayshead { margin: 0 0 6px; font-size: 12.5px; font-weight: 600; color: ${INK_secondary}; }
.mmrec-waylist { margin: 0; padding: 0; list-style: none; display: flex;
                 flex-wrap: wrap; gap: 6px 18px; justify-content: center; }
.mmrec-waylist a { font-size: 12.5px; color: ${INK_accent}; text-decoration: none;
                   border-bottom: 1px solid transparent; }
.mmrec-waylist a:hover { border-bottom-color: ${INK_accent}; }
.mmrec-note { margin-top: 14px; padding-top: 12px; border-top: 1px solid ${INK_hairline};
              font-size: 12.5px; line-height: 1.5; color: ${INK_muted}; }
.mmrec-note code { font-size: 12px; background: #f4f4f1; padding: 1px 5px; border-radius: 3px; }
.mmrec-hidden { display: none !important; }

.upsell-link-out.no-availability.mmrec-noanswer .content::before { content: none !important; }
.upsell-link-out.no-availability.mmrec-noanswer .message { display: block !important; color: ${INK_secondary}; }
.upsell-link-out.no-availability.mmrec-noanswer .footer { display: none !important; }

.messages-panel.mmrec-own.mmrec-own-only .title { display: none; }
.mmrec-own-head { grid-column: 1 / -1; display: flex; align-items: center; gap: 6px; margin-bottom: 3px;
                  font-family: lufthansa-bold, sans-serif; line-height: 24px; color: #333; }
.mmrec-cabins, .mmrec-price { display: grid; grid-template-columns: auto auto 1fr; column-gap: 18px; row-gap: 2px;
                align-items: baseline; font-size: 14px; line-height: 20px; color: ${INK_secondary}; }
.mmrec-cabins-head::before { content: '⇅'; font-size: 15px; }
.mmrec-price-before { text-decoration: line-through; color: ${INK_muted}; }
.mmrec-price-now { font-family: lufthansa-bold, sans-serif; color: ${WARN}; }
.mmrec-price-now::before { content: '→ '; color: ${INK_secondary}; font-family: lufthansa-regular, sans-serif; }
.mmrec-cabins-bound { grid-column: 1 / -1; margin-top: 4px; font-size: 11px; font-weight: 700;
                      letter-spacing: .05em; text-transform: uppercase; color: ${INK_muted}; }
.mmrec-cabins-no { font-family: lufthansa-bold, sans-serif; color: ${INK_primary}; }
.mmrec-cabins-cabin { font-weight: 600; }
.mmrec-cabins-lower { color: ${WARN}; }
.mmrec-cabins-lower.mmrec-cabins-cabin { font-family: lufthansa-bold, sans-serif; }
.mmrec-cabins-lower.mmrec-cabins-cabin::after { content: ' ↓'; }
`;
      let el = document.getElementById("mmrec-styles");
      if (!el) {
        el = document.createElement("style");
        el.id = "mmrec-styles";
        document.head.appendChild(el);
      }
      el.textContent !== css && (el.textContent = css);
    }
    function patchRecovery(again) {
      const panel = document.querySelector("refx-generic-error-panel-pres, refx-generic-error-panel-cont");
      if (!panel) return !1;
      const had = panel.querySelector(".mmrec");
      if (had && !again) return !1;
      had && had.remove();
      const title = panel.querySelector(".generic-error-panel-title");
      const sub = panel.querySelector(".generic-error-panel-subtitle");
      if (!title) return !1;
      const original = (title.textContent || "").trim();
      title.classList.add("mmrec-hidden");
      sub && sub.classList.add("mmrec-hidden");
      const d = diagnose();
      state.hasCause = !!d;
      const head = d ? d.head : T("Die Suche ist unerwartet abgebrochen.");
      const why = d ? d.why : T("Auf vielfachen Kundenwunsch haben wir daher Ihre Session beendet.");
      const hint = d ? d.hint : T("Manchmal hilft hier schlicht ein neuer Versuch oder ein neuer Login. Who knows.");
      const showLogin = !d || d.login;
      const stubborn = showLogin && function() {
        try {
          const t = Number(sessionStorage.getItem(RETRY_STAMP) || 0);
          return t > 0 && Date.now() - t < 3 * 60 * 1e3;
        } catch (e) {
          return !1;
        }
      }();
      const box = document.createElement("div");
      box.className = "mmrec";
      box.innerHTML = boxHtml(d, original, {
        head: head,
        why: why,
        hint: hint,
        showLogin: showLogin,
        stubborn: stubborn
      });
      return function(box, d, anchor) {
        const loginLink = box.querySelector(".mmrec-login");
        loginLink && loginLink.addEventListener("click", e => {
          try {
            !function() {
              const search = currentSearch() || lastSearch();
              if (!search) return;
              const payload = encodeURIComponent(JSON.stringify({
                ts: Date.now(),
                search: search
              }));
              document.cookie = RESUME_COOKIE + "=" + payload + "; Max-Age=1800; path=/; domain=.miles-and-more.com; SameSite=Lax; Secure";
            }();
          } catch (err) {}
          try {
            (function(link) {
              const win = window.open(link.href, "mmLogin", "width=560,height=760,menubar=no,toolbar=no,location=yes");
              if (!win) return !1;
              loginOpened = !0;
              loginOpenedAt = Date.now();
              loginPoll && clearInterval(loginPoll);
              loginPoll = every(() => {
                let gone = !1;
                try {
                  gone = win.closed;
                } catch (e) {
                  gone = !1;
                }
                if (gone) {
                  clearInterval(loginPoll);
                  loginPoll = null;
                  try {
                    onLoginClosed && onLoginClosed();
                  } catch (e) {}
                }
              }, 500);
              const wait = link.closest(".mmrec") && link.closest(".mmrec").querySelector(".mmrec-waiting");
              wait && (wait.hidden = !1);
              return !0;
            })(loginLink) && e.preventDefault();
          } catch (err) {}
        });
        document.documentElement.classList.add("mmrec-own-back");
        box.querySelectorAll(".mmrec-retry").forEach(b => b.addEventListener("click", () => {
          try {
            retrySearch();
          } catch (e) {}
        }));
        const signout = box.querySelector(".mmrec-signout");
        signout && signout.addEventListener("click", () => {
          const manualLink = () => {
            signout.disabled = !0;
            signout.textContent = T("Abmelden hier nicht möglich");
            if (box.querySelector(".mmrec-signout-manual")) return;
            const a = document.createElement("a");
            a.className = "mmrec-btn mmrec-ghost mmrec-signout-manual";
            a.href = portalBase() + ".html";
            a.target = "_blank";
            a.rel = "noopener";
            a.textContent = T("Zum Abmelden auf miles-and-more.com");
            signout.after(a);
          };
          let w = null;
          try {
            w = window.open("about:blank", "mmrec-signout", "width=560,height=680");
          } catch (e) {}
          if (w) {
            signout.disabled = !0;
            signout.textContent = T("Abmeldung läuft …");
            fetch("https://api.miles-and-more.com/oauth2/logout" + "?redirect_uri=" + encodeURIComponent(portalBase() + ".html"), {
              method: "POST",
              credentials: "include"
            }).then(r => r.json()).then(data => {
              const target = data && data.target;
              if (!(u => {
                let x;
                try {
                  x = new URL(u);
                } catch (e) {
                  return !1;
                }
                return "https:" === x.protocol && LOGOUT_HOSTS.indexOf(x.hostname) >= 0;
              })(target)) throw new Error("no target");
              w.location.href = target;
              signout.textContent = T("Abgemeldet. Melden Sie sich jetzt neu an.");
            }).catch(() => {
              try {
                w.close();
              } catch (e) {}
              manualLink();
            });
          } else manualLink();
        });
        let returned = !1;
        const onReturn = () => {
          if (!returned && loginOpened && !document.hidden) {
            returned = !0;
            try {
              retrySearch();
            } catch (e) {}
          }
        };
        state._offResume?.();
        const listeners = new AbortController;
        onLoginClosed = onReturn;
        document.addEventListener("visibilitychange", onReturn, {
          signal: listeners.signal
        });
        window.addEventListener("focus", () => {
          Date.now() - loginOpenedAt > 5e3 && onReturn();
        }, {
          signal: listeners.signal
        });
        state._offResume = () => {
          listeners.abort();
          onLoginClosed === onReturn && (onLoginClosed = null);
          if (loginPoll) {
            clearInterval(loginPoll);
            loginPoll = null;
          }
          state._offResume = null;
        };
        anchor.parentElement.insertBefore(box, anchor.nextSibling);
        state.patched++;
        return !0;
      }(box, 0, sub || title);
    }
    function boxHtml(d, original, t) {
      const {head: head, why: why, hint: hint, showLogin: showLogin, stubborn: stubborn} = t;
      const handover = !(!d || !d.handover);
      return `
<p class="mmrec-h">${head}</p>
<p class="mmrec-p">${why}</p>
${hint ? `<p class="mmrec-p">${hint}</p>` : ""}
${stubborn ? `<p class="mmrec-p"><b>${T("Die Anmeldung hat nicht gegriffen:")}</b> ${T("Miles &amp; More\n" + "meldet Sie zwar als angemeldet, akzeptiert die Sitzung aber nicht mehr. In diesem Fall\n" + "hilft nur, sich richtig abzumelden und danach neu anzumelden. Der Knopf unten\n" + "erledigt das Abmelden direkt.")}</p>` : ""}
<div class="mmrec-actions">
  ${handover ? `<button type="button" class="mmrec-btn mmrec-retry">${T("Suche wiederholen")}</button>` : ""}
  ${showLogin ? `<a class="mmrec-btn mmrec-login" href="${loginUrl()}">${T("Bei Miles &amp; More anmelden")}</a>` : ""}
  ${showLogin && stubborn ? `<button type="button" class="mmrec-btn mmrec-ghost mmrec-signout">${T("Bei Miles &amp; More abmelden")}</button>` : ""}
  ${handover ? "" : `<button type="button" class="mmrec-btn mmrec-ghost mmrec-retry">${T("Zurück zur Suche")}</button>`}
</div>
${showLogin ? `<p class="mmrec-p mmrec-waiting" hidden>${T("Die Anmeldung läuft in einem eigenen Fenster. Sobald\n" + "Sie hierher zurückkehren, wird die Suche wiederholt. Über den Knopf lässt sie sich auch\n" + "jederzeit von Hand starten.")}</p>` : ""}
<div class="mmrec-ways">
  <p class="mmrec-wayshead">${T("Falls nichts davon hilft:")}</p>
  <ul class="mmrec-waylist">${[ {
        href: portalBase() + ".html",
        label: T("Startseite von Miles &amp; More")
      }, {
        href: flightSearch(),
        label: T("Flugsuche auf miles-and-more.com")
      }, {
        href: loginUrl(),
        label: T("Zur Anmeldung")
      }, {
        href: portalBase() + "/member.html",
        label: T("Mitgliederkonto")
      } ].map(w => `<li><a href="${w.href}">${w.label}</a></li>`).join("")}</ul>
</div>
<p class="mmrec-note">${d ? function(d) {
        const p = {
          name: esc(shown(d.name)),
          status: d.status || T("keine Antwort"),
          secs: d.secs
        };
        return T(d.secs ? "Erfasst: <code>{name} → HTTP {status}, {secs} s</code><br>" : "Erfasst: <code>{name} → HTTP {status}</code><br>", p);
      }(d) : ""}${T("Originalmeldung der Seite: <code>{text}</code>", {
        text: esc(original)
      })}</p>`;
    }
    const WATCHED = [ [ /travelers-profile/i, "Profil wird geladen …", "Vielfliegerprofil", "des Vielfliegerprofils", 2 ], [ /air-bounds/i, "Prämienflüge werden gesucht …", "Prämienflugsuche", "der Prämienflugsuche", 2 ], [ /air-calendars/i, "Kalenderpreise werden geladen …", "Kalenderpreise", "der Kalenderpreise", 2 ], [ /\/user\/me\/loginstatus/i, "Anmeldung wird geprüft …", "Anmeldestatus", "des Anmeldestatus", 1 ], [ new RegExp("oauth|/token"), "Authentifizierung läuft …", "Authentifizierung", "der Authentifizierung", 1 ] ];
    const WATCHED_BY_LABEL = new Map(WATCHED.map(w => [ w[1], w ]));
    const ENTRY_LABEL = "Prämienflugsuche wird geöffnet …";
    const shown = s => ({
      "Profil wird geladen …": T("Profil wird geladen …"),
      Vielfliegerprofil: T("Vielfliegerprofil"),
      "des Vielfliegerprofils": T("des Vielfliegerprofils"),
      "Prämienflüge werden gesucht …": T("Prämienflüge werden gesucht …"),
      "Prämienflugsuche": T("Prämienflugsuche"),
      "der Prämienflugsuche": T("der Prämienflugsuche"),
      "Kalenderpreise werden geladen …": T("Kalenderpreise werden geladen …"),
      Kalenderpreise: T("Kalenderpreise"),
      "der Kalenderpreise": T("der Kalenderpreise"),
      "Anmeldung wird geprüft …": T("Anmeldung wird geprüft …"),
      Anmeldestatus: T("Anmeldestatus"),
      "des Anmeldestatus": T("des Anmeldestatus"),
      "Authentifizierung läuft …": T("Authentifizierung läuft …"),
      Authentifizierung: T("Authentifizierung"),
      "der Authentifizierung": T("der Authentifizierung"),
      Anfrage: T("Anfrage"),
      "der Anfrage": T("der Anfrage"),
      [ENTRY_LABEL]: T("Prämienflugsuche wird geöffnet …")
    }[s] || s);
    const CONTENT_SEL = "refx-flight-card-pres, .mmcal, refx-search-recap-cont, refx-generic-error-panel-pres";
    const inFlight = new Map;
    const secsSince = t => Math.round((Date.now() - t) / 1e3);
    function waitOverlay() {
      if (state.superseded) {
        document.querySelectorAll(".mmrec-wait").forEach(e => e.remove());
        return;
      }
      const dead = RECOVERY_RE.test(location.pathname);
      const visible = document.querySelector(CONTENT_SEL);
      if (dead || visible || !inFlight.size || !waitingOn()) {
        document.querySelectorAll(".mmrec-wait").forEach(e => e.remove());
        return;
      }
      const existing = document.querySelectorAll(".mmrec-wait");
      for (let i = 1; i < existing.length; i++) existing[i].remove();
      const keys = [ ...inFlight.keys() ];
      const label = shown(keys.find(k => WATCHED_BY_LABEL.has(k)) || keys[0]);
      const waited = secsSince(Math.min(...[ ...inFlight.values() ].map(v => v.since)));
      let sub = "";
      if (waited > 12) {
        const list = [ ...inFlight.entries() ].filter(([label]) => WATCHED_BY_LABEL.has(label)).map(([label, v]) => T("{name} ({secs} s)", {
          name: shown(WATCHED_BY_LABEL.get(label)[2]),
          secs: secsSince(v.since)
        })).join(", ");
        sub = list ? T("Dauert länger als üblich. Es wartet noch: {list}", {
          list: list
        }) : Tn(waited, "Dauert länger als üblich (seit {n} Sekunde).", "Dauert länger als üblich (seit {n} Sekunden).");
      }
      let el = existing[0] || null;
      if (!el) {
        el = document.createElement("div");
        el.className = "mmrec-wait";
        el.innerHTML = '<span class="mmrec-wait-ring"></span>' + '<span class="mmrec-wait-label"></span><span class="mmrec-wait-sub"></span>';
        (document.body || document.documentElement).appendChild(el);
        startTicker();
      }
      const l = el.querySelector && el.querySelector(".mmrec-wait-label");
      const s = el.querySelector && el.querySelector(".mmrec-wait-sub");
      l && l.textContent !== label && (l.textContent = label);
      s && s.textContent !== (sub || "") && (s.textContent = sub || "");
    }
    const FAIL_KEY = "mm_last_fail";
    function recordOutcome(key, status, ms, apiError) {
      if (void 0 !== status && status >= 200 && status < 400 && !apiError) return;
      if (void 0 === status && !apiError) return;
      const watched = WATCHED_BY_LABEL.get(key);
      const rank = watched ? watched[4] : 1;
      try {
        let prev = null;
        try {
          prev = JSON.parse(sessionStorage.getItem(FAIL_KEY) || "null");
        } catch (e) {}
        if (prev && prev.t && Date.now() - prev.t <= 18e4 && (prev.rank || 2) > rank) return;
        sessionStorage.setItem(FAIL_KEY, JSON.stringify({
          name: watched?.[2] || "Anfrage",
          of: watched?.[3] || "der Anfrage",
          status: status,
          ms: ms,
          t: Date.now(),
          rank: rank,
          apiCode: apiError ? apiError.code : null,
          apiDetail: apiError ? apiError.detail : null,
          apiWarning: !!apiError && !!apiError.warning
        }));
        !function() {
          if (!state.superseded && RECOVERY_RE.test(location.pathname) && !state.hasCause) try {
            patchRecovery(!0);
          } catch (e) {}
        }();
      } catch (e) {}
    }
    const MAX_SNIFF = 4096;
    const CAUSE_WARNINGS = {
      40834: "ALL FLIGHTS UNAVAILABLE"
    };
    function apiErrorOf(text) {
      try {
        const j = JSON.parse(text);
        const e = (j && j.errors || [])[0];
        if (e) return {
          code: String(e.code || ""),
          detail: e.detail || e.title || ""
        };
        const w = (j && j.warnings || []).find(x => CAUSE_WARNINGS[String(x && x.code)]);
        return w ? {
          code: String(w.code),
          detail: w.detail || w.title || "",
          warning: !0
        } : null;
      } catch (e) {
        return null;
      }
    }
    const SEARCH_RE = /air-bounds|air-calendars/i;
    const timeOfDay = ms => {
      return (o = {
        hour: "2-digit",
        minute: "2-digit"
      }, window.__mmI18n ? window.__mmI18n.dtf(o) : new Intl.DateTimeFormat("de-DE", o)).format(ms);
      var o;
    };
    const gagSession = () => T("Auf vielfachen Kundenwunsch haben wir die Session an dieser Stelle für Sie beendet.");
    function diagnose() {
      let f = null;
      try {
        f = JSON.parse(sessionStorage.getItem(FAIL_KEY) || "null");
      } catch (e) {}
      if (!f || !f.t || Date.now() - f.t > 18e4) {
        const t = function() {
          try {
            const o = JSON.parse(sessionStorage.getItem("gateway-auth-tokens") || "null");
            if (!o) return null;
            for (const k of Object.keys(o)) {
              const e = o[k];
              if (!e) continue;
              let ms = null;
              e.expiresAt && (ms = "number" == typeof e.expiresAt ? e.expiresAt : Date.parse(e.expiresAt));
              if (!ms && "string" == typeof e.token && 3 === e.token.split(".").length) {
                const p = JSON.parse(atob(e.token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
                p && p.exp && (ms = 1e3 * p.exp);
              }
              if (ms) return {
                at: ms,
                expired: ms < Date.now()
              };
            }
          } catch (e) {}
          return null;
        }();
        return t && t.expired ? {
          name: null,
          status: 0,
          secs: 0,
          login: !0,
          head: T("Das Zugangstoken dieses Tabs ist um {time} Uhr abgelaufen.", {
            time: timeOfDay(t.at)
          }),
          why: gagSession(),
          hint: T("Neu anmelden, dann geht die Suche hier weiter.")
        } : null;
      }
      const s = 0 | f.status;
      const secs = Math.round((f.ms || 0) / 1e3);
      const d = {
        name: f.name,
        status: s,
        secs: secs,
        login: !0
      };
      const ofPlain = esc(shown(f.of || "der Anfrage"));
      const isAuth = "Authentifizierung" === f.name;
      const code = String(f.apiCode || "");
      if (code) {
        const origin = function() {
          const s = currentSearch();
          const code = s && s.itineraries && s.itineraries[0] && s.itineraries[0].originLocationCode;
          if (!code) return null;
          let name = null;
          try {
            name = window.__mmIata && window.__mmIata.airportName && window.__mmIata.airportName(code);
          } catch (e) {}
          return name ? `${name} (${code})` : code;
        }();
        const originText = origin ? esc(origin) : null;
        d.login = !1;
        if ("40834" === code) {
          d.head = originText ? T("Ab {origin} gibt es an diesem Datum keine Prämienflüge.", {
            origin: originText
          }) : T("Für diese Strecke gibt es an diesem Datum keine Prämienflüge.");
          d.why = T("Auf vielfachen Kundenwunsch haben wir Ihnen ein leeres Ergebnis als " + "technischen Fehler verkauft.");
          d.hint = T("Die Anmeldung ist in Ordnung. Anderes Datum oder anderen Abflugort versuchen. " + "Manche Bahnhofs- und Off-Line-Codes verkaufen gar keine Prämienflüge.");
          return d;
        }
        if ("2381" === code) {
          d.head = originText ? T("{origin} kennt die Prämienflugsuche nicht.", {
            origin: originText
          }) : T("Diesen Abflugort kennt die Prämienflugsuche nicht.");
          d.why = T("Auf vielfachen Kundenwunsch bieten wir Orte an, an denen wir nicht fliegen.");
          d.hint = T("Die Anmeldung ist in Ordnung. Nächstgelegenen Flughafen oder Bahnhof wählen.");
          return d;
        }
        const txt = bannerText(code, f.apiDetail);
        if (txt) {
          d.head = esc(txt);
          d.why = T("Auf vielfachen Kundenwunsch haben wir die Suche an dieser Stelle beendet.");
          d.hint = T("Die Anmeldung ist in Ordnung. Ein erneuter Versuch oder ein anderes Datum hilft meist.");
          return d;
        }
        d.login = !0;
      }
      if (401 === s || 403 === s || 419 === s || 440 === s) if (function() {
        try {
          const a = window.__mmAuth;
          return !!(a && a.seenCodes > 0);
        } catch (e) {
          return !1;
        }
      }()) {
        d.head = T("Sie sind angemeldet. Die Buchungsstrecke hat die Anmeldung nicht übernommen.");
        d.why = T("Auf vielfachen Kundenwunsch haben wir Ihre Anmeldung ignoriert und " + "den Abruf <b>{of}</b> ohne Kundenkonto geschickt (HTTP {status}).", {
          of: ofPlain,
          status: s
        });
        d.hint = T("Eine neue Anmeldung ändert daran nichts. Ein erneuter Versuch " + "zieht die Anmeldung nach.");
        d.login = !1;
        d.handover = !0;
      } else {
        d.head = isAuth ? T("Der Auth-Token ist nicht mehr gültig (HTTP {status}).", {
          status: s
        }) : T("Die Sitzung war beim Abruf {of} nicht mehr gültig (HTTP {status}).", {
          of: ofPlain,
          status: s
        });
        d.why = gagSession();
        d.hint = T("Eine neue Anmeldung sollte das lösen.");
      } else if (429 === s) {
        d.head = T("Miles & More hat den Abruf {of} vorübergehend gedrosselt (HTTP 429).", {
          of: ofPlain
        });
        d.why = T("Auf vielfachen Kundenwunsch bearbeiten wir Anfragen jetzt in einem entspannteren Tempo.");
        d.hint = T("Ein paar Minuten abwarten, dann nochmal versuchen.");
        d.login = !1;
      } else if (504 === s || 408 === s) {
        d.head = Tn(secs, "Der Abruf {of} hat nach {n} Sekunde nicht geantwortet (HTTP {status}).", "Der Abruf {of} hat nach {n} Sekunden nicht geantwortet (HTTP {status}).", {
          of: ofPlain,
          status: s
        });
        d.why = T("Auf vielfachen Kundenwunsch lässt sich unser Server heute etwas mehr Zeit.");
        d.hint = T("Das liegt wahrscheinlich an Miles & More, nicht an der Anmeldung. Später erneut versuchen.");
        d.login = !1;
      } else if (s >= 500) {
        d.head = T("Der Abruf {of} ist mit HTTP {status} fehlgeschlagen.", {
          of: ofPlain,
          status: s
        });
        d.why = T("Auf vielfachen Kundenwunsch legt der Server eine kurze Pause ein.");
        d.hint = T("Ein Fehler auf Seiten von Miles & More. Später erneut versuchen.");
        d.login = !1;
      } else if (0 === s) {
        d.head = Tn(secs, "Der Abruf {of} kam nach {n} Sekunde nicht durch.", "Der Abruf {of} kam nach {n} Sekunden nicht durch.", {
          of: ofPlain
        });
        d.why = T("Auf vielfachen Kundenwunsch wurde die Verbindung vorzeitig beendet.");
        d.login = !1;
      } else {
        if (!(s >= 400)) return null;
        d.head = T("Der Abruf {of} wurde mit HTTP {status} abgelehnt.", {
          of: ofPlain,
          status: s
        });
        d.why = T("Auf vielfachen Kundenwunsch haben wir diese Anfrage nicht bearbeitet.");
        d.hint = T("Meist eine abgelaufene Anmeldung.");
      }
      return d;
    }
    window.__mmRecTrack = {
      start: function(url) {
        const hit = WATCHED.find(([re]) => re.test(url));
        if (!hit) return null;
        const key = hit[1];
        const cur = inFlight.get(key);
        inFlight.set(key, {
          n: (cur ? cur.n : 0) + 1,
          since: cur ? cur.since : Date.now()
        });
        waitOverlay();
        return key;
      },
      end: function(key, status, apiError) {
        if (!key) return;
        const cur = inFlight.get(key);
        if (cur) {
          recordOutcome(key, status, Date.now() - cur.since, apiError);
          cur.n > 1 ? inFlight.set(key, {
            n: cur.n - 1,
            since: cur.since
          }) : inFlight.delete(key);
        }
        waitOverlay();
      },
      note: function(url, payload) {
        try {
          const hit = WATCHED.find(([re]) => re.test(String(url || "")));
          if (!hit || !payload) return;
          const err = payload.code ? {
            code: String(payload.code),
            detail: payload.detail || "",
            warning: !!payload.warning
          } : null;
          if (!err) return;
          recordOutcome(hit[1], 200, payload.ms || 0, err);
        } catch (e) {}
      }
    };
    if (!window.__mmRecHooked) {
      window.__mmRecHooked = !0;
      const of = window.fetch;
      window.fetch = function(...args) {
        let key = null, url = "";
        try {
          url = "string" == typeof args[0] ? args[0] : args[0] && args[0].url || "";
          key = window.__mmRecTrack.start(url);
        } catch (e) {
          key = null;
        }
        const out = of.apply(this, args);
        if (!key) return out;
        try {
          return Promise.resolve(out).then(resp => {
            try {
              const len = Number(resp.headers && resp.headers.get("content-length") || 0);
              if (resp.ok && len > 0 && len <= MAX_SNIFF && !SEARCH_RE.test(url)) {
                resp.clone().text().then(t => {
                  try {
                    window.__mmRecTrack.end(key, resp.status, apiErrorOf(t));
                  } catch (e) {}
                }).catch(() => {
                  try {
                    window.__mmRecTrack.end(key, resp.status);
                  } catch (e) {}
                });
                return resp;
              }
              window.__mmRecTrack.end(key, resp && resp.status);
            } catch (e) {}
            return resp;
          }, err => {
            try {
              window.__mmRecTrack.end(key, 0);
            } catch (e) {}
            throw err;
          });
        } catch (e) {
          try {
            window.__mmRecTrack.end(key);
          } catch (e2) {}
          return out;
        }
      };
      const xo = XMLHttpRequest.prototype.open;
      const xs = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function(m, url, ...rest) {
        this.__mmRecUrl = String(url);
        return xo.call(this, m, url, ...rest);
      };
      XMLHttpRequest.prototype.send = function(...rest) {
        try {
          const key = window.__mmRecTrack.start(this.__mmRecUrl || "");
          key && this.addEventListener("loadend", () => {
            try {
              let apiErr = null;
              const t = this.responseType;
              this.status >= 200 && this.status < 400 && (!t || "text" === t) && "string" == typeof this.responseText && this.responseText.length <= MAX_SNIFF && (apiErr = apiErrorOf(this.responseText));
              window.__mmRecTrack.end(key, this.status, apiErr);
            } catch (e) {}
          }, {
            once: !0
          });
        } catch (e) {}
        return xs.apply(this, rest);
      };
    }
    let entrySince = 0;
    function coverEntry() {
      if (AVAIL_RE.test(location.pathname) && !RECOVERY_RE.test(location.pathname)) if (document.querySelector(CONTENT_SEL)) {
        entrySince = 0;
        inFlight.delete(ENTRY_LABEL);
        waitOverlay();
      } else {
        entrySince || (entrySince = Date.now());
        inFlight.has(ENTRY_LABEL) || inFlight.set(ENTRY_LABEL, {
          n: 1,
          since: entrySince
        });
        waitOverlay();
      } else entrySince = 0;
    }
    function startTicker() {
      if (ticker) return;
      let ticks = 0;
      ticker = every(() => {
        if (state.superseded || !waitingOn() || ++ticks > 600) {
          clearInterval(ticker);
          ticker = null;
          document.querySelectorAll(".mmrec-wait").forEach(e => e.remove());
        } else {
          try {
            coverEntry();
            waitOverlay();
          } catch (e) {}
          if (!document.querySelector(".mmrec-wait")) {
            clearInterval(ticker);
            ticker = null;
          }
        }
      }, 1e3);
    }
    function run() {
      if (!state.superseded && waitingOn()) {
        injectStyles();
        RECOVERY_RE.test(location.pathname) ? document.documentElement.classList.add("mmrec-page") : document.documentElement.classList.remove("mmrec-page");
        coverEntry();
        waitOverlay();
        document.querySelector(".mmrec-wait") && startTicker();
        RECOVERY_RE.test(location.pathname) && patchRecovery();
      }
    }
    state.backToSearch = backToSearch;
    state._boxHtml = boxHtml;
    state._diagnose = diagnose;
    state._injectStyles = injectStyles;
    state.restore = restore;
    function restore() {
      document.querySelectorAll(".mmrec").forEach(e => e.remove());
      document.querySelectorAll(".mmrec-hidden").forEach(e => e.classList.remove("mmrec-hidden"));
      document.querySelectorAll(".mmrec-wait").forEach(e => e.remove());
      document.documentElement.classList.remove("mmrec-own-back");
      document.documentElement.classList.remove("mmrec-page");
      try {
        state._offResume && state._offResume();
      } catch (e) {}
      const st = document.getElementById("mmrec-styles");
      st && (st.textContent = "");
    }
    const OWN_UI = ".mm-results, .mmrec, .mmrec-wait, .mmcal";
    function boot() {
      run();
      rememberSearch();
      !state._offBounds && window.__mmBounds && window.__mmBounds.onUpdate && (state._offBounds = window.__mmBounds.onUpdate(() => {
        rememberSearch();
        if (waitingOn()) try {
          rewriteBanners();
        } catch (e) {}
      }));
      if (waitingOn()) try {
        rewriteBanners();
      } catch (e) {}
      let queued = !1;
      const pass = () => {
        queued = !1;
        if (!state.superseded && waitingOn()) try {
          try {
            rewriteBanners();
          } catch (e) {}
          if (inFlight.size) try {
            coverEntry();
            waitOverlay();
          } catch (e) {}
          const root = document.documentElement.classList;
          if (!RECOVERY_RE.test(location.pathname)) {
            root.contains("mmrec-page") && root.remove("mmrec-page");
            return;
          }
          root.contains("mmrec-page") || root.add("mmrec-page");
          patchRecovery();
        } catch (e) {}
      };
      const obs = new MutationObserver(records => {
        if (state.superseded) obs.disconnect(); else if (!queued && waitingOn() && records.some(rec => !rec.target.closest?.(OWN_UI))) {
          queued = !0;
          fn = pass, "function" == typeof requestAnimationFrame ? requestAnimationFrame(fn) : setTimeout(fn, 0);
          var fn;
        }
      });
      state._observer = obs;
      obs.observe(document.body || document.documentElement, {
        childList: !0,
        subtree: !0
      });
    }
    "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", boot, {
      signal: ac.signal
    }) : boot();
    window.addEventListener("pagehide", e => {
      if (!e || !e.persisted) {
        state.superseded = !0;
        try {
          state._observer && state._observer.disconnect();
        } catch (e2) {}
        if (ticker) {
          clearInterval(ticker);
          ticker = null;
        }
      }
    }, {
      signal: ac.signal
    });
    window.addEventListener("pageshow", e => {
      if (e && e.persisted && state.superseded && window.__mmRecovery === state) {
        state.superseded = !1;
        boot();
      }
    }, {
      signal: ac.signal
    });
    window.__mmSettings && (state._offSettings = window.__mmSettings.onChange(k => {
      state.superseded || "waiting" !== k || (waitingOn() ? run() : restore());
    }));
  })();
  (() => {
    "use strict";
    const VERSION = 13;
    if (window.__mmUpdate && window.__mmUpdate.version >= VERSION) return;
    const T = (s, p) => window.__mmI18n ? window.__mmI18n.t(s, p) : p ? String(s).replace(/\{(\w+)\}/g, (m, k) => null != p[k] ? String(p[k]) : m) : String(s);
    const DIST_version = "1.10.0", DIST_meta = "https://raw.githubusercontent.com/wedge256/mm-patcher/main/mm-patcher.meta.js", DIST_page = "https://raw.githubusercontent.com/wedge256/mm-patcher/main/mm-patcher.user.js", DIST_notes = "https://raw.githubusercontent.com/wedge256/mm-patcher/main/CHANGELOG.md", DIST_notesPage = "https://github.com/wedge256/mm-patcher/blob/main/CHANGELOG.md", DIST_notesDe = "https://raw.githubusercontent.com/wedge256/mm-patcher/main/CHANGELOG.de.md", DIST_notesPageDe = "https://github.com/wedge256/mm-patcher/blob/main/CHANGELOG.de.md";
    const german = () => !window.__mmI18n || "de" === window.__mmI18n.lang();
    const notesUrl = () => german() && DIST_notesDe || DIST_notes;
    const notesPageUrl = () => german() && DIST_notesPageDe || DIST_notesPage;
    const prev = window.__mmUpdate;
    if (prev) {
      prev.superseded = !0;
      try {
        prev._cancel && prev._cancel();
      } catch (e) {}
    }
    document.querySelectorAll(".mmupd-chip").forEach(e => e.remove());
    const KEY = "mm_update";
    const RETRY_AFTER = 10 * 60 * 1e3;
    const START_DELAY = 3e3;
    const MAX_NOTES = 8;
    const NOTES_TIMEOUT = 4e3;
    const INK_primary = "#05164D", INK_hairline = "#e1e0d9", INK_accent = "#1c5cab", INK_muted = "#898781", INK_secondary = "#52514e";
    const DONATE_URL = "https://buymeacoffee.com/wedge_mm";
    const MUG = `<svg class="mmupd-don-mug" viewBox="0 0 32 32" width="18" height="18" aria-hidden="true">
        <path d="M23 13.5h2.2a3.3 3.3 0 0 1 3.3 3.3v2.9a3.3 3.3 0 0 1-3.3 3.3H23" fill="none" stroke="#B87A06" stroke-width="2.4" stroke-linecap="round"/>
        <rect x="6" y="10.5" width="17" height="18" rx="3" fill="#F6B51E" stroke="#B87A06" stroke-width="1.6"/>
        <path d="M10.5 15.5v8.5M14.5 15.5v8.5M18.5 15.5v8.5" stroke="#FFD866" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M5 12.5C4.6 9.6 6.6 7.6 9.3 8.1 9.9 5.6 12.2 4 14.8 4.5c1.7-1.4 4.6-.9 5.6 1.4 2.6-.4 4.6 1.6 4.2 4.1.6.7.6 1.8.1 2.5H5z" fill="#fff" stroke="#E6D7AE" stroke-width="1.3" stroke-linejoin="round"/></svg>`;
    const readState = () => {
      try {
        return JSON.parse(localStorage.getItem(KEY) || "{}") || {};
      } catch (e) {
        return {};
      }
    };
    const writeState = s => {
      try {
        localStorage.setItem(KEY, JSON.stringify(s));
      } catch (e) {}
    };
    function cmp(a, b) {
      const split = v => {
        const s = String(v).trim().replace(/^v/, "");
        const dash = s.indexOf("-");
        return {
          nums: (-1 === dash ? s : s.slice(0, dash)).split(".").map(n => parseInt(n, 10) || 0),
          pre: -1 === dash ? "" : s.slice(dash + 1)
        };
      };
      const A = split(a), B = split(b);
      const len = Math.max(A.nums.length, B.nums.length);
      for (let i = 0; i < len; i++) {
        const d = (A.nums[i] || 0) - (B.nums[i] || 0);
        if (d) return d > 0 ? 1 : -1;
      }
      return A.pre === B.pre ? 0 : A.pre ? B.pre && A.pre > B.pre ? 1 : -1 : 1;
    }
    const state = {
      version: VERSION,
      current: DIST_version,
      latest: null,
      error: null,
      checkedAt: null
    };
    let chip = null;
    let reloadArmed = !1;
    function armReload() {
      if (reloadArmed) return;
      reloadArmed = !0;
      let left = "hidden" === document.visibilityState;
      const onVis = () => {
        if ("hidden" !== document.visibilityState) {
          if (left) {
            document.removeEventListener("visibilitychange", onVis);
            try {
              location.reload();
            } catch (e) {}
          }
        } else left = !0;
      };
      document.addEventListener("visibilitychange", onVis);
    }
    function hide() {
      if (chip) {
        chip.remove();
        chip = null;
      }
    }
    function show(latest, notes) {
      if (api.superseded || !document.body) return;
      if (chip && chip.isConnected) return;
      !function() {
        if (document.getElementById("mmupd-styles")) return;
        const css = `
.mmupd-chip { position: fixed; right: 18px; bottom: 18px; z-index: 2147482900;
              display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
              max-width: min(360px, calc(100vw - 36px));
              background: #fff; color: ${INK_primary};
              border: 1px solid ${INK_hairline}; border-left: 3px solid ${INK_accent};
              border-radius: 8px; padding: 10px 12px;
              box-shadow: 0 6px 24px rgba(5,22,77,.18);
              font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
              font-size: 12.5px; line-height: 1.45; }
.mmupd-mark { flex: 0 0 auto; display: flex; }
.mmupd-mark svg { width: 28px; height: 28px; }
.mmupd-txt { flex: 1 1 auto; min-width: 0; }
.mmupd-txt b { font-weight: 700; }
.mmupd-sub { display: block; color: ${INK_muted}; font-size: 11px; margin-top: 1px; }
.mmupd-go { flex: 0 0 auto; border: 0; border-radius: 6px; cursor: pointer;
            background: ${INK_accent}; color: #fff; font: inherit; font-weight: 600;
            padding: 5px 11px; white-space: nowrap; }
.mmupd-go:hover { background: #174d8f; }
.mmupd-x { flex: 0 0 auto; border: 0; background: none; cursor: pointer;
           color: ${INK_muted}; font-size: 15px; line-height: 1; padding: 2px 4px; }
.mmupd-x:hover { color: ${INK_primary}; }
.mmupd-notes { flex: 1 0 100%; min-width: 0; border-top: 1px solid ${INK_hairline}; padding-top: 7px;
               max-height: 40vh; overflow: auto; }
.mmupd-notes > :first-child { margin-top: 0; }
.mmupd-ver { font-weight: 700; margin-top: 6px; }
.mmupd-cat { color: ${INK_muted}; font-size: 11px; margin-top: 4px; }
.mmupd-list { margin: 1px 0 0; padding-left: 16px; list-style: disc; }
.mmupd-list li { margin: 1px 0; font-size: 12px; }
.mmupd-more { display: inline-block; margin-top: 5px; color: ${INK_accent}; font-size: 11.5px; }
.mmupd-don { flex: 1 0 100%; display: flex; align-items: center; gap: 7px; min-width: 0;
             border-top: 1px solid ${INK_hairline}; padding-top: 7px; text-decoration: none !important; }
.mmupd-don-mug { flex: 0 0 auto; display: block; }
.mmupd-don-q { flex: 1 1 auto; color: ${INK_secondary}; font-size: 12px; }
.mmupd-don-cta { flex: 0 0 auto; color: #8A5A00; font-weight: 600; font-size: 12px; white-space: nowrap; }
.mmupd-don:hover .mmupd-don-cta { text-decoration: underline; }
`;
        const el = document.createElement("style");
        el.id = "mmupd-styles";
        el.textContent = css;
        document.head.appendChild(el);
      }();
      chip = document.createElement("div");
      chip.className = "mmupd-chip";
      const mark = window.__mmSettings && window.__mmSettings.mark;
      chip.innerHTML = (mark ? '<span class="mmupd-mark">' + mark + "</span>" : "") + '<span class="mmupd-txt"><b>' + T("Update verfügbar") + '</b><span class="mmupd-sub"></span></span>' + '<button type="button" class="mmupd-go">' + T("Installieren") + "</button>" + '<button type="button" class="mmupd-x" title="' + T("Diese Version nicht mehr anzeigen") + '">✕</button>' + '<a class="mmupd-don" href="' + DONATE_URL + '" target="_blank" rel="noopener">' + MUG + '<span class="mmupd-don-q">' + T("Update hilfreich?") + '</span><span class="mmupd-don-cta">' + T("Bier spendieren") + "</span></a>";
      chip.querySelector(".mmupd-sub").textContent = `M&M Patcher ${state.current} → ${latest}`;
      const box = notes ? function(notes) {
        const box = document.createElement("div");
        box.className = "mmupd-notes";
        const add = (tag, cls, text) => {
          const e = document.createElement(tag);
          e.className = cls;
          null != text && (e.textContent = text);
          return e;
        };
        let total = 0, rest = 0;
        notes.forEach(v => {
          let verHead = notes.length > 1;
          let shown = 0;
          v.groups.forEach(g => {
            const take = g.items.slice(0, Math.max(0, MAX_NOTES - shown));
            rest += g.items.length - take.length;
            if (!take.length) return;
            if (verHead) {
              box.appendChild(add("div", "mmupd-ver", v.version));
              verHead = !1;
            }
            g.title && box.appendChild(add("div", "mmupd-cat", g.title));
            const ul = box.appendChild(add("ul", "mmupd-list"));
            take.forEach(t => ul.appendChild(add("li", "", t)));
            shown += take.length;
          });
          total += shown;
        });
        if (!total) return null;
        if (rest && notesPageUrl()) {
          const more = box.appendChild(add("a", "mmupd-more", T("+ {n} weitere im Changelog", {
            n: rest
          })));
          more.href = notesPageUrl();
          more.target = "_blank";
          more.rel = "noopener";
        }
        return box;
      }(notes) : null;
      box && chip.insertBefore(box, chip.querySelector(".mmupd-don"));
      document.body.appendChild(chip);
      const go = chip.querySelector(".mmupd-go"), x = chip.querySelector(".mmupd-x");
      go.addEventListener("click", () => {
        try {
          window.open(DIST_page, "_blank", "noopener");
        } catch (e) {}
        armReload();
      });
      x.addEventListener("click", () => {
        const s = readState();
        s.seen = latest;
        writeState(s);
        hide();
      });
    }
    async function check(force) {
      if (!DIST_meta || "0.0.0-dev" === DIST_version) return null;
      const s = readState();
      const age = s.last ? Date.now() - s.last : 1 / 0;
      if (!force && (s.failed && age <= RETRY_AFTER)) {
        if (s.latest && cmp(s.latest, DIST_version) > 0 && s.seen !== s.latest) {
          state.latest = s.latest;
          show(s.latest);
        }
        return s.latest || null;
      }
      try {
        const r = await fetch(DIST_meta, {
          method: "GET",
          cache: "no-store",
          credentials: "omit"
        });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const latest = function(text) {
          const m = /^\/\/\s*@version\s+(\S+)/m.exec(String(text || ""));
          return m ? m[1] : null;
        }(await r.text());
        if (!latest) throw new Error("no @version in meta");
        state.latest = latest;
        state.error = null;
        state.checkedAt = Date.now();
        writeState({
          last: Date.now(),
          latest: latest,
          seen: s.seen,
          failed: !1
        });
        cmp(latest, DIST_version) > 0 && s.seen !== latest && show(latest, await async function(latest) {
          if (!notesUrl()) return null;
          try {
            const r = await fetch(notesUrl(), {
              method: "GET",
              credentials: "omit",
              signal: AbortSignal.timeout(NOTES_TIMEOUT)
            });
            if (!r.ok) return null;
            const list = function(md) {
              const out = [];
              let ver = null, grp = null;
              const clean = s => s.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\*\*|`/g, "").replace(/\s+/g, " ").trim();
              String(md || "").split(/\r?\n/).forEach(line => {
                let m;
                if (m = /^##\s+\[?v?(\d[\w.-]*)/.exec(line)) {
                  ver = {
                    version: m[1],
                    groups: []
                  };
                  out.push(ver);
                  grp = null;
                } else if (ver) if (m = /^###\s+(.+)/.exec(line)) {
                  grp = {
                    title: clean(m[1]),
                    items: []
                  };
                  ver.groups.push(grp);
                } else if (m = /^[-*]\s+(.+)/.exec(line)) {
                  if (!grp) {
                    grp = {
                      title: "",
                      items: []
                    };
                    ver.groups.push(grp);
                  }
                  grp.items.push(m[1]);
                } else grp && grp.items.length && /^\s+\S/.test(line) && (grp.items[grp.items.length - 1] += " " + line);
              });
              out.forEach(v => v.groups.forEach(g => {
                g.items = g.items.map(clean).filter(Boolean);
              }));
              return out;
            }(await r.text()).filter(v => cmp(v.version, DIST_version) > 0 && cmp(v.version, latest) <= 0);
            return list.length ? list : null;
          } catch (e) {
            return null;
          }
        }(latest));
        return latest;
      } catch (e) {
        state.error = e && e.message || String(e);
        state.checkedAt = Date.now();
        writeState({
          ...s,
          last: Date.now(),
          failed: !0
        });
        return null;
      }
    }
    const api = {
      version: VERSION,
      check: force => check(!1 !== force),
      status: () => ({
        current: state.current,
        latest: state.latest,
        error: state.error,
        checkedAt: state.checkedAt,
        meta: DIST_meta,
        page: DIST_page
      }),
      reset: () => {
        writeState({});
        hide();
      },
      dismiss: hide,
      armReload: armReload
    };
    try {
      Object.defineProperty(window, "__mmUpdate", {
        value: api,
        enumerable: !1,
        configurable: !0
      });
    } catch (e) {
      try {
        window.__mmUpdate = api;
      } catch (e2) {}
    }
    function boot() {
      if (api.superseded) return;
      const run = () => {
        check(!1);
      };
      if ("function" == typeof window.requestIdleCallback) {
        const id = window.requestIdleCallback(run, {
          timeout: START_DELAY
        });
        api._cancel = () => window.cancelIdleCallback(id);
      } else {
        const id = setTimeout(run, START_DELAY);
        api._cancel = () => clearTimeout(id);
      }
    }
    document.body ? boot() : document.addEventListener("DOMContentLoaded", boot);
    try {
      window.addEventListener("pagehide", e => {
        if (!e || !e.persisted) {
          api.superseded = !0;
          try {
            api._cancel && api._cancel();
          } catch (e2) {}
        }
      });
    } catch (e) {}
  })();
}

"www.miles-and-more.com" === location.hostname && (() => {
  "use strict";
  const VERSION = 3;
  if ("www.miles-and-more.com" !== location.hostname) return;
  if (window.__mmPortal && window.__mmPortal.version >= VERSION) return;
  const customer = () => {
    const m = /(?:^|;\s*)(?:STATInfo|LTATInfo)=[^;|]+\|([^;|]+)/.exec(document.cookie);
    return m ? m[1] : null;
  };
  window.__mmPortal = {
    version: VERSION,
    loggedIn: () => null != customer()
  };
  const OWNER = "mmPortalOwner";
  const owner = () => {
    try {
      return localStorage.getItem(OWNER);
    } catch (e) {
      return null;
    }
  };
  const own = who => {
    try {
      who && localStorage.setItem(OWNER, who);
    } catch (e) {}
  };
  owner() || own(customer());
  const parse = JSON.parse;
  JSON.parse = function(text, reviver) {
    "string" == typeof text && -1 !== text.indexOf("minimumAwardMilesBalance") && (text = text.replace(/("minimumAwardMilesBalance"\s*:\s*)\d+/g, (m, key) => key + "0"));
    return parse.call(this, text, reviver);
  };
  const EMPTY = "EMPTY_FLIGHT_AWARD_SEARCH";
  const UPDATE = "UPDATE_ENTRY_IN_FLIGHT_AWARD_SEARCH";
  const keepRecent = createStore => function() {
    const store = createStore.apply(this, arguments);
    const dispatch = store.dispatch;
    store.dispatch = function(action) {
      const type = action && action.type;
      if (type === EMPTY) {
        const me = customer(), was = owner();
        if (!me || !was || me === was) {
          own(me);
          return action;
        }
        own(me);
      } else type === UPDATE && own(customer());
      return dispatch.apply(this, arguments);
    };
    return store;
  };
  let devtools = window.__REDUX_DEVTOOLS_EXTENSION__;
  try {
    Object.defineProperty(window, "__REDUX_DEVTOOLS_EXTENSION__", {
      configurable: !0,
      get() {
        const ext = devtools;
        return function() {
          const inner = "function" == typeof ext ? ext.apply(this, arguments) : null;
          return createStore => keepRecent(inner ? inner(createStore) : createStore);
        };
      },
      set(v) {
        devtools = v;
      }
    });
  } catch (e) {}
  const GATE = /if\(\(0,[\w$]+\.[\w$]+\)\(\)\)\{if\(([\w$]+)\.recentSearches=/;
  const patchChunk = chunk => {
    const factories = chunk && chunk[1];
    factories && "object" == typeof factories && Object.keys(factories).forEach(id => {
      const f = factories[id];
      if ("function" != typeof f) return;
      const src = Function.prototype.toString.call(f);
      if (-1 === src.indexOf(".recentSearches=") || !GATE.test(src)) return;
      let fixed = src.replace(GATE, "if(window.__mmPortal.loggedIn()){if($1.recentSearches=");
      /^[\w$]+\s*\(/.test(fixed) && !/^function\b/.test(fixed) && (fixed = fixed.replace(/^[\w$]+/, "function"));
      try {
        factories[id] = (0, eval)("(" + fixed + ")");
      } catch (e) {}
    });
  };
  const CHUNKS = "rspackChunkmamcom_web_frontend_build";
  try {
    const list = globalThis[CHUNKS] = globalThis[CHUNKS] || [];
    list.forEach(patchChunk);
    let push = list.push;
    Object.defineProperty(list, "push", {
      configurable: !0,
      get() {
        const target = push;
        return function() {
          for (let i = 0; i < arguments.length; i++) patchChunk(arguments[i]);
          return target.apply(this, arguments);
        };
      },
      set(v) {
        push = v;
      }
    });
  } catch (e) {}
})();
    }

    var gmXhr = null;
    try {
        if (typeof GM_xmlhttpRequest === 'function') gmXhr = GM_xmlhttpRequest;
        else if (typeof GM !== 'undefined' && GM && typeof GM.xmlHttpRequest === 'function') {
            gmXhr = function (o) { GM.xmlHttpRequest(o); };
        }
    } catch (e) { }
    if (gmXhr) {
        var PROBES = {
            'air-bounds': 'https://api.shop.miles-and-more.com/one-booking/v2/search/air-bounds',
            'air-calendars': 'https://api.shop.miles-and-more.com/one-booking/v2/search/air-calendars'
        };
        var answer = function (id, r) {
            r.id = id;
            document.dispatchEvent(new CustomEvent('mm:probe-result', { detail: JSON.stringify(r) }));
        };
        document.addEventListener('mm:probe-ping', function () {
            document.dispatchEvent(new CustomEvent('mm:probe-pong'));
        });
        document.addEventListener('mm:probe', function (e) {
            var q = null;
            try { q = JSON.parse(String(e.detail)); } catch (x) { }
            var url = q && PROBES[q.path];
            if (!url) return;
            try {
                gmXhr({
                    method: 'POST', url: url, data: '{}', timeout: 15000,
                    headers: { 'Content-Type': 'application/json' },
                    onload: function (r) {
                        var m = /^retry-after:\s*(\d+)/im.exec(r.responseHeaders || '');
                        answer(q.id, { status: r.status, retryAfter: m ? Number(m[1]) : null,
                            body: String(r.responseText || '').slice(0, 300) });
                    },
                    onerror: function () { answer(q.id, { status: 0 }); },
                    ontimeout: function () { answer(q.id, { status: 0 }); }
                });
            } catch (x) { answer(q.id, { status: 0 }); }
        });
    }

    var sandboxed = false;
    try {
        sandboxed = (typeof window.wrappedJSObject !== 'undefined') ||
            (typeof unsafeWindow !== 'undefined' && unsafeWindow !== window);
    } catch (e) { }

    if (!sandboxed) { __mmMain(); return; }

    var code = '(' + __mmMain.toString() + ')();';
    var injected = false;
    function inject(root) {
        if (injected) return true;
        try {
            var s = document.createElement('script');
            s.textContent = code;
            root.appendChild(s);
            s.remove();
            injected = true;
            return true;
        } catch (e) { return false; }
    }

    var root = document.documentElement || document.head;
    if (root && inject(root)) return;

    try {
        var obs = new MutationObserver(function () {
            var r = document.documentElement || document.head;
            if (r && inject(r)) obs.disconnect();
        });
        obs.observe(document, { childList: true, subtree: true });
    } catch (e) { }
})();
