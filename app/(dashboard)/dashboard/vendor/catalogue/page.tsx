import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import CatalogueWorkspace from "@/components/vendor/catalogue/CatalogueWorkspace";

export const dynamic = "force-dynamic";
export default async function CataloguePage() {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") redirect("/login");
  const store = await prisma.store.findUnique({ where: { ownerId: session.userId }, select: { id: true, name: true, slug: true, status: true } });
  if (!store) redirect("/dashboard/vendor");
  const listings = await prisma.product.findMany({ where: { storeId: store.id }, orderBy: [{ name: "asc" }, { id: "asc" }],
    select: { id: true, name: true, category: true, isService: true, isPublished: true, isArchived: true, isFeatured: true } });
  return <CatalogueWorkspace key={store.id} store={store} listings={listings} />;
}
