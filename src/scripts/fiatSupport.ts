type FiatIdentity = {
  displayName: string;
  anonymous: boolean;
};

const DISPLAY_NAME_MIN_LENGTH = 2;
const DISPLAY_NAME_MAX_LENGTH = 24;

const DISPLAY_NAME_PATTERN =
  /^[A-Za-z0-9 _.-]+$/;

const RESERVED_DISPLAY_NAMES = new Set([
  'anonymous',
]);

const MIN_SUPPORT_AMOUNT = 1;

function normalizeDisplayName(
  value: string,
): string {
  return value
    .trim()
    .replace(/\s+/g, ' ');
}

function validateDisplayName(
  value: string,
): string | null {
  const normalized =
    normalizeDisplayName(value);

  if (
    normalized.length <
    DISPLAY_NAME_MIN_LENGTH
  ) {
    return `Use at least ${DISPLAY_NAME_MIN_LENGTH} characters.`;
  }

  if (
    normalized.length >
    DISPLAY_NAME_MAX_LENGTH
  ) {
    return `Keep it under ${DISPLAY_NAME_MAX_LENGTH} characters.`;
  }

  if (
    !DISPLAY_NAME_PATTERN.test(
      normalized,
    )
  ) {
    return 'Use letters, numbers, spaces, _, - or .';
  }

  if (
    RESERVED_DISPLAY_NAMES.has(
      normalized.toLowerCase(),
    )
  ) {
    return 'That name is reserved. Use Skip to stay anonymous.';
  }

  return null;
}

function parseAmount(
  value: string,
): number | null {
  const cleaned =
    value
      .trim()
      .replace(/[$,\s]/g, '');

  if (!cleaned) {
    return null;
  }

  if (
    !/^\d+(?:\.\d{0,2})?$/.test(
      cleaned,
    )
  ) {
    return null;
  }

  const amount =
    Number(cleaned);

  if (
    !Number.isFinite(amount)
  ) {
    return null;
  }

  return amount;
}

function formatAmount(
  amount: number,
): string {
  return new Intl.NumberFormat(
    'en-US',
    {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(amount);
}

function initFiatSupport(): void {
  const root =
    document.querySelector<HTMLElement>(
      '[data-fiat-support]',
    );

  if (!root) {
    return;
  }

  const identityStep =
    root.querySelector<HTMLElement>(
      '[data-fiat-step="identity"]',
    );

  const amountStep =
    root.querySelector<HTMLElement>(
      '[data-fiat-step="amount"]',
    );

  const displayNameInput =
    root.querySelector<HTMLInputElement>(
      '[data-fiat-display-name]',
    );

  const nameError =
    root.querySelector<HTMLElement>(
      '[data-fiat-name-error]',
    );

  const continueButton =
    root.querySelector<HTMLButtonElement>(
      '[data-fiat-continue]',
    );

  const anonymousButton =
    root.querySelector<HTMLButtonElement>(
      '[data-fiat-anonymous]',
    );

  const amountBackButton =
    root.querySelector<HTMLButtonElement>(
      '[data-fiat-amount-back]',
    );

  const supporterName =
    root.querySelector<HTMLElement>(
      '[data-fiat-supporter-name]',
    );

  const amountOptions =
    Array.from(
      root.querySelectorAll<HTMLButtonElement>(
        '[data-fiat-amount]',
      ),
    );

  const customAmountInput =
    root.querySelector<HTMLInputElement>(
      '[data-fiat-custom-amount]',
    );

  const customAmountContainer =
    root.querySelector<HTMLElement>(
      '.fiat-custom-amount',
    );

  const amountError =
    root.querySelector<HTMLElement>(
      '[data-fiat-amount-error]',
    );

  const selectedAmountDisplay =
    root.querySelector<HTMLElement>(
      '[data-fiat-selected-amount]',
    );

  const checkoutButton =
    root.querySelector<HTMLButtonElement>(
      '[data-fiat-checkout]',
    );

  if (
    !identityStep ||
    !amountStep ||
    !displayNameInput ||
    !nameError ||
    !continueButton ||
    !anonymousButton ||
    !amountBackButton ||
    !supporterName ||
    !customAmountInput ||
    !customAmountContainer ||
    !amountError ||
    !selectedAmountDisplay ||
    !checkoutButton
  ) {
    return;
  }

  let identity: FiatIdentity = {
    displayName: '',
    anonymous: false,
  };

  let selectedAmount: number | null =
    null;

  let amountSource:
    | 'preset'
    | 'custom'
    | null = null;

  function setNameError(
    message: string | null,
  ): void {
    if (message) {
      nameError.textContent =
        message;

      nameError.hidden = false;

      displayNameInput.setAttribute(
        'aria-invalid',
        'true',
      );

      return;
    }

    nameError.textContent = '';
    nameError.hidden = true;

    displayNameInput.removeAttribute(
      'aria-invalid',
    );
  }

  function setAmountError(
    message: string | null,
  ): void {
    if (message) {
      amountError.textContent =
        message;

      amountError.hidden = false;

      customAmountInput.setAttribute(
        'aria-invalid',
        'true',
      );

      return;
    }

    amountError.textContent = '';
    amountError.hidden = true;

    customAmountInput.removeAttribute(
      'aria-invalid',
    );
  }

  function updateAmountUI(): void {
    amountOptions.forEach(
      (button) => {
        const amount =
          Number(
            button.dataset
              .fiatAmount,
          );

        const selected =
          amountSource ===
            'preset' &&
          selectedAmount !== null &&
          amount ===
            selectedAmount;

        button.classList.toggle(
          'is-selected',
          selected,
        );

        button.setAttribute(
          'aria-pressed',
          selected
            ? 'true'
            : 'false',
        );
      },
    );

    customAmountContainer
      .classList
      .toggle(
        'is-dimmed',
        amountSource ===
          'preset',
      );

    customAmountContainer
      .classList
      .toggle(
        'is-selected',
        amountSource ===
          'custom' &&
          selectedAmount !== null,
      );

    if (
      selectedAmount === null
    ) {
      selectedAmountDisplay.textContent =
        '$0.00';

      checkoutButton.disabled =
        true;

      return;
    }

    selectedAmountDisplay.textContent =
      formatAmount(
        selectedAmount,
      );

    checkoutButton.disabled =
      false;
  }

  function selectPresetAmount(
    amount: number,
  ): void {
    selectedAmount = amount;
    amountSource = 'preset';

    customAmountInput.value = '';

    setAmountError(null);

    updateAmountUI();
  }

  function selectCustomAmount(): void {
    const rawValue =
      customAmountInput.value;

    const amount =
      parseAmount(
        rawValue,
      );

    amountSource =
      rawValue.trim() === ''
        ? null
        : 'custom';

    if (
      rawValue.trim() === ''
    ) {
      selectedAmount = null;

      setAmountError(null);

      updateAmountUI();

      return;
    }

    if (amount === null) {
      selectedAmount = null;

      setAmountError(
        'Enter a valid USD amount with up to two decimal places.',
      );

      updateAmountUI();

      return;
    }

    if (
      amount <
      MIN_SUPPORT_AMOUNT
    ) {
      selectedAmount = null;

      setAmountError(
        `Minimum support amount is ${formatAmount(
          MIN_SUPPORT_AMOUNT,
        )}.`,
      );

      updateAmountUI();

      return;
    }

    selectedAmount = amount;

    setAmountError(null);

    updateAmountUI();
  }

  function showIdentityStep(): void {
    amountStep.hidden = true;
    identityStep.hidden = false;

    identityStep.setAttribute(
      'aria-hidden',
      'false',
    );

    amountStep.setAttribute(
      'aria-hidden',
      'true',
    );

    requestAnimationFrame(
      () => {
        displayNameInput.focus();
      },
    );
  }

  function showAmountStep(): void {
    identityStep.hidden = true;
    amountStep.hidden = false;

    identityStep.setAttribute(
      'aria-hidden',
      'true',
    );

    amountStep.setAttribute(
      'aria-hidden',
      'false',
    );

    supporterName.textContent =
      identity.anonymous
        ? 'Anonymous'
        : identity.displayName;
  }

  function continueWithName(): void {
    const normalized =
      normalizeDisplayName(
        displayNameInput.value,
      );

    const validationError =
      validateDisplayName(
        normalized,
      );

    if (validationError) {
      setNameError(
        validationError,
      );

      displayNameInput.focus();

      return;
    }

    setNameError(null);

    displayNameInput.value =
      normalized;

    identity = {
      displayName: normalized,
      anonymous: false,
    };

    showAmountStep();
  }

  function continueAnonymous(): void {
    setNameError(null);

    identity = {
      displayName: 'Anonymous',
      anonymous: true,
    };

    showAmountStep();
  }

  continueButton.addEventListener(
    'click',
    continueWithName,
  );

  anonymousButton.addEventListener(
    'click',
    continueAnonymous,
  );

  amountBackButton.addEventListener(
    'click',
    showIdentityStep,
  );

  displayNameInput.addEventListener(
    'input',
    () => {
      if (!nameError.hidden) {
        setNameError(null);
      }
    },
  );

  displayNameInput.addEventListener(
    'keydown',
    (event) => {
      if (
        event.key !== 'Enter'
      ) {
        return;
      }

      event.preventDefault();

      continueWithName();
    },
  );

  amountOptions.forEach(
    (button) => {
      button.addEventListener(
        'click',
        () => {
          const amount =
            Number(
              button.dataset
                .fiatAmount,
            );

          if (
            !Number.isFinite(
              amount,
            )
          ) {
            return;
          }

          selectPresetAmount(
            amount,
          );
        },
      );
    },
  );

  customAmountInput.addEventListener(
    'focus',
    () => {
      if (
        amountSource ===
        'preset'
      ) {
        selectedAmount = null;
        amountSource = 'custom';

        updateAmountUI();
      }
    },
  );

  customAmountInput.addEventListener(
    'input',
    selectCustomAmount,
  );

  customAmountInput.addEventListener(
    'blur',
    () => {
      if (
        amountSource !==
          'custom' ||
        selectedAmount === null
      ) {
        return;
      }

      customAmountInput.value =
        selectedAmount.toFixed(2);
    },
  );

  checkoutButton.addEventListener(
    'click',
    () => {
      if (
        selectedAmount === null
      ) {
        return;
      }

      /*
       * Stripe Checkout gets connected here
       * during the backend pass.
       *
       * The browser's identity and amount are
       * never proof that payment succeeded.
       */
    },
  );

  updateAmountUI();
}

if (
  document.readyState === 'loading'
) {
  document.addEventListener(
    'DOMContentLoaded',
    initFiatSupport,
    {
      once: true,
    },
  );
} else {
  initFiatSupport();
}