import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getCreationLibrary } from "@/lib/vendor/creation/query";
import { CreationChooser } from "@/components/vendor/creation/CreationLibrary";
import CreationEditorShell from "@/components/vendor/creation/CreationEditorShell";
import { ProductForm } from "@/app/(dashboard)/dashboard/vendor/products/new/product-form";
import ServiceCreateForm from "@/components/vendor/creation/ServiceCreateForm";
import EventCreateForm from "@/components/vendor/creation/EventCreateForm";
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<{type?:string}>}){const session=await getSession();if(!session||session.role!=="VENDOR")redirect("/login");const {type}=await searchParams;const data=await getCreationLibrary(session.userId);if(!data)redirect("/dashboard/vendor");if(type==="product")return <CreationEditorShell kind="product" title="Create a product" isNew><ProductForm/></CreationEditorShell>;if(type==="service")return <CreationEditorShell kind="service" title="Create a service" isNew><ServiceCreateForm/></CreationEditorShell>;if(type==="event")return <CreationEditorShell kind="event" title="Create an event" isNew><EventCreateForm/></CreationEditorShell>;return <CreationChooser events={data.items.filter(item=>item.kind==="event")}/>;}
