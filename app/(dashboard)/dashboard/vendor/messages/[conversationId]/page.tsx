import VendorMessagesPage from "@/components/vendor/messages/VendorMessagesPage";
export const metadata = { title: "Conversation · Vendor messages" };
export default async function Page({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  return <VendorMessagesPage conversationId={conversationId} />;
}
