// ==UserScript==
// @name         Miles & More: Prämienflug-Suche erweitert
// @namespace    https://www.awardmap.net
// @version      1.3.0
// @description  Holt den deaktivierten "Ändern"-Button zurück und erweitert Kalender und Trefferliste
// @author       wedge
// @homepageURL  https://www.awardmap.net
// @supportURL   https://github.com/wedge256/mm-patcher/issues
// @icon         https://www.awardmap.net/favicon.svg
// @match        https://shop.miles-and-more.com/*
// @updateURL    https://raw.githubusercontent.com/wedge256/mm-patcher/main/mm-searchbar.meta.js
// @downloadURL  https://raw.githubusercontent.com/wedge256/mm-patcher/main/mm-searchbar.user.js
// @run-at       document-start
// @grant        none
// @noframes
// ==/UserScript==

(function () {
    function __mmMain() {
(() => {
    "use strict";
    const VERSION = 1;
    if (window.__mmAuth && window.__mmAuth.version >= VERSION) return;
    const state = {
        version: VERSION,
        code: null,
        refresh: null,
        repaired: !1,
        seenCodes: 0
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
    const isToken = u => /\/auth\/token(\?|$)/.test(String(u || ""));
    const isAuthz = u => /oauth2\/userAuthorize/.test(String(u || ""));
    function readCode(text) {
        const m = /[?&]code=([^&"'\s]+)/.exec(String(text || ""));
        if (m) {
            state.seenCodes++;
            state.code = m[1];
        }
    }
    function readRefresh(text) {
        try {
            const j = JSON.parse(text);
            j && j.refresh_token && (state.refresh = j.refresh_token);
        } catch (e) {}
    }
    function repair(body) {
        if (window.__mmSettings && !1 === window.__mmSettings.get("authrepair") || state.repaired || !state.code || !state.refresh) return null;
        if (!(b = body, "string" == typeof b && /grant_type=client_credentials/.test(b))) return null;
        var b;
        state.repaired = !0;
        const context = JSON.stringify({
            authenticationCode: state.code,
            userRedirectUri: location.origin
        });
        return body.replace(/grant_type=client_credentials/, "grant_type=refresh_token").replace(/&context=[^&]*/g, "") + "&context=" + encodeURIComponent(context) + "&refresh_token=" + encodeURIComponent(state.refresh);
    }
    const nativeFetch = window.fetch;
    "function" == typeof nativeFetch && (window.fetch = function(input, init) {
        const url = "string" == typeof input ? input : input && input.url || "";
        if (isToken(url) && init && "string" == typeof init.body) try {
            const fixed = repair(init.body);
            fixed && (init = Object.assign({}, init, {
                body: fixed
            }));
        } catch (e) {}
        const p = nativeFetch.apply(this, [ input, init ]);
        return isToken(url) || isAuthz(url) ? p.then(res => {
            try {
                res.clone().text().then(t => {
                    isAuthz(url) ? readCode(t) : readRefresh(t);
                }).catch(() => {});
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
        const url = this.__mmAuthUrl;
        try {
            if (isToken(url)) {
                const fixed = repair(body);
                fixed && (body = fixed);
            }
            (isToken(url) || isAuthz(url)) && this.addEventListener("load", () => {
                try {
                    isAuthz(url) ? readCode(this.responseText) : readRefresh(this.responseText);
                } catch (e) {}
            });
        } catch (e) {}
        return send.call(this, body);
    };
    state.summary = () => ({
        version: VERSION,
        seenCodes: state.seenCodes,
        repaired: state.repaired
    });
})();

(() => {
    "use strict";
    const VERSION = "1.11.1";
    const vnum = s => String(s || "0").split(".").reduce((a, n) => 1e3 * a + (parseInt(n, 10) || 0), 0);
    if (window.mmSearchUnlock && vnum(window.mmSearchUnlock.version) >= vnum(VERSION)) return;
    const FLAGS = [ "enableOriginDestinationModification", "showModifyExpansionButton", "showModifyCancelButton" ];
    const PATTERNS = FLAGS.map(name => ({
        name: name,
        re: new RegExp('"' + name + '"\\s*:\\s*false', "g"),
        fix: '"' + name + '":true'
    }));
    const CONFIG_URL_RE = /global\.config\.post\.json|configuration/i;
    const BOUNDS_RE = /air-bounds/i;
    const stats = {
        version: VERSION,
        responses: 0,
        writes: 0,
        reads: 0,
        lastUrl: null
    };
    function searchOn() {
        try {
            return window.__mmSettings ? !1 !== window.__mmSettings.get("search") : !1 !== JSON.parse(localStorage.getItem("mm_features") || "{}").search;
        } catch (e) {
            return !0;
        }
    }
    window.__mmsuHooks = {
        isConfigUrl: u => CONFIG_URL_RE.test(String(u || "")),
        isBoundsUrl: u => BOUNDS_RE.test(String(u || "")),
        flip: function(text) {
            if (!searchOn()) return null;
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
        },
        align: function(bodyText) {
            if (!window.__mmsuTouched) return null;
            let body;
            try {
                body = JSON.parse(bodyText);
            } catch (e) {
                return null;
            }
            const legs = body && body.itineraries;
            if (!legs || !legs.length) return null;
            const shown = shownRoute();
            const date = readDateField(dateField());
            const cabin = function() {
                const el = document.querySelector(".cabin-field .mat-mdc-select-value, .cabin-field, .cabin-select");
                const txt = el && el.textContent || "";
                const hit = CABIN_API.find(([re]) => re.test(txt));
                if (hit) return hit[1];
                try {
                    const o = JSON.parse(sessionStorage.getItem(SEARCH_KEY));
                    return cabinOfState(o.entities[o.selectedAirBoundsSearchId]) || null;
                } catch (e) {
                    return null;
                }
            }();
            let changed = !1;
            if (shown && (legs[0].originLocationCode !== shown.from || legs[0].destinationLocationCode !== shown.to)) {
                const mirror = isReturnPair(legs);
                legs[0].originLocationCode = shown.from;
                legs[0].destinationLocationCode = shown.to;
                if (mirror) {
                    legs[1].originLocationCode = shown.to;
                    legs[1].destinationLocationCode = shown.from;
                }
                changed = !0;
            }
            if (date && String(legs[0].departureDateTime || "").slice(0, 10) !== date) {
                legs[0].departureDateTime = date + "T00:00:00.000";
                changed = !0;
            }
            const rdate = isReturnPair(legs) ? readDateField(returnField()) : null;
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
            try {
                const o = JSON.parse(sessionStorage.getItem(SEARCH_KEY));
                const e = o.entities[o.selectedAirBoundsSearchId];
                const stored = e && e.itineraries || [];
                if (shown && stored[0]) {
                    const mirror = isReturnPair(stored);
                    stored[0].originLocationCode = shown.from;
                    stored[0].destinationLocationCode = shown.to;
                    if (mirror) {
                        stored[1].originLocationCode = shown.to;
                        stored[1].destinationLocationCode = shown.from;
                    }
                }
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
            try {
                const h = window.__mmsuHooks;
                const patched = h.flip(value);
                if (patched) {
                    value = patched;
                    h.note("writes");
                }
            } catch (e) {}
            return setItem(key, value);
        };
        storage.getItem = function(key) {
            const value = getItem(key);
            try {
                const h = window.__mmsuHooks;
                const patched = h.flip(value);
                if (patched) {
                    h.note("reads");
                    setItem(key, patched);
                    return patched;
                }
            } catch (e) {}
            return value;
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
        const existing = sessionStorage.getItem("configuration");
        existing && sessionStorage.setItem("configuration", existing);
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
    function injectCollapseFix() {
        const ID = "mmsu-collapse-fix";
        if (!document.head) return;
        let el = document.getElementById(ID);
        if (searchOn()) {
            if (!el) {
                el = document.createElement("style");
                el.id = ID;
                document.head.appendChild(el);
            }
            el.textContent = "refx-modify-search-cont mat-expansion-panel { overflow: hidden !important; }" + "refx-modify-search-cont mat-expansion-panel.collapsed-expansion-panel { height: auto !important; min-height: 4rem !important; }";
        } else el && el.remove();
    }
    "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", injectCollapseFix) : injectCollapseFix();
    function injectCompactLayout() {
        const ID = "mmsu-compact-layout";
        if (!document.head) return;
        let el = document.getElementById(ID);
        if (!searchOn()) {
            el && el.remove();
            return;
        }
        if (!el) {
            el = document.createElement("style");
            el.id = ID;
            document.head.appendChild(el);
        }
        const FORM = "form.modify-search-form";
        el.textContent = `
#modify-button .modify-search-button-label { display: none; }
#modify-button .mdc-button__label::after { content: 'Suchen'; }

.upsell-link-out.no-availability {
    background: #fff !important; border: 1px solid #e1e0d9; border-left: 4px solid #05164D;
    border-radius: 8px; padding: 16px 18px !important; }
.upsell-link-out.no-availability .title-label { color: #05164D; }
.upsell-link-out.no-availability .footer { display: none; }
.upsell-link-out.no-availability .message { display: none; }
.upsell-link-out.no-availability .content::before {
    content: 'Ändern Sie oben Datum, Flughäfen oder Kabine.';
    color: #52514e; }

refx-upsell-premium-pres refx-no-flights-found-pres { display: none; }

${FORM} > .modify-search-inputs > .origin-location-field,
${FORM} > .modify-search-inputs > .destination-location-field { position: relative; }
.mmsu-swap {
    position: absolute; z-index: 3; width: 26px; height: 26px; padding: 0;
    display: flex; align-items: center; justify-content: center;
    border: 1px solid #e1e0d9; border-radius: 50%; background: #fff;
    color: #05164D; cursor: pointer; font: inherit; line-height: 1;
    box-shadow: 0 1px 2px rgba(0,0,0,.06); }
${FORM}.mmsu-swapping mat-error,
${FORM}.mmsu-swapping .mat-mdc-form-field-error { visibility: hidden !important; }

.mmsu-swap:hover { background: #f3f6fc; border-color: #b9c6e0; }
.mmsu-swap:active { transform: translateY(1px) scale(.94); }
.mmsu-swap:disabled { opacity: .4; cursor: default; }
.mmsu-swap svg { width: 14px; height: 14px; display: block; }

@media (min-width: 900px) {
refx-modify-search-cont mat-expansion-panel.mat-expanded .mat-expansion-panel-content-wrapper {
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
    }
    "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", injectCompactLayout) : injectCompactLayout();
    const IATA_RE = /\(([A-Z]{3})\)/;
    const originField = () => document.querySelector("#origin, input.origin-input, .origin-input input");
    const destField = () => document.querySelector("#destination, input.destination-input, .destination-input input");
    const codeIn = text => {
        const m = IATA_RE.exec(text || "");
        return m ? m[1] : null;
    };
    const looksPicked = v => IATA_RE.test(v) && v.replace(IATA_RE, "").trim().length > 0;
    let valueSetter = null;
    const setValue = (el, v) => {
        if (!valueSetter) {
            const d = "undefined" != typeof HTMLInputElement && Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
            valueSetter = d && d.set || function(x) {
                this.value = x;
            };
        }
        valueSetter.call(el, v);
    };
    const pause = ms => new Promise(r => setTimeout(r, ms));
    const nextFrame = () => new Promise(r => {
        let done = !1;
        const fin = () => {
            if (!done) {
                done = !0;
                r();
            }
        };
        try {
            requestAnimationFrame(fin);
        } catch (e) {}
        setTimeout(fin, 50);
    });
    const INVALID_CLASSES = [ [ "mat-form-field-invalid", null ], [ "mdc-text-field--invalid", ".mdc-text-field" ] ];
    let swapping = !1;
    let trace = [];
    async function swapFields() {
        if (swapping) return !1;
        const from = originField(), to = destField();
        if (!from || !to) return !1;
        if (!looksPicked(from.value) || !looksPicked(to.value)) return !1;
        if (from.classList.contains("ng-invalid") || to.classList.contains("ng-invalid")) return !1;
        const a = from.value, z = to.value;
        if (codeIn(a) === codeIn(z)) return !1;
        const t0 = Date.now();
        trace = [ codeIn(a) + "->" + codeIn(z) ];
        const note = w => trace.push(w + " @" + (Date.now() - t0) + "ms");
        let unmute = () => {};
        try {
            swapping = !0;
            unmute = function(fields) {
                const boxes = fields.map(el => el && el.closest("mat-form-field")).filter(Boolean);
                if (!boxes.length) return () => {};
                const strip = () => boxes.forEach(box => {
                    for (const [cls, sel] of INVALID_CLASSES) {
                        const target = sel ? box.querySelector(sel) : box;
                        target && target.classList.contains(cls) && target.classList.remove(cls);
                    }
                });
                const form = document.querySelector("form.modify-search-form");
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
            }([ from, to ]);
            setValue(from, z);
            from.dispatchEvent(new Event("input", {
                bubbles: !0
            }));
            setValue(to, a);
            to.dispatchEvent(new Event("input", {
                bubbles: !0
            }));
            note("geschrieben");
            let took = !1;
            for (let i = 0; i < 40 && !took; i++) {
                await nextFrame();
                took = from.classList.contains("ng-invalid") || to.classList.contains("ng-invalid");
            }
            note(took ? "übernommen" : "kein Widerspruch");
            from.dispatchEvent(new FocusEvent("blur", {
                bubbles: !1
            }));
            to.dispatchEvent(new FocusEvent("blur", {
                bubbles: !1
            }));
            const ok = !!await async function(fn, ms = 2e3, step = 20) {
                for (let t = 0; t < ms; t += step) {
                    const v = fn();
                    if (v) return v;
                    await pause(step);
                }
                return null;
            }(() => {
                return !(els = [ from, to ], els.some(el => {
                    if (!el) return !1;
                    if (el.classList.contains("ng-invalid")) return !0;
                    const box = el.closest("mat-form-field");
                    return !(!box || !box.querySelector(".ng-invalid"));
                }));
                var els;
            }, 2e3, 20);
            note(ok ? "angenommen" : "Formular bleibt ungültig");
            return ok;
        } finally {
            unmute();
            swapping = !1;
        }
    }
    let lastRoute = null;
    function shownRoute() {
        if (swapping) return lastRoute;
        const from = codeIn((originField() || {}).value);
        const to = codeIn((destField() || {}).value);
        from && to && from !== to && (lastRoute = {
            from: from,
            to: to
        });
        return lastRoute;
    }
    const dateField = () => document.querySelector('input[formcontrolname="departureDate"], .departure-date-ow input');
    const returnField = () => document.querySelector('input[formcontrolname="returnDate"], .return-date-rt input');
    const MONTHS = {
        jan: 0,
        feb: 1,
        "mär": 2,
        mar: 2,
        apr: 3,
        mai: 4,
        may: 4,
        jun: 5,
        jul: 6,
        aug: 7,
        sep: 8,
        okt: 9,
        oct: 9,
        nov: 10,
        dez: 11,
        dec: 11
    };
    function readDateField(el) {
        if (el && el.classList && el.classList.contains("ng-pristine")) return null;
        const v = el && el.value || "";
        let m = /(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/.exec(v);
        if (m) return `${m[3]}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
        m = /(\d{4})-(\d{2})-(\d{2})/.exec(v);
        if (m) return `${m[1]}-${m[2]}-${m[3]}`;
        m = /(\d{1,2})\.?\s*([A-Za-zÄÖÜäöü]{3})[A-Za-zÄÖÜäöü]*\.?\s*(\d{4})?/.exec(v);
        if (m) {
            const mi = MONTHS[m[2].toLowerCase()];
            if (mi >= 0) {
                let year = m[3] ? +m[3] : null;
                if (!year) {
                    const now = new Date;
                    year = now.getFullYear();
                    (mi < now.getMonth() || mi === now.getMonth() && +m[1] < now.getDate()) && year++;
                }
                return `${year}-${String(mi + 1).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
            }
        }
        return null;
    }
    const CFF_FALLBACK = {
        ECONOMY: "CFFECODYN",
        PREMIUMECO: "CFFPECODYN",
        BUSINESS: "CFFBUSDYN",
        FIRST: "CFFFIRSDYN"
    };
    function cffFor(apiCabin) {
        try {
            const cal = window.__mmCalUI;
            if (cal && cal.cffFor) {
                const v = cal.cffFor(apiCabin);
                if (v) return v;
            }
        } catch (e) {}
        return CFF_FALLBACK[apiCabin] || null;
    }
    const CABIN_API = [ [ /first/i, "FIRST" ], [ /premium/i, "PREMIUMECO" ], [ /business/i, "BUSINESS" ], [ /eco/i, "ECONOMY" ] ];
    function isReturnPair(legs) {
        return !!(legs && 2 === legs.length && legs[0] && legs[1]) && legs[1].originLocationCode === legs[0].destinationLocationCode && legs[1].destinationLocationCode === legs[0].originLocationCode;
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
                raw = sessionStorage.getItem("configuration");
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
        for (const code of e && e.commercialFareFamilies || []) {
            if (map) {
                const hit = map.find(x => x.cff === code);
                if (hit && hit.cabin) return hit.cabin;
            }
            const guess = CFF_CABIN.find(([re]) => re.test(code));
            if (guess) return guess[1];
        }
        return e && e.cabin || null;
    }
    let recapKey = null;
    function showCabinInRecap() {
        if (!searchOn()) {
            document.querySelectorAll(".mmsu-cabin").forEach(e => e.remove());
            recapKey = null;
            return;
        }
        let raw = null;
        try {
            raw = sessionStorage.getItem(SEARCH_KEY);
        } catch (e) {}
        const existing = document.querySelector(".mmsu-cabin");
        if (existing && raw === recapKey) return;
        const name = function() {
            try {
                const o = JSON.parse(sessionStorage.getItem(SEARCH_KEY));
                return CABIN_LABEL[cabinOfState(o.entities[o.selectedAirBoundsSearchId])] || null;
            } catch (e) {
                return null;
            }
        }();
        if (!name) return;
        if (existing) {
            const val = existing.querySelector(".flight-recap-travelers-number");
            val && val.textContent !== name && (val.textContent = name);
            const sr = existing.querySelector(".flight-recap-travelers-sr");
            sr && (sr.textContent = "Klasse " + name);
            recapKey = raw;
            return;
        }
        const src = document.querySelector("refx-flight-recap-travelers");
        if (!src || !src.parentElement) return;
        const clone = src.cloneNode(!0);
        clone.classList.add("mmsu-cabin");
        const label = clone.querySelector(".flight-recap-travelers-passengers");
        const value = clone.querySelector(".flight-recap-travelers-number");
        if (!label || !value) return;
        label.textContent = "Klasse";
        value.textContent = name;
        const sr = clone.querySelector(".flight-recap-travelers-sr");
        sr && (sr.textContent = "Klasse " + name);
        clone.querySelectorAll(".flight-recap-travelers-icon, .discount-desktop, refx-discounts-cont").forEach(e => e.remove());
        src.parentElement.insertBefore(clone, src.nextSibling);
        recapKey = raw;
    }
    let recapTimer = null;
    const SEARCH_KEY = "airBoundsSearch";
    function placeSwapButton() {
        const dest = document.querySelector("form.modify-search-form > .modify-search-inputs > .destination-location-field");
        if (!dest) return;
        const existing = dest.querySelector(".mmsu-swap");
        if (!searchOn() || window.__mmSettings && !1 === window.__mmSettings.get("swap")) existing && existing.remove(); else if (function() {
            const legs = function() {
                try {
                    const o = JSON.parse(sessionStorage.getItem(SEARCH_KEY));
                    return o.entities[o.selectedAirBoundsSearchId].itineraries || [];
                } catch (e) {
                    return [];
                }
            }();
            return 1 === legs.length || isReturnPair(legs);
        }()) {
            if (existing) {
                if (vnum(existing.dataset.mmsuVersion) >= vnum(VERSION)) return;
                existing.remove();
            }
            dest.appendChild(function() {
                const b = document.createElement("button");
                b.type = "button";
                b.className = "mmsu-swap";
                b.dataset.mmsuVersion = VERSION;
                b.title = "Gegenrichtung suchen";
                b.setAttribute("aria-label", "Abflug und Ziel tauschen");
                b.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" ' + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + '<path d="M2 5h10M9.5 2.5 12 5 9.5 7.5"/><path d="M14 11H4M6.5 8.5 4 11l2.5 2.5"/></svg>';
                b.addEventListener("mousedown", e => e.preventDefault());
                b.addEventListener("click", e => {
                    e.preventDefault();
                    e.stopPropagation();
                    swapFields().then(ok => {}).catch(err => {});
                });
                return b;
            }());
        } else existing && existing.remove();
    }
    stats.swapFields = () => swapFields();
    stats.trace = () => trace.slice();
    stats.shownRoute = () => shownRoute();
    function subscribeSwapToggle() {
        try {
            const S = window.__mmSettings;
            if (!S || !S.onChange) return;
            if (stats._settingsRef === S) return;
            try {
                stats._offSettings && stats._offSettings();
            } catch (e) {}
            stats._offSettings = S.onChange(k => {
                if ("swap" === k) try {
                    placeSwapButton();
                } catch (e) {}
                if ("search" === k) {
                    try {
                        placeSwapButton();
                    } catch (e) {}
                    try {
                        showCabinInRecap();
                    } catch (e) {}
                    try {
                        injectCollapseFix();
                    } catch (e) {}
                    try {
                        injectCompactLayout();
                    } catch (e) {}
                }
            });
            stats._settingsRef = S;
            window.__mmsuSwapOffSettings = stats._offSettings;
        } catch (e) {}
    }
    let swapTimer = null;
    const scheduleSwap = () => {
        if (!swapTimer) {
            swapTimer = setTimeout(() => {
                swapTimer = null;
                subscribeSwapToggle();
                try {
                    placeSwapButton();
                } catch (e) {}
            }, 150);
            recapTimer || (recapTimer = setTimeout(() => {
                recapTimer = null;
                try {
                    showCabinInRecap();
                } catch (e) {}
            }, 200));
        }
    };
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
        const obs = new MutationObserver(scheduleSwap);
        obs.observe(document.body, {
            childList: !0,
            subtree: !0
        });
        try {
            window.__mmsuSwapObserver = obs;
        } catch (e) {}
        subscribeSwapToggle();
        scheduleSwap();
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
                    const entry = (JSON.parse(sessionStorage.getItem("configuration") || "{}").entities || {})["@refx/booking-components#ModifySearchContConfig"];
                    if (!entry) return "ModifySearchContConfig not loaded yet";
                    const out = {};
                    FLAGS.forEach(f => out[f] = entry[f]);
                    out.modifySearchCalendarRangeDays = entry.modifySearchCalendarRangeDays;
                    return out;
                } catch (e) {
                    return "unreadable: " + e.message;
                }
            })(),
            formPresent: !!document.querySelector("form.modify-search-form"),
            headerPresent: !!document.querySelector("aside.modify-search-wrapper mat-expansion-panel-header")
        })
    });
})();

(() => {
    "use strict";
    const VERSION = 46;
    if (window.__mmSettings && window.__mmSettings.version >= VERSION) return;
    const inherited = window.__mmSettings;
    if (inherited) {
        inherited.superseded = !0;
        try {
            inherited._observer && inherited._observer.disconnect();
        } catch (e) {}
    }
    document.querySelectorAll(".mmset-fab, .mmset-panel, .mmset-tip").forEach(e => e.remove());
    const KEY = "mm_features";
    const DEFAULTS = {
        search: !0,
        swap: !0,
        iata: !0,
        iataExt: !0,
        calendar: !0,
        bbd: !0,
        currency: !0,
        results: !0,
        seatmap: !0,
        keepalive: !0,
        waiting: !0,
        authrepair: !0,
        updates: !0
    };
    const SUB_OF = {
        swap: "search",
        iata: "search",
        iataExt: "search",
        bbd: "calendar",
        seatmap: "results"
    };
    const GROUPS = [ {
        key: "search",
        label: "🔍 Suchpanel",
        tip: 'Schaltet den „Ändern"-Button wieder frei \\o/',
        subs: [ {
            key: "iata",
            label: "🔤 Bessere IATA-Suche",
            tip: '„BER" findet Berlin statt Berbera, „FRA" Frankfurt statt ' + "Francistown."
        }, {
            key: "iataExt",
            label: "🌍 Mehr Flughäfen",
            tip: "Nutzt die 8700 Flughäfen/Bahnhöfe der Hauptseite, statt " + "die 1500 der Awardsuchseite. [höhere Rechenlast; kann die " + "Eingabe träger werden lassen]"
        }, {
            key: "swap",
            label: "⇄ Richtungstausch",
            tip: "Tauscht Abflug und Zielort (wie auf der Hauptseite)."
        } ]
    }, {
        key: "calendar",
        label: "📅 Besserer Kalender",
        tip: "Scannt vollen Monat statt eine Woche; je nach Einstellung für " + "alle 4 Kabinen. Kann auf manchen Routen noch um BBD erweitert " + "werden (volles Jahr für alle Kabinen).",
        subs: [ {
            key: "bbd",
            label: "📈 Best-by-Day-Preise",
            tip: "Ergänzt den Kalender um die von der Hauptseite bekannten " + "Preise. [findet für jeden Tag den besten Preis/Kabine]; " + "wird serverseitig lange gecached und ist demnach oft nicht " + "mehr aktuell."
        } ]
    }, {
        key: "results",
        label: "🛬 Neue Ergebnisansicht",
        tip: "Neue Ansicht mit mehr Details und weniger Klickerei bis zum " + "Buchen.",
        subs: [ {
            key: "seatmap",
            label: "💺 Sitzplan",
            tip: "Zeigt bei Hover / Klick auf den Flugzeugtyp die passende " + "Seatmap an."
        } ]
    }, {
        header: "🧰 Wartung & Sonstiges",
        subs: [ {
            key: "currency",
            label: "💱 Währungsumrechnung",
            tip: "Zeigt bei Fremdwährungen den Betrag in € an (Kalender, " + "Ergebniskarten, Sitzplan)."
        }, {
            key: "keepalive",
            label: "🔐 Angemeldet bleiben",
            tip: "Verhindert, dass die Session nach 15 Minuten Inaktivität " + "beendet wird."
        }, {
            key: "waiting",
            label: "⚠️ Verbesserte Fehlermeldungen",
            tip: "Ergänzt die generische Fehlerseite um den tatsächlichen " + "Fehler und eine Möglichkeit zum direkten Relogin."
        }, {
            key: "authrepair",
            label: "🔑 Fehlerbehebung Anmeldung",
            tip: "Behebt Probleme, die bei manchen Abflugsorten auf der " + "Hauptseite auftreten (Error 401)."
        }, {
            key: "updates",
            label: "🔔 Update-Hinweis",
            tip: "Meldet einmal täglich, wenn eine neuere Version vorliegt."
        } ]
    } ];
    const INK_primary = "#05164D", INK_secondary = "#52514e", INK_muted = "#898781", INK_hairline = "#e1e0d9", INK_accent = "#1c5cab";
    const PANEL_W = 284;
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
        }
        return {
            ...DEFAULTS,
            ...stored || {}
        };
    })();
    const listeners = inherited && Array.isArray(inherited._listeners) ? inherited._listeners : [];
    const save = () => {
        try {
            localStorage.setItem(KEY, JSON.stringify(prefs));
        } catch (e) {}
        (v => {
            try {
                const exp = new Date(Date.now() + 365 * 24 * 3600 * 1e3).toUTCString();
                document.cookie = KEY + "=" + encodeURIComponent(JSON.stringify(v)) + ";expires=" + exp + ";path=/;SameSite=Lax";
            } catch (e) {}
        })(prefs);
    };
    save();
    const state = {
        version: VERSION,
        _listeners: listeners,
        get: k => prefs[k],
        all: () => ({
            ...prefs
        }),
        set: (k, v) => {
            prefs[k] = !!v;
            save();
            panel && panel.querySelectorAll(".mmset-row[data-key]").forEach(row => {
                const key = row.dataset.key;
                const inp = row.querySelector("input[data-feature]");
                if (!inp) return;
                inp.checked = !!prefs[key];
                const parent = SUB_OF[key];
                const dim = !(!parent || prefs[parent]);
                row.classList.toggle("is-dim", dim);
                inp.disabled = dim;
            });
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
    function toggleRow(key, label, isSub) {
        const parent = SUB_OF[key];
        const dim = !(!parent || prefs[parent]);
        return `<div class="mmset-row${isSub ? " is-sub" : " is-master"}${dim ? " is-dim" : ""}" data-key="${key}">
            <span class="mmset-label">${label}</span>
            <label class="mmset-sw">
                <input type="checkbox" data-feature="${key}" ${prefs[key] ? "checked" : ""} ${dim ? "disabled" : ""}>
                <span class="mmset-track"></span>
            </label>
        </div>`;
    }
    function groupHtml(g) {
        return `<div class="mmset-grp">` + (g.header ? `<div class="mmset-head">${g.header}</div>` : toggleRow(g.key, g.label, !1)) + g.subs.map(s => toggleRow(s.key, s.label, !0)).join("") + `</div>`;
    }
    const TIPS = {};
    GROUPS.forEach(g => {
        g.key && (TIPS[g.key] = g.tip);
        g.subs.forEach(s => {
            TIPS[s.key] = s.tip;
        });
    });
    let fab = null;
    function dock() {
        if (state.superseded || !fab || !document.body) return;
        document.querySelectorAll(".mmset-fab").forEach(e => {
            e !== fab && e.remove();
        });
        document.querySelectorAll(".mmset-panel").forEach(e => {
            e !== panel && e.remove();
        });
        const host = document.querySelector("refx-search-recap-cont .flight-recap") || document.querySelector("refx-search-recap-cont");
        if (host) {
            fab.parentElement !== host && host.appendChild(fab);
            fab.classList.add("is-docked");
        } else {
            fab.classList.remove("is-docked");
            fab.parentElement !== document.body && document.body.appendChild(fab);
        }
    }
    function positionPanel() {
        if (!panel || !fab) return;
        const r = fab.getBoundingClientRect();
        const w = PANEL_W;
        panel.style.top = Math.round(r.bottom + 8) + "px";
        panel.style.left = Math.round(Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8))) + "px";
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
             border-radius: 6px; cursor: pointer; white-space: nowrap; }
.mmset-fab:hover { background: #f2f5fa; }
.mmset-fab.is-docked { position: static; box-shadow: none;
                       align-self: center; margin-left: 16px; flex: 0 0 auto; }
.mmset-panel { position: fixed; z-index: 2147483001;
               width: ${PANEL_W}px; background: #fff; border: 1px solid ${INK_hairline}; border-radius: 10px;
               box-shadow: 0 6px 24px rgba(0,0,0,.18); padding: 14px 16px; font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
               display: none; }
.mmset-panel.is-open { display: block; }
.mmset-title { font-size: 14px; font-weight: 700; color: ${INK_primary}; margin: 0 0 2px; }
.mmset-sub { font-size: 11px; color: ${INK_muted}; margin: 0 0 8px; }
.mmset-grp { padding: 3px 0 5px; }
.mmset-grp + .mmset-grp { border-top: 1px solid ${INK_hairline}; }
.mmset-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 0; }
.mmset-row.is-master .mmset-label { font-weight: 700; }
.mmset-head { font-size: 12px; font-weight: 700; color: ${INK_muted};
              letter-spacing: .02em; padding: 5px 0 1px; }
.mmset-row.is-sub { margin-left: 9px; padding: 3.5px 0 3.5px 12px; border-left: 2px solid ${INK_hairline}; }
.mmset-row.is-sub .mmset-label { font-size: 12px; color: ${INK_secondary}; }
.mmset-row.is-sub .mmset-sw { width: 30px; height: 18px; flex: 0 0 30px; }
.mmset-row.is-sub .mmset-track::before { width: 12px; height: 12px; }
.mmset-row.is-sub .mmset-sw input:checked + .mmset-track::before { transform: translateX(12px); }
.mmset-row.is-dim { opacity: .45; }
.mmset-row.is-dim .mmset-track { cursor: not-allowed; }
.mmset-label { font-size: 13px; color: ${INK_primary}; min-width: 0; }
.mmset-tip { position: fixed; z-index: 2147483002; width: 252px;
             background: ${INK_primary}; color: #fff; border-radius: 7px; padding: 8px 10px;
             font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
             font-size: 11.5px; line-height: 1.5; pointer-events: none;
             opacity: 0; transition: opacity .12s; transition-delay: 0s;
             box-shadow: 0 8px 22px rgba(5,22,77,.28); }
.mmset-tip.is-on { opacity: 1; transition-delay: .3s; }
.mmset-sw { position: relative; width: 38px; height: 22px; flex: 0 0 38px; }
.mmset-sw input { opacity: 0; width: 0; height: 0; position: absolute; }
.mmset-track { position: absolute; inset: 0; background: #cdd3df; border-radius: 999px; transition: background .15s; cursor: pointer; }
.mmset-track::before { content: ''; position: absolute; left: 3px; top: 3px; width: 16px; height: 16px;
                       background: #fff; border-radius: 50%; transition: transform .15s; }
.mmset-sw input:checked + .mmset-track { background: ${INK_accent}; }
.mmset-sw input:checked + .mmset-track::before { transform: translateX(16px); }
.mmset-foot { margin-top: 10px; font-size: 10px; color: ${INK_muted}; }

`;
            let el = document.getElementById("mmset-styles");
            if (!el) {
                el = document.createElement("style");
                el.id = "mmset-styles";
                document.head.appendChild(el);
            }
            el.textContent !== css && (el.textContent = css);
        }();
        fab = document.createElement("button");
        fab.className = "mmset-fab";
        fab.type = "button";
        fab.title = "M&M Patcher: Einstellungen";
        fab.textContent = "M&M Patcher Settings";
        document.body.appendChild(fab);
        panel = document.createElement("div");
        panel.className = "mmset-panel";
        panel.innerHTML = `
            <p class="mmset-title">M&amp;M Patcher</p>
            <p class="mmset-sub">Ist ein Hauptschalter aus, verhält sich der Bereich wie im Original.</p>
            ${GROUPS.map(groupHtml).join("")}
            <p class="mmset-foot">Einstellung bleibt gespeichert.</p>`;
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
                tipEl.textContent = TIPS[row.dataset.key] || "";
                const r = row.getBoundingClientRect();
                const w = 252;
                const left = r.left - w - 12 >= 8 ? r.left - w - 12 : Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
                tipEl.style.left = Math.round(left) + "px";
                tipEl.style.top = Math.round(Math.min(r.top, window.innerHeight - 150)) + "px";
                tipEl.classList.add("is-on");
            });
            panel.addEventListener("mouseleave", () => tipEl.classList.remove("is-on"));
        }();
        fab.addEventListener("click", e => {
            e.stopPropagation();
            panel.classList.toggle("is-open") && positionPanel();
        });
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
        panel.querySelectorAll("input[data-feature]").forEach(inp => {
            inp.addEventListener("change", () => state.set(inp.dataset.feature, inp.checked));
        });
        dock();
        let dockTimer = null;
        const obs = new MutationObserver(() => {
            dockTimer || (dockTimer = setTimeout(() => {
                dockTimer = null;
                dock();
            }, 150));
        });
        state._observer = obs;
        obs.observe(document.body, {
            childList: !0,
            subtree: !0
        });
    }
    function boot() {
        state.superseded || window.__mmSettings !== state || (document.body ? mountUI() : document.addEventListener("DOMContentLoaded", () => {
            state.superseded || window.__mmSettings !== state || mountUI();
        }));
    }
    boot();
    try {
        window.addEventListener("pagehide", e => {
            if (!e || !e.persisted) {
                state.superseded = !0;
                try {
                    state._observer && state._observer.disconnect();
                } catch (e2) {}
            }
        });
        window.addEventListener("pageshow", e => {
            if (e && e.persisted && state.superseded && window.__mmSettings === state) {
                state.superseded = !1;
                boot();
            }
        });
    } catch (e) {}
})();

(() => {
    "use strict";
    const VERSION = 12;
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
        atlas: 0,
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
    const searchMasterOn = () => !window.__mmSettings || !1 !== window.__mmSettings.get("search");
    const originalFetch = window.__mmIataOrigFetch || (window.__mmIataOrigFetch = window.fetch);
    const RAIL_METRO = [ [ "XHJ", "Aachen Hbf Rail Station", "Aachen/Maastricht" ], [ "QPP", "Berlin Hbf Rail Station", "Berlin" ], [ "ZQU", "Braunschweig/Wolfsburg Rail Station", "Braunschweig" ], [ "DHC", "Bremen Hbf", "Bremen" ], [ "DTZ", "Dortmund Hbf Rail Station", "Dortmund" ], [ "XIR", "Dresden Hbf Rail Station", "Dresden" ], [ "QDU", "Düsseldorf Hauptbahnhof", "Düsseldorf" ], [ "XIU", "Erfurt Hbf Rail Station", "Erfurt" ], [ "ESZ", "Essen Hbf Rail Station", "Essen" ], [ "ZRB", "Frankfurt Hbf Rail Station", "Frankfurt" ], [ "QFB", "Freiburg Hbf", "Freiburg" ], [ "ZEU", "Göttingen Rail Station", "Göttingen" ], [ "ZMB", "Hamburg Hbf Rail Station", "Hamburg" ], [ "ZVR", "Hannover Hbf Rail Station", "Hannover" ], [ "KJR", "Karlsruhe Hauptbahnhof", "Karlsruhe" ], [ "KWQ", "Kassel/Calden", "Kassel" ], [ "QKL", "Köln Hbf Rail Station", "Köln" ], [ "QKU", "Köln Messe/Deutz Bahnhof", "Köln" ], [ "XIT", "Leipzig Hbf Rail Station", "Leipzig/Halle" ], [ "MHJ", "Mannheim Hbf Railway Station", "Mannheim" ], [ "AGY", "Augsburg Hbf Rail Station", "München" ], [ "ZMU", "München Hbf Rail Station", "München" ], [ "MKF", "Münster Hbf", "Münster/Osnabrück" ], [ "ZPE", "Osnabrück Hbf", "Münster/Osnabrück" ], [ "ZAQ", "Nürnberg Hauptbahnhof", "Nürnberg" ], [ "ZPY", "Siegburg/Bonn Bahnhof", "Siegburg/Bonn" ], [ "ZWS", "Stuttgart Hauptbahnhof", "Stuttgart" ], [ "QUL", "Ulm Rail Station", "Ulm" ], [ "QWU", "Würzburg Hauptbahnhof", "Würzburg" ], [ "ZBA", "Basel Bad Rail Station", "Basel" ], [ "ZDH", "Basel SBB Rail Station", "Basel" ], [ "ZDI", "Bellinzona Rail Station", "Bellinzona" ], [ "ZDJ", "Bern Rail Station", "Bern" ], [ "ZDT", "Chur Rail Station", "Chur" ], [ "ZHF", "Fribourg Rail Station", "Fribourg" ], [ "ZHT", "Genf Rail Station", "Genf" ], [ "ZIN", "Interlaken Ost", "Interlaken" ], [ "QLS", "Lausanne Rail Station", "Lausanne" ], [ "QLJ", "Luzern Rail Station", "Luzern" ], [ "QDL", "Lugano Railway Station", "Lugano" ], [ "ZKO", "Sierre/Siders Rail Station", "Sierre" ], [ "XGZ", "Bregenz Rail Station", "Bregenz" ], [ "GGZ", "Graz Rail Station", "Graz" ], [ "LZS", "Linz Rail Station", "Linz" ], [ "ZSB", "Salzburg Hbf Rail Station", "Salzburg" ] ];
    const ATLAS_URL = "https://api.miles-and-more.com/content/v3/atlas/airport-atlas.json?lang=de";
    const ATLAS_KEY = "agGBZmuTGwFXWzVDg8ckGKGBytemE1nS";
    const ATLAS_STORE = "mmiata_atlas";
    const ATLAS_TTL = 30 * 24 * 3600 * 1e3;
    let atlasPromise = null;
    function fetchAtlasCodes() {
        if (atlasPromise) return atlasPromise;
        atlasPromise = originalFetch.call(window, ATLAS_URL, {
            headers: {
                "x-api-key": ATLAS_KEY,
                accept: "application/json"
            }
        }).then(r => r.ok ? r.json() : null).then(j => {
            const codes = [];
            const seen = new Set;
            (((j || {}).language || {}).countries || []).forEach(c => (c.cities || []).forEach(ct => (ct.airports || []).forEach(a => {
                const code = String(a.code || "").toUpperCase();
                if (/^[A-Z]{3}$/.test(code) && !seen.has(code)) {
                    seen.add(code);
                    codes.push(code);
                }
            })));
            if (!codes.length) return null;
            try {
                localStorage.setItem(ATLAS_STORE, JSON.stringify({
                    ts: Date.now(),
                    codes: codes
                }));
            } catch (e) {}
            return codes;
        }).catch(() => null).then(c => {
            atlasPromise = null;
            return c;
        });
        return atlasPromise;
    }
    const CITY_STORE = "mmiata_cities";
    let cityNames = null;
    const LOCALE_RE = /\/[a-z]{2}-[A-Z]{2}\.json(\?|$)/;
    window.__mmIataHooks = {
        on: () => searchMasterOn() && (!window.__mmSettings || !1 !== window.__mmSettings.get("iataExt")),
        extend: async function(url, response) {
            const data = await response.clone().json();
            if (!data.defaultAirportList || !Array.isArray(data.defaultAirportList)) return response;
            const seen = new Set(data.defaultAirportList);
            let added = 0;
            const add = code => {
                if (code && !seen.has(code)) {
                    data.defaultAirportList.push(code);
                    seen.add(code);
                    added++;
                }
            };
            try {
                (await function() {
                    let hit = null;
                    try {
                        hit = JSON.parse(localStorage.getItem(ATLAS_STORE) || "null");
                    } catch (e) {}
                    if (hit && Array.isArray(hit.codes) && hit.codes.length) {
                        Date.now() - (hit.ts || 0) > ATLAS_TTL && fetchAtlasCodes();
                        return Promise.resolve(hit.codes);
                    }
                    return fetchAtlasCodes();
                }() || []).forEach(add);
            } catch (e) {}
            state.atlas = added;
            RAIL_METRO.forEach(([code]) => add(code));
            state.added = added;
            return new Response(JSON.stringify(data), {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
            });
        },
        locale: async function(response) {
            const data = await response.clone().json();
            let changed = 0;
            for (const [code, name, metro] of RAIL_METRO) {
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
            state.railNamed = changed;
            !function(data) {
                const map = {};
                for (const k of Object.keys(data)) {
                    if (0 !== k.lastIndexOf("global.cities.", 0)) continue;
                    const code = k.slice(14);
                    3 === code.length && data[k] && (map[code] = String(data[k]));
                }
                if (Object.keys(map).length) {
                    cityNames = map;
                    try {
                        localStorage.setItem(CITY_STORE, JSON.stringify({
                            ts: Date.now(),
                            map: map
                        }));
                    } catch (e) {}
                }
            }(data);
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
            if (h && h.on && h.on() && DEFAULT_AIRPORTS_RE.test(url)) try {
                return await h.extend(url, res);
            } catch (e) {
                return res;
            }
            if (h && h.on && h.on() && h.locale && LOCALE_RE.test(url)) try {
                return await h.locale(res);
            } catch (e) {
                return res;
            }
            return res;
        };
    }
    state.hooked = !0;
    state.cityName = function(code) {
        if (!code) return null;
        if (!cityNames) try {
            const s = JSON.parse(localStorage.getItem(CITY_STORE) || "null");
            cityNames = s && s.map || {};
        } catch (e) {
            cityNames = {};
        }
        return cityNames[String(code).toUpperCase()] || null;
    };
    function patchInputs() {
        const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
        if (!desc || !desc.get) return () => {};
        const done = new WeakSet;
        const patch = input => {
            if (!done.has(input)) {
                done.add(input);
                Object.defineProperty(input, "value", {
                    get() {
                        const v = desc.get.call(this);
                        return !searchMasterOn() || window.__mmSettings && !1 === window.__mmSettings.get("iata") || !/^[A-Za-z]{3}$/.test(v) ? v : "(" + v.toUpperCase() + ")";
                    },
                    set(v) {
                        desc.set.call(this, v);
                    },
                    configurable: !0
                });
                state.patched++;
            }
        };
        const scan = () => document.querySelectorAll('input[id$="origin"], input[id$="destination"]').forEach(patch);
        scan();
        const obs = new MutationObserver(scan);
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
    state.summary = () => ({
        version: state.version,
        hooked: state.hooked,
        added: state.added,
        patched: state.patched
    });
})();

(() => {
    "use strict";
    const VERSION = 6;
    if (window.__mmFareNames && window.__mmFareNames.version >= VERSION) return;
    const inherited = window.__mmFareNames;
    const FF_RE = /fare-families\.json/i;
    const LOC_RE = new RegExp("[a-z]{2}[-_][A-Z]{2}\\.json", "i");
    const state = {
        version: VERSION,
        codes: inherited && inherited.codes || {},
        loc: inherited && inherited.loc || null,
        names: inherited && inherited.names || {},
        ready: !(!inherited || !inherited.ready),
        _readyListeners: inherited && Array.isArray(inherited._readyListeners) ? inherited._readyListeners : []
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
        const baseFetch = window.fetch;
        window.fetch = async function(...args) {
            const url = "string" == typeof args[0] ? args[0] : args[0] && args[0].url || "";
            const res = await baseFetch.apply(this, args);
            try {
                const h = window.__mmFareHooks || {};
                FF_RE.test(url) ? res.clone().json().then(h.takeFamilies).catch(e => {}) : LOC_RE.test(url) && res.clone().json().then(h.takeLocalisation).catch(e => {});
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
    state.summary = () => ({
        version: VERSION,
        ready: state.ready,
        codes: Object.keys(state.codes).length,
        names: Object.keys(state.names).length
    });
})();

(() => {
    "use strict";
    const VERSION = 7;
    if (window.__mmCurrency && window.__mmCurrency.version >= VERSION) return;
    const inherited = window.__mmCurrency;
    if (inherited) try {
        inherited._offSettings && inherited._offSettings();
    } catch (e) {}
    const CACHE_KEY = "mmfx_rates";
    const CACHE_FORMAT = 1;
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
        rates: inherited && inherited.rates || null,
        date: inherited && inherited.date || null,
        loading: !1,
        error: null,
        listeners: inherited && Array.isArray(inherited.listeners) ? inherited.listeners : []
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
    async function load() {
        const cached = readCache();
        if (cached && cached.date === today()) {
            state.rates = cached.rates;
            state.date = cached.date;
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
                if (cached && cached.rates) {
                    state.rates = cached.rates;
                    state.date = cached.date;
                }
            }
        } finally {
            state.loading = !1;
        }
        emit();
    }
    !function() {
        const cached = readCache();
        if (cached && cached.date === today()) {
            state.rates = cached.rates;
            state.date = cached.date;
        }
    }();
    let asked = !1;
    function ensureRates() {
        if (!(asked || state.loading || state.rates && state.date === today())) {
            asked = !0;
            load();
        }
    }
    state.ensureRates = ensureRates;
    state.reload = () => {
        try {
            localStorage.removeItem(CACHE_KEY);
        } catch (e) {}
        asked = !0;
        return load();
    };
    state.toEUR = (amount, currency) => {
        if (!(() => {
            const s = window.__mmSettings;
            return !s || !1 !== s.get("currency");
        })()) return null;
        if (null == amount || !currency) return null;
        if ("EUR" === currency) return amount;
        ensureRates();
        const r = state.rates && state.rates[currency];
        return r ? amount / r : null;
    };
    state.eurLabel = (amount, currency) => {
        const eur = state.toEUR(amount, currency);
        return null == eur || "EUR" === currency ? "" : "≈ " + (eur >= 10 ? Math.round(eur) : Math.round(100 * eur) / 100).toLocaleString("de-DE") + " €";
    };
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
            "currency" === k && emit();
        }));
    } catch (e) {}
})();

(() => {
    "use strict";
    const VERSION = 22;
    if (window.__mmCal && window.__mmCal.version >= VERSION) return;
    const inheritedCal = window.__mmCal;
    const FLEXIBILITY = 15;
    const FLEX_ROUNDTRIP = 7;
    const CAL_RE = /air-calendars/i;
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
        raw: null,
        requests: 0,
        responses: 0,
        listeners: inheritedCal && Array.isArray(inheritedCal.listeners) ? inheritedCal.listeners : [],
        template: inheritedCal && inheritedCal.template || null,
        loading: null,
        searchingSince: null,
        progress: null,
        error: null,
        loadedMonths: new Set,
        poolsLoaded: new Set,
        noOffer: null
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
    function readCache() {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            const now = Date.now();
            let changed = !1;
            Object.keys(parsed).forEach(route => {
                Object.keys(parsed[route]).forEach(month => {
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
                if (!Object.keys(parsed[route]).length) {
                    delete parsed[route];
                    changed = !0;
                }
            });
            changed && localStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
            return parsed;
        } catch (e) {
            return {};
        }
    }
    const MAX_ROUTES = 8;
    const newestTs = r => Math.max(0, ...Object.keys(r || {}).map(m => (r[m] || {}).ts || 0));
    function writeCache(routeKey, month, days, pools) {
        const cache = readCache();
        cache[routeKey] || (cache[routeKey] = {});
        cache[routeKey][month] = {
            v: CACHE_FORMAT,
            ts: Date.now(),
            pools: pools || [],
            days: days
        };
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
        } catch (e) {}
        rawReplies.clear();
        state.days = [];
        state.loadedMonths.clear();
        state.poolsLoaded.clear();
        emit();
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
                d && (key += "@" + d);
                body.selectedBoundId && (key += "#" + body.selectedBoundId);
            }
            return key;
        } catch (e) {
            return null;
        }
    }
    function switchRoute(routeKey) {
        if (routeKey) {
            if (state.routeKey && state.routeKey !== routeKey) {
                state.days = [];
                state.loadedMonths.clear();
                state.poolsLoaded.clear();
                state.hydratedRoute = null;
                state.route = null;
                state.noOffer = null;
            }
            state.routeKey = routeKey;
            !function(routeKey) {
                if (!routeKey || state.hydratedRoute === routeKey) return;
                state.hydratedRoute = routeKey;
                state.routeKey = routeKey;
                const months = readCache()[routeKey];
                if (!months) return;
                let restored = 0;
                Object.keys(months).forEach(month => {
                    const entry = months[month];
                    if (!entry || !Array.isArray(entry.days)) return;
                    const byDate = new Map(state.days.map(d => [ d.date, d ]));
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
    const poolsMissing = month => POOLS.filter(p => !state.poolsLoaded.has(poolKey(month, p)));
    const poolsHave = month => POOLS.filter(p => state.poolsLoaded.has(poolKey(month, p)));
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
                const unit = Array.isArray(p) ? p[0] : p.unitPrices ? p.unitPrices[0] : null;
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
        days.forEach(incoming => {
            const existing = byDate.get(incoming.date);
            if (!existing) {
                byDate.set(incoming.date, {
                    date: incoming.date,
                    available: incoming.available,
                    reason: incoming.reason,
                    fares: incoming.available ? [ {
                        code: incoming.fareFamilyCode,
                        cabin: incoming.cabin,
                        miles: incoming.miles,
                        taxes: incoming.taxes,
                        currency: incoming.currency
                    } ] : []
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
                    existing.fares.sort((a, b) => (a.miles ?? 1 / 0) - (b.miles ?? 1 / 0));
                }
            } else {
                existing.fares.push({
                    code: incoming.fareFamilyCode,
                    cabin: incoming.cabin,
                    miles: incoming.miles,
                    taxes: incoming.taxes,
                    currency: incoming.currency
                });
                existing.fares.sort((a, b) => (a.miles ?? 1 / 0) - (b.miles ?? 1 / 0));
            }
        });
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
                        String(state.routeKey || "").split("@")[0].split("#")[0] !== base && switchRoute(base);
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
                    const b = requestedBoundOf(json);
                    state.route = b.originLocationCode + "-" + b.destinationLocationCode;
                    state.routeKey = state.routeKey || state.route;
                } catch (e) {}
                const rk = state.routeKey || state.route;
                rk && new Set(days.map(d => d.date.slice(0, 7))).forEach(month => {
                    const monthDays = state.days.filter(d => d.date.startsWith(month + "-"));
                    writeCache(rk, month, monthDays, poolsHave(month));
                });
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
                state.requests++;
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
            let rk = null;
            try {
                rk = routeKeyOf(JSON.parse(body));
            } catch (e) {}
            if (rk) {
                switchRoute(rk);
                state.searchingSince = Date.now();
                emit();
            }
        },
        searchSettled: searchSettled
    };
    if (!window.__mmCalHooked) {
        window.__mmCalHooked = !0;
        const baseFetch = window.fetch;
        const h = () => window.__mmCalHooks || {};
        window.fetch = async function(...args) {
            let url = "string" == typeof args[0] ? args[0] : args[0] && args[0].url || "";
            const isCal = CAL_RE.test(url);
            if (!isCal) try {
                const c = h();
                c.noteSearch && c.noteSearch(url, (args[1] || {}).body);
            } catch (e) {}
            if (isCal) try {
                const init = args[1] || {};
                if ("string" == typeof init.body) {
                    const c = h();
                    c.state.pendingTemplate = {
                        url: url,
                        method: init.method || "POST",
                        headers: c.headersToObject(init.headers),
                        body: init.body
                    };
                    c.switchRoute(c.routeKeyOf(JSON.parse(init.body)));
                    if (c.calendarOn()) {
                        const widened = c.widenRequest(init.body);
                        if (widened) {
                            init.body = widened;
                            args[1] = init;
                            c.state.pendingTemplate.body = widened;
                        }
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
                    return new Response(hit, {
                        status: 200,
                        headers: {
                            "content-type": "application/json"
                        }
                    });
                }
                const res = await baseFetch.apply(this, args);
                if (res.ok && c.state.pendingTemplate) {
                    c.state.template = c.state.pendingTemplate;
                    c.state.pendingTemplate = null;
                } else res.ok || (c.state.pendingTemplate = null);
                res.clone().text().then(text => {
                    key && res.ok && c.rememberRaw(key, text);
                    try {
                        h().ingest(JSON.parse(text), (args[1] || {}).body);
                    } catch (e) {}
                }).catch(e => {});
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
            this.__mmCalHeaders && (this.__mmCalHeaders[name] = value);
            return XH.call(this, name, value);
        };
        XMLHttpRequest.prototype.send = function(body) {
            if (!CAL_RE.test(this.__mmCalUrl || "")) try {
                const c = h();
                c.noteSearch && c.noteSearch(this.__mmCalUrl, body);
            } catch (e) {}
            if (CAL_RE.test(this.__mmCalUrl || "")) {
                const c = h();
                if ("string" == typeof body) {
                    c.state.pendingTemplate = {
                        url: this.__mmCalUrl,
                        method: this.__mmCalMethod || "POST",
                        headers: {
                            ...this.__mmCalHeaders || {}
                        },
                        body: body
                    };
                    try {
                        c.switchRoute(c.routeKeyOf(JSON.parse(body)));
                    } catch (e) {}
                    if (c.calendarOn()) {
                        const widened = c.widenRequest(body);
                        if (widened) {
                            body = widened;
                            c.state.pendingTemplate.body = widened;
                        }
                    }
                }
                const sentBody = body;
                this.addEventListener("load", () => {
                    const c2 = h();
                    if (this.status >= 200 && this.status < 300) {
                        if (c2.state.pendingTemplate) {
                            c2.state.template = c2.state.pendingTemplate;
                            c2.state.pendingTemplate = null;
                        }
                    } else c2.state.pendingTemplate = null;
                    try {
                        h().ingest(JSON.parse(this.responseText), sentBody);
                    } catch (e) {}
                });
            }
            return XS.call(this, body);
        };
    }
    state.loadMonth = async function(year, month, opts = {}) {
        const key = monthKey(year, month);
        if (null === firstLoadableDay(year, month)) return "cached";
        const allPools = void 0 !== opts.allPools ? opts.allPools : state.allCabins;
        const pools = allPools ? poolsMissing(key) : [ null ];
        if (!allPools && state.hasMonth(year, month)) return "cached";
        if (allPools && !pools.length) return "cached";
        if (state.loading) return "busy";
        if (!state.template) {
            state.error = "Noch keine Suchvorlage. Bitte einmal eine Suche ausführen.";
            emit();
            return "error";
        }
        state.loading = key;
        state.error = null;
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
            const centres = [];
            for (let d = firstDay; d <= daysInMonth; d += span) {
                let c = new Date(year, month, Math.min(d + flex, daysInMonth));
                c < today && (c = today);
                centres.push(c);
            }
            state.progress = {
                done: 0,
                total: pools.length * centres.length
            };
            const results = await Promise.all(pools.map(async pool => {
                const headers = {
                    ...state.template.headers
                };
                const poolBody = JSON.parse(state.template.body);
                const poolIt = requestedItin(poolBody);
                if (pool) {
                    Object.keys(headers).forEach(k => {
                        "ama-client-facts" === k.toLowerCase() && delete headers[k];
                    });
                    headers["ama-client-facts"] = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0." + (s = JSON.stringify({
                        sub: "fact",
                        cabin: pool,
                        isCompanion: "true"
                    }), btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")) + ".";
                    delete poolBody.selectedBoundId;
                }
                var s;
                let okCount = 0, lastStatus = null, lastFailed = null;
                for (const c of centres) {
                    poolIt.departureDateTime = `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, "0")}-` + `${String(c.getDate()).padStart(2, "0")}T00:00:00.000`;
                    poolIt.flexibility = flex;
                    try {
                        const res = await originalFetch(state.template.url, {
                            method: state.template.method,
                            headers: headers,
                            body: JSON.stringify(poolBody),
                            credentials: "include"
                        });
                        if (!res.ok) {
                            lastStatus = res.status;
                            continue;
                        }
                        const json = await res.json();
                        if (state.routeKey !== routeAtStart) return {
                            stale: !0
                        };
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
                        lastFailed = e && e.message || "Netzwerkfehler";
                        break;
                    }
                }
                if (!okCount) return lastStatus ? {
                    status: lastStatus,
                    pool: pool
                } : {
                    failed: lastFailed || "Netzwerkfehler",
                    pool: pool
                };
                pool && state.poolsLoaded.add(poolKey(key, pool));
                return {
                    ok: !0,
                    pool: pool
                };
            }));
            if (state.routeKey !== routeAtStart) return "stale";
            if (!results.filter(r => r.ok).length) {
                const s = results.find(r => r.status);
                const f = results.find(r => r.failed);
                state.error = s && 429 === s.status ? "Zu viele Anfragen. Bitte kurz warten." : !s || 401 !== s.status && 403 !== s.status ? s ? `Laden fehlgeschlagen (${s.status})` : `Laden fehlgeschlagen: ${f ? f.failed : "unbekannt"}` : "Sitzung abgelaufen. Bitte Seite neu laden.";
                return "error";
            }
            if (state.routeKey !== routeAtStart) return "stale";
            state.loadedMonths.add(key);
            const rk = routeKeyOf(body) || state.routeKey;
            if (rk) {
                const monthDays = state.days.filter(d => d.date && d.date.startsWith(key + "-"));
                writeCache(rk, key, monthDays, poolsHave(key));
            }
            return "loaded";
        } catch (e) {
            state.error = "Laden fehlgeschlagen: " + (e.message || e);
            return "error";
        } finally {
            state.loading = null;
            state.progress = null;
            emit();
        }
    };
    state.hasMonth = (year, month) => state.loadedMonths.has(monthKey(year, month)) || isMonthComplete(year, month);
    state.hasAllPools = (year, month) => null === firstLoadableDay(year, month) || 0 === poolsMissing(monthKey(year, month)).length;
    state.summary = () => ({
        version: state.version,
        route: state.route,
        requests: state.requests,
        responses: state.responses,
        dayCount: state.days.length,
        span: state.days.length ? [ state.days[0].date, state.days[state.days.length - 1].date ] : null,
        codes: state.days.reduce((a, d) => {
            if (!d.fares || !d.fares.length) {
                a.unavailable = (a.unavailable || 0) + 1;
                return a;
            }
            d.fares.forEach(f => {
                a[f.code] = (a[f.code] || 0) + 1;
            });
            return a;
        }, {}),
        maxFaresPerDay: state.days.reduce((m, d) => Math.max(m, (d.fares || []).length), 0),
        sample: state.days.filter(d => d.fares && d.fares.length).slice(0, 3)
    });
})();

(() => {
    "use strict";
    const VERSION = 10;
    if (window.__mmBBD && window.__mmBBD.version >= VERSION) return;
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
    const KEY = "agGBZmuTGwFXWzVDg8ckGKGBytemE1nS";
    const CFF = {
        eco: "CFFECOINS2",
        ecoPremium: "CFFPECOIN2",
        business: "CFFBUSINS2",
        first: "CFFFIRSIN2"
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
    const niceAirline = (code, name) => {
        try {
            const fd = window.__mmBounds || window.__mmFD;
            if (fd && fd.airlineName) return fd.airlineName(code, name);
        } catch (e) {}
        return String(name || code || "").replace(/\s*[-–].*$/, "").split(/\s+/).slice(0, 3).join(" ").replace(/[A-ZÄÖÜ][A-ZÄÖÜ]+/g, w => w[0] + w.slice(1).toLowerCase());
    };
    const currencyOfCountry = cc => CURRENCY[cc] || "EUR";
    const originalFetch = window.fetch;
    const CACHE_KEY = "mmbbd_cache";
    const TTL_MS = 6 * 60 * 60 * 1e3;
    const CACHE_FORMAT = 2;
    const state = {
        version: VERSION,
        superseded: !1,
        route: null,
        days: [],
        loading: !1,
        error: null,
        calls: 0,
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
    function readCache() {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return {};
            const j = JSON.parse(raw);
            const now = Date.now();
            let dropped = !1;
            for (const k of Object.keys(j)) if (!j[k] || (j[k].v || 1) !== CACHE_FORMAT || !j[k].ts || now - j[k].ts > TTL_MS) {
                delete j[k];
                dropped = !0;
            }
            dropped && localStorage.setItem(CACHE_KEY, JSON.stringify(j));
            return j;
        } catch (e) {
            return {};
        }
    }
    const MAX_ROUTES = 8;
    let inflight = null;
    async function load(route) {
        const [origin, dest] = String(route || "").split("-");
        if (!origin || !dest) return;
        try {
            inflight && inflight.abort();
        } catch (e) {}
        inflight = null;
        const cached = readCache()[route];
        if (cached) {
            state.route = route;
            state.days = cached.days;
            byDate = null;
            state.error = null;
            state.loading = !1;
            emit();
            return;
        }
        const cc = (iata => {
            for (const h of [ window.__mmBounds, window.__mmCal ]) try {
                const loc = h && h.dictionaries && h.dictionaries.location;
                const c = loc && loc[iata] && loc[iata].countryCode;
                if (c) return c;
            } catch (e) {}
            return COUNTRY[iata] || null;
        })(origin);
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
        state.route = route;
        state.days = [];
        byDate = null;
        emit();
        try {
            const start = (() => {
                const d = new Date;
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            })();
            let failed = 0, aborted = !1;
            const lists = await Promise.all(Object.keys(CFF).map(cab => async function(origin, dest, cabin, startDate, cc, signal) {
                const body = JSON.stringify({
                    commercialFareFamilies: [ CFF[cabin] ],
                    corporateCodes: [ 223293 ],
                    countryOfCommencement: cc,
                    currencyCode: currencyOfCountry(cc),
                    itineraries: [ {
                        departureDateTime: startDate + "T00:00:00",
                        originLocationCode: origin,
                        destinationLocationCode: dest
                    } ],
                    tripDetails: {
                        rangeOfDeparture: 360
                    }
                });
                state.calls++;
                const res = await originalFetch.call(window, URL_, {
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
                const fd = j.dictionaries && j.dictionaries.flight || {};
                const names = j.dictionaries && j.dictionaries.airline || {};
                const curDict = j.dictionaries && j.dictionaries.currency || {};
                const amount = (v, code) => {
                    if (null == v) return null;
                    const dp = (curDict[code] || {}).decimalPlaces;
                    return v / Math.pow(10, null == dp ? 2 : dp);
                };
                const carrier = {};
                Object.keys(fd).forEach(id => {
                    const f = fd[id];
                    if (!f || !f.arrival || f.arrival.locationCode !== dest) return;
                    const d = (f.departure && f.departure.dateTime || "").slice(0, 10);
                    d && (carrier[d] = {
                        code: f.marketingAirlineCode || null,
                        name: names[f.marketingAirlineCode] || null,
                        via: f.departure.locationCode || null
                    });
                });
                return (j.data || []).map(e => {
                    const date = String(e.departureDate || "").slice(0, 10);
                    const p = e.prices || {};
                    const miles = p.milesConversion && p.milesConversion.convertedMiles ? p.milesConversion.convertedMiles.base : null;
                    const tp = p.totalPrices && p.totalPrices[0] || {};
                    const c = carrier[date] || null;
                    return null != miles ? {
                        date: date,
                        cabin: cabin,
                        code: e.fareFamilyCode,
                        miles: miles,
                        taxes: amount(tp.totalTaxes, tp.currencyCode),
                        currency: tp.currencyCode || null,
                        airline: c ? niceAirline(c.code, c.name) : null,
                        via: c ? c.via : null
                    } : null;
                }).filter(Boolean);
            }(origin, dest, cab, start, cc, ctrl ? ctrl.signal : void 0).catch(e => {
                e && "AbortError" === e.name ? aborted = !0 : failed++;
                return [];
            })));
            if (aborted || ctrl && inflight !== ctrl || state.superseded || state.route !== route) return;
            const best = new Map;
            lists.flat().forEach(r => {
                const k = r.date + "|" + r.cabin;
                const prev = best.get(k);
                (!prev || r.miles < prev.miles) && best.set(k, r);
            });
            state.days = [ ...best.values() ].sort((a, b) => a.date.localeCompare(b.date));
            byDate = null;
            state.error = failed ? failed + " von 4 Kabinen nicht erreichbar" : null;
            failed || function(route, days) {
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
            }(route, state.days);
        } catch (e) {
            e && "AbortError" === e.name || (state.error = "BBD nicht erreichbar");
        } finally {
            if (!ctrl || inflight === ctrl) {
                inflight = null;
                if (!state.superseded && state.route === route) {
                    state.loading = !1;
                    emit();
                }
            }
        }
    }
    let byDate = null;
    state.forDate = dateStr => (byDate || function() {
        byDate = new Map;
        for (const d of state.days) {
            let day = byDate.get(d.date);
            if (!day) {
                day = {};
                byDate.set(d.date, day);
            }
            const prev = day[d.cabin];
            (!prev || d.miles < prev.miles) && (day[d.cabin] = d);
        }
        return byDate;
    }()).get(dateStr) || {};
    state.clearCache = () => {
        try {
            localStorage.removeItem(CACHE_KEY);
        } catch (e) {}
    };
    state.reload = () => {
        if (state.route) {
            try {
                const j = readCache();
                delete j[state.route];
                localStorage.setItem(CACHE_KEY, JSON.stringify(j));
            } catch (e) {}
            load(state.route);
        }
    };
    function syncRoute() {
        if (state.superseded || !calendarOn() || !bbdOn()) return;
        const cal = window.__mmCal;
        const raw = cal && (cal.route || cal.routeKey);
        const route = raw && raw.split("@")[0].split("#")[0];
        route && route !== state.route && load(route);
    }
    window.__mmCal && window.__mmCal.onUpdate && (state._off = window.__mmCal.onUpdate(syncRoute));
    syncRoute();
    let tries = 0;
    const t = setInterval(() => {
        if (state.superseded || state._off && state.route || ++tries > 20) clearInterval(t); else {
            window.__mmCal && !state._off && window.__mmCal.onUpdate && (state._off = window.__mmCal.onUpdate(syncRoute));
            syncRoute();
        }
    }, 500);
    t && "function" == typeof t.unref && t.unref();
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
                clearInterval(t);
            }
        });
        window.addEventListener("pageshow", e => {
            if (e && e.persisted && state.superseded && window.__mmBBD === state) {
                state.superseded = !1;
                !state._off && window.__mmCal && window.__mmCal.onUpdate && (state._off = window.__mmCal.onUpdate(syncRoute));
                syncRoute();
            }
        });
    } catch (e) {}
    state.summary = () => ({
        version: state.version,
        route: state.route,
        days: state.days.length,
        calls: state.calls,
        loading: state.loading,
        error: state.error,
        cabins: state.days.reduce((a, d) => {
            a[d.cabin] = (a[d.cabin] || 0) + 1;
            return a;
        }, {})
    });
})();

(() => {
    "use strict";
    const VERSION = 75;
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
    const INK_primary = "#05164D", INK_secondary = "#52514e", INK_muted = "#898781", INK_hairline = "#e1e0d9";
    const CUR_SYMBOL = {
        EUR: "€",
        USD: "$",
        GBP: "£",
        JPY: "¥"
    };
    const curSym = c => CUR_SYMBOL[c] || c || "€";
    const SEARCH_KEY = "airBoundsSearch";
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
            const o = JSON.parse(sessionStorage.getItem(SEARCH_KEY));
            const its = o.entities[o.selectedAirBoundsSearchId].itineraries || [];
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
    function boundLabel() {
        try {
            const o = JSON.parse(sessionStorage.getItem(SEARCH_KEY));
            return (o.entities[o.selectedAirBoundsSearchId].itineraries || []).length < 2 ? "" : '<span class="mmcal-bound">' + (activeBoundIdx() > 0 ? "Rückflug:" : "Hinflug:") + "</span>";
        } catch (e) {
            return "";
        }
    }
    function currentSearchDate() {
        try {
            for (const b of document.querySelectorAll("refx-calendar-cont button.calendar-btn")) {
                if (!/selected date|ausgewählt/i.test(b.textContent || "")) continue;
                const ds = stripBtnDate(b);
                if (ds) return ds;
            }
        } catch (e) {}
        try {
            const raw = sessionStorage.getItem(SEARCH_KEY);
            const j = JSON.parse(raw);
            const its = j.entities[j.selectedAirBoundsSearchId].itineraries;
            const it = its[Math.min(activeBoundIdx(), its.length - 1)];
            const cal = window.__mmCal;
            const base = String(cal && (cal.routeKey || cal.route) || "").split("@")[0].split("#")[0];
            const storeRoute = it.originLocationCode && it.destinationLocationCode ? it.originLocationCode + "-" + it.destinationLocationCode : null;
            return base && storeRoute && storeRoute !== base ? null : it.departureDateTime.slice(0, 10);
        } catch (e) {
            return null;
        }
    }
    const SPAN = 15, STEP = 7;
    function windowFloor() {
        let floor = (() => {
            const t = new Date;
            t.setHours(0, 0, 0, 0);
            return t;
        })();
        if (activeBoundIdx() > 0) try {
            const o = JSON.parse(sessionStorage.getItem(SEARCH_KEY));
            const out = parseISO(String((o.entities[o.selectedAirBoundsSearchId].itineraries || [])[0].departureDateTime).slice(0, 10));
            out > floor && (floor = out);
        } catch (e) {}
        return floor;
    }
    function minOffset() {
        const anchor = state.selectedDate || currentSearchDate() || iso(new Date);
        return Math.round((windowFloor() - parseISO(anchor)) / 864e5) + 7;
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
    function cellsFor(days, dateStr) {
        const out = {};
        const cabKey = (c, fallback) => c && CABIN_META[c] ? c : fallback;
        const bbd = bbdShown() ? window.__mmBBD : null;
        if (bbd && !bbd.superseded && bbd.days && bbd.days.length) {
            const b = bbd.forDate(dateStr);
            for (const cab of Object.keys(b)) {
                const x = b[cab];
                const fare = describeFare(x.code, cab);
                fare && (out[cabKey(cab, cabKey(fare.cabin, "eco"))] = {
                    fare: fare,
                    miles: x.miles,
                    taxes: x.taxes,
                    currency: x.currency,
                    src: "bbd",
                    airline: x.airline,
                    via: x.via
                });
            }
        }
        const rec = days.get(dateStr);
        if (rec && rec.available && rec.fares) for (const f of rec.fares) {
            const fare = describeFare(f.code, f.cabin);
            if (!fare) continue;
            const cab = cabKey(fare.cabin, "eco");
            const prev = out[cab];
            prev && prev.miles <= f.miles || (out[cab] = {
                fare: fare,
                miles: f.miles,
                taxes: f.taxes,
                currency: f.currency,
                src: "cal"
            });
        }
        return out;
    }
    function wireFoldBtn() {
        const b = state.root && state.root.querySelector("[data-fold]");
        b && b.addEventListener("click", () => function(on) {
            state.folded = !!on;
            try {
                localStorage.setItem(FOLD_KEY, on ? "1" : "0");
            } catch (e) {}
            render();
        }(!state.folded));
    }
    function render() {
        const cal = window.__mmCal;
        if (!state.root || !cal) return;
        syncAnchorToSearch();
        if (state.folded) {
            state.root.classList.add("is-folded");
            state.root.innerHTML = '<div class="mmcal-head">' + '<span class="mmcal-route">' + boundLabel() + esc((cal.route || "").replace("-", " → ")) + "</span>" + '<span class="mmcal-nav">' + '<button type="button" class="mmcal-btn is-wide" data-fold="1" aria-expanded="false">' + "Kalender zeigen ▾</button>" + "</span>" + "</div>";
            wireFoldBtn();
            return;
        }
        state.root.classList.remove("is-folded");
        const days = new Map(cal.days.map(d => [ d.date, d ]));
        const searchDate = currentSearchDate();
        const frameDate = state.selectedDate || searchDate;
        const deadDays = activeBoundIdx() > 0 ? (() => {
            const dead = function() {
                const dead = new Set;
                document.querySelectorAll("refx-calendar-cont button.calendar-btn").forEach(b => {
                    if (!b.disabled) return;
                    const ds = stripBtnDate(b);
                    ds && dead.add(ds);
                });
                return dead;
            }();
            try {
                cal.noOffer && cal.noOffer.days && cal.noOffer.days.forEach(d => dead.add(d));
            } catch (e) {}
            return dead;
        })() : null;
        const start = windowStart();
        const atStart = iso(start) === iso(windowFloor());
        const win = [];
        for (let i = 0; i < SPAN; i++) {
            const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
            const dateStr = iso(d);
            win.push({
                d: d,
                dateStr: dateStr,
                cells: cellsFor(days, dateStr),
                dead: !(!deadDays || !deadDays.has(dateStr))
            });
        }
        const cols = `92px repeat(${SPAN}, minmax(52px, 1fr))`;
        const startsMonth = win.map((w, i) => 0 === i || w.d.getMonth() !== win[i - 1].d.getMonth());
        const monthPhase = new Map;
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
        });
        const waiting = dateStr => (!!cal.loading || autoRunning) && "done" !== monthPhase.get(dateStr.slice(0, 7));
        const DOW = [ "So", "Mo", "Di", "Mi", "Do", "Fr", "Sa" ];
        const longDate = dt => dt.toLocaleDateString("de-DE", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
        let band = "<div></div>";
        for (let i = 0; i < win.length; ) {
            let j = i + 1;
            for (;j < win.length && !startsMonth[j]; ) j++;
            const dt = win[i].d;
            const wide = j - i >= 3;
            const showYear = 0 === i || dt.getFullYear() !== win[i - 1].d.getFullYear();
            band += '<div class="mmcal-mo' + (i > 0 ? " mmcal-newmo" : "") + '" style="grid-column: span ' + (j - i) + '" title="' + dt.toLocaleDateString("de-DE", {
                month: "long",
                year: "numeric"
            }) + '">' + (wide ? dt.toLocaleDateString("de-DE", {
                month: "long"
            }) + (showYear ? ' <span class="yr">' + dt.getFullYear() + "</span>" : "") : dt.toLocaleDateString("de-DE", {
                month: "short"
            })) + "</div>";
            i = j;
        }
        let heads = "<div></div>";
        win.forEach((w, i) => {
            const any = Object.keys(w.cells).length;
            heads += '<button type="button" class="mmcal-hd' + (w.dateStr === frameDate ? " is-sel" : "") + (w.dead ? " is-dead" : "") + (any || waiting(w.dateStr) ? "" : " is-empty") + (startsMonth[i] && i > 0 ? " mmcal-newmo" : "") + '" data-date="' + w.dateStr + '" title="' + longDate(w.d) + (w.dead ? " — mit dem gewählten Hinflug kein Angebot" : "") + '">' + '<span class="mmcal-dw">' + DOW[w.d.getDay()] + "</span>" + '<span class="mmcal-dn">' + w.d.getDate() + "</span></button>";
        });
        const order = [ "eco", "ecoPremium", "business", "first" ];
        let rows = "";
        const cabinsPresent = new Set;
        for (const cab of order) {
            const meta = CABIN_META[cab];
            rows += '<div class="mmcal-rl"><span class="mmcal-pip" style="background:' + meta.color + '"></span>' + meta.short + "</div>";
            win.forEach((w, i) => {
                const nm = startsMonth[i] && i > 0 ? " mmcal-newmo" : "";
                const x = w.cells[cab];
                if (!x) {
                    const wait = waiting(w.dateStr);
                    rows += '<button type="button" class="mmcal-c is-none' + nm + (wait ? " is-wait" : "") + (w.dead ? " is-deadday" : "") + (state.navigating === w.dateStr ? " is-busy" : "") + '" style="--mc:' + meta.color + '" data-date="' + w.dateStr + '" data-cabin="' + cab + '" title="' + esc(longDate(w.d) + "\n" + meta.full + (wait ? ": wird geladen …" : ": kein bekannter Preis" + "\nKlicken startet die Suche für diesen Tag.") + (w.dead ? "\nMit dem gewählten Hinflug kein Angebot an diesem Tag." : "")) + '">' + '<span class="mmcal-dash">–</span></button>';
                    return;
                }
                cabinsPresent.add(cab);
                const isBbd = "bbd" === x.src;
                const eur = (() => {
                    try {
                        return null != x.taxes && window.__mmCurrency ? window.__mmCurrency.eurLabel(x.taxes, x.currency) : "";
                    } catch (e) {
                        return "";
                    }
                })();
                const eurVal = (() => {
                    try {
                        return null != x.taxes && x.currency && "EUR" !== x.currency && window.__mmCurrency ? window.__mmCurrency.toEUR(x.taxes, x.currency) : null;
                    } catch (e) {
                        return null;
                    }
                })();
                const tipTax = null != x.taxes ? "\nZuzahlung " + Math.round(x.taxes) + " " + curSym(x.currency) + (eur ? " (" + eur + ")" : "") : "";
                const tip = esc(longDate(w.d) + "\n" + meta.full + " " + (x.fare.tier || "") + tipTax + "\nQuelle: " + (isBbd ? "Best-by-Day" : "Kalender") + (isBbd && x.airline ? "\n" + x.airline + (x.via ? " via " + x.via : "") : "") + (w.dead ? "\nMit dem gewählten Hinflug kein Angebot an diesem Tag." : ""));
                rows += '<button type="button" class="mmcal-c ' + (isBbd ? "is-bbd" : "is-cal") + nm + (w.dead ? " is-deadday" : "") + (state.navigating === w.dateStr ? " is-busy" : "") + '" style="--mc:' + meta.color + '" data-date="' + w.dateStr + '" data-cabin="' + cab + '" title="' + tip + '">' + '<span class="mmcal-tier">' + esc(x.fare.tier || "") + "</span>" + '<span class="mmcal-miles">' + esc(null == (n = x.miles) ? "" : n.toLocaleString("de-DE")) + "</span>" + (null != x.taxes ? '<span class="mmcal-tax">+ ' + (null != eurVal ? Math.round(eurVal) + "&nbsp;€" : Math.round(x.taxes) + "&nbsp;" + esc(curSym(x.currency))) + "</span>" : "") + "</button>";
                var n;
            });
        }
        const known = win.filter(w => Object.keys(w.cells).length).length;
        const searching = !cal.loading && cal.searchingSince && Date.now() - cal.searchingSince < 45e3;
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
        const isLoading = !!cal.loading || !!searching;
        const showOverlay = !(!searching && !cal.loading || known);
        const loadingMonth = (() => {
            const m = /^(\d{4})-(\d{2})$/.exec(String(cal.loading || ""));
            return m ? new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleDateString("de-DE", {
                month: "long",
                year: "numeric"
            }) : "";
        })();
        const loadingText = (cal.progress && cal.progress.total > 1 ? "Kabinen werden geladen … " + cal.progress.done + "/" + cal.progress.total : "Preise werden geladen …") + (loadingMonth ? " · " + loadingMonth : "");
        const selIdx = win.findIndex(w => w.dateStr === searchDate);
        let body = '<div class="mmcal-scroll"><div class="mmcal-grid" style="grid-template-columns:' + cols + '">' + band + heads + rows + (selIdx < 0 ? "" : '<div class="mmcal-selframe" style="grid-column:' + (selIdx + 2) + " / " + (selIdx + 3) + ";grid-row:2 / " + (3 + order.length) + '"></div>') + "</div></div>" + (showOverlay ? '<div class="mmcal-overlay"><span class="mmcal-spinner"></span>' + loadingText + "</div>" : "");
        if (known || isLoading) known && cal.error && !isLoading && (body += '<div class="mmcal-errline">' + esc(cal.error) + ' <button type="button" class="mmcal-linkbtn" data-load="1">Erneut versuchen</button></div>'); else {
            const span = function(a, b) {
                const opts = {
                    day: "numeric",
                    month: "long"
                };
                return (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear() ? a.getDate() + "." : a.toLocaleDateString("de-DE", opts)) + " – " + b.toLocaleDateString("de-DE", {
                    ...opts,
                    year: "numeric"
                });
            }(win[0].d, win[win.length - 1].d);
            body += cal.error ? '<div class="mmcal-msg mmcal-err">' + esc(cal.error) + ' <button type="button" class="mmcal-btn is-wide" data-load="1">Erneut versuchen</button></div>' : function(win) {
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
            }(win) ? '<div class="mmcal-msg">Keine Prämienflüge vom ' + span + ".</div>" : '<div class="mmcal-msg">Für ' + span + " sind noch keine Preise geladen. " + '<button type="button" class="mmcal-btn is-wide" data-load="1">Preise laden</button></div>';
        }
        state.pickNotice && (body += '<div class="mmcal-noteline">' + esc(state.pickNotice) + "</div>");
        const legend = order.filter(c => cabinsPresent.has(c)).map(c => '<span class="mmcal-legend-item"><span class="mmcal-pip" style="background:' + CABIN_META[c].color + '"></span>' + CABIN_META[c].full + "</span>").join("");
        const wantAll = !!cal.allCabins;
        const route = boundLabel() + esc((cal.route || "").replace("-", " → "));
        state.root.innerHTML = '<div class="mmcal-head">' + '<span class="mmcal-route">' + route + "</span>" + (isLoading && known ? '<span class="mmcal-spinner mmcal-headspin" title="' + esc(loadingText) + '"></span>' : "") + '<span class="mmcal-nav">' + '<button type="button" class="mmcal-btn" data-nav="-1"' + (isLoading || atStart ? " disabled" : "") + ' aria-label="7 Tage zurück">‹</button>' + '<button type="button" class="mmcal-btn is-wide" data-nav="0"' + (isLoading || !state.dayOffset ? " disabled" : "") + ">zum Suchdatum</button>" + '<button type="button" class="mmcal-btn" data-nav="1"' + (isLoading ? " disabled" : "") + ' aria-label="7 Tage weiter">›</button>' + '<button type="button" class="mmcal-btn mmcal-fold" data-fold="1" aria-expanded="true"' + ' aria-label="Kalender einklappen" title="Kalender einklappen">▴</button>' + "</span>" + "</div>" + '<div class="mmcal-body">' + body + "</div>" + '<div class="mmcal-foot">' + '<span class="mmcal-legend">' + (legend || "<span>keine Verfügbarkeit im Zeitraum</span>") + "</span>" + '<button type="button" class="mmcal-pool" data-pools="1" aria-pressed="' + wantAll + '"' + (isLoading ? " disabled" : "") + ' title="Lädt die Preise aller vier Kabinen. Das sind vier Abfragen statt einer.">' + (wantAll ? "☑" : "☐") + " Alle Kabinen</button>" + '<button type="button" class="mmcal-linkbtn" data-clear="1"' + (isLoading ? " disabled" : "") + ">Cache leeren</button>" + "</div>";
        const loadBtn = state.root.querySelector("[data-load]");
        loadBtn && loadBtn.addEventListener("click", () => ensureMonthLoaded());
        const poolsBtn = state.root.querySelector("[data-pools]");
        poolsBtn && poolsBtn.addEventListener("click", () => {
            const on = !cal.allCabins;
            cal.setAllCabins(on);
            on && ensureMonthLoaded();
        });
        const clearBtn = state.root.querySelector("[data-clear]");
        clearBtn && clearBtn.addEventListener("click", () => {
            cal.clearCache();
            ensureMonthLoaded();
        });
        wireFoldBtn();
        state.root.querySelectorAll("[data-nav]").forEach(b => {
            b.addEventListener("click", () => {
                const v = Number(b.dataset.nav);
                state.dayOffset = 0 === v ? 0 : Math.max(minOffset(), state.dayOffset + v * STEP);
                render();
                ensureMonthLoaded();
            });
        });
        state.root.querySelectorAll("[data-date]").forEach(b => {
            b.addEventListener("click", () => selectDate(b.dataset.date, b.dataset.cabin));
        });
    }
    function viewedMonths() {
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
    }
    function monthDone(cal, m) {
        return cal.allCabins && "function" == typeof cal.hasAllPools ? cal.hasAllPools(m.y, m.m) : cal.hasMonth(m.y, m.m);
    }
    async function ensureMonthLoaded() {
        const cal = window.__mmCal;
        if (cal && cal.loadMonth) for (const m of viewedMonths()) monthDone(cal, m) || await cal.loadMonth(m.y, m.m);
    }
    const autoTried = new Set;
    const autoFails = new Map;
    const MAX_AUTO_FAILS = 3;
    const AUTO_BACKOFF_MS = 15e3;
    let autoBlockedUntil = 0;
    let autoRunning = !1;
    async function autoLoad() {
        const cal = window.__mmCal;
        if (!autoRunning && cal && cal.loadMonth && cal.route && !cal.loading && (state.selectedDate || currentSearchDate()) && !(Date.now() < autoBlockedUntil)) {
            autoRunning = !0;
            try {
                for (const m of viewedMonths()) {
                    const key = cal.route + "|" + m.k;
                    if (autoTried.has(key) || monthDone(cal, m)) continue;
                    const r = await cal.loadMonth(m.y, m.m);
                    if ("busy" === r || "stale" === r) continue;
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
            }
        }
    }
    function until(fn, ms) {
        return new Promise(resolve => {
            const t0 = Date.now();
            const tick = () => {
                const v = fn();
                if (v) return resolve(v);
                if (Date.now() - t0 > ms) return resolve(null);
                setTimeout(tick, 60);
            };
            tick();
        });
    }
    const nativeSetter = (el, value) => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, value);
        el.dispatchEvent(new Event("input", {
            bubbles: !0
        }));
    };
    const DATE_FORMATS = [ d => pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear(), d => pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear(), d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) ];
    const pad = n => String(n).padStart(2, "0");
    const settled = () => new Promise(r => setTimeout(r, 40));
    function dateAccepted(input) {
        const host = input.closest("mat-form-field") || input;
        return !input.classList.contains("ng-invalid") && !host.classList.contains("mat-form-field-invalid");
    }
    async function runNativeSearch(opts) {
        if (!await async function() {
            const form = () => document.querySelector("form.modify-search-form");
            if (form()) return form();
            const header = document.querySelector("refx-modify-search-cont mat-expansion-panel-header, aside.modify-search-wrapper mat-expansion-panel-header");
            if (!header) return null;
            header.click();
            return await until(form, 2e3);
        }()) return !1;
        if (opts.cabin && !await async function(apiCabin) {
            const want = CABIN_OPTION[apiCabin];
            if (!want) return !1;
            if (readNativeCabin() === apiCabin) return !0;
            const sel = document.querySelector("form.modify-search-form mat-select");
            if (!sel) return !1;
            sel.click();
            const opt = await until(() => [ ...document.querySelectorAll("mat-option") ].find(o => (o.textContent || "").replace(/\s+/g, " ").trim() === want), 2e3);
            if (!opt) {
                try {
                    document.body.click();
                } catch (e) {}
                return !1;
            }
            opt.click();
            return !!await until(() => readNativeCabin() === apiCabin, 2e3);
        }(opts.cabin)) return !1;
        if (opts.date && !await async function(dateStr) {
            const input = activeBoundIdx() > 0 ? document.querySelector('input[formcontrolname="returnDate"], .return-date-rt input') : document.querySelector('input[formcontrolname="departureDate"], .departure-date-ow input');
            if (!input) return !1;
            const d = parseISO(dateStr);
            const current = input.value || "";
            const ordered = DATE_FORMATS.slice();
            /\d{1,2}\.\d{1,2}\.\d{4}/.test(current) && ordered.unshift(DATE_FORMATS[1]);
            for (const fmt of ordered) {
                nativeSetter(input, fmt(d));
                input.dispatchEvent(new Event("change", {
                    bubbles: !0
                }));
                input.dispatchEvent(new Event("blur", {
                    bubbles: !0
                }));
                await settled();
                if (dateAccepted(input)) return !0;
            }
            return !1;
        }(opts.date)) return !1;
        const submit = document.querySelector("#modify-button");
        if (!submit || submit.disabled) return !1;
        if (document.querySelector("form.modify-search-form .ng-invalid, " + "form.modify-search-form .mat-form-field-invalid")) return !1;
        submit.click();
        return !0;
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
    const CFF_API = [ [ "CFFPECO", "PREMIUMECO" ], [ "CFFECO", "ECONOMY" ], [ "CFFBUS", "BUSINESS" ], [ "CFFFIRS?", "FIRST" ] ].map(([p, c]) => [ new RegExp("^" + p, "i"), c ]);
    const CABIN_OPTION = {
        ECONOMY: "Economy",
        PREMIUMECO: "Premium Economy",
        BUSINESS: "Business",
        FIRST: "First"
    };
    const OPTION_CABIN = [ [ "Premium Economy", "PREMIUMECO" ], [ "Economy", "ECONOMY" ], [ "Business", "BUSINESS" ], [ "First", "FIRST" ] ];
    function readNativeCabin() {
        const sel = document.querySelector("form.modify-search-form mat-select");
        if (!sel) return null;
        const t = (sel.textContent || "").replace(/\s+/g, " ");
        const hit = OPTION_CABIN.find(([label]) => t.includes(label));
        return hit ? hit[1] : null;
    }
    const MONTH_STEM = {
        jan: 0,
        feb: 1,
        "mär": 2,
        mar: 2,
        apr: 3,
        mai: 4,
        may: 4,
        jun: 5,
        jul: 6,
        aug: 7,
        sep: 8,
        okt: 9,
        oct: 9,
        nov: 10,
        dez: 11,
        dec: 11
    };
    function stripBtnDate(btn) {
        const m = /(\d{1,2})\.?\s+([A-Za-zÄÖÜäöü]+)\s+(\d{4})/.exec(btn.textContent || "");
        if (!m) return null;
        const mi = MONTH_STEM[m[2].slice(0, 3).toLowerCase()];
        return null == mi ? null : m[3] + "-" + pad(mi + 1) + "-" + pad(+m[1]);
    }
    async function selectDate(dateStr, cabin) {
        const returnStep = activeBoundIdx() > 0;
        const wantCabin = !returnStep && cabin && API_CABIN[cabin] ? API_CABIN[cabin] : null;
        const cabinStays = !wantCabin || wantCabin === function() {
            const native = readNativeCabin();
            if (native) return native;
            try {
                const o = JSON.parse(sessionStorage.getItem(SEARCH_KEY));
                const e = o.entities[o.selectedAirBoundsSearchId];
                for (const code of e.commercialFareFamilies || []) {
                    const hit = CFF_API.find(([re]) => re.test(code));
                    if (hit) return hit[1];
                }
                return e.cabin || null;
            } catch (e) {
                return null;
            }
        }();
        state.selectedDate = dateStr;
        state.navigating = dateStr;
        state.dayOffset = 0;
        state.pickNotice = null;
        render();
        let path = null;
        try {
            if (returnStep) {
                const via = await async function(dateStr) {
                    const grab = () => [ ...document.querySelectorAll("refx-calendar-cont button.calendar-btn") ];
                    if (!grab().length) return !1;
                    for (let hops = 0; hops < 30; hops++) {
                        const btns = grab();
                        const dates = btns.map(stripBtnDate);
                        const i = dates.indexOf(dateStr);
                        if (i >= 0) {
                            if (btns[i].disabled) return "unavailable";
                            btns[i].click();
                            return !0;
                        }
                        const known = dates.filter(Boolean);
                        if (!known.length) return !1;
                        const nav = document.querySelector("refx-calendar-cont " + (dateStr < known[0] ? ".more-dates-past-btn" : ".more-dates-future-btn"));
                        if (!nav || nav.disabled) return !1;
                        nav.click();
                        const before = known[0] + "|" + known[known.length - 1];
                        if (!await until(() => {
                            const now = grab().map(stripBtnDate).filter(Boolean);
                            return now.length && now[0] + "|" + now[now.length - 1] !== before;
                        }, 3e3)) return !1;
                    }
                    return !1;
                }(dateStr);
                if ("unavailable" === via) {
                    clearNavigating();
                    state.selectedDate = dateStr;
                    const msg = "Am " + parseISO(dateStr).toLocaleDateString("de-DE", {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                    }) + " gibt es zum gewählten Hinflug keinen Rückflug.";
                    const cards = window.__mmCards;
                    cards && cards.showNoOffer && cards.showNoOffer(msg) || (state.pickNotice = msg);
                    render();
                    return;
                }
                via && (path = "streifen");
            }
            !path && await runNativeSearch({
                date: dateStr,
                cabin: cabinStays ? void 0 : wantCabin
            }) && (path = "formular");
        } finally {
            path || clearNavigating();
        }
        state.lastPick = {
            date: dateStr,
            path: path || "reload"
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
        } else try {
            const o = JSON.parse(sessionStorage.getItem(SEARCH_KEY));
            const entity = o.entities[o.selectedAirBoundsSearchId];
            const idx = Math.min(activeBoundIdx(), entity.itineraries.length - 1);
            entity.itineraries[idx].departureDateTime = dateStr + "T00:00:00.000";
            if (wantCabin) {
                entity.cabin = wantCabin;
                const cff = cffFor(wantCabin);
                cff && (entity.commercialFareFamilies = [ cff ]);
            }
            sessionStorage.setItem(SEARCH_KEY, JSON.stringify(o));
            location.reload();
        } catch (e) {
            render();
        }
    }
    const gridHost = () => document.querySelector("div.offer-container") || (document.querySelector("refx-calendar-cont") || {}).parentElement || null;
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

body:has(.mmcal) refx-page-title-pres { display: none; }

.mmcal-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap;
              margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid ${INK_hairline}; }
.mmcal-route { font-size: 15px; font-weight: 700; color: ${INK_primary}; letter-spacing: .01em; }
.mmcal-bound { font-weight: 600; color: ${INK_secondary}; margin-right: 6px; }
.mmcal-nav { margin-left: auto; display: flex; gap: 5px; align-items: center; }
.mmcal-btn { font: inherit; font-size: 13px; line-height: 1; border: 1px solid ${INK_hairline};
             background: #fff; color: ${INK_primary}; border-radius: 5px; width: 27px; height: 26px;
             cursor: pointer; padding: 0; }
.mmcal-btn.is-wide { width: auto; padding: 0 11px; font-size: 12px; font-weight: 600; }
.mmcal-btn:hover:not(:disabled) { background: #f3f6fc; border-color: #b9c6e0; }
.mmcal-btn:disabled { opacity: .35; cursor: default; }

.mmcal-fold { margin-left: 6px; }
.mmcal.is-folded { padding-top: 9px; padding-bottom: 9px; }
.mmcal.is-folded .mmcal-head { margin-bottom: 0; padding-bottom: 0; border-bottom: 0; }

.mmcal-grid { display: grid; gap: 2px; position: relative; }
.mmcal-scroll { overflow-x: auto; }

.mmcal-mo { font-size: 11px; font-weight: 700; color: ${INK_secondary};
            padding: 0 0 5px 2px; align-self: end; white-space: nowrap; overflow: hidden; }
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
.mmcal-dw { display: block; font-size: 9.5px; text-transform: uppercase; color: ${INK_muted};
            letter-spacing: .04em; line-height: 1.3; }
.mmcal-dn { display: block; font-size: 14px; font-weight: 600; line-height: 1.15; color: ${INK_primary}; }

.mmcal-rl { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600;
            color: ${INK_secondary}; padding-right: 7px; white-space: nowrap; }
.mmcal-pip { width: 8px; height: 8px; border-radius: 2px; flex: 0 0 auto; }

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
.mmcal-c.is-busy .mmcal-tier::after { content: ' · sucht …'; }
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
.mmcal-tier { font-size: 8.5px; text-transform: uppercase; font-weight: 700; color: var(--mc); line-height: 1.2; }
.mmcal-miles { font-size: 12px; font-weight: 700; line-height: 1.1; color: ${INK_primary}; }
.mmcal-tax { font-size: 9.5px; color: ${INK_secondary}; line-height: 1.2; }
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
.mmcal-legend-item { display: inline-flex; align-items: center; gap: 5px; }
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
        const strip = document.querySelector("refx-calendar-cont");
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
        root.setAttribute("aria-label", "Monatsübersicht Meilenpreise");
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
    function boot() {
        if (state.superseded || !calendarOn()) return;
        mount();
        autoLoad();
        if (state._observer) return;
        const obs = new MutationObserver(() => {
            if (!state.superseded && document.body && calendarOn()) {
                followTimer || (followTimer = setTimeout(() => {
                    followTimer = null;
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
                }, 150));
                document.querySelector(".mmcal") ? hideStrip(document.querySelector("refx-calendar-cont")) : gridHost() && mount();
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
    let followTimer = null;
    function onCalUpdate() {
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
    }
    function onBbdUpdate() {
        !state.superseded && calendarOn() && state.root && render();
    }
    function onFxUpdate() {
        !state.superseded && calendarOn() && state.root && render();
    }
    window.__mmCal && (state._off = window.__mmCal.onUpdate(onCalUpdate));
    window.__mmBBD && window.__mmBBD.onUpdate && (state._offBbd = window.__mmBBD.onUpdate(onBbdUpdate));
    window.__mmCurrency && window.__mmCurrency.onUpdate && (state._offFx = window.__mmCurrency.onUpdate(onFxUpdate));
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
        runNativeSearch: runNativeSearch,
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
        window.addEventListener("pageshow", e => {
            if (e && e.persisted && state.superseded && window.__mmCalUI === api) {
                state.superseded = !1;
                window.__mmCal && (state._off = window.__mmCal.onUpdate(onCalUpdate));
                window.__mmBBD && window.__mmBBD.onUpdate && (state._offBbd = window.__mmBBD.onUpdate(onBbdUpdate));
                window.__mmCurrency && window.__mmCurrency.onUpdate && (state._offFx = window.__mmCurrency.onUpdate(onFxUpdate));
                boot();
            }
        });
    } catch (e) {}
})();

(() => {
    "use strict";
    const VERSION = 24;
    if (window.__mmBounds && window.__mmBounds.version >= VERSION) return;
    const inherited = window.__mmBounds;
    const BOUNDS_RE = /air-bounds/i;
    function isWidebody(name, code) {
        const s = (name || code || "").toUpperCase();
        return !!/A3(00|10|30|40|50|80)/.test(s) || !!/7(47|67|77|87)/.test(s) || !!/IL.?96|MD.?11|DC.?10|L.?1011|TRISTAR/.test(s);
    }
    const ALLEGRIS_ACV = new Set([ "A42", "A43", "A44", "A45", "A46", "78F", "78G", "78J", "78K", "A74", "B74", "K74", "O74", "L74" ]);
    const isAllegris = (operating, acv) => "LH" === operating && ALLEGRIS_ACV.has(acv);
    const A380_NEW_BC_ACV = new Set([ "L38" ]);
    const isNewBizA380 = (operating, acv) => "LH" === operating && A380_NEW_BC_ACV.has(acv);
    const PREMIUM_BY_ACV = [ {
        op: "LX",
        acvs: new Set([ "A35", "A36", "33F", "33R" ]),
        label: "Senses",
        title: "Swiss Senses: neue Kabinengeneration, Business teils als Suite mit Schiebetür"
    }, {
        op: "4Y",
        acvs: new Set([ "33B", "33F" ]),
        label: "Ocean Blue",
        title: "Eurowings Discover: neue Langstreckenkabine (Ocean Blue)"
    } ];
    const PREMIUM_BY_TYPE = [ {
        op: "AI",
        re: /A350/,
        label: "Business Suiten",
        title: "Air India A350: Business als Suite mit Schiebetür (1-2-1)"
    }, {
        op: "TK",
        re: /A350-1000/,
        label: "Crystal",
        title: "Turkish Crystal Business: Suiten mit Schiebetür (1-2-1) — nur auf dem A350-1000"
    }, {
        op: "AC",
        re: /787-10/,
        label: "Signature Plus",
        title: "Air Canada 787-10: Signature-Kabine mit Signature-Plus-Suiten (Tür) vorn"
    } ];
    const premiumCabin = (operating, acName, acv) => {
        const byAcv = PREMIUM_BY_ACV.find(p => p.op === operating && p.acvs.has(acv));
        if (byAcv) return {
            label: byAcv.label,
            title: byAcv.title
        };
        if ("LX" === operating && ("A37" === acv || "33S" === acv)) return null;
        if ("LX" === operating && /A350/.test(acName || "")) return {
            label: "Senses",
            title: PREMIUM_BY_ACV[0].title
        };
        const hit = PREMIUM_BY_TYPE.find(p => p.op === operating && p.re.test(acName || ""));
        return hit ? {
            label: hit.label,
            title: hit.title
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
        reqListeners: []
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
        inherited.api && (state.api = inherited.api);
        Array.isArray(inherited.listeners) && (state.listeners = inherited.listeners);
        Array.isArray(inherited.reqListeners) && (state.reqListeners = inherited.reqListeners);
        inherited.lastRaw = null;
        inherited.bounds = null;
        inherited.dictionaries = null;
        try {
            inherited._offFareNames && inherited._offFareNames();
        } catch (e2) {}
    } catch (e) {}
    state.onUpdate = fn => {
        state.listeners.push(fn);
        return () => {
            const i = state.listeners.indexOf(fn);
            i >= 0 && state.listeners.splice(i, 1);
        };
    };
    state.onRequest = fn => {
        state.reqListeners.push(fn);
        return () => {
            const i = state.reqListeners.indexOf(fn);
            i >= 0 && state.reqListeners.splice(i, 1);
        };
    };
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
    function normaliseFares(group, dicts, legs) {
        const fcDict = dicts.fareConditions || {};
        const ffDict = dicts.fareFamilyWithServices || {};
        const curDict = dicts.currency || {};
        const amount = (value, code) => {
            if (null == value) return null;
            const dp = (curDict[code] || {}).decimalPlaces;
            return value / Math.pow(10, null == dp ? 2 : dp);
        };
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
                    return b.quantity + " × " + (kg ? kg[1] + " kg" : c ? c.description : "Stück");
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
                seatsLeft: quotas.length ? Math.min(...quotas) : null,
                airBoundId: ab.airBoundId || null,
                miles: miles,
                cash: amount(total.totalTaxes, total.currencyCode),
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
    }
    function ingest(json) {
        try {
            if (json && Array.isArray(json.errors) && json.errors.length) {
                const e = json.errors[0] || {};
                state.lastError = {
                    code: e.code || null,
                    title: e.title || null,
                    detail: e.detail || null,
                    t: Date.now()
                };
                emit();
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
            groups.forEach(g => {
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
                        const acName = String(acDict[f.aircraftCode] || f.aircraftCode).replace(/\bINDUSTRIE\s+/i, "");
                        const opCode = f.operatingAirlineCode || f.marketingAirlineCode || null;
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
                            duration: f.duration
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
                    const stops = legs.length - 1;
                    return {
                        key: ((origin, dest, dep, arr, stops) => `${origin}|${dest}|${dep}|${arr}|${stops}`)(bd.originLocationCode, bd.destinationLocationCode, first.dep, last.arr, stops),
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
                        fares: normaliseFares(group, dicts, legs)
                    };
                }(g, state.dictionaries);
                if (!it) return;
                const n = (dup.get(it.key) || 0) + 1;
                dup.set(it.key, n);
                n > 1 && (it.key += "#" + n);
                state.bounds.set(it.key, it);
                keys.push(it.key);
            });
            state.current = keys;
            state.listSig = state._pendingSig || null;
            state.responses++;
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
    const safe = fn => {
        try {
            fn();
        } catch (e) {}
    };
    const AUTH_HEADERS = [ "authorization", "ama-client-facts", "ama-client-ref", "callid", "accept" ];
    const TOKEN_PATH = "/auth/token";
    const TOK_KEY = "gateway-auth-tokens";
    const RT_KEY = "refresh_token";
    const SKEW_MS = 8 * 60 * 1e3;
    const TOKEN_TTL_S = 899;
    const auth = {
        form: null,
        base: null,
        inflight: null,
        timer: null
    };
    function refreshToken(force) {
        const cur = function() {
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
        }();
        if (!force && cur && cur.expiresAt - Date.now() > SKEW_MS) return Promise.resolve(cur.token);
        if (auth.inflight) return auth.inflight;
        const base = state.api && state.api.base || auth.base;
        let rt = null;
        try {
            rt = sessionStorage.getItem(RT_KEY);
        } catch (e) {}
        if (!base || !auth.form || !rt) return Promise.resolve(cur ? cur.token : null);
        const body = "client_id=" + encodeURIComponent(auth.form.id) + "&client_secret=" + encodeURIComponent(auth.form.secret) + "&grant_type=refresh_token&refresh_token=" + encodeURIComponent(rt);
        const p = fetch(base + TOKEN_PATH, {
            method: "POST",
            credentials: "include",
            headers: {
                "content-type": "application/x-www-form-urlencoded",
                accept: "application/json"
            },
            body: body
        }).then(r => r.ok ? r.json() : null).then(j => {
            if (!j || !j.access_token) return cur ? cur.token : null;
            try {
                const all = cur && cur.all || {};
                all[cur && cur.key || auth.form.id] = {
                    token: j.access_token,
                    expiresAt: Date.now() + 1e3 * (Number(j.expires_in) || TOKEN_TTL_S)
                };
                sessionStorage.setItem(TOK_KEY, JSON.stringify(all));
                j.refresh_token && sessionStorage.setItem(RT_KEY, j.refresh_token);
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
    state.tokenRenewals = inherited && inherited.tokenRenewals || 0;
    state._stopKeepalive = () => {
        clearInterval(auth.timer);
        auth.timer = null;
    };
    try {
        inherited && inherited._stopKeepalive && inherited._stopKeepalive();
    } catch (e) {}
    if (inherited && inherited._auth) {
        auth.form = inherited._auth.form || null;
        auth.base = inherited._auth.base || null;
    }
    Object.defineProperty(state, "_auth", {
        get: () => ({
            form: auth.form,
            base: auth.base
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
    window.__mmBoundsHooks = {
        ingest: ingest,
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
        headersToObject: function(h) {
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
        },
        start: body => emitRequest(!0, (body => {
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
        })(body)),
        end: () => emitRequest(!1)
    };
    if (!window.__mmBoundsHooked) {
        window.__mmBoundsHooked = !0;
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            const url = "string" == typeof args[0] ? args[0] : args[0] && args[0].url || "";
            const watched = BOUNDS_RE.test(url);
            const h = () => window.__mmBoundsHooks || {};
            safe(() => h().noteTokenCall && h().noteTokenCall(url, (args[1] || {}).body));
            if (watched) {
                safe(() => {
                    const c = h();
                    c.noteApi && c.noteApi(url, c.headersToObject((args[1] || {}).headers));
                });
                safe(() => h().start && h().start((args[1] || {}).body));
            }
            try {
                const res = await originalFetch.apply(this, args);
                watched && res.clone().json().then(j => h().ingest && h().ingest(j)).catch(e => {});
                return res;
            } finally {
                watched && safe(() => h().end && h().end());
            }
        };
        const XO = XMLHttpRequest.prototype.open;
        const XS = XMLHttpRequest.prototype.send;
        const XH = XMLHttpRequest.prototype.setRequestHeader;
        XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
            if (this.__mmBoundsWatched) {
                this.__mmBoundsHeaders = this.__mmBoundsHeaders || {};
                this.__mmBoundsHeaders[name] = value;
            }
            return XH.call(this, name, value);
        };
        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            this.__mmBoundsWatched = BOUNDS_RE.test(String(url));
            this.__mmBoundsUrl = String(url);
            if (this.__mmBoundsWatched && !this.__mmBoundsWired) {
                this.__mmBoundsWired = !0;
                const h = () => window.__mmBoundsHooks || {};
                this.addEventListener("load", () => {
                    if (this.__mmBoundsWatched) try {
                        h().ingest && h().ingest(JSON.parse(this.responseText));
                    } catch (e) {}
                });
                this.addEventListener("loadend", () => {
                    this.__mmBoundsWatched && safe(() => h().end && h().end());
                });
            }
            return XO.call(this, method, url, ...rest);
        };
        XMLHttpRequest.prototype.send = function(...rest) {
            const h = () => window.__mmBoundsHooks || {};
            safe(() => h().noteTokenCall && h().noteTokenCall(this.__mmBoundsUrl, rest[0]));
            if (this.__mmBoundsWatched) {
                safe(() => {
                    const c = h();
                    c.noteApi && c.noteApi(this.__mmBoundsUrl, this.__mmBoundsHeaders);
                });
                safe(() => h().start && h().start(rest[0]));
            }
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
    const VERSION = 125;
    if (window.__mmCards && window.__mmCards.version >= VERSION) return;
    const inherited = window.__mmCards;
    if (inherited) {
        inherited.superseded = !0;
        try {
            inherited._observer && inherited._observer.disconnect();
        } catch (e) {}
        try {
            inherited._offData && inherited._offData();
        } catch (e) {}
        try {
            inherited._offReq && inherited._offReq();
        } catch (e) {}
        try {
            inherited._offFx && inherited._offFx();
        } catch (e) {}
        try {
            inherited._offSettings && inherited._offSettings();
        } catch (e) {}
        try {
            inherited.destroy && inherited.destroy();
        } catch (e) {}
    }
    const INK_primary = "#05164D", INK_secondary = "#52514e", INK_muted = "#898781", INK_hairline = "#e1e0d9", INK_accent = "#1c5cab", INK_warn = "#A54A4A", INK_good = "#4C6E48";
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
    const CFF_CABIN = [ [ /^CFFPECO/i, "ecoPremium" ], [ /^CFFECO/i, "eco" ], [ /^CFFBUS/i, "business" ], [ /^CFFFIRS?/i, "first" ] ];
    const state = {
        version: VERSION,
        rendered: 0,
        superseded: !1,
        counts: {
            shown: 0,
            total: 0
        }
    };
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
    const num = n => null == n ? "" : n.toLocaleString("de-DE");
    const money = n => null == n ? "" : n.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    const CUR_SYMBOL = {
        EUR: "€",
        USD: "$",
        GBP: "£",
        JPY: "¥"
    };
    const curSym = c => CUR_SYMBOL[c] || c || "";
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
        if (!currency || "EUR" === currency) return money(amount) + " €";
        try {
            const c = window.__mmCurrency;
            const eur = c && c.toEUR ? c.toEUR(amount, currency) : null;
            if (null != eur) return money(eur) + " €";
        } catch (e) {}
        return money(amount) + " " + curSym(currency);
    };
    const properCase = s => String(null == s ? "" : s).replace(/[A-ZÄÖÜ][A-ZÄÖÜ'’-]+/g, w => w.charAt(0) + w.slice(1).toLowerCase());
    const fmtDur = sec => {
        if (!sec && 0 !== sec) return "";
        const h = Math.floor(sec / 3600), m = Math.round(sec % 3600 / 60);
        return h ? `${h}h ${String(m).padStart(2, "0")}min` : `${m}min`;
    };
    const fmtFlightNo = f => (f || "").replace(/^([A-Z]{2})(\d)/, "$1 $2");
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
    function shapeKeyFor(leg) {
        const s = String(leg && leg.aircraftName || "").toUpperCase();
        return /A380/.test(s) ? "a388" : /A35\d/.test(s) ? "a359" : /A34\d/.test(s) ? "a343" : /A3(3\d|10|00)/.test(s) ? "a333" : /A(3(1[89]|2\d)|22\d)/.test(s) ? "a320" : /747|B?74\d/.test(s) ? "b744" : /78\d|DREAMLINER/.test(s) ? "b788" : /77\d/.test(s) ? "b77w" : /7[0-6]\d|MAX/.test(s) ? "b738" : leg && leg.widebody ? "a333" : "a320";
    }
    const HALF_H = .66;
    const CAP_NOSE = 1.15, CAP_TAIL = 1.6;
    function planeGeom(shape, cabinPx, fusPx) {
        const cabin = cabinPx / fusPx;
        const noseLen = Math.min(shape.nose[0], CAP_NOSE);
        const tailLen = Math.min(shape.tail[0], CAP_TAIL);
        const total = noseLen + cabin + tailLen;
        const cut = Math.max(0, Math.min(tailLen, total - (shape.htp ? (shape.htp[2] + shape.htp[3]) / 2 * total : total)));
        return {
            cabin: cabin,
            noseLen: noseLen,
            tailLen: tailLen,
            total: total,
            cut: cut,
            tailDrawn: tailLen - cut,
            shown: total - cut
        };
    }
    function planeSvg(shape, cabinPx, fusPx, withSurfaces) {
        const g = planeGeom(shape, cabinPx, fusPx);
        const noseLen = g.noseLen, tailLen = g.tailLen, total = g.total;
        const xCyl = noseLen, xTail = noseLen + g.cabin;
        const coneAt = (arr, f) => {
            const n = arr.length - 1;
            const t = Math.max(0, Math.min(1, f)) * (n - 1);
            const i = Math.min(n - 2, Math.floor(t));
            const a = arr[1 + i];
            return .5 * (a + (arr[2 + i] - a) * (t - i));
        };
        const half = x => x <= xCyl ? coneAt(shape.nose, (xCyl - x) / noseLen) : x <= xTail ? .5 : coneAt(shape.tail, (x - xTail) / tailLen);
        const body = (() => {
            const xs = [];
            for (let i = 0; i <= 20; i++) xs.push(xCyl * i / 20);
            xs.push(xTail);
            for (let i = 1; i <= 20; i++) xs.push(xTail + tailLen * i / 20);
            let d = "";
            xs.forEach((x, i) => {
                d += (i ? "L" : "M") + x.toFixed(2) + "," + (-half(x)).toFixed(3);
            });
            for (let i = xs.length - 1; i >= 0; i--) d += "L" + xs[i].toFixed(2) + "," + half(xs[i]).toFixed(3);
            return d + "Z";
        })();
        const sy = (HALF_H - .5) / shape.wing[0], sx = Math.sqrt(sy);
        const surf = (arr, side) => {
            const pts = [];
            for (let i = 1; i < arr.length; i += 3) pts.push([ arr[i] * arr[0], arr[i + 1] * total, arr[i + 2] * total ]);
            const le0 = pts[0][1], te0 = pts[0][2];
            const base = half((le0 + te0) / 2);
            const y = p => side * (base + p[0] * sy);
            const xt = p => te0 + (p[2] - te0) * sx;
            const root = side * Math.max(.05, .7 * base);
            let d = "M" + le0.toFixed(2) + "," + root.toFixed(3);
            pts.forEach(p => {
                d += "L" + (p => le0 + (p[1] - le0) * sx)(p).toFixed(2) + "," + y(p).toFixed(3);
            });
            for (let i = pts.length - 1; i >= 0; i--) d += "L" + xt(pts[i]).toFixed(2) + "," + y(pts[i]).toFixed(3);
            return d + "L" + te0.toFixed(2) + "," + root.toFixed(3) + "Z";
        };
        const glass = (() => {
            const at = (f, k) => {
                const h = coneAt(shape.nose, f) * k;
                return {
                    x: xCyl - f * noseLen,
                    h: h,
                    xm: xCyl - Math.min(.98, f + .12) * noseLen
                };
            };
            const a = at(.56, .94), b = at(.74, .9);
            const band = "M" + a.x.toFixed(2) + "," + (-a.h).toFixed(3) + "Q" + a.xm.toFixed(2) + ",0 " + a.x.toFixed(2) + "," + a.h.toFixed(3) + "L" + b.x.toFixed(2) + "," + b.h.toFixed(3) + "Q" + b.xm.toFixed(2) + ",0 " + b.x.toFixed(2) + "," + (-b.h).toFixed(3) + "Z";
            const onQ = (c, s) => {
                const u = 1 - s;
                return [ u * u * c.x + 2 * u * s * c.xm + s * s * c.x, u * u * -c.h + s * s * c.h ];
            };
            let bars = "";
            [ .28, .5, .72 ].forEach(s => {
                const p = onQ(a, s), q = onQ(b, s);
                bars += "M" + p[0].toFixed(2) + "," + p[1].toFixed(3) + "L" + q[0].toFixed(2) + "," + q[1].toFixed(3);
            });
            return {
                band: band,
                bars: bars
            };
        })();
        const px = v => (v * fusPx).toFixed(1);
        const cut = g.cut, shown = g.shown;
        return '<svg class="mmrc-silhouette" width="' + px(shown) + '" height="' + px(2 * HALF_H) + '" viewBox="' + cut.toFixed(2) + " " + -HALF_H + " " + shown.toFixed(2) + " " + 2 * HALF_H + '" preserveAspectRatio="none" aria-hidden="true">' + '<g transform="translate(' + total.toFixed(2) + ',0) scale(-1,1)">' + (!1 === withSurfaces ? "" : '<path class="is-surf" d="' + surf(shape.wing, -1) + '"/>' + '<path class="is-surf" d="' + surf(shape.wing, 1) + '"/>' + '<path class="is-surf" d="' + surf(shape.htp, -1) + '"/>' + '<path class="is-surf" d="' + surf(shape.htp, 1) + '"/>') + '<path class="is-body" d="' + body + '"/>' + '<path class="is-glass" d="' + glass.band + '"/>' + '<path class="is-bars" d="' + glass.bars + '"/>' + "</g></svg>";
    }
    const PLANE_PATH = "M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19" + "l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z";
    const TRAIN_PATH = "M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 " + "3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 " + "1.5S8.33 17 7.5 17zM11 10H6V6h5v4zm2 0V6h5v4h-5zm3.5 7c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 " + "1.5.67 1.5 1.5-.67 1.5-1.5 1.5z";
    const BUS_PATH = "M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 " + "1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 " + "0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67" + "-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM18 11H6V6h12v5z";
    const shortAircraft = name => {
        let s = (name || "").replace(/\s*\(.*?\)\s*/g, " ").replace(/\/.*$/, "").replace(/\s+/g, " ").trim();
        if (!s) return name || "";
        if (/TRAIN|RAIL/i.test(s)) return "Zug";
        if (/\bBUS\b/i.test(s)) return "Bus";
        let m = /^CANADAIR\s+REGIONAL\s+JET\s+(\S+)/i.exec(s) || /^(?:BOMBARDIER\s+)?CRJ[\s-]*(\S+)/i.exec(s);
        if (m) return "CRJ-" + m[1];
        m = /^EMBRAER\s+(?:ERJ[\s-]*)?(\S+)/i.exec(s);
        if (m) return /^E/i.test(m[1]) ? m[1].toUpperCase() : "E" + m[1];
        m = /^(?:DE\s+HAVILLAND|BOMBARDIER)\s+.*?DASH\s*8[\s-]*(\S+)?/i.exec(s);
        return m ? "Dash 8" + (m[1] ? "-" + m[1] : "") : s.replace(/^(AIRBUS(\s+INDUSTRIE)?|BOEING|BOMBARDIER)\s+/i, "").trim() || s;
    };
    const EU = new Set([ "DE", "AT", "CH", "FR", "IT", "ES", "PT", "NL", "BE", "LU", "DK", "SE", "NO", "FI", "IE", "GB", "PL", "CZ", "SK", "HU", "SI", "HR", "RO", "BG", "GR", "EE", "LV", "LT", "IS", "MT", "CY" ]);
    const NA = new Set([ "US", "CA" ]);
    const LOGO_KEY = "mmrc_logo_base";
    let logoBase = null;
    try {
        logoBase = localStorage.getItem(LOGO_KEY);
    } catch (e) {}
    const LOGO_EMBED = {
        AV: "data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%22130.28%200%2040%2040%22%3E%3Cpath%20d=%22M154.013%2031.2561H157.697C159.226%2031.2561%20159.904%2031.3827%20160.33%2031.5755C159.676%2029.5444%20157.614%2027.9613%20150.346%2027.418C151.507%2028.7616%20152.726%2030.0488%20154.011%2031.2561H154.013Z%22%20fill=%22%23FF0000%22/%3E%3Cpath%20d=%22M150.346%2027.4203C143.293%2019.224%20138.542%208.73765%20136.637%200C136.637%200%20132.76%203.4195%20132.452%2010.611C132.112%2018.4704%20136.328%2026.394%20150.212%2027.4047C150.257%2027.4125%20150.304%2027.4125%20150.346%2027.4183V27.4203Z%22%20fill=%22%23FF0000%22/%3E%3Cpath%20d=%22M154.011%2031.2559C148.537%2031.2559%20139.087%2031.2559%20139.087%2031.2559C139.286%2031.7193%20139.969%2032.0445%20141.525%2032.136C150.841%2032.6891%20152.159%2039.9993%20165.493%2039.9993C166.663%2039.9993%20167.393%2039.9292%20168.131%2039.791C162.862%2038.1708%20158.13%2035.1252%20154.011%2031.2539V31.2559Z%22%20fill=%22%23FF0000%22/%3E%3C/svg%3E"
    };
    const CSS = `
html.mmrc-active .upsell-premium-pres-container > mat-accordion { display: none !important; }

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
.mmrc-seatoverlay { position: fixed; inset: 0; z-index: 2147482000;
                    background: rgba(5,22,77,.42); display: none;
                    align-items: center; justify-content: center; }
.mmrc-seatoverlay.is-open { display: flex; }
.mmrc-seatmodal { background: #fff; border-radius: 12px; padding: 16px 22px 18px;
                  max-width: min(94vw, 1100px); max-height: 88vh; overflow: auto;
                  box-shadow: 0 18px 60px rgba(5,22,77,.35); }
.mmrc-seatclose { float: right; margin: -2px -8px 0 12px; border: none; cursor: pointer;
                  background: #eef1f7; color: ${INK_primary}; border-radius: 999px;
                  width: 26px; height: 26px; font-size: 13px; line-height: 1; }
.mmrc-seatclose:hover { background: ${INK_accent}; color: #fff; }
.mmrc-seattabs { display: flex; gap: 6px; margin: 0 0 10px; flex-wrap: wrap; }
.mmrc-seattabs button { font: inherit; font-size: 11px; border: 1px solid ${INK_hairline};
                        background: #fff; border-radius: 999px; padding: 3px 12px;
                        cursor: pointer; color: ${INK_secondary}; }
.mmrc-seattabs button.is-on { background: ${INK_primary}; color: #fff;
                              border-color: ${INK_primary}; }
.mmrc-seatpanel { min-width: min(86vw, 640px); }
.mmrc-seatpeek { position: fixed; z-index: 2147481900; background: #fff;
                 border: 1px solid ${INK_hairline}; border-radius: 10px;
                 box-shadow: 0 10px 30px rgba(5,22,77,.22); padding: 6px 12px;
                 pointer-events: none; }
.mmrc-seatpeek .mmrc-seatpanel { min-width: 0; zoom: .55; }
.mmrc-seatpeek .mmrc-seathead, .mmrc-seatpeek .mmrc-seatlegend,
.mmrc-seatpeek .mmrc-seatnote { display: none; }
.mmrc-peekhint { font-size: 10.5px; color: ${INK_muted}; text-align: center;
                 padding: 2px 0 2px; }
.mmrc-seathead { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
.mmrc-seattitle { font-size: 12.5px; font-weight: 700; color: ${INK_primary}; }
.mmrc-seatstats { display: flex; gap: 14px; flex-wrap: wrap; font-size: 11px;
                  color: ${INK_secondary}; margin: 6px 0 4px; }
.mmrc-seatstats i { display: inline-block; width: 10px; height: 10px; border-radius: 3px;
                    border: 1.5px solid; background: #fff; vertical-align: -1px; margin-right: 4px; }
.mmrc-seatlegend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 10.5px;
                   color: ${INK_muted}; margin-bottom: 8px; align-items: center; }
.mmrc-seatlegend i.is-occupied { display: inline-block; width: 10px; height: 10px;
                                 border-radius: 3px; background: #e3e1dc; vertical-align: -1px;
                                 margin-right: 4px; }
.mmrc-seatlegend .is-exit { color: #963e37; font-weight: 600; }
.mmrc-planes { max-width: 100%; overflow-x: auto; }
.mmrc-planesin { width: max-content; margin: 0 auto; }
.mmrc-deck { margin-bottom: 6px; }
.mmrc-deckname { font-size: 10.5px; font-weight: 700; color: ${INK_secondary};
                 letter-spacing: .05em; text-transform: uppercase; margin-bottom: 4px;
                 text-align: center; }
.mmrc-plane { position: relative; width: max-content; padding: 26px 58px 26px 34px; }
.mmrc-plane.has-wings { padding-top: 56px; padding-bottom: 56px; }
.mmrc-silhouette { position: absolute; left: 0; top: 50%; transform: translateY(-50%);
                   z-index: 0; pointer-events: none; }
.mmrc-decktabs { display: flex; gap: 6px; margin: 0 0 6px; }
.mmrc-decktab { border: 1px solid ${INK_hairline}; background: #fff; cursor: pointer;
                border-radius: 999px; padding: 3px 12px; font: inherit; font-size: 11.5px;
                color: ${INK_secondary}; }
.mmrc-decktab.is-on { background: ${INK_primary}; border-color: ${INK_primary}; color: #fff; }
.mmrc-deck.is-off { display: none; }
.mmrc-fuselage { position: relative; z-index: 1; padding: 10px 6px 10px 8px; }
.mmrc-fuselage.has-stairs-fore, .mmrc-fuselage.has-stairs-both { padding-right: 52px; }
.mmrc-fuselage.has-stairs-both { padding-left: 52px; }
.mmrc-stairs { position: absolute; top: 50%; height: 22%; width: 42px;
               transform: translateY(-50%);
               border: 1px solid #b4ae9f; border-radius: 2px;
               background: repeating-linear-gradient(90deg, #c6c0b0 0 2px, #eae7dd 2px 6px); }
.mmrc-stairs.is-fore { right: 6px; }
.mmrc-stairs.is-aft { left: 6px; }
.mmrc-silhouette path { vector-effect: non-scaling-stroke; stroke-linejoin: round; }
.mmrc-silhouette .is-body { fill: #fbfaf8; stroke: #cfcdc3; stroke-width: 1.5; }
.mmrc-silhouette .is-surf { fill: #e6e3da; stroke: #c9c4b7; stroke-width: 1; }
.mmrc-silhouette .is-glass { fill: #dfe4e6; stroke: #aeb4b6; stroke-width: 1; }
.mmrc-silhouette .is-bars { fill: none; stroke: #aeb4b6; stroke-width: 1; }
table.mmrc-seatgrid { border-collapse: separate; border-spacing: 2px; }
.mmrc-seatgrid th { font-size: 8.5px; font-weight: 600; color: ${INK_muted}; padding: 0 1px;
                    line-height: 1.05; text-align: center; vertical-align: bottom; }
.mmrc-seatgrid th i { display: block; font-style: normal; font-size: 6.5px;
                      line-height: 1; margin-bottom: -1px; }
.mmrc-seatgrid th.is-exit { color: #963e37; }
.mmrc-seatgrid td { padding: 0; }
.mmrc-seatgrid .c-eco { padding: 0 1px; }
.mmrc-seatgrid .c-ecoPremium { padding: 0 2px; }
.mmrc-seatgrid .c-business { padding: 0 4px; }
.mmrc-seatgrid .c-first { padding: 0 6px; }
.mmrc-seatgrid .is-cut { border-left: 2px solid #ccc7b9; }
.mmrc-seatband { font-size: 9px; font-weight: 700 !important; letter-spacing: .08em;
                 text-transform: uppercase; padding-bottom: 1px !important;
                 line-height: 1.05; white-space: nowrap; vertical-align: bottom; }
.mmrc-seatrail { position: relative; width: 16px; }
.mmrc-seatrail span { position: absolute; left: 0; right: 0; text-align: center;
                      font-size: 9.5px; font-weight: 700; color: ${INK_muted};
                      line-height: 13px; }
.mmrc-rowbox { position: relative; width: 18px; margin: 0 auto; }
.c-ecoPremium .mmrc-rowbox { width: 21px; }
.c-business .mmrc-rowbox { width: 28px; }
.c-first .mmrc-rowbox { width: 36px; }
.mmrc-seat { position: absolute; left: 0; right: 0; height: 18px;
             border-radius: 4px 5px 5px 4px; background: #fff;
             border: 1.5px solid var(--seatc); cursor: help;
             display: flex; align-items: center; justify-content: center;
             font-size: 8.5px; font-weight: 600; color: ${INK_muted}; }
.mmrc-seat::before { content: ''; position: absolute; left: 1px; top: 2px; bottom: 2px;
                     width: 3px; border-radius: 2px; background: var(--seatc); opacity: .35; }
.mmrc-seat.is-occupied { background: #e3e1dc; border-color: #e3e1dc; cursor: default; }
.mmrc-seat.is-occupied::before { background: #b0ada5; opacity: .55; }
.c-first .mmrc-seat { font-size: 9.5px; }
.mmrc-seatmsg { font-size: 12px; color: ${INK_secondary}; padding: 12px 4px; text-align: center; }
.mmrc-seatmsgdetail { color: ${INK_muted}; font-size: 10.5px; }
.mmrc-seatnote { font-size: 10.5px; color: ${INK_muted}; text-align: center; padding-top: 2px; }
.mmrc-seatretry { font: inherit; font-size: 10.5px; font-weight: 600; margin-left: 4px;
                  border: 1px solid ${INK_hairline}; background: #fff; color: ${INK_primary};
                  border-radius: 999px; padding: 1px 9px; cursor: pointer; }
.mmrc-seatretry:hover { border-color: #b9c6e0; background: #f3f6fc; }

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
    .mmrc-col.is-fallback .mmrc-nm::after { content: 'statt der gesuchten'; display: block;
                                            width: 100%; font-size: 9px; font-weight: 400;
                                            opacity: .8; }
}
@container mmliste (max-width: 470px) {
    .mmrc-card { grid-template-columns: minmax(0, 1fr); }
}

.mmrc-msg { padding: 18px 16px; text-align: center; font-size: 13.5px;
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
.mmrc-fback-price { font-size: 11.5px; font-weight: 600; margin-top: 3px; opacity: .95;
                    font-variant-numeric: tabular-nums; }
.mmrc-fback-price b { font-weight: 700; }
.mmrc-fback-rows { margin: 0; padding: 5px 9px 0; flex: 1; }
.mmrc-fback-rows > div { display: flex; flex-wrap: nowrap; align-items: baseline;
                         justify-content: space-between; gap: 0 6px; padding: 1.5px 0;
                         line-height: 1.28; }
.mmrc-fback-rows dt { font-size: 11px; color: ${INK_secondary};
                      min-width: 0; hyphens: auto; overflow-wrap: break-word; }
.mmrc-fback-rows dd { margin: 0; flex: 0 0 auto; white-space: nowrap;
                     font-size: 12.5px; font-weight: 700; color: ${INK_primary};
                     font-variant-numeric: tabular-nums; }
.mmrc-fback-rows dd.is-no { color: ${INK_warn}; }
.mmrc-fback-rows dd.is-yes { color: ${INK_good}; }
.mmrc-fback-rows > div.is-sub { padding-top: 0; margin-top: -2px; }
.mmrc-fback-rows dt.is-sub { font-size: 9.5px; color: ${INK_muted}; }
.mmrc-fback-sep { height: 1px; background: ${INK_hairline}; margin: 5px 0 2px; }
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
.mmrc-pop { position: absolute; left: 50%; transform: translateX(-50%); top: calc(100% + 5px); z-index: 2147482000;
            width: 214px; background: #fff; border: 1px solid ${INK_hairline}; border-radius: 7px;
            box-shadow: 0 12px 30px rgba(5,22,77,.22); padding: 8px 10px; display: none; text-align: left;
            cursor: default; }
.mmrc-f:hover .mmrc-pop { display: block; }
.mmrc-f:hover { z-index: 2147482001; }
.mmrc-col.is-open .mmrc-pop { display: none !important; }
.mmrc-pop h4 { margin: 0 0 6px; font-size: 11px; color: var(--mmc); letter-spacing: .02em; font-weight: 700; }
.mmrc-pop dl { margin: 0; display: grid; grid-template-columns: 1fr auto; gap: 3px 8px; font-size: 10.5px; }
.mmrc-pop dt { color: ${INK_secondary}; }
.mmrc-pop dd { margin: 0; text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; color: ${INK_primary}; }
.mmrc-pop dd.is-no { color: ${INK_warn}; } .mmrc-pop dd.is-yes { color: ${INK_good}; }
.mmrc-pop dt.is-sub { font-size: 9.5px; color: ${INK_muted}; margin-top: -2px; }
.mmrc-sep { height: 1px; background: ${INK_hairline}; margin: 6px 0; }
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
    const SEAT_BC = {
        eco: "X",
        ecoPremium: "R",
        business: "I",
        first: "O"
    };
    const LAYOUT_KEY = "mmrc_seat_layouts";
    const LAYOUT_TTL = 30 * 24 * 3600 * 1e3;
    const seatCache = new Map;
    const layoutMem = new Map;
    const legKey = leg => (leg.mkt || "") + (leg.mktNo || "") + "|" + (leg.depDate || "");
    function apiOf() {
        const a = boundsData().api;
        return a && a.base && a.headers ? a : null;
    }
    async function apiGet(path, retried) {
        const a = apiOf();
        if (!a) throw new Error("keine API-Zugangsdaten");
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
            let code = "";
            try {
                code = (JSON.parse(text).errors || []).map(e => e.code).join(",");
            } catch (e) {}
            const err = new Error("HTTP " + r.status + (code ? " (" + code + ")" : ""));
            err.status = r.status;
            err.apiCode = code;
            throw err;
        }
        return JSON.parse(text);
    }
    function normaliseSeatmap(j, requestedCabin) {
        const chars = {};
        const dict = (j.dictionaries || {}).seatCharacteristic || {};
        Object.keys(dict).forEach(k => {
            chars[k] = dict[k].name || k;
        });
        const curDict = (j.dictionaries || {}).currency || {};
        const realAmount = (total, cur) => {
            if (null == total) return null;
            const dp = (curDict[cur] || {}).decimalPlaces;
            return total / Math.pow(10, null == dp ? 2 : dp);
        };
        const decks = [];
        ((j.data || {}).seatmaps || []).forEach(m => (m.decks || []).forEach(d => {
            const rows = new Map;
            const rowByX = new Map;
            const seen = {};
            (d.seats || []).forEach(s => {
                const m2 = /^(\d+)([A-Z])$/.exec(s.seatNumber || "");
                if (!m2) return;
                const row = Number(m2[1]);
                if (s.coordinates) {
                    rowByX.has(s.coordinates.x) || rowByX.set(s.coordinates.x, row);
                    const tally = seen[m2[2]] = seen[m2[2]] || new Map;
                    tally.set(s.coordinates.y, (tally.get(s.coordinates.y) || 0) + 1);
                }
                const t = (s.travelers || [])[0] || {};
                rows.has(row) || rows.set(row, {
                    row: row,
                    cabin: s.cabin || null,
                    seats: {},
                    x: s.coordinates ? s.coordinates.x : null
                });
                const price0 = (t.prices || [])[0] || {};
                rows.get(row).seats[m2[2]] = {
                    free: "available" === t.seatAvailabilityStatus,
                    price: realAmount(price0.total, price0.currencyCode),
                    currency: price0.currencyCode,
                    chars: t.seatCharacteristicsCodes || [],
                    y: s.coordinates ? s.coordinates.y : null
                };
            });
            const letterY = {};
            Object.keys(seen).forEach(L => {
                let best = null, n = -1;
                seen[L].forEach((count, y) => {
                    if (count > n) {
                        n = count;
                        best = y;
                    }
                });
                letterY[L] = best;
            });
            if (!rows.size) return;
            const dims = d.deckDimensions || {};
            const near = x => {
                if (null == x || !rowByX.size) return null;
                const best = [ ...rowByX.keys() ].reduce((a, b) => Math.abs(b - x) < Math.abs(a - x) ? b : a);
                return Math.abs(best - x) <= 1 ? rowByX.get(best) : null;
            };
            const sorted = [ ...rows.values() ].sort((a, b) => a.row - b.row);
            sorted.forEach((r, i) => {
                const prev = sorted[i - 1];
                r.gapBefore = i > 0 && null != r.x && null != prev.x ? Math.max(0, Math.min(4, r.x - prev.x - 1)) : 0;
            });
            decks.push({
                type: d.deckType || "main",
                rows: sorted,
                exitRows: (dims.exitRowsX || []).map(near).filter(v => null != v),
                wing: [ near(dims.startWingsX), near(dims.endWingsX) ],
                letterY: letterY,
                gridW: null != dims.width ? dims.width : null
            });
        }));
        return {
            decks: decks,
            chars: chars,
            acv: ((j.data || {}).flight || {}).aircraftConfigurationVersion || null,
            requestedCabin: requestedCabin || null,
            warnings: (j.warnings || []).map(w => w.code)
        };
    }
    function mergeSeatmaps(parts) {
        const chars = {};
        const warnings = new Set;
        const byDeck = new Map;
        parts.forEach(part => {
            Object.assign(chars, part.chars);
            part.warnings.forEach(w => warnings.add(w));
            part.decks.forEach(d => {
                const e = byDeck.get(d.type) || {
                    type: d.type,
                    rows: new Map,
                    exit: new Set,
                    wing: null,
                    letterY: {},
                    lanes: 0,
                    refWidth: null,
                    widths: {},
                    letterYByCabin: {}
                };
                const cab = d.rows[0] && d.rows[0].cabin;
                cab && null != d.gridW && null == e.widths[cab] && (e.widths[cab] = d.gridW);
                cab && Object.keys(d.letterY || {}).length && !e.letterYByCabin[cab] && (e.letterYByCabin[cab] = d.letterY);
                if (!cab) {
                    null != d.gridW && null == e.widths.__u__ && (e.widths.__u__ = d.gridW);
                    Object.keys(d.letterY || {}).length && !e.letterYByCabin.__u__ && (e.letterYByCabin.__u__ = d.letterY);
                    part.requestedCabin && !e.unlabelledFrom && (e.unlabelledFrom = part.requestedCabin);
                }
                d.rows.forEach(r => {
                    const ex = e.rows.get(r.row);
                    if (ex) {
                        Object.assign(ex.seats, r.seats);
                        ex.gapBefore || (ex.gapBefore = r.gapBefore || 0);
                    } else e.rows.set(r.row, {
                        row: r.row,
                        cabin: r.cabin,
                        gapBefore: r.gapBefore || 0,
                        seats: {
                            ...r.seats
                        }
                    });
                });
                (d.exitRows || []).forEach(x => e.exit.add(x));
                d.wing && null != d.wing[0] && (e.wing = e.wing ? [ Math.min(e.wing[0], d.wing[0]), Math.max(e.wing[1], d.wing[1]) ] : d.wing.slice());
                const n = Object.keys(d.letterY || {}).length;
                if (n > e.lanes) {
                    e.lanes = n;
                    e.letterY = d.letterY;
                    e.refWidth = d.gridW;
                }
                byDeck.set(d.type, e);
            });
        });
        let ecoW = null;
        byDeck.forEach(e => {
            null == ecoW && null != e.widths.eco && (ecoW = e.widths.eco);
        });
        return {
            chars: chars,
            warnings: [ ...warnings ],
            decks: [ ...byDeck.values() ].sort((a, b) => ("upper" === a.type ? 0 : 1) - ("upper" === b.type ? 0 : 1)).map(e => {
                const rows = [ ...e.rows.values() ].sort((a, b) => a.row - b.row);
                const minRow = {};
                rows.forEach(r => {
                    r.cabin && (minRow[r.cabin] = Math.min(null != minRow[r.cabin] ? minRow[r.cabin] : 1e9, r.row));
                });
                rows.forEach(r => {
                    if (r.cabin) return;
                    const c = null != minRow.business && r.row < minRow.business ? "first" : null != minRow.eco && r.row < minRow.eco ? "ecoPremium" : e.unlabelledFrom || "eco";
                    r.cabin = c;
                    null == e.widths[c] && null != e.widths.__u__ && (e.widths[c] = e.widths.__u__);
                    !e.letterYByCabin[c] && e.letterYByCabin.__u__ && (e.letterYByCabin[c] = e.letterYByCabin.__u__);
                });
                delete e.widths.__u__;
                delete e.letterYByCabin.__u__;
                const ref = null != e.widths.eco ? e.widths.eco : ecoW;
                rows.forEach(r => {
                    r.slim = null != ref && e.widths[r.cabin] === ref && ((e, cabin) => {
                        const ecoY = e.letterYByCabin.eco, ownY = e.letterYByCabin[cabin];
                        if (!ecoY || !ownY || "eco" === cabin) return !0;
                        if ((ownY => {
                            const Ls = Object.keys(ownY).sort((a, b) => ownY[a] - ownY[b]);
                            for (let i = 1; i < Ls.length; i++) if (ownY[Ls[i]] - ownY[Ls[i - 1]] === 1 && Ls[i].charCodeAt(0) - Ls[i - 1].charCodeAt(0) > 1) return !0;
                            return !1;
                        })(ownY)) return !0;
                        const ecoLanes = new Set(Object.values(ecoY));
                        const ownLanes = new Set(Object.values(ownY));
                        const max = Math.max(...ecoLanes);
                        for (let y = 1; y < max; y++) if (!ecoLanes.has(y) && !ownLanes.has(y - 1) && !ownLanes.has(y + 1)) return !1;
                        return !0;
                    })(e, r.cabin);
                });
                return {
                    type: e.type,
                    rows: rows,
                    exitRows: [ ...e.exit ],
                    wing: e.wing || [ null, null ],
                    letterY: e.letterY,
                    letterYByCabin: e.letterYByCabin,
                    refWidth: e.refWidth,
                    widths: e.widths
                };
            })
        };
    }
    function loadAll(leg) {
        const key = legKey(leg) + "|all";
        if (seatCache.has(key)) return seatCache.get(key);
        const p = function(leg) {
            if (!leg.acv || !leg.mkt) return Promise.resolve(null);
            const key = leg.acv + "|" + leg.mkt;
            if (layoutMem.has(key)) return layoutMem.get(key);
            let store = {};
            try {
                store = JSON.parse(localStorage.getItem(LAYOUT_KEY) || "{}");
            } catch (e) {}
            const hit = store[key];
            if (hit && Array.isArray(hit.cabins) && hit.zones && Date.now() - (hit.ts || 0) < LAYOUT_TTL) {
                const p = Promise.resolve({
                    cabins: hit.cabins,
                    zones: hit.zones
                });
                layoutMem.set(key, p);
                return p;
            }
            const p = apiGet("/shopping/seatmaps/template?aircraftConfigurationVersion=" + encodeURIComponent(leg.acv) + "&marketingAirlineCode=" + encodeURIComponent(leg.mkt)).then(j => {
                const found = new Set;
                const zones = {};
                ((j.data || {}).seatmaps || []).forEach(m => (m.decks || []).forEach(d => {
                    const deck = d.deckType || "main";
                    (d.seats || []).forEach(s => {
                        const r = /^(\d+)[A-Z]$/.exec(s.seatNumber || "");
                        if (!r || !s.cabin || !SEAT_BC[s.cabin]) return;
                        found.add(s.cabin);
                        const row = Number(r[1]);
                        const list = zones[deck] = zones[deck] || {};
                        const z = list[s.cabin] = list[s.cabin] || {
                            min: row,
                            max: row
                        };
                        row < z.min && (z.min = row);
                        row > z.max && (z.max = row);
                    });
                }));
                const cabins = ORDER.filter(c => found.has(c));
                const value = {
                    cabins: cabins,
                    zones: zones
                };
                try {
                    store[key] = {
                        ts: Date.now(),
                        cabins: cabins,
                        zones: zones
                    };
                    localStorage.setItem(LAYOUT_KEY, JSON.stringify(store));
                } catch (e) {}
                return value;
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
                if (seatCache.has(key)) return seatCache.get(key);
                const p = apiGet("/shopping/seatmaps" + "?originLocationCode=" + encodeURIComponent(leg.from) + "&destinationLocationCode=" + encodeURIComponent(leg.to) + "&departureDate=" + encodeURIComponent(leg.depDate) + "&marketingAirlineCode=" + encodeURIComponent(leg.mkt) + "&marketingFlightNumber=" + encodeURIComponent(leg.mktNo) + "&bookingClass=" + SEAT_BC[cabin]).then(j => normaliseSeatmap(j, cabin));
                p.catch(() => {
                    seatCache.get(key) === p && seatCache.delete(key);
                });
                seatCache.set(key, p);
                return p;
            }(leg, c))).then(results => {
                const merged = mergeSeatmaps(results.filter(r => "fulfilled" === r.status).map(r => r.value));
                merged.failedCabins = cabins.filter((c, i) => {
                    if ("rejected" !== results[i].status) return !1;
                    const e = results[i].reason || {};
                    return !(String(e.apiCode || "").split(",").indexOf("85") >= 0 || e.status >= 400 && e.status < 500);
                });
                if (!merged.decks.length) {
                    const firstErr = results.find(r => "rejected" === r.status);
                    if (firstErr) throw firstErr.reason;
                }
                if (merged.failedCabins.length) {
                    seatCache.get(key) === p && seatCache.delete(key);
                    layout && layout.zones && merged.decks.forEach(deck => {
                        const zones = layout.zones[deck.type] || {};
                        const have = new Set(deck.rows.map(r => r.row));
                        merged.failedCabins.forEach(c => {
                            const z = zones[c];
                            if (z) for (let row = z.min; row <= z.max; row++) if (!have.has(row)) {
                                have.add(row);
                                deck.rows.push({
                                    row: row,
                                    cabin: c,
                                    gapBefore: 0,
                                    seats: {}
                                });
                            }
                        });
                        deck.rows.sort((a, b) => a.row - b.row);
                    });
                }
                return merged;
            });
        });
        p.catch(() => seatCache.delete(key));
        seatCache.set(key, p);
        return p;
    }
    const DECK_NAME = {
        main: "Hauptdeck",
        upper: "Oberdeck",
        lower: "Unterdeck"
    };
    function deckHtml(deck, chars, stairs, nameOf, shapeKey) {
        const CELL_PX = 20;
        const refWidth = Math.max(null != deck.refWidth && deck.refWidth >= 2 ? deck.refWidth : Math.max(2, ...Object.values(deck.letterY || {}).map(v => v + 1)), 2);
        const refY = deck.letterY || {};
        const refLetters = Object.keys(refY);
        const H = refWidth * CELL_PX;
        const plans = {};
        const cols = deck.rows.slice().sort((a, b) => b.row - a.row);
        const exit = new Set(deck.exitRows || []);
        const wing = deck.wing || [ null, null ];
        const PADX = {
            eco: 1,
            ecoPremium: 2,
            business: 4,
            first: 6
        };
        const disp = r => r.slim ? "eco" : r.cabin;
        const colCls = cols.map((r, i) => "c-" + disp(r) + (i > 0 && cols[i - 1].cabin !== r.cabin ? " is-cut" : ""));
        const colSty = cols.map(r => r.gapBefore ? ' style="padding-right:' + ((PADX[disp(r)] || 1) + 7 * r.gapBefore) + 'px"' : "");
        const stairCols = {
            fore: new Set,
            aft: new Set
        };
        if (stairs) {
            const mid = L => {
                const y = refY[L];
                if (null == y) return !1;
                const f = (y + .5) / refWidth;
                return f > .2 && f < .8;
            };
            const empty = cols.map(r => {
                const letters = Object.keys(r.seats);
                return letters.length > 0 && !letters.some(mid);
            });
            const blocks = [];
            let s = -1;
            empty.forEach((e, i) => {
                e && s < 0 && (s = i);
                if ((!e || i === empty.length - 1) && s >= 0) {
                    const end = e ? i : i - 1;
                    end - s >= 1 && blocks.push([ s, end ]);
                    s = -1;
                }
            });
            const n = cols.length;
            const fore = blocks.filter(b => b[0] >= .6 * n).pop();
            const aft = "both" === stairs ? blocks.filter(b => b[1] <= .4 * n)[0] : null;
            const fill = (b, set) => {
                if (b) for (let i = b[0]; i <= b[1]; i++) set.add(i);
            };
            fill(fore, stairCols.fore);
            fill(aft, stairCols.aft);
        }
        const bands = [];
        cols.forEach(r => {
            const last = bands[bands.length - 1];
            last && last.cabin === r.cabin ? last.span++ : bands.push({
                cabin: r.cabin,
                span: 1
            });
        });
        let html = '<table class="mmrc-seatgrid">';
        html += "<tr><th></th>" + bands.map((b, i) => {
            const meta = CABIN[b.cabin];
            return '<th colspan="' + b.span + '" class="mmrc-seatband' + (i > 0 ? " is-cut" : "") + '" style="color:' + (meta ? meta.color : "inherit") + '">' + esc(nameOf(b.cabin)) + "</th>";
        }).join("") + "</tr>";
        html += '<tr class="mmrc-seatrownums"><th></th>' + cols.map((r, i) => {
            return '<th class="' + colCls[i] + (exit.has(r.row) ? " is-exit" : "") + '"' + (row = r.row, 
            null != wing[0] && row >= wing[0] && row <= wing[1] ? ' data-w="1"' : "") + (stairCols.fore.has(i) ? ' data-stairs="fore"' : stairCols.aft.has(i) ? ' data-stairs="aft"' : "") + colSty[i] + ">" + (exit.has(r.row) ? "<i>EXIT</i>" : "") + r.row + "</th>";
            var row;
        }).join("") + "</tr>";
        const CELL_GAP = 2;
        const rail = refLetters.sort((a, b) => refY[a] - refY[b]).map(L => '<span style="top:' + ((refY[L] + .5) * CELL_PX - 6.5).toFixed(1) + 'px">' + esc(L) + "</span>").join("");
        html += '<tr><td class="mmrc-seatrail" style="height:' + H + 'px">' + rail + "</td>";
        cols.forEach((r, i) => {
            const plan = (r => {
                const key = r.cabin + (r.slim ? "|slim" : "");
                if (plans[key]) return plans[key];
                if (r.slim && refLetters.length) return plans[key] = {
                    width: refWidth,
                    y: refY,
                    exact: !0
                };
                const rows = deck.rows.filter(x => x.cabin === r.cabin);
                let own = (deck.letterYByCabin || {})[r.cabin];
                if (!own || !Object.keys(own).length) {
                    own = {};
                    [ ...new Set(rows.flatMap(x => Object.keys(x.seats))) ].sort().forEach((L, i) => {
                        own[L] = i;
                    });
                }
                const letters = Object.keys(own).sort((a, b) => own[a] - own[b]);
                const groups = [];
                letters.forEach((L, i) => {
                    (0 === i || own[L] - own[letters[i - 1]] > 1.5) && groups.push([]);
                    groups[groups.length - 1].push(L);
                });
                const across = rows.reduce((n, x) => Math.max(n, Object.keys(x.seats).length), 1);
                const gaps = groups.length - 1;
                const w = (c => {
                    const w = (deck.widths || {})[c];
                    return null != w && w >= 2 ? w : null;
                })(r.cabin) || letters.length + gaps;
                if (across + gaps >= w) return plans[key] = {
                    width: w,
                    y: own,
                    exact: !0
                };
                const seat = w / (across + gaps);
                const blocks = [];
                let p = 0;
                groups.forEach((g, i) => {
                    const most = rows.reduce((n, x) => Math.max(n, g.filter(L => x.seats[L]).length), 1);
                    const span = most * seat;
                    const start = i === groups.length - 1 && groups.length > 1 ? w - span : p;
                    blocks.push({
                        letters: g,
                        start: start,
                        span: span,
                        seat: seat,
                        most: most
                    });
                    p = start + span + seat;
                });
                if (blocks.length > 2) {
                    const pad = (blocks[blocks.length - 1].start - (blocks[0].start + blocks[0].span) - blocks.slice(1, -1).reduce((n, b) => n + b.span, 0)) / (blocks.length - 1);
                    let q = blocks[0].start + blocks[0].span;
                    blocks.slice(1, -1).forEach(b => {
                        q += pad;
                        b.start = q;
                        q += b.span;
                    });
                }
                return plans[key] = {
                    width: w,
                    y: own,
                    exact: !1,
                    seat: seat,
                    blocks: blocks
                };
            })(r);
            const cell = (plan => H / Math.max(plan.width, 1))(plan);
            const wide = "eco" !== disp(r);
            const place = (() => {
                if (plan.exact) {
                    const at = {};
                    Object.keys(r.seats).forEach(L => {
                        const own = r.slim ? null : (r.seats[L] || {}).y;
                        at[L] = null != own ? own : null != plan.y[L] ? plan.y[L] : plan.width - 1;
                    });
                    return {
                        at: at,
                        seat: 1
                    };
                }
                const at = {};
                plan.blocks.forEach(b => {
                    const has = b.letters.filter(L => r.seats[L]);
                    if (!has.length) return;
                    const off = (b.span - has.length * plan.seat) / 2;
                    has.forEach((L, j) => {
                        at[L] = b.start + off + j * plan.seat;
                    });
                });
                Object.keys(r.seats).forEach(L => {
                    null == at[L] && (at[L] = plan.width - plan.seat);
                });
                return {
                    at: at,
                    seat: plan.seat
                };
            })();
            const sh = Math.max(place.seat * cell - CELL_GAP, 6);
            const seats = Object.keys(r.seats).sort((a, b) => place.at[a] - place.at[b]).map(L => {
                const s = r.seats[L];
                const top = (place.at[L] + place.seat / 2) * cell - sh / 2;
                const meta = CABIN[r.cabin];
                const names = (s.chars || []).map(k => SEAT_CHAR[k]).filter(Boolean);
                const tip = r.row + L + " · " + nameOf(r.cabin) + "\n" + (s.free ? "frei" + (null != s.price ? " · " + cashLabel(s.price, s.currency) : "") : "belegt") + (names.length ? "\n" + names.join(" · ") : "");
                return '<div class="mmrc-seat' + (s.free ? "" : " is-occupied") + '" style="--seatc:' + (meta ? meta.color : "#888") + ";top:" + top.toFixed(1) + "px;height:" + sh.toFixed(1) + 'px" title="' + esc(tip) + '">' + (wide ? esc(L) : "") + "</div>";
            }).join("");
            html += '<td class="' + colCls[i] + '"' + colSty[i] + '><div class="mmrc-rowbox" style="height:' + H + 'px">' + seats + "</div></td>";
        });
        html += "</tr></table>";
        return '<div class="mmrc-plane' + (null != wing[0] ? " has-wings" : "") + '" data-shape="' + esc(shapeKey || "") + '">' + '<div class="mmrc-fuselage' + (stairs ? " has-stairs-" + stairs : "") + '">' + (stairs ? '<div class="mmrc-stairs is-fore" title="Treppe zwischen den Decks"></div>' : "") + ("both" === stairs ? '<div class="mmrc-stairs is-aft" title="Treppe zwischen den Decks"></div>' : "") + html + "</div></div>";
    }
    function seatCabinName(leg, cabin) {
        if ("first" === cabin && leg && "NH" === leg.mkt) {
            const loc = (boundsData().dictionaries || {}).location || {};
            const jp = c => "JP" === (loc[c] || {}).countryCode;
            if (jp(leg.from) && jp(leg.to)) return "Premium Class";
        }
        const meta = CABIN[cabin];
        return meta ? meta.name : cabin;
    }
    const SEAT_CHAR = {
        L: "mehr Beinfreiheit",
        K: "Trennwand davor",
        OW: "über der Tragfläche",
        "1D": "Lehne nicht verstellbar",
        E: "Notausstiegsreihe",
        B: "Babybett möglich",
        H: "behindertengerecht",
        O: "Vorzugsplatz"
    };
    function mainDeckIdx(decks) {
        const i = decks.findIndex(d => "main" === d.type);
        return i >= 0 ? i : 0;
    }
    function seatmapBodyHtml(data, leg) {
        if (!data.decks.length) return '<div class="mmrc-seatmsg">Für diesen Flug liegt kein Sitzplan vor.</div>';
        const noPrice = data.warnings.indexOf("8700") >= 0;
        const failed = (data.failedCabins || []).filter(c => CABIN[c]);
        const nameOf = c => seatCabinName(leg, c);
        const acLabel = shortAircraft(leg.aircraftName);
        const bizSeats = data.decks.reduce((n, d2) => n + d2.rows.filter(r => "business" === r.cabin).reduce((m, r) => m + Object.keys(r.seats).length, 0), 0);
        const theRoom = "NH" === leg.operating && /777-300/.test(leg.aircraftName || "") && 64 === bizSeats;
        const polarisStudio = "UA" === leg.operating && /787-9/.test(leg.aircraftName || "") && 64 === bizSeats;
        const hasPE = data.decks.some(d2 => d2.rows.some(r => "ecoPremium" === r.cabin));
        const senses330 = "LX" === leg.operating && /A330/.test(leg.aircraftName || "") && hasPE;
        return '<div class="mmrc-seathead">' + '<span class="mmrc-seattitle">Sitzplan ' + esc(leg.flightNo) + " · " + esc(leg.from) + " → " + esc(leg.to) + (acLabel ? " · " + esc(acLabel) : "") + "</span>" + (theRoom ? '<span class="mmrc-theroom" title="ANA THE Room: neue Business ' + 'Class in Suiten mit Schiebetür (1-2-1)">THE Room</span>' : "") + (polarisStudio ? '<span class="mmrc-premcab" title="United 787-9 Elevated: ' + 'neue Polaris-Kabine, vorn 8 Polaris-Studio-Suiten mit Tür">Polaris Studio</span>' : "") + (senses330 ? '<span class="mmrc-premcab" title="Swiss Senses: umgerüstete A330 ' + 'mit neuer First, Business und Premium Economy">Senses</span>' : "") + "</div>" + '<div class="mmrc-seatstats">' + function(decks, nameOf) {
            const per = {};
            decks.forEach(d => d.rows.forEach(r => Object.values(r.seats).forEach(s => {
                const e = per[r.cabin] = per[r.cabin] || {
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
            })));
            return ORDER.filter(c => per[c]).map(c => {
                const e = per[c];
                return '<span><i style="border-color:' + CABIN[c].color + '"></i>' + esc(nameOf(c)) + ": " + e.free + " von " + e.total + " frei" + (null != e.min ? ", ab " + esc(cashLabel(e.min, e.cur)) : "") + "</span>";
            }).join("");
        }(data.decks, nameOf) + "</div>" + '<div class="mmrc-seatlegend"><span>umrandet = frei</span>' + '<span><i class="is-occupied"></i>belegt</span>' + '<span class="is-exit">EXIT = Notausstiegsreihe</span></div>' + (data.decks.length > 1 ? '<div class="mmrc-decktabs">' + data.decks.map((d, i) => '<button type="button" class="mmrc-decktab' + (i === mainDeckIdx(data.decks) ? " is-on" : "") + '" data-deck="' + i + '">' + esc(DECK_NAME[d.type] || d.type) + "</button>").join("") + "</div>" : "") + '<div class="mmrc-planes"><div class="mmrc-planesin">' + data.decks.map((d, di) => {
            const stairs = data.decks.length > 1 ? /A380|380/i.test(leg.aircraftName || "") || /^(L38|G38)/.test(leg.acv || "") ? "both" : "fore" : null;
            return '<div class="mmrc-deck' + (data.decks.length > 1 && di !== mainDeckIdx(data.decks) ? " is-off" : "") + '" data-deck="' + di + '">' + deckHtml(d, 0, stairs, nameOf, shapeKeyFor(leg)) + "</div>";
        }).join("") + "</div></div>" + (failed.length ? '<div class="mmrc-seatnote">Nicht geladen: ' + failed.map(c => esc(nameOf(c))).join(", ") + ". " + '<button type="button" class="mmrc-seatretry">Erneut laden</button></div>' : "") + (noPrice ? '<div class="mmrc-seatnote">Diese Airline meldet keine Sitzpreise an das ' + "Buchungssystem. Belegung und Ausstattung stimmen.</div>" : "");
    }
    function decorateSeatmap(panel) {
        const box = panel.querySelector(".mmrc-planes");
        const inner = panel.querySelector(".mmrc-planesin");
        if (inner) {
            inner.style.transform = "";
            inner.style.margin = "";
        }
        [ ...panel.querySelectorAll(".mmrc-plane") ].forEach(plane => {
            if (!plane.offsetWidth) return;
            const fus = plane.querySelector(".mmrc-fuselage");
            const seatRow = plane.querySelector(".mmrc-seatrail");
            if (!fus || !seatRow) return;
            const fr = {
                width: fus.offsetWidth,
                left: fus.offsetLeft
            };
            const sr_height = seatRow.offsetHeight;
            const shape = SHAPES[plane.getAttribute("data-shape")] || SHAPES.a320;
            const wings = plane.querySelectorAll("th[data-w]").length > 0;
            const fusPx = 1.11 * sr_height;
            const svg = planeSvg(shape, fr.width, fusPx, wings);
            const old = plane.querySelector(".mmrc-silhouette");
            old && old.remove();
            const geom = planeGeom(shape, fr.width, fusPx);
            const padY = Math.ceil((HALF_H - .5) * fusPx) + 4;
            const noseW = Math.ceil(geom.noseLen * fusPx);
            const tailW = Math.ceil(geom.tailDrawn * fusPx);
            plane.style.padding = padY + "px " + noseW + "px " + padY + "px " + tailW + "px";
            const clear = Math.ceil((fusPx - sr_height) / 2) + 3;
            const numRow = plane.querySelector(".mmrc-seatrownums");
            numRow && numRow.querySelectorAll("th").forEach(t => {
                t.style.paddingBottom = clear + "px";
            });
            plane.insertAdjacentHTML("afterbegin", svg);
            const el = plane.querySelector(".mmrc-silhouette");
            const midInFus = seatRow.offsetTop + seatRow.offsetHeight / 2;
            if (el) {
                el.style.left = fus.offsetLeft - tailW + "px";
                el.style.top = fus.offsetTop + midInFus + "px";
            }
            plane.querySelectorAll(".mmrc-stairs").forEach(s2 => {
                s2.style.top = midInFus + "px";
                s2.style.height = Math.round(.42 * sr_height) + "px";
                const which = s2.classList.contains("is-aft") ? "aft" : "fore";
                const gap = [ ...plane.querySelectorAll('th[data-stairs="' + which + '"]') ];
                if (!gap.length) return;
                const tbl = plane.querySelector("table.mmrc-seatgrid");
                const dx = tbl ? tbl.offsetLeft : 0;
                const l = Math.min(...gap.map(t => t.offsetLeft)) + dx;
                const r2 = Math.max(...gap.map(t => t.offsetLeft + t.offsetWidth)) + dx;
                s2.style.left = l + 6 + "px";
                s2.style.right = "auto";
                s2.style.width = Math.max(12, r2 - l - 12) + "px";
            });
        });
        if (!box || !inner) return;
        const need = inner.scrollWidth, needH = inner.scrollHeight;
        const have = box.clientWidth;
        if (!need || !have) return;
        const k = Math.max(.6, Math.min(1, have / need));
        if (!(k >= 1)) {
            inner.style.transformOrigin = "left top";
            inner.style.transform = "scale(" + k.toFixed(3) + ")";
            inner.style.marginRight = "-" + Math.ceil(need * (1 - k)) + "px";
            inner.style.marginBottom = "-" + Math.ceil(needH * (1 - k)) + "px";
        }
    }
    function timelineHtml(it) {
        const termLabel = t => "TN" === t ? "Fernbahnhof" : "T" + t;
        const legRow = (leg, legIdx) => {
            const acLabel = shortAircraft(leg.aircraftName);
            const parts = [];
            const lu = LOGO_EMBED[leg.operating] || (code = leg.operating, logoBase && /^[A-Z0-9]{2}$/.test(code || "") ? logoBase + "icon-" + code + ".svg" : null);
            var code;
            lu && parts.push(`<img class="mmrc-logo" src="${esc(lu)}" alt="" aria-hidden="true" ` + `data-code="${esc(leg.operating || "")}" ` + `onerror="var s=document.createElement('span');s.className='mmrc-logofallback';` + `s.textContent=this.dataset.code;this.replaceWith(s)">`);
            leg.operatingName && parts.push(`<span class="mmrc-air${leg.codeshare ? " is-codeshare" : ""}"` + (leg.codeshare ? ` title="Durchgeführt von ${esc(leg.operatingName)}"` : "") + `>${esc(leg.operatingName)}</span>`);
            parts.push(`<span class="mmrc-fno">${esc(fmtFlightNo(leg.flightNo))}</span>`);
            seatmapOn() && apiOf() && leg.mkt && leg.mktNo && leg.depDate ? parts.push(`<button type="button" class="mmrc-seatbtn${leg.widebody ? " is-wide" : ""}" ` + `data-leg="${legIdx}" title="${esc(leg.aircraftName)} – Sitzplan ansehen">` + (leg => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="` + ((leg => /TRAIN|RAIL/i.test(String(leg && leg.aircraftName || "")))(leg) ? TRAIN_PATH : (leg => /\bBUS\b/i.test(String(leg && leg.aircraftName || "")))(leg) ? BUS_PATH : PLANE_PATH) + `"/></svg>`)(leg) + `${esc(acLabel)}</button>`) : parts.push(`<span class="mmrc-ac${leg.widebody ? " is-wide" : ""}" title="${esc(leg.aircraftName)}">${esc(acLabel)}</span>`);
            const cabinBadges = [];
            leg.allegris && cabinBadges.push(`<span class="mmrc-allegris">Allegris</span>`);
            leg.newBiz && cabinBadges.push(`<span class="mmrc-newbiz" title="Umgerüsteter A380 mit der neuen Business Class (1-2-1, direkter Gangzugang)">BC Retrofit</span>`);
            leg.premium && cabinBadges.push(`<span class="mmrc-premcab" title="${esc(leg.premium.title)}">${esc(leg.premium.label)}</span>`);
            const acIdx = parts.length - 1;
            cabinBadges.length && (parts[acIdx] = `<span class="mmrc-acgroup">${parts[acIdx]}` + `<span class="mmrc-cabinbadges">${cabinBadges.join("")}</span></span>`);
            return `<div class="mmrc-row is-leg">` + ((leg, extra) => `<span class="mmrc-t" data-iata="${esc(leg.from)}">${esc(leg.dep)}</span>` + `<span class="mmrc-arrow">` + (leg.duration ? `<span>${esc(fmtDur(leg.duration))}</span>` : "") + `</span>` + `<span class="mmrc-t" data-iata="${esc(leg.to)}">${esc(leg.arr)}${extra || ""}</span>`)(leg, extraOf(leg, legIdx)) + `<span class="mmrc-legmeta">${parts.join("")}</span></div>`;
        };
        const extraOf = (leg, i) => i === it.legs.length - 1 && it.daysOffset ? `<span class="mmrc-nextday" title="Ankunft ${it.daysOffset} Tag${it.daysOffset > 1 ? "e" : ""} später">` + `+${it.daysOffset}</span>` : "";
        const rows = [];
        it.legs.forEach((leg, i) => {
            rows.push(legRow(leg, i));
            if (i === it.legs.length - 1) return;
            const layHtml = ((lo, leg, next) => {
                const dur = lo ? lo.duration : null;
                const long = null != dur && dur >= 4 * 3600;
                const mct = MCT[String(leg.to || "").toUpperCase()] || MCT_DEFAULT;
                const tight = null != dur && dur <= 60 * (mct + 15);
                const airportChanged = leg.to && next && next.from && leg.to !== next.from;
                const changed = !airportChanged && leg.termArr && next && next.termDep && leg.termArr !== next.termDep;
                const place = (() => {
                    try {
                        const ia = window.__mmIata;
                        const de = ia && "function" == typeof ia.cityName ? ia.cityName(leg.to) : null;
                        if (de) return de;
                    } catch (e) {}
                    return properCase(leg.toCity || leg.to || "");
                })();
                const time = null != dur ? `${tight ? `<span class="mmrc-run" title="Kurze Umstiegszeit">${RUN_SVG}</span>` : long && !airportChanged ? `<span class="mmrc-lounge" title="Langer Aufenthalt">${LOUNGE_SVG}</span>` : ""}<b>${esc(fmtDur(dur))}</b>` : "";
                let cls = "", lead = "", mark = "";
                if (airportChanged) {
                    cls = " is-apchange";
                    lead = `<span class="mmrc-lead">Flughafenwechsel${place ? " in " + esc(place) : ""}:</span>`;
                    mark = `<span class="mmrc-tc" title="Der Transfer erfolgt in eigener Verantwortung. Gepäck muss neu aufgegeben werden, Check-in erneut.">` + `${esc(leg.to)} <i>→</i> ${esc(next.from)}</span>`;
                } else if (changed) {
                    const rail = "TN" === leg.termArr || "TN" === next.termDep;
                    cls = " is-tchange";
                    lead = `<span class="mmrc-lead">${rail ? "Wechsel" : "Terminalwechsel"}${place ? " in " + esc(place) : ""}:</span>`;
                    mark = `<span class="mmrc-tc" title="${rail ? "Wechsel zwischen Fernbahnhof und Terminal" : "Terminalwechsel beim Umstieg"}">` + (rail ? `${esc(termLabel(leg.termArr))} <i>→</i> ${esc(termLabel(next.termDep))}` : `T${esc(leg.termArr)} <i>→</i> T${esc(next.termDep)}`) + `</span>`;
                } else {
                    lead = `<span class="mmrc-lead is-plain">Umstiegszeit${place ? " in " + esc(place) : ""}:</span>`;
                    leg.termArr && (mark = `<span class="mmrc-tsame">(${esc(termLabel(leg.termArr))})</span>`);
                }
                return time || mark ? `<div class="mmrc-row is-lay${cls}${long ? " is-long" : ""}${tight ? " is-tight" : ""}">` + `<span class="mmrc-laymeta">${`${lead} ${time} ${mark}`}</span></div>` : "";
            })(it.layovers[i], leg, it.legs[i + 1]);
            layHtml && rows.push(layHtml);
        });
        return `<div class="mmrc-tl">${rows.join("")}</div>`;
    }
    function detailRows(f) {
        const rows = [];
        if (null != f.cash) {
            let z = cashLabel(f.cash, f.currency);
            f.currency && "EUR" !== f.currency && !z.endsWith(curSym(f.currency)) && (z += " (" + money(f.cash) + " " + curSym(f.currency) + ")");
            rows.push([ "Zuzahlung", z, "" ]);
        }
        null != f.seatsLeft && rows.push([ "Freie Plätze", String(f.seatsLeft), f.seatsLeft <= 3 ? "is-no" : "" ]);
        f.baggage && rows.push([ "Aufgabegepäck", bagText(f.baggage), "" ]);
        f.cabinBag && rows.push([ "Handgepäck", bagText(f.cabinBag), "" ]);
        rows.push([ "Pers. Gegenstand", f.personalItem ? "1 Stück" : "–", "" ]);
        rows.push([ "Sitzplatz", f.seatReservation ? "inklusive" : "nicht inkl.", f.seatReservation ? "is-yes" : "is-no" ]);
        const flex = [];
        if (f.change) {
            const free = f.change.allowed && !f.change.fee;
            flex.push([ "Umbuchung", f.change.allowed ? free ? "kostenlos" : cashLabel(f.change.fee, f.change.currency) : "nicht möglich", f.change.allowed ? free ? "is-yes" : "" : "is-no" ]);
            f.change.allowed && flex.push([ "__sub", "zzgl. Tarifdifferenz", "" ]);
        }
        if (f.refund) {
            const free = f.refund.allowed && !f.refund.fee;
            flex.push([ "Erstattung", f.refund.allowed ? free ? "kostenlos" : cashLabel(f.refund.fee, f.refund.currency) : "nicht möglich", f.refund.allowed ? free ? "is-yes" : "" : "is-no" ]);
        }
        return {
            rows: rows,
            flex: flex
        };
    }
    const dlOf = list => "<dl>" + list.map(([k, v, c]) => "__sub" === k ? `<dt class="is-sub">${esc(v)}</dt><dd></dd>` : `<dt>${esc(k)}</dt><dd class="${c}">${esc(v)}</dd>`).join("") + "</dl>";
    function bagText(s) {
        const m = /(\d+)\s+(?:CHECKED BAGS?|CABIN BAGS?)[^0-9]*(\d+)\s*KG/i.exec(s || "");
        return m ? m[1] + " × " + m[2] + " kg" : properCase(s || "");
    }
    let pendingBooking = null;
    const bookingInFlight = () => !!(pendingBooking && pendingBooking.nativeBtn && pendingBooking.nativeBtn.isConnected && pendingBooking.nativeBtn.disabled);
    const TIER_ORDER = [ "Basic", "Light", "Classic", "Comfort", "Comfort +", "Flex", "Standard" ];
    let openFareCol = null;
    function closeFarePop() {
        if (!openFareCol) return;
        const col = openFareCol;
        openFareCol = null;
        col.classList.remove("is-open");
        const fp = col.querySelector(".mmrc-colface-back");
        setTimeout(() => {
            if (col !== openFareCol) {
                fp && fp.remove();
                col.classList.remove("is-3d");
            }
        }, 480);
    }
    state._closeFarePop = closeFarePop;
    if (window.__mmFarePopClick) try {
        document.removeEventListener("click", window.__mmFarePopClick);
    } catch (e) {}
    const onDocClick = e => {
        try {
            if (!e.isTrusted) return;
            if (e.target.closest(".mmrc-col")) return;
            const c = window.__mmCards;
            c && c._closeFarePop && c._closeFarePop();
        } catch (e2) {}
    };
    window.__mmFarePopClick = onDocClick;
    document.addEventListener("click", onDocClick);
    function renderColumn(cabin, fares, dicts, searched, boundKey, axis) {
        const meta = CABIN[cabin];
        const col = document.createElement("div");
        col.className = "mmrc-col" + (fares.length ? "" : " is-empty") + (searched && cabin === searched ? " is-searched" : "");
        col.style.setProperty("--mmc", meta.color);
        const cashes = fares.map(f => f.cash).filter(v => null != v);
        const cash = cashes.length ? Math.min(...cashes) : null;
        const cur = fares.length ? fares[0].currency : null;
        const uniform = fares.every(f => null == f.cash || f.cash === cash);
        const seatMin = fares.reduce((m, f) => null != f.seatsLeft && (null == m || f.seatsLeft < m) ? f.seatsLeft : m, null);
        let html = `<div class="mmrc-h"><div class="mmrc-nm">${esc(meta.name)}</div>` + (null != seatMin ? `<span class="mmrc-seats${seatMin <= 3 ? " is-low" : ""}">` + (1 === seatMin ? "nur noch 1 Platz" : seatMin + " Plätze übrig") + `</span>` : "") + (null != cash ? `<div class="mmrc-cash" data-label="${uniform ? "Zuzahlung" : "Zuzahlung ab"}">` + `${esc(cashLabel(cash, cur))}</div>` : "") + `</div>`;
        const mixed = fares.find(f => f.mixed);
        if (mixed) {
            const segs = mixed.perLeg.map(l => {
                const note = function(cabin, leg, dicts) {
                    if (!leg) return null;
                    const loc = dicts && dicts.location || {};
                    const c1 = (loc[leg.from] || {}).countryCode, c2 = (loc[leg.to] || {}).countryCode;
                    return c1 && c2 ? "first" === cabin && NA.has(c1) && NA.has(c2) && (leg.duration || 0) < 6 * 3600 ? "US-Dom." : "business" === cabin && EU.has(c1) && EU.has(c2) && (leg.duration || 0) < 4 * 3600 ? "Europa" : null : null;
                }(l.cabin, l, dicts);
                const lower = (CABIN[l.cabin] || {}).rank < meta.rank;
                const label = (CABIN[l.cabin] || {}).name || l.cabin;
                const cls = note ? "is-note" : lower ? "is-down" : "";
                return `<div class="mmrc-seg"><span>${esc(l.from)}→${esc(l.to)}</span>` + `<em class="${cls}">${esc(label)}${note ? " · " + esc(note) : lower ? " ↓" : ""}</em></div>`;
            }).join("");
            html += `<div class="mmrc-segs"><span class="mmrc-lbl">Gemischte Kabinen</span>${segs}</div>`;
        } else html += `<div class="mmrc-segs"></div>`;
        html += fares.length ? `<div class="mmrc-body"><div class="mmrc-flist">` + (axis && axis.length ? axis : fares.map(f => f.tier || "")).map(tier => {
            const f = fares.filter(x => (x.tier || "") === tier).sort((a, b) => a.miles - b.miles)[0];
            return f ? `<div class="mmrc-f" data-code="${esc(f.code)}">` + `<span class="mmrc-ti">${esc(tier)}</span>` + `<span class="mmrc-mi">${num(f.miles)}</span>` + `</div>` : `<div class="mmrc-f is-gap" aria-hidden="true"></div>`;
        }).join("") + `</div></div>` : `<div class="mmrc-none">kein Angebot</div>`;
        let note = "";
        searched && cabin !== searched && (note = fares.length ? `Alle ${esc(meta.name)}-Tarife erscheinen erst bei einer ${esc(meta.name)}-Suche.` : `Eine eigene ${esc(meta.name)}-Suche kann weitere Tarife finden.`);
        html += `<div class="mmrc-note">${note}</div>`;
        const flip = document.createElement("div");
        flip.className = "mmrc-colflip";
        const front = document.createElement("div");
        front.className = "mmrc-colface mmrc-colface-front";
        front.innerHTML = html;
        flip.appendChild(front);
        col.appendChild(flip);
        const byCode = new Map(fares.map(f => [ f.code, f ]));
        const pop = document.createElement("span");
        pop.className = "mmrc-pop";
        col.addEventListener("click", e => {
            if (e.target.closest(".mmrc-pop")) return;
            if (e.target.closest(".mmrc-fclose")) {
                closeFarePop();
                return;
            }
            const choose = e.target.closest(".mmrc-fchoose");
            if (choose) {
                const back = choose.closest(".mmrc-colface-back");
                const f = back && byCode.get(back.dataset.code);
                f && function(fare, uiBtn, boundKey) {
                    if (!fare || !fare.airBoundId) return;
                    const label = uiBtn ? uiBtn.textContent : null;
                    const busy = t => {
                        pendingBooking = {
                            key: boundKey,
                            code: fare.code,
                            text: t,
                            listSig: boundsData().listSig || null
                        };
                        if (t === CART && 0 === t.indexOf("Rückflüge")) try {
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
                        pendingBooking = null;
                        if (uiBtn) {
                            uiBtn.disabled = !1;
                            uiBtn.classList.add("is-error");
                            uiBtn.textContent = t;
                            setTimeout(() => {
                                if (uiBtn.isConnected) {
                                    uiBtn.classList.remove("is-error");
                                    uiBtn.textContent = label;
                                }
                            }, 5e3);
                        }
                    };
                    const CART = (() => {
                        try {
                            if ("return" === listSide()) return "Warenkorb wird geöffnet …";
                            const o = JSON.parse(sessionStorage.getItem("airBoundsSearch"));
                            return (o.entities[o.selectedAirBoundsSearchId].itineraries || []).length > 1 ? "Rückflüge werden geladen …" : "Warenkorb wird geöffnet …";
                        } catch (e) {
                            return "Warenkorb wird geöffnet …";
                        }
                    })();
                    const id = "selectFare-" + fare.airBoundId + "-" + fare.code;
                    const find = () => document.querySelector('[id="' + id.replace(/"/g, '\\"') + '"]');
                    const direct = find();
                    if (direct) {
                        busy(CART);
                        pendingBooking && (pendingBooking.nativeBtn = direct);
                        direct.click();
                        return;
                    }
                    const native = function(key) {
                        const km = /^(.*?)(?:#(\d+))?$/.exec(String(key || ""));
                        const want = km[1], nth = km[2] ? parseInt(km[2], 10) : 1;
                        let hits = 0;
                        const cards = document.querySelectorAll("refx-flight-card-pres");
                        for (const card of cards) try {
                            let txt = "";
                            (function walk(node) {
                                if (3 !== node.nodeType) {
                                    if (1 === node.nodeType && "REFX-FLIGHT-DETAILS" !== node.tagName) for (let n = node.firstChild; n; n = n.nextSibling) walk(n);
                                } else txt += node.nodeValue + " ";
                            })(card);
                            txt = txt.replace(/\s+/g, " ");
                            const times = txt.match(/\b(\d{2}:\d{2})\b/g);
                            const codes = txt.match(/\b([A-Z]{3})\b/g);
                            if (!times || times.length < 2 || !codes || codes.length < 2) continue;
                            const stopM = /(\d+)[^0-9]{0,24}?stopp?s?\b/i.exec(txt);
                            const stops = /direkt|direct|nonstop/i.test(txt) ? 0 : stopM ? parseInt(stopM[1]) : 0;
                            if (codes[0] + "|" + codes[1] + "|" + times[0] + "|" + times[1] + "|" + stops === want && ++hits === nth) return card;
                        } catch (e) {}
                        return null;
                    }(boundKey);
                    if (!native) {
                        fail("Auswahl nicht möglich. Seite neu laden.");
                        return;
                    }
                    const slot = fare.cabin ? native.querySelector('[data-fare-family-group="' + fare.cabin + '"]') : null;
                    const cabinBtn = slot ? "BUTTON" === slot.tagName ? slot : slot.querySelector("button") : null;
                    if (!cabinBtn) {
                        fail("Auswahl nicht möglich. Seite neu laden.");
                        return;
                    }
                    const had = new Set(document.querySelectorAll('[id^="selectFare-"]'));
                    const suffix = "-" + fare.code;
                    busy("Tarif wird gewählt …");
                    cabinBtn.click();
                    const deadline = Date.now() + 8e3;
                    let retried = !1;
                    const tick = () => {
                        const target = find() || (() => {
                            for (const b of document.querySelectorAll('[id^="selectFare-"]')) if (!had.has(b) && b.id.endsWith(suffix)) return b;
                            return null;
                        })();
                        if (target) {
                            busy(CART);
                            pendingBooking && (pendingBooking.nativeBtn = target);
                            target.click();
                            return;
                        }
                        const left = deadline - Date.now();
                        if (left <= 0) fail("Tarif nicht wählbar"); else {
                            if (!retried && left < 4e3) {
                                retried = !0;
                                try {
                                    cabinBtn.click();
                                } catch (e) {}
                            }
                            setTimeout(tick, 140);
                        }
                    };
                    setTimeout(tick, 160);
                }(f, choose, boundKey);
                return;
            }
            if (e.target.closest(".mmrc-colface-back")) return;
            const tile = e.target.closest(".mmrc-f");
            const f = tile && byCode.get(tile.dataset.code);
            f && (f => {
                if (openFareCol === col && col.querySelector(".mmrc-colface-back") && col.querySelector(".mmrc-colface-back").dataset.code === f.code) {
                    closeFarePop();
                    return;
                }
                closeFarePop();
                const stale = col.querySelector(".mmrc-colface-back");
                stale && stale.remove();
                const fp = document.createElement("div");
                fp.className = "mmrc-colface mmrc-colface-back";
                fp.dataset.code = f.code;
                fp.innerHTML = function(f, cabinMeta) {
                    const {rows: rows, flex: flex} = detailRows(f);
                    const dl = list => '<dl class="mmrc-fback-rows" lang="de">' + list.map(([k, v, c]) => "__sub" === k ? `<div class="is-sub"><dt class="is-sub">${esc(v)}</dt><dd></dd></div>` : `<div><dt>${esc(k)}</dt><dd class="${c}">${esc(v)}</dd></div>`).join("") + "</dl>";
                    const bodyRows = rows.filter(([k]) => "Zuzahlung" !== k);
                    const price = [];
                    null != f.miles && price.push(`<b>${esc(num(f.miles))}</b> Meilen`);
                    null != f.cash && price.push(`+ <b>${esc(cashLabel(f.cash, f.currency))}</b>`);
                    return `<button type="button" class="mmrc-fclose" title="Schließen" aria-label="Schließen">✕</button>` + `<div class="mmrc-fback-head">` + `<div class="mmrc-fback-cabin">${esc(cabinMeta.name)}</div>` + `<div class="mmrc-fback-tier">${esc(f.tier || "")}</div>` + `<div class="mmrc-fback-price">${price.join(" ")}</div>` + `</div>` + dl(bodyRows) + (flex.length ? `<div class="mmrc-fback-sep"></div>` + dl(flex) : "") + `<button type="button" class="mmrc-fchoose">Wählen</button>`;
                }(f, meta);
                flip.appendChild(fp);
                openFareCol = col;
                col.classList.add("is-3d");
                requestAnimationFrame(() => {
                    openFareCol === col && col.classList.add("is-open");
                });
            })(f);
        });
        col.addEventListener("mouseover", e => {
            const tile = e.target.closest(".mmrc-f");
            if (!tile || tile.contains(pop)) return;
            const f = byCode.get(tile.dataset.code);
            if (f) {
                pop.innerHTML = function(f, cabinMeta) {
                    const {rows: rows, flex: flex} = detailRows(f);
                    return `<h4>${esc(cabinMeta.name)} ${esc(f.tier || "")}</h4>` + dlOf(rows) + (flex.length ? `<div class="mmrc-sep"></div>` + dlOf(flex) : "");
                }(f, CABIN[cabin]);
                tile.appendChild(pop);
            }
        });
        return col;
    }
    const HOVER_DWELL = 450;
    const HOVER_SHOW = 200;
    function overlayEl() {
        let ov = document.querySelector(".mmrc-seatoverlay");
        if (ov) return ov;
        ov = document.createElement("div");
        ov.className = "mmrc-seatoverlay";
        ov.innerHTML = '<div class="mmrc-seatmodal">' + '<button type="button" class="mmrc-seatclose" title="Schließen">✕</button>' + '<div class="mmrc-seattabs"></div>' + '<div class="mmrc-seatpanel"></div></div>';
        ov.addEventListener("click", e => {
            e.target === ov && closeOverlay();
        });
        ov.querySelector(".mmrc-seatclose").addEventListener("click", closeOverlay);
        document.body.appendChild(ov);
        return ov;
    }
    function closeOverlay() {
        const ov = document.querySelector(".mmrc-seatoverlay");
        if (ov) {
            ov.classList.remove("is-open");
            ov.dataset.legKey = "";
        }
    }
    if (window.__mmCardsEsc) try {
        document.removeEventListener("keydown", window.__mmCardsEsc);
    } catch (e) {}
    const onEscKey = e => {
        if ("Escape" === e.key) try {
            const c = window.__mmCards;
            c && c._closeOverlay && c._closeOverlay();
            c && c._closeFarePop && c._closeFarePop();
        } catch (e2) {}
    };
    window.__mmCardsEsc = onEscKey;
    document.addEventListener("keydown", onEscKey);
    state._closeOverlay = closeOverlay;
    function hidePeek() {
        const pk = document.querySelector(".mmrc-seatpeek");
        pk && pk.remove();
    }
    function openSeatmap(it, idx) {
        const leg = (it.legs || [])[idx];
        if (!leg) return;
        const ov = overlayEl();
        ov.classList.add("is-open");
        ov.dataset.legKey = legKey(leg);
        const tabs = ov.querySelector(".mmrc-seattabs");
        const addressable = (it.legs || []).map((l, i) => ({
            l: l,
            i: i
        })).filter(x => x.l.mkt && x.l.mktNo && x.l.depDate);
        tabs.innerHTML = addressable.length > 1 ? addressable.map(x => '<button type="button" data-leg="' + x.i + '"' + (x.i === idx ? ' class="is-on"' : "") + ">" + esc(fmtFlightNo(x.l.flightNo) + " · " + x.l.from + " → " + x.l.to) + "</button>").join("") : "";
        tabs.querySelectorAll("button").forEach(b => b.addEventListener("click", () => openSeatmap(it, Number(b.dataset.leg))));
        const panel = ov.querySelector(".mmrc-seatpanel");
        panel.innerHTML = '<div class="mmrc-seatmsg">Sitzplan wird geladen …</div>';
        loadAll(leg).then(data => {
            if (ov.dataset.legKey !== legKey(leg)) return;
            panel.innerHTML = seatmapBodyHtml(data, leg);
            !function(panel) {
                const tabs = [ ...panel.querySelectorAll(".mmrc-decktab") ];
                tabs.length && tabs.forEach(tab => tab.addEventListener("click", () => {
                    const want = tab.dataset.deck;
                    tabs.forEach(t => t.classList.toggle("is-on", t === tab));
                    panel.querySelectorAll(".mmrc-deck").forEach(d => d.classList.toggle("is-off", d.dataset.deck !== want));
                    decorateSeatmap(panel);
                }));
            }(panel);
            decorateSeatmap(panel);
            const retry = panel.querySelector(".mmrc-seatretry");
            retry && retry.addEventListener("click", () => openSeatmap(it, idx));
        }).catch(e => {
            if (ov.dataset.legKey !== legKey(leg)) return;
            const known = e && "7425" === e.apiCode ? "Zu diesem Flug ist im Buchungssystem kein Sitzplan hinterlegt." : e && String(e.apiCode || "").indexOf("65019") >= 0 ? "Diese Airline liefert dem Buchungssystem keinen Sitzplan." : "Der Sitzplan konnte nicht geladen werden.";
            panel.innerHTML = '<div class="mmrc-seatmsg">' + known + ' <span class="mmrc-seatmsgdetail">' + esc(String(e && e.message || "")) + "</span></div>";
        });
    }
    const view = {
        cmp: null,
        pred: null
    };
    state.setView = v => {
        view.cmp = v && v.cmp || null;
        view.pred = v && v.pred || null;
        render();
    };
    state.items = () => {
        const bd = boundsData();
        const map = bd.bounds;
        return map && Array.isArray(bd.current) ? bd.current.map(k => map.get(k)).filter(Boolean) : [];
    };
    const renderHooks = [];
    state.onRender = fn => {
        renderHooks.push(fn);
        return () => {
            const i = renderHooks.indexOf(fn);
            i >= 0 && renderHooks.splice(i, 1);
        };
    };
    const container = () => document.querySelector(".upsell-premium-pres-container");
    function listEl() {
        const host = container();
        if (!host) return null;
        host.parentNode && (state._skelAnchor = host.parentNode);
        let list = host.querySelector(".mmrc-list");
        if (!list) {
            document.querySelectorAll(".mmrc-list").forEach(e => e.remove());
            list = document.createElement("ol");
            list.className = "mmrc-list";
            list.setAttribute("aria-label", "Prämienflüge");
            const native = host.querySelector("mat-accordion");
            host.insertBefore(list, native || null);
        }
        return list;
    }
    let searching = 0;
    let noOffer = null;
    state.showNoOffer = text => {
        if (state.superseded || !cardsOn()) return !1;
        if (!listEl()) return !1;
        noOffer = String(text || "");
        render();
        return !0;
    };
    function restartSearch() {
        try {
            const o = JSON.parse(sessionStorage.getItem("airBoundsSearch"));
            const e = o.entities[o.selectedAirBoundsSearchId];
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
        return '<div class="mmrc-bar-text">Flüge werden gesucht …</div>' + '<div class="mmrc-skel">' + card + card + card + "</div>";
    }
    function skeleton(list) {
        list.innerHTML = "<li>" + skelHtml() + "</li>";
    }
    const FLOAT_ID = "mmrc-skel-float";
    function showFloatSkel() {
        if (document.getElementById(FLOAT_ID)) return;
        const host = state._skelAnchor && state._skelAnchor.isConnected && state._skelAnchor || document.querySelector(".main-content") || document.body;
        const div = document.createElement("div");
        div.id = FLOAT_ID;
        div.innerHTML = skelHtml();
        host.appendChild(div);
    }
    function hideFloatSkel() {
        const e = document.getElementById(FLOAT_ID);
        e && e.remove();
    }
    function listSide() {
        try {
            const o = JSON.parse(sessionStorage.getItem("airBoundsSearch"));
            const its = o.entities[o.selectedAirBoundsSearchId].itineraries || [];
            if (its.length < 2) return "outbound";
            const bd = boundsData();
            const key = bd && bd.current && bd.current[0];
            const first = key ? bd.bounds instanceof Map ? bd.bounds.get(key) : bd.bounds[key] : null;
            if (!first) return null;
            const loc = (bd.dictionaries || {}).location || {};
            const same = (iata, code) => !(!iata || !code || iata !== code && (!loc[iata] || loc[iata].cityCode !== code));
            return same(first.origin, its[1].originLocationCode) ? "return" : same(first.origin, its[0].originLocationCode) ? "outbound" : null;
        } catch (e) {
            return null;
        }
    }
    let restartDialogSeen = !1;
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
        const lastErr = (boundsData() || {}).lastError;
        if (lastErr) {
            list.innerHTML = "";
            const li = document.createElement("li");
            li.className = "mmrc-msg mmrc-nooffer";
            const expired = "65012" === String(lastErr.code);
            const noFlight = "7959" === String(lastErr.code);
            const seg = /SEGMENT (\d)/.exec(lastErr.detail || "");
            li.innerHTML = esc(expired ? "Der gewählte Hinflug ist abgelaufen." : noFlight ? "Kein Flug für den " + (seg && "2" === seg[1] ? "Rückflug" : "Hinflug") + " an diesem Tag." : "Suche fehlgeschlagen" + (lastErr.code ? " (" + lastErr.code + (lastErr.detail ? ": " + lastErr.detail : "") + ")" : "") + ".") + (noFlight ? "" : '<button type="button" class="mmrc-restart">Suche neu starten</button>');
            const rb = li.querySelector(".mmrc-restart");
            rb && rb.addEventListener("click", restartSearch);
            list.appendChild(li);
            state.counts.shown = 0;
            state.counts.total = 0;
            emitRender();
            return;
        }
        if (noOffer) {
            list.innerHTML = "";
            const li = document.createElement("li");
            li.className = "mmrc-msg mmrc-nooffer";
            li.textContent = noOffer;
            list.appendChild(li);
            state.counts.shown = 0;
            state.counts.total = 0;
            emitRender();
            return;
        }
        const all = state.items();
        state.counts.total = all.length;
        if (!all.length) {
            list.innerHTML = "";
            state.counts.shown = 0;
            emitRender();
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
                const j = JSON.parse(sessionStorage.getItem("airBoundsSearch"));
                const e = j.entities[j.selectedAirBoundsSearchId];
                for (const code of e.commercialFareFamilies || []) {
                    const hit = CFF_CABIN.find(([re]) => re.test(code));
                    if (hit) return hit[1];
                }
            } catch (e) {}
            return null;
        }();
        const dicts = boundsData().dictionaries;
        const cabins = function(items) {
            return ORDER.filter(c => items.some(it => (it.fares || []).some(f => f.cabin === c)));
        }(all);
        list.innerHTML = "";
        if (searched && !cabins.includes(searched)) {
            const li = document.createElement("li");
            li.className = "mmrc-msg mmrc-nofare";
            li.textContent = "In der " + CABIN[searched].name + " Class gibt es an diesem Tag " + "keine Prämienflüge. Die Karten zeigen die übrigen Klassen.";
            list.appendChild(li);
        }
        const officeNote = function(all) {
            let foreign = null;
            outer: for (const it of all) for (const f of it.fares || []) if (f.currency && "EUR" !== f.currency) {
                foreign = f.currency;
                break outer;
            }
            if (!foreign) return null;
            const off = function() {
                try {
                    const api = boundsData().api;
                    const h = api && api.headers || {};
                    const key = Object.keys(h).find(k => "authorization" === k.toLowerCase());
                    const jwt = String(h[key]).replace(/^Bearer\s+/i, "");
                    const payload = JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
                    const ctx = JSON.parse(payload.context);
                    return {
                        office: ctx.officeId || null,
                        country: ctx.country || null
                    };
                } catch (e) {
                    return null;
                }
            }();
            const city = off && off.office ? off.office.slice(0, 3) : null;
            const label = city ? city + (off.country ? "/" + off.country : "") : "unbekannt";
            const converts = (() => {
                try {
                    const c = window.__mmCurrency;
                    return !(!c || !c.toEUR || null == c.toEUR(1, foreign));
                } catch (e) {
                    return !1;
                }
            })();
            const li = document.createElement("li");
            li.className = "mmrc-msg mmrc-office";
            li.innerHTML = "Buchungsbüro " + esc(label) + ": Zuzahlungen werden in " + esc(foreign) + " berechnet" + (converts ? " (Anzeige in € umgerechnet)" : "") + ". Eine neue Suche über die " + '<a href="https://www.miles-and-more.com/" class="mmrc-office-link">Hauptseite</a> ' + "setzt das Büro aufs Abflugland.";
            return li;
        }(all);
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
            li.innerHTML = "Gewählter Hinflug: <b>" + esc(label || pick.code) + "</b>. " + "Die Rückflüge unten gelten zu diesem Hinflug." + (back ? ' <button type="button" class="mmrc-outbound-edit">Hinflug ändern</button>' : "");
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
                list.appendChild(function(it, cabins, dicts, searched) {
                    const li = document.createElement("li");
                    li.className = "mmrc-card";
                    li.dataset.key = it.key;
                    const left = document.createElement("div");
                    left.className = "mmrc-left";
                    const stopsLabel = 0 === it.stops ? "Direktflug" : it.stops + " Stopp" + (it.stops > 1 ? "s" : "");
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
                    cabins.forEach(c => cols.appendChild(renderColumn(c, byCabin[c] || [], dicts, searched, it.key, axis)));
                    cols.style.setProperty("--mm-n", cabins.length);
                    !function(cols) {
                        const all = [ ...cols.querySelectorAll(".mmrc-col") ];
                        if (all.length < 2) return;
                        const milesOf = c => {
                            const n = [ ...c.querySelectorAll(".mmrc-mi") ].map(e => Number(e.textContent.replace(/\./g, ""))).filter(v => v > 0);
                            return n.length ? Math.min(...n) : 1 / 0;
                        };
                        const filled = all.filter(c => !c.classList.contains("is-empty"));
                        let active = filled.find(c => c.classList.contains("is-searched"));
                        if (!active) {
                            active = filled.slice().sort((a, b) => milesOf(a) - milesOf(b))[0];
                            active && active.classList.add("is-fallback");
                        }
                        if (!active) return;
                        active.classList.add("is-current");
                        const bar = document.createElement("div");
                        bar.className = "mmrc-cabpick";
                        const chip = c => {
                            const nm = c.querySelector(".mmrc-nm");
                            const m = milesOf(c);
                            const b = document.createElement("button");
                            b.type = "button";
                            b.className = "mmrc-cab" + (c.classList.contains("is-empty") ? " is-empty" : "");
                            b.style.setProperty("--mmc", c.style.getPropertyValue("--mmc"));
                            b.innerHTML = "<i>" + esc(nm ? nm.childNodes[0].textContent.trim() : "?") + "</i>" + "<b>" + (m === 1 / 0 ? "–" : m.toLocaleString("de-DE")) + "</b>";
                            b.addEventListener("click", () => {
                                all.forEach(x => x.classList.remove("is-current"));
                                c.classList.add("is-current");
                                draw();
                            });
                            return b;
                        };
                        const draw = () => {
                            const now = all.find(c => c.classList.contains("is-current"));
                            bar.replaceChildren(...all.filter(c => c !== now).map(chip));
                        };
                        draw();
                        cols.appendChild(bar);
                    }(cols);
                    li.appendChild(left);
                    li.appendChild(cols);
                    !function(li, it) {
                        seatmapOn() && li.querySelectorAll(".mmrc-seatbtn").forEach(btn => {
                            const idx = Number(btn.dataset.leg);
                            const leg = (it.legs || [])[idx];
                            if (!leg) return;
                            btn.addEventListener("click", () => {
                                hidePeek();
                                const ov = overlayEl();
                                ov.classList.contains("is-open") && ov.dataset.legKey === legKey(leg) ? closeOverlay() : openSeatmap(it, idx);
                            });
                            let timer = null, over = !1;
                            btn.addEventListener("mouseenter", () => {
                                over = !0;
                                const cached = seatCache.has(legKey(leg) + "|all");
                                clearTimeout(timer);
                                timer = setTimeout(() => {
                                    over && loadAll(leg).then(data => {
                                        if (!over || !btn.isConnected) return;
                                        const pk = function() {
                                            let pk = document.querySelector(".mmrc-seatpeek");
                                            if (pk) return pk;
                                            pk = document.createElement("div");
                                            pk.className = "mmrc-seatpeek";
                                            document.body.appendChild(pk);
                                            return pk;
                                        }();
                                        pk.innerHTML = '<div class="mmrc-seatpanel">' + seatmapBodyHtml(data, leg) + "</div>" + '<div class="mmrc-peekhint">Klicken für Details und Sitzpreise</div>';
                                        const r = btn.getBoundingClientRect();
                                        pk.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 660)) + "px";
                                        pk.style.top = r.bottom + 6 + "px";
                                        decorateSeatmap(pk);
                                        const retry = pk.querySelector(".mmrc-seatretry");
                                        retry && retry.addEventListener("click", () => {
                                            hidePeek();
                                            openSeatmap(it, idx);
                                        });
                                    }).catch(() => {});
                                }, cached ? HOVER_SHOW : HOVER_DWELL);
                            });
                            btn.addEventListener("mouseleave", () => {
                                over = !1;
                                clearTimeout(timer);
                                hidePeek();
                            });
                        });
                    }(li, it);
                    return li;
                }(it, cabins, dicts, searched));
            } catch (e) {}
        }); else {
            const li = document.createElement("li");
            li.className = "mmrc-msg";
            li.innerHTML = "Kein Flug entspricht den Filtern." + '<button type="button" class="mmrc-reset-filter">Filter zurücksetzen</button>';
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
        !function() {
            if (!pendingBooking) return;
            const list = listEl();
            if (!list) return;
            const card = [ ...list.querySelectorAll(".mmrc-card") ].find(c => c.dataset.key === pendingBooking.key);
            if (!card) return;
            const tile = [ ...card.querySelectorAll(".mmrc-f[data-code]") ].find(t => t.dataset.code === pendingBooking.code);
            if (!tile) return;
            const col = tile.closest(".mmrc-col");
            col.classList.add("mmrc-instant");
            col.classList.contains("is-open") || tile.click();
            const btn = col.querySelector(".mmrc-fchoose");
            if (btn) {
                btn.disabled = !0;
                btn.textContent = pendingBooking.text;
            }
            requestAnimationFrame(() => requestAnimationFrame(() => col.classList.remove("mmrc-instant")));
        }();
        emitRender();
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
    let renderTimer = null;
    function scheduleRender() {
        renderTimer || (renderTimer = setTimeout(() => {
            renderTimer = null;
            render();
        }, 120));
    }
    const bd = window.__mmBounds;
    if (bd) {
        bd.onUpdate && (state._offData = bd.onUpdate(() => {
            noOffer = null;
            pendingBooking && "outbound" === listSide() && bd.listSig !== pendingBooking.listSig && !bookingInFlight() && (pendingBooking = null);
            scheduleRender();
        }));
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
    window.__mmCurrency && window.__mmCurrency.onUpdate && (state._offFx = window.__mmCurrency.onUpdate(scheduleRender));
    const obs = new MutationObserver(() => {
        if (state.superseded || !cardsOn()) return;
        if (document.querySelector("refx-confirm-restart-flight-selection-dialog-pres")) restartDialogSeen = !0; else if (restartDialogSeen) {
            restartDialogSeen = !1;
            setTimeout(() => {
                if (pendingBooking && !searching && "outbound" === listSide()) {
                    pendingBooking = null;
                    scheduleRender();
                }
            }, 600);
        }
        const host = container();
        host && !host.querySelector(".mmrc-list") && scheduleRender();
    });
    state._observer = obs;
    state._apiGet = apiGet;
    state._seatCabinName = seatCabinName;
    state._planeSvg = planeSvg;
    state._shapeKeyFor = shapeKeyFor;
    state._normaliseSeatmap = normaliseSeatmap;
    state._mergeSeatmaps = mergeSeatmaps;
    state._seatmapBodyHtml = seatmapBodyHtml;
    state._decorateSeatmap = decorateSeatmap;
    state._injectStyles = injectStyles;
    state.destroy = () => {
        document.documentElement.classList.remove("mmrc-active");
        document.querySelectorAll(".mmrc-list, .mmrc-seatoverlay, .mmrc-seatpeek").forEach(e => e.remove());
    };
    window.__mmSettings && (state._offSettings = window.__mmSettings.onChange(k => {
        state.superseded || "results" !== k || (cardsOn() ? render() : state.destroy());
    }));
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
            if (!e || !e.persisted) {
                state.superseded = !0;
                try {
                    obs.disconnect();
                } catch (e2) {}
            }
        });
        window.addEventListener("pageshow", e => {
            if (e && e.persisted && state.superseded && window.__mmCards === state) {
                state.superseded = !1;
                boot();
            }
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
    const VERSION = 26;
    if (window.__mmSort && window.__mmSort.version >= VERSION) return;
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
    const sortOn = () => !window.__mmSettings || !1 !== window.__mmSettings.get("results");
    const esc = s => String(null == s ? "" : s).replace(/[&<>"]/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;"
    }[c]));
    const cards = () => window.__mmCards || null;
    const CFF_CABIN = [ [ /^CFFPECO/i, "ecoPremium" ], [ /^CFFECO/i, "eco" ], [ /^CFFBUS/i, "business" ], [ /^CFFFIRS?/i, "first" ] ];
    const minutes = hhmm => {
        const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || ""));
        return m ? 60 * +m[1] + +m[2] : null;
    };
    const ORDERS = [ {
        id: "miles",
        label: "Günstigste Meilen",
        hint: "in der gesuchten Klasse",
        value: (it, cabin) => function(item, feld, cabin) {
            let best = null;
            for (const f of item && item.fares || []) {
                if (cabin && f.cabin !== cabin) continue;
                const v = f[feld];
                null != v && (null == best || v < best) && (best = v);
            }
            return best;
        }(it, "miles", cabin)
    }, {
        id: "cash",
        label: "Günstigste Zuzahlung",
        hint: "in der gesuchten Klasse",
        value: (it, cabin) => function(item, cabin) {
            let best = null;
            for (const f of item && item.fares || []) {
                if (cabin && f.cabin !== cabin) continue;
                if (null == f.cash) continue;
                let v = f.cash;
                try {
                    const fx = window.__mmCurrency;
                    if (fx && fx.toEUR && f.currency) {
                        const eur = fx.toEUR(f.cash, f.currency);
                        null != eur && (v = eur);
                    }
                } catch (e) {}
                (null == best || v < best) && (best = v);
            }
            return best;
        }(it, cabin)
    }, {
        id: "dep",
        label: "Frühester Abflug",
        value: it => minutes(it && it.depTime)
    }, {
        id: "depLate",
        label: "Spätester Abflug",
        desc: !0,
        value: it => minutes(it && it.depTime)
    }, {
        id: "dur",
        label: "Kürzeste Dauer",
        value: it => it && it.totalDuration || null
    } ];
    const orderById = id => ORDERS.find(o => o.id === id) || ORDERS[0];
    function effectiveCabin(items) {
        const want = function() {
            try {
                const j = JSON.parse(sessionStorage.getItem("airBoundsSearch"));
                const e = j.entities[j.selectedAirBoundsSearchId];
                for (const code of e.commercialFareFamilies || []) {
                    const hit = CFF_CABIN.find(([re]) => re.test(code));
                    if (hit) return hit[1];
                }
            } catch (e) {}
            return null;
        }();
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
        label: "Früh",
        title: "00:00 – 05:59",
        from: 0,
        to: 360
    }, {
        label: "Vormittag",
        title: "06:00 – 11:59",
        from: 360,
        to: 720
    }, {
        label: "Nachmittag",
        title: "12:00 – 17:59",
        from: 720,
        to: 1080
    }, {
        label: "Abend",
        title: "18:00 – 23:59",
        from: 1080,
        to: 1440
    } ];
    const STOPS = [ {
        label: "Direkt",
        max: 0
    }, {
        label: "max. 1 Stopp",
        max: 1
    } ];
    const filter = {
        stops: null,
        dep: null,
        arr: null,
        airlines: null
    };
    let filterRoute = null;
    const filterActive = () => null != filter.stops || null != filter.dep || null != filter.arr || filter.airlines && filter.airlines.size;
    function resetFilter() {
        filter.stops = null;
        filter.dep = null;
        filter.arr = null;
        filter.airlines = null;
    }
    function listedAirlines(items) {
        const seen = new Set;
        for (const it of items) for (const l of it && it.legs || []) l.operatingName && seen.add(l.operatingName);
        return [ ...seen ].sort((a, b) => a.localeCompare(b, "de"));
    }
    function buildPred() {
        if (!filterActive()) return null;
        const f = {
            stops: filter.stops,
            dep: filter.dep,
            arr: filter.arr,
            airlines: filter.airlines && filter.airlines.size ? new Set(filter.airlines) : null
        };
        return it => {
            if (!it) return !1;
            if (null != f.stops && it.stops > f.stops) return !1;
            if (f.dep) {
                const m = minutes(it.depTime);
                if (null == m || m < f.dep.from || m >= f.dep.to) return !1;
            }
            if (f.arr) {
                const m = minutes(it.arrTime);
                if (null == m || m < f.arr.from || m >= f.arr.to) return !1;
            }
            return !(f.airlines && !(it.legs || []).some(l => f.airlines.has(l.operatingName)));
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
            c.setView({
                cmp: buildCmp(),
                pred: buildPred()
            });
            state.sorted++;
        }
    }
    const BAR_ID = "mmsort-bar";
    function menuTeile() {
        const bar = document.getElementById(BAR_ID);
        return bar ? {
            liste: bar.querySelector(".mmsort-list"),
            knopf: bar.querySelector(".mmsort-trigger")
        } : null;
    }
    function closeMenu() {
        const t = menuTeile();
        if (t && t.liste && !t.liste.hidden) {
            t.liste.hidden = !0;
            t.knopf && t.knopf.setAttribute("aria-expanded", "false");
        }
    }
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
            pop.setAttribute("aria-label", "Filter");
            bar.appendChild(pop);
        }
        const pill = (fact, i, label, on, title) => `<button type="button" class="mmflt-pill${on ? " is-on" : ""}" data-fact="${fact}"` + ` data-i="${i}"${title ? ` title="${esc(title)}"` : ""}>${esc(label)}</button>`;
        const grp = (lbl, inner) => `<div class="mmflt-grp"><span class="mmflt-lbl">${lbl}</span><div class="mmflt-pills">${inner}</div></div>`;
        const items = listedItems();
        const airlines = listedAirlines(items);
        let html = "";
        html += grp("Stopps", pill("stop", -1, "Alle", null == filter.stops) + STOPS.map((s, i) => pill("stop", i, s.label, filter.stops === s.max)).join(""));
        html += grp("Abflug", pill("dep", -1, "Alle", null == filter.dep) + WINDOWS.map((w, i) => pill("dep", i, w.label, !!filter.dep && filter.dep.from === w.from, w.title)).join(""));
        html += grp("Ankunft", pill("arr", -1, "Alle", null == filter.arr) + WINDOWS.map((w, i) => pill("arr", i, w.label, !!filter.arr && filter.arr.from === w.from, w.title)).join(""));
        airlines.length > 1 && (html += grp("Airlines", pill("air", -1, "Alle", !filter.airlines || !filter.airlines.size) + airlines.map((a, i) => pill("air", i, a, !!filter.airlines && filter.airlines.has(a))).join("")));
        const c = cards();
        const counts = c && c.counts ? c.counts : {
            shown: items.length,
            total: items.length
        };
        html += `<div class="mmflt-foot"><span class="mmflt-sum">${counts.shown} von ${counts.total} Flügen entsprechen diesen Kriterien</span>` + `<button type="button" class="mmflt-reset">Zurücksetzen</button>` + `<button type="button" class="mmflt-apply">Fertig</button></div>`;
        pop.innerHTML = html;
    }
    function onDocClick(e) {
        if (state.superseded) return;
        const bar = document.getElementById(BAR_ID);
        if (!bar || !bar.contains(e.target)) {
            closeMenu();
            filterPopEl() && closeFilterPop();
        }
    }
    function onDocKey(e) {
        if (!state.superseded && "Escape" === e.key) {
            closeMenu();
            filterPopEl() && closeFilterPop();
        }
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onDocKey);
    let lastHtml = "";
    function render(bar) {
        if (!(bar = bar || document.getElementById(BAR_ID))) return;
        const html = function() {
            const name = {
                eco: "Economy",
                ecoPremium: "Premium Economy",
                business: "Business",
                first: "First"
            }[effectiveCabin(listedItems())] || null;
            const aktiv = orderById(state.sort);
            const opts = ORDERS.map(o => {
                const an = o.id === state.sort;
                const hint = o.hint && name ? ' <span class="mmsort-sub">' + esc(name) + "</span>" : "";
                return '<button type="button" role="menuitemradio" aria-checked="' + an + '"' + ' class="mmsort-opt' + (an ? " is-on" : "") + '" data-order="' + o.id + '">' + esc(o.label) + hint + "</button>";
            }).join("");
            return '<button type="button" class="mmsort-filter' + (filterActive() ? " is-on" : "") + '">' + "Filter" + (filterActive() ? '<span class="mmsort-dot" aria-hidden="true"></span>' : "") + "</button>" + '<div class="mmsort-menu">' + '<span class="mmsort-label">Sortieren nach</span>' + '<button type="button" class="mmsort-trigger" aria-haspopup="true" aria-expanded="false">' + '<span class="mmsort-current">' + esc(aktiv.label) + (aktiv.hint && name ? " · " + esc(name) : "") + "</span>" + '<span class="mmsort-chevron" aria-hidden="true"></span></button>' + '<div class="mmsort-list" role="menu" hidden>' + opts + "</div>" + "</div>";
        }();
        if (html === lastHtml) return;
        const alteListe = bar.querySelector(".mmsort-list");
        const offen = !(!alteListe || alteListe.hidden);
        const pop = bar.querySelector(".mmflt-pop");
        pop && pop.remove();
        bar.innerHTML = html;
        lastHtml = html;
        pop && bar.appendChild(pop);
        if (offen) {
            const l = bar.querySelector(".mmsort-list");
            const t = bar.querySelector(".mmsort-trigger");
            l && (l.hidden = !1);
            t && t.setAttribute("aria-expanded", "true");
        }
    }
    function refreshBar() {
        lastHtml = "";
        render();
    }
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

.mmsort-menu { position: relative; display: inline-flex; align-items: center; gap: 8px;
               margin-left: auto; }
.mmsort-trigger { display: inline-flex; align-items: center; gap: 8px;
                  padding: 7px 13px; border-radius: 999px; cursor: pointer;
                  border: 1px solid ${INK_hairline}; background: #fff;
                  font: inherit; font-size: 13px; font-weight: 600;
                  color: ${INK_primary}; line-height: 1.25; }
.mmsort-trigger:hover { border-color: #b9c6e0; }
.mmsort-trigger:focus-visible { outline: 2px solid ${INK_accent}; outline-offset: 2px; }
.mmsort-chevron { width: 0; height: 0; border-left: 4px solid transparent;
                  border-right: 4px solid transparent; border-top: 5px solid ${INK_secondary};
                  transition: transform .15s; }
.mmsort-trigger[aria-expanded="true"] .mmsort-chevron { transform: rotate(180deg); }

.mmsort-list { position: absolute; top: calc(100% + 6px); right: 0; z-index: 40;
               min-width: 244px; padding: 5px; border-radius: 12px; background: #fff;
               border: 1px solid ${INK_hairline};
               box-shadow: 0 10px 28px rgba(5,22,77,.13); }
.mmsort-list[hidden] { display: none; }
.mmsort-opt { display: flex; align-items: baseline; gap: 7px; width: 100%;
              padding: 9px 11px; border: 0; border-radius: 8px; cursor: pointer;
              background: transparent; font: inherit; font-size: 13.5px;
              color: ${INK_secondary}; text-align: left; line-height: 1.3; }
.mmsort-opt:hover { background: #f3f6fc; color: ${INK_primary}; }
.mmsort-opt:focus-visible { outline: 2px solid ${INK_accent}; outline-offset: -2px; }
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
.mmsort-filter:focus-visible { outline: 2px solid ${INK_accent}; outline-offset: 2px; }
.mmsort-dot { width: 6px; height: 6px; border-radius: 50%; background: #fff; }

.mmflt-pop { position: absolute; top: calc(100% - 8px); left: 0; z-index: 41;
             width: min(620px, 94vw); background: #fff;
             border: 1px solid ${INK_hairline}; border-radius: 12px;
             padding: 6px 16px 12px; box-shadow: 0 10px 28px rgba(5,22,77,.13); }
.mmflt-grp { display: flex; align-items: baseline; gap: 12px; padding: 8px 0; }
.mmflt-grp + .mmflt-grp { border-top: 1px solid ${INK_hairline}; }
.mmflt-lbl { flex: 0 0 62px; font-size: 10.5px; font-weight: 700; color: ${INK_muted};
             text-transform: uppercase; letter-spacing: .05em; }
.mmflt-pills { display: flex; flex-wrap: wrap; gap: 6px; }
.mmflt-pill { border: 1px solid ${INK_hairline}; background: #fff; border-radius: 999px;
              padding: 4px 12px; font: inherit; font-size: 12.5px; font-weight: 600;
              color: ${INK_secondary}; cursor: pointer; line-height: 1.3;
              transition: background .12s, border-color .12s; }
.mmflt-pill:hover { border-color: #b9c6e0; background: #f8fafd; }
.mmflt-pill.is-on { background: ${INK_primary}; border-color: ${INK_primary}; color: #fff; }
.mmflt-pill:focus-visible { outline: 2px solid ${INK_accent}; outline-offset: 2px; }
.mmflt-foot { display: flex; align-items: center; gap: 8px; padding-top: 10px;
              margin-top: 2px; border-top: 1px solid ${INK_hairline}; }
.mmflt-sum { margin-right: auto; font-size: 12.5px; font-weight: 600; color: ${INK_primary}; }
.mmflt-reset, .mmflt-apply { font: inherit; font-size: 12.5px; font-weight: 600;
              border-radius: 999px; padding: 6px 14px; cursor: pointer; line-height: 1.25; }
.mmflt-reset { background: #fff; border: 1px solid ${INK_hairline}; color: ${INK_primary}; }
.mmflt-reset:hover { border-color: #b9c6e0; }
.mmflt-apply { background: ${INK_primary}; border: 1px solid ${INK_primary}; color: #fff; }
.mmflt-apply:hover { background: #0a2270; }
`;
                    styleEl.textContent !== css && (styleEl.textContent = css);
                }();
                !function() {
                    document.querySelectorAll(".sorting-filtering-area").forEach(e => e.classList.add("mmsort-native-hidden"));
                    document.querySelectorAll(".upsell-premium-pres-container refx-info-text").forEach(e => {
                        /neutral/i.test(e.textContent || "") && e.classList.add("mmsort-native-hidden");
                    });
                }();
                !function() {
                    if (state.superseded || !sortOn()) return;
                    const host = document.querySelector(".upsell-premium-pres-container");
                    if (!host) return;
                    let bar = document.getElementById(BAR_ID);
                    if (bar) bar.parentElement !== host && host.insertBefore(bar, host.firstChild); else {
                        bar = document.createElement("div");
                        bar.id = BAR_ID;
                        bar.className = "mmsort";
                        lastHtml = "";
                        host.insertBefore(bar, host.firstChild);
                        bar.addEventListener("click", e => {
                            e.stopPropagation();
                            if (e.target.closest && e.target.closest(".mmsort-trigger")) {
                                !function() {
                                    const t = menuTeile();
                                    if (!t || !t.liste) return;
                                    const auf = t.liste.hidden;
                                    t.liste.hidden = !auf;
                                    t.knopf && t.knopf.setAttribute("aria-expanded", String(auf));
                                }();
                                return;
                            }
                            if (e.target.closest && e.target.closest(".mmsort-filter")) {
                                !function() {
                                    if (filterPopEl()) closeFilterPop(); else {
                                        closeMenu();
                                        renderFilterPop();
                                    }
                                }();
                                return;
                            }
                            const pill = e.target.closest && e.target.closest(".mmflt-pill");
                            if (pill) {
                                !function(pillBtn) {
                                    const fact = pillBtn.dataset.fact;
                                    const i = +pillBtn.dataset.i;
                                    if ("stop" === fact) filter.stops = i < 0 ? null : STOPS[i].max; else if ("dep" === fact || "arr" === fact) filter[fact] = i < 0 ? null : {
                                        from: WINDOWS[i].from,
                                        to: WINDOWS[i].to
                                    }; else if ("air" === fact) if (i < 0) filter.airlines = null; else {
                                        const name = listedAirlines(listedItems())[i];
                                        if (!name) return;
                                        filter.airlines || (filter.airlines = new Set);
                                        filter.airlines.has(name) ? filter.airlines.delete(name) : filter.airlines.add(name);
                                        filter.airlines.size || (filter.airlines = null);
                                    }
                                    apply();
                                    renderFilterPop();
                                    refreshBar();
                                }(pill);
                                return;
                            }
                            if (e.target.closest && e.target.closest(".mmflt-reset")) {
                                resetFilter();
                                apply();
                                renderFilterPop();
                                refreshBar();
                                return;
                            }
                            if (e.target.closest && e.target.closest(".mmflt-apply")) {
                                closeFilterPop();
                                return;
                            }
                            if (e.target.closest && e.target.closest(".mmflt-pop")) return;
                            const b = e.target.closest && e.target.closest(".mmsort-opt");
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
                            } else e.target.closest && e.target.closest(".mmsort-list") || closeMenu();
                        });
                    }
                    render(bar);
                }();
                apply();
            } catch (e) {}
        }, 120));
    }
    const obs = new MutationObserver(() => {
        document.getElementById(BAR_ID) || schedule();
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
    "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", start) : start();
    schedule();
    try {
        const data = window.__mmBounds || {};
        data.onUpdate && (state._off = data.onUpdate(() => {
            refreshBar();
            schedule();
        }));
    } catch (e) {}
    try {
        const c = cards();
        c && c.onRender && (state._offRender = c.onRender(() => {
            if (!state.superseded && sortOn()) {
                refreshBar();
                filterPopEl() && renderFilterPop();
            }
        }));
        c && c.onFilterReset && (state._offReset = c.onFilterReset(() => {
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
            document.removeEventListener("click", onDocClick);
            document.removeEventListener("keydown", onDocKey);
        } catch (e) {}
        try {
            state._offSettings && state._offSettings();
        } catch (e) {}
        try {
            state._off && state._off();
        } catch (e) {}
        try {
            state._offRender && state._offRender();
        } catch (e) {}
        try {
            state._offReset && state._offReset();
        } catch (e) {}
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
        window.__mmSettings && window.__mmSettings.onChange && (state._offSettings = window.__mmSettings.onChange(() => {
            if (sortOn()) {
                refreshBar();
                schedule();
            } else {
                const b = document.getElementById(BAR_ID);
                b && b.remove();
                showNativeBar();
            }
        }));
    } catch (e) {}
    try {
        window.addEventListener("pagehide", e => {
            if (!e || !e.persisted) {
                state.superseded = !0;
                try {
                    obs.disconnect();
                } catch (e2) {}
            }
        });
        window.addEventListener("pageshow", e => {
            if (e && e.persisted && state.superseded && window.__mmSort === state) {
                state.superseded = !1;
                start();
                schedule();
            }
        });
    } catch (e) {}
})();

(() => {
    "use strict";
    const VERSION = 45;
    if (window.__mmRecovery && window.__mmRecovery.version >= VERSION) return;
    const inherited = window.__mmRecovery;
    if (inherited) {
        inherited.superseded = !0;
        try {
            inherited._observer && inherited._observer.disconnect();
        } catch (e) {}
        try {
            inherited._offSettings && inherited._offSettings();
        } catch (e) {}
        try {
            inherited.restore && inherited.restore();
        } catch (e) {}
    }
    const INK_primary = "#05164D", INK_secondary = "#52514e", INK_muted = "#898781", INK_hairline = "#e1e0d9", INK_accent = "#1c5cab";
    const LOGIN_URL = "https://account.miles-and-more.com/web/de/de/login.html" + "?scope=AUTHENTICATED%20IDENTIFIED%20urn%3Amilesandmore%3Atech%3Abackground%3Av1%3Aactive" + "&response_type=code&reduced_state=NONE&principal_type=SERVICE_CARD_NUMBER" + "&client_id=agGBZmuTGwFXWzVDg8ckGKGBytemE1nS" + "&redirect_uri=https%3A%2F%2Fwww.miles-and-more.com" + "&state=NDkyMDIxODQzMTEwMTU5MjE1MTExNzY1Nzk2MTcwMjM5ODE2ODExOA" + "&prompt=login";
    const LOGOUT_URL = "https://api.miles-and-more.com/oauth2/logout" + "?redirect_uri=" + encodeURIComponent("https://www.miles-and-more.com/de/de.html");
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
    const SHOP_SEARCH = "https://shop.miles-and-more.com/reward/reward/availability" + "?lang=de-DE&portalCountry=de";
    let loginOpened = !1;
    let loginOpenedAt = 0;
    let loginPoll = null;
    let onLoginClosed = null;
    const RETRY_STAMP = "mm_retry_t";
    function retrySearch() {
        try {
            sessionStorage.setItem(RETRY_STAMP, String(Date.now()));
        } catch (e) {}
        const search = currentSearch() || function() {
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
            form.action = SHOP_SEARCH;
            form.style.display = "none";
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = "search";
            input.value = JSON.stringify(search);
            form.appendChild(input);
            document.body.appendChild(form);
            form.submit();
        }(search) : location.href = SHOP_SEARCH;
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
    const GENERIC_BANNER_RE = /Leider ist ein Problem aufgetreten|Aus technischen Gründen können wir Ihre Flugsuche/;
    function bannerText(code, detail) {
        if ("65012" === (code = String(code || ""))) return "Der gewählte Hinflug ist abgelaufen. Eine neue Suche behebt das.";
        if ("7959" === code) {
            const seg = /SEGMENT (\d)/.exec(detail || "");
            return "Kein Flug für den " + (seg && "2" === seg[1] ? "Rückflug" : "Hinflug") + " an diesem Tag.";
        }
        return detail ? code + ": " + detail : null;
    }
    function rewriteBanners() {
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
        const head = d ? d.head : "Die Suche ist unerwartet abgebrochen.";
        const why = d ? d.why : "Auf vielfachen Kundenwunsch haben wir daher Ihre Session beendet.";
        const hint = d ? d.hint : "Manchmal hilft hier schlicht ein neuer Versuch oder ein neuer Login. Who knows.";
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
                        const search = currentSearch();
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
                    signout.textContent = "Abmelden hier nicht möglich";
                    if (box.querySelector(".mmrec-signout-manual")) return;
                    const a = document.createElement("a");
                    a.className = "mmrec-btn mmrec-ghost mmrec-signout-manual";
                    a.href = "https://www.miles-and-more.com/de/de.html";
                    a.target = "_blank";
                    a.rel = "noopener";
                    a.textContent = "Zum Abmelden auf miles-and-more.com";
                    signout.after(a);
                };
                let w = null;
                try {
                    w = window.open("about:blank", "mmrec-signout", "width=560,height=680");
                } catch (e) {}
                if (w) {
                    signout.disabled = !0;
                    signout.textContent = "Abmeldung läuft …";
                    fetch(LOGOUT_URL, {
                        method: "POST",
                        credentials: "include"
                    }).then(r => r.json()).then(data => {
                        const target = data && data.target;
                        if ("string" != typeof target || 0 !== target.indexOf("https://api.miles-and-more.com/")) throw new Error("no target");
                        w.location.href = target;
                        signout.textContent = "Abgemeldet. Melden Sie sich jetzt neu an.";
                    }).catch(() => {
                        try {
                            w.close();
                        } catch (e) {}
                        manualLink();
                    });
                } else manualLink();
            });
            let zurueck = !1;
            const beiRueckkehr = () => {
                if (!zurueck && loginOpened && !document.hidden) {
                    zurueck = !0;
                    try {
                        retrySearch();
                    } catch (e) {}
                }
            };
            const beiFokus = () => {
                Date.now() - loginOpenedAt > 5e3 && beiRueckkehr();
            };
            try {
                state._offResume && state._offResume();
            } catch (e) {}
            try {
                onLoginClosed = beiRueckkehr;
                document.addEventListener("visibilitychange", beiRueckkehr);
                window.addEventListener("focus", beiFokus);
                state._offResume = () => {
                    try {
                        document.removeEventListener("visibilitychange", beiRueckkehr);
                    } catch (e) {}
                    try {
                        window.removeEventListener("focus", beiFokus);
                    } catch (e) {}
                    onLoginClosed === beiRueckkehr && (onLoginClosed = null);
                    if (loginPoll) {
                        clearInterval(loginPoll);
                        loginPoll = null;
                    }
                    state._offResume = null;
                };
            } catch (e) {}
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
${stubborn ? `<p class="mmrec-p"><b>Die Anmeldung hat nicht gegriffen:</b> Miles &amp; More
meldet Sie zwar als angemeldet, akzeptiert die Sitzung aber nicht mehr. In diesem Fall
hilft nur, sich richtig abzumelden und danach neu anzumelden. Der Knopf unten
erledigt das Abmelden direkt.</p>` : ""}
<div class="mmrec-actions">
  ${handover ? `<button type="button" class="mmrec-btn mmrec-retry">Suche wiederholen</button>` : ""}
  ${showLogin ? `<a class="mmrec-btn mmrec-login" href="${LOGIN_URL}">Bei Miles &amp; More anmelden</a>` : ""}
  ${showLogin && stubborn ? `<button type="button" class="mmrec-btn mmrec-ghost mmrec-signout">Bei Miles &amp; More abmelden</button>` : ""}
  ${handover ? "" : `<button type="button" class="mmrec-btn mmrec-ghost mmrec-retry">Zurück zur Suche</button>`}
</div>
${showLogin ? `<p class="mmrec-p mmrec-waiting" hidden>Die Anmeldung läuft in einem eigenen Fenster. Sobald
Sie hierher zurückkehren, wird die Suche wiederholt. Über den Knopf lässt sie sich auch
jederzeit von Hand starten.</p>` : ""}
<div class="mmrec-ways">
  <p class="mmrec-wayshead">Falls nichts davon hilft:</p>
  <ul class="mmrec-waylist">${[ {
            href: "https://www.miles-and-more.com/de/de.html",
            label: "Startseite von Miles &amp; More"
        }, {
            href: "https://www.miles-and-more.com/de/de/spend/flights.html",
            label: "Flugsuche auf miles-and-more.com"
        }, {
            href: LOGIN_URL,
            label: "Zur Anmeldung"
        }, {
            href: "https://www.miles-and-more.com/de/de/member.html",
            label: "Mitgliederkonto"
        }, {
            href: SHOP_SEARCH,
            label: "Zurück zur Prämiensuche"
        } ].map(w => `<li><a href="${w.href}">${w.label}</a></li>`).join("")}</ul>
</div>
<p class="mmrec-note">${d ? `Erfasst: <code>${esc(d.name)} → HTTP ${d.status || "keine Antwort"}${d.secs ? `, ${d.secs} s` : ""}</code><br>` : ""}Originalmeldung der Seite: <code>${esc(original)}</code></p>`;
    }
    const WATCHED = [ [ /travelers-profile/i, "Profil wird geladen …", "Vielfliegerprofil", "des Vielfliegerprofils" ], [ /air-bounds/i, "Prämienflüge werden gesucht …", "Prämienflugsuche", "der Prämienflugsuche" ], [ /air-calendars/i, "Kalenderpreise werden geladen …", "Kalenderpreise", "der Kalenderpreise" ], [ /\/user\/me\/loginstatus/i, "Anmeldung wird geprüft …", "Anmeldestatus", "des Anmeldestatus" ], [ new RegExp("oauth|/token"), "Authentifizierung läuft …", "Authentifizierung", "der Authentifizierung" ] ];
    const inFlight = new Map;
    const secsSince = t => Math.round((Date.now() - t) / 1e3);
    function waitOverlay() {
        if (state.superseded) {
            document.querySelectorAll(".mmrec-wait").forEach(e => e.remove());
            return;
        }
        const dead = RECOVERY_RE.test(location.pathname);
        const visible = document.querySelector("refx-flight-card-pres, .mmcal, refx-search-recap-cont, refx-generic-error-panel-pres");
        if (dead || visible || !inFlight.size || !waitingOn()) {
            document.querySelectorAll(".mmrec-wait").forEach(e => e.remove());
            return;
        }
        const existing = document.querySelectorAll(".mmrec-wait");
        for (let i = 1; i < existing.length; i++) existing[i].remove();
        const keys = [ ...inFlight.keys() ];
        const label = (keys.find(k => k[1]) || keys[0])[0];
        const waited = secsSince(Math.min(...[ ...inFlight.values() ].map(v => v.since)));
        let sub = "";
        if (waited > 12) {
            const list = [ ...inFlight.entries() ].filter(([k]) => k[1]).map(([k, v]) => `${k[1]} (${secsSince(v.since)} s)`).join(", ");
            sub = list ? `Dauert länger als üblich. Es wartet noch: ${list}` : `Dauert länger als üblich (seit ${waited} Sekunden).`;
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
    const MAX_SNIFF = 4096;
    function apiErrorOf(text) {
        try {
            const j = JSON.parse(text);
            const e = (j && j.errors || [])[0];
            return e ? {
                code: String(e.code || ""),
                detail: e.detail || e.title || ""
            } : null;
        } catch (e) {
            return null;
        }
    }
    const uhr = ms => new Date(ms).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit"
    });
    const GAG_SESSION = "Auf vielfachen Kundenwunsch haben wir die Session an dieser Stelle für Sie beendet.";
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
                head: "Das Zugangstoken dieses Tabs ist um " + uhr(t.at) + " Uhr abgelaufen.",
                why: GAG_SESSION,
                hint: "Neu anmelden, dann geht die Suche hier weiter."
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
        const ofPlain = esc(f.of || "der " + (f.name || "Anfrage"));
        const of = `<b>${ofPlain}</b>`;
        const isAuth = "Authentifizierung" === f.name;
        if (401 === s || 403 === s || 419 === s || 440 === s) if (function() {
            try {
                const a = window.__mmAuth;
                return !!(a && a.seenCodes > 0);
            } catch (e) {
                return !1;
            }
        }()) {
            d.head = "Sie sind angemeldet — die Buchungsstrecke hat die Anmeldung nicht übernommen.";
            d.why = `Auf vielfachen Kundenwunsch haben wir Ihre Anmeldung ignoriert und ` + `den Abruf ${of} ohne Kundenkonto geschickt (HTTP ${s}).`;
            d.hint = "Eine neue Anmeldung ändert daran nichts. Ein erneuter Versuch " + "zieht die Anmeldung nach.";
            d.login = !1;
            d.handover = !0;
        } else {
            d.head = isAuth ? `Der Auth-Token ist nicht mehr gültig (HTTP ${s}).` : `Die Sitzung war beim Abruf ${ofPlain} nicht mehr gültig (HTTP ${s}).`;
            d.why = GAG_SESSION;
            d.hint = "Eine neue Anmeldung sollte das lösen.";
        } else if (429 === s) {
            d.head = `Miles & More hat den Abruf ${ofPlain} vorübergehend gedrosselt (HTTP 429).`;
            d.why = "Auf vielfachen Kundenwunsch bearbeiten wir Anfragen jetzt in einem entspannteren Tempo.";
            d.hint = "Ein paar Minuten abwarten, dann nochmal versuchen.";
            d.login = !1;
        } else if (504 === s || 408 === s) {
            d.head = `Der Abruf ${ofPlain} hat nach ${secs} Sekunden nicht geantwortet (HTTP ${s}).`;
            d.why = "Auf vielfachen Kundenwunsch lässt sich unser Server heute etwas mehr Zeit.";
            d.hint = "Das liegt wahrscheinlich an Miles & More, nicht an der Anmeldung. Später erneut versuchen.";
            d.login = !1;
        } else if (s >= 500) {
            d.head = `Der Abruf ${ofPlain} ist mit HTTP ${s} fehlgeschlagen.`;
            d.why = "Auf vielfachen Kundenwunsch legt der Server eine kurze Pause ein.";
            d.hint = "Ein Fehler auf Seiten von Miles & More. Später erneut versuchen.";
            d.login = !1;
        } else if (0 === s) {
            d.head = `Der Abruf ${ofPlain} kam nach ${secs} Sekunden nicht durch.`;
            d.why = "Auf vielfachen Kundenwunsch wurde die Verbindung vorzeitig beendet.";
            d.login = !1;
        } else {
            if (!(s >= 400)) return null;
            d.head = `Der Abruf ${ofPlain} wurde mit HTTP ${s} abgelehnt.`;
            d.why = "Auf vielfachen Kundenwunsch haben wir diese Anfrage nicht bearbeitet.";
            d.hint = "Meist eine abgelaufene Anmeldung.";
        }
        return d;
    }
    window.__mmRecTrack = {
        start: function(url) {
            const hit = WATCHED.find(([re]) => re.test(url));
            if (!hit) return null;
            const key = [ hit[1], hit[2], hit[3] ];
            const found = [ ...inFlight.keys() ].find(k => k[0] === key[0]) || key;
            const cur = inFlight.get(found);
            inFlight.set(found, {
                n: (cur ? cur.n : 0) + 1,
                since: cur ? cur.since : Date.now()
            });
            waitOverlay();
            return found;
        },
        end: function(key, status, apiError) {
            if (!key) return;
            const cur = inFlight.get(key);
            if (cur) {
                !function(key, status, ms, apiError) {
                    if ((!(void 0 !== status && status >= 200 && status < 400) || apiError) && (void 0 !== status || apiError)) try {
                        sessionStorage.setItem(FAIL_KEY, JSON.stringify({
                            name: key[1] || "Anfrage",
                            of: key[2] || "der Anfrage",
                            status: status,
                            ms: ms,
                            t: Date.now(),
                            apiCode: apiError ? apiError.code : null,
                            apiDetail: apiError ? apiError.detail : null
                        }));
                        !function() {
                            if (!state.superseded && RECOVERY_RE.test(location.pathname) && !state.hasCause) try {
                                patchRecovery(!0);
                            } catch (e) {}
                        }();
                    } catch (e) {}
                }(key, status, Date.now() - cur.since, apiError);
                cur.n > 1 ? inFlight.set(key, {
                    n: cur.n - 1,
                    since: cur.since
                }) : inFlight.delete(key);
            }
            waitOverlay();
        }
    };
    if (!window.__mmRecHooked) {
        window.__mmRecHooked = !0;
        const of = window.fetch;
        window.fetch = function(...args) {
            let key = null;
            try {
                key = window.__mmRecTrack.start("string" == typeof args[0] ? args[0] : args[0] && args[0].url || "");
            } catch (e) {
                key = null;
            }
            const out = of.apply(this, args);
            if (!key) return out;
            try {
                return Promise.resolve(out).then(resp => {
                    try {
                        const len = Number(resp.headers && resp.headers.get("content-length") || 0);
                        if (resp.ok && len > 0 && len <= MAX_SNIFF) {
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
        XMLHttpRequest.prototype.open = function(m, url, ...rest) {
            try {
                const key = window.__mmRecTrack.start(String(url));
                key && this.addEventListener("loadend", () => {
                    try {
                        let apiErr = null;
                        const t = this.responseType;
                        this.status >= 200 && this.status < 400 && (!t || "text" === t) && "string" == typeof this.responseText && this.responseText.length <= MAX_SNIFF && (apiErr = apiErrorOf(this.responseText));
                        window.__mmRecTrack.end(key, this.status, apiErr);
                    } catch (e) {}
                });
            } catch (e) {}
            return xo.call(this, m, url, ...rest);
        };
    }
    const ENTRY_KEY = [ "Prämienflugsuche wird geöffnet …", null, null ];
    let entrySince = 0;
    function coverEntry() {
        if (AVAIL_RE.test(location.pathname) && !RECOVERY_RE.test(location.pathname)) if (document.querySelector("refx-flight-card-pres, .mmcal, refx-search-recap-cont, refx-generic-error-panel-pres")) {
            entrySince = 0;
            inFlight.delete(ENTRY_KEY);
            waitOverlay();
        } else {
            entrySince || (entrySince = Date.now());
            inFlight.has(ENTRY_KEY) || inFlight.set(ENTRY_KEY, {
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
            if (state.superseded || !waitingOn() || ++ticks > 1500) {
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
        }, 400);
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
    function boot() {
        run();
        if (waitingOn()) try {
            rewriteBanners();
        } catch (e) {}
        const obs = new MutationObserver(records => {
            if (state.superseded) obs.disconnect(); else if (waitingOn()) {
                try {
                    rewriteBanners();
                } catch (e) {}
                if (RECOVERY_RE.test(location.pathname)) {
                    document.documentElement.classList.add("mmrec-page");
                    for (const rec of records) for (const node of rec.addedNodes) if (1 === node.nodeType) {
                        patchRecovery();
                        return;
                    }
                } else document.documentElement.classList.remove("mmrec-page");
            }
        });
        state._observer = obs;
        obs.observe(document.body || document.documentElement, {
            childList: !0,
            subtree: !0
        });
        if (waitingOn() && RECOVERY_RE.test(location.pathname)) {
            let tries = 0;
            const t = every(() => {
                (state.superseded || !waitingOn() || ++tries > 25 || patchRecovery()) && clearInterval(t);
            }, 240);
        }
    }
    "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", boot) : boot();
    try {
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
        });
        window.addEventListener("pageshow", e => {
            if (e && e.persisted && state.superseded && window.__mmRecovery === state) {
                state.superseded = !1;
                boot();
            }
        });
    } catch (e) {}
    window.__mmSettings && (state._offSettings = window.__mmSettings.onChange(k => {
        state.superseded || "waiting" !== k || (waitingOn() ? run() : restore());
    }));
})();

(() => {
    "use strict";
    const VERSION = 3;
    if (window.__mmUpdate && window.__mmUpdate.version >= VERSION) return;
    const DIST_version = "1.3.0", DIST_meta = "https://raw.githubusercontent.com/wedge256/mm-patcher/main/mm-searchbar.meta.js", DIST_page = "https://raw.githubusercontent.com/wedge256/mm-patcher/main/mm-searchbar.user.js";
    const prev = window.__mmUpdate;
    if (prev) {
        prev.superseded = !0;
        try {
            prev._timer && clearTimeout(prev._timer);
        } catch (e) {}
    }
    document.querySelectorAll(".mmupd-chip").forEach(e => e.remove());
    const KEY = "mm_update";
    const SESSION_KEY = "mm_update_checked";
    const MAX_AGE = 24 * 3600 * 1e3;
    const RETRY_AFTER = 6 * 3600 * 1e3;
    const START_DELAY = 8e3;
    const INK_primary = "#05164D", INK_hairline = "#e1e0d9", INK_accent = "#1c5cab", INK_muted = "#898781";
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
    function hide() {
        if (chip) {
            chip.remove();
            chip = null;
        }
    }
    function show(latest) {
        if (api.superseded || !document.body) return;
        if (chip && chip.isConnected) return;
        const s = readState();
        const stamp = (t => {
            const d = new Date(t);
            return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
        })(Date.now()) + "|" + latest;
        if (s.shownOn === stamp) return;
        s.shownOn = stamp;
        writeState(s);
        !function() {
            const css = `
.mmupd-chip { position: fixed; right: 18px; bottom: 18px; z-index: 2147482900;
              display: flex; align-items: center; gap: 10px;
              max-width: min(360px, calc(100vw - 36px));
              background: #fff; color: ${INK_primary};
              border: 1px solid ${INK_hairline}; border-left: 3px solid ${INK_accent};
              border-radius: 8px; padding: 10px 12px;
              box-shadow: 0 6px 24px rgba(5,22,77,.18);
              font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
              font-size: 12.5px; line-height: 1.45; }
.mmupd-txt { min-width: 0; }
.mmupd-txt b { font-weight: 700; }
.mmupd-sub { display: block; color: ${INK_muted}; font-size: 11px; margin-top: 1px; }
.mmupd-go { flex: 0 0 auto; border: 0; border-radius: 6px; cursor: pointer;
            background: ${INK_accent}; color: #fff; font: inherit; font-weight: 600;
            padding: 5px 11px; white-space: nowrap; }
.mmupd-go:hover { background: #174d8f; }
.mmupd-x { flex: 0 0 auto; border: 0; background: none; cursor: pointer;
           color: ${INK_muted}; font-size: 15px; line-height: 1; padding: 2px 4px; }
.mmupd-x:hover { color: ${INK_primary}; }
`;
            let el = document.getElementById("mmupd-styles");
            if (!el) {
                el = document.createElement("style");
                el.id = "mmupd-styles";
                document.head.appendChild(el);
            }
            el.textContent !== css && (el.textContent = css);
        }();
        chip = document.createElement("div");
        chip.className = "mmupd-chip";
        const txt = document.createElement("span");
        txt.className = "mmupd-txt";
        const head = document.createElement("b");
        head.textContent = "Update verfügbar";
        const sub = document.createElement("span");
        sub.className = "mmupd-sub";
        sub.textContent = `M&M Patcher ${state.current} → ${latest}`;
        txt.appendChild(head);
        txt.appendChild(sub);
        const go = document.createElement("button");
        go.type = "button";
        go.className = "mmupd-go";
        go.textContent = "Installieren";
        const x = document.createElement("button");
        x.type = "button";
        x.className = "mmupd-x";
        x.title = "Diese Version nicht mehr anzeigen";
        x.textContent = "✕";
        chip.appendChild(txt);
        chip.appendChild(go);
        chip.appendChild(x);
        document.body.appendChild(chip);
        go.addEventListener("click", () => {
            try {
                window.open(DIST_page, "_blank", "noopener");
            } catch (e) {}
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
        if (!(force || !(() => {
            try {
                return "1" === sessionStorage.getItem(SESSION_KEY);
            } catch (e) {
                return !1;
            }
        })() || age > (s.failed ? RETRY_AFTER : MAX_AGE))) {
            if (s.latest && cmp(s.latest, DIST_version) > 0 && s.seen !== s.latest) {
                state.latest = s.latest;
                show(s.latest);
            }
            return s.latest || null;
        }
        (() => {
            try {
                sessionStorage.setItem(SESSION_KEY, "1");
            } catch (e) {}
        })();
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
                shownOn: s.shownOn,
                failed: !1
            });
            cmp(latest, DIST_version) > 0 && s.seen !== latest && show(latest);
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
        dismiss: hide
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
    function enabled() {
        const s = window.__mmSettings;
        if (!s || "function" != typeof s.get) return !0;
        const v = s.get("updates");
        return void 0 === v || !0 === v;
    }
    function boot() {
        api.superseded || enabled() && (api._timer = setTimeout(() => {
            check(!1);
        }, START_DELAY));
    }
    document.body ? boot() : document.addEventListener("DOMContentLoaded", boot);
    try {
        const s = window.__mmSettings;
        s && "function" == typeof s.onChange && s.onChange(k => {
            "updates" === k && (enabled() ? check(!1) : hide());
        });
    } catch (e) {}
    try {
        window.addEventListener("pagehide", e => {
            if (!e || !e.persisted) {
                api.superseded = !0;
                try {
                    clearTimeout(api._timer);
                } catch (e2) {}
            }
        });
    } catch (e) {}
})();
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
