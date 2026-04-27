import { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { addToCart } from "@/app/actions/cart"
import { searchProducts } from "@/app/actions/searchProducts"
import { LINKWE_SYSTEM_PROMPT } from "@/lib/chat/systemPrompt"

const client = new Anthropic()

const ADD_TO_CART_TOOL: Anthropic.Tool = {
  name: "add_to_cart",
  description:
    "Adds a product to the user's cart. Use this when the user asks to add a product to their cart.",
  input_schema: {
    type: "object",
    properties: {
      product_id: {
        type: "string",
        description: "The product id to add to the cart",
      },
      quantity: {
        type: "number",
        description: "Number of units to add (default 1)",
      },
    },
    required: ["product_id"],
  },
}

type IncomingMessage = {
  role: string
  content: string | Anthropic.MessageParam["content"]
}

function mapCartError(
  error: string | undefined
): { ok: false; error: string } {
  const safe: Record<string, string> = {
    not_logged_in: "You need to be signed in to add items to your cart.",
    invalid_quantity: "Invalid quantity for this product.",
    product_not_found: "That product could not be found.",
    out_of_stock: "This product is not available in that quantity.",
  }
  return {
    ok: false,
    error: error && error in safe ? safe[error]! : "Could not add this item to your cart.",
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { messages?: IncomingMessage[] }
  const messages: IncomingMessage[] = body.messages ?? []

  console.log("Chat API called, messages:", messages.length)
  console.log("API key present:", !!process.env.ANTHROPIC_API_KEY)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
      }

      const streamTextDeltas = async (s: AsyncIterable<Anthropic.MessageStreamEvent>) => {
        for await (const event of s) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            send(JSON.stringify({ text: event.delta.text }))
          }
        }
      }

      try {
        const lastUserMessage = [...messages]
          .reverse()
          .find((m) => m.role === "user")

        let productContext = ""
        let searchQuery = ""

        if (lastUserMessage?.content) {
          if (typeof lastUserMessage.content === "string") {
            searchQuery = lastUserMessage.content
          } else if (Array.isArray(lastUserMessage.content)) {
            const textBlock = lastUserMessage.content.find(
              (b: { type: string }) => b.type === "text"
            )
            searchQuery =
              (textBlock as { type: string; text: string } | undefined)
                ?.text ?? ""
          }
        }

        if (searchQuery) {
          try {
            const results = await searchProducts({
              query: searchQuery,
              limit: 6,
            })

            if (results.length > 0) {
              productContext = `

AVAILABLE PRODUCTS FOR THIS QUERY:
${JSON.stringify(results, null, 2)}

When showing these products to the customer, format them using the products code block as instructed.`
            }
          } catch (searchErr) {
            console.error("Search error:", searchErr)
          }
        }

        const systemWithContext = LINKWE_SYSTEM_PROMPT + productContext

        const cleanMessages = messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .filter((m) => {
            if (typeof m.content === "string") return m.content.length > 0
            if (Array.isArray(m.content)) return m.content.length > 0
            return false
          })
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content as Anthropic.MessageParam["content"],
          }))

        const response = await client.messages.create({
          model: "claude-sonnet-4-5",
          max_tokens: 1024,
          system: systemWithContext,
          tools: [ADD_TO_CART_TOOL],
          tool_choice: { type: "auto" },
          messages: cleanMessages,
        })

        if (response.stop_reason === "tool_use") {
          const toolBlock = response.content.find(
            (b) => b.type === "tool_use"
          ) as Anthropic.ToolUseBlock | undefined

          if (toolBlock && toolBlock.name === "add_to_cart") {
            const input = toolBlock.input as {
              product_id?: string
              quantity?: number
            }

            let toolResultContent: string

            if (!input?.product_id || typeof input.product_id !== "string") {
              toolResultContent = JSON.stringify({
                ok: false,
                error: "product_id is required to add a product to the cart.",
              })
            } else {
              try {
                const result = await addToCart(
                  input.product_id,
                  input.quantity != null && Number.isFinite(input.quantity)
                    ? input.quantity
                    : 1
                )
                if (result.ok) {
                  toolResultContent = JSON.stringify({ ok: true })
                } else {
                  toolResultContent = JSON.stringify(
                    mapCartError(result.error)
                  )
                }
              } catch {
                toolResultContent = JSON.stringify({
                  ok: false,
                  error: "Could not add to cart. Please try again.",
                })
              }
            }

            const followUp = client.messages.stream({
              model: "claude-sonnet-4-5",
              max_tokens: 1024,
              system: systemWithContext,
              messages: [
                ...cleanMessages,
                { role: "assistant" as const, content: response.content.filter((b) => b.type === "tool_use") },
                {
                  role: "user" as const,
                  content: [
                    {
                      type: "tool_result" as const,
                      tool_use_id: toolBlock.id,
                      content: toolResultContent,
                    },
                  ],
                },
              ],
            })

            await streamTextDeltas(followUp)
          } else if (toolBlock) {
            const unsupported = client.messages.stream({
              model: "claude-sonnet-4-5",
              max_tokens: 1024,
              system: systemWithContext,
              messages: [
                ...cleanMessages,
                { role: "assistant" as const, content: response.content },
                {
                  role: "user" as const,
                  content: [
                    {
                      type: "tool_result" as const,
                      tool_use_id: toolBlock.id,
                      content: JSON.stringify({
                        ok: false,
                        error: "That action is not available.",
                      }),
                    },
                  ],
                },
              ],
            })
            await streamTextDeltas(unsupported)
          } else {
            for (const block of response.content) {
              if (block.type === "text") {
                send(JSON.stringify({ text: block.text }))
              }
            }
          }
        } else {
          for (const block of response.content) {
            if (block.type === "text") {
              send(JSON.stringify({ text: block.text }))
            }
          }
        }

        send("[DONE]")
        controller.close()
      } catch (error) {
        console.error("Chat API error:", {
          message:
            error instanceof Error ? error.message : String(error),
          status: (error as { status?: number })?.status,
        })
        send(JSON.stringify({ error: "Something went wrong" }))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
