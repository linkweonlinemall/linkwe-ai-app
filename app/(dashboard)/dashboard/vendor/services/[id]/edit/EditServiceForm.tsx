"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { uploadVendorChatImages } from "@/app/actions/ai-vendor-image";
import { updateService } from "@/app/actions/services";
import { compressAndUploadImages } from "@/lib/images/upload-images-client";
import RelatedItemsPanel from "@/components/vendor/RelatedItemsPanel";
import RichTextEditor from "@/components/ui/RichTextEditor";
import type { ContentLinkItem } from "@/lib/content-links/types";
import { SERVICE_CATEGORIES } from "@/lib/categories";
import { mapSubscriptionInterval } from "@/lib/finance/subscription-interval";

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

const PAYMENT_MODES = [
  {
    value: "CUSTOMER_CHOOSES",
    label: "Customer chooses",
    description: "Show both pay online and pay on arrival",
    icon: "🔀",
  },
  {
    value: "ONLINE_ONLY",
    label: "Online payment only",
    description: "Customer must pay via card to confirm",
    icon: "💳",
  },
  {
    value: "ON_ARRIVAL_ONLY",
    label: "Pay on arrival only",
    description: "Customer pays when they arrive",
    icon: "💵",
  },
];

type ServiceData = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  serviceType: string | null;
  serviceLocation: string | null;
  price: number;
  serviceDuration: number | null;
  requiresDeposit: boolean;
  depositAmount: number | null;
  bookingPaymentMode: string | null;
  tags: string[];
  isPublished: boolean;
  images: string[];
  responseTime: string | null;
  minimumQuoteAmount: number | null;
  siteVisitRequired: boolean;
  subscriptionInterval: string | null;
  sessionsIncluded: number | null;
  subscriptionCancellationDays: number | null;
  subscriptionTrialPeriod: number | null;
  subscriptionTrialPrice: number | null;
  subscriptionCanPause: boolean;
  subscriptionPauseMaxWeeks: number | null;
  travelFee: number | null;
  serviceRadius: number | null;
  estimatedResponseMins: number | null;
  virtualPlatform: string | null;
  virtualMeetingInfo: string | null;
  maxGroupSize: number | null;
  quotePriceType: string | null;
};

export default function EditServiceForm({
  service,
  initialRelatedItems = [],
  canPayOnArrival,
}: {
  service: ServiceData;
  initialRelatedItems?: ContentLinkItem[];
  canPayOnArrival: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState(service.serviceType ?? "");
  const [serviceLocation, setServiceLocation] = useState(service.serviceLocation ?? "");
  const [requiresDeposit, setRequiresDeposit] = useState(service.requiresDeposit);
  const [paymentMode, setPaymentMode] = useState(
    canPayOnArrival ? service.bookingPaymentMode ?? "CUSTOMER_CHOOSES" : "ONLINE_ONLY",
  );
  const [quotePriceType, setQuotePriceType] = useState<string>(
    service.quotePriceType ?? "",
  );
  const [subscriptionCanPause, setSubscriptionCanPause] = useState(service.subscriptionCanPause);
  const [subscriptionInterval, setSubscriptionInterval] = useState(
    service.subscriptionInterval ?? "",
  );
  const [sessionsIncluded, setSessionsIncluded] = useState<number | null>(
    service.sessionsIncluded,
  );
  const [uploadedImages, setUploadedImages] = useState<string[]>(service.images ?? []);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ total: number; done: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingImages(true);
    setUploadProgress({ total: files.length, done: 0 });
    setError(null);
    const { urls, error } = await compressAndUploadImages(Array.from(files), uploadVendorChatImages, {
      onProgress: (done) => setUploadProgress((prev) => (prev ? { ...prev, done } : prev)),
    });
    if (urls.length > 0) {
      setUploadedImages((prev) => [...prev, ...urls].slice(0, 10));
    }
    if (error) setError(error);
    setUploadingImages(false);
    setUploadProgress(null);
    e.target.value = "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (
      serviceType === "SUBSCRIPTION" &&
      !mapSubscriptionInterval(subscriptionInterval)
    ) {
      setError("Choose a billing interval.");
      setLoading(false);
      return;
    }
    const formData = new FormData(e.currentTarget);
    formData.set("serviceType", serviceType);
    formData.set("serviceLocation", serviceLocation);
    formData.set("requiresDeposit", requiresDeposit ? "true" : "false");
    formData.set("bookingPaymentMode", paymentMode);
    const result = await updateService(service.id, formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/dashboard/vendor/services");
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-6">
      <input type="hidden" name="images" value={uploadedImages.join(",")} />
      <input
        type="hidden"
        name="subscriptionCanPause"
        value={subscriptionCanPause ? "true" : "false"}
      />
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="mb-3 text-sm font-bold text-zinc-900">Service type</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SERVICE_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setServiceType(type.value)}
              className={`flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                serviceType === type.value
                  ? "border-[#D4450A] bg-[#D4450A]/5"
                  : "border-zinc-200 hover:border-zinc-300"
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

      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="mb-4 text-sm font-bold text-zinc-900">Basic information</p>
        <div className="flex flex-col gap-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
              Service name <span className="text-[#D4450A]">*</span>
            </label>
            <input
              name="name"
              required
              defaultValue={service.name}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Description</label>
            <RichTextEditor
              name="description"
              defaultValue={service.description ?? ""}
              placeholder="Describe what the service includes, what to expect, who it is for, any requirements..."
              maxLength={2000}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Category</label>
            <select
              name="category"
              defaultValue={service.category ?? ""}
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
              defaultValue={service.tags.join(", ")}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="mb-4 text-sm font-bold text-zinc-900">Pricing</p>
        <div className="flex flex-col gap-6">
          {serviceType === "QUOTE" ? (
            <>
              <div>
                <label className="mb-2 block text-xs font-semibold text-zinc-700">
                  How do you price this service? <span className="text-[#D4450A]">*</span>
                </label>
                <div className="flex flex-col gap-2">
                  {[
                    {
                      value: "STARTING_FROM",
                      label: "Starting from a fixed price",
                      description: "Show a minimum price — e.g. From TTD 500",
                      icon: "💰",
                    },
                    {
                      value: "CALLOUT_FEE",
                      label: "Call-out fee",
                      description:
                        "Charge a fixed visit fee — final price quoted after assessment",
                      icon: "🚗",
                    },
                    {
                      value: "FREE_QUOTE",
                      label: "Free quote",
                      description:
                        "No upfront price — customer contacts you for a custom quote",
                      icon: "💬",
                    },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-all ${
                        quotePriceType === opt.value
                          ? "border-[#D4450A] bg-[#D4450A]/5"
                          : "border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="quotePriceType"
                        value={opt.value}
                        checked={quotePriceType === opt.value}
                        onChange={() => setQuotePriceType(opt.value)}
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

              {quotePriceType === "STARTING_FROM" ? (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    Starting price (TTD) <span className="text-[#D4450A]">*</span>
                  </label>
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    defaultValue={service.price}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-zinc-400">
                    Shown as &quot;From TTD X&quot; on the service page
                  </p>
                </div>
              ) : quotePriceType === "CALLOUT_FEE" ? (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    Call-out fee (TTD) <span className="text-[#D4450A]">*</span>
                  </label>
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    defaultValue={service.price}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-zinc-400">
                    Shown as &quot;TTD X call-out fee&quot; — final price quoted after visiting
                  </p>
                </div>
              ) : quotePriceType === "FREE_QUOTE" ? (
                <input type="hidden" name="price" value="0" />
              ) : (
                <input type="hidden" name="price" value={String(service.price)} />
              )}
            </>
          ) : (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                {serviceType === "SUBSCRIPTION" ? "Price per cycle (TTD)" : "Price (TTD)"}{" "}
                <span className="text-[#D4450A]">*</span>
              </label>
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={service.price}
                placeholder="0.00"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
              />
            </div>
          )}
          {(serviceType === "BOOKABLE" || serviceType === "VIRTUAL") ? (
            <>
              <div className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Require deposit</p>
                  <p className="text-xs text-zinc-500">Customer pays a deposit to confirm booking</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRequiresDeposit((v) => !v)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${requiresDeposit ? "bg-[#D4450A]" : "bg-zinc-200"}`}
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
                    defaultValue={service.depositAmount ?? ""}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {serviceType === "VIRTUAL" ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-1 text-sm font-bold text-zinc-900">Payment preference</p>
          <p className="text-xs text-zinc-500">Virtual services are paid online.</p>
        </div>
      ) : null}

      {serviceType === "BOOKABLE" ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-3 text-sm font-bold text-zinc-900">Payment preference</p>
          {!canPayOnArrival ? (
            <p className="mb-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              Starter services are paid online through LinkWe. Upgrade to Growth or Pro to offer pay on arrival.
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            {PAYMENT_MODES.filter(
              (opt) => canPayOnArrival || opt.value === "ONLINE_ONLY",
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPaymentMode(opt.value)}
                className={`flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                  paymentMode === opt.value
                    ? "border-[#D4450A] bg-[#D4450A]/5"
                    : "border-zinc-200 hover:border-zinc-300"
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

      {serviceType === "BOOKABLE" || serviceType === "VIRTUAL" ? (
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
              defaultValue={service.serviceDuration ?? ""}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      ) : null}

      {serviceType === "QUOTE" ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-4 text-sm font-bold text-zinc-900">Quote details</p>
          <div className="flex flex-col gap-6">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Response time</label>
              <select
                name="responseTime"
                defaultValue={service.responseTime ?? ""}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
              >
                <option value="">Select response time</option>
                <option value="within_1_hour">Within 1 hour</option>
                <option value="within_4_hours">Within 4 hours</option>
                <option value="within_24_hours">Within 24 hours</option>
                <option value="within_48_hours">Within 48 hours</option>
                <option value="within_1_week">Within 1 week</option>
              </select>
            </div>
            {quotePriceType === "FREE_QUOTE" ? (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                  Minimum quote amount (TTD)
                </label>
                <input
                  name="minimumQuoteAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  defaultValue={service.minimumQuoteAmount ?? ""}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none focus:bg-white"
                />
                <p className="mt-1 text-xs text-zinc-400">
                  The lowest amount you will quote for this service — shown to customers before they
                  contact you
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {serviceType === "SUBSCRIPTION" ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-4 text-sm font-bold text-zinc-900">Subscription details</p>
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-3">
              <p className="text-xs font-semibold text-purple-800">
                ℹ️ The price you set above is the recurring charge per billing cycle.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Billing interval{" "}
                {serviceType === "SUBSCRIPTION" ? (
                  <span className="text-[#D4450A]">*</span>
                ) : null}
              </label>
              <select
                name="subscriptionInterval"
                value={subscriptionInterval}
                required={serviceType === "SUBSCRIPTION"}
                onChange={(e) => setSubscriptionInterval(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
              >
                <option value="" disabled>
                  Select interval
                </option>
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly (every 2 weeks)</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly (every 3 months)</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Sessions included per cycle
              </label>
              <input
                name="sessionsIncluded"
                type="number"
                min="1"
                placeholder="e.g. 4"
                value={sessionsIncluded ?? ""}
                onChange={(e) =>
                  setSessionsIncluded(e.target.value ? parseInt(e.target.value, 10) : null)
                }
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none focus:bg-white"
              />
              {sessionsIncluded && subscriptionInterval ? (
                <p className="mt-1 text-xs font-medium text-[#D4450A]">
                  {subscriptionInterval === "weekly"
                    ? `${sessionsIncluded} session${sessionsIncluded > 1 ? "s" : ""} every week`
                    : subscriptionInterval === "fortnightly"
                      ? `${sessionsIncluded} session${sessionsIncluded > 1 ? "s" : ""} every 2 weeks — about ${(sessionsIncluded * 2).toFixed(0)} per month`
                      : subscriptionInterval === "monthly"
                        ? `${sessionsIncluded} session${sessionsIncluded > 1 ? "s" : ""} per month — roughly ${
                            sessionsIncluded <= 4
                              ? `${Math.round((sessionsIncluded / 4.3) * 10) / 10} per week`
                              : `${sessionsIncluded} sessions`
                          }`
                        : subscriptionInterval === "quarterly"
                          ? `${sessionsIncluded} session${sessionsIncluded > 1 ? "s" : ""} every 3 months`
                          : null}
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Cancellation notice (days)
              </label>
              <input
                name="subscriptionCancellationDays"
                type="number"
                min="0"
                placeholder="e.g. 7"
                defaultValue={service.subscriptionCancellationDays ?? ""}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none focus:bg-white"
              />
              <p className="mt-1 text-xs text-zinc-400">
                Days notice required to cancel — 0 means cancel anytime
              </p>
            </div>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Trial period (optional)
              </p>
              <div className="flex flex-col gap-6">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    Trial length (days)
                  </label>
                  <input
                    name="subscriptionTrialPeriod"
                    type="number"
                    min="1"
                    placeholder="e.g. 7 for a 1-week trial"
                    defaultValue={service.subscriptionTrialPeriod ?? ""}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-zinc-400">Leave blank for no trial period</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    Trial price (TTD)
                  </label>
                  <input
                    name="subscriptionTrialPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00 for free trial"
                    defaultValue={
                      service.subscriptionTrialPrice != null &&
                      service.subscriptionTrialPrice !== undefined
                        ? service.subscriptionTrialPrice
                        : ""
                    }
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-zinc-400">0 means the trial is completely free</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Pause &amp; resume
              </p>
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">Allow customers to pause</p>
                    <p className="text-xs text-zinc-500">
                      Customers can pause and resume instead of cancelling
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubscriptionCanPause((v) => !v)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      subscriptionCanPause ? "bg-[#D4450A]" : "bg-zinc-200"
                    }`}
                  >
                    <div
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        subscriptionCanPause ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                {subscriptionCanPause ? (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                      Maximum pause duration (weeks)
                    </label>
                    <input
                      name="subscriptionPauseMaxWeeks"
                      type="number"
                      min="1"
                      placeholder="e.g. 4 (blank = no limit)"
                      defaultValue={service.subscriptionPauseMaxWeeks ?? ""}
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-zinc-400">
                      Leave blank for unlimited pause duration
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {serviceType === "ON_DEMAND" ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-4 text-sm font-bold text-zinc-900">On-demand details</p>
          <div className="flex flex-col gap-6">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Estimated response time
              </label>
              <select
                name="estimatedResponseMins"
                defaultValue={
                  service.estimatedResponseMins != null
                    ? String(service.estimatedResponseMins)
                    : ""
                }
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
              >
                <option value="">Select response time</option>
                <option value="15">Within 15 minutes</option>
                <option value="30">Within 30 minutes</option>
                <option value="60">Within 1 hour</option>
                <option value="120">Within 2 hours</option>
                <option value="240">Within 4 hours</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Travel fee (TTD)</label>
              <input
                name="travelFee"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                defaultValue={service.travelFee ?? ""}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none focus:bg-white"
              />
              <p className="mt-1 text-xs text-zinc-400">
                Additional fee for travelling to customer — 0 if no travel fee
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Service radius (km)
              </label>
              <input
                name="serviceRadius"
                type="number"
                min="1"
                placeholder="e.g. 10"
                defaultValue={service.serviceRadius ?? ""}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none focus:bg-white"
              />
              <p className="mt-1 text-xs text-zinc-400">
                How far you will travel from your base location
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {serviceType === "VIRTUAL" ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-4 text-sm font-bold text-zinc-900">Virtual session details</p>
          <div className="flex flex-col gap-6">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Platform</label>
              <select
                name="virtualPlatform"
                defaultValue={service.virtualPlatform ?? ""}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
              >
                <option value="">Select platform</option>
                <option value="zoom">Zoom</option>
                <option value="google_meet">Google Meet</option>
                <option value="whatsapp">WhatsApp Video</option>
                <option value="teams">Microsoft Teams</option>
                <option value="facetime">FaceTime</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Meeting instructions
              </label>
              <textarea
                name="virtualMeetingInfo"
                rows={3}
                placeholder="e.g. A Zoom link will be sent to you 24 hours before your session. Please have a stable internet connection ready."
                defaultValue={service.virtualMeetingInfo ?? ""}
                className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Max participants (optional)
              </label>
              <input
                name="maxGroupSize"
                type="number"
                min="1"
                placeholder="Leave blank for 1-on-1 sessions"
                defaultValue={service.maxGroupSize ?? ""}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none focus:bg-white"
              />
              <p className="mt-1 text-xs text-zinc-400">
                Set to 2 or more to allow group sessions
              </p>
            </div>
          </div>
        </div>
      ) : null}

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
                  : "border-zinc-200 hover:border-zinc-300"
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

      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="mb-3 text-sm font-bold text-zinc-900">Service images</p>
        <p className="mb-3 text-xs text-zinc-500">
          Add up to 10 photos — the first image will be shown as the cover.
        </p>

        {/* Image previews */}
        {uploadedImages.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {uploadedImages.map((url, i) => (
              <div key={url} className="relative">
                <img
                  src={url}
                  alt=""
                  className="h-20 w-20 rounded-xl border border-zinc-200 object-cover"
                />
                {i === 0 ? (
                  <span className="absolute bottom-0 left-0 right-0 rounded-b-xl bg-black/50 py-0.5 text-center text-[9px] font-bold text-white">
                    Cover
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    setUploadedImages((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {/* Upload button */}
        {uploadedImages.length < 10 ? (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
            <button
              type="button"
              disabled={uploadingImages}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50"
            >
              {uploadingImages ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                  {uploadProgress
                    ? `Uploading ${uploadProgress.done} of ${uploadProgress.total}…`
                    : "Uploading..."}
                </>
              ) : (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Upload images
                </>
              )}
            </button>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="mb-3 text-sm font-bold text-zinc-900">Visibility</p>
        <div className="flex flex-col gap-2">
          {[
            { value: "true", label: "Published", description: "Visible to customers", icon: "🟢" },
            { value: "false", label: "Draft", description: "Only visible to you", icon: "⚪" },
          ].map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 p-3 hover:bg-zinc-50"
            >
              <input
                type="radio"
                name="isPublished"
                value={opt.value}
                defaultChecked={opt.value === (service.isPublished ? "true" : "false")}
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

      <RelatedItemsPanel
        fromType="SERVICE"
        fromId={service.id}
        initialItems={initialRelatedItems}
      />

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
          disabled={loading}
          className="flex-1 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "#D4450A" }}
        >
          {loading ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}
