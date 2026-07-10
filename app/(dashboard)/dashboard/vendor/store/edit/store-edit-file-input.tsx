"use client";

import type { ComponentProps } from "react";
import CompressedFileInput from "@/components/ui/CompressedFileInput";
import { useStoreEditUpload } from "./store-edit-upload-context";

type Props = Omit<ComponentProps<typeof CompressedFileInput>, "onUploadingChange"> & {
  uploadKey: "logo" | "cover";
};

export function StoreEditFileInput({ uploadKey, ...props }: Props) {
  const { setLogoUploading, setCoverUploading } = useStoreEditUpload();
  return (
    <CompressedFileInput
      {...props}
      onUploadingChange={uploadKey === "logo" ? setLogoUploading : setCoverUploading}
    />
  );
}
