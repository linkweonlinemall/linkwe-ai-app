"use client";

import { StaffScanPage } from "./StaffScanPage";

export default function StaffScanRoutePage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-[#1C1C1A]">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-8 text-center">
          <img
            src="/linkwe-logo-on-light.png"
            alt="LinkWe"
            className="mx-auto h-12 w-auto object-contain sm:h-14"
          />
        </div>

        <StaffScanPage />
      </div>
    </main>
  );
}
