import Link from "next/link";
import AdminPageHeader from "../components/admin-page-header";
const sections = [
  {
    title: "Create and edit confidently",
    href: "/dashboard/admin/onboarding",
    label: "Open Creation Studio",
    steps: [
      "Choose Create for a full product, service, store, user or other listing form. Set up vendor walks through an owner account, storefront and optional first offering together.",
      "Use Find & edit, or the search button in the top bar, to find existing records by name, email or URL name. Search is not limited to recently created records.",
      "The editor groups related settings into sections. Add and reorder photos, use the description editor, set opening hours and add checkout questions without writing code.",
      "Save changes applies your edits. Unsaved changes are flagged before navigation. If another staff member saves first, reload and review their changes before saving again.",
      "New businesses and offerings start as drafts. Complete their details, review the public page, then publish when ready.",
      "Import vendors accepts the provided CSV template with a review of every row. Results link to the created records and identify any rows that need correction. Credentials are shown only when requested and no welcome email is sent automatically.",
    ],
  },
  {
    title: "Start your day",
    href: "/dashboard/admin",
    label: "Open Overview",
    steps: [
      "Check the notification bell and the attention cards for vendor verification, orders and payouts.",
      "Open the area that needs work. On a phone, use the menu to reach every Admin section.",
      "Orders has search across the full order history and Previous / Next pages. The warehouse queue prioritizes the oldest 150 open orders; use Orders or exports for the wider record.",
    ],
  },
  {
    title: "Receive and locate parcels",
    href: "/dashboard/admin?tab=linkwe-delivery&view=bays",
    label: "Open warehouse bays",
    steps: [
      "In Warehouse & CSF → Work queue, open a customer order to see each vendor parcel.",
      "For a paid collection, copy the vendor booking details, book it on CSF’s merchant website, then enter the CSF reference and save the booking.",
      "Enter the bay number and confirm received only after the parcel arrives. Free drop-off and TTD40 vendor collection both end at the warehouse.",
      "In Bays, orange cards show the vendor and order occupying each bay. Select a parcel and enter its new bay number to review a move. Unassigned parcels are listed separately.",
      "Add bay creates a numbered location. Review & clear bay removes a stale assignment only when no active parcel is attached; confirm the physical bay is empty first.",
    ],
  },
  {
    title: "Combine and deliver",
    href: "/dashboard/admin?tab=linkwe-delivery",
    label: "Open fulfilment queue",
    steps: [
      "Once every physical vendor parcel has arrived, choose the warehouse and confirm combined & packed.",
      "Copy the delivery details into CSF, finish the booking and print their label. Enter the outbound tracking reference and confirm dispatch when CSF takes the parcel.",
      "For warehouse collection, select ready for customer pickup. Record the handover evidence and confirm delivered when collected.",
      "Bays stay assigned while parcels are in the warehouse. Dispatch or confirmed customer collection releases them.",
      "Customer shipping is charged once for the combined order. Vendor collection fees are deducted from vendor earnings; choosing drop-off is free.",
    ],
  },
  {
    title: "Manage an order",
    href: "/dashboard/admin?tab=orders",
    label: "Open Orders",
    steps: [
      "Expand an order and use Manage order. Select the operation, vendor parcel when relevant, and enter the reason or delivery evidence.",
      "Review the confirmation before applying the change. LinkWe updates the parcel records and customer status together.",
      "Receive all parcels before packing; pack before dispatch; record the CSF reference before shipping. Cancellation is available before dispatch when no parcel has been delivered or paid out.",
      "Complete & release earnings applies to delivered vendor parcels. It credits the vendor’s balance; Finance handles the later payout. Refunds need their separate payment workflow.",
      "Warehouse & CSF keeps a recent activity history showing actions and staff notes.",
    ],
  },
  {
    title: "Work with the assistant",
    href: "/dashboard/admin?tab=linkwe-delivery&view=assistant",
    label: "Open AI assistant",
    steps: [
      "Ask which orders need attention, request an export, or specify the vendor order and bay you want to change.",
      "Example: “Move vendor order [your actual reference] to bay 4.” The assistant prepares a card showing the target and destination.",
      "Confirm and apply performs that exact change. A success message appears only after the server saves it. Changed orders and expired previews require a fresh review.",
      "Export messages, orders and bays can be downloaded directly from the assistant, even if AI chat is temporarily unavailable.",
      "The assistant does not book CSF, approve payouts, change staff access or send messages. Use the dedicated controls for those tasks.",
    ],
  },
  {
    title: "Manage products, services and stores",
    href: "/dashboard/admin/services",
    label: "Open Services",
    steps: [
      "Product Edit opens in the same tab. Save changes, then use Back to return to the catalogue.",
      "Services lets you create a draft for a store, edit price and availability, and manage booking, quote, subscription or on-demand settings.",
      "Archive removes a service from sale and keeps customer history. Restore returns it as a draft. Delete is only available if it has no customer booking, request, subscription or order history.",
      "Use Stores to change a vendor’s package or status. Review the confirmation because these changes affect fees or access.",
    ],
  },
  {
    title: "Manage people and verification",
    href: "/dashboard/admin/users",
    label: "Open People & access",
    steps: [
      "Create user supports Customer, Vendor and Admin accounts. An Admin receives full Admin access.",
      "Set an initial password of at least 12 characters. Share it securely and ask the person to change it in Settings.",
      "Select a user and choose Manage account or Edit to update their contact information or role. Existing Admins can be edited; ask another Admin to change your own role.",
      "Suspension is reversible. Deletion anonymizes eligible accounts; financial and order history may require you to suspend instead.",
      "Courier is retired as an assignable role. Historical courier financial records remain available; existing courier accounts receive customer access.",
      "Use Verification to review vendor documents and readiness before approval.",
    ],
  },
  {
    title: "Export conversations",
    href: "/dashboard/admin/messages",
    label: "Open Messages",
    steps: [
      "Use Export messages for the whole inbox, or open one conversation to export that thread.",
      "Optionally set inclusive From and Through dates in Trinidad time. Leave dates blank for all dates.",
      "CSV contains message text, sender role, IDs, store and timestamps. Choose Exclude names and email addresses to omit those identity columns; message text can still contain personal details.",
      "Exports download to your device. They do not send messages or upload the conversations to the AI.",
    ],
  },
];
export default function AdminGuidePage() {
  return (
    <main className="admin-page space-y-6">
      <AdminPageHeader
        eyebrow="Staff handbook"
        title="A little guidance."
        description="Create and manage the marketplace, support your customers, and keep fulfilment moving. Every workspace is available from All tools on your phone."
      />
      <div className="flex flex-wrap gap-2" aria-label="Warehouse workflow">
        {[
          "Vendor prepares",
          "Collection / drop-off",
          "Receive & assign bay",
          "Combine & pack",
          "CSF dispatch / pickup",
          "Confirm delivery",
        ].map((step, i) => (
          <span
            key={step}
            className="rounded-xl border bg-white px-3 py-2 text-xs font-medium"
          >
            <span className="mr-2 text-orange-700">{i + 1}.</span>
            {step}
          </span>
        ))}
      </div>
      <nav className="grid gap-2 sm:grid-cols-2">
        {sections.map((s, i) => (
          <a
            key={s.title}
            href={`#guide-${i}`}
            className="rounded-xl border bg-white px-4 py-3 text-sm text-zinc-700"
          >
            {i + 1}. {s.title} →
          </a>
        ))}
      </nav>
      {sections.map((s, i) => (
        <section
          id={`guide-${i}`}
          key={s.title}
          className="scroll-mt-8 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7"
        >
          <h2 className="text-xl font-semibold">
            {i + 1}. {s.title}
          </h2>
          <ol className="my-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-zinc-600">
            {s.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <Link
            href={s.href}
            className="inline-flex min-h-11 items-center rounded-xl bg-orange-50 px-4 text-sm font-semibold text-orange-700"
          >
            {s.label} →
          </Link>
        </section>
      ))}
    </main>
  );
}
