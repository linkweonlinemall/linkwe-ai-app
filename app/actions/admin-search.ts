"use server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
export type AdminSearchResult = {
  id: string;
  kind: string;
  label: string;
  description: string;
  href: string;
};
export async function searchAdminRecords(
  raw: string,
  kind?: "user" | "store" | "product" | "service" | "listing",
): Promise<AdminSearchResult[]> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    throw new Error("Administrator access required.");
  const query = raw.trim().slice(0, 100);
  if (query.length < 2) return [];
  const contains = { contains: query, mode: "insensitive" as const };
  const limit = kind ? 25 : 5;
  const [users, stores, products, listings] = await Promise.all([
    !kind || kind === "user"
      ? prisma.user.findMany({
          where: {
            OR: [
              { fullName: contains },
              { email: contains },
              { phone: contains },
            ],
          },
          take: limit,
          orderBy: { fullName: "asc" },
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            isActive: true,
          },
        })
      : [],
    !kind || kind === "store"
      ? prisma.store.findMany({
          where: { OR: [{ name: contains }, { slug: contains }] },
          take: limit,
          orderBy: { name: "asc" },
          select: { id: true, name: true, status: true, region: true },
        })
      : [],
    !kind || kind === "product" || kind === "service"
      ? prisma.product.findMany({
          where: {
            ...(!kind ? {} : { isService: kind === "service" }),
            OR: [
              { name: contains },
              { slug: contains },
              { sku: contains },
              { store: { name: contains } },
            ],
          },
          take: kind ? limit : 10,
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            isService: true,
            store: { select: { name: true } },
          },
        })
      : [],
    !kind || kind === "listing"
      ? prisma.listing.findMany({
          where: { OR: [{ title: contains }, { slug: contains }] },
          take: limit,
          orderBy: { title: "asc" },
          select: { id: true, title: true, type: true },
        })
      : [],
  ]);
  return [
    ...users.map((row) => ({
      id: row.id,
      kind: "user",
      label: row.fullName,
      description: `${row.role} · ${row.email}${row.isActive ? "" : " · Inactive"}`,
    })),
    ...stores.map((row) => ({
      id: row.id,
      kind: "store",
      label: row.name,
      description: `Store · ${row.region} · ${row.status.replaceAll("_", " ")}`,
    })),
    ...products.map((row) => ({
      id: row.id,
      kind: row.isService ? "service" : "product",
      label: row.name,
      description: `${row.isService ? "Service" : "Product"} · ${row.store.name}`,
    })),
    ...listings.map((row) => ({
      id: row.id,
      kind: "listing",
      label: row.title,
      description: `Listing · ${row.type.replaceAll("_", " ")}`,
    })),
  ].map((row) => ({
    ...row,
    href: `/dashboard/admin/records/${row.kind}/${row.id}`,
  }));
}
