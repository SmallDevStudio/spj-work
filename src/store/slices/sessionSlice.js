import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  initialized: false,
  authenticated: false,
  user: null,
  employee: null,
  organization: null,
  role: null,
  permissions: [],
};

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    setSession: (state, action) => {
      const session = action.payload;

      state.initialized = true;
      state.authenticated = true;
      state.user = session.user ?? null;
      state.employee = session.employee ?? null;
      state.organization = session.organization ?? null;
      state.role = session.role ?? null;
      state.permissions = session.permissions ?? [];
    },

    clearSession: () => ({
      ...initialState,
      initialized: true,
    }),

    setSessionInitialized: (state, action) => {
      state.initialized = action.payload;
    },
  },
});

export const { setSession, clearSession, setSessionInitialized } =
  sessionSlice.actions;

export const selectSession = (state) => state.session;

export const selectCurrentUser = (state) => state.session.user;

export const selectCurrentEmployee = (state) => state.session.employee;

export const selectCurrentOrganization = (state) => state.session.organization;

export const selectCurrentRole = (state) => state.session.role;

export const selectPermissions = (state) => state.session.permissions;

export const selectIsAuthenticated = (state) => state.session.authenticated;

export const selectSessionInitialized = (state) => state.session.initialized;

export const selectHasPermission = (permission) => (state) =>
  state.session.permissions.includes(permission);

export default sessionSlice.reducer;
