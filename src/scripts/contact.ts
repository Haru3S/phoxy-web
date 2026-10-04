/*
 * PHOXY'S LOCAL TIME
 *
 * Always displays the current time in
 * America/Chicago.
 *
 * Both clock formats are shown:
 *
 *   18:26 | 6:26 PM CDT
 *
 * This avoids trying to infer a visitor's
 * preferred clock format from their browser.
 */

const timeElements =
  document.querySelectorAll<HTMLTimeElement>(
    '[data-phoxy-time]'
  );

const twentyFourHourFormatter =
  new Intl.DateTimeFormat(
    'en-US',
    {
      timeZone:
        'America/Chicago',

      hour:
        '2-digit',

      minute:
        '2-digit',

      hourCycle:
        'h23',
    }
  );

const twelveHourFormatter =
  new Intl.DateTimeFormat(
    'en-US',
    {
      timeZone:
        'America/Chicago',

      hour:
        'numeric',

      minute:
        '2-digit',

      hourCycle:
        'h12',

      timeZoneName:
        'short',
    }
  );

const updatePhoxyTime = () => {
  const now =
    new Date();

  const twentyFourHourTime =
    twentyFourHourFormatter.format(
      now
    );

  const twelveHourTime =
    twelveHourFormatter.format(
      now
    );

  timeElements.forEach(
    (timeElement) => {
      timeElement.textContent =
        `${twentyFourHourTime} | ${twelveHourTime}`;

      timeElement.dateTime =
        now.toISOString();
    }
  );
};

if (timeElements.length > 0) {
  updatePhoxyTime();

  /*
   * Update regularly enough that the minute
   * display never sits noticeably behind.
   */

  window.setInterval(
    updatePhoxyTime,
    30_000
  );
}