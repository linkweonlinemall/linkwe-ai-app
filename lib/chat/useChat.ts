"use client"

import { useState, useCallback } from "react"
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages"
import { parseAssistantMessage } from "./parseMessage"
import type { ChatMessage } from "./types"

type ValidImageMedia =
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp"

function parseDataUrlForImage(
  imageDataUrl: string
): { data: string; media_type: ValidImageMedia } {
  const [header, data] = imageDataUrl.split(",")
  const mediaType = header?.match(/:(.*?);/)?.[1] ?? "image/jpeg"
  const validTypes: ValidImageMedia[] = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ]
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
          source: {
            type: "base64",
            media_type,
            data,
          },
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

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(
    async (content: string, imageDataUrl?: string) => {
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
              source: {
                type: "base64",
                media_type,
                data,
              },
            },
            { type: "text", text: content },
          ],
        }
      } else {
        newUserApi = { role: "user", content }
      }

      const apiMessages: MessageParam[] = [
        ...messages.map((m) => chatMessageToApiParam(m)),
        newUserApi,
      ]

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
      } catch (err) {
        console.error("Chat error:", err)
      } finally {
        setIsLoading(false)
      }
    },
    [messages]
  )

  return { messages, isLoading, sendMessage }
}
