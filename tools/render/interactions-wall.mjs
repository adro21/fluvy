/**
 * The wall in a real Chromium against the playground: the page as a wall panel on the real controller —
 * no chrome attribute without a touch, the screensaver after the minutes, the touch that wakes it reaching no
 * card, the corner's button that pauses (there while someone is, gone at rest, the notice and Resume, the wall back
 * by itself when the screensaver would have come), the corner's hold that pauses when the house chose it (a
 * shorter hold does nothing), and the night.
 *
 *   PLAYGROUND=http://127.0.0.1:5183/ node interactions-wall.mjs
 */
import { calls, settle, startSuite } from './lib/suite.mjs';

const suite = await startSuite();
const { check } = suite;
const WALL = 'sheet=home&wall=1&after=10';
const HOLD = `${WALL}&exit=hold`;
const VIEWPORT = { width: 1024, height: 768 };

const phase = (page) => page.evaluate(() => window.fluvyWall?.phase() ?? 'none');
const walled = (page) => page.evaluate(() => document.documentElement.hasAttribute('fluvy-wall'));
const ready = async (page) => {
  await page.waitForFunction(() => window.fluvyWall?.on() === true, null, { timeout: 8000 });
  await settle(page, 200);
};

/* ---------- the way out by default: a button in the corner ---------- */
{
  const page = await suite.page(WALL, { viewport: VIEWPORT, clock: true });
  await ready(page);
  const button = page.locator('fluvy-wall-corner button');
  const shown = () =>
    button.evaluate(
      (el) => getComputedStyle(el).opacity === '1' && getComputedStyle(el).pointerEvents !== 'none',
    );
  await page.clock.runFor(400);
  check(
    'the wall comes with its way out: a × in the corner',
    (await button.count()) === 1 && (await shown()),
  );
  await page.clock.runFor(7000);
  await settle(page, 300);
  check('at rest the × is gone, and takes no touch', !(await shown()));
  await page.mouse.move(400, 300);
  await page.mouse.move(420, 320);
  await page.clock.runFor(400);
  await settle(page, 300);
  check('a pointer that moves brings it back', await shown());
  const device = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('fluvy:device') ?? '{}').wall);
  await button.click();
  await page.clock.runFor(300);
  await settle(page, 300);
  check(
    'a tap pauses the wall: the chrome back, the device still a wall, the notice with Resume',
    (await phase(page)) === 'paused' &&
      !(await walled(page)) &&
      (await device()) === true &&
      ((await page.locator('fluvy-wall-toast .toast').textContent()) ?? '').includes('Wall paused'),
    `${await phase(page)} · device ${await device()}`,
  );
  await page.locator('fluvy-wall-toast button').click();
  await page.clock.runFor(300);
  await settle(page, 300);
  check(
    'Resume makes it a wall again',
    (await phase(page)) === 'awake' && (await walled(page)) && (await device()) === true,
  );
  await page.locator('fluvy-wall-corner button').click();
  await page.clock.runFor(10 * 60_000 + 1000);
  await settle(page, 300);
  check(
    'left alone, the wall comes back by itself when the screensaver would have, the device still a wall',
    (await page.locator('fluvy-wall-toast').count()) === 0 &&
      (await phase(page)) === 'awake' &&
      (await device()) === true,
    `${await phase(page)} · device ${await device()}`,
  );
  await page.close();
}

/* ---------- awake: the corner alone (the house chose the hold) ---------- */
{
  const page = await suite.page(HOLD, { viewport: VIEWPORT, clock: true });
  await ready(page);
  check(
    'the page is a wall: the attribute, awake',
    (await walled(page)) && (await phase(page)) === 'awake',
  );
  check(
    'the corner is there and the screensaver is not',
    (await page.locator('fluvy-wall-corner').count()) === 1 &&
      (await page.locator('fluvy-wall-screensaver').count()) === 0,
  );

  /* ---------- the screensaver after ten minutes; a touch wakes it and reaches no card ---------- */
  await page.clock.runFor(10 * 60_000 + 1000);
  await settle(page, 400);
  check(
    'ten idle minutes bring the screensaver',
    (await phase(page)) === 'asleep' &&
      (await page.locator('fluvy-wall-screensaver dialog').count()) === 1,
  );
  const before = (await calls(page)).length;
  await page.mouse.click(512, 384);
  await page.clock.runFor(250);
  await settle(page, 100);
  check(
    'the touch wakes the wall in under a quarter second and does nothing else',
    (await phase(page)) === 'awake' &&
      (await page.locator('fluvy-wall-screensaver').count()) === 0 &&
      (await calls(page)).length === before,
    `${await phase(page)} · calls ${(await calls(page)).length - before}`,
  );

  /* ---------- the corner: a second holds nothing, a second and a half pauses ---------- */
  const corner = page.locator('fluvy-wall-corner');
  const box = await corner.boundingBox();
  await page.mouse.move(box.x + 22, box.y + 22);
  await page.mouse.down();
  await page.clock.runFor(1000);
  await page.mouse.up();
  await settle(page, 100);
  check(
    'a hold of one second leaves the wall as it is',
    (await phase(page)) === 'awake' && (await walled(page)),
  );
  await page.mouse.down();
  await page.clock.runFor(1600);
  await page.mouse.up();
  await settle(page, 300);
  check(
    'a hold of a second and a half pauses the wall: the chrome back, the toast',
    (await phase(page)) === 'paused' &&
      !(await walled(page)) &&
      (await page.locator('fluvy-wall-toast').count()) === 1,
    await phase(page),
  );
  await page.locator('fluvy-wall-toast button').click();
  await settle(page, 300);
  check('Resume brings the wall back', (await phase(page)) === 'awake' && (await walled(page)));
  await page.close();
}

/* ---------- the night: dark forced on every card, the veil over the page ---------- */
{
  const page = await suite.page(`${WALL}&moment=night`, { viewport: VIEWPORT });
  await ready(page);
  const dark = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('fluvy-tile-card')];
    return cards.length > 0 && cards.every((card) => card.hasAttribute('dark'));
  });
  const veil = await page.evaluate(() => {
    const layer = document.querySelector('[data-fluvy-wall-dim]');
    return layer ? getComputedStyle(layer).opacity : null;
  });
  check(
    'the night forces dark on the cards and lays the veil at 40 %',
    dark && veil === '0.4',
    `dark ${dark} · veil ${veil}`,
  );
  await page.close();
}

await suite.finish();
