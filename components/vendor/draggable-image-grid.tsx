"use client"

import { useState, type DragEvent } from "react"

type Props = {
  images: string[]
  onReorder: (newImages: string[]) => void
  onRemove?: (url: string) => void
  disabled?: boolean
}

export default function DraggableImageGrid({
  images,
  onReorder,
  onRemove,
  disabled,
}: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  function handleDragStart(index: number) {
    setDragIndex(index)
  }

  function handleDragOver(e: DragEvent, index: number) {
    e.preventDefault()
    setDragOverIndex(index)
  }

  function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }
    const newImages = [...images]
    const [moved] = newImages.splice(dragIndex, 1)
    newImages.splice(index, 0, moved)
    onReorder(newImages)
    setDragIndex(null)
    setDragOverIndex(null)
  }

  function handleDragEnd() {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  if (images.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {images.map((url, i) => (
        <div
          key={url}
          draggable={!disabled}
          onDragStart={() => handleDragStart(i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDrop={() => handleDrop(i)}
          onDragEnd={handleDragEnd}
          className={`relative cursor-grab transition-all active:cursor-grabbing
            ${dragOverIndex === i && dragIndex !== i ? "ring-2 ring-[#D4450A] scale-105" : ""}
            ${dragIndex === i ? "opacity-50" : "opacity-100"}`}
        >
          <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover" />
          {i === 0 && (
            <span className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-[#D4450A]/80 py-0.5 text-center text-[10px] text-white">
              Featured
            </span>
          )}
          {!disabled && onRemove && (
            <button
              type="button"
              onClick={() => onRemove(url)}
              className="absolute -right-1 -top-1 flex h-4 w-4
                items-center justify-center rounded-full bg-red-500
                text-[10px] text-white hover:bg-red-600"
            >
              ×
            </button>
          )}
          {!disabled && (
            <div
              className="absolute top-1 left-1 flex h-4 w-4 items-center
                justify-center rounded bg-black/40"
            >
              <svg width="8" height="8" viewBox="0 0 10 10" fill="white">
                <circle cx="3" cy="2" r="1" />
                <circle cx="7" cy="2" r="1" />
                <circle cx="3" cy="5" r="1" />
                <circle cx="7" cy="5" r="1" />
                <circle cx="3" cy="8" r="1" />
                <circle cx="7" cy="8" r="1" />
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
