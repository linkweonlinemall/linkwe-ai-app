"use server";

const POPULAR_SEARCHES = [
  "hairdresser",
  "graphic tee",
  "plumber",
  "electrician",
  "barber",
  "food",
  "electronics",
  "fashion",
  "jewellery",
  "catering",
] as const;

export async function getPopularSearches(): Promise<string[]> {
  return [...POPULAR_SEARCHES];
}
