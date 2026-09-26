import "server-only";
import { prisma } from "@/lib/prisma";
import { PhotoStudioError } from "./config";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { photoAccess, photoPlanSelect, photoTrialKey } from "./access";

type PhotoReservation = { trialKey: string; pendingKey: string } | null;
async function recoverTrial(tx: Prisma.TransactionClient, trialKey: string, now: Date) {
  const expired = await tx.rateLimit.deleteMany({ where: { key: { startsWith: `${trialKey}:pending:` }, resetAt: { lt: now } } });
  if (expired.count) {
    const used = await tx.rateLimit.findUnique({ where: { key: trialKey } });
    if (used) await tx.rateLimit.update({ where: { key: trialKey }, data: { count: Math.max(0, used.count - expired.count) } });
  }
}

export async function getPhotoAccess(storeId: string, sandbox: boolean, now = new Date()) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(418592731)`;
    const store = await tx.store.findUnique({ where: { id: storeId }, select: photoPlanSelect });
    if (!store) throw new PhotoStudioError("Create your store before using Photo Studio.", 403);
    const key = photoTrialKey(store.ownerId, sandbox);
    await recoverTrial(tx, key, now);
    const used = await tx.rateLimit.findUnique({ where: { key } });
    return photoAccess(store, used?.count || 0, now);
  });
}

export async function settlePhotoTrial(reservation: PhotoReservation, success: boolean) {
  if (!reservation) return;
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(418592731)`;
    const settled = await tx.rateLimit.deleteMany({ where: { key: reservation.pendingKey } });
    if (settled.count && !success) await tx.rateLimit.updateMany({ where: { key: reservation.trialKey, count: { gt: 0 } }, data: { count: { decrement: 1 } } });
  });
}

// Reserve before calling a paid provider. A transaction-wide lock makes the
// global cap, store allowance and double-click protection atomic across servers.
// Ambiguous failures still count: a timed-out provider may have processed an image.
export async function reservePhotoAttempt(storeId: string, fingerprint: string, sandbox: boolean, monthlyLimit: number, dailyLimit: number, now = new Date(), lifetimeLimit: number | null = null) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(418592731)`;
    const store = await tx.store.findUnique({ where: { id: storeId }, select: photoPlanSelect });
    if (!store) throw new PhotoStudioError("Create your store before using Photo Studio.", 403);
    const trialKey = photoTrialKey(store.ownerId, sandbox);
    await recoverTrial(tx, trialKey, now);
    const trial = await tx.rateLimit.findUnique({ where: { key: trialKey } });
    const access = photoAccess(store, trial?.count || 0, now);
    if (!access.allowed) throw new PhotoStudioError("You've used your free Photo Studio image. Upgrade to Growth or Pro to keep editing.", 403);
    const prefix = `photo-studio:${sandbox ? "test" : "live"}`;
    const day = now.toISOString().slice(0, 10), month = day.slice(0, 7);
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const duplicate = `${prefix}:request:${storeId}:${fingerprint}`;
    const existing = await tx.rateLimit.findUnique({ where: { key: duplicate } });
    if (existing && existing.resetAt > now) throw new PhotoStudioError("This photo was just submitted. Wait a moment before trying it again.", 429);
    const counters = [
      ...(lifetimeLimit === null ? [] : [{ key: `${prefix}:total`, limit: lifetimeLimit, resetAt: new Date("9999-12-31T00:00:00Z"), message: "Photo Studio has reached its launch allowance. Please contact LinkWe support." }]),
      { key: `${prefix}:month:${month}`, limit: monthlyLimit, resetAt: nextMonth, message: "Photo Studio has reached its monthly allowance. Please contact LinkWe support." },
      { key: `${prefix}:store:${storeId}:${day}`, limit: dailyLimit, resetAt: tomorrow, message: "You've used today's Photo Studio allowance. Please try again tomorrow." },
    ];
    for (const counter of counters) {
      const used = await tx.rateLimit.findUnique({ where: { key: counter.key } });
      if ((used?.count || 0) >= counter.limit) throw new PhotoStudioError(counter.message, 429);
      await tx.rateLimit.upsert({ where: { key: counter.key }, create: { key: counter.key, count: 1, resetAt: counter.resetAt }, update: { count: { increment: 1 } } });
    }
    await tx.rateLimit.upsert({ where: { key: duplicate }, create: { key: duplicate, count: 1, resetAt: new Date(now.getTime() + 120_000) }, update: { count: 1, resetAt: new Date(now.getTime() + 120_000) } });
    if (access.paid) return null;
    const reservation = { trialKey, pendingKey: `${trialKey}:pending:${randomUUID()}` };
    await tx.rateLimit.upsert({ where: { key: trialKey }, create: { key: trialKey, count: 1, resetAt: new Date("9999-12-31T00:00:00Z") }, update: { count: { increment: 1 } } });
    await tx.rateLimit.create({ data: { key: reservation.pendingKey, count: 1, resetAt: new Date(now.getTime() + 10 * 60_000) } });
    return reservation;
  }, { maxWait: 10_000, timeout: 15_000 });
}
