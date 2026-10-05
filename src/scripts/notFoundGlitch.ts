/*
 * ERROR INTERACTION
 *
 * Activating the 404 plays the dedicated
 * catastrophic error sound and begins the
 * SourceBox music.
 *
 * Both are intentionally user-triggered so
 * browser autoplay policy cannot interfere.
 */

const errorTrigger =
  document.querySelector<HTMLElement>(
    '[data-error-trigger]'
  );

const nowPlaying =
  document.querySelector<HTMLElement>(
    '.now-playing'
  );

const errorSoundUrl =
  '/audio/ui/bugreporter_failed.ogg';

const musicUrl =
  '/audio/music/sourcebox.ogg';


/*
 * ERROR AUDIO
 */

const errorAudio =
  new Audio();

errorAudio.preload =
  'auto';

errorAudio.volume =
  0.3;

errorAudio.src =
  errorSoundUrl;

errorAudio.load();


/*
 * SOURCEBOX MUSIC
 *
 * Played once rather than looped.
 *
 * The volume is intentionally restrained so
 * the track sits underneath the page rather
 * than becoming the dominant experience.
 */

const sourceboxAudio =
  new Audio();

sourceboxAudio.preload =
  'auto';

sourceboxAudio.volume =
  0.16;

sourceboxAudio.loop =
  false;

sourceboxAudio.src =
  musicUrl;

sourceboxAudio.load();

let musicStarted =
  false;


/*
 * NOW PLAYING
 */

const showNowPlaying = () => {
  nowPlaying?.classList.add(
    'is-now-playing'
  );
};

const hideNowPlaying = () => {
  nowPlaying?.classList.remove(
    'is-now-playing'
  );
};


/*
 * ERROR SOUND
 */

const playErrorSound = () => {
  errorAudio.pause();

  errorAudio.currentTime = 0;

  errorAudio
    .play()
    .catch(() => {});
};


/*
 * MUSIC
 *
 * The first successful interaction begins
 * sourcebox.ogg.
 *
 * The credit appears only once playback has
 * actually started.
 *
 * Repeated 404 clicks do not restart the track.
 */

const startMusic = () => {
  if (musicStarted) {
    return;
  }

  sourceboxAudio.currentTime =
    0;

  sourceboxAudio
    .play()
    .then(() => {
      musicStarted =
        true;

      showNowPlaying();
    })
    .catch(() => {
      musicStarted =
        false;

      hideNowPlaying();
    });
};


/*
 * TRACK END
 *
 * Once the complete track has played, fade the
 * attribution back out.
 *
 * musicStarted intentionally remains true so
 * repeatedly clicking 404 cannot restart the
 * soundtrack after it has completed.
 */

sourceboxAudio.addEventListener(
  'ended',
  () => {
    hideNowPlaying();
  }
);


/*
 * AUDIO INTERRUPTION
 *
 * If the browser unexpectedly terminates the
 * audio before it can begin, make sure stale
 * metadata is not left visible.
 */

sourceboxAudio.addEventListener(
  'error',
  () => {
    hideNowPlaying();
  }
);


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
  element.textContent =
    text;

  if (
    element.classList.contains(
      'lens-text'
    )
  ) {
    element.dataset.text =
      text;
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
  glitchFrame(
    0.28
  );

  window.setTimeout(
    () =>
      glitchFrame(
        0.55
      ),
    55
  );

  window.setTimeout(
    () =>
      glitchFrame(
        0.35
      ),
    105
  );

  window.setTimeout(
    restoreText,
    165
  );
};


/*
 * ACTIVATE ERROR
 */

const activateError = () => {
  playErrorSound();

  startMusic();

  runGlitch();
};


/*
 * POINTER ACTIVATION
 */

errorTrigger?.addEventListener(
  'click',
  activateError
);


/*
 * KEYBOARD ACTIVATION
 */

errorTrigger?.addEventListener(
  'keydown',
  (event) => {
    if (
      event.key !== 'Enter' &&
      event.key !== ' '
    ) {
      return;
    }

    event.preventDefault();

    activateError();
  }
);


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
    Math.random() *
      5200;

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