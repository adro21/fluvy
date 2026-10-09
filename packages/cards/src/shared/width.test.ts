// @vitest-environment happy-dom
import { afterAll, afterEach, describe, expect, it } from 'vitest';
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

const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

/** A tile laid out `width` wide by the page, as happy-dom (which lays nothing out) cannot say by itself. */
async function tile(width: number): Promise<CardElement> {
  const card = document.createElement('fluvy-tile-card') as CardElement;
  Object.defineProperty(card, 'offsetWidth', { get: () => width, configurable: true });
  card.setConfig({ type: 'custom:fluvy-tile-card', entity: 'light.lamp', size: 'large' });
  card.hass = hass;
  document.body.append(card);
  await card.updateComplete;
  return card;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('a card’s width when the observer stays silent', () => {
  it('starts at the 360 it assumes, then reads the layout at the next frame', async () => {
    const card = await tile(189);
    expect(card.width).toBe(360);
    await frame();
    await card.updateComplete;
    expect(card.width).toBe(189);
  });

  it('lets a rounding difference be, so two readings never fight', async () => {
    const card = await tile(361);
    await frame();
    await card.updateComplete;
    expect(card.width).toBe(360);
  });

  it('reads again after a render: a card moved to a wider column follows', async () => {
    const card = await tile(189);
    await frame();
    await card.updateComplete;
    expect(card.width).toBe(189);
    Object.defineProperty(card, 'offsetWidth', { get: () => 386, configurable: true });
    card.hass = { ...hass }; // a render
    await card.updateComplete;
    await frame();
    await card.updateComplete;
    expect(card.width).toBe(386);
  });

  it('reads nothing once detached', async () => {
    const card = await tile(189);
    card.remove();
    await frame();
    expect(card.width).toBe(360);
  });
});
