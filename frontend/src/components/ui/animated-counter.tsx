"use client";

import { useEffect, useState } from "react";
import { useMotionValue, useTransform, animate } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function AnimatedCounter({ value, duration = 1.5, prefix = "", suffix = "", decimals = 0 }: AnimatedCounterProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => {
    const num = decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString();
    return `${prefix}${num}${suffix}`;
  });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    const controls = animate(count, value, { duration });
    const unsub = rounded.on("change", setDisplay);
    return () => {
      controls.stop();
      unsub();
    };
  }, [value, duration, count, rounded]);

  return <span className="font-mono tabular-nums">{display}</span>;
}
