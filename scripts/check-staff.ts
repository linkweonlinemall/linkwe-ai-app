import { prisma } from "../lib/prisma";

async function main() {
  const staff = await prisma.staffMember.findMany({
    select: {
      id: true,
      name: true,
      isActive: true,
      services: {
        select: {
          serviceId: true,
          service: { select: { name: true } },
        },
      },
      availability: {
        select: { dayOfWeek: true, isActive: true, startTime: true, endTime: true },
      },
      overrides: {
        select: { date: true, isBlocked: true },
      },
    },
  });

  console.log(JSON.stringify(staff, null, 2));
}

main().then(() => process.exit(0));
