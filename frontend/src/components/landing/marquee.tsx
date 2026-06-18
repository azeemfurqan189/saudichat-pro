"use client";

import { cn } from "@/lib/utils";

type MarqueeProps = {
  children: React.ReactNode;
  reverse?: boolean;
  speed?: "slow" | "normal" | "fast";
  className?: string;
  pauseOnHover?: boolean;
};

export function Marquee({
  children,
  reverse = false,
  speed = "normal",
  className,
  pauseOnHover = true,
}: MarqueeProps) {
  const duration =
    speed === "slow" ? "55s" : speed === "fast" ? "28s" : "40s";

  return (
    <div
      className={cn(
        "group/marquee relative flex overflow-hidden",
        "[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]",
        className
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center gap-5 will-change-transform",
          reverse ? "animate-marquee-reverse" : "animate-marquee",
          pauseOnHover && "group-hover/marquee:[animation-play-state:paused]"
        )}
        style={{ animationDuration: duration }}
      >
        {children}
        {children}
      </div>
    </div>
  );
}

export function MarqueeItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("shrink-0", className)}>{children}</div>
  );
}
