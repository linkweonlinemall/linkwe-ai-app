import type { UserRole } from "@prisma/client";

export function getRoleDashboardPath(role?: string | null) {
  if (!role) {
    return "/dashboard"; // fallback
  }

  if (role === "CUSTOMER") {
    return "/";
  }

  return `/dashboard/${role.toLowerCase()}`;
}

export function safeInternalPath(candidate: string | undefined, fallback: string): string {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }
  return candidate;
}
