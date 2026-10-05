/*
 * GLOBAL UI SOUND FEEDBACK
 *
 * Hover:
 *   buttonrollover.ogg
 *
 * Successful activation:
 *   buttonclickrelease.ogg
 *
 * Disabled activation attempt:
 *   wpn_denyselect.ogg
 *
 * Sounds are delegated from the document so
 * dynamically displayed controls automatically
 * inherit the same behaviour.
 */

/*
 * SOUND PATHS
 */

const rolloverUrl =
  '/audio/ui/buttonrollover.ogg';

const releaseUrl =
  '/audio/ui/buttonclickrelease.ogg';

const denyUrl =
  '/audio/ui/wpn_denyselect.ogg';


/*
 * AUDIO INSTANCES
 */

const rolloverAudio =
  new Audio();

const releaseAudio =
  new Audio();

const denyAudio =
  new Audio();


/*
 * AUDIO CONFIGURATION
 */

rolloverAudio.preload = 'auto';
rolloverAudio.volume = 0.2;
rolloverAudio.src = rolloverUrl;

releaseAudio.preload = 'auto';
releaseAudio.volume = 0.25;
releaseAudio.src = releaseUrl;

denyAudio.preload = 'auto';
denyAudio.volume = 0.25;
denyAudio.src = denyUrl;

rolloverAudio.load();
releaseAudio.load();
denyAudio.load();


/*
 * ROLLOVER READINESS
 *
 * Rollover can be requested immediately after
 * the page becomes interactive, so preserve the
 * existing preload handling for that sound.
 */

let rolloverReady =
  rolloverAudio.readyState >=
  HTMLMediaElement.HAVE_CURRENT_DATA;

let pendingRollover = false;

const markRolloverReady = () => {
  rolloverReady = true;

  if (!pendingRollover) {
    return;
  }

  pendingRollover = false;

  playRollover();
};

rolloverAudio.addEventListener(
  'canplay',
  markRolloverReady,
  {
    once: true,
  }
);


/*
 * CONTROL LOOKUP
 *
 * Native links/buttons, radio/checkbox choices, and custom elements exposing
 * button semantics participate. Resolve a choice's label to its actual input
 * so moving between the label and input is still the same rollover target.
 */

const getUiTarget = (
  target: EventTarget | null
): HTMLElement | null => {
  if (!(target instanceof Element)) {
    return null;
  }

  const control = target.closest<HTMLElement>(
    'a, button, [role="button"], input[type="radio"], input[type="checkbox"]'
  );
  if (control) return control;

  const labelledControl = target.closest<HTMLLabelElement>('label')?.control;
  return labelledControl instanceof HTMLInputElement &&
    labelledControl.matches('input[type="radio"], input[type="checkbox"]')
    ? labelledControl : null;
};


/*
 * SOUND OPT-OUT
 */

const hasSoundDisabled = (
  element: HTMLElement
) => {
  return Boolean(
    element.closest(
      '[data-ui-sound="off"]'
    )
  );
};


/*
 * GLOBAL EXCLUSIONS
 *
 * Scout has its own audio behaviour.
 */

const isExcludedControl = (
  element: HTMLElement
) => {
  return element.matches(
    '.scout-button'
  );
};


/*
 * DISABLED STATE
 *
 * Support native disabled buttons/choices and
 * aria-disabled controls.
 */

const isDisabledControl = (
  element: HTMLElement
) => {
  if (
    (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) &&
    element.matches(':disabled')
  ) {
    return true;
  }

  return (
    element.getAttribute(
      'aria-disabled'
    ) === 'true'
  );
};


/*
 * GENERAL ELIGIBILITY
 */

const canUseUiSound = (
  element: HTMLElement
) => {
  if (
    hasSoundDisabled(element)
  ) {
    return false;
  }

  if (
    isExcludedControl(element)
  ) {
    return false;
  }

  return true;
};


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

function playRollover() {
  if (!rolloverReady) {
    pendingRollover = true;

    return;
  }

  restartAudio(
    rolloverAudio
  );
}

let releaseTarget: HTMLElement | null = null;

const playRelease = (target: HTMLElement) => {
  // Repeated activation of the same control must not cut off its in-flight
  // feedback (including a play request still starting). A different control
  // continues to supersede it, and a completed cue can be replayed normally.
  if (
    releaseTarget === target &&
    !releaseAudio.paused &&
    !releaseAudio.ended
  ) {
    return;
  }

  releaseTarget = target;
  restartAudio(
    releaseAudio
  );
};

const playDeny = () => {
  restartAudio(
    denyAudio
  );
};


/*
 * ROLLOVER
 *
 * Mouse and pen only.
 *
 * Moving between children inside the same
 * control does not replay the sound.
 *
 * Disabled controls remain silent on hover.
 */

document.addEventListener(
  'pointerover',
  (event) => {
    if (
      event.pointerType &&
      event.pointerType !== 'mouse' &&
      event.pointerType !== 'pen'
    ) {
      return;
    }

    const target =
      getUiTarget(
        event.target
      );

    if (
      !target ||
      !canUseUiSound(target) ||
      isDisabledControl(target)
    ) {
      return;
    }

    const previousTarget =
      getUiTarget(
        event.relatedTarget
      );

    if (
      previousTarget === target
    ) {
      return;
    }

    playRollover();
  },
  {
    passive: true,
  }
);


/*
 * DENIED POINTER ACTIVATION
 *
 * Native disabled buttons do not emit normal
 * click events, so detect attempted input
 * earlier with pointerdown.
 *
 * This also handles custom aria-disabled
 * controls such as the Codec hardware.
 */

document.addEventListener(
  'pointerdown',
  (event) => {
    const target =
      getUiTarget(
        event.target
      );

    if (
      !target ||
      !canUseUiSound(target)
    ) {
      return;
    }

    if (
      !isDisabledControl(target)
    ) {
      return;
    }

    playDeny();
  }
);


/*
 * DENIED KEYBOARD ACTIVATION
 *
 * Custom role="button" controls do not receive
 * native button keyboard behaviour, so provide
 * deny feedback for Enter and Space ourselves.
 */

document.addEventListener(
  'keydown',
  (event) => {
    if (
      event.key !== 'Enter' &&
      event.key !== ' '
    ) {
      return;
    }

    const target =
      getUiTarget(
        event.target
      );

    if (
      !target ||
      !canUseUiSound(target) ||
      !isDisabledControl(target)
    ) {
      return;
    }

    event.preventDefault();

    playDeny();
  }
);


/*
 * SUCCESSFUL ACTIVATION
 *
 * Click represents a completed activation,
 * giving the interface a distinct release sound.
 *
 * Use capture so eligibility reflects the control at activation, before its
 * local handler disables it or changes the displayed step. Already-disabled
 * controls still receive no release sound.
 */

document.addEventListener(
  'click',
  (event) => {
    const target =
      getUiTarget(
        event.target
      );

    if (
      !target ||
      !canUseUiSound(target) ||
      isDisabledControl(target)
    ) {
      return;
    }

    // Label activation forwards a second click to its native input. Only that
    // input click is a completed activation; otherwise one selection plays twice.
    if (target instanceof HTMLInputElement && event.target !== target) {
      return;
    }

    playRelease(target);
  },
  { capture: true }
);
