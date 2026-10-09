import { describe, expect, it } from 'vitest';
import { homeRedirect } from '../settings/home.js';

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
