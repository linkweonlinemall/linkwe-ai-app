"use client";

export default function SettingsTab() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">Settings</h2>
        <p className="mt-0.5 text-sm text-zinc-500">Platform configuration and preferences</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-zinc-900">Platform Configuration</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              label: "Commission Rate",
              value: "12%",
              note: "Deducted from vendor earnings on order completion",
            },
            {
              label: "Minimum Payout",
              value: "TTD 50.00",
              note: "Minimum amount vendors and couriers can request",
            },
            { label: "Courier — Metro", value: "TTD 25.00", note: "Pickup fee for Metro zone" },
            { label: "Courier — Extended", value: "TTD 45.00", note: "Pickup fee for Extended zone" },
            { label: "Courier — Remote", value: "TTD 70.00", note: "Pickup fee for Remote zone" },
            { label: "Courier — Tobago", value: "TTD 120.00", note: "Pickup fee for Tobago zone" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">{item.label}</p>
              <p className="text-xl font-bold text-zinc-900">{item.value}</p>
              <p className="mt-1 text-xs text-zinc-500">{item.note}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900">Subscription Plans</h3>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            Phase E
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              name: "Starter",
              price: "Free",
              commission: "15%",
              prompts: "50/month",
              color: "#A1A1AA",
            },
            {
              name: "Growth",
              price: "TTD 200/month",
              commission: "12%",
              prompts: "500/month",
              color: "#D4450A",
            },
            {
              name: "Pro",
              price: "TTD 349/month",
              commission: "8%",
              prompts: "Unlimited",
              color: "#1B8C5A",
            },
          ].map((plan) => (
            <div key={plan.name} className="rounded-xl border-2 p-4" style={{ borderColor: plan.color }}>
              <p className="text-sm font-bold text-zinc-900">{plan.name}</p>
              <p className="mt-1 text-lg font-bold" style={{ color: plan.color }}>
                {plan.price}
              </p>
              <div className="mt-3 flex flex-col gap-1">
                <p className="text-xs text-zinc-500">
                  Commission: <span className="font-semibold text-zinc-900">{plan.commission}</span>
                </p>
                <p className="text-xs text-zinc-500">
                  AI Prompts: <span className="font-semibold text-zinc-900">{plan.prompts}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-zinc-400">
          Subscription billing will be configured in Phase E using Stripe recurring payments.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-zinc-900">Shipping Zones — Trinidad & Tobago</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              zone: "Metro",
              color: "#1A7FB5",
              areas:
                "Port of Spain, San Fernando, Chaguanas, Tunapuna, Arima, Diego Martin, San Juan, Arouca and surrounding areas",
              rate: "TTD 37.50 base",
            },
            {
              zone: "Extended",
              color: "#E8820C",
              areas:
                "Sangre Grande, Princes Town, Rio Claro, Siparia, Fyzabad, Debe, Penal and surrounding areas",
              rate: "TTD 59.50 base",
            },
            {
              zone: "Remote",
              color: "#D4450A",
              areas: "Blanchisseuse, Toco, Manzanilla, Mayaro, Moruga, Cedros, Icacos and other far areas",
              rate: "TTD 87.00 base",
            },
            {
              zone: "Tobago",
              color: "#7F77DD",
              areas: "All Tobago areas including Scarborough, Crown Point, Plymouth, Roxborough",
              rate: "TTD 54.00 base",
            },
          ].map((z) => (
            <div key={z.zone} className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: z.color }} />
                <p className="text-sm font-bold text-zinc-900">{z.zone} Zone</p>
                <span className="ml-auto text-xs font-semibold" style={{ color: z.color }}>
                  {z.rate}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-zinc-500">{z.areas}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-zinc-400">
          Base rates include TTD 10 flat fee + 10% platform markup. Rates vary by weight.
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6">
        <h3 className="mb-3 text-sm font-semibold text-zinc-500">Coming in Phase E</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            "Edit commission rates",
            "Edit courier pickup fees",
            "Edit shipping markup",
            "Manage subscription plans",
            "Platform announcements",
            "Email notification settings",
            "Payout schedule configuration",
            "Admin user management",
            "API key management",
          ].map((item) => (
            <div key={item} className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
              <p className="text-xs text-zinc-400">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
