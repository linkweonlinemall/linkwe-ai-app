"use client";

import { compressImageFile, MAX_COMPRESSED_BYTES } from "@/lib/images/compress-image";

type UploadActionResult = {
  ok?: boolean;
  urls?: string[];
  url?: string;
  images?: { url: string }[];
  error?: string;
};

type UploadAction = (formData: FormData) => Promise<UploadActionResult>;

export type CompressAndUploadOptions = {
  /** FormData field name each compressed file is appended under. Defaults to "images". */
  fieldName?: string;
  onProgress?: (done: number, total: number) => void;
};

/**
 * Compresses each file client-side, hard-rejects anything still over
 * MAX_COMPRESSED_BYTES, and uploads ONE FILE PER REQUEST, sequentially.
 *
 * This is what bounds the request payload: no matter how many files a user
 * selects, each request to `uploadAction` carries a single compressed file
 * (<= MAX_COMPRESSED_BYTES), never the combined size of a whole batch. That's
 * what previously let a 5-10 file selection build one oversized FormData and
 * blow past the server-action body-size limit (or run long enough inside one
 * action invocation to look like a freeze).
 *
 * Stops on the first failure (oversized file or a rejected upload) and
 * returns whatever succeeded so far, so a caller can still show partial
 * progress instead of losing the whole batch.
 */
export async function compressAndUploadImages(
  files: File[],
  uploadAction: UploadAction,
  opts: CompressAndUploadOptions = {},
): Promise<{ urls: string[]; error?: string }> {
  const fieldName = opts.fieldName ?? "images";
  const urls: string[] = [];
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;

    let compressed: File;
    try {
      compressed = await compressImageFile(file);
    } catch {
      return { urls, error: "Couldn't process one of the images. Try a different file." };
    }

    if (compressed.size > MAX_COMPRESSED_BYTES) {
      return {
        urls,
        error: "One or more images are too large even after compression. Please use smaller images.",
      };
    }

    const formData = new FormData();
    formData.append(fieldName, compressed);

    let result: UploadActionResult;
    try {
      result = await uploadAction(formData);
    } catch (err) {
      return { urls, error: err instanceof Error ? err.message : "Upload failed. Try again." };
    }

    if (!result.ok) {
      return { urls, error: result.error ?? "Upload failed. Try again." };
    }

    if (Array.isArray(result.urls)) {
      urls.push(...result.urls);
    } else if (Array.isArray(result.images) && result.images.length > 0) {
      // Some actions (e.g. addStoreImageClient) return the full updated
      // collection rather than just this call's url. Since we upload one
      // file per request, the file we just added is always the last entry.
      const last = result.images[result.images.length - 1];
      if (last && typeof last.url === "string") urls.push(last.url);
    } else if (typeof result.url === "string") {
      urls.push(result.url);
    }

    opts.onProgress?.(i + 1, total);
  }

  return { urls };
}
