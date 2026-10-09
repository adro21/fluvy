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
  /** Every element whose scrollable width exceeds the window — margins, pseudo-elements and transforms count. */
  readonly holders: readonly string[];
  /** The deepest holder's ancestors, outermost first. */
  readonly holderPath: readonly string[];
  /** The deepest holder's children: box, margins, transform. */
  readonly inside: readonly string[];
  readonly scrollX: number;
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
  // the containers that hold the width: their scrollable width counts what a box's rect does not
  const holding: Element[] = [];
  for (const el of elements(doc, { left: LIMIT }))
    if (
      el.scrollWidth > innerWidth + 2 &&
      !(
        el.scrollWidth > el.clientWidth + 2 &&
        /^(auto|scroll)$/.test(win.getComputedStyle(el).overflowX)
      )
    )
      holding.push(el);
  const deepest = holding.reduce<Element | undefined>(
    (best, el) => (!best || ancestors(el).length >= ancestors(best).length ? el : best),
    undefined,
  );
  const inside: string[] = [];
  if (deepest) {
    const children = [...(deepest.shadowRoot?.children ?? []), ...deepest.children];
    for (const child of children.slice(0, 20)) {
      const rect = child.getBoundingClientRect();
      const style = win.getComputedStyle(child);
      inside.push(
        `${name(child)} ${Math.round(rect.left)}..${Math.round(rect.right)} (${Math.round(rect.width)}) sw${child.scrollWidth} m${style.marginLeft}/${style.marginRight} p${style.paddingRight} ${style.position}${style.transform !== 'none' ? ` t${style.transform}` : ''}${style.display === 'none' ? ' none' : ''}`,
      );
    }
    for (const which of ['::before', '::after'] as const) {
      const style = win.getComputedStyle(deepest, which);
      if (style.content && style.content !== 'none' && style.content !== 'normal')
        inside.push(
          `${which} ${style.content.slice(0, 40)} w${style.width} m${style.marginLeft}/${style.marginRight} ${style.display}`,
        );
    }
  }
  return {
    innerWidth,
    pageWidth,
    scrollers: scrollers.slice(0, 8),
    wide: wide.slice(0, 14).map((w) => w.text),
    path: first ? ancestors(first.el) : [],
    holders: holding.slice(0, 12).map((el) => `${name(el)} ${el.clientWidth}/${el.scrollWidth}`),
    holderPath: deepest ? ancestors(deepest) : [],
    inside,
    scrollX: Math.round(win.scrollX),
  };
}

/** The report as one log message. */
export function formatOverflow(report: OverflowReport | null, agent: string): string {
  if (!report) return `ok: the page fits (${agent})`;
  return [
    `wider than the screen: page ${report.pageWidth} in a window of ${report.innerWidth}, scrolled ${report.scrollX} (${agent})`,
    `scrollers: ${report.scrollers.join(' | ') || 'none'}`,
    `wide: ${report.wide.join(' | ') || 'none'}`,
    `path: ${report.path.join(' > ')}`,
    `holders: ${report.holders.join(' | ') || 'none'}`,
    `deepest: ${report.holderPath.join(' > ') || 'none'}`,
    `inside: ${report.inside.join(' | ') || 'none'}`,
  ].join('\n');
}

/** Finds an element by tag through the shadow roots. */
const find = (doc: Document, tag: string, cls?: string): Element | undefined => {
  for (const el of elements(doc, { left: LIMIT }))
    if (el.tagName.toLowerCase() === tag && (!cls || el.classList.contains(cls))) return el;
  return undefined;
};

/**
 * What a view change does, one piece at a time, each measured and undone: the first that makes the page fit
 * says where the width is held. `reflow-header` lays the fixed header out again; `nav-scroll` moves the tab
 * strip by a pixel and back; `page-scroll` the window; `reflow-view` the view; `html-clip` clips the root.
 */
export function tryNudges(doc: Document, win: Window): string[] {
  const width = (): number => doc.scrollingElement?.scrollWidth ?? 0;
  const fits = (): boolean => width() <= win.innerWidth + 2;
  const html = doc.documentElement;
  const header = find(doc, 'div', 'header');
  const nav = find(doc, 'div', 'nav');
  const view = find(doc, 'hui-view');
  const reflow = (el: Element | undefined): void => {
    if (!(el instanceof HTMLElement)) return;
    const was = el.style.display;
    el.style.display = 'none';
    void el.offsetHeight;
    el.style.display = was;
    void el.offsetHeight;
  };
  const steps: Array<[string, () => void]> = [
    ['reflow-header', () => reflow(header)],
    [
      'nav-scroll',
      () => {
        if (!nav) return;
        nav.scrollLeft += 1;
        void nav.scrollWidth;
        nav.scrollLeft -= 1;
      },
    ],
    [
      'page-scroll',
      () => {
        win.scrollTo(1, win.scrollY);
        win.scrollTo(0, win.scrollY);
      },
    ],
    ['reflow-view', () => reflow(view)],
    [
      'html-clip',
      () => {
        html.style.overflowX = 'clip';
        void html.offsetWidth;
        html.style.overflowX = '';
      },
    ],
  ];
  const out: string[] = [];
  for (const [label, run] of steps) {
    if (fits()) {
      out.push(`${label}: already fits`);
      break;
    }
    try {
      run();
    } catch {
      out.push(`${label}: failed`);
      continue;
    }
    out.push(`${label} → ${width()}${fits() ? ' fits' : ''}`);
  }
  return out;
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
    const report = measureOverflow(doc, win);
    const text = formatOverflow(report, agent);
    void write(doc, report ? `${text}\nnudges: ${tryNudges(doc, win).join(' | ')}` : text);
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
