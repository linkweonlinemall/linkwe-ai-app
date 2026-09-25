import "server-only";
import { prisma } from "@/lib/prisma";
import { orderMoney, effectiveOrderStatus, orderStatusLabel } from "@/lib/vendor/order-workspace";
import type { MessageContext } from "@/lib/messages/vendor-inbox";

export async function getVendorMessageContext(conversationId: string, userId: string): Promise<MessageContext | null> {
  const conversation=await prisma.conversation.findFirst({
    where:{id:conversationId,store:{ownerId:userId}},
    select:{customerId:true,storeId:true,createdAt:true},
  });
  if(!conversation) return null;
  const {customerId,storeId}=conversation;
  const [orders,bookings,requests,subscriptions]=await Promise.all([
    prisma.splitOrder.findMany({where:{storeId,mainOrder:{buyerId:customerId}},take:5,orderBy:{createdAt:"desc"},select:{id:true,status:true,subtotalMinor:true,currency:true,mainOrder:{select:{id:true,referenceNumber:true,status:true}},items:{take:1,select:{titleSnapshot:true}}}}),
    prisma.productBooking.findMany({where:{customerId,product:{storeId}},take:3,orderBy:{createdAt:"desc"},select:{id:true,status:true,product:{select:{name:true}}}}),
    prisma.onDemandRequest.findMany({where:{customerId,storeId},take:3,orderBy:{createdAt:"desc"},select:{id:true,status:true,service:{select:{name:true}}}}),
    prisma.customerServiceSubscription.findMany({where:{customerId,storeId},take:3,orderBy:{createdAt:"desc"},select:{id:true,status:true,product:{select:{name:true}}}}),
  ]);
  return {
    since:conversation.createdAt.toISOString(),
    orders:orders.map(order=>({id:order.id,reference:order.mainOrder.referenceNumber??`LW-${order.mainOrder.id.slice(-8).toUpperCase()}`,title:order.items[0]?.titleSnapshot??"Product order",status:orderStatusLabel(effectiveOrderStatus(order.status,order.mainOrder.status)),amount:orderMoney(order.subtotalMinor,order.currency),href:`/dashboard/vendor/orders/${order.id}`})),
    services:[...bookings.map(row=>({id:row.id,title:row.product.name,status:orderStatusLabel(row.status),href:`/dashboard/vendor/orders/service/booking/${row.id}`})),...requests.map(row=>({id:row.id,title:row.service.name,status:orderStatusLabel(row.status),href:`/dashboard/vendor/orders/service/request/${row.id}`})),...subscriptions.map(row=>({id:row.id,title:row.product.name,status:orderStatusLabel(row.status),href:`/dashboard/vendor/orders/service/subscription/${row.id}`}))],
  };
}
