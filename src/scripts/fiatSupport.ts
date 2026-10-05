import {
  normalizeDisplayName,
  validateDisplayName,
  type DisplayNameValidationReason,
} from '../lib/support/displayNameValidation';

import {
  moderateDisplayName,
} from '../lib/support/displayNameModeration';

type FiatIdentity = {
  displayName: string;
  anonymous: boolean;
};

type CheckoutResponse = {
  checkoutUrl?: string;
  error?: string;
};

type CheckoutStatusResponse = {
  verified?: boolean;
  amount?: number;
  error?: string;
};

type ParsedAmount =
  | {
      valid: true;
      amount: number;
    }
  | {
      valid: false;
    };

type AmountSource =
  | 'none'
  | 'preset'
  | 'custom';

const MIN_SUPPORT_AMOUNT = 1;

const HARD_ERROR_AUDIO_PATH =
  '/audio/ui/hard_error.ogg';

const MISC_SUCCESS_AUDIO_PATH =
  '/audio/ui/misc_success.ogg';

function createAudio(
  source: string
): HTMLAudioElement {
  const audio =
    new Audio(source);

  audio.preload =
    'auto';

  return audio;
}

function playAudio(
  audio: HTMLAudioElement
): void {
  audio.currentTime =
    0;

  void audio
    .play()
    .catch(
      () => {
        // Audio feedback is optional. Never block
        // support flow if the browser refuses playback.
      }
    );
}

async function playAudioBeforeNavigation(
  audio: HTMLAudioElement
): Promise<void> {
  audio.currentTime =
    0;

  try {
    await audio.play();
  } catch {
    return;
  }

  await new Promise<void>(
    (resolve) => {
      let finished =
        false;

      const finish = () => {
        if (finished) {
          return;
        }

        finished =
          true;

        audio.removeEventListener(
          'ended',
          finish
        );

        resolve();
      };

      audio.addEventListener(
        'ended',
        finish,
        {
          once: true,
        }
      );

      window.setTimeout(
        finish,
        900
      );
    }
  );
}

function getValidationMessage(
  reason: DisplayNameValidationReason
): string {
  switch (reason) {
    case 'too_short':
      return 'Use at least 2 characters.';

    case 'too_long':
      return 'Keep it under 24 characters.';

    case 'invalid_characters':
      return 'Use letters, numbers, or _.';

    case 'reserved':
      return 'That name is reserved. Use Skip to stay anonymous.';
  }
}

function parseAmount(
  value: string
): ParsedAmount {
  const cleaned =
    value
      .trim()
      .replace(
        /[$,\s]/g,
        ''
      );

  if (!cleaned) {
    return {
      valid: false,
    };
  }

  if (
    !/^\d+(?:\.\d{0,2})?$/.test(
      cleaned
    )
  ) {
    return {
      valid: false,
    };
  }

  const amount =
    Number(cleaned);

  if (
    !Number.isFinite(
      amount
    )
  ) {
    return {
      valid: false,
    };
  }

  return {
    valid: true,
    amount,
  };
}

function formatAmount(
  amount: number
): string {
  return new Intl.NumberFormat(
    'en-US',
    {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(amount);
}

function initFiatSupport(): void {
  const rootElement =
    document.querySelector<HTMLElement>(
      '[data-fiat-support]'
    );

  if (!rootElement) {
    return;
  }

  const root = rootElement;

  const hardErrorAudio =
    createAudio(
      HARD_ERROR_AUDIO_PATH
    );

  const miscSuccessAudio =
    createAudio(
      MISC_SUCCESS_AUDIO_PATH
    );

  function requireElement<
    T extends Element
  >(
    selector: string
  ): T {
    const element =
      root.querySelector<T>(
        selector
      );

    if (!element) {
      throw new Error(
        `Fiat support is missing required element: ${selector}`
      );
    }

    return element;
  }

  const toolbarBackButton =
    requireElement<HTMLButtonElement>(
      '[data-fiat-toolbar-back]'
    );

  const identityStep =
    requireElement<HTMLElement>(
      '[data-fiat-step="identity"]'
    );

  const amountStep =
    requireElement<HTMLElement>(
      '[data-fiat-step="amount"]'
    );

  const successStep =
    requireElement<HTMLElement>(
      '[data-fiat-step="success"]'
    );

  const successAmount =
    requireElement<HTMLElement>(
      '[data-fiat-success-amount]'
    );

  const displayNameInput =
    requireElement<HTMLInputElement>(
      '[data-fiat-display-name]'
    );

  const nameError =
    requireElement<HTMLElement>(
      '[data-fiat-name-error]'
    );

  const continueButton =
    requireElement<HTMLButtonElement>(
      '[data-fiat-continue]'
    );

  const anonymousButton =
    requireElement<HTMLButtonElement>(
      '[data-fiat-anonymous]'
    );

  const amountBackButton =
    requireElement<HTMLButtonElement>(
      '[data-fiat-amount-back]'
    );

  const supporterName =
    requireElement<HTMLElement>(
      '[data-fiat-supporter-name]'
    );

  const amountOptions =
    Array.from(
      root.querySelectorAll<HTMLButtonElement>(
        '[data-fiat-amount]'
      )
    );

  const customAmountInput =
    requireElement<HTMLInputElement>(
      '[data-fiat-custom-amount]'
    );

  const customAmountContainer =
    requireElement<HTMLElement>(
      '.fiat-custom-amount'
    );

  const amountError =
    requireElement<HTMLElement>(
      '[data-fiat-amount-error]'
    );

  const selectedAmountDisplay =
    requireElement<HTMLElement>(
      '[data-fiat-selected-amount]'
    );

  const checkoutButton =
    requireElement<HTMLButtonElement>(
      '[data-fiat-checkout]'
    );

  let identity: FiatIdentity = {
    displayName: '',
    anonymous: false,
  };

  let selectedAmount =
    0;

  let amountSource:
    AmountSource =
    'none';

  let checkoutPending =
    false;

  function setNameError(
    message: string
  ): void {
    if (message) {
      nameError.textContent =
        message;

      nameError.hidden =
        false;

      displayNameInput
        .setAttribute(
          'aria-invalid',
          'true'
        );

      return;
    }

    nameError.textContent =
      '';

    nameError.hidden =
      true;

    displayNameInput
      .removeAttribute(
        'aria-invalid'
      );
  }

  function setAmountError(
    message: string
  ): void {
    if (message) {
      amountError.textContent =
        message;

      amountError.hidden =
        false;

      customAmountInput
        .setAttribute(
          'aria-invalid',
          'true'
        );

      return;
    }

    amountError.textContent =
      '';

    amountError.hidden =
      true;

    customAmountInput
      .removeAttribute(
        'aria-invalid'
      );
  }

  function updateAmountUI(): void {
    amountOptions.forEach(
      (button) => {
        const amount =
          Number(
            button.dataset
              .fiatAmount
          );

        const selected =
          amountSource ===
            'preset' &&
          amount ===
            selectedAmount;

        button.classList.toggle(
          'is-selected',
          selected
        );

        button.setAttribute(
          'aria-pressed',
          selected
            ? 'true'
            : 'false'
        );
      }
    );

    customAmountContainer
      .classList.toggle(
        'is-dimmed',
        amountSource ===
          'preset'
      );

    customAmountContainer
      .classList.toggle(
        'is-selected',
        amountSource ===
          'custom' &&
          selectedAmount !==
            null
      );

    if (
      amountSource ===
      'none'
    ) {
      selectedAmountDisplay
        .textContent =
        '$0.00';

      checkoutButton.disabled =
        true;

      return;
    }

    selectedAmountDisplay
      .textContent =
      formatAmount(
        selectedAmount
      );

    checkoutButton.disabled =
      checkoutPending;
  }

  function selectPresetAmount(
    amount: number
  ): void {
    selectedAmount =
      amount;

    amountSource =
      'preset';

    customAmountInput.value =
      '';

    setAmountError('');
    updateAmountUI();
  }

  function selectCustomAmount(): void {
    const rawValue =
      customAmountInput.value;

    if (
      rawValue.trim() === ''
    ) {
      selectedAmount =
        0;

      amountSource =
        'none';

      setAmountError(
        ''
      );

      updateAmountUI();

      return;
    }

    amountSource =
      'custom';

    const parsed =
      parseAmount(
        rawValue
      );

    if (!parsed.valid) {
      selectedAmount =
        0;

      setAmountError(
        'Enter a valid USD amount with up to two decimal places.'
      );

      updateAmountUI();

      return;
    }

    if (
      parsed.amount <
      MIN_SUPPORT_AMOUNT
    ) {
      selectedAmount =
        0;

      setAmountError(
        `Minimum support amount is ${formatAmount(MIN_SUPPORT_AMOUNT)}.`
      );

      updateAmountUI();

      return;
    }

    selectedAmount =
      parsed.amount;

    setAmountError(
      ''
    );

    updateAmountUI();
  }

  function showIdentityStep(): void {
    toolbarBackButton.hidden =
      false;

    amountStep.hidden =
      true;

    successStep.hidden =
      true;

    identityStep.hidden =
      false;

    identityStep.setAttribute(
      'aria-hidden',
      'false'
    );

    amountStep.setAttribute(
      'aria-hidden',
      'true'
    );

    successStep.setAttribute(
      'aria-hidden',
      'true'
    );

    requestAnimationFrame(
      () => {
        displayNameInput
          .focus();
      }
    );
  }

  function showAmountStep(): void {
    toolbarBackButton.hidden =
      false;

    identityStep.hidden =
      true;

    successStep.hidden =
      true;

    amountStep.hidden =
      false;

    identityStep.setAttribute(
      'aria-hidden',
      'true'
    );

    amountStep.setAttribute(
      'aria-hidden',
      'false'
    );

    successStep.setAttribute(
      'aria-hidden',
      'true'
    );

    supporterName.textContent =
      identity.anonymous
        ? 'Anonymous'
        : identity
            .displayName;
  }

  function showSuccessStep(
    amount: number
  ): void {
    toolbarBackButton.hidden =
      true;

    identityStep.hidden =
      true;

    amountStep.hidden =
      true;

    successStep.hidden =
      false;

    identityStep.setAttribute(
      'aria-hidden',
      'true'
    );

    amountStep.setAttribute(
      'aria-hidden',
      'true'
    );

    successStep.setAttribute(
      'aria-hidden',
      'false'
    );

    successAmount.textContent =
      formatAmount(amount);
  }

  async function showReturnedCheckout(): Promise<void> {
    const url =
      new URL(window.location.href);

    if (
      url.searchParams.get('payment') !==
      'success'
    ) {
      return;
    }

    const sessionId =
      url.searchParams.get(
        'session_id'
      ) ?? '';

    if (!sessionId) {
      return;
    }

    try {
      const response =
        await fetch(
          `/api/support/checkout?session_id=${encodeURIComponent(sessionId)}`,
          {
            method: 'GET',
            headers: {
              Accept:
                'application/json',
            },
          }
        );

      let data:
        CheckoutStatusResponse;

      try {
        data =
          await response.json();
      } catch {
        throw new Error(
          'Payment confirmation returned an invalid response.'
        );
      }

      if (
        !response.ok ||
        data.verified !== true ||
        typeof data.amount !==
          'number'
      ) {
        throw new Error(
          data.error ||
          'Payment could not be confirmed.'
        );
      }

      document
        .querySelector<HTMLButtonElement>(
          '[data-open-support-page="fiat"]'
        )
        ?.click();

      showSuccessStep(
        data.amount
      );

      window.history.replaceState(
        {},
        '',
        url.pathname
      );
    } catch (error) {
      console.error(
        'Checkout confirmation failed.',
        error
      );
    }
  }

  function continueWithName(): void {
    const normalized =
      normalizeDisplayName(
        displayNameInput.value
      );

    const validation =
      validateDisplayName(
        normalized
      );

    if (
      validation.valid ===
      false
    ) {
      setNameError(
        getValidationMessage(
          validation.reason
        )
      );

      displayNameInput.focus();

      return;
    }

    const moderation =
      moderateDisplayName(
        validation.displayName
      );

    if (
      moderation.status !==
      'approved'
    ) {
      setNameError(
        'That public display name cannot be used.'
      );

      playAudio(
        hardErrorAudio
      );

      displayNameInput.focus();

      return;
    }

    setNameError('');

    displayNameInput.value =
      validation.displayName;

    identity = {
      displayName:
        validation.displayName,
      anonymous: false,
    };

    showAmountStep();
  }

  function continueAnonymous(): void {
    setNameError('');

    identity = {
      displayName:
        'Anonymous',
      anonymous: true,
    };

    showAmountStep();
  }

  async function startCheckout(): Promise<void> {
    if (
      amountSource ===
        'none' ||
      checkoutPending
    ) {
      return;
    }

    checkoutPending =
      true;

    checkoutButton.disabled =
      true;

    setAmountError('');

    try {
      const response =
        await fetch(
          '/api/support/checkout',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                amount:
                  selectedAmount,

                displayName:
                  identity
                    .displayName,

                anonymous:
                  identity
                    .anonymous,
              }),
          }
        );

      let data:
        CheckoutResponse;

      try {
        data =
          await response.json();
      } catch {
        throw new Error(
          'Payment service returned an invalid response.'
        );
      }

      if (
        !response.ok ||
        !data.checkoutUrl
      ) {
        throw new Error(
          data.error ||
          'Could not start checkout.'
        );
      }

      await playAudioBeforeNavigation(
        miscSuccessAudio
      );

      window.location.assign(
        data.checkoutUrl
      );
    } catch (error) {
      console.error(
        'Checkout failed.',
        error
      );

      setAmountError(
        error instanceof Error
          ? error.message
          : 'Could not start checkout.'
      );

      checkoutPending =
        false;

      updateAmountUI();
    }
  }

  continueButton
    .addEventListener(
      'click',
      continueWithName
    );

  anonymousButton
    .addEventListener(
      'click',
      continueAnonymous
    );

  amountBackButton
    .addEventListener(
      'click',
      showIdentityStep
    );

  displayNameInput
    .addEventListener(
      'input',
      () => {
        if (
          !nameError.hidden
        ) {
          setNameError('');
        }
      }
    );

  displayNameInput
    .addEventListener(
      'keydown',
      (event) => {
        if (
          event.key !==
          'Enter'
        ) {
          return;
        }

        event.preventDefault();
        continueWithName();
      }
    );

  amountOptions.forEach(
    (button) => {
      button.addEventListener(
        'click',
        () => {
          const amount =
            Number(
              button.dataset
                .fiatAmount
            );

          if (
            !Number.isFinite(
              amount
            )
          ) {
            return;
          }

          selectPresetAmount(
            amount
          );
        }
      );
    }
  );

  customAmountInput
    .addEventListener(
      'focus',
      () => {
        if (
          amountSource ===
          'preset'
        ) {
          selectedAmount =
            0;

          amountSource =
            'custom';

          updateAmountUI();
        }
      }
    );

  customAmountInput
    .addEventListener(
      'input',
      selectCustomAmount
    );

  customAmountInput
    .addEventListener(
      'blur',
      () => {
        if (
          amountSource !==
            'custom' ||
          selectedAmount <
            MIN_SUPPORT_AMOUNT
        ) {
          return;
        }

        customAmountInput.value =
          selectedAmount
            .toFixed(2);
      }
    );

  checkoutButton
    .addEventListener(
      'click',
      () => {
        void startCheckout();
      }
    );

  updateAmountUI();
  void showReturnedCheckout();
}

if (
  document.readyState ===
  'loading'
) {
  document.addEventListener(
    'DOMContentLoaded',
    initFiatSupport,
    {
      once: true,
    }
  );
} else {
  initFiatSupport();
}
