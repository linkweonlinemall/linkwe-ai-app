/**
 * Signup role resolution using plain string literals (safe for client bundle).
 * Phase A uses a single `User.role` per account.
 */

export type SignupKind = "CUSTOMER" | "BUSINESS" | "COURIER";

/** Mirrors Prisma `UserRole` enum values used at signup */
export const UserRoleValue = {
  CUSTOMER: "CUSTOMER",
  VENDOR: "VENDOR",
  COURIER: "COURIER",
  ADMIN: "ADMIN",
} as const;

export type RegistrationPayload = {
  role: (typeof UserRoleValue)[keyof typeof UserRoleValue];
};

/**
 * Maps a signup flow to the persisted `User.role`.
 */
export function roleForSignup(kind: SignupKind | string | null | undefined): RegistrationPayload["role"] {
  switch (kind) {
    case "BUSINESS":
      return UserRoleValue.VENDOR;
    case "COURIER":
      return UserRoleValue.COURIER;
    case "CUSTOMER":
    default:
      return UserRoleValue.CUSTOMER;
  }
}
