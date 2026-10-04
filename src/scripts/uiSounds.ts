/*
 * GLOBAL UI ROLLOVER AUDIO
 *
 * Provides Half-Life 2-style rollover feedback
 * for normal interactive UI across the site.
 *
 * Normal <a> and <button> elements participate
 * automatically.
 *
 * Add:
 *
 *   data-ui-sound="off"
 *
 * to explicitly silence an interactive element.
 *
 * Scout is also excluded so his voice-line
 * interaction remains an easter egg.
 */

const base =
  import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;

const rolloverUrl =
  `${base}audio/ui/buttonrollover.ogg`;


/*
 * AUDIO
 */

const rolloverAudio =
  new Audio();

rolloverAudio.preload = 'auto';
rolloverAudio.volume = 0.2;
rolloverAudio.src = rolloverUrl;

/*
 * Explicitly ask the browser to begin loading
 * the sound as soon as this module executes.
 */

rolloverAudio.load();


/*
 * LOADING STATE
 */

let rolloverReady =
  rolloverAudio.readyState >=
  HTMLMediaElement.HAVE_CURRENT_DATA;

let pendingRollover = false;


/*
 * Once enough audio exists to begin playback,
 * mark the sound as ready.
 *
 * If somebody already hovered a control while
 * the file was loading, play that rollover now
 * rather than silently losing the first one.
 */

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
  { once: true }
);


/*
 * TARGET DETECTION
 */

const getUiTarget = (
  target: EventTarget | null
): HTMLElement | null => {
  if (!(target instanceof Element)) {
    return null;
  }

  return target.closest<HTMLElement>(
    'a, button'
  );
};


/*
 * EXCLUSIONS
 */

const shouldPlaySound = (
  element: HTMLElement
) => {
  /*
   * Explicit opt-out.
   */

  if (
    element.closest(
      '[data-ui-sound="off"]'
    )
  ) {
    return false;
  }


  /*
   * Scout stays undisclosed.
   */

  if (
    element.matches(
      '.scout-button'
    )
  ) {
    return false;
  }


  /*
   * Disabled controls shouldn't provide
   * interactive feedback.
   */

  if (
    element instanceof
      HTMLButtonElement &&
    element.disabled
  ) {
    return false;
  }

  if (
    element.getAttribute(
      'aria-disabled'
    ) === 'true'
  ) {
    return false;
  }

  return true;
};


/*
 * PLAYBACK
 */

function playRollover() {
  /*
   * If the asset hasn't loaded enough to play
   * yet, remember that a rollover happened.
   *
   * canplay will handle it as soon as the sound
   * becomes available.
   */

  if (!rolloverReady) {
    pendingRollover = true;
    return;
  }


  /*
   * Rewind the existing instance rather than
   * creating a new Audio object every time.
   */

  rolloverAudio.pause();
  rolloverAudio.currentTime = 0;

  rolloverAudio
    .play()
    .catch(() => {
      /*
       * Audio feedback is optional UI polish.
       *
       * If playback is refused for any reason,
       * navigation and interaction continue
       * normally.
       */
    });
}


/*
 * POINTER DELEGATION
 *
 * pointerover bubbles, which means this works
 * automatically for UI that appears later,
 * including Support's internal mini-pages.
 */

document.addEventListener(
  'pointerover',
  (event) => {
    /*
     * Touch doesn't really have hover.
     *
     * Mouse and pen are the useful rollover
     * cases here.
     */

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
      !shouldPlaySound(target)
    ) {
      return;
    }


    /*
     * pointerover also fires while moving
     * between children of the same control.
     *
     * Example:
     *
     *   button
     *     icon
     *     span
     *
     * Moving icon -> span should NOT make the
     * rollover sound play again.
     */

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
  { passive: true }
);