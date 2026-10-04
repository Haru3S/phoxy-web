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
  new Audio(rolloverUrl);

rolloverAudio.volume = 0.2;
rolloverAudio.preload = 'auto';


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

const playRollover = () => {
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
       * Browsers control autoplay permissions.
       *
       * If playback is refused, silently ignore
       * it. We intentionally don't maintain our
       * own second "unlocked" state.
       */
    });
};


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