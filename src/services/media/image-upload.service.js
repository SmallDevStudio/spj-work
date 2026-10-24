import "server-only";

import { randomUUID } from "node:crypto";
import { getStorage } from "firebase-admin/storage";

import { IMAGE_UPLOAD } from "@/constants/image-upload";
import { serverEnv } from "@/config/env.server";
import { ApplicationError } from "@/lib/errors/application-error";
import { firebaseAdminApp } from "@/lib/firebase/admin";
import { isValidImage } from "@/modules/media/image-upload";
import { getCompanyById } from "@/repositories/company/company.repository";

const extensions = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export async function uploadCompanyLogo({ currentSession, companyId, file }) {
  if (typeof companyId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(companyId)) {
    throw new ApplicationError({ code: "INVALID_COMPANY_ID", message: "รหัสบริษัทไม่ถูกต้อง", status: 400 });
  }
  const organizationId = currentSession.access.organization.id;
  const company = await getCompanyById({ organizationId, companyId });
  if (!company) throw new ApplicationError({ code: "COMPANY_NOT_FOUND", message: "ไม่พบบริษัท", status: 404 });

  if (!(file instanceof File) || !IMAGE_UPLOAD.acceptedTypes.includes(file.type) || file.size > IMAGE_UPLOAD.maxBytes) {
    throw new ApplicationError({ code: "INVALID_IMAGE", message: "เลือกไฟล์ PNG, JPG หรือ WebP ขนาดไม่เกิน 2 MB", status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!isValidImage(bytes, file.type)) {
    throw new ApplicationError({ code: "INVALID_IMAGE", message: "ไฟล์รูปภาพไม่ถูกต้อง", status: 400 });
  }

  const bucketName = serverEnv.firebaseStorageBucket;
  if (!bucketName) throw new ApplicationError({ code: "STORAGE_NOT_CONFIGURED", message: "ยังไม่ได้ตั้งค่า Firebase Storage bucket", status: 503 });
  const bucket = getStorage(firebaseAdminApp).bucket(bucketName);
  const token = randomUUID();
  const path = `organizations/${organizationId}/companies/${companyId}/logos/${randomUUID()}.${extensions[file.type]}`;
  await bucket.file(path).save(bytes, {
    resumable: false,
    contentType: file.type,
    metadata: { cacheControl: "public, max-age=3600", metadata: { firebaseStorageDownloadTokens: token } },
  });
  return {
    url: `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(path)}?alt=media&token=${token}`,
  };
}
