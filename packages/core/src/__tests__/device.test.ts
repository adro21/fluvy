// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEVICE_KEY,
  DEVICE_ZOOMS,
  deviceHome,
  latchFromUrl,
  isTablet,
  latchZoomFromUrl,
  parseDevice,
  readDevice,
  wallDevice,
  writeDevice,
} from '../settings/device.js';

/** A window of the given kind: a tablet (touch, no mouse, wide), a phone (touch, narrow) or a computer. */
const windowOf = (kind: 'tablet' | 'phone' | 'computer') => ({
  matchMedia: (query: string) => ({ matches: kind !== 'computer' && /hover: none/.test(query) }),
  screen: { width: kind === 'phone' ? 390 : 1280, height: kind === 'phone' ? 844 : 800 },
});

describe('what this device is', () => {
  beforeEach(() => localStorage.clear());

  it('lets the house decide until it says so, and remembers what it says', () => {
    expect(readDevice()).toEqual({ version: 1, wall: null, zoom: 100, home: '' });
    expect(writeDevice({ wall: true })).toEqual({ version: 1, wall: true, zoom: 100, home: '' });
    expect(JSON.parse(localStorage.getItem(DEVICE_KEY) ?? '{}')).toEqual({
      version: 1,
      wall: true,
      zoom: 100,
      home: '',
    });
    expect(readDevice().wall).toBe(true);
  });

  it('reads a broken value as the default', () => {
    localStorage.setItem(DEVICE_KEY, '{"wall":"yes"}');
    expect(readDevice()).toEqual({ version: 1, wall: null, zoom: 100, home: '' });
    localStorage.setItem(DEVICE_KEY, 'nonsense');
    expect(readDevice()).toEqual({ version: 1, wall: null, zoom: 100, home: '' });
  });

  it('opens on the dashboard it chose, else as a wall on the first wall dashboard, else as Home Assistant says', () => {
    expect(parseDevice({ home: 'fluvy-mobile' }).home).toBe('fluvy-mobile');
    expect(parseDevice({ home: '/fluvy-mobile/home' }).home).toBe(''); // a path, not a dashboard
    expect(parseDevice({ home: 7 }).home).toBe('');
    expect(deviceHome({ home: 'fluvy-mobile' }, true, ['fluvy-wall'])).toBe('fluvy-mobile');
    expect(deviceHome({ home: '' }, true, ['fluvy-wall', 'fluvy-auto'])).toBe('fluvy-wall');
    expect(deviceHome({ home: '' }, true, [])).toBe('');
    expect(deviceHome({ home: '' }, false, ['fluvy-wall'])).toBe('');
  });

  it('knows a tablet: a touch screen with no mouse, 600 or more on its shorter side', () => {
    expect(isTablet(windowOf('tablet'))).toBe(true);
    expect(isTablet(windowOf('phone'))).toBe(false);
    expect(isTablet(windowOf('computer'))).toBe(false);
    expect(isTablet(undefined)).toBe(false);
  });

  it('is a wall by its own word first, and by the house’s rule for tablets otherwise', () => {
    // the house makes tablets walls: a tablet that said nothing is one, a phone or a computer is not
    expect(wallDevice('tablets', { wall: null }, windowOf('tablet'))).toBe(true);
    expect(wallDevice('tablets', { wall: null }, windowOf('phone'))).toBe(false);
    expect(wallDevice('tablets', { wall: null }, windowOf('computer'))).toBe(false);
    // the device's own word wins either way
    expect(wallDevice('tablets', { wall: false }, windowOf('tablet'))).toBe(false);
    expect(wallDevice('chosen', { wall: true }, windowOf('computer'))).toBe(true);
    // chosen by hand (the default, and a house saved before the rule existed): a tablet that said nothing is not one
    expect(wallDevice('chosen', { wall: null }, windowOf('tablet'))).toBe(false);
    expect(wallDevice(undefined, { wall: null }, windowOf('tablet'))).toBe(false);
  });

  it.each([
    ['?kiosk', true],
    ['?kiosk=1', true],
    ['?kiosk=on', true],
    ['?kiosk=ON', true],
    ['?kiosk=0', false],
    ['?kiosk=off', false],
    ['?kiosk=maybe', undefined],
    ['?edit=1', undefined],
    ['', undefined],
  ])('latches %s as %s', (search, wall) => {
    writeDevice({ wall: false });
    expect(latchFromUrl(search)).toBe(wall);
    expect(readDevice().wall).toBe(wall ?? false);
  });

  it('reads its size only from the listed ones, and keeps it beside the wall', () => {
    expect(DEVICE_ZOOMS).toEqual([90, 100, 110, 125, 150]);
    for (const zoom of DEVICE_ZOOMS) expect(parseDevice({ zoom }).zoom).toBe(zoom);
    expect(parseDevice({ zoom: 120 }).zoom).toBe(100);
    expect(parseDevice({ zoom: '125' }).zoom).toBe(100);
    expect(parseDevice({ zoom: 1.25 }).zoom).toBe(100);
    expect(writeDevice({ zoom: 125 })).toEqual({ version: 1, wall: null, zoom: 125, home: '' });
    expect(writeDevice({ wall: true })).toEqual({ version: 1, wall: true, zoom: 125, home: '' });
  });

  it.each([
    ['?zoom=125', 125, 125],
    ['?zoom=90', 90, 90],
    ['?zoom=100', 100, 100],
    ['?zoom=off', 100, 100],
    ['?zoom=OFF', 100, 100],
    ['?kiosk&zoom=150', 150, 150],
    ['?zoom=120', undefined, 110],
    ['?zoom=1.25', undefined, 110],
    ['?zoom', undefined, 110],
    ['?zoom=', undefined, 110],
    ['?edit=1', undefined, 110],
    ['', undefined, 110],
  ])('latches the size of %s as %s', (search, latched, remembered) => {
    writeDevice({ zoom: 110 });
    expect(latchZoomFromUrl(search)).toBe(latched);
    expect(readDevice().zoom).toBe(remembered);
  });
});
