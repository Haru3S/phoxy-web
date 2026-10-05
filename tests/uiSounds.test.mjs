import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';

const bundle = await build({ entryPoints: ['src/scripts/uiSounds.ts'], bundle: true,
  write: false, platform: 'browser', format: 'iife' });

function harness(ready = true) {
  const listeners = new Map(), audio = [];
  class Element {
    constructor(kind, parent = null) { this.kind = kind; this.parent = parent; }
    matches(selector) {
      if (selector === ':disabled') return Boolean(this.disabled || this.parent?.fieldsetDisabled);
      if (selector === '.scout-button') return Boolean(this.scout);
      return selector.split(',').some(part => part.trim() === this.kind);
    }
    closest(selector) { return this.matches(selector) || (selector === '[data-ui-sound="off"]' && this.off)
      ? this : this.parent?.closest(selector) ?? null; }
    getAttribute(name) { return name === 'aria-disabled' && this.ariaDisabled ? 'true' : null; }
  }
  class Button extends Element { constructor(parent) { super('button', parent); } }
  class Input extends Element { constructor(type, parent) { super(`input[type="${type}"]`, parent); } }
  class Audio {
    readyState = ready ? 2 : 0; plays = 0; pauses = 0; currentTime = 0;
    paused = true; ended = false; duration = 0.15; completions = 0;
    listeners = new Map();
    constructor() { audio.push(this); }
    load() {}
    pause() { this.pauses++; this.paused = true; }
    play() { this.plays++; this.paused = false; this.ended = false; return Promise.resolve(); }
    advance(seconds) {
      if (this.paused) return;
      this.currentTime = Math.min(this.duration, this.currentTime + seconds);
      if (this.currentTime === this.duration) {
        this.paused = true; this.ended = true; this.completions++;
      }
    }
    addEventListener(type, listener) { this.listeners.set(type, listener); }
  }
  const document = { addEventListener(type, listener, options) {
    const list = listeners.get(type) ?? []; list.push({ listener, capture: options?.capture }); listeners.set(type, list);
  } };
  runInNewContext(bundle.outputFiles[0].text, { document, Element, HTMLButtonElement: Button,
    HTMLInputElement: Input, HTMLMediaElement: { HAVE_CURRENT_DATA: 2 }, Audio });
  const emit = (type, target, extra = {}, localHandler = () => {}) => {
    const event = { target, pointerType: 'mouse', relatedTarget: null, preventDefault() { this.prevented = true; }, ...extra };
    const handlers = listeners.get(type) ?? [];
    handlers.filter(x => x.capture).forEach(x => x.listener(event)); localHandler();
    handlers.filter(x => !x.capture).forEach(x => x.listener(event)); return event;
  };
  return { audio, emit, Element, Button, Input };
}

test('labels, native choices and their children share one rollover and one release', () => {
  const { audio, emit, Element, Input } = harness();
  for (const type of ['radio', 'checkbox']) {
    const label = new Element('label'); const input = new Input(type, label); label.control = input;
    const text = new Element('span', label), icon = new Element('i', label);
    const hovers = audio[0].plays, clicks = audio[1].plays;
    emit('pointerover', text); emit('pointerover', icon, { relatedTarget: text });
    emit('pointerover', input, { relatedTarget: icon });
    assert.equal(audio[0].plays, hovers + 1);
    emit('click', text); emit('click', input);
    assert.equal(audio[1].plays, clicks + 1, 'forwarded label activation must not restart release twice');
    audio[1].advance(audio[1].duration);
    emit('click', input); assert.equal(audio[1].plays, clicks + 2, 'direct/keyboard activation works');
  }
});

test('multiple sequential activations of the same button/radio play full release cues', () => {
  for (const kind of ['button', 'radio']) {
    const { audio, emit, Button, Input } = harness();
    const control = kind === 'button' ? new Button() : new Input('radio');
    const release = audio[1];
    for (let activation = 1; activation <= 5; activation++) {
      emit('click', control); assert.equal(release.currentTime, 0);
      const pauses = release.pauses;
      release.advance(0.05); emit('pointerover', new Button());
      assert.equal(release.currentTime, 0.05); assert.equal(release.pauses, pauses);
      release.advance(0.10);
      assert.equal(release.completions, activation, 'each sequential activation reaches its end');
    }
    assert.equal(release.plays, 5);
  }
});

test('rapid same-control activation cannot reset playing or pending release; another control supersedes', () => {
  const { audio, emit, Button } = harness(); const first = new Button(), next = new Button();
  const release = audio[1];
  emit('click', first); emit('click', first); // Play is requested but has not advanced yet.
  assert.equal(release.plays, 1); assert.equal(release.pauses, 1);
  release.advance(0.06); emit('click', first); emit('click', first);
  assert.equal(release.currentTime, 0.06); assert.equal(release.pauses, 1);
  release.advance(0.09); assert.equal(release.completions, 1);
  emit('click', first); release.advance(0.04); emit('click', next);
  assert.equal(release.currentTime, 0); assert.equal(release.plays, 3);
  release.advance(0.15); assert.equal(release.completions, 2);
});

test('release eligibility is checked before a local handler disables or hides its control', () => {
  const { audio, emit, Button } = harness(); const button = new Button();
  emit('click', button, {}, () => { button.disabled = true; button.hidden = true; });
  assert.equal(audio[1].plays, 1);
  emit('click', button); assert.equal(audio[1].plays, 1);
});

test('existing links/buttons keep child rollover deduplication and disabled feedback', () => {
  const { audio, emit, Element, Button } = harness();
  for (const control of [new Element('a'), new Button(), new Element('[role="button"]')]) {
    const child = new Element('span', control), icon = new Element('i', control);
    const before = audio[0].plays;
    emit('pointerover', child); emit('pointerover', icon, { relatedTarget: child });
    assert.equal(audio[0].plays, before + 1);
    emit('click', child);
    control.ariaDisabled = true; const clicks = audio[1].plays, denies = audio[2].plays;
    emit('click', child); emit('pointerdown', child);
    assert.equal(audio[1].plays, clicks); assert.equal(audio[2].plays, denies + 1);
  }
});

test('stage changes do not own audio; rapid rollover replacement remains intentional', () => {
  const { audio, emit, Button } = harness(); const first = new Button(), next = new Button();
  emit('pointerover', first); audio[0].currentTime = 0.05;
  emit('click', first, {}, () => { first.hidden = true; next.hidden = false; });
  assert.equal(audio[0].pauses, 1, 'release/step change does not stop rollover');
  assert.equal(audio[0].currentTime, 0.05);
  emit('pointerover', next, { relatedTarget: first });
  assert.equal(audio[0].pauses, 2); assert.equal(audio[0].currentTime, 0);
  assert.equal(audio[1].pauses, 1, 'rollover does not stop release');
  assert.equal(audio.length, 3, 'no per-stage players');
  assert.deepEqual(audio.map(x => x.volume), [0.2, 0.25, 0.25]);
});

test('disabled, touch, opt-out and Scout behavior is preserved for buttons and choices', () => {
  const { audio, emit, Element, Button, Input } = harness();
  for (const control of [new Button(), new Input('radio'), new Input('checkbox')]) {
    control.disabled = true; emit('pointerover', control); emit('click', control);
    const before = audio[2].plays; emit('pointerdown', control);
    const key = emit('keydown', control, { key: ' ' });
    assert.equal(audio[2].plays, before + 2); assert.equal(key.prevented, true);
  }
  const fieldset = new Element('fieldset'); fieldset.fieldsetDisabled = true;
  emit('pointerover', new Input('radio', fieldset));
  const button = new Button(); emit('pointerover', button, { pointerType: 'touch' });
  for (const property of ['off','scout']) {
    const control = new Button(); control[property] = true;
    emit('pointerover', control); emit('click', control);
  }
  assert.equal(audio[0].plays, 0); assert.equal(audio[1].plays, 0);
});

test('preload readiness coalesces early rollovers and dynamic controls need no rebinding', () => {
  const { audio, emit, Button } = harness(false);
  emit('pointerover', new Button()); emit('pointerover', new Button());
  assert.equal(audio[0].plays, 0); audio[0].listeners.get('canplay')();
  assert.equal(audio[0].plays, 1);
  emit('pointerover', new Button()); assert.equal(audio[0].plays, 2);
});
