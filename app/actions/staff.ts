"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { validateStaffSchedule, validStaffTime, staffAssignmentConflict } from "@/lib/vendor/staff-schedule";
import { dayOfWeekTrinidad, isSlotInPastTrinidad } from "@/lib/timezone/trinidad";
import type { StaffMode } from "@prisma/client";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

async function getVendorStore() {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return null;
  return prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true, staffMode: true },
  });
}

export async function getVendorStaff() {
  const store = await getVendorStore();
  if (!store) return [];
  return prisma.staffMember.findMany({
    where: { storeId: store.id },
    select: {
      id: true,
      name: true,
      bio: true,
      photoUrl: true,
      isActive: true,
      services: {
        select: {
          serviceId: true,
          service: { select: { name: true } },
        },
      },
      availability: {
        orderBy: { dayOfWeek: "asc" },
      },
      overrides: {
        select: {
          id: true,
          date: true,
          isBlocked: true,
          customStartTime: true,
          customEndTime: true,
          reason: true,
        },
        orderBy: { date: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getStoreStaffMode() {
  const store = await getVendorStore();
  return store?.staffMode ?? "SOLO";
}

export async function updateStaffMode(mode: StaffMode) {
  const store = await getVendorStore();
  if (!store) return { error: "No store found" };

  if (mode !== "SOLO" && mode !== "TEAM") return { error: "Choose solo or team." };
  await prisma.store.update({
    where: { id: store.id },
    data: { staffMode: mode },
  });

  revalidatePath("/dashboard/vendor/staff");
  return { ok: true as const };
}

export async function createStaffMember(data: { name: string; bio?: string; photoUrl?: string }) {
  const store = await getVendorStore();
  if (!store) return { error: "No store found" };
  if (!data.name.trim() || data.name.trim().length > 100) return { error: "Enter a name between 1 and 100 characters." };
  if ((data.bio?.length ?? 0) > 1000) return { error: "Keep the bio under 1,000 characters." };

  const staff = await prisma.staffMember.create({
    data: {
      storeId: store.id,
      name: data.name.trim(),
      bio: data.bio?.trim() || null,
      photoUrl: data.photoUrl || null,
    },
  });

  revalidatePath("/dashboard/vendor/staff");
  return { ok: true as const, staffId: staff.id };
}

export async function updateStaffMember(
  staffId: string,
  data: { name?: string; bio?: string; photoUrl?: string; isActive?: boolean },
) {
  const store = await getVendorStore();
  if (!store) return { error: "No store found" };

  const staff = await prisma.staffMember.findFirst({
    where: { id: staffId, storeId: store.id },
  });
  if (!staff) return { error: "Staff member not found" };

  if (data.name !== undefined && (!data.name.trim() || data.name.trim().length > 100)) return {error:"Enter a name between 1 and 100 characters."};
  if ((data.bio?.length ?? 0) > 1000) return {error:"Keep the bio under 1,000 characters."};
  await prisma.staffMember.update({
    where: { id: staffId },
    data: {
      name: data.name?.trim() ?? staff.name,
      bio: data.bio !== undefined ? data.bio.trim() || null : staff.bio,
      photoUrl: data.photoUrl !== undefined ? data.photoUrl : staff.photoUrl,
      isActive: data.isActive !== undefined ? data.isActive : staff.isActive,
    },
  });

  revalidatePath("/dashboard/vendor/staff");
  return { ok: true as const };
}

export async function deleteStaffMember(staffId: string) {
  const store = await getVendorStore();
  if (!store) return { error: "No store found" };

  const staff = await prisma.staffMember.findFirst({
    where: { id: staffId, storeId: store.id },
  });
  if (!staff) return { error: "Staff member not found" };

  await prisma.staffMember.delete({ where: { id: staffId } });
  revalidatePath("/dashboard/vendor/staff");
  return { ok: true as const };
}

export async function updateStaffServices(staffId: string, serviceIds: string[]) {
  const store = await getVendorStore();
  if (!store) return { error: "No store found" };

  const staff = await prisma.staffMember.findFirst({
    where: { id: staffId, storeId: store.id },
  });
  if (!staff) return { error: "Staff member not found" };

  const ids = [...new Set(serviceIds)];
  const owned = await prisma.product.findMany({where:{id:{in:ids},storeId:store.id,isService:true},select:{id:true}});
  if(owned.length!==ids.length)return {error:"Choose services from your own store."};
  await prisma.$transaction(async tx=>{await tx.staffService.deleteMany({where:{staffId}});if(ids.length)await tx.staffService.createMany({data:ids.map(serviceId=>({staffId,serviceId}))});});

  revalidatePath("/dashboard/vendor/staff");
  return { ok: true as const };
}

export async function saveStaffAvailability(
  staffId: string,
  schedule: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDurationMins: number;
    slotBufferMins: number;
    isActive: boolean;
  }[],
) {
  const store = await getVendorStore();
  if (!store) return { error: "No store found" };

  const staff = await prisma.staffMember.findFirst({
    where: { id: staffId, storeId: store.id },
  });
  if (!staff) return { error: "Staff member not found" };

  const error = validateStaffSchedule(schedule);
  if(error)return {error};
  await prisma.$transaction(async tx=>{await tx.staffAvailability.deleteMany({where:{staffId}});if(schedule.length)await tx.staffAvailability.createMany({data:schedule.map(day=>({staffId,...day}))});});

  revalidatePath("/dashboard/vendor/staff");
  return { ok: true as const };
}

export async function addStaffOverride(
  staffId: string,
  override: {
    date: string;
    isBlocked: boolean;
    customStartTime?: string;
    customEndTime?: string;
    reason?: string;
  },
) {
  const store = await getVendorStore();
  if (!store) return { error: "No store found" };

  const staff = await prisma.staffMember.findFirst({
    where: { id: staffId, storeId: store.id },
  });
  if (!staff) return { error: "Staff member not found" };

  if(!/^\d{4}-\d{2}-\d{2}$/.test(override.date))return {error:"Choose a valid date."};
  if(!override.isBlocked && (!validStaffTime(override.customStartTime ?? "") || !validStaffTime(override.customEndTime ?? "") || override.customStartTime! >= override.customEndTime!))return {error:"Set custom hours with the start before the end."};
  if((override.reason?.length ?? 0)>300)return {error:"Keep the reason under 300 characters."};
  const [y, m, d] = override.date.split("-").map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));

  if(Number.isNaN(dateObj.getTime()) || dateObj.toISOString().slice(0,10)!==override.date)return {error:"Choose a valid date."};
  const existing = await prisma.staffAvailabilityOverride.findFirst({
    where: { staffId, date: dateObj },
  });

  let recordId: string;
  if (existing) {
    const updated = await prisma.staffAvailabilityOverride.update({
      where: { id: existing.id },
      data: {
        isBlocked: override.isBlocked,
        customStartTime: override.customStartTime ?? null,
        customEndTime: override.customEndTime ?? null,
        reason: override.reason ?? null,
      },
    });
    recordId = updated.id;
  } else {
    const created = await prisma.staffAvailabilityOverride.create({
      data: {
        staffId,
        date: dateObj,
        isBlocked: override.isBlocked,
        customStartTime: override.customStartTime ?? null,
        customEndTime: override.customEndTime ?? null,
        reason: override.reason ?? null,
      },
    });
    recordId = created.id;
  }

  revalidatePath("/dashboard/vendor/staff");
  return { ok: true as const, id: recordId };
}

export async function removeStaffOverride(overrideId: string) {
  const store = await getVendorStore();
  if (!store) return { error: "No store found" };

  const owned = await prisma.staffAvailabilityOverride.findFirst({
    where: {
      id: overrideId,
      staff: { storeId: store.id },
    },
  });
  if (!owned) return { error: "Not found" };

  await prisma.staffAvailabilityOverride.delete({ where: { id: overrideId } });
  revalidatePath("/dashboard/vendor/staff");
  return { ok: true as const };
}

/** Manual assignment keeps service booking hours separate from team working hours. */
export async function assignBookingStaff(bookingId:string,staffId:string|null){
 const store=await getVendorStore();if(!store)return {error:"A vendor account is required."};
 try {
  const result=await prisma.$transaction(async tx=>{
   const booking=await tx.productBooking.findFirst({where:{id:bookingId,product:{storeId:store.id}},select:{id:true,productId:true,bookingDate:true,startTime:true,endTime:true,status:true}});
   if(!booking)return {error:"Booking not found."};
   if(!["PENDING","CONFIRMED","DEPOSIT_PAID"].includes(booking.status))return {error:"This booking can no longer be assigned."};
   const date=booking.bookingDate.toISOString().slice(0,10);
   if(isSlotInPastTrinidad(date,booking.startTime))return {error:"Only upcoming bookings can be assigned."};
   if(staffId){
    const member=await tx.staffMember.findFirst({where:{id:staffId,storeId:store.id,isActive:true,services:{some:{serviceId:booking.productId}}},include:{availability:true,overrides:true}});
    if(!member)return {error:"Choose an active team member assigned to this service."};
    const override=member.overrides.find(o=>o.date.toISOString().slice(0,10)===date);
    const day=member.availability.find(d=>d.dayOfWeek===dayOfWeekTrinidad(date)&&d.isActive);
    const start=override?.customStartTime??day?.startTime,end=override?.customEndTime??day?.endTime;
    if(override?.isBlocked||!start||!end||booking.startTime<start||booking.endTime>end)return {error:"This appointment falls outside the team member's working hours."};
    const others=await tx.productBooking.findMany({where:{id:{not:booking.id},staffMemberId:staffId,bookingDate:{gte:new Date(`${date}T00:00:00Z`),lt:new Date(new Date(`${date}T00:00:00Z`).getTime()+86400000)},status:{in:["PENDING","CONFIRMED","DEPOSIT_PAID"]}},select:{startTime:true,endTime:true}});
    if(staffAssignmentConflict(booking.startTime,booking.endTime,day?.slotBufferMins??0,others))return {error:"This team member already has an overlapping appointment or buffer."};
   }
   await tx.productBooking.update({where:{id:booking.id},data:{staffMemberId:staffId}});return {ok:true as const};
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  if("ok"in result){revalidatePath("/dashboard/vendor/staff");revalidatePath("/dashboard/vendor/service-desk");revalidatePath("/bookings");}
  return result;
 }catch(error){if(typeof error==="object"&&error&&"code"in error&&error.code==="P2034")return {error:"The schedule changed while saving. Please try again."};return {error:"Could not save the assignment."};}
}
