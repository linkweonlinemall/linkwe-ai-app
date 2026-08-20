import { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import type { Prisma } from "@prisma/client"
import {
  getVendorProductDetails,
  searchVendorProducts,
  updateProductFromAI,
} from "@/app/actions/ai-vendor-update"
import {
  addProductImagesFromUrls,
  removeProductImageAtIndex,
  replaceProductImageAtIndex,
  reorderProductGalleryValidated,
  setProductCoverImage,
} from "@/app/actions/ai-vendor-image"
import { isTrustedHostedImageUrl } from "@/lib/images/trusted-host"
import { createProductFromAIRaw } from "@/app/actions/ai-vendor"
import { checkProductCap } from "@/lib/finance/product-cap"
import { consumeAIUse, recordAITokens } from "@/lib/finance/ai-usage"
import { getStorePlan } from "@/lib/finance/store-plan"
import {
  getVendorInventoryAlerts,
  getVendorRecentOrders,
  getVendorSalesInsights,
  getVendorStoreSummary,
  updateVendorStoreFields,
} from "@/app/actions/ai-vendor-store"
import {
  createEvent as createEventAction,
  updateEvent as updateEventAction,
  createTicketType as createTicketTypeAction,
  publishEvent as publishEventAction,
  getVendorEvents,
} from "@/app/actions/events"
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
      hasVariants: { type: "boolean" },
      isDigital: { type: "boolean" },
      variants: {
        type: "array",
        description: "Array of variant objects for variable products",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            price: { type: "number" },
            stock: { type: "number" },
            sku: { type: "string" },
            attributes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  value: { type: "string" },
                  hex: { type: "string" },
                },
              },
            },
          },
        },
      },
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

const ATTACH_PRODUCT_IMAGES_TOOL: Anthropic.Tool = {
  name: "attach_product_images",
  description:
    "Append uploaded image URLs to a product listing gallery. Use exact URLs from this turn's upload list in the system prompt. Max 10 photos per product total.",
  input_schema: {
    type: "object",
    properties: {
      product_id: { type: "string" },
      image_urls: {
        type: "array",
        items: { type: "string" },
        description: "Full https URLs from the vendor's latest upload",
      },
    },
    required: ["product_id", "image_urls"],
  },
}

const REORDER_GALLERY_TOOL: Anthropic.Tool = {
  name: "reorder_product_gallery",
  description:
    "Set a new order for all product photos. image_urls must include every current photo URL exactly once (full reorder).",
  input_schema: {
    type: "object",
    properties: {
      product_id: { type: "string" },
      image_urls: {
        type: "array",
        items: { type: "string" },
        description: "Complete gallery in the desired order (first = featured image)",
      },
    },
    required: ["product_id", "image_urls"],
  },
}

const REMOVE_IMAGE_TOOL: Anthropic.Tool = {
  name: "remove_product_image",
  description:
    "Remove one photo from the gallery by 1-based position (1 = first / cover image).",
  input_schema: {
    type: "object",
    properties: {
      product_id: { type: "string" },
      image_index: {
        type: "number",
        description: "1-based index: 1 is the first photo",
      },
    },
    required: ["product_id", "image_index"],
  },
}

const SET_COVER_TOOL: Anthropic.Tool = {
  name: "set_product_cover_image",
  description:
    "Make an existing gallery image the cover/featured image by moving it to the first position.",
  input_schema: {
    type: "object",
    properties: {
      product_id: { type: "string" },
      image_url: {
        type: "string",
        description: "Must match one of the URLs in product.images exactly",
      },
    },
    required: ["product_id", "image_url"],
  },
}

const REPLACE_IMAGE_TOOL: Anthropic.Tool = {
  name: "replace_product_image",
  description:
    "Replace an existing gallery slot with a newly uploaded URL (e.g. vendor said 'replace the first photo' after uploading).",
  input_schema: {
    type: "object",
    properties: {
      product_id: { type: "string" },
      image_index: {
        type: "number",
        description: "1-based slot to replace",
      },
      new_image_url: {
        type: "string",
        description: "Https URL from the vendor's uploaded images this turn",
      },
    },
    required: ["product_id", "image_index", "new_image_url"],
  },
}

const CREATE_SERVICE_TOOL: Anthropic.Tool = {
  name: "create_service",
  description:
    "Creates a service listing as a draft or published. Call this when you have collected enough information from the vendor about their service.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string" },
      description: { type: "string" },
      shortDescription: { type: "string" },
      category: { type: "string" },
      serviceType: {
        type: "string",
        enum: ["BOOKABLE", "QUOTE", "SUBSCRIPTION", "ON_DEMAND", "VIRTUAL"],
      },
      serviceLocation: {
        type: "string",
        enum: ["AT_VENDOR", "AT_CUSTOMER", "VIRTUAL", "FLEXIBLE"],
      },
      price: { type: "number" },
      serviceDuration: { type: "number" },
      requiresDeposit: { type: "boolean" },
      depositAmount: { type: "number" },
      tags: { type: "array", items: { type: "string" } },
      isPublished: { type: "boolean" },
      metaTitle: { type: "string" },
      metaDescription: { type: "string" },
    },
    required: ["name", "price", "serviceType"],
  },
}

const GET_STORE_SUMMARY_TOOL: Anthropic.Tool = {
  name: "get_store_summary",
  description:
    "Get the vendor's full store profile including name, description, category, region, tags, opening hours, social links, product counts, and verification status. Use this when the vendor asks about their store, wants a summary, or asks Rex to review their profile.",
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
}

const GET_SALES_INSIGHTS_TOOL: Anthropic.Tool = {
  name: "get_sales_insights",
  description:
    "Get sales data for the last 30 days including total revenue, order count, and top performing products by revenue. Use when the vendor asks about sales, revenue, performance, or how their products are doing.",
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
}

const GET_INVENTORY_ALERTS_TOOL: Anthropic.Tool = {
  name: "get_inventory_alerts",
  description:
    "Get inventory alerts including low stock products (5 or fewer units), out of stock products, and unpublished draft listings. Use when the vendor asks about stock levels, inventory, or what needs attention.",
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
}

const GET_RECENT_ORDERS_TOOL: Anthropic.Tool = {
  name: "get_recent_orders",
  description:
    "Get the vendor's 20 most recent orders with product name, quantity, price, status, and customer name. Use when the vendor asks about recent orders, sales activity, or customer purchases.",
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
}

const UPDATE_STORE_TOOL: Anthropic.Tool = {
  name: "update_store",
  description:
    "Update the vendor's store profile fields directly. Use this when the vendor asks to change their store name, tagline, description, tags, amenities, policies, address, opening hours, or social links. Always call this tool to make the change — never just describe what should be changed or ask the vendor to do it manually.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Store name" },
      tagline: { type: "string", description: "Short tagline" },
      description: { type: "string", description: "Full store description" },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Search tags",
      },
      amenities: {
        type: "array",
        items: { type: "string" },
        description: "Store amenities",
      },
      policies: { type: "string", description: "Store policies text" },
      address: { type: "string", description: "Physical address" },
      openingHours: {
        type: "object",
        description:
          'Weekly opening hours keyed by lowercase day names (monday through sunday). Each day MUST be { closed: boolean, allDay: boolean, slots: Array<{ from: "HH:MM", to: "HH:MM" }> }. slots must always be an array — use [] when closed or allDay. Example: { monday: { closed: false, allDay: false, slots: [{ from: "09:00", to: "17:00" }] }, sunday: { closed: true, allDay: false, slots: [] } }',
      },
      socialLinks: { type: "object", description: "Social links as JSON" },
      logoUrl: { type: "string", description: "Logo image URL" },
      coverPhotoUrl: { type: "string", description: "Cover photo URL" },
    },
    required: [],
  },
}

const PUBLISH_PRODUCT_TOOL: Anthropic.Tool = {
  name: "publish_product",
  description:
    "Publish a product so it appears live on the store. Use when the vendor asks to publish, go live, or activate a product. Requires a product ID — search for it first if you don't have it.",
  input_schema: {
    type: "object",
    properties: {
      product_id: {
        type: "string",
        description: "The product ID to publish",
      },
    },
    required: ["product_id"],
  },
}

const UNPUBLISH_PRODUCT_TOOL: Anthropic.Tool = {
  name: "unpublish_product",
  description:
    "Unpublish a product so it is hidden from the store. Use when the vendor asks to hide, deactivate, take down, or unpublish a product.",
  input_schema: {
    type: "object",
    properties: {
      product_id: {
        type: "string",
        description: "The product ID to unpublish",
      },
    },
    required: ["product_id"],
  },
}

const DELETE_PRODUCT_TOOL: Anthropic.Tool = {
  name: "delete_product",
  description:
    'Permanently delete a product. The server permits this only when the vendor\'s latest message is exactly "DELETE PRODUCT: <exact product name>". First identify the product, explain that deletion cannot be undone, and ask the vendor to send that exact phrase. Never call this tool before receiving it.',
  input_schema: {
    type: "object",
    properties: {
      product_id: {
        type: "string",
        description: "The product ID to delete",
      },
    },
    required: ["product_id"],
  },
}

const GET_BOOKINGS_SUMMARY_TOOL: Anthropic.Tool = {
  name: "get_bookings_summary",
  description:
    "Get a summary of the vendor's bookings including pending, confirmed, completed, and cancelled counts plus recent bookings. Use when the vendor asks about bookings, appointments, or schedule.",
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
}

const GET_VENDOR_EVENTS_TOOL: Anthropic.Tool = {
  name: "get_vendor_events",
  description:
    "Returns all events for the vendor's store with ticket counts and revenue. Use when the vendor asks about their events, fetes, concerts, or any event they are hosting.",
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
}

const GET_EVENT_DETAILS_TOOL: Anthropic.Tool = {
  name: "get_event_details",
  description:
    "Returns full details of a specific event including all fields, ticket types, and ticket counts. Use when you need to inspect a specific event before editing or publishing.",
  input_schema: {
    type: "object",
    properties: {
      eventId: { type: "string", description: "The event ID" },
    },
    required: ["eventId"],
  },
}

const CREATE_EVENT_TOOL: Anthropic.Tool = {
  name: "create_event",
  description:
    "Creates a new event draft for the vendor's store. Use when the vendor asks to create an event, fete, party, concert, or any ticketed event.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Event title (required)" },
      category: { type: "string", description: "Event category value e.g. all_inclusive_fete, soca_carnival, food_fair" },
      startDate: { type: "string", description: "Start date as YYYY-MM-DD (required)" },
      startTime: { type: "string", description: "Start time as HH:MM e.g. 20:00 (required)" },
      venueName: { type: "string" },
      address: { type: "string" },
      region: { type: "string", description: "T&T region e.g. port_of_spain, san_fernando" },
      description: { type: "string" },
      isOnline: { type: "boolean" },
      capacity: { type: "number" },
      dressCode: { type: "string" },
      ageRestriction: { type: "string", description: "e.g. 18+ or All ages" },
      refundPolicyType: { type: "string", enum: ["FULL", "PARTIAL", "NONE"] },
    },
    required: ["title", "category", "startDate", "startTime"],
  },
}

const UPDATE_EVENT_TOOL: Anthropic.Tool = {
  name: "update_event",
  description:
    "Updates fields on an existing event. Only pass fields that should change. Use after get_event_details to see current values.",
  input_schema: {
    type: "object",
    properties: {
      eventId: { type: "string", description: "The event ID to update" },
      title: { type: "string" },
      category: { type: "string" },
      startDate: { type: "string", description: "YYYY-MM-DD" },
      startTime: { type: "string", description: "HH:MM" },
      endDate: { type: "string", description: "YYYY-MM-DD" },
      endTime: { type: "string", description: "HH:MM" },
      description: { type: "string" },
      venueName: { type: "string" },
      address: { type: "string" },
      region: { type: "string" },
      isOnline: { type: "boolean" },
      capacity: { type: "number" },
      dressCode: { type: "string" },
      ageRestriction: { type: "string" },
      refundPolicyType: { type: "string", enum: ["FULL", "PARTIAL", "NONE"] },
      refundCutoffHours: { type: "number" },
    },
    required: ["eventId"],
  },
}

const CREATE_TICKET_TYPE_TOOL: Anthropic.Tool = {
  name: "create_ticket_type",
  description:
    "Adds a ticket type to an event. Always call this after creating an event. Use for General Admission, VIP, Early Bird, Table tickets, etc.",
  input_schema: {
    type: "object",
    properties: {
      eventId: { type: "string", description: "The event ID" },
      name: { type: "string", description: "Ticket tier name e.g. General Admission, VIP, Early Bird" },
      price: { type: "number", description: "Price in TTD — use 0 for free events" },
      quantity: { type: "number", description: "Total tickets available" },
      description: { type: "string" },
      perks: { type: "string", description: "What is included e.g. Open bar, VIP lounge access" },
      maxPerOrder: { type: "number", description: "Max tickets per order — default 10" },
      saleStartDate: { type: "string", description: "ISO date string" },
      saleEnds: { type: "string", description: "ISO date string" },
    },
    required: ["eventId", "name", "price", "quantity"],
  },
}

const UPLOAD_EVENT_COVER_TOOL: Anthropic.Tool = {
  name: "upload_event_cover_image",
  description:
    "Sets the cover image for an event from an already-uploaded URL. Use when the vendor has uploaded an image and wants it set as the event cover.",
  input_schema: {
    type: "object",
    properties: {
      eventId: { type: "string", description: "The event ID" },
      imageUrl: { type: "string", description: "https:// URL of the uploaded image" },
    },
    required: ["eventId", "imageUrl"],
  },
}

const UPLOAD_EVENT_GALLERY_TOOL: Anthropic.Tool = {
  name: "upload_event_gallery_image",
  description:
    "Appends an image to an event's gallery (max 6 images). Use when the vendor uploads additional photos for their event.",
  input_schema: {
    type: "object",
    properties: {
      eventId: { type: "string", description: "The event ID" },
      imageUrl: { type: "string", description: "https:// URL of the uploaded image" },
    },
    required: ["eventId", "imageUrl"],
  },
}

const PUBLISH_EVENT_TOOL: Anthropic.Tool = {
  name: "publish_event",
  description:
    "Publishes an event so it is visible to the public. Always confirm with the vendor before calling this. Validates that title, startDate, coverImage, and at least one visible ticket type exist.",
  input_schema: {
    type: "object",
    properties: {
      eventId: { type: "string", description: "The event ID to publish" },
    },
    required: ["eventId"],
  },
}

const VENDOR_TOOLS: Anthropic.Tool[] = [
  CREATE_PRODUCT_TOOL,
  CREATE_SERVICE_TOOL,
  SEARCH_PRODUCTS_TOOL,
  GET_PRODUCT_TOOL,
  UPDATE_PRODUCT_TOOL,
  ATTACH_PRODUCT_IMAGES_TOOL,
  REORDER_GALLERY_TOOL,
  REMOVE_IMAGE_TOOL,
  SET_COVER_TOOL,
  REPLACE_IMAGE_TOOL,
  GET_STORE_SUMMARY_TOOL,
  GET_SALES_INSIGHTS_TOOL,
  GET_INVENTORY_ALERTS_TOOL,
  GET_RECENT_ORDERS_TOOL,
  UPDATE_STORE_TOOL,
  PUBLISH_PRODUCT_TOOL,
  UNPUBLISH_PRODUCT_TOOL,
  DELETE_PRODUCT_TOOL,
  GET_BOOKINGS_SUMMARY_TOOL,
  GET_VENDOR_EVENTS_TOOL,
  GET_EVENT_DETAILS_TOOL,
  CREATE_EVENT_TOOL,
  UPDATE_EVENT_TOOL,
  CREATE_TICKET_TYPE_TOOL,
  PUBLISH_EVENT_TOOL,
  UPLOAD_EVENT_COVER_TOOL,
  UPLOAD_EVENT_GALLERY_TOOL,
]

/** Body messages: string or Anthropic user content (text + image blocks). */
type IncomingMessage = {
  role: string
  content: string | unknown[]
}

const MAX_TOOL_ROUNDS = 12
const MAX_INCOMING_MESSAGES = 50
const MAX_TEXT_CHARS_PER_MESSAGE = 20_000
const MAX_REQUEST_BYTES = 25_000_000

function normalizeIncomingContent(
  content: string | unknown[],
): Anthropic.MessageParam["content"] | null {
  if (typeof content === "string") {
    return content.length <= MAX_TEXT_CHARS_PER_MESSAGE ? content : null
  }
  if (!Array.isArray(content) || content.length === 0) return null

  const normalized: Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam> = []
  for (const block of content) {
    if (!block || typeof block !== "object") return null
    const candidate = block as Record<string, unknown>
    if (candidate.type === "text" && typeof candidate.text === "string") {
      if (candidate.text.length > MAX_TEXT_CHARS_PER_MESSAGE) return null
      normalized.push({ type: "text", text: candidate.text })
      continue
    }

    const source = candidate.source as Record<string, unknown> | undefined
    const mediaType = source?.media_type
    if (
      candidate.type === "image" &&
      source?.type === "base64" &&
      typeof source.data === "string" &&
      source.data.length <= 10_000_000 &&
      (mediaType === "image/jpeg" ||
        mediaType === "image/png" ||
        mediaType === "image/gif" ||
        mediaType === "image/webp")
    ) {
      normalized.push({
        type: "image",
        source: { type: "base64", media_type: mediaType, data: source.data },
      })
      continue
    }

    // Tool and system-shaped blocks are created only inside this server route.
    return null
  }

  return normalized
}

function incomingContentText(content: Anthropic.MessageParam["content"]): string {
  if (typeof content === "string") return content
  return content
    .filter((block): block is Anthropic.TextBlockParam => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim()
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") {
    return new Response("Unauthorized", { status: 401 })
  }

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: {
      id: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      planRenewsAt: true,
      aiTopupCreditsRemaining: true,
    },
  })
  if (!store) {
    return new Response("No store found", { status: 400 })
  }

  const planAllowance = getStorePlan({
    subscriptionPlan: store.subscriptionPlan,
    subscriptionStatus: store.subscriptionStatus,
  }).limits.aiMonthlyAllowance
  const aiEnabled =
    planAllowance > 0 || store.aiTopupCreditsRemaining > 0
  if (!aiEnabled) {
    return new Response(
      JSON.stringify({
        error:
          "AI assistant is not included on your current plan. Upgrade to Growth or Pro to use Rex.",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    )
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0)
  if (contentLength > MAX_REQUEST_BYTES) {
    return new Response("Request too large", { status: 413 })
  }

  const body = (await req.json()) as {
    messages?: IncomingMessage[]
    focusProductId?: string | null
    focusEventId?: string | null
    uploadedImageUrls?: string[]
  }
  const rawMessages: IncomingMessage[] = body.messages ?? []
  if (
    rawMessages.length === 0 ||
    rawMessages.length > MAX_INCOMING_MESSAGES ||
    rawMessages.some(
      (message) => message.role !== "user" && message.role !== "assistant",
    )
  ) {
    return new Response("Invalid conversation", { status: 400 })
  }

  const normalizedMessages = rawMessages.map((message) => ({
    role: message.role as "user" | "assistant",
    content: normalizeIncomingContent(message.content),
  }))
  if (normalizedMessages.some((message) => message.content == null)) {
    return new Response("Invalid conversation content", { status: 400 })
  }
  const messages = normalizedMessages as Array<{
    role: "user" | "assistant"
    content: Anthropic.MessageParam["content"]
  }>

  const last = messages.at(-1)
  if (last?.role !== "user") {
    return new Response("Conversation must end with a user message", {
      status: 400,
    })
  }
  const usage = await consumeAIUse(store)
  if (!usage.ok) {
    return new Response(JSON.stringify({ error: usage.reason }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    })
  }
  const aiRemainingToSend = usage.remaining
  const lastUserText = incomingContentText(last.content!)

  const focusProductIdFromBody =
    typeof body.focusProductId === "string"
      ? body.focusProductId.trim()
      : null
  const focusEventIdFromBody =
    typeof body.focusEventId === "string"
      ? body.focusEventId.trim()
      : null
  const uploadedImageUrlsPayload = Array.isArray(body.uploadedImageUrls)
    ? body.uploadedImageUrls.filter(
        (u): u is string => typeof u === "string" && u.startsWith("https://")
      )
    : []

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
      }

      if (aiRemainingToSend !== undefined) {
        send(JSON.stringify({ aiRemaining: aiRemainingToSend }))
      }

      let galleryUpdateSent = false

      const handleOneTool = async (
        toolBlock: Anthropic.ToolUseBlock
      ): Promise<{
        content: string
        productId?: string
        focusProductId?: string
        focusEventId?: string
        galleryUpdate?: { productId: string; images: string[] }
        eventGalleryUpdate?: { eventId: string }
      }> => {
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
            isDigital: raw.isDigital === true,
          }

          if (!input.name.trim()) {
            return {
              content: JSON.stringify({
                ok: false,
                error: "Product name is required.",
              }),
            }
          }
          const cap = await checkProductCap(
            store.id,
            store.subscriptionPlan,
            store.subscriptionStatus,
            1,
          )
          if (!cap.ok) {
            return {
              content: JSON.stringify({
                ok: false,
                error: cap.reason,
              }),
            }
          }
          try {
            const result = await createProductFromAIRaw(
              input,
              session.userId,
              store.id
            )
            if (result.ok) {
              // If vendor uploaded images before creating the product,
              // attach them now with the initial upload images first
              if (uploadedImageUrlsPayload.length > 0) {
                await addProductImagesFromUrls(
                  result.productId,
                  uploadedImageUrlsPayload,
                  session.userId,
                  store.id
                )
              }

              // Handle variable product variants (not for digital listings)
              const hasVariants = raw.hasVariants === true
              const variantsRaw = Array.isArray(raw.variants) ? raw.variants : []

              if (hasVariants && variantsRaw.length > 0 && raw.isDigital !== true) {
                try {
                  // Update product to mark as variable
                  await prisma.product.update({
                    where: { id: result.productId },
                    data: { hasVariants: true },
                  })
                  // Create each variant
                  for (const v of variantsRaw) {
                    const vObj = v as Record<string, unknown>
                    await prisma.productVariant.create({
                      data: {
                        productId: result.productId,
                        name: String(vObj.name ?? ""),
                        sku: vObj.sku ? String(vObj.sku) : null,
                        price: vObj.price != null ? Number(vObj.price) : null,
                        stock: vObj.stock != null ? Number(vObj.stock) : null,
                        images: [],
                        attributes: (
                          Array.isArray(vObj.attributes)
                            ? vObj.attributes
                            : []
                        ) as Prisma.InputJsonValue,
                      },
                    })
                  }
                } catch (err) {
                  console.error("Failed to create variants:", err)
                }
              }

              return {
                content: JSON.stringify(result),
                productId: result.productId,
                focusProductId: result.productId,
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

        if (toolBlock.name === "create_service") {
          const raw = toolBlock.input as Record<string, unknown>

          const name = String(raw.name ?? "").trim()
          if (!name) {
            return {
              content: JSON.stringify({ ok: false, error: "Service name is required." }),
            }
          }

          const price = Number(raw.price ?? 0)
          if (!price) {
            return {
              content: JSON.stringify({ ok: false, error: "Price is required." }),
            }
          }

          // Generate slug
          let slug = name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")

          const existing = await prisma.product.findUnique({ where: { slug } })
          if (existing) slug = `${slug}-${Date.now()}`

          const tags = Array.isArray(raw.tags)
            ? (raw.tags as unknown[]).map((t) => String(t))
            : []

          try {
            const service = await prisma.product.create({
              data: {
                storeId: store.id,
                name,
                slug,
                description: raw.description ? String(raw.description) : null,
                shortDescription: raw.shortDescription ? String(raw.shortDescription) : null,
                category: raw.category ? String(raw.category) : null,
                price,
                tags,
                isService: true,
                serviceType: raw.serviceType ? (raw.serviceType as any) : "BOOKABLE",
                serviceLocation: raw.serviceLocation ? (raw.serviceLocation as any) : null,
                serviceDuration: raw.serviceDuration ? Number(raw.serviceDuration) : null,
                requiresDeposit: raw.requiresDeposit === true,
                depositAmount: raw.depositAmount ? Number(raw.depositAmount) : null,
                isPublished: raw.isPublished === true,
                metaTitle: raw.metaTitle ? String(raw.metaTitle) : null,
                metaDescription: raw.metaDescription ? String(raw.metaDescription) : null,
                images: [],
              },
            })

            // Attach any uploaded images
            if (uploadedImageUrlsPayload.length > 0) {
              await prisma.product.update({
                where: { id: service.id },
                data: { images: uploadedImageUrlsPayload },
              })
            }

            return {
              content: JSON.stringify({
                ok: true,
                serviceId: service.id,
                slug: service.slug,
                message: `Service "${name}" created successfully.`,
              }),
            }
          } catch (err) {
            console.error("create_service error:", err)
            return {
              content: JSON.stringify({ ok: false, error: "Failed to create service." }),
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
          return {
            content: JSON.stringify(details),
            ...(raw.product_id && details
              ? { focusProductId: String(raw.product_id) }
              : {}),
          }
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

        if (toolBlock.name === "attach_product_images") {
          const raw = toolBlock.input as {
            product_id?: string
            image_urls?: unknown
          }
          const pid = String(raw.product_id ?? "")
          const urls = Array.isArray(raw.image_urls)
            ? raw.image_urls.filter((u): u is string => typeof u === "string")
            : []
          const result = await addProductImagesFromUrls(
            pid,
            urls,
            session.userId,
            store.id
          )
          if (result.ok) {
            if (galleryUpdateSent) {
              return {
                content: JSON.stringify(result),
                focusProductId: pid,
              }
            }
            return {
              content: JSON.stringify(result),
              focusProductId: pid,
              galleryUpdate: {
                productId: pid,
                images: result.images,
              },
            }
          }
          return { content: JSON.stringify(result) }
        }

        if (toolBlock.name === "reorder_product_gallery") {
          const raw = toolBlock.input as {
            product_id?: string
            image_urls?: unknown
          }
          const pid = String(raw.product_id ?? "")
          const urls = Array.isArray(raw.image_urls)
            ? raw.image_urls.filter((u): u is string => typeof u === "string")
            : []
          const result = await reorderProductGalleryValidated(
            pid,
            urls,
            session.userId,
            store.id
          )
          if (result.ok) {
            if (galleryUpdateSent) {
              return {
                content: JSON.stringify(result),
                focusProductId: pid,
              }
            }
            return {
              content: JSON.stringify(result),
              focusProductId: pid,
              galleryUpdate: {
                productId: pid,
                images: result.images,
              },
            }
          }
          return { content: JSON.stringify(result) }
        }

        if (toolBlock.name === "remove_product_image") {
          const raw = toolBlock.input as {
            product_id?: string
            image_index?: unknown
          }
          const pid = String(raw.product_id ?? "")
          const idx = Number(raw.image_index)
          const result = await removeProductImageAtIndex(
            pid,
            idx,
            session.userId,
            store.id
          )
          if (result.ok) {
            if (galleryUpdateSent) {
              return {
                content: JSON.stringify(result),
                focusProductId: pid,
              }
            }
            return {
              content: JSON.stringify(result),
              focusProductId: pid,
              galleryUpdate: {
                productId: pid,
                images: result.images,
              },
            }
          }
          return { content: JSON.stringify(result) }
        }

        if (toolBlock.name === "set_product_cover_image") {
          const raw = toolBlock.input as {
            product_id?: string
            image_url?: unknown
          }
          const pid = String(raw.product_id ?? "")
          const url =
            typeof raw.image_url === "string" ? raw.image_url.trim() : ""
          const result = await setProductCoverImage(
            pid,
            url,
            session.userId,
            store.id
          )
          if (result.ok) {
            if (galleryUpdateSent) {
              return {
                content: JSON.stringify(result),
                focusProductId: pid,
              }
            }
            return {
              content: JSON.stringify(result),
              focusProductId: pid,
              galleryUpdate: {
                productId: pid,
                images: result.images,
              },
            }
          }
          return { content: JSON.stringify(result) }
        }

        if (toolBlock.name === "replace_product_image") {
          const raw = toolBlock.input as {
            product_id?: string
            image_index?: unknown
            new_image_url?: unknown
          }
          const pid = String(raw.product_id ?? "")
          const idx = Number(raw.image_index)
          const newUrl =
            typeof raw.new_image_url === "string"
              ? raw.new_image_url.trim()
              : ""
          const result = await replaceProductImageAtIndex(
            pid,
            idx,
            newUrl,
            session.userId,
            store.id
          )
          if (result.ok) {
            if (galleryUpdateSent) {
              return {
                content: JSON.stringify(result),
                focusProductId: pid,
              }
            }
            return {
              content: JSON.stringify(result),
              focusProductId: pid,
              galleryUpdate: {
                productId: pid,
                images: result.images,
              },
            }
          }
          return { content: JSON.stringify(result) }
        }

        if (toolBlock.name === "get_store_summary") {
          const data = await getVendorStoreSummary()
          return {
            content: data
              ? JSON.stringify(data)
              : JSON.stringify({ error: "No store found" }),
          }
        }

        if (toolBlock.name === "get_sales_insights") {
          const data = await getVendorSalesInsights()
          return {
            content: data
              ? JSON.stringify(data)
              : JSON.stringify({ error: "No data available" }),
          }
        }

        if (toolBlock.name === "get_inventory_alerts") {
          const data = await getVendorInventoryAlerts()
          return {
            content: data
              ? JSON.stringify(data)
              : JSON.stringify({ error: "No data available" }),
          }
        }

        if (toolBlock.name === "get_recent_orders") {
          const data = await getVendorRecentOrders()
          return {
            content: data
              ? JSON.stringify(data)
              : JSON.stringify({ error: "No orders found" }),
          }
        }

        if (toolBlock.name === "update_store") {
          const input = toolBlock.input as {
            name?: string
            tagline?: string
            description?: string
            tags?: string[]
            amenities?: string[]
            policies?: string
            address?: string
            openingHours?: Record<string, unknown>
            socialLinks?: Record<string, unknown>
            logoUrl?: string
            coverPhotoUrl?: string
          }
          const result = await updateVendorStoreFields(input)
          return {
            content: result.ok
              ? JSON.stringify({ ok: true, message: "Store updated successfully" })
              : JSON.stringify({ ok: false, error: result.error }),
          }
        }

        if (toolBlock.name === "publish_product") {
          const input = toolBlock.input as { product_id?: string }
          const productId = String(input.product_id ?? "")
          if (!productId) {
            return {
              content: JSON.stringify({
                ok: false,
                error: "product_id is required",
              }),
            }
          }
          const product = await prisma.product.findFirst({
            where: { id: productId, storeId: store.id },
            select: { id: true },
          })
          if (!product) {
            return {
              content: JSON.stringify({ ok: false, error: "Product not found" }),
            }
          }
          await prisma.product.update({
            where: { id: productId },
            data: { isPublished: true },
          })
          return {
            content: JSON.stringify({
              ok: true,
              message: "Product published successfully",
            }),
          }
        }

        if (toolBlock.name === "unpublish_product") {
          const input = toolBlock.input as { product_id?: string }
          const productId = String(input.product_id ?? "")
          if (!productId) {
            return {
              content: JSON.stringify({
                ok: false,
                error: "product_id is required",
              }),
            }
          }
          const product = await prisma.product.findFirst({
            where: { id: productId, storeId: store.id },
            select: { id: true },
          })
          if (!product) {
            return {
              content: JSON.stringify({ ok: false, error: "Product not found" }),
            }
          }
          await prisma.product.update({
            where: { id: productId },
            data: { isPublished: false },
          })
          return {
            content: JSON.stringify({
              ok: true,
              message: "Product unpublished successfully",
            }),
          }
        }

        if (toolBlock.name === "delete_product") {
          const input = toolBlock.input as { product_id?: string }
          const productId = String(input.product_id ?? "")
          if (!productId) {
            return {
              content: JSON.stringify({
                ok: false,
                error: "product_id is required",
              }),
            }
          }
          const product = await prisma.product.findFirst({
            where: { id: productId, storeId: store.id },
            select: { id: true, name: true },
          })
          if (!product) {
            return {
              content: JSON.stringify({ ok: false, error: "Product not found" }),
            }
          }
          const requiredConfirmation = `DELETE PRODUCT: ${product.name}`
          if (
            lastUserText.trim().toLocaleLowerCase() !==
            requiredConfirmation.toLocaleLowerCase()
          ) {
            return {
              content: JSON.stringify({
                ok: false,
                error: `Deletion not confirmed. Ask the vendor to send exactly: ${requiredConfirmation}`,
              }),
            }
          }
          await prisma.product.delete({ where: { id: productId } })
          return {
            content: JSON.stringify({
              ok: true,
              message: "Product deleted successfully",
            }),
          }
        }

        if (toolBlock.name === "get_bookings_summary") {
          const storeBookingWhere = { product: { storeId: store.id } }
          const [pending, confirmed, completed, cancelled] = await Promise.all([
            prisma.productBooking.count({
              where: { ...storeBookingWhere, status: "PENDING" },
            }),
            prisma.productBooking.count({
              where: { ...storeBookingWhere, status: "CONFIRMED" },
            }),
            prisma.productBooking.count({
              where: { ...storeBookingWhere, status: "COMPLETED" },
            }),
            prisma.productBooking.count({
              where: { ...storeBookingWhere, status: "CANCELLED" },
            }),
          ])

          const recentRows = await prisma.productBooking.findMany({
            where: storeBookingWhere,
            select: {
              id: true,
              customerId: true,
              status: true,
              bookingDate: true,
              totalPrice: true,
              product: { select: { name: true } },
            },
            orderBy: { bookingDate: "desc" },
            take: 10,
          })
          const customerIds = [...new Set(recentRows.map((r) => r.customerId))]
          const customers =
            customerIds.length > 0
              ? await prisma.user.findMany({
                  where: { id: { in: customerIds } },
                  select: { id: true, fullName: true },
                })
              : []
          const customerNameById = new Map(
            customers.map((u) => [u.id, u.fullName]),
          )

          const recent = recentRows.map((r) => ({
            id: r.id,
            status: r.status,
            scheduledAt: r.bookingDate,
            totalAmount: r.totalPrice,
            customer: {
              fullName: customerNameById.get(r.customerId) ?? "Unknown",
            },
            service: { name: r.product.name },
          }))

          return {
            content: JSON.stringify({
              pending,
              confirmed,
              completed,
              cancelled,
              recent,
            }),
          }
        }

        // ─── Event tools ────────────────────────────────────────────────

        if (toolBlock.name === "get_vendor_events") {
          const events = await getVendorEvents(store.id)
          const summary = events.map((e) => ({
            id: e.id,
            title: e.title,
            slug: e.slug,
            status: e.status,
            startDate: e.startDate,
            category: e.category,
            ticketTypes: e.ticketTypes.map((t) => ({
              name: t.name,
              price: t.price,
              quantity: t.quantity,
              quantitySold: t.quantitySold,
            })),
            totalTicketsSold: e._count.tickets,
            totalRevenue: e.ticketTypes.reduce(
              (s, t) => s + Number(t.price) * t.quantitySold,
              0
            ),
          }))
          return { content: JSON.stringify({ events: summary }) }
        }

        if (toolBlock.name === "get_event_details") {
          const { eventId } = toolBlock.input as { eventId: string }
          const event = await prisma.event.findFirst({
            where: { id: eventId, storeId: store.id },
            include: {
              ticketTypes: true,
              _count: { select: { tickets: true } },
            },
          })
          if (!event) {
            return { content: JSON.stringify({ error: "Event not found." }) }
          }
          return { content: JSON.stringify(event), focusEventId: eventId }
        }

        if (toolBlock.name === "create_event") {
          const input = toolBlock.input as Record<string, unknown>
          const fd = new FormData()
          for (const [k, v] of Object.entries(input)) {
            if (v !== undefined && v !== null) fd.set(k, String(v))
          }
          const result = await createEventAction(fd)
          if ("error" in result) return { content: JSON.stringify({ error: result.error }) }
          return {
            content: JSON.stringify({
              success: true,
              eventId: result.eventId,
              editUrl: `/dashboard/vendor/events/${result.eventId}/edit`,
              ticketsUrl: `/dashboard/vendor/events/${result.eventId}/tickets`,
            }),
          }
        }

        if (toolBlock.name === "update_event") {
          const input = toolBlock.input as Record<string, unknown>
          const { eventId, ...fields } = input as { eventId: string } & Record<string, unknown>
          const fd = new FormData()
          for (const [k, v] of Object.entries(fields)) {
            if (v !== undefined && v !== null) fd.set(k, String(v))
          }
          const result = await updateEventAction(eventId, fd)
          if ("error" in result) return { content: JSON.stringify({ error: result.error }) }
          return { content: JSON.stringify({ success: true }) }
        }

        if (toolBlock.name === "create_ticket_type") {
          const input = toolBlock.input as Record<string, unknown>
          const { eventId, ...fields } = input as { eventId: string } & Record<string, unknown>
          const fd = new FormData()
          for (const [k, v] of Object.entries(fields)) {
            if (v !== undefined && v !== null) fd.set(k, String(v))
          }
          const result = await createTicketTypeAction(eventId, fd)
          if ("error" in result) return { content: JSON.stringify({ error: result.error }) }
          return {
            content: JSON.stringify({
              success: true,
              ticketTypeId: result.ticketTypeId,
            }),
          }
        }

        if (toolBlock.name === "publish_event") {
          const { eventId } = toolBlock.input as { eventId: string }
          const result = await publishEventAction(eventId)
          if ("error" in result) return { content: JSON.stringify({ error: result.error }) }
          return { content: JSON.stringify({ success: true }) }
        }

        if (toolBlock.name === "upload_event_cover_image") {
          const { eventId, imageUrl } = toolBlock.input as { eventId: string; imageUrl: string }
          if (!isTrustedHostedImageUrl(imageUrl)) {
            return {
              content: JSON.stringify({
                error:
                  "imageUrl must be an uploaded Cloudinary image (res.cloudinary.com). Ask the vendor to upload the image via the paperclip icon first — do not invent or guess a URL.",
              }),
            }
          }
          const fd = new FormData()
          fd.set("coverImage", imageUrl)
          const result = await updateEventAction(eventId, fd)
          if ("error" in result) return { content: JSON.stringify({ error: result.error }) }
          return { content: JSON.stringify({ success: true, message: "Cover image updated" }) }
        }

        if (toolBlock.name === "upload_event_gallery_image") {
          const { eventId, imageUrl } = toolBlock.input as { eventId: string; imageUrl: string }
          if (!isTrustedHostedImageUrl(imageUrl)) {
            return {
              content: JSON.stringify({
                error:
                  "imageUrl must be an uploaded Cloudinary image (res.cloudinary.com). Ask the vendor to upload the image via the paperclip icon first — do not invent or guess a URL.",
              }),
            }
          }
          // Fetch current gallery images
          const event = await prisma.event.findFirst({
            where: { id: eventId, storeId: store.id },
            select: { galleryImages: true },
          })
          if (!event) return { content: JSON.stringify({ error: "Event not found." }) }
          if (event.galleryImages.length >= 6) {
            return { content: JSON.stringify({ error: "Gallery is full — maximum 6 images allowed." }) }
          }
          const updated = [...event.galleryImages, imageUrl]
          const fd = new FormData()
          fd.set("galleryImages", JSON.stringify(updated))
          const result = await updateEventAction(eventId, fd)
          if ("error" in result) return { content: JSON.stringify({ error: result.error }) }
          return {
            content: JSON.stringify({
              success: true,
              message: "Image added to gallery",
              galleryCount: updated.length,
            }),
          }
        }

        return {
          content: JSON.stringify({
            ok: false,
            error: "That action is not available.",
          }),
        }
      }

      try {
        if (!process.env.ANTHROPIC_API_KEY?.trim()) {
          console.error(
            "Vendor AI: ANTHROPIC_API_KEY is missing or empty — set it in .env.local",
          )
          send(JSON.stringify({ error: "Something went wrong" }))
          controller.close()
          return
        }

        let dynamicExtra: string | undefined
        if (uploadedImageUrlsPayload.length > 0) {
          const n = uploadedImageUrlsPayload.length
          let extra = `

────────────────────────────────────────────────────────
SYSTEM MESSAGE — CDN UPLOAD (CONFIRM THIS TO THE VENDOR)
────────────────────────────────────────────────────────
Uploaded successfully: ${n} image${n === 1 ? "" : "s"} (${n === 1 ? "this file has" : "these files have"}) been saved to your vendor store media on our CDN. The canonical URLs below are what you must reference in attach/replace/set_cover tools.
Numbered URLs (same order as the vendor selected):
`
          uploadedImageUrlsPayload.forEach((u, i) => {
            extra += `${i + 1}. ${u}\n`
          })
          extra += `
Your reply MUST begin by acknowledging how many images you received and that ${n === 1 ? "it was" : "they were"} uploaded successfully to the store (CDN URLs above), before analysing the photos, proposing listing copy, or using tools.
If SYSTEM notes further down report an issue with attaching to a product gallery, explain that clearly after giving the acknowledgement (the uploads themselves still succeeded).
`
          if (focusProductIdFromBody) {
            const attach = await addProductImagesFromUrls(
              focusProductIdFromBody,
              uploadedImageUrlsPayload,
              session.userId,
              store.id
            )
            if (attach.ok) {
              extra += `\n[System: These were also added to the gallery for product_id="${focusProductIdFromBody}". Gallery order is now:]\n`
              attach.images.forEach((u, i) => {
                extra += `  ${i + 1}. ${u}\n`
              })
              send(
                JSON.stringify({
                  galleryUpdate: {
                    productId: focusProductIdFromBody,
                    images: attach.images,
                  },
                }),
              )
              galleryUpdateSent = true
            } else {
              extra += `\n[System: The ${n} image(s) uploaded to the CDN successfully, but auto-attaching to the focused product failed: ${attach.error}. Acknowledge the uploads first, then offer to attach these URLs with attach_product_images or help the vendor pick a listing.]\n`
            }
          } else if (focusEventIdFromBody) {
            // Auto-attach images to the focused event
            const focusedEvent = await prisma.event.findFirst({
              where: { id: focusEventIdFromBody, storeId: store.id },
              select: { galleryImages: true, coverImage: true },
            })
            if (focusedEvent) {
              const [coverUrl, ...galleryUrls] = uploadedImageUrlsPayload
              const fd = new FormData()
              // Set cover if not already set
              if (!focusedEvent.coverImage && coverUrl) {
                fd.set("coverImage", coverUrl)
              }
              // Append to gallery (up to 6 total)
              const existing = focusedEvent.galleryImages ?? []
              const toAdd = (!focusedEvent.coverImage ? galleryUrls : uploadedImageUrlsPayload)
              const combined = [...existing, ...toAdd].slice(0, 6)
              if (combined.length > existing.length) {
                fd.set("galleryImages", JSON.stringify(combined))
              }
              const hasUpdates = fd.has("coverImage") || fd.has("galleryImages")
              if (hasUpdates) {
                await updateEventAction(focusEventIdFromBody, fd)
                extra += `\n[System: Images were auto-attached to event_id="${focusEventIdFromBody}".`
                if (!focusedEvent.coverImage && coverUrl) {
                  extra += ` Cover image set to URL 1.`
                }
                if (combined.length > existing.length) {
                  extra += ` Gallery now has ${combined.length} image(s).`
                }
                extra += `]\n`
                send(JSON.stringify({ eventGalleryUpdate: { eventId: focusEventIdFromBody } }))
                galleryUpdateSent = true
              }
            } else {
              extra += `\n[System: focusEventId="${focusEventIdFromBody}" was set but the event was not found. Acknowledge the uploads then ask which event to attach them to.]\n`
            }
          } else {
            extra +=
              "\nIf you know which draft product the vendor is updating, use attach_product_images with that product_id.\nIf the vendor mentions an event, use upload_event_cover_image or upload_event_gallery_image with the correct eventId.\n"
          }
          dynamicExtra = extra
        }

        const systemBlocks: Anthropic.TextBlockParam[] = [
          {
            type: "text",
            text: VENDOR_SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ]
        if (dynamicExtra) {
          systemBlocks.push({ type: "text", text: dynamicExtra })
        }

        const toolsWithCache = VENDOR_TOOLS.map((t, i) =>
          i === VENDOR_TOOLS.length - 1
            ? { ...t, cache_control: { type: "ephemeral" as const } }
            : t,
        )

        const cleanMessages: Anthropic.MessageParam[] = messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((msg) => {
            if (Array.isArray(msg.content)) {
              const filtered = msg.content.filter((block: unknown) => {
                if (
                  typeof block === "object" &&
                  block !== null &&
                  "type" in block &&
                  (block as { type: unknown }).type === "text"
                ) {
                  const text =
                    "text" in block &&
                    typeof (block as { text: unknown }).text === "string"
                      ? String((block as { text: string }).text)
                      : ""
                  if (!text.trim()) return false
                }
                return true
              })
              return { ...msg, content: filtered }
            }
            if (typeof msg.content === "string" && msg.content.trim() === "") {
              return { ...msg, content: "..." }
            }
            return msg
          })
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
        let promptTokensTotal = 0
        let completionTokensTotal = 0
        let cacheCreationTokens = 0
        let cacheReadTokens = 0

        for (;;) {
          if (toolRound++ >= MAX_TOOL_ROUNDS) {
            break
          }

          const messageStream = client.messages.stream({
            model: "claude-sonnet-4-5",
            max_tokens: 4096,
            system: systemBlocks,
            tools: toolsWithCache,
            tool_choice: { type: "auto" },
            messages: currentMessages,
          })

          // Stream each text delta immediately as it arrives
          messageStream.on("text", (delta) => send(JSON.stringify({ text: delta })))

          const final = await messageStream.finalMessage()

          if (final.usage) {
            promptTokensTotal += final.usage.input_tokens ?? 0
            completionTokensTotal += final.usage.output_tokens ?? 0
            cacheCreationTokens += final.usage.cache_creation_input_tokens ?? 0
            cacheReadTokens += final.usage.cache_read_input_tokens ?? 0
          }

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
            if (out.focusProductId) {
              send(JSON.stringify({ focusProductId: out.focusProductId }))
            }
            if (out.focusEventId) {
              send(JSON.stringify({ focusEventId: out.focusEventId }))
            }
            if (out.galleryUpdate) {
              send(JSON.stringify({ galleryUpdate: out.galleryUpdate }))
            }
            if (out.eventGalleryUpdate) {
              send(JSON.stringify({ eventGalleryUpdate: out.eventGalleryUpdate }))
            }
            userToolResults.push({
              type: "tool_result",
              tool_use_id: toolBlock.id,
              content: out.content,
            })
          }

          galleryUpdateSent = false

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

        console.log(
          `[ai-tokens] route=rex store=${store.id} model=claude-sonnet-4-5 prompt=${promptTokensTotal} completion=${completionTokensTotal} cacheWrite=${cacheCreationTokens} cacheRead=${cacheReadTokens}`,
        )
        await recordAITokens(
          store.id,
          store.planRenewsAt,
          promptTokensTotal,
          completionTokensTotal,
        ).catch(() => {})

        send("[DONE]")
        controller.close()
      } catch (error) {
        console.error("Vendor AI error:", error)
        if (error instanceof Error) {
          console.error("Vendor AI error.message:", error.message)
          console.error("Vendor AI error.stack:", error.stack)
        }
        const errObj = error as {
          status?: number
          error?: unknown
          requestID?: string
          cause?: unknown
        }
        if (typeof errObj.status === "number") {
          console.error("Vendor AI Anthropic HTTP status:", errObj.status)
        }
        if (errObj.error !== undefined) {
          try {
            console.error(
              "Vendor AI Anthropic error.body:",
              JSON.stringify(errObj.error),
            )
          } catch {
            console.error(
              "Vendor AI Anthropic error.body (non-JSON-serializable):",
              errObj.error,
            )
          }
        }
        if (errObj.requestID) {
          console.error("Vendor AI Anthropic request-id:", errObj.requestID)
        }
        if (errObj.cause !== undefined) {
          console.error("Vendor AI error.cause:", errObj.cause)
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
