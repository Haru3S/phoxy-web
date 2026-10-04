/*
 * HERO
 *
 * Browser behavior for:
 *
 * - pointer parallax
 * - scroll indicator
 * - Scout voice lines
 */


/*
 * ELEMENTS
 */

const hero =
  document.querySelector<HTMLElement>(
    '[data-hero-canvas]'
  );

const heroSection =
  document.querySelector<HTMLElement>(
    '[data-hero]'
  );

const graffiti =
  document.querySelector<HTMLElement>(
    '[data-hero-graffiti]'
  );

const scout =
  document.querySelector<HTMLElement>(
    '[data-hero-scout]'
  );

const scoutButton =
  document.querySelector<HTMLButtonElement>(
    '[data-scout-button]'
  );

const heroScrollIndicator =
  document.querySelector<HTMLButtonElement>(
    '[data-hero-scroll]'
  );

const reducedMotion =
  window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  );


/*
 * HERO PARALLAX
 */

if (
  hero &&
  graffiti &&
  scout
) {
  const GRAFFITI_X = 7;
  const GRAFFITI_Y = 4;

  const SCOUT_X = 15;
  const SCOUT_Y = 8;

  const FOLLOW_SPEED = 8;

  let targetX = 0;
  let targetY = 0;

  let currentX = 0;
  let currentY = 0;

  let previousTime:
    number | null = null;


  /*
   * POINTER TARGET
   */

  const updateTarget = (
    event: PointerEvent
  ) => {
    if (
      reducedMotion.matches
    ) {
      return;
    }

    const rect =
      hero.getBoundingClientRect();

    targetX =
      (
        (
          event.clientX -
          rect.left
        ) /
        rect.width -
        0.5
      ) *
      2;

    targetY =
      (
        (
          event.clientY -
          rect.top
        ) /
        rect.height -
        0.5
      ) *
      2;

    targetX =
      Math.max(
        -1,
        Math.min(
          1,
          targetX
        )
      );

    targetY =
      Math.max(
        -1,
        Math.min(
          1,
          targetY
        )
      );
  };


  /*
   * RETURN TO CENTER
   */

  const resetTarget = () => {
    targetX = 0;
    targetY = 0;
  };


  /*
   * PARALLAX LOOP
   */

  const animate = (
    time: number
  ) => {
    if (
      previousTime === null
    ) {
      previousTime =
        time;
    }

    const deltaTime =
      Math.min(
        (
          time -
          previousTime
        ) /
          1000,
        0.05
      );

    previousTime =
      time;

    const smoothing =
      1 -
      Math.exp(
        -FOLLOW_SPEED *
        deltaTime
      );

    currentX +=
      (
        targetX -
        currentX
      ) *
      smoothing;

    currentY +=
      (
        targetY -
        currentY
      ) *
      smoothing;

    graffiti.style.transform =
      `translate3d(
        ${currentX * GRAFFITI_X}px,
        ${currentY * GRAFFITI_Y}px,
        0
      )`;

    scout.style.transform =
      `translate3d(
        ${currentX * SCOUT_X}px,
        ${currentY * SCOUT_Y}px,
        0
      )`;

    requestAnimationFrame(
      animate
    );
  };


  /*
   * PARALLAX EVENTS
   */

  hero.addEventListener(
    'pointermove',
    updateTarget,
    {
      passive: true,
    }
  );

  hero.addEventListener(
    'pointerleave',
    resetTarget
  );

  requestAnimationFrame(
    animate
  );
}


/*
 * HERO SCROLL INDICATOR
 */

if (
  heroSection &&
  heroScrollIndicator
) {
  /*
   * Hide the indicator once the user has moved
   * sufficiently beyond the top of the Hero.
   */

  const updateHeroScrollIndicator =
    () => {
      const rect =
        heroSection.getBoundingClientRect();

      const scrollThreshold =
        Math.min(
          160,
          window.innerHeight *
            0.15
        );

      const shouldHide =
        rect.top <
        -scrollThreshold;

      heroScrollIndicator.classList.toggle(
        'is-hidden',
        shouldHide
      );
    };


  /*
   * SCROLL TO ABOUT
   */

  heroScrollIndicator.addEventListener(
    'click',
    () => {
      const about =
        document.querySelector<HTMLElement>(
          '#about'
        );

      if (!about) {
        return;
      }

      about.scrollIntoView({
        behavior:
          reducedMotion.matches
            ? 'auto'
            : 'smooth',

        block:
          'start',
      });
    }
  );


  /*
   * SCROLL / RESIZE THROTTLING
   */

  let scrollFrame:
    number | null = null;

  const requestIndicatorUpdate =
    () => {
      if (
        scrollFrame !== null
      ) {
        return;
      }

      scrollFrame =
        requestAnimationFrame(
          () => {
            updateHeroScrollIndicator();

            scrollFrame =
              null;
          }
        );
    };

  window.addEventListener(
    'scroll',
    requestIndicatorUpdate,
    {
      passive: true,
    }
  );

  window.addEventListener(
    'resize',
    requestIndicatorUpdate
  );

  updateHeroScrollIndicator();
}


/*
 * SCOUT VOICE LINES
 */

const scoutLines = [
  '/audio/scout/scout_award12.mp3',
  '/audio/scout/scout_cheers06.mp3',
  '/audio/scout/scout_generic01.mp3',
  '/audio/scout/scout_invincible03.mp3',
  '/audio/scout/scout_meleedare04.mp3',
  '/audio/scout/scout_positivevocalization01.mp3',
  '/audio/scout/scout_positivevocalization04.mp3',
  '/audio/scout/scout_revenge07.mp3',
  '/audio/scout/scout_specialcompleted06.mp3',
];


/*
 * SCOUT AUDIO
 *
 * Scout was previously at 0.5.
 *
 * That was especially aggressive through phone
 * speakers, so his voice lines now sit much
 * lower relative to the rest of the site.
 */

const SCOUT_VOLUME =
  0.17;

let previousLine =
  -1;

let currentAudio:
  HTMLAudioElement | null =
    null;


/*
 * RANDOM VOICE LINE
 *
 * Avoid playing the same line twice in a row.
 */

const playRandomScoutLine =
  () => {
    if (
      scoutLines.length === 0
    ) {
      return;
    }

    let nextLine =
      previousLine;

    while (
      nextLine === previousLine &&
      scoutLines.length > 1
    ) {
      nextLine =
        Math.floor(
          Math.random() *
          scoutLines.length
        );
    }

    if (
      scoutLines.length === 1
    ) {
      nextLine = 0;
    }

    previousLine =
      nextLine;


    /*
     * Stop the previous voice line before
     * beginning another.
     */

    if (currentAudio) {
      currentAudio.pause();

      currentAudio.currentTime =
        0;
    }


    /*
     * Create and play the selected line.
     */

    currentAudio =
      new Audio(
        scoutLines[nextLine]
      );

    currentAudio.volume =
      SCOUT_VOLUME;

    currentAudio
      .play()
      .catch(
        (error) => {
          console.error(
            'Could not play Scout voice line:',
            error
          );
        }
      );
  };


/*
 * SCOUT INTERACTION
 */

scoutButton?.addEventListener(
  'click',
  playRandomScoutLine
);