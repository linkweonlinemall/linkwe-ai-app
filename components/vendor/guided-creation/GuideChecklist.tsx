"use client";
import type { GuideResult } from "@/lib/vendor/guided-creation/model";
import s from "./guide.module.css";
export default function GuideChecklist({ result, checked, disabled, onChange, compact = false }: { result: GuideResult; checked: string[]; disabled?: boolean; onChange: (checked: string[]) => void; compact?: boolean }) {
  return <div className={compact ? s.compactChecklist : s.checklist}>
    <p className={s.checkCount}>{checked.length} of {result.steps.length} steps checked · Your manual review</p>
    {result.steps.map((step, index) => <label key={step.id} className={s.checkRow} data-done={checked.includes(step.id)}>
      <input type="checkbox" checked={checked.includes(step.id)} disabled={disabled} onChange={event => onChange(event.target.checked ? [...checked, step.id] : checked.filter(id => id !== step.id))}/>
      <span><strong>{index + 1}. {step.title}</strong><small>{step.detail}</small></span>
    </label>)}
    {checked.length === result.steps.length && <p className={s.notice}>Checklist complete. Review and publish through the listing form when you are ready.</p>}
  </div>;
}
