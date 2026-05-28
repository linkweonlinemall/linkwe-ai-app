/** Env keys read by `lib/cloudinary/client.ts` (must match Vercel / .env.local). */
export const CLOUDINARY_ENV_KEYS = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
] as const;

export type CloudinaryEnvStatus = {
  CLOUDINARY_CLOUD_NAME: boolean;
  CLOUDINARY_API_KEY: boolean;
  CLOUDINARY_API_SECRET: boolean;
  allSet: boolean;
  missing: string[];
};

export function getCloudinaryEnvStatus(): CloudinaryEnvStatus {
  const missing: string[] = [];
  const cloudName = Boolean(process.env.CLOUDINARY_CLOUD_NAME?.trim());
  const apiKey = Boolean(process.env.CLOUDINARY_API_KEY?.trim());
  const apiSecret = Boolean(process.env.CLOUDINARY_API_SECRET?.trim());
  if (!cloudName) missing.push("CLOUDINARY_CLOUD_NAME");
  if (!apiKey) missing.push("CLOUDINARY_API_KEY");
  if (!apiSecret) missing.push("CLOUDINARY_API_SECRET");
  return {
    CLOUDINARY_CLOUD_NAME: cloudName,
    CLOUDINARY_API_KEY: apiKey,
    CLOUDINARY_API_SECRET: apiSecret,
    allSet: missing.length === 0,
    missing,
  };
}

export function assertCloudinaryConfigured(): void {
  const status = getCloudinaryEnvStatus();
  if (!status.allSet) {
    throw new Error(
      `Cloudinary is not configured. Missing: ${status.missing.join(", ")}. Set these in .env.local or Vercel.`,
    );
  }
}

export function formatUploadError(err: unknown): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  if (typeof err === "string" && err.trim()) return err;
  return "Upload failed. Try again.";
}
