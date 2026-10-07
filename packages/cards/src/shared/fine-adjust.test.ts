// @vitest-environment happy-dom
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import type { HomeAssistant } from '@fluvy/core';
import { familiesDefined } from '../index.js';

// the index fetches the media and energy families: they land before this file's page goes
afterAll(() => familiesDefined);

const state = (entity_id: string, state: string, attributes: Record<string, unknown>) => ({
  entity_id,
  state,
  attributes: { friendly_name: entity_id.split('.')[1], ...attributes },
  last_changed: '',
  last_updated: '',
});

const hass = {
  language: 'en',
  locale: { language: 'en', number_format: 'language', time_format: '24' },
  config: { unit_system: { temperature: '°C' } },
  states: {
    'light.desk': state('light.desk', 'on', {
      brightness: 128,
      supported_color_modes: ['brightness'],
      color_mode: 'brightness',
    }),
    'climate.hall': state('climate.hall', 'heat', {
      hvac_modes: ['off', 'heat'],
      temperature: 21,
      current_temperature: 20,
      min_temp: 7,
      max_temp: 35,
      target_temp_step: 0.5,
      supported_features: 1,
    }),
    'fan.attic': state('fan.attic', 'on', {
      percentage: 50,
      percentage_step: 25,
      supported_features: 1,
    }),
    'cover.blind': state('cover.blind', 'open', {
      current_position: 60,
      supported_features: 15,
    }),
    'media_player.den': state('media_player.den', 'playing', {
      volume_level: 0.4,
      supported_features: 4,
    }),
    'input_number.target': state('input_number.target', '12', {
      min: 0,
      max: 100,
      step: 1,
      mode: 'slider',
    }),
  },
  entities: {},
  devices: {},
  areas: {},
  localize: (key: string) => key,
  formatEntityState: (s: { state: string }) => s.state,
} as unknown as HomeAssistant;

type CardElement = HTMLElement & {
  setConfig(config: unknown): void;
  hass: HomeAssistant;
  updateComplete: Promise<boolean>;
};

/** Every card that draws a ruler a finger can move, with a config under which it draws one. */
const CARDS: ReadonlyArray<[tag: string, config: Record<string, unknown>]> = [
  ['fluvy-tile-card', { entity: 'light.desk' }],
  ['fluvy-tiles-card', { entities: ['light.desk'], size: 'large' }],
  ['fluvy-lights-card', { lights: ['light.desk'], variant: 'chips', show_brightness: true }],
  ['fluvy-light-card', { entity: 'light.desk' }],
  ['fluvy-thermostat-card', { entity: 'climate.hall', variant: 'ruler' }],
  ['fluvy-fan-card', { entity: 'fan.attic' }],
  ['fluvy-cover-card', { entity: 'cover.blind' }],
  ['fluvy-media-card', { entity: 'media_player.den' }],
  ['fluvy-helpers-card', { entities: ['input_number.target'] }],
];

async function mount(tag: string, config: Record<string, unknown>): Promise<CardElement> {
  const card = document.createElement(tag) as CardElement;
  card.setConfig({ type: `custom:${tag}`, ...config });
  card.hass = hass;
  document.body.append(card);
  await card.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await card.updateComplete;
  return card;
}

/** The rulers a card draws that answer the finger (its gauges are marked and never zoom). */
const liveRulers = (card: CardElement): Array<HTMLElement & { fineAdjust: boolean }> =>
  [
    ...card.shadowRoot!.querySelectorAll<HTMLElement & { fineAdjust: boolean; marker: boolean }>(
      'fluvy-ruler',
    ),
  ].filter((ruler) => !ruler.marker);

describe('fine_adjust', () => {
  afterEach(() => document.body.replaceChildren());

  it.each(CARDS)(
    '%s: the ruler keeps the full scale on a still press by default',
    async (tag, config) => {
      const card = await mount(tag, config);
      const rulers = liveRulers(card);
      expect(rulers.length, `${tag} draws a ruler`).toBeGreaterThan(0);
      for (const ruler of rulers) expect(ruler.fineAdjust, tag).toBe(false);
    },
  );

  it.each(CARDS)(
    '%s: `fine_adjust: true` lets a still press zoom the ruler',
    async (tag, config) => {
      const card = await mount(tag, { ...config, fine_adjust: true });
      const rulers = liveRulers(card);
      expect(rulers.length, `${tag} draws a ruler`).toBeGreaterThan(0);
      for (const ruler of rulers) expect(ruler.fineAdjust, tag).toBe(true);
    },
  );
});
