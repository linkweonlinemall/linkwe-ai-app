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

  try {
    return await new Promise<string>((resolve, reject) => {
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
            const url = result.secure_url;
            if (typeof url !== "string" || !url) {
              reject(new Error("Cloudinary upload failed (invalid response URL)"));
              return;
            }
            resolve(url);
          },
        )
        .end(buffer);
    });
  } catch (err) {
    throw new Error(formatUploadError(err));
  }
}
