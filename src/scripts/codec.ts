/*
 * CODEC BEHAVIOR
 *
 * Dialogue content is supplied by Astro
 * from src/data/codec.ts.
 *
 * This file only handles client-side
 * rotation between lines.
 */

interface CodecLine {
  speaker: string;
  text: string;
}


/*
 * CODEC INSTANCES
 */

const codecs =
  document.querySelectorAll<HTMLElement>(
    '[data-codec]'
  );


/*
 * INITIALIZE EACH CODEC
 */

for (const codec of codecs) {
  const dialogue =
    codec.querySelector<HTMLElement>(
      '[data-codec-dialogue]'
    );

  const speaker =
    codec.querySelector<HTMLElement>(
      '[data-codec-speaker]'
    );

  const linesElement =
    codec.querySelector<HTMLScriptElement>(
      '[data-codec-lines]'
    );

  if (
    !dialogue ||
    !speaker ||
    !linesElement
  ) {
    continue;
  }


  /*
   * READ SERIALIZED DIALOGUE
   */

  let codecLines: CodecLine[] = [];

  try {
    codecLines =
      JSON.parse(
        linesElement.textContent ?? '[]'
      );
  } catch {
    continue;
  }

  if (
    codecLines.length <= 1
  ) {
    continue;
  }


  /*
   * STATE
   */

  let lineIndex = 0;

  const prefersReducedMotion =
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    );


  /*
   * NEXT LINE
   */

  const showNextLine = () => {
    lineIndex =
      (
        lineIndex +
        1
      ) %
      codecLines.length;

    const nextLine =
      codecLines[lineIndex];

    if (
      prefersReducedMotion.matches
    ) {
      speaker.textContent =
        nextLine.speaker;

      dialogue.textContent =
        nextLine.text;

      return;
    }

    dialogue.classList.add(
      'is-changing'
    );

    window.setTimeout(
      () => {
        speaker.textContent =
          nextLine.speaker;

        dialogue.textContent =
          nextLine.text;

        dialogue.classList.remove(
          'is-changing'
        );
      },
      100
    );
  };


  /*
   * ROTATION
   */

  window.setInterval(
    showNextLine,
    6000
  );
}