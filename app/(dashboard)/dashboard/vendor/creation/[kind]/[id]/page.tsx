import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import CreationEditorShell from "@/components/vendor/creation/CreationEditorShell";
import ProductEditor from "@/components/vendor/creation/ProductEditor";
import ServiceEditor from "@/components/vendor/creation/ServiceEditor";
import EventEditor from "@/components/vendor/creation/EventEditor";
import TicketEditor from "@/components/vendor/creation/TicketEditor";
export const dynamic="force-dynamic";
export default async function Page({params,searchParams}:{params:Promise<{kind:string;id:string}>;searchParams:Promise<{panel?:string;ticket?:string;new?:string}>}){const session=await getSession();if(!session||session.role!=="VENDOR")redirect("/login");const {kind,id}=await params;const search=await searchParams;const editorParams=Promise.resolve({id});if(kind==="product")return <CreationEditorShell kind="product" title="Edit your product"><ProductEditor params={editorParams}/></CreationEditorShell>;if(kind==="service")return <CreationEditorShell kind="service" title="Edit your service"><ServiceEditor params={editorParams}/></CreationEditorShell>;if(kind==="event")return <CreationEditorShell kind={search.panel==="tickets"?"ticket":"event"} title={search.panel==="tickets"?"Tickets & promotions":"Edit your event"} eventId={id} tickets={search.panel==="tickets"}>{search.panel==="tickets"?<TicketEditor params={editorParams} ticketId={search.ticket} addTicket={search.new==="1"}/>:<EventEditor params={editorParams}/>}</CreationEditorShell>;notFound();}
