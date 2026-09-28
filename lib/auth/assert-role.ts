import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { getRoleDashboardPath } from "./redirects";
import type { Session } from "./session";

export function assertDashboardRole(session: Session, required: UserRole): void {
  if (session.role !== required && !(required === "CUSTOMER" && session.role === "VENDOR")) {
    redirect(getRoleDashboardPath(session.role));
  }
}
