import { createHash } from "node:crypto";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { photoStudioConfig, PhotoStudioError } from "@/lib/photo-studio/config";
import { preparePhoto, editPhoto } from "@/lib/photo-studio/provider";
import { getPhotoAccess, reservePhotoAttempt, settlePhotoTrial } from "@/lib/photo-studio/usage";

export const runtime = "nodejs";
export const maxDuration = 120;
const noCache = { "Cache-Control": "private, no-store" };

async function authorisedStore() {
  const user = await getCurrentUser();
  if (!user) throw new PhotoStudioError("Sign in to your vendor account to use Photo Studio.", 401);
  if (user.role !== "VENDOR") throw new PhotoStudioError("Photo Studio is available to store owners.", 403);
  const store = await prisma.store.findFirst({ where: { ownerId: user.id }, select: { id: true } });
  if (!store) throw new PhotoStudioError("Create your store before using Photo Studio.", 403);
  return store;
}
function failure(error: unknown) {
  if (error instanceof PhotoStudioError) return Response.json({ error: error.message }, { status: error.status, headers: noCache });
  return Response.json({ error: "Photo Studio is temporarily unavailable. Please try again later." }, { status: 503, headers: noCache });
}
export async function GET() {
  try {
    const store = await authorisedStore();
    const { ready, sandbox, dailyStoreLimit } = photoStudioConfig();
    const access = await getPhotoAccess(store.id, sandbox);
    return Response.json({ ready, sandbox, dailyStoreLimit, ...access }, { headers: noCache });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    // Next can normalise the internal URL to localhost while the browser uses
    // 127.0.0.1. Validate the browser origin against the actual request host.
    const requestUrl = new URL(request.url);
    const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || requestUrl.protocol.slice(0, -1);
    const expectedOrigin = `${protocol}://${request.headers.get("host") || requestUrl.host}`;
    if (request.headers.get("origin") !== expectedOrigin) throw new PhotoStudioError("Please open Photo Studio on LinkWe and try again.", 403);
    const store = await authorisedStore();
    const config = photoStudioConfig();
    if (!config.ready) throw new PhotoStudioError("Photo Studio is being connected. You can still upload your original product photos.", 503);
    const type = request.headers.get("content-type") || "";
    if (!type.startsWith("multipart/form-data;")) throw new PhotoStudioError("Please upload a photo.");
    const limit = 4 * 1024 * 1024;
    if (Number(request.headers.get("content-length")) > limit) throw new PhotoStudioError("This upload is too large.", 413);
    const reader = request.body?.getReader();
    if (!reader) throw new PhotoStudioError("Please upload a photo.");
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.length;
        if (size > limit) throw new PhotoStudioError("This upload is too large.", 413);
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    let form: FormData;
    try { form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": type } }).formData(); }
    catch { throw new PhotoStudioError("This upload could not be read. Please choose your photo again."); }
    const file = form.get("image");
    if (!(file instanceof File)) throw new PhotoStudioError("Please upload a photo.");
    const lighting = form.get("lighting") !== "false", shadow = form.get("shadow") !== "false";
    const prepared = await preparePhoto(file, lighting);
    const fingerprint = createHash("sha256").update(prepared).update(String(shadow)).digest("hex");
    const reservation = await reservePhotoAttempt(store.id, fingerprint, config.sandbox, config.monthlyLimit, config.dailyStoreLimit, new Date(), config.lifetimeLimit);
    let output: Buffer;
    try {
      output = await editPhoto(prepared, config.key, shadow);
      await settlePhotoTrial(reservation, true);
    } catch (error) {
      // Failed edits restore the vendor's trial credit, but provider cost guards
      // still count the attempt. A crashed reservation recovers after 10 minutes.
      await settlePhotoTrial(reservation, false).catch(() => {});
      throw error;
    }
    return new Response(new Uint8Array(output), { headers: { ...noCache, "Content-Type": "image/jpeg", "X-Photo-Studio-Sandbox": String(config.sandbox), "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return failure(error); }
}
