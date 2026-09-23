import {
  LayoutDashboard,
  ShoppingBag,
  Truck,
  Wallet,
  ShieldCheck,
  Store,
  Package,
  Sparkles,
  Users,
  UserRoundCheck,
  MessageSquare,
  Settings,
  BookOpen,
  FlaskConical,
  Ticket,
  Layers,
  PlusCircle,
  HeartHandshake,
} from "lucide-react";

export const ADMIN_NAV = [
  {
    label: "Workspace",
    items: [
      {
        label: "Overview",
        href: "/dashboard/admin",
        tab: "overview",
        icon: LayoutDashboard,
      },
      {
        label: "Creation Studio",
        href: "/dashboard/admin/onboarding",
        icon: PlusCircle,
      },
    ],
  },
  {
    label: "Marketplace",
    items: [
      {
        label: "Stores",
        href: "/dashboard/admin/stores",
        icon: Store,
        kind: "store",
      },
      {
        label: "Products",
        href: "/dashboard/admin/products",
        icon: Package,
        kind: "product",
      },
      {
        label: "Services",
        href: "/dashboard/admin/services",
        icon: Sparkles,
        kind: "service",
      },
      {
        label: "Other listings",
        href: "/dashboard/admin/listings",
        icon: Layers,
        kind: "listing",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        label: "Orders",
        href: "/dashboard/admin?tab=orders",
        tab: "orders",
        icon: ShoppingBag,
        badge: "orders",
      },
      {
        label: "Tickets",
        href: "/dashboard/admin?tab=tickets",
        tab: "tickets",
        icon: Ticket,
      },
      {
        label: "Warehouse & delivery",
        href: "/dashboard/admin?tab=linkwe-delivery",
        tab: "linkwe-delivery",
        icon: Truck,
      },
      {
        label: "Finance & payouts",
        href: "/dashboard/admin?tab=payouts",
        tab: "payouts",
        icon: Wallet,
        badge: "payouts",
      },
      {
        label: "Verification",
        href: "/dashboard/admin/verification",
        icon: ShieldCheck,
        badge: "verification",
      },
    ],
  },
  {
    label: "People & support",
    items: [
      {
        label: "People & access",
        href: "/dashboard/admin/users",
        icon: Users,
        kind: "user",
      },
      {
        label: "Vendors",
        href: "/dashboard/admin?tab=vendors",
        tab: "vendors",
        icon: UserRoundCheck,
      },
      {
        label: "Customers",
        href: "/dashboard/admin?tab=customers",
        tab: "customers",
        icon: HeartHandshake,
      },
      {
        label: "Messages",
        href: "/dashboard/admin/messages",
        icon: MessageSquare,
      },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Settings", href: "/dashboard/admin/settings", icon: Settings },
      {
        label: "Test Lab",
        href: "/dashboard/admin/test-lab",
        icon: FlaskConical,
      },
      { label: "Staff guide", href: "/dashboard/admin/guide", icon: BookOpen },
    ],
  },
] as const;

export const ADMIN_LINKS = ADMIN_NAV.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.label })),
);
export type AdminNavItem = (typeof ADMIN_LINKS)[number];
export function adminItemActive(
  item: AdminNavItem,
  pathname: string,
  tab: string,
) {
  if ("tab" in item)
    return (
      pathname === "/dashboard/admin" &&
      (tab === item.tab ||
        (tab === "warehouse" && item.tab === "linkwe-delivery"))
    );
  return (
    pathname.startsWith(item.href) ||
    ("kind" in item &&
      pathname.startsWith(`/dashboard/admin/records/${item.kind}/`))
  );
}
