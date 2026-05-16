"use server";
import { getSession } from "@/lib/auth/session";
import { uploadFile } from "@/lib/uploads/upload";

export async function uploadDigitalFile(formData: FormData): Promise<
  | {
      ok: true;
      url: string;
      fileType: string;
      fileSizeKb: number;
    }
  | { ok: false; error: string }
> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated" };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "No file provided" };

  // 500MB limit
  const maxSizeBytes = 500 * 1024 * 1024;
  if (file.size > maxSizeBytes) return { ok: false, error: "File too large. Maximum size is 500MB." };

  try {
    const url = await uploadFile(file, "digital");
    const fileType = file.name.split(".").pop()?.toLowerCase() ?? "other";
    const fileSizeKb = Math.ceil(file.size / 1024);
    return { ok: true, url, fileType, fileSizeKb };
  } catch {
    return { ok: false, error: "Upload failed. Please try again." };
  }
}
