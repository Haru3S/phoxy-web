/*
 * INTERESTS
 *
 * Browser behaviour for the Interests section.
 *
 * - Games / Hobbies reels are handled by CSS.
 * - Hovering or focusing a reel pauses it.
 * - I LOVE objects move independently and bounce
 *   against the edges of their container.
 */


/*
 * LOVE FIELD
 */

interface LoveObject {
  element: HTMLElement;

  x: number;
  y: number;

  width: number;
  height: number;

  velocityX: number;
  velocityY: number;
}


const loveField =
  document.querySelector<HTMLElement>(
    '[data-love-field]'
  );


if (loveField) {
  const elements =
    Array.from(
      loveField.querySelectorAll<HTMLElement>(
        '[data-love-object]'
      )
    );

  const prefersReducedMotion =
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    );


  /*
   * MOTION STATE
   */

  let objects: LoveObject[] = [];

  let fieldWidth = 0;
  let fieldHeight = 0;

  let animationFrame = 0;
  let previousTime = 0;


  /*
   * INITIALIZE OBJECTS
   */

  const initializeObjects = () => {
    const fieldRect =
      loveField.getBoundingClientRect();

    fieldWidth =
      fieldRect.width;

    fieldHeight =
      fieldRect.height;


    objects =
      elements.map(
        (
          element,
          index
        ) => {
          const rect =
            element.getBoundingClientRect();

          const width =
            rect.width;

          const height =
            rect.height;


          /*
           * Spread initial positions across
           * the field rather than dropping
           * everything into one pile.
           */

          const columns = 3;

          const column =
            index %
            columns;

          const row =
            Math.floor(
              index /
              columns
            );


          const usableWidth =
            Math.max(
              0,
              fieldWidth -
              width
            );

          const usableHeight =
            Math.max(
              0,
              fieldHeight -
              height
            );


          const x =
            usableWidth *
            (
              (
                column +
                0.35
              ) /
              columns
            );


          const rowCount =
            Math.max(
              1,
              Math.ceil(
                elements.length /
                columns
              )
            );


          const y =
            usableHeight *
            (
              (
                row +
                0.35
              ) /
              rowCount
            );


          /*
           * Each object receives a slightly
           * different velocity.
           *
           * Alternating signs prevent the
           * whole field from moving together.
           */

          const speed =
            32 +
            (
              index %
              4
            ) *
            7;


          const velocityX =
            speed *
            (
              index %
              2 === 0
                ? 1
                : -1
            );


          const velocityY =
            (
              speed *
              0.72
            ) *
            (
              index %
              3 === 0
                ? -1
                : 1
            );


          return {
            element,

            x,
            y,

            width,
            height,

            velocityX,
            velocityY,
          };
        }
      );


    for (
      const object
      of objects
    ) {
      object.element.style.transform =
        `translate3d(${object.x}px, ${object.y}px, 0)`;
    }
  };


  /*
   * ANIMATION
   */

  const animate = (
    time: number
  ) => {
    if (
      prefersReducedMotion.matches
    ) {
      return;
    }


    if (
      previousTime === 0
    ) {
      previousTime = time;
    }


    const delta =
      Math.min(
        (
          time -
          previousTime
        ) /
        1000,
        0.05
      );


    previousTime = time;


    for (
      const object
      of objects
    ) {
      object.x +=
        object.velocityX *
        delta;

      object.y +=
        object.velocityY *
        delta;


      /*
       * LEFT / RIGHT
       */

      if (
        object.x <= 0
      ) {
        object.x = 0;

        object.velocityX =
          Math.abs(
            object.velocityX
          );
      }


      if (
        object.x +
        object.width >=
        fieldWidth
      ) {
        object.x =
          Math.max(
            0,
            fieldWidth -
            object.width
          );

        object.velocityX =
          -Math.abs(
            object.velocityX
          );
      }


      /*
       * TOP / BOTTOM
       */

      if (
        object.y <= 0
      ) {
        object.y = 0;

        object.velocityY =
          Math.abs(
            object.velocityY
          );
      }


      if (
        object.y +
        object.height >=
        fieldHeight
      ) {
        object.y =
          Math.max(
            0,
            fieldHeight -
            object.height
          );

        object.velocityY =
          -Math.abs(
            object.velocityY
          );
      }


      object.element.style.transform =
        `translate3d(${object.x}px, ${object.y}px, 0)`;
    }


    animationFrame =
      requestAnimationFrame(
        animate
      );
  };


  /*
   * START / STOP
   */

  const startAnimation = () => {
    cancelAnimationFrame(
      animationFrame
    );

    previousTime = 0;

    initializeObjects();


    if (
      prefersReducedMotion.matches
    ) {
      return;
    }


    animationFrame =
      requestAnimationFrame(
        animate
      );
  };


  /*
   * RESIZE
   */

  const resizeObserver =
    new ResizeObserver(
      () => {
        startAnimation();
      }
    );


  resizeObserver.observe(
    loveField
  );


  /*
   * REDUCED MOTION CHANGES
   */

  prefersReducedMotion.addEventListener(
    'change',
    () => {
      startAnimation();
    }
  );


  /*
   * INITIAL START
   */

  startAnimation();
}