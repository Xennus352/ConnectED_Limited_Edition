import React from "react";
import { Navigate, Outlet, useOutlet } from "react-router-dom";
import useAuthUser from "react-auth-kit/hooks/useAuthUser";

import { SuspenseWrapper } from "@/tools";
import DashboardPage from "@/pages/dashboard";
import ModalVisibility from "@/components/modals";
import { AppSidebar, Navbar } from "@/components/layout";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DriverBottomNav } from "@/components/views/driver/driver-bottom-nav";
import { TUser } from "@/interfaces/user";

const DashboardLayout: React.FC = () => {
  const hasOutlet = useOutlet();
  const user = useAuthUser<TUser>() as TUser | null;
  const isDriver = user?.role?.toLowerCase?.() === "driver";

  return (
    <SidebarProvider
      /* Premium sidebar proportions: 272px expanded / 72px icon rail. */
      style={
        {
          "--sidebar-width": "17rem",
          "--sidebar-width-icon": "4.5rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <ModalVisibility />
      <SidebarInset>
        <Navbar />
        <main
          className={`flex flex-1 flex-col gap-4 bg-background p-5 ${
            isDriver ? "pb-24 lg:pb-5" : ""
          }`}
        >
          {/* bg-muted/50 */}
          <div className='min-h-[100vh] flex-1 md:min-h-min'>
            <SuspenseWrapper>
              {hasOutlet ? (
                <Outlet />
              ) : isDriver ? (
                /* Drivers land on their own dashboard, not the admin one. */
                <Navigate to='/driver/dashboard' replace />
              ) : (
                <DashboardPage />
              )}
            </SuspenseWrapper>
          </div>
        </main>
        {isDriver ? <DriverBottomNav /> : null}
      </SidebarInset>
    </SidebarProvider>
  );
};

export default DashboardLayout;