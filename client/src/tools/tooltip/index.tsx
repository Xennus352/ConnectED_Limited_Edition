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
 */
const CustomTooltip: React.FC<PropsI> = ({ children, title }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>
          <p>{title}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default CustomTooltip;
