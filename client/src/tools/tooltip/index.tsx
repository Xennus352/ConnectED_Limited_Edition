import React from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PropsI {
  children: React.ReactNode;
  title: string;
}

/**
 * Tooltip wrapper that renders its child as the trigger (`asChild`).
 * Using `asChild` keeps a single interactive element in the DOM, so wrapping
 * a `<button>` here no longer produces a `<button>` inside a `<button>`.
 *
 * The component is `forwardRef` so it can be used as the child of other
 * `asChild` primitives (e.g. `PopoverTrigger asChild`). Without forwarding,
 * radix tries to attach its anchor ref to this function component and React
 * logs "Function components cannot be given refs".
 */
const CustomTooltip = React.forwardRef<HTMLElement, PropsI>(
  ({ children, title }, ref) => {
    const child = React.isValidElement(children)
      ? React.cloneElement(
          children as React.ReactElement<{ ref?: React.Ref<HTMLElement> }>,
          { ref }
        )
      : children;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{child}</TooltipTrigger>
          <TooltipContent>
            <p>{title}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

CustomTooltip.displayName = "CustomTooltip";

export default CustomTooltip;