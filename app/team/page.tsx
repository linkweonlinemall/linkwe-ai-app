import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getStaffPortal } from "@/app/actions/staff-access";
import TeamPortal from "./team-portal";
export default async function TeamPage(){if(!await getSession())redirect("/login?callbackUrl=%2Fteam");return <TeamPortal members={await getStaffPortal()}/>;}
