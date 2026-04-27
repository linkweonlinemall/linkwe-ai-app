export interface ChatProduct {
  id: string
  name: string
  slug: string
  price: number
  images: string[]
  category: string | null
  stock: number | null
  storeName: string
  storeSlug: string
  storeRegion: string | null
}

export interface CartAction {
  productId: string
  productName: string
  price: number
  storeName: string
}

export type MessageSegment =
  | { type: "text"; content: string }
  | { type: "products"; items: ChatProduct[] }
  | { type: "cart_action"; action: CartAction }

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  segments?: MessageSegment[]
  isStreaming?: boolean
  imagePreview?: string
}
