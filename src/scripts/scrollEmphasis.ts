/*
 * SCROLL EMPHASIS
 *
 * Homepage headings form a directional
 * progression while scrolling downward.
 *
 * A heading activates only after reaching
 * the lower-middle reading area.
 *
 * Only one heading may be active at once.
 *
 * Scrolling upward does not activate
 * headings. It only allows the currently
 * active heading to return to rest once
 * it leaves the viewport.
 */

const scrollEmphasisElements =
  Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-scroll-emphasis]'
    )
  );

const reducedMotion =
  window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  );

let activeScrollEmphasis:
  HTMLElement | null = null;

let previousScrollY =
  window.scrollY;

/*
 * The heading activates when its center
 * reaches this percentage of the viewport.
 *
 * Larger number = later / farther down.
 */

const activationLine = 0.67;

const deactivateScrollEmphasis = () => {
  if (!activeScrollEmphasis) {
    return;
  }

  activeScrollEmphasis.classList.remove(
    'is-scroll-active'
  );

  activeScrollEmphasis = null;
};

const activateScrollEmphasis = (
  element: HTMLElement
) => {
  if (
    activeScrollEmphasis === element
  ) {
    return;
  }

  if (activeScrollEmphasis) {
    activeScrollEmphasis.classList.remove(
      'is-scroll-active'
    );
  }

  element.classList.add(
    'is-scroll-active'
  );

  activeScrollEmphasis = element;
};

const updateScrollEmphasis = () => {
  if (
    scrollEmphasisElements.length === 0 ||
    reducedMotion.matches
  ) {
    deactivateScrollEmphasis();

    previousScrollY =
      window.scrollY;

    return;
  }

  const currentScrollY =
    window.scrollY;

  const scrollingDown =
    currentScrollY >
    previousScrollY;

  const viewportHeight =
    window.innerHeight;

  const triggerY =
    viewportHeight *
    activationLine;

  /*
   * If the active heading has completely
   * left the viewport, return it to rest.
   */

  if (activeScrollEmphasis) {
    const activeRect =
      activeScrollEmphasis
        .getBoundingClientRect();

    const isInView =
      activeRect.bottom > 0 &&
      activeRect.top < viewportHeight;

    if (!isInView) {
      deactivateScrollEmphasis();
    }
  }

  /*
   * New headings can ONLY activate while
   * moving downward.
   */

  if (scrollingDown) {
    let candidate:
      HTMLElement | null = null;

    let closestDistance =
      Number.POSITIVE_INFINITY;

    for (
      const element
      of scrollEmphasisElements
    ) {
      const rect =
        element.getBoundingClientRect();

      const center =
        rect.top +
        rect.height / 2;

      /*
       * Only consider headings currently
       * visible in the viewport.
       */

      const isInView =
        rect.bottom > 0 &&
        rect.top < viewportHeight;

      if (!isInView) {
        continue;
      }

      /*
       * The heading must have reached the
       * activation line before it can become
       * the active stage of the progression.
       */

      if (center > triggerY) {
        continue;
      }

      const distance =
        triggerY - center;

      /*
       * Choose the heading that most recently
       * crossed the activation line.
       */

      if (
        distance <
        closestDistance
      ) {
        candidate =
          element;

        closestDistance =
          distance;
      }
    }

    if (
      candidate &&
      candidate !==
        activeScrollEmphasis
    ) {
      activateScrollEmphasis(
        candidate
      );
    }
  }

  previousScrollY =
    currentScrollY;
};

/*
 * Use requestAnimationFrame so scroll
 * events never directly perform layout
 * work more than once per frame.
 */

let scrollFrame:
  number | null = null;

const requestScrollUpdate = () => {
  if (scrollFrame !== null) {
    return;
  }

  scrollFrame =
    requestAnimationFrame(() => {
      updateScrollEmphasis();

      scrollFrame = null;
    });
};

if (
  scrollEmphasisElements.length > 0
) {
  window.addEventListener(
    'scroll',
    requestScrollUpdate,
    { passive: true }
  );

  window.addEventListener(
    'resize',
    requestScrollUpdate
  );

  reducedMotion.addEventListener(
    'change',
    requestScrollUpdate
  );
}