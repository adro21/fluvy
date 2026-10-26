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

describe('a drag that ends without a release', () => {
  beforeEach(() => setMotionPreference('reduced'));
  afterEach(() => {
    document.body.replaceChildren();
    setMotionPreference('system');
  });

  async function gesture() {
    const { node } = await ruler();
    const scale = node.shadowRoot!.querySelector<HTMLElement>('.fv-ruler')!;
    const changes: number[] = [];
    let cancels = 0;
    node.addEventListener('fluvy-change', (event) =>
      changes.push((event as CustomEvent<{ value: number }>).detail.value),
    );
    node.addEventListener('fluvy-cancel', () => cancels++);
    const fire = (type: string, clientX: number, clientY: number) =>
      scale.dispatchEvent(
        new PointerEvent(type, {
          clientX,
          clientY,
          pointerId: 1,
          pointerType: 'touch',
          bubbles: true,
        }),
      );
    return { node, changes, cancels: () => cancels, fire };
  }

  it('sends nothing when the page takes a vertical scroll that began on the scale', async () => {
    const { node, changes, cancels, fire } = await gesture();
    fire('pointerdown', 160, 22);
    fire('pointermove', 163, 60);
    fire('pointercancel', 163, 60);
    expect(changes).toEqual([]);
    expect(cancels()).toBe(1);
    expect(node.value).toBe(50);
  });

  it('sends nothing when a sideways drag is cancelled midway', async () => {
    const { changes, fire } = await gesture();
    fire('pointerdown', 160, 22);
    fire('pointermove', 260, 24);
    fire('pointercancel', 260, 24);
    expect(changes).toEqual([]);
  });

  it('sends nothing when the capture is lost', async () => {
    const { changes, fire } = await gesture();
    fire('pointerdown', 160, 22);
    fire('pointermove', 260, 24);
    fire('lostpointercapture', 260, 24);
    expect(changes).toEqual([]);
  });

  it('still sends the value a lifted finger chose', async () => {
    const { changes, cancels, fire } = await gesture();
    fire('pointerdown', 160, 22);
    fire('pointermove', 260, 24);
    fire('pointerup', 260, 24);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toBeGreaterThan(50);
    expect(cancels()).toBe(0);
  });
});
