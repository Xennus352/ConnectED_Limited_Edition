import { createSlice, PayloadAction } from "@reduxjs/toolkit";

/**
 * Shared modal state for the transportation-management modules.
 *
 * `modalType` picks the rendered form (bus / route / trip / maintenance /
 * fuel / incident), `actionType` is the mode and `dataId` targets one
 * existing record for edit / delete / workflow actions. `data` carries the
 * preloaded row so edit forms never need an extra round-trip.
 */
export type FleetModalType =
  | "bus"
  | "route"
  | "trip"
  | "maintenance"
  | "fuel"
  | "incident";

export type FleetModalActionType = "add" | "edit" | "delete" | "complete";

interface IFleetFormModalState {
  modalType: FleetModalType | null;
  actionType: FleetModalActionType | null;
  dataId: string | null;
  data?: Record<string, any> | null;
}

const initialState: Readonly<IFleetFormModalState> = {
  modalType: null,
  actionType: null,
  dataId: null,
  data: null,
};

const fleetFormModalSlice = createSlice({
  name: "fleetFormModal",
  initialState,
  reducers: {
    setFleetFormModal: (
      state,
      action: PayloadAction<{
        modalType: FleetModalType;
        actionType: FleetModalActionType;
        dataId?: string;
        data?: Record<string, any> | null;
      }>
    ) => {
      state.modalType = action.payload.modalType;
      state.actionType = action.payload.actionType;
      state.dataId = action.payload.dataId ?? null;
      state.data = action.payload.data ?? null;
    },
    resetFleetFormModal: (state) => {
      state.modalType = null;
      state.actionType = null;
      state.dataId = null;
      state.data = null;
    },
  },
});

export const { setFleetFormModal, resetFleetFormModal } =
  fleetFormModalSlice.actions;

export default fleetFormModalSlice.reducer;