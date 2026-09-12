import { notFound } from "next/navigation";
import { getBusinessPost } from "@/app/actions/business-timeline";
import TimelinePostCard from "@/components/timeline/TimelinePostCard";
import PublicNav from "@/components/layout/PublicNav";
import { prisma } from "@/lib/prisma";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import type { Metadata } from "next";

type Props = { params: Promise<{ postId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { postId } = await params;
  const { post } = await getBusinessPost(postId);
  if (!post) return { title: "Timeline post" };
  const description = (post.caption || `See the latest update from ${post.store.name}.`).replace(/[*_<>#[\]()]/g, "").slice(0, 180);
  const previewImage = post.images[0] ?? post.store.logoUrl;
  return {
    title: `${post.store.name} timeline post`,
    description,
    openGraph: { type: "article", title: post.store.name, description, url: `/timeline/${post.id}`, images: previewImage ? [{ url: previewImage, alt: `${post.store.name} timeline post` }] : [] },
    twitter: { card: "summary_large_image", title: post.store.name, description, images: previewImage ? [previewImage] : [] },
  };
}

export default async function TimelinePostPage({ params }: Props) {
  const { postId } = await params;
  const { post, session } = await getBusinessPost(postId);
  if (!post) notFound();
  const [user, unreadCount] = await Promise.all([
    session ? prisma.user.findUnique({ where: { id: session.userId }, select: { fullName: true, role: true } }) : null,
    getNavUnreadCount(),
  ]);
  const dashboardHref = user ? getRoleDashboardPath(user.role) : undefined;
  return <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(242,138,45,.18),transparent_30%),#F7F5F2] pb-mobile-public"><PublicNav user={user && dashboardHref ? { name: user.fullName, href: dashboardHref } : null} dashboardHref={dashboardHref} unreadCount={unreadCount} /><main className="mx-auto max-w-3xl px-2.5 py-5 sm:px-6 sm:py-10"><TimelinePostCard initialPost={JSON.parse(JSON.stringify(post))} detail canComment={Boolean(session)} /></main></div>;
}
