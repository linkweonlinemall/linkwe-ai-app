"use server";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const PREVIEW_MAX_LEN = 120;

export type MessageSenderRole = "CUSTOMER" | "VENDOR" | "ADMIN";

export type VendorConversationListItem = {
  id: string;
  customerName: string;
  lastMessageText: string | null;
  lastMessageAt: Date;
  unread: number;
};

export type CustomerConversationListItem = {
  id: string;
  storeName: string;
  storeLogoUrl: string | null;
  lastMessageText: string | null;
  lastMessageAt: Date;
  unread: number;
};

export type MyConversationsResult =
  | { ok: false; error: string }
  | {
      ok: true;
      side: "vendor";
      conversations: VendorConversationListItem[];
    }
  | {
      ok: true;
      side: "customer";
      conversations: CustomerConversationListItem[];
    };

export type ConversationMessageRow = {
  id: string;
  senderId: string;
  senderRole: string;
  content: string;
  createdAt: Date;
};

export type GetConversationMessagesResult =
  | { ok: false; error: string }
  | {
      ok: true;
      messages: ConversationMessageRow[];
      callerRole: MessageSenderRole;
    };

export type AdminConversationListItem = {
  id: string;
  customerName: string;
  storeName: string;
  lastMessageText: string | null;
  lastMessageAt: Date;
  customerUnread: number;
  storeUnread: number;
};

function truncatePreview(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= PREVIEW_MAX_LEN) return trimmed;
  return `${trimmed.slice(0, PREVIEW_MAX_LEN - 3)}...`;
}

async function getOwnedStoreId(userId: string): Promise<string | null> {
  const store = await prisma.store.findUnique({
    where: { ownerId: userId },
    select: { id: true },
  });
  return store?.id ?? null;
}

type ConversationWithStore = {
  id: string;
  customerId: string;
  store: { id: string; ownerId: string };
};

function resolveParticipantRole(
  session: { userId: string; role: string },
  conversation: ConversationWithStore,
): MessageSenderRole | null {
  if (session.role === "ADMIN") return "ADMIN";
  if (session.userId === conversation.customerId) return "CUSTOMER";
  if (session.userId === conversation.store.ownerId) return "VENDOR";
  return null;
}

export async function getOrCreateConversation(
  storeId: string,
): Promise<{ ok: true; conversationId: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in to message this store." };

  const trimmedStoreId = storeId?.trim();
  if (!trimmedStoreId) return { ok: false, error: "Store not found." };

  const store = await prisma.store.findUnique({
    where: { id: trimmedStoreId },
    select: { id: true, ownerId: true },
  });
  if (!store) return { ok: false, error: "Store not found." };

  if (session.userId === store.ownerId) {
    return { ok: false, error: "You cannot message your own store." };
  }

  const conversation = await prisma.conversation.upsert({
    where: {
      customerId_storeId: {
        customerId: session.userId,
        storeId: store.id,
      },
    },
    create: {
      customerId: session.userId,
      storeId: store.id,
    },
    update: {},
    select: { id: true },
  });

  return { ok: true, conversationId: conversation.id };
}

export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in to send a message." };

  const trimmedContent = content?.trim() ?? "";
  if (!trimmedContent) return { ok: false, error: "Message cannot be empty." };

  const trimmedId = conversationId?.trim();
  if (!trimmedId) return { ok: false, error: "Conversation not found." };

  const conversation = await prisma.conversation.findUnique({
    where: { id: trimmedId },
    select: {
      id: true,
      customerId: true,
      store: { select: { id: true, ownerId: true } },
    },
  });
  if (!conversation) return { ok: false, error: "Conversation not found." };

  const senderRole = resolveParticipantRole(session, conversation);
  if (!senderRole) {
    return { ok: false, error: "Not authorized" };
  }

  const preview = truncatePreview(trimmedContent);
  const now = new Date();

  const unreadUpdate =
    senderRole === "CUSTOMER"
      ? { storeUnread: { increment: 1 } }
      : senderRole === "VENDOR"
        ? { customerUnread: { increment: 1 } }
        : {
            customerUnread: { increment: 1 },
            storeUnread: { increment: 1 },
          };

  try {
    await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: session.userId,
          senderRole,
          content: trimmedContent,
        },
      }),
      prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: now,
          lastMessageText: preview,
          ...unreadUpdate,
        },
      }),
    ]);
  } catch (err) {
    console.error("[messages] sendMessage", err);
    return { ok: false, error: "Could not send message." };
  }

  return { ok: true };
}

export async function getMyConversations(): Promise<MyConversationsResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in to view messages." };

  const ownedStoreId = await getOwnedStoreId(session.userId);

  if (ownedStoreId) {
    const rows = await prisma.conversation.findMany({
      where: { storeId: ownedStoreId },
      orderBy: { lastMessageAt: "desc" },
      select: {
        id: true,
        lastMessageText: true,
        lastMessageAt: true,
        storeUnread: true,
        customer: { select: { fullName: true } },
      },
    });

    return {
      ok: true,
      side: "vendor",
      conversations: rows.map((row) => ({
        id: row.id,
        customerName: row.customer.fullName,
        lastMessageText: row.lastMessageText,
        lastMessageAt: row.lastMessageAt,
        unread: row.storeUnread,
      })),
    };
  }

  const rows = await prisma.conversation.findMany({
    where: { customerId: session.userId },
    orderBy: { lastMessageAt: "desc" },
    select: {
      id: true,
      lastMessageText: true,
      lastMessageAt: true,
      customerUnread: true,
      store: { select: { name: true, logoUrl: true } },
    },
  });

  return {
    ok: true,
    side: "customer",
    conversations: rows.map((row) => ({
      id: row.id,
      storeName: row.store.name,
      storeLogoUrl: row.store.logoUrl,
      lastMessageText: row.lastMessageText,
      lastMessageAt: row.lastMessageAt,
      unread: row.customerUnread,
    })),
  };
}

export async function getConversationMessages(
  conversationId: string,
): Promise<GetConversationMessagesResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in to view messages." };

  const trimmedId = conversationId?.trim();
  if (!trimmedId) return { ok: false, error: "Conversation not found." };

  const conversation = await prisma.conversation.findUnique({
    where: { id: trimmedId },
    select: {
      id: true,
      customerId: true,
      store: { select: { ownerId: true } },
    },
  });
  if (!conversation) return { ok: false, error: "Conversation not found." };

  const callerRole = resolveParticipantRole(session, {
    id: conversation.id,
    customerId: conversation.customerId,
    store: { id: "", ownerId: conversation.store.ownerId },
  });
  if (!callerRole) return { ok: false, error: "Not authorized" };

  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      senderId: true,
      senderRole: true,
      content: true,
      createdAt: true,
    },
  });

  if (callerRole === "CUSTOMER") {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { customerUnread: 0 },
    });
  } else if (callerRole === "VENDOR") {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { storeUnread: 0 },
    });
  }

  return { ok: true, messages, callerRole };
}

export async function getUnreadCount(): Promise<
  { count: number } | { ok: false; error: string }
> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in to view messages." };

  const ownedStoreId = await getOwnedStoreId(session.userId);

  if (ownedStoreId) {
    const agg = await prisma.conversation.aggregate({
      where: { storeId: ownedStoreId },
      _sum: { storeUnread: true },
    });
    return { count: agg._sum.storeUnread ?? 0 };
  }

  const agg = await prisma.conversation.aggregate({
    where: { customerId: session.userId },
    _sum: { customerUnread: true },
  });
  return { count: agg._sum.customerUnread ?? 0 };
}

export async function getAllConversations(): Promise<
  { ok: true; conversations: AdminConversationListItem[] } | { ok: false; error: string }
> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in required." };
  if (session.role !== "ADMIN") return { ok: false, error: "Not authorized" };

  const rows = await prisma.conversation.findMany({
    orderBy: { lastMessageAt: "desc" },
    select: {
      id: true,
      lastMessageText: true,
      lastMessageAt: true,
      customerUnread: true,
      storeUnread: true,
      customer: { select: { fullName: true } },
      store: { select: { name: true } },
    },
  });

  return {
    ok: true,
    conversations: rows.map((row) => ({
      id: row.id,
      customerName: row.customer.fullName,
      storeName: row.store.name,
      lastMessageText: row.lastMessageText,
      lastMessageAt: row.lastMessageAt,
      customerUnread: row.customerUnread,
      storeUnread: row.storeUnread,
    })),
  };
}

export async function adminSendMessage(
  conversationId: string,
  content: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in required." };
  if (session.role !== "ADMIN") return { ok: false, error: "Not authorized" };

  const trimmedContent = content?.trim() ?? "";
  if (!trimmedContent) return { ok: false, error: "Message cannot be empty." };

  const trimmedId = conversationId?.trim();
  if (!trimmedId) return { ok: false, error: "Conversation not found." };

  const conversation = await prisma.conversation.findUnique({
    where: { id: trimmedId },
    select: { id: true },
  });
  if (!conversation) return { ok: false, error: "Conversation not found." };

  const preview = truncatePreview(trimmedContent);
  const now = new Date();

  try {
    await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: session.userId,
          senderRole: "ADMIN",
          content: trimmedContent,
        },
      }),
      prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: now,
          lastMessageText: preview,
          customerUnread: { increment: 1 },
          storeUnread: { increment: 1 },
        },
      }),
    ]);
  } catch (err) {
    console.error("[messages] adminSendMessage", err);
    return { ok: false, error: "Could not send message." };
  }

  return { ok: true };
}
