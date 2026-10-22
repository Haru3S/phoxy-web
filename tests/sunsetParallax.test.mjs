import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';

const bundle = await build({
  entryPoints: ['src/scripts/sunsetParallax.ts'],
  bundle: true, write: false, platform: 'browser', format: 'iife',
});
const flush = () => new Promise(resolve => setImmediate(resolve));

function harness({ reduced = false, webgl = true, shader = true, delayed = false, failedAsset = '' } = {}) {
  const stats = { contexts: 0, draws: 0, uploads: 0, textureDeletes: 0, bufferDeletes: 0,
    programDeletes: 0, shaderDeletes: 0, loads: [], offsets: [] };
  const frames = new Map(), observers = [], images = [], elements = new Map();
  let nextFrame = 0;
  class Element extends EventTarget {
    clientWidth = 1200; clientHeight = 600; isConnected = true;
    children = []; attributes = new Map();
    append(child) { child.parentElement = this; this.children.push(child); }
    remove() {
      if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this);
    }
    querySelector() { return this.fallback ?? null; }
    setAttribute(name, value) { this.attributes.set(name, value); }
    hasAttribute(name) { return this.attributes.has(name); }
    removeAttribute(name) { this.attributes.delete(name); }
    getBoundingClientRect() { return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }; }
  }
  const gl = new Proxy({
    MAX_TEXTURE_SIZE: 1, NO_ERROR: 0, COMPILE_STATUS: 2,
    createShader: () => ({}), createProgram: () => ({}), createBuffer: () => ({}), createTexture: () => ({}),
    getParameter: () => 4096, getShaderParameter: () => shader, getProgramParameter: () => true,
    getShaderInfoLog: () => 'injected shader failure', getUniformLocation: (_, name) => name,
    getAttribLocation: () => 0, getError: () => 0, getExtension: () => ({ loseContext() {} }),
    texImage2D: () => stats.uploads++,
    drawArrays: () => stats.draws++,
    deleteTexture: () => stats.textureDeletes++,
    deleteBuffer: () => stats.bufferDeletes++,
    deleteProgram: () => stats.programDeletes++,
    deleteShader: () => stats.shaderDeletes++,
    uniform2f: (location, x, y) => { if (location === 'uOffset') stats.offsets.push([x, y]); },
  }, { get: (target, key) => key in target ? target[key] : () => {} });
  class Canvas extends Element {
    width = 300; height = 150;
    getContext(type) {
      if (type === '2d') return { drawImage() {} };
      stats.contexts++;
      return webgl ? gl : null;
    }
  }
  class Image {
    naturalWidth = 5184; naturalHeight = 3456;
    width = 5184; height = 3456;
    constructor() { images.push(this); }
    set src(value) {
      if (!value) return;
      stats.loads.push(value);
      if (!delayed) queueMicrotask(() => {
        if (value.includes(failedAsset) && failedAsset) this.onerror?.();
        else this.onload?.();
      });
    }
  }
  class Observer {
    disconnected = false;
    constructor(callback, options = {}) { this.callback = callback; this.options = options; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
    emit(visible) { this.callback([{ isIntersecting: visible }]); }
  }
  const motion = new EventTarget();
  motion.matches = reduced;
  const document = new EventTarget();
  document.hidden = false;
  document.createElement = () => new Canvas();
  const window = new EventTarget();
  window.devicePixelRatio = 3;
  runInNewContext(bundle.outputFiles[0].text, {
    HTMLElement: Element, Image, IntersectionObserver: Observer, ResizeObserver: Observer,
    matchMedia: () => motion, window, document, AbortController, DOMException,
    requestAnimationFrame: callback => { const id = ++nextFrame; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    customElements: { get: name => elements.get(name), define: (name, type) => elements.set(name, type) },
    console: { warn() {} },
  });
  const element = new (elements.get('sunset-parallax'))();
  const fallback = new EventTarget();
  fallback.style = {};
  fallback.complete = false;
  fallback.naturalWidth = 5184;
  element.fallback = fallback;
  element.connectedCallback();
  const preload = observers.find(observer => observer.options.rootMargin);
  const viewport = observers.find(observer => !observer.options.rootMargin);
  return {
    element, fallback, stats, frames, observers, images, motion, document, window, preload, viewport,
    tick(time) { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(time)); },
    setMotion(value) { motion.matches = value; motion.dispatchEvent(new Event('change')); },
    disconnect() { element.isConnected = false; element.disconnectedCallback(); },
    async show() { preload.emit(true); viewport.emit(true); await flush(); },
  };
}

test('initial reduced motion and distant artwork allocate no WebGL resources', async () => {
  const distant = harness();
  await flush();
  assert.equal(distant.stats.contexts, 0);
  assert.equal(distant.stats.loads.length, 0);
  const reduced = harness({ reduced: true });
  await reduced.show();
  assert.equal(reduced.stats.contexts, 0);
  assert.equal(reduced.stats.loads.length, 0);
  distant.disconnect();
  reduced.disconnect();
});

test('preload is separate from playback; offscreen and hidden tabs stop and resume', async () => {
  const h = harness();
  h.preload.emit(true);
  await flush();
  assert.equal(h.stats.uploads, 2);
  assert.equal(h.frames.size, 0);
  h.viewport.emit(true);
  h.tick(1000);
  h.tick(1016);
  assert.equal(h.stats.draws, 2);
  h.viewport.emit(false);
  assert.equal(h.frames.size, 0);
  h.viewport.emit(true);
  h.document.hidden = true;
  h.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(h.frames.size, 0);
  h.document.hidden = false;
  h.document.dispatchEvent(new Event('visibilitychange'));
  h.tick(50000);
  assert.equal(h.stats.uploads, 2);
  const canvas = h.element.children[0];
  assert.equal(canvas.width, 1530, 'DPR capped at 1.5 with 0.85 resolution scale');
  h.disconnect();
});

test('camera displacement stays bounded and pointer exit eases toward ambient motion', async () => {
  const h = harness();
  await h.show();
  const pointer = new Event('pointermove');
  Object.assign(pointer, { pointerType: 'mouse', clientX: 1200, clientY: 600 });
  h.element.dispatchEvent(pointer);
  for (let time = 1000; time < 40000; time += 100) h.tick(time);
  const beforeExit = h.stats.offsets.at(-1);
  h.element.dispatchEvent(new Event('pointerleave'));
  h.tick(40000);
  const afterExit = h.stats.offsets.at(-1);
  assert.ok(Math.abs(beforeExit[0] - afterExit[0]) < 0.001, 'no snap on exit');
  assert.ok(h.stats.offsets.every(([x, y]) => Math.hypot(x * 1200, y * 600) <= 8));
  assert.equal(h.stats.uploads, 2);
  h.disconnect();
});

test('live motion changes release resources and can initialize again', async () => {
  const h = harness();
  await h.show();
  h.setMotion(true);
  assert.equal(h.element.children.length, 0);
  assert.equal(h.frames.size, 0);
  assert.equal(h.stats.textureDeletes, 2);
  h.setMotion(false);
  await flush();
  assert.equal(h.stats.uploads, 4);
  h.disconnect();
  assert.equal(h.stats.textureDeletes, 4);
  assert.equal(h.stats.bufferDeletes, 2);
  assert.equal(h.stats.programDeletes, 2);
  assert.equal(h.stats.shaderDeletes, 4);
  assert.ok(h.observers.every(observer => observer.disconnected));
  h.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(h.frames.size, 0);
});

test('delayed media change events still dispose on the next animation frame', async () => {
  const h = harness();
  await h.show();
  h.motion.matches = true;
  h.tick(1000);
  assert.equal(h.element.children.length, 0);
  assert.equal(h.frames.size, 0);
  h.disconnect();
});

test('context loss reveals the photograph and restoration builds fresh resources', async () => {
  const h = harness();
  await h.show();
  h.tick(1000);
  const lost = new Event('webglcontextlost', { cancelable: true });
  h.element.children[0].dispatchEvent(lost);
  assert.equal(lost.defaultPrevented, true);
  assert.equal(h.element.hasAttribute('data-rendered'), false);
  assert.equal(h.frames.size, 0);
  h.element.children[0].dispatchEvent(new Event('webglcontextrestored'));
  await flush();
  assert.equal(h.stats.uploads, 4);
  h.tick(2000);
  assert.equal(h.element.hasAttribute('data-rendered'), true);
  h.disconnect();
});

for (const [label, options] of [
  ['no WebGL', { webgl: false }],
  ['shader failure', { shader: false }],
  ['depth failure', { failedAsset: 'depth.png' }],
  ['image failure', { failedAsset: 'background.webp' }],
]) {
  test(label + ' leaves the static component without retrying or leaking resources', async () => {
    const h = harness(options);
    await h.show();
    assert.equal(h.element.children.length, 0);
    assert.equal(h.frames.size, 0);
    h.viewport.emit(false);
    h.viewport.emit(true);
    await flush();
    assert.equal(h.stats.contexts, 1, 'failed initialization must not poll or retry');
    h.disconnect();
  });
}

test('removal during image loading cancels setup and reconnect remains possible', async () => {
  const h = harness({ delayed: true });
  h.preload.emit(true);
  h.disconnect();
  for (const image of h.images) image.onload?.();
  await flush();
  assert.equal(h.stats.uploads, 0);
  assert.equal(h.element.children.length, 0);
  assert.equal(h.frames.size, 0);
  h.element.isConnected = true;
  h.element.connectedCallback();
  h.element.disconnectedCallback();
  assert.equal(h.frames.size, 0);
});

test('a failed fallback image is hidden without changing the component dimensions', () => {
  const h = harness();
  h.fallback.dispatchEvent(new Event('error'));
  assert.equal(h.fallback.style.visibility, 'hidden');
  assert.equal(h.element.clientHeight, 600);
  h.disconnect();
});
