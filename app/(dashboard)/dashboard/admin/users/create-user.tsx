"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createAdminUser } from "@/app/actions/admin-users";
import PasswordInput from "@/components/ui/PasswordInput";
export default function CreateUser() {
  const [open,setOpen] = useState(false);
  const [busy,setBusy] = useState(false);
  const router = useRouter();
  const field = "mt-1 min-h-11 w-full rounded-xl border border-zinc-200 px-3 py-2";
  return <div className="mb-5"><button onClick={() => setOpen(!open)} className="min-h-11 rounded-xl bg-[#D4450A] px-5 font-semibold text-white">{open ? "Close new account" : "+ Create user"}</button>{open && <form className="mt-4 grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-2" onSubmit={async e => {
    e.preventDefault(); const form = e.currentTarget; const values = new FormData(form);
    const input = { fullName: String(values.get("fullName")), email: String(values.get("email")), phone: String(values.get("phone")), password: String(values.get("password")), role: String(values.get("role")) };
    if (!window.confirm(`Create ${input.fullName} as ${input.role}?${input.role === "ADMIN" ? " This grants full access to all Admin operations." : ""}`)) return;
    setBusy(true); try { const result = await createAdminUser(input); if (result.error) toast.error(result.error); else { toast.success("Account created. Share the login details securely."); form.reset(); setOpen(false); router.refresh(); } } catch { toast.error("Could not create account."); } finally { setBusy(false); }
  }}><label className="text-sm">Full name<input name="fullName" required maxLength={150} className={field}/></label><label className="text-sm">Email<input name="email" type="email" required className={field}/></label><label className="text-sm">Phone (optional)<input name="phone" type="tel" className={field}/></label><label className="text-sm">Role<select name="role" className={field}><option value="CUSTOMER">Customer</option><option value="VENDOR">Vendor</option><option value="ADMIN">Admin — full access</option></select></label><label className="text-sm">Initial password<PasswordInput name="password" required minLength={12} maxLength={72} autoComplete="new-password" className={field}/></label><p className="self-center text-xs leading-5 text-zinc-500">Use at least 12 characters. Share the password securely and have the user change it in Settings. New vendors finish store onboarding after signing in.</p><button disabled={busy} className="min-h-11 rounded-xl bg-zinc-900 px-5 text-white disabled:opacity-50">{busy ? "Creating…" : "Review and create account"}</button></form>}</div>;
}
