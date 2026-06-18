"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionValue, useTransform, animate, useInView } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  /** Show 1M instead of 1,000,000 */
  compact?: boolean;
}

export function AnimatedCounter({
  value,
  duration = 2,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
  compact = false,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const count = useMotionValue(0);

  const format = (v: number) => {
    if (compact && v >= 1_000_000) return `${prefix}${Math.round(v / 1_000_000)}M${suffix}`;
    const num =
      decimals > 0
        ? v.toFixed(decimals)
        : Math.round(v).toLocaleString("en-US");
    return `${prefix}${num}${suffix}`;
  };

  const rounded = useTransform(count, format);
  const [display, setDisplay] = useState(format(0));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, value, { duration, ease: "easeOut" });
    const unsub = rounded.on("change", setDisplay);
    return () => {
      controls.stop();
      unsub();
    };
  }, [inView, value, duration, count, rounded]);

  return (
    <span ref={ref} className={`font-display tabular-nums ${className}`}>
      {display}
    </span>
  );
}

/** e.g. "4.9/5" */
export function AnimatedRating({
  value = 4.9,
  className = "",
}: {
  value?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const count = useMotionValue(0);
  const [display, setDisplay] = useState("0.0/5");

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, value, { duration: 2, ease: "easeOut" });
    const unsub = count.on("change", (v) => setDisplay(`${v.toFixed(1)}/5`));
    return () => {
      controls.stop();
      unsub();
    };
  }, [inView, value, count]);

  return (
    <span ref={ref} className={`font-display tabular-nums ${className}`}>
      {display}
    </span>
  );
}
