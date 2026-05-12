"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  createVendorChat,
  saveVendorChatMessage,
  getVendorChats,
  getVendorChatMessages,
} from "@/app/actions/vendor-chat"
import { uploadVendorChatImages } from "@/app/actions/ai-vendor-image"

async function compressImage(
  dataUrl: string,
  maxSizeBytes = 4 * 1024 * 1024
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      let { width, height } = img
      const maxDim = 1920
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height)
        width = Math.floor(width * ratio)
        height = Math.floor(height * ratio)
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, width, height)
      let quality = 0.85
      const tryCompress = () => {
        const result = canvas.toDataURL("image/jpeg", quality)
        const base64 = result.split(",")[1] ?? ""
        const sizeBytes = Math.ceil(base64.length * 0.75)
        if (sizeBytes <= maxSizeBytes || quality <= 0.1) {
          resolve(result)
        } else {
          quality -= 0.1
          tryCompress()
        }
      }
      tryCompress()
    }
    img.src = dataUrl
  })
}

type ApiUserMessageContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | {
          type: "image"
          source: {
            type: "base64"
            media_type: string
            data: string
          }
        }
    >

type ChatMsg = {
  id: string
  role: "user" | "assistant"
  content: string
  images?: string[]
}

const ACCEPT_CHAT_IMAGES =
  "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"

function isListingTypeMessage(content: string): boolean {
  return (
    content.includes("Simple product") &&
    content.includes("Variable product") &&
    content.includes("Service")
  )
}

const LISTING_TYPE_OPTIONS = [
  {
    label: "🛍️ Simple product",
    value: "Simple product — one price, one stock level",
  },
  {
    label: "🎨 Variable product",
    value:
      "Variable product — different sizes, colours, or options",
  },
  {
    label: "🛎️ Service",
    value: "Service — bookable, quote, subscription, or on-demand",
  },
]

export default function FloatingAIChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [chatId, setChatId] = useState<string | null>(null)
  const [chatList, setChatList] = useState<
    { id: string; title: string; createdAt: Date }[]
  >([])
  const [showHistory, setShowHistory] = useState(false)
  const [createdProductId, setCreatedProductId] = useState<string | null>(null)
  const [focusedProductId, setFocusedProductId] = useState<string | null>(
    null
  )
  const [attachedPreviews, setAttachedPreviews] = useState<string[]>([])
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      getVendorChats().then(setChatList)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const handleSend = useCallback(
    async (overrideMessage?: string) => {
      const text = (overrideMessage ?? input).trim()
      const previewSnapshot = [...attachedPreviews]
      if ((!text && previewSnapshot.length === 0) || loading) return

      let uploadedUrls: string[] = []
      if (previewSnapshot.length > 0) {
        const fd = new FormData()
        for (let i = 0; i < previewSnapshot.length; i++) {
          const dataUrl = previewSnapshot[i]!
          const blob = await fetch(dataUrl).then((r) => r.blob())
          const ext =
            blob.type === "image/png"
              ? "png"
              : blob.type === "image/webp"
                ? "webp"
                : "jpg"
          fd.append(
            "images",
            new File([blob], `photo-${i}.${ext}`, {
              type: blob.type || "image/jpeg",
            })
          )
        }
        const uploadResult = await uploadVendorChatImages(fd)
        if (!uploadResult.ok) {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: "assistant",
              content:
                uploadResult.error ??
                "Could not upload images. Use JPG, PNG, or WebP under 12MB.",
            },
          ])
          return
        }
        uploadedUrls = uploadResult.urls
      }

      setInput("")
      setAttachedPreviews([])
      setLoading(true)

      const userMsg: ChatMsg = {
        id: Date.now().toString(),
        role: "user",
        content: text,
        images: uploadedUrls.length > 0 ? uploadedUrls : undefined,
      }
      setMessages((prev) => [...prev, userMsg])

      const messageContent: ApiUserMessageContent =
        previewSnapshot.length > 0
          ? [
              ...previewSnapshot.map((dataUrl) => {
                const commaI = dataUrl.indexOf(",")
                const meta = commaI >= 0 ? dataUrl.slice(0, commaI) : ""
                const data = commaI >= 0 ? dataUrl.slice(commaI + 1) : dataUrl
                const mediaType = meta.match(/:(.*?);/)?.[1] ?? "image/jpeg"
                return {
                  type: "image" as const,
                  source: {
                    type: "base64" as const,
                    media_type: mediaType,
                    data,
                  },
                }
              }),
              { type: "text" as const, text },
            ]
          : text

      const saveUserString = [
        text,
        userMsg.images && userMsg.images.length > 0
          ? `[${userMsg.images.length} image(s)]`
          : "",
      ]
        .filter(Boolean)
        .join(" ")

      let currentChatId = chatId
      if (!currentChatId) {
        const firstTitle =
          text ||
          (userMsg.images && userMsg.images.length > 0 ? "Image message" : "")
        const chat = await createVendorChat(firstTitle)
        currentChatId = chat.id
        setChatId(currentChatId)
        setChatList((prev) => [
          { id: chat.id, title: firstTitle.slice(0, 50), createdAt: new Date() },
          ...prev,
        ])
      }

      await saveVendorChatMessage(
        currentChatId,
        "user",
        saveUserString ||
          (userMsg.images && userMsg.images.length > 0 ? "Image message" : "")
      )

      const prior = messages
        .filter((m) => m.id !== "welcome")
        .concat(userMsg)
      const apiMessages = [
        ...prior.slice(0, -1).map((m) => ({
          role: m.role,
          content: m.content as string,
        })),
        { role: "user" as const, content: messageContent },
      ]

      try {
        const res = await fetch("/api/vendor-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            focusProductId: focusedProductId ?? undefined,
            uploadedImageUrls:
              uploadedUrls.length > 0 ? uploadedUrls : undefined,
          }),
        })

        const reader = res.body?.getReader()
        if (!reader) return

        let assistantText = ""
        const assistantId = Date.now().toString() + "-a"
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content: "",
            images:
              uploadedUrls.length > 0 ? [...uploadedUrls] : undefined,
          },
        ])

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = new TextDecoder().decode(value)
          const lines = chunk.split("\n").filter((l) => l.startsWith("data: "))
          for (const line of lines) {
            const data = line.slice(6)
            if (data === "[DONE]") break
            try {
              const parsed = JSON.parse(data) as {
                productId?: string
                focusProductId?: string
                text?: string
                galleryUpdate?: {
                  productId: string
                  images: string[]
                }
              }
              if (parsed.productId) {
                setCreatedProductId(parsed.productId)
                setFocusedProductId(parsed.productId)
              }
              if (parsed.focusProductId)
                setFocusedProductId(parsed.focusProductId)
              if (parsed.text) {                assistantText += parsed.text
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: assistantText } : m
                  )
                )
              }
            } catch {
              // ignore parse errors in stream
            }
          }
        }

        if (currentChatId && assistantText) {
          await saveVendorChatMessage(
            currentChatId,
            "assistant",
            assistantText
          )
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: "Something went wrong. Please try again.",
          },
        ])
      } finally {
        setLoading(false)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    },
    [input, loading, messages, chatId, attachedPreviews, focusedProductId]
  )

  return (
    <>
      {open && (
        <div
          className="fixed right-6 bottom-20 z-50 flex h-[600px] w-96
          flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900
          shadow-2xl"
        >
          <div
            className="flex items-center justify-between border-b border-zinc-700
            bg-zinc-800 px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#D4450A]" />
              <span className="text-sm font-medium text-white">AI Assistant</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={
                  chatId
                    ? `/dashboard/vendor/ai-assistant?chatId=${chatId}`
                    : "/dashboard/vendor/ai-assistant"
                }
                className="rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-400
                  hover:bg-zinc-600 hover:text-white"
              >
                Full page
              </a>
              <button
                type="button"
                onClick={() => setShowHistory((h) => !h)}
                className="rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-400
                  hover:bg-zinc-600 hover:text-white"
              >
                History
              </button>
              <button
                type="button"
                onClick={() => {
                  setMessages([])
                  setChatId(null)
                  setCreatedProductId(null)
                  setFocusedProductId(null)
                  setInput("")
                  setAttachedPreviews([])
                }}
                className="text-xs text-zinc-400 hover:text-white"
              >
                + New
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-lg leading-none text-zinc-400 hover:text-white"
              >
                ×
              </button>
            </div>
          </div>

          {showHistory && (
            <div className="max-h-40 overflow-y-auto border-b border-zinc-800 bg-zinc-800/80">
              {chatList.length === 0 && (
                <p className="p-3 text-xs text-zinc-500">No conversations yet</p>
              )}
              {chatList.map((chat) => (
                <button
                  type="button"
                  key={chat.id}
                  onClick={async () => {
                    const msgs = await getVendorChatMessages(chat.id)
                    setMessages([
                      ...msgs.map((m, i) => ({
                        id: String(i),
                        role: m.role as "user" | "assistant",
                        content: m.content,
                      })),
                    ])
                    setChatId(chat.id)
                    setShowHistory(false)
                  }}
                  className="w-full border-b border-zinc-800 px-3 py-2
                    text-left last:border-0 hover:bg-zinc-700"
                >
                  <p className="truncate text-xs text-zinc-300">{chat.title}</p>
                  <p className="text-[10px] text-zinc-500">
                    {new Date(chat.createdAt).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col gap-3 px-1 py-2">
                <div className="rounded-xl bg-zinc-800 px-3 py-2.5 text-sm leading-relaxed text-zinc-200">
                  Hi! I&apos;m your LinkWe assistant. What would you like to
                  create today?
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    {
                      label: "🛍️ Simple product",
                      message: "I want to create a simple product",
                    },
                    {
                      label: "🎨 Variable product",
                      message:
                        "I want to create a variable product with different sizes or colours",
                    },
                    {
                      label: "🛎️ Service",
                      message: "I want to create a service listing",
                    },
                    {
                      label: "✏️ Edit an existing product",
                      message: "I want to edit an existing product",
                    },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => void handleSend(opt.message)}
                      className="w-full rounded-xl border border-zinc-600 bg-zinc-700/60 px-3 py-2.5 text-left text-xs font-semibold text-zinc-100 transition-all hover:border-[#D4450A] hover:bg-zinc-700 active:scale-95"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "user" ? (
                  <div
                    className="max-w-[85%] overflow-hidden rounded-xl rounded-br-sm
                      bg-[#D4450A] text-sm leading-relaxed text-white"
                  >
                    {m.images && m.images.length > 0 && (
                      <div
                        className={`flex flex-wrap gap-1 p-1.5 ${
                          m.content ? "pb-0" : ""
                        }`}
                      >
                        {m.images.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            className="h-24 w-24 rounded-lg object-cover"
                          />
                        ))}
                      </div>
                    )}
                    {m.content && (
                      <div className="px-3 py-2">{m.content}</div>
                    )}
                  </div>
                ) : (
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed
                    ${"rounded-bl-sm bg-zinc-800 text-zinc-200"}`}
                  >
                    {m.images && m.images.length > 0 ? (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {m.images.map((src, ii) => (
                          <img
                            key={src.slice(-24) + ii}
                            src={src}
                            alt=""
                            className="h-20 w-20 rounded-lg object-cover ring-1 ring-zinc-700"
                          />
                        ))}
                      </div>
                    ) : null}
                    {m.content ||
                      (loading && m.role === "assistant" ? (
                        <span className="flex gap-1">
                          <span
                            className="h-1.5 w-1.5 animate-bounce rounded-full
                              bg-zinc-500"
                          />
                          <span
                            className="h-1.5 w-1.5 animate-bounce rounded-full
                              bg-zinc-500"
                            style={{ animationDelay: "0.1s" }}
                          />
                          <span
                            className="h-1.5 w-1.5 animate-bounce rounded-full
                              bg-zinc-500"
                            style={{ animationDelay: "0.2s" }}
                          />
                        </span>
                      ) : (
                        ""
                      ))}
                    {m.content && isListingTypeMessage(m.content) && !loading ? (
                      <div className="mt-3 flex flex-col gap-2">
                        {LISTING_TYPE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setInput(opt.label)
                              void handleSend(opt.label)
                            }}
                            className="w-full rounded-xl border border-zinc-600 bg-zinc-700 px-3 py-2.5 text-left text-xs font-semibold text-zinc-100 transition-all hover:border-[#D4450A] hover:bg-zinc-600 active:scale-95"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="rounded-xl rounded-bl-sm bg-zinc-800 px-3 py-2">
                  <span className="flex gap-1">
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full
                        bg-zinc-500"
                    />
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full
                        bg-zinc-500"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full
                        bg-zinc-500"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {createdProductId && (
            <div className="border-t border-zinc-700 bg-zinc-800 px-4 py-2">
              <a
                href={`/dashboard/vendor/products/${createdProductId}/edit`}
                className="text-xs text-[#D4450A] hover:underline"
              >
                View created product →
              </a>
            </div>
          )}

          <div className="border-t border-zinc-700 px-3 py-3">
            {attachedPreviews.length > 0 && (
              <div className="flex flex-wrap gap-1 px-3 pt-2">
                {attachedPreviews.map((url, i) => (
                  <div key={i} className="relative">
                    <img
                      src={url}
                      alt=""
                      className="h-10 w-10 rounded object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setAttachedPreviews((prev) =>
                          prev.filter((_, idx) => idx !== i)
                        )
                      }}
                      className="absolute -top-1 -right-1 flex h-3.5 w-3.5
                        items-center justify-center rounded-full bg-red-500
                        text-[8px] text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <label
                className="flex h-9 w-9 shrink-0 cursor-pointer
                  items-center justify-center rounded-xl bg-zinc-700
                  hover:bg-zinc-600"
                title="Attach images (JPG, PNG, WebP)"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                <input
                  type="file"
                  accept={ACCEPT_CHAT_IMAGES}
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const picked = Array.from(e.target.files ?? [])
                    const ok = picked.filter((f) =>
                      ["image/jpeg", "image/png", "image/webp"].includes(f.type)
                    )
                    for (const file of ok) {
                      const reader = new FileReader()
                      reader.onload = () => {
                        void (async () => {
                          const dataUrl = reader.result as string
                          const compressed = await compressImage(dataUrl)
                          setAttachedPreviews((prev) => [...prev, compressed])
                        })()
                      }
                      reader.readAsDataURL(file)
                    }
                    e.target.value = ""
                  }}
                />
              </label>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    void handleSend()
                  }
                }}
                placeholder="Ask me anything..."
                rows={1}
                className="max-h-[100px] flex-1 resize-none overflow-y-auto
                  rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm
                  text-white placeholder-zinc-500 focus:border-zinc-500
                  focus:outline-none"
                style={{ maxHeight: "100px" }}
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={
                  loading || (!input.trim() && attachedPreviews.length === 0)
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center
                  rounded-xl bg-[#D4450A] disabled:opacity-40"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed right-6 bottom-6 z-50 flex h-14 w-14 items-center
          justify-center rounded-full bg-[#D4450A] shadow-lg transition-all
          hover:opacity-90"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </>
  )
}
