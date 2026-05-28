import type { Metadata } from "next";

import GetAppClient from "./GetAppClient";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Get the app",
  description:
    "Install LinkWe Online Mall on your phone or desktop. Available on iPhone, Android, and desktop browsers.",
};

export default async function GetAppPage() {
  const session = await getSession();
  const dashboardHref = session ? getRoleDashboardPath(session.role) : null;

  return (
    <GetAppClient
      user={session ? { name: session.fullName ?? "Account", href: dashboardHref! } : null}
      dashboardHref={dashboardHref ?? undefined}
    />
  );
}
