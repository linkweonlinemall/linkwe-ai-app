import { uploadFile } from "@/lib/uploads/upload";

export async function saveGalleryUpload(
  file: File,
): Promise<{ ok: true; publicPath: string } | { ok: false; error: string }> {
  try {
    const url = await uploadFile(file, "gallery");
    return { ok: true, publicPath: url };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed.";
    return { ok: false, error: message };
  }
}
