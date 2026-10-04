import { textmode } from 'textmode.js';



const container =

    document.querySelector<HTMLElement>('[data-support-visual]');



if (container) {

    const t = textmode.create({

        width: Math.max(1, container.clientWidth),

        height: Math.max(1, container.clientHeight),

        fontSize: 9,

    });



    const TAU = Math.PI * 2;



    const C = {

        water: '#043d50',

        water2: '#07596b',

        caustic: '#1b7f87',

        light: '#36a6a5',

        shine: '#69c9c1',



        white: '#fff8e8',

        cream: '#ffe0a0',

        orange: '#ff7926',

        red: '#ff4538',

        gold: '#ffc83d',

        black: '#291d22',



        lily: '#2c6949',

        lilyHi: '#4f9663',

        flower: '#bd6089',

        flowerHi: '#d99ab7',

    } as const;



    interface Fish {

        x: number;

        y: number;

        r: number;

        speed: number;

        phase: number;

        a: string;

        b: string;

    }



    interface CursorRipple {

        x: number;

        y: number;

        born: number;

        life: number;

        speed: number;

        strength: number;

    }



    const FISH: Fish[] = [

        { x: -.32, y: -.24, r: 11, speed:  .22, phase: .2, a: C.white,  b: C.orange },

        { x:  .18, y: -.28, r:  9, speed: -.28, phase: 2.1, a: C.orange, b: C.white },

        { x:  .05, y:  .16, r: 12, speed:  .17, phase: 4.0, a: C.white,  b: C.red },

        { x: -.27, y:  .27, r:  8, speed: -.34, phase: 5.2, a: C.gold,   b: C.white },

        { x:  .34, y:  .15, r:  7, speed:  .31, phase: 1.4, a: C.white,  b: C.black },



        { x: -.05, y: -.08, r: 10, speed: -.19, phase: 3.2, a: C.red,    b: C.white },

        { x:  .28, y: -.05, r:  8, speed:  .25, phase: 4.8, a: C.gold,   b: C.orange },

        { x: -.38, y:  .05, r:  7, speed: -.27, phase:  .9, a: C.white,  b: C.red },

        { x:  .12, y:  .34, r:  7, speed:  .23, phase: 2.7, a: C.orange, b: C.black },

        { x: -.08, y:  .33, r:  6, speed: -.30, phase: 5.8, a: C.white,  b: C.gold },

        { x:  .39, y:  .32, r:  6, speed:  .20, phase: 3.7, a: C.red,    b: C.black },

    ];



    const LILIES: [number, number, number][] = [

        [-.40, -.31, 1],

        [ .37, -.31, 1],

        [ .40,  .29, 1],

        [-.41,  .28, 1],

    ];



    const cursorRipples: CursorRipple[] = [];



    let currentTime = 0;

    let lastRippleX = Infinity;

    let lastRippleY = Infinity;

    let lastRippleTime = -Infinity;



    function cell(

        x: number,

        y: number,

        ch: string,

        color: string,

        bg = C.water,

    ) {

        t.push();

        t.translate(Math.round(x), Math.round(y));

        t.char(ch);

        t.charColor(color);

        t.cellColor(bg);

        t.point();

        t.pop();

    }



    function pointerToGrid(event: PointerEvent) {

        const rect = container.getBoundingClientRect();



        return {

            x:

                ((event.clientX - rect.left) / rect.width - .5) *

                t.grid.cols,



            y:

                ((event.clientY - rect.top) / rect.height - .5) *

                t.grid.rows,

        };

    }



    function addCursorRipple(

        x: number,

        y: number,

        strength = 1,

    ) {

        cursorRipples.push({

            x,

            y,

            born: currentTime,

            life: strength > 1 ? 2.1 : 1.35,

            speed: strength > 1 ? 8 : 6,

            strength,

        });



        if (cursorRipples.length > 28) {

            cursorRipples.shift();

        }

    }



    function water(time: number) {

        const w = t.grid.cols;

        const h = t.grid.rows;



        for (let y = -h / 2; y < h / 2; y++) {

            for (let x = -w / 2; x < w / 2; x++) {

                const a = Math.sin(

                    x * .22 +

                    Math.sin(y * .14 + time * .43) * 2.2 +

                    time * .55,

                );



                const b = Math.sin(

                    y * .29 +

                    Math.sin(x * .12 - time * .34) * 2 -

                    time * .42,

                );



                const c = Math.sin(

                    (x + y) * .15 +

                    Math.sin((x - y) * .07 + time * .25) * 1.7,

                );



                const d = Math.sin(

                    (x - y) * .11 -

                    time * .31,

                );



                const ridge =

                    1 -

                    Math.abs(

                        (a + b + c + d * .7) /

                        3.7,

                    );



                if (ridge > .91) {

                    cell(x, y, '█', C.shine, C.water2);

                } else if (ridge > .83) {

                    cell(x, y, '▓', C.light, C.water2);

                } else if (ridge > .72) {

                    cell(x, y, '▒', C.caustic);

                } else if (ridge > .59) {

                    cell(x, y, '░', C.water2);

                }

            }

        }

    }



    function causticVeins(time: number) {

        const w = t.grid.cols;

        const h = t.grid.rows;



        for (let y = -h / 2; y < h / 2; y += 2) {

            for (let x = -w / 2; x < w / 2; x++) {

                const wave =

                    Math.sin(

                        x * .13 +

                        y * .19 +

                        time * .45,

                    ) +

                    Math.sin(

                        x * .27 -

                        y * .09 -

                        time * .28,

                    );



                if (Math.abs(wave) < .11) {

                    cell(

                        x,

                        y,

                        '⠒',

                        C.light,

                        C.water2,

                    );

                } else if (

                    Math.abs(wave) < .20 &&

                    (x + y) % 2 === 0

                ) {

                    cell(

                        x,

                        y,

                        '·',

                        C.caustic,

                    );

                }

            }

        }

    }



    function ripple(

        cx: number,

        cy: number,

        r: number,

        time: number,

        strong = .5,

    ) {

        for (let a = 0; a < TAU; a += .14) {

            const wobble =

                Math.sin(

                    a * 5 +

                    time * 2,

                ) * .25;



            if (

                (

                    Math.floor(a * 13) +

                    Math.floor(time * 3)

                ) % 3

            ) {

                cell(

                    cx +

                        Math.cos(a) *

                        (r + wobble),



                    cy +

                        Math.sin(a) *

                        (r * .45 + wobble * .2),



                    strong > .6

                        ? '⠒'

                        : '·',



                    strong > .6

                        ? C.shine

                        : C.light,

                );

            }

        }

    }



    function drawCursorRipples(time: number) {

        for (let i = cursorRipples.length - 1; i >= 0; i--) {

            const wave = cursorRipples[i];

            const age = time - wave.born;



            if (age >= wave.life) {

                cursorRipples.splice(i, 1);

                continue;

            }



            const fade = 1 - age / wave.life;

            const radius = .8 + age * wave.speed;

            const rings = wave.strength > 1 ? 3 : 2;



            for (let ring = 0; ring < rings; ring++) {

                const ringRadius = radius - ring * 1.8;



                if (ringRadius <= 0) continue;



                const color =

                    fade > .65

                        ? C.shine

                        : fade > .3

                            ? C.light

                            : C.caustic;



                const step =

                    fade > .5

                        ? .13

                        : .19;



                for (let a = 0; a < TAU; a += step) {

                    const skip =

                        Math.sin(

                            a * 9 +

                                wave.born * 7 +

                                ring,

                        );



                    if (skip < -.35 + (1 - fade) * .5) {

                        continue;

                    }



                    const wobble =

                        Math.sin(

                            a * 6 +

                                time * 3 +

                                ring,

                        ) * .22;



                    cell(

                        wave.x +

                            Math.cos(a) *

                                (ringRadius + wobble),



                        wave.y +

                            Math.sin(a) *

                                (ringRadius * .45 + wobble * .2),



                        fade > .55

                            ? '⠒'

                            : fade > .25

                                ? '·'

                                : '⠂',



                        color,

                    );

                }

            }

        }

    }



    function lily(

        nx: number,

        ny: number,

        s: number,

        time: number,

    ) {

        const x =

            nx *

            t.grid.cols;



        const y =

            ny *

            t.grid.rows;



        const bob =

            Math.sin(

                time * .4 +

                    nx * 10,

            ) * .18;



        cell(

            x,

            y + bob,

            '█',

            C.lily,

        );



        cell(

            x - 1,

            y + bob,

            '◢',

            C.lilyHi,

        );



        cell(

            x + 1,

            y + bob,

            '◣',

            C.lily,

        );



        cell(

            x,

            y + 1 + bob,

            '▀',

            C.lily,

        );



        if (nx > .3) {

            cell(

                x,

                y - 1 + bob,

                '✦',

                C.flower,

            );



            cell(

                x,

                y - 2 + bob,

                '•',

                C.flowerHi,

            );

        }



        ripple(

            x,

            y + bob,

            3.5 * s,

            time,

            .4,

        );

    }



    function fish(

        f: Fish,

        time: number,

    ) {

        const a =

            time *

                f.speed +

            f.phase;



        const cx =

            f.x *

                t.grid.cols +

            Math.cos(a) *

                f.r;



        const cy =

            f.y *

                t.grid.rows +

            Math.sin(a * 1.3) *

                f.r *

                .4;



        const dx =

            -Math.sin(a) *

            Math.sign(f.speed);



        const dy =

            Math.cos(a * 1.3) *

                .5 *

                Math.sign(f.speed);



        const ang =

            Math.atan2(

                dy,

                dx,

            );



        const ux =

            Math.cos(ang);



        const uy =

            Math.sin(ang);



        const vx =

            -uy;



        const vy =

            ux;



        const tail =

            Math.sin(

                time * 5 +

                    f.phase,

            ) * 1.3;



        const p = (

            forward: number,

            side: number,

            ch: string,

            color: string,

        ) => {

            cell(

                cx +

                    ux * forward +

                    vx * side,



                cy +

                    uy * forward +

                    vy * side,



                ch,

                color,

            );

        };



        for (let y = -2; y <= 2; y++) {

            p(

                -8,

                y + tail,

                '█',

                f.b,

            );

        }



        p(

            -8,

            -3 + tail,

            '◢',

            f.b,

        );



        p(

            -8,

            3 + tail,

            '◣',

            f.b,

        );



        for (let y = -2; y <= 2; y++) {

            p(

                -7,

                y + tail * .8,

                '█',

                f.b,

            );

        }



        for (let y = -1; y <= 1; y++) {

            p(

                -6,

                y + tail * .5,

                '█',

                f.a,

            );

        }



        for (let y = -2; y <= 2; y++) {

            p(

                -5,

                y,

                '█',

                y === 0

                    ? f.b

                    : f.a,

            );

        }



        for (let y = -3; y <= 3; y++) {

            p(

                -4,

                y,

                '█',

                Math.abs(y) < 2

                    ? f.b

                    : f.a,

            );

        }



        for (let y = -3; y <= 3; y++) {

            p(

                -3,

                y,

                '█',

                y < 0

                    ? f.a

                    : f.b,

            );

        }



        for (let y = -4; y <= 4; y++) {

            p(

                -2,

                y,

                '█',

                Math.abs(y) < 2

                    ? f.b

                    : f.a,

            );

        }



        for (let y = -4; y <= 4; y++) {

            p(

                -1,

                y,

                '█',

                y > 0 && y < 3

                    ? f.b

                    : f.a,

            );

        }



        for (let y = -4; y <= 4; y++) {

            p(

                0,

                y,

                '█',

                y < 0 && y > -3

                    ? f.b

                    : f.a,

            );

        }



        for (let y = -4; y <= 4; y++) {

            p(

                1,

                y,

                '█',

                Math.abs(y) < 2

                    ? f.b

                    : f.a,

            );

        }



        for (let y = -3; y <= 3; y++) {

            p(

                2,

                y,

                '█',

                y > 0

                    ? f.b

                    : f.a,

            );

        }



        for (let y = -3; y <= 3; y++) {

            p(

                3,

                y,

                '█',

                Math.abs(y) < 2

                    ? f.a

                    : f.b,

            );

        }



        for (let y = -2; y <= 2; y++) {

            p(

                4,

                y,

                '█',

                f.a,

            );

        }



        for (let y = -2; y <= 2; y++) {

            p(

                5,

                y,

                '█',

                y === 0

                    ? f.b

                    : f.a,

            );

        }



        for (let y = -1; y <= 1; y++) {

            p(

                6,

                y,

                '█',

                f.a,

            );

        }



        p(

            7,

            -1,

            '▓',

            f.a,

        );



        p(

            7,

            0,

            '█',

            f.a,

        );



        p(

            7,

            1,

            '▓',

            f.a,

        );



        p(

            0,

            -5,

            '◢',

            f.b,

        );



        p(

            -1,

            -5,

            '◢',

            f.b,

        );



        p(

            0,

            5,

            '◣',

            f.b,

        );



        p(

            -1,

            5,

            '◣',

            f.b,

        );



        p(

            2,

            -1,

            '▓',

            C.cream,

        );



        p(

            3,

            -1,

            '▒',

            C.cream,

        );



        p(

            6,

            -1,

            '•',

            C.black,

        );



        p(

            6,

            1,

            '•',

            C.black,

        );



        ripple(

            cx -

                ux * 7,



            cy -

                uy * 7,



            4 +

                Math.sin(

                    time * 2 +

                        f.phase,

                ) * .35,



            time,

            .35,

        );

    }



    const reducedMotion =

        window.matchMedia(

            '(prefers-reduced-motion: reduce)',

        );



    container.addEventListener(

        'pointermove',

        (event) => {

            if (reducedMotion.matches) return;



            const pointer =

                pointerToGrid(event);



            const distance =

                Math.hypot(

                    pointer.x - lastRippleX,

                    pointer.y - lastRippleY,

                );



            if (

                distance > 2.5 ||

                currentTime - lastRippleTime > .16

            ) {

                addCursorRipple(

                    pointer.x,

                    pointer.y,

                    1,

                );



                lastRippleX =

                    pointer.x;



                lastRippleY =

                    pointer.y;



                lastRippleTime =

                    currentTime;

            }

        },

    );



    container.addEventListener(

        'pointerdown',

        (event) => {

            if (reducedMotion.matches) return;



            const pointer =

                pointerToGrid(event);



            addCursorRipple(

                pointer.x,

                pointer.y,

                1.8,

            );



            addCursorRipple(

                pointer.x,

                pointer.y,

                1.35,

            );

        },

    );



    container.addEventListener(

        'pointerleave',

        () => {

            lastRippleX = Infinity;

            lastRippleY = Infinity;

        },

    );



    t.draw(() => {

        t.background(C.water);



        const time =

            reducedMotion.matches

                ? 0

                : t.frameCount / 60;



        currentTime = time;



        water(time);

        causticVeins(time);



        for (const lilyPad of LILIES) {

            lily(

                ...lilyPad,

                time,

            );

        }



        for (const koi of FISH) {

            fish(

                koi,

                time,

            );

        }



        drawCursorRipples(time);

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
