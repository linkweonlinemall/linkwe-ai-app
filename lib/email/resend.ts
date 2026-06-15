import { Resend } from "resend";

import { getAppBaseUrl } from "@/lib/app-base-url";

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "noreply@linkweonlinemall.com";

export const BASE_URL = getAppBaseUrl();
