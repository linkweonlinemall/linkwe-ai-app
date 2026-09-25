"use client";
import { CalendarPlus } from "lucide-react";
import { calendarFile } from "@/lib/customer/experiences";
import styles from "./customer.module.css";
export default function CalendarDownload(props: Parameters<typeof calendarFile>[0]) {
  function download() {
    const url = URL.createObjectURL(new Blob([calendarFile(props)], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "linkwe-appointment.ics"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <button type="button" className={styles.secondary} onClick={download}><CalendarPlus size={16} />Add to calendar</button>;
}
