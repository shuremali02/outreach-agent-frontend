import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader } from "@/components/ui/loader";
import { withIcons } from "@/components/ui/emoji-icon";

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
  /**
   * Shows an inline spinner and disables the button (user request, 2026-09-22 -- a slow backend gave no
   * sign a click was still in flight, so the same button kept getting clicked). Pass a mutation's
   * `isPending`. Not supported together with `asChild` (Radix Slot needs exactly one child element).
   */
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(buttonVariants({ variant, size, block }), className)}
        {...props}
      >
        {loading && !asChild ? (
          <>
            <Loader />
            {withIcons(children)}
          </>
        ) : asChild ? (
          children
        ) : (
          // Emoji in a label -> lucide icon (components/ui/emoji-icon.tsx). Not under asChild: Slot needs the
          // one child element untouched.
          withIcons(children)
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
