"use client";

import { useState } from "react";
import { Provider } from "react-redux";
import { ThemeProvider } from "next-themes";
import { ToastContainer } from "react-toastify";

import { makeStore } from "@/store/store";

export default function AppProviders({ children }) {
  const [store] = useState(makeStore);

  return (
    <Provider store={store}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}

        <ToastContainer
          position="top-right"
          autoClose={3500}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </ThemeProvider>
    </Provider>
  );
}
