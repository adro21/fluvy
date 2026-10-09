/**
 * Fluvy loader — the module Home Assistant loads on every page (`extra_module_url`) and the module the settings
 * panel is registered with (`panel_custom`). The integration serves it at
 * `/fluvy-frontend/<version>-<build>/loader.js`, a folder named after the build it holds, so the URL of a build
 * never changes and a browser cache can never hold a stale copy of what matters.
 *
 * - the build is imported from the same folder (`fluvy.js`), at the very URL the dashboards import through their
 *   Lovelace resource, so the browser evaluates it once;
 * - the import waits for Home Assistant's websocket, which the app opens before any panel renders: a card defined
 *   earlier could be registered before the app swaps `window.customElements` and become invisible to it;
 * - the `fluvy:` icon set is registered at once as a stand-in, so no icon asked for before the build arrives is lost;
 * - the look this browser last applied is restored before Home Assistant paints, so no other palette flashes.
 *
 * One retry after two seconds; then the dashboards still load the build through their resource.
 */

// The look this browser last applied to the whole app, before Home Assistant renders: no flash of another
// palette. The build's look engine takes this very sheet over (`__fluvyEarlyLook`) and corrects the mode.
try {
  const early = JSON.parse(localStorage.getItem('fluvy:look') ?? 'null');
  if (
    early &&
    typeof early.css === 'string' &&
    early.css &&
    'adoptedStyleSheets' in Document.prototype
  ) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(early.css);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    document.documentElement.setAttribute('fluvy-look', '');
    window.__fluvyEarlyLook = sheet;
  }
} catch {
  // no storage or a stale value: the build applies the look once the settings arrive
}

// What this device is, before Home Assistant renders. A wall panel starts as one: the shell hides the sidebar
// and the header on this attribute (the build's wall controller confirms, or takes it off, once it knows the
// page). A device that reads its dashboards larger starts at that size: the shell's `device-zoom` sheet zooms
// the view on this variable (the build's `look/zoom.ts` takes it over). The sizes are `DEVICE_ZOOMS`
// (`packages/core/src/settings/device.ts`); a test holds the two lists together.
const ZOOMS = [90, 100, 110, 125, 150];
try {
  const device = JSON.parse(localStorage.getItem('fluvy:device') ?? 'null');
  const cache = JSON.parse(localStorage.getItem('fluvy:settings') ?? 'null');
  // a device that made no choice is a wall when the house makes tablets walls and this is one: a touch screen
  // with no mouse, 600 or more on its shorter side (`isTablet` in core's settings/device.ts, the same rule)
  let wall = device ? device.wall === true : false;
  if (!device || device.wall == null) {
    wall =
      cache?.house?.wall?.devices === 'tablets' &&
      window.matchMedia('(hover: none) and (pointer: coarse)').matches &&
      Math.min(window.screen.width, window.screen.height) >= 600;
  }
  if (wall) document.documentElement.setAttribute('fluvy-wall', '');
  // the dashboard this device opens on (`deviceHome` in core's settings/device.ts, the same rule): its own
  // choice, else a wall's first wall dashboard. Only an app opened at its root is sent there — before it routes,
  // so Home Assistant's own default never shows first; a link to a page is a link to that page.
  const home =
    (device && typeof device.home === 'string' && device.home) ||
    (wall ? (cache?.house?.wall?.dashboards?.[0] ?? '') : '');
  if (home && !home.includes('/') && location.pathname === '/')
    history.replaceState(history.state, '', `/${home}${location.search}${location.hash}`);
  if (device && ZOOMS.includes(device.zoom) && device.zoom !== 100)
    document.documentElement.style.setProperty('--fluvy-zoom', String(device.zoom / 100));
} catch {
  // no storage: a device that is not a wall, at Home Assistant's size
}

// The `fluvy:` icon set exists before the app renders: `<ha-icon>` marks an icon of an unknown set
// "legacy" for good, and the sidebar and the view tabs render before the build arrives. Until then
// each request waits; the build's registerIcons() replaces this stand-in and hands the real set over.
const icons = (window.customIcons ??= {});
if (!icons.fluvy) {
  let handOver;
  const real = new Promise((resolve) => {
    handOver = resolve;
  });
  icons.fluvy = {
    handOver,
    getIcon: (name) => real.then((set) => set.getIcon(name)),
    getIconList: () => real.then((set) => set.getIconList()),
  };
}
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Home Assistant's websocket once the app has connected (it connects before any panel renders). */
async function connection() {
  for (let tries = 0; tries < 300; tries += 1) {
    const conn = document.querySelector('home-assistant')?.hass?.connection;
    if (conn) return conn;
    await wait(100);
  }
  return null;
}

// The build beside this file: the one URL the Lovelace resource names too.
const build = new URL('fluvy.js', import.meta.url).href;

async function load(retry) {
  try {
    if (!(await connection()))
      console.warn('[fluvy] Home Assistant did not connect in 30 s; loading anyway');
    await import(build);
  } catch (error) {
    if (retry) {
      await wait(2000);
      return load(false);
    }
    console.error('[fluvy] the build beside the loader could not be loaded', error);
  }
  return undefined;
}

// awaited: a custom panel (Fluvy's settings, registered with this file as its module) is created once its
// module has settled, so the element it names is defined by then
await load(true);
