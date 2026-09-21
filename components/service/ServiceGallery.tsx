import { ProductGallery } from "@/components/product/ProductGallery";

export default function ServiceGallery({ images, name }: { images: string[] | null | undefined; name: string }) {
  return <ProductGallery images={images ?? []} name={name} kind="Service" />;
}
