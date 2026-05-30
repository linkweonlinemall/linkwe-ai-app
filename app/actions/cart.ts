"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function getCart() {
  const session = await getSession();
  if (!session) return [];

  const items = await prisma.productCartItem.findMany({
    where: { userId: session.userId },
    select: {
      id: true,
      productId: true,
      quantity: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          images: true,
          stock: true,
          isDigital: true,
          store: {
            select: { name: true, slug: true },
          },
        },
      },
      variant: {
        select: {
          id: true,
          name: true,
          attributes: true,
          price: true,
          images: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return items;
}

export async function addToCart(
  productId: string,
  quantity: number,
  variantId?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "not_logged_in" };

  if (!Number.isFinite(quantity) || quantity < 1) {
    return { ok: false, error: "invalid_quantity" };
  }

  const addQty = Math.floor(quantity);

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, stock: true, isPublished: true, hasVariants: true },
  });

  if (!product || !product.isPublished) {
    return { ok: false, error: "product_not_found" };
  }

  let effectiveStock: number | null = product.stock;
  if (product.hasVariants) {
    if (variantId == null || variantId === "") {
      return { ok: false, error: "variant_required" };
    }
    const variantRow = await prisma.productVariant.findFirst({
      where: { id: variantId, productId },
      select: { stock: true },
    });
    if (!variantRow) {
      return { ok: false, error: "variant_not_found" };
    }
    effectiveStock = variantRow.stock;
  }

  const existing = await prisma.productCartItem.findFirst({
    where: {
      userId: session.userId,
      productId,
      productVariantId: variantId ?? null,
    },
    select: { quantity: true, id: true },
  });

  const nextQty = (existing?.quantity ?? 0) + addQty;
  if (existing) {
    if (effectiveStock !== null && nextQty > effectiveStock) {
      return { ok: false, error: "out_of_stock" };
    }
  } else if (effectiveStock !== null && effectiveStock < 1) {
    return { ok: false, error: "out_of_stock" };
  }

  const createQty = effectiveStock !== null ? Math.min(addQty, effectiveStock) : addQty;

  if (existing) {
    await prisma.productCartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + addQty },
    });
  } else {
    await prisma.productCartItem.create({
      data: {
        userId: session.userId,
        productId,
        productVariantId: variantId ?? null,
        quantity: createQty,
      },
    });
  }

  revalidatePath("/cart");
  return { ok: true };
}

export async function removeFromCart(productId: string): Promise<void> {
  const session = await getSession();
  if (!session) return;

  await prisma.productCartItem.deleteMany({
    where: { userId: session.userId, productId },
  });

  revalidatePath("/cart");
}

export async function updateCartQuantity(productId: string, quantity: number): Promise<void> {
  const session = await getSession();
  if (!session) return;

  if (quantity <= 0) {
    await prisma.productCartItem.deleteMany({
      where: { userId: session.userId, productId },
    });
  } else {
    await prisma.productCartItem.updateMany({
      where: { userId: session.userId, productId },
      data: { quantity },
    });
  }

  revalidatePath("/cart");
}

export async function addEventTicketToCart(
  ticketTypeId: string,
  quantity: number,
  userId: string,
): Promise<{
  ok: boolean;
  cartItemId?: string;
  totalPrice?: number;
  error?: string;
  code?: string;
}> {
  if (!userId) return { ok: false, error: "not_logged_in", code: "not_logged_in" };
  if (!Number.isFinite(quantity) || quantity < 1) {
    return { ok: false, error: "Invalid quantity.", code: "invalid_quantity" };
  }
  const qty = Math.floor(quantity);

  const ticketType = await prisma.eventTicketType.findUnique({
    where: { id: ticketTypeId },
    select: {
      id: true,
      name: true,
      price: true,
      quantity: true,
      quantitySold: true,
      maxPerOrder: true,
      isVisible: true,
      saleStartDate: true,
      saleEnds: true,
      event: { select: { status: true, title: true } },
    },
  });

  if (!ticketType) return { ok: false, error: "Ticket type not found.", code: "ticket_type_not_found" };
  if (ticketType.event.status !== "PUBLISHED") return { ok: false, error: "This event is not available.", code: "event_not_published" };
  if (!ticketType.isVisible) return { ok: false, error: "These tickets are not on sale.", code: "not_visible" };

  const now = new Date();
  if (ticketType.saleStartDate && ticketType.saleStartDate > now) {
    return { ok: false, error: "Ticket sales have not started yet.", code: "sale_not_started" };
  }
  if (ticketType.saleEnds && ticketType.saleEnds < now) {
    return { ok: false, error: "Ticket sales have ended.", code: "sale_ended" };
  }

  const available = ticketType.quantity - ticketType.quantitySold;
  if (available < qty) {
    return {
      ok: false,
      error: available <= 0 ? "These tickets are sold out." : `Only ${available} ticket(s) remaining.`,
      code: "insufficient_tickets",
    };
  }
  if (qty > ticketType.maxPerOrder) {
    return {
      ok: false,
      error: `Maximum ${ticketType.maxPerOrder} tickets per order.`,
      code: "exceeds_max_per_order",
    };
  }

  const existing = await prisma.eventTicketCartItem.findFirst({
    where: { userId, ticketTypeId },
    select: { id: true, quantity: true },
  });

  let cartItemId: string;
  if (existing) {
    const newQty = existing.quantity + qty;
    if (newQty > ticketType.maxPerOrder) {
      return {
        ok: false,
        error: `You already have ${existing.quantity} in your cart. Maximum is ${ticketType.maxPerOrder}.`,
        code: "exceeds_max_per_order",
      };
    }
    if (newQty > available) {
      return { ok: false, error: `Only ${available} ticket(s) remaining.`, code: "insufficient_tickets" };
    }
    const updated = await prisma.eventTicketCartItem.update({
      where: { id: existing.id },
      data: { quantity: newQty },
      select: { id: true },
    });
    cartItemId = updated.id;
  } else {
    const created = await prisma.eventTicketCartItem.create({
      data: { userId, ticketTypeId, quantity: qty, unitPrice: ticketType.price },
      select: { id: true },
    });
    cartItemId = created.id;
  }

  revalidatePath("/cart");
  return {
    ok: true,
    cartItemId,
    totalPrice: ticketType.price * qty,
  };
}
