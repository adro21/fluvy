import { LIFT } from './shared.js';

/*
 * Menus (`ha-dropdown`, the list a select opens) and picker lists: the sheets' 16 radius and lift,
 * 44 rows at radius 10 inside a 6 px inset, the page fill on hover, the active tiles' idiom for the
 * chosen row (accent fill, dark ink); they scroll without a visible bar.
 */

export const dropdownCss = `#menu { min-width: 192px; border-radius: var(--fluvy-radius-lg); padding: 6px; border-color: var(--fluvy-border); box-shadow: ${LIFT}; scrollbar-width: none; }`;

export const dropdownItemCss = `:host, :host([checkbox-adjacent]) { min-height: 44px; padding: 10px; border-radius: 10px; }
#check { --mdc-icon-size: 20px; margin-inline: 0 12px; } #icon ::slotted(*) { margin-inline-end: 12px !important; }
:host(:not([selected]):not([disabled]):is(:hover, :focus, :focus-visible)) { background-color: var(--fluvy-page); color: var(--fluvy-text); }
:host([selected]) { color: var(--fluvy-accent-on-fill); background-color: var(--fluvy-accent-fill); --icon-primary-color: var(--fluvy-accent-on-fill); }
:host([selected]:hover) { background-color: var(--fluvy-accent-fill); }
#icon ::slotted(*) { color: var(--fluvy-text-secondary); }
:host([selected]) #icon ::slotted(*) { color: var(--fluvy-accent-on-fill); }
:host(:focus-visible) { outline: 2px solid var(--fluvy-accent); outline-offset: -2px; }`;

/**
 * The searchable list a picker opens (integrations, entities, icons, the quick bar): no visible bars; its section
 * chips on the filter chips' idiom (HA gives the chosen one a hover tint), no separators between them, the strip
 * fading where it continues on the phone; section titles as the cards' labels (11/600 caps, no grey band); rows of
 * two lines at 60 (14/20 over 13/16); every glyph in our 40 icon circle on the accent fill, not HA's brand colours.
 */
export const pickerListCss = `lit-virtualizer, .sections { scrollbar-width: none; }
.sections ha-filter-chip { --md-filter-chip-selected-container-color: var(--fluvy-accent-fill); color: var(--fluvy-accent-on-fill); }
.sections .separator { display: none; }
.sections ha-filter-chip { --md-filter-chip-outline-width: 0px; border-radius: var(--fluvy-radius-pill, 9999px); background-color: var(--fluvy-page); }
@media (min-width: 601px) { :host([mode="dialog"]) .sections:has(> ha-filter-chip:nth-of-type(5):last-of-type) { display: grid; grid-auto-flow: column; grid-auto-columns: round(down, calc((100% - 32px) / 5 + 0.01px), 1px); } }
.title, .section-title { min-height: 32px; padding: 12px 16px 4px; background-color: var(--card-background-color); font-size: 11px; line-height: 16px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--secondary-text-color); }
.section-title { width: 100%; top: 0; }
ha-combo-box-item { --md-list-item-two-line-container-height: 60px; --md-list-item-top-space: 10px; --md-list-item-bottom-space: 10px; }
ha-combo-box-item.selected, .combo-box-row.selected { background-color: var(--fluvy-page); }
ha-combo-box-item > [slot="headline"] { font-size: 14px; line-height: 20px; font-weight: 500; }
ha-combo-box-item > [slot="supporting-text"] { font-size: 13px; line-height: 16px; font-weight: 500; }
ha-combo-box-item > :is(div, ha-icon, ha-svg-icon)[slot="start"] { display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; width: 40px; height: 40px; margin: 0 !important; padding: 0 !important; border-radius: 50%; background-color: var(--fluvy-accent-wash) !important; color: var(--fluvy-accent); --mdc-icon-size: 20px; }
ha-combo-box-item > div[slot="start"] > ha-svg-icon { color: var(--fluvy-accent) !important; --mdc-icon-size: 20px !important; }
@media (max-width: 600px) { .sections { -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 16px), transparent); mask-image: linear-gradient(90deg, #000 calc(100% - 16px), transparent); } }`;

/**
 * The quick bar's tip: a 13/500 secondary line centred in a footer band of its own under a hairline (the dialogs'
 * footer keeps no room above, for buttons: the tip sat on the list), its link in the accent without an underline.
 */
export const quickBarCss =
  'ha-tip { box-sizing: border-box; min-height: 44px; padding: 11px 24px 12px; border-top: 1px solid var(--divider-color); font-size: 13px; line-height: 20px; font-weight: 500; } ha-tip .link, ha-tip a { color: var(--fluvy-accent); text-decoration: none; font-weight: 600; }';
