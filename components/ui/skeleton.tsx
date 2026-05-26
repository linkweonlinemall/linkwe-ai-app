import type { ComponentPropsWithoutRef } from "react";

type SkeletonProps = ComponentPropsWithoutRef<"div">;

/**
 * Pulse placeholder between zinc-200 and zinc-300 (see globals `.lw-skeleton`).
 */
export default function Skeleton({ className = "", ...props }: SkeletonProps) {
  return <div role="presentation" className={`lw-skeleton rounded-md bg-zinc-200 ${className}`} {...props} />;
}
