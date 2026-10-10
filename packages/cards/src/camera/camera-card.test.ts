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
      attributes: {
        friendly_name: 'Driveway',
        entity_picture: '/api/camera_proxy/camera.driveway?token=t',
      },
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
    expect(root(card).querySelector('[data-card]')!.classList.contains('dv-card--compact')).toBe(
      false,
    );
  });

  it('is the picture alone with the name in a pill, no head, no rows', async () => {
    const card = await camera({ variant: 'compact', rows: ['binary_sensor.person'] });
    expect(root(card).querySelector('.fv-card__head')).toBeNull();
    expect(root(card).querySelector('.dv-rows')).toBeNull();
    expect(root(card).querySelector('[data-card]')!.classList.contains('dv-card--compact')).toBe(
      true,
    );
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
    const full = FluvyCameraCard.layoutHeight({
      type: 'custom:fluvy-camera-card',
      entity: 'camera.driveway',
    });
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

describe('live video', () => {
  // Home Assistant's player is not here: a bare element stands in for it
  if (!customElements.get('ha-camera-stream'))
    customElements.define('ha-camera-stream', class extends HTMLElement {});

  type Player = HTMLElement & { stateObj?: { entity_id: string }; hass?: unknown };

  it('puts Home Assistant’s player in the picture, muted, and keeps the live pill without the time', async () => {
    const card = await camera({ live: true });
    const player = root(card).querySelector('ha-camera-stream') as Player | null;
    expect(player).not.toBeNull();
    expect(player!.hasAttribute('muted')).toBe(true);
    expect(player!.stateObj?.entity_id).toBe('camera.driveway');
    expect(root(card).querySelector('.dv-cam__live')).not.toBeNull();
    expect(root(card).querySelector('.dv-cam__time')).toBeNull();
    expect(root(card).querySelector('.fv-plate__img')).toBeNull();
  });

  it('is the name on the video in the compact style', async () => {
    const card = await camera({ live: true, variant: 'compact' });
    expect(root(card).querySelector('ha-camera-stream')).not.toBeNull();
    const pill = root(card).querySelector('.dv-cam__name');
    expect(pill?.textContent).toContain('Driveway');
    expect(pill?.classList.contains('is-stale')).toBe(false);
  });

  it('fills the screen on a tap and leaves on the × or Escape', async () => {
    const card = await camera({ live: true });
    (root(card).querySelector('.dv-cam__tap') as HTMLElement).click();
    const viewer = document.querySelector('fluvy-camera-view') as
      (HTMLElement & { updateComplete: Promise<boolean> }) | null;
    expect(viewer).not.toBeNull();
    await viewer!.updateComplete;
    const inside = viewer!.shadowRoot!;
    expect((inside.querySelector('ha-camera-stream') as Player).stateObj?.entity_id).toBe(
      'camera.driveway',
    );
    (inside.querySelector('.leave') as HTMLElement).click();
    expect(document.querySelector('fluvy-camera-view')).toBeNull();

    (root(card).querySelector('.dv-cam__tap') as HTMLElement).click();
    expect(document.querySelector('fluvy-camera-view')).not.toBeNull();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.querySelector('fluvy-camera-view')).toBeNull();
  });

  it('shows live in the editor', () => {
    const names = JSON.stringify(FluvyCameraCard.getConfigForm().schema);
    expect(names).toContain('"name":"live"');
    expect(FluvyCameraCard.keys).toContain('live');
  });
});
