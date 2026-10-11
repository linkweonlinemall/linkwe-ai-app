import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";
import WorkspacePage from "@/components/vendor/WorkspacePage";
import { STOCK_UPGRADE_HREF } from "@/lib/vendor/stock/access";
import { LIVE_STOCK_COPY } from "@/lib/vendor/stock/copy";
import s from "./stock-workspace.module.css";

export default function StockUpgrade() {
  return <WorkspacePage eyebrow="Catalog / Pro" title="Live stock updates with Pro"
    description={LIVE_STOCK_COPY.summary}>
    <section className={s.panel}>
      <div className={s.scope}><LockKeyhole size={24} /><p><strong>An active Pro plan is required.</strong> Upgrade or renew your plan to use live stock updates and QR stock scanning.</p></div>
      <p className={s.helper}>Your existing product library, ordinary stock editing and QR Studio labels remain available on your current plan.</p>
      <p className={s.helper}>{LIVE_STOCK_COPY.scope}</p>
      <p className={s.helper}>{LIVE_STOCK_COPY.requirements}</p>
      <div className={s.scanActions}><Link className={s.primary} href={STOCK_UPGRADE_HREF}>View Pro in Finance <ArrowRight size={17} /></Link>
        <Link className={s.secondary} href="/dashboard/vendor/creation?type=product">Manage products</Link></div>
    </section>
  </WorkspacePage>;
}
