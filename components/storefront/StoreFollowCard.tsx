"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { IconBookmark, IconCircleCheck } from "@tabler/icons-react";

import { toggleFollowStore } from "@/app/actions/store";

const SCARLET = "#D4450A";

type Props = {
  storeId: string;
  storeName: string;
  initialFollowing: boolean;
  followerCount: number;
};

export default function StoreFollowCard({
  storeId,
  storeName,
  initialFollowing,
  followerCount,
}: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(followerCount);
  const [busy, setBusy] = useState(false);

  const toggle = useCallback(async () => {
    setBusy(true);
    const prevFollow = following;
    const prevCount = count;
    setFollowing(!prevFollow);
    setCount((c) => (prevFollow ? Math.max(0, c - 1) : c + 1));

    const result = await toggleFollowStore(storeId);
    if ("error" in result) {
      setFollowing(prevFollow);
      setCount(prevCount);
      if (result.error.includes("Sign in")) {
        router.push("/login");
      }
    } else {
      setFollowing(result.following);
      setCount(result.followerCount);
    }
    setBusy(false);
  }, [count, following, router, storeId]);

  return (
    <div className="mb-3.5 rounded-xl bg-[#1C1C1A] p-[18px] text-center">
      {following ? (
        <>
          <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-[#3B6D11]/20">
            <IconCircleCheck className="size-6 text-[#3B6D11]" stroke={1.75} aria-hidden />
          </div>
          <p className="text-[13px] font-medium text-white">Store saved</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void toggle()}
            className="mt-2 text-[11px] text-white/40 underline-offset-2 hover:text-white/60 hover:underline disabled:opacity-60"
          >
            Remove from saved stores
          </button>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-white">Save this store</p>
          <p className="mb-3.5 mt-1 text-[11px] text-white/[0.45]">
            Keep it handy in your saved stores
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void toggle()}
            className="inline-flex h-[38px] w-full items-center justify-center gap-1.5 rounded-[9px] text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: SCARLET }}
          >
            <IconBookmark className="size-4" stroke={1.75} aria-hidden />
            Save {storeName}
          </button>
          <p className="mt-2.5 text-[11px] text-white/[0.35]">
            {count === 1 ? "Saved by 1 customer" : `Saved by ${count} customers`}
          </p>
        </>
      )}
    </div>
  );
}
