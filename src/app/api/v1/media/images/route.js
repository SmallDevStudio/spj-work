import { PERMISSIONS } from "@/constants/permissions";
import { IMAGE_UPLOAD } from "@/constants/image-upload";
import { createApiErrorResponse, createSuccessResponse } from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { requireAllowedOrigin, requireValidCsrfToken } from "@/lib/auth/request-security";
import { ApplicationError } from "@/lib/errors/application-error";
import { uploadCompanyLogo } from "@/services/media/image-upload.service";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    requireAllowedOrigin(request);
    requireValidCsrfToken(request);
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;")) {
      throw new ApplicationError({ code: "INVALID_CONTENT_TYPE", message: "ต้องส่งไฟล์แบบ multipart/form-data", status: 415 });
    }
    const contentLength = Number(request.headers.get("content-length"));
    if (contentLength && contentLength > IMAGE_UPLOAD.maxBytes + 16384) {
      throw new ApplicationError({ code: "IMAGE_TOO_LARGE", message: "ไฟล์ต้องมีขนาดไม่เกิน 2 MB", status: 413 });
    }
    const currentSession = await requirePermission(PERMISSIONS.ORGANIZATION_MANAGE);
    const form = await request.formData();
    if (form.get("purpose") !== "company-logo") {
      throw new ApplicationError({ code: "INVALID_PURPOSE", message: "ประเภทการอัปโหลดไม่ถูกต้อง", status: 400 });
    }
    const item = await uploadCompanyLogo({ currentSession, companyId: form.get("companyId"), file: form.get("file") });
    return createSuccessResponse({ item }, { status: 201 });
  } catch (error) {
    return createApiErrorResponse(error, "Image Upload API");
  }
}
