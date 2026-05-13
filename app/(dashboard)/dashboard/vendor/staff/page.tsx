import { redirect } from "next/navigation";

import { getVendorStaff, getStoreStaffMode } from "@/app/actions/staff";
import { getVendorServices } from "@/app/actions/services";
import { getSession } from "@/lib/auth/session";

import StaffManagerClient from "./StaffManagerClient";

export default async function VendorStaffPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [staff, staffMode, services] = await Promise.all([
    getVendorStaff(),
    getStoreStaffMode(),
    getVendorServices(),
  ]);

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Staff</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage your team and their availability
        </p>
      </div>
      <StaffManagerClient
        initialStaff={staff}
        initialStaffMode={staffMode}
        services={services.map((s) => ({ id: s.id, name: s.name }))}
      />
    </div>
  );
}
