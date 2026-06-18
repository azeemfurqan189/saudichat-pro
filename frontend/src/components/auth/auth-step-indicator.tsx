"use client";

interface AuthStepIndicatorProps {
  step: number;
  total?: number;
}

export function AuthStepIndicator({ step, total = 3 }: AuthStepIndicatorProps) {
  return (
    <div className="mt-4 flex justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 w-8 rounded-full transition-colors ${
            step >= i + 1 ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"
          }`}
        />
      ))}
    </div>
  );
}
