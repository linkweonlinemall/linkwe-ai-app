"use server";

import { NotificationType } from "@prisma/client";

import { createNotification } from "@/lib/notifications/create";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { MESSAGE_MAX_LENGTH } from "@/lib/messages/vendor-inbox";

const PREVIEW_MAX_LEN = 120;

export type MessageSenderRole = "CUSTOMER" | "VENDOR" | "ADMIN";

export type VendorConversationListItem = {
  id: string;
  customerName: string;
  lastMessageText: string | null;
  lastMessageAt: Date;
  unread: number;
  lastSeenAt: Date | null;
  lastSenderRole: string | null;
};

export type CustomerConversationListItem = {
  id: string;
  storeName: string;
  storeLogoUrl: string | null;
  lastMessageText: string | null;
  lastMessageAt: Date;
  unread: number;
  lastSeenAt: Date | null;
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
      snapshotAt: Date;
    };

export type AdminConversationListItem = {
  id: string;
  customerName: string;
  storeName: string;
  lastMessageText: string | null;
  lastMessageAt: Date;
  customerUnread: number;
  storeUnread: number;
  customerLastSeenAt: Date | null;
  vendorLastSeenAt: Date | null;
};

export async function touchMessagePresence(): Promise<void> {
  const session = await getSession();
  if (!session) return;
  await prisma.user.update({ where: { id: session.userId }, data: { lastSeenAt: new Date() } });
}

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
): Promise<
  { ok: true; conversationId: string; created: boolean } | { ok: false; error: string }
> {
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

  const existing = await prisma.conversation.findUnique({
    where: {
      customerId_storeId: {
        customerId: session.userId,
        storeId: store.id,
      },
    },
    select: { id: true },
  });
  if (existing) {
    return { ok: true, conversationId: existing.id, created: false };
  }

  try {
    const conversation = await prisma.conversation.create({
      data: {
        customerId: session.userId,
        storeId: store.id,
      },
      select: { id: true },
    });
    return { ok: true, conversationId: conversation.id, created: true };
  } catch (err) {
    const isUniqueViolation =
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002";
    if (!isUniqueViolation) throw err;

    const raced = await prisma.conversation.findUnique({
      where: {
        customerId_storeId: {
          customerId: session.userId,
          storeId: store.id,
        },
      },
      select: { id: true },
    });
    if (!raced) throw err;
    return { ok: true, conversationId: raced.id, created: false };
  }
}

export async function getOrCreateConversationAsVendor(
  customerId: string,
  storeId: string,
): Promise<
  { ok: true; conversationId: string; created: boolean } | { ok: false; error: string }
> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in to message this customer." };

  const trimmedStoreId = storeId?.trim();
  const trimmedCustomerId = customerId?.trim();
  if (!trimmedStoreId || !trimmedCustomerId) return { ok: false, error: "Invalid parameters." };

  const store = await prisma.store.findUnique({
    where: { id: trimmedStoreId },
    select: { id: true, ownerId: true },
  });
  if (!store) return { ok: false, error: "Store not found." };

  if (store.ownerId !== session.userId) {
    return { ok: false, error: "Not authorized." };
  }

  const existing = await prisma.conversation.findUnique({
    where: {
      customerId_storeId: {
        customerId: trimmedCustomerId,
        storeId: store.id,
      },
    },
    select: { id: true },
  });
  if (existing) {
    return { ok: true, conversationId: existing.id, created: false };
  }

  try {
    const conversation = await prisma.conversation.create({
      data: {
        customerId: trimmedCustomerId,
        storeId: store.id,
      },
      select: { id: true },
    });
    return { ok: true, conversationId: conversation.id, created: true };
  } catch (err) {
    const isUniqueViolation =
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002";
    if (!isUniqueViolation) throw err;

    const raced = await prisma.conversation.findUnique({
      where: {
        customerId_storeId: {
          customerId: trimmedCustomerId,
          storeId: store.id,
        },
      },
      select: { id: true },
    });
    if (!raced) throw err;
    return { ok: true, conversationId: raced.id, created: false };
  }
}

export async function sendMessage(
  conversationId: string,
  content: string,
  clientMessageId?: string,
): Promise<{ ok: true; message: ConversationMessageRow } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in to send a message." };

  const trimmedContent = typeof content === "string" ? content.trim() : "";
  if (!trimmedContent) return { ok: false, error: "Message cannot be empty." };
  if (trimmedContent.length > MESSAGE_MAX_LENGTH) return { ok: false, error: `Keep your message within ${MESSAGE_MAX_LENGTH.toLocaleString()} characters.` };
  if (clientMessageId && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientMessageId)) {
    return { ok: false, error: "Please retry with a new message." };
  }

  const trimmedId = typeof conversationId === "string" ? conversationId.trim() : "";
  if (!trimmedId) return { ok: false, error: "Conversation not found." };

  const conversation = await prisma.conversation.findUnique({
    where: { id: trimmedId },
    select: {
      id: true,
      customerId: true,
      customer: { select: { fullName: true } },
      store: { select: { id: true, ownerId: true, name: true } },
    },
  });
  if (!conversation) return { ok: false, error: "Conversation not found." };

  const senderRole = resolveParticipantRole(session, conversation);
  if (!senderRole) {
    return { ok: false, error: "Not authorized" };
  }

  // A retry after a lost response must not create another message or notification.
  async function findRetry() {
    if (!clientMessageId) return null;
    const existing = await prisma.message.findUnique({ where: { id: clientMessageId } });
    if (!existing) return null;
    if (existing.conversationId !== conversation!.id || existing.senderId !== session!.userId || existing.content !== trimmedContent) {
      return { ok: false as const, error: "This message reference has already been used. Start a new message." };
    }
    return { ok: true as const, message: { id:existing.id, senderId:existing.senderId, senderRole:existing.senderRole, content:existing.content, createdAt:existing.createdAt } };
  }
  const retried = await findRetry();
  if (retried) return retried;

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

  let savedMessage: ConversationMessageRow;
  try {
    const [created] = await prisma.$transaction([
      prisma.message.create({
        data: {
          ...(clientMessageId ? { id: clientMessageId } : {}),
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
    savedMessage = { id:created.id, senderId:created.senderId, senderRole:created.senderRole, content:created.content, createdAt:created.createdAt };
  } catch (err) {
    if (clientMessageId && typeof err === "object" && err !== null && "code" in err && err.code === "P2002") {
      const raced = await findRetry();
      if (raced) return raced;
    }
    console.error("[messages] sendMessage", err);
    return { ok: false, error: "Could not send message." };
  }

  try {
    const customerName = conversation.customer.fullName?.trim() || "A customer";
    const storeName = conversation.store.name?.trim() || "A store";
    const vendorLink = `/dashboard/vendor/messages/${conversation.id}`;
    const customerLink = `/messages/${conversation.id}`;

    if (senderRole === "CUSTOMER") {
      await createNotification({
        userId: conversation.store.ownerId,
        type: NotificationType.MESSAGE_RECEIVED,
        title: "New message",
        body: `${customerName} sent you a message`,
        linkUrl: vendorLink,
      });
    } else if (senderRole === "VENDOR") {
      await createNotification({
        userId: conversation.customerId,
        type: NotificationType.MESSAGE_RECEIVED,
        title: "New message",
        body: `${storeName} replied to your message`,
        linkUrl: customerLink,
      });
    } else {
      await createNotification({
        userId: conversation.customerId,
        type: NotificationType.MESSAGE_RECEIVED,
        title: "New message",
        body: "LinkWe Support sent you a message",
        linkUrl: customerLink,
      });
      await createNotification({
        userId: conversation.store.ownerId,
        type: NotificationType.MESSAGE_RECEIVED,
        title: "New message",
        body: "LinkWe Support sent you a message",
        linkUrl: vendorLink,
      });
    }
  } catch {
    // Notification failures must not break message send
  }

  return { ok: true, message: savedMessage };
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
        customer: { select: { fullName: true, lastSeenAt: true } },
        messages: { take: 1, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { senderRole: true } },
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
        lastSeenAt: row.customer.lastSeenAt,
        lastSenderRole: row.messages[0]?.senderRole ?? null,
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
      store: { select: { name: true, logoUrl: true, owner: { select: { lastSeenAt: true } } } },
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
      lastSeenAt: row.store.owner.lastSeenAt,
    })),
  };
}

export async function getConversationMessages(
  conversationId: string,
  markAsRead = true,
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
      lastMessageAt: true,
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

  if (markAsRead && callerRole === "CUSTOMER") {
    await prisma.conversation.updateMany({
      where: { id: conversation.id, lastMessageAt: { lte: conversation.lastMessageAt } },
      data: { customerUnread: 0 },
    });
  } else if (markAsRead && callerRole === "VENDOR") {
    await prisma.conversation.updateMany({
      where: { id: conversation.id, lastMessageAt: { lte: conversation.lastMessageAt } },
      data: { storeUnread: 0 },
    });
  }

  return { ok: true, messages, callerRole, snapshotAt: conversation.lastMessageAt };
}

/** Called only after the vendor has actually opened the visible thread. */
export async function markVendorConversationRead(conversationId: string, snapshotAt: string) {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { ok: false as const };
  const seenAt = new Date(snapshotAt);
  if (!Number.isFinite(seenAt.getTime())) return { ok: false as const };
  const updated = await prisma.conversation.updateMany({
    where: { id: conversationId, store: { ownerId: session.userId }, lastMessageAt: { lte: seenAt } },
    data: { storeUnread: 0 },
  });
  return { ok: true as const, cleared: updated.count > 0 };
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
      customer: { select: { fullName: true, lastSeenAt: true } },
      store: { select: { name: true, owner: { select: { lastSeenAt: true } } } },
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
      customerLastSeenAt: row.customer.lastSeenAt,
      vendorLastSeenAt: row.store.owner.lastSeenAt,
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
    select: {
      id: true,
      customerId: true,
      store: { select: { ownerId: true } },
    },
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

  try {
    const vendorLink = `/dashboard/vendor/messages/${conversation.id}`;
    const customerLink = `/messages/${conversation.id}`;
    await createNotification({
      userId: conversation.customerId,
      type: NotificationType.MESSAGE_RECEIVED,
      title: "New message",
      body: "LinkWe Support sent you a message",
      linkUrl: customerLink,
    });
    await createNotification({
      userId: conversation.store.ownerId,
      type: NotificationType.MESSAGE_RECEIVED,
      title: "New message",
      body: "LinkWe Support sent you a message",
      linkUrl: vendorLink,
    });
  } catch {
    // Notification failures must not break message send
  }

  return { ok: true };
}

export async function getAdminMessageRecipients() {
  const session = await getSession();
  if (session?.role !== "ADMIN") return { ok:false as const, error:"Not authorized" };
  const [people,stores]=await Promise.all([
    prisma.user.findMany({where:{isActive:true,role:{not:"ADMIN"}},orderBy:{fullName:"asc"},select:{id:true,fullName:true,email:true,role:true}}),
    prisma.store.findMany({orderBy:{name:"asc"},select:{id:true,name:true,ownerId:true}}),
  ]);
  return {ok:true as const,people,stores};
}

export async function adminStartConversation(input:{customerId:string;storeId:string;content:string}) {
  const session=await getSession();
  if(session?.role!=="ADMIN") return {ok:false as const,error:"Not authorized"};
  const content=input.content?.trim();
  if(!content) return {ok:false as const,error:"Write the first message."};
  const [person,store]=await Promise.all([
    prisma.user.findUnique({where:{id:input.customerId},select:{id:true}}),
    prisma.store.findUnique({where:{id:input.storeId},select:{id:true,ownerId:true}}),
  ]);
  if(!person||!store) return {ok:false as const,error:"Choose a valid person and store."};
  if(person.id===store.ownerId) return {ok:false as const,error:"Choose someone other than this store's owner."};
  const conversation=await prisma.conversation.upsert({where:{customerId_storeId:{customerId:person.id,storeId:store.id}},update:{},create:{customerId:person.id,storeId:store.id},select:{id:true}});
  const sent=await adminSendMessage(conversation.id,content);
  return sent.ok ? {ok:true as const,conversationId:conversation.id} : sent;
}
