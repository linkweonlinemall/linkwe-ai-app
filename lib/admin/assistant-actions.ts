import { SignJWT, jwtVerify } from "jose";
import type { updateWarehouseOrder } from "@/app/actions/admin-operations";
export type WarehouseInput = Parameters<typeof updateWarehouseOrder>[0];
export type AdminAssistantInput =
  | { kind: "warehouse"; input: WarehouseInput }
  | { kind: "users"; ids: string[]; action: "suspend" | "unsuspend" | "delete" }
  | { kind: "products"; ids: string[]; action: "publish" | "draft" | "delete" }
  | { kind: "stores"; ids: string[]; action: "publish" | "draft" | "delete" }
  | { kind: "payouts"; ids: string[]; action: "approve" }
  | { kind: "message"; conversationId: string; content: string };
export type AssistantAction = { title: string; detail: string; token?: string; href?: string };
function key() { const secret = process.env.AUTH_SECRET; if (!secret || secret.length < 32) throw new Error("Admin action signing is unavailable."); return new TextEncoder().encode(secret); }
export async function signAdminAction(userId: string, input: AdminAssistantInput) {
  return new SignJWT({ input }).setProtectedHeader({ alg: "HS256" }).setSubject(userId).setAudience("linkwe-admin-action").setIssuedAt().setExpirationTime("10m").sign(key());
}
export async function readAdminAction(userId: string, token: string): Promise<AdminAssistantInput> {
  const { payload } = await jwtVerify(token, key(), { audience: "linkwe-admin-action", algorithms: ["HS256"] });
  if (payload.sub !== userId || !payload.input || typeof payload.input !== "object") throw new Error("This action belongs to another session.");
  const input = payload.input as AdminAssistantInput;
  if (input.kind === "warehouse" && !input.input.expectedUpdatedAt) throw new Error("This action is missing its order version.");
  return input;
}
