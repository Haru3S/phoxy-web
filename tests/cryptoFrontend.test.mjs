import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

// Exercise the real browser controller with a small DOM/event boundary. No
// server imports, real credentials, provider requests, or database calls.
const compiled = await build({ entryPoints: ['src/scripts/cryptoSupport.ts'], bundle: true,
  write: false, platform: 'browser', format: 'iife', globalName: 'cryptoFrontend' });
const assetBundle = await build({ entryPoints: ['src/lib/support/cryptoAssets.ts'], bundle: true,
  write: false, platform: 'node', format: 'esm' });
const { CRYPTO_ASSETS } = await import('data:text/javascript;base64,' + Buffer.from(assetBundle.outputFiles[0].text).toString('base64'));
class Element extends EventTarget {
  dataset = {}; hidden = false; disabled = false; checked = false; value = ''; textContent = '';
  attributes = new Map(); classes = new Set();
  classList = { contains: name => this.classes.has(name), toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name) };
  constructor(dataset = {}) { super(); this.dataset = dataset; }
  setAttribute(key, value) { this.attributes.set(key, value); }
  removeAttribute(key) { this.attributes.delete(key); }
  focus() { this.focused = true; }
  click() { if (!this.disabled) this.dispatchEvent(new Event('click')); }
  querySelector() { return new Element(); }
}
const attrToKey = attr => attr.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
function harness(fetchImpl, storage = new Map()) {
  const elements = [];
  const add = (key, value = '') => { const element = new Element({ [key]: value }); elements.push(element); return element; };
  for (const step of ['identity','amount','currency','payment']) add('cryptoStep', step);
  for (const key of ['cryptoDisplayName','cryptoNameError','cryptoCustomAmount','cryptoCustomContainer','cryptoAmountError',
    'cryptoAmountContinue','cryptoCreate','cryptoCreateLabel','cryptoMessage','cryptoRecovery','cryptoIdentityContinue',
    'cryptoAnonymous','cryptoPayAmount','cryptoPaySymbol','cryptoPayNetwork','cryptoPayAddress','cryptoPaymentId',
    'cryptoOrderId','cryptoSandbox','cryptoCopy','cryptoCopyFeedback','cryptoCurrencyAmount','cryptoQrImage','cryptoQrCaption']) add(key);
  for (let index = 0; index < 3; index++) { add('cryptoSupporterName'); add('cryptoSelectedAmount'); }
  for (const amount of [5,10,20,50]) add('cryptoAmount', String(amount));
  for (const target of ['identity','amount']) add('cryptoEdit', target);
  for (const [asset, data] of Object.entries(CRYPTO_ASSETS)) {
    const radio = add('cryptoCurrency'); radio.value = asset; radio.checked = asset === 'ltc';
    radio.dataset.network = data.network; radio.dataset.symbol = asset.toUpperCase();
  }
  const root = new Element(); root.classes.add('is-active');
  root.querySelectorAll = selector => elements.filter(element => selector.split(',').some(part => {
    const match = part.trim().match(/^\[(data-[\w-]+)(?:="([\w-]+)")?\]$/);
    return match && Object.hasOwn(element.dataset, attrToKey(match[1])) &&
      (match[2] === undefined || element.dataset[attrToKey(match[1])] === match[2]);
  }));
  root.querySelector = selector => root.querySelectorAll(selector)[0] ?? null;
  const sessionStorage = { getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  let copied;
  const context = { document: { readyState: 'complete', querySelector: () => root },
    sessionStorage, fetch: fetchImpl, AbortSignal, Intl, Object,
    navigator: { clipboard: { writeText: async value => { copied = value; } } } };
  runInNewContext(compiled.outputFiles[0].text, context);
  const get = key => elements.find(element => Object.hasOwn(element.dataset, key));
  const active = () => elements.find(element => element.dataset.cryptoStep && !element.hidden).dataset.cryptoStep;
  const select = asset => elements.filter(element => Object.hasOwn(element.dataset,'cryptoCurrency')).forEach(element => { element.checked = element.value === asset; });
  const proceed = (asset = 'ltc', anonymous = true) => {
    get(anonymous ? 'cryptoAnonymous' : 'cryptoIdentityContinue').click();
    elements.find(element => element.dataset.cryptoAmount === '20').click();
    get('cryptoAmountContinue').click(); select(asset);
  };
  return { get, elements, active, select, proceed, storage, copied: () => copied, root, qrPayload: context.cryptoFrontend.cryptoQrPayload };
}
const settle = () => new Promise(resolve => setTimeout(resolve, 0));
function instructions(body, overrides = {}) {
  return { environment: 'production', orderId: randomUUID(), paymentId: '123456789',
    amount: body.amount, asset: body.asset, priceCurrency: 'usd', network: CRYPTO_ASSETS[body.asset].network,
    payAmount: '0.000123456789123456789', payAddress: 'synthetic-provider-deposit-address', ...overrides };
}

test('named identity shares fiat validation/moderation; anonymous support discards names', async () => {
  let body;
  const ui = harness(async (_, options) => { body = JSON.parse(options.body); return Response.json(instructions(body), { status:201 }); });
  for (const name of ['a','bad name','admin','nazi_1488']) {
    ui.get('cryptoDisplayName').value = name; ui.get('cryptoIdentityContinue').click();
    assert.equal(ui.active(),'identity'); assert.equal(ui.get('cryptoNameError').hidden,false);
  }
  ui.get('cryptoDisplayName').value = 'PrivateDraft'; ui.proceed(); ui.get('cryptoCreate').click(); await settle();
  assert.equal(body.anonymous,true); assert.equal(Object.hasOwn(body,'displayName'),false);
  assert.ok(!JSON.stringify([...ui.storage.values()]).includes('PrivateDraft'));
  const named = harness(async (_, options) => { body = JSON.parse(options.body); return Response.json(instructions(body), { status:201 }); });
  named.get('cryptoDisplayName').value = '  Example  '; named.proceed('btc',false); named.get('cryptoCreate').click(); await settle();
  assert.equal(body.displayName,'Example'); assert.equal(body.anonymous,false);
});

test('preset/custom USD interaction enforces limits and precision and permits correction', () => {
  const ui = harness(() => { throw new Error('No request expected'); }); ui.get('cryptoAnonymous').click();
  ui.elements.find(element => element.dataset.cryptoAmount === '50').click();
  assert.equal(ui.get('cryptoSelectedAmount').textContent,'$50.00');
  const input = ui.get('cryptoCustomAmount'); input.dispatchEvent(new Event('focus'));
  assert.equal(ui.get('cryptoAmountContinue').disabled,true);
  for (const value of ['0.99','1000.01','1.001','NaN','-5','']) {
    input.value = value; input.dispatchEvent(new Event('input'));
    assert.equal(ui.get('cryptoAmountContinue').disabled,true,value);
  }
  input.value = '$1,000.00'; input.dispatchEvent(new Event('input')); input.dispatchEvent(new Event('blur'));
  assert.equal(input.value,'1000.00'); assert.equal(ui.get('cryptoSelectedAmount').textContent,'$1,000.00');
  ui.get('cryptoAmountContinue').click(); assert.equal(ui.active(),'currency');
});

test('all seven assets send internal IDs and render exact provider amount/address/network without claiming success', async () => {
  for (const asset of Object.keys(CRYPTO_ASSETS)) {
    let calls = 0;
    const ui = harness(async (url, options) => {
      calls++; assert.equal(url,'/api/support/crypto/payment');
      const body = JSON.parse(options.body); assert.equal(body.asset,asset);
      assert.deepEqual(Object.keys(body).sort(),['amount','anonymous','asset']);
      return Response.json(instructions(body), { status:201 });
    });
    ui.proceed(asset); ui.get('cryptoCreate').click(); await settle();
    assert.equal(ui.active(),'payment'); assert.equal(ui.get('cryptoPayAmount').textContent,'0.000123456789123456789');
    assert.equal(ui.get('cryptoPayAddress').textContent,'synthetic-provider-deposit-address');
    assert.equal(ui.get('cryptoPayNetwork').textContent,CRYPTO_ASSETS[asset].network.toUpperCase());
    const qr = ui.get('cryptoQrImage');
    assert.equal(qr.hidden,false);
    assert.ok(qr.src.startsWith('data:image/svg+xml;charset=utf-8,'));
    const svg = decodeURIComponent(qr.src.split(',')[1]);
    assert.ok(svg.includes('<svg') && svg.includes('fill="white"') && svg.includes('fill="black"'));
    const payload = ui.qrPayload({ asset, network: CRYPTO_ASSETS[asset].network,
      payAddress: 'synthetic-provider-deposit-address', payAmount: '0.000123456789123456789' });
    assert.equal(payload, asset === 'ltc' ? 'litecoin:synthetic-provider-deposit-address?amount=0.000123456789123456789' : 'synthetic-provider-deposit-address');
    ui.get('cryptoCreate').click(); await settle(); assert.equal(calls,1);
    ui.get('cryptoCopy').click(); await settle(); assert.equal(ui.copied(),'synthetic-provider-deposit-address');
  }
});

test('pending clicks create one payment and same-tab reload restores instructions without POST', async () => {
  let resolve, calls = 0;
  const ui = harness(async (_, options) => { calls++; return new Promise(done => { resolve = () => done(Response.json(instructions(JSON.parse(options.body)), { status:201 })); }); });
  ui.proceed(); ui.get('cryptoCreate').click(); ui.get('cryptoCreate').click();
  assert.equal(ui.get('cryptoCreate').disabled,true); assert.equal(calls,1);
  resolve(); await settle();
  const restored = harness(() => { throw new Error('Must not create a second payment'); }, ui.storage);
  assert.equal(restored.active(),'payment'); assert.equal(restored.get('cryptoPayAmount').textContent,ui.get('cryptoPayAmount').textContent);
  assert.equal(restored.get('cryptoQrImage').src,ui.get('cryptoQrImage').src);
  assert.equal(restored.get('cryptoCreate').disabled,true);
});

test('QR payload follows current instructions, preserves amount precision, and never applies Litecoin URI to another network', () => {
  const ui = harness(() => { throw new Error('No request expected'); });
  const first = { asset:'ltc', network:'litecoin', payAddress:'first-address', payAmount:'0.010000000000000001' };
  assert.equal(ui.qrPayload(first),'litecoin:first-address?amount=0.010000000000000001');
  assert.equal(ui.qrPayload({ ...first, payAddress:'second-address', payAmount:'0.020000000000000002' }),
    'litecoin:second-address?amount=0.020000000000000002');
  assert.equal(ui.qrPayload({ ...first, network:'solana' }),'first-address');
  assert.equal(ui.qrPayload({ ...first, payAddress:'address?amount=999&other=value' }),
    'litecoin:address%3Famount%3D999%26other%3Dvalue?amount=0.010000000000000001');
});

test('disabled provider and validation errors allow deliberate correction without automatic retries', async () => {
  for (const [status, error] of [[503,'Crypto payments are unavailable.'],[400,'Invalid amount.'],[422,'Selected asset/network is currently unavailable.']]) {
    let calls = 0; const ui = harness(async () => { calls++; return Response.json({ error },{ status }); });
    ui.proceed(); ui.get('cryptoCreate').click(); await settle();
    assert.equal(ui.active(),'currency'); assert.equal(ui.get('cryptoCreate').disabled,false); assert.equal(calls,1);
    assert.equal(ui.storage.size,0); assert.equal(ui.get('cryptoMessage').hidden,false);
  }
});

test('ambiguous failures, 429s, malformed responses, and mismatched instructions lock repeat creation across reload', async () => {
  for (const respond of [() => { throw new Error('Network failure'); },
    () => Response.json({ error:'Creation failed.', orderId:randomUUID() },{ status:503 }),
    () => Response.json({ error:'Rate limit.', orderId:randomUUID() },{ status:429 }),
    () => Response.json({ error:'Proxy failure.' },{ status:503 }),
    () => new Response('invalid JSON', { status:201 }),
    body => Response.json(instructions(body,{ network:'wrong-network' }),{ status:201 })]) {
    let calls = 0; const ui = harness(async (_, options) => { calls++; return respond(JSON.parse(options.body)); });
    ui.proceed(); ui.get('cryptoCreate').click(); await settle(); ui.get('cryptoCreate').click(); await settle();
    assert.equal(calls,1); assert.equal(ui.get('cryptoCreate').disabled,true); assert.equal(ui.get('cryptoRecovery').hidden,false);
    const restored = harness(() => { throw new Error('No repeated creation'); },ui.storage);
    assert.equal(restored.get('cryptoCreate').disabled,true);
  }
});

test('corrupt saved payment state fails closed rather than allowing a duplicate request', () => {
  const storage = new Map([['phoxy.cryptoPayment','{invalid json']]);
  const ui = harness(() => { throw new Error('No request expected'); },storage);
  assert.equal(ui.get('cryptoCreate').disabled,true);
  assert.equal(ui.get('cryptoRecovery').hidden,false);
});

test('sandbox instructions prominently warn against real funds; markup uses backend networks and no old wallets', async () => {
  const ui = harness(async (_,options) => Response.json(instructions(JSON.parse(options.body),{ environment:'sandbox' }),{ status:201 }));
  ui.proceed('usdc'); ui.get('cryptoCreate').click(); await settle();
  assert.equal(ui.get('cryptoSandbox').hidden,false); assert.equal(ui.get('cryptoPayNetwork').textContent,'SOLANA');
  const component = await readFile('src/components/support/CryptoSupport.astro','utf8');
  assert.ok(component.includes('Object.entries(CRYPTO_ASSETS)'));
  assert.ok(component.includes('only after NOWPayments verifies final settlement'));
  assert.ok(!/usdcsol|usdtsol|data-copy-address|CRYPTO \/ DIRECT/.test(component));
  assert.ok(!/NOWPAYMENTS_(?:API_KEY|IPN_SECRET)|astro:env\/server/.test(compiled.outputFiles[0].text));
});
