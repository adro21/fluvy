import type { SheetSpec } from '../scenes.js';

export const sheet: SheetSpec = {
  states: [
    [
      'light.ceiling',
      'on',
      {
        friendly_name: 'Ceiling',
        brightness: 178,
        supported_color_modes: ['color_temp'],
        color_mode: 'color_temp',
        color_temp_kelvin: 3200,
        min_color_temp_kelvin: 2200,
        max_color_temp_kelvin: 6500,
      },
    ],
    ['light.reading', 'off', { friendly_name: 'Reading', supported_color_modes: ['brightness'] }],
    [
      'light.porch',
      'unavailable',
      { friendly_name: 'Porch light', supported_color_modes: ['brightness'] },
    ],
  ],
  frames: [
    // fine_adjust: the precision ruler's interaction suite holds this card's ruler for the fine scale
    {
      title: 'On',
      cards: [{ type: 'custom:fluvy-light-card', entity: 'light.ceiling', fine_adjust: true }],
    },
    { title: 'Off', cards: [{ type: 'custom:fluvy-light-card', entity: 'light.reading' }] },
    { title: 'Unavailable', cards: [{ type: 'custom:fluvy-light-card', entity: 'light.porch' }] },
    {
      title: 'Live update',
      cards: [
        {
          type: 'custom:fluvy-light-card',
          entity: 'light.ceiling',
          live_update: true,
          show_temperature: false,
        },
      ],
    },
    // half a section each: the compact layout by width (the head says the level, the ruler stands alone)
    {
      title: 'Two on a line',
      width: 480,
      cards: [
        { type: 'custom:fluvy-light-card', entity: 'light.ceiling', cols: 6 },
        { type: 'custom:fluvy-light-card', entity: 'light.reading', cols: 6 },
      ],
    },
    {
      title: 'Two on a phone',
      cards: [
        { type: 'custom:fluvy-light-card', entity: 'light.ceiling', cols: 6 },
        { type: 'custom:fluvy-light-card', entity: 'light.porch', cols: 6 },
      ],
    },
    {
      title: 'Compact by choice',
      cards: [{ type: 'custom:fluvy-light-card', entity: 'light.ceiling', variant: 'compact' }],
    },
  ],
};
