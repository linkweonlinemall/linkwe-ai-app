import "server-only";
import sharp from "sharp";
import { PhotoStudioError } from "./config";

export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 12 * 1024 * 1024;

export async function preparePhoto(file: File, lighting: boolean) {
  if (!file.size || file.size > MAX_PHOTO_BYTES || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new PhotoStudioError("Choose a JPG, PNG or WebP photo under 3 MB after optimisation.");
  }
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const image = sharp(buffer, { limitInputPixels: 20_000_000, failOn: "warning" });
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format || "") || (metadata.pages || 1) > 1) throw new Error("unsupported");
    // A small pixel adjustment, not generative relighting: no label/artwork repainting.
    const pipeline = image.rotate().resize(2000, 2000, { fit: "inside", withoutEnlargement: true });
    if (lighting) pipeline.modulate({ brightness: 1.035 });
    return await pipeline.png().toBuffer();
  } catch {
    throw new PhotoStudioError("This photo could not be opened. Try a smaller, still JPG, PNG or WebP image.");
  }
}

export function editParameters(image: Uint8Array, shadow: boolean) {
  const form = new FormData();
  form.set("imageFile", new Blob([new Uint8Array(image)], { type: "image/png" }), "product.png");
  form.set("removeBackground", "true");
  form.set("background.color", "FFFFFF");
  form.set("outputSize", "1600x1600");
  form.set("padding", "0.12");
  form.set("ignorePaddingAndSnapOnCroppedSides", "false");
  form.set("referenceBox", "subjectBox");
  form.set("scaling", "fit");
  form.set("horizontalAlignment", "center");
  form.set("verticalAlignment", "center");
  if (shadow) form.set("shadow.mode", "ai.soft");
  // No generative fill, background prompts, expansion or viewpoint changes.
  return form;
}

export async function editPhoto(image: Uint8Array, key: string, shadow: boolean, fetcher: typeof fetch = fetch) {
  try {
    const response = await fetcher("https://image-api.photoroom.com/v2/edit", {
      method: "POST", headers: { "x-api-key": key }, body: editParameters(image, shadow),
      signal: AbortSignal.timeout(75_000), cache: "no-store", redirect: "error",
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new PhotoStudioError(response.status === 429 ? "The photo studio is busy. Please try again in a few minutes." : "We couldn't finish this photo. Your original is safe. Please try again later.", 502);
    }
    if (!response.headers.get("content-type")?.startsWith("image/")) throw new Error("unexpected response");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("empty image");
    const chunks: Uint8Array[] = []; let total = 0;
    try {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        total += value.length;
        if (total > MAX_OUTPUT_BYTES) throw new Error("image too large");
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    return await sharp(Buffer.concat(chunks), { limitInputPixels: 20_000_000 }).rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 94 }).toBuffer();
  } catch (error) {
    if (error instanceof PhotoStudioError) throw error;
    throw new PhotoStudioError("The photo couldn't be finished this time. Your original is safe. Please try again later.", 502);
  }
}
