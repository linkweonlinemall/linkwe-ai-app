import type {Prisma} from "@prisma/client";
import {ymdInTrinidad} from "@/lib/timezone/trinidad";
import {upcomingBookingsWhere} from "@/lib/services/upcoming-bookings";
export function upcomingCustomerBookingsWhere(customerId:string,now=new Date()):Prisma.ProductBookingWhereInput{
 return {customerId,...upcomingBookingsWhere(now)};
}
export function activeCustomerTicketsWhere(userId:string,now=new Date()):Prisma.TicketWhereInput{
 return {userId,status:"VALID",transferredAt:null,ticketOrder:{is:{status:"PAID"}},event:{status:{notIn:["CANCELLED","COMPLETED"]},OR:[{endDate:{gte:now}},{endDate:null,startDate:{gte:new Date(`${ymdInTrinidad(now)}T00:00:00-04:00`)}}]}};
}
export function safeAccountHref(value:string|null){return value?.startsWith("/")&&!value.startsWith("//")&&!value.includes("\\")?value:null;}
