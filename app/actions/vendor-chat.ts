"use server"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"

export async function createVendorChat(firstMessage: string): Promise<{ id: string }> {
  const session = await getSession()
  if (!session) throw new Error("Unauthorized")
  const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "")
  const chat = await prisma.vendorChat.create({
    data: { userId: session.userId, title },
    select: { id: true }
  })
  return { id: chat.id }
}

export async function saveVendorChatMessage(
  chatId: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  const session = await getSession()
  if (!session) return
  await prisma.vendorChatMessage.create({
    data: { chatId, role, content }
  })
}

export async function getVendorChats(): Promise<{ id: string; title: string; createdAt: Date }[]> {
  const session = await getSession()
  if (!session) return []
  return prisma.vendorChat.findMany({
    where: { userId: session.userId },
    select: { id: true, title: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 50
  })
}

export async function getVendorChatMessages(
  chatId: string
): Promise<{ role: string; content: string }[]> {
  const session = await getSession()
  if (!session) return []
  const chat = await prisma.vendorChat.findFirst({
    where: { id: chatId, userId: session.userId },
    include: { messages: { orderBy: { createdAt: "asc" } } }
  })
  if (!chat) return []
  return chat.messages.map(m => ({ role: m.role, content: m.content }))
}

export async function deleteVendorChat(chatId: string): Promise<void> {
  const session = await getSession()
  if (!session) return
  await prisma.vendorChat.deleteMany({
    where: { id: chatId, userId: session.userId }
  })
}
