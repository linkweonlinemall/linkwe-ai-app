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
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="max-w-lg mx-auto px-4 py-6">
        <a
          href="/dashboard/courier"
          className="mb-4 inline-flex items-center gap-1 text-xs hover:underline"
          style={{ color: "var(--blue)" }}
        >
          ← Back to dashboard
        </a>
        <h1 className="mb-1 text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Bank Details
        </h1>
        <p className="mb-6 text-sm" style={{ color: "var(--text-muted)" }}>
          Your payout details for courier earnings
        </p>

        <div className="rounded-xl bg-white p-6" style={{ border: "1px solid var(--card-border)" }}>
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
                className="w-full border-b border-zinc-300 bg-transparent pb-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[#D4450A]"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700">Account number</span>
              <input
                name="accountNumber"
                type="text"
                defaultValue={bankDetails?.accountNumber ?? ""}
                className="w-full border-b border-zinc-300 bg-transparent pb-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[#D4450A]"
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
              className="mt-2 w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--scarlet)" }}
            >
              Save bank details
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
