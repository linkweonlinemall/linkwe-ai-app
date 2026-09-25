import { redirect } from "next/navigation";
import { deskHref } from "@/lib/vendor/service-desk";

export default async function Page({ searchParams }: { searchParams: Promise<{ subscription?: string }> }) {
  const params = await searchParams;
  redirect(deskHref("subscription", params.subscription));
}
