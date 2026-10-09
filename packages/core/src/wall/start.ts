import type { HomeAssistant } from '../ha/types.js';
import { WALL_ATTRIBUTE } from '../look/attributes.js';
import type { LookHandle } from '../look/start.js';
import { appHass } from '../look/start.js';
import { latchFromUrl, wallDevice } from '../settings/device.js';
import { cachedSettings } from '../settings/store.js';
import type { WallHandle, WallPhase, WallUi } from './controller.js';

/*
 * The wall's switch, in every page's bundle: reads `?kiosk` off the address (and drops it), and on a device that
 * is a wall fetches the controller and its pieces. Everywhere else it answers "off" and costs nothing more.
 */

export interface WallStartOptions {
  readonly look: LookHandle | undefined;
  /** Fetches the wall's pieces (the cards package's screensaver, corner and toast). */
  ui(): Promise<WallUi>;
  /** Home Assistant's app object (default: the page's `<home-assistant>`); the playground hands its own. */
  hass?(): HomeAssistant | undefined;
}

/** The wall as the page sees it: the controller's answers, or "off" until (and unless) it loads. */
export interface WallFacade {
  on(): boolean;
  phase(): WallPhase;
  dark(): boolean | undefined;
  pause(): void;
  resume(): void;
  exit(): void;
  sleep(): void;
  wake(): void;
  onChange(listener: (phase: WallPhase) => void): () => void;
  /** Whether the controller was fetched: this device is a wall. */
  loaded(): boolean;
  /** Fetches the controller if the device became a wall since the page loaded (the panel's switch). */
  refresh(): void;
}

export function startWall(options: WallStartOptions): WallFacade {
  const latched = latchFromUrl(location.search);
  if (latched !== undefined) {
    // the address is read once; the device remembers, and the address stays clean
    const url = new URL(location.href);
    url.searchParams.delete('kiosk');
    history.replaceState(history.state, '', url.toString());
  }
  // the loader marks the page a wall before anything is drawn, from what the device remembered: an address that
  // says `kiosk=0` (or a memory the panel's switch cleared) takes the mark off now, not at the next reload
  const { look } = options;
  // what the device is: its own choice, or the house's rule for tablets (the live settings, else the cached ones)
  const isWall = (): boolean => wallDevice((look?.settings() ?? cachedSettings())?.wall.devices);
  if (!isWall()) document.documentElement.removeAttribute(WALL_ATTRIBUTE);
  const listeners = new Set<(phase: WallPhase) => void>();
  let inner: WallHandle | undefined;
  let loading = false;
  const load = (): void => {
    if (inner || loading || !look || !isWall()) return;
    loading = true;
    void import('./controller.js').then((m) => {
      inner = m.createWall({
        doc: document,
        win: window,
        hass: options.hass ?? appHass,
        settings: () => look.settings(),
        onSettings: (listener) => look.onChange(() => listener()),
        setWall: (state) => look.setWall(state),
        ui: options.ui,
        onPhase: (phase) => {
          for (const listener of listeners) listener(phase);
        },
      });
    });
  };
  load();
  return {
    on: () => inner?.on() ?? false,
    phase: () => inner?.phase() ?? 'off',
    dark: () => inner?.dark(),
    pause: () => inner?.pause(),
    resume: () => inner?.resume(),
    exit: () => inner?.exit(),
    sleep: () => inner?.sleep(),
    wake: () => inner?.wake(),
    onChange: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    loaded: () => inner !== undefined,
    refresh: load,
  };
}
