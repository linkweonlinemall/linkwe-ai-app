export const MESSAGE_MAX_LENGTH = 5000;
export type VendorInboxRow = {
  id: string;
  customerName: string;
  lastMessageText: string | null;
  lastMessageAt: string;
  unread: number;
  lastSeenAt: string | null;
  lastSenderRole: string | null;
};
export type VendorChatMessage = {
  id: string;
  senderId: string;
  senderRole: string;
  content: string;
  createdAt: string;
};
export type MessageContext = {
  since: string;
  orders: { id: string; reference: string; title: string; status: string; amount: string; href: string }[];
  services: { id: string; title: string; status: string; href: string }[];
};
export type InboxFilter = "all" | "unread" | "reply";
export function filterInbox(rows: VendorInboxRow[], query: string, filter: InboxFilter, sort: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter(row => (filter !== "unread" || row.unread > 0) && (filter !== "reply" || row.lastSenderRole === "CUSTOMER"))
    .filter(row => words.every(word => `${row.customerName} ${row.lastMessageText ?? ""}`.toLowerCase().includes(word)))
    .sort((a,b) => sort === "name" ? a.customerName.localeCompare(b.customerName) : (sort === "oldest" ? -1 : 1) * (Date.parse(b.lastMessageAt)-Date.parse(a.lastMessageAt)));
}
export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0,2).map(part => part[0]).join("").toUpperCase() || "?";
}
export function recentlyActive(lastSeenAt: string | null, now: number) {
  if (!lastSeenAt) return false;
  const age = now - Date.parse(lastSeenAt);
  return age >= 0 && age < 120000;
}
export function messageDay(date: string) {
  return new Intl.DateTimeFormat("en-TT", { timeZone:"America/Port_of_Spain", day:"numeric",month:"short",year:"numeric" }).format(new Date(date));
}
export function messageClock(date: string) {
  return new Intl.DateTimeFormat("en-TT", { timeZone:"America/Port_of_Spain", hour:"numeric",minute:"2-digit",hour12:true }).format(new Date(date));
}
export function mergeChatMessages(current: VendorChatMessage[], incoming: VendorChatMessage[]) {
  const byId = new Map(current.map(message => [message.id,message]));
  for (const message of incoming) byId.set(message.id,message);
  return [...byId.values()].sort((a,b) => Date.parse(a.createdAt)-Date.parse(b.createdAt) || a.id.localeCompare(b.id));
}
export function clearSeenUnread(rows: VendorInboxRow[], id: string, snapshotAt: string) {
  return rows.map(row => row.id === id && Date.parse(row.lastMessageAt) <= Date.parse(snapshotAt) ? {...row,unread:0} : row);
}
export function draftKey(userId: string, conversationId: string) { return `linkwe:message-draft:${userId}:${conversationId}`; }
/** Split plain text into safe web links; React still escapes every text segment. */
export function messageParts(content: string) {
  return content.split(/(https?:\/\/[^\s<>]+)/gi).filter(Boolean).map(text => {
    if (!/^https?:\/\//i.test(text)) return {text,href:null};
    try { const url=new URL(text); return {text,href:["https:","http:"].includes(url.protocol)?url.href:null}; } catch { return {text,href:null}; }
  });
}
export function quickReplies(name: string) {
  const first = name.trim().split(/\s+/)[0] || "there";
  return [
    {label:"Say hello",text:`Hi ${first}, thanks for reaching out! How can we help?`},
    {label:"Ask for order number",text:"Could you share your order reference so I can check the details for you?"},
    {label:"Checking for you",text:"Thanks for your patience. I’m checking this and will get back to you."},
    {label:"Say thanks",text:"Thank you for supporting our store! Let us know if there’s anything else we can help with."},
  ];
}
