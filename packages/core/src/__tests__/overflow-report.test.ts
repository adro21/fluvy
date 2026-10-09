// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { formatOverflow, measureOverflow } from '../look/overflow-report.js';

describe('the overflow report', () => {
  it('says the page fits when nothing reaches past the screen', () => {
    document.body.innerHTML = '<div id="a"><p class="x y">text</p></div>';
    expect(measureOverflow(document, window)).toBeNull();
    expect(formatOverflow(null, 'Safari')).toBe('ok: the page fits (Safari)');
  });

  it('names what reaches past the screen, widest first, with its ancestors', () => {
    document.body.innerHTML = '<div id="a"><p class="x y">text</p><span id="b">more</span></div>';
    const p = document.querySelector('p')!;
    const span = document.querySelector('span')!;
    const rect = (left: number, width: number) =>
      ({ left, right: left + width, width, top: 0, bottom: 10, height: 10 }) as DOMRect;
    p.getBoundingClientRect = () => rect(10, 900);
    span.getBoundingClientRect = () => rect(0, 500);
    Object.defineProperty(document.scrollingElement!, 'scrollWidth', {
      get: () => 910,
      configurable: true,
    });
    Object.defineProperty(window, 'innerWidth', { get: () => 390, configurable: true });
    const report = measureOverflow(document, window)!;
    expect(report.innerWidth).toBe(390);
    expect(report.pageWidth).toBe(910);
    expect(report.wide[0]).toBe('p.x.y 10..910 (900)');
    expect(report.wide[1]).toBe('span#b 0..500 (500)');
    expect(report.path).toEqual(['html', 'body', 'div#a', 'p.x.y']);
    // the holder: the container whose scrollable width carries the page out, with its children laid bare
    Object.defineProperty(document.getElementById('a')!, 'scrollWidth', {
      get: () => 910,
      configurable: true,
    });
    const held = measureOverflow(document, window)!;
    expect(held.holders).toContain('div#a 0/910');
    expect(held.holderPath).toEqual(['html', 'body', 'div#a']);
    expect(held.inside[0]).toMatch(/^p\.x\.y 10\.\.910 \(900\)/);
    expect(formatOverflow(held, 'iPhone')).toContain('deepest: html > body > div#a');
    const text = formatOverflow(report, 'iPhone');
    expect(text).toContain('page 910 in a window of 390, scrolled 0 (iPhone)');
    expect(text).toContain('path: html > body > div#a > p.x.y');
  });
});
