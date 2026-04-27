import type { MessageSegment, ChatProduct } from "./types"

export function parseAssistantMessage(content: string): MessageSegment[] {
  const segments: MessageSegment[] = []
  const productBlockRegex = /```products\n([\s\S]*?)```/g
  let lastIndex = 0
  let match

  while ((match = productBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim()
      if (text) segments.push({ type: "text", content: text })
    }

    try {
      const items: ChatProduct[] = JSON.parse(match[1] as string)
      if (items.length > 0) {
        segments.push({ type: "products", items })
      }
    } catch {
      // malformed JSON — skip block
    }

    lastIndex = match.index + match[0].length
  }

  const remaining = content.slice(lastIndex).trim()
  if (remaining) segments.push({ type: "text", content: remaining })

  return segments.length > 0
    ? segments
    : [{ type: "text", content }]
}
