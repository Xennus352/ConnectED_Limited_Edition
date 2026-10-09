import React from "react";
import classNames from "classnames";
import { MoreHorizontal, type LucideIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export interface IFleetRowActionItem {
  label: string;
  icon?: LucideIcon;
  /** red-tinted destructive item. */
  destructive?: boolean;
  onClick: () => void;
}

interface IFleetRowActionsProps {
  /** Each entry becomes one dropdown item; react to the row being acted on. */
  items: IFleetRowActionItem[];
  /** Render nothing (no menu) when there is nothing to do. */
  empty?: boolean;
}

/**
 * Row action menu for transport-management tables. The parent builds the
 * item list from the row's state and its own services (edit/delete/open
 * profile/trip workflow/maintenance workflow/…).
 */
const FleetRowActions: React.FC<IFleetRowActionsProps> = ({ items, empty = false }) => {
  const [open, setOpen] = React.useState(false);

  if (empty || !items.length) return null;

  return (
    <div className='text-right'>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className='h-8 w-8 p-0'
            onClick={(event) => event.stopPropagation()}
          >
            <span className='sr-only'>Open menu</span>
            <MoreHorizontal className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          {items.map((item, index) => (
            <React.Fragment key={item.label + index}>
              {index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={classNames(
                  "cursor-pointer",
                  item.destructive && "text-red-600 focus:text-red-600"
                )}
              >
                {item.icon && <item.icon className='mr-2 h-4 w-4' />}
                {item.label}
              </DropdownMenuItem>
            </React.Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default FleetRowActions;