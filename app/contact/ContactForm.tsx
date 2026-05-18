"use client";
import { useState } from "react";

const TOPICS = [
  { value: "order", label: "Order issue" },
  { value: "vendor", label: "Vendor support" },
  { value: "courier", label: "Courier support" },
  { value: "billing", label: "Billing or payment" },
  { value: "account", label: "Account issue" },
  { value: "report", label: "Report a problem" },
  { value: "other", label: "Other" },
];

type Props = {
  userEmail?: string;
  userName?: string;
};

export default function ContactForm({ userEmail = "", userName = "" }: Props) {
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!name.trim()) { setError("Please enter your name"); return; }
    if (!email.trim()) { setError("Please enter your email"); return; }
    if (!topic) { setError("Please select a topic"); return; }
    if (!message.trim() || message.trim().length < 20) {
      setError("Please write a message of at least 20 characters");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, topic, message }),
      });

      if (!res.ok) throw new Error("Failed to send");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please email us directly at admin@linkwemall.com");
    }

    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 p-12 text-center">
        <span className="mb-4 text-5xl">✅</span>
        <h2 className="text-lg font-bold text-emerald-900">Message sent!</h2>
        <p className="mt-2 text-sm text-emerald-700">
          Thank you for reaching out. We will get back to you within 24 hours at{" "}
          <strong>{email}</strong>.
        </p>
        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setMessage("");
            setTopic("");
          }}
          className="mt-6 text-xs font-semibold text-emerald-700 hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-lg font-bold text-zinc-900">Send us a message</h2>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
              Your name <span className="text-[#D4450A]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
              Email address <span className="text-[#D4450A]">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
            Topic <span className="text-[#D4450A]">*</span>
          </label>
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
          >
            <option value="">Select a topic</option>
            {TOPICS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
            Message <span className="text-[#D4450A]">*</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue or question in detail..."
            rows={6}
            maxLength={2000}
            className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
          />
          <div className="mt-1 flex justify-between">
            <p className="text-xs text-zinc-400">
              {message.length < 20 ? `${20 - message.length} more characters needed` : "✓"}
            </p>
            <p className="text-xs text-zinc-400">{message.length}/2000</p>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs font-semibold text-red-700">{error}</p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}
        >
          {submitting ? "Sending..." : "Send message"}
        </button>

        <p className="text-center text-xs text-zinc-400">
          Or email us directly at{" "}
          <a href="mailto:admin@linkwemall.com" className="font-semibold text-[#D4450A] hover:underline">
            admin@linkwemall.com
          </a>
        </p>
      </div>
    </div>
  );
}
