/*
 * 404 SOURCEBOX GRID
 *
 * An enormous three-dimensional coordinate
 * space inspired by the fictional SourceBox
 * viewport from INTERLOPER.
 *
 * Three warm Catppuccin coordinate planes:
 *
 *   XZ = Peach
 *   XY = Yellow
 *   YZ = Maroon
 *
 * Each page load chooses a random rotational
 * direction through 3D space.
 *
 * Pointer movement adds a heavy rotational
 * influence. Orientation is persistent:
 * nothing returns to a predefined home angle.
 */

const canvas =
  document.querySelector<HTMLCanvasElement>(
    '[data-not-found-visual]'
  );

const context =
  canvas?.getContext('2d');

const reducedMotionQuery =
  window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  );


/*
 * TYPES
 */

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface ProjectedPoint {
  x: number;
  y: number;

  depth: number;

  visible: boolean;
}

interface PointerState {
  x: number;
  y: number;

  targetX: number;
  targetY: number;

  active: boolean;
}

interface GridColor {
  red: number;
  green: number;
  blue: number;
}


/*
 * CANVAS STATE
 */

let width = 0;
let height = 0;

let pixelRatio = 1;

let animationFrame = 0;
let previousTime = 0;


/*
 * POINTER
 */

const pointer: PointerState = {
  x: 0,
  y: 0,

  targetX: 0,
  targetY: 0,

  active: false,
};


/*
 * CATPPUCCIN MOCHA
 *
 * Warm plane colors.
 */

const PEACH: GridColor = {
  red: 250,
  green: 179,
  blue: 135,
};

const YELLOW: GridColor = {
  red: 249,
  green: 226,
  blue: 175,
};

const MAROON: GridColor = {
  red: 235,
  green: 160,
  blue: 172,
};


/*
 * GRID
 *
 * Large enough that the edges should generally
 * live well beyond the viewport.
 */

const GRID_EXTENT = 30;

const GRID_SPACING = 1;


/*
 * CAMERA
 */

const CAMERA_DISTANCE = 24;

const PERSPECTIVE = 15;


/*
 * RANDOM STARTING ORIENTATION
 */

let rotationPitch =
  -0.35 +
  (
    Math.random() -
    0.5
  ) *
    0.5;

let rotationYaw =
  0.5 +
  (
    Math.random() -
    0.5
  ) *
    0.8;

let rotationRoll =
  (
    Math.random() -
    0.5
  ) *
    0.35;


/*
 * RANDOM FREE ROTATION
 *
 * Each reload chooses independent signed
 * rotational velocities.
 *
 * These are intentionally much stronger than
 * the previous version. The movement should be
 * clearly perceptible while remaining slow.
 */

const randomSignedSpeed = (
  minimum: number,
  maximum: number
) => {
  const magnitude =
    minimum +
    Math.random() *
      (
        maximum -
        minimum
      );

  return (
    Math.random() < 0.5
      ? -magnitude
      : magnitude
  );
};

const idlePitchVelocity =
  randomSignedSpeed(
    0.012,
    0.025
  );

const idleYawVelocity =
  randomSignedSpeed(
    0.016,
    0.032
  );

const idleRollVelocity =
  randomSignedSpeed(
    0.008,
    0.019
  );


/*
 * POINTER ROTATIONAL VELOCITY
 *
 * Cursor interaction changes velocity rather
 * than directly setting orientation.
 */

let pointerPitchVelocity = 0;
let pointerYawVelocity = 0;
let pointerRollVelocity = 0;


/*
 * POINTER FORCE
 *
 * Strong enough to visibly rotate the camera,
 * but still substantially damped.
 */

const POINTER_PITCH_FORCE =
  0.018;

const POINTER_YAW_FORCE =
  0.014;

const POINTER_ROLL_FORCE =
  0.021;


/*
 * Cursor position itself eases toward the real
 * pointer before affecting rotation.
 */

const POINTER_POSITION_SMOOTHING =
  3.2;


/*
 * Rotational response.
 *
 * This keeps interaction weighty rather than
 * immediately snapping to the pointer.
 */

const POINTER_ROTATION_SMOOTHING =
  2.1;


/*
 * Added pointer velocity decays after the
 * pointer leaves, while accumulated orientation
 * remains untouched.
 */

const POINTER_VELOCITY_DECAY =
  0.65;


/*
 * UTILITIES
 */

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


const lerp = (
  from: number,
  to: number,
  amount: number
) => {
  return (
    from +
    (
      to -
      from
    ) *
      amount
  );
};


/*
 * ROTATION
 */

const rotatePoint = (
  point: Vector3,
  pitch: number,
  yaw: number,
  roll: number
): Vector3 => {
  /*
   * PITCH / X
   */

  const pitchCos =
    Math.cos(
      pitch
    );

  const pitchSin =
    Math.sin(
      pitch
    );

  const pitchY =
    point.y *
      pitchCos -
    point.z *
      pitchSin;

  const pitchZ =
    point.y *
      pitchSin +
    point.z *
      pitchCos;


  /*
   * YAW / Y
   */

  const yawCos =
    Math.cos(
      yaw
    );

  const yawSin =
    Math.sin(
      yaw
    );

  const yawX =
    point.x *
      yawCos +
    pitchZ *
      yawSin;

  const yawZ =
    -point.x *
      yawSin +
    pitchZ *
      yawCos;


  /*
   * ROLL / Z
   */

  const rollCos =
    Math.cos(
      roll
    );

  const rollSin =
    Math.sin(
      roll
    );

  const rollX =
    yawX *
      rollCos -
    pitchY *
      rollSin;

  const rollY =
    yawX *
      rollSin +
    pitchY *
      rollCos;

  return {
    x: rollX,
    y: rollY,
    z: yawZ,
  };
};


/*
 * PROJECTION
 */

const projectPoint = (
  point: Vector3
): ProjectedPoint => {
  const rotated =
    rotatePoint(
      point,
      rotationPitch,
      rotationYaw,
      rotationRoll
    );

  const cameraDepth =
    CAMERA_DISTANCE +
    rotated.z;

  if (
    cameraDepth <= 0.25
  ) {
    return {
      x: 0,
      y: 0,

      depth:
        cameraDepth,

      visible:
        false,
    };
  }

  const scale =
    (
      Math.min(
        width,
        height
      ) *
      PERSPECTIVE
    ) /
    cameraDepth /
    10;

  return {
    x:
      width * 0.5 +
      rotated.x *
        scale,

    y:
      height * 0.5 -
      rotated.y *
        scale,

    depth:
      cameraDepth,

    visible:
      true,
  };
};


/*
 * PROJECTED LINE
 */

const drawProjectedLine = (
  start: Vector3,
  end: Vector3,
  color: GridColor,
  opacity: number,
  lineWidth: number
) => {
  if (!context) {
    return;
  }

  const projectedStart =
    projectPoint(
      start
    );

  const projectedEnd =
    projectPoint(
      end
    );

  if (
    !projectedStart.visible ||
    !projectedEnd.visible
  ) {
    return;
  }

  const averageDepth =
    (
      projectedStart.depth +
      projectedEnd.depth
    ) *
    0.5;

  /*
   * Mild depth fade.
   *
   * Far geometry remains present so the grid
   * continues to read as enormous.
   */

  const depthFade =
    clamp(
      1.15 -
      (
        averageDepth -
        CAMERA_DISTANCE
      ) *
        0.015,
      0.2,
      1
    );

  context.beginPath();

  context.moveTo(
    projectedStart.x,
    projectedStart.y
  );

  context.lineTo(
    projectedEnd.x,
    projectedEnd.y
  );

  context.strokeStyle =
    `rgba(
      ${color.red},
      ${color.green},
      ${color.blue},
      ${opacity * depthFade}
    )`;

  context.lineWidth =
    lineWidth;

  context.stroke();
};


/*
 * GRID LINE STYLE
 *
 * Lines are substantially thicker now.
 *
 * The zero axes remain only slightly stronger
 * than the rest of their plane.
 */

const getGridLineStyle = (
  index: number,
  planeOpacity: number
) => {
  const isAxis =
    index === 0;

  if (isAxis) {
    return {
      opacity:
        planeOpacity *
        1.2,

      lineWidth:
        1.45,
    };
  }

  return {
    opacity:
      planeOpacity,

    lineWidth:
      1.1,
  };
};


/*
 * XZ PLANE
 *
 * CATPPUCCIN PEACH
 */

const drawXZPlane = () => {
  for (
    let index =
      -GRID_EXTENT;
    index <=
      GRID_EXTENT;
    index +=
      GRID_SPACING
  ) {
    const style =
      getGridLineStyle(
        index,
        0.14
      );

    drawProjectedLine(
      {
        x: -GRID_EXTENT,
        y: 0,
        z: index,
      },
      {
        x: GRID_EXTENT,
        y: 0,
        z: index,
      },
      PEACH,
      style.opacity,
      style.lineWidth
    );

    drawProjectedLine(
      {
        x: index,
        y: 0,
        z: -GRID_EXTENT,
      },
      {
        x: index,
        y: 0,
        z: GRID_EXTENT,
      },
      PEACH,
      style.opacity,
      style.lineWidth
    );
  }
};


/*
 * XY PLANE
 *
 * CATPPUCCIN YELLOW
 */

const drawXYPlane = () => {
  for (
    let index =
      -GRID_EXTENT;
    index <=
      GRID_EXTENT;
    index +=
      GRID_SPACING
  ) {
    const style =
      getGridLineStyle(
        index,
        0.12
      );

    drawProjectedLine(
      {
        x: -GRID_EXTENT,
        y: index,
        z: 0,
      },
      {
        x: GRID_EXTENT,
        y: index,
        z: 0,
      },
      YELLOW,
      style.opacity,
      style.lineWidth
    );

    drawProjectedLine(
      {
        x: index,
        y: -GRID_EXTENT,
        z: 0,
      },
      {
        x: index,
        y: GRID_EXTENT,
        z: 0,
      },
      YELLOW,
      style.opacity,
      style.lineWidth
    );
  }
};


/*
 * YZ PLANE
 *
 * CATPPUCCIN MAROON
 */

const drawYZPlane = () => {
  for (
    let index =
      -GRID_EXTENT;
    index <=
      GRID_EXTENT;
    index +=
      GRID_SPACING
  ) {
    const style =
      getGridLineStyle(
        index,
        0.125
      );

    drawProjectedLine(
      {
        x: 0,
        y: -GRID_EXTENT,
        z: index,
      },
      {
        x: 0,
        y: GRID_EXTENT,
        z: index,
      },
      MAROON,
      style.opacity,
      style.lineWidth
    );

    drawProjectedLine(
      {
        x: 0,
        y: index,
        z: -GRID_EXTENT,
      },
      {
        x: 0,
        y: index,
        z: GRID_EXTENT,
      },
      MAROON,
      style.opacity,
      style.lineWidth
    );
  }
};


/*
 * ORIGIN
 *
 * Tiny neutral registration point.
 */

const drawOrigin = () => {
  if (!context) {
    return;
  }

  const origin =
    projectPoint(
      {
        x: 0,
        y: 0,
        z: 0,
      }
    );

  if (!origin.visible) {
    return;
  }

  context.beginPath();

  context.arc(
    origin.x,
    origin.y,
    1.4,
    0,
    Math.PI * 2
  );

  context.fillStyle =
    'rgba(255, 255, 255, 0.32)';

  context.fill();
};


/*
 * SCENE
 */

const renderScene = () => {
  if (
    !canvas ||
    !context
  ) {
    return;
  }

  context.clearRect(
    0,
    0,
    width,
    height
  );

  context.lineCap =
    'butt';

  context.lineJoin =
    'miter';

  drawXZPlane();

  drawXYPlane();

  drawYZPlane();

  drawOrigin();
};


/*
 * POINTER NORMALIZATION
 */

const getNormalizedPointer = () => {
  if (
    !pointer.active ||
    width <= 0 ||
    height <= 0
  ) {
    return {
      x: 0,
      y: 0,
    };
  }

  return {
    x:
      clamp(
        (
          pointer.x /
          width
        ) *
          2 -
        1,
        -1,
        1
      ),

    y:
      clamp(
        (
          pointer.y /
          height
        ) *
          2 -
        1,
        -1,
        1
      ),
  };
};


/*
 * POINTER PHYSICS
 *
 * Pointer position changes rotational velocity.
 *
 * This makes the camera visibly move in response
 * to interaction while preserving inertia.
 */

const updatePointerPhysics = (
  delta: number
) => {
  if (
    pointer.active
  ) {
    /*
     * First ease the simulated pointer toward
     * the actual cursor.
     */

    const positionSmoothing =
      1 -
      Math.exp(
        -POINTER_POSITION_SMOOTHING *
        delta
      );

    pointer.x =
      lerp(
        pointer.x,
        pointer.targetX,
        positionSmoothing
      );

    pointer.y =
      lerp(
        pointer.y,
        pointer.targetY,
        positionSmoothing
      );


    const normalized =
      getNormalizedPointer();


    /*
     * Horizontal position affects yaw and roll.
     *
     * Vertical position affects pitch.
     */

    const targetPitchVelocity =
      normalized.y *
      POINTER_PITCH_FORCE;

    const targetYawVelocity =
      normalized.x *
      POINTER_YAW_FORCE;

    const targetRollVelocity =
      normalized.x *
      POINTER_ROLL_FORCE;


    /*
     * Then ease rotational velocity toward that
     * target. This second layer gives the camera
     * its weight.
     */

    const rotationSmoothing =
      1 -
      Math.exp(
        -POINTER_ROTATION_SMOOTHING *
        delta
      );


    pointerPitchVelocity =
      lerp(
        pointerPitchVelocity,
        targetPitchVelocity,
        rotationSmoothing
      );

    pointerYawVelocity =
      lerp(
        pointerYawVelocity,
        targetYawVelocity,
        rotationSmoothing
      );

    pointerRollVelocity =
      lerp(
        pointerRollVelocity,
        targetRollVelocity,
        rotationSmoothing
      );

    return;
  }


  /*
   * Cursor left the page.
   *
   * Remove its rotational velocity gradually,
   * but preserve every degree of orientation
   * accumulated while it was active.
   */

  const decay =
    Math.exp(
      -POINTER_VELOCITY_DECAY *
      delta
    );

  pointerPitchVelocity *=
    decay;

  pointerYawVelocity *=
    decay;

  pointerRollVelocity *=
    decay;
};


/*
 * ANIMATION
 */

const animate = (
  time: number
) => {
  if (
    !canvas ||
    !context
  ) {
    return;
  }

  const delta =
    previousTime === 0
      ? 0
      : Math.min(
          (
            time -
            previousTime
          ) /
            1000,
          0.05
        );

  previousTime =
    time;


  updatePointerPhysics(
    delta
  );


  /*
   * Rotation is accumulated forever.
   *
   * Idle movement and cursor influence both
   * contribute to the same persistent
   * orientation.
   */

  rotationPitch +=
    (
      idlePitchVelocity +
      pointerPitchVelocity
    ) *
    delta;

  rotationYaw +=
    (
      idleYawVelocity +
      pointerYawVelocity
    ) *
    delta;

  rotationRoll +=
    (
      idleRollVelocity +
      pointerRollVelocity
    ) *
    delta;


  renderScene();


  animationFrame =
    requestAnimationFrame(
      animate
    );
};


/*
 * REDUCED MOTION
 */

const renderStatic = () => {
  renderScene();
};


const startVisual = () => {
  cancelAnimationFrame(
    animationFrame
  );

  previousTime = 0;

  if (
    reducedMotionQuery.matches
  ) {
    renderStatic();

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

const resizeCanvas = () => {
  if (
    !canvas ||
    !context
  ) {
    return;
  }

  width =
    window.innerWidth;

  height =
    window.innerHeight;

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

  if (
    !pointer.active
  ) {
    pointer.x =
      width * 0.5;

    pointer.y =
      height * 0.5;

    pointer.targetX =
      pointer.x;

    pointer.targetY =
      pointer.y;
  }
};


/*
 * POINTER INPUT
 */

const handlePointerMove = (
  event: PointerEvent
) => {
  if (
    event.pointerType ===
    'touch'
  ) {
    return;
  }

  pointer.targetX =
    event.clientX;

  pointer.targetY =
    event.clientY;

  if (
    !pointer.active
  ) {
    pointer.x =
      event.clientX;

    pointer.y =
      event.clientY;

    pointer.active =
      true;
  }
};


/*
 * POINTER LEAVE
 *
 * Orientation is deliberately not reset.
 */

const handlePointerLeave = () => {
  pointer.active =
    false;
};


/*
 * INITIALIZATION
 */

if (
  canvas &&
  context
) {
  resizeCanvas();

  startVisual();

  window.addEventListener(
    'resize',
    () => {
      resizeCanvas();

      if (
        reducedMotionQuery.matches
      ) {
        renderStatic();
      }
    }
  );

  window.addEventListener(
    'pointermove',
    handlePointerMove,
    {
      passive: true,
    }
  );

  document.documentElement.addEventListener(
    'mouseleave',
    handlePointerLeave
  );

  reducedMotionQuery.addEventListener(
    'change',
    startVisual
  );
}