import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getStockCatalog } from "@/lib/vendor/stock/query";
import StockWorkspace from "@/components/vendor/stock/StockWorkspace";
import StockUpgrade from "@/components/vendor/stock/StockUpgrade";
import { StockProRequiredError } from "@/lib/vendor/stock/access";

export const dynamic = "force-dynamic";
export default async function CatalogPage() {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") redirect("/login");
  let catalog;
  try { catalog = await getStockCatalog(session.userId); }
  catch (error) { if (error instanceof StockProRequiredError) return <StockUpgrade />; throw error; }
  if (!catalog) redirect("/dashboard/vendor");
  return <StockWorkspace initialCatalog={catalog} />;
}
