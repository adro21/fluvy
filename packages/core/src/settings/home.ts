import { navigate } from '../actions.js';
import type { HomeAssistant } from '../ha/types.js';
import type { LookHandle } from '../look/start.js';
import { appHass } from '../look/start.js';
import { deviceHome, readDevice, wallDevice } from './device.js';
import { cachedSettings } from './store.js';

/*
 * The dashboard this device opens on, at launch. Home Assistant's *Set as default* (2025.12) is one choice for every
 * device; a device's own choice (`DeviceSettings.home`, or a wall's first wall dashboard) is applied once per page
 * load: an app opened at its root, or on Home Assistant's default dashboard — which is where the phone app lands
 * when it reopens on the last page it showed — goes to the device's own. A link to any other page is left alone.
 * The loader already sends the root on before the app routes; this covers the default dashboard, which only the
 * app knows (`hass.defaultPanel`).
 */

export interface HomeRedirectInput {
  readonly pathname: string;
  /** Home Assistant's default dashboard (its url path); `lovelace` when it says nothing. */
  readonly defaultPanel: string | undefined;
  /** The device's dashboard (`deviceHome`); '' none. */
  readonly home: string;
}

/** The dashboard a location is on (`/fluvy-auto/home` → `fluvy-auto`); the wall's `urlPathOf`, kept apart so this
 * file pulls nothing of the wall's into what every page loads. */
const urlPathOf = (pathname: string): string | undefined => pathname.split('/')[1] || undefined;

/** Where a page just loaded should go, or nothing. */
export function homeRedirect(input: HomeRedirectInput): string | undefined {
  if (!input.home) return undefined;
  const here = urlPathOf(input.pathname);
  if (here === input.home) return undefined;
  const root = here === undefined;
  if (!root && here !== (input.defaultPanel || 'lovelace')) return undefined;
  return `/${input.home}`;
}

export interface HomeStartOptions {
  readonly look: LookHandle | undefined;
  /** Home Assistant's app object (default: the page's `<home-assistant>`). */
  hass?(): HomeAssistant | undefined;
}

/** What the app carries of the default dashboard (Home Assistant 2025.12+: per user, then for everyone). */
type WithDefault = HomeAssistant & {
  readonly userData?: { readonly default_panel?: string };
  readonly systemData?: { readonly default_panel?: string };
};

/**
 * Home Assistant's default dashboard, resolved as its own frontend does: this user's, then everyone's, then the
 * browser's older memory, then `home`; `lovelace` without a configuration is `home` too. Undefined until the app
 * has its system data.
 */
export function defaultPanelOf(
  app: Pick<WithDefault, 'userData' | 'systemData' | 'panels'>,
  storage: Pick<Storage, 'getItem'> | undefined,
): string | undefined {
  if (app.systemData === undefined) return undefined;
  let stored: string | undefined;
  try {
    const raw = storage?.getItem('defaultPanel');
    stored = raw ? (JSON.parse(raw) as string) : undefined;
  } catch {
    stored = undefined;
  }
  const panel = app.userData?.default_panel || app.systemData.default_panel || stored || 'home';
  const overview = app.panels?.['lovelace'] as { readonly config?: unknown } | undefined;
  return panel === 'lovelace' && !overview?.config ? 'home' : panel;
}

/** Once per page load: sends the page to the device's dashboard when it opened at the root or on the default. */
export function startHome(options: HomeStartOptions): void {
  const hass = options.hass ?? appHass;
  let tries = 0;
  const attempt = (): void => {
    const app = hass() as WithDefault | undefined;
    const defaultPanel = app?.panels ? defaultPanelOf(app, safeLocalStorage()) : undefined;
    if (!app?.panels || defaultPanel === undefined) {
      if (tries++ < 100) setTimeout(attempt, 100); // the app fills its panels and its data as it connects
      return;
    }
    const settings = options.look?.settings() ?? cachedSettings();
    const wall = wallDevice(settings?.wall.devices);
    const home = deviceHome(readDevice(), wall, settings?.wall.dashboards ?? []);
    const to = homeRedirect({ pathname: location.pathname, defaultPanel, home });
    if (to && app.panels[home]) navigate(to, true);
  };
  attempt();
}

const safeLocalStorage = (): Storage | undefined => {
  try {
    return localStorage;
  } catch {
    return undefined;
  }
};
