import { apiClient, getCsrfCredentials } from "@/lib/axios/api-client";

export async function getHolidayCalendarRequest(year) {
  const response = await apiClient.get("/hr/leave-calendar", {
    params: { year },
  });

  return response.data?.data?.item ?? null;
}

export async function previewGoogleHolidaysRequest(year) {
  const response = await apiClient.get("/hr/leave-calendar/google-preview", {
    params: { year },
  });

  return response.data?.data?.preview;
}

async function postCalendar(path, input) {
  const { csrfToken, headerName } = await getCsrfCredentials();

  const response = await apiClient.post(path, input, {
    headers: {
      "Content-Type": "application/json",
      [headerName]: csrfToken,
    },
  });

  return response.data?.data?.item;
}

export function saveHolidayCalendarDraftRequest(input) {
  return postCalendar("/hr/leave-calendar/draft", input);
}

export function publishHolidayCalendarRequest(input) {
  return postCalendar("/hr/leave-calendar/publish", input);
}

export function getHolidayCalendarErrorMessage(error) {
  const apiError = error?.response?.data?.error;

  if (Array.isArray(apiError?.details) && apiError.details.length) {
    return apiError.details
      .map((item) => item.message)
      .filter(Boolean)
      .join(", ");
  }

  return (
    apiError?.message ?? error?.message ?? "ไม่สามารถดำเนินการได้ กรุณาลองใหม่"
  );
}
