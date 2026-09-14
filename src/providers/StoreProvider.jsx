"use client";

import { useState } from "react";
import { Provider } from "react-redux";

import { makeStore } from "@/store/store";

export default function StoreProvider({ children, initialSession }) {
  const [store] = useState(() =>
    makeStore({
      session: initialSession,
    }),
  );

  return <Provider store={store}>{children}</Provider>;
}
