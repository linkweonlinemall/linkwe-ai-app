import { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { addToCart, addEventTicketToCart } from "@/app/actions/cart"
import { searchProducts } from "@/app/actions/searchProducts"
import type { ChatProduct } from "@/lib/chat/types"
import { LINKWE_SYSTEM_PROMPT, SEARCH_EVENTS_TOOL } from "@/lib/chat/systemPrompt"
import { prisma } from "@/lib/prisma"

const client = new Anthropic()

/** Outfit / clothing intent: run multi-part searches (tops, bottoms, shoes). */
const OUTFIT_KEYWORD_RE =
  /outfit|wear|dress|fete|wedding|church|beach|work|casual|style|clothes|shoes|shirt|pants/i

function isOutfitRelatedQuery(text: string): boolean {
  return OUTFIT_KEYWORD_RE.test(text)
}

/** Shorter / alternate queries to surface brand + partial-name matches (e.g. "Bad Dawg shirt" → "Bad Dawg"). */
function buildProductSearchQueries(raw: string): string[] {
  const q = raw.trim()
  if (!q) return []
  const parts = q.split(/\s+/).filter(Boolean)
  const ordered: string[] = []
  const add = (s: string) => {
    const t = s.trim()
    if (t.length === 0) return
    if (!ordered.includes(t)) ordered.push(t)
  }

  add(q)

  if (parts.length >= 2) {
    add(parts.slice(0, -1).join(" "))
  }
  if (parts.length >= 3) {
    add(parts.slice(0, 2).join(" "))
  }
  if (parts.length >= 2) {
    add(parts[0]!)
  }

  if (/\bshirts?\b/i.test(q)) {
    add(q.replace(/\bshirts?\b/gi, "tee").replace(/\s+/g, " ").trim())
    add(q.replace(/\bshirts?\b/gi, "t-shirt").replace(/\s+/g, " ").trim())
  }

  return ordered
}

async function searchProductsWithQueryFallbacks(
  coreQuery: string,
): Promise<ChatProduct[]> {
  const queries = buildProductSearchQueries(coreQuery)
  const byId = new Map<string, ChatProduct>()
  for (const query of queries) {
    const batch = await searchProducts({ query, limit: 8 })
    for (const p of batch) {
      if (!byId.has(p.id)) byId.set(p.id, p)
    }
  }
  return Array.from(byId.values())
}

function summarizeProductsForContext(results: ChatProduct[]): string {
  if (results.length === 0) {
    return "(no products found for this part)"
  }
  return results
    .map(
      (p) =>
        `- ${p.name} | TTD ${p.price} | Store: ${p.storeName} | ID: ${p.id} | Slug: ${p.slug} | Images: ${p.images.slice(0, 1).join("")} | Category: ${p.category ?? ""} | Stock: ${p.stock ?? "unlimited"} | Region: ${p.storeRegion}`,
    )
    .join("\n")
}

const ADD_TO_CART_TOOL: Anthropic.Tool = {
  name: "add_to_cart",
  description:
    "Adds a product to the user's cart. Use this when the user asks to add a product to their cart. For variable products with sizes or variants, if the cart action returns a variant_required error, respond to the user asking which size or variant they want, then try again with the correct variant.",
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
      variant_id: {
        type: "string",
        description:
          "When the product has variants (sizes/colours), pass the chosen ProductVariant id. Omit for simple products.",
      },
    },
    required: ["product_id"],
  },
}

const ADD_MULTIPLE_TO_CART_TOOL: Anthropic.Tool = {
  name: "add_multiple_to_cart",
  description:
    "Adds multiple products to the cart at once. Use this when the customer wants to add a full outfit or multiple items together. For variable products, include variant_id per item when required; if you get variant_required on an item, ask the customer for size/variant and retry that item with variant_id.",
  input_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            product_id: { type: "string" },
            quantity: { type: "number" },
            variant_id: {
              type: "string",
              description:
                "Required when that product has variants — the ProductVariant id for the chosen size/option.",
            },
          },
          required: ["product_id"],
        },
      },
    },
    required: ["items"],
  },
}

const ADD_EVENT_TICKETS_TO_CART_TOOL: Anthropic.Tool = {
  name: "add_event_tickets_to_cart",
  description:
    "Adds event tickets to the customer's cart. Use this when the customer asks to buy or reserve tickets for an event. Always confirm the ticket type, quantity, and total price with the customer before calling this tool.",
  input_schema: {
    type: "object",
    properties: {
      eventId: {
        type: "string",
        description: "The ID of the event",
      },
      ticketTypeId: {
        type: "string",
        description: "The ID of the EventTicketType to purchase",
      },
      quantity: {
        type: "number",
        description: "Number of tickets to add (must be at least 1)",
      },
    },
    required: ["eventId", "ticketTypeId", "quantity"],
  },
}

type IncomingMessage = {
  role: string
  content: string | Anthropic.MessageParam["content"]
}

function mapCartError(
  error: string | undefined,
): { ok: false; error: string; code?: string } {
  const safe: Record<string, string> = {
    not_logged_in: "You need to be signed in to add items to your cart.",
    invalid_quantity: "Invalid quantity for this product.",
    product_not_found: "That product could not be found.",
    out_of_stock: "This product is not available in that quantity.",
    variant_required:
      "This product has sizes or variants — ask the customer which size or variant they want, then call add_to_cart again with variant_id set to the chosen variant.",
    variant_not_found:
      "That variant does not match this product. Ask the customer to pick a valid size or variant, then retry with the correct variant_id.",
  }
  const message =
    error && error in safe
      ? safe[error]!
      : "Could not add this item to your cart."
  return {
    ok: false,
    error: message,
    ...(error ? { code: error } : {}),
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { messages?: IncomingMessage[] }
  const messages: IncomingMessage[] = body.messages ?? []

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
      }

      try {
        if (!process.env.ANTHROPIC_API_KEY?.trim()) {
          console.error(
            "Chat API: ANTHROPIC_API_KEY is missing or empty — set it in .env.local",
          )
          send(JSON.stringify({ error: "Something went wrong" }))
          controller.close()
          return
        }

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
            const base = searchQuery.trim()

            if (isOutfitRelatedQuery(base)) {
              const [topsResults, bottomsResults, shoesResults] =
                await Promise.all([
                  searchProducts({
                    query: `${base} top blouse shirt t-shirt`,
                    limit: 8,
                  }),
                  searchProducts({
                    query: `${base} pants jeans skirt shorts bottom`,
                    limit: 8,
                  }),
                  searchProducts({
                    query: `${base} shoes sneakers sandals heels footwear`,
                    limit: 8,
                  }),
                ])

              const topsBlock = summarizeProductsForContext(topsResults)
              const bottomsBlock = summarizeProductsForContext(bottomsResults)
              const shoesBlock = summarizeProductsForContext(shoesResults)

              const combinedOutfitProducts: ChatProduct[] = []
              const outfitSeen = new Set<string>()
              for (const list of [
                topsResults,
                bottomsResults,
                shoesResults,
              ]) {
                for (const p of list) {
                  if (!outfitSeen.has(p.id)) {
                    outfitSeen.add(p.id)
                    combinedOutfitProducts.push(p)
                  }
                }
              }

              if (combinedOutfitProducts.length > 0) {
                productContext = `

OUTFIT-AWARE SEARCH (tops, bottoms, shoes — use to build a complete look):

TOPS FOUND:
${topsBlock}

BOTTOMS FOUND:
${bottomsBlock}

SHOES FOUND:
${shoesBlock}

IMPORTANT: You must display these products using ONLY this exact code block. Copy it exactly as written below — do not modify it, do not rewrite it, do not describe the products in text instead:

\`\`\`products
${JSON.stringify(
                  combinedOutfitProducts.map((p) => ({
                    id: p.id,
                    name: p.name,
                    slug: p.slug,
                    price: p.price,
                    images: p.images,
                    category: p.category,
                    stock: p.stock,
                    storeName: p.storeName,
                    storeSlug: p.storeSlug,
                    storeRegion: p.storeRegion,
                  })),
                )}
\`\`\`

Start your response with one short sentence, then paste the code block above exactly as shown, then add any styling advice or commentary after.`
              }
            } else {
              const results = await searchProductsWithQueryFallbacks(base)

              if (results.length > 0) {
                const productSummary = summarizeProductsForContext(results)

                productContext = `

PRODUCTS FOUND FOR THIS QUERY:
${productSummary}

IMPORTANT: You must display these products using ONLY this exact code block. Copy it exactly as written below — do not modify it, do not rewrite it, do not describe the products in text instead:

\`\`\`products
${JSON.stringify(
                  results.map((p) => ({
                    id: p.id,
                    name: p.name,
                    slug: p.slug,
                    price: p.price,
                    images: p.images,
                    category: p.category,
                    stock: p.stock,
                    storeName: p.storeName,
                    storeSlug: p.storeSlug,
                    storeRegion: p.storeRegion,
                  })),
                )}
\`\`\`

Start your response with one short sentence, then paste the code block above exactly as shown, then add any styling advice or commentary after.`
              }
            }
          } catch (searchErr) {
            console.error("Search error:", searchErr)
          }
        }

        const systemWithContext = LINKWE_SYSTEM_PROMPT + productContext

        const cleanMessages: Anthropic.MessageParam[] = messages
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

        let currentMessages: Anthropic.MessageParam[] = [...cleanMessages]
        let continueLoop = true
        let promptTokensTotal = 0
        let completionTokensTotal = 0

        while (continueLoop) {
          const messageStream = client.messages.stream({
            model: "claude-sonnet-4-5",
            max_tokens: 4096,
            system: systemWithContext,
            tools: [ADD_TO_CART_TOOL, ADD_MULTIPLE_TO_CART_TOOL, SEARCH_EVENTS_TOOL as Anthropic.Tool, ADD_EVENT_TICKETS_TO_CART_TOOL],
            tool_choice: { type: "auto" },
            messages: currentMessages,
          })

          // Stream each text delta immediately as it arrives
          messageStream.on("text", (delta) => send(JSON.stringify({ text: delta })))

          const response = await messageStream.finalMessage()

          if (response.usage) {
            promptTokensTotal += response.usage.input_tokens ?? 0
            completionTokensTotal += response.usage.output_tokens ?? 0
          }

          if (response.stop_reason === "tool_use") {
            const toolBlocks = response.content.filter(
              (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
            )

            if (toolBlocks.length === 0) {
              continueLoop = false
              break
            }

            const toolResultBlocks: Anthropic.ToolResultBlockParam[] = []
            for (const toolBlock of toolBlocks) {
              if (toolBlock.name === "add_to_cart") {
                const input = toolBlock.input as {
                  product_id?: string
                  quantity?: number
                  variant_id?: string
                }
                let toolResultContent: string
                if (!input?.product_id || typeof input.product_id !== "string") {
                  toolResultContent = JSON.stringify({
                    ok: false,
                    error: "product_id is required",
                  })
                } else {
                  try {
                    const variantId =
                      typeof input.variant_id === "string" &&
                      input.variant_id.trim() !== ""
                        ? input.variant_id.trim()
                        : null
                    const result = await addToCart(
                      input.product_id,
                      input.quantity != null && Number.isFinite(input.quantity)
                        ? input.quantity
                        : 1,
                      variantId,
                    )
                    toolResultContent = result.ok
                      ? JSON.stringify({ ok: true })
                      : JSON.stringify(mapCartError(result.error))
                  } catch {
                    toolResultContent = JSON.stringify({
                      ok: false,
                      error: "Could not add to cart. Please try again.",
                    })
                  }
                }
                toolResultBlocks.push({
                  type: "tool_result" as const,
                  tool_use_id: toolBlock.id,
                  content: toolResultContent,
                })
              } else if (toolBlock.name === "add_multiple_to_cart") {
                const input = toolBlock.input as { items?: unknown }
                const rawItems = Array.isArray(input?.items)
                  ? input.items
                  : []
                const succeeded: {
                  product_id: string
                  quantity: number
                }[] = []
                const failed: {
                  product_id: string
                  error: string
                }[] = []

                for (const raw of rawItems) {
                  const row = raw as {
                    product_id?: unknown
                    quantity?: unknown
                    variant_id?: unknown
                  }
                  const pid =
                    typeof row.product_id === "string" ? row.product_id : ""
                  const qtyRaw = row.quantity
                  const qty =
                    qtyRaw != null &&
                    Number.isFinite(Number(qtyRaw)) &&
                    Number(qtyRaw) > 0
                      ? Math.floor(Number(qtyRaw))
                      : 1
                  const variantId =
                    typeof row.variant_id === "string" &&
                    row.variant_id.trim() !== ""
                      ? row.variant_id.trim()
                      : null

                  if (!pid) {
                    failed.push({
                      product_id: "",
                      error: "product_id is required for each item",
                    })
                    continue
                  }

                  try {
                    const result = await addToCart(pid, qty, variantId)
                    if (result.ok) {
                      succeeded.push({ product_id: pid, quantity: qty })
                    } else {
                      const mapped = mapCartError(result.error)
                      failed.push({
                        product_id: pid,
                        error: mapped.error,
                      })
                    }
                  } catch {
                    failed.push({
                      product_id: pid,
                      error: "Could not add this item to your cart.",
                    })
                  }
                }

                const toolResultContent = JSON.stringify({
                  succeeded,
                  failed,
                  partial:
                    succeeded.length > 0 &&
                    failed.length > 0,
                })
                toolResultBlocks.push({
                  type: "tool_result" as const,
                  tool_use_id: toolBlock.id,
                  content: toolResultContent,
                })
              } else if (toolBlock.name === "search_events") {
                const input = toolBlock.input as {
                  query?: string
                  category?: string
                  region?: string
                  dateFilter?: "this_week" | "this_weekend" | "this_month" | "upcoming"
                }

                const now = new Date()
                let startDateFilter: { gte?: Date; lte?: Date } = { gte: now }

                if (input.dateFilter === "this_week") {
                  const end = new Date(now)
                  end.setDate(now.getDate() + 7)
                  startDateFilter = { gte: now, lte: end }
                } else if (input.dateFilter === "this_weekend") {
                  const day = now.getDay()
                  const daysUntilSat = day === 0 ? 6 : 6 - day
                  const sat = new Date(now)
                  sat.setDate(now.getDate() + daysUntilSat)
                  sat.setHours(0, 0, 0, 0)
                  const sun = new Date(sat)
                  sun.setDate(sat.getDate() + 1)
                  sun.setHours(23, 59, 59, 999)
                  startDateFilter = { gte: sat, lte: sun }
                } else if (input.dateFilter === "this_month") {
                  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
                  startDateFilter = { gte: now, lte: end }
                }

                const q = (input.query ?? "").trim()
                const searchWhere = q.length > 0
                  ? {
                      OR: [
                        { title: { contains: q, mode: "insensitive" as const } },
                        { category: { contains: q, mode: "insensitive" as const } },
                        { venueName: { contains: q, mode: "insensitive" as const } },
                        { description: { contains: q, mode: "insensitive" as const } },
                      ],
                    }
                  : {}

                try {
                  const events = await prisma.event.findMany({
                    where: {
                      status: "PUBLISHED",
                      startDate: startDateFilter,
                      ...(input.category ? { category: { contains: input.category, mode: "insensitive" as const } } : {}),
                      ...(input.region ? { region: { contains: input.region, mode: "insensitive" as const } } : {}),
                      ...searchWhere,
                    },
                    select: {
                      id: true,
                      title: true,
                      slug: true,
                      category: true,
                      startDate: true,
                      venueName: true,
                      region: true,
                      coverImage: true,
                      ticketTypes: {
                        select: {
                          id: true,
                          name: true,
                          price: true,
                          quantity: true,
                          quantitySold: true,
                          saleStartDate: true,
                          saleEnds: true,
                          isVisible: true,
                          perks: true,
                          maxPerOrder: true,
                        },
                      },
                    },
                    orderBy: { startDate: "asc" },
                    take: 8,
                  })

                  const nowTs = new Date()
                  const results = events.map((e) => {
                    const visibleTypes = e.ticketTypes.filter((t) => t.isVisible)
                    const available = visibleTypes.some(
                      (t) =>
                        t.quantitySold < t.quantity &&
                        (t.saleEnds === null || t.saleEnds > nowTs)
                    )
                    return {
                      id: e.id,
                      title: e.title,
                      slug: e.slug,
                      category: e.category,
                      startDate: e.startDate,
                      venueName: e.venueName,
                      region: e.region,
                      coverImage: e.coverImage,
                      url: `/events/${e.slug}`,
                      available,
                      minPrice:
                        visibleTypes.length > 0
                          ? Math.min(...visibleTypes.map((t) => Number(t.price)))
                          : 0,
                      ticketTypes: visibleTypes.map((t) => ({
                        id: t.id,
                        name: t.name,
                        price: t.price,
                        quantity: t.quantity,
                        quantitySold: t.quantitySold,
                        saleStartDate: t.saleStartDate,
                        saleEnds: t.saleEnds,
                        isVisible: t.isVisible,
                        perks: t.perks,
                        maxPerOrder: t.maxPerOrder,
                        soldOut: t.quantitySold >= t.quantity,
                        remaining: t.quantity - t.quantitySold,
                      })),
                    }
                  })

                  toolResultBlocks.push({
                    type: "tool_result" as const,
                    tool_use_id: toolBlock.id,
                    content: JSON.stringify({ events: results, total: results.length }),
                  })
                } catch {
                  toolResultBlocks.push({
                    type: "tool_result" as const,
                    tool_use_id: toolBlock.id,
                    content: JSON.stringify({ events: [], total: 0, error: "Failed to search events." }),
                  })
                }
              } else if (toolBlock.name === "add_event_tickets_to_cart") {
                const input = toolBlock.input as {
                  eventId?: string
                  ticketTypeId?: string
                  quantity?: number
                }
                let toolResultContent: string

                if (!input.ticketTypeId || !input.eventId) {
                  toolResultContent = JSON.stringify({ ok: false, error: "eventId and ticketTypeId are required." })
                } else {
                  // Verify ticketType belongs to the event
                  const ticketCheck = await prisma.eventTicketType.findFirst({
                    where: { id: input.ticketTypeId, eventId: input.eventId },
                    select: { id: true, name: true, price: true },
                  })
                  if (!ticketCheck) {
                    toolResultContent = JSON.stringify({ ok: false, error: "Ticket type not found for this event.", code: "not_found" })
                  } else {
                    // Get session for userId — route has no session context, use prisma directly from cookie header
                    // We use the server action which re-reads the session internally
                    const qty = input.quantity != null && Number.isFinite(input.quantity) && input.quantity > 0
                      ? Math.floor(input.quantity)
                      : 1

                    // Import session here to get userId
                    const { getSession } = await import("@/lib/auth/session")
                    const session = await getSession()
                    if (!session) {
                      toolResultContent = JSON.stringify({ ok: false, error: "Customer must be signed in to buy tickets.", code: "not_logged_in" })
                    } else {
                      const result = await addEventTicketToCart(input.ticketTypeId, qty, session.userId)
                      if (result.ok) {
                        toolResultContent = JSON.stringify({
                          ok: true,
                          cartItemId: result.cartItemId,
                          totalPrice: result.totalPrice,
                          currency: "TTD",
                          checkoutUrl: "/checkout",
                          message: `Added ${qty} × ${ticketCheck.name} to cart. Total: TTD ${(result.totalPrice ?? 0).toFixed(2)}.`,
                        })
                      } else {
                        toolResultContent = JSON.stringify({ ok: false, error: result.error, code: result.code })
                      }
                    }
                  }
                }
                toolResultBlocks.push({
                  type: "tool_result" as const,
                  tool_use_id: toolBlock.id,
                  content: toolResultContent,
                })
              } else {
                toolResultBlocks.push({
                  type: "tool_result" as const,
                  tool_use_id: toolBlock.id,
                  content: JSON.stringify({
                    ok: false,
                    error: "That action is not available.",
                  }),
                })
              }
            }

            currentMessages = [
              ...currentMessages,
              {
                role: "assistant" as const,
                content: response.content.filter((b) => b.type === "tool_use"),
              },
              { role: "user" as const, content: toolResultBlocks },
            ]
          } else {
            continueLoop = false
            // Text already sent via delta events — do not re-send
          }
        }

        console.log(
          `[ai-tokens] route=zara model=claude-sonnet-4-5 prompt=${promptTokensTotal} completion=${completionTokensTotal}`,
        )

        send("[DONE]")
        controller.close()
      } catch (error) {
        console.error("Chat API error:", error)
        if (error instanceof Error) {
          console.error("Chat API error.message:", error.message)
          console.error("Chat API error.stack:", error.stack)
        }
        const errObj = error as {
          status?: number
          error?: unknown
          requestID?: string
          cause?: unknown
        }
        if (typeof errObj.status === "number") {
          console.error("Chat API Anthropic HTTP status:", errObj.status)
        }
        if (errObj.error !== undefined) {
          try {
            console.error(
              "Chat API Anthropic error.body:",
              JSON.stringify(errObj.error),
            )
          } catch {
            console.error(
              "Chat API Anthropic error.body (non-JSON-serializable):",
              errObj.error,
            )
          }
        }
        if (errObj.requestID) {
          console.error("Chat API Anthropic request-id:", errObj.requestID)
        }
        if (errObj.cause !== undefined) {
          console.error("Chat API error.cause:", errObj.cause)
        }

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
