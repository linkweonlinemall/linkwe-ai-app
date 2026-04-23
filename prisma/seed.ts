import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding 20 dock bays...");
  for (let i = 1; i <= 20; i++) {
    await prisma.dockBay.upsert({
      where: { bayNumber: i },
      update: {},
      create: { bayNumber: i, isOccupied: false },
    });
  }
  console.log("Done.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
