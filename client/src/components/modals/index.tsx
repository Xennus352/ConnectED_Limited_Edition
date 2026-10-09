import React from "react";

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

const ModalVisibility: React.FC = () => {
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
