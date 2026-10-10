import React from "react";
import useAuthUser from "react-auth-kit/hooks/useAuthUser";

import { TUser } from "@/interfaces/user";
import {
  UserFormModal,
  ExamFormModal,
  ClassFormModal,
  RoomFormModal,
  LessonFormModal,
  ResultFormModal,
  SubjectFormModal,
  AssignmentFormModal,
  AnnouncementFormModal,
  EventFormModal,
  BookDetailsModal,
  FleetFormModal,
} from "./customs";

/** Roles that can open at least one of the management dialogs below. */
const MANAGER_ROLES: TUser["role"][] = [
  "super-admin",
  "admin",
  "teacher",
  "driver",
];

const ModalVisibility: React.FC = () => {
  const user = useAuthUser<TUser>() as TUser | null;
  const role = user?.role?.toLowerCase?.();

  // Every dialog here is a staff management action (subjects, lessons, users,
  // fleet…). Mounting them for a student or parent eagerly runs their data
  // hooks — e.g. the subject list — which those roles are not allowed to read,
  // producing 403 requests on every page. Skip the whole set for them.
  if (!role || !MANAGER_ROLES.includes(role as TUser["role"])) {
    return null;
  }

  return (
    <>
      <UserFormModal />
      <ExamFormModal />
      <EventFormModal />
      <ClassFormModal />
      <RoomFormModal />
      <ResultFormModal />
      <LessonFormModal />
      <SubjectFormModal />
      <BookDetailsModal />
      <AssignmentFormModal />
      <AnnouncementFormModal />
      <FleetFormModal />
    </>
  );
};

export default ModalVisibility;
