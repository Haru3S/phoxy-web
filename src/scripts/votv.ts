import { textmode } from 'textmode.js';

const containers =
  document.querySelectorAll<HTMLElement>(
    '[data-votv-visual]',
  );

type RGB = readonly [number, number, number];

interface Tree {
  x: number;
  baseY: number;
  height: number;
  width: number;
  depth: number;
}

interface Dish {
  x: number;
  baseY: number;
  radius: number;
  angle: number;
  depth: number;
}

const COLORS = {
  skyTop: [6, 10, 22],
  skyBottom: [18, 29, 46],
  cloud: [39, 50, 66],
  mountainFar: [40, 54, 70],
  mountainMid: [28, 43, 55],
  mountainNear: [20, 35, 43],
  valleyFar: [18, 35, 35],
  valleyNear: [10, 25, 24],
  treeFar: [14, 31, 28],
  treeNear: [8, 22, 19],
  ground: [5, 15, 14],
  dishFar: [100, 116, 120],
  dish: [145, 158, 159],
  dishLight: [205, 214, 208],
  dishDark: [49, 63, 63],
  towerRed: [185, 55, 51],
  towerWhite: [191, 194, 187],
  beaconRed: [255, 57, 50],
} as const satisfies Record<string, RGB>;

const clamp = (
  value: number,
  min = 0,
  max = 1,
) =>
  Math.max(
    min,
    Math.min(max, value),
  );

const mix = (
  a: RGB,
  b: RGB,
  amount: number,
): [number, number, number] => {
  const n = clamp(amount);

  return [
    Math.round(
      a[0] +
        (b[0] - a[0]) * n,
    ),
    Math.round(
      a[1] +
        (b[1] - a[1]) * n,
    ),
    Math.round(
      a[2] +
        (b[2] - a[2]) * n,
    ),
  ];
};

const hash = (
  x: number,
  y = 0,
) => {
  const value =
    Math.sin(
      x * 127.1 +
        y * 311.7,
    ) *
    43758.5453123;

  return (
    value -
    Math.floor(value)
  );
};

for (const container of containers) {
  const t = textmode.create({
    width: Math.max(
      1,
      container.clientWidth,
    ),
    height: Math.max(
      1,
      container.clientHeight,
    ),
    fontSize: 10,
  });

  const reducedMotion =
    window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    );

  let trees: Tree[] = [];
  let dishes: Dish[] = [];

  let pointerX = 0;
  let targetPointerX = 0;
  let pointerStrength = 0;
  let targetPointerStrength = 0;

  const cell = (
    x: number,
    y: number,
    char: string,
    foreground: RGB,
    background: RGB,
  ) => {
    t.push();

    t.translate(
      Math.round(x),
      Math.round(y),
    );

    t.char(char);

    t.charColor(
      foreground[0],
      foreground[1],
      foreground[2],
    );

    t.cellColor(
      background[0],
      background[1],
      background[2],
    );

    t.point();
    t.pop();
  };

  const skyColorAt = (
    y: number,
  ): [number, number, number] => {
    const rows = t.grid.rows;

    return mix(
      COLORS.skyTop,
      COLORS.skyBottom,
      clamp(
        (y + rows / 2) /
          Math.max(
            1,
            rows * 0.72,
          ),
      ),
    );
  };

  const rebuildScene = () => {
    const cols = t.grid.cols;
    const rows = t.grid.rows;

    trees = [];

    const addTreeBand = (
      count: number,
      baseline: number,
      minHeight: number,
      maxHeight: number,
      minWidth: number,
      maxWidth: number,
      depth: number,
      seedOffset: number,
    ) => {
      const spacing =
        cols /
        Math.max(
          1,
          count - 1,
        );

      for (
        let index = 0;
        index < count;
        index++
      ) {
        const seed =
          seedOffset + index;

        trees.push({
          x:
            -cols / 2 +
            index * spacing +
            (
              hash(seed, 3) -
              0.5
            ) *
              spacing *
              1.2,

          baseY:
            -rows / 2 +
            baseline +
            (
              hash(seed, 5) -
              0.5
            ) *
              1.5,

          height:
            minHeight +
            hash(seed, 7) *
              (
                maxHeight -
                minHeight
              ),

          width:
            minWidth +
            hash(seed, 11) *
              (
                maxWidth -
                minWidth
              ),

          depth,
        });
      }
    };

    /*
     * The reference reads as a valley first,
     * forest second. Keep the trees small and
     * concentrated near the lower third.
     */
    addTreeBand(
      Math.ceil(cols / 4.8),
      rows * 0.66,
      5,
      9,
      1.4,
      2.5,
      0.35,
      100,
    );

    addTreeBand(
      Math.ceil(cols / 3.6),
      rows * 0.75,
      7,
      12,
      1.8,
      3.3,
      0.72,
      300,
    );

    addTreeBand(
      Math.ceil(cols / 5.5),
      rows * 0.87,
      8,
      14,
      2,
      3.8,
      1,
      600,
    );

    dishes = [
      /*
       * Main valley dish.
       */
      {
        x: cols * 0.17,
        baseY:
          rows * 0.15,
        radius:
          Math.max(
            6.1,
            Math.min(
              10.8,
              cols * 0.043,
            ),
          ),
        angle: -0.2,
        depth: 0.85,
      },

      /*
       * Left distance.
       */
      {
        x: -cols * 0.3,
        baseY:
          rows * 0.11,
        radius:
          Math.max(
            3.8,
            Math.min(
              6.5,
              cols * 0.026,
            ),
          ),
        angle: 0.28,
        depth: 0.55,
      },

      /*
       * Far right distance.
       */
      {
        x: cols * 0.39,
        baseY:
          rows * 0.13,
        radius:
          Math.max(
            3.3,
            Math.min(
              5.4,
              cols * 0.022,
            ),
          ),
        angle: -0.38,
        depth: 0.48,
      },
    ];
  };

  const drawSky = (
    time: number,
  ) => {
    const cols = t.grid.cols;
    const rows = t.grid.rows;

    for (
      let y = -rows / 2;
      y < rows / 2;
      y++
    ) {
      const sky =
        skyColorAt(y);

      for (
        let x = -cols / 2;
        x < cols / 2;
        x++
      ) {
        const cloudNoise =
          (
            Math.sin(
              x * 0.035 +
                time * 0.025,
            ) +
            Math.sin(
              x * 0.017 +
                y * 0.08 +
                1.9,
            ) +
            Math.sin(
              x * 0.071 -
                y * 0.035 +
                4.2,
            )
          ) /
          3;

        const altitude =
          clamp(
            1 -
              (
                y +
                rows * 0.3
              ) /
                (
                  rows *
                  0.42
                ),
          );

        const cloudAmount =
          clamp(
            (
              cloudNoise -
              0.22
            ) *
              2.5,
          ) *
          altitude;

        if (
          cloudAmount >
          0.12
        ) {
          const cloudColor =
            mix(
              sky,
              COLORS.cloud,
              cloudAmount *
                0.72,
            );

          const glyph =
            cloudAmount > 0.52
              ? '░'
              : cloudAmount > 0.28
                ? '·'
                : ' ';

          cell(
            x,
            y,
            glyph,
            cloudColor,
            cloudColor,
          );
        } else {
          cell(
            x,
            y,
            ' ',
            sky,
            sky,
          );
        }
      }
    }
  };

  const drawStars = (
    time: number,
  ) => {
    const cols = t.grid.cols;
    const rows = t.grid.rows;

    const count =
      Math.max(
        28,
        Math.floor(
          cols * 0.38,
        ),
      );

    for (
      let index = 0;
      index < count;
      index++
    ) {
      const x =
        -cols / 2 +
        hash(
          index,
          701,
        ) *
          cols;

      const y =
        -rows / 2 +
        hash(
          index,
          709,
        ) *
          rows *
          0.51;

      const baseBrightness =
        120 +
        hash(
          index,
          719,
        ) *
          80;

      const speed =
        0.35 +
        hash(
          index,
          727,
        ) *
          1.15;

      const phase =
        hash(
          index,
          733,
        ) *
        Math.PI *
        2;

      /*
       * Most stars only shimmer slightly.
       * A small minority get a stronger twinkle.
       */
      const strong =
        hash(
          index,
          739,
        ) >
        0.82;

      const wave =
        reducedMotion.matches
          ? 0.5
          : (
              Math.sin(
                time *
                  speed +
                  phase,
              ) +
              1
            ) /
            2;

      const sparkle =
        strong
          ? Math.pow(
              wave,
              5,
            )
          : wave * 0.34;

      const brightness =
        Math.round(
          Math.min(
            245,
            baseBrightness +
              sparkle *
                (
                  strong
                    ? 105
                    : 35
                ),
          ),
        );

      const starColor: RGB = [
        brightness,
        brightness,
        Math.min(
          255,
          brightness + 10,
        ),
      ];

      const glyph =
        strong &&
        sparkle > 0.72
          ? '✦'
          : hash(
                index,
                743,
              ) >
              0.74
            ? '·'
            : '.';

      cell(
        x,
        y,
        glyph,
        starColor,
        skyColorAt(y),
      );
    }
  };

  const drawTower = (
    time: number,
  ) => {
    const cols = t.grid.cols;
    const rows = t.grid.rows;

    /*
     * From this distance the tower reads almost
     * as a straight line. The real flared base
     * is buried completely behind the forest.
     */
    const centerX =
      cols * 0.025 +
      pointerX *
        -0.5 *
        pointerStrength;

    const topY =
      -rows / 2 +
      rows * 0.18;

    const buriedBottomY =
      -rows / 2 +
      rows * 0.8;

    const height =
      buriedBottomY -
      topY;

    const halfWidth =
      Math.max(
        0.65,
        Math.min(
          1.25,
          cols * 0.005,
        ),
      );

    const sections = 12;

    for (
      let section = 0;
      section < sections;
      section++
    ) {
      const start =
        section /
        sections;

      const end =
        (
          section + 1
        ) /
        sections;

      const yStart =
        topY +
        height * start;

      const yEnd =
        topY +
        height * end;

      const color =
        section % 2 === 0
          ? COLORS.towerRed
          : COLORS.towerWhite;

      for (
        let y = yStart;
        y <= yEnd;
        y += 0.5
      ) {
        cell(
          centerX -
            halfWidth,
          y,
          '│',
          color,
          skyColorAt(y),
        );

        cell(
          centerX +
            halfWidth,
          y,
          '│',
          color,
          skyColorAt(y),
        );
      }

      /*
       * Tiny horizontal and diagonal trusses:
       * enough to imply structure without
       * widening the silhouette.
       */
      cell(
        centerX,
        yStart,
        '─',
        color,
        skyColorAt(
          yStart,
        ),
      );

      const middleY =
        (
          yStart +
          yEnd
        ) /
        2;

      cell(
        centerX,
        middleY,
        section % 2 === 0
          ? '╳'
          : '╫',
        color,
        skyColorAt(
          middleY,
        ),
      );
    }

    /*
     * Very thin antenna extension.
     */
    const antennaTop =
      topY -
      Math.max(
        4,
        rows * 0.055,
      );

    for (
      let y = antennaTop;
      y < topY;
      y++
    ) {
      const color =
        Math.floor(
          y - antennaTop,
        ) %
          4 <
        2
          ? COLORS.towerWhite
          : COLORS.towerRed;

      cell(
        centerX,
        y,
        '│',
        color,
        skyColorAt(y),
      );
    }

    /*
     * Independent obstruction lights.
     */
    const beacons = [
      {
        y: antennaTop,
        phase: 0,
      },
      {
        y:
          topY +
          height * 0.2,
        phase: 0.82,
      },
      {
        y:
          topY +
          height * 0.43,
        phase: 1.61,
      },
      {
        y:
          topY +
          height * 0.66,
        phase: 2.24,
      },
    ];

    for (
      const beacon of beacons
    ) {
      const cycle =
        (
          time * 0.7 +
          beacon.phase
        ) %
        2.9;

      const on =
        reducedMotion.matches
          ? beacon.phase <
            0.9
          : cycle < 0.32;

      if (!on) {
        continue;
      }

      cell(
        centerX,
        beacon.y,
        '●',
        COLORS.beaconRed,
        skyColorAt(
          beacon.y,
        ),
      );

      const halo: RGB = [
        126,
        35,
        39,
      ];

      cell(
        centerX - 1,
        beacon.y,
        '·',
        halo,
        skyColorAt(
          beacon.y,
        ),
      );

      cell(
        centerX + 1,
        beacon.y,
        '·',
        halo,
        skyColorAt(
          beacon.y,
        ),
      );
    }
  };

  /*
   * A hand-shaped alpine silhouette rather than
   * generic sine-wave hills. Each mountain is
   * assembled from broad triangular masses with
   * smaller ridges layered into the outline.
   */
  const mountainProfile = (
    x: number,
    cols: number,
    layer: number,
  ) => {
    const normalized =
      x / cols;

    if (layer === 0) {
      return (
        Math.max(
          0,
          1 -
            Math.abs(
              normalized +
                0.34,
            ) /
              0.29,
        ) *
          10 +
        Math.max(
          0,
          1 -
            Math.abs(
              normalized -
                0.02,
            ) /
              0.2,
        ) *
          15 +
        Math.max(
          0,
          1 -
            Math.abs(
              normalized -
                0.29,
            ) /
              0.3,
        ) *
          11 +
        Math.sin(
          x * 0.12,
        ) *
          0.8
      );
    }

    if (layer === 1) {
      return (
        Math.max(
          0,
          1 -
            Math.abs(
              normalized +
                0.43,
            ) /
              0.24,
        ) *
          12 +
        Math.max(
          0,
          1 -
            Math.abs(
              normalized +
                0.08,
            ) /
              0.27,
        ) *
          8 +
        Math.max(
          0,
          1 -
            Math.abs(
              normalized -
                0.34,
            ) /
              0.23,
        ) *
          13 +
        Math.sin(
          x * 0.17 +
            2,
        ) *
          0.9
      );
    }

    return (
      Math.max(
        0,
        1 -
          Math.abs(
            normalized +
              0.23,
          ) /
            0.34,
      ) *
        8 +
      Math.max(
        0,
        1 -
          Math.abs(
            normalized -
              0.2,
          ) /
            0.38,
      ) *
        9 +
      Math.sin(
        x * 0.1 +
          4,
      ) *
        1.1
    );
  };

  const drawMountainLayer = (
    layer: number,
    baselineRatio: number,
    color: RGB,
    parallaxAmount: number,
  ) => {
    const cols = t.grid.cols;
    const rows = t.grid.rows;

    const offset =
      pointerX *
      parallaxAmount *
      pointerStrength;

    for (
      let x = -cols / 2;
      x < cols / 2;
      x++
    ) {
      const sampleX =
        x + offset;

      const height =
        mountainProfile(
          sampleX,
          cols,
          layer,
        );

      const horizon =
        -rows / 2 +
        rows *
          baselineRatio -
        height;

      for (
        let y = horizon;
        y <
        -rows / 2 +
          rows *
            (
              baselineRatio +
              0.14
            );
        y++
      ) {
        const distance =
          y - horizon;

        const sky =
          skyColorAt(y);

        const glyph =
          distance < 1
            ? layer === 0
              ? '░'
              : '▒'
            : distance < 3
              ? layer === 0
                ? '▒'
                : '▓'
              : '█';

        const shade =
          distance < 2
            ? mix(
                color,
                sky,
                0.12,
              )
            : color;

        cell(
          x,
          y,
          glyph,
          shade,
          shade,
        );
      }
    }
  };

  const drawValley = () => {
    const cols = t.grid.cols;
    const rows = t.grid.rows;

    const start =
      -rows / 2 +
      rows * 0.67;

    for (
      let y = start;
      y < rows / 2;
      y++
    ) {
      const depth =
        clamp(
          (y - start) /
            Math.max(
              1,
              rows / 2 -
                start,
            ),
        );

      const color =
        mix(
          COLORS.valleyFar,
          COLORS.ground,
          depth,
        );

      for (
        let x = -cols / 2;
        x < cols / 2;
        x++
      ) {
        const texture =
          hash(
            Math.floor(
              x * 0.45,
            ),
            Math.floor(
              y * 0.7,
            ),
          );

        const glyph =
          depth < 0.2
            ? texture > 0.78
              ? '░'
              : ' '
            : depth < 0.55
              ? texture > 0.7
                ? '▒'
                : '░'
              : texture > 0.72
                ? '▓'
                : '▒';

        cell(
          x,
          y,
          glyph,
          color,
          color,
        );
      }
    }
  };

  const drawTree = (
    tree: Tree,
  ) => {
    const x =
      tree.x +
      pointerX *
        -2.2 *
        tree.depth *
        pointerStrength;

    const color =
      tree.depth < 0.5
        ? COLORS.treeFar
        : tree.depth < 0.9
          ? COLORS.treeNear
          : COLORS.ground;

    const top =
      tree.baseY -
      tree.height;

    for (
      let row = 0;
      row <
      Math.ceil(
        tree.height,
      );
      row++
    ) {
      const progress =
        row /
        tree.height;

      const width =
        Math.max(
          0.45,
          tree.width *
            Math.pow(
              progress,
              0.78,
            ),
        );

      for (
        let dx =
          -Math.ceil(width);
        dx <=
          Math.ceil(width);
        dx++
      ) {
        if (
          Math.abs(dx) >
          width +
            hash(
              row,
              dx +
                Math.round(
                  tree.x,
                ),
            ) *
              0.35
        ) {
          continue;
        }

        const glyph =
          tree.depth < 0.5
            ? '░'
            : tree.depth < 0.9
              ? '▒'
              : '▓';

        cell(
          x + dx,
          top + row,
          glyph,
          color,
          color,
        );
      }
    }

    cell(
      x,
      tree.baseY,
      '│',
      color,
      color,
    );
  };

  const drawDish = (
    dish: Dish,
    time: number,
  ) => {
    const motion =
      reducedMotion.matches
        ? 0
        : Math.sin(
            time * 0.09 +
              dish.x * 0.01,
          ) *
          0.018;

    const angle =
      dish.angle +
      motion;

    const x =
      dish.x +
      pointerX *
        -2.8 *
        dish.depth *
        pointerStrength;

    const baseY =
      dish.baseY;

    const radius =
      dish.radius;

    const bowlY =
      baseY -
      radius * 1.65;

    const structure =
      dish.depth < 0.6
        ? COLORS.dishFar
        : COLORS.dish;

    const highlight =
      dish.depth < 0.6
        ? COLORS.dish
        : COLORS.dishLight;

    /*
     * Broad parabolic reflector. The front edge
     * is bright; the interior is sparse so the
     * dish stays readable at small sizes.
     */
    for (
      let px = -radius;
      px <= radius;
      px += 0.32
    ) {
      const normalized =
        px / radius;

      const curve =
        normalized *
        normalized *
        radius *
        0.46;

      const localX =
        px;

      const localY =
        curve;

      const rx =
        localX *
          Math.cos(angle) -
        localY *
          Math.sin(angle);

      const ry =
        localX *
          Math.sin(angle) +
        localY *
          Math.cos(angle);

      cell(
        x + rx,
        bowlY + ry,
        Math.abs(px) >
        radius * 0.82
          ? '▓'
          : '█',
        highlight,
        structure,
      );

      if (
        Math.abs(px) <
          radius * 0.8 &&
        Math.round(
          Math.abs(px) * 2,
        ) %
          2 ===
          0
      ) {
        cell(
          x +
            rx -
            Math.sin(angle),
          bowlY +
            ry +
            Math.cos(angle),
          '░',
          structure,
          structure,
        );
      }
    }

    /*
     * Central feed arm.
     */
    const feedLength =
      radius * 0.78;

    for (
      let step = 0;
      step <= feedLength;
      step += 0.65
    ) {
      const fx =
        x +
        Math.sin(angle) *
          step;

      const fy =
        bowlY -
        Math.cos(angle) *
          step;

      cell(
        fx,
        fy,
        step >
          feedLength * 0.84
          ? '◆'
          : '│',
        highlight,
        skyColorAt(fy),
      );
    }

    /*
     * Narrow support tower.
     */
    const towerTop =
      bowlY +
      radius * 0.38;

    for (
      let y = towerTop;
      y <= baseY;
      y++
    ) {
      const progress =
        clamp(
          (y - towerTop) /
            Math.max(
              1,
              baseY -
                towerTop,
            ),
        );

      const halfWidth =
        0.5 +
        progress *
          radius *
          0.22;

      cell(
        x - halfWidth,
        y,
        '/',
        COLORS.dishDark,
        COLORS.dishDark,
      );

      cell(
        x,
        y,
        '│',
        structure,
        COLORS.dishDark,
      );

      cell(
        x + halfWidth,
        y,
        '\\',
        COLORS.dishDark,
        COLORS.dishDark,
      );
    }

    for (
      let bx =
        -radius * 0.42;
      bx <=
        radius * 0.42;
      bx++
    ) {
      cell(
        x + bx,
        baseY,
        '▄',
        COLORS.dishDark,
        COLORS.dishDark,
      );
    }
  };

  const updatePointer = () => {
    pointerX +=
      (
        targetPointerX -
        pointerX
      ) *
      0.045;

    pointerStrength +=
      (
        targetPointerStrength -
        pointerStrength
      ) *
      0.055;
  };

  const setPointerTarget = (
    event: PointerEvent,
  ) => {
    const rect =
      container.getBoundingClientRect();

    targetPointerX =
      (
        event.clientX -
        rect.left
      ) /
        rect.width -
      0.5;
  };

  container.addEventListener(
    'pointerenter',
    (event) => {
      if (
        reducedMotion.matches
      ) {
        return;
      }

      setPointerTarget(event);
      pointerX =
        targetPointerX;
      targetPointerStrength = 1;
    },
  );

  container.addEventListener(
    'pointermove',
    (event) => {
      if (
        reducedMotion.matches
      ) {
        return;
      }

      setPointerTarget(event);
      targetPointerStrength = 1;
    },
  );

  container.addEventListener(
    'pointerleave',
    () => {
      targetPointerStrength = 0;
    },
  );

  t.draw(() => {
    const time =
      reducedMotion.matches
        ? 0
        : t.frameCount / 60;

    if (
      !reducedMotion.matches
    ) {
      updatePointer();
    }

    /*
     * Large, quiet sky.
     */
    drawSky(time);
    drawStars(time);

    /*
     * Three mountain depths create the broad
     * alpine valley from the reference.
     */
    drawMountainLayer(
      0,
      0.57,
      COLORS.mountainFar,
      0.6,
    );

    drawMountainLayer(
      1,
      0.63,
      COLORS.mountainMid,
      1.1,
    );

    drawMountainLayer(
      2,
      0.69,
      COLORS.mountainNear,
      1.7,
    );

    drawValley();

    /*
     * Tower first: every forest layer is drawn
     * over it, hiding the base at valley scale.
     */
    drawTower(time);

    /*
     * Far trees establish the valley's dark
     * forest edge without swallowing the sky.
     */
    for (const tree of trees) {
      if (
        tree.depth < 0.5
      ) {
        drawTree(tree);
      }
    }

    /*
     * Distant dishes sit partially inside the
     * forest, like infrastructure scattered
     * across the valley.
     */
    for (
      let index = 1;
      index < dishes.length;
      index++
    ) {
      drawDish(
        dishes[index],
        time,
      );
    }

    for (const tree of trees) {
      if (
        tree.depth >= 0.5 &&
        tree.depth < 0.9
      ) {
        drawTree(tree);
      }
    }

    /*
     * Main dish: visible landmark, not giant
     * sci-fi centerpiece.
     */
    if (dishes[0]) {
      drawDish(
        dishes[0],
        time,
      );
    }

    for (const tree of trees) {
      if (
        tree.depth >= 0.9
      ) {
        drawTree(tree);
      }
    }
  });

  container.appendChild(
    t.canvas,
  );

  const resizeObserver =
    new ResizeObserver(
      ([entry]) => {
        if (!entry) {
          return;
        }

        t.resizeCanvas(
          Math.max(
            1,
            Math.floor(
              entry.contentRect.width,
            ),
          ),
          Math.max(
            1,
            Math.floor(
              entry.contentRect.height,
            ),
          ),
        );

        requestAnimationFrame(() => {
          rebuildScene();
        });
      },
    );

  resizeObserver.observe(
    container,
  );

  /*
   * Textmode derives grid.cols / grid.rows from the canvas size.
   * Build the array-backed scene only after the canvas has been
   * explicitly sized to the mounted container; otherwise trees
   * and dishes can be generated against the temporary startup grid.
   */
  t.resizeCanvas(
    Math.max(
      1,
      Math.floor(
        container.clientWidth,
      ),
    ),
    Math.max(
      1,
      Math.floor(
        container.clientHeight,
      ),
    ),
  );

  requestAnimationFrame(() => {
    rebuildScene();
  });
}
