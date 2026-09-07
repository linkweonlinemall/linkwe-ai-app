import { notFound } from "next/navigation";
import { getAdminEditableRecord } from "@/app/actions/admin-records";
import { RECORD_FIELDS, type RecordKind } from "@/lib/admin/record-fields";
import RecordEditor from "./record-editor";
export default async function Page({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if (!Object.hasOwn(RECORD_FIELDS, kind)) notFound();
  const fields = await getAdminEditableRecord(kind as RecordKind, id);
  return <RecordEditor kind={kind as RecordKind} id={id} fields={JSON.parse(JSON.stringify(fields))}/>;
}
