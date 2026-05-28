"use client";

import { useEffect, useState } from "react";

type Props = {
  tags: string[];
};

const TAG_CLASS =
  "rounded-[20px] bg-[var(--color-background-secondary)] px-[10px] py-1 text-[11px] text-[var(--text-primary)]";
const MORE_PILL_CLASS =
  "rounded-[20px] border-[0.5px] border-[var(--color-border-tertiary)] px-[10px] py-1 text-[11px] text-[var(--text-muted)] transition-colors hover:bg-[var(--color-background-secondary)]";

export default function ProductCollapsibleTags({ tags }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (tags.length === 0) return null;

  const defaultCount = isMobile ? 3 : 5;
  const hasMore = tags.length > defaultCount;
  const visibleTags = expanded ? tags : tags.slice(0, defaultCount);
  const hiddenCount = tags.length - defaultCount;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {visibleTags.map((tag) => (
          <span key={tag} className={TAG_CLASS}>
            {tag}
          </span>
        ))}
        {!expanded && hasMore ? (
          <button type="button" className={MORE_PILL_CLASS} onClick={() => setExpanded(true)}>
            + {hiddenCount} more
          </button>
        ) : null}
      </div>
      {expanded && hasMore ? (
        <button
          type="button"
          className="mt-2 text-[11px] text-[var(--text-muted)] underline-offset-2 hover:underline"
          onClick={() => setExpanded(false)}
        >
          Show less
        </button>
      ) : null}
    </div>
  );
}
