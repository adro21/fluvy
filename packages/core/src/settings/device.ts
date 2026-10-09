import { readStored, writeStored } from '../storage.js';
import type { DeviceHomes, DeviceKind } from './schema.js';

/*
 * What this browser is: a wall panel, or not, and the size it reads its dashboards at. The house says how its walls
 * behave (`HouseSettings.wall`); the device says it is one, in its own storage, so a person's phone never becomes
 * a wall because the house has some — and a tablet across the room reads larger without the phone following.
 */

export const DEVICE_KEY = 'fluvy:device';
export const DEVICE_VERSION = 1;

/** The sizes a device may read its dashboards at, in percent (the loader carries the same list). */
export const DEVICE_ZOOMS = [90, 100, 110, 125, 150] as const;
export type DeviceZoom = (typeof DEVICE_ZOOMS)[number];

export interface DeviceSettings {
  readonly version: typeof DEVICE_VERSION;
  /** This browser is a wall panel (`true`), is not (`false`), or lets the house decide (`null`: a tablet is one). */
  readonly wall: boolean | null;
  /** The size this browser reads its dashboards at (the view alone, never Home Assistant's chrome). */
  readonly zoom: DeviceZoom;
  /** The dashboard (url path) this browser opens Home Assistant on; '' leaves it to Home Assistant. */
  readonly home: string;
}

/** What a device may change about itself (the version is never written). */
export type DevicePatch = Partial<Omit<DeviceSettings, 'version'>>;

export const DEVICE_DEFAULTS: DeviceSettings = {
  version: DEVICE_VERSION,
  wall: null,
  zoom: 100,
  home: '',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isZoom = (value: unknown): value is DeviceZoom =>
  (DEVICE_ZOOMS as readonly unknown[]).includes(value);

/** What this browser remembers of itself; anything missing or broken is the default. */
export function parseDevice(raw: unknown): DeviceSettings {
  const value = isRecord(raw) ? raw : {};
  return {
    version: DEVICE_VERSION,
    wall: typeof value['wall'] === 'boolean' ? value['wall'] : DEVICE_DEFAULTS.wall,
    zoom: isZoom(value['zoom']) ? value['zoom'] : DEVICE_DEFAULTS.zoom,
    home: isUrlPath(value['home']) ? value['home'] : DEVICE_DEFAULTS.home,
  };
}

/** A dashboard's url path: one segment, no slash. */
const isUrlPath = (value: unknown): value is string =>
  typeof value === 'string' && value !== '' && !value.includes('/');

/** What kind of device this is: a tablet, a phone (touch and no mouse, but narrower), else a computer. */
export function deviceKind(win: ScreenLike | undefined = globalWindow()): DeviceKind {
  if (isTablet(win)) return 'tablet';
  if (
    win &&
    typeof win.matchMedia === 'function' &&
    win.matchMedia('(hover: none) and (pointer: coarse)').matches
  )
    return 'phone';
  return 'computer';
}

/**
 * The dashboard this device opens Home Assistant on: its own choice; else, as a wall, the house's first wall
 * dashboard; else what the house says for its kind of device; else '' — Home Assistant's own default. The house's
 * word travels with the house, so a phone opens the same way on every address it reaches the house by. The
 * loader carries the same rule, before the app routes.
 */
export function deviceHome(
  device: Pick<DeviceSettings, 'home'>,
  wall: boolean,
  wallDashboards: readonly string[],
  homes?: DeviceHomes,
  kind: DeviceKind = deviceKind(),
): string {
  if (device.home) return device.home;
  if (wall && wallDashboards[0]) return wallDashboards[0];
  return homes?.[kind] ?? '';
}

export const readDevice = (): DeviceSettings => parseDevice(readStored<unknown>(DEVICE_KEY));

/** The shortest side a tablet has, in CSS pixels: a phone is narrower, whichever way it is held. */
export const TABLET_MIN_SIDE = 600;

/** What the tablet rule asks of a window: a media query and the screen's size (a test hands its own). */
export interface ScreenLike {
  matchMedia(query: string): { readonly matches: boolean };
  readonly screen: { readonly width: number; readonly height: number };
}

/**
 * A tablet: a touch screen with no mouse (`hover: none`, `pointer: coarse`) at least `TABLET_MIN_SIDE` on its
 * shorter side. A phone fails the size, a computer the pointer. The loader carries the same rule.
 */
export function isTablet(win: ScreenLike | undefined = globalWindow()): boolean {
  if (!win || typeof win.matchMedia !== 'function') return false;
  if (!win.matchMedia('(hover: none) and (pointer: coarse)').matches) return false;
  const { width, height } = win.screen;
  return Math.min(width, height) >= TABLET_MIN_SIDE;
}

const globalWindow = (): Window | undefined => (typeof window === 'undefined' ? undefined : window);

/**
 * Whether this device is a wall: what it chose for itself, or, with no choice made, what the house says of
 * tablets — `devices: 'tablets'` makes every tablet a wall, `'chosen'` (the default) only a device switched on.
 */
export function wallDevice(
  devices: 'chosen' | 'tablets' | undefined,
  device: Pick<DeviceSettings, 'wall'> = readDevice(),
  win: ScreenLike | undefined = globalWindow(),
): boolean {
  if (device.wall !== null) return device.wall;
  return devices === 'tablets' && isTablet(win);
}

export function writeDevice(patch: DevicePatch): DeviceSettings {
  const next = parseDevice({ ...readDevice(), ...patch });
  writeStored(DEVICE_KEY, next);
  return next;
}

/**
 * `?kiosk` on a dashboard's address says what this device is: `?kiosk`, `?kiosk=1` and `?kiosk=on` make it a wall,
 * `?kiosk=0` and `?kiosk=off` a device again; anything else leaves it as it is (undefined). The answer is remembered.
 */
export function latchFromUrl(search: string): boolean | undefined {
  const params = new URLSearchParams(search);
  if (!params.has('kiosk')) return undefined;
  const value = params.get('kiosk')?.toLowerCase() ?? '';
  const wall =
    value === '' || value === '1' || value === 'on'
      ? true
      : value === '0' || value === 'off'
        ? false
        : undefined;
  if (wall !== undefined) writeDevice({ wall });
  return wall;
}

/**
 * `?zoom=125` on a dashboard's address sizes this device: one of the listed sizes is remembered, `?zoom=100` and
 * `?zoom=off` bring it back to 100; anything else leaves it as it is (undefined).
 */
export function latchZoomFromUrl(search: string): DeviceZoom | undefined {
  const params = new URLSearchParams(search);
  if (!params.has('zoom')) return undefined;
  const value = params.get('zoom')?.toLowerCase() ?? '';
  const zoom = value === 'off' ? 100 : Number(value);
  if (!isZoom(zoom)) return undefined;
  writeDevice({ zoom });
  return zoom;
}
