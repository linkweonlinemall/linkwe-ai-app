export type PhotoCrop = { zoom: number; x: number; y: number };
export const FULL_CROP: PhotoCrop = { zoom: 1, x: 50, y: 50 };
export type PhotoAdjustments = { light: number; warmth: number; angle: number; crop?: PhotoCrop };
export const DEFAULT_ADJUSTMENTS: PhotoAdjustments = { light: 40, warmth: 0, angle: 0 };

/** Bounded, reversible pixel corrections; never synthesises product details. */
export function normaliseAdjustments(value: PhotoAdjustments): PhotoAdjustments {
  const bound = (n: number, min: number, max: number) => Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : 0;
  return { light: bound(value.light, 0, 100), warmth: bound(value.warmth, -30, 30), angle: bound(value.angle, -20, 20), ...(value.crop ? { crop: { zoom: bound(value.crop.zoom, 1, 3) || 1, x: bound(value.crop.x, 0, 100), y: bound(value.crop.y, 0, 100) } } : {}) };
}

export function cropBounds(width: number, height: number, crop: PhotoCrop = FULL_CROP) {
  const safe = normaliseAdjustments({ light: 0, warmth: 0, angle: 0, crop }).crop!;
  const size = Math.min(width, height) / safe.zoom;
  return { x: (width - size) * safe.x / 100, y: (height - size) * safe.y / 100, size };
}

export function adjustPixels(pixels: Uint8ClampedArray, settings: PhotoAdjustments) {
  const { light, warmth } = normaliseAdjustments(settings);
  if (!light && !warmth) return;
  // Lift midtones smoothly while retaining black text and white backgrounds.
  // One luminance-derived multiplier for all channels retains RGB ratios until
  // the brightest channel's headroom runs out; it does not clip label highlights.
  const gamma = 1 - light * 0.0045;
  const gains = Array.from({ length: 256 }, (_, y) => y ? Math.pow(y / 255, gamma) * 255 / y : 1);
  for (let i = 0; i < pixels.length; i += 4) {
    if (!pixels[i + 3]) continue;
    let r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const luminance = Math.round(r * 0.2126 + g * 0.7152 + b * 0.0722);
    const lift = Math.min(gains[luminance], 255 / (Math.max(r, g, b) || 1));
    r *= lift; g *= lift; b *= lift;
    // Optional, manual temperature correction fades out at black and white.
    const tone = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
    const temperature = warmth * 0.75 * 4 * tone * (1 - tone);
    pixels[i] = r + temperature;
    pixels[i + 1] = g;
    pixels[i + 2] = b - temperature;
  }
}

/** Fit the whole rotated image: no cropped product edges or lost watermarks. */
export function rotationFit(width: number, height: number, angle: number) {
  const radians = normaliseAdjustments({ light: 0, warmth: 0, angle }).angle * Math.PI / 180;
  const c = Math.abs(Math.cos(radians)), s = Math.abs(Math.sin(radians));
  return { radians, scale: Math.min(width / (width * c + height * s), height / (width * s + height * c)) };
}
