# The Lights tab of the owner's dashboard — one card per room

The owner's dashboard (`fluvy-auto`, a taken-over copy of the automatic one) had a Lights tab that ran long and
jumbled: for every light a full dimmer card (both rulers) on top of the room's group card, and the rooms spread
across three grid sections so headings landed mid-column and a room's cards split across columns.

## Design (agreed 2026-10-07)

- Each room is its own section, so it never splits across columns; the greeting stays first, the scenes last.
- A room with several dimmable lights is one room-lights card (`custom:fluvy-lights-card`, `variant: chips`,
  `show_brightness: true`): the switch for the room, the room's brightness ruler, a chip per light (tap toggles,
  hold opens the dimmer). Group entities ("… All Lights") are left out where their members are the chips.
- A room of plain switches (the kitchen) is the same card as tiles (`variant: tiles`).
- A room with one light is a tile: large (with the brightness ruler) for a dimmer, compact for a switch.
- Headings keep their `entities` so the "3 of 4 on" counters stay.

Written over the API (`lovelace/config/save`), the rest of the dashboard untouched; the previous configuration is
backed up in `~/.config/fluvy/` first.
