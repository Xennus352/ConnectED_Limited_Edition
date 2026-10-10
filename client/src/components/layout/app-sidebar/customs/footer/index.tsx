import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Settings, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import useAuthUser from "react-auth-kit/hooks/useAuthUser";
import useSignOut from "react-auth-kit/hooks/useSignOut";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TUser } from "@/interfaces/user";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const initialsOf = (name?: string): string =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

/**
 * Fixed profile footer: avatar, user name, subtle role badge and an
 * account menu (profile / settings / logout). Stays pinned below the
 * scrollable navigation region.
 */
const SidebarFooterComponent: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthUser<TUser>() as TUser | null;
  const { state, isMobile } = useSidebar();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const signOut = useSignOut();
  const navigate = useNavigate();
  const collapsed = state === "collapsed" && !isMobile;

  const roleLabel = user?.role ? t(`role.${user.role}`) : "";

  const trigger = (
    <button
      type='button'
      aria-label={user?.fullName || t("app_sidebar.account")}
      className='flex w-full items-center gap-2.5 rounded-md p-2 transition-colors duration-150 hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring/50 focus-visible:outline-none'
    >
      <Avatar className='size-8 shrink-0 border border-sidebar-border'>
        <AvatarImage
          src={user?.profilePhoto}
          alt=''
          className='object-cover'
        />
        <AvatarFallback className='bg-primary/10 text-xs font-semibold text-primary'>
          {initialsOf(user?.fullName)}
        </AvatarFallback>
      </Avatar>

      {!collapsed && (
        <span className='flex min-w-0 flex-1 flex-col items-start gap-1 text-left'>
          <span className='w-full truncate text-sm font-medium leading-tight text-sidebar-foreground'>
            {user?.fullName}
          </span>
          {roleLabel && (
            <span className='rounded-md bg-primary/10 px-1.5 py-px text-xs font-medium leading-4 text-primary'>
              {roleLabel}
            </span>
          )}
        </span>
      )}

      {!collapsed && (
        <Settings
          aria-hidden='true'
          strokeWidth={1.8}
          className='ml-auto size-4 shrink-0 text-sidebar-foreground/60'
        />
      )}
    </button>
  );

  return (
    <SidebarFooter className='border-t border-sidebar-border bg-sidebar-accent/30 p-2'>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          </TooltipTrigger>
          {/* Collapsed sidebars identify the avatar with a tooltip. */}
          <TooltipContent
            side='right'
            align='center'
            hidden={!collapsed || isMobile}
          >
            {user?.fullName}
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          side={collapsed ? "right" : "top"}
          align={collapsed ? "center" : "end"}
          className='w-52'
        >
          <DropdownMenuLabel className='truncate'>
            {user?.fullName}
          </DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link to='/profile'>
              <User className='mr-2 size-4' strokeWidth={1.8} />
              {t("app_sidebar.profile")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to='/settings'>
              <Settings className='mr-2 size-4' strokeWidth={1.8} />
              {t("app_sidebar.settings")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={(event) => { event.preventDefault(); setLogoutOpen(true); }}>
            <LogOut className='mr-2 size-4' strokeWidth={1.8} />
            {t("app_sidebar.logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("logout.title", "Are you sure you want to log out?")}</AlertDialogTitle>
            <AlertDialogDescription>{t("logout.description", "Logging out will end your current session. Please confirm if you wish to proceed.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("button.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { signOut(); navigate("/auth/sign-in", { replace: true }); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("button.confirm", "Confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarFooter>
  );
};

export default SidebarFooterComponent;
