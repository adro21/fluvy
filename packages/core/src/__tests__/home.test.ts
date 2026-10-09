import { describe, expect, it } from 'vitest';
import type { HomeAssistant } from '../ha/types.js';
import { defaultPanelOf, homeRedirect } from '../settings/home.js';

describe('Home Assistant’s default dashboard, as its frontend resolves it', () => {
  const panels = {
    lovelace: { component_name: 'lovelace' },
    'fluvy-auto': { component_name: 'lovelace' },
  } as unknown as HomeAssistant['panels'];
  const storage = (value: string | null) => ({ getItem: () => value });
  it('is this user’s, then everyone’s, then the browser’s memory, then home; and waits for the app’s data', () => {
    expect(defaultPanelOf({ panels, userData: {}, systemData: {} }, storage(null))).toBe('home');
    expect(
      defaultPanelOf(
        { panels, userData: {}, systemData: { default_panel: 'fluvy-auto' } },
        storage(null),
      ),
    ).toBe('fluvy-auto');
    expect(
      defaultPanelOf(
        {
          panels,
          userData: { default_panel: 'fluvy-mobile' },
          systemData: { default_panel: 'fluvy-auto' },
        },
        storage(null),
      ),
    ).toBe('fluvy-mobile');
    expect(defaultPanelOf({ panels, userData: {}, systemData: {} }, storage('"fluvy-wall"'))).toBe(
      'fluvy-wall',
    );
    expect(defaultPanelOf({ panels, userData: {}, systemData: {} }, storage('nonsense'))).toBe(
      'home',
    );
    // the Overview without a configuration is the new Home
    expect(
      defaultPanelOf(
        { panels, userData: {}, systemData: { default_panel: 'lovelace' } },
        storage(null),
      ),
    ).toBe('home');
    expect(defaultPanelOf({ panels, userData: {} }, storage(null))).toBeUndefined();
  });
});

describe('the dashboard a device opens on', () => {
  it('sends the root and the default dashboard to the device’s own, and nothing else', () => {
    const home = 'fluvy-mobile';
    expect(homeRedirect({ pathname: '/', defaultPanel: 'fluvy-auto', home })).toBe('/fluvy-mobile');
    expect(homeRedirect({ pathname: '/fluvy-auto/home', defaultPanel: 'fluvy-auto', home })).toBe(
      '/fluvy-mobile',
    );
    expect(homeRedirect({ pathname: '/fluvy-auto', defaultPanel: 'fluvy-auto', home })).toBe(
      '/fluvy-mobile',
    );
    // Home Assistant saying nothing means its Overview
    expect(homeRedirect({ pathname: '/lovelace/0', defaultPanel: undefined, home })).toBe(
      '/fluvy-mobile',
    );
    expect(homeRedirect({ pathname: '/lovelace/0', defaultPanel: '', home })).toBe('/fluvy-mobile');
    // already there, a link to another page, or no choice: left alone
    expect(
      homeRedirect({ pathname: '/fluvy-mobile/lights', defaultPanel: 'fluvy-auto', home }),
    ).toBe(undefined);
    expect(homeRedirect({ pathname: '/fluvy-wall/home', defaultPanel: 'fluvy-auto', home })).toBe(
      undefined,
    );
    expect(homeRedirect({ pathname: '/config/dashboard', defaultPanel: 'fluvy-auto', home })).toBe(
      undefined,
    );
    expect(homeRedirect({ pathname: '/', defaultPanel: 'fluvy-auto', home: '' })).toBe(undefined);
  });
});
