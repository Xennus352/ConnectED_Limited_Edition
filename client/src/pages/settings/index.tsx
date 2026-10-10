import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuthUser from "react-auth-kit/hooks/useAuthUser";
import { useTranslation } from "react-i18next";
import {
  Accessibility,
  ArrowRight,
  Bell,
  BusFront,
  CalendarDays,
  Check,
  LayoutDashboard,
  LogOut,
  Moon,
  Palette,
  Sun,
  UserRound,
} from "lucide-react";

import { Section } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Locale } from "@/components/constants";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { setTheme } from "@/store/slices/theme";
import type { IParent, TUser } from "@/interfaces/user";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";
import { useDriverSettings } from "@/hooks/useDriverSettings";
import { ConfirmModal } from "@/components/views/logout/customs";

const MOTION_KEY = "connect-ed.reduce-motion.v1";

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthUser<TUser>() as TUser | null;
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((state) => state.theme.themeMode);
  const navigate = useNavigate();
  const { preferences: dashboard, update: updateDashboard, reset: resetDashboard } = useDashboardPreferences();
  const { settings: driverSettings, update: updateDriver, reset: resetDriver } = useDriverSettings();
  const [reduceMotion, setReduceMotion] = useState(() => localStorage.getItem(MOTION_KEY) === "true");

  const role = user?.role ?? "user";
  const profilePath = role === "driver" ? "/driver/profile" : "/profile";
  const parentChildren = role === "parent" ? (user as IParent | null)?.children?.length ?? 0 : 0;
  const dashboardModulesAvailable = !["parent", "driver"].includes(role);

  useEffect(() => {
    document.documentElement.dataset.motion = reduceMotion ? "reduce" : "full";
    localStorage.setItem(MOTION_KEY, String(reduceMotion));
  }, [reduceMotion]);

  const resetPreferences = () => {
    dispatch(setTheme("light"));
    setReduceMotion(false);
    resetDashboard();
  };

  return (
    <Section id="settings-page" title={t("app_sidebar.settings")}>
      <div className="space-y-5 pb-8">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
          <div className="space-y-5">
            <SettingsCard icon={<Palette size={19} />} title="Appearance" description="Set the visual style for the whole app." delay="0ms">
              <div className="grid gap-3 sm:grid-cols-2">
                <ChoiceButton selected={themeMode === "light"} onClick={() => dispatch(setTheme("light"))} icon={<Sun size={19} />} title="Light" description="Bright surfaces for daytime use" />
                <ChoiceButton selected={themeMode === "dark"} onClick={() => dispatch(setTheme("dark"))} icon={<Moon size={19} />} title="Dark" description="A softer view in low light" />
              </div>
              <div className="mt-4 border-t pt-4">
                <p className="mb-2 text-sm font-medium">Language</p>
                <Locale className="w-full sm:max-w-sm" />
              </div>
            </SettingsCard>

            {dashboardModulesAvailable && <SettingsCard icon={<LayoutDashboard size={19} />} title="Dashboard modules" description="Choose which summary cards appear beside your dashboard." delay="70ms">
              <div className="divide-y rounded-xl border px-3">
                <ToggleRow icon={<CalendarDays size={17} />} title="Calendar" description="Show the mini calendar on the dashboard." checked={dashboard.showCalendar} onChange={(checked) => updateDashboard({ showCalendar: checked })} />
                <ToggleRow icon={<Bell size={17} />} title="Events" description="Show upcoming school events." checked={dashboard.showEvents} onChange={(checked) => updateDashboard({ showEvents: checked })} />
                <ToggleRow icon={<Bell size={17} />} title="Announcements" description="Show recent school announcements." checked={dashboard.showAnnouncements} onChange={(checked) => updateDashboard({ showAnnouncements: checked })} />
              </div>
            </SettingsCard>}

            {role === "driver" && <SettingsCard icon={<BusFront size={19} />} title="Driver preferences" description="These controls are used by your live map and driver tools." delay="70ms">
              <div className="divide-y rounded-xl border px-3">
                <ToggleRow icon={<BusFront size={17} />} title="Follow my bus on the map" description="Keep the live map centered on your vehicle." checked={driverSettings.followMeOnMap} onChange={(checked) => updateDriver({ followMeOnMap: checked })} />
                <ToggleRow icon={<Bell size={17} />} title="Auto-broadcast GPS on the map" description="Share your browser GPS while the driver map is open." checked={driverSettings.autoBroadcast} onChange={(checked) => updateDriver({ autoBroadcast: checked })} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">GPS broadcasting requires location permission and only runs while the map is open.</p>
            </SettingsCard>}

            <SettingsCard icon={<Accessibility size={19} />} title="Accessibility" description="Reduce motion across the interface." delay="140ms">
              <div className="rounded-xl border px-3"><ToggleRow icon={<Accessibility size={17} />} title="Reduce animations" description="Turn off decorative motion and shorten transitions." checked={reduceMotion} onChange={setReduceMotion} /></div>
              <p className="mt-3 text-xs text-muted-foreground">This preference is saved on this device and applies across pages.</p>
            </SettingsCard>
          </div>

          <aside className="space-y-5">
            <SettingsCard icon={<UserRound size={19} />} title="Account" description="Review your account details and profile." delay="100ms">
              <div className="space-y-3 rounded-xl border p-4">
                <Detail label="Name" value={user?.fullName ?? "—"} />
                <Detail label="Username" value={user?.username ?? "—"} />
                <Detail label="Email" value={user?.email ?? "—"} />
                <Detail label="Role" value={role.replace(/-/g, " ")} capitalize />
                {role === "parent" && <Detail label="Linked children" value={String(parentChildren)} />}
              </div>
              <Button asChild variant="outline" className="mt-4 w-full justify-between"><Link to={profilePath}>Open profile <ArrowRight size={16} /></Link></Button>
              {role === "parent" && <div className="mt-2 grid grid-cols-2 gap-2"><Button asChild variant="ghost" size="sm"><Link to="/list/exams">Exams</Link></Button><Button asChild variant="ghost" size="sm"><Link to="/list/attendances">Attendance</Link></Button></div>}
            </SettingsCard>

            <Card className="settings-enter overflow-hidden border-rose-500/20 p-4 shadow-sm sm:p-5" style={{ animationDelay: "180ms" }}>
              <div className="flex items-start gap-3"><span className="rounded-xl bg-rose-500/10 p-2.5 text-rose-600"><LogOut size={18} /></span><div><h2 className="font-semibold">Sign out</h2><p className="mt-1 text-sm text-muted-foreground">End your ConnectED session on this device.</p></div></div>
              <ConfirmModal setUserLoggedOut={(loggedOut) => { if (loggedOut) navigate("/auth/sign-in", { replace: true }); }}>
                <Button variant="destructive" className="mt-4 w-full"><LogOut size={16} />Sign out</Button>
              </ConfirmModal>
            </Card>

            {role === "driver" && <Button variant="ghost" className="w-full text-muted-foreground" onClick={resetDriver}>Reset driver preferences</Button>}
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={resetPreferences}>Reset appearance and dashboard preferences</Button>
          </aside>
        </div>
      </div>
    </Section>
  );
};

const SettingsCard = ({ icon, title, description, delay, children }: { icon: React.ReactNode; title: string; description: string; delay: string; children: React.ReactNode }) => (
  <Card className="settings-enter p-4 shadow-sm sm:p-5" style={{ animationDelay: delay }}>
    <div className="mb-4 flex items-start gap-3"><span className="rounded-xl bg-primary/10 p-2.5 text-primary">{icon}</span><div><h2 className="font-semibold">{title}</h2><p className="text-sm text-muted-foreground">{description}</p></div></div>
    {children}
  </Card>
);

const ToggleRow = ({ icon, title, description, checked, onChange }: { icon: React.ReactNode; title: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) => (
  <div className="flex items-center gap-3 py-3">
    <span className="text-muted-foreground">{icon}</span>
    <div className="min-w-0 flex-1"><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground">{description}</p></div>
    <button type="button" role="switch" aria-checked={checked} aria-label={title} onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${checked ? "bg-primary" : "bg-muted-foreground/30"}`}>
      <span className={`absolute top-0.5 grid h-5 w-5 place-items-center rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`}>{checked && <Check className="h-3 w-3 text-primary" />}</span>
    </button>
  </div>
);

const ChoiceButton = ({ selected, onClick, icon, title, description }: { selected: boolean; onClick: () => void; icon: React.ReactNode; title: string; description: string }) => (
  <button type="button" onClick={onClick} aria-pressed={selected} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-sm ${selected ? "border-primary bg-primary/[0.05] ring-1 ring-primary/20" : "bg-background hover:border-primary/40"}`}>
    <span className={`rounded-lg p-2 ${selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="block text-xs text-muted-foreground">{description}</span></span>{selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
  </button>
);

const Detail = ({ label, value, capitalize = false }: { label: string; value: string; capitalize?: boolean }) => (
  <div className="flex items-start justify-between gap-3 text-sm"><span className="text-muted-foreground">{label}</span><span className={`max-w-[65%] truncate text-right font-medium ${capitalize ? "capitalize" : ""}`}>{value}</span></div>
);

export default SettingsPage;
