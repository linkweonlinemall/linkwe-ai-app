/** Minimal vendor + store shape for approval-readiness checks on already-loaded rows. */
export type VendorReadinessInput = {
  idDocumentUrl: string | null;
  phone: string | null;
  bankDetails: { bankName: string; accountName: string; accountNumber: string } | null;
  store: { logoUrl: string | null; description: string | null } | null;
};

export type VendorReadinessCheck = {
  id: "id_document" | "logo" | "description" | "bank" | "phone";
  label: string;
  ok: boolean;
};

function hasBankDetails(bankDetails: VendorReadinessInput["bankDetails"]): boolean {
  if (bankDetails == null) return false;
  return (
    bankDetails.bankName.trim().length > 0 &&
    bankDetails.accountName.trim().length > 0 &&
    bankDetails.accountNumber.trim().length > 0
  );
}

/**
 * A vendor is ready for admin ID approval when all five profile/KYC items are present.
 * Does not consider idVerificationStatus, store ACTIVE status, gallery, or products.
 */
export function getVendorReadiness(input: VendorReadinessInput): {
  checks: VendorReadinessCheck[];
  pass: number;
  total: 5;
  ready: boolean;
} {
  const checks: VendorReadinessCheck[] = [
    { id: "id_document", label: "ID document", ok: Boolean(input.idDocumentUrl) },
    { id: "logo", label: "Store logo", ok: Boolean(input.store?.logoUrl) },
    {
      id: "description",
      label: "Store description",
      ok: Boolean(input.store?.description?.trim()),
    },
    { id: "bank", label: "Bank account", ok: hasBankDetails(input.bankDetails) },
    { id: "phone", label: "Phone number", ok: Boolean(input.phone?.trim()) },
  ];

  const pass = checks.filter((c) => c.ok).length;

  return {
    checks,
    pass,
    total: 5,
    ready: pass === 5,
  };
}
