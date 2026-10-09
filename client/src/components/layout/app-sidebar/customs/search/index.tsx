import React from "react";
import classNames from "classnames";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarSearchProps {
  query: string;
  onQueryChange: (value: string) => void;
}

/**
 * Compact navigation search.
 *
 * - Ctrl/Cmd + K focuses it (expanding the sidebar first when needed).
 * - Escape clears the query, or blurs the field when it is already empty.
 * - Collapsed sidebars show a search icon with a tooltip instead.
 */
const SidebarSearch: React.FC<SidebarSearchProps> = ({
  query,
  onQueryChange,
}) => {
  const { t } = useTranslation();
  const { state, isMobile, setOpen, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const inputRef = React.useRef<HTMLInputElement>(null);

  const label = t("app_sidebar.search_navigation");

  const focusSearch = React.useCallback(() => {
    if (isMobile) setOpenMobile(true);
    else setOpen(true);
    // Wait for the expansion frame so the input exists and is visible.
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [isMobile, setOpen, setOpenMobile]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        focusSearch();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusSearch]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      if (query) {
        onQueryChange("");
      } else {
        event.currentTarget.blur();
      }
    }
  };

  if (collapsed) {
    return (
      <div className='px-2.5 pb-1'>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type='button'
              onClick={focusSearch}
              aria-label={label}
              className='flex size-9 w-full items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/50 focus-visible:outline-none'
            >
              <Search className='size-[18px]' strokeWidth={1.8} />
            </button>
          </TooltipTrigger>
          <TooltipContent side='right' align='center'>
            {label}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
   <div className='relative px-3 pb-2 pt-0.5'>
  <label htmlFor='sidebar-search' className='sr-only'>
    {label}
  </label>
  <div className='relative flex items-center'>
    <Search
      aria-hidden='true'
      strokeWidth={1.8}
      className='pointer-events-none absolute left-3 size-4 text-sidebar-foreground/60'
    />
    <input
      id='sidebar-search'
      ref={inputRef}
      type='text'
      autoComplete='off'
      spellCheck={false}
      value={query}
      onChange={(event) => onQueryChange(event.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={`${label}...`}
      className={classNames(
        "h-9 w-full rounded-md border border-sidebar-border bg-sidebar-accent/40 pl-9 pr-14",
        "text-sm text-sidebar-foreground placeholder:text-sidebar-foreground/50",
        "transition-colors duration-150 outline-none",
        "hover:border-sidebar-ring/40 hover:bg-sidebar-accent/70",
        "focus:border-sidebar-ring/60 focus:ring-2 focus:ring-sidebar-ring/25"
      )}
    />
    <kbd
      aria-hidden='true'
      className='pointer-events-none absolute right-2.5 rounded border border-sidebar-border bg-sidebar-accent px-2 py-1 text-[10px] font-medium leading-none text-sidebar-foreground/60'
    >
      ⌘K
    </kbd>
  </div>
</div>
  );
};

export default SidebarSearch;
