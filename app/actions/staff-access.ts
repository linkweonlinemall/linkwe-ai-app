"use server";
import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { upcomingBookingsWhere } from "@/lib/services/upcoming-bookings";
import { ymdInTrinidad } from "@/lib/timezone/trinidad";

const hash = (value:string) => createHash("sha256").update(value).digest("hex");
function refresh() { revalidatePath("/dashboard/vendor/staff"); revalidatePath("/team"); revalidatePath("/dashboard/vendor/service-desk"); }
async function owner(staffId:string) {
 const session=await getSession();
 if(session?.role!=="VENDOR")throw Error("Sign in as the business owner.");
 const member=await prisma.staffMember.findFirst({where:{id:staffId,store:{ownerId:session.userId}},select:{id:true,isActive:true}});
 if(!member)throw Error("Team member not found.");
 return member;
}
export async function inviteStaffMember(staffId:string,email:string,permissions:{canEditNotes:boolean;canManageTimeOff:boolean}) {
 const member=await owner(staffId);
 if(!member.isActive)throw Error("Activate this team member before inviting them.");
 const normalized=email.trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)||normalized.length>254)throw Error("Enter a valid email address.");
 const token=randomBytes(32).toString("hex"),expires=new Date(Date.now()+7*86400000);
 const data={email:normalized,userId:null,inviteTokenHash:hash(token),inviteExpiresAt:expires,acceptedAt:null,canEditNotes:permissions.canEditNotes===true,canManageTimeOff:permissions.canManageTimeOff===true};
 await prisma.staffAccess.upsert({where:{staffId},create:{staffId,...data},update:data});
 refresh();return {path:`/team/invite/${token}`,expiresAt:expires.toISOString()};
}
export async function updateStaffPermissions(staffId:string,permissions:{canEditNotes:boolean;canManageTimeOff:boolean}) {
 await owner(staffId);
 await prisma.staffAccess.update({where:{staffId},data:{canEditNotes:permissions.canEditNotes===true,canManageTimeOff:permissions.canManageTimeOff===true}});
 refresh();return {ok:true};
}
export async function revokeStaffAccess(staffId:string) {
 await owner(staffId);
 await prisma.staffAccess.deleteMany({where:{staffId}});
 refresh();return {ok:true};
}
export async function acceptStaffInvitation(token:string) {
 const session=await getSession();if(!session)throw Error("Sign in before accepting your invitation.");
 if(!/^[a-f0-9]{64}$/.test(token))throw Error("This invitation is invalid.");
 const user=await prisma.user.findUnique({where:{id:session.userId},select:{email:true,emailVerified:true}});
 if(!user?.emailVerified)throw Error("Verify your LinkWe email address before accepting. Then return to this invitation.");
 const result=await prisma.staffAccess.updateMany({where:{inviteTokenHash:hash(token),inviteExpiresAt:{gt:new Date()},email:{equals:user.email,mode:"insensitive"},userId:null,staff:{isActive:true}},data:{userId:session.userId,inviteTokenHash:null,inviteExpiresAt:null,acceptedAt:new Date()}});
 if(!result.count)throw Error("This invitation expired, was already used, or belongs to a different email address. Ask the owner for a new link.");
 refresh();return {ok:true};
}
export async function getStaffPortal() {
 const session=await getSession();if(!session)return [];
 return prisma.staffMember.findMany({
  where: { isActive: true, access: { userId: session.userId } },
  select: {
   id: true, name: true, store: { select: { name: true } },
   access: { select: { canEditNotes: true, canManageTimeOff: true } },
   availability: { orderBy: { dayOfWeek: "asc" } },
   overrides: { where: { date: { gte: new Date(`${ymdInTrinidad()}T00:00:00Z`) } } },
   bookings: {
    where: upcomingBookingsWhere(), orderBy: [{ bookingDate: "asc" }, { startTime: "asc" }], take: 100,
    select: { id: true, bookingDate: true, startTime: true, endTime: true, status: true, vendorNotes: true, updatedAt: true, product: { select: { name: true } } },
   },
  },
 });
}
export async function saveStaffAppointmentNote(staffId:string,bookingId:string,note:string,expectedUpdatedAt:string) {
 const session=await getSession();if(!session)throw Error("Sign in first.");
 if(note.length>2000)throw Error("Keep notes under 2,000 characters.");
 if(!Number.isFinite(Date.parse(expectedUpdatedAt)))throw Error("Refresh this appointment before saving.");
 await prisma.$transaction(async tx=>{
  const access=await tx.staffAccess.findFirst({where:{staffId,userId:session.userId,canEditNotes:true,staff:{isActive:true}}});
  if(!access)throw Error("You do not have permission to edit these notes.");
  const result=await tx.productBooking.updateMany({where:{id:bookingId,staffMemberId:staffId,updatedAt:new Date(expectedUpdatedAt),status:{in:["PENDING","CONFIRMED","DEPOSIT_PAID"]}},data:{vendorNotes:note.trim()||null}});
  if(!result.count)throw Error("The appointment changed or was reassigned. Refresh before trying again.");
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 refresh();return {ok:true};
}
export async function manageStaffTimeOff(staffId:string,date:string,blocked:boolean) {
 const session=await getSession();if(!session)throw Error("Sign in first.");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date<ymdInTrinidad())throw Error("Choose today or a future date.");
 const anchor=new Date(`${date}T12:00:00Z`);
 await prisma.$transaction(async tx=>{
  const access=await tx.staffAccess.findFirst({where:{staffId,userId:session.userId,canManageTimeOff:true,staff:{isActive:true}}});
  if(!access)throw Error("You do not have permission to manage time off.");
  if(blocked){
   const existing=await tx.staffAvailabilityOverride.findFirst({where:{staffId,date:anchor}});
   if(existing && existing.reason!=="Team member time off")throw Error("Your owner has already configured this date. Ask them to change it.");
   if(existing)await tx.staffAvailabilityOverride.update({where:{id:existing.id},data:{isBlocked:true,reason:"Team member time off"}});
   else await tx.staffAvailabilityOverride.create({data:{staffId,date:anchor,isBlocked:true,reason:"Team member time off"}});
  }else await tx.staffAvailabilityOverride.deleteMany({where:{staffId,date:anchor,isBlocked:true,reason:"Team member time off"}});
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 refresh();return {ok:true};
}
