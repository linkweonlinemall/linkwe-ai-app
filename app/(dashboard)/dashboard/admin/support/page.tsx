import SupportPage from "@/components/support/SupportPage";
export default async function Page({searchParams}:{searchParams:Promise<{ticket?:string}>}){return <SupportPage admin selectedId={(await searchParams).ticket}/>;}
