const dialog =
  document.querySelector<HTMLDialogElement>(
    '[data-contact-message]'
  );

const openButtons =
  document.querySelectorAll<HTMLButtonElement>(
    '[data-contact-message-open]'
  );

const closeButton =
  dialog?.querySelector<HTMLButtonElement>(
    '[data-contact-message-close]'
  );

const form =
  dialog?.querySelector<HTMLFormElement>(
    '[data-contact-message-form]'
  );

const submitButton =
  dialog?.querySelector<HTMLButtonElement>(
    '[data-contact-message-submit]'
  );

const statusElement =
  dialog?.querySelector<HTMLElement>(
    '[data-contact-message-status]'
  );

const statusText =
  dialog?.querySelector<HTMLElement>(
    '[data-contact-message-status-text]'
  );

const messageInput =
  dialog?.querySelector<HTMLTextAreaElement>(
    'textarea[name="message"]'
  );

const messageCounter =
  dialog?.querySelector<HTMLElement>(
    '[data-contact-message-counter]'
  );

let previousFocus:
  HTMLElement | null =
  null;


/*
 * MESSAGE UI SOUNDS
 *
 * These are state-specific sounds rather
 * than global button feedback.
 *
 * Global rollover / click / deny sounds
 * remain handled by uiSounds.ts.
 */

const hardErrorUrl =
  '/audio/ui/hard_error.ogg';

const messageSuccessUrl =
  '/audio/ui/message.ogg';

const hardErrorAudio =
  new Audio();

const messageSuccessAudio =
  new Audio();

hardErrorAudio.preload =
  'auto';

hardErrorAudio.volume =
  0.3;

hardErrorAudio.src =
  hardErrorUrl;

messageSuccessAudio.preload =
  'auto';

messageSuccessAudio.volume =
  0.3;

messageSuccessAudio.src =
  messageSuccessUrl;

hardErrorAudio.load();

messageSuccessAudio.load();


/*
 * SOUND PLAYBACK
 */

const restartAudio = (
  audio: HTMLAudioElement
) => {
  audio.pause();

  audio.currentTime = 0;

  audio
    .play()
    .catch(() => {});
};

const playHardError = () => {
  restartAudio(
    hardErrorAudio
  );
};

const playMessageSuccess = () => {
  restartAudio(
    messageSuccessAudio
  );
};


/*
 * STATUS
 */

type MessageStatus =
  | 'ready'
  | 'error'
  | 'offline'
  | 'success';

const setStatus = (
  status: MessageStatus,
  text: string
) => {
  if (
    !statusElement ||
    !statusText
  ) {
    return;
  }

  statusElement.dataset.status =
    status;

  statusText.textContent =
    text;
};


/*
 * FIELD ERRORS
 */

const getErrorElement = (
  name: string
) =>
  dialog?.querySelector<HTMLElement>(
    `[data-error-for="${name}"]`
  ) ?? null;

const setFieldError = (
  field:
    | HTMLInputElement
    | HTMLTextAreaElement,
  message: string
) => {
  field.setAttribute(
    'aria-invalid',
    'true'
  );

  const error =
    getErrorElement(
      field.name
    );

  if (error) {
    error.textContent =
      message;
  }
};

const clearFieldError = (
  field:
    | HTMLInputElement
    | HTMLTextAreaElement
) => {
  field.removeAttribute(
    'aria-invalid'
  );

  const error =
    getErrorElement(
      field.name
    );

  if (error) {
    error.textContent = '';
  }
};

const clearErrors = () => {
  if (!form) {
    return;
  }

  const fields =
    form.querySelectorAll<
      HTMLInputElement |
      HTMLTextAreaElement
    >(
      'input, textarea'
    );

  fields.forEach(
    clearFieldError
  );
};


/*
 * MESSAGE COUNTER
 */

const updateCounter = () => {
  if (
    !messageInput ||
    !messageCounter
  ) {
    return;
  }

  messageCounter.textContent =
    `${messageInput.value.length} / 5000`;
};

messageInput?.addEventListener(
  'input',
  updateCounter
);


/*
 * OPEN / CLOSE
 */

const openDialog = () => {
  if (
    !dialog ||
    dialog.open
  ) {
    return;
  }

  previousFocus =
    document.activeElement instanceof
      HTMLElement
      ? document.activeElement
      : null;

  clearErrors();

  setStatus(
    'ready',
    'READY'
  );

  dialog.showModal();

  document.documentElement.classList.add(
    'contact-message-open'
  );

  requestAnimationFrame(
    () => {
      dialog.classList.add(
        'is-open'
      );
    }
  );

  const emailInput =
    dialog.querySelector<HTMLInputElement>(
      'input[name="email"]'
    );

  emailInput?.focus();
};

const closeDialog = () => {
  if (
    !dialog ||
    !dialog.open
  ) {
    return;
  }

  dialog.classList.remove(
    'is-open'
  );

  document.documentElement.classList.remove(
    'contact-message-open'
  );

  const finishClose = () => {
    if (!dialog.open) {
      return;
    }

    dialog.close();

    previousFocus?.focus();

    previousFocus = null;
  };

  const reducedMotion =
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

  if (reducedMotion) {
    finishClose();

    return;
  }

  window.setTimeout(
    finishClose,
    140
  );
};

openButtons.forEach(
  (button) => {
    button.addEventListener(
      'click',
      openDialog
    );
  }
);

closeButton?.addEventListener(
  'click',
  closeDialog
);


/*
 * NATIVE DIALOG ESCAPE
 *
 * Prevent the browser from immediately
 * disappearing the dialog so our exit
 * animation can run first.
 */

dialog?.addEventListener(
  'cancel',
  (event) => {
    event.preventDefault();

    closeDialog();
  }
);


/*
 * BACKDROP CLICK
 *
 * A click whose target is the <dialog>
 * itself occurred outside the window.
 *
 * Clicks inside the window continue bubbling
 * so the global UI sound system can hear
 * normal button activations.
 */

dialog?.addEventListener(
  'click',
  (event) => {
    if (
      event.target === dialog
    ) {
      closeDialog();
    }
  }
);


/*
 * VALIDATION
 */

const validateForm = () => {
  if (!form) {
    return false;
  }

  clearErrors();

  const email =
    form.elements.namedItem(
      'email'
    );

  const subject =
    form.elements.namedItem(
      'subject'
    );

  const message =
    form.elements.namedItem(
      'message'
    );

  let valid = true;

  if (
    email instanceof
      HTMLInputElement
  ) {
    const value =
      email.value.trim();

    if (!value) {
      setFieldError(
        email,
        'EMAIL REQUIRED'
      );

      valid = false;
    } else if (
      !email.validity.valid
    ) {
      setFieldError(
        email,
        'INVALID EMAIL'
      );

      valid = false;
    }
  }

  if (
    subject instanceof
      HTMLInputElement
  ) {
    if (
      !subject.value.trim()
    ) {
      setFieldError(
        subject,
        'SUBJECT REQUIRED'
      );

      valid = false;
    }
  }

  if (
    message instanceof
      HTMLTextAreaElement
  ) {
    if (
      !message.value.trim()
    ) {
      setFieldError(
        message,
        'MESSAGE REQUIRED'
      );

      valid = false;
    }
  }

  if (!valid) {
    const firstInvalid =
      form.querySelector<
        HTMLInputElement |
        HTMLTextAreaElement
      >(
        '[aria-invalid="true"]'
      );

    firstInvalid?.focus();

    setStatus(
      'error',
      'CHECK INPUT'
    );

    playHardError();
  }

  return valid;
};


/*
 * CLEAR FIELD ERRORS
 */

form
  ?.querySelectorAll<
    HTMLInputElement |
    HTMLTextAreaElement
  >(
    'input, textarea'
  )
  .forEach(
    (field) => {
      field.addEventListener(
        'input',
        () => {
          clearFieldError(
            field
          );

          if (
            statusElement
              ?.dataset.status ===
            'error'
          ) {
            setStatus(
              'ready',
              'READY'
            );
          }
        }
      );
    }
  );


/*
 * SUCCESS
 *
 * Reserved for the real contact endpoint.
 *
 * This must only run after the server confirms
 * that the message was accepted successfully.
 */

const handleMessageSuccess = () => {
  setStatus(
    'success',
    'MESSAGE SENT'
  );

  playMessageSuccess();

  form?.reset();

  updateCounter();
};


/*
 * SUBMIT
 *
 * Network transmission intentionally remains
 * disconnected until /api/contact exists.
 *
 * message.ogg therefore cannot fire yet:
 * clicking Send is not proof that an email
 * actually reached the backend.
 */

form?.addEventListener(
  'submit',
  (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setStatus(
      'offline',
      'TRANSMISSION NOT CONNECTED'
    );

    /*
     * Once /api/contact is connected:
     *
     * - submit the form
     * - wait for a successful server response
     * - call handleMessageSuccess()
     *
     * Do not clear the form on failure.
     */
  }
);


/*
 * Keep the success handler referenced until
 * the network layer is connected.
 */

void handleMessageSuccess;


/*
 * INITIAL STATE
 */

updateCounter();

if (submitButton) {
  submitButton.disabled =
    false;
}