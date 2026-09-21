export type LogoColour = [number, number, number];

/** Keep the logo's hue while making even bright yellow or lime readable on the pale panel. */
export function logoTextColour(colour: LogoColour | null): LogoColour {
  if (!colour) return [23, 56, 59];
  const scale = Math.min(1, 112 / Math.max(...colour));
  return colour.map(channel => Math.round(channel * scale)) as LogoColour;
}

/** Find the strongest colour family, excluding transparent padding and neutral backgrounds. */
export function dominantLogoColour(pixels: ArrayLike<number>): LogoColour | null {
  const buckets = Array.from({ length: 24 }, () => ({ weight: 0, r: 0, g: 0, b: 0 }));
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    const [r, g, b, alpha] = [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3] / 255];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chroma = max - min;
    const saturation = max ? chroma / max : 0;
    if (alpha < .5 || max < 40 || chroma < 22 || saturation < .15) continue;

    let hue = max === r ? (g - b) / chroma : max === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4;
    hue = (hue * 60 + 360) % 360;
    const bucket = buckets[Math.round(hue / 15) % buckets.length];
    const weight = alpha * saturation * (.5 + saturation);
    bucket.weight += weight;
    bucket.r += r * weight;
    bucket.g += g * weight;
    bucket.b += b * weight;
  }

  // Adjacent shades stay together, including reds on either side of the hue boundary.
  let best = { weight: 0, r: 0, g: 0, b: 0 };
  for (let i = 0; i < buckets.length; i++) {
    const family = [-1, 0, 1].reduce((sum, offset) => {
      const bucket = buckets[(i + offset + buckets.length) % buckets.length];
      return { weight: sum.weight + bucket.weight, r: sum.r + bucket.r, g: sum.g + bucket.g, b: sum.b + bucket.b };
    }, { weight: 0, r: 0, g: 0, b: 0 });
    if (family.weight > best.weight) best = family;
  }
  if (!best.weight) return null;
  return [Math.round(best.r / best.weight), Math.round(best.g / best.weight), Math.round(best.b / best.weight)];
}
