import { configureStore } from "@reduxjs/toolkit";

import sessionReducer from "@/store/slices/sessionSlice";

export function makeStore() {
  return configureStore({
    reducer: {
      session: sessionReducer,
    },
    devTools: process.env.NODE_ENV !== "production",
  });
}
