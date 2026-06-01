"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Sora } from "next/font/google"
import ReactMarkdown from "react-markdown"
import { assertVendorSession } from "@/app/actions/ai-vendor"
import {
  createVendorChat,
  saveVendorChatMessage,
  getVendorChats,
  getVendorChatMessages,
  deleteVendorChat,
} from "@/app/actions/vendor-chat"
import {
  addProductImagesFromUrlsForVendor,
  reorderProductImages,
  removeProductImageAI,
  uploadVendorChatImages,
} from "@/app/actions/ai-vendor-image"
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


const ACCEPT_CHAT_IMAGES =
  "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"

const AUTO_START_MESSAGE =
  "I have uploaded my product images. Please analyse them and help me create a listing."

const REX_FONT = Sora({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
})

const CARD_BORDER_STYLE = {
  borderColor: "rgba(255,255,255,0.08)",
} as const

const QUICK_CHIP_MESSAGES = [
  "📊 Show my sales",
  "🏪 Update my store",
  "📦 Check inventory",
  "💬 How am I doing?",
] as const

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
  const [focusedProductId, setFocusedProductId] = useState<string | null>(null)
  const [productImages, setProductImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [imageUploadError, setImageUploadError] = useState<string | null>(null)
  const [startImages, setStartImages] = useState<string[]>([])
  const [startImagePreviews, setStartImagePreviews] = useState<string[]>([])
  const [uploadingStart, setUploadingStart] = useState(false)
  const [activeTab, setActiveTab] = useState<"assistant" | "bulk">("assistant")
  const [chatId, setChatId] = useState<string | null>(null)
  const [chatList, setChatList] = useState<
    { id: string; title: string; createdAt: Date }[]
  >([])
  const [loadingChats, setLoadingChats] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [attachedPreviews, setAttachedPreviews] = useState<string[]>([])
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const chatFileInputRef = useRef<HTMLInputElement>(null)
  const sendMessageRef = useRef<
    (overrideMessage?: string) => void | Promise<void>
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
    void getVendorChats("vendor")
      .then(setChatList)
      .finally(() => setLoadingChats(false))
  }, [allowed])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading, createdProductId, productImages.length])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const adjustTextareaHeight = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.max(44, el.scrollHeight)}px`
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [input, adjustTextareaHeight])

  const handleSend = useCallback(
    async (overrideMessage?: string) => {
      const text = (overrideMessage ?? input).trim()
      const isFirstInThread = !messages.some((m) => m.role === "user")
      const previewCount = startImagePreviews.length
      const canSendWithImages = isFirstInThread && previewCount > 0
      const chatPreviewSnapshot = [...attachedPreviews]
      if (!canSendWithImages && !text && chatPreviewSnapshot.length === 0) return
      if (loading || !allowed) return

      const hasStartPreviews = isFirstInThread && previewCount > 0
      const previewsForApi = [...startImagePreviews]

      let heroUploadedUrls: string[] = []
      if (previewsForApi.length > 0) {
        const fd = new FormData()
        for (let i = 0; i < previewsForApi.length; i++) {
          const dataUrl = previewsForApi[i]!
          const blob = await fetch(dataUrl).then((r) => r.blob())
          const ext =
            blob.type === "image/png"
              ? "png"
              : blob.type === "image/webp"
                ? "webp"
                : "jpg"
          fd.append(
            "images",
            new File([blob], `hero-${i}.${ext}`, {
              type: blob.type || "image/jpeg",
            })
          )
        }
        const up = await uploadVendorChatImages(fd)
        if (!up.ok) {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: up.error ?? "Could not upload images.",
            },
          ])
          return
        }
        heroUploadedUrls = up.urls
        setStartImagePreviews([])
        setStartImages([])
      }

      let chatUploadedUrls: string[] = []
      if (chatPreviewSnapshot.length > 0) {
        const fd = new FormData()
        for (let i = 0; i < chatPreviewSnapshot.length; i++) {
          const dataUrl = chatPreviewSnapshot[i]!
          const blob = await fetch(dataUrl).then((r) => r.blob())
          const ext =
            blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg"
          fd.append(
            "images",
            new File([blob], `chat-${i}.${ext}`, { type: blob.type || "image/jpeg" })
          )
        }
        const up = await uploadVendorChatImages(fd)
        if (!up.ok) {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: up.error ?? "Could not upload images. Use JPG, PNG, or WebP under 12MB.",
            },
          ])
          return
        }
        chatUploadedUrls = up.urls
        setAttachedPreviews([])
      }

      const textForApi =
        text ||
        (hasStartPreviews
          ? "Please analyse my product images and help me create a listing."
          : "")

      const finalContent: string = text
      const allUploadedUrls = [...heroUploadedUrls, ...chatUploadedUrls]
      const displayText =
        previewsForApi.length > 0 || allUploadedUrls.length > 0 || chatPreviewSnapshot.length > 0
          ? textForApi || text
          : finalContent

      const userMsg: ChatMsg = {
        id: crypto.randomUUID(),
        role: "user",
        content: displayText,
        ...(allUploadedUrls.length > 0
          ? { images: allUploadedUrls }
          : previewsForApi.length > 0 || chatPreviewSnapshot.length > 0
            ? { images: [...previewsForApi, ...chatPreviewSnapshot] }
            : {}),
      }
      const assistantId = crypto.randomUUID()
      const assistantMsg: ChatMsg = {
        id: assistantId,
        role: "assistant",
        content: "",
        ...(allUploadedUrls.length > 0 ? { images: allUploadedUrls } : {}),
      }

      let saveChatId = chatId
      if (!saveChatId) {
        const { id } = await createVendorChat(displayText, "vendor")
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

      const allPreviews = [
        ...(isFirstInThread && previewsForApi.length > 0 ? previewsForApi : []),
        ...chatPreviewSnapshot,
      ]
      let lastUserContent: ApiUserContent
      if (allPreviews.length > 0) {
        lastUserContent = [
          ...allPreviews.map((dataUrl) => {
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
          { type: "text" as const, text: textForApi || text },
        ]
      } else {
        lastUserContent = text
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
          body: JSON.stringify({
            messages: apiMessages,
            focusProductId: focusedProductId ?? undefined,
            focusEventId: focusedEventId ?? undefined,
            uploadedImageUrls: allUploadedUrls.length > 0 ? allUploadedUrls : undefined,
          }),
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
                focusProductId?: string
                focusEventId?: string
                galleryUpdate?: {
                  productId: string
                  images: string[]
                }
              }
              if (p.galleryUpdate?.images?.length) {
                setProductImages(p.galleryUpdate.images)
              }
              if (p.focusProductId) setFocusedProductId(p.focusProductId)
              if (p.focusEventId) setFocusedEventId(p.focusEventId)
              if (p.productId) {
                setCreatedProductId(p.productId)
                setFocusedProductId(p.productId)
                if (heroUploadedUrls.length > 0) {
                  void addProductImagesFromUrlsForVendor(
                    p.productId,
                    heroUploadedUrls
                  ).then((attach) => {
                    if (attach.ok && attach.images) {
                      setProductImages(attach.images)
                    }
                  })
                }
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
            m.id === assistantId ? { ...m, content: errText } : m
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
      input,
      router,
      startImagePreviews,
      attachedPreviews,
      adjustTextareaHeight,
      chatId,
      focusedProductId,
      focusedEventId,
    ]
  )

  useEffect(() => {
    sendMessageRef.current = handleSend
  }, [handleSend])

  function isListingTypeMessage(content: string): boolean {
    return (
      content.includes("Simple product") &&
      content.includes("Variable product") &&
      content.includes("Digital product") &&
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
      label: "📥 Digital product",
      value:
        "Digital product — downloadable file, ebook, music, or software",
    },
    {
      label: "🛎️ Service",
      value: "Service — bookable, quote, subscription, or on-demand",
    },
  ]

  const conversationSidebarInner = () => (
    <div className="flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        onClick={() => {
          setSidebarOpen(false)
          setMessages([])
          setChatId(null)
          setCreatedProductId(null)
          setFocusedProductId(null)
          setProductImages([])
          setStartImages([])
          setStartImagePreviews([])
          setInput("")
        }}
        className="mx-3 mt-3 w-[calc(100%-24px)] rounded-lg bg-[#D4450A] py-2.5 px-4 text-center text-[13px] font-semibold text-white"
      >
        + New
      </button>
      <p className="px-4 pb-2 pt-4 text-[11px] font-normal uppercase tracking-widest text-zinc-500">
        Conversations
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {loadingChats ? (
          <p className="p-3 text-xs text-zinc-500">Loading…</p>
        ) : null}
        {chatList.map((chat) => (
          <div
            key={chat.id}
            className={`group relative mb-1 flex cursor-pointer items-center rounded-lg px-[14px] py-2.5 transition-colors hover:bg-[rgba(255,255,255,0.05)] ${
              chatId === chat.id
                ? "border border-transparent bg-[rgba(212,69,10,0.15)] before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:rounded-l-lg before:bg-[#D4450A]"
                : ""
            }`}
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
              setCreatedProductId(null)
              setFocusedProductId(null)
              setProductImages([])
              setSidebarOpen(false)
            }}
          >
            <div className="min-w-0 flex-1 pr-8">
              <p className="truncate text-[13px] font-medium text-zinc-300">
                {chat.title}
              </p>
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
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500 opacity-0 hover:text-red-400 group-hover:opacity-100"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )

  if (allowed === null) {
    return (
      <div className="min-h-screen px-6 py-10 pb-24 sm:pb-0" style={{ backgroundColor: "#0F1117" }}>
        <p className="text-sm text-zinc-400">Loading…</p>
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col overflow-hidden ${REX_FONT.className}`}
      style={{ background: "#0F1117", height: "calc(100dvh - 56px)" }}
    >
      <header
        className="shrink-0 border-b px-4 py-3 md:py-4"
        style={{
          backgroundColor: "#161B27",
          borderColor: CARD_BORDER_STYLE.borderColor,
        }}
      >
        <div className="relative flex items-center gap-3">
          <button
            type="button"
            aria-label="Open conversations"
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl text-white hover:bg-[rgba(255,255,255,0.06)] md:hidden"
          >
            ☰
          </button>
          <div className="flex min-w-0 flex-1 flex-col items-start md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:items-center">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold leading-none text-white">
                Rex
              </h1>
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: "#22c55e",
                  boxShadow: "0 0 6px #22c55e",
                }}
                aria-hidden
              />
            </div>
            <p className="mt-1 text-[11px] leading-tight text-zinc-400">
              Your AI business partner
            </p>
          </div>
          <Link
            href="/dashboard/vendor"
            className="ml-auto shrink-0 text-xs text-zinc-400 transition-colors hover:text-zinc-200"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 w-full flex-1 overflow-hidden">
        {sidebarOpen ? (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.6)] md:hidden"
          />
        ) : null}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex h-full max-h-[100dvh] w-[260px] flex-col overflow-hidden border-r transition-transform md:static md:z-0 md:max-h-none md:w-[220px] md:translate-x-0 md:transition-none lg:w-[260px] ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
          style={{
            backgroundColor: "#161B27",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <div
            className="flex shrink-0 items-center justify-end border-b p-3 md:hidden"
            style={{ borderColor: CARD_BORDER_STYLE.borderColor }}
          >
            <button
              type="button"
              aria-label="Close conversations"
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg px-3 py-1.5 text-sm text-zinc-300 hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
            >
              Close
            </button>
          </div>
          {conversationSidebarInner()}
        </aside>

        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col"
          style={{ backgroundColor: "#0F1117" }}
        >
          <div
            className="flex shrink-0 border-b"
            style={{
              backgroundColor: "#161B27",
              borderColor: CARD_BORDER_STYLE.borderColor,
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("assistant")}
              className={`px-6 py-3 text-sm transition-colors ${
                activeTab === "assistant"
                  ? "border-b-2 border-[#D4450A] font-semibold text-white"
                  : "font-normal text-zinc-500 hover:text-zinc-300"
              }`}
            >
              AI Assistant
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("bulk")}
              className={`px-6 py-3 text-sm transition-colors ${
                activeTab === "bulk"
                  ? "border-b-2 border-[#D4450A] font-semibold text-white"
                  : "font-normal text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Bulk Upload
            </button>
          </div>
          {activeTab === "assistant" && (
            <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-4 py-4">
            <div
              className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4"
              style={{ flex: 1, overflowY: "auto", minHeight: 0 }}
            >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-8 text-center">
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-[36px] leading-none"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #D4450A, #E8820C)",
                }}
                aria-hidden
              >
                ⚡
              </div>
              <h2 className="mt-6 text-[22px] font-bold text-white md:text-[28px]">
                Rex
              </h2>
              <p className="mt-3 max-w-[360px] text-[13px] leading-snug text-zinc-400 md:text-sm md:leading-relaxed">
                Your AI business partner for LinkWe. I can update your store,
                manage products, analyse your sales, and run your business with
                you.
              </p>

              <div
                className="mt-8 w-full max-w-lg rounded-xl p-4 text-left"
                style={{
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <p className="mb-1 text-sm font-medium text-zinc-300">
                  Upload product images (optional)
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
                        {i === 0 ? (
                          <span className="absolute bottom-0 left-0 right-0 rounded-b bg-black/60 text-center text-[10px] text-white">
                            Featured
                          </span>
                        ) : null}
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
                    className={`cursor-pointer text-[13px] text-zinc-400 underline-offset-4 transition-colors hover:text-zinc-200 ${
                      uploadingStart ? "pointer-events-none opacity-50" : ""
                    }`}
                  >
                    {uploadingStart ? "Uploading…" : "+ Add images"}
                    <input
                      type="file"
                      accept={ACCEPT_CHAT_IMAGES}
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

              <div className="mt-8 grid w-full max-w-lg grid-cols-2 gap-2 md:flex md:flex-wrap md:justify-center md:gap-2">
                {QUICK_CHIP_MESSAGES.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      void handleSend(chip)
                      setSidebarOpen(false)
                    }}
                    className="rounded-full border px-4 py-2 text-left text-[13px] leading-snug text-zinc-300 transition-colors hover:bg-[rgba(255,255,255,0.03)] md:text-center"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.06)",
                      borderColor: "rgba(255,255,255,0.1)",
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
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
                className={`text-[14px] ${
                  m.role === "user"
                    ? "max-w-[90%] md:max-w-[80%] lg:max-w-[75%] bg-gradient-to-br from-[#D4450A] to-[#E8820C] px-4 py-3 text-white [border-radius:18px_18px_4px_18px]"
                    : `max-w-[90%] md:max-w-[80%] border bg-[#1E2433] px-[18px] py-[14px] text-[#E4E4E7] shadow-none [border-radius:4px_18px_18px_18px]`
                } ${m.role === "user" ? "whitespace-pre-wrap" : ""}`}
                style={
                  m.role === "assistant"
                    ? {
                        borderColor: "rgba(255,255,255,0.08)",
                      }
                    : undefined
                }
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
                  <>
                    {m.images && m.images.length > 0 ? (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {m.images.map((src, i) => (
                          <img
                            key={src.slice(-32) + i}
                            src={src}
                            alt=""
                            className="h-16 w-16 rounded object-cover"
                            style={{
                              border: "1px solid rgba(255,255,255,0.08)",
                            }}
                          />
                        ))}
                      </div>
                    ) : null}
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => (
                            <p
                              style={{
                                marginBottom: "16px",
                                lineHeight: "1.75",
                                color: "#e4e4e7",
                              }}
                            >
                              {children}
                            </p>
                          ),
                          strong: ({ children }) => (
                            <strong
                              style={{ color: "#E8820C", fontWeight: 700 }}
                            >
                              {children}
                            </strong>
                          ),
                          ul: ({ children }) => (
                            <ul
                              style={{
                                margin: "12px 0 16px 0",
                                paddingLeft: "20px",
                              }}
                            >
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol
                              style={{
                                margin: "12px 0 16px 0",
                                paddingLeft: "20px",
                              }}
                            >
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li
                              style={{
                                marginBottom: "8px",
                                lineHeight: "1.7",
                                color: "#e4e4e7",
                              }}
                            >
                              {children}
                            </li>
                          ),
                          h1: ({ children }) => (
                            <h1
                              style={{
                                fontWeight: 700,
                                color: "#ffffff",
                                marginBottom: "10px",
                                marginTop: "20px",
                                fontSize: "18px",
                              }}
                            >
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2
                              style={{
                                fontWeight: 700,
                                color: "#ffffff",
                                marginBottom: "10px",
                                marginTop: "18px",
                                fontSize: "16px",
                              }}
                            >
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3
                              style={{
                                fontWeight: 600,
                                color: "#ffffff",
                                marginBottom: "8px",
                                marginTop: "14px",
                                fontSize: "14px",
                              }}
                            >
                              {children}
                            </h3>
                          ),
                          code: ({ children }) => (
                            <code
                              style={{
                                backgroundColor: "rgba(255,255,255,0.1)",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "12px",
                                color: "#E8820C",
                              }}
                            >
                              {children}
                            </code>
                          ),
                          hr: () => (
                            <hr
                              style={{
                                borderColor: "rgba(255,255,255,0.1)",
                                margin: "20px 0",
                              }}
                            />
                          ),
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                    {isListingTypeMessage(m.content) && !loading ? (
                      <div className="mt-3 flex flex-col gap-2">
                        {LISTING_TYPE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              void handleSend(opt.label)
                            }}
                            className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-white transition-all hover:bg-[rgba(255,255,255,0.06)] active:scale-[0.99]"
                            style={{
                              border: "1px solid rgba(255,255,255,0.08)",
                              backgroundColor: "#161B27",
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          ))}
          {loading ? (
            <p className="pl-2 text-xs text-zinc-400">Thinking…</p>
          ) : null}
          <div ref={bottomRef} />
        </div>

        {createdProductId != null ? (
          <div
            className="mt-auto border-t p-4"
            style={{ borderColor: CARD_BORDER_STYLE.borderColor }}
          >
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

            {imageUploadError ? (
              <p className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {imageUploadError}
              </p>
            ) : null}

            {productImages.length < 10 ? (
              <label
                className={`inline-block cursor-pointer rounded-[10px] px-4 py-2 text-sm font-medium text-white hover:opacity-90 ${
                  uploading ? "bg-zinc-600" : ""
                }`}
                style={uploading ? undefined : { backgroundColor: "#D4450A" }}
              >
                {uploading ? "Uploading..." : "Add Image"}
                <input
                  type="file"
                  accept={ACCEPT_CHAT_IMAGES}
                  multiple
                  className="hidden"
                  disabled={uploading}
                  onChange={async (e) => {
                    const list = e.target.files
                    if (!list?.length || !createdProductId) return
                    const files = Array.from(list)
                    setUploading(true)
                    setImageUploadError(null)
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
                        } else if (!result.ok) {
                          setImageUploadError(
                            result.error ?? `Could not upload ${file.name}.`
                          )
                          break
                        }
                      }
                    } catch (err) {
                      setImageUploadError(
                        err instanceof Error
                          ? err.message
                          : "Image upload failed."
                      )
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
              className="ml-3 text-sm text-zinc-400 underline decoration-zinc-600 underline-offset-2 hover:text-zinc-200"
            >
              Go to products to publish
            </Link>
          </div>
        ) : null}

        <div
          className="border-t pb-[max(16px,env(safe-area-inset-bottom))] pt-3"
          style={{
            backgroundColor: "#161B27",
            borderColor: CARD_BORDER_STYLE.borderColor,
            flexShrink: 0,
          }}
        >
          {/* Hidden file input for chat-attach paperclip */}
          <input
            ref={chatFileInputRef}
            type="file"
            accept={ACCEPT_CHAT_IMAGES}
            multiple
            className="hidden"
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? [])
              e.target.value = ""
              const allowed = files.filter((f) =>
                ["image/jpeg", "image/png", "image/webp"].includes(f.type)
              )
              const dataUrls = await Promise.all(
                allowed.map(
                  (f) =>
                    new Promise<string>((res) => {
                      const reader = new FileReader()
                      reader.onload = () => res(reader.result as string)
                      reader.readAsDataURL(f)
                    })
                )
              )
              const compressed = await Promise.all(
                dataUrls.map((d) => compressImage(d))
              )
              setAttachedPreviews((prev) => [...prev, ...compressed])
            }}
          />

          {/* Thumbnail preview strip for attached images */}
          {attachedPreviews.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachedPreviews.map((src, i) => (
                <div key={i} className="relative">
                  <img
                    src={src}
                    alt=""
                    className="h-14 w-14 rounded-lg object-cover"
                    style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setAttachedPreviews((prev) =>
                        prev.filter((_, j) => j !== i)
                      )
                    }
                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700 text-[10px] text-white hover:bg-zinc-600"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            {/* Paperclip / attach button */}
            <button
              type="button"
              onClick={() => chatFileInputRef.current?.click()}
              disabled={loading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-zinc-200 disabled:opacity-40"
              style={{ border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#0F1117" }}
              title="Attach images (JPG, PNG, WebP)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>

            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                e.target.style.height = "auto"
                e.target.style.height = `${Math.max(44, e.target.scrollHeight)}px`
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  void handleSend()
                }
              }}
              placeholder="Describe what you want to list…"
              disabled={loading}
              className="min-h-11 max-h-48 min-w-0 flex-1 resize-none overflow-y-auto rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[rgba(212,69,10,0.5)] focus:outline-none focus:ring-0 disabled:opacity-50"
              style={{
                backgroundColor: "#0F1117",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={
                loading ||
                (!input.trim() &&
                  attachedPreviews.length === 0 &&
                  !(
                    !messages.some((m) => m.role === "user") &&
                    startImagePreviews.length > 0
                  ))
              }
              className="h-auto min-h-[44px] shrink-0 self-start rounded-[10px] px-[14px] py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
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
