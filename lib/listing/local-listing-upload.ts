import { unlink } from "node:fs/promises";
import path from "node:path";
import { uploadFile } from "@/lib/uploads/upload";

/** Legacy public URL prefix for locally stored listing images (historical uploads). */
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

/** Resolve a safe absolute path for a managed local upload (only filenames under our folder). */
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

/** Upload a listing image to Cloudinary; returns a public URL suitable for `Listing.imageUrl`. */
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

  try {
    const url = await uploadFile(file, "products");
    return { ok: true, publicPath: url };
  } catch {
    return { ok: false, error: "Could not upload image. Try again." };
  }
}

export async function deleteManagedLocalListingImage(publicPath: string | null | undefined): Promise<void> {
  if (!publicPath || !isManagedLocalListingImage(publicPath)) return;
  try {
    await unlink(absolutePathForManagedPublicPath(publicPath));
  } catch {
    // missing file is fine
  }
}
