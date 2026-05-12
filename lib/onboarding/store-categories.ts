import { STORE_CATEGORIES } from "@/lib/categories";

export const STORE_CATEGORY_OPTIONS = STORE_CATEGORIES.map((c) => ({
  id: c.value,
  label: c.label,
}));
