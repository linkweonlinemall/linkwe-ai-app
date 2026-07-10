"use client";

/**
 * Shared upload-state context for the vendor store-edit page.
 *
 * Why context instead of props?  The page is a Server Component, so logo and
 * cover CompressedFileInput islands, the gallery client-component, and the
 * Save button all live in different parts of the React tree.  A context
 * provider wrapping the whole page lets every upload island signal "I'm busy"
 * and lets the Save button read a single `anyUploading` flag — without moving
 * any form fields or changing the page layout.
 */

import { createContext, useContext, useState, type ReactNode } from "react";

type UploadCtx = {
  setLogoUploading: (v: boolean) => void;
  setCoverUploading: (v: boolean) => void;
  setGalleryUploading: (v: boolean) => void;
  anyUploading: boolean;
};

const StoreUploadCtx = createContext<UploadCtx | null>(null);

export function StoreEditUploadProvider({ children }: { children: ReactNode }) {
  const [logo, setLogo] = useState(false);
  const [cover, setCover] = useState(false);
  const [gallery, setGallery] = useState(false);

  return (
    <StoreUploadCtx.Provider
      value={{
        setLogoUploading: setLogo,
        setCoverUploading: setCover,
        setGalleryUploading: setGallery,
        anyUploading: logo || cover || gallery,
      }}
    >
      {children}
    </StoreUploadCtx.Provider>
  );
}

export function useStoreEditUpload(): UploadCtx {
  const ctx = useContext(StoreUploadCtx);
  if (!ctx) throw new Error("useStoreEditUpload must be used inside StoreEditUploadProvider");
  return ctx;
}
