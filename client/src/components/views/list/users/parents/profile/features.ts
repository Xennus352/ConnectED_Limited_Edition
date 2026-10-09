import { useParams } from "react-router-dom";
import { useAppDispatch } from "@/hooks/useRedux";
import { setUserFormModal } from "@/store/slices/user-form-modal";

const announcements = [
  {
    _id: "1",
    name: "Picture Day Reminder",
    description:
      "School Picture Day is tomorrow! Don't forget to wear your full uniform and bring your best smile.",
    bg: "bg-primary/10",
  },
  {
    _id: "2",
    name: "New Staff Announcement",
    description:
      "The school is moving to a new building next week. All staff will be required to wear their uniform and have their badge with them.",
    bg: "bg-warning/10",
  },
  {
    _id: "3",
    name: "Test Schedule Update",
    description:
      "The school has updated the test schedule. Make sure to check your calendar for the most accurate information.",
    bg: "bg-accent-strong/10",
  },
  {
    _id: "4",
    name: "Vacation Reminder",
    description:
      "Don't forget to pack your essentials for your upcoming vacation. You'll be on call during the day.",
    bg: "bg-warning/15",
  },
  {
    _id: "5",
    name: "Class Schedule Update",
    description:
      "The school has updated the class schedule. Make sure to check your calendar for the most accurate information.",
    bg: "bg-success/15",
  },
  {
    _id: "6",
    name: "Closing Day Announcement",
    description:
      "School is closing on Friday. All students will be required to wear their full uniform and have their badge with them.",
    bg: "bg-error/15",
  },
];

const useAdminProfileFeatures = () => {
  const params = useParams();
  const dispatch = useAppDispatch();

  const handleEditUser = () => {
    dispatch(
      setUserFormModal({
        modalType: "parent",
        actionType: "edit",
        dataId: params?.parentId,
      })
    );
  };

  const handleDeleteUser = () => {
    dispatch(
      setUserFormModal({
        modalType: "parent",
        actionType: "delete",
        dataId: params?.parentId,
      })
    );
  };

  return { announcements, handleEditUser, handleDeleteUser };
};

export default useAdminProfileFeatures;
