import { textmode } from 'textmode.js';

const containers =
  document.querySelectorAll<HTMLElement>(
    '[data-link-visual]',
  );

const COLORS = {
  deep: [104, 55, 180],
  violet: [147, 86, 255],
  mauve: [203, 166, 247],
  pink: [225, 150, 255],
  lavender: [210, 190, 255],
  white: [255, 255, 255],
} as const;

type RGB = readonly [number, number, number];
type Vec3 = [number, number, number];

interface Cell {
  x: number;
  y: number;
  z: number;
  light: number;
}

interface PointerState {
  targetX: number;
  targetY: number;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  velocityX: number;
  velocityY: number;
  targetStrength: number;
  strength: number;
}

const MAJOR_RADIUS = 1.25;
const MINOR_RADIUS = 0.48;
const MAJOR_STEPS = 220;
const MINOR_STEPS = 110;

const DISTORTION_RADIUS = 22;
const DISTORTION_FORCE = 6.0;
const DISTORTION_DRAG = 2.2;

const LIGHT: Vec3 = [0, -0.72, 0.69];

const clamp = (
  value: number,
  min = 0,
  max = 1,
) =>
  Math.max(
    min,
    Math.min(max, value),
  );

function mix(
  a: RGB,
  b: RGB,
  amount: number,
): Vec3 {
  const n = clamp(amount);

  return [
    Math.round(a[0] + (b[0] - a[0]) * n),
    Math.round(a[1] + (b[1] - a[1]) * n),
    Math.round(a[2] + (b[2] - a[2]) * n),
  ];
}

function rotate(
  [x, y, z]: Vec3,
  ax: number,
  ay: number,
  az: number,
): Vec3 {
  const sx = Math.sin(ax);
  const cx = Math.cos(ax);
  const sy = Math.sin(ay);
  const cy = Math.cos(ay);
  const sz = Math.sin(az);
  const cz = Math.cos(az);

  const y1 = y * cx - z * sx;
  const z1 = y * sx + z * cx;
  const x2 = x * cy + z1 * sy;
  const z2 = -x * sy + z1 * cy;

  return [
    x2 * cz - y1 * sz,
    x2 * sz + y1 * cz,
    z2,
  ];
}

function getColor(light: number): Vec3 {
  if (light < 0.18) {
    return mix(
      COLORS.deep,
      COLORS.violet,
      light / 0.18,
    );
  }

  if (light < 0.45) {
    return mix(
      COLORS.violet,
      COLORS.mauve,
      (light - 0.18) / 0.27,
    );
  }

  if (light < 0.68) {
    return mix(
      COLORS.mauve,
      COLORS.pink,
      (light - 0.45) / 0.23,
    );
  }

  if (light < 0.84) {
    return mix(
      COLORS.pink,
      COLORS.lavender,
      (light - 0.68) / 0.16,
    );
  }

  return mix(
    COLORS.lavender,
    COLORS.white,
    (light - 0.84) / 0.16,
  );
}

function getCharacter(
  light: number,
  x: number,
  y: number,
) {
  const ramp = '.,:;-~=+*#%@';

  const noise =
    Math.sin(
      x * 12.9898 +
      y * 78.233,
    ) *
    43758.5453;

  const grain =
    noise -
    Math.floor(noise);

  const value =
    clamp(
      light +
      (grain - 0.5) * 0.08,
    );

  return ramp[
    Math.floor(
      value *
      (ramp.length - 1),
    )
  ];
}

for (const container of containers) {
  const t = textmode.create({
    width: container.clientWidth,
    height: container.clientHeight,
    fontSize: 10,
  });

  const pointer: PointerState = {
    targetX: 0,
    targetY: 0,
    x: 0,
    y: 0,
    previousX: 0,
    previousY: 0,
    velocityX: 0,
    velocityY: 0,
    targetStrength: 0,
    strength: 0,
  };

  const reducedMotion =
    window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    );

  function pointerToGrid(
    event: PointerEvent,
  ) {
    const grid = t.grid;
    if (!grid) {
      return { x: 0, y: 0 };
    }

    const rect =
      container.getBoundingClientRect();

    const normalizedX =
      (event.clientX - rect.left) /
      rect.width;

    const normalizedY =
      (event.clientY - rect.top) /
      rect.height;

    return {
      x:
        (normalizedX - 0.5) *
        grid.cols,

      y:
        (normalizedY - 0.5) *
        grid.rows,
    };
  }

  function updatePointer() {
    pointer.x +=
      (pointer.targetX - pointer.x) *
      0.18;

    pointer.y +=
      (pointer.targetY - pointer.y) *
      0.18;

    const movementX =
      pointer.x -
      pointer.previousX;

    const movementY =
      pointer.y -
      pointer.previousY;

    pointer.velocityX =
      pointer.velocityX * 0.72 +
      movementX * 0.28;

    pointer.velocityY =
      pointer.velocityY * 0.72 +
      movementY * 0.28;

    pointer.previousX = pointer.x;
    pointer.previousY = pointer.y;

    pointer.strength +=
      (
        pointer.targetStrength -
        pointer.strength
      ) *
      0.1;
  }

  function distort(
    x: number,
    y: number,
  ) {
    if (pointer.strength < 0.001) {
      return { x, y };
    }

    const dx = x - pointer.x;
    const dy = y - pointer.y;

    const distance =
      Math.hypot(dx, dy);

    if (
      distance >=
      DISTORTION_RADIUS
    ) {
      return { x, y };
    }

    const normalized =
      1 -
      distance /
      DISTORTION_RADIUS;

    const falloff =
      normalized *
      normalized *
      (3 - 2 * normalized);

    const safeDistance =
      Math.max(distance, 0.001);

    const nx =
      dx / safeDistance;

    const ny =
      dy / safeDistance;

    const push =
      falloff *
      DISTORTION_FORCE *
      pointer.strength;

    const dragX =
      pointer.velocityX *
      falloff *
      DISTORTION_DRAG *
      pointer.strength;

    const dragY =
      pointer.velocityY *
      falloff *
      DISTORTION_DRAG *
      pointer.strength;

    return {
      x:
        x +
        nx * push +
        dragX,

      y:
        y +
        ny * push +
        dragY,
    };
  }

  container.addEventListener(
    'pointerenter',
    (event) => {
      if (reducedMotion.matches) {
        return;
      }

      const position =
        pointerToGrid(event);

      pointer.targetX = position.x;
      pointer.targetY = position.y;
      pointer.x = position.x;
      pointer.y = position.y;
      pointer.previousX = position.x;
      pointer.previousY = position.y;
      pointer.velocityX = 0;
      pointer.velocityY = 0;
      pointer.targetStrength = 1;
    },
  );

  container.addEventListener(
    'pointermove',
    (event) => {
      if (reducedMotion.matches) {
        return;
      }

      const position =
        pointerToGrid(event);

      pointer.targetX = position.x;
      pointer.targetY = position.y;
      pointer.targetStrength = 1;
    },
  );

  container.addEventListener(
    'pointerleave',
    () => {
      pointer.targetStrength = 0;
    },
  );

  t.draw(() => {
    const grid = t.grid;
    if (!grid) {
      return;
    }

    t.background(0);

    const time =
      reducedMotion.matches
        ? 0
        : t.frameCount / 60;

    if (!reducedMotion.matches) {
      updatePointer();
    }

    const ax = time * 0.37;
    const ay = time * 0.26;
    const az = time * 0.19;

    const scale =
      Math.min(
        grid.cols,
        grid.rows * 1.7,
      ) *
      0.23;

    const cameraDistance = 5.5;

    const cells =
      new Map<string, Cell>();

    for (
      let i = 0;
      i < MAJOR_STEPS;
      i++
    ) {
      const u =
        i /
        MAJOR_STEPS *
        Math.PI *
        2;

      const cu = Math.cos(u);
      const su = Math.sin(u);

      for (
        let j = 0;
        j < MINOR_STEPS;
        j++
      ) {
        const v =
          j /
          MINOR_STEPS *
          Math.PI *
          2;

        const cv = Math.cos(v);
        const sv = Math.sin(v);

        const ring =
          MAJOR_RADIUS +
          MINOR_RADIUS * cv;

        const [
          px,
          py,
          pz,
        ] =
          rotate(
            [
              ring * cu,
              MINOR_RADIUS * sv,
              ring * su,
            ],
            ax,
            ay,
            az,
          );

        const [
          nx,
          ny,
          nz,
        ] =
          rotate(
            [
              cv * cu,
              sv,
              cv * su,
            ],
            ax,
            ay,
            az,
          );

        if (nz <= 0) {
          continue;
        }

        const perspective =
          cameraDistance /
          (cameraDistance - pz);

        const baseScreenX =
          px *
          perspective *
          scale;

        const baseScreenY =
          py *
          perspective *
          scale;

        const distorted =
          distort(
            baseScreenX,
            baseScreenY,
          );

        const screenX =
          Math.round(
            distorted.x,
          );

        const screenY =
          Math.round(
            distorted.y,
          );

        const diffuse =
          Math.max(
            0,
            nx * LIGHT[0] +
            ny * LIGHT[1] +
            nz * LIGHT[2],
          );

        const broadLight =
          Math.pow(
            diffuse,
            0.72,
          );

        const highlight =
          Math.pow(
            diffuse,
            5,
          );

        const cameraFill =
          Math.pow(
            clamp(nz),
            1.5,
          );

        const light =
          clamp(
            0.09 +
            broadLight * 0.73 +
            highlight * 0.22 +
            cameraFill * 0.12,
          );

        const key =
          `${screenX},${screenY}`;

        const existing =
          cells.get(key);

        if (
          existing &&
          existing.z >= pz
        ) {
          continue;
        }

        cells.set(
          key,
          {
            x: screenX,
            y: screenY,
            z: pz,
            light,
          },
        );
      }
    }

    for (
      const cell
      of cells.values()
    ) {
      const [r, g, b] =
        getColor(cell.light);

      t.push();

      t.translate(
        cell.x,
        cell.y,
      );

      t.char(
        getCharacter(
          cell.light,
          cell.x,
          cell.y,
        ),
      );

      t.charColor(r, g, b);
      t.cellColor(0, 0, 0);
      t.point();
      t.pop();
    }
  });

  container.appendChild(
    t.canvas,
  );

  const resizeObserver =
    new ResizeObserver(
      ([entry]) => {
        if (!entry) return;

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
      },
    );

  resizeObserver.observe(
    container,
  );
}
