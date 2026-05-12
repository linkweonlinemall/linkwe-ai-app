import Link from "next/link";

export default async function EditServicePlaceholder({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-zinc-900">Edit service</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Form editor for service <span className="font-mono text-zinc-700">{id}</span> ships in the next step.
      </p>
      <Link
        href="/dashboard/vendor/services"
        className="mt-6 inline-block rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
        style={{ backgroundColor: "#D4450A" }}
      >
        Back to My Services
      </Link>
    </div>
  );
}
