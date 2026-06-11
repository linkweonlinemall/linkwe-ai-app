import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IconMessage } from "@tabler/icons-react";

import { getMyConversations } from "@/app/actions/messages";
import PublicNav from "@/components/layout/PublicNav";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { formatConversationListTime } from "@/lib/messages/format-time";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Messages",
  description: "Your conversations with stores on LinkWe.",
};

function truncateSnippet(text: string | null, max = 80): string {
  if (!text) return "No messages yet";
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 3)}...`;
}

export default async function MessagesInboxPage() {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=%2Fmessages");

  const userRecord = await prisma.user.findUnique({ where: { id: session.userId } });
  const continueHref = userRecord ? getRoleDashboardPath(userRecord.role) : null;

  const result = await getMyConversations();
  if (!result.ok) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] pb-mobile-public lg:pb-0">
        <PublicNav
          user={
            userRecord
              ? { name: userRecord.fullName ?? "Account", href: continueHref! }
              : null
          }
          dashboardHref={continueHref ?? undefined}
        />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-sm text-zinc-600">{result.error}</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const conversations = result.side === "customer" ? result.conversations : [];

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-mobile-public lg:pb-0">
      <PublicNav
        user={
          userRecord
            ? { name: userRecord.fullName ?? "Account", href: continueHref! }
            : null
        }
        dashboardHref={continueHref ?? undefined}
      />

      <div className="mx-auto max-w-lg px-4 py-6 sm:py-8">
        <h1 className="text-2xl font-bold text-[#1C1C1A]">Messages</h1>
        <p className="mt-1 text-sm text-zinc-500">Conversations with stores</p>

        {conversations.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center shadow-sm">
            <IconMessage
              className="mx-auto mb-4 size-10 text-zinc-300"
              stroke={1.25}
              aria-hidden
            />
            <p className="text-sm leading-relaxed text-zinc-600">
              No messages yet — visit a store and tap Message to start a conversation.
            </p>
            <Link
              href="/stores"
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#D4450A] px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              Browse stores
            </Link>
          </div>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {conversations.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/messages/${row.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:bg-zinc-50/80"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#FEF0EB]">
                    {row.storeLogoUrl ? (
                      <Image
                        src={row.storeLogoUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[#D4450A]">
                        {row.storeName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-semibold text-[#1C1C1A]">{row.storeName}</p>
                      <span className="shrink-0 text-xs text-zinc-400">
                        {formatConversationListTime(row.lastMessageAt, now)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-zinc-500">
                      {truncateSnippet(row.lastMessageText)}
                    </p>
                  </div>
                  {row.unread > 0 ? (
                    <span className="flex h-6 min-w-[1.5rem] shrink-0 items-center justify-center rounded-full bg-[#D4450A] px-1.5 text-xs font-bold text-white">
                      {row.unread > 99 ? "99+" : row.unread}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
