import { haptic, strings, type HassEntity, type HomeAssistant } from '@fluvy/core';
import { glyph } from '@fluvy/ui';
import { css, html, LitElement, type TemplateResult } from 'lit';

const s = strings('page');

/*
 * The camera, the whole screen: Home Assistant's own player (muted, the picture fitted whole) over black, and in
 * the top right corner the way out — a × on a disc, the same one a wall shows, always there. A tap on it or Escape
 * closes. Mounted by the camera card next to the dashboard, where the look's tokens reach it.
 */
export class FluvyCameraView extends LitElement {
  static override properties = {
    hass: { attribute: false },
    stateObj: { attribute: false },
  };

  static override styles = css`
    :host {
      position: fixed;
      inset: 0;
      z-index: 8;
      display: grid;
      place-items: center;
      background: #000;
      -webkit-tap-highlight-color: transparent;
    }
    ha-camera-stream {
      display: block;
      width: 100%;
      max-height: 100%;
    }
    .leave {
      position: fixed;
      top: env(safe-area-inset-top, 0px);
      right: env(safe-area-inset-right, 0px);
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      padding: 0;
      border: 0;
      background: none;
      cursor: pointer;
      color: var(--fluvy-text-secondary, #ddd);
    }
    .disc {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: color-mix(in srgb, var(--fluvy-card, #fff) 88%, transparent);
      box-shadow:
        inset 0 0 0 1px var(--fluvy-border, rgba(0, 0, 0, 0.1)),
        var(--fluvy-shadow-knob, 0 2px 8px rgba(0, 0, 0, 0.3));
      transition:
        transform 120ms ease,
        color 180ms ease;
    }
    .disc svg {
      width: 16px;
      height: 16px;
    }
    .leave:active .disc {
      transform: scale(0.94);
    }
    .leave:focus-visible {
      outline: none;
    }
    .leave:focus-visible .disc {
      box-shadow:
        inset 0 0 0 1px var(--fluvy-border, rgba(0, 0, 0, 0.1)),
        0 0 0 2px var(--fluvy-accent, #8a6b2a),
        var(--fluvy-shadow-knob, 0 2px 8px rgba(0, 0, 0, 0.3));
    }
    @media (hover: hover) {
      .leave:hover .disc {
        color: var(--fluvy-text, #fff);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .disc {
        transition: none;
      }
    }
  `;

  declare hass: HomeAssistant | undefined;
  declare stateObj: HassEntity | undefined;
  /** Called when the person closes the view; the default takes it off the page. */
  onClose: () => void = () => this.remove();

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('keydown', this.onKey);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.onKey);
  }

  private readonly onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') this.close();
  };

  close(): void {
    haptic(this, 'light');
    this.onClose();
  }

  protected override render(): TemplateResult {
    const label = s(this.hass, 'close');
    return html`<ha-camera-stream
        muted
        .hass=${this.hass}
        .stateObj=${this.stateObj}
        .fitMode=${'contain'}
      ></ha-camera-stream>
      <button class="leave" aria-label=${label} title=${label} @click=${() => this.close()}>
        <span class="disc">${glyph('close')}</span>
      </button>`;
  }
}

if (!customElements.get('fluvy-camera-view'))
  customElements.define('fluvy-camera-view', FluvyCameraView);
