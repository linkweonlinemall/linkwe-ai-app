import CustomerMessagesPage from "@/components/messages/CustomerMessagesPage";
export const metadata = { title: "Conversation | LinkWe" };
export default async function Page({params}:{params:Promise<{conversationId:string}>}) { const {conversationId}=await params; return <CustomerMessagesPage conversationId={conversationId}/>; }
