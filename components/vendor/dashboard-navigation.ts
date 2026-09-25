import {
  LayoutDashboard, Layers3, ShoppingBag, CalendarDays, MessageCircle, Zap,
  Repeat2, Store, Image, QrCode, Newspaper, Bot, Users,
  Truck, Handshake, Wallet, ChartNoAxesCombined, Star, Settings,
  type LucideIcon,
} from "lucide-react";

export type WorkspaceLink = {
  label: string;
  path: string;
  description: string;
  icon: LucideIcon;
  badge?: "orders" | "requests";
};
export const workspaceGroups: { label: string; items: WorkspaceLink[] }[] = [
  { label: "Your day", items: [
    { label: "Overview", path: "", description: "Your business at a glance", icon: LayoutDashboard },
    { label: "Orders", path: "/orders", description: "Sales, fulfilment and deliveries", icon: ShoppingBag, badge: "orders" },
    { label: "Bookings", path: "/bookings", description: "Appointments and your schedule", icon: CalendarDays },
    { label: "Requests", path: "/requests", description: "Respond to on-demand customers", icon: Zap, badge: "requests" },
    { label: "Messages", path: "/messages", description: "Conversations with customers", icon: MessageCircle },
  ] },
  { label: "Create & sell", items: [
    { label: "Creation Zone", path: "/creation", description: "Create and manage products, services, events, tickets and coupons", icon: Layers3 },
    { label: "Subscribers", path: "/subscribers", description: "Recurring service subscriptions", icon: Repeat2 },
  ] },
  { label: "Your brand", items: [
    { label: "Storefront", path: "/store/edit", description: "Logo, cover, location and store information", icon: Store },
    { label: "Photo Studio", path: "/photo-studio", description: "Polish your product photos and lighting", icon: Image },
    { label: "Timeline", path: "/timeline", description: "Share updates with your community", icon: Newspaper },
    { label: "QR Studio", path: "/qr-studio", description: "Make your store easy to find", icon: QrCode },
    { label: "Rex AI", path: "/ai-assistant", description: "Your AI business assistant", icon: Bot },
  ] },
  { label: "Manage business", items: [
    { label: "Finance", path: "/finance", description: "Payouts, bank details and your plan", icon: Wallet },
    { label: "Reports", path: "/reports", description: "Sales and performance insights", icon: ChartNoAxesCombined },
    { label: "Reviews", path: "/reviews", description: "Customer feedback and ratings", icon: Star },
    { label: "Staff & availability", path: "/staff", description: "Team schedules and working hours", icon: Users },
    { label: "Shipping", path: "/shipping", description: "Delivery, pickup and order preparation", icon: Truck },
    { label: "Collaborations", path: "/partners", description: "Partner stores and shared products", icon: Handshake },
    { label: "Settings", path: "/settings", description: "Account and notification preferences", icon: Settings },
  ] },
];

export const workspaceHref = (path: string) => `/dashboard/vendor${path}`;
export const workspaceLinkActive = (pathname: string, path: string) =>
  pathname === workspaceHref(path) || (path !== "" && pathname.startsWith(`${workspaceHref(path)}/`));

export function searchWorkspace(query: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return workspaceGroups.map(group => ({ ...group, items: group.items.filter(item =>
    words.every(word => `${item.label} ${item.description} ${group.label}`.toLowerCase().includes(word)),
  ) })).filter(group => group.items.length > 0);
}
