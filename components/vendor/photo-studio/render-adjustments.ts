import { adjustPixels, cropBounds, normaliseAdjustments, rotationFit, type PhotoAdjustments } from "@/lib/photo-studio/adjustments";

export async function renderAdjustments(source: File, settings: PhotoAdjustments): Promise<File> {
  const value = normaliseAdjustments(settings);
  if (!value.light && !value.warmth && !value.angle && (!value.crop || value.crop.zoom === 1)) return source;
  const url = URL.createObjectURL(source);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const width = image.naturalWidth, height = image.naturalHeight;
    if (!width || !height || width * height > 4_000_000) throw new Error("The studio photo is too large to adjust.");
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Photo adjustments are unavailable in this browser.");
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, width, height);
    adjustPixels(pixels.data, value);
    ctx.putImageData(pixels, 0, 0);
    let output = canvas;
    if (value.angle) {
      output = document.createElement("canvas");
      output.width = width; output.height = height;
      const rotated = output.getContext("2d");
      if (!rotated) throw new Error("Photo straightening is unavailable in this browser.");
      rotated.fillStyle = "#ffffff"; rotated.fillRect(0, 0, width, height);
      const { radians, scale } = rotationFit(width, height, value.angle);
      rotated.translate(width / 2, height / 2); rotated.rotate(radians); rotated.scale(scale, scale);
      rotated.imageSmoothingEnabled = true; rotated.imageSmoothingQuality = "high";
      rotated.drawImage(canvas, -width / 2, -height / 2);
    }
    if (value.crop && value.crop.zoom > 1) {
      const cropped = document.createElement("canvas");
      cropped.width = Math.min(width, height); cropped.height = cropped.width;
      const cropContext = cropped.getContext("2d");
      if (!cropContext) throw new Error("Cropping is unavailable in this browser.");
      const box = cropBounds(width, height, value.crop);
      cropContext.imageSmoothingEnabled = true; cropContext.imageSmoothingQuality = "high";
      cropContext.drawImage(output, box.x, box.y, box.size, box.size, 0, 0, cropped.width, cropped.height);
      output = cropped;
    }
    const blob = await new Promise<Blob>((resolve, reject) => output.toBlob(result => result ? resolve(result) : reject(new Error("This adjustment could not be saved. Please try again.")), "image/jpeg", 0.96));
    return new File([blob], source.name, { type: "image/jpeg" });
  } finally { URL.revokeObjectURL(url); }
}
