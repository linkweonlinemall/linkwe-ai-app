"use client";

import { useRef, useTransition, useState, type ChangeEvent, type DragEvent } from "react";
import { addStoreImageClient, removeStoreImageClient, reorderStoreGallery } from "@/app/actions/store";

type GalleryImage = { id: string; url: string; position: number };

type Props = {
  images: GalleryImage[];
  slotsAvailable: number;
};

export default function GalleryUpload({ images: initialImages, slotsAvailable: initialSlots }: Props) {
  const [isPending, startTransition] = useTransition();
  const [images, setImages] = useState<GalleryImage[]>(initialImages);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
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

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newImages = [...images];
    const [moved] = newImages.splice(dragIndex, 1);
    newImages.splice(index, 0, moved);
    setImages(newImages);
    setDragIndex(null);
    setDragOverIndex(null);
    void reorderStoreGallery(newImages.map((img) => img.id));
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  return (
    <div className="border-t border-zinc-100 pt-6 mt-2">
      <h2 className="text-sm font-semibold text-zinc-900">Store gallery</h2>
      <p className="mt-1 text-sm text-zinc-600">
        {images.length}/10 photos.
        {images.length < 10 ? ` You can add up to ${slotsAvailable} more.` : " Gallery full — remove a photo to add another."}
      </p>

      {images.length > 0 ? (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {images.map((image, i) => (
            <div
              key={image.id}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={() => handleDrop(i)}
              onDragEnd={handleDragEnd}
              className={`flex flex-col gap-2 cursor-grab transition-all
                active:cursor-grabbing
                ${dragOverIndex === i && dragIndex !== i ? "ring-2 ring-[#D4450A] scale-105 rounded-lg" : ""}
                ${dragIndex === i ? "opacity-50" : "opacity-100"}`}
            >
              <div className="relative">
                <img
                  alt=""
                  className="aspect-square w-full rounded-lg border border-zinc-200 object-cover"
                  src={image.url}
                />
                {i === 0 && (
                  <span className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-[#D4450A]/80 py-0.5 text-center text-[10px] text-white">
                    Featured
                  </span>
                )}
                <div className="absolute top-1 left-1 flex h-5 w-5 items-center justify-center rounded bg-black/40">
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="white">
                    <circle cx="3" cy="2" r="1" />
                    <circle cx="7" cy="2" r="1" />
                    <circle cx="3" cy="5" r="1" />
                    <circle cx="7" cy="5" r="1" />
                    <circle cx="3" cy="8" r="1" />
                    <circle cx="7" cy="8" r="1" />
                  </svg>
                </div>
              </div>
              <button
                className="w-full rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium
                  text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
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
        <label className="mt-4 flex flex-col gap-1 text-sm font-medium text-zinc-800">
          Add photos
          <input
            ref={fileInputRef}
            accept="image/*"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-900"
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
