import { notFound } from "next/navigation";
import { getAdminRecordWorkspace } from "@/app/actions/admin-records";
import { RECORD_FIELDS, type RecordKind } from "@/lib/admin/record-fields";
import RecordEditor from "./record-editor";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string; id: string }>;
  searchParams: Promise<{ storeId?: string; ownerId?: string; role?: string }>;
}) {
  const [{ kind, id }, query] = await Promise.all([params, searchParams]);
  if (!Object.hasOwn(RECORD_FIELDS, kind)) notFound();
  const workspace = await getAdminRecordWorkspace(kind as RecordKind, id);
  if (!workspace) notFound();
  if (
    id === "new" &&
    kind === "user" &&
    ["VENDOR", "CUSTOMER", "ADMIN"].includes(query.role || "")
  )
    workspace.fields.find((f) => f.name === "role")!.value = query.role;
  return (
    <RecordEditor
      key={`${kind}-${id}-${workspace.version}`}
      kind={kind as RecordKind}
      id={id}
      workspace={workspace}
      prefill={kind === "store" ? query.ownerId : query.storeId}
    />
  );
}
