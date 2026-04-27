import { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import {
  getVendorProductDetails,
  searchVendorProducts,
  updateProductFromAI,
} from "@/app/actions/ai-vendor-update"
import { createProductFromAIRaw } from "@/app/actions/ai-vendor"
import { getSession } from "@/lib/auth/session"
import { VENDOR_SYSTEM_PROMPT } from "@/lib/chat/vendorSystemPrompt"
import { prisma } from "@/lib/prisma"

const client = new Anthropic()

const CREATE_PRODUCT_TOOL: Anthropic.Tool = {
  name: "create_product",
  description:
    "Creates a product listing as a draft. Call this when you have collected enough information from the vendor.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string" },
      price: { type: "number" },
      condition: { type: "string", enum: ["NEW", "USED", "REFURBISHED"] },
      description: { type: "string" },
      shortDescription: { type: "string" },
      category: { type: "string" },
      brand: { type: "string" },
      sku: { type: "string" },
      stock: { type: "number" },
      tags: { type: "array", items: { type: "string" } },
      allowDelivery: { type: "boolean" },
      allowPickup: { type: "boolean" },
      weight: { type: "number" },
      weightUnit: { type: "string", enum: ["KG", "LB"] },
      length: { type: "number" },
      width: { type: "number" },
      height: { type: "number" },
      address: { type: "string" },
      returnPolicy: { type: "string" },
      isFeatured: { type: "boolean" },
      metaTitle: { type: "string" },
      metaDescription: { type: "string" },
    },
    required: ["name", "price", "condition"],
  },
}

const SEARCH_PRODUCTS_TOOL: Anthropic.Tool = {
  name: "search_vendor_products",
  description:
    "Search the vendor's own products by name. Use this when the vendor wants to edit, update, or find one of their existing products.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Product name or partial name to search for",
      },
    },
    required: ["query"],
  },
}

const GET_PRODUCT_TOOL: Anthropic.Tool = {
  name: "get_product_details",
  description:
    "Get the full details of a specific product by ID. Use this after the vendor confirms which product they want to edit.",
  input_schema: {
    type: "object",
    properties: {
      product_id: {
        type: "string",
        description: "The product ID to fetch",
      },
    },
    required: ["product_id"],
  },
}

const UPDATE_PRODUCT_TOOL: Anthropic.Tool = {
  name: "update_product",
  description:
    "Update specific fields of an existing product. Only include fields that need to change.",
  input_schema: {
    type: "object",
    properties: {
      product_id: { type: "string" },
      name: { type: "string" },
      price: { type: "number" },
      compareAtPrice: { type: "number" },
      condition: { type: "string", enum: ["NEW", "USED", "REFURBISHED"] },
      description: { type: "string" },
      shortDescription: { type: "string" },
      category: { type: "string" },
      brand: { type: "string" },
      sku: { type: "string" },
      stock: { type: "number" },
      tags: { type: "array", items: { type: "string" } },
      allowDelivery: { type: "boolean" },
      allowPickup: { type: "boolean" },
      weight: { type: "number" },
      weightUnit: { type: "string", enum: ["KG", "LB"] },
      length: { type: "number" },
      width: { type: "number" },
      height: { type: "number" },
      returnPolicy: { type: "string" },
      isFeatured: { type: "boolean" },
      metaTitle: { type: "string" },
      metaDescription: { type: "string" },
      isPublished: { type: "boolean" },
    },
    required: ["product_id"],
  },
}

const VENDOR_TOOLS: Anthropic.Tool[] = [
  CREATE_PRODUCT_TOOL,
  SEARCH_PRODUCTS_TOOL,
  GET_PRODUCT_TOOL,
  UPDATE_PRODUCT_TOOL,
]

/** Body messages: string or Anthropic user content (text + image blocks). */
type IncomingMessage = {
  role: string
  content: string | unknown[]
}

const MAX_TOOL_ROUNDS = 12

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") {
    return new Response("Unauthorized", { status: 401 })
  }

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  })
  if (!store) {
    return new Response("No store found", { status: 400 })
  }

  const body = (await req.json()) as { messages?: IncomingMessage[] }
  const messages: IncomingMessage[] = body.messages ?? []

  console.log("Vendor AI called, messages:", messages.length)
  console.log("API key present:", !!process.env.ANTHROPIC_API_KEY)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
      }

      const streamTextDeltas = async (
        s: AsyncIterable<Anthropic.MessageStreamEvent>
      ) => {
        for await (const event of s) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            send(JSON.stringify({ text: event.delta.text }))
          }
        }
      }

      const handleOneTool = async (
        toolBlock: Anthropic.ToolUseBlock
      ): Promise<{ content: string; productId?: string }> => {
        if (toolBlock.name === "create_product") {
          const raw = toolBlock.input as Record<string, unknown>
          const input = {
            name: String(raw.name ?? ""),
            price: Number(raw.price),
            condition: raw.condition as "NEW" | "USED" | "REFURBISHED",
            description:
              raw.description != null ? String(raw.description) : undefined,
            category: raw.category != null ? String(raw.category) : undefined,
            tags: Array.isArray(raw.tags)
              ? raw.tags.map((t) => String(t))
              : undefined,
            stock: raw.stock != null ? Number(raw.stock) : undefined,
            allowDelivery:
              raw.allowDelivery === true || raw.allowDelivery === false
                ? Boolean(raw.allowDelivery)
                : undefined,
            allowPickup:
              raw.allowPickup === true || raw.allowPickup === false
                ? Boolean(raw.allowPickup)
                : undefined,
            brand: raw.brand != null ? String(raw.brand) : undefined,
            shortDescription:
              raw.shortDescription != null
                ? String(raw.shortDescription)
                : undefined,
            sku: raw.sku != null ? String(raw.sku) : undefined,
            weight: raw.weight != null ? Number(raw.weight) : undefined,
            weightUnit:
              raw.weightUnit === "KG" || raw.weightUnit === "LB"
                ? (raw.weightUnit as "KG" | "LB")
                : undefined,
            length: raw.length != null ? Number(raw.length) : undefined,
            width: raw.width != null ? Number(raw.width) : undefined,
            height: raw.height != null ? Number(raw.height) : undefined,
            address: raw.address != null ? String(raw.address) : undefined,
            returnPolicy:
              raw.returnPolicy != null ? String(raw.returnPolicy) : undefined,
            isFeatured: raw.isFeatured === true,
            metaTitle:
              raw.metaTitle != null ? String(raw.metaTitle) : undefined,
            metaDescription:
              raw.metaDescription != null
                ? String(raw.metaDescription)
                : undefined,
            compareAtPrice:
              raw.compareAtPrice != null ? Number(raw.compareAtPrice) : undefined,
          }
          console.log("route input address:", raw.address, "->", input.address)

          if (!input.name.trim()) {
            return {
              content: JSON.stringify({
                ok: false,
                error: "Product name is required.",
              }),
            }
          }
          console.log(
            "create_product tool input:",
            JSON.stringify(toolBlock.input, null, 2)
          )
          try {
            const result = await createProductFromAIRaw(
              input,
              session.userId,
              store.id
            )
            console.log("createProductFromAIRaw result:", JSON.stringify(result))
            if (result.ok) {
              return {
                content: JSON.stringify(result),
                productId: result.productId,
              }
            }
            return { content: JSON.stringify(result) }
          } catch (err) {
            console.error("createProductFromAIRaw threw:", err)
            return {
              content: JSON.stringify({
                ok: false,
                error: "Action threw an error",
              }),
            }
          }
        }

        if (toolBlock.name === "search_vendor_products") {
          const raw = toolBlock.input as { query?: string }
          const results = await searchVendorProducts(raw.query ?? "")
          return { content: JSON.stringify(results) }
        }

        if (toolBlock.name === "get_product_details") {
          const raw = toolBlock.input as { product_id?: string }
          const details = raw.product_id
            ? await getVendorProductDetails(raw.product_id)
            : null
          return { content: JSON.stringify(details) }
        }

        if (toolBlock.name === "update_product") {
          const raw = toolBlock.input as Record<string, unknown>
          const result = await updateProductFromAI(
            {
              productId: String(raw.product_id ?? ""),
              name: raw.name != null ? String(raw.name) : undefined,
              price: raw.price != null ? Number(raw.price) : undefined,
              compareAtPrice:
                raw.compareAtPrice != null ? Number(raw.compareAtPrice) : undefined,
              condition: raw.condition as
                | "NEW"
                | "USED"
                | "REFURBISHED"
                | undefined,
              description:
                raw.description != null ? String(raw.description) : undefined,
              shortDescription:
                raw.shortDescription != null
                  ? String(raw.shortDescription)
                  : undefined,
              category:
                raw.category != null ? String(raw.category) : undefined,
              brand: raw.brand != null ? String(raw.brand) : undefined,
              sku: raw.sku != null ? String(raw.sku) : undefined,
              stock: raw.stock != null ? Number(raw.stock) : undefined,
              tags: Array.isArray(raw.tags) ? raw.tags.map(String) : undefined,
              allowDelivery:
                raw.allowDelivery != null
                  ? Boolean(raw.allowDelivery)
                  : undefined,
              allowPickup:
                raw.allowPickup != null
                  ? Boolean(raw.allowPickup)
                  : undefined,
              weight: raw.weight != null ? Number(raw.weight) : undefined,
              weightUnit: raw.weightUnit as "KG" | "LB" | undefined,
              length: raw.length != null ? Number(raw.length) : undefined,
              width: raw.width != null ? Number(raw.width) : undefined,
              height: raw.height != null ? Number(raw.height) : undefined,
              returnPolicy:
                raw.returnPolicy != null
                  ? String(raw.returnPolicy)
                  : undefined,
              isFeatured:
                raw.isFeatured != null
                  ? Boolean(raw.isFeatured)
                  : undefined,
              metaTitle:
                raw.metaTitle != null ? String(raw.metaTitle) : undefined,
              metaDescription:
                raw.metaDescription != null
                  ? String(raw.metaDescription)
                  : undefined,
              isPublished:
                raw.isPublished != null
                  ? Boolean(raw.isPublished)
                  : undefined,
            },
            session.userId,
            store.id
          )
          return { content: JSON.stringify(result) }
        }

        return {
          content: JSON.stringify({
            ok: false,
            error: "That action is not available.",
          }),
        }
      }

      try {
        const cleanMessages: Anthropic.MessageParam[] = messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .filter((m) => {
            if (typeof m.content === "string") return m.content.length > 0
            if (Array.isArray(m.content)) return m.content.length > 0
            return false
          })
          .map((m) => {
            const content: Anthropic.MessageParam["content"] =
              Array.isArray(m.content)
                ? (m.content as Anthropic.MessageParam["content"])
                : m.content
            return { role: m.role as "user" | "assistant", content }
          })

        let currentMessages: Anthropic.MessageParam[] = cleanMessages
        let toolRound = 0

        for (;;) {
          if (toolRound++ >= MAX_TOOL_ROUNDS) {
            break
          }

          const messageStream = client.messages.stream({
            model: "claude-sonnet-4-5",
            max_tokens: 1024,
            system: VENDOR_SYSTEM_PROMPT,
            tools: VENDOR_TOOLS,
            tool_choice: { type: "auto" },
            messages: currentMessages,
          })

          await streamTextDeltas(messageStream)
          const final = await messageStream.finalMessage()

          if (final.stop_reason !== "tool_use") {
            break
          }

          const toolUseBlocks = final.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
          )
          if (toolUseBlocks.length === 0) {
            break
          }

          const userToolResults: Anthropic.ToolResultBlockParam[] = []
          for (const toolBlock of toolUseBlocks) {
            const out = await handleOneTool(toolBlock)
            if (out.productId) {
              send(JSON.stringify({ productId: out.productId }))
            }
            userToolResults.push({
              type: "tool_result",
              tool_use_id: toolBlock.id,
              content: out.content,
            })
          }

          currentMessages = [
            ...currentMessages,
            {
              role: "assistant",
              content: final.content,
            },
            {
              role: "user",
              content: userToolResults,
            },
          ]
        }

        send("[DONE]")
        controller.close()
      } catch (error) {
        console.error("Vendor AI error:", {
          message: error instanceof Error ? error.message : String(error),
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
