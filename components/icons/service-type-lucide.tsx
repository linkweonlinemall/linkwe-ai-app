import type { LucideIcon } from "lucide-react";
import { Calendar, ConciergeBell, MessageCircle, Monitor, RefreshCw, Zap } from "lucide-react";

/** Lucide per persisted `serviceType` value. */
export const SERVICE_TYPE_LUCIDE: Record<string, LucideIcon> = {
  BOOKABLE: Calendar,
  QUOTE: MessageCircle,
  SUBSCRIPTION: RefreshCw,
  ON_DEMAND: Zap,
  VIRTUAL: Monitor,
};

export const SERVICE_TYPE_FILTER_LABEL: Record<string, string> = {
  BOOKABLE: "Bookable",
  QUOTE: "Quote",
  SUBSCRIPTION: "Subscription",
  ON_DEMAND: "On demand",
  VIRTUAL: "Virtual",
};

/** Short badge copy for cards (matches existing UX). */
export const SERVICE_TYPE_BADGE_LABEL: Record<string, string> = {
  BOOKABLE: "Bookable",
  QUOTE: "Get Quote",
  SUBSCRIPTION: "Subscribe",
  ON_DEMAND: "On Demand",
  VIRTUAL: "Virtual",
};

export function serviceTypeLucideIcon(type: string | null | undefined): LucideIcon {
  if (!type) return ConciergeBell;
  return SERVICE_TYPE_LUCIDE[type] ?? ConciergeBell;
}
