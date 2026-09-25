import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getCreationLibrary } from "@/lib/vendor/creation/query";
import CreationLibrary from "@/components/vendor/creation/CreationLibrary";
export const dynamic="force-dynamic";
export default async function Page(){const session=await getSession();if(!session||session.role!=="VENDOR")redirect("/login");const data=await getCreationLibrary(session.userId);if(!data)redirect("/dashboard/vendor");return <CreationLibrary initialData={data}/>;}
