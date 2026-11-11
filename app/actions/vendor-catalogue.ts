"use server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { CatalogueError } from "@/lib/vendor/catalogue/model";
import { saveCatalogueSelection } from "@/lib/vendor/catalogue/save";

export async function saveVendorCatalogue(value: unknown) {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { ok: false as const, error: "Sign in to your vendor account to save your catalogue." };
  try {
    const result = await saveCatalogueSelection(prisma, session.userId, value);
    revalidatePath("/dashboard/vendor/catalogue");
    revalidatePath("/dashboard/vendor/creation");
    revalidatePath(`/store/${result.slug}`);
    revalidatePath("/shop");
    revalidatePath("/services");
    revalidatePath("/dashboard/vendor/services");
    revalidatePath("/search");
    revalidatePath("/");
    return { ok: true as const, count: result.count };
  } catch (error) {
    return { ok: false as const, error: error instanceof CatalogueError ? error.message : "We could not confirm your save. Reload the catalogue to check the saved selections before trying again." };
  }
}
