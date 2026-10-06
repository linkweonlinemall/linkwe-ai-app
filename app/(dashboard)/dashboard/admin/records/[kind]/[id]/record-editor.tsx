"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Save,
  FileText,
  Images,
  Wallet,
  MapPin,
  Settings2,
  Clock3,
  Eye,
  Users,
  ListChecks,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import {
  saveAdminEditableRecord,
  type AdminRecordWorkspace,
} from "@/app/actions/admin-records";
import type { RecordKind } from "@/lib/admin/record-fields";
import {
  FIELD_HELP,
  RECORD_SECTIONS,
  humanLabel,
  optionLabel,
  recordListHref,
  type RecordField,
} from "@/lib/admin/record-design";
import {
  PRODUCT_CATEGORIES,
  SERVICE_CATEGORIES,
  STORE_CATEGORIES,
} from "@/lib/categories";
import { TT_REGIONS } from "@/lib/regions/tt-regions";
import { SUBSCRIPTION_INTERVAL_KEYS } from "@/lib/finance/subscription-interval";
import RichTextEditor from "@/components/ui/RichTextEditor";
import SearchableSelect from "@/components/admin/SearchableSelect";
import { useStudioRex } from "@/components/admin/rex/StudioRexProvider";
import { objectParameters, validateStudioPatch, studioReviewValue, redactStudioSecrets } from "@/lib/admin/studio-rex";
import {
  MediaEditor,
  StringListEditor,
  HoursEditor,
  SocialEditor,
  QuestionsEditor,
  BankEditor,
  VariantsEditor,
  PropertiesEditor,
  DAYS,
} from "../../../components/record-widgets";
import AdminPageHeader from "../../../components/admin-page-header";

function initialValues(fields: RecordField[]): Record<string, unknown> {
  return Object.fromEntries(
    fields.map((f) => [
      f.name,
      f.type === "DateTime" && f.value
        ? localDate(String(f.value))
        : f.name === "priceMinor" && f.value != null
          ? Number(f.value) / 100
          : (f.value ?? (f.type === "Boolean" ? false : f.list ? [] : "")),
    ]),
  );
}
function localDate(raw: string) {
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
const icons: Record<string, typeof FileText> = {
  media: Images,
  pricing: Wallet,
  bank: Wallet,
  location: MapPin,
  delivery: MapPin,
  hours: Clock3,
  booking: Clock3,
  visibility: Eye,
  access: ShieldCheck,
  profile: Users,
  checkout: ListChecks,
  experience: ListChecks,
};
export default function RecordEditor({
  kind,
  id,
  workspace,
  prefill,
}: {
  kind: RecordKind;
  id: string;
  workspace: AdminRecordWorkspace;
  prefill?: string;
}) {
  const router = useRouter();
  const isNew = id === "new";
  const form = useRef<HTMLFormElement>(null);
  const starting = useMemo(
    () => ({
      ...initialValues(workspace.fields),
      ...(prefill && isNew && kind !== "user"
        ? { [kind === "store" ? "ownerId" : "storeId"]: prefill }
        : {}),
    }),
    [workspace.fields, prefill, isNew, kind],
  );
  const [values, setValues] = useState<Record<string, unknown>>(starting);
  const [baseline, setBaseline] = useState<Record<string, unknown>>(starting);
  const [busy, setBusy] = useState(false);
  const [uploads, setUploads] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState(
    RECORD_SECTIONS[kind][0].id,
  );
  const changed = Object.keys(values).filter(
    (key) => JSON.stringify(values[key]) !== JSON.stringify(baseline[key]),
  );
  const dirty = changed.length > 0;
  const sections = RECORD_SECTIONS[kind].filter(
    (section) =>
      (!section.serviceTypes ||
        section.serviceTypes.includes(String(values.serviceType))) &&
      (section.id !== "bank" || values.role === "VENDOR"),
  );
  function update(key: string, value: unknown) {
    setSaved(false);
    setValues((previous) => {
      const next = { ...previous, [key]: value };
      if (
        isNew &&
        ["name", "title"].includes(key) &&
        (!previous.slug ||
          previous.slug ===
            String(previous[key] || "")
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, ""))
      )
        next.slug = String(value)
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
      return next;
    });
    setErrors((previous) => {
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }
  useEffect(() => {
    if (!dirty || busy) return;
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const navigate = (event: MouseEvent) => {
      const link = (event.target as Element).closest("a");
      if (
        !link ||
        link.target === "_blank" ||
        link.hasAttribute("download") ||
        !link.getAttribute("href") ||
        link.getAttribute("href")?.startsWith("#")
      )
        return;
      if (
        link.href !== window.location.href &&
        !window.confirm(
          "You have unsaved changes. Leave this record without saving?",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty, busy]);
  useEffect(() => {
    const keyboard = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!busy && !uploads) form.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [busy, uploads]);
  const requiredMissing = workspace.fields.filter(
    (f) =>
      f.required &&
      !f.readonly &&
      !f.list &&
      f.type !== "Boolean" &&
      (values[f.name] === "" || values[f.name] == null),
  );
  const onUploadBusy = (pending: boolean) =>
    setUploads((count) => Math.max(0, count + (pending ? 1 : -1)));
  async function save() {
    if (busy || uploads || (!isNew && !dirty)) return;
    setBusy(true);
    setError("");
    setErrors({});
    try {
      const payload = Object.fromEntries(
        workspace.fields
          .filter((f) => !f.readonly && (isNew || changed.includes(f.name)))
          .map((f) => [
            f.name,
            f.type === "DateTime" && values[f.name]
              ? new Date(String(values[f.name])).toISOString()
              : f.name === "priceMinor" && values[f.name] !== ""
                ? Math.round(Number(values[f.name]) * 100)
                : values[f.name],
          ]),
      );
      // Hidden optional forms stay absent when creating, so no empty payout or subtype records are fabricated.
      if (isNew && (!values.bankDetails || values.role !== "VENDOR"))
        delete payload.bankDetails;
      if (isNew && !values.listingDetails) delete payload.listingDetails;
      const result = await saveAdminEditableRecord(
        kind,
        id,
        payload,
        workspace.version,
      );
      if (result.error) {
        setError(result.error);
        setErrors(result.fieldErrors || {});
        setTimeout(
          () => document.getElementById("admin-save-errors")?.focus(),
          30,
        );
        return result;
      }
      setBaseline({ ...values });
      setSaved(true);
      toast.success(isNew ? `${humanLabel(kind)} created` : "Changes saved");
      if (isNew && result.id)
        router.replace(`/dashboard/admin/records/${kind}/${result.id}`);
      else router.refresh();
      return result;
    } catch {
      setError(
        "The save did not complete. Your changes are still here. Please try again.",
      );
      return { error: "The save did not complete. Your changes are still here." };
    } finally {
      setBusy(false);
    }
  }
  const rexWorking = useStudioRex({
    key: `record:${kind}:${id}`, title: `${isNew ? "Create" : "Edit"} ${kind}`,
    state: { kind, id, values: redactStudioSecrets(values), changed, errors, error, fields: workspace.fields.map(field => ({ name: field.name, type: field.type, required: field.required, list: field.list, readonly: field.readonly, options: field.options, label: humanLabel(field.name), help: FIELD_HELP[field.name] })), detailFields: workspace.detailFields, users: workspace.users, stores: workspace.stores, sections: sections.map(section => ({ id: section.id, title: section.title })), publicHref: workspace.publicHref },
    busy: busy || uploads > 0,
    canLeave: () => !dirty,
    actions: [
      { name: "record_edit", description: "Set any editable fields in the current form, including descriptions, photos, variations, hours, nested details and publication controls. Changes are staged, not saved. Use complete arrays retaining existing IDs. Dates use the form's local time and priceMinor is displayed in TTD. Passwords must be entered privately in the form.", parameters: objectParameters({ patch: { type: "object" } }, ["patch"]) },
      { name: "record_save", description: "Review and save/create the current record using the form's own validation. Staged edits must already be applied. Shows an exact review before saving.", parameters: objectParameters() },
      { name: "record_reset", description: "Review and discard unsaved form edits, restoring the last saved values.", parameters: objectParameters() },
      { name: "record_focus", description: "Open a form section or focus a particular field, including a private credential field the user needs to enter.", parameters: objectParameters({ field: { type: "string" }, section: { type: "string" } }) },
      { name: "record_choose_photos", description: "Open a photo field's device file picker so the user can select files. Images must come from their selection. Stop and wait afterward.", parameters: objectParameters({ field: { type: "string", enum: ["images", "logoUrl", "coverPhotoUrl", "imageUrl", "storeGallery", "variants"] }, index: { type: "integer", minimum: 0, description: "For variations, the zero-based variation photo picker index." } }, ["field"]) },
      { name: "record_preview", description: "Open the saved record on the marketplace when a public preview link is available.", parameters: objectParameters() },
    ],
    review: ({ action }) => {
      if (!["record_save", "record_reset"].includes(action)) return null;
      const keys = isNew && action === "record_save" ? Object.keys(values).filter(key => values[key] !== "" && values[key] != null) : changed;
      return { title: action === "record_reset" ? "Discard these unsaved edits?" : isNew ? `Create this ${kind}?` : `Save changes to ${workspace.title}?`, description: action === "record_reset" ? "The fields below will return to their last saved values." : "Review the current form details. Publication and access settings shown here will take effect when saved.", fields: keys.map(key => ({ label: humanLabel(key), value: /password|bankDetails|accountNumber/i.test(key) ? "Private value entered in the form" : studioReviewValue(action === "record_reset" ? baseline[key] : values[key]) })) };
    },
    run: async ({ action, args }) => {
      if (action === "record_edit") {
        const patch = validateStudioPatch(args.patch, workspace.fields.filter(field => !field.readonly && field.type !== "Password").map(field => field.name));
        Object.entries(patch).forEach(([key, value]) => update(key, value));
        return { message: `Updated ${Object.keys(patch).map(humanLabel).join(", ")} in the form. Changes are not saved yet.` };
      }
      if (action === "record_save") {
        if (!isNew && !dirty) return { message: "This record is already up to date." };
        const result = await save();
        if (!result || result.error) throw new Error(result?.error || "Wait for the current save or upload to finish.");
        return { message: isNew ? `${humanLabel(kind)} created successfully.` : "Your changes were saved.", ...(isNew && result.id ? { waitFor: `record:${kind}:${result.id}` } : {}) };
      }
      if (action === "record_reset") { setValues({ ...baseline }); setErrors({}); setError(""); setResetKey(key => key + 1); return { message: "Restored the last saved form values." }; }
      if (action === "record_preview") {
        if (!workspace.publicHref) throw new Error("Save this record before opening its marketplace page.");
        window.open(workspace.publicHref, "_blank", "noopener,noreferrer"); return { message: "Opened the saved marketplace page.", stop: true };
      }
      if (action === "record_choose_photos") {
        const pickers = document.getElementById(`field-wrap-${args.field}`)?.querySelectorAll<HTMLInputElement>('input[type="file"]');
        const input = pickers?.[Number(args.index) || 0];
        if (!input) throw new Error("That photo field is not available in this editor."); input.closest(".admin-field")?.scrollIntoView({ behavior: "smooth", block: "center" }); input.click(); return { message: "The photo upload area is ready. Choose your photos there; they will appear in the form after uploading.", stop: true };
      }
      const target = args.field ? document.getElementById(`field-wrap-${args.field}`) : document.getElementById(`section-${args.section}`);
      if (!target) throw new Error("Choose a visible field or section."); target.scrollIntoView({ behavior: "smooth", block: "center" }); target.querySelector<HTMLElement>('input,textarea,select,[contenteditable="true"]')?.focus();
      return { message: `Opened ${humanLabel(String(args.field || args.section))}.`, stop: true };
    },
  });
  function fieldControl(field: RecordField, nested = false) {
    const key = field.name,
      val = values[key];
    const common = {
      id: `field-${key}`,
      className: "admin-input",
      value: String(val ?? ""),
      "aria-invalid": !!errors[key],
      "aria-describedby": errors[key]
        ? `error-${key}`
        : FIELD_HELP[key]
          ? `help-${key}`
          : undefined,
      disabled: busy || field.readonly,
      onChange: (
        e: React.ChangeEvent<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
      ) => update(key, e.target.value),
    };
    if (
      [
        "images",
        "logoUrl",
        "coverPhotoUrl",
        "imageUrl",
        "storeGallery",
      ].includes(key)
    )
      return (
        <MediaEditor
          label={humanLabel(key)}
          single={!field.list}
          value={val}
          onChange={(v) => update(key, v)}
          onBusy={onUploadBusy}
        />
      );
    if (key === "openingHours")
      return <HoursEditor value={val} onChange={(v) => update(key, v)} />;
    if (key === "socialLinks")
      return <SocialEditor value={val} onChange={(v) => update(key, v)} />;
    if (key === "checkoutFields")
      return <QuestionsEditor value={val} onChange={(v) => update(key, v)} />;
    if (key === "bankDetails")
      return <BankEditor value={val} onChange={(v) => update(key, v)} />;
    if (key === "variants")
      return (
        <VariantsEditor
          value={val}
          onChange={(v) => update(key, v)}
          onBusy={onUploadBusy}
        />
      );
    if (key === "listingDetails") {
      const detail = (val || {}) as Record<string, unknown>;
      const fields = workspace.detailFields[String(values.type)] || [];
      return (
        <div className="admin-form-grid">
          {fields.map((f) => (
            <label
              className={`admin-field ${f.type === "Json" ? "admin-full" : ""}`}
              key={f.name}
            >
              <span className="admin-field-label">
                {humanLabel(f.name)}
                {f.required ? " *" : ""}
              </span>
              {f.type === "Json" ? (
                <PropertiesEditor
                  value={detail[f.name]}
                  onChange={(v) => update(key, { ...detail, [f.name]: v })}
                />
              ) : f.type === "Boolean" ? (
                <input
                  type="checkbox"
                  checked={
                    detail[f.name] == null ? !!f.value : !!detail[f.name]
                  }
                  onChange={(e) =>
                    update(key, { ...detail, [f.name]: e.target.checked })
                  }
                />
              ) : f.options ? (
                <select
                  className="admin-input"
                  value={String(detail[f.name] ?? f.value ?? "")}
                  onChange={(e) =>
                    update(key, { ...detail, [f.name]: e.target.value })
                  }
                >
                  {!f.required && <option value="">Not set</option>}
                  {f.options.map((o) => (
                    <option value={o} key={o}>
                      {optionLabel(o)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="admin-input"
                  type={
                    ["Int", "Float", "Decimal"].includes(f.type)
                      ? "number"
                      : f.type === "DateTime"
                        ? "datetime-local"
                        : "text"
                  }
                  step={f.type === "Int" ? 1 : "any"}
                  value={
                    f.type === "DateTime" && detail[f.name]
                      ? localDate(String(detail[f.name]))
                      : String(detail[f.name] ?? f.value ?? "")
                  }
                  onChange={(e) =>
                    update(key, {
                      ...detail,
                      [f.name]:
                        f.type === "DateTime" && e.target.value
                          ? new Date(e.target.value).toISOString()
                          : e.target.value,
                    })
                  }
                />
              )}
            </label>
          ))}
        </div>
      );
    }
    if (key === "onboardingStep")
      return (
        <select {...common}>
          {[
            "Not started",
            "Owner details complete",
            "Store profile complete",
            "Verification submitted",
            "Setup complete",
          ].map((label, index) => (
            <option value={index} key={index}>
              {label}
            </option>
          ))}
        </select>
      );
    if (key === "ownerId" || key === "storeId")
      return (
        <>
          <SearchableSelect label={humanLabel(key)} value={String(val || "")} disabled={busy || !!field.readonly || rexWorking} onChange={value => update(key, value)} options={key === "ownerId" ? workspace.users.map(user => ({ value: user.id, label: user.fullName, detail: user.email })) : workspace.stores.map(store => ({ value: store.id, label: store.name }))} placeholder={key === "ownerId" ? "Find an owner…" : "Find a store…"}/>
          {key === "ownerId" && (
            <p className="admin-field-help">
              Only active people without a store are listed.{" "}
              <Link
                href="/dashboard/admin/records/user/new?role=VENDOR"
                className="underline"
              >
                Create an owner account first
              </Link>
              .
            </p>
          )}
        </>
      );
    if (key === "availableDays")
      return (
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => (
            <label
              key={day}
              className="flex min-h-11 items-center gap-2 rounded-lg border border-zinc-200 px-3 text-xs"
            >
              <input
                type="checkbox"
                checked={Array.isArray(val) && val.includes(day)}
                onChange={(e) =>
                  update(
                    key,
                    e.target.checked
                      ? [...(Array.isArray(val) ? val : []), day]
                      : (Array.isArray(val) ? val : []).filter(
                          (v) => v !== day,
                        ),
                  )
                }
              />
              {humanLabel(day)}
            </label>
          ))}
        </div>
      );
    if (field.list)
      return (
        <StringListEditor
          label={humanLabel(key)}
          value={val}
          onChange={(v) => update(key, v)}
        />
      );
    const options =
      key === "categoryId"
        ? STORE_CATEGORIES
        : key === "category"
          ? kind === "service"
            ? SERVICE_CATEGORIES
            : PRODUCT_CATEGORIES
          : key === "region"
            ? TT_REGIONS
            : key === "subscriptionInterval"
              ? SUBSCRIPTION_INTERVAL_KEYS.map((v) => ({
                  value: v,
                  label: optionLabel(v),
                }))
              : field.options
                  ?.filter((v) => v !== "COURIER" || val === "COURIER")
                  .map((v) => ({ value: v, label: optionLabel(v) }));
    if (options)
      return (
        <select {...common}>
          <option value="">Choose an option</option>
          {!!val && !options.some((o) => o.value === val) && (
            <option value={String(val)}>{String(val)} (current)</option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    if (key === "description" && !nested)
      return (
        <RichTextEditor
          key={`${key}-${resetKey}`}
          name={key}
          id={`field-${key}`}
          label={humanLabel(key)}
          value={String(val || "")}
          disabled={busy || uploads > 0 || rexWorking}
          maxLength={30000}
          onChange={(html) => update(key, html)}
          placeholder={`Tell customers about this ${kind}…`}
        />
      );
    if (field.type === "Json")
      return <PropertiesEditor value={val} onChange={(v) => update(key, v)} />;
    if (/description|policies|Policy|MeetingInfo/.test(key))
      return <textarea {...common} rows={4} />;
    return (
      <input
        {...common}
        autoComplete={
          field.type === "Password"
            ? "new-password"
            : key === "email"
              ? "off"
              : undefined
        }
        type={
          field.type === "Password"
            ? "password"
            : field.type === "DateTime"
              ? "datetime-local"
              : ["availableFrom", "availableTo"].includes(key)
                ? "time"
                : key === "email"
                  ? "email"
                  : key === "phone"
                    ? "tel"
                    : ["Int", "Float", "Decimal"].includes(field.type)
                      ? "number"
                      : "text"
        }
        step={field.type === "Int" && key !== "priceMinor" ? 1 : "any"}
        min={
          ["latitude", "longitude"].includes(key)
            ? undefined
            : ["Int", "Float", "Decimal"].includes(field.type)
              ? 0
              : undefined
        }
      />
    );
  }
  return (
    <div className="admin-page">
      <Link
        href={recordListHref(kind)}
        className="mb-5 inline-flex min-h-8 items-center gap-2 text-xs text-[#6a8089]"
      >
        <ArrowLeft size={15} />
        Back to {kind === "user" ? "people" : `${kind}s`}
      </Link>
      <AdminPageHeader
        eyebrow={isNew ? "Creation Studio" : "Record workspace"}
        title={
          isNew
            ? `Create ${kind === "user" ? "a person / vendor" : `a ${kind}`}`
            : workspace.title
        }
        description={
          isNew
            ? "Complete the sections below, then save when you are ready. Required fields are marked with an asterisk."
            : `Manage this ${kind} in one place. Only the fields you change will be updated.`
        }
      >
        {workspace.publicHref && (
          <Link
            href={workspace.publicHref}
            target="_blank"
            className="admin-button"
          >
            <Eye size={16} />
            View on site
            <ArrowUpRight size={14} />
          </Link>
        )}
      </AdminPageHeader>
      {workspace.links.length > 0 && (
        <div className="admin-context">
          <span>Connected to</span>
          {workspace.links.map((link) => (
            <Link href={link.href} key={link.href}>
              {link.label}
              <ArrowUpRight size={12} className="ml-1 inline" />
            </Link>
          ))}
        </div>
      )}
      {workspace.verification && (
        <div className="mb-5 flex flex-wrap gap-2">
          <span className="admin-badge">
            Email{" "}
            {workspace.verification.emailVerified ? "verified" : "not verified"}
          </span>
          <span className="admin-badge">
            Identity: {optionLabel(workspace.verification.identity)}
          </span>
          <Link
            href="/dashboard/admin/verification"
            className="px-2 py-1 text-xs text-orange-700 underline"
          >
            Review verification evidence
          </Link>
        </div>
      )}
      <form
        ref={form}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!rexWorking) void save();
        }}
      >
        <fieldset disabled={busy || uploads > 0 || rexWorking} className="min-w-0">
          {error && (
            <div
              id="admin-save-errors"
              className="admin-alert"
              role="alert"
              tabIndex={-1}
            >
              <strong>Some details need attention.</strong>
              <p>{error}</p>
              {Object.entries(errors).length > 0 && (
                <ul className="mt-2 space-y-1">
                  {Object.entries(errors).map(([key, message]) => (
                    <li key={key}>
                      <a href={`#field-wrap-${key}`}>
                        {humanLabel(key)}: {message}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="admin-editor-layout">
            <aside className="admin-editor-nav" aria-label="Record sections">
              <p>In this record</p>
              {sections.map((section) => {
                const Icon = icons[section.id] || FileText;
                return (
                  <a
                    key={section.id}
                    href={`#section-${section.id}`}
                    onClick={() => setActiveSection(section.id)}
                    aria-current={
                      activeSection === section.id ? "location" : undefined
                    }
                  >
                    <Icon size={15} />
                    {section.title}
                    <small>
                      {
                        section.fields.filter((key) =>
                          workspace.fields.some((f) => f.name === key),
                        ).length
                      }
                    </small>
                  </a>
                );
              })}
              <div className="admin-editor-summary">
                <p className="admin-muted">
                  {isNew
                    ? requiredMissing.length
                      ? `${requiredMissing.length} required fields to complete`
                      : "Required details complete"
                    : dirty
                      ? `${changed.length} field${changed.length === 1 ? "" : "s"} changed`
                      : "All changes saved"}
                </p>
                <p className="mt-2 text-[10px] text-zinc-400">
                  ⌘ / Ctrl + S to save
                </p>
              </div>
            </aside>
            <div className="min-w-0">
              {sections.map((section) => {
                const Icon = icons[section.id] || Settings2;
                return (
                  <section
                    className="admin-form-section"
                    id={`section-${section.id}`}
                    key={section.id}
                  >
                    <div className="admin-form-section-heading">
                      <span>
                        <Icon size={19} />
                      </span>
                      <div>
                        <h2>{section.title}</h2>
                        <p>{section.description}</p>
                      </div>
                    </div>
                    <div className="admin-form-grid">
                      {section.fields.map((key) => {
                        const f = workspace.fields.find(
                          (field) => field.name === key,
                        );
                        if (!f) return null;
                        if (key === "variants" && !values.hasVariants)
                          return null;
                        const full =
                          f.list ||
                          f.type === "Json" ||
                          [
                            "description",
                            "shortDescription",
                            "policies",
                            "returnPolicy",
                            "metaDescription",
                            "virtualMeetingInfo",
                          ].includes(key);
                        return (
                          <div
                            id={`field-wrap-${key}`}
                            className={`admin-field ${full ? "admin-full" : ""}`}
                            key={key}
                            style={{ scrollMarginTop: 100 }}
                          >
                            {f.type === "Boolean" ? (
                              <label
                                className="admin-switch"
                                htmlFor={`field-${key}`}
                              >
                                <span>
                                  <span className="admin-field-label block">
                                    {humanLabel(key)}
                                  </span>
                                  {FIELD_HELP[key] && (
                                    <span className="admin-field-help mt-1 block">
                                      {FIELD_HELP[key]}
                                    </span>
                                  )}
                                </span>
                                <input
                                  id={`field-${key}`}
                                  type="checkbox"
                                  checked={!!values[key]}
                                  onChange={(e) =>
                                    update(key, e.target.checked)
                                  }
                                  aria-invalid={!!errors[key]}
                                />
                              </label>
                            ) : (
                              <>
                                <label
                                  className="admin-field-label"
                                  htmlFor={`field-${key}`}
                                >
                                  {humanLabel(key)}
                                  {f.required && !f.list && (
                                    <span className="ml-1 text-[#c44214]">
                                      *
                                    </span>
                                  )}
                                  {f.readonly && (
                                    <span className="ml-2 text-[10px] font-normal text-zinc-400">
                                      Fixed for this record
                                    </span>
                                  )}
                                </label>
                                {fieldControl(f)}
                                {FIELD_HELP[key] && (
                                  <p
                                    className="admin-field-help"
                                    id={`help-${key}`}
                                  >
                                    {FIELD_HELP[key]}
                                  </p>
                                )}
                              </>
                            )}
                            {errors[key] && (
                              <p
                                className="admin-field-error"
                                id={`error-${key}`}
                              >
                                {errors[key]}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
              {workspace.billing && (
                <section className="admin-form-section">
                  <div className="flex items-start gap-3">
                    <Wallet size={21} className="text-orange-600" />
                    <div>
                      <h2 className="admin-panel-title">
                        Subscription & finance
                      </h2>
                      <p className="admin-muted mt-2">
                        {optionLabel(workspace.billing.plan)} plan ·{" "}
                        {optionLabel(workspace.billing.status)}
                        {workspace.billing.renewsAt
                          ? ` · Renews ${new Date(workspace.billing.renewsAt).toLocaleDateString()}`
                          : ""}
                      </p>
                      <p className="admin-muted mt-2">
                        Manage charges, plan changes and payouts through the
                        finance workspace.
                      </p>
                      <Link
                        href="/dashboard/admin?tab=payouts"
                        className="admin-button mt-4"
                      >
                        Open finance
                        <ArrowUpRight size={15} />
                      </Link>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>
        </fieldset>
        <div className="admin-savebar">
          <div>
            <p className="flex items-center gap-2">
              {saved || (!dirty && !isNew) ? (
                <Check size={16} className="text-sky-600" />
              ) : null}
              {uploads
                ? "Uploading images…"
                : busy
                  ? "Saving your changes…"
                  : saved
                    ? "Changes saved"
                    : isNew
                      ? "Ready when you are"
                      : dirty
                        ? `${changed.length} unsaved change${changed.length === 1 ? "" : "s"}`
                        : "Up to date"}
            </p>
            <small>
              {isNew
                ? "Drafts remain private until published."
                : "Your existing customer history is preserved."}
            </small>
          </div>
          <div className="admin-savebar-actions">
            <button
              type="button"
              disabled={!dirty || busy || !!uploads || rexWorking}
              className="admin-button"
              onClick={() => {
                if (
                  window.confirm("Discard the unsaved changes to this form?")
                ) {
                  setValues({ ...baseline });
                  setErrors({});
                  setError("");
                  setResetKey((key) => key + 1);
                }
              }}
            >
              <RefreshCw size={14} />
              <span>Reset</span>
            </button>
            <button
              type="submit"
              disabled={busy || !!uploads || rexWorking || (!isNew && !dirty)}
              className="admin-button admin-button-primary"
            >
              <Save size={16} />
              {busy ? "Saving…" : isNew ? `Create ${kind}` : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
