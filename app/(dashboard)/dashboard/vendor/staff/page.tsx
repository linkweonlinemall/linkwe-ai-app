import Link from "next/link";
import {redirect} from "next/navigation";
import {getVendorAvailabilityPageData} from "@/app/actions/services";
import {getVendorStaff} from "@/app/actions/staff";
import {getSession} from "@/lib/auth/session";
import {assertDashboardRole} from "@/lib/auth/assert-role";
import {prisma} from "@/lib/prisma";
import {upcomingBookingsWhere} from "@/lib/services/upcoming-bookings";
import {isStoreSellable} from "@/lib/store/sellable-store";
import WorkspacePage from "@/components/vendor/WorkspacePage";
import s from "@/components/vendor/business-workspace.module.css";
import StaffWorkspace from "./StaffWorkspace";
export default async function VendorAvailabilityPage(){
 const session=await getSession();if(!session)redirect("/login");assertDashboardRole(session,"VENDOR");
 const [data,staff,store]=await Promise.all([getVendorAvailabilityPageData(),getVendorStaff(),prisma.store.findFirst({where:{ownerId:session.userId},select:{id:true,name:true,slug:true,status:true,isAvailableNow:true,owner:{select:{idVerificationStatus:true}},products:{where:{isService:true,isArchived:false},select:{id:true,name:true,isPublished:true,isAvailable:true}}}})]);
 if(!data||!store)redirect("/onboarding/business/step-3");
 const bookings=await prisma.productBooking.findMany({where:{product:{storeId:store.id},...upcomingBookingsWhere()},select:{id:true,productId:true,bookingDate:true,startTime:true,endTime:true,staffMemberId:true,product:{select:{name:true}}},orderBy:[{bookingDate:"asc"},{startTime:"asc"}],take:100});
 return <WorkspacePage eyebrow="People, hours & visibility" title="Ready when customers need you." description="Manage your service hours, organise the team and see what customers can discover." action={<Link className={s.secondary} href="/dashboard/vendor/service-desk">Open Service Desk ↗</Link>}><StaffWorkspace availability={data} staff={staff} bookings={bookings.map(b=>({...b,bookingDate:b.bookingDate.toISOString()}))} store={{name:store.name,slug:store.slug,visible:isStoreSellable(store),status:store.status,verification:store.owner.idVerificationStatus,isAvailableNow:store.isAvailableNow,services:store.products}}/></WorkspacePage>;
}
