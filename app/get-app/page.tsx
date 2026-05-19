import type { Metadata } from "next";

import GetAppClient from "./GetAppClient";

export const metadata: Metadata = {
  title: "Get the app",
  description:
    "Install LinkWe Online Mall on your phone or desktop. Available on iPhone, Android, and desktop browsers.",
};

export default function GetAppPage() {
  return <GetAppClient />;
}
