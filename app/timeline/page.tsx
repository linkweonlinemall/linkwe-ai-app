import { redirect } from "next/navigation";
import { getTimelineFeed } from "@/app/actions/business-timeline";
import TimelineClient from "./timeline-client";
export default async function TimelinePage(){const data=await getTimelineFeed();if(!data.session)redirect("/login?next=/timeline");return <TimelineClient posts={JSON.parse(JSON.stringify(data.posts))}/>;}
