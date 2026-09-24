"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Search, X, CircleHelp, LogOut } from "lucide-react";
import { logoutAction } from "@/app/(auth)/auth-actions";
import { searchWorkspace, workspaceHref, workspaceLinkActive } from "./dashboard-navigation";
import s from "./workspace.module.css";

export default function VendorWorkspaceMenu() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const pathname = usePathname() ?? "";
  useEffect(() => {
    function open() { setQuery(""); dialog.current?.showModal(); }
    function close() { dialog.current?.close(); }
    function key(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (dialog.current?.open) close(); else open();
      }
    }
    window.addEventListener("vendor-workspace:open-menu", open);
    window.addEventListener("vendor-tour:open-more", open);
    window.addEventListener("vendor-tour:close-more", close);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("vendor-workspace:open-menu", open);
      window.removeEventListener("vendor-tour:open-more", open);
      window.removeEventListener("vendor-tour:close-more", close);
      window.removeEventListener("keydown", key);
    };
  }, []);
  const groups = searchWorkspace(query);
  const close = () => dialog.current?.close();
  return <dialog ref={dialog} className={s.menu} aria-labelledby="workspace-menu-title" onClick={e => { if (e.target === e.currentTarget) close(); }}>
    <div className={s.menuInner}>
      <div className={s.menuHeading}><div><p className={s.eyebrow}>YOUR LINKWE WORKSPACE</p><h2 id="workspace-menu-title">Where would you like to go?</h2></div><button className={s.iconButton} onClick={close} aria-label="Close menu"><X size={20}/></button></div>
      <label className={s.menuSearch}><Search size={20}/><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a tool, page or task…" aria-label="Search dashboard tools"/><kbd>⌘ K</kbd></label>
      <div className={s.menuResults}>
        {groups.length === 0 ? <p className={s.emptySearch}>No tools found. Try “photos”, “orders” or “bank”.</p> : groups.map(group => <section key={group.label}><h3>{group.label}</h3><div className={s.menuGrid}>{group.items.map(item => <Link key={item.path} href={workspaceHref(item.path)} onClick={close} aria-current={workspaceLinkActive(pathname, item.path) ? "page" : undefined} className={s.menuLink}><item.icon size={21}/><span><strong>{item.label}</strong><small>{item.description}</small></span><ArrowUpRight size={16}/></Link>)}</div></section>)}
      </div>
      <footer className={s.menuFooter}><button onClick={() => { close(); window.dispatchEvent(new CustomEvent("vendor-tour:open-library")); }}><CircleHelp size={18}/>Help & tutorials</button><Link href="/" onClick={close}>Marketplace<ArrowUpRight size={15}/></Link><form action={logoutAction}><button type="submit"><LogOut size={17}/>Sign out</button></form></footer>
    </div>
  </dialog>;
}
