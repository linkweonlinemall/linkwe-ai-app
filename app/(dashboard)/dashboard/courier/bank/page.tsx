import Link from "next/link";
import { redirect } from "next/navigation";

import { saveCourierBankDetails } from "@/app/actions/courier-bank";
import { getSession } from "@/lib/auth/session";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { prisma } from "@/lib/prisma";

const BANK_OPTIONS = [
  "Republic Bank",
  "First Citizens",
  "Scotiabank Trinidad & Tobago",
  "RBC Royal Bank",
  "JMMB Bank",
  "CIBC Caribbean",
  "Bank of Baroda Trinidad & Tobago",
  "EXIMBANK",
  "FCB Merchant Bank",
] as const;

export default async function CourierBankPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "COURIER");

  const bankDetails = await prisma.courierBankDetails.findUnique({
    where: { courierId: session.userId },
  });

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="mx-auto max-w-xl px-4 py-8">
        <Link
          href="/dashboard/courier"
          className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
        >
          ← Back to dashboard
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900">Bank Details</h1>
        <p className="mt-1 text-sm text-zinc-600">Your earnings will be paid to this account.</p>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <form action={saveCourierBankDetails} className="flex flex-col gap-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700">Bank name</span>
              <select
                name="bankName"
                defaultValue={bankDetails?.bankName ?? ""}
                className="w-full border-b border-zinc-300 bg-transparent pb-2 text-sm text-zinc-900 outline-none focus:border-[#D4450A]"
                required
              >
                <option value="">Select your bank</option>
                {BANK_OPTIONS.map((bank) => (
                  <option key={bank} value={bank}>
                    {bank}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700">Account name</span>
              <input
                name="accountName"
                type="text"
                defaultValue={bankDetails?.accountName ?? ""}
                className="w-full border-b border-zinc-300 bg-transparent pb-2 text-sm text-zinc-900 outline-none focus:border-[#D4450A] placeholder:text-zinc-400"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700">Account number</span>
              <input
                name="accountNumber"
                type="text"
                defaultValue={bankDetails?.accountNumber ?? ""}
                className="w-full border-b border-zinc-300 bg-transparent pb-2 text-sm text-zinc-900 outline-none focus:border-[#D4450A] placeholder:text-zinc-400"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700">Account type</span>
              <select
                name="accountType"
                defaultValue={bankDetails?.accountType ?? ""}
                className="w-full border-b border-zinc-300 bg-transparent pb-2 text-sm text-zinc-900 outline-none focus:border-[#D4450A]"
                required
              >
                <option value="">Select account type</option>
                <option value="CHEQUING">Chequing</option>
                <option value="SAVINGS">Savings</option>
              </select>
            </label>
            <button
              type="submit"
              className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#D4450A" }}
            >
              Save bank details
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
