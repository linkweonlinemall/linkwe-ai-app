"use client";
import Link from "next/link";
import { useState } from "react";
import Papa from "papaparse";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  FileUp,
  Store,
  UserRound,
  Package,
  ClipboardCheck,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  importAdminOnboardingRows,
  type OnboardingResult,
  type OnboardingRow,
} from "@/app/actions/admin-onboarding";
import { STORE_CATEGORIES } from "@/lib/categories";
import { TT_REGIONS } from "@/lib/regions/tt-regions";
const HEADERS = [
  "fullName",
  "email",
  "phone",
  "password",
  "storeName",
  "storeSlug",
  "categoryId",
  "region",
  "storeDescription",
  "storeStatus",
  "itemType",
  "itemName",
  "itemDescription",
  "price",
  "stock",
  "publish",
];
const steps = [
  { name: "Owner", icon: UserRound },
  { name: "Store", icon: Store },
  { name: "First offering", icon: Package },
  { name: "Review", icon: ClipboardCheck },
];
export default function OnboardingStudio({
  mode = "single",
}: {
  mode?: "single" | "csv";
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({
    categoryId: "other",
    storeStatus: "DRAFT",
    itemType: "product",
    publish: "false",
  });
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<OnboardingRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<OnboardingResult | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const set = (key: string, value: string) =>
    setValues((v) => ({ ...v, [key]: value }));
  async function run(input: OnboardingRow[]) {
    setBusy(true);
    setError("");
    try {
      const response = await importAdminOnboardingRows(input);
      setResult(response);
      if (response.ok) toast.success("Vendor setup completed");
      else toast.error("Some rows need attention. Review the results below.");
    } catch {
      setError(
        "The request could not complete. Check the records before retrying.",
      );
    } finally {
      setBusy(false);
    }
  }
  function download(data: OnboardingRow[], name: string) {
    const url = URL.createObjectURL(
      new Blob(
        [Papa.unparse(data, { columns: HEADERS, escapeFormulae: true })],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
  function next() {
    const required =
      step === 0
        ? ["fullName", "email"]
        : step === 1
          ? ["storeName", "region"]
          : [];
    if (required.some((key) => !values[key]?.trim())) {
      setError("Complete the required fields before continuing.");
      return;
    }
    if (step === 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      setError("Enter a valid owner email address.");
      return;
    }
    if (step === 0 && values.password && values.password.length < 12) {
      setError("Use at least 12 characters for the temporary password.");
      return;
    }
    setError("");
    setStep((s) => s + 1);
  }
  const field = (
    key: string,
    label: string,
    type = "text",
    required = false,
  ) => (
    <label className="admin-field" key={key}>
      <span className="admin-field-label">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        className="admin-input"
        type={type}
        autoComplete={type === "password" ? "new-password" : "off"}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "any" : undefined}
        value={values[key] || ""}
        onChange={(e) => set(key, e.target.value)}
        placeholder={
          key === "password" ? "Leave empty to generate securely" : undefined
        }
      />
    </label>
  );
  return (
    <div>
      {error && (
        <p className="admin-alert" role="alert">
          {error}
        </p>
      )}
      {mode === "single" && !result && (
        <section className="admin-panel max-w-4xl">
          <div className="mb-6">
            <h2 className="admin-panel-title">
              One business. One guided setup.
            </h2>
            <p className="admin-muted mt-2">
              Create the owner, store and first offering together. Add galleries
              and fine-tune the storefront after setup.
            </p>
          </div>
          <ol className="mb-7 grid grid-cols-4 gap-2">
            {steps.map((item, index) => (
              <li
                key={item.name}
                className={`rounded-xl p-3 text-center ${step === index ? "bg-[#1d4547] text-white" : step > index ? "bg-[#e9f3ee] text-[#3d7158]" : "bg-[#f1f4f4] text-[#819197]"}`}
              >
                <span className="mx-auto mb-2 flex h-6 items-center justify-center">
                  {step > index ? <Check size={18} /> : <item.icon size={18} />}
                </span>
                <span className="text-[10px] font-semibold sm:text-xs">
                  {item.name}
                </span>
              </li>
            ))}
          </ol>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (step < 3) next();
              else void run([values]);
            }}
          >
            <fieldset disabled={busy}>
              {step === 0 && (
                <div className="admin-form-grid">
                  {field("fullName", "Owner's full name", "text", true)}
                  {field("email", "Email address", "email", true)}
                  {field("phone", "Phone number", "tel")}
                  {field("password", "Temporary password", "password")}
                  <p className="admin-field-help admin-full">
                    The account is created as a vendor. Existing vendor emails
                    reuse their account without changing their password. No
                    welcome email is sent automatically.
                  </p>
                </div>
              )}
              {step === 1 && (
                <div className="admin-form-grid">
                  {field("storeName", "Store name", "text", true)}
                  {field("storeSlug", "Store URL name")}
                  <label className="admin-field">
                    <span className="admin-field-label">Category *</span>
                    <select
                      className="admin-input"
                      value={values.categoryId}
                      onChange={(e) => set("categoryId", e.target.value)}
                    >
                      {STORE_CATEGORIES.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-field">
                    <span className="admin-field-label">Town / region *</span>
                    <select
                      className="admin-input"
                      value={values.region || ""}
                      onChange={(e) => set("region", e.target.value)}
                    >
                      <option value="">Choose a location</option>
                      {TT_REGIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-field admin-full">
                    <span className="admin-field-label">
                      About the business
                    </span>
                    <textarea
                      className="admin-input"
                      rows={4}
                      value={values.storeDescription || ""}
                      onChange={(e) => set("storeDescription", e.target.value)}
                    />
                  </label>
                  <p className="admin-field-help admin-full">
                    New storefronts start as drafts. Review branding, contact
                    details and opening hours before publishing.
                  </p>
                </div>
              )}
              {step === 2 && (
                <div className="admin-form-grid">
                  <p className="admin-muted admin-full">
                    Optional: add one product or service now. Leave the name
                    empty to skip this step.
                  </p>
                  <label className="admin-field">
                    <span className="admin-field-label">Offering type</span>
                    <select
                      className="admin-input"
                      value={values.itemType}
                      onChange={(e) => set("itemType", e.target.value)}
                    >
                      <option value="product">Product</option>
                      <option value="service">Service · quote-based</option>
                    </select>
                  </label>
                  {field("itemName", "Offering name")}
                  {field("price", "Price (TTD)", "number")}
                  {values.itemType === "product" &&
                    field("stock", "Available stock", "number")}
                  <label className="admin-field admin-full">
                    <span className="admin-field-label">Description</span>
                    <textarea
                      className="admin-input"
                      rows={4}
                      value={values.itemDescription || ""}
                      onChange={(e) => set("itemDescription", e.target.value)}
                    />
                  </label>
                  <p className="admin-field-help admin-full">
                    The offering starts as a draft. For services, you can choose
                    another service model in the full editor after setup.
                  </p>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="admin-context">
                    <ClipboardCheck size={21} />
                    <strong>Review this setup before creating it</strong>
                  </div>
                  {[
                    {
                      label: "Owner account",
                      value: `${values.fullName} · ${values.email}`,
                      note: "Vendor access",
                    },
                    {
                      label: "Storefront",
                      value: values.storeName,
                      note: `${values.region} · Draft`,
                    },
                    {
                      label: "First offering",
                      value: values.itemName || "Add one later",
                      note: values.itemName
                        ? `TTD ${Number(values.price || 0).toFixed(2)} · Draft`
                        : "No item will be created",
                    },
                  ].map((row) => (
                    <div
                      className="rounded-xl border border-zinc-200 p-4"
                      key={row.label}
                    >
                      <p className="admin-eyebrow">{row.label}</p>
                      <p className="break-words font-semibold">{row.value}</p>
                      <p className="admin-muted mt-1">{row.note}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-7 flex items-center justify-between border-t border-zinc-100 pt-5">
                <button
                  type="button"
                  disabled={step === 0 || busy}
                  className="admin-button"
                  onClick={() => {
                    setStep((s) => s - 1);
                    setError("");
                  }}
                >
                  <ArrowLeft size={15} />
                  Back
                </button>
                <button
                  className="admin-button admin-button-primary"
                  disabled={busy}
                >
                  {busy
                    ? "Creating business…"
                    : step === 3
                      ? "Create vendor & store"
                      : "Continue"}
                  <ArrowRight size={15} />
                </button>
              </div>
            </fieldset>
          </form>
        </section>
      )}
      {mode === "csv" && !result && (
        <section className="admin-panel">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="admin-panel-title">Bring your vendors with you</h2>
              <p className="admin-muted mt-2 max-w-xl">
                Upload up to 500 rows. Repeat a vendor email to add more
                offerings to their store. Review the file before running the
                import.
              </p>
            </div>
            <button
              type="button"
              className="admin-button"
              onClick={() => download([], "linkwe-vendor-template.csv")}
            >
              <Download size={16} />
              Download template
            </button>
          </div>
          <label className="admin-upload mt-6 min-h-36">
            <FileUp size={26} />
            <span>
              Choose a CSV file
              <small className="mt-1 block text-[10px]">
                Names, emails, stores and optional first offerings
              </small>
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setError("");
                setRows([]);
                setFileName(file.name);
                if (file.size > 2 * 1024 * 1024) {
                  setError("Use a CSV smaller than 2 MB.");
                  return;
                }
                Papa.parse<OnboardingRow>(file, {
                  header: true,
                  skipEmptyLines: "greedy",
                  complete: (data) => {
                    if (data.errors.length) {
                      setError(
                        `The CSV has a formatting issue: ${data.errors[0].message}`,
                      );
                      return;
                    }
                    if (data.data.length > 500) {
                      setError("Import up to 500 rows at a time.");
                      return;
                    }
                    const missing = ["fullName", "email", "storeName"].filter(
                      (key) => !data.meta.fields?.includes(key),
                    );
                    if (missing.length) {
                      setError(
                        `Missing columns: ${missing.join(", ")}. Use the template headings.`,
                      );
                      return;
                    }
                    setRows(data.data);
                  },
                  error: () => setError("This CSV could not be read."),
                });
              }}
            />
          </label>
          {rows.length > 0 && (
            <>
              <div className="my-5 flex flex-wrap gap-3">
                <span className="admin-badge">{fileName}</span>
                <span className="admin-badge">{rows.length} rows</span>
                <span className="admin-badge">
                  {
                    new Set(rows.map((row) => String(row.email).toLowerCase()))
                      .size
                  }{" "}
                  vendor emails
                </span>
                <span className="admin-badge admin-badge-orange">
                  {
                    rows.filter(
                      (row) =>
                        ["ACTIVE", "PENDING_APPROVAL"].includes(
                          String(row.storeStatus).toUpperCase(),
                        ) || String(row.publish).toLowerCase() === "true",
                    ).length
                  }{" "}
                  rows request publication / approval
                </span>
              </div>
              <div className="max-h-80 overflow-auto rounded-xl border border-zinc-200">
                <table className="w-full min-w-[650px] text-left text-xs">
                  <thead className="sticky top-0 bg-[#eef4f3]">
                    <tr>
                      {[
                        "Row",
                        "Owner",
                        "Email",
                        "Store",
                        "Offering",
                        "Publication",
                      ].map((title) => (
                        <th key={title} className="p-3">
                          {title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={index} className="border-t border-zinc-100">
                        <td className="p-3">{index + 2}</td>
                        <td className="p-3">{row.fullName}</td>
                        <td className="p-3">{row.email}</td>
                        <td className="p-3">{row.storeName}</td>
                        <td className="p-3">{row.itemName || "—"}</td>
                        <td className="p-3">
                          {row.storeStatus || "DRAFT"} /{" "}
                          {String(row.publish || "false")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="admin-muted my-4">
                Existing accounts and stores are retained. Matching offering
                names in the same store are skipped to make retries safer. New
                records use the publication settings in your file.
              </p>
              <button
                className="admin-button admin-button-primary"
                disabled={busy}
                onClick={() => void run(rows)}
              >
                <Check size={16} />
                {busy
                  ? "Importing vendors…"
                  : `Import these ${rows.length} rows`}
              </button>
            </>
          )}
        </section>
      )}
      {result && (
        <section className="admin-panel">
          <p className="admin-eyebrow">Setup complete</p>
          <h2 className="admin-panel-title">
            {result.errors.length
              ? "Some records need a second look"
              : "Your new records are ready to manage"}
          </h2>
          <div className="my-5 flex flex-wrap gap-2">
            <span className="admin-badge">
              {result.createdUsers} accounts created
            </span>
            <span className="admin-badge">
              {result.createdStores} stores created
            </span>
            <span className="admin-badge">
              {result.createdItems} offerings created
            </span>
          </div>
          {result.accounts?.map((account) => (
            <div key={account.storeId} className="admin-context">
              <strong>{account.storeName}</strong>
              <Link href={`/dashboard/admin/records/store/${account.storeId}`}>
                Complete storefront →
              </Link>
              <Link href={`/dashboard/admin/records/user/${account.userId}`}>
                Edit owner
              </Link>
              <Link
                href={`/dashboard/admin/products?storeId=${account.storeId}`}
              >
                Products
              </Link>
              <Link
                href={`/dashboard/admin/services?storeId=${account.storeId}`}
              >
                Services
              </Link>
            </div>
          ))}
          {result.credentials.length > 0 && (
            <div className="rounded-xl bg-[#f3f7f6] p-4">
              <button
                className="admin-button"
                type="button"
                onClick={() => setShowCredentials((v) => !v)}
              >
                <Eye size={15} />
                {showCredentials ? "Hide" : "Show"} temporary credentials
              </button>
              <p className="admin-muted mt-2">
                Share securely. These credentials will disappear when you leave
                this page.
              </p>
              {showCredentials &&
                result.credentials.map((credential) => (
                  <p
                    className="mt-3 break-all font-mono text-xs"
                    key={credential.email}
                  >
                    {credential.email} — {credential.password}
                  </p>
                ))}
            </div>
          )}
          {result.errors.length > 0 && (
            <div role="alert" className="admin-alert mt-5">
              <strong>Review these rows before importing them again:</strong>
              <ul>
                {result.errors.map((row, index) => (
                  <li key={index}>
                    Row {row.row}: {row.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            type="button"
            className="admin-button mt-5"
            onClick={() => {
              setResult(null);
              setRows([]);
              setFileName("");
              setStep(0);
              setValues({
                categoryId: "other",
                storeStatus: "DRAFT",
                itemType: "product",
                publish: "false",
              });
            }}
          >
            Start another setup
          </button>
        </section>
      )}
    </div>
  );
}
