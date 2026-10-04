  const visuals =

    document.querySelectorAll<HTMLElement>(

      '[data-contact-visual]'

    );



  const glyphs =

    'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +

    '0123456789' +

    '<>[]{}()' +

    '/\\\\|*+-=.:;_#$%@!?';



  const mailSource =

    'YOU GOT MAIL';



  const reducedMotion =

    window.matchMedia(

      '(prefers-reduced-motion: reduce)'

    );



  interface MatrixStream {

    y: number;

    headX: number;

    speed: number;

    length: number;

    spacing: number;



    characters: string[];

    mutationTimers: number[];



    containsMail: boolean;

    mailStart: number;

    mailEnd: number;

    mailCooldown: number;

  }



  interface PipePoint {

    x: number;

    y: number;

  }



  interface PipePalette {

    body: string;

    highlight: string;

    underside: string;

    shadow: string;

  }



  interface Pipe {

    points: PipePoint[];

    lengths: number[];

    totalLength: number;



    buildDistance: number;

    packetDistance: number;



    buildSpeed: number;

    packetSpeed: number;



    holdTime: number;

    holdTarget: number;



    delay: number;



    state:

      'waiting' |

      'building' |

      'packet' |

      'holding';



    palette: PipePalette;

  }



  /* PIPE PALETTES */



  const pipePalettes:

    PipePalette[] = [

      {

        body: '#f9df72',

        highlight: '#fff1ad',

        underside: '#c89432',

        shadow: '#6f461f',

      },



      {

        body: '#5ac8fa',

        highlight: '#a9e4ff',

        underside: '#2788b8',

        shadow: '#174a6a',

      },



      {

        body: '#72a7ff',

        highlight: '#b7d2ff',

        underside: '#456bc4',

        shadow: '#273c75',

      },



      {

        body: '#b8b5ff',

        highlight: '#dedcff',

        underside: '#7772c5',

        shadow: '#454176',

      },



      {

        body: '#c997ff',

        highlight: '#e4c8ff',

        underside: '#875bb8',

        shadow: '#51356e',

      },



      {

        body: '#71dfcc',

        highlight: '#b2f3e7',

        underside: '#3a9d8d',

        shadow: '#245b55',

      },

    ];



  for (const visual of visuals) {

    const matrixCanvas =

      visual.querySelector<HTMLCanvasElement>(

        '[data-matrix-canvas]'

      );



    const pipeCanvas =

      visual.querySelector<HTMLCanvasElement>(

        '[data-pipe-canvas]'

      );



    if (

      !matrixCanvas ||

      !pipeCanvas

    ) {

      continue;

    }



    const matrixContext =

      matrixCanvas.getContext('2d');



    const pipeContext =

      pipeCanvas.getContext('2d');



    if (

      !matrixContext ||

      !pipeContext

    ) {

      continue;

    }



    let width = 0;

    let height = 0;



    let pixelRatio = 1;



    let streams:

      MatrixStream[] = [];



    let pipes:

      Pipe[] = [];



    let animationFrame:

      number | null = null;



    let previousTime = 0;

    let isNearViewport = false;



    /* MATRIX */



    const FONT_SIZE = 14;

    const ROW_HEIGHT = 15;



    const MIN_SPEED = 65;

    const MAX_SPEED = 180;



    const MIN_LENGTH = 15;

    const MAX_LENGTH = 46;



    const MIN_SPACING = 12.5;

    const MAX_SPACING = 16;



    const MIN_MUTATION_TIME = 0.055;

    const MAX_MUTATION_TIME = 0.3;



    /* PIPE */



    const PIPE_GRID = 30;



    const PIPE_WIDTH = 27;



    /* Unlike before, these are now ranges rather than one shared speed for every pipe. */



    const MIN_PIPE_BUILD_SPEED = 210;

    const MAX_PIPE_BUILD_SPEED = 430;



    const MIN_PACKET_SPEED = 240;

    const MAX_PACKET_SPEED = 520;



    const MIN_PIPE_HOLD_TIME = 0.25;

    const MAX_PIPE_HOLD_TIME = 1.5;



    const MIN_RESPAWN_DELAY = 0.15;

    const MAX_RESPAWN_DELAY = 3.6;



    const MAX_PIPES = 3;



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



    const randomInteger = (

      minimum: number,

      maximum: number

    ) => {

      return Math.floor(

        randomBetween(

          minimum,

          maximum + 1

        )

      );

    };



    const randomGlyph = () => {

      return glyphs[

        Math.floor(

          Math.random() *

            glyphs.length

        )

      ];

    };



    const randomMutationTime =

      () => {

        return randomBetween(

          MIN_MUTATION_TIME,

          MAX_MUTATION_TIME

        );

      };



    const randomPalette = () => {

      return pipePalettes[

        Math.floor(

          Math.random() *

            pipePalettes.length

        )

      ];

    };



    const buildCharacters = (

      length: number

    ) => {

      return Array.from(

        {

          length,

        },

        randomGlyph

      );

    };



    const buildMutationTimers = (

      length: number

    ) => {

      return Array.from(

        {

          length,

        },

        randomMutationTime

      );

    };



    /* MAIL CORRUPTION */



    const corruptMailCharacter = (

      character: string

    ) => {

      if (

        character === ' '

      ) {

        return (

          Math.random() < 0.7

            ? ' '

            : randomGlyph()

        );

      }



      if (

        Math.random() <

        0.28

      ) {

        return randomGlyph();

      }



      return character;

    };



    const injectMail = (

      characters: string[]

    ) => {

      if (

        characters.length <

        mailSource.length + 4

      ) {

        return {

          start: -1,

          end: -1,

        };

      }



      const start =

        randomInteger(

          2,

          characters.length -

            mailSource.length -

            2

        );



      const mailCharacters =

        Array.from(

          mailSource

        );



      for (

        let index = 0;

        index <

        mailCharacters.length;

        index += 1

      ) {

        characters[

          start + index

        ] =

          corruptMailCharacter(

            mailCharacters[index]

          );

      }



      return {

        start,



        end:

          start +

          mailCharacters.length,

      };

    };



    /* MATRIX */



    const createStreams = () => {

      streams = [];



      const rowCount =

        Math.ceil(

          height /

            ROW_HEIGHT

        );



      for (

        let rowIndex = 0;

        rowIndex < rowCount;

        rowIndex += 1

      ) {

        if (

          Math.random() <

          0.035

        ) {

          continue;

        }



        const length =

          randomInteger(

            MIN_LENGTH,

            MAX_LENGTH

          );



        const characters =

          buildCharacters(

            length

          );



        let mailStart = -1;

        let mailEnd = -1;



        if (

          Math.random() <

          0.065

        ) {

          const range =

            injectMail(

              characters

            );



          mailStart =

            range.start;



          mailEnd =

            range.end;

        }



        streams.push({

          y:

            rowIndex *

              ROW_HEIGHT +

            ROW_HEIGHT *

              0.7,



          headX:

            randomBetween(

              -width * 0.3,

              width * 1.6

            ),



          speed:

            randomBetween(

              MIN_SPEED,

              MAX_SPEED

            ),



          length,



          spacing:

            randomBetween(

              MIN_SPACING,

              MAX_SPACING

            ),



          characters,



          mutationTimers:

            buildMutationTimers(

              length

            ),



          containsMail:

            mailStart >= 0,



          mailStart,



          mailEnd,



          mailCooldown:

            randomBetween(

              8,

              20

            ),

        });

      }

    };



    const resetStream = (

      stream: MatrixStream

    ) => {

      const length =

        randomInteger(

          MIN_LENGTH,

          MAX_LENGTH

        );



      const characters =

        buildCharacters(

          length

        );



      let mailStart = -1;

      let mailEnd = -1;



      if (

        stream.mailCooldown <= 0 &&

        Math.random() <

          0.16

      ) {

        const range =

          injectMail(

            characters

          );



        mailStart =

          range.start;



        mailEnd =

          range.end;



        stream.mailCooldown =

          randomBetween(

            10,

            22

          );

      }



      stream.headX =

        width +

        randomBetween(

          30,

          width * 0.65

        );



      stream.speed =

        randomBetween(

          MIN_SPEED,

          MAX_SPEED

        );



      stream.length =

        length;



      stream.spacing =

        randomBetween(

          MIN_SPACING,

          MAX_SPACING

        );



      stream.characters =

        characters;



      stream.mutationTimers =

        buildMutationTimers(

          length

        );



      stream.containsMail =

        mailStart >= 0;



      stream.mailStart =

        mailStart;



      stream.mailEnd =

        mailEnd;

    };



    /* PIPE ROUTE */



    const createPipe = (

      delay = 0

    ): Pipe => {

      const points:

        PipePoint[] = [];



      const margin =

        PIPE_WIDTH * 1.5;



      let x =

        -PIPE_WIDTH;



      let y =

        Math.round(

          randomBetween(

            margin,

            Math.max(

              margin,

              height -

                margin

            )

          ) /

            PIPE_GRID

        ) *

        PIPE_GRID;



      y =

        Math.max(

          margin,

          Math.min(

            height -

              margin,

            y

          )

        );



      points.push({

        x,

        y,

      });



      const turns =

        randomInteger(

          4,

          8

        );



      const usableWidth =

        width +

        PIPE_WIDTH * 2;



      const step =

        usableWidth /

        (

          turns + 1

        );



      for (

        let index = 0;

        index < turns;

        index += 1

      ) {

        x +=

          step *

          randomBetween(

            0.7,

            1.18

          );



        x =

          Math.min(

            x,

            width -

              PIPE_GRID * 2

          );



        points.push({

          x,

          y,

        });



        const cells =

          randomInteger(

            1,

            3

          );



        const direction =

          Math.random() <

            0.5

            ? -1

            : 1;



        y +=

          cells *

          PIPE_GRID *

          direction;



        y =

          Math.max(

            margin,

            Math.min(

              height -

                margin,

              y

            )

          );



        points.push({

          x,

          y,

        });

      }



      points.push({

        x:

          width +

          PIPE_WIDTH,

        y,

      });



      const lengths:

        number[] = [];



      let totalLength = 0;



      for (

        let index = 1;

        index <

        points.length;

        index += 1

      ) {

        const previous =

          points[

            index - 1

          ];



        const current =

          points[index];



        const length =

          Math.hypot(

            current.x -

              previous.x,

            current.y -

              previous.y

          );



        lengths.push(

          length

        );



        totalLength +=

          length;

      }



      return {

        points,

        lengths,

        totalLength,



        buildDistance: 0,

        packetDistance: 0,



        /* Every route now gets its own personality. */



        buildSpeed:

          randomBetween(

            MIN_PIPE_BUILD_SPEED,

            MAX_PIPE_BUILD_SPEED

          ),



        packetSpeed:

          randomBetween(

            MIN_PACKET_SPEED,

            MAX_PACKET_SPEED

          ),



        holdTime: 0,



        holdTarget:

          randomBetween(

            MIN_PIPE_HOLD_TIME,

            MAX_PIPE_HOLD_TIME

          ),



        delay,



        state:

          delay > 0

            ? 'waiting'

            : 'building',



        palette:

          randomPalette(),

      };

    };



    const createPipes = () => {

      pipes = [];



      for (

        let index = 0;

        index <

        MAX_PIPES;

        index += 1

      ) {

        /* Only the first route is guaranteed to begin immediately. The others arrive whenever they damn well feel like it. */



        const delay =

          index === 0

            ? 0

            : randomBetween(

                0.5,

                4.5

              );



        pipes.push(

          createPipe(

            delay

          )

        );

      }

    };



    /* POINT ON PIPE */



    const getPointAtDistance = (

      pipe: Pipe,

      distance: number

    ): PipePoint => {

      let remaining =

        Math.max(

          0,

          Math.min(

            distance,

            pipe.totalLength

          )

        );



      for (

        let index = 0;

        index <

        pipe.lengths.length;

        index += 1

      ) {

        const segmentLength =

          pipe.lengths[index];



        if (

          remaining <=

          segmentLength

        ) {

          const start =

            pipe.points[index];



          const end =

            pipe.points[

              index + 1

            ];



          const progress =

            segmentLength === 0

              ? 0

              : remaining /

                segmentLength;



          return {

            x:

              start.x +

              (

                end.x -

                start.x

              ) *

                progress,



            y:

              start.y +

              (

                end.y -

                start.y

              ) *

                progress,

          };

        }



        remaining -=

          segmentLength;

      }



      return (

        pipe.points[

          pipe.points.length -

            1

        ]

      );

    };



    /* RESIZE */



    const resizeCanvas = () => {

      const bounds =

        visual.getBoundingClientRect();



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



      for (

        const canvas

        of [

          matrixCanvas,

          pipeCanvas,

        ]

      ) {

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

      }



      matrixContext.setTransform(

        pixelRatio,

        0,

        0,

        pixelRatio,

        0,

        0

      );



      pipeContext.setTransform(

        pixelRatio,

        0,

        0,

        pixelRatio,

        0,

        0

      );



      createStreams();



      createPipes();



      drawMatrix();



      drawPipes();

    };



    /* MATRIX DRAWING */



    const drawMatrixGlyph = (

      character: string,

      x: number,

      y: number,

      opacity: number,

      isHead: boolean

    ) => {

      const fringeOpacity =

        opacity *

        (

          isHead

            ? 0.48

            : 0.18

        );



      matrixContext.globalAlpha =

        fringeOpacity;



      matrixContext.fillStyle =

        '#00d9ff';



      matrixContext.fillText(

        character,

        x - 1.1,

        y

      );



      matrixContext.fillStyle =

        '#ff9f1c';



      matrixContext.fillText(

        character,

        x + 1.1,

        y

      );



      matrixContext.globalAlpha =

        opacity;



      matrixContext.fillStyle =

        'rgba(255,255,255,0.82)';



      matrixContext.fillText(

        character,

        x,

        y

      );

    };



    const drawMatrix = () => {

      matrixContext.clearRect(

        0,

        0,

        width,

        height

      );



      matrixContext.font =

        `400 ${FONT_SIZE}px "Adwaita Mono", monospace`;



      matrixContext.textAlign =

        'center';



      matrixContext.textBaseline =

        'middle';



      for (

        const stream

        of streams

      ) {

        for (

          let index = 0;

          index <

          stream.length;

          index += 1

        ) {

          const x =

            stream.headX +

            index *

              stream.spacing;



          if (

            x <

              -FONT_SIZE ||

            x >

              width +

                FONT_SIZE

          ) {

            continue;

          }



          const progress =

            index /

            Math.max(

              stream.length - 1,

              1

            );



          let opacity =

            Math.pow(

              1 - progress,

              1.35

            ) *

              0.58 +

            0.028;



          if (

            index === 0

          ) {

            opacity = 0.96;

          } else if (

            index === 1

          ) {

            opacity = 0.72;

          }



          drawMatrixGlyph(

            stream.characters[

              index

            ],

            x,

            stream.y,

            opacity,

            index === 0

          );

        }

      }



      matrixContext.globalAlpha =

        1;

    };



    /* PIPE DRAWING */



    const drawPipeSegment = (

      pipe: Pipe,

      from: PipePoint,

      to: PipePoint

    ) => {

      const palette =

        pipe.palette;



      pipeContext.lineCap =

        'square';



      pipeContext.lineJoin =

        'round';



      /* CHROMATIC SHADOW */



      pipeContext.globalAlpha =

        0.72;



      pipeContext.strokeStyle =

        palette.shadow;



      pipeContext.lineWidth =

        PIPE_WIDTH + 6;



      pipeContext.beginPath();



      pipeContext.moveTo(

        from.x + 4,

        from.y + 5

      );



      pipeContext.lineTo(

        to.x + 4,

        to.y + 5

      );



      pipeContext.stroke();



      /* UNDERSIDE */



      pipeContext.globalAlpha =

        0.95;



      pipeContext.strokeStyle =

        palette.underside;



      pipeContext.lineWidth =

        PIPE_WIDTH + 1;



      pipeContext.beginPath();



      pipeContext.moveTo(

        from.x + 2,

        from.y + 2

      );



      pipeContext.lineTo(

        to.x + 2,

        to.y + 2

      );



      pipeContext.stroke();



      /* BODY */



      pipeContext.globalAlpha =

        1;



      pipeContext.strokeStyle =

        palette.body;



      pipeContext.lineWidth =

        PIPE_WIDTH - 4;



      pipeContext.beginPath();



      pipeContext.moveTo(

        from.x,

        from.y

      );



      pipeContext.lineTo(

        to.x,

        to.y

      );



      pipeContext.stroke();



      /* HIGHLIGHT */



      pipeContext.strokeStyle =

        palette.highlight;



      pipeContext.lineWidth =

        Math.max(

          3,

          PIPE_WIDTH * 0.16

        );



      pipeContext.beginPath();



      pipeContext.moveTo(

        from.x - 3,

        from.y - 4

      );



      pipeContext.lineTo(

        to.x - 3,

        to.y - 4

      );



      pipeContext.stroke();



      pipeContext.globalAlpha =

        1;

    };



    const drawSinglePipe = (

      pipe: Pipe

    ) => {

      if (

        pipe.state ===

        'waiting'

      ) {

        return;

      }



      let remaining =

        Math.min(

          pipe.buildDistance,

          pipe.totalLength

        );



      for (

        let index = 0;

        index <

        pipe.lengths.length;

        index += 1

      ) {

        if (

          remaining <= 0

        ) {

          break;

        }



        const start =

          pipe.points[index];



        const end =

          pipe.points[

            index + 1

          ];



        const segmentLength =

          pipe.lengths[index];



        if (

          remaining >=

          segmentLength

        ) {

          drawPipeSegment(

            pipe,

            start,

            end

          );



          remaining -=

            segmentLength;

        } else {

          const progress =

            remaining /

            segmentLength;



          const partialEnd = {

            x:

              start.x +

              (

                end.x -

                start.x

              ) *

                progress,



            y:

              start.y +

              (

                end.y -

                start.y

              ) *

                progress,

          };



          drawPipeSegment(

            pipe,

            start,

            partialEnd

          );



          remaining = 0;

        }

      }



      /* WHITE PACKET */



      if (

        pipe.state ===

          'packet' ||

        pipe.state ===

          'holding'

      ) {

        const packet =

          getPointAtDistance(

            pipe,

            Math.min(

              pipe.packetDistance,

              pipe.totalLength

            )

          );



        pipeContext.globalAlpha =

          0.18;



        pipeContext.fillStyle =

          '#ffffff';



        pipeContext.beginPath();



        pipeContext.arc(

          packet.x,

          packet.y,

          10,

          0,

          Math.PI * 2

        );



        pipeContext.fill();



        pipeContext.globalAlpha =

          1;



        pipeContext.fillStyle =

          '#ffffff';



        pipeContext.fillRect(

          packet.x - 4,

          packet.y - 4,

          8,

          8

        );

      }



      pipeContext.globalAlpha =

        1;

    };



    const drawPipes = () => {

      pipeContext.clearRect(

        0,

        0,

        width,

        height

      );



      for (

        const pipe

        of pipes

      ) {

        drawSinglePipe(

          pipe

        );

      }

    };



    /* MATRIX MUTATION */



    const mutateStream = (

      stream: MatrixStream,

      deltaTime: number

    ) => {

      for (

        let index = 0;

        index <

        stream.characters.length;

        index += 1

      ) {

        stream.mutationTimers[

          index

        ] -= deltaTime;



        if (

          stream.mutationTimers[

            index

          ] > 0

        ) {

          continue;

        }



        const insideMail =

          stream.containsMail &&

          index >=

            stream.mailStart &&

          index <

            stream.mailEnd;



        if (

          insideMail

        ) {

          if (

            Math.random() <

            0.16

          ) {

            stream.characters[

              index

            ] =

              randomGlyph();

          }



          stream.mutationTimers[

            index

          ] =

            randomBetween(

              0.45,

              1.2

            );



          continue;

        }



        stream.characters[

          index

        ] =

          randomGlyph();



        stream.mutationTimers[

          index

        ] =

          randomMutationTime();

      }

    };



    /* PIPE UPDATE */



    const updatePipe = (

      pipe: Pipe,

      deltaTime: number,

      index: number

    ) => {

      if (

        pipe.state ===

        'waiting'

      ) {

        pipe.delay -=

          deltaTime;



        if (

          pipe.delay <= 0

        ) {

          pipe.state =

            'building';

        }



        return;

      }



      if (

        pipe.state ===

        'building'

      ) {

        pipe.buildDistance +=

          pipe.buildSpeed *

          deltaTime;



        if (

          pipe.buildDistance >=

          pipe.totalLength

        ) {

          pipe.buildDistance =

            pipe.totalLength;



          pipe.packetDistance =

            0;



          pipe.state =

            'packet';

        }



        return;

      }



      if (

        pipe.state ===

        'packet'

      ) {

        pipe.packetDistance +=

          pipe.packetSpeed *

          deltaTime;



        if (

          pipe.packetDistance >=

          pipe.totalLength

        ) {

          pipe.packetDistance =

            pipe.totalLength;



          pipe.holdTime = 0;



          pipe.state =

            'holding';

        }



        return;

      }



      pipe.holdTime +=

        deltaTime;



      if (

        pipe.holdTime >=

        pipe.holdTarget

      ) {

        pipes[index] =

          createPipe(

            randomBetween(

              MIN_RESPAWN_DELAY,

              MAX_RESPAWN_DELAY

            )

          );

      }

    };



    /* ANIMATION */



    const animate = (

      time: number

    ) => {

      if (

        previousTime === 0

      ) {

        previousTime = time;

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



      previousTime = time;



      for (

        const stream

        of streams

      ) {

        stream.headX -=

          stream.speed *

          deltaTime;



        stream.mailCooldown -=

          deltaTime;



        mutateStream(

          stream,

          deltaTime

        );



        const tailX =

          stream.headX +

          stream.length *

            stream.spacing;



        if (

          tailX < -40

        ) {

          resetStream(

            stream

          );

        }

      }



      for (

        let index = 0;

        index <

        pipes.length;

        index += 1

      ) {

        updatePipe(

          pipes[index],

          deltaTime,

          index

        );

      }



      drawMatrix();



      drawPipes();



      animationFrame =

        requestAnimationFrame(

          animate

        );

    };



    const stopAnimation = () => {

      if (

        animationFrame !== null

      ) {

        cancelAnimationFrame(

          animationFrame

        );



        animationFrame = null;

      }



      previousTime = 0;

    };



    const startAnimation = () => {

      if (

        reducedMotion.matches ||

        !isNearViewport ||

        animationFrame !== null

      ) {

        return;

      }



      previousTime = 0;



      animationFrame =

        requestAnimationFrame(

          animate

        );

    };



    /* INITIALIZE */

    /*
     * VIEWPORT ACTIVITY
     *
     * Keep both canvases mounted, but stop their
     * animation loop while the Contact visual is
     * well outside the viewport.
     */

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
            drawMatrix();
            drawPipes();
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

    viewportObserver.observe(
      visual
    );





    const resizeObserver =

      new ResizeObserver(

        resizeCanvas

      );



    resizeObserver.observe(

      visual

    );



    reducedMotion.addEventListener(

      'change',

      () => {

        if (

          reducedMotion.matches

        ) {

          stopAnimation();



          for (

            const pipe

            of pipes

          ) {

            pipe.delay = 0;



            pipe.buildDistance =

              pipe.totalLength;



            pipe.packetDistance =

              pipe.totalLength;



            pipe.state =

              'holding';

          }



          drawMatrix();



          drawPipes();

        } else {

          createPipes();



          startAnimation();

        }

      }

    );

    resizeCanvas();

  }
