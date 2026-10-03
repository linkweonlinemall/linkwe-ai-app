"use client";

import { StaffScanPage } from "./StaffScanPage";

export default function StaffScanRoutePage() {
  return (
    <main className="min-h-screen bg-[#edf5fa] px-4 py-8 text-[#174766]">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8 text-center">
          <img
            src="/branding/v2/mark-192.png"
            alt="LinkWe"
            className="mx-auto h-12 w-auto object-contain sm:h-14"
          />
        </div>

        <StaffScanPage />
      </div>
    </main>
  );
}
