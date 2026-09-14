import axios from "axios";

export const apiClient = axios.create({
  baseURL: "/api/v1",
  timeout: 30000,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

export async function getCsrfCredentials() {
  const response = await apiClient.get("/auth/csrf", {
    headers: {
      "Cache-Control": "no-cache",
    },
  });

  const csrfToken = response.data?.data?.csrfToken;
  const headerName = response.data?.data?.headerName;

  if (!csrfToken || !headerName) {
    throw new Error("Unable to obtain CSRF credentials.");
  }

  return {
    csrfToken,
    headerName,
  };
}
