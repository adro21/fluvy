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
