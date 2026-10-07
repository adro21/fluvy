// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FluvyRuler, type RulerWindowDetail } from '../controls/ruler.js';
import { setMotionPreference } from '../motion.js';

if (!customElements.get('fluvy-ruler')) customElements.define('fluvy-ruler', FluvyRuler);

const HOLD = 450;

async function ruler(options: Partial<FluvyRuler> = {}) {
  const node = document.createElement('fluvy-ruler') as FluvyRuler;
  node.value = 50;
  node.min = 0;
  node.max = 100;
  node.step = 1;
  node.length = 320;
  Object.assign(node, options);
  document.body.append(node);
  await node.updateComplete;
  const windows: RulerWindowDetail[] = [];
  node.addEventListener('fluvy-window', (event) =>
    windows.push((event as CustomEvent<RulerWindowDetail>).detail),
  );
  const scale = node.shadowRoot!.querySelector<HTMLElement>('.fv-ruler')!;
  const press = () =>
    scale.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 160,
        clientY: 22,
        pointerId: 1,
        pointerType: 'touch',
        bubbles: true,
      }),
    );
  const lift = () =>
    scale.dispatchEvent(
      new PointerEvent('pointerup', {
        clientX: 160,
        clientY: 22,
        pointerId: 1,
        pointerType: 'touch',
        bubbles: true,
      }),
    );
  return { node, windows, press, lift };
}

describe('the ruler’s fine scale', () => {
  beforeEach(() => {
    setMotionPreference('reduced');
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
    setMotionPreference('system');
  });

  it('is off by default: a still press never zooms the scale', async () => {
    const { node, windows, press, lift } = await ruler();
    expect(node.fineAdjust).toBe(false);
    press();
    vi.advanceTimersByTime(HOLD * 3);
    expect(node.fine).toBeNull();
    expect(windows).toEqual([]);
    lift();
    expect(node.fine).toBeNull();
  });

  it('comes up on a still press when the card asks for it', async () => {
    const { node, windows, press, lift } = await ruler({ fineAdjust: true });
    press();
    vi.advanceTimersByTime(HOLD - 1);
    expect(node.fine).toBeNull();
    vi.advanceTimersByTime(1);
    expect(node.fine).not.toBeNull();
    const [lo, hi] = node.fine!;
    expect(hi - lo).toBeCloseTo(10); // a tenth of 0–100
    expect(windows.length).toBe(1);
    expect(windows[0]!.fine).toBe(true);
    lift();
    expect(node.fine).toBeNull();
    expect(windows.length).toBe(2);
    expect(windows[1]!.fine).toBe(false);
  });

  it('reads the fine-adjust attribute as a card writes it', async () => {
    const { node } = await ruler();
    node.setAttribute('fine-adjust', '');
    await node.updateComplete;
    expect(node.fineAdjust).toBe(true);
    node.removeAttribute('fine-adjust');
    await node.updateComplete;
    expect(node.fineAdjust).toBe(false);
  });
});
