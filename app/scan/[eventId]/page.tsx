import type { Metadata } from "next";

import { StaffScanPage } from "./StaffScanPage";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ eventId: string }> };

export const metadata: Metadata = {
  title: "Staff check-in",
  description: "Scan event tickets at the door — no login required.",
};

export default async function StaffScanRoutePage({ params }: Props) {
  const { eventId } = await params;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-[#1C1C1A]">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-8 text-center">
          <img
            src="/linkwe-new-logo-light-2.png"
            alt="LinkWe"
            className="mx-auto h-12 w-auto object-contain sm:h-14"
          />
        </div>

        <StaffScanPage eventId={eventId} />
      </div>
    </main>
  );
}
