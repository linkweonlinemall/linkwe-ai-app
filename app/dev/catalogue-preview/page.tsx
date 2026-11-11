import { notFound } from "next/navigation";
import CatalogueWorkspace from "@/components/vendor/catalogue/CatalogueWorkspace";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default function CataloguePreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <CatalogueWorkspace preview store={{ id: "demo-store", name: "Island Collective", slug: "demo-store", status: "ACTIVE" }} listings={[
    { id: "demo-1", name: "Handwoven market tote", category: "accessories", isService: false, isPublished: true, isArchived: false, isFeatured: true },
    { id: "demo-2", name: "Personal styling consultation", category: "beauty_hair", isService: true, isPublished: true, isArchived: false, isFeatured: true },
    { id: "demo-3", name: "Ceramic pour-over set", category: "home_decor", isService: false, isPublished: true, isArchived: false, isFeatured: false },
    { id: "demo-4", name: "Private pottery workshop", category: "education_tutoring", isService: true, isPublished: false, isArchived: false, isFeatured: false },
    { id: "demo-5", name: "Weekend gift collection", category: "home_decor", isService: false, isPublished: false, isArchived: false, isFeatured: true },
    { id: "demo-6", name: "Last season linen shirt", category: "clothing_apparel", isService: false, isPublished: true, isArchived: true, isFeatured: true },
  ]} />;
}
