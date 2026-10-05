// Optional real-media regression test. Supply an installed Playwright module
// and browser via PLAYWRIGHT_MODULE_PATH / BROWSER_EXECUTABLE if needed.
// Start Astro locally first; payment responses are intercepted, never sent.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({ headless: true,
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  let requests = 0;
  await page.addInitScript(() => {
    window.releaseClips = []; window.releaseCalls = [];
    const originalPlay = HTMLMediaElement.prototype.play;
    const originalPause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.pause = function (...args) {
      if (this.src.endsWith('buttonclickrelease.ogg')) {
        window.releaseCalls.push({ op: 'pause', time: this.currentTime, paused: this.paused });
      }
      return originalPause.apply(this, args);
    };
    HTMLMediaElement.prototype.play = function (...args) {
      if (this.src.endsWith('buttonclickrelease.ogg')) {
        if (!window.releaseSource) {
          window.releaseSource = window.releaseRenderer.createMediaElementSource(this);
          window.releaseSource.connect(window.recorder);
          this.addEventListener('ended', () => {
            window.releaseClips[window.releaseClips.length - 1].ended = true;
          });
        }
        window.releaseRenderer.resume();
        window.releaseCalls.push({ op: 'play', time: this.currentTime });
        window.releaseClips.push({ samples: [], ended: false });
        window.recorder.port.postMessage(window.releaseClips.length - 1);
      }
      return originalPlay.apply(this, args);
    };
  });
  await page.route('**/api/support/crypto/payment', route => {
    requests++;
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({
      environment: 'sandbox', orderId: '74ee8dc8-3b87-44f9-81e0-bd3fd5d6d17d', paymentId: '123456789',
      amount: 20, asset: 'usdc', priceCurrency: 'usd', network: 'solana',
      payAmount: '20.123456789', payAddress: 'synthetic-audio-test-address',
    }) });
  });
  await page.goto(process.env.UI_AUDIO_TEST_URL || 'http://localhost:4321/support', { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    window.releaseRenderer = new AudioContext();
    const code = `class Recorder extends AudioWorkletProcessor {
      constructor() { super(); this.id = -1; this.port.onmessage = e => this.id = e.data; }
      process(inputs, outputs) {
        const input = inputs[0];
        for (let c = 0; c < outputs[0].length; c++) if (input[c]) outputs[0][c].set(input[c]);
        if (input[0] && this.id >= 0) this.port.postMessage({ id: this.id, samples: input[0] });
        return true;
      }
    } registerProcessor('release-recorder', Recorder);`;
    const url = URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
    await window.releaseRenderer.audioWorklet.addModule(url); URL.revokeObjectURL(url);
    window.recorder = new AudioWorkletNode(window.releaseRenderer, 'release-recorder');
    window.recorder.connect(window.releaseRenderer.destination);
    window.recorder.port.onmessage = e => window.releaseClips[e.data.id]?.samples.push(...e.data.samples);
  });
  const count = () => page.evaluate(() => window.releaseClips.length);
  const waitComplete = index => page.waitForFunction(i => {
    const clip = window.releaseClips[i];
    // Wait for media completion AND the recorder to receive the rendered tail.
    return clip?.ended && clip.samples.length > window.releaseRenderer.sampleRate * 0.25;
  }, index);
  const activate = async selector => {
    const before = await count(); await page.locator(selector).click();
    assert.equal(await count(), before + 1, selector);
    await waitComplete(before);
  };
  await activate('[data-open-support-page="crypto"]');
  await activate('[data-crypto-anonymous]');
  const repeated = async selector => {
    const start = await count();
    for (let i = 0; i < 5; i++) await activate(selector);
    const clips = await page.evaluate(start => window.releaseClips.slice(start).map(clip => {
      let energy = 0, first = -1, last = -1;
      clip.samples.forEach((sample, index) => {
        energy += sample * sample;
        if (Math.abs(sample) > 0.0001) { if (first < 0) first = index; last = index; }
      });
      return { energy, activeSeconds: (last - first) / window.releaseRenderer.sampleRate, ended: clip.ended };
    }), start);
    for (const clip of clips) {
      assert.ok(clip.ended); assert.ok(clip.activeSeconds > 0.14, 'rendered release tail was truncated');
      assert.ok(Math.abs(clip.energy / clips[0].energy - 1) < 0.01, 'repeat lost rendered audio energy');
    }
    const before = await count();
    await page.locator(selector).dblclick({ delay: 45 });
    assert.equal(await count(), before + 1, 'same-control burst must not interrupt the active cue');
    await waitComplete(before);
    console.log(`${selector}: five complete decoded playbacks and rapid same-control activation passed`);
  };
  await repeated('[data-crypto-amount="20"]');
  await activate('[data-crypto-amount-continue]');
  await activate('[data-crypto-edit="amount"]');await activate('[data-crypto-edit="identity"]');
  await activate('[data-crypto-anonymous]');await activate('[data-crypto-amount-continue]');
  await repeated('.crypto-currency-option:has([value="usdc"])');
  for (const asset of ['btc', 'eth', 'sol', 'doge', 'usdt', 'usdc']) {
    await page.locator(`.crypto-currency-option:has([value="${asset}"])`).hover();
  }
  await activate('[data-crypto-create]');
  await page.locator('[data-crypto-step="payment"]').waitFor({ state: 'visible' });
  await activate('[data-crypto-step="payment"] [data-support-back]');
  await activate('[data-open-support-page="fiat"]');
  await page.locator('[data-fiat-display-name]').fill('Example');await activate('[data-fiat-continue]');
  await repeated('[data-fiat-amount="20"]');
  assert.equal(requests, 1);
  console.log('Full Crypto flow, both back steps, rapid currency hover, and existing Fiat controls passed.');
} finally { await browser.close(); }
