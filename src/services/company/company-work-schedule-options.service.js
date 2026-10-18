import "server-only";

import { PERMISSIONS } from "@/constants/permissions";
import { canAccessCompany } from "@/lib/auth/company-access";
import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

export async function listWorkScheduleCompanyOptions({ currentSession }) {
  if (
    !currentSession?.access?.permissions?.includes(
      PERMISSIONS.HR_SETTINGS_MANAGE,
    )
  ) {
    throw new ApplicationError({
      code: "COMPANY_WORK_SCHEDULE_PERMISSION_DENIED",
      message: "ไม่มีสิทธิ์จัดการวันทำงานของบริษัท",
      status: 403,
    });
  }

  const snapshot = await adminFirestore
    .collection("organizations")
    .doc(currentSession.access.organization.id)
    .collection("companies")
    .limit(101)
    .get();

  if (snapshot.size > 100) {
    throw new ApplicationError({
      code: "COMPANY_LIST_LIMIT",
      message: "จำนวนบริษัทเกินขนาดที่หน้านี้รองรับ",
      status: 409,
    });
  }

  return snapshot.docs
    .filter((doc) => {
      const company = doc.data();

      return (
        company.isDeleted !== true &&
        company.status === "ACTIVE" &&
        canAccessCompany(currentSession.access.membership.companyAccess, doc.id)
      );
    })
    .map((doc) => ({
      id: doc.id,
      code: doc.data().code,
      name: doc.data().nameTh ?? doc.data().name ?? doc.data().code,
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
}
