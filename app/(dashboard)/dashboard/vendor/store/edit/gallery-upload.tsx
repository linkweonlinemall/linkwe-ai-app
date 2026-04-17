"use client";

import { useRef, useTransition, useState, type ChangeEvent } from "react";
import { addStoreImageClient, removeStoreImageClient } from "@/app/actions/store";

type GalleryImage = { id: string; url: string; position: number };

type Props = {
  images: GalleryImage[];
  slotsAvailable: number;
};

export default function GalleryUpload({ images: initialImages, slotsAvailable: initialSlots }: Props) {
  const [isPending, startTransition] = useTransition();
  const [images, setImages] = useState<GalleryImage[]>(initialImages);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const slotsAvailable = 10 - images.length;

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    if (fileArray.length > slotsAvailable) {
      alert(`You can only add ${slotsAvailable} more photo${slotsAvailable === 1 ? "" : "s"}. Only the first ${slotsAvailable} will be uploaded.`);
    }

    const formData = new FormData();
    fileArray.slice(0, slotsAvailable).forEach((file) => {
      formData.append("galleryImages", file);
    });

    startTransition(async () => {
      const result = await addStoreImageClient(formData);
      if (result.ok) {
        window.location.reload();
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function handleRemove(imageId: string) {
    const formData = new FormData();
    formData.append("imageId", imageId);

    startTransition(async () => {
      const result = await removeStoreImageClient(formData);
      if (result.ok) {
        setImages((prev) => prev.filter((img) => img.id !== imageId));
      }
    });
  }

  return (
    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6 mt-2">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Store gallery</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {images.length}/10 photos.
        {images.length < 10 ? ` You can add up to ${slotsAvailable} more.` : " Gallery full — remove a photo to add another."}
      </p>

      {images.length > 0 ? (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {images.map((image) => (
            <div key={image.id} className="flex flex-col gap-2">
              <img
                alt=""
                className="aspect-square w-full rounded-lg border border-zinc-200 object-cover dark:border-zinc-700"
                src={image.url}
              />
              <button
                className="w-full rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 disabled:opacity-50"
                disabled={isPending}
                onClick={() => handleRemove(image.id)}
                type="button"
              >
                {isPending ? "..." : "Remove"}
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {images.length < 10 ? (
        <label className="mt-4 flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Add photos
          <input
            ref={fileInputRef}
            accept="image/*"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:file:bg-zinc-700 dark:file:text-zinc-100"
            disabled={isPending}
            multiple
            name="galleryImages"
            onChange={handleFileChange}
            type="file"
          />
          <span className="text-xs font-normal text-zinc-500">
            {isPending ? "Uploading..." : "Photos save automatically when selected. JPEG, PNG, or WebP. Max 20MB each."}
          </span>
        </label>
      ) : null}
    </div>
  );
}
