"use client";
import {useActionState,useEffect,useRef,type ReactNode} from "react";
import {saveStoreProfile} from "@/app/actions/store";
import {StoreEditSaveButton} from "./store-edit-save-button";
export default function StoreEditForm({children}:{children:ReactNode}){
 const [state,action]=useActionState(saveStoreProfile,{});const alert=useRef<HTMLParagraphElement>(null);
 useEffect(()=>{if(state.error)alert.current?.focus();},[state]);
 return <form action={action} onReset={event=>event.preventDefault()} className="flex flex-col" id="vendor-store-edit-form">
 {state.error&&<p ref={alert} tabIndex={-1} role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{state.error} Your entries are still here.</p>}
 {children}
 <div className="sticky bottom-20 z-20 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d5decf] bg-white/95 p-4 shadow-lg backdrop-blur md:bottom-3"><p className="text-xs text-[#697b63]">Save your profile before editing the gallery.</p><div className="min-w-40"><StoreEditSaveButton/></div></div>
 </form>;
}
