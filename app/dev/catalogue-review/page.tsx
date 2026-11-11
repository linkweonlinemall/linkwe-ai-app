import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Catalogue release review",
  robots: { index: false, follow: false },
};

const previews = [
  {
    title: "Choose what customers see",
    description: "Try selecting products and services, narrowing the list, and discarding changes. Drafts stay private and archived items cannot be selected.",
    href: "/dev/catalogue-preview",
    action: "Open vendor workspace",
  },
  {
    title: "Browse the customer catalogue",
    description: "Explore product and service filters, prices, availability and sorting. Copy a filtered link, then open it in a new tab to restore the same view.",
    href: "/dev/store-catalogue?tab=catalogue#store-content",
    action: "Open store catalogue",
  },
  {
    title: "Check a product promotion",
    description: "This saved view shows discounted products up to TT$130. Turn on availability to see how prices follow the matching in-stock option.",
    href: "/dev/store-catalogue?tab=catalogue&c_type=products&c_sale=1&c_max=130#store-content",
    action: "Open filtered products",
  },
  {
    title: "Check a service promotion",
    description: "This saved view shows discounted services up to TT$300. Quote requests and monthly charges remain distinct from a fixed service price.",
    href: "/dev/store-catalogue?tab=services&s_sale=1&s_max=300#store-content",
    action: "Open filtered services",
  },
];

export default function CatalogueReleaseReview() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <main className="min-h-screen bg-[#f5f7f7] px-5 py-12 text-[#173f58] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#a94316]">LinkWe · Release review</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">A catalogue vendors can make their own.</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">Review the actual new interface here before it goes live. These previews use fictional items. Saving and shopping are disabled. Nothing on the live LinkWe site is changed.</p>
        <div className="mt-9 grid gap-5 md:grid-cols-2">
          {previews.map((preview, index) => (
            <section key={preview.href} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <p className="text-sm font-semibold text-[#a94316]">0{index + 1}</p>
              <h2 className="mt-3 text-2xl font-semibold">{preview.title}</h2>
              <p className="mt-3 leading-7 text-slate-600">{preview.description}</p>
              <Link prefetch={false} href={preview.href} className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-[#173f58] px-5 py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a94316]">{preview.action} ↗</Link>
            </section>
          ))}
        </div>
        <section className="mt-9 rounded-2xl border border-slate-200 bg-white p-7">
          <h2 className="text-xl font-semibold">What to review</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 leading-7 text-slate-600">
            <li>Does selecting products and services feel clear? In this preview, try changes and then Discard.</li>
            <li>Can customers quickly find the right price, category and availability? Try an empty result and remove a filter.</li>
            <li>Does a copied link reopen the same selection? Test both the product and service views in a new tab.</li>
            <li>Resize the browser to phone width and try the Filters button.</li>
          </ol>
          <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">Selection uses the existing featured-listing setting, so selected items may also appear in LinkWe recommendations. Unselected published listings remain in the ordinary store. No database migration is required.</p>
          <p className="mt-4 text-sm text-slate-500">This review runs only on this Mac while the preview server is running. Use the browser Back button to return here. Publishing will require a separate approval.</p>
        </section>
      </div>
    </main>
  );
}
