import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/** Public URL path prefix; files live under `public/uploads/listings/`. */
export const LISTING_UPLOAD_PUBLIC_PREFIX = "/uploads/listings";

const MIME_TO_EXT = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

const MAX_BYTES = 5 * 1024 * 1024;

export function isManagedLocalListingImage(publicPath: string | null | undefined): boolean {
  return !!publicPath?.startsWith(`${LISTING_UPLOAD_PUBLIC_PREFIX}/`);
}

function listingUploadDir(): string {
  return path.join(process.cwd(), "public", "uploads", "listings");
}

/** Resolve a safe absolute path for a managed upload (only filenames under our folder). */
function absolutePathForManagedPublicPath(publicPath: string): string {
  if (!isManagedLocalListingImage(publicPath)) {
    throw new Error("Not a managed local listing image path");
  }
  const relativeName = publicPath.slice(LISTING_UPLOAD_PUBLIC_PREFIX.length + 1);
  if (!relativeName || relativeName.includes("..") || path.isAbsolute(relativeName)) {
    throw new Error("Invalid listing image path");
  }
  return path.join(listingUploadDir(), relativeName);
}

/** Save an uploaded image for local dev; returns a path suitable for `Listing.imageUrl` (served from `/public`). */
export async function saveLocalListingImageUpload(
  file: File,
): Promise<{ ok: true; publicPath: string } | { ok: false; error: string }> {
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an image file." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Image must be 5MB or smaller." };
  }
  const ext = MIME_TO_EXT.get(file.type);
  if (!ext) {
    return { ok: false, error: "Use a JPEG, PNG, WebP, or GIF." };
  }

  const dir = listingUploadDir();
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}${ext}`;
  const abs = path.join(dir, name);
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(abs, buf);
  return { ok: true, publicPath: `${LISTING_UPLOAD_PUBLIC_PREFIX}/${name}` };
}

export async function deleteManagedLocalListingImage(publicPath: string | null | undefined): Promise<void> {
  if (!publicPath || !isManagedLocalListingImage(publicPath)) return;
  try {
    await unlink(absolutePathForManagedPublicPath(publicPath));
  } catch {
    // missing file is fine
  }
}
