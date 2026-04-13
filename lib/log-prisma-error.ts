import { Prisma } from "@prisma/client";

/**
 * Logs a thrown value with Prisma-specific fields for debugging (server logs only).
 */
export function logPrismaError(label: string, error: unknown): void {
  console.error(label, error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const payload = {
      code: error.code,
      message: error.message,
      meta: error.meta,
      clientVersion: error.clientVersion,
    };
    console.error(label, "[PrismaClientKnownRequestError]", payload);
    console.error(label, "[PrismaClientKnownRequestError JSON]", JSON.stringify(payload));
    return;
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error(label, "[PrismaClientInitializationError]", {
      message: error.message,
      clientVersion: error.clientVersion,
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    console.error(label, "[PrismaClientRustPanicError]", {
      message: error.message,
      clientVersion: error.clientVersion,
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    console.error(label, "[PrismaClientValidationError]", { message: error.message });
    return;
  }

  if (error instanceof Error) {
    console.error(label, "[Error]", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  }
}
