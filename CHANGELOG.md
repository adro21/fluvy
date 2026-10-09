# Changelog

All notable changes to Fluvy are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Tablets become walls on their own.** *Which devices are walls* in the panel's *Wall* tab: *Every tablet* makes any
  touch screen without a mouse, 600 px or more on its shorter side, a wall panel without an address to type or a
  switch to find — a phone or a computer never. *Chosen by hand* keeps today's way, and is what a house saved before
  this choice keeps. A device's own word still wins: *This device* is now *Automatic*, *Wall* or *Not a wall*, and
  `?kiosk` / `?kiosk=0` still say it from the address.

## [1.5.15] — 2026-10-09

### Fixed

- **The compact camera's name pill** sits 8 px from the picture's corner instead of 12, so a thumbnail a third of
  a phone wide keeps a name like "Driveway" whole instead of ending in an ellipsis.

## [1.5.14] — 2026-10-09

### Added

- **The camera card's compact style** (`variant: compact`): the picture alone, edge to edge, with the camera's
  name and the live dot in one pill — no head, no rows, no overlay buttons — and it may sit a third of a section
  wide, so three cameras fit one row on a phone. A tap still opens the live view.

## [1.5.13] — 2026-10-09

### Removed

- **The sideways-scroll diagnostic** (the `fluvy.overflow` lines in Home Assistant's log, and the brief flicker
  of a page it had to lay out again): the cause was found and fixed in 1.5.12.

## [1.5.12] — 2026-10-09

### Fixed

- **A dashboard no longer scrolls sideways on an iPhone when it opens.** A card draws its controls to the width
  it assumes before its first measurement, and WebKit kept that first layout's overflow as the section's width
  after the redraw — a tile's ruler 320 wide in a tile of 189 held the page 147 px past the screen until a view
  was re-entered. A card is now clipped at its box until it has measured, so the first layout holds nothing
  past it.

## [1.5.11] — 2026-10-09

### Changed

- **The sideways-scroll diagnostic says more**: which container holds the extra width and what sits in it, and
  which of the things a view change does (laying the header out again, nudging the tab strip, the page, the
  view) makes the page fit.

## [1.5.10] — 2026-10-09

### Fixed

- **A dashboard no longer scrolls sideways on an iPhone** when it opens: the header's row of view tabs is clipped at
  its own box, so the part of the strip past it (it scrolls inside) can no longer leak into the page's width as
  the fixed header lays out — which it did on an iPhone until a view was re-entered.

## [1.5.9] — 2026-10-09

### Changed

- **The 1.5.8 width re-read is taken back out**: it did not cure the sideways scroll on an iPhone.
- **A diagnostic for that scroll**: a few seconds after a page loads or moves, Fluvy writes to Home Assistant's
  own log (logger `fluvy.overflow`, under *Settings → System → Logs*) whether the page fits the screen and, when it
  does not, which elements reach past it. Nothing leaves the house; the line goes once the cause is found.

## [1.5.8] — 2026-10-09

### Fixed

- **A dashboard no longer scrolls sideways on an iPhone** after it opens or is returned to from another one. A
  card draws its controls to its measured width; on a page's first load WebKit can drop the measurement that
  corrects the first guess, and a tile kept a ruler far wider than itself, pushing the page out past the screen
  until a view was re-entered. Every card now reads its laid-out width again at the next frame after it connects
  and after each render, and draws to it.

## [1.5.7] — 2026-10-08

### Changed

- **A pause ends on the way back**: a wall paused from its corner is a wall again as soon as the page goes to
  another dashboard or to the settings and returns, without a tap on *Resume*. Moving between the views of the
  same dashboard keeps the pause.

## [1.5.6] — 2026-10-08

### Added

- **A bigger clock**: `size: large` or `huge` on a digital hero clock draws its digits half as big again or twice
  the size, for a wall read from across the room. Where the column is too narrow for the size asked, the digits
  step down to the largest that fits.

### Changed

- **The wall's × pauses**: a tap on the corner button pauses the wall like the long press does — the sidebar and
  the header return with *Wall paused · Resume*, and the wall comes back by itself when the screensaver would have,
  or on the next visit. It no longer switches *Wall panel* off for the device; the *Wall* tab's switch and
  `?kiosk=0` still do.

## [1.5.5] — 2026-10-08

### Added

- **A bare clock**: `frame: false` on the clock card drops the card around a hero or side clock — no plate, no
  border, no padding — so the time can sit on the page itself, next to the greeting. The editor shows it as
  *Show the card frame*; a tile keeps its shape.

## [1.5.4] — 2026-10-08

### Changed

- **A wall fills its screen**: on a wall panel, a dashboard's columns grow to the tablet's width instead of stopping
  at 480 px, so a landscape tablet no longer shows empty bands at its sides. Computers and phones keep the width.

## [1.5.3] — 2026-10-07

### Fixed

- **Delete reads again** in Home Assistant's menus in dark mode: the theme gave Home Assistant's "quiet" danger,
  warning and success tokens a chip's pairing (a solid pastel plate with a dark ink), while Home Assistant draws
  that ink straight on a dark menu — a near-black "Delete". The tokens are now the role's ink on the page over a
  faint tint of itself, in both modes.
- **Icons show in the pickers**: a picker row's icon circle (the icon picker, the entity pickers) took the accent's
  fill under the accent's own colour, which on an electric palette are the same colour — a plain disc and no glyph.
  The circle is now a resting icon circle, as the cards draw one.

## [1.5.2] — 2026-10-07

### Fixed

- **A tile's shade ruler stays where the finger put it** while the shade travels. A shade that reports its position
  only once its motor stops (Matter shades do, after three to fifteen seconds) made the tile's knob fall back to
  where the shade started a few seconds after the drag, then catch up when the motor stopped; the tile now keeps
  the position asked for while the cover says it is opening or closing, as the cover card does, and lets it go a
  few seconds after the cover stops elsewhere.

## [1.5.1] — 2026-10-07

### Changed

- **Fine adjustment is off by default** — a still press on a ruler no longer zooms it to a tenth of its range,
  which a thumb resting on a shade or a light tile kept doing by accident. The cards whose ruler a finger moves
  (tile, tiles, room, room lights, light, thermostat, fan, cover, media and helpers) take `fine_adjust: true`, in
  the editor too, to have the 450 ms hold back; tap to set, the relative drag and the keyboard are as they were.

## [1.5.0] — 2026-10-03

### Added

- **Dashboard tabs, your way** (#20): the view tabs in a dashboard's header — Home Assistant's own — take the look as
  the house chooses in *Appearance → Dashboard tabs*: Fluvy's (the dashboard's name, then the views as words, the
  accent under the open one), pills, Home Assistant's own, or hidden; each tab with its view's name, its icon or both
  (a view without an icon gets the one its name says), and the dashboard's name before them in any style.
  A person who keeps their own look keeps their own tabs. The edit mode and subviews keep Home Assistant's header.
- **The corner, your way**: *Appearance → Sidebar and header* puts Home Assistant's logo in the sidebar's head in place
  of the menu icon, takes away the dividers under the sidebar's name and the header, lays the header on the page's
  own colour, and puts the header's actions (add, search, Assist, edit) in one menu — all four, the corner of Fluvy's
  screenshots.
- **Templates in row text** — a row's `secondary` may be a Home Assistant template
  (`{{ states('sensor.humidity') }} %`), rendered by Home Assistant and kept live, on every card that lists rows:
  entities, lock, alarm, camera, bars, stat tiles, actions and helpers. The row's entity is `entity` in the template
  and the person looking `user`; a template that fails renders nothing, never its own text. The editor's field takes
  a keyword or a template alike (#21).
- **Compact variants** for the cards that ran long (#21): the bars card's `variant: compact` draws 48 px rows — the
  name and the value on one line, the 4 px bar under them; the weather card's `variant: compact` is one head row
  (the condition circle, the name, "condition · high / low" and the temperature) over the hours and the days ahead
  as columns, as many as the width holds (`days` stays the maximum); the stat tiles card's `variant: compact` draws
  64 px tiles of label over value, three a row when every label and value fits (`columns: auto | 2 | 3`, which the
  full tiles take too), and 48 px rows.
- **A size per device** — a tablet on the wall reads its dashboards at 90, 100, 110, 125 or 150 %, remembered by
  that browser alone: `?zoom=125` on the address (`?zoom=off` back), or *This device · Size* in the panel's
  Preferences tab and the Wall tab's device card. Only the dashboard's view grows; Home Assistant's header, sidebar,
  dialogs and the edit mode keep their size, and the size is set before the page paints. Every drag, scrub and
  measure of the cards reads the pointer in the control's own pixels, so a ruler, a lock's grip, a dial, a chart
  or a tab row behaves the same at any size (#21).
- **Power on the media cards** (#21): the media card turns a player on and off from a round in its head (in place
  of "…", which the artwork's tap still opens), a hero from its corner, and the now-playing strip from its left edge
  (`show_power`, on where the player can be switched); a player that is off offers "Turn on" and no dead transport.
  The compact row and the strip take `controls`: power, previous, play, next and volume, in the order written, as
  many as the width holds.

### Changed

- The settings panel has five tabs, on one line: *About* is now the last card of *Preferences* (*Fluvy*: the
  version, the look in use, the settings file, the house's reset). An old `/fluvy/about` link opens Preferences.
- On the dashboards that wear the look, the header's tabs are Fluvy's by default: the views as words instead of
  Home Assistant's icons. *Appearance → Dashboard tabs → Original* gives Home Assistant's tabs back.
- The automatic dashboards no longer repeat their views as chips under the greeting, now that the header's tabs carry
  their names; `greeting_tabs: show` (or the dashboard's options in the panel) puts them back.

### Fixed

- An automatic dashboard whose grid meter is found by its name (no power sensors in the Energy dashboard, no export
  sensor) drew its grid gauge with no entity: the card was handed `true` and failed to render. It names the meter.
- The energy card's `sources` variant (the house's power by source) is drawn from the power sensors the Energy
  dashboard names, as Home Assistant's own "Power sources" graph is: energy meters that tick in coarse steps, or a
  hybrid inverter's AC meter counted as the sun, no longer flatten the midday or put the sun in the night (#23). What
  went into the battery is drawn under the line with the export; "right now" is the house's own use; a gap in the
  recorder is a gap. Without power sensors the meters are read in blocks long enough for their step not to show.
- The bars card counted a `plain` row as 76 px in its height; it is 60. The stat tiles card's height left out the
  gaps above its tiles and its rows, so an automatic dashboard cut its columns 32 px short.
- A bars, stat tiles or weather row squeezed under what holds its name (half a column) cut the name to a letter; the
  rows now give their circles to the names, as a head does. A compact row of an entity that cannot be read said only
  "—"; it says "Unavailable", "Unknown" or "Not found". A missing entity drew a sensor's trend glyph; it draws the
  `ban` glyph. A dead stat tile was an ordinary tile; it wears the dashed hairline, in both variants.

## [1.4.0] — 2026-10-01

### Added

- **The energy flow, rebuilt** on one energy model shared by every energy card. A source is read the way its meter
  is: one signed sensor, two sensors (what comes in and what goes out), or one per phase summed per sign — so a
  house that imports on two phases and exports on the third shows both flows, and the sun's share of the house is
  right again (#19). With no sources given, the card reads the Energy dashboard's own: every grid connection, array
  and battery, two power sensors kept as two. Several arrays and batteries, a generator and a car that powers the
  house are sources too; `consumers` show where the energy goes. Variants `rows`, `cross` and `list`; styles
  `stream`, `legs` and `rail`; `motion: full | calm | off`; the badge says the sun's share, the self-sufficiency or
  the grid's way; each source takes its name, icon, colour, threshold, arrows and when to show. A day, a week or a
  month from the statistics, allocated hour by hour the way the Energy dashboard does, so the figures match.
- Every lane in the colour of where its energy came from, a solid arrowhead whose tip ends the lane, and pulses of
  light at a steady 24–72 px/s (eight a card at most, paused off screen and in a hidden tab).
- New energy cards: **Energy balance**, **Grid** (each phase, the price), **Batteries**, **Car charger**,
  **Where it went** (a sankey of the period), **Energy score**, **Water & gas**.
- The energy card's `sources` variant (the house's power today by where it came from), nested energy devices with
  what is not measured, Distribution's `total` (the whole's own meter: what no source accounts for), production by
  array, and a signed gauge for a meter that can go negative.
- [docs/energy.md](docs/energy.md): how the energy cards read a house, and every case.
- **Room lights** (`fluvy-lights-card`): a room's lights on one card. A tap on the card turns the whole room on or off;
  each light is a round beside the room's name (`row`), a chip with its name (`chips`) or a compact tile (`tiles`)
  that a tap turns and a hold opens. A light that is on wears its bulb's colour and its round a ring of its level;
  the lights come from an `area` or a list, each with its own name, icon and colour; `show_brightness` adds one
  ruler for the room. The automatic dashboard's Lights view starts each room of two lights or more with it.

### Changed

- The automatic dashboards read the whole Energy dashboard (every connection, the battery's charge, water and gas)
  and give the Energy template a *Today* view (a day's flow, where it went, the score) and a *Water & gas* view.
- The energy family loads as its own file, fetched as Fluvy starts: every page stays under its budget.
- 1.3's flow keys (`solar_power`, `grid_power`, `grid_invert`, `battery_*`, `home_power`, `flow_style: ribbons`) are
  still read, and never written.
- In the flow card's editor a source shows only the fields its kind is read by (a grid has no state of charge).
- A figure in kW (or kWh, MW…) from 1 to 100 keeps its decimal: "1.0 kW" beside "2.2 kW".

### Fixed

- The automatic dashboard could take an export meter for the grid's own; export meters are now the grid's second
  sensor.
- Production counted "today" on the browser's clock; it counts on the house's.
- An unavailable icon circle was filled in a solid palette (Volt, Mint); it is the dashed ring alone, as in the others.
- A tile gave nothing under the finger (its entrance held the press back); it shrinks and eases again, as designed.
- The room card's inner tiles were 76 tall; they are 84, as designed.
- In a narrow column the light and fan cards' heads kept room for a 48 px switch that is 56: the second line now
  gives way before it is cut.

## [1.3.3] — 2026-09-30

### Added

- `fire-dom-event` as a card action, as Home Assistant's own cards take it: the whole action leaves the card as
  `ll-custom`, so browser_mod's popups (with `browser_id: THIS`) and other frontend integrations answer a
  Fluvy card's tap and hold.
- `assist` as a card action (it opens Home Assistant's Assist), and `navigation_replace` on a `navigate`.

### Fixed

- An action with a `confirmation` ran without asking. Home Assistant's own dialog now asks first, with its words
  and its exemptions, and a tile no longer flips before the answer.
- `call-service`, as `perform-action` was written before Home Assistant 2024.8 (with `service` and
  `service_data`), did nothing.

## [1.3.2] — 2026-09-30

### Added

- A visible way out of wall mode: a small × in the top-right corner, there when the wall comes and whenever
  someone touches the screen, gone when it rests. A tap takes the device out of the wall, and a notice offers the
  way back for a few seconds. The house chooses in the *Wall* tab (*Way out*) between this button, the default,
  and the hidden long press of before, which pauses the wall instead.

## [1.3.1] — 2026-09-29

### Fixed

- A light card in half a phone's column (two lamps on a line) had no switch: under 200 px its head dropped it and
  left the ruler to turn the lamp on and off. The head is now fitted round the switch, as the fan's is — the sub
  steps aside, then the icon circle, never the switch — and the card keeps its height.

## [1.3.0] — 2026-09-29

### Added

- Five automatic dashboards, each a template and a strategy of its own: **Home** (the dashboard of before, with a
  Rooms view when the house has two rooms with something in them, and a page per room), **Rooms** (a tab a floor,
  a card a room), **Energy** (now, production, devices, meters), **Security** (the alarm, the cameras, the openings
  room by room) and **Wall** (two columns for a tablet, without tabs). The panel's *Dashboards* tab lists them,
  creates any with one tap, edits each one's options apart, lists it in the sidebar or not, and recreates it in two
  taps; the settings file carries every dashboard's options.
- Two cards, forty-one in all: **Room** — an area as the approved area card (its photo under the name pill, its
  temperature, humidity and how many devices are on, its lights, climate, media and devices as rows or as inner
  tiles; as a tile, or as a compact row) — and **Map** — where everyone is, as columns of zones with the faces in
  each (two, then a "+N" disc), as rows, or as Home Assistant's own map on a plate.
- Wall mode for a tablet on the wall: no sidebar, no header, the screen kept awake, a screensaver with the clock (or
  black) after a while that any touch or a motion sensor wakes, day and night by Home Assistant's mode, the sun or
  a pair of hours with a night veil, the wall mesh behind the cards. The house sets it in the panel's *Wall* tab,
  whose preview shows the wall as it would be now (its night included) and which shows the screensaver itself on a
  tap; the tablet becomes a wall with `?kiosk` on the address (or the tab's switch) and remembers; a hold of the
  top-right corner pauses it. Everything of the wall loads only on a device that is one.
- Palettes that travel: a custom palette shared as a file (`<name>.fluvy-palette.json`) with a title and an author,
  read back onto the gallery, saved to the house (twelve, under *Yours*) or removed; the palettes the community has
  contributed ship under *Community* with their authors. A draft that equals one of them is that palette.
- Turkish (`tr`): the eighth language, in every card, page, dialog and editor form, with the words the automatic
  dashboards read a Turkish-named house by.
- Every card under one editors' contract: what to show (`show_*`), which items and in which order (subset lists
  with Fluvy's rows editor), at least one other layout (`variant`), the chip rows filling by default
  (`<x>_style: full | chips`), a `tap_action` and a `hold_action` (a still press on the head) on every entity card,
  a `tone` and a `color` on the card and on each item, `unknown` drawn as a live surface. New variants: compact cover,
  fan, vacuum, lock and alarm (144 tall), a camera tile, a gauge bar, compact energy and production, distribution
  rows, readouts grid, a plain heading, compact entities, the clock's face and layout apart, the calendar's
  calendars as items.
- Colour per card: every card takes a `color` — one of Home Assistant's colour names (`teal`, `deep-orange`…) or
  any `#rrggbb` — that stands in for the palette's accent inside it: its chart, its lit light, its icon circle,
  its dial. The colour is derived on the very palette the card wears, in light and in dark, through the same
  arithmetic that makes the palette (its ink readable on the card, its fill legible under its ink, twelve graph
  series apart), so a red card on Linen is Linen's red. The editor offers Home Assistant's colour picker, whose
  swatches show the palette's colours. Device tones (a fan, a heater, a speaker) keep their own.
- The dropdown: the cards' text field as a button, opening its list in the browser's top layer — over Home
  Assistant's sidebar and dialogs — under the field, or over it near the foot of the page, as wide as the field;
  keys, letters and the pointer as a native select's, a hint beside each name, the chosen row marked. The
  Preferences tab's language is the first to use it (eight chips before): *Automatic* with the language it
  resolves to, then Fluvy's languages by their own names with the English name beside.
- Preferences: a *Help improve this translation* row that opens the translating guide.
- View backgrounds: the wall mesh (`--fluvy-mesh-*`), derived from the palette's own page colour.

### Changed

- The cards' options share one vocabulary: `subtitle` (`sub`, `meta` before), `variant` (`layout`, `view`),
  `hours` (`trend_hours`), `color` (`accent`), `name` on an entity card (`title` before on the to-do, energy and
  production cards), `show_*` for every switch (`hide_completed` before), `calendars` as items on the calendar
  (`entities` + `tones`). Every older name is still read, for good; it is never written back.
- The settings are version 2: the house keeps its shared palettes and its wall. A house that goes back to 1.2 keeps
  them unread; a 1.2 save keeps what it does not know once the house has been saved by 1.3.
- The panel has six tabs — *Dashboards* (it was *Dashboard*) and *Wall* are new.
- The automatic dashboards' strategy, the wall, the community palettes and the cards' visual editor load on demand
  (their own chunks); a dashboard page pays only for the cards. The automatic dashboards cut their columns by every card's declared
  height, measured at a phone's column — the layouts are level where the old table left them uneven.
- The theme's named colours follow the tone Home Assistant gives each: pink is the armed alarm's rose, cyan the
  water, teal the presence green, lime the dehumidifier's green, light green the battery, deep purple the house,
  brown the gas (it was the accent). Every surface Home Assistant paints through them moves with them.
- The theme says which palette it is (`--fluvy-palette`), and so does a look applied live.
- Card editors: the choices of a dropdown (a variant, a forecast, a first weekday…) and the tones are said in the
  dashboard's language; they were English words whatever the language.
- A compact tile inside a card (a room's controls) is an inner tile: 84 tall, the control radius, the page's fill,
  no hairline; off, its icon circle is the card's fill with the text ink. The state line on an on-fill is the fill's
  ink at 80 % (4.5:1 on every palette; the palette gates hold it).
- The docs' card tables are generated from the code (`pnpm docs:cards`), and the release refuses a chunk over its budget.

### Fixed

- Tiles: a mini tile is never narrower than 84 px (a group asked for more columns lays out fewer), so its icon
  circle is always the 44 of every other tile; a small tile's state line is fitted to the tile — "Open · 40 %"
  loses its figure before it is cut, and an unavailable tile shows "—" where the word cannot fit — and a large
  unavailable tile drops its "· 11 days ago" the same way. A compact tile's icon left under 160 px, not under 128:
  the size queries measured the content box.
- Energy flow, gauge, bars and the other chart cards: in a column too narrow for the icon circle and the title,
  the circle goes and the title stays whole (a typed title may end in an ellipsis, as a name does). The energy
  card's curve draws in the card's colour again (its chart lacked a tone carrier).
- The cards' words arriving in a new language refreshed every card twice.
- The dropdown's list, once it scrolls (nine languages), was a tab stop of its own.
- The docs said "five tabs", listed the automatic dashboard's options without `weather` and `language`, and gave
  the Security view a rule it does not follow (it needs an alarm, a lock, a camera or a gate).

## [1.2.1] — 2026-09-28

### Removed

- The swipe between a dashboard's views (1.2.0). Home Assistant draws one view at a time, so the arriving view
  could only appear once it was on the page — a slide out, a gap, a slide in — and rendering the neighbouring
  view ourselves proved neither light nor safe. A gesture that cannot show what is coming is worse than none;
  the tabs stay, and the *Swipe between views* preference goes with it.

## [1.2.0] — 2026-09-27

### Added

- Swipe between a dashboard's views on a phone: the view follows the finger, and letting go past a third of the
  width (or a flick) opens the next tab, which slides in from the finger's side. A drag that begins on a ruler, a
  dial, a slider, a scrolling row of chips or a map is theirs; a drag that leans vertical stays a scroll; the
  screen's edges are left to the system. Each person's to turn off in Preferences → *Swipe between views*.
- German, Dutch, French, Italian and Brazilian Portuguese, for every card, page and the settings panel, chosen in
  Preferences or taken from Home Assistant's language. One catalogue per language, fetched only when spoken; the
  automatic dashboard reads a house named in any of them.

## [1.1.2] — 2026-09-27

### Added

- Tiles card: each tile's readouts are chosen in the editor (a plug's power, its energy today, its cost); a wide
  tile shows three, a narrower one two. A sensor whose device class is monetary is labelled Cost.
- Light card: half a section is enough. Under 260 px of content (or `variant: compact`) the card keeps its head,
  with the level in the state line, and the brightness ruler alone, so two lamps share a line; the layout editor
  lets it go down to six columns (it stopped at nine).

## [1.1.1] — 2026-09-27

### Changed

- The demo opens in the light mode on Blaze, and lays its frames out in lanes filled by height: nothing overlaps,
  nothing is left hanging.

### Fixed

- Settings: the first card sits 16 px under the toolbar on a desktop too (it touched it).

## [1.1.0] — 2026-09-27

### Added

- A public demo at https://acosta290.github.io/fluvy/: the real cards, pages and settings panel on the simulated
  home, with the palette, mode, device and language changed live; deployed by `pages.yml` on every push to `main`.
- Motion clips in the README: the precision dimmer, the energy flow changing pace, a palette applied in the settings
  panel, a scrub across the History charts. `pnpm clips` records them on the playground (`tools/render/clip.mjs`)
  with the gestures the interaction suites prove.
- The settings panel's Dashboard tab lists Fluvy auto in Home Assistant's sidebar, or takes its entry out (an
  administrator's switch).

### Changed

- Activity: the icons sit 4 px clear of the timeline's spine, as the dots already did.
- The interaction suites and the clips share one gestures module (`tools/render/lib/gestures.mjs`).

### Fixed

- The documentation counts fifteen palettes (there was never a Cobalt), lists the automatic dashboard's options as
  the code has them (`dial | compact | ruler`, `ribbons | rail | legs`, eight views) and no longer mentions an
  Activity card that does not exist; CI measures the two devices sheets by their names.

## [1.0.2] — 2026-09-27

### Changed

- The README shows the whole product: the app with the sidebar and tabs, three galleries of cards, the two
  pages, the four tabs of the settings panel.


## [1.0.1] — 2026-09-27

### Changed

- The HACS listing says what Fluvy is: "Fluvy - Premium Theme & Cards", so a search for a theme finds it.
- The README renders inside HACS as well: absolute image URLs, no `<picture>` element.
- The licence badge is static, so it never depends on a cache.

### Removed

- The files prepared for Home Assistant's brands repository, which no longer takes custom integrations; the
  integration serves its own icon.


## [1.0.0] — 2026-09-27

The first public release.

### Added

- The Fluvy theme: one generated theme, light and dark, written from the same tokens the cards use.
- Thirty-nine cards for lights, climate, energy, media, security, calendar, clocks, helpers, people, weather and
  more, each with an editor form and a picker preview.
- The automatic dashboard (`strategy: { type: custom:fluvy-home }`): Home, Lights, Climate, Energy, Media and
  Sensors built from the registries and the energy preferences.
- The settings panel in the sidebar: sixteen palettes in a pastel and an electric line or a custom accent, three
  shapes, where the look applies, per-person preferences, applied live.
- The Activity and History pages, replacing Home Assistant's logbook and history pages while the house wants them.
- The shell: Home Assistant's own pages (Settings, dialogs, forms, the sidebar) in the same design while the
  Fluvy theme is worn.
- The integration (`custom_components/fluvy`): installs through HACS, serves the build, loads it on every page,
  registers the panel and the Lovelace resource, installs the theme, and says through Repairs what only you can do.
- English and Spanish.

[Unreleased]: https://github.com/acosta290/fluvy/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/acosta290/fluvy/compare/v1.3.3...v1.4.0
[1.3.3]: https://github.com/acosta290/fluvy/compare/v1.3.2...v1.3.3
[1.3.2]: https://github.com/acosta290/fluvy/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/acosta290/fluvy/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/acosta290/fluvy/compare/v1.2.1...v1.3.0
[1.2.1]: https://github.com/acosta290/fluvy/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/acosta290/fluvy/compare/v1.1.2...v1.2.0
[1.1.2]: https://github.com/acosta290/fluvy/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/acosta290/fluvy/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/acosta290/fluvy/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/acosta290/fluvy/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/acosta290/fluvy/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/acosta290/fluvy/releases/tag/v1.0.0
