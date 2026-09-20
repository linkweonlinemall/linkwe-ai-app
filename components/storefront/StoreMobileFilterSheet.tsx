"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import styles from "./storefront.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  onReset: () => void;
  resultCount: number;
  resultLabel: string;
  children: ReactNode;
};

export default function StoreMobileFilterSheet({ open, onClose, onReset, resultCount, resultLabel, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const sheet = dialog.current;
    if (open) sheet?.showModal();
    else sheet?.close();
  }, [open]);
  return <dialog ref={dialog} className={styles.filterDialog} aria-label="Store filters" onCancel={onClose} onClose={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={styles.filterSheet}>
      <div className={styles.filterSheetHeader}><h2>Make it your kind of find.</h2><button type="button" onClick={onClose} aria-label="Close filters"><X size={21} /></button></div>
      <button type="button" className={styles.filterReset} onClick={onReset}>Reset all</button>
      {children}
      <button type="button" className={styles.filterApply} onClick={onClose}>Show {resultCount} {resultLabel}</button>
    </div>
  </dialog>;
}
