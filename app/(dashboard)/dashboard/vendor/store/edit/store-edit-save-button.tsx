"use client";

import {useFormStatus} from "react-dom";
import { useStoreEditUpload } from "./store-edit-upload-context";

export function StoreEditSaveButton() {
  const {pending}=useFormStatus();
  const { anyUploading } = useStoreEditUpload();
  return (
    <button
      data-tour="store-save"
      type="submit"
      form="vendor-store-edit-form"
      disabled={anyUploading || pending}
      title={anyUploading ? "Wait for image uploads to finish" : undefined}
      className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      style={{ backgroundColor: "#194a3e" }}
    >
      {pending?"Saving your store…":anyUploading?"Preparing images…":"Save changes"}
    </button>
  );
}
