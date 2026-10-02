import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors border",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-brand-primary text-white",
        secondary:
          "border-border bg-surface-subtle text-foreground-muted",
        success:
          "border-success-border bg-success-bg text-success",
        warning:
          "border-warning-border bg-warning-bg text-warning",
        error:
          "border-error-border bg-error-bg text-error",
        info:
          "border-info-border bg-info-bg text-info",
        outline:
          "border-border bg-transparent text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { badgeVariants };
