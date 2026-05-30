import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm",
          "placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "dark:border-slate-700 dark:bg-slate-900",
          error && "border-red-500",
          className
        )}
        ref={ref}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
);
Input.displayName = "Input";

export { Input };
