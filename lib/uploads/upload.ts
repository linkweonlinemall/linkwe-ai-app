import cloudinary from "@/lib/cloudinary/client";
import { assertCloudinaryConfigured, formatUploadError } from "@/lib/uploads/cloudinary-config";

export type UploadFolder =
  | "gallery"
  | "kyc"
  | "logos"
  | "products"
  | "real-estate"
  | "vehicles"
  | "events"
  | "places"
  | "food-outlets"
  | "accommodations"
  | "services"
  | "avatars"
  | "digital";

export async function uploadFile(file: File, folder: UploadFolder): Promise<string> {
  assertCloudinaryConfigured();

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `linkwe/${folder}`,
          resource_type: "auto",
        },
        (error, result) => {
          if (error || !result) {
            const message = error?.message?.trim()
              ? `Cloudinary upload failed: ${error.message}`
              : "Cloudinary upload failed (no response from Cloudinary)";
            reject(new Error(message));
            return;
          }
          resolve(result.secure_url);
        },
      )
      .end(buffer);
  }).catch((err) => {
    throw new Error(formatUploadError(err));
  });
}
