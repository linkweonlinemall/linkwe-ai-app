"use client"

import { useState, useRef, useEffect, useCallback, type ChangeEvent, type Dispatch, type KeyboardEvent, type SetStateAction } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages"
import ReactMarkdown, { type Components } from "react-markdown"
import { useCartStore } from "@/lib/cart/cart-store"
import { addToCart, getCart } from "@/app/actions/cart"
import ProductCardChooseOptionsLink from "@/components/shop/ProductCardChooseOptionsLink"
import {
  createVendorChat,
  getVendorChats,
  getVendorChatMessages,
  saveVendorChatMessage,
} from "@/app/actions/vendor-chat"
import { parseAssistantMessage } from "@/lib/chat/parseMessage"
import type { ChatMessage, ChatProduct } from "@/lib/chat/types"
import type { CartItem } from "@/lib/cart/cart-store"

const SUGGESTIONS = [
  "Show me gifts under TTD 200",
  "I need something for a birthday",
  "What stores are in Port of Spain?",
  "Show me clothing for women",
]

const assistantMarkdownComponents: Partial<Components> = {
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#D4450A] underline hover:opacity-80"
    >
      {children}
    </a>
  ),
}

function linkifyText(text: string): string {
  return text.replace(
    /(https?:\/\/[^\s)]+)/g,
    (url) => `[${url}](${url})`
  )
}

function mapRows(rows: Awaited<ReturnType<typeof getCart>>): CartItem[] {
  return rows.map((row) => ({
    id: row.id,
    productId: row.productId,
    quantity: row.quantity,
    product: {
      id: row.product.id,
      name: row.product.name,
      slug: row.product.slug,
      price: row.product.price,
      images: row.product.images,
      stock: row.product.stock,
      store: row.product.store,
    },
    variant: row.variant
      ? {
          id: row.variant.id,
          name: row.variant.name,
          price: row.variant.price,
          attributes: row.variant.attributes as { name: string; value: string; hex?: string }[],
        }
      : null,
  }))
}

type ValidImageMedia = "image/jpeg" | "image/png" | "image/gif" | "image/webp"

function parseDataUrlForImage(
  imageDataUrl: string
): { data: string; media_type: ValidImageMedia } {
  const [header, data] = imageDataUrl.split(",")
  const mediaType = header?.match(/:(.*?);/)?.[1] ?? "image/jpeg"
  const validTypes: ValidImageMedia[] = ["image/jpeg", "image/png", "image/gif", "image/webp"]
  const safeType = validTypes.includes(mediaType as ValidImageMedia)
    ? (mediaType as ValidImageMedia)
    : "image/jpeg"
  return { data: data ?? "", media_type: safeType }
}

function chatMessageToApiParam(m: ChatMessage): MessageParam {
  if (m.role === "user" && m.imagePreview) {
    const { data, media_type } = parseDataUrlForImage(m.imagePreview)
    return {
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "base64", media_type, data },
        },
        { type: "text", text: m.content },
      ],
    }
  }
  if (m.role === "user") {
    return { role: "user", content: m.content }
  }
  return { role: "assistant", content: m.content }
}

function usePersistedChat(
  isLoggedIn: boolean,
  chatId: string | null,
  setChatId: (id: string | null) => void,
  setChatList: Dispatch<SetStateAction<{ id: string; title: string; createdAt: Date | string }[]>>,
  setItems: (items: CartItem[]) => void
) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(
    async (content: string, imageDataUrl?: string) => {
      let resolvedChatId: string | null = chatId
      if (isLoggedIn) {
        if (!resolvedChatId) {
          const { id } = await createVendorChat(content)
          resolvedChatId = id
          setChatId(id)
          const list = await getVendorChats()
          setChatList(list)
        }
        await saveVendorChatMessage(resolvedChatId, "user", content)
      }

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        imagePreview: imageDataUrl,
      }

      const assistantId = crypto.randomUUID()
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        isStreaming: true,
      }

      setMessages((prev) => [...prev, userMessage, assistantMessage])
      setIsLoading(true)

      let newUserApi: MessageParam
      if (imageDataUrl) {
        const { data, media_type } = parseDataUrlForImage(imageDataUrl)
        newUserApi = {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type, data },
            },
            { type: "text", text: content },
          ],
        }
      } else {
        newUserApi = { role: "user", content }
      }

      const apiMessages: MessageParam[] = [...messages.map((m) => chatMessageToApiParam(m)), newUserApi]

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages }),
        })

        const reader = res.body?.getReader()
        const decoder = new TextDecoder()
        let fullContent = ""

        stream: while (reader) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue
            const data = line.slice(6)
            if (data === "[DONE]") break stream

            try {
              const parsed = JSON.parse(data) as { text?: string; error?: string }
              if (parsed.error) {
                console.error("Chat error from API:", parsed.error)
                break stream
              }
              if (parsed.text) {
                fullContent += parsed.text
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          content: fullContent,
                          segments: parseAssistantMessage(fullContent),
                        }
                      : m
                  )
                )
              }
            } catch {
              // skip malformed chunk
            }
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: fullContent,
                  segments: parseAssistantMessage(fullContent),
                  isStreaming: false,
                }
              : m
          )
        )

        if (isLoggedIn && resolvedChatId && fullContent) {
          await saveVendorChatMessage(resolvedChatId, "assistant", fullContent)
        }

        if (
          fullContent.toLowerCase().includes("added") &&
          fullContent.toLowerCase().includes("cart")
        ) {
          try {
            const cartItems = await getCart()
            setItems(mapRows(cartItems))
          } catch {}
        }
      } catch (err) {
        console.error("Chat error:", err)
      } finally {
        setIsLoading(false)
      }
    },
    [messages, isLoggedIn, chatId, setChatId, setChatList, setItems]
  )

  return { messages, isLoading, sendMessage, setMessages }
}

function ProductCard({ product }: { product: ChatProduct }) {
  const router = useRouter()
  const setItems = useCartStore((s) => s.setItems)
  const openDrawer = useCartStore((s) => s.openDrawer)
  const [added, setAdded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!added) return
    const t = setTimeout(() => setAdded(false), 2000)
    return () => clearTimeout(t)
  }, [added])

  function handleAdd() {
    setError(null)
    setLoading(true)
    void (async () => {
      const result = await addToCart(product.id, 1)
      if (result.ok) {
        const rows = await getCart()
        setItems(mapRows(rows))
        setAdded(true)
        openDrawer()
      } else if (result.error === "not_logged_in") {
        router.push("/login")
      } else if (result.error === "out_of_stock") {
        setError("Out of stock")
      } else {
        setError("Could not add to cart")
      }
      setLoading(false)
    })()
  }

  return (
    <div
      className="flex w-44 flex-shrink-0 flex-col overflow-hidden rounded-xl bg-white"
      style={{ border: "1px solid var(--card-border)" }}
    >
      <Link href={`/products/${product.slug}`}>
        <div className="h-32 overflow-hidden bg-zinc-100">
          {product.images[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-3xl font-bold"
              style={{ color: "var(--text-disabled)" }}
            >
              {product.name.charAt(0)}
            </div>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p
          className="line-clamp-2 text-xs font-semibold leading-snug"
          style={{ color: "var(--text-primary)" }}
        >
          {product.name}
        </p>
        <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>
          {product.storeName}
        </p>
        <p className="mt-auto text-sm font-bold" style={{ color: "var(--scarlet)" }}>
          TTD {product.price.toFixed(2)}
        </p>
        {product.hasVariants ? (
          <ProductCardChooseOptionsLink slug={product.slug} />
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            disabled={loading}
            className="mt-1 w-full rounded-lg py-1.5 text-xs font-semibold text-white transition-all disabled:opacity-60"
            style={{
              backgroundColor: added ? "#15803D" : "var(--scarlet)",
            }}
          >
            {loading ? "…" : added ? "✓ Added" : "Add to Cart"}
          </button>
        )}
        {error ? <p className="text-center text-[10px] text-red-600">{error}</p> : null}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="mb-4 flex items-end gap-2">
      <div
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm"
        style={{ backgroundColor: "var(--scarlet)", color: "white" }}
      >
        🛍
      </div>
      <div
        className="rounded-2xl rounded-bl-sm bg-white px-4 py-3"
        style={{ border: "1px solid var(--card-border)" }}
      >
        <div className="flex h-4 items-center gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 animate-bounce rounded-full"
              style={{
                backgroundColor: "var(--text-faint)",
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

type ShoppingChatProps = {
  initialChatList?: { id: string; title: string; createdAt: Date | string }[]
  isLoggedIn?: boolean
}

export default function ShoppingChat({
  initialChatList = [],
  isLoggedIn = false,
}: ShoppingChatProps) {
  const [chatId, setChatId] = useState<string | null>(null)
  const [chatList, setChatList] = useState(initialChatList)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    setChatList(initialChatList)
  }, [initialChatList])

  const setItems = useCartStore((s) => s.setItems)

  const { messages, isLoading, sendMessage, setMessages } = usePersistedChat(
    isLoggedIn,
    chatId,
    setChatId,
    setChatList,
    setItems
  )

  const [input, setInput] = useState("")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  async function openChat(id: string) {
    const rows = await getVendorChatMessages(id)
    setChatId(id)
    const mapped: ChatMessage[] = []
    for (const row of rows) {
      if (row.role === "user") {
        mapped.push({ id: crypto.randomUUID(), role: "user", content: row.content })
      } else {
        mapped.push({
          id: crypto.randomUUID(),
          role: "assistant",
          content: row.content,
          segments: parseAssistantMessage(row.content),
        })
      }
    }
    setMessages(mapped)
    setShowHistory(false)
  }

  function handleNewChat() {
    setChatId(null)
    setMessages([])
    setShowHistory(false)
  }

  function handleImageSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setImagePreview(result)
    }
    reader.readAsDataURL(file)
  }

  function handleSend() {
    const trimmed = input.trim()
    if ((!trimmed && !imagePreview) || isLoading) return

    const messageText = trimmed || "Find me products that match this image"
    void sendMessage(messageText, imagePreview ?? undefined)

    setInput("")
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="flex shrink-0 items-center gap-2 border-b px-4 py-2"
        style={{ borderColor: "var(--card-border)", backgroundColor: "var(--surface)" }}
      >
        {isLoggedIn ? (
          <>
            <button
              type="button"
              onClick={() => setShowHistory((s) => !s)}
              className="rounded-lg border px-3 py-1.5 text-sm font-medium"
              style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}
            >
              {showHistory ? "Hide history" : "History"}
            </button>
            <button
              type="button"
              onClick={handleNewChat}
              className="rounded-lg border px-3 py-1.5 text-sm font-medium"
              style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}
            >
              New chat
            </button>
          </>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-1">
        {showHistory && isLoggedIn ? (
          <div
            className="w-56 max-w-[40%] shrink-0 overflow-y-auto border-r p-2 sm:w-64"
            style={{ borderColor: "var(--card-border)", backgroundColor: "white" }}
          >
            {chatList.length === 0 ? (
              <p className="px-2 text-xs" style={{ color: "var(--text-muted)" }}>
                No past conversations yet
              </p>
            ) : (
              chatList.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => void openChat(c.id)}
                  className={
                    c.id === chatId
                      ? "mb-1 w-full rounded-lg bg-amber-50 px-2 py-2 text-left text-sm transition-colors"
                      : "mb-1 w-full rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-zinc-100"
                  }
                  style={{ color: "var(--text-primary)" }}
                >
                  <div className="line-clamp-2 font-medium">{c.title}</div>
                  <div className="text-[10px] text-zinc-500">
                    {new Date(c.createdAt).toLocaleString()}
                  </div>
                </button>
              ))
            )}
          </div>
        ) : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Empty state */}
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <div>
              <div className="mb-3 text-5xl">🛍️</div>
              <h2
                className="mb-1 text-lg font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Shop with AI
              </h2>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Tell me what you&apos;re looking for and I&apos;ll find it from
                local vendors across Trinidad & Tobago
              </p>
            </div>
            <div className="flex max-w-sm flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void sendMessage(s)}
                  className="rounded-full px-4 py-2 text-sm font-medium transition-colors hover:opacity-90"
                  style={{
                    backgroundColor: "var(--scarlet)",
                    color: "white",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl">
            {messages.map((message) => (
              <div key={message.id} className="mb-4">
                {message.role === "user" ? (
                  /* User bubble — right aligned scarlet */
                  <div className="flex justify-end">
                    <div
                      className="max-w-[75%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm text-white"
                      style={{ backgroundColor: "var(--scarlet)" }}
                    >
                      {message.imagePreview ? (
                        <img
                          src={message.imagePreview}
                          alt="Uploaded"
                          className="mb-2 h-32 w-32 rounded-xl object-cover"
                        />
                      ) : null}
                      <div>{message.content}</div>
                    </div>
                  </div>
                ) : (
                  /* Assistant — left aligned with segments */
                  <div className="flex items-start gap-2">
                    <div
                      className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm"
                      style={{ backgroundColor: "var(--scarlet)", color: "white" }}
                    >
                      🛍
                    </div>
                    <div className="min-w-0 flex-1">
                      {message.segments && message.segments.length > 0 ? (
                        message.segments.map((seg, i) => {
                          if (seg.type === "text") {
                            return (
                              <div
                                key={i}
                                className="mb-2 inline-block max-w-full rounded-2xl rounded-tl-sm bg-white px-4 py-2.5 text-sm"
                                style={{
                                  border: "1px solid var(--card-border)",
                                  color: "var(--text-secondary)",
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                <ReactMarkdown components={assistantMarkdownComponents}>
                                  {linkifyText(seg.content)}
                                </ReactMarkdown>
                              </div>
                            )
                          }
                          if (seg.type === "products") {
                            return (
                              <div key={i} className="mb-2">
                                <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-2">
                                  {seg.items.map((p) => (
                                    <ProductCard key={p.id} product={p} />
                                  ))}
                                </div>
                              </div>
                            )
                          }
                          return null
                        })
                      ) : (
                        <div
                          className="inline-block max-w-full rounded-2xl rounded-tl-sm bg-white px-4 py-2.5 text-sm"
                          style={{
                            border: "1px solid var(--card-border)",
                            color: "var(--text-secondary)",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          <ReactMarkdown components={assistantMarkdownComponents}>
                            {linkifyText(message.content)}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading ? <TypingIndicator /> : null}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div
        className="bg-white px-4 py-3"
        style={{ borderTop: "1px solid var(--card-border)" }}
      >
        {/* Image preview */}
        {imagePreview ? (
          <div className="relative mx-auto mb-2 inline-block max-w-2xl">
            <img
              src={imagePreview}
              alt="Upload preview"
              className="h-20 w-20 rounded-xl object-cover"
              style={{ border: "1px solid var(--card-border)" }}
            />
            <button
              type="button"
              onClick={() => {
                setImagePreview(null)
                if (fileInputRef.current) fileInputRef.current.value = ""
              }}
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-xs text-white"
            >
              ×
            </button>
          </div>
        ) : null}

        {/* Input row */}
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />

          {/* Image upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-zinc-100 disabled:opacity-40"
            style={{ border: "1px solid var(--card-border)" }}
            title="Upload a photo to find similar products"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ color: "var(--text-muted)" }}
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={
              imagePreview
                ? "Describe what you want or send the photo..."
                : "Ask me anything — gifts, clothing, food..."
            }
            disabled={isLoading}
            className="flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors"
            style={{
              borderColor: "var(--card-border)",
              color: "var(--text-primary)",
            }}
          />

          {/* Send button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={(!input.trim() && !imagePreview) || isLoading}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "var(--scarlet)" }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
        </div>
      </div>
    </div>
  )
}
