/*
 * SUPPORT MINI-PAGE NAVIGATION
 */

const supportPages =
  document.querySelectorAll<HTMLElement>(
    '[data-support-page]'
  );

const openButtons =
  document.querySelectorAll<HTMLButtonElement>(
    '[data-open-support-page]'
  );

const backButtons =
  document.querySelectorAll<HTMLButtonElement>(
    '[data-support-back]'
  );

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
 * MINI-PAGE TRANSITION TIMING
 *
 * Current content fades away first.
 *
 * The destination is then activated and
 * enters horizontally:
 *
 * Forward -> from the right
 * Back    -> from the left
 */

const PAGE_FADE_OUT_DURATION = 150;
const PAGE_ENTER_DURATION = 240;

let pageTransitionActive = false;


/*
 * SCROLL AFFORDANCES
 */

const updateScrollAffordances = () => {
  if (
    !scrollRegion ||
    !scrollIndicator ||
    !scrollFade
  ) {
    return;
  }

  if (!desktopQuery.matches) {
    scrollIndicator.classList.remove(
      'is-visible'
    );

    scrollFade.classList.remove(
      'is-visible'
    );

    scrollIndicator.tabIndex = -1;

    return;
  }

  const overflow =
    scrollRegion.scrollHeight >
    scrollRegion.clientHeight + 1;

  const remainingScroll =
    scrollRegion.scrollHeight -
    scrollRegion.clientHeight -
    scrollRegion.scrollTop;

  const atBottom =
    remainingScroll <= 2;

  const shouldShow =
    overflow && !atBottom;

  scrollFade.classList.toggle(
    'is-visible',
    shouldShow
  );

  scrollIndicator.classList.toggle(
    'is-visible',
    shouldShow
  );

  scrollIndicator.tabIndex =
    shouldShow ? 0 : -1;
};


/*
 * ACTIVE PAGE HELPERS
 */

const getActiveSupportPage = () => {
  return Array.from(
    supportPages
  ).find((page) =>
    page.classList.contains(
      'is-active'
    )
  );
};

const getSupportPage = (
  pageName: string
) => {
  return Array.from(
    supportPages
  ).find(
    (page) =>
      page.dataset.supportPage ===
      pageName
  );
};

const activateSupportPage = (
  pageName: string
) => {
  let activePage:
    | HTMLElement
    | undefined;

  supportPages.forEach((page) => {
    const isActive =
      page.dataset.supportPage ===
      pageName;

    page.classList.toggle(
      'is-active',
      isActive
    );

    page.setAttribute(
      'aria-hidden',
      String(!isActive)
    );

    if (isActive) {
      activePage = page;
    }
  });

  return activePage;
};


/*
 * PAGE FOCUS
 */

const focusSupportPage = (
  pageName: string,
  activePage?: HTMLElement
) => {
  if (
    !activePage ||
    pageName === 'home'
  ) {
    return;
  }

  const backButton =
    activePage.querySelector<HTMLElement>(
      '[data-support-back]'
    );

  backButton?.focus({
    preventScroll: true,
  });
};


/*
 * INSTANT VIEW SWITCH
 *
 * Used when reduced motion is enabled.
 */

const showSupportPageInstantly = (
  pageName: string
) => {
  const activePage =
    activateSupportPage(
      pageName
    );

  if (scrollRegion) {
    scrollRegion.scrollTo({
      top: 0,
      behavior: 'auto',
    });
  }

  requestAnimationFrame(() => {
    updateScrollAffordances();

    focusSupportPage(
      pageName,
      activePage
    );
  });
};


/*
 * ANIMATED VIEW SWITCH
 */

const showSupportPage = async (
  pageName: string,
  direction:
    | 'forward'
    | 'back'
) => {
  if (pageTransitionActive) {
    return;
  }

  const currentPage =
    getActiveSupportPage();

  const destinationPage =
    getSupportPage(
      pageName
    );

  if (
    !destinationPage ||
    destinationPage === currentPage
  ) {
    return;
  }

  if (
    reducedMotionQuery.matches ||
    !currentPage
  ) {
    showSupportPageInstantly(
      pageName
    );

    return;
  }

  pageTransitionActive = true;


  /*
   * PHASE 1
   *
   * Fade the current page out without
   * moving it.
   */

  currentPage.classList.add(
    'is-transitioning-out'
  );

  await new Promise<void>(
    (resolve) => {
      window.setTimeout(
        resolve,
        PAGE_FADE_OUT_DURATION
      );
    }
  );

  currentPage.classList.remove(
    'is-transitioning-out'
  );


  /*
   * Swap pages only after the old page
   * has disappeared.
   */

  const activePage =
    activateSupportPage(
      pageName
    );

  if (!activePage) {
    pageTransitionActive = false;

    return;
  }

  if (scrollRegion) {
    scrollRegion.scrollTo({
      top: 0,
      behavior: 'auto',
    });
  }


  /*
   * PHASE 2
   *
   * Put the new page just outside its
   * resting position.
   *
   * Forward navigation enters from right.
   * Back navigation enters from left.
   */

  activePage.classList.add(
    direction === 'forward'
      ? 'is-entering-right'
      : 'is-entering-left'
  );


  /*
   * Force the browser to paint the initial
   * offset state before asking it to move
   * into the resting state.
   */

  await new Promise<void>(
    (resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(
            () => resolve()
        );
      });
    }
  );

  activePage.classList.add(
    'is-entering-active'
  );

  await new Promise<void>(
    (resolve) => {
      window.setTimeout(
        resolve,
        PAGE_ENTER_DURATION
      );
    }
  );

  activePage.classList.remove(
    'is-entering-right',
    'is-entering-left',
    'is-entering-active'
  );

  pageTransitionActive = false;

  updateScrollAffordances();

  focusSupportPage(
    pageName,
    activePage
  );
};


/*
 * FORWARD NAVIGATION
 */

openButtons.forEach((button) => {
  button.addEventListener(
    'click',
    () => {
      const destination =
        button.dataset
          .openSupportPage;

      if (!destination) {
        return;
      }

      showSupportPage(
        destination,
        'forward'
      );
    }
  );
});


/*
 * BACK NAVIGATION
 */

backButtons.forEach((button) => {
  button.addEventListener(
    'click',
    () => {
      showSupportPage(
        'home',
        'back'
      );
    }
  );
});


/*
 * SCROLL BEHAVIOR
 */

if (
  scrollRegion &&
  scrollIndicator &&
  scrollFade
) {
  /*
   * Preserve TypeScript's non-null guarantee
   * inside callbacks that execute later.
   */

  const activeScrollRegion =
    scrollRegion;

  const activeScrollIndicator =
    scrollIndicator;


  activeScrollRegion.addEventListener(
    'scroll',
    updateScrollAffordances,
    { passive: true }
  );

  activeScrollIndicator.addEventListener(
    'click',
    () => {
      activeScrollRegion.scrollBy({
        top:
          activeScrollRegion.clientHeight *
          0.65,

        behavior:
          reducedMotionQuery.matches
            ? 'auto'
            : 'smooth',
      });
    }
  );

  const resizeObserver =
    new ResizeObserver(
      updateScrollAffordances
    );

  resizeObserver.observe(
    activeScrollRegion
  );

  supportPages.forEach((page) => {
    resizeObserver.observe(
      page
    );
  });

  desktopQuery.addEventListener(
    'change',
    updateScrollAffordances
  );

  window.addEventListener(
    'load',
    updateScrollAffordances
  );

  requestAnimationFrame(
    updateScrollAffordances
  );
}
