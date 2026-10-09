/**
 * fluvy — the single module Home Assistant loads as a Lovelace resource (and, through the loader, at
 * start on every page). Importing the cards defines every custom element synchronously and registers
 * them in the card picker.
 */
import {
  ensureFonts,
  registerIcons,
  setFontFolder,
  startLook,
  startShell,
  startWall,
  startZoom,
  type LookHandle,
  type ShellHandle,
} from '@fluvy/core';
import { panelOnDemand, takeOverActivity, takeOverHistory } from '@fluvy/cards';

declare const __FLUVY_VERSION__: string;

const version = __FLUVY_VERSION__;

/**
 * Two builds can meet in one page (a tab opened before a deploy loads the new resource beside the old
 * loader import). Custom elements cannot be redefined, so the first build keeps the cards; the shell
 * and the icon set start once too, and `window.__fluvy` tells which build runs (`__fluvy.shell.report()`
 * lists what the shell styles and whether Home Assistant still draws it).
 */
const host = window as unknown as {
  __fluvy?: {
    version: string;
    shell: ShellHandle | undefined;
    look: LookHandle | undefined;
    /** Whether our Activity page took Home Assistant's (`null` until the page's element is defined). */
    activity: boolean | null;
  };
};
const badge = (text: string): void =>
  console.info(
    `%c Fluvy %c ${text} `,
    'background:#856529;color:#fff;border-radius:4px 0 0 4px;font-weight:600',
    'background:#f1e7d2;color:#4a3a14;border-radius:0 4px 4px 0',
  );
if (host.__fluvy) {
  badge(`v${host.__fluvy.version} already running; this copy (v${version}) stands down`);
} else {
  registerIcons();
  // the fonts sit beside this file (`/local/fluvy/fonts/`); the code that loads them lives in `chunks/`
  const here: string = import.meta.url;
  setFontFolder(new URL('fonts/', here).href);
  ensureFonts();
  const look = startLook();
  // the size this device reads its dashboards at (`?zoom=` remembered, the loader's early variable taken over)
  startZoom();
  const fluvy = {
    version,
    shell: startShell(),
    look,
    // the wall: its controller and its pieces load only on a device that is one
    wall: startWall({ look, ui: () => import('@fluvy/cards/wall') }),
    activity: null as boolean | null,
    history: null as boolean | null,
  };
  host.__fluvy = fluvy;
  panelOnDemand();
  void takeOverActivity().then((done) => {
    fluvy.activity = done;
  });
  void takeOverHistory().then((done) => {
    fluvy.history = done;
  });
  badge(`v${version}`);
}

export { version };
