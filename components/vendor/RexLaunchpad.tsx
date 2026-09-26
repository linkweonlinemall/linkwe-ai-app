"use client";
import { CalendarDays, ChartNoAxesCombined, ClipboardList, MessageSquareHeart, PackagePlus, Tags, ArrowUpRight } from "lucide-react";
import s from "./rex-workspace.module.css";

const tasks = [
  { icon: ClipboardList, title: "Plan my day", text: "Turn pending work into clear next steps.", prompt: "Check my orders, inventory and service work. Give me a prioritised plan for today with links to the tasks that need attention. Read the data first." },
  { icon: PackagePlus, title: "Build a listing", text: "From an idea or a photo to a useful draft.", prompt: "Help me create a new draft listing. Ask what I'm selling and collect the details you need before saving it." },
  { icon: ChartNoAxesCombined, title: "Understand my money", text: "Released earnings, deductions and payouts.", prompt: "Read my real finance position and explain my released earnings, deductions, available balance and pending payouts in TTD. Keep direct pay-on-arrival collections separate." },
  { icon: CalendarDays, title: "Prepare for appointments", text: "Look ahead at bookings and requests.", prompt: "Check my upcoming appointments and pending service requests. Tell me what needs preparation and which requests are waiting. Use Trinidad time." },
  { icon: MessageSquareHeart, title: "Learn from feedback", text: "Find useful themes and draft a response.", prompt: "Read my review summary and recent feedback. Identify specific improvements and help me draft a reply to an unanswered review. Do not publish a response." },
  { icon: Tags, title: "Plan a promotion", text: "Build an offer around your real catalogue.", prompt: "Check my current coupons and inventory, then suggest a practical promotion. Explain its cost and restrictions and let me choose before changing anything." },
];

export default function RexLaunchpad({ onChoose }: { onChoose: (prompt: string) => void }) {
  return <div className={s.tasks}>{tasks.map(({ icon: Icon, title, text, prompt }) => <button type="button" key={title} onClick={() => onChoose(prompt)}><span className={s.icon}><Icon size={20}/></span><span><strong>{title}</strong><small>{text}</small></span><ArrowUpRight size={15}/></button>)}</div>;
}
