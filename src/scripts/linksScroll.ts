/*
 * LINKS INTERNAL SCROLL AFFORDANCES
 */

const scrollRegion =
  document.querySelector<HTMLElement>(
    '[data-scroll-region]'
  );

const scrollIndicator =
  document.querySelector<HTMLButtonElement>(
    '[data-scroll-indicator]'
  );

const scrollFade =
  document.querySelector<HTMLElement>(
    '[data-scroll-fade]'
  );

const desktopQuery =
  window.matchMedia(
    '(min-width: 701px)'
  );

const reducedMotionQuery =
  window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  );


/*
 * Only initialize the controller when all
 * required elements exist.
 */

if (
  scrollRegion &&
  scrollIndicator &&
  scrollFade
) {
  /*
   * Stable non-null references.
   *
   * TypeScript cannot preserve DOM null
   * narrowing across event callbacks, so these
   * references remain explicitly valid for the
   * lifetime of this controller.
   */

  const region: HTMLElement =
    scrollRegion;

  const indicator: HTMLButtonElement =
    scrollIndicator;

  const fade: HTMLElement =
    scrollFade;


  /*
   * SCROLL STATE
   */

  const updateScrollAffordances = () => {
    if (!desktopQuery.matches) {
      indicator.classList.remove(
        'is-visible'
      );

      fade.classList.remove(
        'is-visible'
      );

      indicator.tabIndex = -1;

      return;
    }

    const overflow =
      region.scrollHeight >
      region.clientHeight + 1;

    const remainingScroll =
      region.scrollHeight -
      region.clientHeight -
      region.scrollTop;

    const atBottom =
      remainingScroll <= 2;

    /*
     * If there is still content beneath the
     * visible area, keep both affordances active.
     */

    const shouldShow =
      overflow && !atBottom;

    fade.classList.toggle(
      'is-visible',
      shouldShow
    );

    indicator.classList.toggle(
      'is-visible',
      shouldShow
    );

    indicator.tabIndex =
      shouldShow ? 0 : -1;
  };


  /*
   * SCROLL LISTENER
   */

  region.addEventListener(
    'scroll',
    updateScrollAffordances,
    {
      passive: true,
    }
  );


  /*
   * SCROLL INDICATOR
   */

  indicator.addEventListener(
    'click',
    () => {
      region.scrollBy({
        top:
          region.clientHeight *
          0.65,

        behavior:
          reducedMotionQuery.matches
            ? 'auto'
            : 'smooth',
      });
    }
  );


  /*
   * SIZE CHANGES
   */

  const resizeObserver =
    new ResizeObserver(() => {
      updateScrollAffordances();
    });

  resizeObserver.observe(
    region
  );

  const content =
    region.firstElementChild;

  if (content) {
    resizeObserver.observe(
      content
    );
  }


  /*
   * BREAKPOINT CHANGES
   */

  desktopQuery.addEventListener(
    'change',
    () => {
      updateScrollAffordances();
    }
  );


  /*
   * INITIAL STATE
   */

  window.addEventListener(
    'load',
    () => {
      updateScrollAffordances();
    },
    {
      once: true,
    }
  );

  requestAnimationFrame(() => {
    updateScrollAffordances();
  });
}