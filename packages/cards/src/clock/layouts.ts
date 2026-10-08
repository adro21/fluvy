import { formatNumber, localize, strings, type HomeAssistant } from '@fluvy/core';
import { clockFace, ico, readout, type Tone } from '@fluvy/ui';
import { html, nothing, type TemplateResult } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import { firstFit, fitLine, type Segment, type TextRuler } from '../shared/fit.js';
import type { Forecast, Sky } from './sky.js';
import type { ClockParts } from './time.js';

const s = strings('clock', 'weather');

/** Everything a layout draws, resolved by the card: a layout only decides where it goes and what fits. */
export interface ClockModel {
  readonly hass: HomeAssistant | undefined;
  readonly analog: boolean;
  readonly numerals: 'none' | 'quarters' | 'all';
  /** The second hand of the analog face. Digital seconds arrive in `clock.seconds`. */
  readonly seconds: boolean;
  /** Hands placed instead of swept: reduced motion, or a frozen test instant. */
  readonly still: boolean;
  readonly tone: Tone;
  /** The wall clock as a local Date, for `clockFace`. */
  readonly face: Date;
  readonly clock: ClockParts;
  readonly title: string;
  readonly date: { readonly full: string; readonly short: string } | null;
  readonly week: number | null;
  /** Null without a `weather` entity. */
  readonly sky: Sky | null;
  /** The Outside · Tonight · Tomorrow row: `none` when it was not asked for or cannot be had. */
  readonly forecast: Forecast;
  /** The next sun event (the side card's line, a weather tile's spare slot) and both events (a plain tile's foot). */
  readonly sun: {
    readonly next: { readonly kind: 'sunrise' | 'sunset'; readonly at: ClockParts } | null;
    readonly rising: ClockParts | null;
    readonly setting: ClockParts | null;
  };
  /** Content width of the surface: the card's or the tile's. */
  readonly width: number;
  /** The hero digits' scale: 1 on the sheet, 1.5 or 2 for a wall read from across the room. */
  readonly scale: number;
  readonly ruler: TextRuler;
}

/** The sheet's big digits: 64 on a 72 line, the unit 24 with 8 before it. A scale multiplies all four. */
const BIG = { font: 64, line: 72, unit: 24, gap: 8 } as const;
/** The scales a clock may ask for, largest first: an asked scale steps down to the first whose digits fit. */
const SCALES = [2, 1.5, 1] as const;

type Part = TemplateResult | typeof nothing;

const floor4 = (value: number): number => Math.floor(value / 4) * 4;
const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const degrees = (m: ClockModel, value: number | null): string =>
  value === null ? '—' : formatNumber(m.hass, value, { digits: 0 });

/** Tabular figures: every "00:00" is as wide as any other time, so the layout never moves with the hour. */
const widest = (time: string): string => time.replace(/\d/g, '0').padStart(5, '0');

/* ---------- shared pieces ---------- */

/** A fresh element for every instant it is drawn at: the CSS sweep starts from the angle in the markup. */
function face(m: ClockModel, R: number): unknown {
  return keyed(
    `${R}|${m.face.getTime()}`,
    clockFace({
      R,
      tone: m.tone,
      numerals: m.numerals,
      seconds: m.seconds,
      time: m.face,
      still: m.still,
    }),
  );
}

/** The units a time can carry, longest first: ":12 PM", then "PM" — the day period outlives the seconds. */
function units(m: ClockModel): string[] {
  const { seconds, period } = m.clock;
  return seconds ? [[seconds, period].filter(Boolean).join(' '), period] : [period];
}

function big(time: string, unit: string, scale = 1): TemplateResult {
  // the sheet's sizes are the class's; a larger clock writes its own, in the same proportions
  const style =
    scale === 1
      ? nothing
      : `font-size:${BIG.font * scale}px;line-height:${BIG.line * scale}px;height:${BIG.line * scale}px`;
  const unitStyle =
    scale === 1 ? nothing : `font-size:${BIG.unit * scale}px;margin-left:${BIG.gap * scale}px`;
  return html`<p class="ck-big" data-align="optical" style=${style}>
    <span data-baseline="d">${time}</span
    >${unit ? html`<span class="ck-big__unit" data-baseline="d" style=${unitStyle}>${unit}</span>` : nothing}
  </p>`;
}

function forecastRow(m: ClockModel): Part {
  const { sky, forecast } = m;
  if (!sky?.ok || forecast.status === 'none') return nothing;
  const ready = forecast.status === 'ready';
  return html`<div class="ck-cols fv-cols">
    ${readout({ label: s(m.hass, 'outside'), value: degrees(m, sky.temperature), unit: sky.temperature === null ? '' : sky.unit, size: 's' })}
    ${readout({ label: s(m.hass, 'tonight'), value: degrees(m, ready ? forecast.tonight : null), unit: ready ? sky.unit : '', size: 's' })}
    ${readout({ label: localize(m.hass, 'common.tomorrow'), value: degrees(m, ready ? forecast.tomorrow : null), unit: ready ? sky.unit : '', size: 's' })}
  </div>`;
}

/** The weather as caption segments. `lead`: it opens the line. `detail`: nothing else tells the air (A5's line). */
function skySegments(m: ClockModel, lead: boolean, detail: boolean): Segment[] {
  const { sky } = m;
  if (!sky) return [];
  // "Entity not found" is the longest thing a weather can say: a narrow column says "Unavailable" rather than clip it
  if (!sky.ok)
    return [
      {
        text: lead ? sky.text : sky.inline,
        short: lead ? s(m.hass, 'unavailable') : s(m.hass, 'unavailable').toLowerCase(),
      },
    ];
  const segments: Segment[] = [{ text: lead ? sky.text : sky.inline }];
  if (m.forecast.status === 'none' && sky.temperature !== null)
    segments.push({ text: `${degrees(m, sky.temperature)}°`, optional: true });
  if (detail && sky.feels !== null)
    segments.push({
      text: s(m.hass, 'feels', { value: `${degrees(m, sky.feels)}°` }),
      optional: true,
    });
  if (detail && sky.wind)
    segments.push({ text: s(m.hass, 'wind', { value: sky.wind }), optional: true });
  return segments;
}

/** Title · date · week · weather, as far as the column goes. */
function caption(m: ClockModel, available: number, withSky: boolean): string {
  const segments: Segment[] = [];
  if (m.title) segments.push({ text: m.title });
  if (m.date) segments.push({ text: m.date.full, short: m.date.short });
  if (m.week !== null)
    segments.push({
      text: localize(m.hass, segments.length ? 'calendar.week' : 'clock.week', { week: m.week }),
      optional: true,
    });
  if (withSky) segments.push(...skySegments(m, segments.length === 0, !m.date));
  return fitLine(segments, available, (text) => m.ruler.width('ck-caption', text));
}

/* ---------- hero: the big face, or the big digits ---------- */

export function heroAnalog(m: ClockModel): TemplateResult {
  const R = clamp(floor4((m.width - 24) / 2), 56, m.sky ? 96 : 120); // the sheet: 120 alone, 96 over its weather
  const line = caption(m, m.width, true);
  return html`
    <div class="ck-center">${face(m, R)}</div>
    ${line ? html`<p class="ck-caption">${line}</p>` : nothing} ${forecastRow(m)}
  `;
}

export function heroDigital(m: ClockModel): TemplateResult {
  const { time } = m.clock;
  // measured once at the sheet's size: text scales with its font, so a scale multiplies the width
  const fits =
    (available: number, scale = 1) =>
    (unit: string): boolean =>
      m.ruler.width('ck-big', widest(time), 'ck-big__unit', unit) * scale <= available;
  const row = forecastRow(m);
  const all = units(m);
  /** The asked scale with the first unit that fits, else the next scale down; the sheet's size at the last. */
  const sized = (available: number): { scale: number; unit: string } => {
    for (const scale of SCALES.filter((candidate) => candidate <= m.scale)) {
      const unit = all.find(fits(available, scale));
      if (unit !== undefined) return { scale, unit };
    }
    return { scale: 1, unit: firstFit(all, fits(available)) ?? '' };
  };

  // No row to carry the weather: the condition and the temperature stand beside the time — when the
  // time, with everything it was asked to show, leaves them room. Otherwise they join the caption.
  const beside = m.width - 64 - 8;
  if (m.sky && row === nothing && fits(beside)(all[0] ?? '')) {
    const { sky } = m;
    const line = caption(m, beside, false);
    const { scale } = sized(beside);
    return html`<div class="ck-split">
      <div>
        ${big(time, all[0] ?? '', fits(beside, scale)(all[0] ?? '') ? scale : 1)}${line ? html`<p class="ck-caption ck-caption--left" data-baseline="dt">${line}</p>` : nothing}
      </div>
      <div class="ck-split__side">
        ${ico(sky.glyph, sky.ok ? m.tone : 'off', { hero: true })}
        <p class="ck-temp">
          <span data-baseline="dt">${degrees(m, sky.temperature)}</span
          >${sky.temperature === null ? nothing : html`<span class="fv-unit" data-baseline="dt">${sky.unit}</span>`}
        </p>
      </div>
    </div>`;
  }

  const line = caption(m, m.width, true);
  const { scale, unit } = sized(m.width);
  return html`
    ${big(time, unit, scale)}
    ${line ? html`<p class="ck-caption ck-caption--left">${line}</p>` : nothing} ${row}
  `;
}

/* ---------- side: the compact face with the time beside it ---------- */

/** "Sunrise 07:31": what a clock without weather says on its last line. */
function sunLine(m: ClockModel): string {
  const next = m.sun.next;
  return next ? [s(m.hass, next.kind), next.at.time, next.at.period].filter(Boolean).join(' ') : '';
}

export function side(m: ClockModel): TemplateResult {
  const { time } = m.clock;
  const all = units(m);
  const timeWidth = (unit: string, cls = 'ck-time'): number =>
    m.ruler.width(cls, widest(time), 'fv-unit', unit);
  // The face yields to the time, never the reverse: 72 on the sheet, down to 48 in a 300 px column on a 12 h clock.
  const R = clamp(floor4((m.width - 20 - timeWidth(all[0] ?? '')) / 2), 48, 72);
  const available = m.analog ? m.width - (2 * R + 20) : m.width; // the face box is 2R + 24, pulled 12 out, 8 from the text
  // a column where not even "10:08 PM" fits beside the smallest face steps the time down to 32 (the tile's small time)
  const fits = all.find((candidate) => timeWidth(candidate) <= available);
  const small = fits === undefined;
  const unit = small
    ? (firstFit(all, (candidate) => timeWidth(candidate, 'ck-time ck-time--s') <= available) ?? '')
    : fits;
  const sub = (segments: Segment[]): string =>
    fitLine(segments, available, (text) => m.ruler.width('fv-card__sub', text));

  const lines = [
    m.title,
    m.date
      ? sub([
          { text: m.date.short },
          ...(m.week === null
            ? []
            : [{ text: localize(m.hass, 'calendar.week', { week: m.week }), optional: true }]),
        ])
      : '',
    m.sky ? sub(skySegments(m, true, false)) : sunLine(m),
  ];
  const text = html`<div class="ck-side__text">
    <p class="ck-time ${small ? 'ck-time--s' : ''}" data-align="optical">
      ${time}${unit ? html`<span class="fv-unit">${unit}</span>` : nothing}
    </p>
    ${lines.filter(Boolean).map((line) => html`<p class="fv-card__sub">${line}</p>`)}
  </div>`;
  if (!m.analog) return html`${text}${forecastRow(m)}`;
  // the ring's outer edge sits on the column: the face's 12 px of air is pulled out of the padding box, on purpose
  return html`<div class="ck-side">
      <div class="ck-side__face" data-measure="value">${face(m, R)}</div>
      ${text}
    </div>
    ${forecastRow(m)}`;
}

/* ---------- tile: 172 × 168 ---------- */

interface FootItem {
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
}

/** Two xs readouts — the second one only while the tile is wide enough for both (a 140 px tile is not, in English). */
function tileFoot(m: ClockModel): Part {
  const { sky, forecast, sun } = m;
  // the label already says which half of the day: "SUNRISE 7:31" needs no AM, and the 64 px column has no room for one
  const sunItem = (kind: 'sunrise' | 'sunset', at: ClockParts): FootItem => ({
    label: s(m.hass, `${kind}_label`),
    value: at.time,
  });
  const items: FootItem[] = [];
  if (!sky) {
    if (sun.rising && sun.setting)
      items.push(sunItem('sunrise', sun.rising), sunItem('sunset', sun.setting));
  } else {
    const ready = forecast.status === 'ready';
    items.push({
      label: s(m.hass, 'outside'),
      value: degrees(m, sky.temperature),
      unit: sky.temperature === null ? '' : sky.unit,
    });
    // without a daily forecast the second slot tells the next sun event instead of a permanent dash
    if (sky.ok && forecast.status === 'none' && sun.next)
      items.push(sunItem(sun.next.kind, sun.next.at));
    else
      items.push({
        label: s(m.hass, 'tonight'),
        value: degrees(m, ready ? forecast.tonight : null),
        unit: ready ? sky.unit : '',
      });
  }
  if (!items.length) return nothing;
  const widthOf = (item: FootItem): number =>
    Math.max(
      m.ruler.width('fv-readout__label', item.label),
      m.ruler.width('fv-readout--xs > fv-readout__value', item.value, 'fv-unit', item.unit ?? ''),
    );
  const shown =
    items.length > 1 && items.reduce((sum, item) => sum + widthOf(item), 4) > m.width
      ? items.slice(0, 1)
      : items;
  return html`<div class="fv-tile__foot">
    ${shown.map((item) => readout({ ...item, size: 'xs' }))}
  </div>`;
}

export function tile(m: ClockModel): TemplateResult {
  // the face box is 2R + 24: R from the tile's own width, 56 at most (a 172 tile), never wider than the tile
  if (m.analog) return html`${face(m, clamp(floor4((m.width - 24) / 2), 24, 56))}`;
  const { time } = m.clock;
  const unit =
    firstFit(
      [m.clock.period, ''],
      (candidate) => m.ruler.width('ck-tile__time', widest(time), 'fv-unit', candidate) <= m.width,
    ) ?? '';
  const state = fitLine(
    [
      ...(m.title ? [{ text: m.title }] : []),
      { text: m.sky ? m.sky.text : (m.date?.short ?? ''), optional: Boolean(m.title) },
    ],
    m.width,
    (text) => m.ruler.width('fv-tile__state', text),
  );
  return html`
    <p class="ck-tile__time" data-baseline="tt" data-align="optical">
      ${time}${unit ? html`<span class="fv-unit">${unit}</span>` : nothing}
    </p>
    ${state ? html`<p class="fv-tile__state">${state}</p>` : nothing} ${tileFoot(m)}
  `;
}
