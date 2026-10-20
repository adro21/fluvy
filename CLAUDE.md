# CLAUDE.md — working in this fork

This repository is Adam's **personal fork** of Fluvy (`acosta290/fluvy`), a Home Assistant theme and card library.
It runs on his own Home Assistant through HACS, which installs the `fluvy.zip` attached to a GitHub release of
**this fork** (`adro21/fluvy`). The owner is not a developer: do the work end to end, never ask him to run commands,
and explain in plain language.

## Hard rules

- Work only in this fork (`origin`). Never push to, open pull requests against, or create anything in
  `acosta290/fluvy`. Pass the fork explicitly to every `gh` command (`--repo adro21/fluvy`, or the owner/name read
  from the `origin` remote): in a fork, `gh` can default to the parent repository.
- No new network calls, analytics or runtime dependencies in the code.
- Don't change the Python in `custom_components/fluvy` unless the change needs it.
- Follow the project's own conventions (`CONTRIBUTING.md`): tests beside the code, a key in **every** language
  catalogue (`packages/core/src/i18n/locales/*.json`), docs, and a line in `CHANGELOG.md` under *Unreleased*.
  Commit messages are imperative and name the area; sign commits with `git commit -s`.

## Set-up (what worked)

- Node from `.nvmrc` (24; 25 works) and the pnpm that `package.json` names in `packageManager` (11.x). A newer
  pnpm 10 switches itself to that version on `pnpm -v` in the repo.
- `pnpm install`, `pnpm build`, then `pnpm check` — all three must pass **before** touching anything.
- `pnpm check` runs prettier, eslint, tsc, every package's vitest, the i18n check, the docs check and the release
  invariants. Run `pnpm prettier --write <changed files>` before it.
- `docs/cards.md` tables are generated: change a card's keys or its catalogue description (`packages/cards/src/index.ts`),
  then run `pnpm docs:cards`; the check fails if the file is not what the code says.
- A card option is: a field in the card's config interface → its name in `static keys` (the type refuses a key the
  interface lacks and vice versa) → a field in `getConfigForm()` → a word under `"editor"` in all 8 catalogues
  (`editor.<key>` is picked up automatically). `packages/cards/src/shared/editors.test.ts` enforces all of it.
- `pnpm check` does **not** run the browser suites (`tools/render/interactions*.mjs`); CI's *Measurer and
  interactions* job does, and a failure there emails the owner. **Speed first (the owner's rule, 2026-10-09):**
  do not run the suites locally before a push unless the change alters a control's behaviour (a ruler, a stepper,
  a card's taps, the wall's corner) — then run only the suite that covers it (`node tools/render/visual.mjs
  <suite>`), never all 25 (~10 minutes). A dashboard-only change needs no check, no release and no Chrome look:
  save it over the API and let the owner look on his phone. Verify in the owner's Chrome only when asked. After a
  push, `gh run list --repo adro21/fluvy` once; a red run emails the owner. (History: 1.5.1 and 1.5.6 broke the
  suites and CI stayed red for days — that is what the suites guard against.)
- A bug the owner sees only on the iPhone (the Home Assistant app is WebKit) will not show in Chrome on the Mac.
  Playwright's WebKit is installed for `tools/render` (`npx playwright install webkit`); a probe against the
  playground reproduces first-frame layout differences. When that is not enough, a temporary in-page diagnostic
  that writes to Home Assistant's log (`hass.callService('system_log','write',…)`, read with
  `node tools/dev/ha.mjs ws '{"type":"system_log/list"}'`) gets facts off the phone with the owner only reopening
  the app — that is how 1.5.12's sideways-scroll fix was found. Remove it in the next release.
- Known flake: `packages/cards/src/panel/panel.test.ts` ("shows the screensaver…") waits a fixed 80 ms for a lazy
  import and can fail when every package tests at once. Rerun `pnpm check`; it is not a real failure.
  (`fine-adjust.test.ts` failed the same way on the media card during the 1.5.22 and 1.5.24 releases — it created the
  card before the lazily imported media family had landed; fixed in 1.5.25 with a `beforeAll(() => familiesDefined)`.
  A test that mounts a weather, media or energy card must wait that way.)

## Release procedure (what worked on 2026-10-07 for 1.5.1; 1.5.14–1.5.18 on 2026-10-09)

Before releasing anything the owner will see on a phone, check it at phone width first (a 109 px camera thumbnail
cut its name in 1.5.14 and cost a second release). The whole procedure takes about 8 minutes when nothing fails;
tell the owner that up front, and never stack a second release on an untested guess about how a device behaves
(the phone app reopens on the last page it showed, not at the root — 1.5.17 assumed the root and 1.5.18 fixed it).

1. Make the change, commit it (`git commit -s`).
2. `node tools/release/version.mjs X.Y.Z` — bumps every package.json, the integration's manifest and turns the
   *Unreleased* changelog section into `[X.Y.Z] — date`. Commit as `Release X.Y.Z` (`git commit -s -am`).
3. `pnpm build && pnpm check && node tools/release/check.mjs --tag vX.Y.Z` — all must pass.
4. `git push origin main`. **Do not push a tag.**
5. Build the zip exactly as `.github/workflows/release.yml` does, and check the manifest is at its root:
   ```sh
   (cd custom_components/fluvy && zip -r -X ../../fluvy.zip . -x '__pycache__/*' -x '*/__pycache__/*')
   unzip -l fluvy.zip | grep -q ' manifest.json$'
   ```
6. Release notes: the `[X.Y.Z]` section of `CHANGELOG.md` (the workflow's `awk` extracts it) into `notes.md`.
7. Create the release through the API, targeting the pushed commit; this also creates the tag server-side:
   ```sh
   gh release create vX.Y.Z fluvy.zip --repo adro21/fluvy --target <commit sha> --title vX.Y.Z --notes-file notes.md
   ```
   It must be a normal published release (no `--draft`, no `--prerelease`).
8. Verify: `gh api repos/adro21/fluvy/releases/tags/vX.Y.Z` shows `draft: false`, `prerelease: false` and an asset
   named `fluvy.zip` with `state: uploaded`.
9. Actions are enabled on the fork, so the tag created in step 7 also runs the *Release* workflow, which rebuilds the
   same zip and re-attaches it to the same release. That is harmless; confirm with `gh run list --repo adro21/fluvy`
   that it ended green and the asset is still listed.

10. Install it on the house: see the next section.

Fallback if the API refuses the release or the upload: on github.com, in the fork, *Releases → Draft a new release*,
tag `vX.Y.Z` targeting `main`, publish; the *Release* workflow builds and attaches `fluvy.zip`.

## Installing a release on the owner's Home Assistant (from here, over the API)

A **local** session (on the owner's Mac) reaches his Home Assistant at `http://homeassistant.local` (no port). The
long-lived token is in `~/.config/fluvy/ha.env` (`HA_URL=…`, `HA_TOKEN=…`), owner-readable only; it is never
committed, printed or sent anywhere but that address. A cloud session cannot reach the house: then the owner clicks
*Update* in HACS and restarts.

`tools/dev/ha.mjs` does the HACS side (worked on 2026-10-07):

```sh
node tools/dev/ha.mjs status            # HA version, what HACS has, what is loaded, the resource URL
node tools/dev/ha.mjs download vX.Y.Z   # HACS refreshes the fork's releases and downloads that one
node tools/dev/ha.mjs restart           # restarts Home Assistant and waits until it is back
node tools/dev/ha.mjs add               # re-adds the integration if it was deleted
node tools/dev/ha.mjs status            # confirm "Loaded: X.Y.Z" and the resource URL carries X.Y.Z
```

Then tell the owner to hard-refresh the browser (Cmd + Shift + R).

## The house itself (SSH, since 2026-10-10)

The Home Assistant box (HAOS in a VirtualBox VM, reserved at 10.0.0.197) runs the *Terminal & SSH* add-on, key-only
with the Mac's `~/.ssh/id_rsa`: `ssh root@homeassistant.local`. That is how files in `/config` are written
(`configuration.yaml`, `go2rtc.yaml`); `ha core check` and `ha addons logs <slug>` work there. The add-on has its own
network namespace: reach host ports as `10.0.0.197:<port>`, never `127.0.0.1`. Live video goes through the **go2rtc
add-on** (`a889bffc_go2rtc`, configured in `/config/go2rtc.yaml`, WebRTC on 18555 TCP+UDP, forwarded by the router,
`candidates: [stun:18555]` for the public address) with `go2rtc: url: http://127.0.0.1:1984` in `configuration.yaml`;
Home Assistant's built-in go2rtc is TCP-only without STUN and cannot stream to a phone outside the house. Back up a
file (`cp -n x x.bak-<date>` and a copy in `~/.config/fluvy/`) before changing it. `go2rtc.yaml` carries explicit
`_sub`, `_main` and `_ext` streams (with an opus audio transcoder) for each of the **five** Reolink cameras on the NVR at
10.0.0.94 (Backyard, Driveway, Porch, since 2026-10-16 "Access", NVR channel 3, entities `*.access_*`, and since 2026-10-19
"Side", NVR channel 4, entities `*.side_*`). Its
`preload:` block was found **empty** on 2026-10-17 (the notes from 2026-10-10 said it kept the balanced feeds warm; nothing
records who emptied it) — ask the owner before refilling it. **After a camera password change, restart the add-on**
(`ha addons restart a889bffc_go2rtc` over SSH) so go2rtc drops the old credentials. Adding a camera: see the
`access-camera` memory note (channel ↔ uid from the NVR's `GetChannelstatus`, rename device and entities, enable the
balanced/clear streams, add the three stream blocks, clone the Backyard card on every dashboard).

## The owner's dashboard (editable over the API too)

The dashboard at `/fluvy-auto` is a **taken-over copy** of the automatic one: plain views and sections stored by
Home Assistant (`strategy: None`), which the owner edits by hand. It is read and written over the WebSocket API:

```sh
node tools/dev/ha.mjs ws '{"type":"lovelace/config","url_path":"fluvy-auto"}' > before.json   # read it all
# edit the JSON (one view at a time; leave the other views as they are), then
node tools/dev/ha.mjs ws "$(python3 -c "import json; print(json.dumps({'type':'lovelace/config/save','url_path':'fluvy-auto','config':json.load(open('after.json'))}))")"
```

Always save a copy of the whole configuration in `~/.config/fluvy/` before writing (the Lights tab's previous and
current layouts are there, `dashboard-fluvy-auto-backup-*.json` and `dashboard-fluvy-auto-lights-v1.json`). The
Lights tab was rebuilt on 2026-10-07 as one card per room (`docs/plans/2026-10-07-lights-tab-layout-design.md`).
A Chrome tab (the browser tools) is the way to look at the result; close it afterwards. Three more dashboards
exist: `/fluvy-wall`, the wall tablet's (a Samsung Galaxy Tab A11+, landscape, about 1280 × 800): a hand-made copy of
the main Home with a chips row of tabs, since wall mode hides the header; `/fluvy-mobile` ("Phone"), the iPhone's
one-column dashboard (`docs/plans/2026-10-09-phone-dashboard.md`) with the camera thumbnails on top (Driveway full width, then Porch, Backyard, Access and Side two by two) and a
`live-<camera>` page per camera; and `/fluvy-test`, a trial glance-first Home
(`docs/plans/2026-10-07-glanceable-home-test-design.md`). A change that touches cameras or weather goes to all four.
Weather on every dashboard is Environment Canada's `weather.richmond_hill_forecast` (since 2026-10-14; Met.no's
`weather.forecast_home` is still installed, unused). The TV is left off every dashboard at the owner's
request. Say so before restarting Home Assistant or resizing browser windows.

## Reaching the house from outside (how the phone gets in)

`https://adro21-home.ignorelist.com` (FreeDNS dynamic name) → the Rogers Ignite gateway at 10.0.0.1 → TCP 443 → Caddy on the
MacBook Pro (10.0.0.20; ZeroSSL certificate, auto-renewed) → Home Assistant at 10.0.0.197:80. Port 18555 is forwarded to
the HA box for go2rtc's WebRTC. No Nabu Casa, no `http:` block in `configuration.yaml`, no external URL set. Scrypted
and Homebridge on the Pro reach the phone through their own clouds, so "they still work" says nothing about the forward.
When the phone cannot reach HA from outside (2026-10-16): check, in order, `dig +short adro21-home.ignorelist.com`
against `curl -s https://api.ipify.org`; the certificate with `openssl s_client -servername <name> -connect 10.0.0.20:443`;
Caddy → HA with `curl -k --resolve <name>:443:10.0.0.20 https://<name>/api/` (401 means HA answered); then port 443 from
outside with check-host.net's JSON API (`/check-tcp?host=<ip>:443`, then `/check-result/<id>`). The gateway does NAT
loopback (`nc -z -G 3 <public ip> 18555` works from inside), so a timeout on 443 means the forward is gone: the owner
re-adds *TCP 443 → 10.0.0.20* in the Ignite HomeConnect app (Connect → See Network → Advanced Settings → Port Forwarding);
that gateway drops rules after reboots and firmware updates. This Mac cannot SSH into the Pro.

## Apple Home cameras (Scrypted on the MacBook Pro)

Apple Home's cameras come from **Scrypted** on the MacBook Pro (`https://10.0.0.20:10443`; the owner's Chrome is
logged in), not from Home Assistant: Reolink Camera Plugin → Rebroadcast → HomeKit plugin, all five cameras on the
NVR's `ext.bcs` RTMP stream. When Apple Home shows a fresh snapshot but only a spinner (on and off the network) while
Home Assistant and the Reolink app play fine, restart Scrypted's **Reolink Camera Plugin** (Plugins → Reolink Camera
Plugin → Restart Plugin): after NVR reboots it keeps a dead connection (2026-10-18, after a Reolink firmware update;
the HomeKit log said "HomeKit Streaming RTCP timed out"; restarting the HomeKit plugin did not help). Since that
firmware the `ext` stream is 896 × 512 H.264 at 25 fps and the main streams are 4K HEVC. Don't feed Apple Home a bigger stream: HomeKit
video tops out at 1080p and Scrypted passes streams through, so a 2560 × 1440 H.264 main showed only its top-left
corner (tried on Backyard on 2026-10-18 and reverted; the NVR's main cannot go below 2304 × 1296 and its `ext` stream is
not configurable). The NVR's encoder settings before that test are in `~/.config/fluvy/nvr-enc-backup-2026-10-18.json`.

## The shades (three Automate hubs, since 2026-10-17)

Every motor is on exactly one hub. The **Pulse Pro** has the four bedroom shades (`cover.shade_1/2`, `cover.drape_1/2`)
and reaches both Apple Home and Home Assistant over Matter. Two **Pulse 2** hubs (HomeKit only) have one shade each:
RA-Pulse-1154325 at 10.0.0.223 → `cover.living_room`, RA-Pulse-1018893 at 10.0.0.114 on Wi‑Fi beside the shade (10.0.0.117 when on Ethernet; its radio hears the motor badly: −79 to −82 beside it, where the Living Room hub reads −68; its HomeKit side stuck on "Opening…/Closing…" when the slow motor reported mid-travel, so since 2026-10-20 Apple Home gets this shade from HA's HomeKit Bridge "HASS Bridge:21064" (only `cover.front_office_shade`) and the hub's own bridge is removed from Apple Home; keep the hub powered) → `cover.front_office_shade`. Apple
Home pairs them by their HomeKit code; Home Assistant reaches them through the HACS integration *Automate Pulse Hub v2*
(domain `automate`), added by IP — both addresses are reserved in the gateway (2026-10-20); if one ever changes, add a new `automate` entry at the new address,
delete the old one and reset the devices' names and areas (the entity ids come back). The old Pro-side copies are disabled as
`cover.*_pulse_pro_old`. Never "Remove Accessory" on a Pro shade tile in Apple Home: it removes the whole bridge.

## Verifying in the owner's browser

The Chrome tools reach the owner's logged-in Home Assistant: open `http://homeassistant.local/…` in a new tab,
inspect computed styles with the JavaScript tool (the theme's variables sit on the `home-assistant` element),
take a screenshot, and close the tab. Cancel any editor opened there rather than saving it. The fork is registered in HACS as a custom
repository of type *Integration* (`adro21/fluvy`); the original `acosta290/fluvy` was removed from HACS.
