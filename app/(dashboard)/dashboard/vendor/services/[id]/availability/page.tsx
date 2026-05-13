import { redirect } from "next/navigation";

export default async function ServiceAvailabilityRedirect() {
  redirect("/dashboard/vendor/staff");
}

