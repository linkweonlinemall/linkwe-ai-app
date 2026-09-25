"use server";

import { unstable_rethrow } from "next/navigation";
import { chooseCourierPickup, chooseVendorDropoff, markDigitalFulfilled } from "@/app/actions/fulfillment";

export async function submitOrderHandover(_state: { error: string }, data: FormData) {
  if (data.get("confirmed") !== "yes") return { error: "Confirm that your order is ready before continuing." };
  const method = data.get("method");
  if (!["dropoff", "pickup", "digital"].includes(String(method))) return { error: "Choose how you will hand over this order." };
  try {
    if (method === "dropoff") await chooseVendorDropoff(data);
    else if (method === "pickup") await chooseCourierPickup(data);
    else await markDigitalFulfilled(data);
    return { error: "" };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Vendor order handover failed", error);
    return { error: "We couldn’t update this order. Refresh to check its latest status, then try again." };
  }
}
