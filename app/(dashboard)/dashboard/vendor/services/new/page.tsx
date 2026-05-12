"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createService } from "@/app/actions/services";
import { SERVICE_CATEGORIES } from "@/lib/categories";

const SERVICE_TYPES = [
  { value: "BOOKABLE", label: "Bookable", description: "Customer picks a date and time", icon: "📅" },
  { value: "QUOTE", label: "Quote-based", description: "Customer requests a quote first", icon: "💬" },
  { value: "SUBSCRIPTION", label: "Subscription", description: "Recurring weekly or monthly", icon: "🔄" },
  { value: "ON_DEMAND", label: "On Demand", description: "Customer requests immediately", icon: "⚡" },
  { value: "VIRTUAL", label: "Virtual", description: "Online via video call or link", icon: "💻" },
];

const SERVICE_LOCATIONS = [
  { value: "AT_VENDOR", label: "At my location", icon: "🏪" },
  { value: "AT_CUSTOMER", label: "At customer location", icon: "🏠" },
  { value: "VIRTUAL", label: "Online / Virtual", icon: "💻" },
  { value: "FLEXIBLE", label: "Flexible", icon: "📍" },
];

export default function NewServicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState("");
  const [serviceLocation, setServiceLocation] = useState("");
  const [requiresDeposit, setRequiresDeposit] = useState(false);
  const [paymentMode, setPaymentMode] = useState("CUSTOMER_CHOOSES");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("serviceType", serviceType);
    formData.set("serviceLocation", serviceLocation);
    formData.set("requiresDeposit", requiresDeposit ? "true" : "false");
    formData.set("bookingPaymentMode", paymentMode);
    const result = await createService(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/dashboard/vendor/services");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/dashboard/vendor/services"
          className="mb-4 inline-block text-sm font-medium text-zinc-500 hover:text-[#D4450A]"
        >
          ← Back to services
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">New Service</h1>
        <p className="mt-1 text-sm text-zinc-500">Create a service listing for your store</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Service Type */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-3 text-sm font-bold text-zinc-900">
            Service type <span className="text-[#D4450A]">*</span>
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SERVICE_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setServiceType(type.value)}
                className={`flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                  serviceType === type.value
                    ? "border-[#D4450A] bg-[#D4450A]/5"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                <span className="text-xl">{type.icon}</span>
                <div>
                  <p
                    className={`text-sm font-semibold ${
                      serviceType === type.value ? "text-[#D4450A]" : "text-zinc-900"
                    }`}
                  >
                    {type.label}
                  </p>
                  <p className="text-xs text-zinc-500">{type.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Basic Info */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-4 text-sm font-bold text-zinc-900">Basic information</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Service name <span className="text-[#D4450A]">*</span>
              </label>
              <input
                name="name"
                required
                placeholder="e.g. Box Braids, Home Cleaning, Guitar Lessons"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Description</label>
              <textarea
                name="description"
                rows={4}
                placeholder="Describe what the service includes, what to expect, any requirements..."
                className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Category</label>
              <select
                name="category"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
              >
                <option value="">Select a category</option>
                {SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Tags (comma separated)
              </label>
              <input
                name="tags"
                placeholder="e.g. braids, natural hair, protective styles"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-4 text-sm font-bold text-zinc-900">Pricing</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Price (TTD) <span className="text-[#D4450A]">*</span>
              </label>
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900">Require deposit</p>
                <p className="text-xs text-zinc-500">Customer pays a deposit to confirm booking</p>
              </div>
              <button
                type="button"
                onClick={() => setRequiresDeposit((v) => !v)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  requiresDeposit ? "bg-[#D4450A]" : "bg-zinc-200"
                }`}
              >
                <div
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    requiresDeposit ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            {requiresDeposit ? (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                  Deposit amount (TTD)
                </label>
                <input
                  name="depositAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
                />
              </div>
            ) : null}
          </div>
        </div>

        {(serviceType === "BOOKABLE" || serviceType === "VIRTUAL") ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <p className="mb-3 text-sm font-bold text-zinc-900">Payment preference</p>
            <div className="flex flex-col gap-2">
              {[
                {
                  value: "CUSTOMER_CHOOSES",
                  label: "Customer chooses",
                  description: "Show both pay online and pay on arrival options",
                  icon: "🔀",
                },
                {
                  value: "ONLINE_ONLY",
                  label: "Online payment only",
                  description: "Customer must pay via card to confirm booking",
                  icon: "💳",
                },
                {
                  value: "ON_ARRIVAL_ONLY",
                  label: "Pay on arrival only",
                  description: "Customer pays when they arrive — no online payment",
                  icon: "💵",
                },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPaymentMode(opt.value)}
                  className={`flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                    paymentMode === opt.value
                      ? "border-[#D4450A] bg-[#D4450A]/5"
                      : "border-zinc-200 bg-white hover:border-zinc-300"
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        paymentMode === opt.value ? "text-[#D4450A]" : "text-zinc-900"
                      }`}
                    >
                      {opt.label}
                    </p>
                    <p className="text-xs text-zinc-500">{opt.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {(serviceType === "BOOKABLE" || serviceType === "VIRTUAL") ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <p className="mb-4 text-sm font-bold text-zinc-900">Duration</p>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Duration (minutes)
              </label>
              <input
                name="serviceDuration"
                type="number"
                min="15"
                step="15"
                placeholder="e.g. 60 for 1 hour"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
              />
              <p className="mt-1.5 text-xs text-zinc-400">
                This determines how long each booking blocks your calendar
              </p>
            </div>
          </div>
        ) : null}

        {/* Location */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-3 text-sm font-bold text-zinc-900">Where does this service happen?</p>
          <div className="grid grid-cols-2 gap-2">
            {SERVICE_LOCATIONS.map((loc) => (
              <button
                key={loc.value}
                type="button"
                onClick={() => setServiceLocation(loc.value)}
                className={`flex items-center gap-2.5 rounded-xl border-2 p-3 text-left transition-all ${
                  serviceLocation === loc.value
                    ? "border-[#D4450A] bg-[#D4450A]/5"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                <span>{loc.icon}</span>
                <p
                  className={`text-xs font-semibold ${
                    serviceLocation === loc.value ? "text-[#D4450A]" : "text-zinc-700"
                  }`}
                >
                  {loc.label}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Publish */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-3 text-sm font-bold text-zinc-900">Visibility</p>
          <div className="flex flex-col gap-2">
            {[
              {
                value: "true",
                label: "Published",
                description: "Visible to customers on the services page",
                icon: "🟢",
              },
              {
                value: "false",
                label: "Draft",
                description: "Only visible to you — save and finish later",
                icon: "⚪",
              },
            ].map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 p-3 hover:bg-zinc-50"
              >
                <input
                  type="radio"
                  name="isPublished"
                  value={opt.value}
                  defaultChecked={opt.value === "false"}
                  className="mt-0.5 accent-[#D4450A]"
                />
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {opt.icon} {opt.label}
                  </p>
                  <p className="text-xs text-zinc-500">{opt.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p> : null}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-xl border border-zinc-200 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !serviceType}
            className="flex-1 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: "#D4450A" }}
          >
            {loading ? "Creating..." : "Create service"}
          </button>
        </div>
      </form>
    </div>
  );
}
