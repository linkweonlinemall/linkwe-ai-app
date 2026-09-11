import { redirect } from "next/navigation";
import { getVendorTimeline } from "@/app/actions/business-timeline";
import TimelineManager from "./timeline-manager";
export default async function VendorTimelinePage(){const data=await getVendorTimeline();if(!data.store)redirect("/onboarding/business");return <TimelineManager storeName={data.store.name} posts={JSON.parse(JSON.stringify(data.posts))}/>;}
