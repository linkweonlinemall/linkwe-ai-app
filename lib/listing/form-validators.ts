export function validateListingTitle(title: string): string | null {
  const t = title.trim();
  if (!t) return "Title is required.";
  if (t.length > 200) return "Title is too long.";
  return null;
}

export function validateListingShortDescription(text: string): string | null {
  const t = text.trim();
  if (!t) return "Short description is required.";
  if (t.length > 2000) return "Short description is too long.";
  return null;
}
