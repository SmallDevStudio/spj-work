import { apiClient, getCsrfCredentials } from "@/lib/axios/api-client";

export async function getCompanyWorkSchedulesRequest(companyId) {
  const response = await apiClient.get("/company/work-schedules", {
    params: { companyId },
  });

  return response.data?.data?.item;
}

export async function createCompanyWorkScheduleRequest(input) {
  const { csrfToken, headerName } = await getCsrfCredentials();

  const response = await apiClient.post("/company/work-schedules", input, {
    headers: {
      "Content-Type": "application/json",
      [headerName]: csrfToken,
    },
  });

  return response.data?.data?.item;
}

export function getCompanyScheduleErrorMessage(error) {
  const apiError = error?.response?.data?.error;

  if (Array.isArray(apiError?.details) && apiError.details.length) {
    return apiError.details
      .map((detail) => detail.message)
      .filter(Boolean)
      .join(", ");
  }

  return (
    apiError?.message ?? error?.message ?? "ไม่สามารถดำเนินการได้ กรุณาลองใหม่"
  );
}
