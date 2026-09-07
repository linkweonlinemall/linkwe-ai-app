"use server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { updateWarehouseOrder } from "@/app/actions/admin-operations";
export async function markItemsReceivedAtWarehouse(formData: FormData): Promise<{ bayNumber: number | null }> {
  if ((await getSession())?.role !== "ADMIN") throw new Error("Administrator access required.");
  const id=String(formData.get("splitOrderId") ?? "").trim();
  const split=await prisma.splitOrder.findUniqueOrThrow({where:{id},select:{mainOrderId:true}});
  const raw=formData.get("bayNumber");
  const bay=raw ? Number(raw) : undefined;
  const result=await updateWarehouseOrder({orderId:split.mainOrderId,splitId:id,action:"receive",bay});
  if(!result.ok) throw new Error(result.error);
  return {bayNumber:bay ?? null};
}
