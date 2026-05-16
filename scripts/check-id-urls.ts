import { prisma } from "../lib/prisma";

async function main() {
  const vendors = await prisma.user.findMany({
    where: {
      role: "VENDOR",
      idDocumentUrl: { not: null },
    },
    select: { id: true, fullName: true, idDocumentUrl: true },
    take: 5,
  });
  console.log(JSON.stringify(vendors, null, 2));
}

main().then(() => process.exit(0));
