import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Ported from the Streamlit button CSS:
 *   secondary — CARD_BG + 1px CARD_BORDER, hover flips border+text to ACCENT
 *   primary   — solid ACCENT, white text, no border, hover ACCENT_HOVER
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[8px] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-accent text-white hover:bg-accent-hover",
        secondary: "border border-border bg-card text-text hover:border-accent hover:text-accent",
        ghost: "text-muted hover:text-accent",
        danger: "border border-border bg-card text-text hover:border-danger hover:text-danger",
        success: "text-white shadow-[var(--shadow-call)]",
      },
      size: {
        sm: "px-3 py-1.5 text-[0.82rem]",
        md: "px-5 py-2 text-[0.88rem]",
        lg: "px-6 py-2.5 text-[0.95rem]",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "secondary", size: "md", block: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, block }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
