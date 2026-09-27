export const NOTIFICATION_GROUPS = {
 orders:["ORDER_PLACED","ORDER_STATUS_UPDATED","TICKET_PURCHASED"],
 bookings:["BOOKING_CONFIRMED","BOOKING_CANCELLED","ON_DEMAND_REQUEST_RECEIVED","ON_DEMAND_REQUEST_ACCEPTED","ON_DEMAND_REQUEST_DECLINED","ON_DEMAND_REQUEST_COMPLETED"],
 messages:["MESSAGE_RECEIVED"], money:["PAYOUT_PROCESSED"], reviews:["REVIEW_RECEIVED"], updates:["GENERAL"],
} as const;
export const NOTIFICATION_LABELS:Record<string,string>={orders:"Orders & tickets",bookings:"Bookings & requests",messages:"Messages",money:"Money",reviews:"Reviews",updates:"Account & support"};
export function notificationGroup(type:string){return Object.entries(NOTIFICATION_GROUPS).find(([,types])=>(types as readonly string[]).includes(type))?.[0]??"updates";}
export function safeNotificationHref(value:string|null){return value?.startsWith("/")&&!value.startsWith("//")&&!/[\\\u0000-\u001f]/.test(value)?value:null;}
export type NotificationItem={id:string;type:string;title:string;body:string|null;linkUrl:string|null;isRead:boolean;createdAt:Date|string};
