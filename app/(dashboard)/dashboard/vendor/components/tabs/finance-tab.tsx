import { saveVendorBankDetails } from "@/app/actions/vendor";

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

type BankDetails = {
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  accountType: string | null;
} | null;

type Props = {
  bankDetails: BankDetails;
};

export default function FinanceTab({ bankDetails }: Props) {
  const hasBankOnFile =
    !!bankDetails?.bankName && !!bankDetails.accountName && !!bankDetails.accountNumber;

  return (
    <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-950">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Payout details</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        Your bank details are used for marketplace payouts. Keep these up to date.
      </p>
      {hasBankOnFile ? (
        <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">✓ Payout details on file</p>
      ) : (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No payout details saved yet.</p>
      )}
      <form action={saveVendorBankDetails} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Bank name
          <select
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            defaultValue={bankDetails?.bankName ?? ""}
            name="bankName"
          >
            <option value="">Select your bank…</option>
            {BANK_OPTIONS.map((bank) => (
              <option key={bank} value={bank}>
                {bank}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Account name
          <input
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            defaultValue={bankDetails?.accountName ?? ""}
            name="accountName"
            placeholder="Name on the account"
            type="text"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Account number
          <input
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            defaultValue={bankDetails?.accountNumber ?? ""}
            name="accountNumber"
            placeholder="Account number"
            type="text"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Account type
          <select
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            defaultValue={bankDetails?.accountType ?? ""}
            name="accountType"
          >
            <option value="">Select account type</option>
            <option value="CHEQUING">Chequing</option>
            <option value="SAVINGS">Savings</option>
          </select>
        </label>
        <button
          className="inline-flex h-11 w-fit items-center justify-center rounded-lg bg-[#D4450A] px-4 text-sm font-medium text-white hover:bg-[#B83A08]"
          type="submit"
        >
          Save payout details
        </button>
      </form>
    </section>
  );
}
