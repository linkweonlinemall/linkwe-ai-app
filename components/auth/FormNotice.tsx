"use client";
import { useEffect, useRef } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import s from "./auth.module.css";

export default function FormNotice({ message, success = false }: { message?: string; success?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (message && !success) ref.current?.focus(); }, [message, success]);
  if (!message) return null;
  const Icon = success ? CircleCheck : CircleAlert;
  return <div ref={ref} tabIndex={-1} role={success ? "status" : "alert"} className={`${s.notice} ${success ? s.success : ""}`}><Icon size={17}/><span>{message}</span></div>;
}
