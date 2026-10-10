import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useSignOut from "react-auth-kit/hooks/useSignOut";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

const LogoutPageView: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const signOut = useSignOut();
  const [open, setOpen] = useState(true);
  const confirmed = useRef(false);

  const confirmLogout = () => {
    confirmed.current = true;
    setOpen(false);
    signOut();
    navigate("/auth/sign-in", { replace: true });
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen && !confirmed.current) navigate(-1);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("logout.title", "Are you absolutely sure?")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              "logout.description",
              "Logging out will end your current session. Please confirm if you wish to proceed."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("button.cancel", "Cancel")}</AlertDialogCancel>
          <Button variant="destructive" onClick={confirmLogout}>
            {t("button.logout", "Logout")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default LogoutPageView;
