/*
 * TEXT OBFUSCATION
 *
 * Both the 404 and subtitle can corrupt.
 *
 * Only elements using the lens system need
 * their data-text attribute updated alongside
 * their visible text.
 */

const glitchElements =
  document.querySelectorAll<HTMLElement>(
    '[data-glitch-text]'
  );

const glitchCharacters =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&@!?▓▒░';

const randomCharacter = () => {
  return glitchCharacters[
    Math.floor(
      Math.random() *
      glitchCharacters.length
    )
  ];
};

const corruptText = (
  text: string,
  intensity: number
) => {
  return Array.from(text)
    .map((character) => {
      /*
       * Preserve whitespace so the basic silhouette
       * of each line survives the corruption.
       */

      if (character === ' ') {
        return ' ';
      }

      if (
        Math.random() <
        intensity
      ) {
        return randomCharacter();
      }

      return character;
    })
    .join('');
};

const setGlitchText = (
  element: HTMLElement,
  text: string
) => {
  element.textContent = text;

  /*
   * Only lens elements use data-text for their
   * chromatic pseudo-element copies.
   */

  if (
    element.classList.contains(
      'lens-text'
    )
  ) {
    element.dataset.text = text;
  }
};

const restoreText = () => {
  glitchElements.forEach(
    (element) => {
      const original =
        element.dataset.glitchText;

      if (original) {
        setGlitchText(
          element,
          original
        );
      }

      element.classList.remove(
        'is-glitching'
      );
    }
  );
};

const glitchFrame = (
  intensity: number
) => {
  glitchElements.forEach(
    (element) => {
      const original =
        element.dataset.glitchText;

      if (!original) {
        return;
      }

      const corrupted =
        corruptText(
          original,
          intensity
        );

      setGlitchText(
        element,
        corrupted
      );

      element.classList.add(
        'is-glitching'
      );
    }
  );
};

const runGlitch = () => {
  glitchFrame(0.28);

  window.setTimeout(
    () => glitchFrame(0.55),
    55
  );

  window.setTimeout(
    () => glitchFrame(0.35),
    105
  );

  window.setTimeout(
    restoreText,
    165
  );
};


/*
 * GLITCH SCHEDULING
 */

const reducedMotionQuery =
  window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  );

let glitchTimer:
  number | undefined;

const scheduleGlitch = () => {
  if (
    reducedMotionQuery.matches
  ) {
    return;
  }

  const delay =
    2800 +
    Math.random() * 5200;

  glitchTimer =
    window.setTimeout(
      () => {
        runGlitch();
        scheduleGlitch();
      },
      delay
    );
};

scheduleGlitch();


/*
 * REDUCED MOTION CHANGES
 */

reducedMotionQuery.addEventListener(
  'change',
  () => {
    if (
      reducedMotionQuery.matches
    ) {
      if (
        glitchTimer !==
        undefined
      ) {
        window.clearTimeout(
          glitchTimer
        );

        glitchTimer =
          undefined;
      }

      restoreText();
    } else {
      scheduleGlitch();
    }
  }
);