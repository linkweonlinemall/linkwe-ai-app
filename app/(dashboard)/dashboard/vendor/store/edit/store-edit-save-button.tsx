"use client";

import { useStoreEditUpload } from "./store-edit-upload-context";

export function StoreEditSaveButton() {
  const { anyUploading } = useStoreEditUpload();
  return (
    <button
      type="submit"
      form="vendor-store-edit-form"
      disabled={anyUploading}
      title={anyUploading ? "Wait for image uploads to finish" : undefined}
      className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      style={{ backgroundColor: "var(--scarlet)" }}
    >
      Save changes
    </button>
  );
}
