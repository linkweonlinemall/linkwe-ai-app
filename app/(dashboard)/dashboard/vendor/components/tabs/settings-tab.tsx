export default function SettingsTab() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h3 className="mb-1 text-sm font-bold text-zinc-900">Account settings</h3>
          <p className="text-xs text-zinc-500">
            To update your email, password or personal details, visit your{" "}
            <a href="/dashboard/customer/settings" className="font-semibold text-[#D4450A] hover:underline">
              account settings page
            </a>
            .
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h3 className="mb-1 text-sm font-bold text-zinc-900">Store settings</h3>
          <p className="mb-3 text-xs text-zinc-500">Update your store name, logo, description, and other details.</p>
          <a
            href="/dashboard/vendor/store/edit"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white"
            style={{ backgroundColor: "#D4450A" }}
          >
            Edit store →
          </a>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h3 className="mb-1 text-sm font-bold text-zinc-900">Notifications</h3>
          <p className="text-xs text-zinc-500">
            You receive email notifications for new orders, bookings, and on-demand requests at your registered email
            address.
          </p>
        </div>
      </div>
    </div>
  );
}
