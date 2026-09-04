"use client";

import { IconMapPin, IconPackage, IconRoute, IconTruckDelivery } from "@tabler/icons-react";
import { CSF_DISTANCE_BANDS, CSF_MAX_LABEL_WEIGHT_LBS } from "@/lib/shipping/csf-rates";

export default function ShippingSettingsClient() {
  return (
    <div className="space-y-5">
      <section data-tour="shipping-methods" className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200/70">
        <div className="bg-gradient-to-br from-[#171715] via-[#2A1A14] to-[#8D310A] px-5 py-6 text-white sm:px-7">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><IconTruckDelivery className="size-6 text-orange-300" stroke={1.7} aria-hidden /></div>
            <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">Managed by LinkWe</p><h2 className="mt-1 text-xl font-black">CSF courier delivery</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">CSF Couriers handles every delivered order. Pack the order safely and mark it ready for collection; LinkWe coordinates the courier and customer updates.</p></div>
          </div>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-7">
          {[
            { Icon: IconPackage, title: "Pack", detail: "Prepare and label the paid order." },
            { Icon: IconTruckDelivery, title: "CSF collects", detail: "The courier collects from your store." },
            { Icon: IconMapPin, title: "Customer receives", detail: "Delivery is tracked to their address." },
          ].map(({ Icon, title, detail }, index) => <div key={title} className="rounded-2xl bg-[#FAF8F5] p-4 ring-1 ring-zinc-200/70"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-[#FEF0EB] text-[#D4450A]"><Icon className="size-5" stroke={1.7} aria-hidden /></span><span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Step {index + 1}</span></div><p className="mt-3 text-sm font-bold text-zinc-950">{title}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{detail}</p></div>)}
        </div>
      </section>

      <section data-tour="shipping-zones" className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/70 sm:p-7">
        <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><IconRoute className="size-5" stroke={1.7} aria-hidden /></span><div><h2 className="font-black text-zinc-950">Customer delivery prices</h2><p className="mt-1 text-xs leading-5 text-zinc-500">Calculated from your saved store pin to the customer’s checkout pin. Each band includes LinkWe coordination and the CSF label.</p></div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CSF_DISTANCE_BANDS.map((band, index) => <div key={band.label} className={`rounded-2xl border p-4 ${index === 0 ? "border-orange-200 bg-orange-50" : "border-zinc-200 bg-zinc-50"}`}><p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{band.label}</p><p className="mt-2 text-2xl font-black text-zinc-950">TTD {band.customerPriceTtd}</p><p className="mt-1 text-[11px] text-zinc-500">per parcel up to {CSF_MAX_LABEL_WEIGHT_LBS} lb</p></div>)}
        </div>
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900 ring-1 ring-amber-200/70">Inter-island deliveries add TTD 15 per parcel. Heavier orders are automatically priced as multiple parcels. Keep your store pin and product weights accurate so customers receive the correct quote.</p>
      </section>

      <section data-tour="shipping-pickup" className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/70 sm:p-7"><h2 className="font-black text-zinc-950">Local pickup remains your choice</h2><p className="mt-2 text-sm leading-6 text-zinc-600">Turn on local pickup inside each eligible product. Customers who choose pickup pay no delivery fee, and the order follows the Ready for pickup flow instead of courier tracking.</p></section>
    </div>
  );
}
