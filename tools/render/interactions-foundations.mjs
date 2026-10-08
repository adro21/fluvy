#!/usr/bin/env node
/**
 * Foundations suite (reviewer D): the shared controls and the card runtime under the conditions a real
 * instance produces. Exit code 1 on any failure.
 *   PLAYGROUND=http://127.0.0.1:5184/ node interactions-foundations.mjs
 * What it proves (and, last, that a ruler on an "on" tile draws in the fill's ink in every palette):
 *   ruler — degenerate props (min = max, step > range, NaN value/length, no step) never draw NaN and never
 *           hang; the fine scale's ticks sit on the step grid; keyboard covers Home / End / Page; a read-only
 *           ruler is an image with the value in its name; a `wake` ruler turns a device on from a tap AND from
 *           the keyboard; drag survives a DOM move (edit mode) and a lost pointer capture; focus is visible;
 *   dial  — both knobs of a range dial answer the keyboard and keep one step apart; a tap on a knob selects
 *           it without a service call; the stepper works from the keyboard; NaN never reaches the disc;
 *   core  — a card re-renders only for its own entities, the theme, the locale or the translations;
 *           an optimistic state flips at once and gives way to the real state after 3 s;
 *   motion — reduced motion collapses every animation and transition; the clock hands stop.
 */
import { BASE, calls, reset, startSuite } from './lib/suite.mjs';

const suite = await startSuite();
const { browser, check } = suite;

async function open(sheet, width = 360, options = {}) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, ...options });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(`${BASE}?sheet=${sheet}&width=${width}`);
  await page.waitForSelector('html[data-ready="1"]');
  await page.waitForTimeout(700);
  return { page, errors };
}

/* ---------- ruler: degenerate props, keyboard, read-only naming ---------- */
{
  const { page, errors } = await open('slider');
  // a bare ruler with hostile props, mounted next to the cards (the element is defined by the bundle)
  const probe = async (props) =>
    page.evaluate(async (p) => {
      const el = document.createElement('fluvy-ruler');
      Object.assign(el, p);
      el.style.cssText = 'display:block;width:320px';
      document.getElementById('stage').append(el);
      await el.updateComplete;
      const root = el.shadowRoot;
      const ruler = root.querySelector('.fv-ruler');
      const knob = root.querySelector('.fv-knob');
      const out = {
        html: root.innerHTML,
        width: ruler?.style.width,
        height: ruler?.style.height,
        role: ruler?.getAttribute('role'),
        label: ruler?.getAttribute('aria-label'),
        now: ruler?.getAttribute('aria-valuenow'),
        text: ruler?.getAttribute('aria-valuetext'),
        min: ruler?.getAttribute('aria-valuemin'),
        max: ruler?.getAttribute('aria-valuemax'),
        knob: knob?.style.translate ?? null,
        ticks: root.querySelectorAll('line').length,
      };
      el.remove();
      return out;
    }, props);

  let r = await probe({
    value: Number.NaN,
    min: 0,
    max: 100,
    step: 1,
    length: 320,
    label: 'Probe',
  });
  check(
    'ruler: a NaN value draws the knob at the origin (4 px overhang), not at NaN',
    !/NaN/.test(r.html) && r.knob === '-4px 4px' && r.now === '0',
    `knob ${r.knob} · now ${r.now}`,
  );
  r = await probe({ value: 5, min: 5, max: 5, step: 1, length: 320, label: 'Probe' });
  check(
    'ruler: min = max is inert but clean',
    !/NaN/.test(r.html) && r.now === '5' && r.ticks > 0,
    `now ${r.now} · ${r.ticks} ticks`,
  );
  r = await probe({ value: 12, min: 10, max: 20, step: 50, length: 320, label: 'Probe' });
  check(
    'ruler: a step wider than the range still reports a real value',
    !/NaN/.test(r.html) && r.now === '10',
    `now ${r.now}`,
  );
  r = await probe({
    value: 40,
    min: 0,
    max: 100,
    step: Number.NaN,
    length: Number.NaN,
    band: Number.NaN,
    knob: Number.NaN,
    minor: 0,
    major: 0,
    label: 'Probe',
  });
  check(
    'ruler: NaN length / band / knob and a zero minor fall back to the design sizes (no hang, no NaN)',
    !/NaN/.test(r.html) &&
      r.width === '320px' &&
      r.height === '44px' &&
      r.ticks >= 17 &&
      r.ticks <= 21,
    `${r.width} × ${r.height} · ${r.ticks} ticks`,
  );
  r = await probe({ value: 70, min: 100, max: 0, step: 1, length: 300, label: 'Probe' });
  check(
    'ruler: a reversed range is read as 0–100',
    r.min === '0' && r.max === '100' && r.now === '70',
    `${r.min}–${r.max} · now ${r.now}`,
  );
  r = await probe({
    value: 0.3,
    min: 0,
    max: 1,
    step: 0.1,
    length: 200,
    marker: true,
    unit: 'kWh',
    label: 'Battery',
  });
  check(
    'ruler: a read-only marker is an image named with its value',
    r.role === 'img' && r.label === 'Battery · 0.3 kWh' && r.now === null,
    `${r.role} · ${r.label}`,
  );
  r = await probe({
    value: 40,
    min: 0,
    max: 100,
    step: 1,
    length: 320,
    disabled: true,
    label: 'Volume',
  });
  check(
    'ruler: a disabled ruler is not a slider and carries its value in the name',
    r.role === 'img' && r.label === 'Volume · 40',
    `${r.role} · ${r.label}`,
  );

  // the fine grid sits on the step grid: 5–35 by 0.5 zooms to 0.5 ° ticks with labels the ruler can settle on
  const fine = await page.evaluate(async () => {
    const el = document.createElement('fluvy-ruler');
    Object.assign(el, {
      value: 21,
      min: 5,
      max: 35,
      step: 0.5,
      length: 320,
      label: 'Probe',
      fineAdjust: true, // off by default since 1.5.1: a still press zooms only when asked
    });
    el.style.cssText = 'display:block;width:320px';
    document.getElementById('stage').append(el);
    await el.updateComplete;
    let marks = null;
    el.addEventListener('fluvy-window', (e) => {
      if (e.detail.fine) marks = e.detail;
    });
    const ruler = el.shadowRoot.querySelector('.fv-ruler');
    const box = ruler.getBoundingClientRect();
    const knob = el.shadowRoot.querySelector('.fv-knob').getBoundingClientRect();
    ruler.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 7,
        pointerType: 'touch',
        clientX: knob.x + 18,
        clientY: box.y + 22,
        bubbles: true,
        isPrimary: true,
      }),
    );
    await new Promise((r) => setTimeout(r, 600));
    const ticks = [...el.shadowRoot.querySelectorAll('line')].length;
    ruler.dispatchEvent(
      new PointerEvent('pointerup', {
        pointerId: 7,
        pointerType: 'touch',
        clientX: knob.x + 18,
        clientY: box.y + 22,
        bubbles: true,
        isPrimary: true,
      }),
    );
    await new Promise((r) => setTimeout(r, 50));
    el.remove();
    return { marks, ticks };
  });
  const values = fine.marks?.marks?.map(([, v]) => v) ?? [];
  check(
    'ruler: the fine scale of a 0.5-step ruler labels multiples of 0.5 (never 0.3, 0.6…)',
    fine.marks?.fine === true &&
      values.length >= 2 &&
      values.every((v) => Math.abs(v * 2 - Math.round(v * 2)) < 1e-9),
    `${values.join(' ')} · ${fine.ticks} ticks`,
  );

  // keyboard on the real light card: Home / End / PageUp
  const card = page.locator('fluvy-light-card').first();
  const ruler = card.locator('fluvy-ruler').first().locator('.fv-ruler');
  await ruler.focus();
  await page.keyboard.press('End');
  await page.waitForTimeout(30);
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(30);
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(30);
  await page.keyboard.press('Shift+ArrowRight');
  await page.waitForTimeout(30);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(80);
  let c = await calls(page);
  check(
    'ruler: End, PageDown ×2, Shift+Arrow, Arrow count from the committed value even in a burst (100, 90, 80, 85, 84)',
    c.map((x) => x.d.brightness_pct).join(',') === '100,90,80,85,84',
    JSON.stringify(c.map((x) => x.d.brightness_pct)),
  );
  await page.waitForTimeout(500);
  await reset(page);
  await page.keyboard.press('Home');
  await page.waitForTimeout(80);
  c = await calls(page);
  check(
    'ruler: Home on a light sends it to zero (the card turns it off)',
    c.length === 1 && c[0].s === 'light.turn_off',
    JSON.stringify(c.map((x) => x.s)),
  );
  await page.waitForTimeout(500);
  await page.keyboard.press('PageUp');
  await page.waitForTimeout(80);
  c = await calls(page);
  check(
    'ruler: PageUp from an off light wakes it at 10 %',
    c.length === 2 && c[1].d.brightness_pct === 10,
    JSON.stringify(c.map((x) => x.d)),
  );
  await page.waitForTimeout(500);
  await reset(page);

  // focus is visible on the knob, not as a rectangle around the band
  await ruler.focus();
  await page.keyboard.press('Shift'); // a key press makes the focus keyboard-visible
  const focusStyle = await page.evaluate(() => {
    const el = document
      .querySelector('fluvy-light-card')
      .shadowRoot.querySelector('fluvy-ruler')
      .shadowRoot.querySelector('.fv-ruler');
    const knob = el.querySelector('.fv-knob');
    const accent = getComputedStyle(el).getPropertyValue('--fluvy-accent').trim();
    return {
      outline: getComputedStyle(el).outlineStyle,
      knobShadow: getComputedStyle(knob).boxShadow,
      matches: el.matches(':focus-visible'),
      accent,
    };
  });
  const hex = (h) =>
    `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`;
  check(
    'ruler: keyboard focus shows as the accent ring on the knob and not as a box around the band',
    focusStyle.matches &&
      focusStyle.outline === 'none' &&
      focusStyle.knobShadow.includes(`${hex(focusStyle.accent)} 0px 0px 0px 7px`),
    `focus-visible ${focusStyle.matches} · outline ${focusStyle.outline} · ${focusStyle.knobShadow.slice(0, 90)}…`,
  );

  // wake: the light that is off answers a tap on its ruler and a key
  const off = page.locator('fluvy-light-card').nth(1);
  const offRuler = off.locator('fluvy-ruler').first().locator('.fv-ruler');
  const ob = await offRuler.boundingBox();
  await page.mouse.click(ob.x + ob.width * 0.5, ob.y + ob.height / 2);
  await page.waitForTimeout(80);
  c = await calls(page);
  check(
    'ruler: a sleeping (wake) ruler turns the light on at the tapped value',
    c.length === 1 && c[0].s === 'light.turn_on' && c[0].d.brightness_pct === 50,
    JSON.stringify(c.map((x) => x.d)),
  );
  await page.waitForTimeout(400);
  check(
    '…and the knob appears once Home Assistant confirms',
    (await off.locator('fluvy-ruler').first().locator('.fv-knob').count()) === 1,
  );
  await reset(page);

  // a DOM move (Home Assistant's edit mode re-parents cards) keeps the drag alive
  await page.evaluate(() => {
    const el = document.querySelector('fluvy-light-card');
    const parent = el.parentElement;
    el.remove();
    parent.prepend(el);
  });
  await page.waitForTimeout(300);
  const box = await ruler.boundingBox();
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.5, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(80);
  c = await calls(page);
  check(
    'ruler: dragging still works after the card was moved in the DOM',
    c.length === 1 && c[0].s === 'light.turn_on',
    JSON.stringify(c.map((x) => x.d)),
  );
  await page.waitForTimeout(400);
  await reset(page);

  // a lost pointer capture ends the gesture where it was
  const before = Number(
    (await card.locator('.fv-readout--l .fv-readout__value span').first().textContent()).trim(),
  );
  await page.mouse.move(box.x + box.width * 0.5, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.55, y, { steps: 6 });
  await page.evaluate(() => {
    const el = document
      .querySelector('fluvy-light-card')
      .shadowRoot.querySelector('fluvy-ruler')
      .shadowRoot.querySelector('.fv-ruler');
    el.dispatchEvent(new PointerEvent('lostpointercapture', { pointerId: 1, bubbles: true }));
  });
  await page.waitForTimeout(80);
  c = await calls(page);
  const dragging = await ruler.evaluate((el) => el.classList.contains('is-dragging'));
  check(
    'ruler: losing pointer capture commits and releases the drag',
    c.length === 1 && !dragging && c[0].d.brightness_pct !== before,
    `${before} → ${JSON.stringify(c.map((x) => x.d.brightness_pct))} · dragging ${dragging}`,
  );
  await page.mouse.up();
  await page.waitForTimeout(400);
  await reset(page);
  c = await calls(page);
  check('…and the late pointerup does not fire a second call', c.length === 0, `${c.length} calls`);

  check('ruler: no page errors', errors.length === 0, errors.join(' | ').slice(0, 200));
  await page.close();
}

/* ---------- vertical ruler ---------- */
{
  const { page, errors } = await open('devices-motion');
  const cover = page.locator('fluvy-cover-card').first();
  const vr = cover.locator('fluvy-ruler').first();
  const touch = await vr.evaluate(
    (el) => getComputedStyle(el.shadowRoot.querySelector('.fv-ruler')).touchAction,
  );
  check(
    'vertical ruler declares touch-action: pan-x (the page still scrolls sideways, never vertically over it)',
    touch === 'pan-x',
    touch,
  );
  await vr.locator('.fv-ruler').focus();
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(80);
  const c = await calls(page);
  check(
    'vertical ruler: ArrowUp raises the position by one step',
    c.length === 1 && c[0].s === 'cover.set_cover_position' && c[0].d.position === 66,
    JSON.stringify(c.map((x) => x.d)),
  );
  check('vertical ruler: no page errors', errors.length === 0, errors.join(' | ').slice(0, 200));
  await page.close();
}

/* ---------- dial ---------- */
{
  const { page, errors } = await open('climate');
  const range = page.locator('fluvy-thermostat-card').nth(2); // heat_cool 20–24
  const dial = range.locator('fluvy-dial');
  const low = dial.locator('[data-knob="0"]');
  const high = dial.locator('[data-knob="1"]');
  check(
    'dial: the knobs of a range dial carry names',
    (await low.getAttribute('aria-label')) &&
      (await high.getAttribute('aria-label')) &&
      (await low.getAttribute('aria-label')) !== (await high.getAttribute('aria-label')),
    `${await low.getAttribute('aria-label')} / ${await high.getAttribute('aria-label')}`,
  );
  await high.focus();
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(60);
  await low.focus();
  await page.keyboard.press('PageUp');
  await page.waitForTimeout(60);
  await page.keyboard.press('End');
  await page.waitForTimeout(60);
  await page.keyboard.press('Home');
  await page.waitForTimeout(800);
  let c = await calls(page);
  check(
    'dial: keyboard on both knobs, coalesced (high +0.5, low PageUp → 21.5, End stops one step under high, Home → 15)',
    c.length === 1 && c[0].d.target_temp_low === 15 && c[0].d.target_temp_high === 24.5,
    JSON.stringify(c.map((x) => x.d)),
  );
  await reset(page);

  // a tap on a knob selects it (focus halo) and sends nothing
  const hb = await high.boundingBox();
  await page.mouse.click(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.waitForTimeout(300);
  c = await calls(page);
  const selected = await high.evaluate((el) => el.classList.contains('is-focus'));
  check(
    'dial: tapping a knob selects it for the stepper without a service call',
    c.length === 0 && selected,
    `${c.length} calls · selected ${selected}`,
  );
  // the stepper now drives the high knob, from the keyboard
  const plus = dial.locator('.fv-stepper__half').nth(1);
  await plus.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  c = await calls(page);
  check(
    'dial: Enter on the stepper steps the selected knob once',
    c.length === 1 && c[0].d.target_temp_high === 25,
    JSON.stringify(c.map((x) => x.d)),
  );
  check(
    'dial: stepper halves are named',
    (await plus.getAttribute('aria-label')) === 'Increase',
    await plus.getAttribute('aria-label'),
  );
  await reset(page);

  // hostile props on a bare dial
  const probe = await page.evaluate(async () => {
    const el = document.createElement('fluvy-dial');
    Object.assign(el, {
      value: Number.NaN,
      min: Number.NaN,
      max: Number.NaN,
      step: 0,
      radius: Number.NaN,
      tick: Number.NaN,
      current: Number.NaN,
      label: 'X',
    });
    document.getElementById('stage').append(el);
    await el.updateComplete;
    const root = el.shadowRoot;
    const out = {
      html: root.innerHTML,
      figure: root.querySelector('.fv-dial__value span')?.textContent,
      knobs: root.querySelectorAll('[data-knob]').length,
      size: root.querySelector('.fv-dial')?.style.width,
    };
    Object.assign(el, { value: 12, min: 10, max: 20, step: 50 });
    await el.updateComplete;
    root
      .querySelector('[data-knob="0"]')
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await el.updateComplete;
    out.end = root.querySelector('.fv-dial__value span')?.textContent;
    el.remove();
    return out;
  });
  check(
    'dial: NaN everywhere draws "—", no knob, the design size, no NaN',
    !/NaN/.test(probe.html) && probe.figure === '—' && probe.knobs === 0 && probe.size === '288px',
    `${probe.figure} · ${probe.knobs} knobs · ${probe.size}`,
  );
  check(
    'dial: End reaches max even when the step is wider than the range',
    probe.end === '20',
    probe.end,
  );

  // DOM move keeps the drag alive
  const single = page.locator('fluvy-thermostat-card').first();
  await page.evaluate(() => {
    const el = document.querySelectorAll('fluvy-thermostat-card')[0];
    const parent = el.parentElement;
    el.remove();
    parent.append(el);
  });
  await page.waitForTimeout(300);
  const knob = single.locator('fluvy-dial [data-knob="0"]');
  const kb = await knob.boundingBox();
  const db = await single.locator('fluvy-dial .fv-dial').boundingBox();
  await page.mouse.move(kb.x + kb.width / 2, kb.y + kb.height / 2);
  await page.mouse.down();
  await page.mouse.move(db.x + db.width / 2, db.y + db.width / 2 - 84, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(120);
  c = await calls(page);
  check(
    'dial: dragging still works after the card was moved in the DOM',
    c.length === 1 && c[0].d.temperature === 22.5,
    JSON.stringify(c.map((x) => x.d)),
  );
  check('dial: no page errors', errors.length === 0, errors.join(' | ').slice(0, 200));
  await page.close();
}

/* ---------- core: shouldUpdate, optimistic state ---------- */
{
  const { page, errors } = await open('home');
  const counts = await page.evaluate(async () => {
    const card = document.querySelector('fluvy-tile-card');
    const id = card.config.entity;
    let updates = 0;
    card.updated = () => {
      updates++;
    };
    const base = window.fluvyMock.hass();
    const other = Object.keys(base.states).find((k) => k !== id);
    const tick = async (patch) => {
      card.hass = { ...base, ...patch };
      await card.updateComplete;
    };
    const out = {};
    // 20 updates that touch another entity only
    for (let i = 0; i < 20; i++)
      await tick({
        states: { ...base.states, [other]: { ...base.states[other], last_updated: String(i) } },
      });
    out.unrelated = updates;
    updates = 0;
    await tick({ states: { ...base.states, [id]: { ...base.states[id], last_updated: 'x' } } });
    out.own = updates;
    updates = 0;
    await tick({ themes: { ...base.themes, darkMode: !base.themes.darkMode } });
    out.theme = updates;
    out.dark = card.hasAttribute('dark');
    updates = 0;
    await tick({ locale: { ...base.locale, language: 'es' }, language: 'es' });
    out.locale = updates;
    updates = 0;
    await tick({ localize: (k) => k });
    out.localize = updates;
    updates = 0;
    await tick({ entities: { ...base.entities } });
    out.registry = updates;
    updates = 0;
    await tick({});
    out.same = updates;
    card.hass = base;
    await card.updateComplete;
    return out;
  });
  check(
    'core: 20 hass updates about other entities cause 0 renders',
    counts.unrelated === 0,
    `${counts.unrelated} renders`,
  );
  check(
    'core: the watched entity, the theme, the locale, the translations and the registry each cause exactly one render',
    counts.own === 1 &&
      counts.theme === 1 &&
      counts.locale === 1 &&
      counts.localize === 1 &&
      counts.registry === 1,
    JSON.stringify(counts),
  );
  check('core: dark mode reflects on the host at the theme change', counts.dark === true);

  // optimistic state: Home Assistant never answers → the switch flips at once and gives way after 3 s
  await page.evaluate(() => {
    const h = window.fluvyMock.hass();
    h.callService = async () => undefined;
    document.querySelector('fluvy-tile-card').hass = { ...h };
  });
  const tile = page.locator('fluvy-tile-card').first();
  const wasOn = (await tile.locator('.fv-switch').getAttribute('aria-checked')) === 'true';
  await tile.locator('.fv-hit').click();
  await page.waitForTimeout(50);
  const flipped = (await tile.locator('.fv-switch').getAttribute('aria-checked')) === 'true';
  await page.waitForTimeout(3300);
  const reverted = (await tile.locator('.fv-switch').getAttribute('aria-checked')) === 'true';
  check(
    'core: a switch flips at once and returns to the real state 3 s later when nothing confirms it',
    flipped === !wasOn && reverted === wasOn,
    `${wasOn} → ${flipped} → ${reverted}`,
  );
  check('core: no page errors', errors.length === 0, errors.join(' | ').slice(0, 200));
  await page.close();
}

/* ---------- reduced motion ---------- */
{
  const { page } = await open('clocks', 360, { reducedMotion: 'reduce' });
  const motion = await page.evaluate(() => {
    const out = { animations: [], hands: [] };
    const walk = (root) => {
      for (const el of root.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        if (cs.animationName !== 'none')
          out.animations.push(
            `${el.className.baseVal ?? el.className} ${cs.animationDuration}/${cs.animationIterationCount}`,
          );
        if (el.classList?.contains('ck-hand')) out.hands.push(cs.animationName);
        if (el.shadowRoot) walk(el.shadowRoot);
      }
    };
    walk(document);
    return out;
  });
  const bad = motion.animations.filter((a) => !/ 0\.001s\/1$/.test(a));
  check(
    'motion: under reduced motion every animation is 1 ms and runs once',
    bad.length === 0,
    bad.slice(0, 4).join(' | '),
  );
  check(
    'motion: the clock hands stop sweeping',
    motion.hands.length > 0 && motion.hands.every((h) => h === 'none'),
    motion.hands.join(','),
  );
  await page.close();
}

/* ---------- heading icons: a fluvy: ref draws the inline glyph, an mdi: ref delegates to ha-icon ---------- */
{
  const { page } = await open('home-extras');
  const headings = page.locator('fluvy-heading-card');
  const living = headings.filter({ hasText: 'Living room' }).first();
  check(
    'heading: fluvy:home draws our glyph inline before the title',
    (await living.locator('.hm-section__icon svg').count()) === 1 &&
      (await living.locator('ha-icon').count()) === 0,
  );
  const scenes = headings.filter({ hasText: 'Scenes' }).first();
  check(
    'heading: mdi:sofa is handed to ha-icon',
    (await scenes.locator('.hm-section__icon ha-icon').count()) === 1,
  );
  const long = headings.filter({ hasText: 'A very long section title' }).first();
  const title = long.locator('.hm-section__title');
  const clipped = await title.evaluate(
    (el) => el.scrollWidth > el.clientWidth && getComputedStyle(el).textOverflow === 'ellipsis',
  );
  const metaVisible = await long.locator('.hm-section__meta').evaluate((el) => {
    const r = el.getBoundingClientRect();
    const card = el.closest('.hm-section').getBoundingClientRect();
    return r.right <= card.right + 0.5;
  });
  check(
    'heading: a long title ellipsises and the meta keeps its place on the right',
    clipped && metaVisible,
  );
  await page.close();
}

/* ---------- fitted pills: badges, chips and content-sized buttons stay on one line, text inside ---------- */
{
  const SHEETS = [
    'ambient',
    'calendar',
    'climate',
    'clocks',
    'devices-motion',
    'devices-security',
    'energy',
  ];
  const MORE = ['home-extras', 'home', 'inputs', 'lists', 'media', 'slider', 'solar'];
  const broken = [];
  let pills = 0;
  for (const sheet of [...SHEETS, ...MORE]) {
    for (const width of [300, 360, 480]) {
      const { page } = await open(sheet, width);
      const found = await page.evaluate(() => {
        const roots = [];
        const walk = (root) => {
          for (const el of root.querySelectorAll('*')) {
            if (el.shadowRoot) {
              roots.push(el.shadowRoot);
              walk(el.shadowRoot);
            }
          }
        };
        walk(document);
        const out = { count: 0, bad: [] };
        for (const root of roots)
          for (const pill of root.querySelectorAll('[data-fit]')) {
            const box = pill.getBoundingClientRect();
            if (!box.width || !pill.textContent.trim()) continue;
            out.count += 1;
            // the text's own line boxes (an icon beside it sits on another top): more than one top = it wrapped
            const texts = document.createTreeWalker(pill, NodeFilter.SHOW_TEXT);
            const lines = new Set();
            let left = Infinity;
            let right = -Infinity;
            for (let node = texts.nextNode(); node; node = texts.nextNode()) {
              if (!node.textContent.trim()) continue;
              const range = document.createRange();
              range.selectNodeContents(node);
              for (const r of range.getClientRects()) {
                if (r.width < 0.5) continue;
                lines.add(Math.round(r.bottom));
                left = Math.min(left, r.left);
                right = Math.max(right, r.right);
              }
            }
            if (lines.size > 1 || left < box.left - 0.5 || right > box.right + 0.5)
              out.bad.push(`${pill.textContent.trim().slice(0, 24)} (${lines.size} lines)`);
          }
        return out;
      });
      pills += found.count;
      broken.push(...found.bad.map((b) => `${sheet}@${width}: ${b}`));
      await page.close();
    }
  }
  check(
    `fitted pills stay on one line (${pills} across 14 sheets × 3 widths)`,
    broken.length === 0,
    broken.slice(0, 6).join('; '),
  );
}

/* ---------- solid fills: what is drawn on an "on" tile takes the fill's ink, in every palette and mode ---------- */
{
  // the ruler has a shadow root of its own: the tile's rule reaches it only through the attribute it is given
  const PALETTES = [
    'linen',
    'sand',
    'sage',
    'mist',
    'clay',
    'slate',
    'harbour',
    'dusk',
    'ember',
    'blaze',
    'flamingo',
    'iris',
    'volt',
    'mint',
    'noir',
  ];
  const wrong = [];
  let tiles = 0;
  for (const mode of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
    await page.goto(`${BASE}?sheet=home&width=360&mode=${mode}&compare=${PALETTES.join(',')}`);
    await page.waitForSelector('html[data-ready="1"]');
    await page.waitForTimeout(700);
    const found = await page.evaluate(() => {
      const deep = (root) => [
        root,
        ...[...root.querySelectorAll('*')].flatMap((el) =>
          el.shadowRoot ? deep(el.shadowRoot) : [],
        ),
      ];
      const colour = (host, value) => {
        const probe = document.createElement('i');
        probe.style.color = value;
        host.append(probe);
        const out = getComputedStyle(probe).color;
        probe.remove();
        return out;
      };
      const out = [];
      for (const root of deep(document)) {
        for (const tile of root.querySelectorAll?.('.fv-tile.is-on') ?? []) {
          const ruler = tile.querySelector('fluvy-ruler');
          const lit = ruler?.shadowRoot?.querySelector('.tk-on');
          if (!lit) continue;
          const want = colour(tile, 'var(--tone-fill-ink)');
          const got = getComputedStyle(lit).stroke;
          // the knob's halo cuts the ticks in the tile's own colour on a solid fill (the card's on a tint)
          const knob = ruler.shadowRoot.querySelector('.fv-knob');
          const halo = knob
            ? colour(ruler.shadowRoot.querySelector('.fv-ruler') ?? tile, 'var(--knob-halo)')
            : '';
          const haloWant = colour(
            tile,
            'color-mix(in srgb, var(--tone-fill) var(--fluvy-solid, 0%), var(--fluvy-card))',
          );
          out.push({
            palette:
              tile.closest?.('[data-look]')?.dataset.look ??
              root.host?.closest('[data-look]')?.dataset.look,
            want,
            got,
            halo: knob ? halo === haloWant : true,
          });
        }
      }
      return out;
    });
    tiles += found.length;
    for (const f of found) {
      if (f.want !== f.got) wrong.push(`${mode} ${f.palette}: ${f.got} ≠ ${f.want}`);
      if (!f.halo) wrong.push(`${mode} ${f.palette}: the knob's halo is not the tile's`);
    }
    await page.close();
  }
  check(
    `a ruler on an "on" tile draws in the fill's ink, its knob cut by the tile (${tiles} tiles, 15 palettes × 2 modes)`,
    tiles >= 30 && wrong.length === 0,
    wrong.slice(0, 4).join('; '),
  );
}

await suite.finish();
