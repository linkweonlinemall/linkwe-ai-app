import { Fragment } from "react";

const SCARLET = "#D4450A";
const EMERALD = "#059669";

type Props = {
  steps: readonly string[];
  stepIndex: number;
};

export default function SplitProgressMini({ steps, stepIndex }: Props) {
  const lastIdx = steps.length - 1;
  const allComplete = stepIndex >= lastIdx;

  return (
    <div className="overflow-x-auto px-4 py-3">
      <div className="flex min-w-max items-center gap-1 sm:gap-0">
        {steps.map((label, i) => {
          const isPast = i < stepIndex || (allComplete && i === lastIdx);
          const isCurrent = !isPast && i === stepIndex;
          return (
            <Fragment key={`${label}-${i}`}>
              <div className="flex min-w-[3.25rem] flex-col items-center text-center sm:min-w-[4rem]">
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                  style={{
                    backgroundColor: isCurrent ? SCARLET : isPast ? EMERALD : "#f4f4f5",
                    color: isCurrent || isPast ? "#fff" : "#a1a1aa",
                  }}
                >
                  {isPast ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <p
                  className="mt-1 max-w-[4rem] text-[9px] font-medium leading-tight sm:text-[10px]"
                  style={{ color: isCurrent ? SCARLET : isPast ? EMERALD : "#a1a1aa" }}
                >
                  {label}
                </p>
              </div>
              {i < lastIdx ? (
                <div
                  className="mx-0.5 h-0.5 w-4 shrink-0 sm:mx-1 sm:min-w-[12px] sm:flex-1"
                  style={{ backgroundColor: i < stepIndex ? SCARLET : "#e4e4e7" }}
                  aria-hidden
                />
              ) : null}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
