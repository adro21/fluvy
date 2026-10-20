# The Front Office shade (2026-10-20)

The Front Office shade kept sticking on "Opening…" or "Closing…" with a spinner in Apple Home, or showed the wrong
position. This records what was found, what was changed, and how the shade is wired up now.

## How it is set up now

```
iPhone (Apple Home) ─HomeKit─▶ Home Assistant "HASS Bridge" ─┐
Dashboards / HA scenes ──────▶ cover.front_office_shade ────┴─▶ Pulse 2 hub RA-Pulse-1018893 ─radio─▶ shade motor
Automate app timers and scenes ─────────────────────────────────▶ (stored and run on the hub)
Physical remote ───────────────────────────────────────────────────────────────────────radio─▶ shade motor
```

- **Hub:** Automate Pulse 2 `RA-Pulse-1018893` ("Front Office Shade Hub" in Home Assistant, area Front Office), on Wi‑Fi
  **beside the shade** at **10.0.0.114** (MAC `C8:2B:96:B4:F9:A0`, listed as `espressif-878` in the Rogers gateway,
  address reserved there). On Ethernet the same hub is 10.0.0.117 (MAC `C8:2B:96:B4:F9:A3`), but from the Ethernet spot
  it cannot hear the shade. **No extender** (the owner's choice). The hub must stay powered: it is the only radio that
  talks to the shade for Home Assistant and Apple Home.
- **Home Assistant:** HACS integration *Automate Pulse Hub v2* (domain `automate`), entry for `10.0.0.114`.
  Entities: `cover.front_office_shade`, `sensor.front_office_shade_battery`, `sensor.front_office_shade_signal`
  (enabled 2026-10-20; the hub reports the motor's signal in dBm).
- **Apple Home:** gets the shade from Home Assistant's **HomeKit Bridge** ("HASS Bridge:21064", bridge mode, includes
  only `cover.front_office_shade`), paired in the Home app and placed in Front Office as "Shade". The hub's own
  HomeKit bridge (`RA-Pulse-1018893`) was **removed from Apple Home**, so its stuck tile is gone. If the bridge ever
  needs re-pairing, the code is in Home Assistant's notifications.
- **Automate app:** the timers (open to about 75 % at 8:30, close around 8 pm) and scenes are stored on the hub. The
  shade was re-paired today, and the owner re-checked them.
- **Living Room hub** `RA-Pulse-1154325`: unchanged, wired at 10.0.0.223 (MAC `0C:B8:15:01:1B:FF`, reserved in the
  gateway), still in Apple Home through its own HomeKit bridge.

A private copy of the three Home Assistant entries (both `automate` hubs and the HomeKit Bridge) is in
`~/.config/fluvy/shades-and-homekit-entries-2026-10-20.json`.

## What was wrong

1. **The hub's Apple Home side (the real cause of the spinner).** The motor is slow: a full open or close takes about
   55–80 s, against about 30 s for the Living Room shade. Partway through, it sends one position report. The Pulse 2's
   HomeKit side takes that mid-travel value as its target. When the shade then arrives at 0 % or 100 %, Apple Home sees
   a target it never reached and keeps spinning. Home Assistant gets the final position every time. In a logged test,
   Home Assistant had "closed, 0 %" while Apple Home showed "Opening…". The same thing happened with the shade paired to
   the Living Room hub, so replacing the hub would not fix it. Routing Apple Home through Home Assistant does.
2. **The Front Office hub has a weak receiver.** With the hub held beside the motor, the shade read −79 to −82 dBm.
   The Living Room hub in the same spot read −68 dBm. Across the room without an extender, the reading fell to −88 to
   −98 dBm. That is why the shade needed the extender and could not be paired from the Ethernet spot. The hub still
   sends commands well, which is why the shade always moved even when it showed the wrong state.
3. **The hub's Wi‑Fi at its old spot was poor.** It pinged at 87–230 ms (the Living Room hub: 4 ms) and dropped out of
   Home Assistant five times in two days. Beside the shade, it is fine.

The battery reads 82 % (12.3 V). The physical remote works because it only sends and never needs to hear back from the
shade.

## What was changed

- Signal sensors enabled for both Pulse 2 shades.
- Test: shade paired to the Living Room hub (signal −68 dBm, Apple Home still stuck), then that test pairing deleted in
  the Automate app. Deleting it also erased the motor's pairing with the Front Office hub, so the shade was **re-paired**
  to the Front Office hub beside the shade. The motor's id on the hub changed (`SAV` → `TXE`), so Home Assistant created
  `cover.front_office_shade_2`; it was renamed back to `cover.front_office_shade` (and the signal sensor likewise), so
  the dashboards and the *Good Morning* and *Leaving Home* scenes kept working.
- Home Assistant's HomeKit Bridge set up for this one shade, and paired in Apple Home. The hub's own bridge removed from
  Apple Home.
- Both Pulse 2 addresses reserved in the Rogers gateway (.114 Front Office, .223 Living Room).

## If it misbehaves again

- **Home Assistant shows the shade as unavailable:** check the hub answers (`ping 10.0.0.114`). If its address changed,
  add a new `automate` entry at the new address over the REST config flow, delete the old entry, then set the hub's
  name and the devices' area to Front Office again. The entity ids come back on their own, unless the motor was
  re-paired (then rename the `_2` entities).
- **Apple Home shows the shade as "No Response" but Home Assistant has it:** reload the HomeKit Bridge entry
  (`POST /api/config/config_entries/entry/01M5D6WQEJ6XHVSFXYDC9YQKTW/reload`).
- **Read the history first:** `GET /api/history/period/<start>?filter_entity_id=cover.front_office_shade,sensor.front_office_shade_signal`.
  A healthy close goes "closing" → one mid value → "closed 0" about a minute later.
- **Never delete a pairing for this motor in the Automate app** without being ready to re-pair it to the Front Office
  hub, beside the shade.
- **A permanent fix for range:** a new Pulse 2 hub would let the hub go back on Ethernet. Apple Home should still go
  through Home Assistant either way.
