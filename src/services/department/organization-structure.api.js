import { apiClient, getCsrfCredentials } from "@/lib/axios/api-client";

async function createStateChangingHeaders() {
  const { csrfToken, headerName } = await getCsrfCredentials();

  return {
    "Content-Type": "application/json",
    [headerName]: csrfToken,
  };
}

export async function createDepartmentRequest(input) {
  const headers = await createStateChangingHeaders();

  const response = await apiClient.post("/hr/departments", input, {
    headers,
  });

  return response.data?.data?.item;
}

export function getApiErrorMessage(error) {
  const responseError = error?.response?.data?.error;

  if (
    Array.isArray(responseError?.details) &&
    responseError.details.length > 0
  ) {
    return responseError.details
      .map((detail) => detail.message)
      .filter(Boolean)
      .join(", ");
  }

  return (
    responseError?.message ??
    error?.message ??
    "ไม่สามารถดำเนินการได้ กรุณาลองใหม่อีกครั้ง"
  );
}

export async function updateDepartmentRequest({ departmentId, input }) {
  const headers = await createStateChangingHeaders();

  const response = await apiClient.put(
    `/hr/departments/${departmentId}`,
    input,
    {
      headers,
    },
  );

  return response.data?.data?.item;
}
