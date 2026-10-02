import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, id, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "block text-xs font-semibold text-foreground uppercase tracking-wider",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {label}
            {props.required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          disabled={disabled}
          ref={ref}
          className={cn(
            "flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-foreground-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:border-transparent disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-60",
            error && "border-error focus-visible:ring-error",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-error font-medium">{error}</p>
        )}
        {!error && helperText && (
          <p className="text-xs text-foreground-muted">{helperText}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
