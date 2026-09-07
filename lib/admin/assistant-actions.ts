import { SignJWT, jwtVerify } from "jose";
import type { updateWarehouseOrder } from "@/app/actions/admin-operations";
export type WarehouseInput = Parameters<typeof updateWarehouseOrder>[0];
export type AssistantAction = { title: string; detail: string; token?: string; href?: string };
function key() { const secret = process.env.AUTH_SECRET; if (!secret || secret.length < 32) throw new Error("Admin action signing is unavailable."); return new TextEncoder().encode(secret); }
export async function signAdminAction(userId: string, input: WarehouseInput) {
  return new SignJWT({ input }).setProtectedHeader({ alg: "HS256" }).setSubject(userId).setAudience("linkwe-admin-action").setIssuedAt().setExpirationTime("10m").sign(key());
}
export async function readAdminAction(userId: string, token: string): Promise<WarehouseInput> {
  const { payload } = await jwtVerify(token, key(), { audience: "linkwe-admin-action", algorithms: ["HS256"] });
  if (payload.sub !== userId || !payload.input || typeof payload.input !== "object") throw new Error("This action belongs to another session.");
  const input = payload.input as WarehouseInput;
  if (!input.expectedUpdatedAt) throw new Error("This action is missing its order version.");
  return input;
}
