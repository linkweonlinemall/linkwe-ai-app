import type { Metadata } from "next";
import PhotoStudio from "@/components/vendor/photo-studio/PhotoStudio";

export const metadata: Metadata = { title: "Photo Studio · LinkWe", robots: { index: false, follow: false } };
export default function PhotoStudioPage() { return <PhotoStudio />; }
