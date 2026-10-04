const SECOND = 1000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const MONTH = DAY * 30;
const YEAR = DAY * 365;

const SCROLL_END_THRESHOLD = 2;

function formatRelativeTime(
  isoTimestamp: string
): string {
  const timestamp =
    new Date(isoTimestamp).getTime();

  if (!Number.isFinite(timestamp)) {
    return '';
  }

  const difference =
    Math.max(
      0,
      Date.now() - timestamp
    );

  if (difference < MINUTE) {
    const seconds =
      Math.max(
        1,
        Math.floor(
          difference / SECOND
        )
      );

    return `${seconds}s ago`;
  }

  if (difference < HOUR) {
    const minutes =
      Math.floor(
        difference / MINUTE
      );

    return `${minutes}m ago`;
  }

  if (difference < DAY) {
    const hours =
      Math.floor(
        difference / HOUR
      );

    return `${hours}h ago`;
  }

  if (difference < MONTH) {
    const days =
      Math.floor(
        difference / DAY
      );

    return `${days}d ago`;
  }

  if (difference < YEAR) {
    const months =
      Math.floor(
        difference / MONTH
      );

    return `${months}mo ago`;
  }

  const years =
    Math.floor(
      difference / YEAR
    );

  return `${years}y ago`;
}

function initSupporterDisplay(): void {
  const root =
    document.querySelector<HTMLElement>(
      '[data-supporter-display]'
    );

  if (!root) {
    return;
  }

  const display =
    root.querySelector<HTMLElement>(
      '.supporter-display'
    );

  const tabs =
    Array.from(
      root.querySelectorAll<HTMLButtonElement>(
        '[data-support-tab]'
      )
    );

  const views =
    Array.from(
      root.querySelectorAll<HTMLElement>(
        '[data-support-view]'
      )
    );

  const relativeTimes =
    Array.from(
      root.querySelectorAll<HTMLTimeElement>(
        '[data-relative-time]'
      )
    );

  if (!display) {
    return;
  }

  function updateScrollFade(): void {
    const remainingScroll =
      display.scrollHeight -
      display.scrollTop -
      display.clientHeight;

    const canScroll =
      display.scrollHeight >
      display.clientHeight +
        SCROLL_END_THRESHOLD;

    const isAtBottom =
      remainingScroll <=
      SCROLL_END_THRESHOLD;

    root.classList.toggle(
      'has-scroll',
      canScroll
    );

    root.classList.toggle(
      'is-scroll-end',
      !canScroll || isAtBottom
    );
  }

  function selectView(
    selectedView: string
  ): void {
    tabs.forEach(
      (tab) => {
        const isSelected =
          tab.dataset.supportTab ===
          selectedView;

        tab.classList.toggle(
          'is-active',
          isSelected
        );

        tab.setAttribute(
          'aria-pressed',
          String(isSelected)
        );
      }
    );

    views.forEach(
      (view) => {
        view.hidden =
          view.dataset.supportView !==
          selectedView;
      }
    );

    display.scrollTop = 0;

    requestAnimationFrame(
      updateScrollFade
    );
  }

  function updateRelativeTimes(): void {
    relativeTimes.forEach(
      (time) => {
        const timestamp =
          time.dateTime;

        if (!timestamp) {
          return;
        }

        const formatted =
          formatRelativeTime(
            timestamp
          );

        if (!formatted) {
          return;
        }

        time.textContent =
          formatted;
      }
    );
  }

  tabs.forEach(
    (tab) => {
      tab.addEventListener(
        'click',
        () => {
          const selectedView =
            tab.dataset.supportTab;

          if (!selectedView) {
            return;
          }

          selectView(selectedView);
        }
      );
    }
  );

  display.addEventListener(
    'scroll',
    updateScrollFade,
    {
      passive: true,
    }
  );

  const resizeObserver =
    new ResizeObserver(
      updateScrollFade
    );

  resizeObserver.observe(display);

  updateRelativeTimes();

  requestAnimationFrame(
    updateScrollFade
  );

  const relativeTimeInterval =
    window.setInterval(
      updateRelativeTimes,
      SECOND
    );

  window.addEventListener(
    'pagehide',
    () => {
      window.clearInterval(
        relativeTimeInterval
      );

      resizeObserver.disconnect();
    },
    {
      once: true,
    }
  );
}

if (
  document.readyState === 'loading'
) {
  document.addEventListener(
    'DOMContentLoaded',
    initSupporterDisplay,
    {
      once: true,
    }
  );
} else {
  initSupporterDisplay();
}