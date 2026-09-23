// Local development fixtures only. Never connects to a remote database.
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });
const host = new URL(process.env.DATABASE_URL || "").hostname;
if (!["localhost", "127.0.0.1", "[::1]"].includes(host))
  throw new Error("Admin fixtures require a loopback database.");
const prisma = new PrismaClient();
try {
  const passwordHash = await bcrypt.hash("LinkWePreview!2026", 12);
  const account = (email, fullName, role) =>
    prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        fullName,
        role,
        passwordHash,
        emailVerified: new Date(),
      },
    });
  const admin = await account(
    "admin-preview@linkwe.test",
    "Preview Administrator",
    "ADMIN",
  );
  const vendor = await account(
    "vendor-preview@linkwe.test",
    "Preview Vendor",
    "VENDOR",
  );
  const buyer = await account(
    "customer-preview@linkwe.test",
    "Preview Customer",
    "CUSTOMER",
  );
  const store = await prisma.store.upsert({
    where: { slug: "admin-preview-cocoa-coast" },
    update: {},
    create: {
      ownerId: vendor.id,
      name: "Cocoa & Coast · Preview",
      slug: "admin-preview-cocoa-coast",
      categoryId: "beauty_cosmetics",
      region: "San Fernando",
      tagline: "Made locally. Loved daily.",
      description:
        "A local preview business for checking the new management suite.",
      status: "DRAFT",
      logoUrl: "/images/home/live/store-handcrafted868-logo.webp",
      coverPhotoUrl: "/images/home/live/store-handcrafted868.webp",
      tags: ["Local", "Handmade"],
      openingHours: {
        monday: {
          closed: false,
          allDay: false,
          slots: [{ from: "09:00", to: "17:00" }],
        },
      },
      socialLinks: { instagram: "linkweonlinemall" },
      policies: "Collect in store or arrange delivery. Contact us for details.",
    },
  });
  const offerings = [
    [
      "Cocoa body care gift set",
      "products-wind-me-down-sugar-scrub",
      false,
      145,
      null,
    ],
    [
      "Made local graphic tee",
      "products-be-kind-to-your-mind-graphic-tee",
      false,
      175,
      null,
    ],
    ["Custom insulated tumbler", "products-custom-tumbler", false, 125, null],
    [
      "Portrait photography session",
      "service-professional-portrait-photography",
      true,
      500,
      "BOOKABLE",
    ],
    [
      "Signature nail appointment",
      "service-sugar-coat-nails-services",
      true,
      250,
      "QUOTE",
    ],
    [
      "Creative content package",
      "service-couples-lifestyle-photography",
      true,
      1200,
      "SUBSCRIPTION",
    ],
  ];
  for (const [name, image, isService, price, serviceType] of offerings) {
    const slug = "admin-preview-" + name.toLowerCase().replaceAll(" ", "-");
    await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        storeId: store.id,
        name,
        slug,
        price,
        stock: isService ? null : 12,
        isService,
        serviceType,
        isBookable: serviceType === "BOOKABLE",
        serviceDuration: isService ? 60 : null,
        subscriptionInterval: serviceType === "SUBSCRIPTION" ? "monthly" : null,
        images: [`/images/home/live/${image}.webp`],
        tags: ["Preview"],
        description:
          "Sample content for testing the local admin editor. This is not a live offering.",
        shortDescription: "A sample offering for the local admin preview.",
        isPublished: false,
        category: isService ? "creative_media" : "beauty_cosmetics",
        allowDelivery: !isService,
        allowPickup: !isService,
      },
    });
  }
  for (let i = 1; i <= 27; i++) {
    const referenceNumber = `ADMIN-PREVIEW-${String(i).padStart(3, "0")}`;
    await prisma.mainOrder.upsert({
      where: { referenceNumber },
      update: {},
      create: {
        referenceNumber,
        buyerId: buyer.id,
        status: "PENDING_PAYMENT",
        region: "San Fernando",
        shippingZone: "METRO",
        subtotalMinor: 14500,
        shippingMinor: 0,
        totalMinor: 14500,
        createdAt: new Date(Date.now() - i * 3600000),
      },
    });
  }
  console.log(
    JSON.stringify({
      localOnly: true,
      adminId: admin.id,
      storeId: store.id,
      fixtureOrders: 27,
    }),
  );
} finally {
  await prisma.$disconnect();
}
