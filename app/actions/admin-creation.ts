"use server";

import { randomUUID } from "crypto";
import { ListingStatus, ListingType, ServiceType, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createAdminUser } from "@/app/actions/admin-users";

export type CreationKind = "user" | "store" | "product" | "service" | "listing";

async function admin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") throw new Error("Administrator access required.");
}

function text(value: unknown, max = 150) { return String(value ?? "").trim().slice(0, max); }
function slug(value: unknown) { return text(value, 64).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }

export async function getCreationStudioOptions() {
  await admin();
  const [users, stores] = await Promise.all([
    prisma.user.findMany({ where:{isActive:true}, orderBy:{fullName:"asc"}, select:{id:true,fullName:true,email:true,role:true} }),
    prisma.store.findMany({ orderBy:{name:"asc"}, select:{id:true,name:true,ownerId:true} }),
  ]);
  return { users, stores };
}

export async function createAdminRecord(kind: CreationKind, values: Record<string, string>) {
  await admin();
  try {
    if (kind === "user") {
      const result = await createAdminUser({ fullName:values.fullName, email:values.email, phone:values.phone, password:values.password, role:values.role || "CUSTOMER" });
      return result.id ? { ok:true as const, id:result.id, kind } : { ok:false as const, error:result.error ?? "Could not create user." };
    }
    if (kind === "store") {
      const owner = await prisma.user.findUnique({where:{id:values.ownerId},select:{id:true,storesOwned:{select:{id:true}}}});
      if (!owner) return {ok:false as const,error:"Choose an owner."};
      if (owner.storesOwned.length) return {ok:false as const,error:"That user already owns a store."};
      const name=text(values.name), storeSlug=slug(values.slug || name);
      if (!name || !storeSlug) return {ok:false as const,error:"Enter a store name and URL slug."};
      const row=await prisma.store.create({data:{ownerId:owner.id,name,slug:storeSlug,categoryId:text(values.categoryId)||"other",region:text(values.region)||"Trinidad and Tobago"},select:{id:true}});
      await prisma.user.update({where:{id:owner.id},data:{role:UserRole.VENDOR}});
      revalidatePath("/dashboard/admin","layout"); return {ok:true as const,id:row.id,kind};
    }
    if (kind === "product" || kind === "service") {
      const store=await prisma.store.findUnique({where:{id:values.storeId},select:{id:true}});
      if(!store) return {ok:false as const,error:"Choose a store."};
      const name=text(values.name), itemSlug=slug(values.slug || name);
      if(!name || !itemSlug) return {ok:false as const,error:"Enter a name and URL slug."};
      const row=await prisma.product.create({data:{storeId:store.id,name,slug:`${itemSlug}-${randomUUID().slice(0,6)}`,price:Math.max(0,Number(values.price)||0),stock:kind==="product" ? Math.max(0,Number.parseInt(values.stock||"0",10)||0) : null,tags:[],images:[],isService:kind==="service",serviceType:kind==="service" ? (values.serviceType as ServiceType || ServiceType.QUOTE) : null},select:{id:true}});
      revalidatePath("/dashboard/admin","layout"); return {ok:true as const,id:row.id,kind};
    }
    const store=await prisma.store.findUnique({where:{id:values.storeId},select:{id:true,ownerId:true}});
    if(!store) return {ok:false as const,error:"Choose a store."};
    const title=text(values.title), listingSlug=slug(values.slug || title);
    if(!title || !listingSlug) return {ok:false as const,error:"Enter a title and URL slug."};
    const row=await prisma.listing.create({data:{storeId:store.id,ownerId:store.ownerId,title,slug:`${listingSlug}-${randomUUID().slice(0,6)}`,type:(values.type as ListingType)||ListingType.PRODUCT,status:ListingStatus.DRAFT,priceMinor:Math.max(0,Math.round((Number(values.price)||0)*100)),currency:"TTD"},select:{id:true}});
    revalidatePath("/dashboard/admin","layout"); return {ok:true as const,id:row.id,kind};
  } catch(error) { return {ok:false as const,error:error instanceof Error ? error.message : "Could not create this record."}; }
}
