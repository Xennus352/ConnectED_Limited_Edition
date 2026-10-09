import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type RoomModalType = "room";
export type RoomModalActionType = "add" | "edit" | "delete";

interface IInitialState {
  dataId: string | null;
  modalType: RoomModalType | null;
  actionType: RoomModalActionType | null;
}

const initialState: Readonly<IInitialState> = {
  modalType: null,
  dataId: null,
  actionType: null,
};

const modalSlice = createSlice({
  name: "modal",
  initialState,
  reducers: {
    setRoomFormModal: (
      state,
      action: PayloadAction<{
        modalType: RoomModalType;
        actionType: RoomModalActionType;
        dataId?: string;
      }>
    ) => {
      state.modalType = action.payload.modalType;
      state.actionType = action.payload.actionType;
      state.dataId = action.payload.dataId ?? null;
    },
    resetRoomFormModal: (state) => {
      state.modalType = null;
      state.actionType = null;
      state.dataId = null;
    },
  },
});

export const { setRoomFormModal, resetRoomFormModal } = modalSlice.actions;

export default modalSlice.reducer;
