import {
  formatTime,
  haptic,
  isUsable,
  stateText,
  strings,
  type LovelaceConfigForm,
  type LovelaceGridOptions,
} from '@fluvy/core';

import { glyph, head, round, sheetStyles } from '@fluvy/ui';

import {
  css,
  html,
  nothing,
  type CSSResultGroup,
  type PropertyValues,
  type TemplateResult,
} from 'lit';

import { ROW_KEYS, RowsCard, rowSchema, type RowsCardConfig } from '../lock/rows.js';

import { Card } from '../shared/base.js';

import { glyphFor } from '../shared/domain.js';

import {
  actionFields,
  boolField,
  colourFields,
  editorLabels,
  entitiesField,
  entityField,
  fieldRow,
  nameIconFields,
  numberField,
  selectField,
  textField,
} from '../shared/form.js';
import type { EditorDefaults, RowsListSpec } from '../shared/rows-editor.js';
import { configKeys, ITEM_ALIASES, type AliasSpec } from '../shared/config.js';
import { toneOf } from '../shared/colour.js';
import { Crossfade } from '../shared/crossfade.js';
import { listLength, ROW } from '../shared/heights.js';

const s = strings('camera');

export type CameraVariant = 'full' | 'compact';
const VARIANTS: readonly CameraVariant[] = ['full', 'compact'];

export interface CameraCardConfig extends RowsCardConfig {
  /**
   * `full` (default): the head, the 16:9 picture with its pills and overlay buttons, the rows. `compact`: the
   * picture alone, edge to edge, the name and the live dot in one pill; no head, no buttons, no rows — a
   * thumbnail that may sit a third of a section wide.
   */
  variant?: CameraVariant;
  /** Seconds between two stills (1–300, default 10). */
  refresh?: number;
  /** Second line of the head ("Front of house · 1080p"). Default: area and state. */
  subtitle?: string;
}

/** A request that has not answered after this long no longer holds the next one back. */
const STALL_MS = 30_000;
/** This many failures in a row and the last good frame stops standing in for the camera. */
const GIVE_UP = 3;

/**
 * The camera: a 16:9 still that refreshes itself, the live and time pills inside the picture and
 * two overlay actions. Two stacked images take turns: the next frame loads behind the current one
 * and fades in over it once decoded, so the picture never blinks. One interval, which only runs
 * while the card is on screen and the tab is in front, and is gone with the card.
 */
export class FluvyCameraCard extends RowsCard<CameraCardConfig> {
  /** The card's height at a 360 column, for the automatic dashboard's columns. */
  static override layoutHeight(config: CameraCardConfig): number {
    if (config.variant === 'compact') return Math.round((360 * 9) / 16 / 4) * 4; // the picture alone
    const rows = config.show_rows === false ? 0 : listLength(config, ['rows']);
    return 280 + (rows ? 16 + ROW * rows : 0);
  }

  static override styles: CSSResultGroup = [
    ...(Card.styles as CSSResultGroup[]),
    sheetStyles.devices,
    css`
      .dv-card {
        width: auto;
      }
      .dv-cam {
        background: none;
      }
      /* the sheet's vignette, over the picture instead of under it, so the pills stay legible on a bright frame */
      .dv-cam__shade {
        position: absolute;
        inset: 0;
        z-index: 2;
        pointer-events: none;
        background: radial-gradient(
          120% 90% at 50% 40%,
          transparent 55%,
          color-mix(in srgb, var(--fluvy-neutral-05) 28%, transparent) 100%
        );
      }
      .dv-cam__skeleton {
        position: absolute;
        inset: 0;
        border-radius: 0;
      }
      .dv-cam__tap {
        position: absolute;
        inset: 0;
        z-index: 3;
        width: 100%;
        border-radius: var(--fluvy-radius-control);
      }
      .dv-cam__tap:focus-visible {
        outline-offset: -4px;
      }
      .dv-cam__pill {
        z-index: 4;
        pointer-events: none;
        transition: opacity var(--fv-base) var(--fv-ease);
      }
      .dv-cam__live.is-stale {
        opacity: 0;
      }
      .dv-cam__actions {
        z-index: 4;
      }
      /* error and unavailable: the unavailable skin — page fill, dashed hairline, one glyph, one line */
      .dv-cam.is-off {
        background: var(--fluvy-page);
        outline: 1px dashed var(--fluvy-unavailable-border);
        outline-offset: -1px;
      }
      .dv-cam.is-off .fv-plate__img {
        display: none;
      }
      .dv-cam__off {
        position: absolute;
        left: 0;
        right: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 0 16px;
      }
      .dv-cam__off p {
        max-width: 100%;
        font-size: 13px;
        font-weight: 500;
        line-height: 24px;
        color: var(--fluvy-unavailable);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      /* compact: the picture is the card — no padding, the card's radius on the plate */
      .dv-card--compact {
        padding: 0;
        overflow: hidden;
      }
      .dv-card--compact .dv-cam {
        margin-top: 0;
        border-radius: var(--fluvy-radius-card);
      }
      .dv-card--compact .dv-cam__tap {
        border-radius: var(--fluvy-radius-card);
      }
      /* the name pill: 8 from the corner (a thumbnail a third of a phone wide keeps "Driveway" whole), the live
         dot before the name, never wider than the picture */
      .dv-cam__name {
        top: auto;
        bottom: 8px;
        left: 8px;
        max-width: calc(100% - 16px);
        padding: 0; /* sized to its words by fitPills (8 a side, on the 4 grid) */
        z-index: 4;
        pointer-events: none;
      }
      .dv-cam__name span {
        min-width: 0;
        margin-left: 14px; /* past the dot (8) and its gap (6) */
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      /* the dot at a fixed 8 from the pill's edge, on the grid whatever lead-in the fit gives the words */
      .dv-cam__name i {
        position: absolute;
        left: 8px;
        top: 8px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--fluvy-danger);
        transition: opacity var(--fv-base) var(--fv-ease);
      }
      .dv-cam__name.is-stale i {
        opacity: 0;
      }
      /* the off skin in a thumbnail: the glyph alone */
      .dv-card--compact .dv-cam__off p {
        display: none;
      }
      .dv-cam:fullscreen {
        border-radius: 0;
        background: var(--fluvy-neutral-05);
      }
      .dv-cam:fullscreen .fv-plate__img {
        object-fit: contain;
      }
      .dv-cam:fullscreen .dv-cam__shade {
        display: none;
      }
    `,
  ];

  static override properties = {
    ...Card.properties,
    stamp_: { state: true },
    failed_: { state: true },
    stale_: { state: true },
  };

  /** The two stacked frames: the next one loads behind and shows once decoded. */
  private readonly frames = new Crossfade(
    this,
    () => {
      this.inFlight = 0;
      this.failures = 0;
      this.stamp_ = Date.now();
      this.failed_ = false;
      this.stale_ = false;
    },
    () => this.onError(),
  );
  /** When the shown frame arrived. */
  declare stamp_: number;
  /** No frame to show: none ever came, or the camera kept failing. */
  declare failed_: boolean;
  /** The shown frame is older than it should be: the last request failed, or the loop is stopped. */
  declare stale_: boolean;

  private timer = 0;
  /** Seconds the running interval was started with, so a config change restarts it. */
  private period = 0;
  private observer: IntersectionObserver | undefined;
  private onScreen = false;
  private inFront = true;
  /** When the request now in flight was made; 0 when there is none. */
  private inFlight = 0;
  private failures = 0;

  constructor() {
    super();
    this.stamp_ = 0;
    this.failed_ = false;
    this.stale_ = false;
  }

  static override keys = configKeys<CameraCardConfig>()([
    'variant',
    'rows',
    'show_rows',
    'refresh',
    'subtitle',
  ]);
  static override lists: readonly RowsListSpec[] = [
    { key: 'rows', title: 'editor.rows', keys: ROW_KEYS, schema: rowSchema() },
  ];
  static override defaults: EditorDefaults = () => ({ variant: 'full' });
  static override aliases: AliasSpec = {
    keys: [{ from: 'sub', to: 'subtitle' }],
    items: { rows: ITEM_ALIASES },
  };
  static override getConfigForm(): LovelaceConfigForm {
    return {
      schema: [
        entityField(['camera']),
        nameIconFields(),
        selectField('variant', VARIANTS),
        fieldRow(textField('subtitle'), numberField('refresh', 1, 300)),
        boolField('show_rows'),
        entitiesField('rows'),
        colourFields(),
        actionFields(),
      ],
      ...editorLabels(s, { refresh: 'refresh' }, {}),
    };
  }

  static getStubConfig(_hass: unknown, entities: readonly string[]): CameraCardConfig {
    return {
      type: 'custom:fluvy-camera-card',
      entity: entities.find((id) => id.startsWith('camera.')) ?? '',
    };
  }

  protected override prepare(config: CameraCardConfig): CameraCardConfig {
    if (!config.entity) throw new Error('fluvy-camera-card: "entity" is required');
    return super.prepare({
      ...config,
      refresh: Math.min(300, Math.max(1, Number(config.refresh) || 10)),
    });
  }

  private get compact(): boolean {
    return this.config?.variant === 'compact';
  }

  override getCardSize(): number {
    return this.compact ? 3 : 5 + this.rowCount;
  }
  override getGridOptions(): LovelaceGridOptions {
    return { columns: 12, rows: 'auto', min_columns: this.compact ? 4 : 6 };
  }

  /* ---------- the refresh loop ---------- */

  override connectedCallback(): void {
    super.connectedCallback();
    this.inFront = document.visibilityState !== 'hidden';
    document.addEventListener('visibilitychange', this.onTabChange);
    if (typeof IntersectionObserver === 'function') {
      this.onScreen = false; // the observer's first report, a frame from now, says otherwise
      this.observer = new IntersectionObserver((entries) => {
        const seen = entries[entries.length - 1]?.isIntersecting ?? true;
        if (seen === this.onScreen) return;
        this.onScreen = seen;
        this.sync();
      });
      this.observer.observe(this);
    } else {
      this.onScreen = true;
    }
    this.sync();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('visibilitychange', this.onTabChange);
    this.observer?.disconnect();
    this.observer = undefined;
    this.stop();
  }

  private readonly onTabChange = (): void => {
    this.inFront = document.visibilityState !== 'hidden';
    this.sync();
  };

  private stop(): void {
    clearInterval(this.timer);
    this.timer = 0;
    this.period = 0;
    this.inFlight = 0;
    if (this.stamp_ && !this.stale_) this.stale_ = true;
  }

  /** Runs the loop exactly while it is worth running: connected, on screen, tab in front, a camera with a picture. */
  private sync(): void {
    const view = this.entity();
    const wanted =
      this.isConnected &&
      this.onScreen &&
      this.inFront &&
      Boolean(this.hass) &&
      view.status === 'ok' &&
      Boolean(view.attr<string | null>('entity_picture'));
    const seconds = this.config?.refresh ?? 10;
    if (this.timer && (!wanted || seconds !== this.period)) this.stop();
    if (wanted && !this.timer) {
      this.period = seconds;
      this.timer = window.setInterval(() => this.pull(), seconds * 1000);
      this.pull();
    }
  }

  /** Asks the image behind for a fresh still. One request at a time: a slow camera is waited for, not piled onto. */
  private pull(): void {
    const picture = this.entity().attr<string | null>('entity_picture');
    if (!this.hass || !picture) return;
    const now = Date.now();
    if (this.inFlight && now - this.inFlight < STALL_MS) return;
    this.inFlight = now;
    const base = this.hass.hassUrl(picture);
    // the signed token in the URL stays; the extra bit only keeps the browser from serving one frame forever
    const url = base.startsWith('data:')
      ? `${base}#${now}`
      : `${base}${base.includes('?') ? '&' : '?'}_=${now}`;
    this.frames.show(url);
  }

  private onError(): void {
    this.inFlight = 0;
    this.failures += 1;
    if (!this.stamp_ || this.failures >= GIVE_UP) this.failed_ = true;
    else this.stale_ = true;
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (changed.has('hass') || changed.has('config')) this.sync();
  }

  /* ---------- actions ---------- */

  private moreInfo(): void {
    if (this.renderRoot instanceof ShadowRoot && this.renderRoot.fullscreenElement) {
      void document.exitFullscreen();
      return;
    } // the dialog would open behind the picture
    this.tap(this.config?.entity, { action: 'more-info' });
  }

  private fullscreen(): void {
    haptic(this, 'light');
    if (this.renderRoot instanceof ShadowRoot && this.renderRoot.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    const box = this.renderRoot.querySelector<HTMLElement>('.dv-cam');
    if (!box || typeof box.requestFullscreen !== 'function') {
      this.moreInfo();
      return;
    } // iPhone: Home Assistant's dialog has the player
    box.requestFullscreen().catch(() => this.moreInfo());
  }

  /* ---------- render ---------- */

  private clock(): string {
    if (!this.stamp_) return '';
    const date = new Date(this.stamp_);
    const full = formatTime(this.hass, date, true);
    return full.length > 9 ? formatTime(this.hass, date, false) : full; // a 12-hour locale keeps the pill's 80 px
  }

  protected renderCard(): TemplateResult {
    const view = this.entity();
    const name = this.config?.name ?? view.name;
    if (view.status === 'missing')
      return this.renderEmpty(`${name} · ${stateText(this.hass, view)}`);

    const unusable = view.status !== 'ok';
    const off = unusable || this.failed_ || !view.attr<string | null>('entity_picture');
    const compact = this.compact;
    const width = compact ? this.width : this.contentWidth; // compact: the picture bleeds to the card's edges
    const height = Math.round((width * 9) / 16 / 4) * 4; // 16:9, landed on the 4 px grid
    const offH = compact ? 24 : 76; // the off skin: the glyph alone in a thumbnail
    const offTop = Math.max(0, Math.round((height - offH) / 2 / 4) * 4);
    const sub =
      this.config?.subtitle ??
      [view.areaName, stateText(this.hass, view)].filter(Boolean).join(' · ');

    return html`<article
      class="fv-card dv-card ${compact ? 'dv-card--compact' : ''} ${isUsable(view) ? '' : 'is-unavailable'}"
      data-card
    >
      ${
        compact
          ? nothing
          : head({
              icon: this.config?.icon ?? glyphFor(view),
              tone: isUsable(view) ? toneOf(this.config, 'accent') : 'off',
              title: name,
              name: true,
              sub,
              trailing: round('dots', 'quiet', this.t('common.more'), () => this.moreInfo()),
              onIconTap: () => this.tap(view.id),
              onHold: () => this.hold(view.id),
              iconLabel: name,
            })
      }
      <div class="dv-cam fv-plate ${off ? 'is-off' : ''}" style="height:${height}px">
        ${this.frames.render()}
        ${
          off
            ? html`<div class="dv-cam__off" style="top:${offTop}px;height:${offH}px">
                <span class="fv-ico fv-ico--off" data-icon>${glyph('camera')}</span>
                <p>${unusable ? stateText(this.hass, view) : s(this.hass, 'offline')}</p>
              </div>`
            : !this.stamp_
              ? html`<span class="fv-skeleton dv-cam__skeleton"></span>`
              : html` <span class="dv-cam__shade" data-measure="skip"></span>
                  <button
                    class="dv-cam__tap"
                    data-target
                    aria-label=${s(this.hass, 'view', { name })}
                    @click=${() => this.moreInfo()}
                  ></button>
                  ${
                    compact
                      ? nothing
                      : html`<span
                            class="dv-cam__pill dv-cam__live ${this.stale_ ? 'is-stale' : ''}"
                            ><i></i>${s(this.hass, 'live')}</span
                          >
                          <span class="dv-cam__pill dv-cam__time">${this.clock()}</span>
                          <div class="dv-cam__actions">
                            ${round('snapshot', 'quiet', s(this.hass, 'snapshot'), () => this.moreInfo())}
                            ${round('expand', 'quiet', s(this.hass, 'fullscreen'), () =>
                              this.fullscreen(),
                            )}
                          </div>`
                  }`
        }
        ${
          compact
            ? html`<span
                class="dv-cam__pill dv-cam__name ${this.stale_ || !this.stamp_ ? 'is-stale' : ''}"
                data-fit="16"
                ><i></i><span>${name}</span></span
              >`
            : nothing
        }
      </div>
      ${compact ? nothing : this.renderRows(true)}
    </article>`;
  }
}
