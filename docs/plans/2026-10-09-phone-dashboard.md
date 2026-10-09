# Phone dashboard and the compact camera card — implementation plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give the camera card a `compact` style (the picture alone, name pill on it, a third of a section wide),
release it as 1.5.14, install it on the owner's Home Assistant, then build the `/fluvy-mobile` ("Phone") dashboard
designed in `2026-10-09-phone-dashboard-design.md`.

**Architecture:** One card change in `packages/cards/src/camera/camera-card.ts` following the `variant` convention
of the weather card (`static keys`, `defaults`, `selectField`); styles in the card's own `css` block; a unit test
beside it; a playground frame for the measurer and the browser suites. The dashboard is Home Assistant storage
configuration written over the WebSocket API with `tools/dev/ha.mjs`; no code is involved.

**Tech Stack:** Lit + TypeScript (pnpm workspace, vitest with happy-dom), Playwright (Chromium and WebKit) for
`tools/render`, Home Assistant WebSocket API via `tools/dev/ha.mjs`.

**Baseline (done 2026-10-09):** `pnpm install`, `pnpm build`, `pnpm check` all pass at commit `ab4345e`.

---

## Facts the tasks rely on

- `Card.contentWidth` (`packages/core/src/card.ts:330`) is `this.width - 40`: the card's padding is 20 a side.
- `RowsCard` (`packages/cards/src/lock/rows.ts`) gives `rowCount`, `renderRows(events)`, which draws `<div class="dv-rows">`.
- `head()` (`packages/ui/src/parts.ts:95`) draws `<div class="fv-card__head">`.
- `selectField(name, options)` (`packages/cards/src/shared/form.ts:131`) labels each value from `option.<value>`;
  `option.full` and `option.compact` exist in all eight catalogues, as does `editor.variant` ("Style"). **No new
  i18n keys are needed.**
- `packages/cards/src/shared/editors.test.ts` enforces: every name in `static keys` is a field of `getConfigForm()`
  and vice versa; every `defaults` key is a shown field.
- `packages/cards/src/shared/heights.test.ts` requires `layoutHeight` to be a multiple of 4.
- `.dv-cam__pill` (dark 45 % pill, 24 tall, 12 from the top) and `.dv-cam__live i` (the red dot) are in
  `packages/ui/styles/devices.css:190-221` (generated into `packages/ui/src/styles/generated/devices.ts` by
  `pnpm build`; never edit the generated file).
- The playground: `apps/playground/src/sheets/devices-security.ts`, frame `title: 'Camera'`; URL
  `http://127.0.0.1:5183/?sheet=devices-security&width=360`.
- The owner's entities: `camera.{driveway,porch,backyard}_balanced`, `binary_sensor.{driveway,porch,backyard}_{person,vehicle}`,
  `climate.my_ecobee`, `weather.forecast_home`, `person.adam`, the scenes `scene.smart_bridge_{morning,evening,movie,good_night}`.
  The 16 lights are listed in the `fluvy-test` Home's Lights heading (read it over the API, task 9).

---

### Task 1: The compact variant — failing tests

**Files:**
- Create: `packages/cards/src/camera/camera-card.test.ts`

**Step 1: Write the failing tests**

```ts
// @vitest-environment happy-dom
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import type { HomeAssistant } from '@fluvy/core';
import { familiesDefined } from '../index.js';
import { FluvyCameraCard } from './camera-card.js';

// the index fetches the media and energy families: they land before this file's page goes
afterAll(() => familiesDefined);

type CardElement = HTMLElement & {
  setConfig(config: unknown): void;
  hass: HomeAssistant;
  updateComplete: Promise<boolean>;
  getGridOptions(): { columns: number; min_columns?: number };
};

const hass = {
  language: 'en',
  locale: { language: 'en', number_format: 'language', time_format: '12' },
  config: { unit_system: { temperature: '°C' }, time_zone: 'UTC' },
  states: {
    'camera.driveway': {
      entity_id: 'camera.driveway',
      state: 'idle',
      attributes: { friendly_name: 'Driveway', entity_picture: '/api/camera_proxy/camera.driveway?token=t' },
    },
    'binary_sensor.person': {
      entity_id: 'binary_sensor.person',
      state: 'off',
      attributes: { friendly_name: 'Person' },
    },
  },
  entities: {},
  devices: {},
  areas: {},
  hassUrl: (path: string) => path,
  localize: (key: string) => key,
  formatEntityState: (s: { state: string }) => s.state,
} as unknown as HomeAssistant;

async function camera(config: Record<string, unknown>): Promise<CardElement> {
  const card = document.createElement('fluvy-camera-card') as CardElement;
  card.setConfig({ type: 'custom:fluvy-camera-card', entity: 'camera.driveway', ...config });
  card.hass = hass;
  document.body.append(card);
  await card.updateComplete;
  return card;
}

const root = (card: CardElement): ShadowRoot => card.shadowRoot!;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('the camera’s compact style', () => {
  it('keeps the head and the rows by default', async () => {
    const card = await camera({ rows: ['binary_sensor.person'] });
    expect(root(card).querySelector('.fv-card__head')).not.toBeNull();
    expect(root(card).querySelector('.dv-rows')).not.toBeNull();
    expect(root(card).querySelector('.dv-cam__name')).toBeNull();
    expect(root(card).querySelector('[data-card]')!.classList.contains('dv-card--compact')).toBe(false);
  });

  it('is the picture alone with the name in a pill, no head, no rows', async () => {
    const card = await camera({ variant: 'compact', rows: ['binary_sensor.person'] });
    expect(root(card).querySelector('.fv-card__head')).toBeNull();
    expect(root(card).querySelector('.dv-rows')).toBeNull();
    expect(root(card).querySelector('[data-card]')!.classList.contains('dv-card--compact')).toBe(true);
    const pill = root(card).querySelector('.dv-cam__name');
    expect(pill?.textContent?.trim()).toBe('Driveway');
    expect(pill?.querySelector('i')).not.toBeNull(); // the live dot lives in the name pill
  });

  it('takes the name given to it', async () => {
    const card = await camera({ variant: 'compact', name: 'Front' });
    expect(root(card).querySelector('.dv-cam__name')?.textContent?.trim()).toBe('Front');
  });

  it('may sit a third of a section wide; the full card half', async () => {
    expect((await camera({ variant: 'compact' })).getGridOptions().min_columns).toBe(4);
    expect((await camera({})).getGridOptions().min_columns).toBe(6);
  });

  it('is 16:9 of a 360 column for the automatic dashboard, on the 4 px grid', () => {
    const full = FluvyCameraCard.layoutHeight({ type: 'custom:fluvy-camera-card', entity: 'camera.driveway' });
    const compact = FluvyCameraCard.layoutHeight({
      type: 'custom:fluvy-camera-card',
      entity: 'camera.driveway',
      variant: 'compact',
      rows: ['binary_sensor.person'],
    });
    expect(full).toBe(280);
    expect(compact).toBe(204); // round(360 × 9 / 16 / 4) × 4
    expect(compact % 4).toBe(0);
  });

  it('shows the variant in the editor', () => {
    const names = JSON.stringify(FluvyCameraCard.getConfigForm().schema);
    expect(names).toContain('"name":"variant"');
    expect(FluvyCameraCard.keys).toContain('variant');
  });
});
```

**Step 2: Run them to see them fail**

Run: `pnpm --filter @fluvy/cards exec vitest run src/camera/camera-card.test.ts`
Expected: FAIL — `dv-card--compact` absent, `min_columns` 6 for compact, `layoutHeight` 280 for compact,
`variant` not in the form or the keys. The first test (defaults) passes already.

---

### Task 2: The compact variant — implementation

**Files:**
- Modify: `packages/cards/src/camera/camera-card.ts`

**Step 1: The config and the keys**

After `const s = strings('camera');` add:

```ts
export type CameraVariant = 'full' | 'compact';
const VARIANTS: readonly CameraVariant[] = ['full', 'compact'];
```

In `CameraCardConfig` add, before `refresh`:

```ts
  /**
   * `full` (default): the head, the 16:9 picture with its pills and overlay buttons, the rows. `compact`: the
   * picture alone, edge to edge, the name and the live dot in one pill; no head, no buttons, no rows — a
   * thumbnail that may sit a third of a section wide.
   */
  variant?: CameraVariant;
```

In `static override keys = configKeys<…>([ … ])` add `'variant'` as the first entry. Add after `keys`:

```ts
  static override defaults: EditorDefaults = () => ({ variant: 'full' });
```

Import `EditorDefaults` from `'../shared/rows-editor.js'` (it is already imported as a type in the weather card:
copy that import) and `selectField` from `'../shared/form.js'`.

In `getConfigForm()` insert `selectField('variant', VARIANTS),` right after `nameIconFields(),`.

**Step 2: Heights and grid**

Replace `layoutHeight` with:

```ts
  /** The card's height at a 360 column, for the automatic dashboard's columns. */
  static override layoutHeight(config: CameraCardConfig): number {
    if (config.variant === 'compact') return Math.round((360 * 9) / 16 / 4) * 4; // the picture alone
    const rows = config.show_rows === false ? 0 : listLength(config, ['rows']);
    return 280 + (rows ? 16 + ROW * rows : 0);
  }
```

Add a getter and change `getCardSize` and `getGridOptions`:

```ts
  private get compact(): boolean {
    return this.config?.variant === 'compact';
  }

  override getCardSize(): number {
    return this.compact ? 3 : 5 + this.rowCount;
  }
  override getGridOptions(): LovelaceGridOptions {
    return { columns: 12, rows: 'auto', min_columns: this.compact ? 4 : 6 };
  }
```

**Step 3: Styles** — add to the card's `css` block (tokens only; the dark pill wash is the sheet's own):

```css
      /* compact: the picture is the card — no padding, the card's radius on the plate */
      .dv-card--compact {
        padding: 0;
        overflow: hidden;
      }
      .dv-card--compact .dv-cam {
        margin-top: 0;
        border-radius: var(--fluvy-radius-card);
      }
      .dv-card--compact .dv-cam__tap {
        border-radius: var(--fluvy-radius-card);
      }
      /* the name pill: bottom left, the live dot before the name, never wider than the picture */
      .dv-cam__name {
        top: auto;
        bottom: 12px;
        left: 12px;
        max-width: calc(100% - 24px);
        z-index: 4;
        pointer-events: none;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .dv-cam__name i {
        flex: none;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--fluvy-danger);
        transition: opacity var(--fv-base) var(--fv-ease);
      }
      .dv-cam__name.is-stale i {
        opacity: 0;
      }
      /* the off skin in a thumbnail: the glyph alone */
      .dv-card--compact .dv-cam__off p {
        display: none;
      }
```

**Step 4: Render** — in `renderCard()`:

- Height: `const width = this.compact ? this.width : this.contentWidth;` and use `width` in the 16:9 line.
- `offTop`: in compact the off block is the glyph alone (24 tall): `const offH = this.compact ? 24 : 76;` and
  `Math.max(0, Math.round((height - offH) / 2 / 4) * 4)`; use `offH` for the inline `height:`.
- The article's class: `` `fv-card dv-card ${this.compact ? 'dv-card--compact' : ''} ${isUsable(view) ? '' : 'is-unavailable'}` ``.
- The head: `${this.compact ? nothing : head({ … })}` (import `nothing` from `lit`).
- The name pill, rendered in compact **whatever the frame state** (skeleton, off, or live), as the last child of
  `.dv-cam`:

```ts
        ${this.compact
          ? html`<span class="dv-cam__pill dv-cam__name ${this.stale_ || !this.stamp_ ? 'is-stale' : ''}"
              ><i></i>${name}</span
            >`
          : nothing}
```

- Inside the live branch (`this.stamp_` set), in compact leave out `.dv-cam__live`, `.dv-cam__time` and
  `.dv-cam__actions`; keep the shade and the `.dv-cam__tap` button (the whole picture opens the stream):

```ts
              : html` <span class="dv-cam__shade" data-measure="skip"></span>
                  <button class="dv-cam__tap" data-target aria-label=${s(this.hass, 'view', { name })}
                    @click=${() => this.moreInfo()}></button>
                  ${this.compact
                    ? nothing
                    : html`<span class="dv-cam__pill dv-cam__live ${this.stale_ ? 'is-stale' : ''}"><i></i>${s(this.hass, 'live')}</span>
                        <span class="dv-cam__pill dv-cam__time">${this.clock()}</span>
                        <div class="dv-cam__actions">
                          ${round('snapshot', 'quiet', s(this.hass, 'snapshot'), () => this.moreInfo())}
                          ${round('expand', 'quiet', s(this.hass, 'fullscreen'), () => this.fullscreen())}
                        </div>`}`
```

- The rows: `${this.compact ? nothing : this.renderRows(true)}`.
- The empty state (`view.status === 'missing'`) stays as it is.

**Step 5: Run the tests**

Run: `pnpm --filter @fluvy/cards exec vitest run src/camera/camera-card.test.ts src/shared/editors.test.ts src/shared/heights.test.ts`
Expected: PASS.

**Step 6: Format, lint, types**

Run: `pnpm prettier --write packages/cards/src/camera/ && pnpm lint && pnpm typecheck`
Expected: clean.

**Step 7: Commit**

```sh
git add packages/cards/src/camera/
git commit -s -m "Camera card: a compact style, the picture alone with its name pill" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_018brZztdrsBzkvgs3SDcBNY"
```

---

### Task 3: Docs, catalogue and changelog

**Files:**
- Modify: `packages/cards/src/index.ts:119-123` (the catalogue description)
- Regenerate: `docs/cards.md` (`pnpm docs:cards`)
- Modify: `CHANGELOG.md` under `## [Unreleased]`

**Step 1:** Description → `'A still that refreshes itself, with live and time pills; tap for the stream. Compact: the picture alone, its name on it.'`

**Step 2:** `pnpm docs:cards`; `git diff docs/cards.md` must show `variant` (`full`, `compact`) in the Camera row.

**Step 3:** Changelog:

```md
## [Unreleased]

### Added

- **The camera card's compact style** (`variant: compact`): the picture alone, edge to edge, with the camera's
  name and the live dot in one pill — no head, no rows, no overlay buttons — and it may sit a third of a section
  wide, so three cameras fit one row on a phone. A tap still opens the live view.
```

**Step 4:** `pnpm build && pnpm check` — all green (the docs check compares `docs/cards.md` to the code).

**Step 5:** Commit: `git commit -s -am "Camera card: document the compact style"` (with the attribution lines).

---

### Task 4: The playground frame and the measurer

**Files:**
- Modify: `apps/playground/src/sheets/devices-security.ts:299-313`

**Step 1:** After the `'Camera'` frame add:

```ts
    {
      title: 'Camera · compact',
      cards: [
        { type: 'custom:fluvy-camera-card', entity: 'camera.driveway', name: 'Driveway', variant: 'compact' },
      ],
    },
    {
      title: 'Camera · compact, unavailable',
      cards: [{ type: 'custom:fluvy-camera-card', entity: 'camera.garage', variant: 'compact' }],
    },
```

**Step 2:** Start the playground in the background: `FLUVY_NO_HMR=1 pnpm --filter @fluvy/playground dev`.

**Step 3:** Measure: `node tools/render/measure.mjs --page "http://127.0.0.1:5183/?sheet=devices-security" --frame '[data-frame]' --width 1400`
Expected: **0 violations**. If the name pill or the off glyph trips the 4 px grid or containment, adjust the
offsets in task 2's styles (12 → 8/16) and re-measure.

**Step 4:** Screenshot the two new frames at `width=120` too (`?sheet=devices-security&width=120`) with
`tools/render/shot.mjs` or a short Playwright script in the scratchpad, **in both Chromium and WebKit**
(`npx playwright install webkit` is done), and look at them: the pill must read, nothing may overflow.

**Step 5:** Run every browser suite: `node tools/render/visual.mjs` (about 10 minutes). All suites must pass; the
camera section of `interactions-security.mjs` targets `frame(page, 'Camera')`, which still exists unchanged.

**Step 6:** `pnpm prettier --write apps/playground/src/sheets/devices-security.ts && pnpm check`; commit
`"Playground: the compact camera frames"`.

---

### Task 5: Release 1.5.14

Follow CLAUDE.md's release procedure exactly:

1. `node tools/release/version.mjs 1.5.14`; `git commit -s -am "Release 1.5.14"` (attribution lines).
2. `pnpm build && pnpm check && node tools/release/check.mjs --tag v1.5.14`.
3. `git push origin main` (no tag).
4. Build and verify the zip:
   ```sh
   (cd custom_components/fluvy && zip -r -X ../../fluvy.zip . -x '__pycache__/*' -x '*/__pycache__/*')
   unzip -l fluvy.zip | grep -q ' manifest.json$'
   ```
5. `notes.md` = the `[1.5.14]` section of `CHANGELOG.md` (`awk`), both files in the scratchpad.
6. `gh release create v1.5.14 fluvy.zip --repo adro21/fluvy --target $(git rev-parse HEAD) --title v1.5.14 --notes-file notes.md`
7. `gh api repos/adro21/fluvy/releases/tags/v1.5.14` → `draft: false`, `prerelease: false`, asset `fluvy.zip` `uploaded`.
8. `gh run list --repo adro21/fluvy --limit 3` until the *Release* and the *Measurer and interactions* runs are green.

---

### Task 6: Install on the house

```sh
node tools/dev/ha.mjs download v1.5.14
node tools/dev/ha.mjs restart        # say so to the owner in the final message
node tools/dev/ha.mjs status         # "Loaded: 1.5.14", resource URL carries 1.5.14
```

---

### Task 7: Read what the dashboard reuses

Save to the scratchpad:

```sh
node tools/dev/ha.mjs ws '{"type":"lovelace/config","url_path":"fluvy-auto"}' > auto.json
node tools/dev/ha.mjs ws '{"type":"lovelace/config","url_path":"fluvy-test"}' > test.json
```

From `test.json` Home: the Lights heading (its 16 entities), the chips card (`All lights off` with its confirmation,
`See lights`), the compact thermostat, the scenes card, the readouts. From `auto.json`: the Lights view's sections
(one card per room), the Rooms view's room cards, the Climate view's cards, the Security view's camera cards with
their rows (person and vehicle). Every `path` that points at `/fluvy-auto/...` or `/fluvy-test/...` is rewritten to
`/fluvy-mobile/...`.

---

### Task 8: Build the Phone dashboard's configuration

**Files:** a Python script in the scratchpad, `build-phone.py`, that writes `phone.json`. Every view:
`type: sections`, `max_columns: 1`, `icon`, `path`, `title`; sections are `{"type": "grid", "cards": [...]}`.

**Home** (`path: home`, `icon: fluvy:home`), one section:

1. `{"type":"custom:fluvy-hello-card","person":"person.adam","weather":"weather.forecast_home","grid_options":{"columns":12,"rows":"auto"}}`
2. Three cameras, each `{"type":"custom:fluvy-camera-card","entity":"camera.<x>_balanced","name":"<Name>","variant":"compact","grid_options":{"columns":4}}`
   in the order Driveway, Porch, Backyard.
3. The Lights heading from the test Home with `"path":"/fluvy-mobile/lights"`.
4. The chips card from the test Home with `See lights` → `/fluvy-mobile/lights`.
5. The compact thermostat from the test Home (`grid_options.columns: 12`).
6. `{"type":"custom:fluvy-heading-card","title":"Scenes","icon":"mdi:palette"}` then the scenes card from the test
   Home with `"columns": 2`.
7. `{"type":"custom:fluvy-weather-card","entity":"weather.forecast_home","variant":"compact","grid_options":{"columns":12}}`

**Lights** (`lights`, `fluvy:bulb`): the `fluvy-auto` Lights view's sections, minus the hello card.

**Climate** (`climate`, `fluvy:thermo`): the compact thermostat; the readouts card with the two room temperatures
(from the test Home); the two humidity cards; the weather card (`full`, `forecast: daily`).

**Security** (`security`, `fluvy:shield`): the people card (`title: Who is home`, from the `fluvy-auto` Sensors
view); then each camera as a full card on the `balanced` feed with its rows:
`rows: [{"entity":"binary_sensor.<x>_person","name":"Person","icon":"person"},{"entity":"binary_sensor.<x>_vehicle","name":"Vehicle","icon":"car"}]`.

**Rooms** (`rooms`, `fluvy:door`): the `fluvy-auto` Rooms view's room cards in one section, each
`grid_options.columns: 12`; their `path` left as it is only if it points at a `/fluvy-mobile/` view — otherwise remove
`path` (the room sub-pages are not copied).

Print the JSON and **read it through** before saving: every entity id above exists (task 7's `get_states` list),
no `/fluvy-auto/` or `/fluvy-test/` path remains.

---

### Task 9: Create the dashboard and save its configuration

```sh
node tools/dev/ha.mjs ws '{"type":"lovelace/dashboards/create","url_path":"fluvy-mobile","title":"Phone","icon":"mdi:cellphone","show_in_sidebar":true,"require_admin":false,"mode":"storage"}'
node tools/dev/ha.mjs ws "$(python3 -c "import json; print(json.dumps({'type':'lovelace/config/save','url_path':'fluvy-mobile','config':json.load(open('phone.json'))}))")"
cp phone.json ~/.config/fluvy/dashboard-fluvy-mobile-v1.json
```

If `create` fails because the dashboard exists, skip it and save. Read it back with `lovelace/config` and compare.

---

### Task 10: Look at it

With the Chrome tools (`claude-in-chrome` skill first): a new tab on `http://homeassistant.local/fluvy-mobile/home`.
`max_columns: 1` makes the view one phone-wide column at any window size, so no window resize is needed. Check:
the three thumbnails sit in one row with their names; a tap on one opens the live view (then close the dialog);
each tab opens; nothing scrolls sideways. Take a screenshot of Home and send it to the owner with `SendUserFile`.
Close the tab. Fix any layout fault in `phone.json` and re-save (task 9's second command).

---

### Task 11: Wrap up

- Add "## As built (2026-10-09)" to `docs/plans/2026-10-09-phone-dashboard-design.md` with what differs from the
  design; commit.
- Final message to the owner, in plain language: what shipped (1.5.14 installed, Home Assistant was restarted),
  the dashboard's URL, how to make it the iPhone's default (*Settings → Companion app → [this phone] → Default
  dashboard → Phone*), and to hard-refresh the browser.
