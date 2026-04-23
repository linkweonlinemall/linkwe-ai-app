import Link from "next/link";

type CompletenessItem = { label: string; done: boolean; detail?: string };

type Props = {
  store: {
    name: string;
    slug: string;
    logoUrl: string | null;
    tagline: string | null;
  };
  completenessItems: CompletenessItem[];
  completedCount: number;
  totalCount: number;
  completionPercent: number;
};

export default function StoreTab({
  store,
  completenessItems,
  completedCount,
  totalCount,
  completionPercent,
}: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-zinc-200/60 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          {store.logoUrl ? (
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-zinc-200">
              <img alt="" className="h-full w-full object-cover" src={store.logoUrl} />
            </div>
          ) : (
            <div className="h-16 w-16 shrink-0 rounded-full bg-zinc-100" />
          )}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-zinc-900">{store.name}</h2>
            {store.tagline ? (
              <p className="mt-0.5 truncate text-sm text-zinc-500">{store.tagline}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href="/dashboard/vendor/store/edit"
                className="inline-flex items-center rounded-lg bg-[#D4450A] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#B83A08]"
              >
                Edit store
              </Link>
              <Link
                href={`/store/${store.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                View public store
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200/60 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Store profile</h2>
          <span className="text-sm font-medium text-zinc-500">
            {completedCount}/{totalCount} complete
          </span>
        </div>

        <div className="mb-5 h-2 w-full rounded-full bg-zinc-100">
          <div
            className="h-2 rounded-full bg-[#D4450A] transition-all"
            style={{ width: `${completionPercent}%` }}
          />
        </div>

        <ul className="space-y-2">
          {completenessItems.map((item) => (
            <li key={item.label} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className={item.done ? "text-emerald-500" : "text-zinc-300"}>
                  {item.done ? "✓" : "○"}
                </span>
                <span className={item.done ? "text-zinc-700" : "text-zinc-400"}>
                  {item.label}
                </span>
              </span>
              {item.detail ? <span className="text-xs text-zinc-400">{item.detail}</span> : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
