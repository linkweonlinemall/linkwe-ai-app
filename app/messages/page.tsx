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

const CARD_BORDER = "border-[0.5px] border-[rgba(28,28,26,0.12)]";

function truncateSnippet(text: string | null, max = 72): string {
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
      <div className="min-h-screen bg-[#F7F5F5] pb-mobile-public lg:pb-0">
        <PublicNav
          user={
            userRecord
              ? { name: userRecord.fullName ?? "Account", href: continueHref! }
              : null
          }
          dashboardHref={continueHref ?? undefined}
        />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-[13px] text-[#7c7b77]">{result.error}</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const conversations = result.side === "customer" ? result.conversations : [];

  return (
    <div className="min-h-screen bg-[#F7F5F5] pb-mobile-public lg:pb-0">
      <PublicNav
        user={
          userRecord
            ? { name: userRecord.fullName ?? "Account", href: continueHref! }
            : null
        }
        dashboardHref={continueHref ?? undefined}
      />

      <div className="mx-auto max-w-lg px-4 py-5 sm:py-7">
        <h1 className="text-xl font-semibold text-[#1C1C1A]">Messages</h1>
        <p className="mt-0.5 text-[13px] text-[#7c7b77]">Conversations with stores</p>

        {conversations.length === 0 ? (
          <div
            className={`mt-8 rounded-[12px] bg-white px-6 py-10 text-center ${CARD_BORDER}`}
          >
            <IconMessage
              className="mx-auto mb-3 size-9 text-[#d4d4d0]"
              stroke={1.25}
              aria-hidden
            />
            <p className="text-[13px] leading-relaxed text-[#7c7b77]">
              No messages yet — visit a store and tap Message to start a conversation.
            </p>
            <Link
              href="/stores"
              className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-[10px] bg-[#D4450A] px-5 py-2.5 text-[13px] font-semibold text-white hover:opacity-90"
            >
              Browse stores
            </Link>
          </div>
        ) : (
          <ul className="mt-5 flex flex-col gap-2">
            {conversations.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/messages/${row.id}`}
                  className={`flex min-h-[64px] items-center gap-3 rounded-[12px] bg-white p-3 transition-colors hover:bg-[#FAFAF9] ${CARD_BORDER}`}
                >
                  <div
                    className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-[10px] bg-[#FEF0EB] ${CARD_BORDER}`}
                  >
                    {row.storeLogoUrl ? (
                      <Image
                        src={row.storeLogoUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="44px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[13px] font-semibold text-[#D4450A]">
                        {row.storeName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-[14px] font-medium text-[#1C1C1A]">
                        {row.storeName}
                      </p>
                      <span className="shrink-0 text-[11px] text-[#7c7b77]">
                        {formatConversationListTime(row.lastMessageAt, now)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[13px] text-[#7c7b77]">
                      {truncateSnippet(row.lastMessageText)}
                    </p>
                  </div>
                  {row.unread > 0 ? (
                    <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-[#D4450A] px-1 text-[10px] font-semibold text-white">
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
