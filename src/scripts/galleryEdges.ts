/*
 * GALLERY EDGE DETECTION
 *
 * Enlarged artwork touching either side
 * of the viewport grows inward instead
 * of spilling off-screen.
 */

const gallery =
  document.querySelector<HTMLElement>(
    '[data-gallery]'
  );

if (gallery) {
  const updateGalleryEdges = () => {
    const items =
      gallery.querySelectorAll<HTMLElement>(
        '.gallery-item'
      );

    const galleryRect =
      gallery.getBoundingClientRect();

    const tolerance = 2;

    for (const item of items) {
      const rect =
        item.getBoundingClientRect();

      const touchesLeft =
        Math.abs(
          rect.left -
          galleryRect.left
        ) <= tolerance;

      const touchesRight =
        Math.abs(
          rect.right -
          galleryRect.right
        ) <= tolerance;

      if (
        touchesLeft &&
        touchesRight
      ) {
        item.style.setProperty(
          '--gallery-transform-origin',
          'center center'
        );

        continue;
      }

      if (touchesLeft) {
        item.style.setProperty(
          '--gallery-transform-origin',
          'left center'
        );

        continue;
      }

      if (touchesRight) {
        item.style.setProperty(
          '--gallery-transform-origin',
          'right center'
        );

        continue;
      }

      item.style.setProperty(
        '--gallery-transform-origin',
        'center center'
      );
    }
  };

  updateGalleryEdges();

  const resizeObserver =
    new ResizeObserver(() => {
      updateGalleryEdges();
    });

  resizeObserver.observe(
    gallery
  );

  window.addEventListener(
    'resize',
    updateGalleryEdges
  );
}