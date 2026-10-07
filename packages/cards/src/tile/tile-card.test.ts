// @vitest-environment happy-dom
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HomeAssistant } from '@fluvy/core';
import { familiesDefined } from '../index.js';

// the index fetches the media and energy families: they land before this file's page goes
afterAll(() => familiesDefined);

type CardElement = HTMLElement & {
  setConfig(config: unknown): void;
  hass: HomeAssistant;
  updateComplete: Promise<boolean>;
};
type Ruler = HTMLElement & { value: number; inactive: boolean };

const calls: Array<[string, string, Record<string, unknown>]> = [];

/** A shade as a Matter one reports it: a state, and a position that only moves once the motor stops. */
function shade(state: string, position: number): HomeAssistant {
  return {
    language: 'en',
    locale: { language: 'en', number_format: 'language', time_format: '24' },
    config: { unit_system: { temperature: '°C' } },
    states: {
      'cover.blind': {
        entity_id: 'cover.blind',
        state,
        attributes: { friendly_name: 'Blind', current_position: position, supported_features: 15 },
        last_changed: '',
        last_updated: '',
      },
    },
    entities: {},
    devices: {},
    areas: {},
    localize: (key: string) => key,
    formatEntityState: (s: { state: string }) => s.state,
    callService: (domain: string, service: string, data: Record<string, unknown>) => {
      calls.push([domain, service, data]);
      return Promise.resolve();
    },
  } as unknown as HomeAssistant;
}

async function tile(hass: HomeAssistant): Promise<{ card: CardElement; ruler: () => Ruler }> {
  const card = document.createElement('fluvy-tile-card') as CardElement;
  card.setConfig({ type: 'custom:fluvy-tile-card', entity: 'cover.blind' });
  card.hass = hass;
  document.body.append(card);
  await card.updateComplete;
  return { card, ruler: () => card.shadowRoot!.querySelector<Ruler>('fluvy-ruler')! };
}

async function report(card: CardElement, hass: HomeAssistant): Promise<void> {
  card.hass = hass;
  await card.updateComplete;
  await card.updateComplete;
}

describe('a tile’s shade ruler', () => {
  beforeEach(() => {
    calls.length = 0;
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it('keeps the position asked for while the shade travels, however long, then takes the one reported', async () => {
    const { card, ruler } = await tile(shade('closed', 0));
    expect(ruler().value).toBe(0);
    expect(ruler().inactive).toBe(true);

    // the finger sets 25: the shade is told, and starts to open
    ruler().dispatchEvent(
      new CustomEvent('fluvy-change', { detail: { value: 25 }, bubbles: true, composed: true }),
    );
    expect(calls).toEqual([['cover', 'set_cover_position', { position: 25 }]]);
    await report(card, shade('opening', 0));
    expect(ruler().inactive).toBe(false);
    expect(ruler().value).toBe(25);

    // fifteen seconds of travel, the motor still reporting where it started
    vi.advanceTimersByTime(15_000);
    await report(card, shade('opening', 0));
    expect(ruler().value).toBe(25);

    // the motor stops and reports: the ruler takes what the shade says
    await report(card, shade('open', 24));
    expect(ruler().value).toBe(24);
  });

  it('lets a position go once the shade has stopped somewhere else', async () => {
    const { card, ruler } = await tile(shade('open', 60));
    ruler().dispatchEvent(
      new CustomEvent('fluvy-change', { detail: { value: 20 }, bubbles: true, composed: true }),
    );
    await report(card, shade('closing', 60));
    expect(ruler().value).toBe(20);
    // stopped by hand at 45: not travelling any more, so the chosen value lets go after a few seconds
    await report(card, shade('open', 45));
    vi.advanceTimersByTime(5000);
    await report(card, shade('open', 45));
    expect(ruler().value).toBe(45);
  });
});
