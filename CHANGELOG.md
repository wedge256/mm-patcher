# Changelog

[Deutsch](CHANGELOG.de.md)

## 1.9.1 — 2026-10-27

### Fixed

- **Calendar: after a search with no flights it stayed on the previous search's date**

## 1.9.0 — 2026-10-26

### Added

- **Multi-language support**: 16 languages
- **Surcharges converted into a currency of your choice** (not only €)

### Changed

- **Better seat maps**
- **Date picker shows the mile price for each day**
- **Calendar: slightly revised layout**

### Fixed

- **Fundamental performance optimisations**
- **Calendar: some days showed “date bar not responding” and never loaded**
- **Filters, sorting and the search counter appeared seconds after the results**
- **Swap button: the first click often did nothing**
- **Return calendar: after a day without offers, going back to the searched day
  showed no results**
- **Error page: “Back to search” did not work**
- **Many smaller bugs under the hood**

## 1.8.0 — 2026-10-14

### Added

- **Main site: search with fewer than 1,500 award miles**
- **Main site: “Recent searches” are kept after logging out**

### Changed

- **Ethiopian A350 is now correctly named “A350-900”**

### Fixed

- **Seat map: first Economy row of the Ethiopian A350 was wrong**

## 1.7.4 — 2026-10-03

### Added

- **Settings switch “Booking office line”**

### Changed

- **After “Install” the page reloads once so the new version runs**

### Fixed

- **Calendar: clicking a day in another month sometimes failed**
- **Calendar: loading indicator kept spinning although the search month was done**
- **Calendar: after “Clear cache” months no longer loaded by themselves**

## 1.7.3 — 2026-10-02

### Added

- **Update notice shows what has changed**

### Fixed

- **Calendar showed a loading indicator when changing days although everything was loaded**

## 1.7.2 — 2026-09-29

### Changed

- **Filters redesigned and extended**

### Fixed

- **All airlines now show their real logo instead of a placeholder**
- **A manually entered booking office showed the wrong country**
- **In the mobile view the cabin filter showed no fares**

## 1.7.1 — 2026-09-24

### Changed

- **Some notices reworded**

### Fixed

- **After changing the booking office the cart still ran in the old office**
  (different currency than in the results)

## 1.7.0 — 2026-09-23

### Added

- **“I'm not travelling myself” now selectable in the shop too**, not only on
  the main site
- **Results view slightly reworked**
- **Clearer prices with several travellers**: per adult or in total (idea from
  [#6](https://github.com/wedge256/mm-patcher/pull/6), thanks
  [@simonguenther](https://github.com/simonguenther))

### Fixed

- **Calendar sometimes showed the destination of the first day instead of the searched one**
- **Connections with a train leg could not be selected**
- **Calendar sometimes showed the infant price with several travellers**

## 1.6.4 — 2026-09-19

### Added

- **Cabin filter in the results**

### Fixed

- **Clicking another cabin in the calendar on the day already searched searches
  again**

## 1.6.3 — 2026-09-16

### Fixed

- **Calendar: duplicate cabin labels below the grid removed**
- **Airline icons: missing and empty logos added**
- **Seat map: cabins, seat widths and fuselage corrected**

## 1.6.2 — 2026-09-16

### Fixed

- **Update notice appeared up to 24 h after a release**

## 1.6.1 — 2026-09-16

### Fixed

- **Booking office: automatic mode & office change**

## 1.6.0 — 2026-09-15

### Added

- **Booking office freely selectable, by default automatic by departure country**
  (background: booking office DE finds no ET flights from Germany; offices CH/AT
  do)

### Changed

- **Better recognition of cities without an airport (Konstanz, …)
  and of new airports (WSI)**
- **Suggestions appear instantly while typing**
- **Calendar loads only the searched month automatically**

### Fixed

- **Searches ended on the error page although the login was fine**
- **Calendar could hang silently**
- **Many smaller bugs**

## 1.5.0 — 2026-09-12

### Added

- **Free seats on every result card**
- **Search counter: warns before Miles & More's IP limit**

### Fixed

- **Bug fixes and better handling of the IP limit**

## 1.4.0 — 2026-08-31

### Added

- **Country search: a country name lists all cities of that country**

### Changed

- **Display while typing a search optimised**

### Fixed

- **“Select” failed with “Selection not possible. Reload the page.”**
- **Display errors and cosmetic bugs fixed**
- **Performance optimisation**

## 1.3.0 — 2026-08-24

### Added

- **Seat map also shows the aircraft type**
- **Special business cabins marked in the overview (Allegris, Swiss Senses) and
  in the seat map (ANA THE Room, Polaris Studio and others)**

### Fixed

- **Seat map display was partly wrong**
- **Avianca had no logo**

## 1.2.2 — 2026-08-24

### Fixed

- **Minor performance fixes**

## 1.2.1 — 2026-08-24

### Fixed

- **Round trip: changing the return date no longer shows the fares of the old
  search in the calendar**

## 1.2.0 — 2026-08-24

### Added

- **Return calendar: days without an offer for the chosen outbound are struck
  through**
- **Seat map: “Reload” when a cabin could not be loaded**

### Fixed

- **Round trip: calendar and return selection now work properly**
- **Loading animation stays visible while the results are rebuilt**
- **UI repairs**

## 1.1.0 — 2026-08-22

### Fixed

- **Round trips should now work normally**
- **Fare selection also works in English-language sessions**
- **Seat map: prices are converted to euros too**

### Added

- **Notice about the active booking office** when surcharges are charged in a
  foreign currency

### Changed

- **Fare details also name the original amount for foreign currencies**

## 1.0.2 — 2026-08-22

### Fixed

- **Update check now works correctly.**

## 1.0.1 — 2026-08-22

### Fixed

- **Now also runs under Greasemonkey and Violentmonkey.**

### Changed

- minor visual changes

## 1.0.0 — 2026-08-21

Initial release.
