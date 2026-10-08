// @vitest-environment happy-dom
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import type { HomeAssistant } from '@fluvy/core';
import { familiesDefined } from '../index.js';
import { FluvyClockCard } from './clock-card.js';

// the index fetches the media and energy families: they land before this file's page goes
afterAll(() => familiesDefined);

type CardElement = HTMLElement & {
  setConfig(config: unknown): void;
  hass: HomeAssistant;
  updateComplete: Promise<boolean>;
};

const hass = {
  language: 'en',
  locale: { language: 'en', number_format: 'language', time_format: '12' },
  config: { unit_system: { temperature: '°C' }, time_zone: 'UTC' },
  states: {},
  entities: {},
  devices: {},
  areas: {},
  localize: (key: string) => key,
  formatEntityState: (s: { state: string }) => s.state,
} as unknown as HomeAssistant;

async function clock(config: Record<string, unknown>): Promise<CardElement> {
  const card = document.createElement('fluvy-clock-card') as CardElement;
  card.setConfig({ type: 'custom:fluvy-clock-card', _now: '2026-10-08T10:58:00Z', ...config });
  card.hass = hass;
  document.body.append(card);
  await card.updateComplete;
  return card;
}

const surface = (card: CardElement): Element => card.shadowRoot!.querySelector('[data-card]')!;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('the clock’s frame', () => {
  it('is the sheet’s card by default', async () => {
    const card = await clock({ face: 'digital' });
    expect(surface(card).classList.contains('fv-card')).toBe(true);
    expect(surface(card).classList.contains('ck-card--bare')).toBe(false);
  });

  it('is dropped by frame: false, and the digits keep their size', async () => {
    const card = await clock({ face: 'digital', frame: false });
    const article = surface(card);
    expect(article.classList.contains('fv-card')).toBe(false);
    expect(article.classList.contains('ck-card--bare')).toBe(true);
    expect(article.querySelector('.ck-big')).not.toBeNull();
  });

  it('is dropped from the side look too, never from a tile', async () => {
    const side = surface(await clock({ variant: 'side', frame: false }));
    expect(side.classList.contains('fv-card')).toBe(false);
    const tile = surface(await clock({ variant: 'tile', frame: false }));
    expect(tile.classList.contains('fv-tile')).toBe(true);
  });

  it('takes the card’s padding off the automatic dashboard’s height', () => {
    const framed = FluvyClockCard.layoutHeight({
      type: 'custom:fluvy-clock-card',
      face: 'digital',
    });
    const bare = FluvyClockCard.layoutHeight({
      type: 'custom:fluvy-clock-card',
      face: 'digital',
      frame: false,
    });
    expect(bare).toBe(framed - 40);
  });
});

describe('the clock’s size', () => {
  const big = (card: CardElement): HTMLElement => card.shadowRoot!.querySelector('.ck-big')!;

  it('is the sheet’s by default: the class’s sizes, no style of its own', async () => {
    const card = await clock({ face: 'digital' });
    expect(big(card).getAttribute('style')).toBeNull();
  });

  it('huge doubles the digits and their unit, large grows them by half', async () => {
    const huge = big(await clock({ face: 'digital', size: 'huge' }));
    expect(huge.style.fontSize).toBe('128px');
    expect(huge.style.lineHeight).toBe('144px');
    expect(huge.querySelector<HTMLElement>('.ck-big__unit')!.style.fontSize).toBe('48px');
    const large = big(await clock({ face: 'digital', size: 'large' }));
    expect(large.style.fontSize).toBe('96px');
  });

  it('is for the digital hero only: an analog face and a tile keep theirs', async () => {
    const analog = await clock({ size: 'huge' });
    expect(analog.shadowRoot!.querySelector('.ck-big')).toBeNull();
    const tile = await clock({ face: 'digital', variant: 'tile', size: 'huge' });
    expect(
      tile.shadowRoot!.querySelector<HTMLElement>('.ck-tile__time')!.getAttribute('style'),
    ).toBeNull();
  });

  it('adds the digits’ growth to the automatic dashboard’s height', () => {
    const normal = FluvyClockCard.layoutHeight({
      type: 'custom:fluvy-clock-card',
      face: 'digital',
    });
    expect(
      FluvyClockCard.layoutHeight({
        type: 'custom:fluvy-clock-card',
        face: 'digital',
        size: 'huge',
      }),
    ).toBe(normal + 72);
    expect(
      FluvyClockCard.layoutHeight({
        type: 'custom:fluvy-clock-card',
        face: 'digital',
        size: 'large',
      }),
    ).toBe(normal + 36);
  });
});
