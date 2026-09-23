import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
export default function AdminPageHeader({
  eyebrow = "Marketplace",
  title,
  description,
  createHref,
  createLabel,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  createHref?: string;
  createLabel?: string;
  children?: ReactNode;
}) {
  return (
    <header className="admin-page-header">
      <div>
        <p className="admin-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="admin-description">{description}</p>
      </div>
      <div className="admin-header-actions">
        {children}
        {createHref && (
          <Link className="admin-button admin-button-primary" href={createHref}>
            <Plus size={18} />
            {createLabel || "Create new"}
            <ArrowUpRight size={16} />
          </Link>
        )}
      </div>
    </header>
  );
}
