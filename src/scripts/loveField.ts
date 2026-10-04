/*
 * TEXTMODE #3 — I LOVE
 *
 * Procedural canvas visual for the I LOVE section.
 *
 * Visual layers:
 *
 * 1. Reactive character grid
 * 2. ASCII motion trails
 * 3. Moving text objects
 *
 * Moving text disturbs the grid as it passes.
 * Trails decay from readable text into terminal
 * characters before disappearing back into the field.
 */

import {
  loves,
} from '../data/interests';


/*
 * TYPES
 */

interface TrailPoint {
  x: number;
  y: number;
}


interface LoveObject {
  text: string;

  x: number;
  y: number;

  width: number;
  height: number;

  velocityX: number;
  velocityY: number;

  colour: string;

  trail: TrailPoint[];
}


interface GridCell {
  character: string;

  /*
   * Temporary disturbance created when a moving
   * object passes near this cell.
   */

  energy: number;
}


/*
 * PALETTE
 */

const colours = [
  '#5ac8fa',
  '#72a7ff',
  '#b8b5ff',
  '#c997ff',
  '#71dfcc',
  '#89dceb',
  '#a6e3a1',
];


/*
 * MOTION
 */

const MIN_SPEED =
  48;

const MAX_SPEED =
  82;

const MIN_VERTICAL_RATIO =
  0.58;

const MAX_VERTICAL_RATIO =
  0.88;


/*
 * TYPOGRAPHY
 */

const MIN_FONT_SIZE =
  48;

const MAX_FONT_SIZE =
  108;

const FONT_WIDTH_RATIO =
  0.062;


/*
 * COLLISION
 */

const FIELD_PADDING =
  12;

const OBJECT_PADDING =
  10;


/*
 * TRAILS
 *
 * Stronger and longer than the previous pass.
 */

const TRAIL_LENGTH =
  9;

const TRAIL_SPACING =
  24;


/*
 * GRID
 */

const GRID_SIZE =
  28;

const GRID_FONT_SIZE =
  11;

const GRID_BASE_OPACITY =
  0.075;

const GRID_ACTIVE_OPACITY =
  0.46;

const GRID_ENERGY_DECAY =
  1.7;

const GRID_INFLUENCE_RADIUS =
  72;


/*
 * CHARACTER SETS
 */

const GRID_CHARACTERS = [
  '·',
  '+',
  '─',
  '│',
  '░',
];


const DISTURBED_CHARACTERS = [
  '#',
  '%',
  '+',
  '=',
  '*',
  ':',
  '/',
  '\\',
  '▓',
  '▒',
  '░',
];


const TRAIL_CHARACTERS = [
  '#',
  '%',
  '+',
  '=',
  '*',
  ':',
  '.',
  '/',
  '\\',
  '░',
  '▒',
  '▓',
];


/*
 * HELPERS
 */

const randomBetween = (
  minimum: number,
  maximum: number
) => {
  return (
    minimum +
    Math.random() *
      (
        maximum -
        minimum
      )
  );
};


const clamp = (
  value: number,
  minimum: number,
  maximum: number
) => {
  return Math.max(
    minimum,
    Math.min(
      maximum,
      value
    )
  );
};


/*
 * FIND FIELDS
 */

const fields =
  document.querySelectorAll<HTMLElement>(
    '[data-love-field]'
  );


const reducedMotion =
  window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  );


for (
  const field
  of fields
) {
  const canvas =
    field.querySelector<HTMLCanvasElement>(
      '[data-love-canvas]'
    );


  if (
    !canvas
  ) {
    continue;
  }


  const context =
    canvas.getContext(
      '2d'
    );


  if (
    !context
  ) {
    continue;
  }


  /*
   * CANVAS STATE
   */

  let width =
    0;

  let height =
    0;

  let pixelRatio =
    1;

  let fontSize =
    MIN_FONT_SIZE;


  /*
   * OBJECT STATE
   */

  let objects:
    LoveObject[] = [];


  /*
   * GRID STATE
   */

  let grid:
    GridCell[][] = [];


  /*
   * ANIMATION STATE
   */

  let animationFrame:
    number | null = null;

  let previousTime =
    0;

  let trailAccumulator =
    0;


  /*
   * TYPOGRAPHY
   */

  const updateFont = () => {
    fontSize =
      Math.max(
        MIN_FONT_SIZE,
        Math.min(
          MAX_FONT_SIZE,
          width *
            FONT_WIDTH_RATIO
        )
      );


    context.font =
      `700 ${fontSize}px "Space Grotesk Variable", "Space Grotesk", sans-serif`;

    context.textAlign =
      'left';

    context.textBaseline =
      'top';
  };


  /*
   * MEASURE TEXT
   */

  const measureObject = (
    text: string
  ) => {
    const metrics =
      context.measureText(
        text
      );


    const measuredHeight =
      (
        metrics.actualBoundingBoxAscent +
        metrics.actualBoundingBoxDescent
      );


    return {
      width:
        metrics.width,

      height:
        measuredHeight > 0
          ? measuredHeight
          : fontSize,
    };
  };


  /*
   * CREATE GRID
   */

  const createGrid =
    () => {
      const columns =
        Math.ceil(
          width /
            GRID_SIZE
        ) + 1;


      const rows =
        Math.ceil(
          height /
            GRID_SIZE
        ) + 1;


      grid = [];


      for (
        let row = 0;
        row < rows;
        row += 1
      ) {
        const gridRow:
          GridCell[] = [];


        for (
          let column = 0;
          column < columns;
          column += 1
        ) {
          /*
           * Some cells remain permanently empty
           * so the field doesn't become wallpaper.
           */

          const character =
            Math.random() <
              0.42
              ? ''
              : GRID_CHARACTERS[
                  Math.floor(
                    Math.random() *
                      GRID_CHARACTERS.length
                  )
                ];


          gridRow.push({
            character,
            energy: 0,
          });
        }


        grid.push(
          gridRow
        );
      }
    };


  /*
   * GRID DISTURBANCE
   *
   * Moving objects inject energy into nearby
   * character cells.
   *
   * The closer a cell is to the object, the
   * stronger the disturbance.
   */

  const disturbGrid = (
    object: LoveObject
  ) => {
    const objectCenterX =
      object.x +
      object.width /
        2;


    const objectCenterY =
      object.y +
      object.height /
        2;


    const minimumColumn =
      Math.max(
        0,
        Math.floor(
          (
            object.x -
            GRID_INFLUENCE_RADIUS
          ) /
            GRID_SIZE
        )
      );


    const maximumColumn =
      Math.min(
        grid[0]?.length -
          1 ||
          0,

        Math.ceil(
          (
            object.x +
            object.width +
            GRID_INFLUENCE_RADIUS
          ) /
            GRID_SIZE
        )
      );


    const minimumRow =
      Math.max(
        0,
        Math.floor(
          (
            object.y -
            GRID_INFLUENCE_RADIUS
          ) /
            GRID_SIZE
        )
      );


    const maximumRow =
      Math.min(
        grid.length -
          1,

        Math.ceil(
          (
            object.y +
            object.height +
            GRID_INFLUENCE_RADIUS
          ) /
            GRID_SIZE
        )
      );


    for (
      let row = minimumRow;
      row <= maximumRow;
      row += 1
    ) {
      for (
        let column = minimumColumn;
        column <= maximumColumn;
        column += 1
      ) {
        const cell =
          grid[row]?.[column];


        if (
          !cell
        ) {
          continue;
        }


        const cellX =
          column *
            GRID_SIZE +
          GRID_SIZE /
            2;


        const cellY =
          row *
            GRID_SIZE +
          GRID_SIZE /
            2;


        /*
         * Find the closest point on the text's
         * collision rectangle rather than only
         * measuring from its centre.
         */

        const closestX =
          clamp(
            cellX,
            object.x,
            object.x +
              object.width
          );


        const closestY =
          clamp(
            cellY,
            object.y,
            object.y +
              object.height
          );


        const distanceX =
          cellX -
          closestX;


        const distanceY =
          cellY -
          closestY;


        const distance =
          Math.sqrt(
            distanceX *
              distanceX +
            distanceY *
              distanceY
          );


        if (
          distance >
          GRID_INFLUENCE_RADIUS
        ) {
          continue;
        }


        const influence =
          1 -
          distance /
            GRID_INFLUENCE_RADIUS;


        /*
         * Cells directly beneath the moving text
         * become fully energized.
         */

        cell.energy =
          Math.max(
            cell.energy,
            influence
          );


        /*
         * High-energy cells occasionally mutate
         * into noisier characters.
         */

        if (
          influence >
            0.55 &&
          Math.random() <
            0.09
        ) {
          cell.character =
            DISTURBED_CHARACTERS[
              Math.floor(
                Math.random() *
                  DISTURBED_CHARACTERS.length
              )
            ];
        }
      }
    }


    /*
     * Give the centre of the object a slightly
     * stronger disturbance so large words leave
     * a readable wake.
     */

    const centerColumn =
      Math.floor(
        objectCenterX /
          GRID_SIZE
      );


    const centerRow =
      Math.floor(
        objectCenterY /
          GRID_SIZE
      );


    const centerCell =
      grid[
        centerRow
      ]?.[
        centerColumn
      ];


    if (
      centerCell
    ) {
      centerCell.energy =
        1;
    }
  };


  /*
   * GRID UPDATE
   */

  const updateGrid = (
    deltaTime: number
  ) => {
    /*
     * Existing disturbance slowly decays.
     */

    for (
      const row
      of grid
    ) {
      for (
        const cell
        of row
      ) {
        cell.energy =
          Math.max(
            0,
            cell.energy -
              GRID_ENERGY_DECAY *
                deltaTime
          );
      }
    }


    /*
     * Then moving objects disturb the field again.
     */

    for (
      const object
      of objects
    ) {
      disturbGrid(
        object
      );
    }
  };


  /*
   * DRAW GRID
   */

  const drawGrid =
    () => {
      context.save();


      context.font =
        `400 ${GRID_FONT_SIZE}px "Adwaita Mono", monospace`;

      context.textAlign =
        'center';

      context.textBaseline =
        'middle';


      for (
        let row = 0;
        row < grid.length;
        row += 1
      ) {
        const gridRow =
          grid[row];


        for (
          let column = 0;
          column < gridRow.length;
          column += 1
        ) {
          const cell =
            gridRow[column];


          if (
            !cell.character &&
            cell.energy <=
              0.04
          ) {
            continue;
          }


          /*
           * Empty cells can briefly materialize
           * when sufficiently disturbed.
           */

          let character =
            cell.character;


          if (
            !character
          ) {
            character =
              DISTURBED_CHARACTERS[
                (
                  row +
                  column
                ) %
                  DISTURBED_CHARACTERS.length
              ];
          }


          const opacity =
            GRID_BASE_OPACITY +
            cell.energy *
              (
                GRID_ACTIVE_OPACITY -
                GRID_BASE_OPACITY
              );


          context.globalAlpha =
            opacity;


          /*
           * Disturbed cells lean toward the cool
           * cyan of the moving field.
           */

          if (
            cell.energy >
            0.15
          ) {
            context.fillStyle =
              '#89dceb';
          } else {
            context.fillStyle =
              '#ffffff';
          }


          /*
           * Small displacement makes the grid feel
           * physically unsettled near moving text.
           */

          const displacement =
            cell.energy *
            3;


          const direction =
            (
              row +
              column
            ) %
              2 ===
            0
              ? 1
              : -1;


          context.fillText(
            character,

            column *
              GRID_SIZE +
              GRID_SIZE /
                2 +
              displacement *
                direction,

            row *
              GRID_SIZE +
              GRID_SIZE /
                2 -
              displacement *
                direction
          );
        }
      }


      context.restore();
    };


  /*
   * CREATE POSITION
   */

  const createPosition = (
    objectWidth: number,
    objectHeight: number
  ) => {
    const minimumX =
      FIELD_PADDING;


    const maximumX =
      Math.max(
        minimumX,
        width -
          objectWidth -
          FIELD_PADDING
      );


    const minimumY =
      FIELD_PADDING;


    const maximumY =
      Math.max(
        minimumY,
        height -
          objectHeight -
          FIELD_PADDING
      );


    return {
      x:
        randomBetween(
          minimumX,
          maximumX
        ),

      y:
        randomBetween(
          minimumY,
          maximumY
        ),
    };
  };


  /*
   * STARTING OVERLAP
   */

  const overlapsExistingObject = (
    x: number,
    y: number,
    objectWidth: number,
    objectHeight: number
  ) => {
    return objects.some(
      (object) => {
        return !(
          x +
            objectWidth +
            OBJECT_PADDING <=
            object.x ||

          x >=
            object.x +
            object.width +
            OBJECT_PADDING ||

          y +
            objectHeight +
            OBJECT_PADDING <=
            object.y ||

          y >=
            object.y +
            object.height +
            OBJECT_PADDING
        );
      }
    );
  };


  /*
   * CREATE OBJECTS
   */

  const createObjects =
    () => {
      objects = [];


      loves.forEach(
        (
          love,
          index
        ) => {
          const text =
            love.toUpperCase();


          const measurement =
            measureObject(
              text
            );


          let position =
            createPosition(
              measurement.width,
              measurement.height
            );


          for (
            let attempt = 0;
            attempt < 60;
            attempt += 1
          ) {
            if (
              !overlapsExistingObject(
                position.x,
                position.y,
                measurement.width,
                measurement.height
              )
            ) {
              break;
            }


            position =
              createPosition(
                measurement.width,
                measurement.height
              );
          }


          const speed =
            randomBetween(
              MIN_SPEED,
              MAX_SPEED
            );


          const verticalRatio =
            randomBetween(
              MIN_VERTICAL_RATIO,
              MAX_VERTICAL_RATIO
            );


          const horizontalDirection =
            index %
              2 ===
            0
              ? 1
              : -1;


          const verticalDirection =
            index %
              3 ===
            0
              ? -1
              : 1;


          objects.push({
            text,

            x:
              position.x,

            y:
              position.y,

            width:
              measurement.width,

            height:
              measurement.height,

            velocityX:
              speed *
              horizontalDirection,

            velocityY:
              speed *
              verticalRatio *
              verticalDirection,

            colour:
              colours[
                index %
                  colours.length
              ],

            trail: [],
          });
        }
      );
    };


  /*
   * CAPTURE TRAILS
   */

  const captureTrails =
    () => {
      for (
        const object
        of objects
      ) {
        object.trail.unshift({
          x:
            object.x,

          y:
            object.y,
        });


        if (
          object.trail.length >
          TRAIL_LENGTH
        ) {
          object.trail.pop();
        }
      }
    };


  /*
   * ASCII TRAIL
   *
   * Rather than drawing transparent copies of
   * the original word, each trail sample becomes
   * a progressively more fragmented ASCII echo.
   */

  const createTrailText = (
    text: string,
    age: number
  ) => {
    const destruction =
      age /
      TRAIL_LENGTH;


    let result =
      '';


    for (
      let index = 0;
      index < text.length;
      index += 1
    ) {
      const character =
        text[index];


      if (
        character ===
        ' '
      ) {
        result +=
          ' ';

        continue;
      }


      /*
       * Newer trail samples retain more of the
       * original lettering.
       *
       * Older samples increasingly become noise.
       */

      const keepChance =
        Math.max(
          0.08,
          0.76 -
            destruction *
              0.82
        );


      if (
        Math.random() <
        keepChance
      ) {
        result +=
          character;
      } else {
        /*
         * Some destroyed characters disappear,
         * others turn into terminal debris.
         */

        if (
          Math.random() <
          destruction *
            0.32
        ) {
          result +=
            ' ';
        } else {
          result +=
            TRAIL_CHARACTERS[
              (
                index +
                age *
                  3
              ) %
                TRAIL_CHARACTERS.length
            ];
        }
      }
    }


    return result;
  };


  /*
   * DRAW TRAILS
   */

  const drawTrail = (
    object: LoveObject
  ) => {
    for (
      let index =
        object.trail.length - 1;

      index >= 0;

      index -= 1
    ) {
      const point =
        object.trail[index];


      const age =
        index + 1;


      const progress =
        age /
        TRAIL_LENGTH;


      /*
       * Much stronger than the old trail.
       */

      const opacity =
        Math.max(
          0.055,
          0.46 -
            progress *
              0.38
        );


      /*
       * The trail itself uses monospace so its
       * degradation visibly becomes ASCII rather
       * than just broken display typography.
       */

      const trailFontSize =
        fontSize *
        0.88;


      context.font =
        `700 ${trailFontSize}px "Adwaita Mono", monospace`;

      context.textAlign =
        'left';

      context.textBaseline =
        'top';

      context.globalAlpha =
        opacity;

      context.fillStyle =
        object.colour;


      context.fillText(
        createTrailText(
          object.text,
          age
        ),

        point.x,
        point.y
      );


      /*
       * Tiny secondary offset makes the broken
       * characters feel electronically smeared.
       */

      context.globalAlpha =
        opacity *
        0.24;

      context.fillStyle =
        '#89dceb';


      context.fillText(
        createTrailText(
          object.text,
          age + 2
        ),

        point.x - 2,
        point.y + 1
      );
    }


    context.globalAlpha =
      1;


    /*
     * Restore main object font after using the
     * monospace trail font.
     */

    updateFont();
  };


  /*
   * DRAW OBJECT
   */

  const drawObject = (
    object: LoveObject
  ) => {
    context.globalAlpha =
      0.18;

    context.fillStyle =
      '#00d9ff';


    context.fillText(
      object.text,
      object.x - 2,
      object.y
    );


    context.fillStyle =
      '#ff9f1c';


    context.fillText(
      object.text,
      object.x + 2,
      object.y
    );


    context.globalAlpha =
      1;

    context.fillStyle =
      object.colour;


    context.fillText(
      object.text,
      object.x,
      object.y
    );
  };


  /*
   * DRAW FRAME
   */

  const draw =
    () => {
      context.clearRect(
        0,
        0,
        width,
        height
      );


      drawGrid();


      updateFont();


      for (
        const object
        of objects
      ) {
        drawTrail(
          object
        );
      }


      for (
        const object
        of objects
      ) {
        drawObject(
          object
        );
      }


      context.globalAlpha =
        1;
    };


  /*
   * WALL COLLISION
   */

  const resolveWallCollision = (
    object: LoveObject
  ) => {
    const minimumX =
      FIELD_PADDING;


    const maximumX =
      Math.max(
        minimumX,
        width -
          object.width -
          FIELD_PADDING
      );


    const minimumY =
      FIELD_PADDING;


    const maximumY =
      Math.max(
        minimumY,
        height -
          object.height -
          FIELD_PADDING
      );


    if (
      object.x <=
      minimumX
    ) {
      object.x =
        minimumX;

      object.velocityX =
        Math.abs(
          object.velocityX
        );
    }


    if (
      object.x >=
      maximumX
    ) {
      object.x =
        maximumX;

      object.velocityX =
        -Math.abs(
          object.velocityX
        );
    }


    if (
      object.y <=
      minimumY
    ) {
      object.y =
        minimumY;

      object.velocityY =
        Math.abs(
          object.velocityY
        );
    }


    if (
      object.y >=
      maximumY
    ) {
      object.y =
        maximumY;

      object.velocityY =
        -Math.abs(
          object.velocityY
        );
    }
  };


  /*
   * OBJECT COLLISION
   */

  const resolveObjectCollision = (
    first: LoveObject,
    second: LoveObject
  ) => {
    const firstLeft =
      first.x -
      OBJECT_PADDING;

    const firstRight =
      first.x +
      first.width +
      OBJECT_PADDING;

    const firstTop =
      first.y -
      OBJECT_PADDING;

    const firstBottom =
      first.y +
      first.height +
      OBJECT_PADDING;


    const secondLeft =
      second.x -
      OBJECT_PADDING;

    const secondRight =
      second.x +
      second.width +
      OBJECT_PADDING;

    const secondTop =
      second.y -
      OBJECT_PADDING;

    const secondBottom =
      second.y +
      second.height +
      OBJECT_PADDING;


    if (
      firstRight <=
        secondLeft ||

      firstLeft >=
        secondRight ||

      firstBottom <=
        secondTop ||

      firstTop >=
        secondBottom
    ) {
      return;
    }


    const overlapX =
      Math.min(
        firstRight -
          secondLeft,

        secondRight -
          firstLeft
      );


    const overlapY =
      Math.min(
        firstBottom -
          secondTop,

        secondBottom -
          firstTop
      );


    const firstCenterX =
      first.x +
      first.width /
        2;

    const secondCenterX =
      second.x +
      second.width /
        2;


    const firstCenterY =
      first.y +
      first.height /
        2;

    const secondCenterY =
      second.y +
      second.height /
        2;


    /*
     * Horizontal collision.
     */

    if (
      overlapX <
      overlapY
    ) {
      const correction =
        overlapX /
          2 +
        0.5;


      if (
        firstCenterX <
        secondCenterX
      ) {
        first.x -=
          correction;

        second.x +=
          correction;
      } else {
        first.x +=
          correction;

        second.x -=
          correction;
      }


      const firstVelocityX =
        first.velocityX;


      first.velocityX =
        second.velocityX;

      second.velocityX =
        firstVelocityX;


      if (
        firstCenterX <
        secondCenterX
      ) {
        first.velocityX =
          -Math.abs(
            first.velocityX
          );

        second.velocityX =
          Math.abs(
            second.velocityX
          );
      } else {
        first.velocityX =
          Math.abs(
            first.velocityX
          );

        second.velocityX =
          -Math.abs(
            second.velocityX
          );
      }
    }

    /*
     * Vertical collision.
     */

    else {
      const correction =
        overlapY /
          2 +
        0.5;


      if (
        firstCenterY <
        secondCenterY
      ) {
        first.y -=
          correction;

        second.y +=
          correction;
      } else {
        first.y +=
          correction;

        second.y -=
          correction;
      }


      const firstVelocityY =
        first.velocityY;


      first.velocityY =
        second.velocityY;

      second.velocityY =
        firstVelocityY;


      if (
        firstCenterY <
        secondCenterY
      ) {
        first.velocityY =
          -Math.abs(
            first.velocityY
          );

        second.velocityY =
          Math.abs(
            second.velocityY
          );
      } else {
        first.velocityY =
          Math.abs(
            first.velocityY
          );

        second.velocityY =
          -Math.abs(
            second.velocityY
          );
      }
    }


    resolveWallCollision(
      first
    );

    resolveWallCollision(
      second
    );
  };


  /*
   * UPDATE
   */

  const update = (
    deltaTime: number
  ) => {
    /*
     * Strong discrete trail samples.
     */

    trailAccumulator +=
      deltaTime *
      1000;


    if (
      trailAccumulator >=
      TRAIL_SPACING
    ) {
      captureTrails();


      trailAccumulator =
        0;
    }


    /*
     * Move objects.
     */

    for (
      const object
      of objects
    ) {
      object.x +=
        object.velocityX *
        deltaTime;


      object.y +=
        object.velocityY *
        deltaTime;


      resolveWallCollision(
        object
      );
    }


    /*
     * Object-object collisions.
     */

    for (
      let firstIndex = 0;
      firstIndex <
        objects.length;
      firstIndex += 1
    ) {
      for (
        let secondIndex =
          firstIndex + 1;

        secondIndex <
          objects.length;

        secondIndex += 1
      ) {
        resolveObjectCollision(
          objects[
            firstIndex
          ],

          objects[
            secondIndex
          ]
        );
      }
    }


    /*
     * Finally update the grid after movement.
     *
     * This means the disturbance follows the
     * current object positions.
     */

    updateGrid(
      deltaTime
    );
  };


  /*
   * ANIMATION
   */

  const animate = (
    time: number
  ) => {
    if (
      previousTime ===
      0
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


    update(
      deltaTime
    );


    draw();


    animationFrame =
      requestAnimationFrame(
        animate
      );
  };


  /*
   * STOP
   */

  const stopAnimation =
    () => {
      if (
        animationFrame !==
        null
      ) {
        cancelAnimationFrame(
          animationFrame
        );


        animationFrame =
          null;
      }


      previousTime =
        0;

      trailAccumulator =
        0;
    };


  /*
   * START
   */

  const startAnimation =
    () => {
      if (
        reducedMotion.matches ||
        !isNearViewport ||
        animationFrame !==
          null
      ) {
        return;
      }


      previousTime =
        0;


      animationFrame =
        requestAnimationFrame(
          animate
        );
    };


  /*
   * VIEWPORT ACTIVITY
   *
   * Keep the canvas mounted, but only run its animation
   * loop while the section is in or near the viewport.
   */

  let isNearViewport =
    false;

  const viewportObserver =
    new IntersectionObserver(
      ([entry]) => {
        isNearViewport =
          entry?.isIntersecting ??
          false;

        if (
          reducedMotion.matches
        ) {
          stopAnimation();
          draw();
          return;
        }

        if (
          isNearViewport
        ) {
          startAnimation();
        } else {
          stopAnimation();
        }
      },
      {
        rootMargin:
          '300px 0px',
        threshold: 0,
      }
    );


  /*
   * RESIZE
   */

  const resizeCanvas =
    () => {
      const bounds =
        field.getBoundingClientRect();


      width =
        Math.max(
          1,
          bounds.width
        );


      height =
        Math.max(
          1,
          bounds.height
        );


      pixelRatio =
        Math.min(
          window.devicePixelRatio ||
            1,
          2
        );


      canvas.width =
        Math.round(
          width *
            pixelRatio
        );


      canvas.height =
        Math.round(
          height *
            pixelRatio
        );


      canvas.style.width =
        `${width}px`;


      canvas.style.height =
        `${height}px`;


      context.setTransform(
        pixelRatio,
        0,
        0,
        pixelRatio,
        0,
        0
      );


      updateFont();

      createGrid();

      createObjects();

      draw();
    };


  /*
   * RESIZE OBSERVER
   */

  const resizeObserver =
    new ResizeObserver(
      resizeCanvas
    );


  resizeObserver.observe(
    field
  );


  /*
   * REDUCED MOTION
   */

  reducedMotion.addEventListener(
    'change',
    () => {
      if (
        reducedMotion.matches
      ) {
        stopAnimation();


        for (
          const object
          of objects
        ) {
          object.trail = [];
        }


        for (
          const row
          of grid
        ) {
          for (
            const cell
            of row
          ) {
            cell.energy =
              0;
          }
        }


        draw();
      } else {
        startAnimation();
      }
    }
  );


  /*
   * INITIALIZE
   */

  resizeCanvas();

  viewportObserver.observe(
    field
  );


  if (
    reducedMotion.matches
  ) {
    draw();
  }
}