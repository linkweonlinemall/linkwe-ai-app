import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const PREFIX = "/uploads/gallery";
const MAX_BYTES = 20 * 1024 * 1024;

const MIME_TO_EXT = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

export async function saveGalleryUpload(
  file: File,
): Promise<{ ok: true; publicPath: string } | { ok: false; error: string }> {
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a file to upload." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File must be 20MB or smaller." };
  }
  const ext = MIME_TO_EXT.get(file.type);
  if (!ext) {
    return { ok: false, error: "Use a JPEG, PNG, or WebP image." };
  }

  const dir = path.join(process.cwd(), "public", "uploads", "gallery");
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}${ext}`;
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return { ok: true, publicPath: `${PREFIX}/${name}` };
}
