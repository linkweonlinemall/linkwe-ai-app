import { getSession } from "@/lib/auth/session";
import AcceptInvitation from "./accept-invitation";
export default async function InvitePage({params}:{params:Promise<{token:string}>}){const {token}=await params;const session=await getSession();return <AcceptInvitation token={token} email={session?.email??null}/>;}
