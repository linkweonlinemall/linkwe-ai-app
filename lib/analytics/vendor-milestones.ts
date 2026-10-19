import "server-only";
import { createHmac } from "node:crypto";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { analyticsContext, collectionEligible } from "./collection";

export type VendorMilestone = "vendor_signup_confirmed" | "vendor_setup_confirmed";

// Disabled until collection is separately approved. Server callers invoke this
// only after the corresponding self-service write succeeds. No third-party send.
export async function captureVendorMilestone(name: VendorMilestone, ownerId: string) {
  try {
    if (process.env.LINKWE_ANALYTICS_VENDOR_MILESTONES_ENABLED !== "true" || !process.env.AUTH_SECRET) return;
    if (!["vendor_signup_confirmed", "vendor_setup_confirmed"].includes(name)) return;
    const session = await getSession();
    if (!session || session.userId !== ownerId || !(await collectionEligible())) return;
    const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { role: true, isActive: true, suspended: true } });
    if (owner?.role !== "VENDOR" || !owner.isActive || owner.suspended) return;
    if (name === "vendor_setup_confirmed") {
      const store = await prisma.store.findFirst({ where: { ownerId, onboardingStep: { gte: 3 } }, select: { id: true } });
      if (!store) return;
    }
    const context = await analyticsContext();
    if (!context) return;
    // Keyed deduplication keeps raw account/store IDs out of analytics. The
    // receipt expires with existing 180-day analytics retention; no backfill.
    const id = `vendor:${createHmac("sha256", process.env.AUTH_SECRET).update(JSON.stringify([name, ownerId])).digest("hex")}`;
    await prisma.analyticsEvent.createMany({ skipDuplicates: true, data: [{
      id, name, visitorId: context.visitorId, sessionId: context.sessionId,
      source: context.source, medium: context.medium, campaign: context.campaign, device: context.device,
      path: name === "vendor_signup_confirmed" ? "/register/business" : "/start-business",
      entityId: null, label: null, value: null,
    }] });
  } catch { /* Optional measurement must never block registration or setup. */ }
}
