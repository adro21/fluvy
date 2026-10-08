# A glanceable Home — tried first as a test copy

The owner's dashboard (`fluvy-auto`) reads poorly at a glance: Home is a long scroll of every light, blind and a
full thermostat; each lights heading shows the house-wide "10 of 17 on"; names carry noise ("Driveway Camera
Fluent", "Idle"); the kitchen lights are counted twice (each exists as a `light` and a `switch`); and fifteen tabs
spread the same things across Home, Lights, Security, Sensors and the room pages. A wall tablet is planned next.

## Design (agreed 2026-10-07)

- Built as a **separate dashboard**, `/fluvy-test` ("Dashboard (test)"), from a copy of `fluvy-auto`, which stays
  untouched. If the owner likes it, its views move to `fluvy-auto` (after a backup) and the test dashboard is
  deleted; if not, it is deleted.
- **Home**, top to bottom: the greeting; a glance strip (lights on → Lights, all off, what plays, the fireplace,
  blinds open, camera motion or a person, home or away); comfort (a compact thermostat, the inside temperatures, the
  weather); the three cameras in a compact row; four quick scenes (Evening, Movie, Good Night, Morning).
- **Fixes**: each lights heading counts its own lights; the kitchen lights appear once (as lights, not switches);
  short names ("Driveway", "Porch", "Backyard"), no camera state.
- **Tabs**: Home, Rooms, Lights, Climate, Security, Media. Sensors folds into Security and Climate; the room pages
  stay as subviews opened from Rooms.
- Only the dashboard's configuration changes. If the existing cards cannot make a good glance strip, the owner is
  asked before any card code changes.

The house has no door, window or lock sensors, so "secure" means camera detections, blinds and presence.
Fluvy's built-in Wall dashboard was created alongside at `/fluvy-wall` to look at for the tablet step.

## As built (2026-10-07)

- Home: the greeting; *Lights* heading counting the 16 real lights ("8 of 16 on", opens Lights) with two chips,
  *All lights off* (`light.turn_off` on `all`, behind a confirmation) and *See lights*; *Around the house* as
  compact tiles (fireplace, TV, bedroom blinds, living room shade); *Outside*, the three cameras' person detectors;
  four Hue scenes with their own icons. Second column: the thermostat (`compact`, heat and cool only, no presets or
  fan), the room temperatures, the weather. Third: the three cameras as Home Assistant picture cards.
- Security: who is home, every detection, each camera with its person and vehicle rows.
- Sensors became *System* (batteries, updates) rather than being folded away: updates are not security.
- The previous configuration of `fluvy-auto` is in `~/.config/fluvy/dashboard-fluvy-auto-backup-2026-10-07-before-test.json`.
