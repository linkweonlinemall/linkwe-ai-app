import Link from "next/link";
import { AlertCircle, CheckCircle2, Circle, Clock } from "lucide-react";
import type { IdVerificationStatus, StoreStatus } from "@prisma/client";

type Props = {
  verificationStatus: IdVerificationStatus;
  hasBankDetails: boolean;
  hasProduct: boolean;
  storeStatus: StoreStatus;
};

type RowState = "done" | "pending" | "warn" | "todo";

type RowDef = {
  id: string;
  label: string;
  state: RowState;
  helperText: string;
  href: string | null;
  linkLabel?: string;
};

function Row({ row }: { row: RowDef }) {
  const Icon =
    row.state === "done"
      ? CheckCircle2
      : row.state === "warn"
        ? AlertCircle
        : row.state === "pending"
          ? Clock
          : Circle;

  const iconColor =
    row.state === "done"
      ? "text-emerald-500"
      : row.state === "warn"
        ? "text-amber-500"
        : row.state === "pending"
          ? "text-amber-400"
          : "text-zinc-300";

  const labelColor = row.state === "done" ? "text-zinc-900" : "text-zinc-700";

  const helperColor =
    row.state === "done"
      ? "text-emerald-600"
      : row.state === "warn"
        ? "text-amber-700"
        : "text-zinc-500";

  return (
    <li className="flex items-start gap-3">
      <Icon
        className={`mt-0.5 size-4 shrink-0 ${iconColor}`}
        strokeWidth={2.25}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className={`text-[13px] font-medium leading-snug ${labelColor}`}>
          {row.label}
        </p>
        <p className={`mt-0.5 text-[11px] leading-snug ${helperColor}`}>
          {row.helperText}
        </p>
        {row.href ? (
          <Link
            href={row.href}
            className="mt-1 inline-block text-[11px] font-semibold text-[#D4450A] hover:underline"
          >
            {row.linkLabel ?? "Fix →"}
          </Link>
        ) : null}
      </div>
    </li>
  );
}

export default function OpenForBusinessChecklist({
  verificationStatus,
  hasBankDetails,
  hasProduct,
  storeStatus,
}: Props) {
  const allDone =
    verificationStatus === "APPROVED" &&
    hasBankDetails &&
    hasProduct &&
    storeStatus === "ACTIVE";

  if (allDone) return null;

  const verifyRow: RowDef =
    verificationStatus === "APPROVED"
      ? {
          id: "verify",
          label: "Verify your identity",
          state: "done",
          helperText: "Identity verified",
          href: null,
        }
      : verificationStatus === "PENDING"
        ? {
            id: "verify",
            label: "Verify your identity",
            state: "pending",
            helperText: "Verification in review — we'll notify you",
            href: null,
          }
        : verificationStatus === "REJECTED"
          ? {
              id: "verify",
              label: "Verify your identity",
              state: "warn",
              helperText: "Verification rejected — please re-upload your ID",
              href: "/dashboard/vendor",
              linkLabel: "Re-upload ID →",
            }
          : {
              id: "verify",
              label: "Verify your identity",
              state: "todo",
              helperText: "Upload your ID to verify your account",
              href: "/dashboard/vendor",
              linkLabel: "Upload ID →",
            };

  const bankRow: RowDef = hasBankDetails
    ? {
        id: "bank",
        label: "Add bank details",
        state: "done",
        helperText: "Bank details added",
        href: null,
      }
    : {
        id: "bank",
        label: "Add bank details",
        state: "todo",
        helperText: "Add your bank details so you can get paid",
        href: "/dashboard/vendor/finance",
        linkLabel: "Add bank details →",
      };

  const productRow: RowDef = hasProduct
    ? {
        id: "product",
        label: "Add your first product",
        state: "done",
        helperText: "You've added a product",
        href: null,
      }
    : {
        id: "product",
        label: "Add your first product",
        state: "todo",
        helperText: "Add your first product or service",
        href: "/dashboard/vendor/products/new",
        linkLabel: "Add product →",
      };

  const isStoreLive =
    storeStatus === "ACTIVE" && verificationStatus === "APPROVED";

  const liveRow: RowDef = isStoreLive
    ? {
        id: "live",
        label: "Store is live",
        state: "done",
        helperText: "Your store is live and visible to customers",
        href: null,
      }
    : {
        id: "live",
        label: "Store is live",
        state: "pending",
        helperText:
          "Pending approval — your products aren't public yet. Once your identity is verified and your store is approved, customers can find you.",
        href: null,
      };

  const rows = [verifyRow, bankRow, productRow, liveRow];

  return (
    <div className="mb-5 rounded-[12px] border-[0.5px] border-[rgba(28,28,26,0.12)] bg-white px-4 py-4">
      <p className="mb-3 text-sm font-bold text-zinc-900">Open for business</p>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <Row key={row.id} row={row} />
        ))}
      </ul>
    </div>
  );
}
