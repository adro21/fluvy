# The bedroom shades reopening at night (2026-10-23 and 2026-10-25)

The four bedroom shades and drapes (Pulse Pro hub, Matter) closed at sundown on the Automate app's timer, then
reopened partway later in the evening while nobody was touching anything. This records what the logs showed, what was
fixed, and **the agreed next step if it ever happens again**.

## What the logs showed

| Night          | Sundown close (Pulse app timer)      | Then, from Home Assistant on Adam's login                                     |
| -------------- | ------------------------------------ | ----------------------------------------------------------------------------- |
| Fri 2026-10-23 | 6:22 pm, all four closed             | 8:25 pm "close" to the two drapes (no movement), 8:47 pm "32 %" to all four   |
| Sun 2026-10-25 | 6:18 pm, all four closed             | 6:37 pm "21 %" to all four, 7:07 pm "3 %" to the two drapes (Adam was out)    |

- The sundown close worked every night. The reopening was a **new command sent to the hub**: the Matter server log
  shows `Invoke » …goToLiftPercentage` (Home Assistant → hub), and Home Assistant's logbook shows
  `cover.set_cover_position` with Adam's user (`9c27d9…`) on `cover.all_bedroom_blinds` (which holds all four) or
  `cover.all_bedroom_drapes`, the two big group tiles on the dashboards. Neither the hub nor Apple Home started it,
  and Apple Home showed the result correctly.
- Only three clients use Adam's login: the iPhone app, the wall tablet's app and the MacBook Air's app. The Mac was
  closed and the tablet's screensaver was up (a modal that blocks touches), so it was the **iPhone**. Both of Sunday's
  commands came seconds after the iPhone app reported a location, which it does as it opens. Adam's conclusion: it
  happened when he opened the app.
- **Cause:** Fluvy's ruler (the slider strip along a big tile's foot) treated a `pointercancel` as a release. When a
  touch that began on the strip turned into a page scroll, the browser cancelled it and the ruler sent wherever the
  finger had drifted. Opening the app and scrolling the phone's Home past the bedroom group tiles was enough.

## What was changed

- **Fluvy 1.5.26:** a ruler sends a value only on `pointerup`. A cancel or lost capture springs back and sends
  nothing (`packages/ui/src/controls/ruler.ts`, tests in `packages/ui/src/__tests__/ruler.test.ts`).
- **Dashboards (2026-10-25, before the release):**
  - Every big cover tile on `/fluvy-auto`, `/fluvy-wall` and `/fluvy-mobile` is `size: compact`, so it has no ruler.
  - On `/fluvy-auto` and `/fluvy-wall`, every bedroom cover tile (the two groups and the four covers) has
    `tap_action: more-info`, so a stray tap opens the details instead of moving anything.
  - Backups: `~/.config/fluvy/dashboard-*-backup-20261025-2001.json` (before both changes) and
    `dashboard-*-backup-*-b.json` (before the second).
  - Adam does not want the sliders back (2026-10-25): the shade tiles stay compact.
- **Diagnostics turned on** (Home Assistant entities, read-only):
  - Tablet: `binary_sensor.samsung_galaxy_tab_a11_interactive`, `sensor.samsung_galaxy_tab_a11_screen_brightness`,
    `sensor.samsung_galaxy_tab_a11_last_used_app`, `binary_sensor.samsung_galaxy_tab_a11_device_locked`.
  - iPhone: `sensor.adams_iphone_18_last_update_trigger`.
  - Mac: `binary_sensor.macbook_air_active`, `sensor.macbook_air_frontmost_app`,
    `sensor.macbook_air_last_update_trigger`.

## If the bedroom shades ever misbehave again: move them to Home Assistant (agreed with Adam)

Adam's decision (2026-10-25): if this happens again after 1.5.26, **do not investigate again first. Move the bedroom
shades in Apple Home to Home Assistant**, the way the Front Office shade was moved
(`docs/plans/2026-10-20-front-office-shade.md`). Steps:

1. **Check what happened**, so the note can say it: the logbook and the Matter log for the night (who sent what).
2. **Home Assistant side:** add the bedroom covers to the existing HomeKit Bridge
   (`HASS Bridge:21064`, entry `01M5D6WQEJ6XHVSFXYDC9YQKTW`). Use the options flow over REST:
   - mode `bridge`, `include`, domain `cover`;
   - entities `cover.front_office_shade` (keep it) plus `cover.shade_1`, `cover.shade_2`, `cover.drape_1`,
     `cover.drape_2`;
   - no device triggers.

   Reload the entry. No new pairing code is needed: the bridge is already in Apple Home, and the four new tiles appear
   under it. Put them in the Bedroom room.
3. **Adam, in the Home app:**
   - Remove the **Pulse Pro** from Apple Home. Press and hold a bedroom shade tile from the Pulse Pro → gear → its
     Bridge line ("Shade Hub") → *Remove Bridge from Home*. This removes only Apple's Matter link: Home Assistant
     keeps its own Matter connection to the Pro, so the dashboards, scenes and Automate app timers keep working.
     Check the name before confirming: it must be the Pulse Pro, never the Living Room hub (RA-Pulse-1154325).
   - Rename the new tiles to Shade 1, Shade 2, Drape 1 and Drape 2.
   - Repoint any Apple Home scenes, automations or Siri routines that used the old tiles.
4. **Tradeoff to tell Adam:** Apple Home and Siri then reach the bedroom only while Home Assistant is up. To undo it,
   share the Pro back to Apple Home from Home Assistant (Matter → device → *Share device*) and scan the code.
5. Update this file, `CLAUDE.md`'s shades section and the memory notes.
