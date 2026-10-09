import { localize } from '@fluvy/core';
import { html, type PropertyValues, type TemplateResult } from 'lit';
import { FluvyAlarmCard } from '../../../../packages/cards/src/alarm/alarm-card.js';
import { FluvyKeypad } from '../../../../packages/cards/src/alarm/keypad.js';
import { FluvyCameraCard } from '../../../../packages/cards/src/camera/camera-card.js';
import { FluvyLockCard } from '../../../../packages/cards/src/lock/lock-card.js';
import { Card } from '../../../../packages/cards/src/shared/base.js';
import type { SheetSpec } from '../scenes.js';

/**
 * The keypad is a modal sheet in production. Here it is docked into a frame, as the design sheet draws
 * it, so it can be photographed and measured: "Disarm · Enter your code · 30 s", two digits in.
 */
class KeypadDemo extends Card {
  protected renderCard(): TemplateResult {
    return html`<fluvy-keypad docked .hass=${this.hass}></fluvy-keypad>`;
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed);
    const keypad = this.renderRoot.querySelector<FluvyKeypad>('fluvy-keypad');
    if (!keypad) return;
    const entity = this.config?.entity ?? '';
    keypad.open({
      title: localize(this.hass, 'alarm.disarm'),
      sub: '',
      primary: { key: 'alarm_disarm', label: localize(this.hass, 'alarm.disarm'), code: true },
      secondary: {
        key: 'alarm_arm_away',
        label: localize(this.hass, 'alarm.arm_away'),
        code: true,
      },
      run: async (service, code) => {
        await this.hass?.callService('alarm_control_panel', service, code ? { code } : {}, {
          entity_id: entity,
        });
        return true;
      },
    });
    void keypad.updateComplete.then(() => {
      const keys = keypad.renderRoot.querySelectorAll<HTMLButtonElement>('.dv-key');
      keys[0]?.click();
      keys[1]?.click();
    });
  }
}

const define = (tag: string, ctor: CustomElementConstructor): void => {
  if (!customElements.get(tag)) customElements.define(tag, ctor);
};
define('fluvy-lock-card', FluvyLockCard);
define('fluvy-alarm-card', FluvyAlarmCard);
define('fluvy-camera-card', FluvyCameraCard);
define('pg-keypad-demo', KeypadDemo);

/** A still that needs no network: the driveway at night, drawn as an SVG data URI. */
const STILL = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2418"/><stop offset="1" stop-color="#6b5836"/></linearGradient>
      <radialGradient id="lamp" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffe7b0" stop-opacity="0.85"/><stop offset="1" stop-color="#ffe7b0" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="640" height="360" fill="url(#sky)"/>
    <rect y="196" width="640" height="164" fill="#3a3126"/>
    <circle cx="150" cy="150" r="120" fill="url(#lamp)"/>
    <path d="M0 360 L220 196 L420 196 L640 360 Z" fill="#4a4031"/>
    <path d="M300 196 L340 196 L420 360 L350 360 Z" fill="#564a38"/>
    <rect x="380" y="120" width="180" height="80" rx="10" fill="#241e16"/>
    <rect x="404" y="140" width="132" height="36" rx="6" fill="#3d3426"/>
    <rect x="92" y="236" width="150" height="52" rx="14" fill="#1d1812"/>
    <rect x="112" y="212" width="104" height="32" rx="12" fill="#2a231a"/>
    <circle cx="126" cy="292" r="14" fill="#141009"/>
    <circle cx="210" cy="292" r="14" fill="#141009"/>
  </svg>`,
)}`;

const PANEL = {
  friendly_name: 'Alarm',
  supported_features: 1 | 2,
  code_format: 'number',
  code_arm_required: false,
};

export const sheet: SheetSpec = {
  states: [
    /* locks */
    [
      'lock.front_door',
      'locked',
      { friendly_name: 'Front door', changed_by: 'Marta', code_format: null },
    ],
    ['switch.auto_lock', 'on', { friendly_name: 'Auto-lock' }],
    ['binary_sensor.front_door', 'off', { friendly_name: 'Door sensor', device_class: 'door' }],
    ['input_text.guest_code', 'Sunday', { friendly_name: 'Guest code' }],
    [
      'lock.back_door',
      'unlocked',
      { friendly_name: 'Back door', changed_by: 'Marta', supported_features: 1 },
    ],
    ['lock.side_gate', 'jammed', { friendly_name: 'Side gate' }],
    ['lock.garden_gate', 'locked', { friendly_name: 'Garden gate', code_format: '^\\d{4}$' }],
    ['lock.garage', 'unavailable', { friendly_name: 'Garage door' }],
    [
      'sensor.garage_lock_battery',
      'unavailable',
      { friendly_name: 'Battery', unit_of_measurement: '%', device_class: 'battery' },
    ],
    /* alarm */
    ['alarm_control_panel.house', 'armed_home', PANEL],
    [
      'binary_sensor.living_motion',
      'off',
      { friendly_name: 'Living room motion', device_class: 'motion' },
    ],
    ['binary_sensor.back_door', 'off', { friendly_name: 'Back door', device_class: 'door' }],
    ['alarm_control_panel.keypad', 'armed_home', PANEL],
    [
      'alarm_control_panel.no_code',
      'armed_home',
      {
        friendly_name: 'Alarm',
        supported_features: 1 | 2 | 4,
        code_format: null,
        changed_by: 'Marta',
      },
    ],
    [
      'alarm_control_panel.resting',
      'disarmed',
      {
        friendly_name: 'Alarm',
        supported_features: 1 | 2 | 4 | 32,
        code_format: 'number',
        code_arm_required: true,
      },
    ],
    [
      'alarm_control_panel.away',
      'armed_away',
      { friendly_name: 'Alarm', supported_features: 1 | 2 | 4 | 16 | 32, code_format: null },
    ],
    [
      'alarm_control_panel.waiting',
      'pending',
      {
        friendly_name: 'Alarm',
        supported_features: 1 | 2,
        code_format: 'number',
        previous_state: 'armed_away',
        next_state: 'triggered',
      },
    ],
    [
      'alarm_control_panel.loud',
      'triggered',
      {
        friendly_name: 'Alarm',
        supported_features: 1 | 2,
        code_format: null,
        previous_state: 'armed_away',
      },
    ],
    ['alarm_control_panel.gone', 'unavailable', { friendly_name: 'Alarm' }],
    /* cameras */
    [
      'camera.driveway',
      'streaming',
      { friendly_name: 'Driveway', entity_picture: STILL, supported_features: 2 },
    ],
    ['binary_sensor.person', 'on', { friendly_name: 'Person detected', device_class: 'motion' }],
    ['binary_sensor.vehicle', 'off', { friendly_name: 'Vehicle', device_class: 'motion' }],
    [
      'camera.back_garden',
      'idle',
      { friendly_name: 'Back garden', entity_picture: 'data:image/png;base64,iVBORw0KAAAA' },
    ],
    ['camera.garage', 'unavailable', { friendly_name: 'Garage camera' }],
  ],
  frames: [
    {
      title: 'Lock',
      cards: [
        {
          type: 'custom:fluvy-lock-card',
          entity: 'lock.front_door',
          rows: [
            { entity: 'switch.auto_lock', icon: 'clock' },
            'binary_sensor.front_door',
            { entity: 'input_text.guest_code', icon: 'key' },
          ],
        },
      ],
    },
    // the head and the slide: 144 tall, half a section; the rows it was given are not drawn
    {
      title: 'Lock · compact',
      width: 392,
      cards: [
        {
          type: 'custom:fluvy-lock-card',
          entity: 'lock.front_door',
          variant: 'compact',
          subtitle: 'Front of house',
          rows: ['binary_sensor.front_door'],
        },
      ],
    },
    {
      title: 'Lock · unlocked, with a latch',
      cards: [
        {
          type: 'custom:fluvy-lock-card',
          entity: 'lock.back_door',
          rows: ['binary_sensor.front_door'],
        },
      ],
    },
    {
      title: 'Lock · jammed',
      cards: [{ type: 'custom:fluvy-lock-card', entity: 'lock.side_gate' }],
    },
    {
      title: 'Lock · needs a code',
      cards: [{ type: 'custom:fluvy-lock-card', entity: 'lock.garden_gate' }],
    },
    {
      title: 'Lock · unavailable',
      cards: [
        {
          type: 'custom:fluvy-lock-card',
          entity: 'lock.garage',
          rows: ['sensor.garage_lock_battery'],
        },
      ],
    },
    {
      title: 'Alarm',
      cards: [
        {
          type: 'custom:fluvy-alarm-card',
          entity: 'alarm_control_panel.house',
          rows: ['binary_sensor.living_motion', 'binary_sensor.back_door'],
        },
      ],
    },
    // the head and the modes as chips: 144 tall, half a section
    {
      title: 'Alarm · compact',
      width: 392,
      cards: [
        {
          type: 'custom:fluvy-alarm-card',
          entity: 'alarm_control_panel.house',
          variant: 'compact',
          rows: ['binary_sensor.living_motion'],
        },
      ],
    },
    // the modes it was asked for, in that order (a mode the panel lacks is left out)
    {
      title: 'Alarm · two modes',
      cards: [
        {
          type: 'custom:fluvy-alarm-card',
          entity: 'alarm_control_panel.house',
          modes: ['arm_away', 'disarm', 'arm_custom_bypass'],
          subtitle: 'Perimeter only at night',
        },
      ],
    },
    {
      title: 'Alarm · keypad sheet',
      cards: [{ type: 'custom:pg-keypad-demo', entity: 'alarm_control_panel.keypad' }],
    },
    {
      title: 'Alarm · without a code',
      cards: [{ type: 'custom:fluvy-alarm-card', entity: 'alarm_control_panel.no_code' }],
    },
    {
      title: 'Alarm · disarmed, arming needs the code',
      cards: [{ type: 'custom:fluvy-alarm-card', entity: 'alarm_control_panel.resting' }],
    },
    {
      title: 'Alarm · armed away',
      cards: [{ type: 'custom:fluvy-alarm-card', entity: 'alarm_control_panel.away' }],
    },
    {
      title: 'Alarm · pending',
      cards: [{ type: 'custom:fluvy-alarm-card', entity: 'alarm_control_panel.waiting' }],
    },
    {
      title: 'Alarm · triggered',
      cards: [{ type: 'custom:fluvy-alarm-card', entity: 'alarm_control_panel.loud' }],
    },
    {
      title: 'Alarm · unavailable',
      cards: [{ type: 'custom:fluvy-alarm-card', entity: 'alarm_control_panel.gone' }],
    },
    {
      title: 'Camera',
      cards: [
        {
          type: 'custom:fluvy-camera-card',
          entity: 'camera.driveway',
          sub: 'Front of house · 1080p',
          rows: [
            { entity: 'binary_sensor.person', icon: 'person' },
            { entity: 'binary_sensor.vehicle', icon: 'car' },
          ],
        },
      ],
    },
    {
      title: 'Camera · compact',
      cards: [
        {
          type: 'custom:fluvy-camera-card',
          entity: 'camera.driveway',
          name: 'Driveway',
          variant: 'compact',
        },
      ],
    },
    {
      title: 'Camera · compact, unavailable',
      cards: [{ type: 'custom:fluvy-camera-card', entity: 'camera.garage', variant: 'compact' }],
    },
    {
      title: 'Camera · image error',
      cards: [{ type: 'custom:fluvy-camera-card', entity: 'camera.back_garden' }],
    },
    {
      title: 'Camera · unavailable',
      cards: [{ type: 'custom:fluvy-camera-card', entity: 'camera.garage' }],
    },
  ],
};
