import { getImportWorkspace } from "@/app/actions/bulk-import";
import ImportWorkspace from "@/components/admin/imports/ImportWorkspace";
import { IMPORT_KINDS, type ImportKind } from "@/lib/imports/model";

export default async function Page({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const params = await searchParams;
  const kind = IMPORT_KINDS.includes(params.kind as ImportKind) ? params.kind as ImportKind : "vendor";
  return <ImportWorkspace initial={await getImportWorkspace()} initialKind={kind}/>;
}
