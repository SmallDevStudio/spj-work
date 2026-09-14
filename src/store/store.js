import { configureStore } from "@reduxjs/toolkit";

import sessionReducer from "@/store/slices/sessionSlice";

export function makeStore(preloadedState) {
  return configureStore({
    reducer: {
      session: sessionReducer,
    },
    preloadedState,
    devTools: process.env.NODE_ENV !== "production",
  });
}
