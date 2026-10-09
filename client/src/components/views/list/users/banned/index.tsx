import React from "react";
import { useTranslation } from "react-i18next";
import { FaBan } from "react-icons/fa6";

import { Section } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import noUser from "@/assets/icons/no-user.svg";
import { useBannedService, IBannedUser } from "@/services/users/banned";

const BannedUsersView: React.FC = () => {
  const { t } = useTranslation();
  const { getBannedUsers, unbanUser } = useBannedService();

  const { data, isLoading } = getBannedUsers;

  return (
    <Section id='banned-users-view' title={t("app_sidebar.banned")}>
      <Card className='p-4'>
        {isLoading ? (
          <div className='flex flex-col gap-3'>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className='h-12 w-full' />
            ))}
          </div>
        ) : !data?.length ? (
          <div className='flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground'>
            <FaBan className='size-10' />
            <p className='text-sm'>{t("banned.empty")}</p>
          </div>
        ) : (
          <ul className='flex flex-col divide-y divide-border'>
            {data.map((user: IBannedUser) => (
              <li
                key={user._id}
                className='flex items-center justify-between gap-3 py-2'
              >
                <div className='flex min-w-0 items-center gap-3'>
                  <Avatar className='size-9'>
                    <AvatarImage
                      src={user.profilePhoto || noUser}
                      alt={user.fullName}
                    />
                    <AvatarFallback>{user.fullName?.slice(0, 1) || "?"}</AvatarFallback>
                  </Avatar>
                  <div className='min-w-0'>
                    <p className='truncate text-sm font-medium text-foreground'>
                      {user.fullName}
                    </p>
                    <p className='truncate text-xs text-muted-foreground'>
                      @{user.username} · {user.role} · {user.model}
                    </p>
                  </div>
                  <Badge variant='error'>{t("banned.banned")}</Badge>
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={unbanUser.isPending}
                  onClick={() => unbanUser.mutate(user._id)}
                >
                  {t("banned.unban")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Section>
  );
};

export default BannedUsersView;