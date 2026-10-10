import createStore from "react-auth-kit/createStore";

export const authStore = createStore({
  authName: "_auth",
  authType: "localstorage",
});
