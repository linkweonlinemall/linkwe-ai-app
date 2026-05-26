"use client";

import { useState } from "react";

type Props = {
  title: string;
  description: string;
};

export default function ExpandableDescription({ title, description }: Props) {
  const isLong = description.length > 600;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-3 font-sans text-xs font-normal uppercase tracking-wide text-gray-500">{title}</h2>
      <div
        className={`tiptap-content overflow-hidden font-sans text-[15px] leading-normal text-gray-700 transition-all ${
          !expanded && isLong ? "max-h-48" : "max-h-none"
        }`}
        dangerouslySetInnerHTML={{ __html: description }}
      />
      {isLong ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 font-sans text-xs font-semibold text-[#D4450A] hover:underline"
        >
          {expanded ? "Show less ↑" : "Read more ↓"}
        </button>
      ) : null}
    </div>
  );
}
