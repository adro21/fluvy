import { WALL_ATTRIBUTE, WALL_BACKGROUND_VAR } from '../../look/attributes.js';

/*
 * A wall panel (`<html fluvy-wall>`): the page does not bounce or select, the drawer is gone with its width (the
 * variable Home Assistant pads its content by — `--ha-sidebar-width` today, `--mdc-drawer-width` before — and the
 * padding itself), the dashboard has no header and fills the tablet inside its safe area (its columns grow to the
 * width), and its view takes the wall's background (the wall mesh, or Home Assistant's own when the house keeps the
 * page plain). These sheets fill on the attribute alone, whatever the theme: a wall is a wall in every scope.
 */

export const wallPageCss = `
html[${WALL_ATTRIBUTE}] {
  overscroll-behavior: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}
`;

export const wallDrawerCss = `
:host {
  --ha-sidebar-width: 0px;
  --mdc-drawer-width: 0px;
}
.sidebar-shell,
wa-drawer::part(dialog) {
  display: none;
}
.app-content {
  padding-inline-start: 0;
}
`;

export const wallDashboardCss = `
:host {
  --header-height: 0px;
  /* the sections stop at 480 px (tokens) so a monitor's columns never sprawl; a tablet's columns fill its screen */
  --ha-view-sections-column-max-width: 100vw;
}
.header {
  display: none;
}
#view {
  min-height: 100vh;
  padding-top: env(safe-area-inset-top, 0px);
  background: var(${WALL_BACKGROUND_VAR}, var(--lovelace-background, var(--primary-background-color))) !important;
}
`;
