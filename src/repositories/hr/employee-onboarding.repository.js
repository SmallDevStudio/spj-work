import "server-only";

import { createHash } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";

import {
  EMPLOYEE_ACCESS_STATUS,
  EMPLOYEE_SOURCE,
  EMPLOYMENT_STATUS,
} from "@/constants/employees";
import { MASTER_DATA_STATUS } from "@/constants/organization-structure";
import {
  DEVICE_REQUIREMENT,
  NOTIFICATION_CHANNEL,
  NOTIFICATION_OUTBOX_STATUS,
  ONBOARDING_NOTIFICATION_EVENT,
  ONBOARDING_SOURCE,
  ONBOARDING_STATUS,
  ONBOARDING_TASK_STATUS,
  ONBOARDING_TASK_TYPE,
} from "@/constants/onboarding";
import { PERMISSIONS } from "@/constants/permissions";
import { adminFirestore } from "@/lib/firebase/admin";
import { ApplicationError } from "@/lib/errors/application-error";
import {
  createEmployeePinHash,
  encryptEmployeePin,
} from "@/lib/security/employee-sensitive-data";
import { getEmployeeById } from "@/repositories/hr/employee.repository";

function createStableKey(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeEmployeeCode(employeeCode) {
  return employeeCode.trim().toUpperCase();
}

function normalizeEmail(email) {
  return email?.trim().toLowerCase() ?? null;
}

function getOrganizationRef(organizationId) {
  return adminFirestore.collection("organizations").doc(organizationId);
}

function createActorData(actor) {
  return {
    uid: actor.uid,
    email: actor.email,
    role: actor.role,
  };
}

function createTaskData({
  organizationId,
  onboardingRequestId,
  employeeId,
  type,
  status,
  actor,
}) {
  return {
    organizationId,
    onboardingRequestId,
    employeeId,
    type,
    status,
    assignedTo: null,
    startedAt: null,
    startedBy: null,
    completedAt: null,
    completedBy: null,
    blockedAt: null,
    blockedBy: null,
    blockedReason: null,
    notes: null,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: actor.uid,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.uid,
  };
}

async function getCreatedOnboardingRequest({
  organizationId,
  onboardingRequestId,
}) {
  const snapshot = await getOrganizationRef(organizationId)
    .collection("onboardingRequests")
    .doc(onboardingRequestId)
    .get();

  if (!snapshot.exists) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

export async function createEmployeeAndOnboarding({
  organizationId,
  employeeInput,
  onboardingInput,
  actor,
}) {
  const organizationRef = getOrganizationRef(organizationId);

  const employeeRef = organizationRef.collection("employees").doc();

  const onboardingRequestRef = organizationRef
    .collection("onboardingRequests")
    .doc();

  const normalizedEmployeeCode = normalizeEmployeeCode(
    employeeInput.employeeCode,
  );

  const normalizedEmail = normalizeEmail(employeeInput.workEmail);

  const employeeCodeKey = createStableKey(normalizedEmployeeCode);

  const employeePinHash = createEmployeePinHash(employeeInput.employeePin);

  const encryptedEmployeePin = encryptEmployeePin(employeeInput.employeePin);

  const employeeCodeKeyRef = organizationRef
    .collection("employeeCodeKeys")
    .doc(employeeCodeKey);

  const employeePinKeyRef = organizationRef
    .collection("employeePinKeys")
    .doc(employeePinHash);

  const departmentRef = organizationRef
    .collection("departments")
    .doc(employeeInput.departmentId);

  const managerRef = employeeInput.managerEmployeeId
    ? organizationRef
        .collection("employees")
        .doc(employeeInput.managerEmployeeId)
    : null;

  const employeeAuditLogRef = organizationRef.collection("auditLogs").doc();

  const onboardingAuditLogRef = organizationRef.collection("auditLogs").doc();

  const notificationOutboxRef = onboardingInput.submitToIT
    ? organizationRef.collection("notificationOutbox").doc()
    : null;

  const taskTypes = [
    ONBOARDING_TASK_TYPE.DOMAIN_ACCOUNT,
    ONBOARDING_TASK_TYPE.COMPANY_EMAIL,
    ONBOARDING_TASK_TYPE.PRINTER_ACCOUNT,
    ONBOARDING_TASK_TYPE.DEVICE_ASSIGNMENT,
  ];

  const taskRefs = Object.fromEntries(
    taskTypes.map((taskType) => [
      taskType,
      onboardingRequestRef.collection("tasks").doc(taskType),
    ]),
  );

  const onboardingStatus = onboardingInput.submitToIT
    ? ONBOARDING_STATUS.WAITING_IT
    : ONBOARDING_STATUS.DRAFT;

  const deviceTaskStatus =
    onboardingInput.deviceRequirement === DEVICE_REQUIREMENT.NONE
      ? ONBOARDING_TASK_STATUS.NOT_REQUIRED
      : ONBOARDING_TASK_STATUS.NOT_STARTED;

  await adminFirestore.runTransaction(async (transaction) => {
    const [
      employeeCodeKeySnapshot,
      employeePinKeySnapshot,
      departmentSnapshot,
      managerSnapshot,
    ] = await Promise.all([
      transaction.get(employeeCodeKeyRef),
      transaction.get(employeePinKeyRef),
      transaction.get(departmentRef),
      managerRef ? transaction.get(managerRef) : Promise.resolve(null),
    ]);

    if (employeeCodeKeySnapshot.exists) {
      throw new ApplicationError({
        code: "EMPLOYEE_CODE_ALREADY_EXISTS",
        message: `รหัสพนักงาน ${normalizedEmployeeCode} ถูกใช้งานแล้ว`,
        status: 409,
      });
    }

    if (employeePinKeySnapshot.exists) {
      throw new ApplicationError({
        code: "EMPLOYEE_PIN_ALREADY_EXISTS",
        message: "รหัสตัวเลข 4 หลักนี้ถูกใช้งานแล้ว",
        status: 409,
      });
    }

    if (!departmentSnapshot.exists) {
      throw new ApplicationError({
        code: "DEPARTMENT_NOT_FOUND",
        message: "ไม่พบแผนกที่เลือก",
        status: 404,
      });
    }

    const department = departmentSnapshot.data();

    if (
      department.isDeleted === true ||
      department.status !== MASTER_DATA_STATUS.ACTIVE
    ) {
      throw new ApplicationError({
        code: "DEPARTMENT_INACTIVE",
        message: "แผนกที่เลือกไม่พร้อมใช้งาน",
        status: 409,
      });
    }

    if (managerRef) {
      if (!managerSnapshot?.exists) {
        throw new ApplicationError({
          code: "MANAGER_NOT_FOUND",
          message: "ไม่พบข้อมูลหัวหน้างานที่เลือก",
          status: 404,
        });
      }

      const manager = managerSnapshot.data();

      if (
        manager.isDeleted === true ||
        [
          EMPLOYMENT_STATUS.INACTIVE,
          EMPLOYMENT_STATUS.SUSPENDED,
          EMPLOYMENT_STATUS.TERMINATED,
        ].includes(manager.employmentStatus)
      ) {
        throw new ApplicationError({
          code: "MANAGER_INACTIVE",
          message: "หัวหน้างานที่เลือกไม่พร้อมใช้งาน",
          status: 409,
        });
      }
    }

    const displayName =
      `${employeeInput.firstName} ${employeeInput.lastName}`.trim();

    transaction.set(employeeRef, {
      organizationId,
      employeeCode: normalizedEmployeeCode,
      normalizedEmployeeCode,
      firstName: employeeInput.firstName,
      lastName: employeeInput.lastName,
      displayName,
      gender: employeeInput.gender,
      birthDate: employeeInput.birthDate,
      phoneNumber: employeeInput.phoneNumber,
      positionTitle: employeeInput.positionTitle,
      departmentId: employeeInput.departmentId,
      managerEmployeeId: employeeInput.managerEmployeeId,
      encryptedEmployeePin,
      employeePinHash,
      notes: employeeInput.notes,
      employmentType: employeeInput.employmentType,
      employmentStatus: employeeInput.employmentStatus,
      effectiveDate: employeeInput.effectiveDate,
      workEmail: normalizedEmail,
      normalizedEmail,
      role: employeeInput.role,
      accessStatus: EMPLOYEE_ACCESS_STATUS.NOT_CONFIGURED,
      userId: null,
      onboardingRequestId: onboardingRequestRef.id,
      source: EMPLOYEE_SOURCE.MANUAL,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    });

    transaction.set(employeeCodeKeyRef, {
      organizationId,
      entityType: "EMPLOYEE",
      entityId: employeeRef.id,
      normalizedEmployeeCode,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.uid,
    });

    transaction.set(employeePinKeyRef, {
      organizationId,
      entityType: "EMPLOYEE_PIN",
      entityId: employeeRef.id,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.uid,
    });

    transaction.set(onboardingRequestRef, {
      organizationId,
      employeeId: employeeRef.id,
      status: onboardingStatus,
      source: ONBOARDING_SOURCE.MANUAL,
      submittedAt: onboardingInput.submitToIT
        ? FieldValue.serverTimestamp()
        : null,
      submittedBy: onboardingInput.submitToIT ? actor.uid : null,
      assignedTo: null,
      assignedAt: null,
      startedAt: null,
      startedBy: null,
      blockedAt: null,
      blockedBy: null,
      blockedReason: null,
      accountReadyAt: null,
      accountReadyBy: null,
      completedAt: null,
      completedBy: null,
      cancelledAt: null,
      cancelledBy: null,
      cancellationReason: null,
      deviceRequirement: onboardingInput.deviceRequirement,
      deviceRequirementNotes: onboardingInput.deviceRequirementNotes,
      notes: onboardingInput.notes,
      workEmail: normalizedEmail,
      assetAssignmentId: null,
      tasksSummary: {
        total: 4,
        completed: 0,
        blocked: 0,
        notRequired:
          deviceTaskStatus === ONBOARDING_TASK_STATUS.NOT_REQUIRED ? 1 : 0,
      },
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    });

    transaction.set(
      taskRefs[ONBOARDING_TASK_TYPE.DOMAIN_ACCOUNT],
      createTaskData({
        organizationId,
        onboardingRequestId: onboardingRequestRef.id,
        employeeId: employeeRef.id,
        type: ONBOARDING_TASK_TYPE.DOMAIN_ACCOUNT,
        status: ONBOARDING_TASK_STATUS.NOT_STARTED,
        actor,
      }),
    );

    transaction.set(
      taskRefs[ONBOARDING_TASK_TYPE.COMPANY_EMAIL],
      createTaskData({
        organizationId,
        onboardingRequestId: onboardingRequestRef.id,
        employeeId: employeeRef.id,
        type: ONBOARDING_TASK_TYPE.COMPANY_EMAIL,
        status: ONBOARDING_TASK_STATUS.NOT_STARTED,
        actor,
      }),
    );

    transaction.set(
      taskRefs[ONBOARDING_TASK_TYPE.PRINTER_ACCOUNT],
      createTaskData({
        organizationId,
        onboardingRequestId: onboardingRequestRef.id,
        employeeId: employeeRef.id,
        type: ONBOARDING_TASK_TYPE.PRINTER_ACCOUNT,
        status: ONBOARDING_TASK_STATUS.NOT_STARTED,
        actor,
      }),
    );

    transaction.set(
      taskRefs[ONBOARDING_TASK_TYPE.DEVICE_ASSIGNMENT],
      createTaskData({
        organizationId,
        onboardingRequestId: onboardingRequestRef.id,
        employeeId: employeeRef.id,
        type: ONBOARDING_TASK_TYPE.DEVICE_ASSIGNMENT,
        status: deviceTaskStatus,
        actor,
      }),
    );

    transaction.set(employeeAuditLogRef, {
      organizationId,
      actor: createActorData(actor),
      action: "EMPLOYEE_CREATE",
      entityType: "EMPLOYEE",
      entityId: employeeRef.id,
      source: "WEB",
      summary: `Created employee ${normalizedEmployeeCode}.`,
      before: null,
      after: {
        employeeCode: normalizedEmployeeCode,
        displayName,
        positionTitle: employeeInput.positionTitle,
        departmentId: employeeInput.departmentId,
        managerEmployeeId: employeeInput.managerEmployeeId,
        employmentType: employeeInput.employmentType,
        employmentStatus: employeeInput.employmentStatus,
        effectiveDate: employeeInput.effectiveDate,
        accessStatus: EMPLOYEE_ACCESS_STATUS.NOT_CONFIGURED,
      },
      metadata: {
        hasEmployeePin: true,
        onboardingRequestId: onboardingRequestRef.id,
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    transaction.set(onboardingAuditLogRef, {
      organizationId,
      actor: createActorData(actor),
      action: onboardingInput.submitToIT
        ? "ONBOARDING_SUBMIT"
        : "ONBOARDING_CREATE_DRAFT",
      entityType: "ONBOARDING_REQUEST",
      entityId: onboardingRequestRef.id,
      source: "WEB",
      summary: onboardingInput.submitToIT
        ? `Submitted onboarding for employee ${normalizedEmployeeCode}.`
        : `Created onboarding draft for employee ${normalizedEmployeeCode}.`,
      before: null,
      after: {
        employeeId: employeeRef.id,
        status: onboardingStatus,
        deviceRequirement: onboardingInput.deviceRequirement,
      },
      metadata: null,
      createdAt: FieldValue.serverTimestamp(),
    });

    if (notificationOutboxRef) {
      transaction.set(notificationOutboxRef, {
        organizationId,
        eventType: ONBOARDING_NOTIFICATION_EVENT.SUBMITTED,
        aggregateType: "ONBOARDING_REQUEST",
        aggregateId: onboardingRequestRef.id,
        actor: createActorData(actor),
        audience: {
          type: "PERMISSION",
          permission: PERMISSIONS.ONBOARDING_IT_PROCESS,
        },
        channels: [
          NOTIFICATION_CHANNEL.IN_APP,
          NOTIFICATION_CHANNEL.EMAIL,
          NOTIFICATION_CHANNEL.LINE,
        ],
        payload: {
          onboardingRequestId: onboardingRequestRef.id,
          employeeId: employeeRef.id,
          employeeCode: normalizedEmployeeCode,
          displayName,
          positionTitle: employeeInput.positionTitle,
          departmentId: employeeInput.departmentId,
          effectiveDate: employeeInput.effectiveDate,
          deviceRequirement: onboardingInput.deviceRequirement,
        },
        status: NOTIFICATION_OUTBOX_STATUS.PENDING,
        attemptCount: 0,
        maximumAttempts: 5,
        availableAt: FieldValue.serverTimestamp(),
        processingStartedAt: null,
        processedAt: null,
        lastError: null,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: actor.uid,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: actor.uid,
      });
    }
  });

  const [employee, onboardingRequest] = await Promise.all([
    getEmployeeById({
      organizationId,
      employeeId: employeeRef.id,
    }),
    getCreatedOnboardingRequest({
      organizationId,
      onboardingRequestId: onboardingRequestRef.id,
    }),
  ]);

  return {
    employee,
    onboardingRequest,
  };
}
