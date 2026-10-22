export const PARALLAX_ASSETS = {
  image: '/assets/interests/sunset/kanata_background.webp',
  depth: '/assets/interests/sunset/kanata%20depth.png',
} as const;

export interface ParallaxConfig {
  driftAmplitude: number;
  driftSpeed: number;
  mouseInfluence: number;
  pointerSmoothing: number;
  depthStrength: number;
  maxDisplacement: number;
  resolutionScale: number;
  maxDevicePixelRatio: number;
}

export const PARALLAX_CONFIG: Readonly<ParallaxConfig> = {
  driftAmplitude: 12, // CSS pixels before depth strength
  driftSpeed: (Math.PI * 2) / 27, // radians per second; combined periods: 24–37s
  mouseInfluence: 0.25,
  pointerSmoothing: 750, // milliseconds
  depthStrength: 0.45,
  maxDisplacement: 8, // final CSS pixels, including pointer influence
  resolutionScale: 0.85,
  maxDevicePixelRatio: 1.5,
};

// Limit texture memory even when the source photograph exceeds mobile GPU limits.
export const MAX_TEXTURE_EDGE = 2048;
