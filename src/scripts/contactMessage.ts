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

const copyButton =
  dialog?.querySelector<HTMLButtonElement>(
    '[data-contact-email-copy]'
  );

const copyButtonText =
  dialog?.querySelector<HTMLElement>(
    '[data-contact-email-copy-text]'
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

const disabledFields =
  dialog?.querySelectorAll<
    HTMLInputElement |
    HTMLTextAreaElement
  >(
    '[data-contact-message-disabled]'
  );

let previousFocus:
  HTMLElement | null =
  null;


/*
 * CONTACT STATE
 *
 * Direct website messaging remains offline
 * until the server-side contact system is
 * connected.
 *
 * Visitors can still copy the public contact
 * email directly from the message window.
 */

const contactEmail =
  'phoxyfox@proton.me';


/*
 * CONTACT UI SOUNDS
 *
 * Denied input:
 * Attempting to use the offline form.
 *
 * Message:
 * Successfully copying the contact email.
 *
 * Global rollover / click sounds remain
 * handled by uiSounds.ts.
 */

const denySoundUrl =
  '/audio/ui/wpn_denyselect.ogg';

const messageSuccessUrl =
  '/audio/ui/message.ogg';

const denyAudio =
  new Audio();

const messageSuccessAudio =
  new Audio();

denyAudio.preload =
  'auto';

denyAudio.volume =
  0.3;

denyAudio.src =
  denySoundUrl;

messageSuccessAudio.preload =
  'auto';

messageSuccessAudio.volume =
  0.3;

messageSuccessAudio.src =
  messageSuccessUrl;

denyAudio.load();

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

const playDenySound = () => {
  restartAudio(
    denyAudio
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
  | 'offline'
  | 'success'
  | 'error';

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
 * MESSAGE COUNTER
 *
 * The field is unavailable for now, but
 * keeping the counter logic intact means
 * the composer can be re-enabled later
 * without rebuilding this part of the UI.
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

  setStatus(
    'offline',
    'DIRECT MESSAGE OFFLINE'
  );

  if (copyButtonText) {
    copyButtonText.textContent =
      'COPY MY EMAIL';
  }

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

  copyButton?.focus();
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
 * OFFLINE FORM FEEDBACK
 *
 * The fields remain visible as a preview of
 * the eventual contact composer.
 *
 * Trying to interact with one plays the same
 * denied-selection sound used elsewhere on
 * the site.
 */

disabledFields?.forEach(
  (field) => {
    field.addEventListener(
      'pointerdown',
      (event) => {
        event.preventDefault();

        playDenySound();

        setStatus(
          'offline',
          'DIRECT MESSAGE OFFLINE'
        );

        copyButton?.focus();
      }
    );

    field.addEventListener(
      'keydown',
      (event) => {
        if (
          event.key !== 'Enter' &&
          event.key !== ' '
        ) {
          return;
        }

        event.preventDefault();

        playDenySound();

        setStatus(
          'offline',
          'DIRECT MESSAGE OFFLINE'
        );

        copyButton?.focus();
      }
    );
  }
);


/*
 * CLIPBOARD FALLBACK
 *
 * navigator.clipboard is preferred because
 * the deployed site runs in a secure context.
 *
 * The textarea fallback keeps the copy action
 * usable in environments where the Clipboard
 * API is unavailable.
 */

const fallbackCopyText = (
  text: string
) => {
  const copyArea =
    document.createElement(
      'textarea'
    );

  copyArea.value =
    text;

  copyArea.setAttribute(
    'readonly',
    ''
  );

  copyArea.style.position =
    'fixed';

  copyArea.style.opacity =
    '0';

  copyArea.style.pointerEvents =
    'none';

  document.body.appendChild(
    copyArea
  );

  copyArea.select();

  let copied =
    false;

  try {
    copied =
      document.execCommand(
        'copy'
      );
  } catch {
    copied =
      false;
  }

  copyArea.remove();

  return copied;
};


/*
 * COPY EMAIL
 */

const copyContactEmail =
  async () => {
    let copied =
      false;

    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {
      try {
        await navigator.clipboard.writeText(
          contactEmail
        );

        copied =
          true;
      } catch {
        copied =
          false;
      }
    }

    if (!copied) {
      copied =
        fallbackCopyText(
          contactEmail
        );
    }

    if (!copied) {
      setStatus(
        'error',
        'COPY FAILED'
      );

      if (copyButtonText) {
        copyButtonText.textContent =
          'COPY FAILED';
      }

      return;
    }

    setStatus(
      'success',
      'EMAIL COPIED'
    );

    if (copyButtonText) {
      copyButtonText.textContent =
        'COPIED';
    }

    playMessageSuccess();
  };

copyButton?.addEventListener(
  'click',
  copyContactEmail
);


/*
 * FORM
 *
 * The form intentionally cannot submit while
 * direct messaging is offline.
 */

form?.addEventListener(
  'submit',
  (event) => {
    event.preventDefault();

    playDenySound();

    setStatus(
      'offline',
      'DIRECT MESSAGE OFFLINE'
    );
  }
);


/*
 * INITIAL STATE
 */

updateCounter();

setStatus(
  'offline',
  'DIRECT MESSAGE OFFLINE'
);