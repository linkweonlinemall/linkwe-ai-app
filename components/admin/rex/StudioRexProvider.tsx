"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { askCreationStudioRex } from "@/app/actions/studio-assistant";
import { objectParameters, redactStudioSecrets, type StudioSurface, type StudioStep, type StudioReview } from "@/lib/admin/studio-rex";
import AdminDialog from "@/app/(dashboard)/dashboard/admin/components/admin-dialog";
import RexConversation, { type RexMessage, type RexPhase } from "./RexConversation";
import s from "./rex.module.css";

type Registration = (key: string, get: () => StudioSurface) => () => void;
const Context = createContext<{ register: Registration; working: boolean } | null>(null);
export function useStudioRex(surface: StudioSurface) {
  const context = useContext(Context), ref = useRef(surface);
  useEffect(() => { ref.current = surface; });
  const register = context?.register;
  useEffect(() => register?.(surface.key, () => ref.current), [register, surface.key]);
  return context?.working || false;
}
export default function StudioRexProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter(), pathname = usePathname();
  const enabled = pathname === "/dashboard/admin/onboarding" || pathname.startsWith("/dashboard/admin/records/");
  const surfaces = useRef(new Map<string, () => StudioSurface>());
  const path = useRef(pathname); path.current = pathname;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [messages, setMessages] = useState<RexMessage[]>([]), [question, setQuestion] = useState("");
  const [phase, setPhase] = useState<RexPhase>("idle"), [activity, setActivity] = useState("");
  const [review, setReview] = useState<{ step: StudioStep; detail: StudioReview; fingerprint: string; surfaceKey: string } | null>(null);
  const request = useRef({ question: "", history: [] as RexMessage[], receipts: [] as string[] });
  const running = useRef(false);
  const register = useCallback<Registration>((key, getter) => { surfaces.current.set(key, getter); return () => { if (surfaces.current.get(key) === getter) surfaces.current.delete(key); }; }, []);
  function activeSurfaces() { return [...surfaces.current.values()].map(get => get()); }
  function canNavigate() { return activeSurfaces().every(surface => !surface.busy && (!surface.canLeave || surface.canLeave())); }
  function navigationSurface(): StudioSurface {
    return { key: "navigation", title: "Creation Studio navigation", state: { path: path.current }, actions: [
      { name: "open_studio_record", description: "Open a new or existing record editor. Use kind and a real ID or new. If requested, ownerId/storeId preselects the owner/store. After navigating, stop this tool sequence so fresh editor controls can load.", parameters: objectParameters({ kind: { type: "string", enum: ["store", "product", "service", "user", "listing"] }, id: { type: "string" }, parentId: { type: "string" } }, ["kind", "id"]) },
      { name: "open_creation_studio", description: "Return to Creation Studio to use vendor setup, find/edit or account operations.", parameters: objectParameters() },
      { name: "open_bulk_import", description: "Open CSV/Excel import for vendors, products, services or events. Rex is also available in that workspace.", parameters: objectParameters({ kind: { type: "string", enum: ["vendor", "product", "service", "event"] } }, ["kind"]) },
    ], run: async step => {
      if (!canNavigate()) throw new Error("Save or reset the current form changes before opening another workspace.");
      if (step.action === "open_studio_record") {
        const kind = String(step.args.kind), id = String(step.args.id);
        if (!["store", "product", "service", "user", "listing"].includes(kind) || !/^(new|[a-zA-Z0-9_-]{1,100})$/.test(id)) throw new Error("Choose a valid record.");
        const href = `/dashboard/admin/records/${kind}/${id}${step.args.parentId ? `?${kind === "store" ? "ownerId" : "storeId"}=${encodeURIComponent(String(step.args.parentId))}` : ""}`;
        router.push(href); return { message: `Opened the ${kind} editor.`, waitFor: `record:${kind}:${id}` };
      }
      if (step.action === "open_creation_studio") { router.push("/dashboard/admin/onboarding"); return { message: "Opened Creation Studio.", waitFor: "launcher" }; }
      if (step.action === "open_bulk_import" && ["vendor", "product", "service", "event"].includes(String(step.args.kind))) { router.push(`/dashboard/admin/imports?kind=${step.args.kind}`); return { message: "Opened Bulk Import. Continue with Rex there after uploading your spreadsheet.", stop: true }; }
      throw new Error("That destination is unavailable.");
    } };
  }
  function allSurfaces() { return [...activeSurfaces(), navigationSurface()]; }
  async function settle(key?: string) {
    // Wait for React to commit a tool's form changes before giving the next model call fresh state.
    await new Promise(resolve => setTimeout(resolve, 80));
    if (!key) return;
    for (let attempt = 0; attempt < 100; attempt++) { if (surfaces.current.has(key)) return; await new Promise(resolve => setTimeout(resolve, 100)); }
    throw new Error("The editor is taking longer to open. Your completed changes are saved; try your next request once it loads.");
  }
  async function apply(step: StudioStep, confirmed = false) {
    const surface = allSurfaces().find(item => item.actions.some(action => action.name === step.action));
    if (!surface) throw new Error("The workspace changed. Ask Rex again from the current form.");
    if (surface.busy) throw new Error("Wait for the current save or upload to finish.");
    const detail = surface.review?.(step);
    if (detail && !confirmed) { setReview({ step, detail, surfaceKey: surface.key, fingerprint: JSON.stringify(surface.state) }); setPhase("review"); return true; }
    setPhase("working"); setActivity(surface.actions.find(action => action.name === step.action)?.description.split(".")[0] || "Updating your workspace…");
    const result = await surface.run(step);
    request.current.receipts.push(result.message);
    setMessages(previous => [...previous, { role: "assistant", content: result.message, outcome: "success" }]);
    await settle(result.waitFor);
    if (result.stop) { setPhase("done"); return true; }
    return false;
  }
  async function continueRequest() {
    for (let round = 0; round < 6; round++) {
      setPhase("thinking"); setActivity(round ? "Checking the result and the next step…" : "Reading the current form and your request…");
      const response = await askCreationStudioRex({ ...request.current, surfaces: allSurfaces().map(({ key, title, state, actions }) => ({ key, title, state: redactStudioSecrets(state) as Record<string, unknown>, actions })) });
      if (response.answer) setMessages(previous => [...previous, { role: "assistant", content: response.answer }]);
      if (!response.steps.length) { setPhase("done"); return; }
      for (const step of response.steps) if (await apply(step)) return;
    }
    setPhase("done"); setMessages(previous => [...previous, { role: "assistant", content: "Those steps are complete. Tell me what you’d like to do next." }]);
  }
  function failure(error: unknown) { setPhase("error"); setMessages(previous => [...previous, { role: "assistant", content: error instanceof Error ? error.message : "I couldn’t complete that action. Your form is still here.", outcome: "error" }]); }
  async function ask(event: React.FormEvent) {
    event.preventDefault(); if (!question.trim() || running.current || review) return;
    const text = question.trim(); setQuestion(""); setMessages(previous => [...previous, { role: "user", content: text }]);
    request.current = { question: text, history: messages.slice(-10), receipts: [] }; running.current = true;
    try { await continueRequest(); } catch (error) { failure(error); } finally { running.current = false; }
  }
  async function confirmReview() {
    if (!review || running.current) return;
    running.current = true;
    try {
      const surface = allSurfaces().find(item => item.key === review.surfaceKey);
      if (!surface || JSON.stringify(surface.state) !== review.fingerprint) throw new Error("The form changed since this review. Ask Rex to review the latest details before saving.");
      setReview(null); if (!(await apply(review.step, true))) await continueRequest();
    } catch (error) { setReview(null); failure(error); } finally { running.current = false; }
  }
  const working = phase === "thinking" || phase === "working";
  return <Context.Provider value={{ register, working }}><div className={enabled ? s.studioLayout : undefined}><div className={enabled ? s.studioMain : undefined}>{children}</div>{enabled && <aside className={s.studioAside} data-open={mobileOpen}><button type="button" className={s.mobileClose} aria-label="Close Rex conversation" onClick={() => setMobileOpen(false)}><X size={17}/></button><RexConversation title="Rex, your studio partner" subtitle="Create, edit and organise with the same controls available in your studio." messages={messages} question={question} onQuestion={setQuestion} onSubmit={ask} phase={phase} activity={activity} disabled={working || !!review} suggestions={pathname.includes("/records/") ? ["Check this form for missing details.", "Help me improve this description.", "Review and save my changes."] : ["Help me set up a vendor and store.", "Create a new product draft.", "Find a record to edit."]} footnote="Rex can edit the form and prepare saves, publication and account actions for your review. Choose local files when prompted."/></aside>}</div>{enabled && <button type="button" className={s.mobileToggle} aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}><Sparkles size={18}/>{working ? "Rex is working…" : mobileOpen ? "Hide Rex" : "Ask Rex"}</button>}{review && <AdminDialog title={review.detail.title} onClose={() => { if (!working) { setReview(null); setPhase("idle"); setMessages(previous => [...previous, { role: "assistant", content: "Review cancelled. That action was not applied; any staged form edits are still available." }]); } }}><p className="admin-muted">{review.detail.description}</p><div className={s.reviewFields}>{review.detail.fields.map((field, i) => <div key={i}><strong>{field.label}</strong><p>{field.value}</p></div>)}</div><div className={s.reviewButtons}><button type="button" className="admin-button" disabled={working} onClick={() => { setReview(null); setPhase("idle"); }}>Cancel</button><button type="button" className="admin-button admin-button-primary" disabled={working} onClick={() => void confirmReview()}>Confirm action</button></div></AdminDialog>}</Context.Provider>;
}
