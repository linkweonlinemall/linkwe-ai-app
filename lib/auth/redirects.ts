export function getRoleDashboardPath(role?: string | null) {
  if (!role) {
    return "/dashboard";
  }

  if (role === "ADMIN") {
    return "/dashboard/admin";
  }

  return `/dashboard/${role.toLowerCase()}`;
}

export function safeInternalPath(candidate: string | undefined, fallback: string): string {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }
  return candidate;
}
