import { PERMISSIONS } from "@/constants/permissions";
import { createApiErrorResponse, createSuccessResponse, readJsonRequest } from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import { appSettingsSchema } from "@/modules/settings/app-settings.schema";
import { readAppSettings, saveAppSettings } from "@/repositories/settings/app-settings.repository";
import { ApplicationError } from "@/lib/errors/application-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requirePermission(PERMISSIONS.ORGANIZATION_MANAGE);
    return createSuccessResponse({ item: await readAppSettings(session.access.organization.id) });
  } catch (error) { return createApiErrorResponse(error, "App Settings API"); }
}

export async function PUT(request) {
  try {
    validateStateChangingRequest(request);
    const session = await requirePermission(PERMISSIONS.ORGANIZATION_MANAGE);
    const parsed = appSettingsSchema.safeParse(await readJsonRequest(request));
    if (!parsed.success) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "ค่าการแจ้งเตือนไม่ถูกต้อง", status: 400 });
    const item = await saveAppSettings({ organizationId: session.access.organization.id,
      actor: { uid: session.identity.uid, email: session.identity.email, role: session.access.membership.role },
      settings: parsed.data });
    return createSuccessResponse({ item });
  } catch (error) { return createApiErrorResponse(error, "App Settings Update API"); }
}
