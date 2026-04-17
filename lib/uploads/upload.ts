import cloudinary from "@/lib/cloudinary/client";

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
  | "avatars";

export async function uploadFile(file: File, folder: UploadFolder): Promise<string> {
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
            reject(error ?? new Error("Cloudinary upload failed"));
            return;
          }
          resolve(result.secure_url);
        },
      )
      .end(buffer);
  });
}
