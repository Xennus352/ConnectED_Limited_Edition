import {
  Edit,
  Map,
  Phone,
  Trash2,
  Calendar,
  RollerCoaster,
  MessageCircle,
  PersonStanding,
  User,
} from "lucide-react";
import React from "react";
import { formatBirthday } from "@/utils/date-format";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useAuthUser from "react-auth-kit/hooks/useAuthUser";

import { Card } from "@/components/ui/card";
import { IStudent, TUser } from "@/interfaces/user";
import useTeacherProfileFeatures from "../../features";

const UserInfo: React.FC<{ data: IStudent }> = ({ data }) => {
  const { t } = useTranslation();
  const user = useAuthUser() as TUser;
  const { handleDeleteUser, handleEditUser } = useTeacherProfileFeatures();

  return (
    <Card className='relative h-fit px-6 py-8 flex flex-col lg:flex-row items-center lg:items-start gap-4 sm:gap-6 md:gap-8'>
      {/* Profile Photo */}
      <div className='center w-[150px] min-w-[150px] h-[150px] min-h-[150px] lg:w-[200px] lg:min-w-[200px] lg:h-[200px] lg:min-h-[200px] rounded-full overflow-hidden'>
        <img
          src={data?.profilePhoto || "default-photo-url.jpg"}
          alt='Admin profile'
          loading='lazy'
          className='w-full h-full object-cover'
        />
      </div>

      {user?.role === "admin" ||
        (user?.role === "super-admin" && (
          <div className='absolute right-5 top-5 active:scale-[0.97] flex items-center gap-3'>
            <Edit
              onClick={handleEditUser}
              className='w-6 hover:text-primary'
            />
            <Trash2
              onClick={handleDeleteUser}
              className='w-6 hover:text-error'
            />
          </div>
        ))}

      {/* Profile Details */}
      <div className='flex-grow'>
        <h3 className='text-2xl font-bold text-center lg:text-left'>
          {data?.fullName || "No Name Available"}
        </h3>
        <p className='text-sm font-normal text-center lg:text-left mt-2 max-w-[90%] mx-auto lg:mx-0'>
          {data?.bio?.length ? data?.bio : t("students_list_profile.bio")}
        </p>

        {/* Info List */}
        <ul className='mt-4 space-y-3 text-muted-foreground'>
          <li className='flex items-center gap-3'>
            <RollerCoaster className='text-primary' />
            <span className='uppercase'>
              {t(`students_list_profile.${data?.role}`) ||
                t(`students_list_profile.student`)}
            </span>
          </li>
          <li className='flex items-center gap-3'>
            <MessageCircle className='text-primary' />
            <span>@{data?.username || "student"}</span>
          </li>
          <li className='flex items-center gap-3'>
            <Phone className='text-primary' />
            <span>{data?.phoneNumber || "No Phone Number"}</span>
          </li>
          <li className='flex items-center gap-3'>
            <PersonStanding className='text-primary' />
            <span className='uppercase'>
              {t(`students_list_profile.${data?.gender}`) || "No Gender"}
            </span>
          </li>
          {data?.parent?.fullName && (
            <li className='flex items-center gap-3'>
              <User className='text-primary' />
              <Link
                to={`/list/parents/${data?.parent?._id}`}
                className='hover:underline hover:text-primary'
              >
                {t("students_list_profile.parent")}:{" "}
                {data?.parent?.fullName || ""}
              </Link>
            </li>
          )}

          <li className='flex items-center gap-3'>
            <Calendar className='text-primary' />
            <span>
              {data?.birthday
                ? formatBirthday(data?.birthday)
                : "Not Provided"}
            </span>
          </li>
          <li className='flex items-center gap-3'>
            <Map className='text-primary' />
            <span>{data?.address || "Address Not Provided"}</span>
          </li>
        </ul>
      </div>
    </Card>
  );
};

export default UserInfo;
