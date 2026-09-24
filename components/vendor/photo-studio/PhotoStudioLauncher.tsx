"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, Sparkles } from "lucide-react";
import PhotoStudio from "./PhotoStudio";
import s from "./photo-studio.module.css";

function StudioDialog({ onUse, onClose }: { onUse: (file: File) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);
  return createPortal(<dialog ref={dialog} className={s.dialog} aria-label="Product Photo Studio" onCancel={onClose} onClose={onClose}>
    <PhotoStudio compact onUse={file => { onUse(file); onClose(); }} onClose={onClose} />
  </dialog>, document.body);
}

export default function PhotoStudioLauncher({ onUse, disabled }: { onUse: (file: File) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className={s.launch} onClick={() => setOpen(true)} disabled={disabled}>
      <Sparkles size={23} /><span><strong>Give your product photo a polish</strong><small>White background, gentle lighting & a soft shadow.</small></span><ArrowUpRight size={19} />
    </button>
    {open && <StudioDialog onUse={onUse} onClose={() => setOpen(false)} />}
  </>;
}
