# A dashboard for the phone

The owner's dashboard (`fluvy-auto`) is laid out for the Mac: three columns that, on an iPhone, stack into one long
scroll with the cameras at the very bottom. Home Assistant cannot reorder a view by screen size; it can only show or
hide a card or a section by one. The owner wants the phone to open on the cameras, small enough that all three are in
view at once, over a page that is clean, simple and quick to use.

## Design (agreed 2026-10-09)

- A **separate dashboard**, `/fluvy-mobile` ("Phone", `mdi:cellphone`), built for one column. `fluvy-auto`, the
  wall's and the test dashboard stay as they are. The owner makes it the default in the iPhone app
  (*Settings → Companion app → Default dashboard*).
- **Home**, top to bottom, to fit one phone screen: the greeting; the three cameras as compact thumbnails in one
  row (Driveway, Porch, Backyard; a tap opens the live view); *Lights* heading counting the 16 real lights with two
  chips (*All lights off* behind a confirmation, *See lights*); the compact thermostat (heat and cool only); the four
  Hue scenes two across (Morning, Evening, Movie, Good night); the compact weather.
- **Tabs**: Home, Lights, Climate, Security, Rooms — icons in the header, so five fit. Lights is the room-by-room
  layout of `fluvy-auto`'s Lights tab; Climate the thermostat, the two room temperatures, the humidity and the
  forecast; Security the three cameras full size with their person and vehicle rows, and who is home; Rooms a card a
  room.
- **The cameras use the `balanced` feed** on the phone: `clear` is the full-resolution stream, slow and heavy off
  Wi-Fi.
- **One change to Fluvy**: the camera card gets `variant: compact` — no head, the name in a pill on the picture, the
  live and time pills kept, the overlay buttons and the rows left out, allowed down to a third of a section's width
  (`min_columns: 4`). Released as 1.5.14 and installed before the dashboard is built. No new words: `editor.variant`
  ("Style") and `option.compact` exist in every catalogue.
- **Verification**: unit tests for the compact variant beside the card; a WebKit probe at iPhone size against the
  playground; every browser suite before the push; a look at the finished dashboard in Chrome at phone width.

The previous configuration of `fluvy-auto` is in `~/.config/fluvy/dashboard-fluvy-auto-backup-2026-10-09-mobile.json`
(a reference copy; `fluvy-auto` is not changed by this work).

## As built (2026-10-09)

- Fluvy 1.5.14 added `variant: compact` to the camera card; 1.5.15 moved its name pill to 8 px from the corner
  after a 109 px thumbnail (a third of a 390 px phone) cut "Driveway" to "Drivew…".
- `/fluvy-mobile` ("Phone", `mdi:cellphone`) as designed: Home (greeting, three compact cameras on the `balanced`
  feed, the Lights heading with its two chips, the compact thermostat, the four scenes two across, the compact
  weather), Lights, Climate, Security, Rooms. Every view is `max_columns: 1`. The room cards carry no `path`, since
  the room pages were not copied. Its configuration is kept in `~/.config/fluvy/dashboard-fluvy-mobile-v1.json`.
- Checked at 390 px in Chrome through a same-origin iframe (the owner's Chrome profile is a wall device, which
  hides every dashboard's header and sidebar there, and the automation window reports itself hidden, so camera
  loops and enter animations do not run in it): the thumbnails are 109 × 60 with whole names; Lights, Climate and
  Security render; the camera proxy answers `image/jpeg` for the `balanced` cameras.
