import { normalizeDisplayName, validateDisplayName } from '../lib/support/displayNameValidation';
import { moderateDisplayName } from '../lib/support/displayNameModeration';

type Step = 'identity' | 'amount' | 'currency' | 'payment';
type Identity = { displayName: string; anonymous: boolean };
type Payment = {
  environment: 'production' | 'sandbox'; orderId: string; paymentId: string;
  amount: number; priceCurrency: 'usd'; asset: string; network: string;
  payAmount: string; payAddress: string;
};
type Attempt = { state: 'pending' | 'uncertain' | 'created'; orderId?: string;
  payment?: Payment; identity?: Identity };
const STORAGE_KEY = 'phoxy.cryptoPayment';
const usd = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

// Match fiat's formatted custom amount input, with the backend's upper limit.
export function parseCryptoAmount(value: string): number | null {
  const cleaned = value.trim().replace(/[$,\s]/g, '');
  if (!/^\d+(?:\.\d{0,2})?$/.test(cleaned)) return null;
  const amount = Number(cleaned);
  return Number.isFinite(amount) && amount >= 1 && amount <= 1000 ? amount : null;
}

export function initCryptoSupport(): void {
  const root = document.querySelector<HTMLElement>('[data-crypto-support]');
  if (!root || root.dataset.cryptoInitialized) return;
  root.dataset.cryptoInitialized = 'true';
  const requireElement = <T extends HTMLElement>(selector: string): T => {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing crypto support element: ${selector}`);
    return element;
  };
  const steps = Array.from(root.querySelectorAll<HTMLElement>('[data-crypto-step]'));
  const name = requireElement<HTMLInputElement>('[data-crypto-display-name]');
  const nameError = requireElement<HTMLElement>('[data-crypto-name-error]');
  const custom = requireElement<HTMLInputElement>('[data-crypto-custom-amount]');
  const customContainer = requireElement<HTMLElement>('[data-crypto-custom-container]');
  const amountError = requireElement<HTMLElement>('[data-crypto-amount-error]');
  const next = requireElement<HTMLButtonElement>('[data-crypto-amount-continue]');
  const create = requireElement<HTMLButtonElement>('[data-crypto-create]');
  const createLabel = requireElement<HTMLElement>('[data-crypto-create-label]');
  const message = requireElement<HTMLElement>('[data-crypto-message]');
  const recovery = requireElement<HTMLElement>('[data-crypto-recovery]');
  const presets = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-crypto-amount]'));
  const currencies = Array.from(root.querySelectorAll<HTMLInputElement>('[data-crypto-currency]'));
  const edits = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-crypto-edit]'));
  let step: Step = 'identity';
  let identity: Identity | null = null;
  let amount: number | null = null;
  let source: 'none' | 'preset' | 'custom' = 'none';
  let locked = false;
  let payment: Payment | null = null;

  // Same-tab recovery only. Store payment instructions, never API credentials,
  // drafts, wallet keys, or a claim that settlement has succeeded.
  function saveAttempt(attempt: Attempt | null) {
    try {
      if (attempt) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch { /* The in-memory submission guard still works without storage. */ }
  }
  function setMessage(text: string, uncertain = false) {
    message.textContent = text;
    message.hidden = !text;
    recovery.hidden = !uncertain;
  }
  function fieldError(element: HTMLElement, input: HTMLInputElement, text: string) {
    element.textContent = text;
    element.hidden = !text;
    if (text) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }
  function updateAmount() {
    presets.forEach(button => {
      const selected = source === 'preset' && Number(button.dataset.cryptoAmount) === amount;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    customContainer.classList.toggle('is-dimmed', source === 'preset');
    customContainer.classList.toggle('is-selected', source === 'custom' && amount !== null);
    root!.querySelectorAll<HTMLElement>('[data-crypto-selected-amount], [data-crypto-currency-amount]')
      .forEach(element => { element.textContent = usd(amount ?? 0); });
    next.disabled = locked || amount === null;
  }
  function lock(value: boolean) {
    locked = value;
    create.disabled = value;
    edits.forEach(button => { button.disabled = value; });
    currencies.forEach(input => { input.disabled = value; });
    presets.forEach(button => { button.disabled = value; });
    name.disabled = custom.disabled = value;
    root!.querySelectorAll<HTMLButtonElement>('[data-crypto-identity-continue], [data-crypto-anonymous]')
      .forEach(button => { button.disabled = value; });
    updateAmount();
  }
  function showStep(target: Step, focus = true) {
    step = target;
    steps.forEach(element => {
      const active = element.dataset.cryptoStep === target;
      element.hidden = !active;
      element.setAttribute('aria-hidden', String(!active));
    });
    root!.querySelectorAll<HTMLElement>('[data-crypto-supporter-name]').forEach(element => {
      element.textContent = identity?.anonymous ? 'Anonymous' : identity?.displayName ?? 'Anonymous';
    });
    updateAmount();
    if (focus && root!.classList.contains('is-active')) {
      const active = steps.find(element => element.dataset.cryptoStep === target);
      // Bring the new step into view after the long currency list, including
      // inside the Support page's desktop scroll region.
      (target === 'identity' ? name : active?.querySelector<HTMLElement>('h2'))?.focus();
    }
  }
  function continueIdentity(anonymous: boolean) {
    if (locked) return;
    if (anonymous) {
      identity = { anonymous: true, displayName: '' };
    } else {
      const validation = validateDisplayName(normalizeDisplayName(name.value));
      if (!validation.valid) {
        const messages = { too_short: 'Use at least 2 characters.', too_long: 'Keep it under 24 characters.',
          invalid_characters: 'Use letters, numbers, or _.', reserved: 'That name is reserved. Use Skip to stay anonymous.' };
        fieldError(nameError, name, messages[validation.reason]);
        name.focus();
        return;
      }
      if (moderateDisplayName(validation.displayName).status !== 'approved') {
        fieldError(nameError, name, 'That public display name cannot be used.');
        name.focus();
        return;
      }
      identity = { anonymous: false, displayName: validation.displayName };
      name.value = validation.displayName;
    }
    fieldError(nameError, name, '');
    setMessage('');
    showStep('amount');
  }
  function validPayment(value: unknown): value is Payment {
    if (!object(value)) return false;
    const currency = currencies.find(input => input.value === value.asset);
    return !!currency && value.network === currency.dataset.network &&
      (value.environment === 'production' || value.environment === 'sandbox') &&
      typeof value.orderId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value.orderId) &&
      typeof value.paymentId === 'string' && /^[1-9]\d{0,39}$/.test(value.paymentId) &&
      typeof value.amount === 'number' && parseCryptoAmount(String(value.amount)) !== null && value.priceCurrency === 'usd' &&
      typeof value.payAmount === 'string' && /^\d{1,48}(?:\.\d{1,30})?$/.test(value.payAmount) && Number(value.payAmount) > 0 &&
      typeof value.payAddress === 'string' && value.payAddress.trim().length > 0 && value.payAddress.length <= 256;
  }
  function renderPayment(value: Payment) {
    payment = value;
    amount = value.amount;
    const currency = currencies.find(input => input.value === value.asset)!;
    requireElement<HTMLElement>('[data-crypto-pay-amount]').textContent = value.payAmount;
    requireElement<HTMLElement>('[data-crypto-pay-symbol]').textContent = currency.dataset.symbol ?? value.asset.toUpperCase();
    requireElement<HTMLElement>('[data-crypto-pay-network]').textContent = value.network.toUpperCase();
    requireElement<HTMLElement>('[data-crypto-pay-address]').textContent = value.payAddress;
    requireElement<HTMLElement>('[data-crypto-payment-id]').textContent = value.paymentId;
    requireElement<HTMLElement>('[data-crypto-order-id]').textContent = value.orderId;
    requireElement<HTMLElement>('[data-crypto-sandbox]').hidden = value.environment !== 'sandbox';
    createLabel.textContent = 'PAYMENT CREATED';
    setMessage('');
    lock(true);
    showStep('payment');
  }
  async function createPayment() {
    if (locked || step !== 'currency' || !identity || amount === null) return;
    const currency = currencies.find(input => input.checked);
    if (!currency) { setMessage('Choose a payment currency.'); return; }
    lock(true);
    saveAttempt({ state: 'pending' });
    createLabel.textContent = 'CREATING PAYMENT…';
    root!.setAttribute('aria-busy', 'true');
    setMessage('Creating your payment instructions. Please wait.');
    let orderReference: string | undefined;
    try {
      const response = await fetch('/api/support/crypto/payment', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ amount, asset: currency.value, anonymous: identity.anonymous,
          ...(!identity.anonymous ? { displayName: identity.displayName } : {}) }),
        signal: AbortSignal.timeout(30_000), cache: 'no-store', redirect: 'error',
      });
      const data: unknown = await response.json();
      if (object(data) && typeof data.orderId === 'string' && /^[0-9a-f-]{36}$/.test(data.orderId)) orderReference = data.orderId;
      if (!response.ok) {
        // Validated request errors are safe to correct manually. A pre-order
        // unavailable response did not call the provider. Everything else is
        // conservatively locked for reconciliation; never retry automatically.
        if (object(data) && typeof data.error === 'string' &&
          ((response.status === 400 || response.status === 422) ||
            (response.status === 503 && !orderReference && data.error === 'Crypto payments are unavailable.'))) {
          saveAttempt(null);
          lock(false);
          setMessage(response.status === 503 ? 'Crypto payments are currently unavailable. Please try another support method or return later.' : data.error.slice(0, 300));
          return;
        }
        throw new Error('Payment creation did not complete.');
      }
      if (response.status !== 201 || !validPayment(data) || data.asset !== currency.value || data.amount !== amount) {
        throw new Error('Invalid payment instructions.');
      }
      // Keep instructions available through refresh/back navigation in this tab.
      // This record never signifies payment success or changes the supporter board.
      saveAttempt({ state: 'created', payment: data, identity });
      renderPayment(data);
    } catch {
      saveAttempt({ state: 'uncertain', orderId: orderReference });
      createLabel.textContent = 'CREATION NOT CONFIRMED';
      setMessage('We could not confirm whether your payment was created. Do not send funds or create another payment yet.' +
        (orderReference ? ` Order reference: ${orderReference}.` : ''), true);
    } finally {
      root!.removeAttribute('aria-busy');
      if (!locked) createLabel.textContent = 'CREATE PAYMENT';
      if (!message.hidden && root!.classList.contains('is-active')) message.focus({ preventScroll: true });
    }
  }

  requireElement<HTMLButtonElement>('[data-crypto-identity-continue]').addEventListener('click', () => continueIdentity(false));
  requireElement<HTMLButtonElement>('[data-crypto-anonymous]').addEventListener('click', () => continueIdentity(true));
  name.addEventListener('input', () => fieldError(nameError, name, ''));
  name.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); continueIdentity(false); } });
  edits.forEach(button => button.addEventListener('click', () => {
    if (!locked) { setMessage(''); showStep(button.dataset.cryptoEdit as Step); }
  }));
  presets.forEach(button => button.addEventListener('click', () => {
    if (locked) return;
    amount = parseCryptoAmount(button.dataset.cryptoAmount ?? '');
    source = 'preset'; custom.value = '';
    fieldError(amountError, custom, ''); updateAmount();
  }));
  custom.addEventListener('focus', () => {
    if (!locked && source === 'preset') { source = 'custom'; amount = null; updateAmount(); }
  });
  custom.addEventListener('input', () => {
    if (locked) return;
    source = custom.value.trim() ? 'custom' : 'none';
    amount = parseCryptoAmount(custom.value);
    fieldError(amountError, custom, source === 'none' || amount !== null ? '' : 'Enter $1–$1,000 USD with up to two decimal places.');
    updateAmount();
  });
  custom.addEventListener('blur', () => { if (source === 'custom' && amount !== null) custom.value = amount.toFixed(2); });
  next.addEventListener('click', () => { if (!locked && amount !== null) { setMessage(''); showStep('currency'); } });
  create.addEventListener('click', () => { void createPayment(); });
  requireElement<HTMLButtonElement>('[data-crypto-copy]').addEventListener('click', async () => {
    if (!payment) return;
    const feedback = requireElement<HTMLElement>('[data-crypto-copy-feedback]');
    try {
      await navigator.clipboard.writeText(payment.payAddress);
      feedback.textContent = 'ADDRESS COPIED';
    } catch { feedback.textContent = 'Copy was unavailable. Select and copy the payment address above.'; }
  });
  updateAmount();
  let stored: string | null;
  try { stored = sessionStorage.getItem(STORAGE_KEY); }
  catch { return; }
  if (!stored) return;
  try {
    const attempt: unknown = stored.length <= 4096 ? JSON.parse(stored) : null;
    if (object(attempt) && attempt.state === 'created' && validPayment(attempt.payment) && object(attempt.identity) &&
      typeof attempt.identity.anonymous === 'boolean' && typeof attempt.identity.displayName === 'string' && attempt.identity.displayName.length <= 24) {
      identity = { anonymous: attempt.identity.anonymous, displayName: attempt.identity.anonymous ? '' : attempt.identity.displayName };
      renderPayment(attempt.payment);
    } else {
      lock(true);
      showStep('currency', false);
      createLabel.textContent = 'CREATION NOT CONFIRMED';
      const reference = object(attempt) && typeof attempt.orderId === 'string' && /^[0-9a-f-]{36}$/.test(attempt.orderId) ? ` Order reference: ${attempt.orderId}.` : '';
      setMessage('A previous payment request in this tab needs reconciliation. Do not send funds or create another payment yet.' + reference, true);
    }
  } catch {
    lock(true);
    showStep('currency', false);
    createLabel.textContent = 'CREATION NOT CONFIRMED';
    setMessage('Saved payment details could not be read. Contact me before creating another payment.', true);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCryptoSupport, { once: true });
else initCryptoSupport();
