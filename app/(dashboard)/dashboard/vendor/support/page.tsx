import SupportPage from "@/components/support/SupportPage";
export default async function Page({searchParams}:{searchParams:Promise<{ticket?:string}>}){return <SupportPage selectedId={(await searchParams).ticket}/>;}
