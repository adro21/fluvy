import type { HomeAssistant } from '../ha/types.js';

/*
 * A diagnostic for a page that scrolls sideways: a few seconds after a page loads or moves, and whenever the page
 * is wider than the screen, what is wider is written to Home Assistant's own log (`system_log.write`, logger
 * `fluvy.overflow`), where it can be read from anywhere — a phone has no console to look at. Nothing leaves the
 * house: the log is Home Assistant's. A page that fits writes one line too, so a silence is not mistaken for health.
 */

type HassElement = Element & { hass?: HomeAssistant };

export interface OverflowReport {
  readonly innerWidth: number;
  readonly pageWidth: number;
  /** Scroll containers wider inside than out: `tag#id.class clientWidth/scrollWidth`. */
  readonly scrollers: readonly string[];
  /** The elements reaching past the right edge, widest first: `tag#id.class left..right (width)`. */
  readonly wide: readonly string[];
  /** The ancestors of the first of them, outermost first. */
  readonly path: readonly string[];
}

const LIMIT = 25_000;
const DELAYS_MS = [3000, 9000];

const name = (el: Element): string => {
  const cls =
    typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean) : [];
  return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${cls.length ? `.${cls.slice(0, 3).join('.')}` : ''}`;
};

/** Every element of the page through its shadow roots, until the limit. */
function* elements(root: ParentNode, budget: { left: number }): Generator<Element> {
  for (const el of root.querySelectorAll('*')) {
    if (budget.left-- <= 0) return;
    yield el;
    if (el.shadowRoot) yield* elements(el.shadowRoot, budget);
  }
}

const ancestors = (el: Element): string[] => {
  const path: string[] = [];
  let node: Node | null = el;
  while (node && path.length < 24) {
    if (node instanceof Element) path.unshift(name(node));
    node = node instanceof ShadowRoot ? node.host : node.parentNode;
  }
  return path;
};

/** What is wider than the screen, or null while the page fits. */
export function measureOverflow(doc: Document, win: Window): OverflowReport | null {
  const innerWidth = win.innerWidth;
  const pageWidth = doc.scrollingElement?.scrollWidth ?? 0;
  const scrollers: string[] = [];
  const wide: Array<{ readonly text: string; readonly right: number; readonly el: Element }> = [];
  const budget = { left: LIMIT };
  for (const el of elements(doc, budget)) {
    if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
      const overflow = win.getComputedStyle(el).overflowX;
      if (overflow === 'auto' || overflow === 'scroll')
        scrollers.push(`${name(el)} ${el.clientWidth}/${el.scrollWidth}`);
    }
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.right > innerWidth + 2)
      wide.push({
        text: `${name(el)} ${Math.round(rect.left)}..${Math.round(rect.right)} (${Math.round(rect.width)})`,
        right: rect.right,
        el,
      });
  }
  const pageWide = pageWidth > innerWidth + 2;
  const viewWide = scrollers.some((s) => /^(html|body|div#view|hui-view|hui-root)/.test(s));
  if (!pageWide && !viewWide) return null;
  wide.sort((a, b) => b.right - a.right);
  const first = wide[0];
  return {
    innerWidth,
    pageWidth,
    scrollers: scrollers.slice(0, 8),
    wide: wide.slice(0, 14).map((w) => w.text),
    path: first ? ancestors(first.el) : [],
  };
}

/** The report as one log message. */
export function formatOverflow(report: OverflowReport | null, agent: string): string {
  if (!report) return `ok: the page fits (${agent})`;
  return [
    `wider than the screen: page ${report.pageWidth} in a window of ${report.innerWidth} (${agent})`,
    `scrollers: ${report.scrollers.join(' | ') || 'none'}`,
    `wide: ${report.wide.join(' | ') || 'none'}`,
    `path: ${report.path.join(' > ')}`,
  ].join('\n');
}

/** Writes to Home Assistant's log through the page's connection; nothing when the page has none yet. */
async function write(doc: Document, message: string): Promise<void> {
  const hass = (doc.querySelector('home-assistant') as HassElement | null)?.hass;
  if (!hass) return;
  try {
    await hass.callService('system_log', 'write', {
      message,
      level: 'warning',
      logger: 'fluvy.overflow',
    });
  } catch {
    /* a log that cannot be written is no reason to disturb the page */
  }
}

/** Starts the checks: after the page loads and after every move. Returns how to stop. */
export function startOverflowReport(win: Window = window): () => void {
  const doc = win.document;
  let timers: number[] = [];
  const check = (): void => {
    const agent = win.navigator.userAgent.slice(0, 120);
    void write(doc, formatOverflow(measureOverflow(doc, win), agent));
  };
  const schedule = (): void => {
    for (const t of timers) win.clearTimeout(t);
    timers = DELAYS_MS.map((ms) => win.setTimeout(check, ms));
  };
  win.addEventListener('location-changed', schedule);
  win.addEventListener('popstate', schedule);
  schedule();
  return () => {
    for (const t of timers) win.clearTimeout(t);
    win.removeEventListener('location-changed', schedule);
    win.removeEventListener('popstate', schedule);
  };
}
