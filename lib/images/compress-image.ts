import imageCompression from "browser-image-compression";

/**
 * Compress an image File client-side before it's uploaded, so real phone
 * photos (8-20MB+) don't blow the Next.js server-action body-size limit.
 * Non-image files pass through untouched.
 *
 * `fileType` is intentionally left unset: browser-image-compression defaults
 * to the original file's MIME type, so a transparent PNG/WebP logo stays
 * PNG/WebP (no black-background flattening to JPEG). Opaque photos (JPEG)
 * are re-encoded as JPEG.
 */
export async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    initialQuality: 0.8,
  };

  try {
    const result = await imageCompression(file, options);
    if (result instanceof File) return result;
    // browser-image-compression can return a plain Blob; DataTransfer.items.add()
    // only accepts a File, so wrap it back into one, preserving the original
    // filename (Cloudinary/backend may rely on the extension) and the actual
    // output type (keeps our PNG/WebP transparency handling correct).
    return new File([result], file.name, {
      type: result.type || file.type,
      lastModified: Date.now(),
    });
  } catch {
    return file; // best-effort: upload the original if compression fails
  }
}

/**
 * Compress every file in a native <input type="file"> FileList and write the
 * result back onto the input via DataTransfer. Lets an unmodified
 * `<form action={serverAction}>` submission pick up the smaller files under
 * the same field name — no server-action signature change required.
 */
export async function compressFileListIntoInput(
  input: HTMLInputElement,
  files: FileList,
): Promise<FileList> {
  const compressed = await Promise.all(Array.from(files).map(compressImageFile));
  const dt = new DataTransfer();
  compressed.forEach((f) => dt.items.add(f));
  input.files = dt.files;
  return input.files;
}
