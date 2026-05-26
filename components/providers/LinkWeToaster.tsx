"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

/**
 * Responsive position: centered on handheld, bottom-right on lg+.
 */
export default function LinkWeToaster() {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    function update() {
      setMobile(mq.matches);
    }
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <Toaster
      position={mobile ? "bottom-center" : "bottom-right"}
      duration={3000}
      closeButton={false}
      richColors
      toastOptions={{
        classNames: {
          toast:
            "font-sans shadow-lg border border-zinc-200/80 [&_[data-description]]:text-zinc-600 [&_[data-title]]:font-semibold",
        },
      }}
    />
  );
}
