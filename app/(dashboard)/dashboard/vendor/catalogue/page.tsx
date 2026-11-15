import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import CatalogueWorkspace from "@/components/vendor/catalogue/CatalogueWorkspace";

import CollectionsWorkspace from "@/components/vendor/catalogue/CollectionsWorkspace";
import { parseCollections } from "@/lib/vendor/catalogue/collections";

export const dynamic = "force-dynamic";
export default async function CataloguePage() {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") redirect("/login");
  const store = await prisma.store.findUnique({ where: { ownerId: session.userId }, select: { id: true, name: true, slug: true, status: true, catalogueCollections: true, catalogueRevision: true } });
  if (!store) redirect("/dashboard/vendor");
  const listings = await prisma.product.findMany({ where: { storeId: store.id }, orderBy: [{ name: "asc" }, { id: "asc" }],
    select: { id: true, name: true, category: true, isService: true, isPublished: true, isArchived: true, isFeatured: true } });
  let collections;
  try { collections = parseCollections(store.catalogueCollections); }
  catch { return <div role="alert" className="p-6">Saved collections could not be read safely. They have not been changed. Please contact support before editing collections.</div>; }
  return <><div className="mx-auto max-w-7xl px-4 pt-6"><CollectionsWorkspace key={store.id} storeId={store.id} slug={store.slug} initial={collections} initialRevision={store.catalogueRevision} listings={listings} /></div><CatalogueWorkspace key={store.id} store={store} listings={listings} /></>;
}
