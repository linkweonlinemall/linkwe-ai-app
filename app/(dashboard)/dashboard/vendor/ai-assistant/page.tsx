"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import { assertVendorSession } from "@/app/actions/ai-vendor"
import {
  createVendorChat,
  saveVendorChatMessage,
  getVendorChats,
  getVendorChatMessages,
  deleteVendorChat,
} from "@/app/actions/vendor-chat"
import { reorderProductImages, removeProductImageAI } from "@/app/actions/ai-vendor-image"
import DraggableImageGrid from "@/components/vendor/draggable-image-grid"
import BulkUploadTab from "./bulk-upload-tab"

type ChatMsg = {
  id: string
  role: "user" | "assistant"
  content: string
  images?: string[]
}

type ApiUserContent =
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

function stripMarkdown(input: string): string {
  let s = input
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1")
  s = s.replace(/\*([^*]+)\*/g, "$1")
  s = s.replace(/__([^_]+)__/g, "$1")
  s = s.replace(/_([^_]+)_/g, "$1")
  s = s.replace(/~~([^~]+)~~/g, "$1")
  s = s.replace(/^#{1,6}\s*/gm, "")
  s = s.replace(/^[-*+]\s+/gm, "")
  s = s.replace(/^\d+\.\s+/gm, "")
  s = s.replace(/`{1,3}[^`]*`{1,3}/g, "")
  return s.trim()
}

const AUTO_START_MESSAGE =
  "I have uploaded my product images. Please analyse them and help me create a listing."

async function compressImage(
  dataUrl: string,
  maxSizeBytes = 4 * 1024 * 1024
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      let { width, height } = img

      // Scale down if needed
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

      // Try progressively lower quality until under limit
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

export default function VendorAIAssistantPage() {
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [createdProductId, setCreatedProductId] = useState<string | null>(null)
  const [productImages, setProductImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [startImages, setStartImages] = useState<string[]>([])
  const [startImagePreviews, setStartImagePreviews] = useState<string[]>([])
  const [uploadingStart, setUploadingStart] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [activeTab, setActiveTab] = useState<"assistant" | "bulk">("assistant")
  const [chatId, setChatId] = useState<string | null>(null)
  const [chatList, setChatList] = useState<
    { id: string; title: string; createdAt: Date }[]
  >([])
  const [loadingChats, setLoadingChats] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const selectionRef = useRef({ start: 0, end: 0 })
  const autoUploadDoneForProductRef = useRef<string | null>(null)
  const sendMessageRef = useRef<
    (text: string) => void | Promise<void>
  >(() => {})
  const messagesRef = useRef<ChatMsg[]>([])
  const autoChatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    void assertVendorSession().then((r) => {
      if (!r.ok) {
        router.replace("/")
        return
      }
      setAllowed(true)
    })
  }, [router])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get("chatId")
    if (id) {
      getVendorChatMessages(id).then((msgs) => {
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content:
              "Hi! I'm your LinkWe assistant. Tell me what you'd like to list and I'll help you create it.",
          },
          ...msgs.map((m, i) => ({
            id: String(i),
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ])
        setChatId(id)
      })
    }
  }, [])

  useEffect(() => {
    if (!allowed) return
    setLoadingChats(true)
    void getVendorChats()
      .then(setChatList)
      .finally(() => setLoadingChats(false))
  }, [allowed])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading, createdProductId, productImages.length])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    if (!createdProductId) return
    if (startImagePreviews.length === 0) return
    if (autoUploadDoneForProductRef.current === createdProductId) return

    const productId = createdProductId
    const previews = [...startImagePreviews]
    const names = [...startImages]
    autoUploadDoneForProductRef.current = createdProductId

    const autoUpload = async () => {
      setUploading(true)
      try {
        for (let i = 0; i < previews.length; i++) {
          const dataUrl = previews[i]!
          const res = await fetch(dataUrl)
          const blob = await res.blob()
          const name = names[i] || `product-image-${i + 1}.jpg`
          const file = new File([blob], name, { type: blob.type || "image/jpeg" })
          const fd = new FormData()
          fd.append("image", file)
          const { uploadProductImage } = await import(
            "@/app/actions/ai-vendor-image"
          )
          const result = await uploadProductImage(productId, fd)
          if (result.ok && result.images) {
            setProductImages(result.images)
          }
        }
      } finally {
        setUploading(false)
        setStartImagePreviews([])
        setStartImages([])
      }
    }
    void autoUpload()
  }, [createdProductId, startImagePreviews, startImages])

  const adjustTextareaHeight = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.max(44, el.scrollHeight)}px`
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [input, adjustTextareaHeight])

  const updateSelection = () => {
    const el = inputRef.current
    if (!el) return
    selectionRef.current = {
      start: el.selectionStart ?? 0,
      end: el.selectionEnd ?? 0,
    }
  }

  const insertAtCursor = (insert: string) => {
    const el = inputRef.current
    if (!el) {
      setInput((v) => v + insert)
      return
    }
    const { start, end } = selectionRef.current
    const v = input
    const next = v.slice(0, start) + insert + v.slice(end)
    setInput(next)
    const pos = start + insert.length
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(pos, pos)
      selectionRef.current = { start: pos, end: pos }
      adjustTextareaHeight()
    })
  }

  const wrapSelection = (before: string, after: string, placeholder: string) => {
    const el = inputRef.current
    const { start, end } = selectionRef.current
    const v = input
    const selected = v.slice(start, end)
    const core = selected || placeholder
    const next = v.slice(0, start) + before + core + after + v.slice(end)
    setInput(next)
    const endPos = start + before.length + core.length + after.length
    requestAnimationFrame(() => {
      if (el) {
        el.focus()
        if (selected) {
          el.setSelectionRange(endPos, endPos)
        } else {
          el.setSelectionRange(
            start + before.length,
            start + before.length + placeholder.length
          )
        }
        selectionRef.current = {
          start: el.selectionStart ?? 0,
          end: el.selectionEnd ?? 0,
        }
        adjustTextareaHeight()
      }
    })
  }

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      const isFirstInThread = !messages.some((m) => m.role === "user")
      const previewCount = startImagePreviews.length
      const canSendWithImages = isFirstInThread && previewCount > 0
      if (!canSendWithImages && !trimmed) return
      if (loading || !allowed) return

      const hasStartPreviews = isFirstInThread && previewCount > 0
      const previewsForApi = [...startImagePreviews]
      const textForApi =
        trimmed ||
        (hasStartPreviews
          ? "Please analyse my product images and help me create a listing."
          : "")

      const finalContent: string = trimmed
      const displayText =
        previewsForApi.length > 0
          ? textForApi
          : finalContent

      const userMsg: ChatMsg = {
        id: crypto.randomUUID(),
        role: "user",
        content: displayText,
        ...(previewsForApi.length > 0
          ? { images: [...previewsForApi] }
          : {}),
      }
      const assistantId = crypto.randomUUID()
      const assistantMsg: ChatMsg = {
        id: assistantId,
        role: "assistant",
        content: "",
      }

      let saveChatId = chatId
      if (!saveChatId) {
        const { id } = await createVendorChat(displayText)
        saveChatId = id
        setChatId(id)
        const listTitle =
          displayText.slice(0, 50) + (displayText.length > 50 ? "..." : "")
        setChatList((prev) => [
          { id, title: listTitle, createdAt: new Date() },
          ...prev,
        ])
      }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setInput("")
      setLoading(true)
      requestAnimationFrame(() => adjustTextareaHeight())

      let lastUserContent: ApiUserContent
      if (isFirstInThread && previewsForApi.length > 0) {
        lastUserContent = [
          ...previewsForApi.map((dataUrl) => {
            const comma = dataUrl.indexOf(",")
            const rest = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
            const meta = comma >= 0 ? dataUrl.slice(0, comma) : "data:image/jpeg;base64"
            const data = rest
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
          { type: "text" as const, text: textForApi },
        ]
      } else {
        lastUserContent = trimmed
      }

      const historyForApi = messages.filter((m) => m.id !== "welcome")
      const apiMessages: { role: string; content: ApiUserContent }[] = [
        ...historyForApi.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: lastUserContent },
      ]

      try {
        await saveVendorChatMessage(saveChatId, "user", userMsg.content)
        const res = await fetch("/api/vendor-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages }),
        })

        if (res.status === 401) {
          router.replace("/")
          return
        }

        const reader = res.body?.getReader()
        const decoder = new TextDecoder()
        let full = ""

        stream: while (reader) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue
            const data = line.slice(6)
            if (data === "[DONE]") break stream
            try {
              const p = JSON.parse(data) as {
                text?: string
                error?: string
                productId?: string
              }
              if (p.productId) {
                setCreatedProductId(p.productId)
                setProductImages([])
              }
              if (p.error) {
                full += `\n[Error: ${p.error}]`
                break stream
              }
              if (p.text) {
                full += p.text
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: full } : m
                  )
                )
              }
            } catch {
              // ignore
            }
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: full } : m
          )
        )
        try {
          await saveVendorChatMessage(saveChatId, "assistant", full)
        } catch (logErr) {
          console.error("saveVendorChatMessage assistant", logErr)
        }
      } catch (e) {
        console.error(e)
        const errText = "Something went wrong. Please try again."
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: errText }
              : m
          )
        )
        try {
          await saveVendorChatMessage(saveChatId, "assistant", errText)
        } catch (logErr) {
          console.error("saveVendorChatMessage assistant (error)", logErr)
        }
      } finally {
        setLoading(false)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    },
    [
      allowed,
      loading,
      messages,
      router,
      startImagePreviews,
      adjustTextareaHeight,
      chatId,
    ]
  )

  useEffect(() => {
    sendMessageRef.current = sendMessage
  }, [sendMessage])

  if (allowed === null) {
    return (
      <div
        className="min-h-screen px-6 py-10"
        style={{ backgroundColor: "var(--surface, #0c0c0b)" }}
      >
        <p className="text-sm text-zinc-400">Loading…</p>
      </div>
    )
  }

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: "var(--surface, #0c0c0b)" }}
    >
      <header
        className="border-b border-zinc-800/80 bg-zinc-950 px-4 py-3"
        style={{ borderColor: "rgba(63, 63, 70, 0.5)" }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <h1 className="text-sm font-semibold text-zinc-100">
              AI listing assistant
            </h1>
            <p className="text-xs text-zinc-500">Vendor · LinkWe</p>
          </div>
          <Link
            href="/dashboard/vendor"
            className="text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 w-full">
        <div className="flex h-full w-64 flex-col border-r border-zinc-700 bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-700 p-4">
            <span className="text-sm font-semibold text-white">
              Conversations
            </span>
            <button
              type="button"
              onClick={() => {
                setMessages([
                  {
                    id: "welcome",
                    role: "assistant",
                    content:
                      "Hi! I'm your LinkWe assistant. Tell me what you'd like to list and I'll help you create it.",
                  },
                ])
                setChatId(null)
                setCreatedProductId(null)
                setProductImages([])
                setStartImages([])
                setStartImagePreviews([])
                setInput("")
                autoUploadDoneForProductRef.current = null
              }}
              className="rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:text-white"
            >
              + New
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loadingChats ? (
              <p className="p-3 text-xs text-zinc-500">Loading…</p>
            ) : null}
            {chatList.map((chat) => (
              <div
                key={chat.id}
                className={`group flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-zinc-800 ${
                  chatId === chat.id ? "bg-zinc-800" : ""
                }`}
                onClick={async () => {
                  const msgs = await getVendorChatMessages(chat.id)
                  setMessages([
                    {
                      id: "welcome",
                      role: "assistant",
                      content:
                        "Hi! I'm your LinkWe assistant. Tell me what you'd like to list and I'll help you create it.",
                    },
                    ...msgs.map((m, i) => ({
                      id: String(i),
                      role: m.role as "user" | "assistant",
                      content: m.content,
                    })),
                  ])
                  setChatId(chat.id)
                  setCreatedProductId(null)
                  setProductImages([])
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-zinc-300">{chat.title}</p>
                  <p className="text-[10px] text-zinc-500">
                    {new Date(chat.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation()
                    await deleteVendorChat(chat.id)
                    setChatList((prev) => prev.filter((c) => c.id !== chat.id))
                    if (chatId === chat.id) {
                      setChatId(null)
                      setMessages([])
                    }
                  }}
                  className="ml-1 text-xs text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-red-400"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex border-b border-zinc-700">
            <button
              type="button"
              onClick={() => setActiveTab("assistant")}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === "assistant"
                  ? "border-b-2 border-[#D4450A] text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              AI Assistant
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("bulk")}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === "bulk"
                  ? "border-b-2 border-[#D4450A] text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Bulk Upload
            </button>
          </div>
          {activeTab === "assistant" && (
            <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-4 py-4">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
          {messages.length <= 1 ? (
            <div className="mx-4 mt-4 rounded-lg border border-dashed border-zinc-600 p-4">
              <p className="mb-1 text-sm font-medium text-zinc-300">
                Upload product images first (optional)
              </p>
              <p className="mb-3 text-xs text-zinc-500">
                Claude will analyse your images and help fill in the details.
                First image becomes the featured image.
              </p>

              {startImagePreviews.length > 0 ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {startImagePreviews.map((url, i) => (
                    <div key={url} className="relative">
                      <img
                        src={url}
                        alt=""
                        className="h-16 w-16 rounded object-cover"
                      />
                      {i === 0 && (
                        <span className="absolute bottom-0 left-0 right-0 rounded-b bg-black/60 text-center text-[10px] text-white">
                          Featured
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setStartImagePreviews((prev) =>
                            prev.filter((_, idx) => idx !== i)
                          )
                          setStartImages((prev) =>
                            prev.filter((_, idx) => idx !== i)
                          )
                        }}
                        className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {startImages.length < 10 ? (
                <label
                  className={`inline-block cursor-pointer rounded px-3 py-1.5 text-sm text-white ${
                    uploadingStart
                      ? "bg-zinc-600"
                      : "bg-zinc-700 hover:bg-zinc-600"
                  }`}
                >
                  {uploadingStart ? "Uploading..." : "+ Add Images"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={uploadingStart}
                    onChange={async (e) => {
                      const files = Array.from(e.target.files ?? [])
                      if (!files.length) return
                      setUploadingStart(true)
                      const previews: string[] = []
                      for (const file of files) {
                        const reader = new FileReader()
                        const dataUrl = await new Promise<string>((res) => {
                          reader.onload = () => res(reader.result as string)
                          reader.readAsDataURL(file)
                        })
                        const compressed = await compressImage(dataUrl)
                        previews.push(compressed)
                      }
                      setStartImagePreviews((prev) =>
                        [...prev, ...previews].slice(0, 10)
                      )
                      setStartImages((prev) =>
                        [...prev, ...files.map((f) => f.name)].slice(0, 10)
                      )
                      setUploadingStart(false)
                      e.target.value = ""
                      if (autoChatTimerRef.current) {
                        clearTimeout(autoChatTimerRef.current)
                        autoChatTimerRef.current = null
                      }
                      autoChatTimerRef.current = setTimeout(() => {
                        autoChatTimerRef.current = null
                        if (messagesRef.current.length > 0) return
                        void sendMessageRef.current(AUTO_START_MESSAGE)
                      }, 300)
                    }}
                  />
                </label>
              ) : null}
            </div>
          ) : null}

          {messages.length === 0 ? (
            <p className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm leading-relaxed text-zinc-300">
              Hi! I&apos;m your LinkWe assistant. Tell me what you&apos;d like
              to list and I&apos;ll help you create it.
            </p>
          ) : null}

          {messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "flex justify-end"
                  : "flex justify-start"
              }
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-[#D4450A] text-white"
                    : "border border-zinc-800 bg-zinc-900/60 text-zinc-200"
                } ${m.role === "user" ? "whitespace-pre-wrap" : ""}`}
              >
                {m.role === "user" && m.images && m.images.length > 0 ? (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {m.images.map((src, i) => (
                      <div key={src.slice(0, 40) + i} className="relative">
                        <img
                          src={src}
                          alt=""
                          className="h-12 w-12 rounded object-cover"
                        />
                        {i === 0 ? (
                          <span className="absolute bottom-0 left-0 right-0 rounded-b bg-black/50 text-center text-[9px] text-white">
                            Featured
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                {m.role === "user" ? (
                  <div className="whitespace-pre-wrap">{m.content}</div>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading ? (
            <p className="text-xs text-zinc-500">Thinking…</p>
          ) : null}
          <div ref={bottomRef} />
        </div>

        {createdProductId != null ? (
          <div className="mt-auto border-t border-zinc-700 p-4">
            <p className="mb-1 text-sm font-semibold text-white">
              Upload Images
            </p>
            <p className="mb-3 text-xs text-zinc-400">
              First image uploaded will be the featured image shown in search
              results.
            </p>

            {productImages.length > 0 ? (
              <div className="mb-3">
                <DraggableImageGrid
                  images={productImages}
                  onReorder={async (newImages) => {
                    if (!createdProductId) return
                    setProductImages(newImages)
                    await reorderProductImages(createdProductId, newImages)
                  }}
                  onRemove={async (url) => {
                    if (!createdProductId) return
                    const result = await removeProductImageAI(
                      createdProductId,
                      url
                    )
                    if (result.ok && result.images) {
                      setProductImages(result.images)
                    }
                  }}
                />
              </div>
            ) : null}

            {productImages.length < 10 ? (
              <label
                className={`inline-block cursor-pointer rounded px-4 py-2 text-sm font-medium text-white ${
                  uploading ? "bg-zinc-600" : "bg-[#D4450A]"
                }`}
              >
                {uploading ? "Uploading..." : "Add Image"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={uploading}
                  onChange={async (e) => {
                    const list = e.target.files
                    if (!list?.length || !createdProductId) return
                    const files = Array.from(list)
                    setUploading(true)
                    try {
                      for (const file of files) {
                        const fd = new FormData()
                        fd.append("image", file)
                        const { uploadProductImage } = await import(
                          "@/app/actions/ai-vendor-image"
                        )
                        const result = await uploadProductImage(
                          createdProductId,
                          fd
                        )
                        if (result.ok && result.images) {
                          setProductImages(result.images)
                        }
                      }
                    } finally {
                      setUploading(false)
                      e.target.value = ""
                    }
                  }}
                />
              </label>
            ) : null}

            <Link
              href="/dashboard/vendor/products"
              className="ml-3 text-sm text-zinc-400 underline"
            >
              Go to products to publish
            </Link>
          </div>
        ) : null}

        <div className="border-t border-zinc-800/80 py-3">
          {inputFocused ? (
            <div className="mb-1 flex w-fit gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-2 py-1">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => wrapSelection("**", "**", "text")}
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-zinc-300 hover:bg-zinc-700 hover:text-white"
                title="Bold"
              >
                B
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => wrapSelection("*", "*", "text")}
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-zinc-300 italic hover:bg-zinc-700 hover:text-white"
                title="Italic"
              >
                I
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertAtCursor("\n- ")}
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white"
                title="Bullet list"
              >
                •
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertAtCursor("\n1. ")}
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white"
                title="Numbered list"
              >
                1.
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setInput((v) => stripMarkdown(v))}
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white"
                title="Clear formatting"
              >
                ×
              </button>
            </div>
          ) : null}
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                updateSelection()
                e.target.style.height = "auto"
                e.target.style.height = `${Math.max(44, e.target.scrollHeight)}px`
              }}
              onKeyUp={updateSelection}
              onSelect={updateSelection}
              onFocus={() => {
                setInputFocused(true)
                updateSelection()
              }}
              onBlur={() => {
                setInputFocused(false)
                updateSelection()
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  void sendMessage(input)
                }
              }}
              placeholder="Describe what you want to list…"
              disabled={loading}
              className="min-h-11 max-h-48 min-w-0 flex-1 resize-none overflow-y-auto
                rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2.5
                text-sm text-zinc-100 placeholder:text-zinc-500
                focus:border-zinc-600 focus:outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => void sendMessage(input)}
              disabled={
                loading ||
                (!input.trim() &&
                  !(
                    !messages.some((m) => m.role === "user") &&
                    startImagePreviews.length > 0
                  ))
              }
              className="h-11 shrink-0 self-start rounded-xl px-4 text-sm font-medium text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: "#D4450A" }}
            >
              Send
            </button>
          </div>
        </div>
        </div>
          )}
          {activeTab === "bulk" && <BulkUploadTab />}
        </div>
      </div>
    </div>
  )
}
