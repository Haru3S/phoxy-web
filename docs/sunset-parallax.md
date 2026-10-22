# Interests sunset parallax

The railway sunset replaces the Voices of the Void ASCII artwork in the same
position. The surrounding Interests content, spacing, and breakpoints are unchanged.
The visual keeps its previous height: clamp(24rem, 46vw, 43rem), or 32rem at 700px
and below. No overlays, filters, gradients, or extra controls are added.

## Files

Added:

- src/components/interests/SunsetVisual.astro
- src/scripts/sunsetParallax.ts
- src/scripts/sunsetParallaxConfig.ts
- src/styles/interests/sunset.css
- tests/sunsetParallax.test.mjs
- docs/sunset-parallax.md

Modified: src/components/interests/Interests.astro.

Removed:

- src/components/interests/VotVVisual.astro
- src/scripts/votv.ts
- src/styles/interests/votv.css
- src/styles/votv.css (unused duplicate)

The two supplied assets in public/assets/interests/sunset/ are included unchanged.
The actual photograph filename, kanata_background.webp, is used with the user's
approval; katana_background.webp in the original brief was a typo. The depth URL
is /assets/interests/sunset/kanata%20depth.png. Both originals are 5184 by 3456.
Visual inspection confirmed bright foreground structures and a dark distant sky.

## Rendering and lifecycle

A custom element owns a native WebGL 1 canvas, two textures, two shaders, and one
fullscreen triangle. There is one draw call per frame and no framework dependency.
The fragment shader samples depth twice to reduce displacement at discontinuities,
then samples the colour texture. Coordinates are clamped, linear filtering avoids
seams, and high fragment precision is used where available. Cover fitting and a
small uniform overscan preserve proportions and reserve pixels for movement.

The original photograph is always underneath the canvas. It is the decorative,
lazy-loaded fallback for reduced motion, missing WebGL, shader/texture failures, and
context loss. If the photograph itself cannot load, the fixed-size background
remains and the broken-image indicator is hidden. No JavaScript is needed to
display the fallback photograph.

A 240px-margin IntersectionObserver initializes WebGL and loads both textures near
the viewport. A second observer with no margin controls playback. Rendering pauses
offscreen, on document visibility changes, and on pagehide; pageshow resumes it.
ResizeObserver and window resize update the drawing buffer only when its dimensions
change. Pointer input uses mouse coordinates only; touch scrolling remains native.
Ambient phase freezes during pauses rather than jumping on return.

Reduced motion prevents initialization and removes any existing renderer. CSS
immediately reveals the photograph; the render callback also checks the live
preference in case the browser delays its change notification. Context restoration
rebuilds resources. Disconnection aborts pending image loads and listeners,
disconnects observers, cancels animation, deletes GPU resources, and removes the
canvas. Failed initialization uses the photograph without repeatedly retrying.

Textures are uploaded only during initialization, with runtime downsampling to a
2048px longest edge (or the hardware limit, whichever is smaller). This uses about
21.3 MiB for both RGBA textures without mipmaps. Original files are never rewritten.
Rendering resolution is 0.85 times the capped device pixel ratio. The animation
loop updates scalar values and uniforms without allocating arrays or reuploading
textures. textmode.js remains necessary for the site's other visualizations.

## Configuration

All tuning lives in src/scripts/sunsetParallaxConfig.ts.

| Setting | Value |
| --- | --- |
| driftAmplitude | 12 CSS px, before depth strength |
| driftSpeed | 2*pi/27 radians/s; combined sine periods approximately 24–37s |
| mouseInfluence | 0.25 |
| pointerSmoothing | 750 ms exponential time constant |
| depthStrength | 0.45 |
| maxDisplacement | 8 CSS px, final vector magnitude limit |
| resolutionScale | 0.85 |
| maxDevicePixelRatio | 1.5 |
| MAX_TEXTURE_EDGE | 2048 px |

## Validation

Run:

- npm run check
- node --test tests/*.test.mjs
- npm run build
- git diff --check

There is no lint command configured. Astro check reports three existing hints in
Work.astro, Layout.astro, and contactMessage.ts, with no errors or warnings.

All 55 repository tests passed. The 12 new regression tests cover lazy
initialization, preload/playback separation,
viewport and document visibility pauses, bounded motion and pointer exit easing,
DPR capping, live reduced motion, delayed media-query notifications, context loss
and restoration, initialization failures, GPU disposal, and removal during loading.

Browser validation used installed headless Microsoft Edge with Playwright installed
temporarily outside the repository, without adding a project dependency. Both
asset URLs returned HTTP 200. Desktop (1440px wide) and mobile (390px wide)
screenshots were visually inspected for orientation, cover cropping, cable/pole
edges, seams, and overflow. Browser instrumentation confirmed two texture uploads
per initialization, offscreen and hidden-document pauses, context loss/restoration,
reduced-motion fallback, failure fallbacks, and texture deletion on removal.
Document visibility was exercised with a synthetic visibilitychange event.
Headless Edge updated reduced-motion matches without delivering the change event;
the next-frame disposal was verified, and the resume handler was exercised with an
explicit media-query change event. Initial reduced motion and the
JavaScript-disabled photograph were tested independently.

## Limits

A single depth map cannot reconstruct scenery behind railway structures. The small
motion budget and edge safeguard reduce stretching but cannot eliminate every thin
cable or silhouette artifact. Runtime texture downsampling and reduced drawing
resolution trade some fine grain/detail for lower memory and fill cost. No colour
grading is added. Browser checks used software WebGL; physical mobile GPUs and
other browser engines have not been profiled. No quantitative comparison with the
old renderer's performance was made.
