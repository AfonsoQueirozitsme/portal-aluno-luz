import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface GlowCursorProps {
  className?: string;
}

export default function GlowCursor({ className }: GlowCursorProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handler = (e: PointerEvent) => {
      // Respect reduced motion
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mq.matches) return;
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty("--cursor-x", `${x}%`);
      el.style.setProperty("--cursor-y", `${y}%`);
    };

    window.addEventListener("pointermove", handler);
    return () => window.removeEventListener("pointermove", handler);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn("absolute inset-0 -z-10", className)}
      style={{
        background:
          "radial-gradient(600px circle at var(--cursor-x, 50%) var(--cursor-y, 30%), hsl(var(--primary)/0.14), transparent 60%)",
        transition: "background-position 150ms ease-out",
      }}
    />
  );
}
