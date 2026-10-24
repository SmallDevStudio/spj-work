import { apiClient, getCsrfCredentials } from "@/lib/axios/api-client";

export async function getCompaniesRequest() {
  const response = await apiClient.get("/company", { params: { status: "ALL" } });
  return response.data?.data?.items ?? [];
}

export async function createCompanyRequest(input) {
  const { csrfToken, headerName } = await getCsrfCredentials();

  const response = await apiClient.post("/company", input, {
    headers: {
      "Content-Type": "application/json",
      [headerName]: csrfToken,
    },
  });

  return response.data?.data?.item;
}

export async function updateCompanyRequest(companyId, input) {
  const { csrfToken, headerName } = await getCsrfCredentials();
  const response = await apiClient.patch(`/company/${encodeURIComponent(companyId)}`, input, {
    headers: { "Content-Type": "application/json", [headerName]: csrfToken },
  });
  return response.data?.data?.item;
}

export async function deleteCompanyRequest(companyId) {
  const { csrfToken, headerName } = await getCsrfCredentials();
  const response = await apiClient.delete(`/company/${encodeURIComponent(companyId)}`, {
    headers: { [headerName]: csrfToken },
  });
  return response.data?.data?.item;
}

export function getCompanyApiErrorMessage(error) {
  const apiError = error?.response?.data?.error;

  if (Array.isArray(apiError?.details) && apiError.details.length > 0) {
    return apiError.details
      .map((detail) => detail.message)
      .filter(Boolean)
      .join(", ");
  }

  return (
    apiError?.message ?? error?.message ?? "ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง"
  );
}
