"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import WarehouseWorkspace from "./warehouse-workspace";
import OverviewTab from "./overview-tab";
import OrdersTab from "./orders-tab";
import VendorsTab from "./vendors-tab";
import CustomersTab from "./customers-tab";
import SettingsTab from "./settings-tab";
import TicketOrdersTab from "./ticket-orders-tab";

export default function AdminDashboard(_props: { adminName: string }) {
  const tab = useSearchParams().get("tab") ?? "overview";
  const panels: Record<string, React.ReactNode> = {
    overview: <OverviewTab/>, orders: <OrdersTab/>, "linkwe-delivery": <WarehouseWorkspace/>,
    warehouse: <WarehouseWorkspace/>, payouts: <VendorsTab initialView="payouts"/>, vendors: <VendorsTab/>,
    customers: <CustomersTab/>, tickets: <TicketOrdersTab/>, settings: <SettingsTab/>,
  };
  return <div className="min-h-full bg-[#f5f6f4] px-3 py-4 sm:px-5 sm:py-6 xl:px-8">{["orders", "tickets"].includes(tab) && <nav className="mb-5 flex gap-2" aria-label="Order types"><Link href="/dashboard/admin?tab=orders" className={`rounded-xl px-4 py-3 text-sm font-semibold ${tab === "orders" ? "bg-zinc-900 text-white" : "bg-white text-zinc-500"}`}>Product orders</Link><Link href="/dashboard/admin?tab=tickets" className={`rounded-xl px-4 py-3 text-sm font-semibold ${tab === "tickets" ? "bg-zinc-900 text-white" : "bg-white text-zinc-500"}`}>Event tickets</Link></nav>}{panels[tab] ?? panels.overview}</div>;
}
