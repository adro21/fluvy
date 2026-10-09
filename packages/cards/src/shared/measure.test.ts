// @vitest-environment happy-dom
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { HomeAssistant } from '@fluvy/core';
import { familiesDefined } from '../index.js';

// the index fetches the media and energy families: they land before this file's page goes
afterAll(() => familiesDefined);

type CardElement = HTMLElement & {
  setConfig(config: unknown): void;
  hass: HomeAssistant;
  width: number;
  updateComplete: Promise<boolean>;
};
type Callback = (entries: Array<{ contentRect: { width: number } }>) => void;

const hass = {
  language: 'en',
  locale: { language: 'en', number_format: 'language', time_format: '24' },
  config: { unit_system: { temperature: '°C' } },
  states: {
    'light.lamp': {
      entity_id: 'light.lamp',
      state: 'on',
      attributes: { friendly_name: 'Lamp', brightness: 128, supported_color_modes: ['brightness'] },
      last_changed: '',
      last_updated: '',
    },
  },
  entities: {},
  devices: {},
  areas: {},
  localize: (key: string) => key,
  formatEntityState: (s: { state: string }) => s.state,
} as unknown as HomeAssistant;

/** The page's observer, held so a test can report a width when it chooses. */
const observers: Callback[] = [];
const Original = globalThis.ResizeObserver;

beforeEach(() => {
  observers.length = 0;
  globalThis.ResizeObserver = class {
    constructor(callback: Callback) {
      observers.push(callback);
    }
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  globalThis.ResizeObserver = Original;
  document.body.innerHTML = '';
});

async function tile(): Promise<CardElement> {
  const card = document.createElement('fluvy-tile-card') as CardElement;
  card.setConfig({ type: 'custom:fluvy-tile-card', entity: 'light.lamp', size: 'large' });
  card.hass = hass;
  document.body.append(card);
  await card.updateComplete;
  return card;
}

describe('a card before and after its first measurement', () => {
  it('is clipped at its box until the observer reports, then drawn to the width and unclipped', async () => {
    const card = await tile();
    expect(card.width).toBe(360);
    expect(card.style.overflow).toBe('clip');
    observers.at(-1)!([{ contentRect: { width: 189 } }]);
    await card.updateComplete;
    expect(card.width).toBe(189);
    expect(card.style.overflow).toBe('');
  });

  it('unclips even when the measured width is the one it assumed', async () => {
    const card = await tile();
    observers.at(-1)!([{ contentRect: { width: 360 } }]);
    await card.updateComplete;
    expect(card.width).toBe(360);
    expect(card.style.overflow).toBe('');
  });

  it('stays clipped while the box has no width yet (a hidden page)', async () => {
    const card = await tile();
    observers.at(-1)!([{ contentRect: { width: 0 } }]);
    await card.updateComplete;
    expect(card.style.overflow).toBe('clip');
  });

  it('is not clipped again once measured and moved', async () => {
    const card = await tile();
    observers.at(-1)!([{ contentRect: { width: 189 } }]);
    await card.updateComplete;
    card.remove();
    document.body.append(card);
    await card.updateComplete;
    expect(card.style.overflow).toBe('');
  });
});
