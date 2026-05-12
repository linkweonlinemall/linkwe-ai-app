import { prisma } from "../lib/prisma";

async function main() {
  // Distinct brands
  const brands = await prisma.product.findMany({
    where: { isPublished: true, brand: { not: null } },
    select: { brand: true },
    distinct: ["brand"],
    orderBy: { brand: "asc" },
  });

  // Distinct categories that have products
  const categories = await prisma.product.findMany({
    where: { isPublished: true, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  // All variant attributes (to find colour/size values)
  const variants = await prisma.productVariant.findMany({
    select: { attributes: true },
    take: 200,
  });

  console.log("BRANDS:", JSON.stringify(brands, null, 2));
  console.log("CATEGORIES:", JSON.stringify(categories, null, 2));
  console.log("VARIANT ATTRIBUTES:", JSON.stringify(variants, null, 2));
}

main().then(() => process.exit(0));
