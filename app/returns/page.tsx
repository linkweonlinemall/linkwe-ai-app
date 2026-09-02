import type { Metadata } from "next";

import PublicStaticPageShell from "@/components/layout/PublicStaticPageShell";

export const metadata: Metadata = {
  title: "Returns & Refunds · LinkWe",
  description:
    "LinkWe returns and refunds policy — how to report problems, vendor policies, and what can be returned.",
};

export default function ReturnsPage() {
  return (
    <PublicStaticPageShell eyebrow="Support" title="Returns & Refunds">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-3 text-lg font-bold text-zinc-900">Our promise</h2>
        <p className="text-sm leading-7 text-zinc-600">
          We want you to shop with confidence. If something isn&apos;t right with your order, we&apos;re here to help
          make it right.
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-3 text-lg font-bold text-zinc-900">Reporting a problem</h2>
        <p className="text-sm leading-7 text-zinc-600">
          If your item arrives damaged, faulty, incorrect, or doesn&apos;t match its description, let us know within 7
          days of delivery. You can report a problem through your account or by contacting us, and LinkWe will step in to
          help resolve it between you and the vendor.
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-3 text-lg font-bold text-zinc-900">Vendor return policies</h2>
        <p className="text-sm leading-7 text-zinc-600">
          Each vendor may set their own return terms, which are shown on the product page when provided. We recommend
          checking a product&apos;s return policy before you buy. Whatever the vendor&apos;s terms, LinkWe will always
          help if an item arrives damaged, faulty, or not as described.
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-3 text-lg font-bold text-zinc-900">How refunds work</h2>
        <p className="text-sm leading-7 text-zinc-600">
          Approved refunds are issued back to your original payment method (the card you paid with), processed securely
          through our payment provider. Once a refund is approved, please allow a few business days for it to appear,
          depending on your bank.
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-3 text-lg font-bold text-zinc-900">Items with special refund rules</h2>
        <div className="flex flex-col gap-3 text-sm leading-7 text-zinc-600">
          <p>Some purchases have special rules because they cannot be physically returned or resold:</p>
          <ul className="ml-4 flex flex-col gap-2">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4450A]" />
              Digital products and downloads are generally final once delivered, except where required by law or where the file is defective or materially not as described.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4450A]" />
              Event tickets follow the event&apos;s displayed refund policy and WiPay&apos;s full-transaction refund rules. Ticket transfer may also be available from My Tickets.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4450A]" />
              Perishable items, including food and fresh goods, are generally not returnable unless damaged, unsafe, incorrect, or materially not as described.
            </li>
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-3 text-lg font-bold text-zinc-900">Need help?</h2>
        <p className="text-sm leading-7 text-zinc-600">
          If you&apos;re not sure whether something qualifies, just reach out — we&apos;d rather hear from you and sort it
          out together. Contact us at{" "}
          <a href="mailto:admin@linkwemall.com" className="font-semibold text-[#D4450A] hover:underline">
            admin@linkwemall.com
          </a>{" "}
          and we&apos;ll guide you through it.
        </p>
      </section>
    </PublicStaticPageShell>
  );
}
