import { apiClient, getCsrfCredentials } from "@/lib/axios/api-client";

export async function uploadImageRequest({ file, purpose, companyId }) {
  const { csrfToken, headerName } = await getCsrfCredentials();
  const form = new FormData();
  form.set("file", file);
  form.set("purpose", purpose);
  if (companyId) form.set("companyId", companyId);
  const response = await apiClient.post("/media/images", form, {
    headers: { [headerName]: csrfToken },
    timeout: 60000,
  });
  return response.data?.data?.item;
}
