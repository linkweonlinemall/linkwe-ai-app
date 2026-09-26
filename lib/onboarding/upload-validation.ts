export const ONBOARDING_FILE_LIMIT = 3 * 1024 * 1024;
export const ONBOARDING_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateOnboardingFile(file: File, kind: "document" | "selfie" | "logo"): string | null {
  const label = kind === "document" ? "ID document" : kind === "selfie" ? "Selfie" : "Logo";
  const types = kind === "document" ? [...ONBOARDING_IMAGE_TYPES, "application/pdf"] : ONBOARDING_IMAGE_TYPES;
  if (!types.includes(file.type)) return `${label}: choose a JPG, PNG or WebP${kind === "document" ? " image, or a PDF" : " image"}.`;
  if (file.size > ONBOARDING_FILE_LIMIT) return `${label}: choose a file smaller than 3 MB.`;
  return null;
}
