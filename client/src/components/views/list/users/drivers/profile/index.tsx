import React from "react";
import { formatBirthday } from "@/utils/date-format";
import { Calendar, Edit, MapPin, Phone, Trash2, User, BusFront, AtSign } from "lucide-react";
import { useTranslation } from "react-i18next";
import useAuthUser from "react-auth-kit/hooks/useAuthUser";

import Loading from "./loading";
import { TUser } from "@/interfaces/user";
import { Card } from "@/components/ui/card";
import noUser from "@/assets/icons/no-user.svg";
import Section from "@/components/layout/section";
import { useDriverService } from "@/services/users/drivers";
import useDriverProfileFeatures from "./features";

const DriverProfileView: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthUser() as TUser;
  const { getDriverById } = useDriverService();
  const { handleEditDriver, handleDeleteDriver } = useDriverProfileFeatures();

  const { data: driverData, isLoading } = getDriverById;

  return (
    <Section id='driver-profile-page'>
      {isLoading ? (
        <Loading />
      ) : (
        <div className='grid grid-cols-1 gap-6 w-full'>
          <Card className='relative px-6 py-8 flex flex-col lg:flex-row items-center lg:items-start gap-4 sm:gap-6 md:gap-8 shadow-lg'>
            {/* Profile Photo */}
            <div className='center w-[150px] min-w-[150px] h-[150px] min-h-[150px] lg:w-[200px] lg:min-w-[200px] lg:h-[200px] lg:min-h-[200px] rounded-full overflow-hidden'>
              <img
                src={driverData?.profilePhoto || noUser}
                alt='Driver profile'
                loading='lazy'
                className='w-full h-full object-cover'
              />
            </div>

            {(user?.role === "admin" || user?.role === "super-admin") && (
              <div className='absolute right-5 top-5 active:scale-[0.97] flex items-center gap-3'>
                <Edit onClick={handleEditDriver} className='w-6 hover:text-primary' />
                <Trash2 onClick={handleDeleteDriver} className='w-6 hover:text-error' />
              </div>
            )}

            {/* Profile Details */}
            <div className='flex-grow'>
              <h3 className='text-2xl font-bold text-center lg:text-left'>
                {driverData?.fullName || "No Name Available"}
              </h3>
              <p className='text-sm font-normal text-center lg:text-left mt-2 max-w-[90%] mx-auto lg:mx-0'>
                {driverData?.bio?.length
                  ? driverData?.bio
                  : t("role.driver")}
              </p>

              {/* Info List */}
              <ul className='mt-4 space-y-3 text-muted-foreground'>
                <li className='flex items-center gap-3'>
                  <User className='text-primary' />
                  <span className='uppercase'>{t("role.driver")}</span>
                </li>
                <li className='flex items-center gap-3'>
                  <AtSign className='text-primary' />
                  <span>@{driverData?.username || "No Username"}</span>
                </li>
                <li className='flex items-center gap-3'>
                  <Phone className='text-primary' />
                  <span>{driverData?.phoneNumber || "No Phone Number"}</span>
                </li>
                <li className='flex items-center gap-3'>
                  <BusFront className='text-primary' />
                  <span>
                    {driverData?.bus?.busNumber || "-"}
                    {driverData?.bus
                      ? ` · ${driverData.bus.registrationNumber}`
                      : ""}{" "}
                    ·  {t("user_form.status")}: {driverData?.status || "-"}
                  </span>
                </li>
                <li className='flex items-center gap-3'>
                  <Calendar className='text-primary' />
                  <span>
                    {t("user_form.birthday")}:{" "}
                    {driverData?.birthday
                      ? formatBirthday(driverData.birthday)
                      : "-"}
                  </span>
                </li>
                <li className='flex items-center gap-3'>
                  <MapPin className='text-primary' />
                  <span>{driverData?.address || "-"}</span>
                </li>
              </ul>
            </div>
          </Card>
        </div>
      )}
    </Section>
  );
};

export default DriverProfileView;